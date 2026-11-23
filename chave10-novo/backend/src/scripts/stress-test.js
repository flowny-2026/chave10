/**
 * stress-test.js — Descobre o ponto de ruptura do sistema
 * Aumenta conexões progressivamente até encontrar degradação severa ou erros.
 *
 * Uso: node src/scripts/stress-test.js
 */
const autocannon = require('autocannon');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = fs.readFileSync(path.join(__dirname, '_token.txt'), 'utf8').trim();
const BASE  = 'https://chave10-api.onrender.com';

// Endpoint mais pesado (dashboard-resumo, sem cache pois muda a query com timestamp)
// Usamos /os que é representativo e não tem cache
const ENDPOINT = BASE + '/api/app/os';

const NIVEIS = [
  { connections:  5,  duration: 10, label: '5 conexões   (1-2 oficinas ativas)' },
  { connections: 10,  duration: 10, label: '10 conexões  (3-5 oficinas ativas)' },
  { connections: 25,  duration: 10, label: '25 conexões  (8-15 oficinas)' },
  { connections: 50,  duration: 10, label: '50 conexões  (20-30 oficinas)' },
  { connections: 100, duration: 10, label: '100 conexões (50+ oficinas)' },
  { connections: 200, duration: 10, label: '200 conexões (stress máximo)' },
];

function run(nivel) {
  return new Promise(resolve => {
    const inst = autocannon({
      url:         ENDPOINT,
      connections: nivel.connections,
      duration:    nivel.duration,
      headers:     { Authorization: `Bearer ${TOKEN}` },
      method:      'GET',
      timeout:     10,
    }, (err, result) => {
      resolve({ err, result });
    });
    autocannon.track(inst, { renderProgressBar: false, renderResultsTable: false });
  });
}

function classify(lat, errors, non2xx, total) {
  const errRate = (errors + non2xx) / Math.max(total, 1);
  if (errRate > 0.20)          return { icon: '🔴', label: 'CRÍTICO — +20% erros' };
  if (errRate > 0.05)          return { icon: '🟠', label: 'DEGRADADO — +5% erros' };
  if (lat > 3000)              return { icon: '🟠', label: 'LENTO — p50 > 3s' };
  if (lat > 1500)              return { icon: '🟡', label: 'RAZOÁVEL — p50 1.5-3s' };
  if (lat > 800)               return { icon: '🟡', label: 'ACEITÁVEL — p50 800ms-1.5s' };
  return                              { icon: '🟢', label: 'SAUDÁVEL' };
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         CHAVE 10 — STRESS TEST (ponto de ruptura)            ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  Endpoint: GET /api/app/os (representativo, sem cache)        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const resultados = [];
  let rupturaEncontrada = false;

  for (const nivel of NIVEIS) {
    process.stdout.write(`  ⏳ Testando ${nivel.label.padEnd(42)} `);

    const { err, result } = await run(nivel);

    if (err) {
      console.log('❌ ERRO FATAL');
      resultados.push({ nivel, status: 'fatal' });
      rupturaEncontrada = true;
      break;
    }

    const p50    = result.latency.average;
    const p99    = result.latency.p99;
    const rps    = result.requests.average;
    const errors = result.errors;
    const non2xx = result.non2xx;
    const total  = result.requests.total;
    const errRate = ((errors + non2xx) / Math.max(total, 1) * 100).toFixed(1);
    const { icon, label } = classify(p50, errors, non2xx, total);

    console.log(`${icon} ${label}`);
    console.log(`     rps:${rps.toFixed(0).padStart(5)}  p50:${p50.toFixed(0)}ms  p99:${p99.toFixed(0)}ms  erros:${errRate}%`);

    resultados.push({ nivel, p50, p99, rps, errRate: parseFloat(errRate), icon });

    // Para se encontrar ruptura severa
    if (parseFloat(errRate) > 20 || p50 > 5000) {
      rupturaEncontrada = true;
      console.log(`\n  ⚠️  Ponto de ruptura atingido em ${nivel.connections} conexões simultâneas!\n`);
      break;
    }

    // Pausa entre níveis para o servidor se recuperar
    await new Promise(r => setTimeout(r, 3000));
  }

  // ── Análise ──────────────────────────────────────────────────
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        ANÁLISE                               ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');

  const saudaveis = resultados.filter(r => r.icon === '🟢').length;
  const ultimo = resultados[resultados.length - 1];

  if (!rupturaEncontrada) {
    console.log('║  🟢 O sistema AGUENTOU todos os níveis de carga testados!     ║');
    console.log(`║     Máximo testado: ${NIVEIS[NIVEIS.length-1].connections} conexões simultâneas              ║`);
  } else {
    const rupted = resultados.find(r => r.icon === '🔴' || r.errRate > 20);
    const conn   = rupted ? rupted.nivel.connections : ultimo.nivel.connections;
    console.log(`║  🔴 Ruptura em ~${String(conn).padEnd(3)} conexões simultâneas               ║`);
    console.log(`║                                                               ║`);

    // Traduz para usuários reais
    // Cada "usuário ativo" gera ~2-5 req/s. Na prática, conexão do teste != usuário.
    // 1 conexão do teste ≈ 1 usuário navegando ativamente.
    const usuariosSeguro = Math.max(0, conn - 10);
    console.log(`║  Tradução para o mundo real:                                  ║`);
    console.log(`║  • ~${String(conn * 3).padEnd(4)} usuários navegando (carga baixa por usuário)   ║`);
    console.log(`║  • ~${String(conn).padEnd(4)} usuários muito ativos (1 req/s cada)          ║`);
    console.log(`║  • Equivale a ~${String(Math.round(conn / 2)).padEnd(4)} oficinas usando o sistema ao mesmo tempo ║`);
  }

  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  Infraestrutura atual:                                        ║');
  console.log('║  • Backend: Render Free Tier (512MB RAM, 0.1 CPU shared)      ║');
  console.log('║  • DB: Supabase Free (512MB, conexões limitadas)              ║');
  console.log('║  • Sem auto-scaling                                           ║');
  console.log('║                                                               ║');
  console.log('║  Para escalar: Render Starter ($7/mês) → ~3-5x mais carga    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
