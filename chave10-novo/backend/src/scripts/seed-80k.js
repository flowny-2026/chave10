/**
 * seed-80k.js — Seed completo ~R$80.000 para conta teste@teste.com
 * Preenche TUDO: clientes, veículos, OS, orçamentos, pagamentos (pix/cartão/boleto/dinheiro),
 * despesas com fornecedores, estoque, agenda, lembretes, mecânicos
 * Dados pessoais fictícios: telefone/placa = 00000
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DEMO_EMAIL = 'teste@teste.com';

const d = (offset) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
};

const mes = (mOffset, dia) => {
  const dt = new Date();
  dt.setMonth(dt.getMonth() + mOffset);
  dt.setDate(dia || 1);
  return dt.toISOString().split('T')[0];
};

// ── CLIENTES ─────────────────────────────────────────────────
const CLIENTES = [
  { nome:'André Souza',         telefone:'(00)00000-0001', email:'c001@abc.com', endereco:'Rua 000, 001' },
  { nome:'Beatriz Lima',        telefone:'(00)00000-0002', email:'c002@abc.com', endereco:'Rua 000, 002' },
  { nome:'Carlos Mendes',       telefone:'(00)00000-0003', email:'c003@abc.com', endereco:'Rua 000, 003' },
  { nome:'Daniela Castro',      telefone:'(00)00000-0004', email:'c004@abc.com', endereco:'Rua 000, 004' },
  { nome:'Eduardo Rocha',       telefone:'(00)00000-0005', email:'c005@abc.com', endereco:'Rua 000, 005' },
  { nome:'Fernanda Alves',      telefone:'(00)00000-0006', email:'c006@abc.com', endereco:'Rua 000, 006' },
  { nome:'Gabriel Torres',      telefone:'(00)00000-0007', email:'c007@abc.com', endereco:'Rua 000, 007' },
  { nome:'Helena Martins',      telefone:'(00)00000-0008', email:'c008@abc.com', endereco:'Rua 000, 008' },
  { nome:'Igor Pereira',        telefone:'(00)00000-0009', email:'c009@abc.com', endereco:'Rua 000, 009' },
  { nome:'Juliana Ferreira',    telefone:'(00)00000-0010', email:'c010@abc.com', endereco:'Rua 000, 010' },
  { nome:'Kleber Nunes',        telefone:'(00)00000-0011', email:'c011@abc.com', endereco:'Rua 000, 011' },
  { nome:'Larissa Ribeiro',     telefone:'(00)00000-0012', email:'c012@abc.com', endereco:'Rua 000, 012' },
  { nome:'Marcelo Oliveira',    telefone:'(00)00000-0013', email:'c013@abc.com', endereco:'Rua 000, 013' },
  { nome:'Natália Gomes',       telefone:'(00)00000-0014', email:'c014@abc.com', endereco:'Rua 000, 014' },
  { nome:'Otávio Cardoso',      telefone:'(00)00000-0015', email:'c015@abc.com', endereco:'Rua 000, 015' },
  { nome:'Patrícia Souza',      telefone:'(00)00000-0016', email:'c016@abc.com', endereco:'Rua 000, 016' },
  { nome:'Rafael Moreira',      telefone:'(00)00000-0017', email:'c017@abc.com', endereco:'Rua 000, 017' },
  { nome:'Sandra Costa',        telefone:'(00)00000-0018', email:'c018@abc.com', endereco:'Rua 000, 018' },
  { nome:'Thiago Barbosa',      telefone:'(00)00000-0019', email:'c019@abc.com', endereco:'Rua 000, 019' },
  { nome:'Ursula Pinto',        telefone:'(00)00000-0020', email:'c020@abc.com', endereco:'Rua 000, 020' },
];

// ── VEÍCULOS ──────────────────────────────────────────────────
const VEICULOS = [
  {c:0,  placa:'AAA0001', modelo:'Onix',       marca:'Chevrolet',  ano:'2021', km:'42000'},
  {c:0,  placa:'AAA0002', modelo:'Gol',        marca:'Volkswagen', ano:'2019', km:'78000'},
  {c:1,  placa:'AAA0003', modelo:'HB20',       marca:'Hyundai',    ano:'2022', km:'18000'},
  {c:2,  placa:'AAA0004', modelo:'Strada',     marca:'Fiat',       ano:'2020', km:'55000'},
  {c:3,  placa:'AAA0005', modelo:'Kwid',       marca:'Renault',    ano:'2023', km:'9000' },
  {c:4,  placa:'AAA0006', modelo:'Hilux',      marca:'Toyota',     ano:'2018', km:'120000'},
  {c:5,  placa:'AAA0007', modelo:'Compass',    marca:'Jeep',       ano:'2021', km:'38000'},
  {c:6,  placa:'AAA0008', modelo:'Civic',      marca:'Honda',      ano:'2020', km:'61000'},
  {c:7,  placa:'AAA0009', modelo:'Sandero',    marca:'Renault',    ano:'2019', km:'47000'},
  {c:8,  placa:'AAA0010', modelo:'Tracker',    marca:'Chevrolet',  ano:'2022', km:'22000'},
  {c:9,  placa:'AAA0011', modelo:'Creta',      marca:'Hyundai',    ano:'2021', km:'31000'},
  {c:10, placa:'AAA0012', modelo:'Amarok',     marca:'Volkswagen', ano:'2020', km:'88000'},
  {c:11, placa:'AAA0013', modelo:'Duster',     marca:'Renault',    ano:'2019', km:'65000'},
  {c:12, placa:'AAA0014', modelo:'Argo',       marca:'Fiat',       ano:'2023', km:'12000'},
  {c:13, placa:'AAA0015', modelo:'T-Cross',    marca:'Volkswagen', ano:'2022', km:'25000'},
  {c:14, placa:'AAA0016', modelo:'Yaris',      marca:'Toyota',     ano:'2021', km:'44000'},
  {c:15, placa:'AAA0017', modelo:'Renegade',   marca:'Jeep',       ano:'2020', km:'58000'},
  {c:16, placa:'AAA0018', modelo:'S10',        marca:'Chevrolet',  ano:'2019', km:'102000'},
  {c:17, placa:'AAA0019', modelo:'Corolla',    marca:'Toyota',     ano:'2022', km:'28000'},
  {c:18, placa:'AAA0020', modelo:'Polo',       marca:'Volkswagen', ano:'2023', km:'8000' },
  {c:19, placa:'AAA0021', modelo:'Pulse',      marca:'Fiat',       ano:'2022', km:'19000'},
  {c:0,  placa:'AAA0022', modelo:'Spin',       marca:'Chevrolet',  ano:'2020', km:'67000'},
];

// ── OS FINALIZADAS ────────────────────────────────────────────
const OS_FINALIZADAS = [
  // Semana 5 atrás — pagamentos variados
  {c:0,  v:0,  data:d(-35), desc:'Revisão 40.000km — Onix',           serv:'Óleo+filtros+velas+alinhamento',          mo:580,  pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Vela NGK',qtd:4,vu:18.50}], forma:'pix'},
  {c:1,  v:2,  data:d(-34), desc:'Freios dianteiros e traseiros',      serv:'Discos+pastilhas+fluido',                 mo:620,  pecas:[{nome:'Pastilha freio',qtd:4,vu:89.90},{nome:'Disco de freio ventilado',qtd:2,vu:189},{nome:'Fluido DOT4',qtd:1,vu:22}], forma:'dinheiro'},
  {c:2,  v:3,  data:d(-33), desc:'Revisão 50.000km — Strada',         serv:'Óleo+correia+filtros+velas',              mo:720,  pecas:[{nome:'Correia dentada',qtd:1,vu:145},{nome:'Óleo 5W30 1L',qtd:5,vu:32},{nome:'Filtro ar',qtd:1,vu:35.50}], forma:'credito', parcelas:2},
  {c:3,  v:4,  data:d(-32), desc:'Ar condicionado — Kwid',            serv:'Recarga+filtro cabine+higienização',       mo:480,  pecas:[{nome:'Filtro ar',qtd:1,vu:35.50}], forma:'pix'},
  {c:4,  v:5,  data:d(-31), desc:'Amortecedores + geometria — Hilux', serv:'Troca amortecedores+alinhamento',          mo:980,  pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320}], forma:'boleto', venc:d(-10)},
  // Semana 4 atrás
  {c:5,  v:6,  data:d(-28), desc:'Embreagem completa — Compass',      serv:'Kit embreagem+rolamento+alinhamento',      mo:1250, pecas:[{nome:'Correia dentada',qtd:1,vu:145},{nome:'Kit correia poly-V',qtd:1,vu:85}], forma:'credito', parcelas:3},
  {c:6,  v:7,  data:d(-27), desc:'Revisão 60.000km — Civic',          serv:'Óleo+correia+velas+pastilhas',             mo:1180, pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Correia dentada',qtd:1,vu:145},{nome:'Vela de platina Denso',qtd:4,vu:24.90},{nome:'Pastilha freio',qtd:2,vu:89.90}], forma:'pix'},
  {c:7,  v:8,  data:d(-26), desc:'Bateria+sistema elétrico — Sandero',serv:'Bateria nova+alternador+cabos',             mo:380,  pecas:[{nome:'Bateria 60Ah Moura',qtd:1,vu:480}], forma:'dinheiro'},
  {c:8,  v:9,  data:d(-25), desc:'Suspensão traseira — Tracker',      serv:'Bandejas+buchas+rolamentos',               mo:1480, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320},{nome:'Rolamento de roda dianteiro',qtd:2,vu:145}], forma:'boleto', venc:d(-5)},
  {c:9,  v:10, data:d(-24), desc:'Diagnóstico eletrônico — Creta',    serv:'Leitura+troca sensores+reset ECU',          mo:720,  pecas:[{nome:'Vela de platina Denso',qtd:4,vu:24.90}], forma:'pix'},
  // Semana 3 atrás
  {c:10, v:11, data:d(-21), desc:'Revisão 80.000km — Amarok',         serv:'Óleo diesel+filtros+correia+pastilhas',    mo:1350, pecas:[{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Correia dentada',qtd:1,vu:145},{nome:'Pastilha freio',qtd:4,vu:89.90}], forma:'credito', parcelas:2},
  {c:11, v:12, data:d(-20), desc:'Freios completos — Duster',         serv:'Discos+pastilhas+fluido+cabo freio',        mo:820,  pecas:[{nome:'Disco de freio ventilado',qtd:4,vu:189},{nome:'Fluido DOT4',qtd:2,vu:22}], forma:'boleto', venc:d(5)},
  {c:12, v:13, data:d(-19), desc:'Motor — retífica Argo',             serv:'Desmontagem+retífica+montagem',             mo:3800, pecas:[{nome:'Correia dentada',qtd:2,vu:145},{nome:'Óleo 5W30 1L',qtd:8,vu:32},{nome:'Filtro óleo',qtd:2,vu:28.90}], forma:'boleto', venc:d(10)},
  {c:13, v:14, data:d(-18), desc:'Revisão 25.000km — T-Cross',        serv:'Óleo+filtros+velas+alinhamento',            mo:580,  pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Vela NGK',qtd:4,vu:18.50},{nome:'Filtro ar',qtd:1,vu:35.50}], forma:'pix'},
  {c:14, v:15, data:d(-17), desc:'Câmbio automático — Yaris',         serv:'Revisão câmbio+troca ATF',                  mo:2800, pecas:[{nome:'Fluido arrefecimento 1L',qtd:6,vu:19.90}], forma:'credito', parcelas:4},
  // Semana 2 atrás
  {c:15, v:16, data:d(-14), desc:'Suspensão dianteira — Renegade',    serv:'Amortecedores+bandejas+alinhamento',        mo:1680, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320},{nome:'Rolamento de roda dianteiro',qtd:2,vu:145}], forma:'pix'},
  {c:16, v:17, data:d(-13), desc:'Revisão 100.000km — S10',           serv:'Filtros+fluidos+correia+pastilhas+geom.',   mo:2200, pecas:[{nome:'Correia dentada',qtd:1,vu:145},{nome:'Pastilha freio',qtd:4,vu:89.90},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Filtro ar',qtd:1,vu:35.50},{nome:'Kit correia poly-V',qtd:1,vu:85}], forma:'boleto', venc:d(15)},
  {c:17, v:18, data:d(-12), desc:'Troca de óleo+velas — Corolla',     serv:'Óleo 5W30+velas platina+filtros',           mo:420,  pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Vela de platina Denso',qtd:4,vu:24.90},{nome:'Filtro óleo',qtd:1,vu:28.90}], forma:'dinheiro'},
  {c:18, v:19, data:d(-11), desc:'Revisão 10.000km — Polo',           serv:'Primeira revisão completa',                 mo:380,  pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Filtro ar',qtd:1,vu:35.50}], forma:'pix'},
  {c:19, v:20, data:d(-10), desc:'Freios+embreagem — Pulse',          serv:'Kit embreagem+pastilhas+fluido',             mo:1480, pecas:[{nome:'Pastilha freio',qtd:4,vu:89.90},{nome:'Fluido DOT4',qtd:2,vu:22}], forma:'credito', parcelas:3},
  // Semana passada
  {c:0,  v:1,  data:d(-7),  desc:'Ar condicionado+palhetas — Gol',   serv:'Recarga AC+palhetas+higienização',          mo:380,  pecas:[{nome:'Filtro ar',qtd:1,vu:35.50}], forma:'pix'},
  {c:1,  v:2,  data:d(-6),  desc:'Suspensão + freios — HB20',         serv:'Amortecedores+discos+pastilhas',             mo:1620, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320},{nome:'Disco de freio ventilado',qtd:2,vu:189},{nome:'Pastilha freio',qtd:2,vu:89.90}], forma:'boleto', venc:d(20)},
  {c:2,  v:21, data:d(-5),  desc:'Transmissão Spin',                   serv:'Troca transmissão+diferencial',             mo:3200, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320},{nome:'Rolamento de roda dianteiro',qtd:4,vu:145}], forma:'boleto', venc:d(25)},
  {c:3,  v:4,  data:d(-4),  desc:'Revisão geral — Kwid',              serv:'Óleo+filtros+pastilhas+alinhamento',         mo:620,  pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Pastilha freio',qtd:2,vu:89.90},{nome:'Filtro ar',qtd:1,vu:35.50}], forma:'dinheiro'},
  {c:4,  v:5,  data:d(-3),  desc:'Motor completo — Hilux',            serv:'Revisão motor+vedações+fluidos',             mo:4200, pecas:[{nome:'Correia dentada',qtd:2,vu:145},{nome:'Óleo 5W30 1L',qtd:8,vu:32},{nome:'Kit correia poly-V',qtd:2,vu:85}], forma:'boleto', venc:d(30)},
  {c:5,  v:6,  data:d(-2),  desc:'Revisão Compass',                   serv:'Óleo+filtros+direção+alinhamento',           mo:680,  pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Filtro óleo',qtd:1,vu:28.90},{nome:'Fluido DOT4',qtd:1,vu:22}], forma:'pix'},
  {c:6,  v:7,  data:d(-1),  desc:'Freios pós-sinistro — Civic',       serv:'Discos+pastilhas+pinças+fluido',             mo:2480, pecas:[{nome:'Disco de freio ventilado',qtd:4,vu:189},{nome:'Pastilha freio',qtd:4,vu:89.90},{nome:'Fluido DOT4',qtd:2,vu:22}], forma:'credito', parcelas:2},
  {c:7,  v:8,  data:d(0),   desc:'Velas+bicos injetores — Sandero',   serv:'Velas platina+limpeza bicos+diagnóstico',    mo:580,  pecas:[{nome:'Vela de platina Denso',qtd:4,vu:24.90}], forma:'pix'},
  // Serviços de alto valor para complementar R$80k
  {c:0,  v:0,  data:d(-29), desc:'Retífica motor — Onix',              serv:'Desmontagem+retífica+montagem+ajuste fino',   mo:4800, pecas:[{nome:'Correia dentada',qtd:2,vu:145},{nome:'Óleo 5W30 1L',qtd:8,vu:32},{nome:'Filtro óleo',qtd:2,vu:28.90}], forma:'boleto', venc:d(-8)},
  {c:5,  v:6,  data:d(-22), desc:'Câmbio + suspensão Compass',         serv:'Câmbio automático+amortecedores+geometria',   mo:3600, pecas:[{nome:'Amortecedor Monroe',qtd:4,vu:320},{nome:'Fluido arrefecimento 1L',qtd:4,vu:19.90}], forma:'credito', parcelas:4},
  {c:16, v:17, data:d(-9),  desc:'Revisão completa S10 pós-estrada',   serv:'Motor+freios+suspensão+elétrica completo',    mo:3200, pecas:[{nome:'Pastilha freio',qtd:4,vu:89.90},{nome:'Disco de freio ventilado',qtd:4,vu:189},{nome:'Rolamento de roda dianteiro',qtd:4,vu:145}], forma:'boleto', venc:d(12)},
  {c:9,  v:10, data:d(-16), desc:'Motor câmbio Creta — revisão geral',  serv:'Motor+câmbio+suspensão+alinhamento completo', mo:4500, pecas:[{nome:'Correia dentada',qtd:2,vu:145},{nome:'Amortecedor Monroe',qtd:2,vu:320},{nome:'Kit correia poly-V',qtd:2,vu:85}], forma:'credito', parcelas:3},
  {c:4,  v:5,  data:d(-8),  desc:'Blindagem e revisão Hilux',           serv:'Revisão completa pós-blindagem',              mo:3800, pecas:[{nome:'Pastilha freio',qtd:4,vu:89.90},{nome:'Filtro óleo',qtd:2,vu:28.90},{nome:'Óleo 5W30 1L',qtd:8,vu:32},{nome:'Correia dentada',qtd:1,vu:145}], forma:'boleto', venc:d(20)},
];

// ── OS EM ANDAMENTO ───────────────────────────────────────────
const OS_ANDAMENTO = [
  {c:8,  v:9,  data:d(-2), desc:'Embreagem Tracker',         serv:'Kit embreagem+volante+alinhamento',   mo:1850, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320}]},
  {c:9,  v:10, data:d(-1), desc:'Suspensão Creta',           serv:'Amortecedores+bandejas+geometria',    mo:1480, pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320},{nome:'Rolamento de roda dianteiro',qtd:2,vu:145}]},
  {c:10, v:11, data:d(0),  desc:'Diagnóstico Amarok',        serv:'Leitura falhas+bicos+reset',          mo:680,  pecas:[]},
  {c:17, v:18, data:d(0),  desc:'Revisão Corolla',           serv:'Óleo+filtros+velas+alinhamento',      mo:580,  pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32}]},
];

// ── ORÇAMENTOS ────────────────────────────────────────────────
const ORCAMENTOS = [
  {c:11, v:12, status:'pendente',  validade:d(10), desc:'Freios completos Duster',      serv:'Discos+pastilhas+fluido+revisão',   mo:980,  desconto:0,   pecas:[{nome:'Disco de freio ventilado',qtd:2,vu:189},{nome:'Pastilha freio',qtd:4,vu:89.90}]},
  {c:12, v:13, status:'pendente',  validade:d(7),  desc:'Suspensão Argo',               serv:'Amortecedores+bandejas+alinhamento', mo:1680, desconto:50,  pecas:[{nome:'Amortecedor Monroe',qtd:2,vu:320}]},
  {c:13, v:14, status:'aprovado',  validade:d(5),  desc:'Revisão 30.000km T-Cross',     serv:'Óleo+filtros+velas+alinhamento',    mo:620,  desconto:0,   pecas:[{nome:'Óleo 5W30 1L',qtd:4,vu:32},{nome:'Vela NGK',qtd:4,vu:18.50}]},
  {c:14, v:15, status:'pendente',  validade:d(14), desc:'Kit embreagem Yaris',           serv:'Embreagem completa+volante',        mo:1200, desconto:100, pecas:[{nome:'Correia dentada',qtd:1,vu:145}]},
  {c:19, v:20, status:'rejeitado', validade:d(-3), desc:'Motor Pulse',                  serv:'Retífica completa do motor',        mo:4500, desconto:0,   pecas:[{nome:'Correia dentada',qtd:2,vu:145}]},
];

// ── ESTOQUE ───────────────────────────────────────────────────
const ESTOQUE = [
  {nome:'Filtro de óleo Bosch',         cat:'peca',   marca:'Bosch',   qtd:18, min:5,  custo:18.50, margem:56},
  {nome:'Filtro de ar Mann',            cat:'peca',   marca:'Mann',    qtd:12, min:3,  custo:22.00, margem:61},
  {nome:'Pastilha de freio Fras-le',    cat:'peca',   marca:'Fras-le', qtd:10, min:4,  custo:58.00, margem:55},
  {nome:'Óleo motor 5W30 Mobil 1L',    cat:'fluido', marca:'Mobil',   qtd:30, min:10, custo:20.00, margem:60},
  {nome:'Vela de ignição NGK',          cat:'peca',   marca:'NGK',     qtd:24, min:8,  custo:11.00, margem:68},
  {nome:'Correia dentada Gates',        cat:'peca',   marca:'Gates',   qtd:8,  min:2,  custo:95.00, margem:53},
  {nome:'Fluido de freio DOT4 500ml',   cat:'fluido', marca:'Bosch',   qtd:15, min:4,  custo:13.00, margem:69},
  {nome:'Amortecedor dianteiro Monroe', cat:'peca',   marca:'Monroe',  qtd:6,  min:2,  custo:210.00,margem:52},
  {nome:'Bateria 60Ah Moura',           cat:'peca',   marca:'Moura',   qtd:4,  min:1,  custo:320.00,margem:50},
  {nome:'Vela de platina Denso',        cat:'peca',   marca:'Denso',   qtd:20, min:6,  custo:15.00, margem:66},
  {nome:'Kit correia poly-V',           cat:'peca',   marca:'Gates',   qtd:6,  min:2,  custo:55.00, margem:55},
  {nome:'Fluido arrefecimento 1L',      cat:'fluido', marca:'Prestone',qtd:20, min:6,  custo:12.00, margem:66},
  {nome:'Disco de freio ventilado',     cat:'peca',   marca:'Fras-le', qtd:8,  min:2,  custo:125.00,margem:51},
  {nome:'Rolamento de roda dianteiro',  cat:'peca',   marca:'SKF',     qtd:5,  min:2,  custo:95.00, margem:53},
  {nome:'Palheta limpador Bosch 18"',   cat:'acess',  marca:'Bosch',   qtd:12, min:4,  custo:26.00, margem:62},
];

// ── DESPESAS ──────────────────────────────────────────────────
const DESPESAS = [
  {desc:'Aluguel da oficina',           cat:'Aluguel',            valor:3200, data:d(-30), venc:d(1),   pago:0},
  {desc:'Conta de energia elétrica',    cat:'Energia',            valor:680,  data:d(-15), venc:d(0),   pago:0},
  {desc:'Internet fibra 500MB',         cat:'Internet',           valor:159,  data:d(-10), venc:d(2),   pago:0},
  {desc:'Folha — mecânico Carlos',      cat:'Folha de pagamento', valor:2800, data:d(-5),  venc:d(5),   pago:0},
  {desc:'Folha — mecânico Pedro',       cat:'Folha de pagamento', valor:2200, data:d(-5),  venc:d(5),   pago:0},
  {desc:'Compra de peças — Bosch',      cat:'Peças/Estoque',      valor:2850, data:d(-20), venc:d(-20), pago:1},
  {desc:'Compra de peças — Monroe',     cat:'Peças/Estoque',      valor:1980, data:d(-15), venc:d(-15), pago:1},
  {desc:'Conta de água',                cat:'Água',               valor:120,  data:d(-25), venc:d(-25), pago:1},
  {desc:'Boleto financiamento elevador',cat:'Boleto/Financiamento',valor:980, data:d(-30), venc:d(-30), pago:1},
  {desc:'Material de limpeza',          cat:'Manutenção',         valor:280,  data:d(-12), venc:d(-12), pago:1},
  {desc:'Imposto municipal (ISS)',       cat:'Impostos',           valor:520,  data:d(-3),  venc:d(10),  pago:0},
  {desc:'Marketing redes sociais',      cat:'Marketing',          valor:350,  data:d(-8),  venc:d(8),   pago:0},
  {desc:'Combustível furgão',           cat:'Combustível',        valor:280,  data:d(-6),  venc:d(-6),  pago:1},
  {desc:'Compra de ferramentas',        cat:'Ferramentas',        valor:650,  data:d(-18), venc:d(-18), pago:1},
];

// ── AGENDA ────────────────────────────────────────────────────
const AGENDA = [
  {c:0,  v:0,  titulo:'Revisão Onix — 45.000km',         data:d(1),  hora:'08:00', desc:'Revisão programada'},
  {c:1,  v:2,  titulo:'Troca de pneus — HB20',           data:d(1),  hora:'10:00', desc:'4 pneus + balanceamento'},
  {c:2,  v:3,  titulo:'Alinhamento Strada',              data:d(1),  hora:'14:00', desc:'Alinhamento e balanceamento'},
  {c:3,  v:4,  titulo:'Ar condicionado Kwid',            data:d(2),  hora:'09:00', desc:'Verificação AC'},
  {c:4,  v:5,  titulo:'Retirada Hilux',                  data:d(2),  hora:'11:00', desc:'Retirada após motor'},
  {c:5,  v:6,  titulo:'Revisão Compass',                 data:d(2),  hora:'14:30', desc:'Revisão preventiva'},
  {c:6,  v:7,  titulo:'Freios Civic',                    data:d(3),  hora:'08:30', desc:'Verificar desgaste'},
  {c:7,  v:8,  titulo:'Troca óleo Sandero',              data:d(3),  hora:'10:00', desc:'Troca óleo + filtros'},
  {c:8,  v:9,  titulo:'Retirada Tracker',                data:d(3),  hora:'15:00', desc:'Após embreagem'},
  {c:9,  v:10, titulo:'Diagnóstico Creta',               data:d(4),  hora:'09:00', desc:'Luz painel acesa'},
  {c:10, v:11, titulo:'Revisão Amarok',                  data:d(4),  hora:'11:00', desc:'100.000km'},
  {c:11, v:12, titulo:'Orçamento Duster',                data:d(4),  hora:'14:00', desc:'Aprovação orçamento freios'},
  {c:17, v:18, titulo:'Revisão Corolla',                 data:d(5),  hora:'08:00', desc:'Revisão 30.000km'},
  {c:18, v:19, titulo:'Revisão Polo',                    data:d(5),  hora:'10:30', desc:'Revisão 15.000km'},
];

// ── LEMBRETES ─────────────────────────────────────────────────
const LEMBRETES = [
  {v:5,  tipo:'revisao',    desc:'Hilux — revisão 120.000km VENCIDA', data:d(-5),  km:'120000'},
  {v:0,  tipo:'troca_oleo', desc:'Onix — troca de óleo',              data:d(30),  km:'45000' },
  {v:2,  tipo:'revisao',    desc:'HB20 — revisão 20.000km',           data:d(45),  km:'20000' },
  {v:6,  tipo:'outro',      desc:'Compass — verificar vazamento óleo', data:d(7),  km:null    },
  {v:11, tipo:'revisao',    desc:'Amarok — revisão 90.000km',          data:d(20),  km:'90000' },
  {v:3,  tipo:'troca_oleo', desc:'Strada — troca óleo 60.000km',       data:d(15),  km:'60000' },
  {v:17, tipo:'revisao',    desc:'Corolla — revisão 30.000km',          data:d(5),   km:'30000' },
  {v:9,  tipo:'outro',      desc:'Tracker — verificar transmissão',     data:d(3),   km:null    },
];

// ── FORNECEDORES ──────────────────────────────────────────────
const FORNECEDORES = [
  {nome:'Distribuidora Bosch',       cnpj_cpf:'00.000.000/0001-01', telefone:'(00)00000-0001', email:'bosch@abc.com',   obs:'Principal fornecedor de filtros e velas'},
  {nome:'Monroe Distribuidora',      cnpj_cpf:'00.000.000/0002-02', telefone:'(00)00000-0002', email:'monroe@abc.com',  obs:'Amortecedores e suspensão'},
  {nome:'Fras-le Peças',             cnpj_cpf:'00.000.000/0003-03', telefone:'(00)00000-0003', email:'frasle@abc.com',  obs:'Freios e pastilhas'},
  {nome:'Auto Peças Central',        cnpj_cpf:'00.000.000/0004-04', telefone:'(00)00000-0004', email:'central@abc.com', obs:'Peças em geral'},
  {nome:'Lubrificantes Mobil',       cnpj_cpf:'00.000.000/0005-05', telefone:'(00)00000-0005', email:'mobil@abc.com',   obs:'Óleos e fluidos'},
];

async function seed() {
  const q  = async (t, p) => (await pool.query(t, p)).rows;
  const q1 = async (t, p) => (await pool.query(t, p)).rows[0] || null;
  const run = async (t, p) => pool.query(t, p);

  console.log('🌱 Iniciando seed ~R$80k...\n');

  const usuario = await q1("SELECT id, oficina_id FROM usuarios WHERE email=$1", [DEMO_EMAIL]);
  if (!usuario?.oficina_id) { console.error('❌ Conta teste@teste.com não encontrada.'); await pool.end(); process.exit(1); }
  const oid = usuario.oficina_id;
  console.log(`✅ Oficina id: ${oid}`);

  // Limpa tudo
  console.log('🧹 Limpando dados anteriores...');
  for (const t of ['parcelas_receber','pagamentos_os','comissoes','ordens_servico','orcamentos','agenda','lembretes','despesas','estoque','veiculos','clientes','fornecedores']) {
    await run(`DELETE FROM ${t} WHERE oficina_id=$1`, [oid]).catch(()=>{});
  }
  await run("UPDATE oficinas SET proximo_numero=1 WHERE id=$1", [oid]);
  console.log('✅ Limpeza concluída');

  // Fornecedores
  const fornIds = [];
  for (const f of FORNECEDORES) {
    const r = await q1("INSERT INTO fornecedores(oficina_id,nome,cnpj_cpf,telefone,email,obs) VALUES($1,$2,$3,$4,$5,$6) RETURNING id", [oid,f.nome,f.cnpj_cpf,f.telefone,f.email,f.obs]);
    fornIds.push(r.id);
  }
  console.log(`✅ ${fornIds.length} fornecedores`);

  // Clientes
  const cIds = [];
  for (const c of CLIENTES) {
    const r = await q1("INSERT INTO clientes(oficina_id,nome,telefone,email,endereco) VALUES($1,$2,$3,$4,$5) RETURNING id", [oid,c.nome,c.telefone,c.email,c.endereco]);
    cIds.push(r.id);
  }
  console.log(`✅ ${cIds.length} clientes`);

  // Veículos
  const vIds = [];
  for (const v of VEICULOS) {
    const r = await q1("INSERT INTO veiculos(oficina_id,cliente_id,placa,modelo,marca,ano,km) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id", [oid,cIds[v.c],v.placa,v.modelo,v.marca,v.ano,v.km]);
    vIds.push(r.id);
  }
  console.log(`✅ ${vIds.length} veículos`);

  // Estoque
  for (const item of ESTOQUE) {
    const pv = parseFloat((item.custo*(1+item.margem/100)).toFixed(2));
    await run("INSERT INTO estoque(oficina_id,nome,categoria,marca,quantidade,estoque_min,custo,margem,preco_venda,preco) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [oid,item.nome,item.cat,item.marca,item.qtd,item.min,item.custo,item.margem,pv,pv]);
  }
  console.log(`✅ ${ESTOQUE.length} itens estoque`);

  // Despesas (vincula fornecedores)
  for (let i=0; i<DESPESAS.length; i++) {
    const desp = DESPESAS[i];
    const fornId = i < 2 ? fornIds[0] : i === 5 ? fornIds[0] : i === 6 ? fornIds[1] : null;
    await run("INSERT INTO despesas(oficina_id,descricao,categoria,valor,data,vencimento,pago,fornecedor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [oid,desp.desc,desp.cat,desp.valor,desp.data,desp.venc,desp.pago,fornId]);
  }
  console.log(`✅ ${DESPESAS.length} despesas`);

  // OS Finalizadas + pagamentos
  let totalFat = 0;
  let osCount = 0;
  const hoje = new Date().toISOString().split('T')[0];

  for (const os of OS_FINALIZADAS) {
    const vPecas = os.pecas.reduce((s,p)=>s+p.qtd*p.vu, 0);
    const valor  = os.mo + vPecas;
    totalFat += valor;

    // Número via proximo_numero
    const numRow = await q1("UPDATE oficinas SET proximo_numero=proximo_numero+1 WHERE id=$1 RETURNING proximo_numero", [oid]);
    const numero = String(numRow.proximo_numero).padStart(4,'0');
    const token  = crypto.randomBytes(24).toString('base64url');

    const osRow = await q1(
      `INSERT INTO ordens_servico(oficina_id,cliente_id,veiculo_id,descricao,servicos,pecas_itens,valor_mo,valor_pecas,valor,status,data,numero,data_conclusao,token_publico,estoque_baixado)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'finalizado',$10,$11,NOW(),$12,true) RETURNING id`,
      [oid,cIds[os.c],vIds[os.v],os.desc,os.serv,os.pecas.length?JSON.stringify(os.pecas):null,os.mo,vPecas,valor,os.data,numero,token]
    );

    // Pagamento
    const forma    = os.forma || 'pix';
    const nParc    = forma==='credito' ? (os.parcelas||1) : 1;
    const liquido  = valor;
    const parcel   = parseFloat((liquido/nParc).toFixed(2));
    const dataVenc = os.venc || hoje;

    const pagRow = await q1(
      `INSERT INTO pagamentos_os(oficina_id,os_id,cliente_id,forma,valor_total,parcelas,valor_liquido,valor_parcela,data_pagamento,boleto_vencimento,boleto_pendente)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [oid,osRow.id,cIds[os.c],forma,valor,nParc,liquido,parcel,os.data,
       forma==='boleto'?dataVenc:null,
       forma==='boleto' && os.venc && os.venc > hoje]
    );

    // Parcelas para crédito
    if (forma==='credito' && nParc>1) {
      for (let i=1;i<=nParc;i++) {
        const dr = new Date(os.data);
        dr.setDate(dr.getDate()+i*30);
        await run("INSERT INTO parcelas_receber(oficina_id,pagamento_os_id,os_id,cliente_id,numero_parcela,valor,data_recebimento,recebido) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [oid,pagRow.id,osRow.id,cIds[os.c],i,parcel,dr.toISOString().split('T')[0], dr<new Date()?1:0]);
      }
    }
    osCount++;
  }
  console.log(`✅ ${osCount} OS finalizadas — R$ ${totalFat.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);

  // OS em andamento
  for (const os of OS_ANDAMENTO) {
    const vPecas = os.pecas.reduce((s,p)=>s+p.qtd*p.vu, 0);
    const valor  = os.mo + vPecas;
    const numRow = await q1("UPDATE oficinas SET proximo_numero=proximo_numero+1 WHERE id=$1 RETURNING proximo_numero", [oid]);
    const numero = String(numRow.proximo_numero).padStart(4,'0');
    const token  = crypto.randomBytes(24).toString('base64url');
    await q1(
      `INSERT INTO ordens_servico(oficina_id,cliente_id,veiculo_id,descricao,servicos,pecas_itens,valor_mo,valor_pecas,valor,status,data,numero,token_publico)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'em_andamento',$10,$11,$12) RETURNING id`,
      [oid,cIds[os.c],vIds[os.v],os.desc,os.serv,os.pecas.length?JSON.stringify(os.pecas):null,os.mo,vPecas,valor,os.data,numero,token]
    );
  }
  console.log(`✅ ${OS_ANDAMENTO.length} OS em andamento`);

  // Orçamentos
  for (const orc of ORCAMENTOS) {
    const vPecas = orc.pecas.reduce((s,p)=>s+p.qtd*p.vu, 0);
    const numRow = await q1("UPDATE oficinas SET proximo_numero=proximo_numero+1 WHERE id=$1 RETURNING proximo_numero", [oid]);
    const numero = String(numRow.proximo_numero).padStart(4,'0');
    await run(
      "INSERT INTO orcamentos(oficina_id,cliente_id,veiculo_id,numero,descricao,servicos,pecas_itens,valor_mo,valor_pecas,desconto,status,validade) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
      [oid,cIds[orc.c],vIds[orc.v],numero,orc.desc,orc.serv,orc.pecas.length?JSON.stringify(orc.pecas):null,orc.mo,vPecas,orc.desconto,orc.status,orc.validade]
    );
  }
  console.log(`✅ ${ORCAMENTOS.length} orçamentos`);

  // Agenda
  for (const a of AGENDA) {
    await run("INSERT INTO agenda(oficina_id,cliente_id,veiculo_id,titulo,data,hora,descricao) VALUES($1,$2,$3,$4,$5,$6,$7)", [oid,cIds[a.c],vIds[a.v],a.titulo,a.data,a.hora,a.desc]);
  }
  console.log(`✅ ${AGENDA.length} agendamentos`);

  // Lembretes
  for (const l of LEMBRETES) {
    await run("INSERT INTO lembretes(oficina_id,veiculo_id,tipo,descricao,data_previsao,km_previsao) VALUES($1,$2,$3,$4,$5,$6)", [oid,vIds[l.v],l.tipo,l.desc,l.data,l.km]);
  }
  console.log(`✅ ${LEMBRETES.length} lembretes`);

  // Atualiza logo e dados da oficina
  await run("UPDATE oficinas SET nome='Oficina Mecânica Teste', responsavel='Wallace Santos', telefone='(00)00000-0000', whatsapp='(00)00000-0000', endereco='Rua 000, 000 — Bairro ABC', segmento='carro' WHERE id=$1", [oid]);

  console.log('\n🎉 Seed concluído!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  💰 Faturamento total: R$ ${totalFat.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
  console.log(`  📋 OS finalizadas:    ${osCount}`);
  console.log(`  🔧 OS em andamento:   ${OS_ANDAMENTO.length}`);
  console.log(`  📄 Orçamentos:        ${ORCAMENTOS.length}`);
  console.log(`  👥 Clientes:          ${CLIENTES.length}`);
  console.log(`  🚗 Veículos:          ${VEICULOS.length}`);
  console.log(`  📦 Estoque:           ${ESTOQUE.length} itens`);
  console.log(`  💸 Despesas:          ${DESPESAS.length}`);
  console.log(`  📅 Agenda:            ${AGENDA.length} compromissos`);
  console.log(`  🔔 Lembretes:         ${LEMBRETES.length}`);
  console.log(`  🏭 Fornecedores:      ${FORNECEDORES.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await pool.end();
}

module.exports = seed;
if (require.main === module) {
  seed().catch(err => { console.error('❌', err.message); process.exit(1); });
}
