/**
 * routes/referral.js — Programa de Indicações (área do participante)
 *
 * Todas as rotas exigem JWT válido (authMiddleware + oficinaSelf).
 * Cada participante só acessa seus próprios dados (isolamento por indicador_id).
 *
 * Prefixo montado em index.js: /api/app/referral
 */

const router  = require('express').Router();
const crypto  = require('crypto');
const { query, queryOne, run } = require('../db');
const { authMiddleware, oficinaSelf } = require('../middleware/auth');
const log = require('../utils/logger');

router.use(authMiddleware, oficinaSelf);

const oid = req => req.user.oficina_id;

// ── Utilidade: gera código único de 8 chars (ex: C10-A3F2) ──
async function gerarCodigoUnico() {
  let tentativas = 0;
  while (tentativas < 20) {
    const codigo = 'C10-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const existe = await queryOne('SELECT id FROM referral_codigos WHERE codigo=$1', [codigo]);
    if (!existe) return codigo;
    tentativas++;
  }
  throw new Error('Não foi possível gerar código único');
}

// ── Hash do IP para privacidade (não armazenamos o IP bruto) ──
function hashIp(ip) {
  return crypto.createHash('sha256').update(ip + process.env.JWT_SECRET).digest('hex').slice(0, 16);
}

// ────────────────────────────────────────────────────────────────────
// GET /api/app/referral/me
// Retorna dados do participante: status, código, indicadores, comissões
// ────────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const indicador = await queryOne(
      'SELECT * FROM referral_indicadores WHERE oficina_id=$1',
      [oid(req)]
    );

    if (!indicador) {
      return res.json({ participante: false });
    }

    if (indicador.status !== 'ativo') {
      return res.json({ participante: true, status: indicador.status, aprovado: false });
    }

    const codigo = await queryOne(
      'SELECT * FROM referral_codigos WHERE indicador_id=$1 AND ativo=true',
      [indicador.id]
    );

    // Totais agregados
    const totais = await queryOne(`
      SELECT
        COALESCE(rc.total_cliques,0)                                       AS cliques,
        COUNT(DISTINCT ri.id)                                               AS indicacoes,
        COUNT(DISTINCT ri.id) FILTER (WHERE ri.status='trial')             AS trials,
        COUNT(DISTINCT ri.id) FILTER (WHERE ri.status='pagante')           AS pagantes,
        COALESCE(SUM(com.valor) FILTER (WHERE com.status='aguardando_validacao'),0) AS comissao_pendente,
        COALESCE(SUM(com.valor) FILTER (WHERE com.status='aprovada'),0)    AS comissao_aprovada,
        COALESCE(SUM(com.valor) FILTER (WHERE com.status='paga'),0)        AS comissao_paga
      FROM referral_indicadores ind
      LEFT JOIN referral_codigos rc   ON rc.indicador_id  = ind.id
      LEFT JOIN referral_indicacoes ri ON ri.indicador_id = ind.id
      LEFT JOIN referral_comissoes com ON com.indicador_id = ind.id
      WHERE ind.id = $1
      GROUP BY ind.id, rc.total_cliques
    `, [indicador.id]);

    res.json({
      participante: true,
      aprovado: true,
      status: indicador.status,
      tipo: indicador.tipo,
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
// Lista as indicações do participante (histórico)
// ────────────────────────────────────────────────────────────────────
router.get('/indicacoes', async (req, res) => {
  try {
    const indicador = await queryOne(
      "SELECT id FROM referral_indicadores WHERE oficina_id=$1 AND status='ativo'",
      [oid(req)]
    );
    if (!indicador) return res.json([]);

    const rows = await query(`
      SELECT
        ri.id,
        ri.criado_em,
        ri.status,
        ri.convertido_em,
        -- Expõe apenas os primeiros 3 chars do nome da oficina indicada + "***"
        LEFT(o.nome, 3) || '***'                AS nome_parcial,
        o.data_criacao                           AS data_cadastro,
        com.valor                                AS comissao_valor,
        com.status                               AS comissao_status
      FROM referral_indicacoes ri
      JOIN oficinas o          ON o.id = ri.oficina_id
      LEFT JOIN referral_comissoes com ON com.indicacao_id = ri.id
      WHERE ri.indicador_id = $1
      ORDER BY ri.criado_em DESC
      LIMIT 200
    `, [indicador.id]);

    res.json(rows);
  } catch (err) {
    log.error('referral_indicacoes', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// POST /api/public/referral/clique  (pública — sem auth)
// Registra um clique no link de indicação.
// Chamada pelo frontend quando a landing page carrega com ?ref=CODIGO.
// Idempotente por sessão (usa cookie de sessão implícito no frontend).
// ────────────────────────────────────────────────────────────────────
// (registrada via router separado em index.js como rota pública)

module.exports = router;
