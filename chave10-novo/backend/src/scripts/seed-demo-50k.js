/**
 * Seed ADITIVO para a conta de demonstração (teste@teste.com).
 *
 * Objetivo: deixar a conta demo com números "cheios" para apresentação:
 *   - Faturamento do MÊS CORRENTE = R$ 50.000,00 (OS finalizadas)
 *   - Despesas do MÊS CORRENTE    = R$ 15.000,00
 *   - Novos clientes e veículos adicionais
 *
 * Características:
 *   - NÃO apaga a conta nem dados de outras oficinas.
 *   - Idempotente: todos os registros criados aqui recebem a marca [DEMO50K]
 *     (em descricao/obs). Ao re-executar, esses registros são removidos e
 *     recriados — então rodar várias vezes não duplica nem infla os totais.
 *   - Só atua na oficina do usuário teste@teste.com.
 *
 * Uso: node src/scripts/seed-demo-50k.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Pool } = require('pg');

const DEMO_EMAIL = 'teste@teste.com';
const TAG = '[DEMO50K]';                 // marca para identificar/limpar
const META_FATURAMENTO = 50000.0;
const META_DESPESAS = 15000.0;

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

// Datas dentro do mês corrente (dia 1..hoje) — garante que caem no filtro "mês"
const now = new Date();
const ano = now.getFullYear();
const mes = now.getMonth(); // 0-based
const diaHoje = now.getDate();
const iso = (d) => d.toISOString().split('T')[0];
// dia N do mês corrente, limitado a hoje para não cair no futuro
const diaDoMes = (n) => {
  const dia = Math.min(Math.max(n, 1), diaHoje);
  return iso(new Date(ano, mes, dia));
};

// ── Novos clientes (marcados na obs) ─────────────────────────
const CLIENTES = [
  { nome: 'Ricardo Nunes Teixeira',   telefone: '(16) 99811-2210', email: 'ricardo.teixeira@gmail.com',  endereco: 'Rua dos Ipês, 210 — Jardim América, Ribeirão Preto' },
  { nome: 'Camila Andrade Ribeiro',   telefone: '(16) 98722-3391', email: 'camila.ribeiro@gmail.com',     endereco: 'Av. Nove de Julho, 455 — Centro, Ribeirão Preto' },
  { nome: 'Bruno Carvalho Almeida',   telefone: '(16) 99655-7734', email: 'bruno.almeida@outlook.com',    endereco: 'Rua Minas Gerais, 98 — Campos Elíseos, Ribeirão Preto' },
  { nome: 'Larissa Gomes Pinto',      telefone: '(16) 98533-1122', email: 'larissa.pinto@yahoo.com',      endereco: 'Rua Bahia, 640 — Vila Tibério, Ribeirão Preto' },
  { nome: 'Eduardo Farias Lopes',     telefone: '(16) 99477-8890', email: 'eduardo.lopes@gmail.com',      endereco: 'Av. Presidente Vargas, 1500 — Ribeirânia, Ribeirão Preto' },
  { nome: 'Tatiane Moreira Dias',     telefone: '(16) 98366-5567', email: 'tatiane.dias@gmail.com',       endereco: 'Rua São Paulo, 77 — Higienópolis, Ribeirão Preto' },
];

const VEICULOS = [
  { cliente: 0, placa: 'RIC-2A21', modelo: 'Corolla',  marca: 'Toyota',     ano: '2022', km: '31000' },
  { cliente: 1, placa: 'CAM-3B32', modelo: 'Renegade', marca: 'Jeep',       ano: '2021', km: '45000' },
  { cliente: 2, placa: 'BRU-4C43', modelo: 'T-Cross',  marca: 'Volkswagen', ano: '2023', km: '12000' },
  { cliente: 3, placa: 'LAR-5D54', modelo: 'Argo',     marca: 'Fiat',       ano: '2020', km: '58000' },
  { cliente: 4, placa: 'EDU-6E65', modelo: 'Creta',    marca: 'Hyundai',    ano: '2022', km: '27000' },
  { cliente: 5, placa: 'TAT-7F76', modelo: 'Tracker',  marca: 'Chevrolet',  ano: '2023', km: '15000' },
];

// Descrições de OS realistas (serão distribuídas para bater a meta de faturamento)
const OS_TEMPLATES = [
  { descricao: 'Revisão completa + troca de óleo e filtros', servicos: 'Óleo 5W30, filtros de óleo, ar e combustível', mo: 220, pecas: 380 },
  { descricao: 'Troca de embreagem (kit completo)',          servicos: 'Substituição do kit de embreagem e atuador',    mo: 650, pecas: 1250 },
  { descricao: 'Retífica parcial do motor',                  servicos: 'Retífica de cabeçote e junta',                  mo: 1400, pecas: 2100 },
  { descricao: 'Sistema de arrefecimento',                   servicos: 'Radiador, bomba d\'água e válvula termostática', mo: 480, pecas: 920 },
  { descricao: 'Suspensão dianteira e traseira',             servicos: 'Amortecedores, batentes e alinhamento',         mo: 520, pecas: 1480 },
  { descricao: 'Freios completos 4 rodas',                   servicos: 'Pastilhas, discos e fluido DOT4',                mo: 380, pecas: 760 },
  { descricao: 'Ar-condicionado — recarga e reparo',         servicos: 'Compressor, gás e higienização',                mo: 450, pecas: 1050 },
  { descricao: 'Kit de correia dentada + tensor',            servicos: 'Correia, tensor e bomba d\'água',                mo: 420, pecas: 680 },
  { descricao: 'Injeção eletrônica — diagnóstico e reparo',  servicos: 'Bicos, sensores e limpeza',                     mo: 380, pecas: 520 },
  { descricao: 'Troca de bateria e revisão elétrica',        servicos: 'Bateria 60Ah, teste do alternador',             mo: 120, pecas: 480 },
];

const DESP_TEMPLATES = [
  { descricao: 'Aluguel da oficina',              categoria: 'Aluguel',              valor: 3200.00 },
  { descricao: 'Folha de pagamento — equipe',     categoria: 'Folha de pagamento',   valor: 5200.00 },
  { descricao: 'Compra de peças — distribuidor',  categoria: 'Peças/Estoque',        valor: 2800.00 },
  { descricao: 'Energia elétrica',                categoria: 'Energia',              valor: 640.00 },
  { descricao: 'Água',                            categoria: 'Água',                 valor: 180.00 },
  { descricao: 'Internet + telefonia',            categoria: 'Internet',             valor: 260.00 },
  { descricao: 'Ferramentas e equipamentos',      categoria: 'Ferramentas',          valor: 900.00 },
  { descricao: 'Marketing e anúncios',            categoria: 'Marketing',            valor: 520.00 },
  { descricao: 'Impostos e taxas',                categoria: 'Impostos',             valor: 800.00 },
  { descricao: 'Combustível (frota/serviços)',    categoria: 'Combustível',          valor: 500.00 },
];

/**
 * Distribui um total-alvo em N parcelas seguindo pesos, ajustando a última
 * para fechar exatamente o alvo (evita erro de arredondamento).
 */
function distribuir(total, pesos) {
  const somaPesos = pesos.reduce((s, p) => s + p, 0);
  const valores = pesos.map(p => Math.round((total * p / somaPesos) * 100) / 100);
  const somaAtual = valores.reduce((s, v) => s + v, 0);
  const ajuste = Math.round((total - somaAtual) * 100) / 100;
  valores[valores.length - 1] = Math.round((valores[valores.length - 1] + ajuste) * 100) / 100;
  return valores;
}

async function seed() {
  const pool = getPool();
  const q = async (t, p) => (await pool.query(t, p)).rows;
  const q1 = async (t, p) => (await pool.query(t, p)).rows[0] || null;
  const run = async (t, p) => pool.query(t, p);

  console.log(`\n🌱 Seed aditivo ${TAG} para ${DEMO_EMAIL}...\n`);

  // 1. Localiza a oficina do usuário demo
  const usuario = await q1('SELECT id, oficina_id FROM usuarios WHERE email=$1', [DEMO_EMAIL]);
  if (!usuario || !usuario.oficina_id) {
    console.error(`❌ Conta ${DEMO_EMAIL} não encontrada. Rode antes: node src/scripts/seed-demo.js`);
    await pool.end();
    process.exit(1);
  }
  const oid = usuario.oficina_id;
  console.log(`✅ Oficina demo localizada (id: ${oid})`);

  // 2. Limpa registros anteriores desta seed (idempotência) — só os marcados
  console.log(`♻️  Limpando registros ${TAG} anteriores...`);
  await run(`DELETE FROM ordens_servico WHERE oficina_id=$1 AND descricao LIKE $2`, [oid, `%${TAG}%`]);
  await run(`DELETE FROM despesas       WHERE oficina_id=$1 AND (descricao LIKE $2 OR obs LIKE $2)`, [oid, `%${TAG}%`]);
  // veículos e clientes marcados na obs/nome
  await run(`DELETE FROM veiculos WHERE oficina_id=$1 AND placa IN (${VEICULOS.map((_, i) => `$${i + 2}`).join(',')})`, [oid, ...VEICULOS.map(v => v.placa)]);
  await run(`DELETE FROM clientes WHERE oficina_id=$1 AND obs=$2`, [oid, TAG]);

  // 3. Cria clientes (marca em obs)
  const clienteIds = [];
  for (const c of CLIENTES) {
    const r = await q1(
      `INSERT INTO clientes(oficina_id, nome, telefone, email, endereco, obs) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [oid, c.nome, c.telefone, c.email, c.endereco, TAG]
    );
    clienteIds.push(r.id);
  }
  console.log(`✅ ${clienteIds.length} novos clientes criados`);

  // 4. Cria veículos
  const veiculoIds = [];
  for (const v of VEICULOS) {
    const r = await q1(
      `INSERT INTO veiculos(oficina_id, cliente_id, placa, modelo, marca, ano, km) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [oid, clienteIds[v.cliente], v.placa, v.modelo, v.marca, v.ano, v.km]
    );
    veiculoIds.push(r.id);
  }
  console.log(`✅ ${veiculoIds.length} novos veículos criados`);

  // Datas-limite do mês corrente
  const primeiroDiaMes = iso(new Date(ano, mes, 1));
  const ultimoDiaMes = diaDoMes(diaHoje);

  // 5. Gera OS finalizadas no mês corrente para que o TOTAL do mês chegue a META.
  //    Considera o que já existe (sem a tag) e insere apenas o complemento.
  const jaFat = await q1(
    `SELECT COALESCE(SUM(valor),0) AS total FROM ordens_servico
     WHERE oficina_id=$1 AND status='finalizado' AND data>=$2 AND data<=$3 AND descricao NOT LIKE $4`,
    [oid, primeiroDiaMes, ultimoDiaMes, `%${TAG}%`]
  );
  const faltaFat = Math.max(0, Math.round((META_FATURAMENTO - (+jaFat.total)) * 100) / 100);
  if (faltaFat <= 0) {
    console.log(`ℹ️  Faturamento do mês já >= meta (R$ ${(+jaFat.total).toFixed(2)}). Nenhuma OP adicional criada.`);
  }
  const N_OS = 12;
  const pesosOS = [12, 8, 15, 7, 11, 6, 9, 5, 10, 8, 13, 6];
  const totaisOS = faltaFat > 0 ? distribuir(faltaFat, pesosOS) : pesosOS.map(() => 0);
  const diasOS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

  let somaFat = 0;
  for (let i = 0; i < N_OS; i++) {
    const tpl = OS_TEMPLATES[i % OS_TEMPLATES.length];
    const totalOS = totaisOS[i];
    if (totalOS <= 0) continue;
    // Divide o total entre MO e peças mantendo proporção ~ do template
    const propMO = tpl.mo / (tpl.mo + tpl.pecas);
    const valorMO = Math.round(totalOS * propMO * 100) / 100;
    const valorPecas = Math.round((totalOS - valorMO) * 100) / 100;
    const cli = i % clienteIds.length;
    const vei = i % veiculoIds.length;
    const numero = `D50-${String(i + 1).padStart(3, '0')}`;

    await run(
      `INSERT INTO ordens_servico(oficina_id, cliente_id, veiculo_id, descricao, servicos, valor_mo, valor_pecas, valor, status, data, numero)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,'finalizado',$9,$10)`,
      [
        oid,
        clienteIds[cli],
        veiculoIds[vei],
        `${tpl.descricao} ${TAG}`,
        tpl.servicos,
        valorMO,
        valorPecas,
        Math.round((valorMO + valorPecas) * 100) / 100,
        diaDoMes(diasOS[i]),
        numero,
      ]
    );
    somaFat += valorMO + valorPecas;
  }
  console.log(`✅ ${N_OS} OS finalizadas criadas — faturamento no mês: R$ ${somaFat.toFixed(2)}`);

  // 6. Gera despesas no mês corrente para que o TOTAL do mês chegue a META.
  const jaDesp = await q1(
    `SELECT COALESCE(SUM(valor),0) AS total FROM despesas
     WHERE oficina_id=$1 AND data>=$2 AND data<=$3 AND COALESCE(obs,'') NOT LIKE $4 AND descricao NOT LIKE $4`,
    [oid, primeiroDiaMes, ultimoDiaMes, `%${TAG}%`]
  );
  const faltaDesp = Math.max(0, Math.round((META_DESPESAS - (+jaDesp.total)) * 100) / 100);
  if (faltaDesp <= 0) {
    console.log(`ℹ️  Despesas do mês já >= meta (R$ ${(+jaDesp.total).toFixed(2)}). Nenhuma despesa adicional criada.`);
  }
  const pesosDesp = DESP_TEMPLATES.map(d => d.valor);
  const totaisDesp = faltaDesp > 0 ? distribuir(faltaDesp, pesosDesp) : pesosDesp.map(() => 0);
  const diasDesp = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

  let somaDesp = 0;
  for (let i = 0; i < DESP_TEMPLATES.length; i++) {
    const tpl = DESP_TEMPLATES[i];
    const valor = totaisDesp[i];
    if (valor <= 0) continue;
    const dataDesp = diaDoMes(diasDesp[i % diasDesp.length]);
    // Metade paga, metade pendente para dar variedade nos gráficos
    const pago = i % 2 === 0 ? 1 : 0;
    await run(
      `INSERT INTO despesas(oficina_id, descricao, categoria, valor, data, vencimento, pago, obs)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [oid, `${tpl.descricao} ${TAG}`, tpl.categoria, valor, dataDesp, dataDesp, pago, TAG]
    );
    somaDesp += valor;
  }
  console.log(`✅ ${DESP_TEMPLATES.length} despesas criadas — despesas no mês: R$ ${somaDesp.toFixed(2)}`);

  // 7. Conferência dos totais do mês corrente (o que o dashboard vê)
  const fatRow = await q1(
    `SELECT COALESCE(SUM(valor),0) AS total FROM ordens_servico
     WHERE oficina_id=$1 AND status='finalizado' AND data>=$2 AND data<=$3`,
    [oid, primeiroDiaMes, ultimoDiaMes]
  );
  const despRow = await q1(
    `SELECT COALESCE(SUM(valor),0) AS total FROM despesas
     WHERE oficina_id=$1 AND data>=$2 AND data<=$3`,
    [oid, primeiroDiaMes, ultimoDiaMes]
  );

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Mês corrente: ${primeiroDiaMes} → ${ultimoDiaMes}`);
  console.log(`  Faturamento total do mês (todas as OS finalizadas): R$ ${(+fatRow.total).toFixed(2)}`);
  console.log(`  Despesas totais do mês:                             R$ ${(+despRow.total).toFixed(2)}`);
  console.log('  (Inclui dados pré-existentes + os desta seed.)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎉 Seed aditivo concluído.');

  await pool.end();
}

module.exports = seed;

if (require.main === module) {
  seed().catch(err => {
    console.error('❌ Erro no seed:', err.message);
    process.exit(1);
  });
}
