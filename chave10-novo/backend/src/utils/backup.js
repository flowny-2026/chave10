const { exec, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Configurações de backup
const BACKUP_DIR = path.join(__dirname, '../../backups');
const MAX_BACKUPS = 30; // Manter últimos 30 backups

/**
 * Cria o diretório de backups se não existir
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Diretório de backups criado: ${BACKUP_DIR}`);
  }
}

/**
 * Gera nome do arquivo de backup com timestamp
 */
function getBackupFileName() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `backup_${timestamp}.sql`;
}

/**
 * Remove backups antigos mantendo apenas os mais recentes
 */
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Remove backups excedentes
    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Backup antigo removido: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Erro ao limpar backups antigos:', error.message);
  }
}

/**
 * Realiza backup do banco PostgreSQL
 * Usa execFile (não shell) para evitar command injection via DATABASE_URL.
 */
async function backupDatabase() {
  try {
    ensureBackupDir();

    const backupFile = path.join(BACKUP_DIR, getBackupFileName());
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL não configurada');
    }

    console.log('🔄 Iniciando backup do banco de dados...');

    // execFile com array de argumentos — sem interpolação de shell, sem command injection.
    // pg_dump escreve diretamente em arquivo via flag -f.
    await execFileAsync('pg_dump', [databaseUrl, '-f', backupFile]);

    // Verifica se o arquivo foi criado
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ Backup realizado com sucesso: ${path.basename(backupFile)} (${sizeMB} MB)`);
      
      // Limpa backups antigos
      cleanOldBackups();
      
      return {
        success: true,
        file: path.basename(backupFile), // retorna apenas o nome, sem caminho absoluto
        size: stats.size
      };
    } else {
      throw new Error('Arquivo de backup não foi criado');
    }
  } catch (error) {
    console.error('❌ Erro ao realizar backup:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Restaura backup do banco de dados
 * @param {string} backupFileName - Nome do arquivo de backup (sem caminho)
 */
async function restoreDatabase(backupFileName) {
  try {
    const backupFile = path.join(BACKUP_DIR, backupFileName);

    if (!fs.existsSync(backupFile)) {
      throw new Error('Arquivo de backup não encontrado');
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL não configurada');
    }

    console.log(`🔄 Restaurando backup: ${backupFileName}...`);

    // execFile com array de argumentos — sem interpolação de shell, sem command injection.
    await execFileAsync('psql', [databaseUrl, '-f', backupFile]);

    console.log('✅ Backup restaurado com sucesso');
    
    return {
      success: true,
      file: backupFileName
    };
  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Lista todos os backups disponíveis
 */
function listBackups() {
  try {
    ensureBackupDir();

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          date: stats.mtime
        };
      })
      .sort((a, b) => b.date - a.date);

    return files;
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error.message);
    return [];
  }
}

/**
 * Agenda backup automático
 * @param {number} intervalHours - Intervalo em horas entre backups
 */
function scheduleBackup(intervalHours = 24) {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  console.log(`⏰ Backup automático agendado a cada ${intervalHours} horas`);
  
  // Executa backup imediatamente
  backupDatabase();
  
  // Agenda backups periódicos
  setInterval(() => {
    backupDatabase();
  }, intervalMs);
}

module.exports = {
  backupDatabase,
  restoreDatabase,
  listBackups,
  scheduleBackup,
  BACKUP_DIR
};
