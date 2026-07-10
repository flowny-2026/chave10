const express = require('express');
const router = express.Router();
const { backupDatabase, restoreDatabase, listBackups } = require('../utils/backup');
const { authMiddleware, masterAdminOnly } = require('../middleware/auth');
const { validateBackupFilename } = require('../middleware/validate');
const log = require('../utils/logger');

/**
 * GET /api/backup/list
 * Lista todos os backups disponíveis
 * Requer: master_admin
 */
router.get('/list', authMiddleware, masterAdminOnly, (req, res) => {
  try {
    const backups = listBackups();
    res.json({ backups });
  } catch (error) {
    log.error('backup_list', error);
    res.status(500).json({ error: 'Erro ao listar backups' });
  }
});

/**
 * POST /api/backup/create
 * Cria um backup manual do banco de dados
 * Requer: master_admin
 */
router.post('/create', authMiddleware, masterAdminOnly, async (req, res) => {
  try {
    const result = await backupDatabase();
    if (result.success) {
      log.info('backup_criado', { file: result.file, size: result.size, admin_id: req.user.id });
      res.json({ message: 'Backup criado com sucesso', file: result.file, size: result.size });
    } else {
      log.warn('backup_falhou', { admin_id: req.user.id });
      res.status(500).json({ error: 'Falha ao criar backup' });
    }
  } catch (error) {
    log.error('backup_create', error);
    res.status(500).json({ error: 'Erro ao criar backup' });
  }
});

/**
 * POST /api/backup/restore
 * Restaura um backup do banco de dados
 * Requer: master_admin
 * Body: { backupFileName: string }
 */
router.post('/restore', authMiddleware, masterAdminOnly, validateBackupFilename, async (req, res) => {
  try {
    const { backupFileName } = req.body;
    if (!backupFileName) return res.status(400).json({ error: 'Nome do arquivo de backup é obrigatório' });
    const result = await restoreDatabase(backupFileName);
    if (result.success) {
      log.info('backup_restaurado', { file: result.file, admin_id: req.user.id });
      res.json({ message: 'Backup restaurado com sucesso', file: result.file });
    } else {
      log.warn('backup_restore_falhou', { admin_id: req.user.id });
      res.status(500).json({ error: 'Falha ao restaurar backup' });
    }
  } catch (error) {
    log.error('backup_restore', error);
    res.status(500).json({ error: 'Erro ao restaurar backup' });
  }
});

module.exports = router;
