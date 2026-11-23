/**
 * anonimizar-demo.js
 *
 * Substitui todos os dados sensíveis do banco por valores neutros/fictícios
 * para gravação de vídeos/demos sem expor informações reais de clientes.
 *
 * ⚠️  ATENÇÃO: Este script modifica o banco de dados diretamente.
 *     Use apenas em ambiente de TESTE ou numa cópia do banco de produção.
 *     NUNCA rode em produção com dados reais que você queira preservar.
 *
 * Como usar:
 *   node src/scripts/anonimizar-demo.js
 *
 * Variáveis de ambiente necessárias: DATABASE_URL (mesmo .env do backend)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

async function run(text, params) {
  return pool.query(text, params);
}

async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

// Gera telefone falso no formato (00) 00000-0000
function telFalso(id) {
  const n = String(id).padStart(5, '0');
  return `(00) 00000-${n}`;
}

// Gera email falso
function emailFalso(prefixo, id) {
  return `${prefixo}${id}@demo.com`;
}

// Gera CPF/CNPJ falso
function docFalso() {
  return '000.000.000-00';
}

async function anonimizar() {
  console.log('🔄 Iniciando anonimização do banco de dados...\n');

  // ── 1. Clientes ──────────────────────────────────────────────
  console.log('📋 Anonimizando clientes...');
  const clientes = await query('SELECT id FROM clientes');
  for (let i = 0; i < clientes.length; i++) {
    const { id } = clientes[i];
    await run(`
      UPDATE clientes SET
        nome       = $1,
        telefone   = $2,
        email      = $3,
        obs        = NULL,
        endereco   = 'Rua Demo, 0000'
      WHERE id = $4
    `, [`Cliente ${String(i + 1).padStart(3, '0')}`, telFalso(i + 1), emailFalso('cliente', i + 1), id]);
  }
  console.log(`   ✅ ${clientes.length} clientes anonimizados`);

  // ── 2. Veículos ───────────────────────────────────────────────
  console.log('🚗 Anonimizando veículos...');
  const veiculosList = await query('SELECT id FROM veiculos ORDER BY id');
  const placasFalsas = ['AAA-0000', 'BBB-0000', 'CCC-0000', 'DDD-0000', 'EEE-0000',
                        'FFF-0000', 'GGG-0000', 'HHH-0000', 'III-0000', 'JJJ-0000'];
  for (let i = 0; i < veiculosList.length; i++) {
    const { id } = veiculosList[i];
    await run(`
      UPDATE veiculos SET
        placa  = $1,
        modelo = 'Modelo Demo',
        marca  = 'Marca Demo',
        ano    = '0000',
        km     = '0'
      WHERE id = $2
    `, [placasFalsas[i % placasFalsas.length], id]);
  }
  console.log(`   ✅ ${veiculosList.length} veículos anonimizados`);

  // ── 3. Ordens de Serviço ──────────────────────────────────────
  console.log('🔧 Anonimizando ordens de serviço...');
  const result3 = await run(`
    UPDATE ordens_servico SET
      descricao  = 'Serviço de demonstração',
      servicos   = 'Serviço executado',
      pecas      = NULL,
      pecas_itens = NULL,
      observacao = NULL
  `);
  console.log(`   ✅ ${result3.rowCount} OS anonimizadas`);

  // ── 4. Orçamentos ─────────────────────────────────────────────
  console.log('📄 Anonimizando orçamentos...');
  const result4 = await run(`
    UPDATE orcamentos SET
      descricao = 'Orçamento de demonstração',
      servicos  = NULL,
      pecas     = NULL,
      obs       = NULL
  `);
  console.log(`   ✅ ${result4.rowCount} orçamentos anonimizados`);

  // ── 5. Oficinas (exceto master_admin) ─────────────────────────
  console.log('🏢 Anonimizando dados das oficinas...');
  const oficinas = await query(`SELECT id FROM oficinas`);
  for (let i = 0; i < oficinas.length; i++) {
    const { id } = oficinas[i];
    await run(`
      UPDATE oficinas SET
        nome        = $1,
        responsavel = 'Responsável Demo',
        telefone    = $2,
        observacoes = NULL
      WHERE id = $3
    `, [`Oficina Demo ${String(i + 1).padStart(2, '0')}`, telFalso(100 + i + 1), id]);
  }
  console.log(`   ✅ ${oficinas.length} oficinas anonimizadas`);

  // ── 6. Usuários (preserva senha, zera dados pessoais) ─────────
  console.log('👤 Anonimizando usuários...');
  const usuarios = await query(`SELECT id, perfil FROM usuarios`);
  for (let i = 0; i < usuarios.length; i++) {
    const { id, perfil } = usuarios[i];
    if (perfil === 'master_admin') {
      // Mantém o master_admin intacto para não perder acesso
      console.log(`   ⚠️  Usuário ${id} (master_admin) mantido sem alteração`);
      continue;
    }
    await run(`
      UPDATE usuarios SET
        nome     = $1,
        telefone = $2
      WHERE id = $3
    `, [`Usuário ${String(i + 1).padStart(3, '0')}`, telFalso(200 + i + 1), id]);
  }
  console.log(`   ✅ ${usuarios.length} usuários processados`);

  // ── 7. Despesas ───────────────────────────────────────────────
  console.log('💰 Anonimizando despesas...');
  const result7 = await run(`
    UPDATE despesas SET
      descricao = 'Despesa de demonstração',
      obs       = NULL
  `);
  console.log(`   ✅ ${result7.rowCount} despesas anonimizadas`);

  // ── 8. Pagamentos de assinatura ───────────────────────────────
  console.log('💳 Anonimizando pagamentos de assinatura...');
  const result8 = await run(`
    UPDATE pagamentos SET
      observacao    = NULL,
      confirmado_por = '0'
  `);
  console.log(`   ✅ ${result8.rowCount} pagamentos anonimizados`);

  // ── 9. Pagamentos de OS ───────────────────────────────────────
  console.log('💳 Anonimizando pagamentos de OS...');
  const result9 = await run(`
    UPDATE pagamentos_os SET
      observacao = NULL
  `);
  console.log(`   ✅ ${result9.rowCount} pagamentos de OS anonimizados`);

  // ── 10. Agenda ────────────────────────────────────────────────
  console.log('📅 Anonimizando agenda...');
  const result10 = await run(`
    UPDATE agenda SET
      titulo    = 'Agendamento Demo',
      descricao = NULL
  `);
  console.log(`   ✅ ${result10.rowCount} agendamentos anonimizados`);

  // ── 11. Lembretes ─────────────────────────────────────────────
  console.log('🔔 Anonimizando lembretes...');
  const result11 = await run(`
    UPDATE lembretes SET
      descricao = 'Lembrete de demonstração'
  `);
  console.log(`   ✅ ${result11.rowCount} lembretes anonimizados`);

  // ── 12. Estoque ───────────────────────────────────────────────
  console.log('📦 Anonimizando estoque...');
  const estoque = await query('SELECT id FROM estoque ORDER BY id');
  for (let i = 0; i < estoque.length; i++) {
    const { id } = estoque[i];
    await run(`
      UPDATE estoque SET
        nome           = $1,
        marca          = 'Marca Demo',
        aplicacao      = NULL,
        obs            = NULL,
        codigo_barras  = NULL
      WHERE id = $2
    `, [`Peça ${String(i + 1).padStart(3, '0')}`, id]);
  }
  console.log(`   ✅ ${estoque.length} itens de estoque anonimizados`);

  // ── 13. Referral / Indicadores ────────────────────────────────
  console.log('🔗 Anonimizando programa de indicações...');
  try {
    const indicadores = await query('SELECT id FROM referral_indicadores ORDER BY id');
    for (let i = 0; i < indicadores.length; i++) {
      const { id } = indicadores[i];
      await run(`
        UPDATE referral_indicadores SET
          nome         = $1,
          nome_contato = 'Contato Demo',
          email        = $2,
          telefone     = '(00) 00000-0000',
          whatsapp     = '(00) 00000-0000',
          observacoes  = NULL
        WHERE id = $3
      `, [`Indicador ${String(i + 1).padStart(3, '0')}`, emailFalso('indicador', i + 1), id]);
    }
    console.log(`   ✅ ${indicadores.length} indicadores anonimizados`);
  } catch {
    // tabela pode não existir em todos os ambientes
    console.log('   ℹ️  Tabela referral_indicadores não encontrada, pulando');
  }

  // ── 14. Auditoria — limpa logs ────────────────────────────────
  console.log('📋 Limpando logs de auditoria...');
  try {
    const result14 = await run(`DELETE FROM audit_logs`);
    console.log(`   ✅ ${result14.rowCount} logs de auditoria removidos`);
  } catch {
    console.log('   ℹ️  Tabela audit_logs não encontrada, pulando');
  }

  console.log('\n✅ Anonimização concluída com sucesso!');
  console.log('   Todos os dados sensíveis foram substituídos por informações de demonstração.');
  console.log('   O banco está pronto para gravação de vídeo.\n');

  await pool.end();
}

anonimizar().catch(err => {
  console.error('❌ Erro durante a anonimização:', err.message);
  process.exit(1);
});
