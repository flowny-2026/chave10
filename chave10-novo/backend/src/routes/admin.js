const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query, queryOne, run } = require('../db');
const { authMiddleware, masterAdminOnly } = require('../middleware/auth');
const { validateOficina, validateUsuario, validatePagamento, validateId, validateRenovarLote, validateRedefinirSenha } = require('../middleware/validate');
const { sensitiveOpsLimiter } = require('../middleware/rateLimits');
const { audit, ACOES } = require('../services/auditService');
const log = require('../utils/logger');

router.use(authMiddleware, masterAdminOnly);

// DASHBOARD
router.get('/dashboard', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const mesInicio = hoje.substring(0,7)+'-01';
    const [tot,ativ,over,blk,recMes,recTot,venc] = await Promise.all([
      queryOne("SELECT COUNT(*) n FROM oficinas"),
      queryOne("SELECT COUNT(*) n FROM oficinas WHERE status_assinatura='active'"),
      queryOne("SELECT COUNT(*) n FROM oficinas WHERE status_assinatura='overdue'"),
      queryOne("SELECT COUNT(*) n FROM oficinas WHERE status_assinatura='blocked'"),
      queryOne("SELECT COALESCE(SUM(valor),0) n FROM pagamentos WHERE data_pagamento>=$1",[mesInicio]),
      queryOne("SELECT COALESCE(SUM(valor),0) n FROM pagamentos"),
      queryOne("SELECT COUNT(*) n FROM oficinas WHERE data_vencimento BETWEEN $1 AND $2",[hoje, new Date(Date.now()+7*86400000).toISOString().split('T')[0]]),
    ]);
    const stats = { totalOficinas:+tot.n, ativas:+ativ.n, overdue:+over.n, blocked:+blk.n, receitaMes:+recMes.n, receitaTotal:+recTot.n, vencendo:+venc.n };
    const receitaMensal = [];
    for (let i=5;i>=0;i--) {
      const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
      const ano=d.getFullYear(), mes=String(d.getMonth()+1).padStart(2,'0');
      const r = await queryOne("SELECT COALESCE(SUM(valor),0) total FROM pagamentos WHERE data_pagamento>=$1 AND data_pagamento<=$2",[`${ano}-${mes}-01`,`${ano}-${mes}-31`]);
      receitaMensal.push({mes:`${mes}/${String(ano).slice(2)}`,total:+r.total});
    }
    const recentes = await query("SELECT p.*,o.nome as nome_oficina FROM pagamentos p JOIN oficinas o ON o.id=p.oficina_id ORDER BY p.data_pagamento DESC LIMIT 10");
    res.json({stats,receitaMensal,recentes});
  } catch(err){log.error('admin_dashboard',err);res.status(500).json({error:'Erro interno'});}
});

// OFICINAS
router.get('/oficinas', async (req,res) => {
  try {
    const {status}=req.query;
    const validos=['active','pending','overdue','blocked'];
    if(status&&!validos.includes(status)) return res.status(400).json({error:'Status inválido'});
    
    // Busca oficinas com último acesso mais recente
    let baseQuery = `
      SELECT 
        o.*,
        MAX(u.ultimo_acesso) as ultimo_acesso
      FROM oficinas o
      LEFT JOIN usuarios u ON u.oficina_id = o.id AND u.ativo = 1
    `;
    
    const p = [];
    if (status) {
      baseQuery += ' WHERE o.status_assinatura = $1';
      p.push(status);
    }
    
    baseQuery += ' GROUP BY o.id ORDER BY o.nome';
    
    res.json(await query(baseQuery, p));
  } catch(err){
    log.error('admin_get_oficinas', err);
    res.status(500).json({error:'Erro interno'});
  }
});

router.post('/oficinas', validateOficina, async (req,res) => {
  try {
    const {nome,responsavel,telefone,email,plano,data_vencimento,observacoes}=req.body;
    const r=await queryOne("INSERT INTO oficinas(nome,responsavel,telefone,email,plano,data_vencimento,observacoes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",[nome,responsavel||null,telefone||null,email,plano||'mensal',data_vencimento||null,observacoes||null]);
    log.info('oficina_criada',{id:r.id,nome});
    audit(req, ACOES.CRIAR_OFICINA, 'oficinas', r.id, { nome, email, plano });
    res.status(201).json({id:r.id});
  } catch(err){if(err.code==='23505')return res.status(400).json({error:'Email já cadastrado'});res.status(500).json({error:'Erro interno'});}
});

router.put('/oficinas/:id', validateId, validateOficina, async (req,res) => {
  try {
    const {nome,responsavel,telefone,email,plano,status_assinatura,data_vencimento,observacoes,logo,endereco}=req.body;
    await run("UPDATE oficinas SET nome=COALESCE($1,nome),responsavel=COALESCE($2,responsavel),telefone=COALESCE($3,telefone),email=COALESCE($4,email),plano=COALESCE($5,plano),status_assinatura=COALESCE($6,status_assinatura),data_vencimento=COALESCE($7,data_vencimento),observacoes=COALESCE($8,observacoes),logo=COALESCE($9,logo),endereco=COALESCE($10,endereco) WHERE id=$11",[nome,responsavel||null,telefone||null,email,plano||null,status_assinatura||null,data_vencimento||null,observacoes||null,logo||null,endereco||null,req.params.id]);
    audit(req, ACOES.EDITAR_OFICINA, 'oficinas', req.params.id, { nome, email, plano, status_assinatura });
    res.json({ok:true});
  } catch(err){if(err.code==='23505')return res.status(400).json({error:'Email já cadastrado'});res.status(500).json({error:'Erro interno'});}
});

router.patch('/oficinas/:id/status', validateId, async (req,res) => {
  try {
    const status = req.body?.status;
    if(!status || !['active','pending','overdue','blocked'].includes(status)) return res.status(400).json({error:'Status inválido'});
    await run('UPDATE oficinas SET status_assinatura=$1 WHERE id=$2',[status,req.params.id]);
    audit(req, ACOES.ALTERAR_STATUS_OFICINA, 'oficinas', req.params.id, { novo_status: status });
    res.json({ok:true});
  } catch(err){log.error('admin_status_oficina',err);res.status(500).json({error:'Erro interno'});}
});

router.delete('/oficinas/:id', validateId, async (req,res) => {
  try {
    const oficina = await queryOne('SELECT nome, email FROM oficinas WHERE id=$1', [req.params.id]);
    await run('DELETE FROM oficinas WHERE id=$1',[req.params.id]);
    audit(req, ACOES.DELETAR_OFICINA, 'oficinas', req.params.id, { nome: oficina?.nome, email: oficina?.email });
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

router.get('/oficinas/:id/usuarios', validateId, async (req,res) => {
  try { res.json(await query('SELECT id,nome,email,perfil,ativo,ultimo_acesso FROM usuarios WHERE oficina_id=$1',[req.params.id])); }
  catch(err){res.status(500).json({error:'Erro interno'});}
});

router.get('/oficinas/:id/detalhes', validateId, async (req,res) => {
  try {
    const id=req.params.id;
    const [oficina,usuarios,pagamentos,clientes,veiculos,os,fat] = await Promise.all([
      queryOne('SELECT * FROM oficinas WHERE id=$1',[id]),
      query('SELECT id,nome,email,perfil,ativo,ultimo_acesso FROM usuarios WHERE oficina_id=$1',[id]),
      query('SELECT * FROM pagamentos WHERE oficina_id=$1 ORDER BY data_pagamento DESC LIMIT 10',[id]),
      queryOne('SELECT COUNT(*) n FROM clientes WHERE oficina_id=$1',[id]),
      queryOne('SELECT COUNT(*) n FROM veiculos WHERE oficina_id=$1',[id]),
      queryOne('SELECT COUNT(*) n FROM ordens_servico WHERE oficina_id=$1',[id]),
      queryOne("SELECT COALESCE(SUM(valor),0) n FROM ordens_servico WHERE oficina_id=$1 AND status='finalizado'",[id]),
    ]);
    const osMes = await queryOne("SELECT COUNT(*) n FROM ordens_servico WHERE oficina_id=$1 AND data>=date_trunc('month',CURRENT_DATE)::text",[id]);
    res.json({oficina,usuarios,pagamentos,uso:{clientes:+clientes.n,veiculos:+veiculos.n,os:+os.n,osMes:+osMes.n,faturamento:+fat.n}});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// USUÁRIOS
router.post('/usuarios', validateUsuario, async (req,res) => {
  try {
    const {oficina_id,nome,email,senha,perfil}=req.body;
    if(perfil==='master_admin') return res.status(403).json({error:'Não permitido'});
    const perfilFinal = ['admin_oficina','funcionario'].includes(perfil) ? perfil : 'funcionario';
    const hash=bcrypt.hashSync(senha,12);
    const r=await queryOne("INSERT INTO usuarios(oficina_id,nome,email,senha_hash,perfil) VALUES($1,$2,$3,$4,$5) RETURNING id",[oficina_id||null,nome,email,hash,perfilFinal]);
    log.info('usuario_criado',{id:r.id,nome,perfil:perfilFinal,oficina_id});
    audit(req, ACOES.CRIAR_USUARIO, 'usuarios', r.id, { nome, email, perfil: perfilFinal, oficina_id });
    res.status(201).json({id:r.id});
  } catch(err){if(err.code==='23505')return res.status(400).json({error:'Email já cadastrado'});res.status(500).json({error:'Erro interno'});}
});

// PAGAMENTOS
router.post('/pagamentos', validatePagamento, async (req,res) => {
  try {
    const {oficina_id,valor,data_pagamento,novo_vencimento,forma_pagamento,observacao}=req.body;
    if(!oficina_id) return res.status(400).json({error:'oficina_id obrigatório'});
    await run("INSERT INTO pagamentos(oficina_id,valor,data_pagamento,novo_vencimento,forma_pagamento,observacao,confirmado_por) VALUES($1,$2,$3,$4,$5,$6,$7)",[oficina_id,valor,data_pagamento||new Date().toISOString().split('T')[0],novo_vencimento,forma_pagamento||'pix',observacao||null,String(req.user.id)]);
    await run("UPDATE oficinas SET status_assinatura='active',data_vencimento=$1 WHERE id=$2",[novo_vencimento,oficina_id]);
    res.status(201).json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

router.get('/pagamentos', async (req,res) => {
  try {
    const rawOficinaId = req.query.oficina_id;
    let q="SELECT p.*,o.nome as nome_oficina FROM pagamentos p JOIN oficinas o ON o.id=p.oficina_id";
    const p=[];
    if(rawOficinaId !== undefined){
      const oficId = parseInt(rawOficinaId, 10);
      if(!Number.isInteger(oficId) || oficId <= 0){
        return res.status(400).json({error:'oficina_id inválido'});
      }
      q+=' WHERE p.oficina_id=$1';p.push(oficId);
    }
    q+=' ORDER BY p.data_pagamento DESC';
    res.json(await query(q, p.length ? p : []));
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// VENCENDO
router.get('/vencendo', async (req,res) => {
  try {
    const hoje=new Date().toISOString().split('T')[0];
    const em7=new Date();em7.setDate(em7.getDate()+7);
    res.json(await query("SELECT * FROM oficinas WHERE data_vencimento BETWEEN $1 AND $2 AND status_assinatura IN ('active','overdue') ORDER BY data_vencimento",[hoje,em7.toISOString().split('T')[0]]));
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// RENOVAÇÃO EM LOTE
router.post('/renovar-lote', validateRenovarLote, async (req,res) => {
  try {
    const {ids,novo_vencimento,valor,forma_pagamento}=req.body;
    // validateRenovarLote já garantiu ids válidos e novo_vencimento válido
    const hoje=new Date().toISOString().split('T')[0];
    for(const id of ids){
      await run("UPDATE oficinas SET status_assinatura='active',data_vencimento=$1 WHERE id=$2",[novo_vencimento,id]);
      if(valor&&parseFloat(valor)>0) await run("INSERT INTO pagamentos(oficina_id,valor,data_pagamento,novo_vencimento,forma_pagamento,confirmado_por) VALUES($1,$2,$3,$4,$5,$6)",[id,parseFloat(valor),hoje,novo_vencimento,forma_pagamento||'pix',String(req.user.id)]);
    }
    res.json({ok:true,renovadas:ids.length});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// TROCAR SENHA DO ADMIN — sensitiveOpsLimiter: 10 tentativas / 15 min por IP
router.post('/trocar-senha', sensitiveOpsLimiter, async (req,res) => {
  try {
    const senha_atual = req.body?.senha_atual;
    const senha_nova  = req.body?.senha_nova;

    if (!senha_atual || typeof senha_atual !== 'string' || !senha_nova || typeof senha_nova !== 'string') {
      return res.status(400).json({error:'Senha atual e nova senha são obrigatórias'});
    }
    if (senha_atual.length > 128 || senha_nova.length > 128) {
      return res.status(400).json({error:'Senha muito longa (máximo 128 caracteres)'});
    }
    if (senha_nova.length < 8) {
      return res.status(400).json({error:'Nova senha deve ter no mínimo 8 caracteres'});
    }
    if (senha_nova === senha_atual) {
      return res.status(400).json({error:'Nova senha deve ser diferente da atual'});
    }

    const admin = await queryOne('SELECT * FROM usuarios WHERE id=$1 AND perfil=$2', [req.user.id, 'master_admin']);
    if (!admin) return res.status(404).json({error:'Administrador não encontrado'});

    const senhaCorreta = bcrypt.compareSync(senha_atual, admin.senha_hash);
    if (!senhaCorreta) {
      log.warn('troca_senha_falhou', {admin_id: admin.id, motivo: 'senha_atual_incorreta'});
      audit(req, ACOES.TROCAR_SENHA_FALHA, 'usuarios', admin.id, { motivo: 'senha_atual_incorreta' }, 'falha');
      return res.status(401).json({error:'Senha atual incorreta'});
    }

    const novoHash = bcrypt.hashSync(senha_nova, 12);
    await run('UPDATE usuarios SET senha_hash=$1 WHERE id=$2', [novoHash, admin.id]);

    log.info('senha_admin_alterada', {admin_id: admin.id, email: admin.email});
    audit(req, ACOES.TROCAR_SENHA, 'usuarios', admin.id, {});
    res.json({ok:true, message:'Senha alterada com sucesso'});
  } catch(err){
    log.error('admin_trocar_senha',err);
    res.status(500).json({error:'Erro interno'});
  }
});

// REDEFINIR SENHA DE USUÁRIO (pelo admin) — sensitiveOpsLimiter: 10 tentativas / 15 min
router.patch('/usuarios/:id/redefinir-senha', sensitiveOpsLimiter, validateId, validateRedefinirSenha, async (req,res) => {
  try {
    const { nova_senha } = req.body;
    const usuario = await queryOne('SELECT id, perfil, nome, email FROM usuarios WHERE id=$1', [req.params.id]);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (usuario.perfil === 'master_admin') return res.status(403).json({ error: 'Não é possível redefinir a senha do admin master por aqui' });
    const hash = bcrypt.hashSync(nova_senha, 12);
    await run('UPDATE usuarios SET senha_hash=$1 WHERE id=$2', [hash, req.params.id]);
    log.info('senha_redefinida_pelo_admin', { usuario_id: usuario.id, email: usuario.email, admin_id: req.user.id });
    audit(req, ACOES.REDEFINIR_SENHA, 'usuarios', usuario.id, { email: usuario.email, perfil: usuario.perfil });
    res.json({ ok: true });
  } catch(err) { log.error('admin_redefinir_senha', err); res.status(500).json({ error: 'Erro interno' }); }
});

// USUÁRIOS PENDENTES (sem oficina)
router.get('/usuarios-pendentes', async (req,res) => {
  try {
    const rows = await query("SELECT id, nome, email, perfil, oficina_id, ultimo_acesso FROM usuarios WHERE perfil != 'master_admin' ORDER BY id DESC");
    res.json(rows);
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DESVINCULAR USUÁRIO DE OFICINA
router.patch('/usuarios/:id/desvincular', validateId, async (req,res) => {
  try {
    const usuario = await queryOne('SELECT nome, email, oficina_id FROM usuarios WHERE id=$1', [req.params.id]);
    await run('UPDATE usuarios SET oficina_id=NULL WHERE id=$1', [req.params.id]);
    audit(req, ACOES.DESVINCULAR_USUARIO, 'usuarios', req.params.id, { email: usuario?.email, oficina_id_anterior: usuario?.oficina_id });
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DELETAR USUÁRIO
router.delete('/usuarios/:id', validateId, async (req,res) => {
  try {
    const user = await queryOne('SELECT perfil, nome, email FROM usuarios WHERE id=$1', [req.params.id]);
    if (user?.perfil === 'master_admin') return res.status(403).json({error:'Não é possível deletar o admin master'});
    await run('DELETE FROM usuarios WHERE id=$1', [req.params.id]);
    audit(req, ACOES.DELETAR_USUARIO, 'usuarios', req.params.id, { nome: user?.nome, email: user?.email, perfil: user?.perfil });
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// ── AUDIT LOGS ────────────────────────────────────────────────
// Consulta dos registros de auditoria — apenas master_admin
router.get('/audit-logs', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset   = (page - 1) * limit;

    // Filtros opcionais
    const oficina_id  = req.query.oficina_id  ? parseInt(req.query.oficina_id)  : null;
    const usuario_id  = req.query.usuario_id  ? parseInt(req.query.usuario_id)  : null;
    const acao        = req.query.acao        ? String(req.query.acao).slice(0, 60)  : null;
    const resultado   = ['sucesso','falha'].includes(req.query.resultado) ? req.query.resultado : null;
    const data_inicio = /^\d{4}-\d{2}-\d{2}$/.test(req.query.data_inicio) ? req.query.data_inicio : null;
    const data_fim    = /^\d{4}-\d{2}-\d{2}$/.test(req.query.data_fim)    ? req.query.data_fim    : null;
    const busca       = req.query.busca ? String(req.query.busca).slice(0, 100) : null;

    const conditions = [];
    const params     = [];

    if (oficina_id) { params.push(oficina_id);  conditions.push(`a.oficina_id = $${params.length}`); }
    if (usuario_id) { params.push(usuario_id);  conditions.push(`a.usuario_id = $${params.length}`); }
    if (acao)       { params.push(acao);        conditions.push(`a.acao = $${params.length}`); }
    if (resultado)  { params.push(resultado);   conditions.push(`a.resultado = $${params.length}`); }
    if (data_inicio){ params.push(data_inicio + 'T00:00:00Z'); conditions.push(`a.created_at >= $${params.length}`); }
    if (data_fim)   { params.push(data_fim    + 'T23:59:59Z'); conditions.push(`a.created_at <= $${params.length}`); }
    if (busca) {
      params.push(`%${busca}%`);
      conditions.push(`(a.usuario_nome ILIKE $${params.length} OR a.usuario_email ILIKE $${params.length} OR a.acao ILIKE $${params.length})`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRow = await queryOne(
      `SELECT COUNT(*) n FROM audit_logs a ${where}`,
      params
    );

    params.push(limit, offset);
    const rows = await query(
      `SELECT a.id, a.oficina_id, a.usuario_id, a.usuario_nome, a.usuario_email,
              a.perfil, a.acao, a.entidade, a.entidade_id, a.detalhes,
              a.resultado, a.ip, a.user_agent,
              to_char(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') AS created_at_br,
              a.created_at,
              o.nome AS oficina_nome
       FROM audit_logs a
       LEFT JOIN oficinas o ON o.id = a.oficina_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      total: +countRow.n,
      page,
      limit,
      pages: Math.ceil(+countRow.n / limit),
      logs: rows,
    });
  } catch(err) {
    log.error('admin_audit_logs', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Lista ações disponíveis para filtro no frontend
router.get('/audit-logs/acoes', (req, res) => {
  const { ACOES } = require('../services/auditService');
  res.json(Object.values(ACOES).sort());
});

module.exports = router;
