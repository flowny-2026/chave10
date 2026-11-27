const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware, oficinaSelf } = require('../middleware/auth');

// Helpers de validação
function str(val, maxLen = 100) {
  if (typeof val !== 'string') return '';
  return val.trim().substring(0, maxLen);
}

function money(val) {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? null : Math.round(n * 100) / 100;
}

// Middleware: valida autenticação
router.use(authMiddleware, oficinaSelf);

// GET /servicos — lista serviços da oficina
router.get('/servicos', async (req, res) => {
  try {
    const { oficina_id } = req.user;
    const result = await pool.query(
      'SELECT id, nome, valor FROM servicos WHERE oficina_id = $1 ORDER BY nome ASC',
      [oficina_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar serviços:', err);
    res.status(500).json({ error: 'Erro ao listar serviços' });
  }
});

// POST /servicos — cria novo serviço
router.post('/servicos', async (req, res) => {
  try {
    const { oficina_id } = req.user;
    const nome = str(req.body?.nome, 150);
    const valor = money(req.body?.valor);

    if (!nome) return res.status(400).json({ error: 'Nome do serviço é obrigatório' });
    if (valor === null || valor <= 0) return res.status(400).json({ error: 'Valor deve ser maior que zero' });

    const result = await pool.query(
      'INSERT INTO servicos (oficina_id, nome, valor) VALUES ($1, $2, $3) RETURNING id, nome, valor',
      [oficina_id, nome, valor]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar serviço:', err);
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

// PUT /servicos/:id — atualiza serviço
router.put('/servicos/:id', async (req, res) => {
  try {
    const { oficina_id } = req.user;
    const { id } = req.params;
    const nome = str(req.body?.nome, 150);
    const valor = money(req.body?.valor);

    if (!nome) return res.status(400).json({ error: 'Nome do serviço é obrigatório' });
    if (valor === null || valor <= 0) return res.status(400).json({ error: 'Valor deve ser maior que zero' });

    const result = await pool.query(
      'UPDATE servicos SET nome = $1, valor = $2 WHERE id = $3 AND oficina_id = $4 RETURNING id, nome, valor',
      [nome, valor, id, oficina_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar serviço:', err);
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

// DELETE /servicos/:id — deleta serviço
router.delete('/servicos/:id', async (req, res) => {
  try {
    const { oficina_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM servicos WHERE id = $1 AND oficina_id = $2 RETURNING id',
      [id, oficina_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json({ message: 'Serviço deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar serviço:', err);
    res.status(500).json({ error: 'Erro ao deletar serviço' });
  }
});

module.exports = router;
