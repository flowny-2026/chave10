/**
 * load-test.js — Teste de carga do Chave 10
 *
 * Uso:
 *   node src/scripts/load-test.js
 *   node src/scripts/load-test.js --url https://chave10-api.onrender.com --connections 50 --duration 30
 *
 * Testa os endpoints mais usados em produção com um token JWT real.
 */

const autocannon = require('autocannon');

// ── Config via args ───────────────────────────────────────────
const args = process.argv.slice(2);
const get  = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i+1] : def; };

const BASE        = get('--url',         'https://chave10-api.onrender.com/api');
const CONNECTIONS = parseInt(get('--connections', '20'));
const DURATION    = parseInt(get('--duration',    '20'));   // segundos
const TOKEN       = get('--token', '');

if (!TOKEN) {
  console.error('\n❌ Token JWT obrigatório. Use:');
  console.error('   node src/scripts/load-test.js --token SEU_JWT_AQUI\n');
  console.error('Como obter: faça login no sistema, abra DevTools → Application → LocalStorage → c10_token\n');
  process.exit(1);
}

const AUTH = { Authorization: `Bearer ${TOKEN}` };

// ── Cenários de teste ─────────────────────────────────────────
const CENARIOS = [
  {
    nome: '1. Health check (sem auth)',
    url:  BASE.replace('/api', '') + '/health',
    headers: {},
  },
  {
    nome: '2. Dashboard principal',
    url:  BASE + '/app/dashboard',
    headers: AUTH,
  },
  {
    nome: '3. Lista de OS',
    url:  BASE + '/app/os',
    headers: AUTH,
  },
  {
    nome: '4. Lista de clientes',
    url:  BASE + '/app/clientes',
    headers: AUTH,
  },
  {
    nome: '5. Financeiro — despesas (30 dias)',
    url:  BASE + '/app/despesas?inicio=' + daysAgo(30) + '&fim=' + today(),
    headers: AUTH,
  },
  {
    nome: '6. Dashboard V2 — resumo',
    url:  BASE + '/app/dashboard-resumo',
    headers: AUTH,
  },
  {
    nome: '7. Parcelas a receber',
    url:  BASE + '/app/parcelas-receber',
    headers: AUTH,
  },
  {
    nome: '8. Estoque',
    url:  BASE + '/app/estoque',
    headers: AUTH,
  },
];

function today() {
  return new Date().toISOString().split('T')[0];
}
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ── Formata resultado ─────────────────────────────────────────
function fmt(result) {
  const rps    = result.requests.average.toFixed(1);
  const lat    = result.latency.average.toFixed(1);
  const latP99 = result.latency.p99.toFixed(1);
  const errors = result.errors;
  const non2xx = result.non2xx;
  const total  = result.requests.total;

  const statusOk  = errors === 0 && non2xx === 0;
  const latOk     = parseFloat(lat) < 2000;
  const icon      = statusOk && latOk ? '✅' : (statusOk ? '⚠️ ' : '❌');

  return {
    rps, lat, latP99, errors, non2xx, total, icon,
  };
}

// ── Roda um cenário ───────────────────────────────────────────
function runCenario(cenario) {
  return new Promise((resolve) => {
    const instance = autocannon({
      url:         cenario.url,
      connections: CONNECTIONS,
      duration:    DURATION,
      headers:     cenario.headers,
      method:      'GET',
      timeout:     10,
    }, (err, result) => {
      resolve({ cenario, result, err });
    });
    autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false });
  });
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           CHAVE 10 — TESTE DE CARGA                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  🎯 Target:      ${BASE}`);
  console.log(`  🔗 Conexões:    ${CONNECTIONS} simultâneas`);
  console.log(`  ⏱️  Duração:     ${DURATION}s por cenário`);
  console.log(`  📋 Cenários:    ${CENARIOS.length}`);
  console.log(`  ⏳ Total est.:  ~${Math.ceil(CENARIOS.length * DURATION / 60)} min\n`);

  const resultados = [];

  for (const cenario of CENARIOS) {
    process.stdout.write(`  ⏳ ${cenario.nome.padEnd(45)} `);
    const { result, err } = await runCenario(cenario);

    if (err) {
      console.log('❌ ERRO: ' + err.message);
      resultados.push({ cenario, erro: err.message });
      continue;
    }

    const r = fmt(result);
    console.log(`${r.icon}  ${r.rps} req/s  p50:${r.lat}ms  p99:${r.latP99}ms  erros:${r.errors}`);
    resultados.push({ cenario, r });
  }

  // ── Resumo final ──────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                     RESUMO                              ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Cenário                              req/s   p50    p99 ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  let totalOk = 0, totalFail = 0;
  for (const { cenario, r, erro } of resultados) {
    if (erro) {
      console.log(`║  ${cenario.nome.slice(3).padEnd(35)} ERRO                    ║`);
      totalFail++;
    } else {
      const nome = cenario.nome.slice(3, 38).padEnd(35);
      const rps  = r.rps.padStart(5);
      const lat  = (r.lat + 'ms').padStart(6);
      const p99  = (r.latP99 + 'ms').padStart(6);
      console.log(`║  ${r.icon} ${nome} ${rps}  ${lat}  ${p99} ║`);
      if (r.icon === '✅') totalOk++; else totalFail++;
    }
  }

  console.log('╚══════════════════════════════════════════════════════════╝');

  const nota = totalFail === 0 ? '🟢 PASSOU' : totalFail <= 2 ? '🟡 PARCIAL' : '🔴 ATENÇÃO';
  console.log(`\n  Resultado: ${nota}  (${totalOk}/${resultados.length} cenários ok)\n`);

  // Interpretação
  console.log('  📌 Referência de latência:');
  console.log('     < 200ms  → Excelente');
  console.log('     < 800ms  → Bom (aceitável para API com DB)');
  console.log('     < 2000ms → Razoável (Render free tier acorda lento)');
  console.log('     > 2000ms → Precisa investigar\n');

  console.log('  📌 Render Free Tier:');
  console.log('     A primeira requisição acorda o servidor (~5-10s).');
  console.log('     Após o warm-up, os números são representativos.\n');
}

main().catch(console.error);
