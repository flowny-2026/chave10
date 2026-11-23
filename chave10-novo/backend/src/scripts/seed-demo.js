/**
 * seed-demo.js — Conta de demonstração completa
 * 100 clientes · 100 veículos · ~80 OS · 30 despesas · 20 recebimentos manuais (futuros até 1 ano)
 *
 * CLI:  node src/scripts/seed-demo.js
 * HTTP: GET /seed-demo?chave=SEED_KEY
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

const DEMO_EMAIL = 'teste@teste.com';
const DEMO_SENHA = 'demo1234';

// ── Helpers ──────────────────────────────────────────────────────────────────

const hoje = new Date();
const d = (offsetDias) => {
  const dt = new Date(hoje);
  dt.setDate(dt.getDate() + offsetDias);
  return dt.toISOString().split('T')[0];
};

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndFloat = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

// ── Dados base ────────────────────────────────────────────────────────────────

const NOMES = [
  'Carlos Eduardo Mendes','Fernanda Lima Souza','Roberto Alves Costa','Juliana Pereira Martins',
  'Marcos Antônio Ferreira','Patrícia Oliveira Santos','Diego Henrique Rocha','Aline Cristina Barbosa',
  'Gustavo Henrique Lopes','Ana Paula Rodrigues','Thiago de Souza Lima','Renata Carvalho Dias',
  'Felipe Santos Araújo','Camila Ferreira Nunes','Eduardo Melo Vieira','Bruna Costa Cardoso',
  'Lucas Pereira Gomes','Larissa Almeida Freitas','André Luiz Monteiro','Vanessa Martins Pinto',
  'Rafael Conceição Silva','Priscila Ramos Nogueira','Fábio Augusto Correia','Mônica Tavares Figueiredo',
  'Rodrigo Nunes Rezende','Daniela Borges Campos','Alexandre Cunha Medeiros','Jéssica Vieira Cardoso',
  'Leandro Moreira Batista','Tatiane Souza Pinheiro','Vinícius Castro Ribeiro','Mariana Lima Coelho',
  'Bruno Ferreira Duarte','Isabela Sousa Carvalho','Henrique Oliveira Bastos','Luana Pereira Farias',
  'Mateus Rodrigues Santana','Carla Mendes Teixeira','Gabriel Alves Barbosa','Natália Costa Martins',
  'Ricardo Dias Vasconcelos','Beatriz Lopes Andrade','Sérgio Matos Fernandes','Amanda Rocha Cavalcanti',
  'Davi Nascimento Araújo','Letícia Gomes Fonseca','Renan Oliveira Marques','Sabrina Cruz Albuquerque',
  'Jonatan Pereira Cardoso','Érika Ferreira Monteiro','Murilo Alves Carneiro','Débora Santos Aguiar',
  'Kaua Rodrigues Braga','Vitória Lima Carvalho','Igor Souza Medeiros','Nayara Freitas Torres',
  'Cauê Melo Rezende','Raíssa Costa Pires','Wellington Martins Falcão','Paloma Alves Melo',
  'Éverton Fernandes Couto','Simone Nunes Vasconcelos','Cleber Rocha Leal','Flávia Dias Santos',
  'Nilton Carvalho Bezerra','Adriana Ferreira Lima','Edmilson Pereira Faria','Rosângela Costa Prado',
  'Sanderson Melo Duarte','Conceição Araújo Gomes','Wanderlei Alves Nogueira','Terezinha Lima Moreira',
  'Joseilton Souza Cardoso','Miriam Ferreira Neto','Jaílton Martins Souza','Alessandra Rocha Pinto',
  'Gleison Pereira Ramos','Valdirene Costa Barreto','Eraldo Nunes Siqueira','Margarida Alves Cunha',
  'Cleverson Rodrigues Lopes','Aparecida Ferreira Dias','Elson Melo Barbosa','Neuza Santos Teixeira',
  'Rone Oliveira Carvalho','Lindinalva Lima Medeiros','Sirley Pereira Figueiredo','Genivaldo Costa Freire',
  'Creuza Martins Braga','Nerino Alves Bastos','Iracema Ferreira Coelho','Zé Carlos Rodrigues',
  'Benedita Lima Souza','Ozéias Melo Cardoso','Quitéria Santos Araújo','Laudelino Pereira Fonseca',
  'Heverton Costa Dias','Vanderlei Ferreira Nogueira','Terezinha Alves Rezende','Osmildo Rodrigues Melo',
];

const ENDERECOS = [
  'Rua das Acácias, 142 — Jardim Paulista','Av. Brasil, 890 — Centro','Rua Sete de Setembro, 55 — Vila Nova',
  'Rua das Palmeiras, 310 — Jardim Sumaré','Rua Boa Vista, 77 — Campos Elíseos','Av. Independência, 1200 — Alto da Boa Vista',
  'Rua Floriano Peixoto, 33 — Centro','Rua das Orquídeas, 88 — Jardim Botânico','Av. Getúlio Vargas, 450 — Bela Vista',
  'Rua XV de Novembro, 200 — Centro','Av. Paulista, 1000 — Jardim América','Rua dos Ipês, 55 — Nova Esperança',
  'Rua Tiradentes, 300 — Vila Olímpia','Av. das Nações, 750 — Jardim das Flores','Rua Visconde de Mauá, 180 — Ipiranga',
];

const MARCAS_MODELOS = [
  ['Chevrolet','Onix'],['Chevrolet','Onix Plus'],['Chevrolet','Tracker'],['Chevrolet','S10'],['Chevrolet','Spin'],
  ['Volkswagen','Gol'],['Volkswagen','Polo'],['Volkswagen','T-Cross'],['Volkswagen','Saveiro'],['Volkswagen','Virtus'],
  ['Fiat','Strada'],['Fiat','Argo'],['Fiat','Pulse'],['Fiat','Toro'],['Fiat','Uno'],
  ['Hyundai','HB20'],['Hyundai','Creta'],['Hyundai','ix35'],['Hyundai','Tucson'],['Hyundai','HB20S'],
  ['Toyota','Hilux'],['Toyota','Corolla'],['Toyota','Yaris'],['Toyota','SW4'],['Toyota','RAV4'],
  ['Honda','Civic'],['Honda','HR-V'],['Honda','Fit'],['Honda','CR-V'],['Honda','City'],
  ['Jeep','Compass'],['Jeep','Renegade'],['Jeep','Commander'],['Jeep','Wrangler'],
  ['Renault','Kwid'],['Renault','Sandero'],['Renault','Duster'],['Renault','Logan'],
  ['Ford','Ka'],['Ford','EcoSport'],['Ford','Ranger'],['Ford','Territory'],
  ['Nissan','Kicks'],['Nissan','Frontier'],['Nissan','Versa'],
  ['Mitsubishi','L200'],['Mitsubishi','Outlander'],['Mitsubishi','Eclipse Cross'],
  ['Peugeot','208'],['Peugeot','2008'],['Kia','Sportage'],['Kia','Cerato'],
];

const PLACAS_BASE = [
  'ABC','DEF','GHI','JKL','MNO','PQR','STU','VWX','YZA','BCD',
  'EFG','HIJ','KLM','NOP','QRS','TUV','WXY','ZAB','CDE','FGH',
];

const PROBLEMAS = [
  'Troca de óleo e filtros — revisão preventiva',
  'Barulho ao frear — verificação do sistema de freios',
  'Revisão dos 10.000 km',
  'Revisão dos 20.000 km',
  'Revisão dos 30.000 km',
  'Revisão dos 50.000 km',
  'Revisão dos 60.000 km',
  'Revisão dos 80.000 km',
  'Revisão dos 100.000 km',
  'Luz de injeção acesa no painel',
  'Superaquecimento do motor',
  'Suspensão com barulho — amortecedores',
  'Bateria fraca — dificuldade de partida',
  'Ar-condicionado não resfria',
  'Vazamento de óleo no motor',
  'Pneu furado — troca e balanceamento',
  'Alinhamento e balanceamento',
  'Troca de correia dentada',
  'Diagnóstico eletrônico',
  'Limpeza de bicos injetores',
  'Troca de embreagem',
  'Reparo na transmissão',
  'Troca de amortecedores dianteiros',
  'Troca de amortecedores traseiros',
  'Revisão do sistema elétrico',
  'Troca de palhetas e fluidos',
  'Revisão completa pré-viagem',
  'Troca de velas de ignição',
  'Reparo no sistema de arrefecimento',
  'Troca de pastilhas e discos de freio',
];

const SERVICOS = [
  'Troca de óleo 5W30, filtro de óleo e filtro de ar',
  'Substituição das pastilhas de freio dianteiras, sangria do fluido de freio',
  'Troca de óleo, filtros, velas de ignição e correia dentada',
  'Leitura de falhas com scanner, reset de erros, ajuste de injeção',
  'Substituição dos amortecedores dianteiros e traseiros, alinhamento',
  'Recarga do gás refrigerante R-134a, limpeza do filtro do ar-condicionado',
  'Troca da correia dentada, tensor e bomba d\'água',
  'Limpeza ultrassônica dos 4 bicos injetores, teste de vazão',
  'Troca das 4 velas de ignição, teste de compressão',
  'Substituição dos discos e pastilhas de freio, fluido DOT4',
  'Substituição da embreagem completa (disco, platô e rolamento)',
  'Revisão da caixa de câmbio, troca do óleo da transmissão',
  'Alinhamento a laser, balanceamento dos 4 pneus',
  'Revisão completa: 30 itens verificados',
  'Troca da bateria 60Ah, limpeza dos terminais',
];

const PECAS_POOL = [
  { nome: 'Filtro de óleo Bosch',          valor_unit: 28.90 },
  { nome: 'Filtro de ar Mann',              valor_unit: 35.50 },
  { nome: 'Pastilha de freio Fras-le',      valor_unit: 89.90 },
  { nome: 'Óleo motor 5W30 Mobil 1L',      valor_unit: 32.00 },
  { nome: 'Vela de ignição NGK',            valor_unit: 18.50 },
  { nome: 'Correia dentada Gates',          valor_unit: 145.00 },
  { nome: 'Fluido de freio DOT4 500ml',    valor_unit: 22.00 },
  { nome: 'Amortecedor Monroe dianteiro',  valor_unit: 320.00 },
  { nome: 'Palheta limpador Bosch 18"',    valor_unit: 42.00 },
  { nome: 'Bateria 60Ah Moura',            valor_unit: 480.00 },
  { nome: 'Disco de freio ventilado',      valor_unit: 165.00 },
  { nome: 'Rolamento de roda dianteiro',   valor_unit: 95.00 },
  { nome: 'Bomba d\'água original',        valor_unit: 210.00 },
  { nome: 'Tensor da correia dentada',     valor_unit: 88.00 },
  { nome: 'Filtro de combustível',         valor_unit: 45.00 },
  { nome: 'Vela glow (diesel)',            valor_unit: 65.00 },
  { nome: 'Óleo de câmbio ATF 1L',        valor_unit: 55.00 },
  { nome: 'Kit embreagem completo',        valor_unit: 580.00 },
  { nome: 'Cabo de vela NGK',             valor_unit: 72.00 },
  { nome: 'Sensor de oxigênio',           valor_unit: 185.00 },
];

const DESPESAS_BASE = [
  { descricao: 'Aluguel da oficina',          categoria: 'Aluguel',              valor: 3200.00 },
  { descricao: 'Conta de energia elétrica',   categoria: 'Energia',              valor: 480.50  },
  { descricao: 'Internet fibra 500MB',        categoria: 'Internet',             valor: 129.90  },
  { descricao: 'Conta de água',               categoria: 'Água',                 valor: 92.00   },
  { descricao: 'Folha de pagamento — João',   categoria: 'Folha de pagamento',   valor: 2200.00 },
  { descricao: 'Folha de pagamento — Pedro',  categoria: 'Folha de pagamento',   valor: 1900.00 },
  { descricao: 'Compra de peças — Bosch',     categoria: 'Peças/Estoque',        valor: 1850.00 },
  { descricao: 'Compra de lubrificantes',     categoria: 'Peças/Estoque',        valor: 740.00  },
  { descricao: 'Boleto financiamento elevador',categoria:'Boleto/Financiamento', valor: 850.00  },
  { descricao: 'Imposto DAS — Simples Nacional',categoria:'Impostos',           valor: 620.00  },
  { descricao: 'Material de limpeza',         categoria: 'Manutenção',           valor: 145.00  },
  { descricao: 'Ferramenta scanner automotivo',categoria:'Ferramentas',          valor: 320.00  },
  { descricao: 'Aluguel — próximo mês',       categoria: 'Aluguel',              valor: 3200.00 },
  { descricao: 'Energia — próxima fatura',    categoria: 'Energia',              valor: 460.00  },
  { descricao: 'Folha de pagamento — próximo mês', categoria:'Folha de pagamento', valor: 4100.00 },
  { descricao: 'Renovação do alvará',         categoria: 'Impostos',             valor: 390.00  },
  { descricao: 'Manutenção do compressor',    categoria: 'Manutenção',           valor: 280.00  },
  { descricao: 'Seguro da oficina',           categoria: 'Boleto/Financiamento', valor: 520.00  },
  { descricao: 'Google Ads — marketing digital',categoria:'Marketing',          valor: 400.00  },
  { descricao: 'Combustível da van de coleta',categoria: 'Combustível',          valor: 310.00  },
  { descricao: 'Peças — compra parcelada (2/4)',categoria:'Peças/Estoque',       valor: 625.00  },
  { descricao: 'IPTU do imóvel',              categoria: 'Impostos',             valor: 1200.00 },
  { descricao: 'Aluguel — daqui 2 meses',     categoria: 'Aluguel',              valor: 3200.00 },
  { descricao: 'Folha — daqui 2 meses',       categoria: 'Folha de pagamento',   valor: 4100.00 },
  { descricao: 'Peças — parcela 3/4',         categoria: 'Peças/Estoque',        valor: 625.00  },
  { descricao: 'Peças — parcela 4/4',         categoria: 'Peças/Estoque',        valor: 625.00  },
  { descricao: 'Aluguel — daqui 3 meses',     categoria: 'Aluguel',              valor: 3200.00 },
  { descricao: 'Aluguel — daqui 4 meses',     categoria: 'Aluguel',              valor: 3200.00 },
  { descricao: 'Aluguel — daqui 5 meses',     categoria: 'Aluguel',              valor: 3200.00 },
  { descricao: 'Aluguel — daqui 6 meses',     categoria: 'Aluguel',              valor: 3200.00 },
];

const RECEB_MANUAIS = [
  { descricao: 'Cheque pré-datado — Carlos Mendes (OS #0012)',         valor: 1850.00, offset: 15  },
  { descricao: 'Cheque pré-datado — Fernanda Lima (OS #0018)',          valor: 940.00,  offset: 22  },
  { descricao: 'Acordo parcelado — Roberto Costa (parcela 1/3)',        valor: 650.00,  offset: 30  },
  { descricao: 'Acordo parcelado — Roberto Costa (parcela 2/3)',        valor: 650.00,  offset: 60  },
  { descricao: 'Acordo parcelado — Roberto Costa (parcela 3/3)',        valor: 650.00,  offset: 90  },
  { descricao: 'Cheque — Marcos Ferreira (revisão Hilux)',              valor: 2200.00, offset: 10  },
  { descricao: 'Transferência agendada — Patrícia Santos',              valor: 780.00,  offset: 45  },
  { descricao: 'Acordo — Diego Rocha (1/4)',                            valor: 420.00,  offset: 30  },
  { descricao: 'Acordo — Diego Rocha (2/4)',                            valor: 420.00,  offset: 60  },
  { descricao: 'Acordo — Diego Rocha (3/4)',                            valor: 420.00,  offset: 90  },
  { descricao: 'Acordo — Diego Rocha (4/4)',                            valor: 420.00,  offset: 120 },
  { descricao: 'Cheque — Gustavo Lopes (serviço câmbio)',               valor: 3100.00, offset: 60  },
  { descricao: 'Parcelado — Ana Paula Rodrigues (1/2)',                 valor: 870.00,  offset: 30  },
  { descricao: 'Parcelado — Ana Paula Rodrigues (2/2)',                 valor: 870.00,  offset: 60  },
  { descricao: 'Cheque pré-datado — Thiago Lima',                      valor: 1250.00, offset: 90  },
  { descricao: 'Acordo de serviço — Renata Dias (1/3)',                 valor: 500.00,  offset: 30  },
  { descricao: 'Acordo de serviço — Renata Dias (2/3)',                 valor: 500.00,  offset: 150 },
  { descricao: 'Acordo de serviço — Renata Dias (3/3)',                 valor: 500.00,  offset: 270 },
  { descricao: 'Cheque — Felipe Araújo (revisão anual)',               valor: 1680.00, offset: 180 },
  { descricao: 'Acordo anual — Empresa Transportes XYZ (1/12)',         valor: 950.00,  offset: 365 },
];

// ── Seed principal ────────────────────────────────────────────────────────────

async function seed() {
  const pool = getPool();
  const q  = async (text, params) => (await pool.query(text, params)).rows;
  const q1 = async (text, params) => (await pool.query(text, params)).rows[0] || null;
  const run = async (text, params) => pool.query(text, params);

  console.log('Iniciando seed da conta demo...\n');

  // ── 1. Remove conta demo anterior ────────────────────────
  const usuarioExistente = await q1('SELECT id, oficina_id FROM usuarios WHERE email=$1', [DEMO_EMAIL]);
  if (usuarioExistente) {
    console.log('Removendo conta demo anterior...');
    if (usuarioExistente.oficina_id) {
      await run('DELETE FROM oficinas WHERE id=$1', [usuarioExistente.oficina_id]);
    }
    await run('DELETE FROM usuarios WHERE email=$1', [DEMO_EMAIL]);
  }

  // ── 2. Cria oficina ───────────────────────────────────────
  const oficina = await q1(
    `INSERT INTO oficinas(nome, responsavel, telefone, email, plano, status_assinatura, data_vencimento, endereco, logo)
     VALUES($1,$2,$3,$4,'mensal','active',$5,$6,$7) RETURNING id`,
    [
      'Oficina Mecânica Demo',
      'João da Silva',
      '(16) 99291-5540',
      DEMO_EMAIL,
      d(365),
      'Av. das Indústrias, 500 — Distrito Industrial, Ribeirão Preto — SP',
      null,
    ]
  );
  const oid = oficina.id;
  console.log(`Oficina criada (id: ${oid})`);

  // ── 3. Cria usuário ───────────────────────────────────────
  const hash = bcrypt.hashSync(DEMO_SENHA, 10);
  await q1(
    `INSERT INTO usuarios(oficina_id, nome, email, senha_hash, perfil, ativo)
     VALUES($1,'João da Silva',$2,$3,'admin_oficina',1) RETURNING id`,
    [oid, DEMO_EMAIL, hash]
  );
  console.log(`Usuario criado: ${DEMO_EMAIL} / ${DEMO_SENHA}`);

  // ── 4. Cria 100 clientes ──────────────────────────────────
  const clienteIds = [];
  for (let i = 0; i < 100; i++) {
    const nome = NOMES[i] || `Cliente Teste ${i + 1}`;
    const ddd  = rnd(['(11)','(16)','(21)','(31)','(41)','(51)','(61)','(71)','(81)','(85)']);
    const tel  = `${ddd} 9${rndInt(7000,9999)}-${rndInt(1000,9999)}`;
    const end  = rnd(ENDERECOS) + `, Ribeirão Preto — SP`;
    const r = await q1(
      `INSERT INTO clientes(oficina_id, nome, telefone, email, endereco) VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [oid, nome, tel, `cliente${i + 1}@email.com`, end]
    );
    clienteIds.push(r.id);
  }
  console.log(`${clienteIds.length} clientes criados`);

  // ── 5. Cria 100 veículos (1 por cliente) ─────────────────
  const veiculoIds = [];
  for (let i = 0; i < 100; i++) {
    const [marca, modelo] = rnd(MARCAS_MODELOS);
    const ano  = String(rndInt(2010, 2024));
    const km   = String(rndInt(5000, 180000));
    const idx  = i % PLACAS_BASE.length;
    const num  = String(rndInt(1000, 9999));
    const letra = String.fromCharCode(65 + rndInt(0, 25));
    const placa = `${PLACAS_BASE[idx]}${num}${letra}`;
    const r = await q1(
      `INSERT INTO veiculos(oficina_id, cliente_id, placa, modelo, marca, ano, km) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [oid, clienteIds[i], placa, modelo, marca, ano, km]
    );
    veiculoIds.push(r.id);
  }
  console.log(`${veiculoIds.length} veiculos criados`);

  // ── 6. Cria ~80 Ordens de Serviço ────────────────────────
  // 50 finalizadas (passado), 20 em andamento (recentes), 10 canceladas
  let osCount = 0;
  const osIds = [];

  // 50 OS finalizadas em datas passadas
  for (let i = 0; i < 50; i++) {
    const cli = i % 100;
    const vei = i % 100;
    const problema  = rnd(PROBLEMAS);
    const servico   = rnd(SERVICOS);
    const nPecas    = rndInt(0, 4);
    const pecasEscolhidas = [];
    for (let j = 0; j < nPecas; j++) {
      const p = rnd(PECAS_POOL);
      pecasEscolhidas.push({ nome: p.nome, qtd: rndInt(1, 3), valor_unit: p.valor_unit });
    }
    const valorPecas = pecasEscolhidas.reduce((s, p) => s + p.valor_unit * p.qtd, 0);
    const valorMO    = rndFloat(80, 600);
    const valor      = valorMO + valorPecas;
    const data       = d(-rndInt(5, 180));
    const numero     = String(osCount + 1).padStart(4, '0');
    const pecasTexto = pecasEscolhidas.map(p => `${p.qtd}x ${p.nome} (R$ ${p.valor_unit.toFixed(2)})`).join('\n');

    const r = await q1(
      `INSERT INTO ordens_servico(oficina_id, cliente_id, veiculo_id, descricao, servicos, pecas, pecas_itens,
         valor_mo, valor_pecas, valor, status, data, numero, data_conclusao)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'finalizado',$11,$12,NOW()) RETURNING id`,
      [oid, clienteIds[cli], veiculoIds[vei], problema, servico,
       pecasTexto || null, pecasEscolhidas.length ? JSON.stringify(pecasEscolhidas) : null,
       valorMO, Math.round(valorPecas * 100) / 100, Math.round(valor * 100) / 100,
       data, numero]
    );
    osIds.push(r.id);
    osCount++;

    // Registra pagamento para 40 das 50 OS finalizadas
    if (i < 40) {
      const forma = rnd(['pix','dinheiro','debito','credito','boleto']);
      const taxa  = (forma === 'credito' || forma === 'debito') ? rndFloat(1.5, 3.5) : 0;
      const valorLiq = Math.round(valor * (1 - taxa / 100) * 100) / 100;
      const parcelas = forma === 'credito' ? rndInt(1, 4) : 1;
      const boletoPendente = forma === 'boleto' && i >= 35; // últimas 5 boletos ainda pendentes

      await run(
        `INSERT INTO pagamentos_os(oficina_id, os_id, cliente_id, forma, valor_total, parcelas,
           taxa_maquininha, valor_liquido, valor_parcela, data_pagamento, boleto_vencimento, boleto_pendente)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [oid, r.id, clienteIds[cli], forma, Math.round(valor * 100) / 100, parcelas,
         taxa, valorLiq, Math.round(valorLiq / parcelas * 100) / 100,
         data, boletoPendente ? d(rndInt(1, 30)) : null, boletoPendente]
      );

      // Cria parcelas a receber para cartão de crédito
      if (forma === 'credito' && parcelas > 1) {
        const valorParc = Math.round(valorLiq / parcelas * 100) / 100;
        for (let p = 1; p <= parcelas; p++) {
          const dataReceb = new Date(data);
          dataReceb.setDate(dataReceb.getDate() + p * 30);
          await run(
            `INSERT INTO parcelas_receber(oficina_id, pagamento_os_id, os_id, cliente_id, numero_parcela, valor, data_recebimento, recebido)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [oid, r.id, r.id, clienteIds[cli], p, valorParc,
             dataReceb.toISOString().split('T')[0],
             dataReceb < hoje ? 1 : 0]
          );
        }
      }
    }
  }

  // 20 OS em andamento (abertas recentemente)
  for (let i = 0; i < 20; i++) {
    const cli = (i + 50) % 100;
    const vei = (i + 50) % 100;
    const problema = rnd(PROBLEMAS);
    const servico  = rnd(SERVICOS);
    const nPecas   = rndInt(0, 3);
    const pecasEscolhidas = [];
    for (let j = 0; j < nPecas; j++) {
      const p = rnd(PECAS_POOL);
      pecasEscolhidas.push({ nome: p.nome, qtd: rndInt(1, 2), valor_unit: p.valor_unit });
    }
    const valorPecas = pecasEscolhidas.reduce((s, p) => s + p.valor_unit * p.qtd, 0);
    const valorMO    = rndFloat(80, 600);
    const data       = d(-rndInt(0, 7));
    const numero     = String(osCount + 1).padStart(4, '0');
    const pecasTexto = pecasEscolhidas.map(p => `${p.qtd}x ${p.nome}`).join('\n');

    const r = await q1(
      `INSERT INTO ordens_servico(oficina_id, cliente_id, veiculo_id, descricao, servicos, pecas, pecas_itens,
         valor_mo, valor_pecas, valor, status, data, numero)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'em_andamento',$11,$12) RETURNING id`,
      [oid, clienteIds[cli], veiculoIds[vei], problema, servico,
       pecasTexto || null, pecasEscolhidas.length ? JSON.stringify(pecasEscolhidas) : null,
       valorMO, Math.round(valorPecas * 100) / 100, Math.round((valorMO + valorPecas) * 100) / 100,
       data, numero]
    );
    osIds.push(r.id);
    osCount++;
  }

  // 10 OS canceladas
  for (let i = 0; i < 10; i++) {
    const cli = (i + 70) % 100;
    const vei = (i + 70) % 100;
    const data   = d(-rndInt(10, 60));
    const numero = String(osCount + 1).padStart(4, '0');
    await q1(
      `INSERT INTO ordens_servico(oficina_id, cliente_id, veiculo_id, descricao, servicos,
         valor_mo, valor_pecas, valor, status, data, numero)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,'cancelada',$9,$10) RETURNING id`,
      [oid, clienteIds[cli], veiculoIds[vei], rnd(PROBLEMAS), '',
       0, 0, 0, data, numero]
    );
    osCount++;
  }

  console.log(`${osCount} ordens de servico criadas (50 finalizadas, 20 em andamento, 10 canceladas)`);

  // ── 7. Cria 30 despesas ───────────────────────────────────
  // Passadas pagas, passadas em atraso, futuras pendentes
  const despesasConfig = [
    // Pagas no passado
    { idx: 0,  datOffset: -30, vencOffset: -30, pago: 1 },
    { idx: 1,  datOffset: -15, vencOffset: -15, pago: 1 },
    { idx: 2,  datOffset: -10, vencOffset: -10, pago: 1 },
    { idx: 3,  datOffset: -25, vencOffset: -25, pago: 1 },
    { idx: 4,  datOffset: -30, vencOffset: -30, pago: 1 },
    { idx: 5,  datOffset: -30, vencOffset: -30, pago: 1 },
    { idx: 6,  datOffset: -20, vencOffset: -20, pago: 1 },
    { idx: 7,  datOffset: -20, vencOffset: -20, pago: 1 },
    { idx: 8,  datOffset: -30, vencOffset: -30, pago: 1 },
    { idx: 9,  datOffset: -30, vencOffset: -30, pago: 1 },
    // Em atraso (vencidas, não pagas)
    { idx: 10, datOffset: -20, vencOffset: -5,  pago: 0 },
    { idx: 11, datOffset: -15, vencOffset: -3,  pago: 0 },
    { idx: 1,  datOffset: -15, vencOffset: -1,  pago: 0 }, // energia venceu ontem
    // Vence hoje / amanhã
    { idx: 0,  datOffset: -30, vencOffset: 0,   pago: 0 }, // aluguel vence hoje
    { idx: 1,  datOffset: -15, vencOffset: 1,   pago: 0 }, // energia vence amanhã
    // Futuras (próximos 30 dias)
    { idx: 2,  datOffset: -5,  vencOffset: 5,   pago: 0 },
    { idx: 4,  datOffset: -5,  vencOffset: 7,   pago: 0 },
    { idx: 5,  datOffset: -5,  vencOffset: 10,  pago: 0 },
    { idx: 18, datOffset: -3,  vencOffset: 15,  pago: 0 },
    { idx: 19, datOffset: -3,  vencOffset: 20,  pago: 0 },
    // Futuras (próximos 60-90 dias)
    { idx: 12, datOffset: 0,   vencOffset: 30,  pago: 0 },
    { idx: 13, datOffset: 0,   vencOffset: 35,  pago: 0 },
    { idx: 14, datOffset: 0,   vencOffset: 35,  pago: 0 },
    { idx: 15, datOffset: 0,   vencOffset: 45,  pago: 0 },
    { idx: 20, datOffset: 0,   vencOffset: 60,  pago: 0 },
    // Futuras (3-6 meses)
    { idx: 21, datOffset: 0,   vencOffset: 90,  pago: 0 },
    { idx: 22, datOffset: 0,   vencOffset: 60,  pago: 0 },
    { idx: 23, datOffset: 0,   vencOffset: 65,  pago: 0 },
    { idx: 24, datOffset: 0,   vencOffset: 90,  pago: 0 },
    { idx: 25, datOffset: 0,   vencOffset: 120, pago: 0 },
  ];

  for (const cfg of despesasConfig) {
    const base = DESPESAS_BASE[cfg.idx];
    await run(
      `INSERT INTO despesas(oficina_id, descricao, categoria, valor, data, vencimento, pago)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [oid, base.descricao, base.categoria, base.valor, d(cfg.datOffset), d(cfg.vencOffset), cfg.pago]
    );
  }
  console.log(`${despesasConfig.length} despesas criadas`);

  // ── 8. Cria 20 recebimentos manuais ──────────────────────
  for (const rm of RECEB_MANUAIS) {
    await run(
      `INSERT INTO recebimentos_manuais(oficina_id, descricao, valor, vencimento, recebido)
       VALUES($1,$2,$3,$4,0)`,
      [oid, rm.descricao, rm.valor, d(rm.offset)]
    );
  }
  console.log(`${RECEB_MANUAIS.length} recebimentos manuais criados`);

  // ── 9. Estoque ────────────────────────────────────────────
  for (const p of PECAS_POOL) {
    await run(
      `INSERT INTO estoque(oficina_id, nome, categoria, quantidade, estoque_min, preco)
       VALUES($1,$2,'peca',$3,$4,$5)`,
      [oid, p.nome, rndInt(2, 25), rndInt(2, 5), p.valor_unit]
    );
  }
  console.log(`${PECAS_POOL.length} itens de estoque criados`);

  // ── 10. Agenda (próximos 15 dias) ─────────────────────────
  const titulos = [
    'Revisão agendada','Troca de óleo','Alinhamento e balanceamento','Diagnóstico eletrônico',
    'Retirada do veículo','Troca de pneus','Verificação de freios','Revisão pré-viagem',
    'Troca de correia','Limpeza de bicos',
  ];
  const horas = ['08:00','09:00','09:30','10:00','10:30','11:00','13:00','14:00','14:30','15:00','16:00'];
  for (let i = 0; i < 20; i++) {
    const cli = rndInt(0, 99);
    await run(
      `INSERT INTO agenda(oficina_id, cliente_id, veiculo_id, titulo, data, hora, descricao)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [oid, clienteIds[cli], veiculoIds[cli],
       `${rnd(titulos)} — ${NOMES[cli].split(' ')[0]}`,
       d(rndInt(0, 15)), rnd(horas),
       rnd(PROBLEMAS)]
    );
  }
  console.log('20 agendamentos criados');

  // ── 11. Lembretes ─────────────────────────────────────────
  const tiposLembrete = ['revisao','troca_oleo','seguro','ipva','manutencao','outro'];
  for (let i = 0; i < 15; i++) {
    const cli = rndInt(0, 99);
    await run(
      `INSERT INTO lembretes(oficina_id, veiculo_id, tipo, descricao, data_previsao)
       VALUES($1,$2,$3,$4,$5)`,
      [oid, veiculoIds[cli], rnd(tiposLembrete),
       rnd(PROBLEMAS),
       d(rndInt(-10, 90))]
    );
  }
  console.log('15 lembretes criados');

  // ── Resumo ────────────────────────────────────────────────
  console.log('\nConta demo criada com sucesso!');
  console.log('────────────────────────────────────────');
  console.log(`  Email:   ${DEMO_EMAIL}`);
  console.log(`  Senha:   ${DEMO_SENHA}`);
  console.log(`  Oficina: Oficina Mecanica Demo`);
  console.log(`  Clientes: 100  |  Veiculos: 100`);
  console.log(`  OS: ${osCount} (50 fin. / 20 andamento / 10 canceladas)`);
  console.log(`  Despesas: ${despesasConfig.length}  |  Receb. manuais: ${RECEB_MANUAIS.length}`);
  console.log('────────────────────────────────────────\n');

  await pool.end();
}

module.exports = seed;

if (require.main === module) {
  seed().catch(err => {
    console.error('Erro no seed:', err.message);
    process.exit(1);
  });
}
