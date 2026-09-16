/**
 * migrationRunner.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sistema de migrations versionado para o Chave 10.
 *
 * Funcionamento:
 *   1. Garante que a tabela schema_migrations existe no banco.
 *   2. Lê todos os arquivos .sql da pasta migrations/ numerados (001_, 002_, ...).
 *   3. Executa apenas as migrations que ainda não foram aplicadas.
 *   4. Registra cada migration aplicada com timestamp e checksum SHA-256.
 *   5. Detecta alteração retroativa de migrations já aplicadas (checksum diverge).
 *
 * Uso:
 *   node src/migrations/migrationRunner.js         — aplica pendentes
 *   node src/migrations/migrationRunner.js --status — apenas mostra status
 *
 * Tabela de controle:
 *   schema_migrations (version TEXT PK, name TEXT, applied_at TIMESTAMPTZ, checksum TEXT)
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const { pool } = require('../db');

const MIGRATIONS_DIR = __dirname;
const STATUS_ONLY    = process.argv.includes('--status');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT        PRIMARY KEY,
      name       TEXT        NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checksum   TEXT        NOT NULL
    )
  `);
}

function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}_.*\.sql$/.test(f))
    .sort(); // garante ordem numérica
}

async function getAppliedMigrations(client) {
  const res = await client.query('SELECT version, checksum FROM schema_migrations ORDER BY version');
  return new Map(res.rows.map(r => [r.version, r.checksum]));
}

// ─── Runner principal ─────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const applied  = await getAppliedMigrations(client);
    const files    = getMigrationFiles();
    const pending  = files.filter(f => !applied.has(f));

    // ── STATUS ──────────────────────────────────────────────────────────────
    console.log('\n📋 Status das migrations:\n');
    for (const file of files) {
      const content  = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = sha256(content);
      const wasApplied = applied.has(file);
      const changed    = wasApplied && applied.get(file) !== checksum;

      if (changed) {
        console.log(`  ⚠️  [ALTERADO]  ${file}`);
      } else if (wasApplied) {
        console.log(`  ✅ [APLICADO]  ${file}`);
      } else {
        console.log(`  ⏳ [PENDENTE]  ${file}`);
      }
    }

    // Detecta arquivos com checksum alterado
    const altered = files.filter(f => {
      if (!applied.has(f)) return false;
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      return applied.get(f) !== sha256(content);
    });

    if (altered.length > 0) {
      console.error(`\n❌ ATENÇÃO: ${altered.length} migration(s) foram alteradas após aplicação:`);
      altered.forEach(f => console.error(`   - ${f}`));
      console.error('   Migrations aplicadas não devem ser alteradas. Crie uma nova migration.');
      if (STATUS_ONLY) { await client.release(); return; }
      process.exit(1);
    }

    if (STATUS_ONLY) {
      console.log(`\n${pending.length} pendente(s), ${applied.size} aplicada(s)\n`);
      client.release();
      return;
    }

    // ── APLICAR PENDENTES ────────────────────────────────────────────────────
    if (pending.length === 0) {
      console.log('\n✅ Banco atualizado — nenhuma migration pendente.\n');
      client.release();
      return;
    }

    console.log(`\n🔄 Aplicando ${pending.length} migration(s)...\n`);

    for (const file of pending) {
      const content  = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = sha256(content);

      await client.query('BEGIN');
      try {
        console.log(`  ➜ ${file}`);
        await client.query(content);
        await client.query(
          `INSERT INTO schema_migrations (version, name, applied_at, checksum)
           VALUES ($1, $2, NOW(), $3)`,
          [file, file.replace(/^\d{3}_/, '').replace('.sql', ''), checksum]
        );
        await client.query('COMMIT');
        console.log(`    ✅ Aplicada com sucesso`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`    ❌ Falha ao aplicar ${file}: ${err.message}`);
        throw err;
      }
    }

    console.log(`\n✅ ${pending.length} migration(s) aplicada(s) com sucesso.\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('\n💥 Erro no migration runner:', err.message);
  process.exit(1);
});
