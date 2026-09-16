-- Migration 004: Módulo de Mecânicos e Comissões
-- Adiciona suporte a mecânicos como perfil de usuário com
-- comissões calculadas automaticamente nas OS.

-- ─────────────────────────────────────────────────────────────
-- 1. Estender perfis na tabela usuarios
--    Adiciona 'mecanico' como perfil válido
-- ─────────────────────────────────────────────────────────────
-- NOTA: O CHECK constraint existente precisa ser atualizado.
-- Como ALTER TABLE ... ALTER COLUMN ... não é direto em Postgres para constraints,
-- fazemos drop e recreate com nome explícito.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_perfil_check
  CHECK(perfil IN ('master_admin','admin_oficina','funcionario','mecanico'));

-- ─────────────────────────────────────────────────────────────
-- 2. Tabela de configuração de comissões por mecânico
--    Armazena percentuais VIGENTES de cada mecânico
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mecanico_comissao_config (
  id                  SERIAL PRIMARY KEY,
  oficina_id          INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  mecanico_id         INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Configuração de comissão
  recebe_servicos     BOOLEAN DEFAULT true,  -- recebe comissão de mão de obra?
  recebe_pecas        BOOLEAN DEFAULT false, -- recebe comissão de peças?
  pct_servicos        NUMERIC(5,2) DEFAULT 0.00 CHECK(pct_servicos >= 0 AND pct_servicos <= 100),
  pct_pecas           NUMERIC(5,2) DEFAULT 0.00 CHECK(pct_pecas >= 0 AND pct_pecas <= 100),

  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(mecanico_id) -- um mecânico tem apenas um registro de config
);

CREATE INDEX IF NOT EXISTS idx_mecanico_comissao_config_oficina ON mecanico_comissao_config(oficina_id);
CREATE INDEX IF NOT EXISTS idx_mecanico_comissao_config_mec ON mecanico_comissao_config(mecanico_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Vincular mecânico às OS
--    Campos adicionados na tabela ordens_servico
-- ─────────────────────────────────────────────────────────────
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS
  mecanico_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

-- Preserva histórico: percentuais gravados no momento da OS
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS
  mecanico_pct_servicos NUMERIC(5,2) DEFAULT NULL;

ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS
  mecanico_pct_pecas NUMERIC(5,2) DEFAULT NULL;

-- Valores calculados no momento da OS (imutáveis depois)
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS
  mecanico_comissao_servicos NUMERIC(12,2) DEFAULT NULL;

ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS
  mecanico_comissao_pecas NUMERIC(12,2) DEFAULT NULL;

ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS
  mecanico_comissao_total NUMERIC(12,2) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_os_mecanico ON ordens_servico(mecanico_id);
CREATE INDEX IF NOT EXISTS idx_os_mecanico_oficina ON ordens_servico(mecanico_id, oficina_id);

-- ─────────────────────────────────────────────────────────────
-- 4. Tabela de registros de comissão (histórico por OS)
--    Status: pendente → aprovada → paga | cancelada
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comissoes (
  id                  SERIAL PRIMARY KEY,
  oficina_id          INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  mecanico_id         INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  os_id               INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,

  -- Snapshot dos percentuais usados (histórico imutável)
  pct_servicos        NUMERIC(5,2) NOT NULL DEFAULT 0,
  pct_pecas           NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Valores calculados
  base_servicos       NUMERIC(12,2) NOT NULL DEFAULT 0, -- valor_mo da OS
  base_pecas          NUMERIC(12,2) NOT NULL DEFAULT 0, -- valor_pecas da OS
  valor_servicos      NUMERIC(12,2) NOT NULL DEFAULT 0, -- base_servicos * pct_servicos / 100
  valor_pecas         NUMERIC(12,2) NOT NULL DEFAULT 0, -- base_pecas * pct_pecas / 100
  valor_total         NUMERIC(12,2) NOT NULL DEFAULT 0, -- valor_servicos + valor_pecas

  -- Ciclo de vida
  status              TEXT NOT NULL DEFAULT 'pendente'
    CHECK(status IN ('pendente','aprovada','paga','cancelada')),

  -- Metadados de auditoria
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aprovado_em         TIMESTAMPTZ,
  aprovado_por        INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  pago_em             TIMESTAMPTZ,
  pago_por            INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  cancelado_em        TIMESTAMPTZ,
  cancelado_por       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  obs                 TEXT,

  -- Impede duplicata por OS+mecânico
  UNIQUE(os_id, mecanico_id)
);

CREATE INDEX IF NOT EXISTS idx_comissoes_oficina ON comissoes(oficina_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_mecanico ON comissoes(mecanico_id, status);
CREATE INDEX IF NOT EXISTS idx_comissoes_os ON comissoes(os_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes(oficina_id, status);
CREATE INDEX IF NOT EXISTS idx_comissoes_criado ON comissoes(oficina_id, criado_em);
