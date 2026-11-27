const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');
const { authMiddleware, naoFuncionario } = require('../middleware/auth');

function oid(req) {
  return req.user?.oficina_id;
}

router.use(authMiddleware);

// GET /checklists/modelos/:segmento — lista templates de um segmento
router.get('/modelos/:segmento', async (req, res) => {
  try {
    const oficina_id = oid(req);
    const { segmento } = req.params;
    
    const rows = await query(
      `SELECT id, nome, itens FROM checklist_modelos 
       WHERE oficina_id=$1 AND segmento=$2 AND ativo=1 
       ORDER BY nome ASC`,
      [oficina_id, segmento]
    );
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar checklists' });
  }
});

// POST /checklists/modelos — cria novo template
router.post('/modelos', naoFuncionario, async (req, res) => {
  try {
    const oficina_id = oid(req);
    const { segmento, nome, categoria, tipo, status_inicial, descricao, itens } = req.body;
    
    if (!segmento || !nome || !Array.isArray(itens)) {
      return res.status(400).json({ error: 'Segmento, nome e itens são obrigatórios' });
    }

    const result = await queryOne(
      `INSERT INTO checklist_modelos (oficina_id, segmento, nome, categoria, tipo, status_inicial, descricao, itens) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [oficina_id, segmento, nome, categoria || 'Outro', tipo || 'veiculo', status_inicial || 'ativo', descricao || '', JSON.stringify(itens)]
    );
    res.status(201).json(result);
  } catch (err) {
    if (err.message?.includes('duplicate')) {
      return res.status(409).json({ error: 'Já existe um checklist com esse nome neste segmento' });
    }
    res.status(500).json({ error: 'Erro ao criar checklist' });
  }
});

// PUT /checklists/modelos/:id — atualiza template
router.put('/modelos/:id', naoFuncionario, async (req, res) => {
  try {
    const oficina_id = oid(req);
    const { id } = req.params;
    const { nome, categoria, tipo, status_inicial, descricao, itens } = req.body;
    
    if (!nome || !Array.isArray(itens)) {
      return res.status(400).json({ error: 'Nome e itens são obrigatórios' });
    }

    const result = await queryOne(
      `UPDATE checklist_modelos SET nome=$1, categoria=$2, tipo=$3, status_inicial=$4, descricao=$5, itens=$6, atualizado_em=CURRENT_TIMESTAMP
       WHERE id=$7 AND oficina_id=$8 RETURNING *`,
      [nome, categoria || 'Outro', tipo || 'veiculo', status_inicial || 'ativo', descricao || '', JSON.stringify(itens), id, oficina_id]
    );

    if (!result) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar checklist' });
  }
});

// DELETE /checklists/modelos/:id — deleta template
router.delete('/modelos/:id', naoFuncionario, async (req, res) => {
  try {
    const oficina_id = oid(req);
    const { id } = req.params;
    
    await run(
      `UPDATE checklist_modelos SET ativo=0 WHERE id=$1 AND oficina_id=$2`,
      [id, oficina_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar checklist' });
  }
});

// GET /checklists/os/:os_id — carrega checklist da OS
router.get('/os/:os_id', async (req, res) => {
  try {
    const oficina_id = oid(req);
    const { os_id } = req.params;
    
    const result = await queryOne(
      `SELECT id, itens, concluido FROM checklist_os 
       WHERE os_id=$1 AND oficina_id=$2`,
      [os_id, oficina_id]
    );
    
    res.json(result || { itens: [], concluido: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar checklist' });
  }
});

// POST /checklists/os — cria checklist para OS
router.post('/os', async (req, res) => {
  try {
    const oficina_id = oid(req);
    const { os_id, modelo_id } = req.body;
    
    if (!os_id) {
      return res.status(400).json({ error: 'OS ID é obrigatório' });
    }

    // Se há modelo_id, copia os itens dele
    let itens = [];
    if (modelo_id) {
      const modelo = await queryOne(
        `SELECT itens FROM checklist_modelos WHERE id=$1 AND oficina_id=$2`,
        [modelo_id, oficina_id]
      );
      itens = modelo?.itens || [];
      // Reseta status de conclusão
      itens = itens.map(i => ({ ...i, concluido: false, foto: null, observacao: '' }));
    }

    const result = await queryOne(
      `INSERT INTO checklist_os (os_id, oficina_id, modelo_id, itens) 
       VALUES ($1, $2, $3, $4) RETURNING id, itens`,
      [os_id, oficina_id, modelo_id || null, JSON.stringify(itens)]
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar checklist da OS' });
  }
});

// PATCH /checklists/os/:id — atualiza item do checklist
router.patch('/os/:id', async (req, res) => {
  try {
    const oficina_id = oid(req);
    const { id } = req.params;
    const { itens, concluido } = req.body;
    
    const result = await queryOne(
      `UPDATE checklist_os SET itens=$1, concluido=$2, atualizado_em=CURRENT_TIMESTAMP
       WHERE id=$3 AND oficina_id=$4 RETURNING id, itens, concluido`,
      [
        JSON.stringify(itens),
        concluido ? 1 : 0,
        id,
        oficina_id
      ]
    );

    if (!result) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar checklist' });
  }
});

module.exports = router;
