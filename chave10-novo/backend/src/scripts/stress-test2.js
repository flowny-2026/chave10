/**
 * stress-test2.js — Stress test que distingue rate limit de falhas reais
 * Usa o endpoint /health (sem auth, sem rate limit) para medir o servidor puro
 * e /api/app/os com pacing para não ativar rate limit.
 */
const autocannon = require('autocannon');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = fs.readFileSync(path.join(__dirname, '_token.txt'), 'utf8').trim();
const BASE  = 'https://chave10-api.onrender.com';

const NIVEIS = [
  { c:  5, d: 8 },
  { c: 10, d: 8 },
  { c: 20, d: 8 },
  { c: 40, d: 8 },
  { c: 80, d: 8 },
  { c:150, d: 8 },
];

function run(url, connections, duration, auth) {
  return new Promise(resolve => {
    const inst = autocannon({
      url, connections, duration,
      headers: auth ? { Authorization: `Bearer ${TOKEN}` } : {},
      timeout: 15,
    }, (err, r) => resolve({ err, r }));
    autocannon.track(inst, { renderProgressBar: false, renderResultsTable: false });
  });
}

async function testarEndpoint(nome, url, auth) {
  console.log(`\n  📋 ${nome}`);
  console.log(`  ${'conn'.padEnd(6)} ${'req/s'.padEnd(8)} ${'p50'.padEnd(8)} ${'p99'.padEnd(8)} ${'erros'.padEnd(8)} status`);
  console.log(`  ${'-'.repeat(55)}`);

  let rupturaConn = null;

  for (const { c, d } of NIVEIS) {
    const { err, r } = await run(url, c, d, auth);
    if (err) { console.log(`  ${c}        ERRO FATAL`); break; }

    const p50     = r.latency.average.toFixed(0);
    const p99     = r.latency.p99.toFixed(0);
    const rps     = r.requests.average.toFixed(0);
    const errs    = r.errors + r.non2xx;
    const total   = r.requests.total;
    const errPct  = total > 0 ? (errs / total * 100).toFixed(1) : '0.0';

    let status;
    if      (parseFloat(errPct) > 30)  status = '🔴 RUPTURA';
    else if (parseFloat(errPct) > 10)  status = '🟠 DEGRADADO';
    else if (parseFloat(p50) > 2000)   status = '🟡 LENTO';
    else if (parseFloat(p50) > 800)    status = '🟡 RAZOÁVEL';
    else                               status = '🟢 OK';

    console.log(`  ${String(c).padEnd(6)} ${String(rps).padEnd(8)} ${p50+'ms'.padEnd(8)} ${p99+'ms'.padEnd(8)} ${(errPct+'%').padEnd(8)} ${status}`);

    if (parseFloat(errPct) > 30 && !rupturaConn) rupturaConn = c;

    await new Promise(r => setTimeout(r, 2000));
  }

  return rupturaConn;
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║      CHAVE 10 — STRESS TEST v2 (infraestrutura real)     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Teste 1: Servidor puro (sem auth, sem rate limit, sem DB)
  const r1 = await testarEndpoint(
    'Servidor puro — /health (sem auth, sem DB)',
    BASE + '/health',
    false
  );

  // Pausa para recuperar
  console.log('\n  ⏳ Aguardando 10s para servidor se recuperar...');
  await new Promise(r => setTimeout(r, 10000));

  // Teste 2: Endpoint com DB e auth (com rate limit — mostra o gargalo real)
  const r2 = await testarEndpoint(
    'Com DB e auth — /api/app/os (lista OS)',
    BASE + '/api/app/os',
    true
  );

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    CONCLUSÃO                              ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');

  if (!r1) {
    console.log('║  🟢 Servidor Node.js: aguenta 150+ conexões sem quebrar   ║');
  } else {
    console.log(`║  🔴 Servidor Node.js: ruptura em ~${r1} conexões          ║`);
  }

  if (!r2) {
    console.log('║  🟢 Com banco + auth: aguenta 150+ conexões               ║');
  } else if (r2 <= 10) {
    console.log(`║  🔴 Gargalo: Rate limit ativa em ~${r2} conexões           ║`);
    console.log('║     Causa: writeLimiter / readLimiter muito restritivos   ║');
    console.log('║     Solução: aumentar limites para produção               ║');
  } else {
    console.log(`║  🔴 Com banco + auth: ruptura em ~${r2} conexões          ║`);
    console.log('║     Causa provável: pool de conexões do PostgreSQL        ║');
  }

  console.log('║                                                           ║');
  console.log('║  Infra atual: Render Free + Supabase Free                 ║');
  console.log('║  ┌─────────────────────────────────────────────────────┐  ║');
  console.log('║  │  Componente    │ Limite atual  │ Upgrade             │  ║');
  console.log('║  │─────────────────────────────────────────────────────│  ║');
  console.log('║  │  Render Free   │ 0.1 CPU share │ Starter $7/mês     │  ║');
  console.log('║  │  Supabase Free │ 60 conn pool  │ Pro $25/mês        │  ║');
  console.log('║  │  Rate limit    │ 100 req/min   │ Ajustar no código  │  ║');
  console.log('║  └─────────────────────────────────────────────────────┘  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
