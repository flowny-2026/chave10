/**
 * Database Migration Runner
 * Applies all pending migrations to the database
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function runMigrations() {
  console.log('🔄 Starting database migrations...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'add-approval-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Applying migration: add-approval-tables.sql');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');

    // Verify tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('approval_links', 'approval_link_accesses', 'approval_actions', 'budget_signatures')
      ORDER BY table_name
    `);

    console.log('📊 Created tables:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check if columns were added to existing tables
    const newColumns = await pool.query(`
      SELECT 
        table_name, 
        column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('orcamentos', 'oficinas')
        AND column_name IN ('approval_status', 'approved_at', 'rejected_at', 'rejection_reason', 'require_signature')
      ORDER BY table_name, column_name
    `);

    console.log('\n📊 Added columns to existing tables:');
    newColumns.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}.${row.column_name}`);
    });

    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
