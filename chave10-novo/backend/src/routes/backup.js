const express = require('express');
const router = express.Router();
const { backupDatabase, restoreDatabase, listBackups } = require('../utils/backup');
const { authenticateToken, requireMasterAdmin } = require('../middleware/auth');

/**
 * GET /api/backup/list
 * Lista todos os backups disponíveis
 * Requer: master_admin
 */
router.get('/list', authenticateToken, requireMasterAdmin, (req, res) => {
  try {
    const backups = listBackups();
    res.json({ backups });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar backups' });
  }
});

/**
 * POST /api/backup/create
 * Cria um backup manual do banco de dados
 * Requer: master_admin
 */
router.post('/create', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const result = await backupDatabase();
    
    if (result.success) {
      res.json({
        message: 'Backup criado com sucesso',
        file: result.file,
        size: result.size
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar backup' });
  }
});

/**
 * POST /api/backup/restore
 * Restaura um backup do banco de dados
 * Requer: master_admin
 * Body: { backupFileName: string }
 */
router.post('/restore', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const { backupFileName } = req.body;

    if (!backupFileName) {
      return res.status(400).json({ error: 'Nome do arquivo de backup é obrigatório' });
    }

    const result = await restoreDatabase(backupFileName);
    
    if (result.success) {
      res.json({
        message: 'Backup restaurado com sucesso',
        file: result.file
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao restaurar backup' });
  }
});

module.exports = router;
