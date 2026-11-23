/**
 * cache-test.js — Testa o efeito do cache nos endpoints de dashboard
 * Uso: node src/scripts/cache-test.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = fs.readFileSync(path.join(__dirname, '_token.txt'), 'utf8').trim();
const BASE  = 'chave10-api.onrender.com';

function req(endpoint) {
  return new Promise((resolve) => {
    const start = Date.now();
    const options = {
      hostname: BASE,
      path: endpoint,
      method: 'GET',
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 10000,
    };
    const r = https.request(options, res => {
      res.resume();
      res.on('end', () => resolve({ ms: Date.now() - start, status: res.statusCode }));
    });
    r.on('error', () => resolve({ ms: Date.now() - start, status: 0 }));
    r.on('timeout', () => { r.destroy(); resolve({ ms: Date.now() - start, status: 0 }); });
    r.end();
  });
}

async function main() {
  const endpoints = [
    { nome: 'Dashboard',        path: '/api/app/dashboard' },
    { nome: 'Dashboard-resumo', path: '/api/app/dashboard-resumo' },
    { nome: 'Lista OS',         path: '/api/app/os' },
    { nome: 'Estoque',          path: '/api/app/estoque' },
  ];

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     CHAVE 10 — TESTE DE CACHE (5 req por endpoint)  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  for (const ep of endpoints) {
    console.log(`  📋 ${ep.nome}`);
    const tempos = [];
    for (let i = 1; i <= 5; i++) {
      const { ms, status } = await req(ep.path);
      tempos.push(ms);
      const label = i === 1 ? '1ª req (DB)  ' : `${i}ª req (cache)`;
      const icon  = status === 200 ? '✅' : '❌';
      const bar   = '█'.repeat(Math.min(Math.ceil(ms / 100), 30));
      console.log(`     ${icon} ${label}  ${String(ms).padStart(5)}ms  ${bar}`);
    }
    const melhora = tempos[0] > 0 ? Math.round((1 - tempos[4] / tempos[0]) * 100) : 0;
    console.log(`     → Melhora cache vs DB: ${melhora > 0 ? melhora + '% mais rápido' : 'sem diferença'}\n`);
  }

  console.log('  📌 Legenda:');
  console.log('     1ª req = vai ao banco (cold)');
  console.log('     2ª-5ª  = servida do cache (60s TTL)\n');
}

main().catch(console.error);
