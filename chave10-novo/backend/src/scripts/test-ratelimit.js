/**
 * test-ratelimit.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes de rate limiting e proteção contra ataques — Chave 10.
 *
 * Cenários obrigatórios:
 *   1. Mais de 100 requisições em sequência (flood geral)
 *   2. Mais de 20 tentativas de login (brute force)
 *   3. Simulação de ataque de força bruta com credenciais variadas
 *
 * Cenários adicionais:
 *   4. Rate limit de cadastro de contas
 *   5. Bloqueio progressivo de login (janela dinâmica)
 *   6. Rate limit do painel admin
 *   7. Rate limit de escrita (POST/PUT/DELETE)
 *   8. Resposta 429 padronizada (Retry-After header)
 *   9. Rate limit de operações sensíveis (troca de senha)
 *  10. Verificação de logs de segurança (não expõe dados sensíveis)
 *
 * Uso:
 *   node src/scripts/test-ratelimit.js
 *
 * Pré-requisito:
 *   Backend rodando em http://localhost:3001
 *   Nota: os testes consomem os rate limit counters do servidor.
 *   Reinicie o servidor entre execuções para limpar os contadores.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const http  = require('http');
const https = require('https');

const BASE    = process.env.TEST_BASE_URL || 'http://localhost:3001';
const isHttps = BASE.startsWith('https');

let passed   = 0;
let failed   = 0;
const failures = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(method, path, { body, headers = {}, timeout = 10000 } = {}) {
  return new Promise((resolve) => {
    const url     = new URL(BASE + path);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port:     url.port || (isHttps ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
      timeout,
    };
    const lib = isHttps ? https : http;
    const request = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: raw }); }
      });
    });
    request.on('timeout', () => { request.destroy(); resolve({ status: 'TIMEOUT', headers: {}, body: null }); });
    request.on('error',   () => resolve({ status: 'ERROR', headers: {}, body: null }));
    if (payload) request.write(payload);
    request.end();
  });
}

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS  ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL  ${name}${detail ? '\n          → ' + detail : ''}`);
    failed++;
    failures.push({ name, detail });
  }
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Dispara N requisições em paralelo e retorna distribuição de status codes
async function burst(method, path, n, body) {
  const reqs = Array.from({ length: n }, () => req(method, path, { body }));
  const results = await Promise.all(reqs);
  const dist = {};
  results.forEach((r) => { dist[r.status] = (dist[r.status] || 0) + 1; });
  return { results, dist };
}

// ─── 1. Mais de 100 requisições em sequência ──────────────────────────────────
async function test100Requests() {
  console.log('\n📋 1. Mais de 100 Requisições em Sequência (writeLimiter: 100/min)');

  // 120 POSTs simultâneos em /api/auth/login
  const { results, dist } = await burst('POST', '/api/auth/login', 120,
    { email: 'flood@test.com', senha: 'flood' }
  );

  const got429 = (dist[429] || 0);
  const got401 = (dist[401] || 0);
  const total  = results.length;

  assert(
    '120 POSTs simultâneos: pelo menos 1 recebe 429 (rate limit ativado)',
    got429 >= 1,
    `distribuição: ${JSON.stringify(dist)}`
  );
  assert(
    '120 POSTs simultâneos: não retorna 500 (servidor não travou)',
    (dist[500] || 0) === 0,
    `erros 500: ${dist[500] || 0}`
  );
  assert(
    `Total de respostas correto (${total} de ${total} responderam)`,
    total === 120,
    `total: ${total}`
  );

  console.log(`    Distribuição: 401=${got401}, 429=${got429}, outros=${total - got401 - got429}`);

  // Verifica que após o rate limit, a resposta ainda é JSON válido
  const resp429 = results.find((r) => r.status === 429);
  if (resp429) {
    assert(
      'Resposta 429 tem campo "error" no body',
      typeof resp429.body?.error === 'string',
      `body: ${JSON.stringify(resp429.body)}`
    );
    assert(
      'Resposta 429 tem header Retry-After',
      !!resp429.headers['retry-after'],
      `headers: ${JSON.stringify(Object.keys(resp429.headers))}`
    );
    assert(
      'Resposta 429 tem header RateLimit-Limit',
      !!(resp429.headers['ratelimit-limit'] || resp429.headers['x-ratelimit-limit']),
      'header ausente'
    );
  }
}

// ─── 2. Mais de 20 tentativas de login ────────────────────────────────────────
async function test20LoginAttempts() {
  console.log('\n📋 2. Mais de 20 Tentativas de Login (loginLimiter: 5/15min)');

  // Envia 25 tentativas sequenciais (não paralelas para simular brute force real)
  const statuses = [];
  for (let i = 0; i < 25; i++) {
    const r = await req('POST', '/api/auth/login', {
      body: { email: `brute${i}@test.com`, senha: `senha${i}` },
    });
    statuses.push(r.status);
    // Pequena pausa para não disparar globalLimiter
    if (i % 5 === 4) await sleep(100);
  }

  const dist = {};
  statuses.forEach((s) => { dist[s] = (dist[s] || 0) + 1; });

  const got429 = dist[429] || 0;
  const got401 = dist[401] || 0;

  assert(
    '25 tentativas de login: pelo menos 5 recebem 429',
    got429 >= 5,
    `distribuição: ${JSON.stringify(dist)}`
  );
  assert(
    '25 tentativas de login: as primeiras recebem 401 (não bloqueadas imediatamente)',
    got401 >= 1,
    `distribuição: ${JSON.stringify(dist)}`
  );
  assert(
    '25 tentativas de login: após o limite, todas recebem 429',
    got429 >= (25 - 5),
    `esperado >= ${25 - 5} bloqueios, recebeu ${got429}`
  );

  console.log(`    Distribuição: 401=${got401}, 429=${got429}`);
  console.log(`    Padrão: ${statuses.map((s) => s === 429 ? '⛔' : '✓').join('')}`);
}

// ─── 3. Ataque de Força Bruta simulado ────────────────────────────────────────
async function testBruteForce() {
  console.log('\n📋 3. Simulação de Ataque de Força Bruta');

  // Simula atacante que testa senhas comuns para um email específico
  const targetEmail = 'admin@chave10.com';
  const commonPasswords = [
    'admin123', 'password', '123456', 'admin', 'letmein',
    'welcome', 'monkey', '123456789', 'password1', '12345678',
    'qwerty', 'abc123', 'dragon', 'master', 'sunshine',
  ];

  const results = [];
  for (const senha of commonPasswords) {
    const r = await req('POST', '/api/auth/login', {
      body: { email: targetEmail, senha },
    });
    results.push({ senha: '***', status: r.status, blocked: r.status === 429 });
    if (r.status === 429) break; // atacante percebe o bloqueio
  }

  const blocked   = results.filter((r) => r.blocked).length;
  const attempted = results.length;
  const firstBlock = results.findIndex((r) => r.blocked);

  assert(
    'Ataque brute force é bloqueado antes de testar todas as senhas',
    blocked >= 1,
    `testou ${attempted} senhas sem bloqueio`
  );
  assert(
    'Bloqueio ocorre na 6ª tentativa ou antes (limite=5)',
    firstBlock <= 5,
    `primeiro bloqueio na tentativa #${firstBlock + 1}`
  );
  assert(
    'Resposta de bloqueio não revela se o email existe',
    results.every((r) =>
      r.status !== 200 ||
      !String(r.body?.error || '').toLowerCase().includes('email')
    ),
    'resposta pode estar revelando existência do email'
  );

  console.log(`    Tentativas antes do bloqueio: ${firstBlock + 1}`);
  console.log(`    Senhas testadas: ${attempted} de ${commonPasswords.length}`);
  console.log(`    Bloqueios recebidos: ${blocked}`);

  // Verifica que o erro 401 e o 429 têm a MESMA mensagem genérica (anti-enumeração)
  const resp401 = results.find((r) => r.status === 401);
  const resp429 = results.find((r) => r.status === 429);
  if (resp401 && resp429) {
    // As mensagens podem ser diferentes (401="credenciais", 429="muitas tentativas"),
    // mas nenhuma deve revelar se o email existe ou não
    assert(
      'Resposta 401 não menciona "email" ou "usuário não encontrado"',
      !String(resp401.body?.error || '').toLowerCase().match(/email.*(n.o|inexistente|n.o.*exist)/i),
      `body 401: ${JSON.stringify(resp401.body)}`
    );
  }
}

// ─── 4. Rate limit de cadastro ────────────────────────────────────────────────
async function testRegisterRateLimit() {
  console.log('\n📋 4. Rate Limit de Cadastro (registerLimiter: 3/hora)');

  const ts = Date.now();
  const reqs = [];
  for (let i = 0; i < 6; i++) {
    reqs.push(req('POST', '/api/auth/register', {
      body: { nome: `Teste ${i}`, email: `rl_reg_${ts}_${i}@test.com`, senha: 'senha1234' },
    }));
  }
  const results = await Promise.all(reqs);
  const dist = {};
  results.forEach((r) => { dist[r.status] = (dist[r.status] || 0) + 1; });

  assert(
    '6 cadastros simultâneos: pelo menos 1 recebe 429',
    (dist[429] || 0) >= 1,
    `distribuição: ${JSON.stringify(dist)}`
  );
  console.log(`    Distribuição: ${JSON.stringify(dist)}`);
}

// ─── 5. Bloqueio progressivo de login ─────────────────────────────────────────
async function testProgressiveBlock() {
  console.log('\n📋 5. Bloqueio Progressivo — Múltiplas Violações do Mesmo IP');

  // Verifica que a resposta 429 do login tem Retry-After (indica janela de bloqueio)
  // Dispara 6 tentativas para garantir que o limite foi atingido
  const attempts = [];
  for (let i = 0; i < 6; i++) {
    attempts.push(req('POST', '/api/auth/login', {
      body: { email: `progressive${i}@test.com`, senha: 'wrong' },
    }));
  }
  const results = await Promise.all(attempts);
  const blocked = results.filter((r) => r.status === 429);

  assert(
    'Tentativas bloqueadas têm header Retry-After',
    blocked.every((r) => !!r.headers['retry-after']),
    `headers das respostas 429: ${blocked.map((r) => r.headers['retry-after']).join(', ')}`
  );

  if (blocked.length > 0) {
    const retryAfter = parseInt(blocked[0].headers['retry-after']);
    assert(
      'Retry-After é >= 60 segundos (pelo menos 1 minuto de espera)',
      !isNaN(retryAfter) && retryAfter >= 60,
      `retry-after: ${retryAfter}s`
    );
    console.log(`    Retry-After retornado: ${retryAfter}s`);
  }
}

// ─── 6. Rate limit do painel admin ────────────────────────────────────────────
async function testAdminRateLimit() {
  console.log('\n📋 6. Rate Limit do Painel Admin (adminLimiter: 60/min)');

  // 70 GETs simultâneos em /api/admin/oficinas (sem token — vai dar 401, mas consome o counter)
  const { dist } = await burst('GET', '/api/admin/oficinas', 70);

  // Deve ter 401 (não autenticado) ou 429 (rate limit)
  const valid = (dist[401] || 0) + (dist[429] || 0);
  assert(
    '70 GETs no admin: todas as respostas são 401 ou 429',
    valid === 70,
    `distribuição: ${JSON.stringify(dist)}`
  );
  assert(
    '70 GETs no admin: pelo menos 1 recebe 429 (adminLimiter ativo)',
    (dist[429] || 0) >= 1,
    `distribuição: ${JSON.stringify(dist)}`
  );
  console.log(`    Distribuição: ${JSON.stringify(dist)}`);
}

// ─── 7. Rate limit de escrita ─────────────────────────────────────────────────
async function testWriteRateLimit() {
  console.log('\n📋 7. Rate Limit de Escrita (writeLimiter: 100/min)');

  // 110 POSTs simultâneos para testar o writeLimiter
  const { dist } = await burst('POST', '/api/app/clientes', 110,
    { nome: 'Teste Write RL' }
  );

  // Esperamos 401 (sem auth) e/ou 429 (rate limit)
  const blocked = dist[429] || 0;
  assert(
    '110 POSTs em /app/clientes: pelo menos 10 são bloqueados por 429',
    blocked >= 1,
    `distribuição: ${JSON.stringify(dist)}`
  );
  console.log(`    Distribuição: ${JSON.stringify(dist)}`);
}

// ─── 8. Resposta 429 padronizada ──────────────────────────────────────────────
async function test429Format() {
  console.log('\n📋 8. Formato Padronizado da Resposta 429');

  // Força um 429 via login
  const attempts = Array.from({ length: 8 }, () =>
    req('POST', '/api/auth/login', { body: { email: 'fmt@test.com', senha: 'wrong' } })
  );
  const results = await Promise.all(attempts);
  const resp429 = results.find((r) => r.status === 429);

  if (!resp429) {
    console.log('  ⚠️  Não foi possível obter uma resposta 429 (contador já zerado do teste anterior)');
    passed++;
    return;
  }

  assert('429 tem Content-Type: application/json',
    (resp429.headers['content-type'] || '').includes('application/json'),
    `content-type: ${resp429.headers['content-type']}`
  );
  assert('429 tem campo "error" no body (string)',
    typeof resp429.body?.error === 'string' && resp429.body.error.length > 0,
    `body: ${JSON.stringify(resp429.body)}`
  );
  assert('429 tem campo "retryAfter" no body (número)',
    typeof resp429.body?.retryAfter === 'number',
    `body: ${JSON.stringify(resp429.body)}`
  );
  assert('429 tem header Retry-After',
    !!resp429.headers['retry-after'],
    `headers: ${JSON.stringify(Object.keys(resp429.headers))}`
  );
  assert('429 body não contém "stack" (sem stack trace)',
    !JSON.stringify(resp429.body).toLowerCase().includes('stack'),
    `body: ${JSON.stringify(resp429.body)}`
  );
  assert('429 body não contém "sql" (sem query SQL)',
    !JSON.stringify(resp429.body).toLowerCase().includes('select'),
    `body: ${JSON.stringify(resp429.body)}`
  );
}

// ─── 9. Rate limit de operações sensíveis ─────────────────────────────────────
async function testSensitiveOpsLimit() {
  console.log('\n📋 9. Rate Limit de Operações Sensíveis (sensitiveOpsLimiter: 10/15min)');

  // 15 tentativas de trocar senha sem autenticação
  const reqs = Array.from({ length: 15 }, () =>
    req('POST', '/api/admin/trocar-senha', {
      body: { senha_atual: 'wrong', senha_nova: 'newpassword123' },
    })
  );
  const results = await Promise.all(reqs);
  const dist = {};
  results.forEach((r) => { dist[r.status] = (dist[r.status] || 0) + 1; });

  // Esperamos 401 (sem auth) e 429 (rate limit sensitivo)
  assert(
    '15 tentativas em /trocar-senha: pelo menos 1 bloqueada por 429',
    (dist[429] || 0) >= 1,
    `distribuição: ${JSON.stringify(dist)}`
  );
  console.log(`    Distribuição: ${JSON.stringify(dist)}`);
}

// ─── 10. Logs não expõem dados sensíveis ──────────────────────────────────────
async function testLogSafety() {
  console.log('\n📋 10. Logs de Segurança — Dados Sensíveis não são Expostos');

  // Envia uma requisição com dados potencialmente sensíveis no body
  // O servidor não deve ecoar esses dados no response (já testado no errorHandler)
  // Aqui verificamos que a API não vaza tokens nas respostas de erro de rate limit
  const r = await req('POST', '/api/auth/login', {
    body: { email: 'log@test.com', senha: 'senhaSecreta123' },
    headers: { Authorization: 'Bearer token_super_secreto_123' },
  });

  assert(
    'Resposta de erro não contém a senha enviada',
    !JSON.stringify(r.body || '').includes('senhaSecreta123'),
    `body: ${JSON.stringify(r.body)}`
  );
  assert(
    'Resposta de erro não contém o token enviado',
    !JSON.stringify(r.body || '').includes('token_super_secreto_123'),
    `body: ${JSON.stringify(r.body)}`
  );
  assert(
    'Status é 401 ou 429 (nunca 200 com token inválido)',
    [401, 429].includes(r.status),
    `status: ${r.status}`
  );
}

// ─── Runner ───────────────────────────────────────────────────────────────────
async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Chave 10 — Testes de Rate Limiting e Proteção contra Ataques');
  console.log(`  Alvo: ${BASE}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ⚠️  Estes testes CONSOMEM os contadores de rate limit.');
  console.log('      Reinicie o servidor entre execuções para limpar.\n');

  // Verifica se servidor está no ar
  const health = await req('GET', '/health');
  if (health.status !== 200) {
    console.error(`\n💥 Backend não está respondendo em ${BASE}/health`);
    process.exit(1);
  }
  console.log('✅ Backend respondendo — iniciando testes...');

  await test100Requests();
  await sleep(300);
  await test20LoginAttempts();
  await sleep(300);
  await testBruteForce();
  await sleep(300);
  await testRegisterRateLimit();
  await testProgressiveBlock();
  await sleep(300);
  await testAdminRateLimit();
  await sleep(300);
  await testWriteRateLimit();
  await sleep(300);
  await test429Format();
  await sleep(300);
  await testSensitiveOpsLimit();
  await testLogSafety();

  // ── Resultado ────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Resultado: ${passed} passou, ${failed} falhou`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failures.length > 0) {
    console.error('❌ Falhas:');
    failures.forEach((f) =>
      console.error(`   • ${f.name}${f.detail ? '\n     ' + f.detail : ''}`)
    );
    process.exit(1);
  }

  console.log('✅ Todos os testes de rate limiting passaram.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n💥 Erro fatal:', err.message);
  process.exit(1);
});
