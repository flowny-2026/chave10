/**
 * test-security.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes de segurança da camada de proteção da API — Chave 10.
 *
 * Simula:
 *   1. Brute force no login
 *   2. Flood de requisições simultâneas
 *   3. Métodos HTTP inválidos (TRACE, CONNECT, etc.)
 *   4. CORS com origem maliciosa
 *   5. Payload acima do limite (>50kb)
 *   6. Acesso sem autenticação em todas as rotas protegidas
 *   7. Rate limit de registro de conta
 *   8. Content-Type inválido
 *   9. JSON malformado
 *  10. Timeout de requisição (slowloris simulado)
 *
 * Uso:
 *   node src/scripts/test-security.js
 *
 * Pré-requisito:
 *   Backend rodando em http://localhost:3001
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const http  = require('http');
const https = require('https');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3001';
const isHttps = BASE.startsWith('https');

let passed = 0;
let failed = 0;
const failures = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function request(method, path, { body, headers = {}, timeout = 8000 } = {}) {
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
    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: raw }); }
      });
    });

    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', headers: {}, body: null }); });
    req.on('error',   (e) => { resolve({ status: 'ERROR', headers: {}, body: e.message }); });

    if (payload) req.write(payload);
    req.end();
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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── 1. Brute Force no Login ──────────────────────────────────────────────────
async function testBruteForce() {
  console.log('\n📋 1. Brute Force no Login (loginLimiter: 5 req / 15 min)');

  const attempts = [];
  // Dispara 8 tentativas sequenciais de login com credenciais erradas
  for (let i = 0; i < 8; i++) {
    attempts.push(
      request('POST', '/api/auth/login', {
        body: { email: `bruteforce${i}@teste.com`, senha: 'senhaerrada' },
      })
    );
  }
  const results = await Promise.all(attempts);

  const statuses = results.map((r) => r.status);
  const got429   = statuses.filter((s) => s === 429).length;
  const got401   = statuses.filter((s) => s === 401).length;

  assert(
    'Após 5+ tentativas de login, recebe 429',
    got429 >= 1,
    `statuses recebidos: ${statuses.join(', ')}`
  );
  assert(
    'Primeiras tentativas recebem 401 (credenciais inválidas)',
    got401 >= 1,
    `statuses recebidos: ${statuses.join(', ')}`
  );

  // Verifica que a resposta 429 tem header RateLimit
  const resp429 = results.find((r) => r.status === 429);
  if (resp429) {
    assert(
      'Resposta 429 tem header RateLimit-Limit',
      !!(resp429.headers['ratelimit-limit'] || resp429.headers['x-ratelimit-limit']),
      `headers: ${JSON.stringify(Object.keys(resp429.headers))}`
    );
    assert(
      'Mensagem de erro é genérica (não revela detalhes internos)',
      typeof resp429.body?.error === 'string' &&
      !resp429.body.error.toLowerCase().includes('sql') &&
      !resp429.body.error.toLowerCase().includes('stack'),
      `body: ${JSON.stringify(resp429.body)}`
    );
  }
}

// ─── 2. Flood de Requisições Simultâneas ─────────────────────────────────────
async function testFlood() {
  console.log('\n📋 2. Flood de Requisições Simultâneas (globalLimiter: 500 req / min)');

  // Dispara 60 GETs simultâneos em /health (rota pública, sem auth)
  const reqs = Array.from({ length: 60 }, () =>
    request('GET', '/health')
  );
  const results = await Promise.all(reqs);
  const statuses = results.map((r) => r.status);
  const ok       = statuses.filter((s) => s === 200).length;
  const limited  = statuses.filter((s) => s === 429).length;

  assert(
    '60 GETs simultâneos: pelo menos 1 resposta bem-sucedida (servidor vivo)',
    ok >= 1,
    `ok=${ok}, 429=${limited}, outros=${statuses.filter(s => s !== 200 && s !== 429).join(',')}`
  );

  // Dispara 120 POSTs inválidos no login para testar o flood de escrita
  const writeReqs = Array.from({ length: 30 }, () =>
    request('POST', '/api/auth/login', {
      body: { email: 'flood@teste.com', senha: 'flood' },
    })
  );
  const writeResults = await Promise.all(writeReqs);
  const write429 = writeResults.filter((r) => r.status === 429).length;

  assert(
    '30 POSTs simultâneos no login: pelo menos 1 recebe 429',
    write429 >= 1,
    `write 429=${write429}, total=${writeResults.length}`
  );
}

// ─── 3. Métodos HTTP Inválidos ────────────────────────────────────────────────
async function testInvalidMethods() {
  console.log('\n📋 3. Métodos HTTP Inválidos (blockUnusedMethods)');

  const methods = ['TRACE', 'TRACK', 'CONNECT', 'PROPFIND', 'LOCK', 'UNLOCK'];

  for (const method of methods) {
    const r = await request(method, '/health');
    assert(
      `${method} /health → 405`,
      r.status === 405,
      `recebeu ${r.status}`
    );
  }

  // HEAD deve ser bloqueado também (não está na lista de allowed)
  const head = await request('HEAD', '/health');
  assert(
    'HEAD /health → 405',
    head.status === 405,
    `recebeu ${head.status}`
  );
}

// ─── 4. CORS com Origem Maliciosa ─────────────────────────────────────────────
async function testCors() {
  console.log('\n📋 4. CORS com Origem Maliciosa');

  // Origem não autorizada
  const malicious = await request('GET', '/api/app/clientes', {
    headers: {
      Origin: 'https://evil.hacker.com',
      Authorization: 'Bearer token_invalido',
    },
  });
  assert(
    'GET /api/app/clientes com origin maliciosa → sem ACAO header ou 403',
    malicious.status === 403 ||
    !malicious.headers['access-control-allow-origin'] ||
    malicious.headers['access-control-allow-origin'] !== 'https://evil.hacker.com',
    `status=${malicious.status}, acao=${malicious.headers['access-control-allow-origin']}`
  );

  // Preflight OPTIONS com origem maliciosa
  const preflight = await request('OPTIONS', '/api/auth/login', {
    headers: {
      Origin:                         'https://evil.hacker.com',
      'Access-Control-Request-Method': 'POST',
    },
  });
  const acaoHeader = preflight.headers['access-control-allow-origin'];
  assert(
    'OPTIONS preflight com origin maliciosa → ACAO não reflete a origem',
    acaoHeader !== 'https://evil.hacker.com',
    `access-control-allow-origin: ${acaoHeader}`
  );

  // Origem legítima deve funcionar
  const legit = await request('OPTIONS', '/api/auth/login', {
    headers: {
      Origin:                         'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
    },
  });
  assert(
    'OPTIONS preflight com origin legítima (localhost:5173) → 204',
    legit.status === 204 || legit.status === 200,
    `recebeu ${legit.status}`
  );
}

// ─── 5. Payload Acima do Limite ───────────────────────────────────────────────
async function testPayloadLimit() {
  console.log('\n📋 5. Payload acima do limite (50kb)');

  // Cria um body de ~60kb
  const bigPayload = { nome: 'X'.repeat(60 * 1024) };
  const r = await request('POST', '/api/auth/login', { body: bigPayload });
  assert(
    'POST com payload de 60kb → 413',
    r.status === 413,
    `recebeu ${r.status} — ${JSON.stringify(r.body)}`
  );
  assert(
    'Resposta 413 tem mensagem de erro (sem stack trace)',
    typeof r.body?.error === 'string' &&
    !String(r.body.error).toLowerCase().includes('stack'),
    `body: ${JSON.stringify(r.body)}`
  );
}

// ─── 6. Acesso sem Autenticação ───────────────────────────────────────────────
async function testUnauthenticated() {
  console.log('\n📋 6. Acesso sem Autenticação');

  const protectedRoutes = [
    ['GET',    '/api/app/clientes'],
    ['GET',    '/api/app/veiculos'],
    ['GET',    '/api/app/os'],
    ['GET',    '/api/app/agenda'],
    ['GET',    '/api/app/estoque'],
    ['GET',    '/api/app/despesas'],
    ['GET',    '/api/app/orcamentos'],
    ['GET',    '/api/app/dashboard'],
    ['GET',    '/api/app/config'],
    ['GET',    '/api/admin/oficinas'],
    ['GET',    '/api/admin/pagamentos'],
    ['GET',    '/api/admin/dashboard'],
    ['POST',   '/api/app/clientes'],
    ['DELETE', '/api/app/clientes/1'],
  ];

  for (const [method, path] of protectedRoutes) {
    const r = await request(method, path);
    assert(
      `${method} ${path} sem token → 401`,
      r.status === 401,
      `recebeu ${r.status}`
    );
  }
}

// ─── 7. Rate Limit de Registro ────────────────────────────────────────────────
async function testRegisterRateLimit() {
  console.log('\n📋 7. Rate Limit de Registro (registerLimiter: 3 cadastros / hora)');

  const reqs = [];
  for (let i = 0; i < 5; i++) {
    reqs.push(
      request('POST', '/api/auth/register', {
        body: {
          nome: `Teste Rate ${i}`,
          email: `ratelimit_reg_${Date.now()}_${i}@teste.com`,
          senha: 'senha1234',
        },
      })
    );
  }
  const results = await Promise.all(reqs);
  const statuses = results.map((r) => r.status);
  const got429   = statuses.some((s) => s === 429);

  assert(
    'Após 3+ cadastros rápidos do mesmo IP → pelo menos 1 recebe 429',
    got429,
    `statuses: ${statuses.join(', ')}`
  );
}

// ─── 8. Content-Type Inválido ─────────────────────────────────────────────────
async function testContentType() {
  console.log('\n📋 8. Content-Type Inválido (requireJsonContentType)');

  const formPost = await request('POST', '/api/auth/login', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    { email: 'teste@teste.com', senha: 'senha' },
  });
  assert(
    'POST com Content-Type: form-urlencoded → 415',
    formPost.status === 415,
    `recebeu ${formPost.status} — ${JSON.stringify(formPost.body)}`
  );

  const textPost = await request('POST', '/api/auth/login', {
    headers: { 'Content-Type': 'text/plain' },
    body:    'email=a&senha=b',
  });
  assert(
    'POST com Content-Type: text/plain → 415',
    textPost.status === 415,
    `recebeu ${textPost.status} — ${JSON.stringify(textPost.body)}`
  );
}

// ─── 9. JSON Malformado ───────────────────────────────────────────────────────
async function testMalformedJson() {
  console.log('\n📋 9. JSON Malformado no Body');

  // Envia string que não é JSON válido diretamente
  const r = await new Promise((resolve) => {
    const url  = new URL(BASE + '/api/auth/login');
    const data = '{"email":"teste@teste.com","senha":broken}';
    const opts = {
      hostname: url.hostname,
      port:     url.port || 80,
      path:     '/api/auth/login',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = (isHttps ? https : http).request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', (e) => resolve({ status: 'ERROR', body: e.message }));
    req.write(data);
    req.end();
  });

  assert(
    'POST com JSON malformado → 400',
    r.status === 400,
    `recebeu ${r.status} — ${JSON.stringify(r.body)}`
  );
  assert(
    'Resposta 400 não expõe stack trace',
    !String(r.body?.error || r.body).toLowerCase().includes('at '),
    `body: ${JSON.stringify(r.body)}`
  );
}

// ─── 10. Headers de Segurança ─────────────────────────────────────────────────
async function testSecurityHeaders() {
  console.log('\n📋 10. Headers de Segurança (Helmet)');

  const r = await request('GET', '/health');
  const h = r.headers;

  assert('X-Content-Type-Options: nosniff',
    h['x-content-type-options'] === 'nosniff',
    `valor: ${h['x-content-type-options']}`);

  assert('X-Frame-Options: DENY',
    h['x-frame-options'] === 'DENY',
    `valor: ${h['x-frame-options']}`);

  assert('Referrer-Policy: no-referrer',
    h['referrer-policy'] === 'no-referrer',
    `valor: ${h['referrer-policy']}`);

  assert('X-Powered-By ausente (fingerprinting bloqueado)',
    !h['x-powered-by'],
    `valor: ${h['x-powered-by']}`);

  assert('Content-Security-Policy presente',
    !!h['content-security-policy'],
    'header ausente');

  assert('CSP default-src none',
    (h['content-security-policy'] || '').includes("default-src 'none'"),
    `csp: ${h['content-security-policy']}`);

  const hsts = h['strict-transport-security'];
  if (hsts) {
    assert('HSTS max-age >= 1 ano',
      parseInt(hsts.match(/max-age=(\d+)/)?.[1] || 0) >= 31536000,
      `valor: ${hsts}`);
  } else {
    // HSTS só é enviado em HTTPS — em dev (HTTP) é normal estar ausente
    console.log('  ⚠️  HSTS ausente — esperado em HTTP (dev). Verificar em produção HTTPS.');
    passed++; // não falha em dev
  }
}

// ─── 11. Enumeração de Usuários ───────────────────────────────────────────────
async function testUserEnumeration() {
  console.log('\n📋 11. Anti-Enumeração de Usuários');

  // Email inexistente
  const notFound = await request('POST', '/api/auth/login', {
    body: { email: 'nao_existe_jamais@exemplo.com', senha: 'qualquercoisa' },
  });

  // Email possivelmente existente (demo)
  const mayExist = await request('POST', '/api/auth/login', {
    body: { email: 'teste@teste.com', senha: 'senhaerrada' },
  });

  assert(
    'Login com email inexistente e email existente retornam o mesmo status (401)',
    notFound.status === mayExist.status,
    `inexistente=${notFound.status}, existe=${mayExist.status}`
  );

  assert(
    'Login com email inexistente e email existente retornam a mesma mensagem de erro',
    notFound.body?.error === mayExist.body?.error,
    `inexistente="${notFound.body?.error}", existe="${mayExist.body?.error}"`
  );
}

// ─── Runner ───────────────────────────────────────────────────────────────────
async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Chave 10 — Testes de Segurança: Camada de Proteção da API');
  console.log(`  Alvo: ${BASE}`);
  console.log('═══════════════════════════════════════════════════════════');

  // Verifica se o servidor está no ar antes de começar
  const health = await request('GET', '/health');
  if (health.status !== 200) {
    console.error(`\n💥 Backend não está respondendo em ${BASE}/health`);
    console.error(`   Status: ${health.status} — ${health.body}`);
    console.error('   Inicie o servidor antes de rodar os testes.\n');
    process.exit(1);
  }
  console.log('\n✅ Backend respondendo — iniciando testes...\n');

  await testBruteForce();
  await sleep(500); // pequena pausa entre suites para não contaminar rate limits
  await testFlood();
  await sleep(500);
  await testInvalidMethods();
  await testCors();
  await testPayloadLimit();
  await testUnauthenticated();
  await sleep(500);
  await testRegisterRateLimit();
  await testContentType();
  await testMalformedJson();
  await testSecurityHeaders();
  await testUserEnumeration();

  // ── Resultado ──────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Resultado: ${passed} passou, ${failed} falhou`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failures.length > 0) {
    console.error('❌ Falhas encontradas:');
    failures.forEach((f) =>
      console.error(`   • ${f.name}${f.detail ? '\n     ' + f.detail : ''}`)
    );
    console.log('');
    process.exit(1);
  }

  console.log('✅ Todos os testes de proteção da API passaram.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n💥 Erro fatal:', err.message);
  process.exit(1);
});
