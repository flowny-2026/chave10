/**
 * mecanico-perfil.js — Rotas do perfil do mecânico
 *
 * Prefixo: /api/app/meu-perfil
 *
 * Acesso: apenas mecânicos (e outros perfis para dados gerais)
 * O mecânico enxerga APENAS as próprias comissões.
 * Nunca expõe dados de outros mecânicos.
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { query, queryOne, run } = require('../db');
const { authMiddleware, oficinaSelf } = require('../middleware/auth');
const { audit, ACOES } = require('../services/auditService');
const log = require('../utils/logger');

router.use(authMiddleware, oficinaSelf);
const oid = req => req.user.oficina_id;

// ─────────────────────────────────────────────────────────────
// MINHAS COMISSÕES (mecânico enxerga apenas as suas)
// GET /api/app/meu-perfil/comissoes
// ─────────────────────────────────────────────────────────────
router.get('/comissoes', async (req, res) => {
  // Mecânicos veem apenas as próprias; outros perfis são barrados
  if (req.user?.perfil !== 'mecanico') {
    return res.status(403).json({ error: 'Rota exclusiva para mecânicos' });
  }

  const { inicio, fim, status } = req.query;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (inicio && !dateRegex.test(inicio)) return res.status(400).json({ error: 'Data início inválida' });
  if (fim    && !dateRegex.test(fim))    return res.status(400).json({ error: 'Data fim inválida' });
  const statusValidos = ['pendente', 'aprovada', 'paga', 'cancelada'];
  if (status && !statusValidos.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  try {
    let sql = `
      SELECT
        c.id,
        c.os_id,
        c.pct_servicos,
        c.pct_pecas,
        c.base_servicos,
        c.base_pecas,
        c.valor_servicos,
        c.valor_pecas,
        c.valor_total,
        c.status,
        c.criado_em,
        c.aprovado_em,
        c.pago_em,
        os.numero AS os_numero,
        os.data   AS os_data,
        os.descricao AS os_descricao
      FROM comissoes c
      INNER JOIN ordens_servico os ON os.id = c.os_id
      WHERE c.mecanico_id = $1 AND c.oficina_id = $2
    `;
    const params = [req.user.id, oid(req)];
    let idx = 3;

    if (inicio) { sql += ` AND c.criado_em >= $${idx++}`; params.push(inicio); }
    if (fim)    { sql += ` AND c.criado_em <= $${idx++}`; params.push(fim + 'T23:59:59'); }
    if (status) { sql += ` AND c.status = $${idx++}`;    params.push(status); }

    sql += ' ORDER BY c.criado_em DESC LIMIT 200';

    const rows = await query(sql, params);

    // Totalizadores
    const totalPendente  = rows.filter(r => r.status === 'pendente').reduce((s, r) => s + +r.valor_total, 0);
    const totalAprovado  = rows.filter(r => r.status === 'aprovada').reduce((s, r) => s + +r.valor_total, 0);
    const totalPago      = rows.filter(r => r.status === 'paga').reduce((s, r) => s + +r.valor_total, 0);
    const totalGeral     = rows.reduce((s, r) => s + +r.valor_total, 0);

    res.json({ comissoes: rows, resumo: { totalPendente, totalAprovado, totalPago, totalGeral } });
  } catch (err) {
    log.error('mecanico_perfil_comissoes', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// TROCAR SENHA (mecânico)
// PATCH /api/app/meu-perfil/senha
// ─────────────────────────────────────────────────────────────
router.patch('/senha', async (req, res) => {
  const { senha_atual, nova_senha } = req.body;

  if (!senha_atual || !nova_senha) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
  }
  if (typeof nova_senha !== 'string' || nova_senha.length < 6 || nova_senha.length > 128) {
    return res.status(400).json({ error: 'Nova senha deve ter entre 6 e 128 caracteres' });
  }

  try {
    const usuario = await queryOne('SELECT * FROM usuarios WHERE id=$1', [req.user.id]);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    const ok = await bcrypt.compare(senha_atual, usuario.senha_hash);
    if (!ok) {
      audit(req, ACOES.TROCAR_SENHA_FALHA, 'usuarios', req.user.id, {});
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const hash = bcrypt.hashSync(nova_senha, 12);
    await run('UPDATE usuarios SET senha_hash=$1 WHERE id=$2', [hash, req.user.id]);
    audit(req, ACOES.TROCAR_SENHA, 'usuarios', req.user.id, {});
    res.json({ ok: true });
  } catch (err) {
    log.error('mecanico_trocar_senha', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
