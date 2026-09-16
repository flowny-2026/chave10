-- Migration 003: Fotos de OS e Orçamento Interativo
-- Fotos são associadas à OS (histórico do veículo), orçamento referencia quais exibir.

-- Tabela principal de fotos — associadas à OS (não ao orçamento)
-- Isso permite que as fotos façam parte do histórico do veículo
-- e possam ser reutilizadas em orçamentos, relatórios, etc.
CREATE TABLE IF NOT EXISTS os_fotos (
  id           SERIAL PRIMARY KEY,
  oficina_id   INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  os_id        INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  veiculo_id   INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,

  -- Metadata
  titulo       TEXT,                    -- ex: "Pastilha de freio desgastada"
  descricao    TEXT,                    -- descrição do problema visível na foto
  categoria    TEXT DEFAULT 'problema', -- problema | peca | servico | antes | depois
  posicao      INTEGER DEFAULT 0,      -- ordem de exibição

  -- Imagem comprimida (base64 ~100-300KB após compressão frontend)
  -- Preparado para migração futura: quando usar storage externo,
  -- este campo fica NULL e storage_url recebe a URL do S3/Supabase.
  imagem_base64 TEXT,
  storage_url   TEXT,                   -- futuro: URL do Supabase Storage / S3 / R2
  mime_type     TEXT DEFAULT 'image/jpeg',
  tamanho_bytes INTEGER,

  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_os_fotos_os       ON os_fotos(os_id);
CREATE INDEX IF NOT EXISTS idx_os_fotos_oficina  ON os_fotos(oficina_id);
CREATE INDEX IF NOT EXISTS idx_os_fotos_veiculo  ON os_fotos(veiculo_id);

-- Tabela de itens do orçamento interativo
-- Cada item é uma peça/serviço com descrição, valor e fotos vinculadas
CREATE TABLE IF NOT EXISTS orcamento_itens (
  id           SERIAL PRIMARY KEY,
  oficina_id   INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,

  -- Dados do item
  tipo         TEXT DEFAULT 'peca' CHECK(tipo IN ('peca','servico','outro')),
  nome         TEXT NOT NULL,
  descricao    TEXT,                    -- descrição detalhada / motivo da troca
  quantidade   REAL DEFAULT 1,
  valor_unit   REAL DEFAULT 0,

  -- IDs das fotos da OS que devem ser exibidas neste item
  -- Array JSON de IDs: [1, 3, 5] referenciando os_fotos.id
  foto_ids     JSONB DEFAULT '[]',

  posicao      INTEGER DEFAULT 0,      -- ordem de exibição
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orc_itens_orcamento ON orcamento_itens(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orc_itens_oficina   ON orcamento_itens(oficina_id);

-- Coluna extra no orçamento para metadados do interativo
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS
  interativo BOOLEAN DEFAULT false;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS
  observacao_problema TEXT;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS
  os_id INTEGER REFERENCES ordens_servico(id) ON DELETE SET NULL;
