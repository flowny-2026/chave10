/**
 * Script de seed para conta de demonstração
 * Cria uma oficina demo com dados realistas: clientes, veículos, OS, orçamentos, estoque, despesas, agenda
 *
 * Uso: node src/scripts/seed-demo.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const DEMO_EMAIL = 'demo@chave10.com.br';
const DEMO_SENHA = 'demo1234';

async function q(text, params) { const r = await pool.query(text, params); return r.rows; }
async function q1(text, params) { const r = await pool.query(text, params); return r.rows[0] || null; }
async function run(text, params) { return pool.query(text, params); }

// ── Dados de demonstração ────────────────────────────────────

const CLIENTES = [
  { nome: 'Carlos Eduardo Mendes',    telefone: '(16) 99201-3344', email: 'carlos.mendes@gmail.com',   endereco: 'Rua das Acácias, 142 — Jardim Paulista, Ribeirão Preto' },
  { nome: 'Fernanda Lima Souza',      telefone: '(16) 98834-7712', email: 'fernanda.lima@hotmail.com', endereco: 'Av. Brasil, 890 — Centro, Ribeirão Preto' },
  { nome: 'Roberto Alves Costa',      telefone: '(16) 99567-2201', email: 'roberto.costa@gmail.com',   endereco: 'Rua Sete de Setembro, 55 — Vila Nova, Ribeirão Preto' },
  { nome: 'Juliana Pereira Martins',  telefone: '(16) 98712-0093', email: 'juliana.martins@yahoo.com', endereco: 'Rua das Palmeiras, 310 — Jardim Sumaré, Ribeirão Preto' },
  { nome: 'Marcos Antônio Ferreira',  telefone: '(16) 99345-8821', email: 'marcos.ferreira@gmail.com', endereco: 'Rua Boa Vista, 77 — Campos Elíseos, Ribeirão Preto' },
  { nome: 'Patrícia Oliveira Santos', telefone: '(16) 98901-4456', email: 'patricia.santos@gmail.com', endereco: 'Av. Independência, 1200 — Alto da Boa Vista, Ribeirão Preto' },
  { nome: 'Diego Henrique Rocha',     telefone: '(16) 99123-6678', email: 'diego.rocha@outlook.com',   endereco: 'Rua Floriano Peixoto, 33 — Centro, Ribeirão Preto' },
  { nome: 'Aline Cristina Barbosa',   telefone: '(16) 98456-9900', email: 'aline.barbosa@gmail.com',   endereco: 'Rua das Orquídeas, 88 — Jardim Botânico, Ribeirão Preto' },
];

const VEICULOS = [
  { cliente: 0, placa: 'ABC-1234', modelo: 'Onix',    marca: 'Chevrolet', ano: '2021', km: '42000' },
  { cliente: 0, placa: 'DEF-5678', modelo: 'Gol',     marca: 'Volkswagen', ano: '2019', km: '78000' },
  { cliente: 1, placa: 'GHI-9012', modelo: 'HB20',    marca: 'Hyundai',   ano: '2022', km: '18000' },
  { cliente: 2, placa: 'JKL-3456', modelo: 'Strada',  marca: 'Fiat',      ano: '2020', km: '55000' },
  { cliente: 3, placa: 'MNO-7890', modelo: 'Kwid',    marca: 'Renault',   ano: '2023', km: '9000'  },
  { cliente: 4, placa: 'PQR-1122', modelo: 'Hilux',   marca: 'Toyota',    ano: '2018', km: '120000'},
  { cliente: 5, placa: 'STU-3344', modelo: 'Compass', marca: 'Jeep',      ano: '2021', km: '38000' },
  { cliente: 6, placa: 'VWX-5566', modelo: 'Civic',   marca: 'Honda',     ano: '2020', km: '61000' },
  { cliente: 7, placa: 'YZA-7788', modelo: 'Sandero', marca: 'Renault',   ano: '2019', km: '47000' },
];

const hoje = new Date();
const d = (offsetDias) => {
  const dt = new Date(hoje);
  dt.setDate(dt.getDate() + offsetDias);
  return dt.toISOString().split('T')[0];
};

const ESTOQUE = [
  { nome: 'Filtro de óleo Bosch',        categoria: 'peca',     marca: 'Bosch',     quantidade: 15, estoque_min: 5,  preco: 28.90,  codigo_barras: '7891234560001' },
  { nome: 'Filtro de ar Mann',            categoria: 'peca',     marca: 'Mann',      quantidade: 10, estoque_min: 3,  preco: 35.50,  codigo_barras: '7891234560002' },
  { nome: 'Pastilha de freio Fras-le',    categoria: 'peca',     marca: 'Fras-le',   quantidade: 8,  estoque_min: 4,  preco: 89.90,  codigo_barras: '7891234560003' },
  { nome: 'Óleo motor 5W30 Mobil 1L',    categoria: 'fluido',   marca: 'Mobil',     quantidade: 24, estoque_min: 10, preco: 32.00,  codigo_barras: '7891234560004' },
  { nome: 'Vela de ignição NGK',          categoria: 'peca',     marca: 'NGK',       quantidade: 20, estoque_min: 8,  preco: 18.50,  codigo_barras: '7891234560005' },
  { nome: 'Correia dentada Gates',        categoria: 'peca',     marca: 'Gates',     quantidade: 6,  estoque_min: 2,  preco: 145.00, codigo_barras: '7891234560006' },
  { nome: 'Fluido de freio DOT4 500ml',   categoria: 'fluido',   marca: 'Bosch',     quantidade: 12, estoque_min: 4,  preco: 22.00,  codigo_barras: '7891234560007' },
  { nome: 'Amortecedor dianteiro Monroe', categoria: 'peca',     marca: 'Monroe',    quantidade: 4,  estoque_min: 2,  preco: 320.00, codigo_barras: '7891234560008' },
  { nome: 'Palheta limpador Bosch 18"',   categoria: 'acessorio',marca: 'Bosch',     quantidade: 10, estoque_min: 4,  preco: 42.00,  codigo_barras: '7891234560009' },
  { nome: 'Bateria 60Ah Moura',           categoria: 'peca',     marca: 'Moura',     quantidade: 3,  estoque_min: 1,  preco: 480.00, codigo_barras: '7891234560010' },
];

const DESPESAS = [
  { descricao: 'Aluguel da oficina',        categoria: 'Aluguel',             valor: 2800.00, data: d(-30), vencimento: d(1),   pago: 0 },
  { descricao: 'Conta de energia elétrica', categoria: 'Energia',             valor: 420.50,  data: d(-15), vencimento: d(0),   pago: 0 },
  { descricao: 'Internet fibra 500MB',      categoria: 'Internet',            valor: 129.90,  data: d(-10), vencimento: d(2),   pago: 0 },
  { descricao: 'Folha de pagamento — João', categoria: 'Folha de pagamento',  valor: 1800.00, data: d(-5),  vencimento: d(5),   pago: 0 },
  { descricao: 'Compra de peças — Bosch',   categoria: 'Peças/Estoque',       valor: 1250.00, data: d(-20), vencimento: d(-20), pago: 1 },
  { descricao: 'Conta de água',             categoria: 'Água',                valor: 85.00,   data: d(-25), vencimento: d(-25), pago: 1 },
  { descricao: 'Boleto financiamento lift', categoria: 'Boleto/Financiamento',valor: 650.00,  data: d(-30), vencimento: d(-30), pago: 1 },
];

async function seed() {
  console.log('🌱 Iniciando seed da conta demo...\n');

  // ── 1. Remove conta demo anterior se existir ──────────────
  const usuarioExistente = await q1('SELECT id, oficina_id FROM usuarios WHERE email=$1', [DEMO_EMAIL]);
  if (usuarioExistente) {
    console.log('♻️  Removendo conta demo anterior...');
    if (usuarioExistente.oficina_id) {
      await run('DELETE FROM oficinas WHERE id=$1', [usuarioExistente.oficina_id]);
    }
    await run('DELETE FROM usuarios WHERE email=$1', [DEMO_EMAIL]);
  }

  // ── 2. Cria oficina demo ──────────────────────────────────
  const vencimento = d(365); // 1 ano de validade
  const oficina = await q1(
    `INSERT INTO oficinas(nome, responsavel, telefone, email, plano, status_assinatura, data_vencimento, endereco, logo)
     VALUES($1,$2,$3,$4,'mensal','active',$5,$6,$7) RETURNING id`,
    [
      'Oficina Mecânica Demo',
      'João da Silva',
      '(16) 99291-5540',
      DEMO_EMAIL,
      vencimento,
      'Av. das Indústrias, 500 — Distrito Industrial, Ribeirão Preto — SP',
      null,
    ]
  );
  const oid = oficina.id;
  console.log(`✅ Oficina criada (id: ${oid})`);

  // ── 3. Cria usuário demo ──────────────────────────────────
  const hash = bcrypt.hashSync(DEMO_SENHA, 10);
  const usuario = await q1(
    `INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo)
     VALUES($1,'João da Silva',$2,$3,'admin_oficina',1) RETURNING id`,
    [oid, DEMO_EMAIL, hash]
  );
  console.log(`✅ Usuário demo criado: ${DEMO_EMAIL} / ${DEMO_SENHA}`);

  // ── 4. Clientes ───────────────────────────────────────────
  const clienteIds = [];
  for (const c of CLIENTES) {
    const r = await q1(
      `INSERT INTO clientes(oficina_id, nome, telefone, email, endereco) VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [oid, c.nome, c.telefone, c.email, c.endereco]
    );
    clienteIds.push(r.id);
  }
  console.log(`✅ ${clienteIds.length} clientes criados`);

  // ── 5. Veículos ───────────────────────────────────────────
  const veiculoIds = [];
  for (const v of VEICULOS) {
    const r = await q1(
      `INSERT INTO veiculos(oficina_id, cliente_id, placa, modelo, marca, ano, km) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [oid, clienteIds[v.cliente], v.placa, v.modelo, v.marca, v.ano, v.km]
    );
    veiculoIds.push(r.id);
  }
  console.log(`✅ ${veiculoIds.length} veículos criados`);

  // ── 6. Ordens de Serviço ──────────────────────────────────
  const OS_DATA = [
    {
      cliente: 0, veiculo: 0, status: 'finalizado', data: d(-25),
      descricao: 'Troca de óleo e filtros — revisão completa',
      servicos: 'Troca de óleo 5W30, filtro de óleo, filtro de ar e filtro de combustível',
      pecas_itens: [
        { nome: 'Óleo motor 5W30 Mobil 1L', qtd: 4, valor_unit: 32.00 },
        { nome: 'Filtro de óleo Bosch',      qtd: 1, valor_unit: 28.90 },
        { nome: 'Filtro de ar Mann',          qtd: 1, valor_unit: 35.50 },
      ],
      valor_mo: 120.00,
    },
    {
      cliente: 1, veiculo: 2, status: 'finalizado', data: d(-18),
      descricao: 'Barulho ao frear — verificação do sistema de freios',
      servicos: 'Substituição das pastilhas de freio dianteiras e traseiras, sangria do fluido de freio',
      pecas_itens: [
        { nome: 'Pastilha de freio Fras-le', qtd: 2, valor_unit: 89.90 },
        { nome: 'Fluido de freio DOT4 500ml', qtd: 1, valor_unit: 22.00 },
      ],
      valor_mo: 180.00,
    },
    {
      cliente: 2, veiculo: 3, status: 'finalizado', data: d(-12),
      descricao: 'Revisão dos 50.000 km',
      servicos: 'Troca de óleo, filtros, velas de ignição e correia dentada',
      pecas_itens: [
        { nome: 'Óleo motor 5W30 Mobil 1L', qtd: 5, valor_unit: 32.00 },
        { nome: 'Filtro de óleo Bosch',      qtd: 1, valor_unit: 28.90 },
        { nome: 'Vela de ignição NGK',        qtd: 4, valor_unit: 18.50 },
        { nome: 'Correia dentada Gates',      qtd: 1, valor_unit: 145.00 },
      ],
      valor_mo: 350.00,
    },
    {
      cliente: 3, veiculo: 4, status: 'finalizado', data: d(-8),
      descricao: 'Limpeza de bicos injetores e diagnóstico eletrônico',
      servicos: 'Limpeza ultrassônica dos bicos injetores, leitura e reset de falhas',
      pecas_itens: [],
      valor_mo: 280.00,
    },
    {
      cliente: 4, veiculo: 5, status: 'em_andamento', data: d(-3),
      descricao: 'Suspensão com barulho — amortecedores dianteiros',
      servicos: 'Substituição dos amortecedores dianteiros e alinhamento',
      pecas_itens: [
        { nome: 'Amortecedor dianteiro Monroe', qtd: 2, valor_unit: 320.00 },
      ],
      valor_mo: 220.00,
    },
    {
      cliente: 5, veiculo: 6, status: 'em_andamento', data: d(-1),
      descricao: 'Troca de palhetas e revisão geral',
      servicos: 'Troca de palhetas do limpador, verificação de fluidos e pneus',
      pecas_itens: [
        { nome: 'Palheta limpador Bosch 18"', qtd: 2, valor_unit: 42.00 },
      ],
      valor_mo: 80.00,
    },
    {
      cliente: 6, veiculo: 7, status: 'em_andamento', data: d(0),
      descricao: 'Bateria fraca — não está dando partida',
      servicos: 'Teste e substituição da bateria',
      pecas_itens: [
        { nome: 'Bateria 60Ah Moura', qtd: 1, valor_unit: 480.00 },
      ],
      valor_mo: 60.00,
    },
  ];

  for (let i = 0; i < OS_DATA.length; i++) {
    const os = OS_DATA[i];
    const pecasValidas = os.pecas_itens.filter(p => p.nome);
    const valorPecas = pecasValidas.reduce((s, p) => s + p.valor_unit * p.qtd, 0);
    const valor = os.valor_mo + valorPecas;
    const numero = String(i + 1).padStart(4, '0');
    const pecasTexto = pecasValidas.map(p => `${p.qtd}x ${p.nome} (R$ ${p.valor_unit.toFixed(2)})`).join('\n');

    await q1(
      `INSERT INTO ordens_servico(oficina_id, cliente_id, veiculo_id, descricao, servicos, pecas, pecas_itens, valor_mo, valor_pecas, valor, status, data, numero)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        oid,
        clienteIds[os.cliente],
        veiculoIds[os.veiculo],
        os.descricao,
        os.servicos,
        pecasTexto || null,
        pecasValidas.length ? JSON.stringify(pecasValidas) : null,
        os.valor_mo,
        valorPecas,
        valor,
        os.status,
        os.data,
        numero,
      ]
    );
  }
  console.log(`✅ ${OS_DATA.length} ordens de serviço criadas`);

  // ── 7. Orçamentos ─────────────────────────────────────────
  const ORC_DATA = [
    {
      cliente: 7, veiculo: 8, status: 'pendente',
      descricao: 'Revisão completa 40.000 km',
      servicos: 'Troca de óleo, filtros, velas, correia dentada e alinhamento',
      pecas_itens: [
        { nome: 'Óleo motor 5W30 Mobil 1L', qtd: 4, valor_unit: 32.00 },
        { nome: 'Filtro de óleo Bosch',      qtd: 1, valor_unit: 28.90 },
        { nome: 'Filtro de ar Mann',          qtd: 1, valor_unit: 35.50 },
        { nome: 'Vela de ignição NGK',        qtd: 4, valor_unit: 18.50 },
        { nome: 'Correia dentada Gates',      qtd: 1, valor_unit: 145.00 },
      ],
      valor_mo: 320.00,
      desconto: 50.00,
      validade: d(15),
    },
    {
      cliente: 0, veiculo: 1, status: 'aprovado',
      descricao: 'Troca de amortecedores traseiros',
      servicos: 'Substituição dos amortecedores traseiros e balanceamento',
      pecas_itens: [
        { nome: 'Amortecedor dianteiro Monroe', qtd: 2, valor_unit: 320.00 },
      ],
      valor_mo: 200.00,
      desconto: 0,
      validade: d(7),
    },
    {
      cliente: 3, veiculo: 4, status: 'pendente',
      descricao: 'Instalação de som automotivo',
      servicos: 'Instalação de central multimídia e alto-falantes',
      pecas_itens: [],
      valor_mo: 450.00,
      desconto: 0,
      validade: d(10),
    },
  ];

  for (let i = 0; i < ORC_DATA.length; i++) {
    const orc = ORC_DATA[i];
    const pecasValidas = orc.pecas_itens.filter(p => p.nome);
    const valorPecas = pecasValidas.reduce((s, p) => s + p.valor_unit * p.qtd, 0);
    const numero = `ORC-${String(i + 1).padStart(4, '0')}`;
    const pecasTexto = pecasValidas.map(p => `${p.qtd}x ${p.nome} (R$ ${p.valor_unit.toFixed(2)})`).join('\n');

    await q1(
      `INSERT INTO orcamentos(oficina_id, cliente_id, veiculo_id, numero, descricao, servicos, pecas, pecas_itens, valor_mo, valor_pecas, desconto, status, validade)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        oid,
        clienteIds[orc.cliente],
        veiculoIds[orc.veiculo],
        numero,
        orc.descricao,
        orc.servicos,
        pecasTexto || null,
        pecasValidas.length ? JSON.stringify(pecasValidas) : null,
        orc.valor_mo,
        valorPecas,
        orc.desconto,
        orc.status,
        orc.validade,
      ]
    );
  }
  console.log(`✅ ${ORC_DATA.length} orçamentos criados`);

  // ── 8. Estoque ────────────────────────────────────────────
  for (const item of ESTOQUE) {
    await run(
      `INSERT INTO estoque(oficina_id, nome, categoria, marca, quantidade, estoque_min, preco, codigo_barras)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [oid, item.nome, item.categoria, item.marca, item.quantidade, item.estoque_min, item.preco, item.codigo_barras]
    );
  }
  console.log(`✅ ${ESTOQUE.length} itens de estoque criados`);

  // ── 9. Despesas ───────────────────────────────────────────
  for (const desp of DESPESAS) {
    await run(
      `INSERT INTO despesas(oficina_id, descricao, categoria, valor, data, vencimento, pago)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [oid, desp.descricao, desp.categoria, desp.valor, desp.data, desp.vencimento, desp.pago]
    );
  }
  console.log(`✅ ${DESPESAS.length} despesas criadas`);

  // ── 10. Agenda ────────────────────────────────────────────
  const AGENDA = [
    { cliente: 0, veiculo: 0, titulo: 'Revisão agendada — Onix',    data: d(1),  hora: '09:00', descricao: 'Revisão dos 45.000 km' },
    { cliente: 1, veiculo: 2, titulo: 'Troca de pneus — HB20',      data: d(2),  hora: '10:30', descricao: 'Troca dos 4 pneus e balanceamento' },
    { cliente: 4, veiculo: 5, titulo: 'Retirada do veículo — Hilux', data: d(1),  hora: '14:00', descricao: 'Retirada após troca de amortecedores' },
    { cliente: 2, veiculo: 3, titulo: 'Alinhamento — Strada',        data: d(3),  hora: '08:00', descricao: 'Alinhamento e balanceamento' },
    { cliente: 6, veiculo: 7, titulo: 'Diagnóstico — Civic',         data: d(4),  hora: '11:00', descricao: 'Luz de injeção acesa' },
    { cliente: 7, veiculo: 8, titulo: 'Revisão — Sandero',           data: d(5),  hora: '09:30', descricao: 'Revisão geral conforme orçamento aprovado' },
  ];

  for (const ag of AGENDA) {
    await run(
      `INSERT INTO agenda(oficina_id, cliente_id, veiculo_id, titulo, data, hora, descricao)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [oid, clienteIds[ag.cliente], veiculoIds[ag.veiculo], ag.titulo, ag.data, ag.hora, ag.descricao]
    );
  }
  console.log(`✅ ${AGENDA.length} agendamentos criados`);

  // ── 11. Lembretes ─────────────────────────────────────────
  const LEMBRETES = [
    { veiculo: 5, tipo: 'revisao',  descricao: 'Revisão dos 120.000 km — Hilux vencida',    data_previsao: d(-5),  km_previsao: '120000' },
    { veiculo: 0, tipo: 'troca_oleo', descricao: 'Troca de óleo — Onix',                    data_previsao: d(30),  km_previsao: '45000'  },
    { veiculo: 2, tipo: 'revisao',  descricao: 'Revisão dos 20.000 km — HB20',              data_previsao: d(45),  km_previsao: '20000'  },
    { veiculo: 6, tipo: 'outro',    descricao: 'Verificar vazamento de óleo — Compass',     data_previsao: d(7),   km_previsao: null     },
  ];

  for (const lem of LEMBRETES) {
    await run(
      `INSERT INTO lembretes(oficina_id, veiculo_id, tipo, descricao, data_previsao, km_previsao)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [oid, veiculoIds[lem.veiculo], lem.tipo, lem.descricao, lem.data_previsao, lem.km_previsao]
    );
  }
  console.log(`✅ ${LEMBRETES.length} lembretes criados`);

  // ── Resumo ────────────────────────────────────────────────
  console.log('\n🎉 Conta demo criada com sucesso!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  📧 Email:  ${DEMO_EMAIL}`);
  console.log(`  🔑 Senha:  ${DEMO_SENHA}`);
  console.log(`  🏢 Oficina: Oficina Mecânica Demo`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await pool.end();
}

seed().catch(err => {
  console.error('❌ Erro no seed:', err.message);
  pool.end();
  process.exit(1);
});
