/**
 * test-authorization.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes de segurança para controle de acesso (autorização) do Chave 10.
 * Simula ataques IDOR e cross-tenant para garantir isolamento entre oficinas.
 *
 * Pré-requisitos:
 *   - Backend rodando em http://localhost:3001
 *   - Banco com dados de pelo menos 2 oficinas distintas
 *   - Executar ANTES em: node src/scripts/seed-demo.js
 *
 * Uso:
 *   node src/scripts/test-authorization.js
 *
 * Saída:
 *   PASS / FAIL por teste com detalhes de cada vulnerabilidade encontrada.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

// ─── Contadores ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
      },
    };
    const request = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    request.on('error', reject);
    if (data) request.write(data);
    request.end();
  });
}

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
    failures.push({ name, detail });
  }
}

async function login(email, senha) {
  const r = await req('POST', '/api/auth/login', { email, senha });
  if (r.status !== 200 || !r.body.token) {
    throw new Error(`Login falhou para ${email}: ${JSON.stringify(r.body)}`);
  }
  return r.body.token;
}

// ─── Setup: obtém tokens e IDs das duas oficinas ──────────────────────────────

async function setup() {
  console.log('\n🔧 Setup: autenticando nas duas oficinas demo...\n');

  // Oficina A — usuário demo principal
  const tokenA = await login('teste@teste.com', 'demo1234');

  // Cria uma segunda oficina/usuário para os testes cross-tenant
  // Registra via /api/auth/register
  const emailB = `oficina_b_test_${Date.now()}@teste.com`;
  const regB = await req('POST', '/api/auth/register', { nome: 'Oficina B Teste', email: emailB, senha: 'senha123' });
  if (regB.status !== 201) throw new Error('Falha ao criar usuário B: ' + JSON.stringify(regB.body));
  const tokenB_temp = regB.body.token;

  // Completa cadastro da oficina B
  const ofB = await req('POST', '/api/auth/complete-oficina', {
    nome_oficina: 'Oficina B Segurança',
    telefone: '11999999999',
  }, tokenB_temp);
  if (ofB.status !== 201) throw new Error('Falha ao criar oficina B: ' + JSON.stringify(ofB.body));
  const tokenB = ofB.body.token;

  // Obtém dados da oficina A para usar nos ataques
  const clientesA = await req('GET', '/api/app/clientes', null, tokenA);
  const veiculosA = await req('GET', '/api/app/veiculos', null, tokenA);
  const osA       = await req('GET', '/api/app/os', null, tokenA);
  const agendaA   = await req('GET', '/api/app/agenda', null, tokenA);
  const lembrA    = await req('GET', '/api/app/lembretes', null, tokenA);
  const estqA     = await req('GET', '/api/app/estoque', null, tokenA);
  const orcA      = await req('GET', '/api/app/orcamentos', null, tokenA);

  // Se não há dados na oficina A, cria alguns
  let clienteIdA, veiculoIdA, osIdA, agendaIdA, lembrIdA, estqIdA, orcIdA;

  if (clientesA.body.length === 0) {
    const c = await req('POST', '/api/app/clientes', { nome: 'Cliente Teste A' }, tokenA);
    clienteIdA = c.body.id;
  } else {
    clienteIdA = clientesA.body[0].id;
  }

  if (veiculosA.body.length === 0) {
    const v = await req('POST', '/api/app/veiculos', { modelo: 'Veículo Teste A', cliente_id: clienteIdA }, tokenA);
    veiculoIdA = v.body.id;
  } else {
    veiculoIdA = veiculosA.body[0].id;
  }

  if (osA.body.length === 0) {
    const o = await req('POST', '/api/app/os', { descricao: 'OS Teste A', valor_mo: 100 }, tokenA);
    osIdA = o.body.id;
  } else {
    osIdA = osA.body[0].id;
  }

  if (agendaA.body.length === 0) {
    const a = await req('POST', '/api/app/agenda', {
      titulo: 'Agenda Teste A',
      data: new Date().toISOString().split('T')[0],
    }, tokenA);
    agendaIdA = a.body.id;
  } else {
    agendaIdA = agendaA.body[0].id;
  }

  if (lembrA.body.length === 0) {
    const l = await req('POST', '/api/app/lembretes', { descricao: 'Lembrete Teste A' }, tokenA);
    lembrIdA = l.body.id;
  } else {
    lembrIdA = lembrA.body[0].id;
  }

  if (estqA.body.length === 0) {
    const e = await req('POST', '/api/app/estoque', { nome: 'Item Teste A' }, tokenA);
    estqIdA = e.body.id;
  } else {
    estqIdA = estqA.body[0].id;
  }

  if (orcA.body.length === 0) {
    const or = await req('POST', '/api/app/orcamentos', { descricao: 'Orçamento Teste A' }, tokenA);
    orcIdA = or.body.id;
  } else {
    orcIdA = orcA.body[0].id;
  }

  return { tokenA, tokenB, emailB, clienteIdA, veiculoIdA, osIdA, agendaIdA, lembrIdA, estqIdA, orcIdA };
}

// ─── Suite de testes ──────────────────────────────────────────────────────────

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Chave 10 — Testes de Segurança: Controle de Acesso');
  console.log('═══════════════════════════════════════════════════════════\n');

  const ctx = await setup();
  const { tokenA, tokenB, clienteIdA, veiculoIdA, osIdA, agendaIdA, lembrIdA, estqIdA, orcIdA } = ctx;

  // ── 1. Acesso sem token ────────────────────────────────────────────────────
  console.log('\n📋 1. Acesso sem autenticação');

  const noAuth = await req('GET', '/api/app/clientes', null, null);
  assert('GET /clientes sem token → 401', noAuth.status === 401,
    `recebeu ${noAuth.status}`);

  const noAuthPost = await req('POST', '/api/app/clientes', { nome: 'X' }, null);
  assert('POST /clientes sem token → 401', noAuthPost.status === 401,
    `recebeu ${noAuthPost.status}`);

  // ── 2. IDOR — leitura de dados de outra oficina ────────────────────────────
  console.log('\n📋 2. IDOR — Tentativa de leitura cross-tenant via URL');

  // Oficina B tenta ler veículos da oficina A filtrando por cliente de A
  const idorVeiculos = await req('GET', `/api/app/veiculos?cliente_id=${clienteIdA}`, null, tokenB);
  assert(
    `GET /veiculos?cliente_id=${clienteIdA} (oficina A) com token de oficina B → 404`,
    idorVeiculos.status === 404,
    `recebeu ${idorVeiculos.status} — ${JSON.stringify(idorVeiculos.body)}`
  );

  // ── 3. IDOR — UPDATE em recurso de outra oficina ──────────────────────────
  console.log('\n📋 3. IDOR — Tentativa de UPDATE em recursos de outra oficina');

  const idorPutCliente = await req('PUT', `/api/app/clientes/${clienteIdA}`, { nome: 'Hackeado' }, tokenB);
  assert(
    `PUT /clientes/${clienteIdA} (oficina A) com token de oficina B → 404`,
    idorPutCliente.status === 404,
    `recebeu ${idorPutCliente.status} — ${JSON.stringify(idorPutCliente.body)}`
  );

  const idorPutVeiculo = await req('PUT', `/api/app/veiculos/${veiculoIdA}`, { modelo: 'Hackeado' }, tokenB);
  assert(
    `PUT /veiculos/${veiculoIdA} (oficina A) com token de oficina B → 404`,
    idorPutVeiculo.status === 404,
    `recebeu ${idorPutVeiculo.status} — ${JSON.stringify(idorPutVeiculo.body)}`
  );

  const idorPutOs = await req('PUT', `/api/app/os/${osIdA}`,
    { descricao: 'OS hackeada', valor_mo: 999999 }, tokenB);
  assert(
    `PUT /os/${osIdA} (oficina A) com token de oficina B → 404`,
    idorPutOs.status === 404,
    `recebeu ${idorPutOs.status} — ${JSON.stringify(idorPutOs.body)}`
  );

  const idorPutAgenda = await req('PUT', `/api/app/agenda/${agendaIdA}`,
    { titulo: 'Agenda hackeada', data: '2030-01-01' }, tokenB);
  assert(
    `PUT /agenda/${agendaIdA} (oficina A) com token de oficina B → 404`,
    idorPutAgenda.status === 404,
    `recebeu ${idorPutAgenda.status} — ${JSON.stringify(idorPutAgenda.body)}`
  );

  const idorPutOrc = await req('PUT', `/api/app/orcamentos/${orcIdA}`,
    { descricao: 'Orçamento hackeado' }, tokenB);
  assert(
    `PUT /orcamentos/${orcIdA} (oficina A) com token de oficina B → 404`,
    idorPutOrc.status === 404,
    `recebeu ${idorPutOrc.status} — ${JSON.stringify(idorPutOrc.body)}`
  );

  // ── 4. IDOR — DELETE em recurso de outra oficina ──────────────────────────
  console.log('\n📋 4. IDOR — Tentativa de DELETE em recursos de outra oficina');

  const idorDelCliente = await req('DELETE', `/api/app/clientes/${clienteIdA}`, null, tokenB);
  assert(
    `DELETE /clientes/${clienteIdA} (oficina A) com token de oficina B → 404`,
    idorDelCliente.status === 404,
    `recebeu ${idorDelCliente.status} — ${JSON.stringify(idorDelCliente.body)}`
  );

  const idorDelVeiculo = await req('DELETE', `/api/app/veiculos/${veiculoIdA}`, null, tokenB);
  assert(
    `DELETE /veiculos/${veiculoIdA} (oficina A) com token de oficina B → 404`,
    idorDelVeiculo.status === 404,
    `recebeu ${idorDelVeiculo.status} — ${JSON.stringify(idorDelVeiculo.body)}`
  );

  const idorDelOs = await req('DELETE', `/api/app/os/${osIdA}`, null, tokenB);
  assert(
    `DELETE /os/${osIdA} (oficina A) com token de oficina B → 404`,
    idorDelOs.status === 404,
    `recebeu ${idorDelOs.status} — ${JSON.stringify(idorDelOs.body)}`
  );

  const idorDelOrc = await req('DELETE', `/api/app/orcamentos/${orcIdA}`, null, tokenB);
  assert(
    `DELETE /orcamentos/${orcIdA} (oficina A) com token de oficina B → 404`,
    idorDelOrc.status === 404,
    `recebeu ${idorDelOrc.status} — ${JSON.stringify(idorDelOrc.body)}`
  );

  const idorDelAgenda = await req('DELETE', `/api/app/agenda/${agendaIdA}`, null, tokenB);
  assert(
    `DELETE /agenda/${agendaIdA} (oficina A) com token de oficina B → 404`,
    idorDelAgenda.status === 404,
    `recebeu ${idorDelAgenda.status} — ${JSON.stringify(idorDelAgenda.body)}`
  );

  const idorDelLembrete = await req('DELETE', `/api/app/lembretes/${lembrIdA}`, null, tokenB);
  assert(
    `DELETE /lembretes/${lembrIdA} (oficina A) com token de oficina B → 404`,
    idorDelLembrete.status === 404,
    `recebeu ${idorDelLembrete.status} — ${JSON.stringify(idorDelLembrete.body)}`
  );

  const idorDelEstoque = await req('DELETE', `/api/app/estoque/${estqIdA}`, null, tokenB);
  assert(
    `DELETE /estoque/${estqIdA} (oficina A) com token de oficina B → 404`,
    idorDelEstoque.status === 404,
    `recebeu ${idorDelEstoque.status} — ${JSON.stringify(idorDelEstoque.body)}`
  );

  // ── 5. Injeção de oficina_id no body ──────────────────────────────────────
  console.log('\n📋 5. Tentativa de injeção de oficina_id no body');

  // Oficina B tenta criar cliente dentro da oficina A injetando oficina_id no body
  const idorPostInjectOficina = await req('POST', '/api/app/clientes',
    { nome: 'Cliente Injetado', oficina_id: 1 }, tokenB);
  // Deve criar (201) mas com o oficina_id do TOKEN, não do body
  if (idorPostInjectOficina.status === 201) {
    // Verifica se o cliente foi criado com o oficina_id correto (tokenB) e não com 1
    const clienteBList = await req('GET', '/api/app/clientes', null, tokenB);
    const criado = clienteBList.body.find(c => c.id === idorPostInjectOficina.body.id);
    assert(
      'POST /clientes com oficina_id injetado no body — usa oficina_id do token',
      criado !== undefined,
      'cliente criado não aparece na lista da oficina B → foi inserido na oficina errada'
    );
    // Limpeza
    if (criado) await req('DELETE', `/api/app/clientes/${criado.id}`, null, tokenB);
  } else {
    // Se rejeitou (400), também é correto — o campo é ignorado pelo validateCliente
    assert(
      'POST /clientes com oficina_id injetado no body — rejeitado ou ignorado',
      [201, 400].includes(idorPostInjectOficina.status),
      `recebeu status inesperado ${idorPostInjectOficina.status}`
    );
  }

  // ── 6. Injeção de oficina_id na query string ──────────────────────────────
  console.log('\n📋 6. Tentativa de injeção de oficina_id na query string');

  // Oficina B tenta listar clientes de outra oficina via query param
  const idorQueryInject = await req('GET', '/api/app/clientes?oficina_id=1', null, tokenB);
  // A query deve ser ignorada — só retorna clientes da oficina do token
  if (idorQueryInject.status === 200) {
    const ids = idorQueryInject.body.map(c => c.oficina_id);
    const oficinaBId = (await req('GET', '/api/auth/me', null, tokenB)).body.oficina_id;
    const contaminado = ids.some(id => id !== oficinaBId && id !== undefined);
    assert(
      'GET /clientes?oficina_id=1 com token de oficina B — retorna só dados da oficina B',
      !contaminado,
      contaminado ? `retornou ${ids.length} cliente(s) com oficina_id diferente de ${oficinaBId}` : ''
    );
  } else {
    assert(
      'GET /clientes?oficina_id=1 não retorna 500',
      idorQueryInject.status !== 500,
      `recebeu ${idorQueryInject.status}`
    );
  }

  // ── 7. PATCH de status em recurso de outra oficina ────────────────────────
  console.log('\n📋 7. PATCH de status em recursos de outra oficina');

  const idorPatchOsStatus = await req('PATCH', `/api/app/os/${osIdA}/status`,
    { status: 'finalizado' }, tokenB);
  assert(
    `PATCH /os/${osIdA}/status (oficina A) com token de oficina B → 404`,
    idorPatchOsStatus.status === 404,
    `recebeu ${idorPatchOsStatus.status} — ${JSON.stringify(idorPatchOsStatus.body)}`
  );

  const idorPatchOrcStatus = await req('PATCH', `/api/app/orcamentos/${orcIdA}/status`,
    { status: 'aprovado' }, tokenB);
  assert(
    `PATCH /orcamentos/${orcIdA}/status (oficina A) com token de oficina B → 404`,
    idorPatchOrcStatus.status === 404,
    `recebeu ${idorPatchOrcStatus.status} — ${JSON.stringify(idorPatchOrcStatus.body)}`
  );

  // ── 8. Pagamento em OS de outra oficina ───────────────────────────────────
  console.log('\n📋 8. Tentativa de pagamento em OS de outra oficina');

  const idorPagamentoOs = await req('POST', `/api/app/os/${osIdA}/pagamento`, {
    forma: 'pix',
    valor_total: 100,
  }, tokenB);
  assert(
    `POST /os/${osIdA}/pagamento (oficina A) com token de oficina B → 404`,
    idorPagamentoOs.status === 404,
    `recebeu ${idorPagamentoOs.status} — ${JSON.stringify(idorPagamentoOs.body)}`
  );

  // ── 9. Criação de veículo com cliente_id de outra oficina ─────────────────
  console.log('\n📋 9. Criação de recursos com IDs de referência de outra oficina');

  const idorPostVeiculoClienteAlheio = await req('POST', '/api/app/veiculos',
    { modelo: 'Veículo Teste', cliente_id: clienteIdA }, tokenB);
  assert(
    `POST /veiculos com cliente_id=${clienteIdA} (oficina A) usando token de oficina B → 404`,
    idorPostVeiculoClienteAlheio.status === 404,
    `recebeu ${idorPostVeiculoClienteAlheio.status} — ${JSON.stringify(idorPostVeiculoClienteAlheio.body)}`
  );

  const idorPostOsClienteAlheio = await req('POST', '/api/app/os',
    { descricao: 'OS com cliente alheio', cliente_id: clienteIdA, valor_mo: 0 }, tokenB);
  assert(
    `POST /os com cliente_id=${clienteIdA} (oficina A) usando token de oficina B → 404`,
    idorPostOsClienteAlheio.status === 404,
    `recebeu ${idorPostOsClienteAlheio.status} — ${JSON.stringify(idorPostOsClienteAlheio.body)}`
  );

  const idorPostAgendaClienteAlheio = await req('POST', '/api/app/agenda', {
    titulo: 'Agenda com cliente alheio',
    data: new Date().toISOString().split('T')[0],
    cliente_id: clienteIdA,
  }, tokenB);
  assert(
    `POST /agenda com cliente_id=${clienteIdA} (oficina A) usando token de oficina B → 404`,
    idorPostAgendaClienteAlheio.status === 404,
    `recebeu ${idorPostAgendaClienteAlheio.status} — ${JSON.stringify(idorPostAgendaClienteAlheio.body)}`
  );

  // ── 10. Token de master_admin não acessa rotas /app ───────────────────────
  console.log('\n📋 10. master_admin não acessa rotas /app (exclusivo de oficinas)');

  const tokenAdmin = await login('admin@chave10.com', process.env.MASTER_ADMIN_PASSWORD || 'admin123');
  const adminAcessaApp = await req('GET', '/api/app/clientes', null, tokenAdmin);
  assert(
    'GET /api/app/clientes com token master_admin → 403',
    adminAcessaApp.status === 403,
    `recebeu ${adminAcessaApp.status} — ${JSON.stringify(adminAcessaApp.body)}`
  );

  // ── 11. Funcionário não acessa dados financeiros ──────────────────────────
  console.log('\n📋 11. Perfil funcionario não acessa rotas financeiras restritas');

  // Cria funcionário na oficina A
  const emailFunc = `func_test_${Date.now()}@teste.com`;
  const adminTokenForCreate = await login('admin@chave10.com', process.env.MASTER_ADMIN_PASSWORD || 'admin123');

  // Descobre oficina_id da oficina A
  const meA = await req('GET', '/api/auth/me', null, tokenA);
  const oficinaBId = meA.body.oficina_id;

  const criaFunc = await req('POST', '/api/admin/usuarios', {
    nome: 'Funcionário Teste',
    email: emailFunc,
    senha: 'func1234',
    perfil: 'funcionario',
    oficina_id: oficinaBId,
  }, adminTokenForCreate);

  if (criaFunc.status === 201) {
    const tokenFunc = await login(emailFunc, 'func1234');

    const funcAcessaDespesas = await req('GET', '/api/app/despesas', null, tokenFunc);
    assert(
      'GET /despesas com perfil funcionario → 403',
      funcAcessaDespesas.status === 403,
      `recebeu ${funcAcessaDespesas.status}`
    );

    const funcAcessaConfig = await req('GET', '/api/app/config', null, tokenFunc);
    assert(
      'GET /config com perfil funcionario → 403',
      funcAcessaConfig.status === 403,
      `recebeu ${funcAcessaConfig.status}`
    );
  } else {
    console.log(`  ⚠️  Não foi possível criar funcionário de teste (${criaFunc.status}), pulando testes de perfil`);
  }

  // ── 12. Token inválido / expirado ─────────────────────────────────────────
  console.log('\n📋 12. Token inválido ou adulterado');

  const tokenFake = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsIm9maWNpbmFfaWQiOjEsInBlcmZpbCI6ImFkbWluX29maWNpbmEifQ.INVALID_SIGNATURE';
  const fakeToken = await req('GET', '/api/app/clientes', null, tokenFake);
  assert(
    'GET /clientes com token adulterado → 401',
    fakeToken.status === 401,
    `recebeu ${fakeToken.status}`
  );

  // ── 13. Enumeração de IDs sequenciais ─────────────────────────────────────
  console.log('\n📋 13. Enumeração de IDs sequenciais (IDs de outra oficina)');

  // Testa IDs de 1 a 5 — qualquer um que pertença à oficina A deve retornar 404 para oficina B
  let enumeracaoOk = true;
  for (let id = 1; id <= 5; id++) {
    const r = await req('PUT', `/api/app/clientes/${id}`, { nome: 'Tentativa' }, tokenB);
    if (r.status === 200) {
      enumeracaoOk = false;
      console.error(`    ⚠️  ID ${id} foi atualizado pela oficina B (IDOR confirmado!)`);
    }
  }
  assert(
    'Enumeração de IDs sequenciais em /clientes — nenhum ID de outra oficina editado',
    enumeracaoOk
  );

  // ── Resultado final ───────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Resultado: ${passed} passou, ${failed} falhou`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failures.length > 0) {
    console.error('❌ VULNERABILIDADES ENCONTRADAS:');
    failures.forEach(f => console.error(`   - ${f.name}${f.detail ? ': ' + f.detail : ''}`));
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ Todos os testes de controle de acesso passaram.');
    console.log('   Isolamento entre oficinas confirmado.\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('\n💥 Erro fatal nos testes:', err.message);
  console.error('   Verifique se o backend está rodando em', BASE_URL);
  process.exit(1);
});
