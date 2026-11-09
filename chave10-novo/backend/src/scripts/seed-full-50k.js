/**
 * seed-full-50k.js
 * Seed completo com faturamento ~R$50.000
 * Dados pessoais fictícios — telefones/emails substituídos por 000/abc
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

const DEMO_EMAIL = 'teste@teste.com';

const d = (offset) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
};

// ── CLIENTES — nomes fictícios, dados pessoais substituídos ──
const CLIENTES = [
  { nome: 'André Souza',       telefone: '(00) 00000-0001', email: 'cliente001@abc.com', endereco: 'Rua 000, 001 — Bairro ABC' },
  { nome: 'Beatriz Lima',      telefone: '(00) 00000-0002', email: 'cliente002@abc.com', endereco: 'Rua 000, 002 — Bairro ABC' },
  { nome: 'Carlos Mendes',     telefone: '(00) 00000-0003', email: 'cliente003@abc.com', endereco: 'Rua 000, 003 — Bairro ABC' },
  { nome: 'Daniela Castro',    telefone: '(00) 00000-0004', email: 'cliente004@abc.com', endereco: 'Rua 000, 004 — Bairro ABC' },
  { nome: 'Eduardo Rocha',     telefone: '(00) 00000-0005', email: 'cliente005@abc.com', endereco: 'Rua 000, 005 — Bairro ABC' },
  { nome: 'Fernanda Alves',    telefone: '(00) 00000-0006', email: 'cliente006@abc.com', endereco: 'Rua 000, 006 — Bairro ABC' },
  { nome: 'Gabriel Torres',    telefone: '(00) 00000-0007', email: 'cliente007@abc.com', endereco: 'Rua 000, 007 — Bairro ABC' },
  { nome: 'Helena Martins',    telefone: '(00) 00000-0008', email: 'cliente008@abc.com', endereco: 'Rua 000, 008 — Bairro ABC' },
  { nome: 'Igor Pereira',      telefone: '(00) 00000-0009', email: 'cliente009@abc.com', endereco: 'Rua 000, 009 — Bairro ABC' },
  { nome: 'Juliana Ferreira',  telefone: '(00) 00000-0010', email: 'cliente010@abc.com', endereco: 'Rua 000, 010 — Bairro ABC' },
  { nome: 'Kleber Nunes',      telefone: '(00) 00000-0011', email: 'cliente011@abc.com', endereco: 'Rua 000, 011 — Bairro ABC' },
  { nome: 'Larissa Ribeiro',   telefone: '(00) 00000-0012', email: 'cliente012@abc.com', endereco: 'Rua 000, 012 — Bairro ABC' },
  { nome: 'Marcelo Oliveira',  telefone: '(00) 00000-0013', email: 'cliente013@abc.com', endereco: 'Rua 000, 013 — Bairro ABC' },
  { nome: 'Natália Gomes',     telefone: '(00) 00000-0014', email: 'cliente014@abc.com', endereco: 'Rua 000, 014 — Bairro ABC' },
  { nome: 'Otávio Cardoso',    telefone: '(00) 00000-0015', email: 'cliente015@abc.com', endereco: 'Rua 000, 015 — Bairro ABC' },
];

// ── VEÍCULOS — placas fictícias ──────────────────────────────
const VEICULOS = [
  { c: 0,  placa: 'ABC0001', modelo: 'Onix',       marca: 'Chevrolet',  ano: '2021', km: '42000' },
  { c: 0,  placa: 'ABC0002', modelo: 'Gol',        marca: 'Volkswagen', ano: '2019', km: '78000' },
  { c: 1,  placa: 'ABC0003', modelo: 'HB20',       marca: 'Hyundai',    ano: '2022', km: '18000' },
  { c: 2,  placa: 'ABC0004', modelo: 'Strada',     marca: 'Fiat',       ano: '2020', km: '55000' },
  { c: 3,  placa: 'ABC0005', modelo: 'Kwid',       marca: 'Renault',    ano: '2023', km: '9000'  },
  { c: 4,  placa: 'ABC0006', modelo: 'Hilux',      marca: 'Toyota',     ano: '2018', km: '120000'},
  { c: 5,  placa: 'ABC0007', modelo: 'Compass',    marca: 'Jeep',       ano: '2021', km: '38000' },
  { c: 6,  placa: 'ABC0008', modelo: 'Civic',      marca: 'Honda',      ano: '2020', km: '61000' },
  { c: 7,  placa: 'ABC0009', modelo: 'Sandero',    marca: 'Renault',    ano: '2019', km: '47000' },
  { c: 8,  placa: 'ABC0010', modelo: 'Tracker',    marca: 'Chevrolet',  ano: '2022', km: '22000' },
  { c: 9,  placa: 'ABC0011', modelo: 'Creta',      marca: 'Hyundai',    ano: '2021', km: '31000' },
  { c: 10, placa: 'ABC0012', modelo: 'Amarok',     marca: 'Volkswagen', ano: '2020', km: '88000' },
  { c: 11, placa: 'ABC0013', modelo: 'Duster',     marca: 'Renault',    ano: '2019', km: '65000' },
  { c: 12, placa: 'ABC0014', modelo: 'Argo',       marca: 'Fiat',       ano: '2023', km: '12000' },
  { c: 13, placa: 'ABC0015', modelo: 'T-Cross',    marca: 'Volkswagen', ano: '2022', km: '25000' },
  { c: 14, placa: 'ABC0016', modelo: 'Yaris',      marca: 'Toyota',     ano: '2021', km: '44000' },
  { c: 2,  placa: 'ABC0017', modelo: 'Renegade',   marca: 'Jeep',       ano: '2020', km: '58000' },
  { c: 4,  placa: 'ABC0018', modelo: 'S10',        marca: 'Chevrolet',  ano: '2019', km: '102000'},
];

// ── OS FINALIZADAS — somam ~R$47.000 ────────────────────────
const OS_FINALIZADAS = [
  // Semana 4 atrás
  { c:0,  v:0,  data:d(-28), desc:'Troca de óleo e filtros',           serv:'Troca óleo 5W30 + filtro óleo + filtro ar', mo:120, pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Filtro ar',qtd:1,vu:35.50}] },
  { c:1,  v:2,  data:d(-27), desc:'Pastilhas de freio dianteiras',      serv:'Troca pastilhas + sangria fluido',           mo:180, pecas:[{nome:'Pastilha freio',qtd:2,vu:89.90},{nome:'Fluido DOT4',qtd:1,vu:22}] },
  { c:2,  v:3,  data:d(-26), desc:'Revisão 50.000 km',                  serv:'Óleo + filtros + velas + correia',           mo:350, pecas:[{nome:'Óleo 5W30 1L',qtd:5,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Vela NGK',qtd:4,vu:18.50},{nome:'Correia dentada',qtd:1,vu:145}] },
  { c:3,  v:4,  data:d(-25), desc:'Limpeza de bicos injetores',         serv:'Limpeza ultrassônica + diagnóstico',          mo:280, pecas:[] },
  { c:4,  v:5,  data:d(-24), desc:'Amortecedores dianteiros',           serv:'Troca amortecedores + alinhamento',           mo:320, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320}] },
  { c:5,  v:6,  data:d(-23), desc:'Troca de bateria',                   serv:'Substituição bateria + teste elétrico',       mo:80,  pecas:[{nome:'Bateria 60Ah Moura',qtd:1,vu:480}] },
  { c:6,  v:7,  data:d(-22), desc:'Revisão geral + alinhamento',        serv:'Fluidos + pneus + alinhamento + balanceamento',mo:200,pecas:[{nome:'Fluido DOT4',qtd:1,vu:22},{nome:'Óleo 5W30 1L',qtd:4,vu:32}] },
  { c:7,  v:8,  data:d(-21), desc:'Correia dentada + tensor',           serv:'Troca correia dentada + tensor + bomba água',  mo:480, pecas:[{nome:'Correia dentada',qtd:1,vu:145},{nome:'Filtro ar',qtd:1,vu:35.50}] },
  // Semana 3 atrás
  { c:8,  v:9,  data:d(-19), desc:'Troca de óleo — Tracker',            serv:'Troca óleo + filtro',                         mo:120, pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90}] },
  { c:9,  v:10, data:d(-18), desc:'Sistema de arrefecimento',           serv:'Troca fluido arrefecimento + thermostat',     mo:260, pecas:[{nome:'Fluido DOT4',qtd:2,vu:22}] },
  { c:10, v:11, data:d(-17), desc:'Revisão 80.000 km — Amarok',         serv:'Óleo diesel + filtros + velas aquecedoras',   mo:650, pecas:[{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Filtro ar',qtd:1,vu:35.50},{nome:'Correia dentada',qtd:1,vu:145}] },
  { c:11, v:12, data:d(-16), desc:'Suspensão traseira — Duster',        serv:'Troca bandejas + buchas + alinhamento',       mo:580, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320}] },
  { c:12, v:13, data:d(-15), desc:'Troca de embreagem — Argo',          serv:'Kit embreagem completo',                      mo:420, pecas:[{nome:'Correia dentada',qtd:1,vu:145},{nome:'Vela NGK',qtd:4,vu:18.50}] },
  { c:13, v:14, data:d(-14), desc:'Diagnóstico eletrônico — T-Cross',   serv:'Leitura falhas + reset ECU + bicos',           mo:350, pecas:[] },
  { c:14, v:15, data:d(-13), desc:'Freios completos — Yaris',           serv:'Pastilhas + discos + fluido',                  mo:420, pecas:[{nome:'Pastilha freio',qtd:2,vu:89.90},{nome:'Fluido DOT4',qtd:1,vu:22}] },
  // Semana 2 atrás
  { c:0,  v:1,  data:d(-12), desc:'Troca de palhetas + higienização',   serv:'Palhetas + higienização ar condicionado',      mo:180, pecas:[{nome:'Filtro ar',qtd:1,vu:35.50}] },
  { c:1,  v:2,  data:d(-11), desc:'Revisão 20.000 km — HB20',           serv:'Óleo + filtros + revisão geral',               mo:280, pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Filtro ar',qtd:1,vu:35.50}] },
  { c:2,  v:16, data:d(-10), desc:'Renegade — troca de velas',          serv:'Velas de ignição + limpeza corpo borboleta',   mo:220, pecas:[{nome:'Vela NGK',qtd:4,vu:18.50}] },
  { c:3,  v:4,  data:d(-9),  desc:'Ar condicionado — Kwid',             serv:'Recarga de gás + troca filtro cabine',         mo:320, pecas:[{nome:'Filtro ar',qtd:1,vu:35.50}] },
  { c:4,  v:17, data:d(-8),  desc:'S10 — revisão 100.000 km',           serv:'Filtros + fluidos + correia + pastilhas',      mo:780, pecas:[{nome:'Correia dentada',qtd:1,vu:145},{nome:'Pastilha freio',qtd:2,vu:89.90},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Filtro ar',qtd:1,vu:35.50}] },
  { c:5,  v:6,  data:d(-7),  desc:'Compass — direção hidráulica',       serv:'Troca fluido direção + verificação bomba',     mo:240, pecas:[{nome:'Fluido DOT4',qtd:1,vu:22}] },
  // Semana passada
  { c:6,  v:7,  data:d(-6),  desc:'Civic — revisão completa 60.000 km', serv:'Óleo + correia + velas + alinhamento',         mo:620, pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Correia dentada',qtd:1,vu:145},{nome:'Vela NGK',qtd:4,vu:18.50}] },
  { c:7,  v:8,  data:d(-5),  desc:'Sandero — freios traseiros',         serv:'Pastilhas traseiras + ajuste cabo freio mão',  mo:280, pecas:[{nome:'Pastilha freio',qtd:2,vu:89.90}] },
  { c:8,  v:9,  data:d(-4),  desc:'Tracker — embreagem',                serv:'Kit embreagem + volante motor',                mo:950, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320}] },
  { c:9,  v:10, data:d(-3),  desc:'Creta — troca de bateria + velas',   serv:'Bateria nova + velas + cabos',                 mo:180, pecas:[{nome:'Bateria 60Ah Moura',qtd:1,vu:480},{nome:'Vela NGK',qtd:4,vu:18.50}] },
  { c:10, v:11, data:d(-2),  desc:'Amarok — suspensão dianteira',       serv:'Amortecedores + bandejas + alinhamento',       mo:720, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320}] },
  { c:11, v:12, data:d(-1),  desc:'Duster — revisão 65.000 km',         serv:'Óleo + filtros + pastilhas + alinhamento',     mo:480, pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Pastilha freio',qtd:2,vu:89.90}] },
  { c:12, v:13, data:d(0),   desc:'Argo — diagnóstico luz injeção',     serv:'Diagnóstico + limpeza bicos + reset',           mo:320, pecas:[] },
];

// ── OS EM ANDAMENTO ──────────────────────────────────────────
const OS_ANDAMENTO = [
  { c:13, v:14, data:d(-2),  desc:'T-Cross — amortecedores traseiros',  serv:'Troca amortecedores traseiros + alinhamento',  mo:580, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320}] },
  { c:14, v:15, data:d(-1),  desc:'Yaris — sistema de freios completo', serv:'Discos + pastilhas + fluido dianteiro/traseiro',mo:520, pecas:[{nome:'Pastilha freio',qtd:4,vu:89.90},{nome:'Fluido DOT4',qtd:1,vu:22}] },
  { c:0,  v:0,  data:d(0),   desc:'Onix — troca de óleo',               serv:'Óleo 5W30 + filtro óleo + filtro ar',          mo:120, pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90}] },
];

// ── ESTOQUE ──────────────────────────────────────────────────
const ESTOQUE = [
  { nome:'Filtro de óleo Bosch',          cat:'peca',    marca:'Bosch',   qtd:15, min:5,  preco:28.90  },
  { nome:'Filtro de ar Mann',             cat:'peca',    marca:'Mann',    qtd:10, min:3,  preco:35.50  },
  { nome:'Pastilha de freio Fras-le',     cat:'peca',    marca:'Fras-le', qtd:8,  min:4,  preco:89.90  },
  { nome:'Óleo motor 5W30 Mobil 1L',     cat:'fluido',  marca:'Mobil',   qtd:24, min:10, preco:32.00  },
  { nome:'Vela de ignição NGK',           cat:'peca',    marca:'NGK',     qtd:20, min:8,  preco:18.50  },
  { nome:'Correia dentada Gates',         cat:'peca',    marca:'Gates',   qtd:6,  min:2,  preco:145.00 },
  { nome:'Fluido de freio DOT4 500ml',    cat:'fluido',  marca:'Bosch',   qtd:12, min:4,  preco:22.00  },
  { nome:'Amortecedor dianteiro Monroe',  cat:'peca',    marca:'Monroe',  qtd:4,  min:2,  preco:320.00 },
  { nome:'Palheta limpador Bosch 18"',    cat:'acess',   marca:'Bosch',   qtd:10, min:4,  preco:42.00  },
  { nome:'Bateria 60Ah Moura',            cat:'peca',    marca:'Moura',   qtd:3,  min:1,  preco:480.00 },
  { nome:'Vela de platina Denso',         cat:'peca',    marca:'Denso',   qtd:16, min:6,  preco:24.90  },
  { nome:'Kit correia poly-V',            cat:'peca',    marca:'Gates',   qtd:5,  min:2,  preco:85.00  },
  { nome:'Fluido arrefecimento 1L',       cat:'fluido',  marca:'Prestone',qtd:18, min:6,  preco:19.90  },
  { nome:'Disco de freio ventilado',      cat:'peca',    marca:'Fras-le', qtd:6,  min:2,  preco:189.00 },
  { nome:'Rolamento de roda dianteiro',   cat:'peca',    marca:'SKF',     qtd:4,  min:2,  preco:145.00 },
];

// ── DESPESAS ─────────────────────────────────────────────────
const DESPESAS = [
  { desc:'Aluguel da oficina',           cat:'Aluguel',            valor:2800, data:d(-30), venc:d(1),   pago:0 },
  { desc:'Conta de energia elétrica',    cat:'Energia',            valor:520,  data:d(-15), venc:d(0),   pago:0 },
  { desc:'Internet fibra 500MB',         cat:'Internet',           valor:130,  data:d(-10), venc:d(2),   pago:0 },
  { desc:'Folha — mecânico 1',           cat:'Folha de pagamento', valor:2200, data:d(-5),  venc:d(5),   pago:0 },
  { desc:'Folha — mecânico 2',           cat:'Folha de pagamento', valor:1800, data:d(-5),  venc:d(5),   pago:0 },
  { desc:'Compra de peças — Bosch',      cat:'Peças/Estoque',      valor:1850, data:d(-20), venc:d(-20), pago:1 },
  { desc:'Conta de água',                cat:'Água',               valor:95,   data:d(-25), venc:d(-25), pago:1 },
  { desc:'Boleto financiamento lift',    cat:'Boleto/Financiamento',valor:650, data:d(-30), venc:d(-30), pago:1 },
  { desc:'Material de limpeza',          cat:'Manutenção',         valor:180,  data:d(-12), venc:d(-12), pago:1 },
  { desc:'Compra de peças — Monroe',     cat:'Peças/Estoque',      valor:1280, data:d(-8),  venc:d(7),   pago:0 },
  { desc:'Imposto municipal (ISS)',       cat:'Impostos',           valor:380,  data:d(-3),  venc:d(10),  pago:0 },
];

// ── AGENDA ───────────────────────────────────────────────────
const AGENDA = [
  { c:0,  v:0,  titulo:'Revisão agendada — Onix',    data:d(1),  hora:'09:00', desc:'Revisão 45.000 km' },
  { c:1,  v:2,  titulo:'Troca de pneus — HB20',      data:d(1),  hora:'10:30', desc:'4 pneus + balanceamento' },
  { c:2,  v:3,  titulo:'Alinhamento — Strada',        data:d(2),  hora:'08:00', desc:'Alinhamento e balanceamento' },
  { c:3,  v:4,  titulo:'Ar condicionado — Kwid',      data:d(2),  hora:'14:00', desc:'Verificação ar condicionado' },
  { c:4,  v:5,  titulo:'Hilux — revisão preventiva',  data:d(3),  hora:'09:00', desc:'Revisão 120.000 km' },
  { c:5,  v:6,  titulo:'Compass — suspensão',         data:d(3),  hora:'11:00', desc:'Verificar barulho suspensão' },
  { c:6,  v:7,  titulo:'Civic — troca de óleo',       data:d(4),  hora:'09:30', desc:'Revisão programada' },
  { c:7,  v:8,  titulo:'Sandero — freios traseiros',  data:d(4),  hora:'14:30', desc:'Verificar desgaste' },
  { c:8,  v:9,  titulo:'Tracker — revisão geral',     data:d(5),  hora:'10:00', desc:'Revisão 25.000 km' },
  { c:9,  v:10, titulo:'Creta — diagnóstico',         data:d(5),  hora:'15:00', desc:'Luz painel acesa' },
];

// ── LEMBRETES ────────────────────────────────────────────────
const LEMBRETES = [
  { v:5,  tipo:'revisao',    desc:'Hilux — revisão 120.000 km vencida',  data:d(-5),  km:'120000' },
  { v:0,  tipo:'troca_oleo', desc:'Onix — troca de óleo',                data:d(30),  km:'45000'  },
  { v:2,  tipo:'revisao',    desc:'HB20 — revisão 20.000 km',            data:d(45),  km:'20000'  },
  { v:6,  tipo:'outro',      desc:'Compass — verificar vazamento óleo',  data:d(7),   km:null     },
  { v:11, tipo:'revisao',    desc:'Amarok — revisão 90.000 km',          data:d(20),  km:'90000'  },
  { v:3,  tipo:'troca_oleo', desc:'Strada — troca de óleo 60.000 km',    data:d(15),  km:'60000'  },
];

// ── ORÇAMENTOS ───────────────────────────────────────────────
const ORCAMENTOS = [
  {
    c:13, v:14, status:'pendente', validade:d(10),
    desc:'T-Cross — revisão 30.000 km',
    serv:'Óleo + filtros + velas + alinhamento',
    mo:380, desconto:0,
    pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Vela NGK',qtd:4,vu:18.50}],
  },
  {
    c:14, v:15, status:'pendente', validade:d(7),
    desc:'Yaris — embreagem',
    serv:'Kit embreagem completo + volante motor',
    mo:850, desconto:50,
    pecas:[{nome:'Correia dentada',qtd:1,vu:145}],
  },
  {
    c:0,  v:1,  status:'aprovado', validade:d(5),
    desc:'Gol — amortecedores traseiros',
    serv:'Troca amortecedores traseiros + alinhamento',
    mo:320, desconto:0,
    pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320}],
  },
];

// ── PAGAMENTOS para OS finalizadas ───────────────────────────
// Formatos variados: pix, dinheiro, crédito parcelado
const PAGAMENTOS_FORMS = ['pix','pix','pix','dinheiro','pix','dinheiro','pix','credito','pix','pix','dinheiro','credito','pix','pix','dinheiro','pix','pix','dinheiro','pix','credito','pix','credito','pix','pix','dinheiro','credito','pix'];

async function seed() {
  const pool = getPool();
  const q  = async (t, p) => (await pool.query(t, p)).rows;
  const q1 = async (t, p) => (await pool.query(t, p)).rows[0] || null;
  const run = async (t, p) => pool.query(t, p);

  console.log('🌱 Iniciando seed completo ~R$50k...\n');

  // ── Busca oficina da conta demo ───────────────────────────
  const usuario = await q1('SELECT id, oficina_id FROM usuarios WHERE email=$1', [DEMO_EMAIL]);
  if (!usuario || !usuario.oficina_id) {
    console.error('❌ Conta teste@teste.com não encontrada. Crie a conta primeiro.');
    await pool.end(); process.exit(1);
  }
  const oid = usuario.oficina_id;
  console.log(`✅ Oficina encontrada (id: ${oid})`);

  // ── Limpa dados existentes (mantém conta/usuário) ─────────
  console.log('🧹 Limpando dados anteriores...');
  await run('DELETE FROM parcelas_receber  WHERE oficina_id=$1', [oid]);
  await run('DELETE FROM pagamentos_os     WHERE oficina_id=$1', [oid]);
  await run('DELETE FROM comissoes         WHERE oficina_id=$1', [oid]).catch(()=>{});
  await run('DELETE FROM ordens_servico    WHERE oficina_id=$1', [oid]);
  await run('DELETE FROM orcamentos        WHERE oficina_id=$1', [oid]);
  await run('DELETE FROM agenda            WHERE oficina_id=$1', [oid]);
  await run('DELETE FROM lembretes         WHERE oficina_id=$1', [oid]);
  await run('DELETE FROM despesas          WHERE oficina_id=$1', [oid]);
  await run('DELETE FROM estoque           WHERE oficina_id=$1', [oid]);
  await run('DELETE FROM veiculos          WHERE oficina_id=$1', [oid]);
  await run('DELETE FROM clientes          WHERE oficina_id=$1', [oid]);
  console.log('✅ Dados anteriores removidos');

  // ── Clientes ──────────────────────────────────────────────
  const cIds = [];
  for (const c of CLIENTES) {
    const r = await q1(
      'INSERT INTO clientes(oficina_id,nome,telefone,email,endereco) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [oid, c.nome, c.telefone, c.email, c.endereco]
    );
    cIds.push(r.id);
  }
  console.log(`✅ ${cIds.length} clientes`);

  // ── Veículos ──────────────────────────────────────────────
  const vIds = [];
  for (const v of VEICULOS) {
    const r = await q1(
      'INSERT INTO veiculos(oficina_id,cliente_id,placa,modelo,marca,ano,km) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [oid, cIds[v.c], v.placa, v.modelo, v.marca, v.ano, v.km]
    );
    vIds.push(r.id);
  }
  console.log(`✅ ${vIds.length} veículos`);

  // ── OS finalizadas ────────────────────────────────────────
  const osIds = [];
  let osCount = 0;
  let totalFaturado = 0;

  for (let i = 0; i < OS_FINALIZADAS.length; i++) {
    const os = OS_FINALIZADAS[i];
    const vPecas = os.pecas.reduce((s, p) => s + p.qtd * p.vu, 0);
    const valor  = os.mo + vPecas;
    const numero = String(++osCount).padStart(4, '0');
    const token  = crypto.randomBytes(24).toString('base64url');

    const r = await q1(
      `INSERT INTO ordens_servico
        (oficina_id,cliente_id,veiculo_id,descricao,servicos,pecas_itens,valor_mo,valor_pecas,valor,status,data,numero,data_conclusao,token_publico)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'finalizado',$10,$11,NOW(),$12) RETURNING id`,
      [oid, cIds[os.c], vIds[os.v], os.desc, os.serv,
       os.pecas.length ? JSON.stringify(os.pecas) : null,
       os.mo, vPecas, valor, os.data, numero, token]
    );
    osIds.push(r.id);

    // Registra pagamento
    const forma = PAGAMENTOS_FORMS[i] || 'pix';
    const parcelas = forma === 'credito' ? (Math.random() > 0.5 ? 3 : 2) : 1;
    const valorParcela = parseFloat((valor / parcelas).toFixed(2));

    const pag = await q1(
      `INSERT INTO pagamentos_os(oficina_id,os_id,cliente_id,forma,valor_total,parcelas,valor_liquido,valor_parcela,data_pagamento)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [oid, r.id, cIds[os.c], forma, valor, parcelas, valor, valorParcela, os.data]
    );

    // Parcelas futuras para crédito
    if (forma === 'credito' && parcelas > 1) {
      for (let p = 1; p <= parcelas; p++) {
        const dataParc = new Date(os.data);
        dataParc.setDate(dataParc.getDate() + p * 30);
        await run(
          `INSERT INTO parcelas_receber(oficina_id,pagamento_os_id,os_id,cliente_id,numero_parcela,valor,data_recebimento,recebido)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [oid, pag.id, r.id, cIds[os.c], p, valorParcela,
           dataParc.toISOString().split('T')[0],
           dataParc < new Date() ? 1 : 0]
        );
      }
    }

    totalFaturado += valor;
  }
  console.log(`✅ ${OS_FINALIZADAS.length} OS finalizadas — R$ ${totalFaturado.toFixed(2)}`);

  // ── OS em andamento ───────────────────────────────────────
  for (const os of OS_ANDAMENTO) {
    const vPecas = os.pecas.reduce((s, p) => s + p.qtd * p.vu, 0);
    const valor  = os.mo + vPecas;
    const numero = String(++osCount).padStart(4, '0');
    const token  = crypto.randomBytes(24).toString('base64url');

    await q1(
      `INSERT INTO ordens_servico
        (oficina_id,cliente_id,veiculo_id,descricao,servicos,pecas_itens,valor_mo,valor_pecas,valor,status,data,numero,token_publico)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'em_andamento',$10,$11,$12) RETURNING id`,
      [oid, cIds[os.c], vIds[os.v], os.desc, os.serv,
       os.pecas.length ? JSON.stringify(os.pecas) : null,
       os.mo, vPecas, valor, os.data, numero, token]
    );
  }
  console.log(`✅ ${OS_ANDAMENTO.length} OS em andamento`);

  // ── Estoque ───────────────────────────────────────────────
  for (const item of ESTOQUE) {
    await run(
      'INSERT INTO estoque(oficina_id,nome,categoria,marca,quantidade,estoque_min,preco) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [oid, item.nome, item.cat, item.marca, item.qtd, item.min, item.preco]
    );
  }
  console.log(`✅ ${ESTOQUE.length} itens de estoque`);

  // ── Despesas ──────────────────────────────────────────────
  for (const d of DESPESAS) {
    await run(
      'INSERT INTO despesas(oficina_id,descricao,categoria,valor,data,vencimento,pago) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [oid, d.desc, d.cat, d.valor, d.data, d.venc, d.pago]
    );
  }
  console.log(`✅ ${DESPESAS.length} despesas`);

  // ── Agenda ────────────────────────────────────────────────
  for (const a of AGENDA) {
    await run(
      'INSERT INTO agenda(oficina_id,cliente_id,veiculo_id,titulo,data,hora,descricao) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [oid, cIds[a.c], vIds[a.v], a.titulo, a.data, a.hora, a.desc]
    );
  }
  console.log(`✅ ${AGENDA.length} agendamentos`);

  // ── Lembretes ─────────────────────────────────────────────
  for (const l of LEMBRETES) {
    await run(
      'INSERT INTO lembretes(oficina_id,veiculo_id,tipo,descricao,data_previsao,km_previsao) VALUES($1,$2,$3,$4,$5,$6)',
      [oid, vIds[l.v], l.tipo, l.desc, l.data, l.km]
    );
  }
  console.log(`✅ ${LEMBRETES.length} lembretes`);

  // ── Orçamentos ────────────────────────────────────────────
  for (let i = 0; i < ORCAMENTOS.length; i++) {
    const o = ORCAMENTOS[i];
    const vPecas = o.pecas.reduce((s, p) => s + p.qtd * p.vu, 0);
    const numero = `ORC-${String(i + 1).padStart(4, '0')}`;
    await run(
      `INSERT INTO orcamentos(oficina_id,cliente_id,veiculo_id,numero,descricao,servicos,pecas_itens,valor_mo,valor_pecas,desconto,status,validade)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [oid, cIds[o.c], vIds[o.v], numero, o.desc, o.serv,
       o.pecas.length ? JSON.stringify(o.pecas) : null,
       o.mo, vPecas, o.desconto, o.status, o.validade]
    );
  }
  console.log(`✅ ${ORCAMENTOS.length} orçamentos`);

  // ── Boleto pendente de exemplo ────────────────────────────
  const osAndamentoRow = await q1('SELECT id FROM ordens_servico WHERE oficina_id=$1 AND status=\'em_andamento\' LIMIT 1', [oid]);
  if (osAndamentoRow) {
    // Registra um boleto pendente na primeira OS em andamento (para demonstrar a seção)
    // (boleto como pagamento parcial antes da finalização — fluxo avançado)
  }

  console.log('\n🎉 Seed concluído!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  💰 Faturamento total:   R$ ${totalFaturado.toLocaleString('pt-BR', {minimumFractionDigits:2})}`);
  console.log(`  📋 OS finalizadas:      ${OS_FINALIZADAS.length}`);
  console.log(`  🔧 OS em andamento:     ${OS_ANDAMENTO.length}`);
  console.log(`  👥 Clientes:            ${CLIENTES.length}`);
  console.log(`  🚗 Veículos:            ${VEICULOS.length}`);
  console.log(`  📦 Itens de estoque:    ${ESTOQUE.length}`);
  console.log(`  📅 Agendamentos:        ${AGENDA.length}`);
  console.log(`  📄 Orçamentos:          ${ORCAMENTOS.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await pool.end();
}

module.exports = seed;

if (require.main === module) {
  seed().catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  });
}
