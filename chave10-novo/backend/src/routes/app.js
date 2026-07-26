const router = require('express').Router();
const { query, queryOne, run } = require('../db');
const { authMiddleware, oficinaSelf, naoFuncionario } = require('../middleware/auth');
const {
  validateCliente, validateVeiculo, validateOS, validateId,
  validateDespesa, validateLembrete, validateAgenda, validateEstoque,
  validatePagamentoOS, validateQuery, validateOrcamento, validatePagination,
} = require('../middleware/validate');
const {
  checkOwns,
  checkClienteOwnership,
  checkVeiculoOwnership,
  checkClienteVeiculoOwnership,
  checkQueryClienteOwnership,
} = require('../middleware/authorization');
const { validateLogoUpload } = require('../middleware/uploadValidator');
const { audit, ACOES } = require('../services/auditService');
const log = require('../utils/logger');

router.use(authMiddleware, oficinaSelf);

// oficina_id vem SEMPRE do JWT — nunca do body/query/params
const oid = req => req.user.oficina_id;

// DASHBOARD
router.get('/dashboard', async (req,res) => {
  try {
    const id=oid(req), hoje=new Date().toISOString().split('T')[0], mesInicio=hoje.substring(0,7)+'-01';
    const isFuncionario = req.user?.perfil === 'funcionario';

    const [emAnd,finHoje,fatMes,totCli] = await Promise.all([
      queryOne("SELECT COUNT(*) n FROM ordens_servico WHERE oficina_id=$1 AND status='em_andamento'",[id]),
      queryOne("SELECT COUNT(*) n FROM ordens_servico WHERE oficina_id=$1 AND status='finalizado' AND data=$2",[id,hoje]),
      isFuncionario ? Promise.resolve({n:0,mo:0,pecas:0,hoje:0}) : queryOne("SELECT COALESCE(SUM(valor),0) n, COALESCE(SUM(valor_mo),0) mo, COALESCE(SUM(valor_pecas),0) pecas, COALESCE(SUM(CASE WHEN data=$2 THEN valor ELSE 0 END),0) hoje FROM ordens_servico WHERE oficina_id=$1 AND status='finalizado' AND data>=$3",[id,hoje,mesInicio]),
      queryOne("SELECT COUNT(*) n FROM clientes WHERE oficina_id=$1",[id]),
    ]);

    const stats={
      emAndamento:+emAnd.n,
      finalizadasHoje:+finHoje.n,
      faturamentoMes:isFuncionario?null:+fatMes.n,
      faturamentoHoje:isFuncionario?null:+fatMes.hoje,
      moMes:isFuncionario?null:+fatMes.mo,
      pecasMes:isFuncionario?null:+fatMes.pecas,
      totalClientes:+totCli.n
    };

    // ── Painel do Dia ──────────────────────────────────────────
    // OS prontas aguardando entrega (finalizadas hoje ou antes, sem data de entrega registrada)
    const osProntas = await query(
      "SELECT os.id, os.data, c.nome as cliente_nome, c.telefone as cliente_telefone, v.modelo as veiculo_modelo, v.placa FROM ordens_servico os LEFT JOIN clientes c ON c.id=os.cliente_id LEFT JOIN veiculos v ON v.id=os.veiculo_id WHERE os.oficina_id=$1 AND os.status='finalizado' AND os.data>=$2 ORDER BY os.data ASC LIMIT 10",
      [id, new Date(Date.now()-7*86400000).toISOString().split('T')[0]]
    );

    // Orçamentos aguardando resposta
    const orcamentosAguardando = await query(
      "SELECT id, created_at, cliente_nome, total FROM orcamentos WHERE oficina_id=$1 AND status='pendente' ORDER BY created_at DESC LIMIT 10",
      [id]
    ).catch(()=>[]);

    // Agenda de hoje
    const agendaHoje = await query(
      "SELECT a.*, c.nome as cliente_nome, c.telefone as cliente_telefone, v.modelo as veiculo_modelo, v.placa FROM agenda a LEFT JOIN clientes c ON c.id=a.cliente_id LEFT JOIN veiculos v ON v.id=a.veiculo_id WHERE a.oficina_id=$1 AND a.data=$2 ORDER BY a.hora ASC",
      [id, hoje]
    ).catch(()=>[]);

    // Agenda de amanhã
    const amanha = new Date(); amanha.setDate(amanha.getDate()+1);
    const agendaAmanha = await query(
      "SELECT a.*, c.nome as cliente_nome FROM agenda a LEFT JOIN clientes c ON c.id=a.cliente_id WHERE a.oficina_id=$1 AND a.data=$2 ORDER BY a.hora ASC",
      [id, amanha.toISOString().split('T')[0]]
    ).catch(()=>[]);

    // OS atrasadas (em andamento criadas há mais de 3 dias)
    const osAtrasadas = await query(
      "SELECT os.id, os.data, c.nome as cliente_nome, v.modelo as veiculo_modelo, v.placa FROM ordens_servico os LEFT JOIN clientes c ON c.id=os.cliente_id LEFT JOIN veiculos v ON v.id=os.veiculo_id WHERE os.oficina_id=$1 AND os.status='em_andamento' AND os.data<=$2 ORDER BY os.data ASC LIMIT 5",
      [id, new Date(Date.now()-3*86400000).toISOString().split('T')[0]]
    ).catch(()=>[]);

    // Despesas vencidas não pagas
    const despesasVencidas = isFuncionario ? [] : await query(
      "SELECT id, descricao, valor, vencimento FROM despesas WHERE oficina_id=$1 AND pago=0 AND vencimento<$2 ORDER BY vencimento ASC LIMIT 5",
      [id, hoje]
    ).catch(()=>[]);

    // Faturamento hoje (nenhuma OS finalizada hoje)
    const semFaturamentoHoje = !isFuncionario && +fatMes.hoje === 0;

    const painelDoDia = {
      osProntas,
      orcamentosAguardando,
      agendaHoje,
      agendaAmanha,
      osAtrasadas,
      despesasVencidas,
      semFaturamentoHoje,
    };
    // ──────────────────────────────────────────────────────────

    const recentes=await query("SELECT os.*,c.nome as cliente_nome,v.modelo as veiculo_modelo,v.placa FROM ordens_servico os LEFT JOIN clientes c ON c.id=os.cliente_id LEFT JOIN veiculos v ON v.id=os.veiculo_id WHERE os.oficina_id=$1 ORDER BY os.id DESC LIMIT 5",[id]);
    const recentesFiltradas = isFuncionario
      ? recentes.map(({valor, valor_mo, valor_pecas, ...rest}) => rest)
      : recentes;

    let faturamentoMensal = [];
    if (!isFuncionario) {
      for(let i=5;i>=0;i--){
        const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
        const ano=d.getFullYear(),mes=String(d.getMonth()+1).padStart(2,'0');
        const r=await queryOne("SELECT COALESCE(SUM(valor),0) total FROM ordens_servico WHERE oficina_id=$1 AND status='finalizado' AND data>=$2 AND data<=$3",[id,`${ano}-${mes}-01`,`${ano}-${mes}-31`]);
        faturamentoMensal.push({mes:`${mes}/${String(ano).slice(2)}`,total:+r.total});
      }
    }

    res.json({stats, recentes:recentesFiltradas, faturamentoMensal, painelDoDia});
  } catch(err){log.error('app_dashboard',err);res.status(500).json({error:'Erro interno'});}
});

// CLIENTES
router.get('/clientes', validateQuery, async (req,res) => {
  try {
    const {q}=req.query;
    let sql="SELECT c.*,COUNT(v.id) as total_veiculos FROM clientes c LEFT JOIN veiculos v ON v.cliente_id=c.id WHERE c.oficina_id=$1";
    const p=[oid(req)];
    if(q&&typeof q==='string'){sql+=' AND (c.nome ILIKE $2 OR c.telefone ILIKE $2)';p.push(`%${q.slice(0,100)}%`);}
    sql+=' GROUP BY c.id ORDER BY c.nome';
    res.json(await query(sql,p));
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

router.post('/clientes', validateCliente, async (req,res) => {
  try {
    const {nome,telefone,email,obs,endereco}=req.body;
    const r=await queryOne("INSERT INTO clientes(oficina_id,nome,telefone,email,obs,endereco) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[oid(req),nome,telefone||null,email||null,obs||null,endereco||null]);
    audit(req, ACOES.CRIAR_CLIENTE, 'clientes', r.id, { nome, telefone });
    res.status(201).json({id:r.id,nome,telefone,email,obs,endereco});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// PUT /clientes/:id — checkOwns garante pertencimento à oficina antes de atualizar
router.put('/clientes/:id', validateId, checkOwns('clientes'), validateCliente, async (req,res) => {
  try {
    const {nome,telefone,email,obs,endereco}=req.body;
    const result = await run("UPDATE clientes SET nome=COALESCE($1,nome),telefone=COALESCE($2,telefone),email=COALESCE($3,email),obs=COALESCE($4,obs),endereco=COALESCE($5,endereco) WHERE id=$6 AND oficina_id=$7",[nome,telefone||null,email||null,obs||null,endereco||null,req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Cliente não encontrado'});
    audit(req, ACOES.EDITAR_CLIENTE, 'clientes', req.params.id, { nome, telefone });
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DELETE /clientes/:id — checkOwns confirma pertencimento
router.delete('/clientes/:id', validateId, checkOwns('clientes'), async (req,res) => {
  try {
    const result = await run('DELETE FROM clientes WHERE id=$1 AND oficina_id=$2',[req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Cliente não encontrado'});
    audit(req, ACOES.DELETAR_CLIENTE, 'clientes', req.params.id, {});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// VEÍCULOS
// GET /veiculos — filtro por cliente_id validado contra a oficina do usuário
// checkQueryClienteOwnership garante que cliente_id (se informado) pertence à oficina
router.get('/veiculos', checkQueryClienteOwnership, async (req,res) => {
  try {
    const clienteId = req.query.cliente_id; // já validado e normalizado pelo middleware
    let q="SELECT v.*,c.nome as cliente_nome FROM veiculos v LEFT JOIN clientes c ON c.id=v.cliente_id WHERE v.oficina_id=$1";
    const p=[oid(req)];
    if(clienteId !== undefined){
      q+=' AND v.cliente_id=$2';p.push(clienteId);
    }
    q+=' ORDER BY v.modelo';
    res.json(await query(q,p));
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// POST /veiculos — cliente_id validado contra a oficina (evita IDOR write)
router.post('/veiculos', validateVeiculo, checkClienteOwnership, async (req,res) => {
  try {
    const {cliente_id,placa,modelo,marca,ano,km}=req.body;
    const r=await queryOne("INSERT INTO veiculos(oficina_id,cliente_id,placa,modelo,marca,ano,km) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",[oid(req),cliente_id||null,placa||null,modelo,marca||null,ano||null,km||null]);
    res.status(201).json({id:r.id,placa,modelo,marca,ano,km});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// PUT /veiculos/:id — checkOwns garante que o veículo pertence à oficina (evita IDOR)
// checkClienteOwnership garante que o novo cliente_id (se informado) também pertence
router.put('/veiculos/:id', validateId, checkOwns('veiculos'), validateVeiculo, checkClienteOwnership, async (req,res) => {
  try {
    const {cliente_id,placa,modelo,marca,ano,km}=req.body;
    const result = await run("UPDATE veiculos SET cliente_id=COALESCE($1,cliente_id),placa=COALESCE($2,placa),modelo=COALESCE($3,modelo),marca=COALESCE($4,marca),ano=COALESCE($5,ano),km=COALESCE($6,km) WHERE id=$7 AND oficina_id=$8",[cliente_id||null,placa||null,modelo,marca||null,ano||null,km||null,req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Veículo não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DELETE /veiculos/:id — checkOwns confirma pertencimento antes de deletar
router.delete('/veiculos/:id', validateId, checkOwns('veiculos'), async (req,res) => {
  try {
    const result = await run('DELETE FROM veiculos WHERE id=$1 AND oficina_id=$2',[req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Veículo não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// ORDENS DE SERVIÇO
router.get('/os', async (req,res) => {
  try {
    const {status}=req.query;
    const isFuncionario = req.user?.perfil === 'funcionario';
    if(status&&!['em_andamento','finalizado'].includes(status)) return res.status(400).json({error:'Status inválido'});
    let q="SELECT os.*,c.nome as cliente_nome,c.telefone as cliente_telefone,c.endereco as cliente_endereco,v.modelo as veiculo_modelo,v.placa,v.marca as veiculo_marca,v.ano as veiculo_ano,v.km as veiculo_km FROM ordens_servico os LEFT JOIN clientes c ON c.id=os.cliente_id LEFT JOIN veiculos v ON v.id=os.veiculo_id WHERE os.oficina_id=$1";
    const p=[oid(req)];
    if(status){q+=' AND os.status=$2';p.push(status);}
    q+=' ORDER BY os.id DESC';
    const rows=(await query(q,p)).map(r=>{
      const base = {...r,pecas_itens:r.pecas_itens?JSON.parse(r.pecas_itens):[]};
      // Omite valores financeiros para funcionários
      if(isFuncionario) {
        const {valor, valor_mo, valor_pecas, ...rest} = base;
        return rest;
      }
      return base;
    });
    res.json(rows);
  } catch(err){log.error('app_get_os',err);res.status(500).json({error:'Erro interno'});}
});

// POST /os — valida que cliente_id e veiculo_id (se informados) pertencem à oficina
router.post('/os', validateOS, checkClienteVeiculoOwnership, async (req,res) => {
  try {
    const {cliente_id,veiculo_id,descricao,servicos,pecas,pecas_itens,valor_mo,valor_pecas,observacao,data}=req.body;
    const isFuncionario = req.user?.perfil === 'funcionario';
    const valorMO = isFuncionario ? 0 : (parseFloat(valor_mo)||0);
    const valorPecas = isFuncionario ? 0 : (parseFloat(valor_pecas)||0);
    const valor = valorMO + valorPecas;
    const id=oid(req);
    const cnt=await queryOne("SELECT COUNT(*) n FROM ordens_servico WHERE oficina_id=$1",[id]);
    const numero=String(+cnt.n+1).padStart(4,'0');
    const r=await queryOne("INSERT INTO ordens_servico(oficina_id,cliente_id,veiculo_id,descricao,servicos,pecas,pecas_itens,valor_mo,valor_pecas,valor,observacao,data,numero) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id",[id,cliente_id||null,veiculo_id||null,descricao,servicos||null,pecas||null,pecas_itens?JSON.stringify(pecas_itens):null,valorMO,valorPecas,valor,observacao||null,data||new Date().toISOString().split('T')[0],numero]);
    audit(req, ACOES.CRIAR_OS, 'ordens_servico', r.id, { numero, cliente_id, veiculo_id, data: data||new Date().toISOString().split('T')[0] });
    res.status(201).json({id:r.id,numero});
  } catch(err){log.error('app_post_os',err);res.status(500).json({error:'Erro interno'});}
});

// PUT /os/:id — checkOwns + valida cliente_id/veiculo_id do body
router.put('/os/:id', validateId, checkOwns('ordens_servico'), validateOS, checkClienteVeiculoOwnership, async (req,res) => {
  try {
    const {descricao,servicos,pecas,pecas_itens,valor_mo,valor_pecas,status,observacao,cliente_id,veiculo_id,data}=req.body;
    const isFuncionario = req.user?.perfil === 'funcionario';
    if(status&&!['em_andamento','finalizado'].includes(status)) return res.status(400).json({error:'Status inválido'});
    const valorMO    = isFuncionario ? null : (valor_mo     !== undefined ? Math.max(0, parseFloat(valor_mo)    || 0) : null);
    const valorPecas = isFuncionario ? null : (valor_pecas  !== undefined ? Math.max(0, parseFloat(valor_pecas) || 0) : null);
    const valor      = (valorMO !== null && valorPecas !== null) ? valorMO + valorPecas : null;
    const result = await run(
      "UPDATE ordens_servico SET descricao=COALESCE($1,descricao),servicos=COALESCE($2,servicos),pecas=COALESCE($3,pecas),pecas_itens=COALESCE($4,pecas_itens),valor_mo=COALESCE($5,valor_mo),valor_pecas=COALESCE($6,valor_pecas),valor=COALESCE($7,valor),status=COALESCE($8,status),observacao=COALESCE($9,observacao),cliente_id=COALESCE($10,cliente_id),veiculo_id=COALESCE($11,veiculo_id),data=COALESCE($12,data) WHERE id=$13 AND oficina_id=$14",
      [descricao||null,servicos||null,pecas||null,pecas_itens?JSON.stringify(pecas_itens):null,valorMO,valorPecas,valor,status||null,observacao||null,cliente_id||null,veiculo_id||null,data||null,req.params.id,oid(req)]
    );
    if(result.rowCount === 0) return res.status(404).json({error:'OS não encontrada'});
    audit(req, ACOES.EDITAR_OS, 'ordens_servico', req.params.id, { status, cliente_id, veiculo_id });
    res.json({ok:true});
  } catch(err){log.error('app_put_os',err);res.status(500).json({error:'Erro interno'});}
});

// PATCH /os/:id/status — checkOwns garante pertencimento
router.patch('/os/:id/status', validateId, checkOwns('ordens_servico'), async (req,res) => {
  try {
    const status = req.body?.status;
    if(!status || !['em_andamento','finalizado'].includes(status)) return res.status(400).json({error:'Status inválido'});
    const result = await run('UPDATE ordens_servico SET status=$1 WHERE id=$2 AND oficina_id=$3',[status,req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'OS não encontrada'});
    audit(req, ACOES.ALTERAR_STATUS_OS, 'ordens_servico', req.params.id, { novo_status: status });
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DELETE /os/:id — checkOwns confirma pertencimento
router.delete('/os/:id', validateId, checkOwns('ordens_servico'), async (req,res) => {
  try {
    const result = await run('DELETE FROM ordens_servico WHERE id=$1 AND oficina_id=$2',[req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'OS não encontrada'});
    audit(req, ACOES.DELETAR_OS, 'ordens_servico', req.params.id, {});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// LEMBRETES
router.get('/lembretes', async (req,res) => {
  try {
    res.json(await query("SELECT l.*,v.modelo as veiculo_modelo,v.placa,v.marca FROM lembretes l LEFT JOIN veiculos v ON v.id=l.veiculo_id WHERE l.oficina_id=$1 ORDER BY COALESCE(l.data_previsao,'9999')",[oid(req)]));
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// POST /lembretes — valida que veiculo_id (se informado) pertence à oficina
router.post('/lembretes', validateLembrete, checkVeiculoOwnership, async (req,res) => {
  try {
    const {veiculo_id,tipo,descricao,data_previsao,km_previsao}=req.body;
    const r=await queryOne("INSERT INTO lembretes(oficina_id,veiculo_id,tipo,descricao,data_previsao,km_previsao) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[oid(req),veiculo_id||null,tipo||'outro',descricao,data_previsao||null,km_previsao||null]);
    res.status(201).json({id:r.id});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// PUT /lembretes/:id — checkOwns + valida veiculo_id do body
router.put('/lembretes/:id', validateId, checkOwns('lembretes'), validateLembrete, checkVeiculoOwnership, async (req,res) => {
  try {
    const {veiculo_id,tipo,descricao,data_previsao,km_previsao,visto}=req.body;
    const result = await run("UPDATE lembretes SET veiculo_id=COALESCE($1,veiculo_id),tipo=COALESCE($2,tipo),descricao=COALESCE($3,descricao),data_previsao=COALESCE($4,data_previsao),km_previsao=COALESCE($5,km_previsao),visto=COALESCE($6,visto) WHERE id=$7 AND oficina_id=$8",[veiculo_id||null,tipo||null,descricao||null,data_previsao||null,km_previsao||null,visto!=null?visto:null,req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Lembrete não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DELETE /lembretes/:id — checkOwns confirma pertencimento
router.delete('/lembretes/:id', validateId, checkOwns('lembretes'), async (req,res) => {
  try {
    const result = await run('DELETE FROM lembretes WHERE id=$1 AND oficina_id=$2',[req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Lembrete não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// ESTOQUE
router.get('/estoque', async (req,res) => {
  try {
    let rawCategoria = req.query.categoria;
    const isFuncionario = req.user?.perfil === 'funcionario';
    let q='SELECT * FROM estoque WHERE oficina_id=$1';const p=[oid(req)];
    if(rawCategoria !== undefined){
      // Sanitiza categoria: deve ser string, max 50 chars
      if (typeof rawCategoria !== 'string') {
        return res.status(400).json({error:'Parâmetro categoria inválido'});
      }
      rawCategoria = rawCategoria.trim().slice(0, 50);
      if (rawCategoria) { q+=' AND categoria=$2'; p.push(rawCategoria); }
    }
    q+=' ORDER BY nome';
    const rows = await query(q,p);
    // Omite preços para funcionários
    if(isFuncionario) {
      res.json(rows.map(({preco, data_compra, ...rest}) => rest));
    } else {
      res.json(rows);
    }
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

router.post('/estoque', validateEstoque, async (req,res) => {
  try {
    const {nome,categoria,tipo,marca,aplicacao,quantidade,estoque_min,preco,data_compra,obs,codigo_barras}=req.body;
    const isFuncionario = req.user?.perfil === 'funcionario';
    if(!nome) return res.status(400).json({error:'Nome obrigatório'});
    // Funcionários não podem definir preços
    const precoFinal = isFuncionario ? 0 : (preco||0);
    const dataCompraFinal = isFuncionario ? null : (data_compra||null);
    const r=await queryOne("INSERT INTO estoque(oficina_id,nome,categoria,tipo,marca,aplicacao,quantidade,estoque_min,preco,data_compra,obs,codigo_barras) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id",[oid(req),nome,categoria||'peca',tipo||null,marca||null,aplicacao||null,quantidade||0,estoque_min||0,precoFinal,dataCompraFinal,obs||null,codigo_barras||null]);
    res.status(201).json({id:r.id});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// PUT /estoque/:id — checkOwns confirma pertencimento
router.put('/estoque/:id', validateId, checkOwns('estoque'), validateEstoque, async (req,res) => {
  try {
    const {nome,categoria,tipo,marca,aplicacao,quantidade,estoque_min,preco,data_compra,obs,codigo_barras}=req.body;
    const isFuncionario = req.user?.perfil === 'funcionario';
    const precoFinal = isFuncionario ? null : (preco!=null?preco:null);
    const dataCompraFinal = isFuncionario ? null : (data_compra||null);
    const result = await run("UPDATE estoque SET nome=COALESCE($1,nome),categoria=COALESCE($2,categoria),tipo=COALESCE($3,tipo),marca=COALESCE($4,marca),aplicacao=COALESCE($5,aplicacao),quantidade=COALESCE($6,quantidade),estoque_min=COALESCE($7,estoque_min),preco=COALESCE($8,preco),data_compra=COALESCE($9,data_compra),obs=COALESCE($10,obs),codigo_barras=COALESCE($11,codigo_barras) WHERE id=$12 AND oficina_id=$13",[nome,categoria||null,tipo||null,marca||null,aplicacao||null,quantidade!=null?quantidade:null,estoque_min!=null?estoque_min:null,precoFinal,dataCompraFinal,obs||null,codigo_barras||null,req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Item não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DELETE /estoque/:id — checkOwns confirma pertencimento
router.delete('/estoque/:id', validateId, checkOwns('estoque'), async (req,res) => {
  try {
    const result = await run('DELETE FROM estoque WHERE id=$1 AND oficina_id=$2',[req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Item não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DESPESAS (restrito a admin_oficina)
router.get('/despesas', naoFuncionario, async (req,res) => {
  try {
    const {inicio,fim}=req.query;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    let q='SELECT * FROM despesas WHERE oficina_id=$1';const p=[oid(req)];
    if(inicio !== undefined){
      if(!dateRegex.test(inicio)) return res.status(400).json({error:'Formato de data início inválido (YYYY-MM-DD)'});
      q+=' AND data>=$2';p.push(inicio);
    }
    if(fim !== undefined){
      if(!dateRegex.test(fim)) return res.status(400).json({error:'Formato de data fim inválido (YYYY-MM-DD)'});
      q+=` AND data<=$${p.length+1}`;p.push(fim);
    }
    q+=' ORDER BY data DESC';
    res.json(await query(q,p));
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

router.post('/despesas', naoFuncionario, validateDespesa, async (req,res) => {
  try {
    const {descricao,categoria,valor,data,vencimento,pago,obs}=req.body;
    const r=await queryOne("INSERT INTO despesas(oficina_id,descricao,categoria,valor,data,vencimento,pago,obs) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",[oid(req),descricao,categoria||'Outros',valor,data,vencimento||null,pago?1:0,obs||null]);
    res.status(201).json({id:r.id});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// PUT /despesas/:id — checkOwns confirma pertencimento
router.put('/despesas/:id', naoFuncionario, validateId, checkOwns('despesas'), validateDespesa, async (req,res) => {
  try {
    const {descricao,categoria,valor,data,vencimento,pago,obs}=req.body;
    const result = await run("UPDATE despesas SET descricao=COALESCE($1,descricao),categoria=COALESCE($2,categoria),valor=COALESCE($3,valor),data=COALESCE($4,data),vencimento=COALESCE($5,vencimento),pago=COALESCE($6,pago),obs=COALESCE($7,obs) WHERE id=$8 AND oficina_id=$9",[descricao||null,categoria||null,valor||null,data||null,vencimento||null,pago!=null?pago:null,obs||null,req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Despesa não encontrada'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DELETE /despesas/:id — checkOwns confirma pertencimento
router.delete('/despesas/:id', naoFuncionario, validateId, checkOwns('despesas'), async (req,res) => {
  try {
    const result = await run('DELETE FROM despesas WHERE id=$1 AND oficina_id=$2',[req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Despesa não encontrada'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// ORÇAMENTOS
router.get('/orcamentos', async (req,res) => {
  try {
    const isFuncionario = req.user?.perfil === 'funcionario';
    const rows = await query("SELECT o.*,c.nome as cliente_nome,v.modelo as veiculo_modelo,v.placa FROM orcamentos o LEFT JOIN clientes c ON c.id=o.cliente_id LEFT JOIN veiculos v ON v.id=o.veiculo_id WHERE o.oficina_id=$1 ORDER BY o.id DESC",[oid(req)]);
    const parsed = rows.map(r => {
      let pecas_itens = [];
      if (r.pecas_itens) {
        try { pecas_itens = JSON.parse(r.pecas_itens); } catch (_) { pecas_itens = []; }
      }
      return { ...r, pecas_itens };
    });
    if(isFuncionario) {
      res.json(parsed.map(({valor_mo, valor_pecas, desconto, ...rest}) => rest));
    } else {
      res.json(parsed);
    }
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// POST /orcamentos — valida cliente_id e veiculo_id contra a oficina
router.post('/orcamentos', validateOrcamento, checkClienteVeiculoOwnership, async (req,res) => {
  try {
    const { cliente_id, veiculo_id, descricao, servicos, obs, status, validade, valor_mo, desconto, pecas_itens, os_id, interativo } = req.body;
    const isFuncionario = req.user?.perfil === 'funcionario';

    // Funcionários não podem definir valores financeiros
    const valorMO       = isFuncionario ? 0 : (valor_mo !== undefined ? Math.max(0, parseFloat(valor_mo) || 0) : 0);
    const descontoFinal = isFuncionario ? 0 : (desconto !== undefined ? Math.max(0, parseFloat(desconto) || 0) : 0);

    const itens = Array.isArray(pecas_itens) ? pecas_itens.filter(p => p.nome?.trim()) : [];
    const valorPecas = isFuncionario ? 0 : itens.reduce((s,p) => s + Math.max(0, parseFloat(p.valor_unit)||0) * Math.max(0, parseFloat(p.qtd)||1), 0);
    const pecasTexto = itens.map(p => `${p.qtd||1}x ${String(p.nome).slice(0,100)} (R$ ${parseFloat(p.valor_unit||0).toFixed(2)})`).join('\n');

    const cnt = await queryOne("SELECT COUNT(*) n FROM orcamentos WHERE oficina_id=$1", [oid(req)]);
    const numero = 'ORC-' + String(+cnt.n + 1).padStart(4, '0');

    // Valida os_id se informado
    const osIdVal = os_id ? parseInt(os_id) : null;
    if (osIdVal) {
      const osCheck = await queryOne('SELECT id FROM ordens_servico WHERE id=$1 AND oficina_id=$2', [osIdVal, oid(req)]);
      if (!osCheck) return res.status(404).json({ error: 'OS não encontrada' });
    }

    const r = await queryOne(
      "INSERT INTO orcamentos(oficina_id,cliente_id,veiculo_id,numero,descricao,servicos,pecas,pecas_itens,valor_mo,valor_pecas,desconto,status,validade,obs,os_id,interativo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id",
      [oid(req), cliente_id||null, veiculo_id||null, numero, descricao||null, servicos||null, pecasTexto||null, itens.length ? JSON.stringify(itens) : null, valorMO, valorPecas, descontoFinal, status||'pendente', validade||null, obs||null, osIdVal, !!interativo]
    );
    res.status(201).json({ id: r.id, numero });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// PUT /orcamentos/:id — checkOwns + valida cliente_id/veiculo_id do body
router.put('/orcamentos/:id', validateId, checkOwns('orcamentos'), validateOrcamento, checkClienteVeiculoOwnership, async (req,res) => {
  try {
    const { descricao, servicos, obs, status, validade, valor_mo, desconto, pecas_itens, cliente_id, veiculo_id, os_id, interativo } = req.body;
    const isFuncionario = req.user?.perfil === 'funcionario';

    let itens = null;
    if (pecas_itens !== undefined) {
      itens = Array.isArray(pecas_itens) ? pecas_itens.filter(p => p.nome?.trim()) : null;
    }

    const valorMO       = isFuncionario ? null : (valor_mo  !== undefined ? Math.max(0, parseFloat(valor_mo)  || 0) : null);
    const valorPecas    = (itens && !isFuncionario) ? itens.reduce((s,p) => s + Math.max(0, parseFloat(p.valor_unit)||0) * Math.max(0, parseFloat(p.qtd)||1), 0) : null;
    const descontoFinal = isFuncionario ? null : (desconto !== undefined ? Math.max(0, parseFloat(desconto) || 0) : null);
    const pecasTexto    = itens ? itens.map(p => `${p.qtd||1}x ${String(p.nome).slice(0,100)} (R$ ${parseFloat(p.valor_unit||0).toFixed(2)})`).join('\n') : null;

    // Valida os_id se informado (deve pertencer à oficina)
    const osIdVal = os_id ? parseInt(os_id) : null;
    if (osIdVal) {
      const osCheck = await queryOne('SELECT id FROM ordens_servico WHERE id=$1 AND oficina_id=$2', [osIdVal, oid(req)]);
      if (!osCheck) return res.status(404).json({ error: 'OS não encontrada' });
    }

    const result = await run(
      `UPDATE orcamentos SET descricao=COALESCE($1,descricao),servicos=COALESCE($2,servicos),pecas=COALESCE($3,pecas),pecas_itens=COALESCE($4,pecas_itens),valor_mo=COALESCE($5,valor_mo),valor_pecas=COALESCE($6,valor_pecas),desconto=COALESCE($7,desconto),status=COALESCE($8,status),validade=COALESCE($9,validade),obs=COALESCE($10,obs),cliente_id=COALESCE($11,cliente_id),veiculo_id=COALESCE($12,veiculo_id),os_id=COALESCE($13,os_id),interativo=COALESCE($14,interativo) WHERE id=$15 AND oficina_id=$16`,
      [
        descricao    || null,
        servicos     || null,
        pecasTexto,
        itens ? JSON.stringify(itens) : null,
        valorMO,
        valorPecas,
        descontoFinal,
        status       || null,
        validade     || null,
        obs          || null,
        cliente_id   !== undefined ? (cliente_id || null) : null,
        veiculo_id   !== undefined ? (veiculo_id || null) : null,
        osIdVal,
        interativo   !== undefined ? !!interativo : null,
        req.params.id,
        oid(req),
      ]
    );
    if(result.rowCount === 0) return res.status(404).json({error:'Orçamento não encontrado'});
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// PATCH /orcamentos/:id/status — checkOwns confirma pertencimento
router.patch('/orcamentos/:id/status', validateId, checkOwns('orcamentos'), async (req,res) => {
  try {
    const status = req.body?.status;
    if(!status || !['pendente','aprovado','rejeitado'].includes(status)) return res.status(400).json({error:'Status inválido'});
    const result = await run('UPDATE orcamentos SET status=$1 WHERE id=$2 AND oficina_id=$3',[status,req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Orçamento não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DELETE /orcamentos/:id — checkOwns confirma pertencimento
router.delete('/orcamentos/:id', validateId, checkOwns('orcamentos'), async (req,res) => {
  try {
    const result = await run('DELETE FROM orcamentos WHERE id=$1 AND oficina_id=$2',[req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Orçamento não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// POST /os/:id/pagamento — checkOwns confirma que a OS pertence à oficina antes de processar pagamento
router.post('/os/:id/pagamento', validateId, checkOwns('ordens_servico'), validatePagamentoOS, async (req,res) => {
  try {
    const {forma, valor_total, parcelas, bandeira, taxa_maquininha, observacao} = req.body;
    // validatePagamentoOS já validou: forma, valor_total, parcelas, taxa_maquininha

    const osId = req.params.id;
    const id = oid(req);
    const os = await queryOne('SELECT * FROM ordens_servico WHERE id=$1 AND oficina_id=$2', [osId, id]);
    if (!os) return res.status(404).json({error:'OS não encontrada'});

    const vTotal = parseFloat(valor_total);
    const nParcelas = forma === 'credito' ? Math.min(Math.max(parseInt(parcelas)||1, 1), 10) : 1;
    const taxa = (forma === 'credito' || forma === 'debito') ? (parseFloat(taxa_maquininha)||0) : 0;
    const valorLiquido = vTotal - (vTotal * taxa / 100);
    const valorParcela = forma === 'credito' ? valorLiquido / nParcelas : valorLiquido;
    const hoje = new Date().toISOString().split('T')[0];

    const r = await queryOne(
      "INSERT INTO pagamentos_os(oficina_id, os_id, cliente_id, forma, valor_total, parcelas, bandeira, taxa_maquininha, valor_liquido, valor_parcela, data_pagamento, observacao) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id",
      [id, osId, os.cliente_id, forma, vTotal, nParcelas, bandeira||null, taxa, valorLiquido, valorParcela, hoje, observacao||null]
    );

    // Cria registros de parcelas a receber para cartão
    if (forma === 'credito') {
      for (let i = 1; i <= nParcelas; i++) {
        const dataReceb = new Date();
        dataReceb.setDate(dataReceb.getDate() + (i * 30));
        await run(
          "INSERT INTO parcelas_receber(oficina_id, pagamento_os_id, os_id, cliente_id, numero_parcela, valor, data_recebimento) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [id, r.id, osId, os.cliente_id, i, valorParcela, dataReceb.toISOString().split('T')[0]]
        );
      }
    } else if (forma === 'debito') {
      const dataReceb = new Date();
      dataReceb.setDate(dataReceb.getDate() + 1);
      await run(
        "INSERT INTO parcelas_receber(oficina_id, pagamento_os_id, os_id, cliente_id, numero_parcela, valor, data_recebimento) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id, r.id, osId, os.cliente_id, 1, valorLiquido, dataReceb.toISOString().split('T')[0]]
      );
    }

    // Finaliza a OS automaticamente
    await run("UPDATE ordens_servico SET status='finalizado' WHERE id=$1 AND oficina_id=$2", [osId, id]);

    res.status(201).json({id: r.id, valor_liquido: valorLiquido, parcelas: nParcelas, valor_parcela: valorParcela});
  } catch(err){log.error('app_pagamento_os',err);res.status(500).json({error:'Erro interno'});}
});

// Parcelas a receber
router.get('/parcelas-receber', validatePagination, async (req,res) => {
  try {
    const { limit, offset } = req.pagination;
    const rows = await query(
      "SELECT pr.*, c.nome as cliente_nome FROM parcelas_receber pr LEFT JOIN clientes c ON c.id=pr.cliente_id WHERE pr.oficina_id=$1 ORDER BY pr.data_recebimento LIMIT $2 OFFSET $3",
      [oid(req), limit, offset]
    );
    res.json(rows);
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// PATCH /parcelas-receber/:id/recebido — checkOwns confirma pertencimento
router.patch('/parcelas-receber/:id/recebido', validateId, checkOwns('parcelas_receber'), async (req,res) => {
  try {
    const result = await run('UPDATE parcelas_receber SET recebido=1 WHERE id=$1 AND oficina_id=$2', [req.params.id, oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Parcela não encontrada'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// GET /os/:id/pagamentos — checkOwns garante que a OS pertence à oficina antes de listar pagamentos
router.get('/os/:id/pagamentos', validateId, checkOwns('ordens_servico'), async (req,res) => {
  try {
    const rows = await query('SELECT * FROM pagamentos_os WHERE os_id=$1 AND oficina_id=$2 ORDER BY criado_em DESC', [req.params.id, oid(req)]);
    res.json(rows);
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// Todos os pagamentos de OS da oficina (para gráficos)
router.get('/pagamentos-os', async (req,res) => {
  try {
    // Limita a 500 registros para proteger contra dump acidental
    const rows = await query('SELECT * FROM pagamentos_os WHERE oficina_id=$1 ORDER BY data_pagamento DESC LIMIT 500', [oid(req)]);
    res.json(rows);
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// AGENDA
router.get('/agenda', async (req,res) => {
  try {
    const {data}=req.query;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if(data !== undefined && !dateRegex.test(data)){
      return res.status(400).json({error:'Formato de data inválido (YYYY-MM-DD)'});
    }
    let q="SELECT a.*,c.nome as cliente_nome,v.modelo as veiculo_modelo FROM agenda a LEFT JOIN clientes c ON c.id=a.cliente_id LEFT JOIN veiculos v ON v.id=a.veiculo_id WHERE a.oficina_id=$1";
    const p=[oid(req)];
    if(data){q+=' AND a.data=$2';p.push(data);}
    q+=' ORDER BY a.data,a.hora';
    res.json(await query(q,p));
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// POST /agenda — valida cliente_id e veiculo_id contra a oficina
router.post('/agenda', validateAgenda, checkClienteVeiculoOwnership, async (req,res) => {
  try {
    const {cliente_id,veiculo_id,titulo,data,hora,descricao}=req.body;
    const r=await queryOne(
      "INSERT INTO agenda(oficina_id,cliente_id,veiculo_id,titulo,data,hora,descricao) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [oid(req),cliente_id||null,veiculo_id||null,titulo,data||new Date().toISOString().split('T')[0],hora||null,descricao||null]
    );
    res.status(201).json({id:r.id});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// PUT /agenda/:id — checkOwns + valida cliente_id/veiculo_id do body
router.put('/agenda/:id', validateId, checkOwns('agenda'), validateAgenda, checkClienteVeiculoOwnership, async (req,res) => {
  try {
    const {cliente_id,veiculo_id,titulo,data,hora,descricao}=req.body;
    const result = await run(
      "UPDATE agenda SET titulo=COALESCE($1,titulo),data=COALESCE($2,data),hora=COALESCE($3,hora),descricao=COALESCE($4,descricao),cliente_id=COALESCE($5,cliente_id),veiculo_id=COALESCE($6,veiculo_id) WHERE id=$7 AND oficina_id=$8",
      [titulo||null,data||null,hora||null,descricao||null,cliente_id||null,veiculo_id||null,req.params.id,oid(req)]
    );
    if(result.rowCount === 0) return res.status(404).json({error:'Agendamento não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// DELETE /agenda/:id — checkOwns confirma pertencimento
router.delete('/agenda/:id', validateId, checkOwns('agenda'), async (req,res) => {
  try {
    const result = await run('DELETE FROM agenda WHERE id=$1 AND oficina_id=$2',[req.params.id,oid(req)]);
    if(result.rowCount === 0) return res.status(404).json({error:'Agendamento não encontrado'});
    res.json({ok:true});
  } catch(err){res.status(500).json({error:'Erro interno'});}
});

// CONFIGURAÇÕES DA OFICINA (leitura e atualização pelos próprios usuários)
router.get('/config', naoFuncionario, async (req,res) => {
  try {
    const of = await queryOne(
      "SELECT nome, responsavel, telefone, email, endereco, logo, observacoes, whatsapp FROM oficinas WHERE id=$1",
      [oid(req)]
    );
    if (!of) return res.status(404).json({ error: 'Oficina não encontrada' });
    res.json({
      nome:        of.nome        || '',
      responsavel: of.responsavel || '',
      telefone:    of.telefone    || '',
      whatsapp:    of.whatsapp    || '',
      email:       of.email       || '',
      endereco:    of.endereco    || '',
      logo:        of.logo        || null,
      documento:   of.observacoes || '',
    });
  } catch(err){ log.error('app_get_config', err); res.status(500).json({ error: 'Erro interno' }); }
});

router.put('/config', naoFuncionario, validateLogoUpload, async (req,res) => {
  try {
    // Valida e sanitiza campos de configuração da oficina
    const nomeRaw = req.body?.nome;
    if (!nomeRaw || typeof nomeRaw !== 'string' || !nomeRaw.trim()) {
      return res.status(400).json({ error: 'Nome da oficina é obrigatório' });
    }
    const nome = nomeRaw.trim().slice(0, 120);

    const responsavel = req.body.responsavel ? String(req.body.responsavel).replace(/<[^>]*>/g, '').trim().slice(0, 120) || null : null;
    const telefone    = req.body.telefone    ? String(req.body.telefone).replace(/[^\d\s\-\+\(\)]/g, '').slice(0, 30) || null : null;
    const whatsapp    = req.body.whatsapp    ? String(req.body.whatsapp).replace(/[^\d\s\-\+\(\)]/g, '').slice(0, 30) || null : null;
    const endereco    = req.body.endereco    ? String(req.body.endereco).replace(/<[^>]*>/g, '').trim().slice(0, 300) || null : null;
    const documento   = req.body.documento   ? String(req.body.documento).replace(/<[^>]*>/g, '').trim().slice(0, 500) || null : null;

    // Valida email se fornecido
    let emailVal = null;
    if (req.body.email) {
      const e = String(req.body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) {
        return res.status(400).json({ error: 'E-mail inválido' });
      }
      emailVal = e;
    }

    // Valida logo (data URL, máx. 2MB)
    let logo = undefined;
    if (req.body.logo !== undefined) {
      if (req.body.logo === null || req.body.logo === '') {
        logo = null;
      } else if (typeof req.body.logo === 'string') {
        if (req.body.logo.length > 2 * 1024 * 1024 * 1.37) { // base64 overhead ~37%
          return res.status(400).json({ error: 'Logo muito grande. Use uma imagem de até 2MB.' });
        }
        if (!req.body.logo.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Formato de logo inválido' });
        }
        logo = req.body.logo;
      }
    }

    await run(
      `UPDATE oficinas SET
        nome        = $1,
        responsavel = COALESCE($2, responsavel),
        telefone    = COALESCE($3, telefone),
        whatsapp    = $4,
        email       = COALESCE($5, email),
        endereco    = $6,
        logo        = COALESCE($7, logo),
        observacoes = $8
       WHERE id = $9`,
      [
        nome,
        responsavel || null,
        telefone    || null,
        whatsapp    || null,
        emailVal    || null,
        endereco    || null,
        logo !== undefined ? (logo || null) : null,  // garante que nunca seja undefined no driver pg
        documento   || null,
        oid(req),
      ]
    );

    // Atualiza nome do usuário se responsável foi alterado
    if (responsavel?.trim()) {
      await run(
        'UPDATE usuarios SET nome=$1 WHERE id=$2',
        [responsavel.trim(), req.user.id]
      );
    }

    res.json({ ok: true });
  } catch(err){ log.error('app_put_config', err); res.status(500).json({ error: 'Erro interno' }); }
});

// ── NOTIFICAÇÕES ──────────────────────────────────────────────
router.get('/notificacoes', async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, tipo, titulo, mensagem, link, lido, created_at
       FROM notificacoes WHERE oficina_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [oid(req)]
    );
    const naoLidas = rows.filter(n => !n.lido).length;
    res.json({ notificacoes: rows, naoLidas });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.patch('/notificacoes/:id/lida', validateId, async (req, res) => {
  try {
    await run('UPDATE notificacoes SET lido=true WHERE id=$1 AND oficina_id=$2', [req.params.id, oid(req)]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.patch('/notificacoes/marcar-todas', async (req, res) => {
  try {
    await run('UPDATE notificacoes SET lido=true WHERE oficina_id=$1 AND lido=false', [oid(req)]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ── EXPORTAR DADOS ────────────────────────────────────────────
router.get('/exportar', async (req, res) => {
  try {
    const id = oid(req);
    const [clientes, veiculos, os, orcamentos, despesas, estoque] = await Promise.all([
      query('SELECT * FROM clientes WHERE oficina_id=$1 ORDER BY id', [id]),
      query('SELECT * FROM veiculos WHERE oficina_id=$1 ORDER BY id', [id]),
      query('SELECT id,oficina_id,cliente_id,veiculo_id,descricao,servicos,pecas,pecas_itens,valor_mo,valor_pecas,valor,status,observacao,data,numero,criado_em FROM ordens_servico WHERE oficina_id=$1 ORDER BY id', [id]),
      query('SELECT id,oficina_id,cliente_id,veiculo_id,numero,descricao,servicos,pecas_itens,valor_mo,valor_pecas,desconto,status,validade,obs,criado_em FROM orcamentos WHERE oficina_id=$1 ORDER BY id', [id]),
      query('SELECT * FROM despesas WHERE oficina_id=$1 ORDER BY id', [id]),
      query('SELECT * FROM estoque WHERE oficina_id=$1 ORDER BY id', [id]),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      oficina_id: id,
      versao: '1.0',
      dados: { clientes, veiculos, ordens_servico: os, orcamentos, despesas, estoque },
      totais: {
        clientes: clientes.length,
        veiculos: veiculos.length,
        ordens_servico: os.length,
        orcamentos: orcamentos.length,
        despesas: despesas.length,
        estoque: estoque.length,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=chave10_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(exportData);
  } catch (err) { res.status(500).json({ error: 'Erro ao exportar dados' }); }
});

module.exports = router;
