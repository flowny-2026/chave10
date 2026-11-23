require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Conta teste
  const user = await pool.query("SELECT id, email, oficina_id FROM usuarios WHERE email='teste@teste.com'");
  console.log('Usuário teste:', user.rows[0]);
  const oid = user.rows[0]?.oficina_id;
  if (!oid) { console.log('Sem oficina!'); await pool.end(); return; }

  // OS da oficina teste
  const os = await pool.query('SELECT id, numero, oficina_id, cliente_id FROM ordens_servico WHERE oficina_id=$1 ORDER BY id DESC LIMIT 5', [oid]);
  console.log('\nOS da oficina teste (últimas 5):');
  console.table(os.rows);

  // OS de outras oficinas (para verificar se há vazamento)
  const outras = await pool.query('SELECT COUNT(*) n, oficina_id FROM ordens_servico WHERE oficina_id!=$1 GROUP BY oficina_id', [oid]);
  console.log('\nOS de outras oficinas:');
  console.table(outras.rows);

  // Total de oficinas
  const oficinas = await pool.query('SELECT id, nome FROM oficinas ORDER BY id');
  console.log('\nOficinas no banco:');
  console.table(oficinas.rows);

  await pool.end();
}
main().catch(console.error);
