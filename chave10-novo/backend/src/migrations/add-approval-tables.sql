-- Migration: Add Budget Approval Workflow Tables
-- Created: 2026-06-09

-- Table: approval_links
-- Stores generated approval links and their metadata
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

CREATE INDEX IF NOT EXISTS idx_approval_links_token ON approval_links(token);
CREATE INDEX IF NOT EXISTS idx_approval_links_orcamento ON approval_links(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_approval_links_expires ON approval_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_approval_links_oficina ON approval_links(oficina_id);

-- Table: approval_link_accesses
-- Tracks each access to approval links for analytics and security
CREATE TABLE IF NOT EXISTS approval_link_accesses (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES approval_links(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_link_accesses_link ON approval_link_accesses(link_id);
CREATE INDEX IF NOT EXISTS idx_link_accesses_time ON approval_link_accesses(accessed_at);

-- Table: approval_actions
-- Audit trail for all approval-related actions
CREATE TABLE IF NOT EXISTS approval_actions (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  link_id INTEGER REFERENCES approval_links(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK(action_type IN (
    'link_generated',
    'link_sent',
    'link_accessed',
    'approved',
    'rejected',
    'expired',
    'regenerated'
  )),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performed_by_user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  client_ip_address INET,
  metadata JSONB,
  link_token TEXT
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_orcamento ON approval_actions(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_type ON approval_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_approval_actions_time ON approval_actions(performed_at DESC);

-- Table: budget_signatures
-- Stores digital signatures captured during approval
CREATE TABLE IF NOT EXISTS budget_signatures (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_budget_signatures_orcamento ON budget_signatures(orcamento_id);

-- Modify orcamentos table: add approval columns
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
  CHECK(approval_status IN ('pending', 'approved', 'rejected', 'expired'));
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orcamentos_approval_status ON orcamentos(oficina_id, approval_status);

-- Modify oficinas table: add signature requirement config
ALTER TABLE oficinas ADD COLUMN IF NOT EXISTS require_signature BOOLEAN DEFAULT false;

-- Success message
SELECT 'Budget Approval Workflow tables created successfully' AS result;
