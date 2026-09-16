/**
 * mecanicos.js — Rotas do módulo de Mecânicos
 *
 * Prefixo: /api/app/mecanicos
 *
 * Segurança:
 *   - authMiddleware + oficinaSelf: token obrigatório e oficina_id do JWT
 *   - apenasAdmin: apenas admin_oficina pode gerenciar mecânicos
 *   - naoMecanico: mecânicos não acessam esta área
 *   - Isolamento multi-tenant: oficina_id SEMPRE do JWT
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { query, queryOne, run } = require('../db');
const { authMiddleware, oficinaSelf } = require('../middleware/auth');
const { validateId } = require('../middleware/validate');
const { checkOwns } = require('../middleware/authorization');
const { audit, ACOES } = require('../services/auditService');
const log = require('../utils/logger');

// ── Middlewares ────────────────────────────────────────────────
router.use(authMiddleware, oficinaSelf);
const oid = req => req.user.oficina_id;

/** Bloqueia mecânicos de acessar gestão de mecânicos */
function apenasAdmin(req, res, next) {
  const perfil = req.user?.perfil;
  if (perfil === 'mecanico' || perfil === 'funcionario') {
    log.security('acesso_negado', { motivo: 'perfil sem acesso a mecânicos', perfil, path: req.path, ip: req.ip });
    return res.status(403).json({ error: 'Acesso restrito ao administrador da oficina' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────
// LISTAGEM DE MECÂNICOS
// GET /api/app/mecanicos
// Retorna todos os mecânicos da oficina com sua config de comissão
// ─────────────────────────────────────────────────────────────
router.get('/', apenasAdmin, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        u.id, u.nome, u.email, u.telefone, u.ativo, u.ultimo_acesso,
        COALESCE(c.recebe_servicos, true)  AS recebe_servicos,
        COALESCE(c.recebe_pecas,   false) AS recebe_pecas,
        COALESCE(c.pct_servicos,   0)     AS pct_servicos,
        COALESCE(c.pct_pecas,      0)     AS pct_pecas
      FROM usuarios u
      LEFT JOIN mecanico_comissao_config c ON c.mecanico_id = u.id
      WHERE u.oficina_id = $1 AND u.perfil = 'mecanico'
      ORDER BY u.nome
    `, [oid(req)]);
    res.json(rows);
  } catch (err) {
    log.error('mecanicos_list', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// LISTAR APENAS MECÂNICOS ATIVOS (para seletor em OS)
// GET /api/app/mecanicos/ativos
// Disponível para todos os perfis da oficina
// ─────────────────────────────────────────────────────────────
router.get('/ativos', async (req, res) => {
  try {
    const rows = await query(`
      SELECT u.id, u.nome
      FROM usuarios u
      WHERE u.oficina_id = $1 AND u.perfil = 'mecanico' AND u.ativo = 1
      ORDER BY u.nome
    `, [oid(req)]);
    res.json(rows);
  } catch (err) {
    log.error('mecanicos_ativos', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// CRIAR MECÂNICO
// POST /api/app/mecanicos
// ─────────────────────────────────────────────────────────────
router.post('/', apenasAdmin, async (req, res) => {
  const { nome, email, senha, telefone, recebe_servicos, recebe_pecas, pct_servicos, pct_pecas } = req.body;

  // Validação
  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }
  if (!senha || typeof senha !== 'string' || senha.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  }
  if (senha.length > 128) {
    return res.status(400).json({ error: 'Senha muito longa' });
  }

  const pctSvc  = parseFloat(pct_servicos)  || 0;
  const pctPec  = parseFloat(pct_pecas)     || 0;
  if (pctSvc < 0 || pctSvc > 100 || pctPec < 0 || pctPec > 100) {
    return res.status(400).json({ error: 'Percentuais de comissão devem ser entre 0 e 100' });
  }

  const nomeSanitizado     = nome.trim().slice(0, 120);
  const emailSanitizado    = email.trim().toLowerCase();
  const telefoneSanitizado = telefone ? String(telefone).replace(/[^\d\s\-\+\(\)]/g, '').slice(0, 30) || null : null;

  try {
    // Verifica e-mail único
    const existe = await queryOne('SELECT id FROM usuarios WHERE email=$1', [emailSanitizado]);
    if (existe) {
      return res.status(409).json({ error: 'E-mail já cadastrado no sistema' });
    }

    const hash = bcrypt.hashSync(senha, 12);
    const r = await queryOne(
      "INSERT INTO usuarios(oficina_id, nome, email, senha_hash, telefone, perfil, ativo) VALUES($1,$2,$3,$4,$5,'mecanico',1) RETURNING id",
      [oid(req), nomeSanitizado, emailSanitizado, hash, telefoneSanitizado]
    );

    // Cria config de comissão
    await run(`
      INSERT INTO mecanico_comissao_config
        (oficina_id, mecanico_id, recebe_servicos, recebe_pecas, pct_servicos, pct_pecas)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (mecanico_id) DO UPDATE SET
        recebe_servicos = EXCLUDED.recebe_servicos,
        recebe_pecas    = EXCLUDED.recebe_pecas,
        pct_servicos    = EXCLUDED.pct_servicos,
        pct_pecas       = EXCLUDED.pct_pecas,
        atualizado_em   = NOW()
    `, [
      oid(req), r.id,
      recebe_servicos !== false,
      !!recebe_pecas,
      pctSvc, pctPec,
    ]);

    audit(req, ACOES.CRIAR_USUARIO, 'usuarios', r.id, {
      nome: nomeSanitizado, email: emailSanitizado, perfil: 'mecanico',
    });

    res.status(201).json({ id: r.id, nome: nomeSanitizado, email: emailSanitizado });
  } catch (err) {
    log.error('mecanicos_create', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// EDITAR MECÂNICO
// PUT /api/app/mecanicos/:id
// ─────────────────────────────────────────────────────────────
router.put('/:id', apenasAdmin, validateId, async (req, res) => {
  const mecId = parseInt(req.params.id, 10);
  const { nome, email, senha, telefone, recebe_servicos, recebe_pecas, pct_servicos, pct_pecas } = req.body;

  // Verificar pertencimento
  const mec = await queryOne(
    "SELECT id FROM usuarios WHERE id=$1 AND oficina_id=$2 AND perfil='mecanico'",
    [mecId, oid(req)]
  );
  if (!mec) return res.status(404).json({ error: 'Mecânico não encontrado' });

  // Validações básicas
  if (nome !== undefined) {
    if (typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ error: 'Nome inválido' });
    }
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'E-mail inválido' });
    }
    const emailCheck = await queryOne('SELECT id FROM usuarios WHERE email=$1 AND id<>$2', [email.trim().toLowerCase(), mecId]);
    if (emailCheck) return res.status(409).json({ error: 'E-mail já em uso' });
  }
  if (senha !== undefined) {
    if (typeof senha !== 'string' || senha.length < 6 || senha.length > 128) {
      return res.status(400).json({ error: 'Senha deve ter entre 6 e 128 caracteres' });
    }
  }

  const pctSvc = pct_servicos !== undefined ? parseFloat(pct_servicos) || 0 : undefined;
  const pctPec = pct_pecas    !== undefined ? parseFloat(pct_pecas)    || 0 : undefined;
  if (pctSvc !== undefined && (pctSvc < 0 || pctSvc > 100)) {
    return res.status(400).json({ error: 'Percentual de serviços deve ser entre 0 e 100' });
  }
  if (pctPec !== undefined && (pctPec < 0 || pctPec > 100)) {
    return res.status(400).json({ error: 'Percentual de peças deve ser entre 0 e 100' });
  }

  try {
    // Atualiza dados do usuário
    const nomeSanitizado     = nome  ? nome.trim().slice(0, 120)                                         : undefined;
    const emailSanitizado    = email ? email.trim().toLowerCase()                                        : undefined;
    const telefoneSanitizado = telefone !== undefined
      ? (telefone ? String(telefone).replace(/[^\d\s\-\+\(\)]/g, '').slice(0, 30) || null : null)
      : undefined;
    const senhaHash = senha ? bcrypt.hashSync(senha, 12) : undefined;

    await run(`
      UPDATE usuarios SET
        nome       = COALESCE($1, nome),
        email      = COALESCE($2, email),
        senha_hash = COALESCE($3, senha_hash),
        telefone   = COALESCE($4, telefone)
      WHERE id=$5 AND oficina_id=$6 AND perfil='mecanico'
    `, [
      nomeSanitizado    || null,
      emailSanitizado   || null,
      senhaHash         || null,
      telefoneSanitizado !== undefined ? telefoneSanitizado : null,
      mecId, oid(req),
    ]);

    // Atualiza config de comissão
    await run(`
      INSERT INTO mecanico_comissao_config
        (oficina_id, mecanico_id, recebe_servicos, recebe_pecas, pct_servicos, pct_pecas)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (mecanico_id) DO UPDATE SET
        recebe_servicos = COALESCE($3, mecanico_comissao_config.recebe_servicos),
        recebe_pecas    = COALESCE($4, mecanico_comissao_config.recebe_pecas),
        pct_servicos    = COALESCE($5, mecanico_comissao_config.pct_servicos),
        pct_pecas       = COALESCE($6, mecanico_comissao_config.pct_pecas),
        atualizado_em   = NOW()
    `, [
      oid(req), mecId,
      recebe_servicos !== undefined ? recebe_servicos !== false : null,
      recebe_pecas    !== undefined ? !!recebe_pecas            : null,
      pctSvc !== undefined ? pctSvc : null,
      pctPec !== undefined ? pctPec : null,
    ]);

    audit(req, ACOES.EDITAR_USUARIO, 'usuarios', mecId, { perfil: 'mecanico' });
    res.json({ ok: true });
  } catch (err) {
    log.error('mecanicos_update', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// ATIVAR / DESATIVAR MECÂNICO
// PATCH /api/app/mecanicos/:id/status
// ─────────────────────────────────────────────────────────────
router.patch('/:id/status', apenasAdmin, validateId, async (req, res) => {
  const mecId = parseInt(req.params.id, 10);
  const { ativo } = req.body;

  if (ativo === undefined || ativo === null) {
    return res.status(400).json({ error: 'Campo ativo é obrigatório (true/false)' });
  }

  try {
    const result = await run(
      "UPDATE usuarios SET ativo=$1 WHERE id=$2 AND oficina_id=$3 AND perfil='mecanico'",
      [ativo ? 1 : 0, mecId, oid(req)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Mecânico não encontrado' });
    audit(req, ACOES.ALTERAR_PERMISSAO, 'usuarios', mecId, { ativo: !!ativo });
    res.json({ ok: true });
  } catch (err) {
    log.error('mecanicos_status', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// HISTÓRICO DE COMISSÕES DE UM MECÂNICO
// GET /api/app/mecanicos/:id/comissoes
// ─────────────────────────────────────────────────────────────
router.get('/:id/comissoes', apenasAdmin, validateId, async (req, res) => {
  const mecId   = parseInt(req.params.id, 10);
  const { inicio, fim, status } = req.query;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  // Verifica pertencimento
  const mec = await queryOne(
    "SELECT id, nome FROM usuarios WHERE id=$1 AND oficina_id=$2 AND perfil='mecanico'",
    [mecId, oid(req)]
  );
  if (!mec) return res.status(404).json({ error: 'Mecânico não encontrado' });

  if (inicio && !dateRegex.test(inicio)) return res.status(400).json({ error: 'Data início inválida' });
  if (fim    && !dateRegex.test(fim))    return res.status(400).json({ error: 'Data fim inválida' });
  const statusValidos = ['pendente', 'aprovada', 'paga', 'cancelada'];
  if (status && !statusValidos.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  try {
    let sql = `
      SELECT
        c.*,
        os.numero AS os_numero,
        os.data   AS os_data,
        os.status AS os_status
      FROM comissoes c
      INNER JOIN ordens_servico os ON os.id = c.os_id
      WHERE c.mecanico_id = $1 AND c.oficina_id = $2
    `;
    const params = [mecId, oid(req)];
    let idx = 3;

    if (inicio) { sql += ` AND c.criado_em >= $${idx++}`; params.push(inicio); }
    if (fim)    { sql += ` AND c.criado_em <= $${idx++}`; params.push(fim + 'T23:59:59'); }
    if (status) { sql += ` AND c.status = $${idx++}`;    params.push(status); }

    sql += ' ORDER BY c.criado_em DESC LIMIT 500';

    const rows = await query(sql, params);
    res.json({ mecanico: mec, comissoes: rows });
  } catch (err) {
    log.error('mecanicos_comissoes_list', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// APROVAR COMISSÃO
// PATCH /api/app/mecanicos/comissoes/:comissaoId/aprovar
// ─────────────────────────────────────────────────────────────
router.patch('/comissoes/:comissaoId/aprovar', apenasAdmin, validateId, async (req, res) => {
  const comId = parseInt(req.params.comissaoId, 10);
  try {
    const result = await run(`
      UPDATE comissoes SET status='aprovada', aprovado_em=NOW(), aprovado_por=$1
      WHERE id=$2 AND oficina_id=$3 AND status='pendente'
    `, [req.user.id, comId, oid(req)]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Comissão não encontrada ou não está pendente' });
    res.json({ ok: true });
  } catch (err) {
    log.error('comissao_aprovar', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// MARCAR COMISSÃO COMO PAGA
// PATCH /api/app/mecanicos/comissoes/:comissaoId/pagar
// ─────────────────────────────────────────────────────────────
router.patch('/comissoes/:comissaoId/pagar', apenasAdmin, validateId, async (req, res) => {
  const comId = parseInt(req.params.comissaoId, 10);
  try {
    const result = await run(`
      UPDATE comissoes SET status='paga', pago_em=NOW(), pago_por=$1
      WHERE id=$2 AND oficina_id=$3 AND status IN ('pendente','aprovada')
    `, [req.user.id, comId, oid(req)]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Comissão não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    log.error('comissao_pagar', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// CANCELAR COMISSÃO
// PATCH /api/app/mecanicos/comissoes/:comissaoId/cancelar
// ─────────────────────────────────────────────────────────────
router.patch('/comissoes/:comissaoId/cancelar', apenasAdmin, validateId, async (req, res) => {
  const comId  = parseInt(req.params.comissaoId, 10);
  const obs    = req.body?.obs ? String(req.body.obs).slice(0, 300) : null;
  try {
    const result = await run(`
      UPDATE comissoes SET status='cancelada', cancelado_em=NOW(), cancelado_por=$1, obs=$2
      WHERE id=$3 AND oficina_id=$4 AND status NOT IN ('paga','cancelada')
    `, [req.user.id, obs, comId, oid(req)]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Comissão não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    log.error('comissao_cancelar', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─────────────────────────────────────────────────────────────
// RESUMO DE COMISSÕES (para dashboard admin)
// GET /api/app/mecanicos/comissoes/resumo
// ─────────────────────────────────────────────────────────────
router.get('/comissoes/resumo', apenasAdmin, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        u.id   AS mecanico_id,
        u.nome AS mecanico_nome,
        COUNT(c.id)                                                     AS total_comissoes,
        COUNT(c.id) FILTER (WHERE c.status = 'pendente')               AS pendentes,
        COUNT(c.id) FILTER (WHERE c.status = 'aprovada')               AS aprovadas,
        COUNT(c.id) FILTER (WHERE c.status = 'paga')                   AS pagas,
        COALESCE(SUM(c.valor_total) FILTER (WHERE c.status = 'pendente'),0)  AS total_pendente,
        COALESCE(SUM(c.valor_total) FILTER (WHERE c.status = 'aprovada'),0)  AS total_aprovado,
        COALESCE(SUM(c.valor_total) FILTER (WHERE c.status = 'paga'),0)      AS total_pago
      FROM usuarios u
      LEFT JOIN comissoes c ON c.mecanico_id = u.id AND c.oficina_id = $1
      WHERE u.oficina_id = $1 AND u.perfil = 'mecanico'
      GROUP BY u.id, u.nome
      ORDER BY u.nome
    `, [oid(req)]);
    res.json(rows);
  } catch (err) {
    log.error('comissoes_resumo', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
