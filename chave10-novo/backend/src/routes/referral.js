/**
 * routes/referral.js — Programa de Indicações
 *
 * Rotas autenticadas (prefixo /api/app/referral):
 *   Exigem JWT válido. Indicadores independentes usam perfil 'indicador'.
 *   Oficinas-indicadoras usam perfil 'admin_oficina' + oficina_id.
 *
 * Rotas públicas registradas diretamente em index.js:
 *   POST /api/public/referral/clique
 *   POST /api/public/referral/cadastro
 */

const router  = require('express').Router();
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, queryOne, run } = require('../db');
const { authMiddleware, SECRET } = require('../middleware/auth');
const log = require('../utils/logger');

// ── Middleware: aceita indicador OU oficina autenticada ───────
function authIndicador(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.perfil === 'indicador' || req.user.oficina_id) return next();
    return res.status(403).json({ error: 'Acesso restrito a indicadores' });
  });
}

router.use(authIndicador);

// ── Resolução do indicador_id a partir do JWT ─────────────────
async function resolverIndicadorId(req) {
  if (req.user.perfil === 'indicador') {
    const ind = await queryOne(
      'SELECT id FROM referral_indicadores WHERE usuario_id=$1',
      [req.user.id]
    );
    return ind?.id || null;
  }
  // admin_oficina — busca pelo oficina_id
  const ind = await queryOne(
    'SELECT id FROM referral_indicadores WHERE oficina_id=$1',
    [req.user.oficina_id]
  );
  return ind?.id || null;
}

// ── Utilidade: gera código único ──────────────────────────────
async function gerarCodigoUnico() {
  for (let i = 0; i < 20; i++) {
    const codigo = 'C10-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const existe = await queryOne('SELECT id FROM referral_codigos WHERE codigo=$1', [codigo]);
    if (!existe) return codigo;
  }
  throw new Error('Não foi possível gerar código único');
}

// ────────────────────────────────────────────────────────────────────
// GET /api/app/referral/me
// ────────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    let indicador;
    if (req.user.perfil === 'indicador') {
      indicador = await queryOne(
        'SELECT * FROM referral_indicadores WHERE usuario_id=$1',
        [req.user.id]
      );
    } else {
      indicador = await queryOne(
        'SELECT * FROM referral_indicadores WHERE oficina_id=$1',
        [req.user.oficina_id]
      );
    }

    if (!indicador) return res.json({ participante: false });

    if (indicador.status !== 'ativo') {
      return res.json({ participante: true, status: indicador.status, aprovado: false });
    }

    const codigo = await queryOne(
      'SELECT * FROM referral_codigos WHERE indicador_id=$1 AND ativo=true',
      [indicador.id]
    );

    // Separa contagens de indicações e somas de comissões em CTEs para evitar
    // produto cartesiano (fan-out) entre referral_indicacoes e referral_comissoes.
    const totais = await queryOne(`
      WITH ind_counts AS (
        SELECT
          COUNT(DISTINCT id)                                    AS indicacoes,
          COUNT(DISTINCT id) FILTER (WHERE status='trial')     AS trials,
          COUNT(DISTINCT id) FILTER (WHERE status='pagante')   AS pagantes
        FROM referral_indicacoes
        WHERE indicador_id = $1
          AND status <> 'cancelado'
      ),
      com_sums AS (
        SELECT
          COALESCE(SUM(valor) FILTER (WHERE status='aguardando_validacao'), 0) AS comissao_pendente,
          COALESCE(SUM(valor) FILTER (WHERE status='aprovada'),             0) AS comissao_aprovada,
          COALESCE(SUM(valor) FILTER (WHERE status='paga'),                 0) AS comissao_paga
        FROM referral_comissoes
        WHERE indicador_id = $1
      )
      SELECT
        COALESCE(rc.total_cliques, 0) AS cliques,
        ic.indicacoes,
        ic.trials,
        ic.pagantes,
        cs.comissao_pendente,
        cs.comissao_aprovada,
        cs.comissao_paga
      FROM referral_indicadores ind
      LEFT JOIN referral_codigos rc ON rc.indicador_id = ind.id AND rc.ativo = true
      CROSS JOIN ind_counts ic
      CROSS JOIN com_sums cs
      WHERE ind.id = $1
    `, [indicador.id]);

    res.json({
      participante: true,
      aprovado: true,
      status: indicador.status,
      tipo: indicador.tipo,
      nome: indicador.nome || indicador.nome_contato,
      codigo: codigo?.codigo || null,
      totais: totais || {
        cliques: 0, indicacoes: 0, trials: 0, pagantes: 0,
        comissao_pendente: 0, comissao_aprovada: 0, comissao_paga: 0,
      },
    });
  } catch (err) {
    log.error('referral_me', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/app/referral/indicacoes
// ────────────────────────────────────────────────────────────────────
router.get('/indicacoes', async (req, res) => {
  try {
    const indicadorId = await resolverIndicadorId(req);
    if (!indicadorId) return res.json([]);

    const rows = await query(`
      SELECT
        ri.id, ri.criado_em, ri.status, ri.convertido_em,
        LEFT(o.nome, 3) || '***' AS nome_parcial,
        o.data_criacao            AS data_cadastro,
        com.valor                 AS comissao_valor,
        com.status                AS comissao_status
      FROM referral_indicacoes ri
      JOIN oficinas o ON o.id = ri.oficina_id
      LEFT JOIN referral_comissoes com ON com.indicacao_id = ri.id
      WHERE ri.indicador_id = $1
      ORDER BY ri.criado_em DESC
      LIMIT 200
    `, [indicadorId]);

    res.json(rows);
  } catch (err) {
    log.error('referral_indicacoes', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
