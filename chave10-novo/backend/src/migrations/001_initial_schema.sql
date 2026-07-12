-- Migration 001: Schema inicial do Chave 10
-- Este arquivo documenta o schema base que já existe em produção.
-- Foi criado retroativamente para registrar o estado inicial no sistema de migrations.
-- NÃO executa CREATE TABLE sem IF NOT EXISTS para ser idempotente.

-- Tabelas base (já criadas pelo initDB)
CREATE TABLE IF NOT EXISTS oficinas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  responsavel TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT UNIQUE NOT NULL,
  plano TEXT DEFAULT 'mensal',
  status_assinatura TEXT DEFAULT 'pending'
    CHECK(status_assinatura IN ('active','pending','overdue','blocked')),
  data_vencimento TEXT,
  data_criacao TEXT DEFAULT CURRENT_DATE,
  observacoes TEXT,
  logo TEXT,
  endereco TEXT,
  require_signature BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER REFERENCES oficinas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  perfil TEXT DEFAULT 'funcionario'
    CHECK(perfil IN ('master_admin','admin_oficina','funcionario')),
  ativo INTEGER DEFAULT 1,
  ultimo_acesso TEXT
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  valor REAL NOT NULL,
  data_pagamento TEXT NOT NULL,
  novo_vencimento TEXT NOT NULL,
  forma_pagamento TEXT DEFAULT 'pix'
    CHECK(forma_pagamento IN ('pix','dinheiro','transferencia')),
  observacao TEXT,
  confirmado_por TEXT
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  obs TEXT,
  endereco TEXT,
  data_criacao TEXT DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS veiculos (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  placa TEXT,
  modelo TEXT,
  marca TEXT,
  ano TEXT,
  km TEXT
);

CREATE TABLE IF NOT EXISTS ordens_servico (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  servicos TEXT,
  pecas TEXT,
  pecas_itens TEXT,
  valor_mo REAL DEFAULT 0,
  valor_pecas REAL DEFAULT 0,
  valor REAL DEFAULT 0,
  status TEXT DEFAULT 'em_andamento'
    CHECK(status IN ('em_andamento','finalizado')),
  data TEXT DEFAULT CURRENT_DATE,
  observacao TEXT,
  numero TEXT
);

CREATE TABLE IF NOT EXISTS lembretes (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'outro',
  descricao TEXT NOT NULL,
  data_previsao TEXT,
  km_previsao TEXT,
  visto INTEGER DEFAULT 0,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estoque (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'peca',
  tipo TEXT, marca TEXT, aplicacao TEXT,
  quantidade INTEGER DEFAULT 0,
  estoque_min INTEGER DEFAULT 0,
  preco REAL DEFAULT 0,
  data_compra TEXT, obs TEXT, codigo_barras TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS despesas (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT DEFAULT 'Outros',
  valor REAL NOT NULL,
  data TEXT NOT NULL,
  vencimento TEXT,
  pago INTEGER DEFAULT 0,
  obs TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
  numero TEXT, descricao TEXT, servicos TEXT, pecas TEXT, pecas_itens TEXT,
  valor_mo REAL DEFAULT 0,
  valor_pecas REAL DEFAULT 0,
  desconto REAL DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  validade TEXT, obs TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  approval_status TEXT DEFAULT 'pending'
    CHECK(approval_status IN ('pending','approved','rejected','expired')),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS agenda (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL, data TEXT NOT NULL, hora TEXT,
  descricao TEXT, criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagamentos_os (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  os_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  forma TEXT NOT NULL CHECK(forma IN ('pix','dinheiro','debito','credito')),
  valor_total REAL NOT NULL, parcelas INTEGER DEFAULT 1,
  bandeira TEXT, taxa_maquininha REAL DEFAULT 0,
  valor_liquido REAL NOT NULL, valor_parcela REAL,
  data_pagamento TEXT NOT NULL, observacao TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parcelas_receber (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  pagamento_os_id INTEGER NOT NULL REFERENCES pagamentos_os(id) ON DELETE CASCADE,
  os_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  numero_parcela INTEGER NOT NULL,
  valor REAL NOT NULL,
  data_recebimento TEXT NOT NULL,
  recebido INTEGER DEFAULT 0,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email     ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_oficina   ON usuarios(oficina_id);
CREATE INDEX IF NOT EXISTS idx_clientes_oficina   ON clientes(oficina_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_oficina   ON veiculos(oficina_id);
CREATE INDEX IF NOT EXISTS idx_os_oficina         ON ordens_servico(oficina_id);
CREATE INDEX IF NOT EXISTS idx_os_status          ON ordens_servico(oficina_id, status);
CREATE INDEX IF NOT EXISTS idx_os_data            ON ordens_servico(oficina_id, data);
CREATE INDEX IF NOT EXISTS idx_lembretes_oficina  ON lembretes(oficina_id, data_previsao);
CREATE INDEX IF NOT EXISTS idx_estoque_oficina    ON estoque(oficina_id);
CREATE INDEX IF NOT EXISTS idx_despesas_oficina   ON despesas(oficina_id, data);
CREATE INDEX IF NOT EXISTS idx_orcamentos_oficina ON orcamentos(oficina_id);
CREATE INDEX IF NOT EXISTS idx_agenda_oficina     ON agenda(oficina_id, data);
CREATE INDEX IF NOT EXISTS idx_pagos_oficina      ON pagamentos_os(oficina_id, data_pagamento);
CREATE INDEX IF NOT EXISTS idx_parcelas_oficina   ON parcelas_receber(oficina_id, data_recebimento);
CREATE INDEX IF NOT EXISTS idx_oficinas_status    ON oficinas(status_assinatura);
