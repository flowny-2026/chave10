/**
 * routes/referral-admin.js — Programa de Indicações (área administrativa)
 *
 * Todas as rotas exigem perfil master_admin (masterAdminOnly).
 * Prefixo montado em index.js: /api/admin/referral
 */

const router = require('express').Router();
const crypto = require('crypto');
const { query, queryOne, run } = require('../db');
const { authMiddleware, masterAdminOnly } = require('../middleware/auth');
const { validateId } = require('../middleware/validate');
const { audit } = require('../services/auditService');
const log = require('../utils/logger');

router.use(authMiddleware, masterAdminOnly);

// ── Utilidade: gera código único ──────────────────────────────
async function gerarCodigoUnico() {
  for (let i = 0; i < 20; i++) {
    const codigo = 'C10-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const existe = await queryOne('SELECT id FROM referral_codigos WHERE codigo=$1', [codigo]);
    if (!existe) return codigo;
  }
  throw new Error('Falha ao gerar código único');
}

// ────────────────────────────────────────────────────────────────────
// GET /api/admin/referral/participantes
// Lista todos os participantes (qualquer status)
// ────────────────────────────────────────────────────────────────────
router.get('/participantes', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        ri.id, ri.tipo, ri.status,
        COALESCE(ri.nome, ri.nome_contato) AS nome_contato,
        COALESCE(ri.email, o.email)        AS email,
        COALESCE(ri.telefone, ri.whatsapp) AS telefone,
        ri.aprovado_em, ri.criado_em, ri.observacoes,
        o.nome   AS oficina_nome,
        o.email  AS oficina_email,
        u_ind.nome AS usuario_nome,
        rc.codigo,
        rc.total_cliques,
        u_apr.nome AS aprovado_por_nome,
        (SELECT COUNT(*) FROM referral_indicacoes WHERE indicador_id=ri.id)                              AS total_indicacoes,
        (SELECT COUNT(*) FROM referral_indicacoes WHERE indicador_id=ri.id AND status='pagante')         AS total_pagantes,
        (SELECT COALESCE(SUM(valor),0) FROM referral_comissoes WHERE indicador_id=ri.id AND status IN ('aprovada','paga')) AS total_comissoes
      FROM referral_indicadores ri
      LEFT JOIN oficinas o              ON o.id  = ri.oficina_id
      LEFT JOIN usuarios u_ind          ON u_ind.id = ri.usuario_id
      LEFT JOIN referral_codigos rc     ON rc.indicador_id = ri.id AND rc.ativo = true
      LEFT JOIN usuarios u_apr          ON u_apr.id = ri.aprovado_por
      ORDER BY ri.criado_em DESC
    `);
    res.json(rows);
  } catch (err) {
    log.error('admin_referral_participantes', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// POST /api/admin/referral/participantes
// Habilita manualmente uma oficina como participante
// Body: { oficina_id, tipo, nome_contato, email, telefone, observacoes }
// ────────────────────────────────────────────────────────────────────
router.post('/participantes', async (req, res) => {
  try {
    const { oficina_id, tipo, nome_contato, email, telefone, observacoes } = req.body;

    if (!oficina_id || !Number.isInteger(+oficina_id) || +oficina_id <= 0) {
      return res.status(400).json({ error: 'oficina_id inválido' });
    }
    const TIPOS = ['influenciador', 'cliente', 'parceiro', 'outro'];
    const tipoVal = TIPOS.includes(tipo) ? tipo : 'cliente';

    // Verifica se a oficina existe
    const oficina = await queryOne('SELECT id FROM oficinas WHERE id=$1', [+oficina_id]);
    if (!oficina) return res.status(404).json({ error: 'Oficina não encontrada' });

    // Idempotência: se já existe, atualiza e reativa
    const existe = await queryOne('SELECT id FROM referral_indicadores WHERE oficina_id=$1', [+oficina_id]);
    if (existe) {
      await run(`
        UPDATE referral_indicadores SET
          tipo=$1, status='ativo', nome_contato=$2, email=$3, telefone=$4,
          observacoes=$5, aprovado_por=$6, aprovado_em=NOW()
        WHERE id=$7
      `, [tipoVal, nome_contato||null, email||null, telefone||null, observacoes||null, req.user.id, existe.id]);

      // Garante que existe um código ativo
      const codigoExiste = await queryOne('SELECT id FROM referral_codigos WHERE indicador_id=$1', [existe.id]);
      if (!codigoExiste) {
        const codigo = await gerarCodigoUnico();
        await run('INSERT INTO referral_codigos(indicador_id, codigo) VALUES($1,$2)', [existe.id, codigo]);
      }

      audit(req, 'REFERRAL_PARTICIPANTE_REATIVADO', 'referral_indicadores', existe.id, { oficina_id, tipo: tipoVal });
      return res.json({ ok: true, id: existe.id });
    }

    // Novo participante
    const ind = await queryOne(`
      INSERT INTO referral_indicadores(oficina_id, tipo, status, nome_contato, email, telefone, observacoes, aprovado_por, aprovado_em)
      VALUES($1,$2,'ativo',$3,$4,$5,$6,$7,NOW()) RETURNING id
    `, [+oficina_id, tipoVal, nome_contato||null, email||null, telefone||null, observacoes||null, req.user.id]);

    const codigo = await gerarCodigoUnico();
    await run('INSERT INTO referral_codigos(indicador_id, codigo) VALUES($1,$2)', [ind.id, codigo]);

    audit(req, 'REFERRAL_PARTICIPANTE_CRIADO', 'referral_indicadores', ind.id, { oficina_id, tipo: tipoVal, codigo });
    res.status(201).json({ ok: true, id: ind.id, codigo });
  } catch (err) {
    log.error('admin_referral_criar_participante', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// PATCH /api/admin/referral/participantes/:id/status
// Altera status: ativo | suspenso | pendente
// ────────────────────────────────────────────────────────────────────
router.patch('/participantes/:id/status', validateId, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ativo', 'suspenso', 'pendente'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    const result = await run(
      'UPDATE referral_indicadores SET status=$1 WHERE id=$2',
      [status, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Participante não encontrado' });
    audit(req, 'REFERRAL_STATUS_ALTERADO', 'referral_indicadores', req.params.id, { novo_status: status });
    res.json({ ok: true });
  } catch (err) {
    log.error('admin_referral_status', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/admin/referral/indicacoes
// Lista todas as indicações (admin vê tudo com dados completos)
// ────────────────────────────────────────────────────────────────────
router.get('/indicacoes', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        ri.id, ri.status, ri.codigo_usado, ri.criado_em, ri.convertido_em,
        ind.tipo                AS indicador_tipo,
        oind.nome               AS indicador_nome,
        oind.email              AS indicador_email,
        oindicada.id            AS indicado_id,
        oindicada.nome          AS indicado_nome,
        oindicada.email         AS indicado_email,
        oindicada.data_criacao  AS indicado_cadastro,
        com.id                  AS comissao_id,
        com.valor               AS comissao_valor,
        com.status              AS comissao_status,
        com.aprovado_em         AS comissao_aprovada_em
      FROM referral_indicacoes ri
      JOIN referral_indicadores ind ON ind.id = ri.indicador_id
      JOIN oficinas oind            ON oind.id = ind.oficina_id
      JOIN oficinas oindicada       ON oindicada.id = ri.oficina_id
      LEFT JOIN referral_comissoes com ON com.indicacao_id = ri.id
      ORDER BY ri.criado_em DESC
      LIMIT 1000
    `);
    res.json(rows);
  } catch (err) {
    log.error('admin_referral_indicacoes', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// PATCH /api/admin/referral/indicacoes/:id/status
// Atualiza status de uma indicação: cadastro | trial | pagante | cancelado
// ────────────────────────────────────────────────────────────────────
router.patch('/indicacoes/:id/status', validateId, async (req, res) => {
  try {
    const { status } = req.body;
    const validos = ['cadastro', 'trial', 'pagante', 'cancelado'];
    if (!validos.includes(status)) return res.status(400).json({ error: 'Status inválido' });

    const convertido_em = status === 'pagante' ? 'NOW()' : 'convertido_em';
    const result = await run(
      `UPDATE referral_indicacoes SET status=$1, convertido_em=${status === 'pagante' ? 'NOW()' : 'convertido_em'} WHERE id=$2`,
      [status, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Indicação não encontrada' });
    audit(req, 'REFERRAL_INDICACAO_STATUS', 'referral_indicacoes', req.params.id, { status });
    res.json({ ok: true });
  } catch (err) {
    log.error('admin_referral_indicacao_status', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/admin/referral/comissoes
// Lista todas as comissões
// ────────────────────────────────────────────────────────────────────
router.get('/comissoes', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        com.id, com.valor, com.status, com.criado_em, com.aprovado_em, com.obs,
        ind.tipo               AS indicador_tipo,
        oind.nome              AS indicador_nome,
        oind.email             AS indicador_email,
        oindicada.nome         AS indicado_nome,
        p.valor                AS pagamento_valor,
        p.data_pagamento       AS pagamento_data,
        p.forma_pagamento      AS pagamento_forma,
        u.nome                 AS aprovado_por_nome,
        rep.id                 AS repasse_id,
        rep.valor              AS repasse_valor,
        rep.realizado_em       AS repasse_em
      FROM referral_comissoes com
      JOIN referral_indicacoes ri  ON ri.id  = com.indicacao_id
      JOIN referral_indicadores ind ON ind.id = com.indicador_id
      JOIN oficinas oind            ON oind.id = ind.oficina_id
      JOIN oficinas oindicada       ON oindicada.id = ri.oficina_id
      JOIN pagamentos p             ON p.id   = com.pagamento_id
      LEFT JOIN usuarios u          ON u.id   = com.aprovado_por
      LEFT JOIN referral_repasses rep ON rep.comissao_id = com.id
      ORDER BY com.criado_em DESC
      LIMIT 500
    `);
    res.json(rows);
  } catch (err) {
    log.error('admin_referral_comissoes', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// POST /api/admin/referral/comissoes
// Gera comissão manualmente a partir de um pagamento elegível.
// Idempotente: UNIQUE em pagamento_id impede duplicata.
// Body: { pagamento_id, indicacao_id, valor }
// ────────────────────────────────────────────────────────────────────
router.post('/comissoes', async (req, res) => {
  try {
    const { pagamento_id, indicacao_id, valor } = req.body;

    if (!pagamento_id || !indicacao_id || !valor) {
      return res.status(400).json({ error: 'pagamento_id, indicacao_id e valor são obrigatórios' });
    }
    const valorNum = parseFloat(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0 || valorNum > 100000) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Verifica que o pagamento e a indicação pertencem à mesma oficina
    const pag = await queryOne('SELECT * FROM pagamentos WHERE id=$1', [+pagamento_id]);
    if (!pag) return res.status(404).json({ error: 'Pagamento não encontrado' });

    const ind = await queryOne('SELECT * FROM referral_indicacoes WHERE id=$1', [+indicacao_id]);
    if (!ind) return res.status(404).json({ error: 'Indicação não encontrada' });

    if (pag.oficina_id !== ind.oficina_id) {
      return res.status(400).json({ error: 'Pagamento e indicação pertencem a oficinas diferentes' });
    }

    // Verifica que não existe comissão para este pagamento (idempotência via UNIQUE)
    const existeCom = await queryOne('SELECT id FROM referral_comissoes WHERE pagamento_id=$1', [+pagamento_id]);
    if (existeCom) return res.status(409).json({ error: 'Comissão já gerada para este pagamento', id: existeCom.id });

    const com = await queryOne(`
      INSERT INTO referral_comissoes(indicacao_id, indicador_id, pagamento_id, valor, status)
      VALUES($1,$2,$3,$4,'aguardando_validacao') RETURNING id
    `, [+indicacao_id, ind.indicador_id, +pagamento_id, valorNum]);

    audit(req, 'REFERRAL_COMISSAO_CRIADA', 'referral_comissoes', com.id, { pagamento_id, indicacao_id, valor: valorNum });
    res.status(201).json({ ok: true, id: com.id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Comissão já gerada para este pagamento' });
    log.error('admin_referral_criar_comissao', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// PATCH /api/admin/referral/comissoes/:id/aprovar
// Aprova uma comissão (aguardando_validacao → aprovada)
// ────────────────────────────────────────────────────────────────────
router.patch('/comissoes/:id/aprovar', validateId, async (req, res) => {
  try {
    const result = await run(`
      UPDATE referral_comissoes SET status='aprovada', aprovado_por=$1, aprovado_em=NOW()
      WHERE id=$2 AND status='aguardando_validacao'
    `, [req.user.id, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Comissão não encontrada ou já processada' });
    audit(req, 'REFERRAL_COMISSAO_APROVADA', 'referral_comissoes', req.params.id, {});
    res.json({ ok: true });
  } catch (err) {
    log.error('admin_referral_aprovar', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// PATCH /api/admin/referral/comissoes/:id/cancelar
// Cancela uma comissão (mantém histórico)
// ────────────────────────────────────────────────────────────────────
router.patch('/comissoes/:id/cancelar', validateId, async (req, res) => {
  try {
    const obs = req.body?.obs ? String(req.body.obs).slice(0, 300) : null;
    const result = await run(`
      UPDATE referral_comissoes SET status='cancelada', obs=$1
      WHERE id=$2 AND status IN ('aguardando_validacao','aprovada')
    `, [obs, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Comissão não encontrada ou já paga/cancelada' });
    audit(req, 'REFERRAL_COMISSAO_CANCELADA', 'referral_comissoes', req.params.id, { obs });
    res.json({ ok: true });
  } catch (err) {
    log.error('admin_referral_cancelar', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// POST /api/admin/referral/repasses
// Registra repasse (comissão paga ao indicador). Idempotente via UNIQUE.
// Body: { comissao_id, valor, metodo, referencia, obs }
// ────────────────────────────────────────────────────────────────────
router.post('/repasses', async (req, res) => {
  try {
    const { comissao_id, valor, metodo, referencia, obs } = req.body;

    if (!comissao_id || !valor) {
      return res.status(400).json({ error: 'comissao_id e valor são obrigatórios' });
    }
    const valorNum = parseFloat(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }
    const METODOS = ['pix', 'transferencia', 'credito', 'outro'];
    const metodoVal = METODOS.includes(metodo) ? metodo : 'pix';

    const com = await queryOne("SELECT * FROM referral_comissoes WHERE id=$1 AND status='aprovada'", [+comissao_id]);
    if (!com) return res.status(404).json({ error: 'Comissão não encontrada ou não aprovada' });

    const existeRep = await queryOne('SELECT id FROM referral_repasses WHERE comissao_id=$1', [+comissao_id]);
    if (existeRep) return res.status(409).json({ error: 'Repasse já registrado para esta comissão', id: existeRep.id });

    const rep = await queryOne(`
      INSERT INTO referral_repasses(indicador_id, comissao_id, valor, metodo, referencia, realizado_por, obs)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `, [com.indicador_id, +comissao_id, valorNum, metodoVal, referencia||null, req.user.id, obs||null]);

    // Marca comissão como paga
    await run("UPDATE referral_comissoes SET status='paga' WHERE id=$1", [+comissao_id]);

    audit(req, 'REFERRAL_REPASSE_REGISTRADO', 'referral_repasses', rep.id, { comissao_id, valor: valorNum, metodo: metodoVal });
    res.status(201).json({ ok: true, id: rep.id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Repasse já registrado para esta comissão' });
    log.error('admin_referral_repasse', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/admin/referral/dashboard
// Resumo geral do programa para o admin
// ────────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [totais, recentes] = await Promise.all([
      queryOne(`
        SELECT
          (SELECT COUNT(*) FROM referral_indicadores)                             AS total_indicadores,
          (SELECT COUNT(*) FROM referral_indicadores WHERE status='ativo')        AS indicadores_ativos,
          (SELECT COUNT(*) FROM referral_indicacoes)                              AS total_indicacoes,
          (SELECT COUNT(*) FROM referral_indicacoes WHERE status='pagante')       AS pagantes,
          (SELECT COALESCE(SUM(total_cliques),0) FROM referral_codigos)           AS total_cliques,
          (SELECT COALESCE(SUM(valor),0) FROM referral_comissoes WHERE status='aguardando_validacao') AS comissoes_pendentes,
          (SELECT COALESCE(SUM(valor),0) FROM referral_comissoes WHERE status='aprovada')             AS comissoes_aprovadas,
          (SELECT COALESCE(SUM(valor),0) FROM referral_comissoes WHERE status='paga')                 AS comissoes_pagas
      `),
      query(`
        SELECT ri.id, ri.criado_em, ri.status,
               oind.nome AS indicador_nome, oindicada.nome AS indicado_nome
        FROM referral_indicacoes ri
        JOIN referral_indicadores ind ON ind.id = ri.indicador_id
        JOIN oficinas oind ON oind.id = ind.oficina_id
        JOIN oficinas oindicada ON oindicada.id = ri.oficina_id
        ORDER BY ri.criado_em DESC LIMIT 10
      `),
    ]);
    res.json({ totais, recentes });
  } catch (err) {
    log.error('admin_referral_dashboard', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
