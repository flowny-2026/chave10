const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL em produção: aceita certificados auto-assinados por padrão.
  // O Render e a maioria dos provedores PaaS usam certificados que o Node.js
  // não reconhece como CA confiável. A conexão ainda usa TLS/SSL — apenas
  // a validação do certificado da CA é desativada.
  // Para forçar validação estrita, defina DATABASE_SSL_STRICT=true no ambiente.
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_STRICT === 'true' }
    : false,
  // Otimização: limita conexões para não estourar o plano free
  max: 10,                    // máx 10 conexões simultâneas (free tier suporta ~20)
  idleTimeoutMillis: 30000,   // fecha conexão ociosa após 30s
  connectionTimeoutMillis: 5000, // timeout de 5s para conectar
});

// Helper: executa query e retorna rows
async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

// Helper: executa query e retorna primeira row
async function queryOne(text, params) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}

// Helper: executa query sem retorno (INSERT/UPDATE/DELETE)
async function run(text, params) {
  const res = await pool.query(text, params);
  return res;
}

// Cria tabelas se não existirem
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oficinas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      responsavel TEXT,
      telefone TEXT,
      email TEXT UNIQUE NOT NULL,
      plano TEXT DEFAULT 'mensal',
      status_assinatura TEXT DEFAULT 'pending' CHECK(status_assinatura IN ('active','pending','overdue','blocked')),
      data_vencimento TEXT,
      data_criacao TEXT DEFAULT CURRENT_DATE,
      observacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      oficina_id INTEGER REFERENCES oficinas(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT DEFAULT 'funcionario' CHECK(perfil IN ('master_admin','admin_oficina','funcionario')),
      ativo INTEGER DEFAULT 1,
      ultimo_acesso TEXT
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id SERIAL PRIMARY KEY,
      oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
      valor REAL NOT NULL,
      data_pagamento TEXT NOT NULL,
      novo_vencimento TEXT NOT NULL,
      forma_pagamento TEXT DEFAULT 'pix' CHECK(forma_pagamento IN ('pix','dinheiro','transferencia')),
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
      status TEXT DEFAULT 'em_andamento' CHECK(status IN ('em_andamento','finalizado')),
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
      tipo TEXT,
      marca TEXT,
      aplicacao TEXT,
      quantidade INTEGER DEFAULT 0,
      estoque_min INTEGER DEFAULT 0,
      preco REAL DEFAULT 0,
      data_compra TEXT,
      obs TEXT,
      codigo_barras TEXT,
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
      numero TEXT,
      descricao TEXT,
      servicos TEXT,
      pecas TEXT,
      valor_mo REAL DEFAULT 0,
      valor_pecas REAL DEFAULT 0,
      desconto REAL DEFAULT 0,
      status TEXT DEFAULT 'pendente',
      validade TEXT,
      obs TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agenda (
      id SERIAL PRIMARY KEY,
      oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
      titulo TEXT NOT NULL,
      data TEXT NOT NULL,
      hora TEXT,
      descricao TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pagamentos_os (
      id SERIAL PRIMARY KEY,
      oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
      os_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      forma TEXT NOT NULL CHECK(forma IN ('pix','dinheiro','debito','credito')),
      valor_total REAL NOT NULL,
      parcelas INTEGER DEFAULT 1,
      bandeira TEXT,
      taxa_maquininha REAL DEFAULT 0,
      valor_liquido REAL NOT NULL,
      valor_parcela REAL,
      data_pagamento TEXT NOT NULL,
      observacao TEXT,
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
  `);

  // ── Migrations de features adicionais ───────────────────────
  // Tabelas do módulo de aprovação de orçamentos via link
  // Incluídas aqui para garantir que o banco esteja completo sem migration manual obrigatória.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_links (
      id SERIAL PRIMARY KEY,
      oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
      orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      sent_at TIMESTAMPTZ,
      invalidated_at TIMESTAMPTZ,
      access_count INTEGER DEFAULT 0,
      first_accessed_at TIMESTAMPTZ,
      last_accessed_at TIMESTAMPTZ
    );
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_link_accesses (
      id SERIAL PRIMARY KEY,
      link_id INTEGER NOT NULL REFERENCES approval_links(id) ON DELETE CASCADE,
      accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address INET,
      user_agent TEXT
    );
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_actions (
      id SERIAL PRIMARY KEY,
      oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
      orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
      link_id INTEGER REFERENCES approval_links(id) ON DELETE SET NULL,
      action_type TEXT NOT NULL CHECK(action_type IN (
        'link_generated','link_sent','link_accessed','approved','rejected','expired','regenerated'
      )),
      performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      performed_by_user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      client_ip_address INET,
      metadata JSONB,
      link_token TEXT
    );
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_signatures (
      id SERIAL PRIMARY KEY,
      oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
      orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
      signature_data TEXT NOT NULL,
      signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      client_ip_address INET
    );
  `).catch(() => {});

  // Colunas de aprovação em orcamentos e config em oficinas
  await pool.query(`
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'
      CHECK(approval_status IN ('pending','approved','rejected','expired'));
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE oficinas   ADD COLUMN IF NOT EXISTS require_signature BOOLEAN DEFAULT false;
  `).catch(() => {});

  // Índices das tabelas de aprovação
  const approvalIndices = [
    'CREATE INDEX IF NOT EXISTS idx_approval_links_token     ON approval_links(token)',
    'CREATE INDEX IF NOT EXISTS idx_approval_links_orcamento ON approval_links(orcamento_id)',
    'CREATE INDEX IF NOT EXISTS idx_approval_links_expires   ON approval_links(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_approval_links_oficina   ON approval_links(oficina_id)',
    'CREATE INDEX IF NOT EXISTS idx_link_accesses_link       ON approval_link_accesses(link_id)',
    'CREATE INDEX IF NOT EXISTS idx_approval_actions_orcamento ON approval_actions(orcamento_id)',
    'CREATE INDEX IF NOT EXISTS idx_approval_actions_type    ON approval_actions(action_type)',
    'CREATE INDEX IF NOT EXISTS idx_approval_actions_time    ON approval_actions(performed_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_budget_sigs_orcamento    ON budget_signatures(orcamento_id)',
    'CREATE INDEX IF NOT EXISTS idx_orcamentos_approval      ON orcamentos(oficina_id, approval_status)',
  ];
  for (const idx of approvalIndices) { await pool.query(idx).catch(() => {}); }

  // Migration: adiciona pecas_itens em orcamentos se não existir
  await pool.query(`
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS pecas_itens TEXT;
  `).catch(() => {});
  await pool.query(`ALTER TABLE oficinas ADD COLUMN IF NOT EXISTS logo TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE oficinas ADD COLUMN IF NOT EXISTS endereco TEXT;`).catch(() => {});
  await pool.query(`ALTER TABLE oficinas ADD COLUMN IF NOT EXISTS whatsapp TEXT;`).catch(() => {});

  // ── ÍNDICES para performance ──────────────────────────────
  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)',
    'CREATE INDEX IF NOT EXISTS idx_usuarios_oficina ON usuarios(oficina_id)',
    'CREATE INDEX IF NOT EXISTS idx_clientes_oficina ON clientes(oficina_id)',
    'CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(oficina_id, nome)',
    'CREATE INDEX IF NOT EXISTS idx_veiculos_oficina ON veiculos(oficina_id)',
    'CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos(cliente_id)',
    'CREATE INDEX IF NOT EXISTS idx_os_oficina ON ordens_servico(oficina_id)',
    'CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(oficina_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_os_data ON ordens_servico(oficina_id, data)',
    'CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente_id)',
    'CREATE INDEX IF NOT EXISTS idx_lembretes_oficina ON lembretes(oficina_id, data_previsao)',
    'CREATE INDEX IF NOT EXISTS idx_estoque_oficina ON estoque(oficina_id)',
    'CREATE INDEX IF NOT EXISTS idx_despesas_oficina ON despesas(oficina_id, data)',
    'CREATE INDEX IF NOT EXISTS idx_orcamentos_oficina ON orcamentos(oficina_id)',
    'CREATE INDEX IF NOT EXISTS idx_agenda_oficina ON agenda(oficina_id, data)',
    'CREATE INDEX IF NOT EXISTS idx_pagos_oficina ON pagamentos_os(oficina_id, data_pagamento)',
    'CREATE INDEX IF NOT EXISTS idx_parcelas_oficina ON parcelas_receber(oficina_id, data_recebimento)',
    'CREATE INDEX IF NOT EXISTS idx_oficinas_status ON oficinas(status_assinatura)',
  ];
  for (const idx of indices) { await pool.query(idx).catch(() => {}); }

  // Cria master_admin se não existir
  const admin = await queryOne("SELECT id FROM usuarios WHERE perfil = 'master_admin'");
  if (!admin) {
    // ⚠️  IMPORTANTE: defina MASTER_ADMIN_PASSWORD no .env antes do primeiro deploy.
    // Se não estiver definido, um aviso é emitido e a senha padrão INSEGURA é usada
    // apenas para ambiente de desenvolvimento. Em produção, troque via /api/admin/trocar-senha.
    const defaultPassword = process.env.MASTER_ADMIN_PASSWORD || 'admin123';
    if (process.env.NODE_ENV === 'production' && !process.env.MASTER_ADMIN_PASSWORD) {
      console.warn('⚠️  AVISO DE SEGURANÇA: MASTER_ADMIN_PASSWORD não definido. Troque a senha após o primeiro login!');
    }
    const hash = bcrypt.hashSync(defaultPassword, 12);
    await run(
      "INSERT INTO usuarios (oficina_id, nome, email, senha_hash, perfil) VALUES (NULL, 'Administrador', 'admin@chave10.com', $1, 'master_admin')",
      [hash]
    );
    console.log('✅ master_admin criado: admin@chave10.com');
    if (process.env.NODE_ENV !== 'production') {
      console.log('   Senha padrão de desenvolvimento: admin123');
    }
  }

  console.log('✅ Banco PostgreSQL inicializado');
}

module.exports = { pool, query, queryOne, run, initDB };
