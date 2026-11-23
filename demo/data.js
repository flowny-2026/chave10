// ===== DATA LAYER (localStorage) =====

const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('of_' + key)) || []; }
    catch { return []; }
  },
  set(key, val) { localStorage.setItem('of_' + key, JSON.stringify(val)); },
  nextId(key) {
    const items = this.get(key);
    return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
  }
};

const Clientes = {
  all: () => DB.get('clientes'),
  get: (id) => DB.get('clientes').find(c => c.id === id),
  save(data) {
    const list = DB.get('clientes');
    if (data.id) { list[list.findIndex(c => c.id === data.id)] = data; }
    else { data.id = DB.nextId('clientes'); data.criadoEm = new Date().toISOString(); list.push(data); }
    DB.set('clientes', list); return data;
  },
  delete(id) { DB.set('clientes', DB.get('clientes').filter(c => c.id !== id)); }
};

const Veiculos = {
  all: () => DB.get('veiculos'),
  get: (id) => DB.get('veiculos').find(v => v.id === id),
  byCliente: (clienteId) => DB.get('veiculos').filter(v => v.clienteId === clienteId),
  save(data) {
    const list = DB.get('veiculos');
    if (data.id) { list[list.findIndex(v => v.id === data.id)] = data; }
    else { data.id = DB.nextId('veiculos'); data.criadoEm = new Date().toISOString(); list.push(data); }
    DB.set('veiculos', list); return data;
  },
  delete(id) { DB.set('veiculos', DB.get('veiculos').filter(v => v.id !== id)); }
};

const Ordens = {
  all: () => DB.get('ordens'),
  get: (id) => DB.get('ordens').find(o => o.id === id),
  byVeiculo: (veiculoId) => DB.get('ordens').filter(o => o.veiculoId === veiculoId),
  save(data) {
    const list = DB.get('ordens');
    if (data.id) { list[list.findIndex(o => o.id === data.id)] = data; }
    else { data.id = DB.nextId('ordens'); data.numero = String(data.id).padStart(4,'0'); data.criadoEm = new Date().toISOString(); list.push(data); }
    DB.set('ordens', list); return data;
  },
  delete(id) { DB.set('ordens', DB.get('ordens').filter(o => o.id !== id)); }
};

const Lembretes = {
  all: () => DB.get('lembretes'),
  get: (id) => DB.get('lembretes').find(l => l.id === id),
  save(data) {
    const list = DB.get('lembretes');
    if (data.id) { list[list.findIndex(l => l.id === data.id)] = data; }
    else { data.id = DB.nextId('lembretes'); data.criadoEm = new Date().toISOString(); list.push(data); }
    DB.set('lembretes', list); return data;
  },
  delete(id) { DB.set('lembretes', DB.get('lembretes').filter(l => l.id !== id)); }
};

const Orcamentos = {
  all: () => DB.get('orcamentos'),
  get: (id) => DB.get('orcamentos').find(o => o.id === id),
  save(data) {
    const list = DB.get('orcamentos');
    if (data.id) { list[list.findIndex(o => o.id === data.id)] = data; }
    else { data.id = DB.nextId('orcamentos'); data.numero = 'ORC-' + String(data.id).padStart(4,'0'); data.criadoEm = new Date().toISOString(); list.push(data); }
    DB.set('orcamentos', list); return data;
  },
  delete(id) { DB.set('orcamentos', DB.get('orcamentos').filter(o => o.id !== id)); }
};

const Despesas = {
  all: () => DB.get('despesas'),
  get: (id) => DB.get('despesas').find(d => d.id === id),
  save(data) {
    const list = DB.get('despesas');
    if (data.id) { list[list.findIndex(d => d.id === data.id)] = data; }
    else { data.id = DB.nextId('despesas'); data.criadoEm = new Date().toISOString(); list.push(data); }
    DB.set('despesas', list); return data;
  },
  delete(id) { DB.set('despesas', DB.get('despesas').filter(d => d.id !== id)); }
};

const Estoque = {
  all: () => DB.get('estoque'),
  get: (id) => DB.get('estoque').find(i => i.id === id),
  byCategoria: (cat) => DB.get('estoque').filter(i => i.categoria === cat),
  save(data) {
    const list = DB.get('estoque');
    if (data.id) { list[list.findIndex(i => i.id === data.id)] = data; }
    else { data.id = DB.nextId('estoque'); data.criadoEm = new Date().toISOString(); list.push(data); }
    DB.set('estoque', list); return data;
  },
  delete(id) { DB.set('estoque', DB.get('estoque').filter(i => i.id !== id)); }
};

const Meta = {
  get() { try { return JSON.parse(localStorage.getItem('of_meta')) || { valor: 0 }; } catch { return { valor: 0 }; } },
  set(val) { localStorage.setItem('of_meta', JSON.stringify({ valor: val })); }
};

const Oficina = {
  get() { try { return JSON.parse(localStorage.getItem('of_oficina')) || {}; } catch { return {}; } },
  set(data) { localStorage.setItem('of_oficina', JSON.stringify(data)); }
};

const MsgHistorico = {
  all() { try { return JSON.parse(localStorage.getItem('of_msg_hist')) || []; } catch { return []; } },
  add(item) {
    const list = this.all();
    item.id = Date.now();
    list.push(item);
    if (list.length > 100) list.splice(0, list.length - 100);
    localStorage.setItem('of_msg_hist', JSON.stringify(list));
  },
  clear() { localStorage.removeItem('of_msg_hist'); }
};

// ===== SEED DEMO DATA =====
function seedDemoData() {
  const SEED_VERSION = '5';
  if (localStorage.getItem('of_seed_v') === SEED_VERSION) return;
  ['clientes','veiculos','ordens','lembretes','orcamentos'].forEach(k => localStorage.removeItem('of_' + k));
  localStorage.setItem('of_seed_v', SEED_VERSION);

  const d = (n) => { const dt = new Date(); dt.setDate(dt.getDate() - n); return dt.toISOString().split('T')[0]; };

  const c1  = Clientes.save({ nome: 'João Silva',       telefone: '(11) 99999-1234', email: 'joao@email.com',     obs: 'Cliente fiel desde 2020' });
  const c2  = Clientes.save({ nome: 'Maria Souza',      telefone: '(11) 98888-5678', email: 'maria@email.com',    obs: '' });
  const c3  = Clientes.save({ nome: 'Carlos Pereira',   telefone: '(11) 97777-9012', email: '',                   obs: 'Prefere ligar antes' });
  const c4  = Clientes.save({ nome: 'Ana Lima',         telefone: '(11) 96666-3344', email: 'ana@email.com',      obs: '' });
  const c5  = Clientes.save({ nome: 'Roberto Dias',     telefone: '(11) 95555-7788', email: '',                   obs: '' });
  const c6  = Clientes.save({ nome: 'Fernanda Costa',   telefone: '(11) 94444-1122', email: 'fernanda@email.com', obs: 'Tem dois carros' });
  const c7  = Clientes.save({ nome: 'Marcos Oliveira',  telefone: '(11) 93333-4455', email: '',                   obs: '' });
  const c8  = Clientes.save({ nome: 'Patrícia Mendes',  telefone: '(11) 92222-6677', email: 'patricia@email.com', obs: 'Paga no cartão' });
  const c9  = Clientes.save({ nome: 'Lucas Ferreira',   telefone: '(11) 91111-8899', email: 'lucas@email.com',    obs: '' });
  const c10 = Clientes.save({ nome: 'Juliana Rocha',    telefone: '(11) 90000-2233', email: '',                   obs: 'Indicação do João' });
  const c11 = Clientes.save({ nome: 'Eduardo Santos',   telefone: '(11) 98765-4321', email: 'edu@email.com',      obs: '' });
  const c12 = Clientes.save({ nome: 'Camila Alves',     telefone: '(11) 97654-3210', email: 'camila@email.com',   obs: 'Frota da empresa' });
  const c13 = Clientes.save({ nome: 'Rafael Nunes',     telefone: '(11) 96543-2109', email: '',                   obs: '' });
  const c14 = Clientes.save({ nome: 'Beatriz Carvalho', telefone: '(11) 95432-1098', email: 'bia@email.com',      obs: '' });
  const c15 = Clientes.save({ nome: 'Thiago Monteiro',  telefone: '(11) 94321-0987', email: 'thiago@email.com',   obs: 'Mecânico amigo' });

  const v1  = Veiculos.save({ marca: 'Chevrolet',  modelo: 'Onix',     ano: '2021', placa: 'ABC-1234', km: '45000', clienteId: c1.id });
  const v2  = Veiculos.save({ marca: 'Volkswagen', modelo: 'Gol',      ano: '2018', placa: 'DEF-5678', km: '82000', clienteId: c2.id });
  const v3  = Veiculos.save({ marca: 'Fiat',       modelo: 'Strada',   ano: '2022', placa: 'GHI-9012', km: '31000', clienteId: c3.id });
  const v4  = Veiculos.save({ marca: 'Toyota',     modelo: 'Corolla',  ano: '2020', placa: 'JKL-3456', km: '61000', clienteId: c4.id });
  const v5  = Veiculos.save({ marca: 'Ford',       modelo: 'Ka',       ano: '2019', placa: 'MNO-7890', km: '54000', clienteId: c5.id });
  const v6  = Veiculos.save({ marca: 'Honda',      modelo: 'Civic',    ano: '2022', placa: 'PQR-1357', km: '28000', clienteId: c6.id });
  const v7  = Veiculos.save({ marca: 'Hyundai',    modelo: 'HB20',     ano: '2020', placa: 'STU-2468', km: '47000', clienteId: c6.id });
  const v8  = Veiculos.save({ marca: 'Jeep',       modelo: 'Renegade', ano: '2021', placa: 'VWX-3691', km: '39000', clienteId: c7.id });
  const v9  = Veiculos.save({ marca: 'Renault',    modelo: 'Kwid',     ano: '2023', placa: 'YZA-4802', km: '12000', clienteId: c8.id });
  const v10 = Veiculos.save({ marca: 'Nissan',     modelo: 'Kicks',    ano: '2021', placa: 'BCD-5913', km: '33000', clienteId: c9.id });
  const v11 = Veiculos.save({ marca: 'Fiat',       modelo: 'Pulse',    ano: '2022', placa: 'EFG-6024', km: '22000', clienteId: c10.id });
  const v12 = Veiculos.save({ marca: 'Volkswagen', modelo: 'T-Cross',  ano: '2023', placa: 'HIJ-7135', km: '15000', clienteId: c11.id });
  const v13 = Veiculos.save({ marca: 'Chevrolet',  modelo: 'S10',      ano: '2019', placa: 'KLM-8246', km: '95000', clienteId: c12.id });
  const v14 = Veiculos.save({ marca: 'Toyota',     modelo: 'Hilux',    ano: '2020', placa: 'NOP-9357', km: '78000', clienteId: c12.id });
  const v15 = Veiculos.save({ marca: 'Ford',       modelo: 'Ranger',   ano: '2021', placa: 'QRS-0468', km: '52000', clienteId: c13.id });
  const v16 = Veiculos.save({ marca: 'Honda',      modelo: 'HR-V',     ano: '2022', placa: 'TUV-1579', km: '26000', clienteId: c14.id });
  const v17 = Veiculos.save({ marca: 'Hyundai',    modelo: 'Creta',    ano: '2021', placa: 'WXY-2680', km: '41000', clienteId: c15.id });
  const v18 = Veiculos.save({ marca: 'Fiat',       modelo: 'Toro',     ano: '2020', placa: 'ZAB-3791', km: '67000', clienteId: c1.id });
  const v19 = Veiculos.save({ marca: 'Volkswagen', modelo: 'Polo',     ano: '2023', placa: 'CDE-4802', km: '8000',  clienteId: c3.id });
  const v20 = Veiculos.save({ marca: 'Chevrolet',  modelo: 'Tracker',  ano: '2022', placa: 'FGH-5913', km: '19000', clienteId: c5.id });

  const os = [
    { c:c1.id,  v:v1.id,  prob:'Revisão completa 45.000 km',        serv:'Troca de óleo, filtros, velas, correia',   pecas:'Óleo 5W30, Filtros, Velas NGK, Correia', mo:'480', p:'620', st:'finalizado',   d:d(0)  },
    { c:c2.id,  v:v2.id,  prob:'Suspensão com barulho',             serv:'Troca de amortecedores dianteiros',        pecas:'Amortecedores Monroe par',               mo:'420', p:'680', st:'finalizado',   d:d(0)  },
    { c:c6.id,  v:v6.id,  prob:'Revisão 30.000 km',                 serv:'Revisão geral + troca de óleo',           pecas:'Óleo 0W20, Filtros, Velas',              mo:'450', p:'480', st:'finalizado',   d:d(1)  },
    { c:c8.id,  v:v9.id,  prob:'Troca de óleo e filtro',            serv:'Troca de óleo e filtro de óleo',          pecas:'Óleo 5W30, Filtro de óleo',              mo:'150', p:'120', st:'finalizado',   d:d(1)  },
    { c:c12.id, v:v13.id, prob:'Revisão 100.000 km — S10',          serv:'Revisão completa, correia, fluidos',      pecas:'Kit correia, fluidos, filtros',           mo:'780', p:'920', st:'finalizado',   d:d(1)  },
    { c:c7.id,  v:v8.id,  prob:'Freios dianteiros gastos',          serv:'Troca de discos e pastilhas dianteiros',  pecas:'Discos Fremax, Pastilhas Bosch',          mo:'320', p:'560', st:'finalizado',   d:d(2)  },
    { c:c9.id,  v:v10.id, prob:'Alinhamento e balanceamento',       serv:'Alinhamento 4 rodas + balanceamento',     pecas:'-',                                       mo:'220', p:'0',   st:'finalizado',   d:d(2)  },
    { c:c4.id,  v:v4.id,  prob:'Troca de óleo sintético',           serv:'Troca de óleo 0W20 + filtro',             pecas:'Óleo 0W20 Toyota, Filtro original',       mo:'160', p:'180', st:'finalizado',   d:d(3)  },
    { c:c15.id, v:v17.id, prob:'Motor com ruído ao acelerar',       serv:'Diagnóstico + troca de correia',          pecas:'Correia acessórios, tensor',              mo:'520', p:'380', st:'finalizado',   d:d(3)  },
    { c:c11.id, v:v12.id, prob:'Revisão 15.000 km',                 serv:'Revisão de garantia + troca de óleo',     pecas:'Óleo 5W30, Filtro',                       mo:'200', p:'160', st:'finalizado',   d:d(4)  },
    { c:c14.id, v:v16.id, prob:'Troca de correia dentada HR-V',     serv:'Troca de correia dentada + tensor',       pecas:'Kit correia Honda',                       mo:'480', p:'420', st:'finalizado',   d:d(4)  },
    { c:c14.id, v:v16.id, prob:'Troca de óleo e revisão',           serv:'Troca de óleo + revisão geral',           pecas:'Óleo 0W20, Filtros',                      mo:'250', p:'200', st:'finalizado',   d:d(7)  },
    { c:c3.id,  v:v3.id,  prob:'Freios traseiros barulhando',       serv:'Troca de pastilhas traseiras',            pecas:'Pastilhas Fras-le traseiras',             mo:'200', p:'200', st:'finalizado',   d:d(7)  },
    { c:c12.id, v:v14.id, prob:'Revisão Hilux 80.000 km',           serv:'Revisão completa diesel',                 pecas:'Óleo 5W40, Filtros, Correia',             mo:'820', p:'980', st:'finalizado',   d:d(7)  },
    { c:c6.id,  v:v7.id,  prob:'Suspensão dianteira com folga',     serv:'Troca de pivôs e buchas dianteiras',      pecas:'Kit pivôs, buchas poliuretano',           mo:'420', p:'360', st:'finalizado',   d:d(8)  },
    { c:c1.id,  v:v18.id, prob:'Revisão Toro 70.000 km',            serv:'Revisão completa + correia',              pecas:'Kit correia, filtros, fluidos',           mo:'680', p:'740', st:'finalizado',   d:d(9)  },
    { c:c2.id,  v:v2.id,  prob:'Elétrica — bateria fraca',          serv:'Troca de bateria + teste alternador',     pecas:'Bateria Moura 60Ah',                      mo:'130', p:'420', st:'finalizado',   d:d(9)  },
    { c:c7.id,  v:v8.id,  prob:'Revisão 40.000 km Renegade',        serv:'Revisão completa + troca de óleo',        pecas:'Óleo 0W20, Filtros, Velas',              mo:'450', p:'420', st:'finalizado',   d:d(10) },
    { c:c5.id,  v:v5.id,  prob:'Correia dentada',                   serv:'Troca de correia dentada + tensor',       pecas:'Kit correia Gates',                       mo:'380', p:'320', st:'finalizado',   d:d(11) },
    { c:c4.id,  v:v4.id,  prob:'Injeção eletrônica — luz acesa',    serv:'Diagnóstico + limpeza de injetores',      pecas:'Kit limpeza injetores',                   mo:'350', p:'180', st:'finalizado',   d:d(12) },
    { c:c4.id,  v:v4.id,  prob:'Revisão 65.000 km Corolla',         serv:'Revisão completa + troca de óleo',        pecas:'Óleo 0W20, Filtros, Velas',              mo:'520', p:'480', st:'finalizado',   d:d(14) },
    { c:c13.id, v:v15.id, prob:'Troca de óleo diesel',              serv:'Troca de óleo + filtros diesel',          pecas:'Óleo 5W40 diesel, Filtros',               mo:'220', p:'200', st:'finalizado',   d:d(14) },
    { c:c10.id, v:v11.id, prob:'Freios dianteiros',                 serv:'Troca de pastilhas dianteiras',           pecas:'Pastilhas Bosch',                         mo:'200', p:'190', st:'finalizado',   d:d(15) },
    { c:c14.id, v:v16.id, prob:'Suspensão traseira',                serv:'Troca de amortecedores traseiros',        pecas:'Amortecedores Monroe traseiros',          mo:'380', p:'620', st:'finalizado',   d:d(16) },
    { c:c6.id,  v:v6.id,  prob:'Limpeza de bicos injetores',        serv:'Limpeza de injetores + diagnóstico',      pecas:'Kit limpeza injetores',                   mo:'320', p:'160', st:'finalizado',   d:d(17) },
    { c:c9.id,  v:v10.id, prob:'Revisão 35.000 km Kicks',           serv:'Revisão completa',                        pecas:'Óleo, filtros, velas',                    mo:'420', p:'380', st:'finalizado',   d:d(18) },
    { c:c5.id,  v:v5.id,  prob:'Embreagem patinando — Ka',          serv:'Troca de kit de embreagem',               pecas:'Kit embreagem LUK',                       mo:'580', p:'680', st:'finalizado',   d:d(19) },
    { c:c5.id,  v:v20.id, prob:'Revisão 20.000 km Tracker',         serv:'Revisão + troca de óleo',                 pecas:'Óleo 0W20, Filtros',                      mo:'340', p:'300', st:'finalizado',   d:d(21) },
    { c:c15.id, v:v17.id, prob:'Freios dianteiros Creta',           serv:'Troca de discos e pastilhas',             pecas:'Discos Fremax, Pastilhas Bosch',          mo:'300', p:'480', st:'finalizado',   d:d(22) },
    { c:c13.id, v:v15.id, prob:'Suspensão Ranger',                  serv:'Troca de buchas e barra estabilizadora',  pecas:'Kit suspensão Ranger',                    mo:'560', p:'640', st:'finalizado',   d:d(23) },
    { c:c6.id,  v:v7.id,  prob:'Revisão 50.000 km HB20',            serv:'Revisão completa + correia',              pecas:'Kit correia, filtros, velas',             mo:'460', p:'420', st:'finalizado',   d:d(25) },
    { c:c1.id,  v:v1.id,  prob:'Barulho na suspensão dianteira',    serv:'Diagnóstico em andamento',                pecas:'-',                                       mo:'420', p:'350', st:'em_andamento', d:d(0)  },
    { c:c12.id, v:v14.id, prob:'Revisão Hilux — troca de correia',  serv:'Troca de correia dentada diesel',         pecas:'Kit correia Hilux',                       mo:'780', p:'820', st:'em_andamento', d:d(0)  },
    { c:c7.id,  v:v8.id,  prob:'Elétrica — central multimídia',     serv:'Diagnóstico elétrico',                    pecas:'-',                                       mo:'250', p:'0',   st:'em_andamento', d:d(0)  },
  ];
  os.forEach(o => Ordens.save({ clienteId:o.c, veiculoId:o.v, problema:o.prob, servicos:o.serv, pecas:o.pecas, valorMO:o.mo, valorPecas:o.p, status:o.st, data:o.d }));

  Lembretes.save({ veiculoId: v1.id,  tipo:'oleo',   descricao:'Próxima troca de óleo — Onix',  dataPrevisao:'2026-06-15', kmPrevisao:'50000' });
  Lembretes.save({ veiculoId: v2.id,  tipo:'revisao',descricao:'Revisão dos 90.000 km — Gol',   dataPrevisao:'2026-04-01', kmPrevisao:'90000' });
  Lembretes.save({ veiculoId: v13.id, tipo:'revisao',descricao:'Revisão 100.000 km — S10',      dataPrevisao:'2026-03-20', kmPrevisao:'100000' });
  Lembretes.save({ veiculoId: v4.id,  tipo:'oleo',   descricao:'Troca de óleo — Corolla',       dataPrevisao:'2026-03-10', kmPrevisao:'70000' });

  Meta.set(40000);
}
