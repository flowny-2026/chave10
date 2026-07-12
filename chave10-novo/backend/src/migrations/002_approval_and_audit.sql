-- Migration 002: Sistema de aprovação de orçamentos e auditoria
-- Criado retroativamente para registrar features adicionadas após o schema inicial.

-- Tabelas do módulo de aprovação
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

CREATE TABLE IF NOT EXISTS approval_link_accesses (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES approval_links(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

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

CREATE TABLE IF NOT EXISTS budget_signatures (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_ip_address INET
);

-- Índices de aprovação
CREATE INDEX IF NOT EXISTS idx_approval_links_token     ON approval_links(token);
CREATE INDEX IF NOT EXISTS idx_approval_links_orcamento ON approval_links(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_approval_links_expires   ON approval_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_approval_links_oficina   ON approval_links(oficina_id);
CREATE INDEX IF NOT EXISTS idx_link_accesses_link       ON approval_link_accesses(link_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_orcamento ON approval_actions(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_type    ON approval_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_approval_actions_time    ON approval_actions(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_sigs_orcamento    ON budget_signatures(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_approval      ON orcamentos(oficina_id, approval_status);

-- Sistema de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGSERIAL PRIMARY KEY,
  oficina_id   INTEGER REFERENCES oficinas(id) ON DELETE SET NULL,
  usuario_id   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nome  TEXT,
  usuario_email TEXT,
  perfil       TEXT,
  acao         TEXT NOT NULL,
  entidade     TEXT,
  entidade_id  INTEGER,
  detalhes     JSONB,
  resultado    TEXT NOT NULL DEFAULT 'sucesso'
                CHECK(resultado IN ('sucesso','falha')),
  severidade   TEXT NOT NULL DEFAULT 'info'
                CHECK(severidade IN ('info','aviso','alto','critico')),
  ip           TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_alerts (
  id           BIGSERIAL PRIMARY KEY,
  tipo         TEXT NOT NULL,
  severidade   TEXT NOT NULL DEFAULT 'alto'
                CHECK(severidade IN ('info','aviso','alto','critico')),
  ip           TEXT,
  usuario_id   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  oficina_id   INTEGER REFERENCES oficinas(id) ON DELETE SET NULL,
  detalhes     JSONB,
  resolvido    BOOLEAN NOT NULL DEFAULT false,
  resolvido_em TIMESTAMPTZ,
  resolvido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_oficina    ON audit_logs(oficina_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario    ON audit_logs(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_acao       ON audit_logs(acao, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created    ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severidade ON audit_logs(severidade, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_tipo           ON audit_alerts(tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severidade     ON audit_alerts(severidade, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_resolvido      ON audit_alerts(resolvido, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created        ON audit_alerts(created_at DESC);
