require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Todos os pagamentos com forma=boleto
  const todos = await pool.query(
    `SELECT id, os_id, oficina_id, forma, boleto_pendente, boleto_vencimento, boleto_recebido_em, data_pagamento, valor_total
     FROM pagamentos_os
     WHERE forma='boleto'
     ORDER BY id DESC LIMIT 20`
  );

  console.log('\n=== TODOS OS BOLETOS (últimos 20) ===');
  console.table(todos.rows.map(r => ({
    id: r.id,
    os_id: r.os_id,
    oficina_id: r.oficina_id,
    boleto_pendente: r.boleto_pendente,
    boleto_vencimento: r.boleto_vencimento,
    boleto_recebido_em: r.boleto_recebido_em,
    valor: r.valor_total,
  })));

  // Boletos que deveriam aparecer como pendentes mas não aparecem
  const problema = await pool.query(
    `SELECT id, os_id, oficina_id, boleto_pendente, boleto_vencimento, boleto_recebido_em
     FROM pagamentos_os
     WHERE forma='boleto'
       AND boleto_recebido_em IS NULL
       AND (boleto_pendente IS NULL OR boleto_pendente = false)
     ORDER BY id DESC LIMIT 20`
  );

  console.log('\n=== BOLETOS SEM RECEBIMENTO MAS boleto_pendente=false/null ===');
  console.log(`Total: ${problema.rows.length}`);
  console.table(problema.rows);

  await pool.end();
}
main().catch(console.error);
