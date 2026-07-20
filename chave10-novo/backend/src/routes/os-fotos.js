/**
 * os-fotos.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas para upload e gerenciamento de fotos de Ordens de Serviço.
 *
 * Fotos são associadas à OS (histórico do veículo), não ao orçamento.
 * O orçamento apenas referencia quais fotos exibir via foto_ids.
 *
 * Limites:
 *   - 5 fotos por upload (batch)
 *   - 15 fotos por OS
 *   - Cada foto: máx 800KB após compressão (base64 ~1.1MB)
 *   - Formatos: JPEG, PNG, WebP
 * ─────────────────────────────────────────────────────────────────────────────
 */

const router = require('express').Router();
const { query, queryOne, run } = require('../db');
const { authMiddleware, oficinaSelf } = require('../middleware/auth');
const { validateId } = require('../middleware/validate');
const { validateUpload } = require('../middleware/uploadValidator');
const { checkOwns } = require('../middleware/authorization');
const log = require('../utils/logger');

router.use(authMiddleware, oficinaSelf);

const MAX_FOTOS_POR_OS     = 15;
const MAX_FOTOS_POR_UPLOAD = 5;
const MAX_FOTO_BYTES       = 800 * 1024; // 800KB decodificado

/**
 * GET /api/app/os/:id/fotos
 * Lista fotos de uma OS (sem o base64 — apenas metadata)
 */
router.get('/:id/fotos', validateId, checkOwns('ordens_servico'), async (req, res) => {
  try {
    const fotos = await query(
      `SELECT id, titulo, descricao, categoria, posicao, mime_type, tamanho_bytes, criado_em, imagem_base64
       FROM os_fotos WHERE os_id=$1 AND oficina_id=$2 ORDER BY posicao, id`,
      [req.params.id, req.user.oficina_id]
    );
    res.json(fotos);
  } catch (err) {
    log.error('os_fotos_list', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/app/os/:id/fotos/:fotoId
 * Retorna uma foto com base64 (para exibição)
 */
router.get('/:id/fotos/:fotoId', validateId, checkOwns('ordens_servico'), async (req, res) => {
  try {
    const fotoId = parseInt(req.params.fotoId);
    if (!Number.isInteger(fotoId) || fotoId <= 0) return res.status(400).json({ error: 'ID de foto inválido' });

    const foto = await queryOne(
      `SELECT id, titulo, descricao, categoria, posicao, imagem_base64, storage_url, mime_type, tamanho_bytes
       FROM os_fotos WHERE id=$1 AND os_id=$2 AND oficina_id=$3`,
      [fotoId, req.params.id, req.user.oficina_id]
    );
    if (!foto) return res.status(404).json({ error: 'Foto não encontrada' });
    res.json(foto);
  } catch (err) {
    log.error('os_fotos_get', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/app/os/:id/fotos
 * Upload de fotos (batch — até 5 por vez)
 *
 * Body: { fotos: [{ imagem, titulo?, descricao?, categoria? }] }
 * imagem: data URL base64 (data:image/jpeg;base64,...)
 */
router.post('/:id/fotos', validateId, checkOwns('ordens_servico'), async (req, res) => {
  try {
    const osId      = req.params.id;
    const oficinaId = req.user.oficina_id;
    const fotos     = req.body?.fotos;

    if (!Array.isArray(fotos) || fotos.length === 0) {
      return res.status(400).json({ error: 'Envie ao menos uma foto' });
    }
    if (fotos.length > MAX_FOTOS_POR_UPLOAD) {
      return res.status(400).json({ error: `Máximo ${MAX_FOTOS_POR_UPLOAD} fotos por upload` });
    }

    // Verifica limite total na OS
    const countRow = await queryOne(
      'SELECT COUNT(*) n FROM os_fotos WHERE os_id=$1 AND oficina_id=$2',
      [osId, oficinaId]
    );
    const existentes = parseInt(countRow.n);
    if (existentes + fotos.length > MAX_FOTOS_POR_OS) {
      return res.status(400).json({
        error: `Limite de ${MAX_FOTOS_POR_OS} fotos por OS. Você tem ${existentes} e tentou adicionar ${fotos.length}.`
      });
    }

    // Busca veiculo_id da OS para associar ao histórico
    const os = await queryOne('SELECT veiculo_id FROM ordens_servico WHERE id=$1', [osId]);

    const inseridos = [];
    const categorias = ['problema', 'peca', 'servico', 'antes', 'depois', 'outro'];

    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i];
      if (!foto.imagem || typeof foto.imagem !== 'string') {
        return res.status(400).json({ error: `Foto ${i + 1}: imagem inválida` });
      }

      // Valida conteúdo com uploadValidator
      const validation = validateUpload(foto.imagem, 'document', { req });
      if (!validation.valid) {
        return res.status(400).json({ error: `Foto ${i + 1}: ${validation.error}` });
      }

      if (validation.size > MAX_FOTO_BYTES) {
        return res.status(400).json({
          error: `Foto ${i + 1}: muito grande (${Math.round(validation.size / 1024)}KB). Máximo: ${MAX_FOTO_BYTES / 1024}KB`
        });
      }

      const titulo    = (foto.titulo || '').slice(0, 120).trim() || null;
      const descricao = (foto.descricao || '').slice(0, 500).trim() || null;
      const categoria = categorias.includes(foto.categoria) ? foto.categoria : 'problema';

      const r = await queryOne(
        `INSERT INTO os_fotos (oficina_id, os_id, veiculo_id, titulo, descricao, categoria, posicao, imagem_base64, mime_type, tamanho_bytes, criado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, titulo, descricao, categoria, posicao, criado_em`,
        [
          oficinaId, osId, os?.veiculo_id || null,
          titulo, descricao, categoria,
          existentes + i, // posicao
          foto.imagem,
          validation.mime,
          validation.size,
          req.user.id,
        ]
      );
      inseridos.push(r);
    }

    res.status(201).json({ fotos: inseridos, total: existentes + inseridos.length });
  } catch (err) {
    log.error('os_fotos_upload', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * DELETE /api/app/os/:id/fotos/:fotoId
 * Remove uma foto
 */
router.delete('/:id/fotos/:fotoId', validateId, checkOwns('ordens_servico'), async (req, res) => {
  try {
    const fotoId = parseInt(req.params.fotoId);
    if (!Number.isInteger(fotoId) || fotoId <= 0) return res.status(400).json({ error: 'ID inválido' });

    const result = await run(
      'DELETE FROM os_fotos WHERE id=$1 AND os_id=$2 AND oficina_id=$3',
      [fotoId, req.params.id, req.user.oficina_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Foto não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    log.error('os_fotos_delete', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/app/os/:id/fotos/public
 * Retorna fotos para exibição pública (orçamento interativo)
 * Usado pela página de aprovação — não exige autenticação (será chamado internamente)
 */
router.get('/:id/fotos/public', async (req, res) => {
  // Esta rota é interna — chamada pelo serviço de aprovação
  // Não expõe diretamente ao público (o token de aprovação valida o acesso)
  const osId = parseInt(req.params.id);
  if (!Number.isInteger(osId) || osId <= 0) return res.status(400).json({ error: 'ID inválido' });

  try {
    const fotos = await query(
      `SELECT id, titulo, descricao, categoria, posicao, imagem_base64, mime_type
       FROM os_fotos WHERE os_id=$1 ORDER BY posicao, id`,
      [osId]
    );
    res.json(fotos);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
