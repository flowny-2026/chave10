-- Migration 005: Adiciona coluna telefone na tabela usuarios
-- Necessária para o módulo de Mecânicos, que exibe/edita o telefone
-- do mecânico. A migration 004 referenciava u.telefone sem criar a coluna,
-- causando erro 500 em GET /api/app/mecanicos.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone TEXT;
