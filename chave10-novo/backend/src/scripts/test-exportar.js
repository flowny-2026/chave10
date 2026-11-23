require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const id = 12; // oficina teste

  const queries = [
    ['clientes',       'SELECT * FROM clientes WHERE oficina_id=$1 ORDER BY id LIMIT 1'],
    ['veiculos',       'SELECT * FROM veiculos WHERE oficina_id=$1 ORDER BY id LIMIT 1'],
    ['ordens_servico', 'SELECT id,oficina_id,cliente_id,veiculo_id,descricao,servicos,pecas,pecas_itens,valor_mo,valor_pecas,valor,status,observacao,data,numero,criado_em FROM ordens_servico WHERE oficina_id=$1 ORDER BY id LIMIT 1'],
    ['orcamentos',     'SELECT id,oficina_id,cliente_id,veiculo_id,numero,descricao,servicos,pecas_itens,valor_mo,valor_pecas,desconto,status,validade,obs,criado_em FROM orcamentos WHERE oficina_id=$1 ORDER BY id LIMIT 1'],
    ['despesas',       'SELECT id,oficina_id,descricao,categoria,valor,data,vencimento,pago,obs,fornecedor_id,criado_em FROM despesas WHERE oficina_id=$1 ORDER BY id LIMIT 1'],
    ['estoque',        'SELECT id,oficina_id,nome,categoria,tipo,marca,aplicacao,quantidade,estoque_min,preco,custo,margem,preco_venda,data_compra,obs,codigo_barras,criado_em FROM estoque WHERE oficina_id=$1 ORDER BY id LIMIT 1'],
  ];

  for (const [nome, sql] of queries) {
    try {
      const r = await pool.query(sql, [id]);
      console.log(`✅ ${nome}: ${r.rows.length} row(s)`);
    } catch (e) {
      console.error(`❌ ${nome}: ${e.message}`);
    }
  }

  // Testa JSON serialization
  try {
    const r = await pool.query('SELECT * FROM clientes WHERE oficina_id=$1 LIMIT 5', [id]);
    JSON.stringify(r.rows);
    console.log('✅ clientes JSON ok');
  } catch(e) { console.error('❌ clientes JSON:', e.message); }

  await pool.end();
}
main().catch(console.error);
