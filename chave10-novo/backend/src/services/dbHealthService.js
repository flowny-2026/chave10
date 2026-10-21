/**
 * dbHealthService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Verificação de integridade, consistência e saúde do banco de dados.
 *
 * Verificações realizadas:
 *   1. Conectividade — banco está respondendo
 *   2. Tamanho das tabelas — volume de registros por tabela
 *   3. Registros órfãos — FKs apontando para linhas inexistentes
 *   4. Duplicidades — emails duplicados, placas duplicadas por oficina
 *   5. Dados inconsistentes — OS/orçamentos com valores negativos, status inválido
 *   6. Índices — confirma que os índices críticos existem
 *   7. Status das migrations — versões aplicadas
 *   8. Uso de conexões — pool atual vs máximo
 *
 * Uso via API: GET /api/admin/db-health (somente master_admin)
 * Uso via CLI: node src/services/dbHealthService.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { pool, query, queryOne } = require('../db');
const log = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(label, data = {})   { return { status: 'ok',      label, ...data }; }
function warn(label, data = {}) { return { status: 'aviso',   label, ...data }; }
function fail(label, data = {}) { return { status: 'erro',    label, ...data }; }

// ─── 1. Conectividade ─────────────────────────────────────────────────────────
async function checkConectividade() {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const ms = Date.now() - start;
    return ms < 500
      ? ok('Banco de dados respondendo', { latencia_ms: ms })
      : warn('Banco lento', { latencia_ms: ms, limite_ms: 500 });
  } catch (err) {
    return fail('Banco de dados inacessível', { erro: err.message });
  }
}

// ─── 2. Tamanho das tabelas ───────────────────────────────────────────────────
async function checkTamanhoTabelas() {
  try {
    const rows = await query(`
      SELECT
        relname AS tabela,
        n_live_tup AS registros,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS tamanho
      FROM pg_class c
      JOIN pg_stat_user_tables s ON s.relname = c.relname
      WHERE c.relkind = 'r'
        AND c.relname NOT LIKE 'pg_%'
      ORDER BY n_live_tup DESC
    `);
    return ok('Tamanho das tabelas', { tabelas: rows });
  } catch (err) {
    return warn('Não foi possível verificar tamanho das tabelas', { erro: err.message });
  }
}

// ─── 3. Registros órfãos ──────────────────────────────────────────────────────
async function checkOrfaos() {
  const problemas = [];

  const checks = [
    {
      label: 'Veículos sem oficina válida',
      sql: `SELECT COUNT(*) n FROM veiculos v
            WHERE v.oficina_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM oficinas o WHERE o.id = v.oficina_id)`,
    },
    {
      label: 'Veículos com cliente de outra oficina',
      sql: `SELECT COUNT(*) n FROM veiculos v
            JOIN clientes c ON c.id = v.cliente_id
            WHERE c.oficina_id <> v.oficina_id`,
    },
    {
      label: 'OS com cliente de outra oficina',
      sql: `SELECT COUNT(*) n FROM ordens_servico os
            JOIN clientes c ON c.id = os.cliente_id
            WHERE c.oficina_id <> os.oficina_id`,
    },
    {
      label: 'OS com veículo de outra oficina',
      sql: `SELECT COUNT(*) n FROM ordens_servico os
            JOIN veiculos v ON v.id = os.veiculo_id
            WHERE v.oficina_id <> os.oficina_id`,
    },
    {
      label: 'Pagamentos de OS sem OS correspondente',
      sql: `SELECT COUNT(*) n FROM pagamentos_os p
            WHERE NOT EXISTS (SELECT 1 FROM ordens_servico os WHERE os.id = p.os_id)`,
    },
    {
      label: 'Parcelas a receber sem pagamento OS correspondente',
      sql: `SELECT COUNT(*) n FROM parcelas_receber pr
            WHERE NOT EXISTS (SELECT 1 FROM pagamentos_os p WHERE p.id = pr.pagamento_os_id)`,
    },
    {
      label: 'Orçamentos com cliente de outra oficina',
      sql: `SELECT COUNT(*) n FROM orcamentos o
            JOIN clientes c ON c.id = o.cliente_id
            WHERE c.oficina_id <> o.oficina_id`,
    },
    {
      label: 'Usuários com oficina deletada',
      sql: `SELECT COUNT(*) n FROM usuarios u
            WHERE u.oficina_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM oficinas o WHERE o.id = u.oficina_id)`,
    },
    {
      label: 'Audit logs com usuario_id inválido',
      sql: `SELECT COUNT(*) n FROM audit_logs al
            WHERE al.usuario_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.id = al.usuario_id)`,
    },
  ];

  for (const check of checks) {
    try {
      const row = await queryOne(check.sql);
      const n = parseInt(row?.n || 0);
      if (n > 0) problemas.push({ item: check.label, quantidade: n });
    } catch (err) {
      problemas.push({ item: check.label, erro: err.message });
    }
  }

  return problemas.length === 0
    ? ok('Nenhum registro órfão encontrado')
    : fail(`${problemas.length} tipo(s) de órfãos detectados`, { problemas });
}

// ─── 4. Duplicidades ──────────────────────────────────────────────────────────
async function checkDuplicidades() {
  const problemas = [];

  const checks = [
    {
      label: 'E-mails duplicados em usuários',
      sql: `SELECT email, COUNT(*) n FROM usuarios
            GROUP BY email HAVING COUNT(*) > 1`,
    },
    {
      label: 'E-mails duplicados em oficinas',
      sql: `SELECT email, COUNT(*) n FROM oficinas
            GROUP BY email HAVING COUNT(*) > 1`,
    },
    {
      label: 'Placas duplicadas na mesma oficina',
      sql: `SELECT oficina_id, placa, COUNT(*) n FROM veiculos
            WHERE placa IS NOT NULL AND placa <> ''
            GROUP BY oficina_id, placa HAVING COUNT(*) > 1`,
    },
    {
      label: 'Números de OS duplicados na mesma oficina',
      sql: `SELECT oficina_id, numero, COUNT(*) n FROM ordens_servico
            WHERE numero IS NOT NULL
            GROUP BY oficina_id, numero HAVING COUNT(*) > 1`,
    },
    {
      label: 'Números de orçamento duplicados na mesma oficina',
      sql: `SELECT oficina_id, numero, COUNT(*) n FROM orcamentos
            WHERE numero IS NOT NULL
            GROUP BY oficina_id, numero HAVING COUNT(*) > 1`,
    },
  ];

  for (const check of checks) {
    try {
      const rows = await query(check.sql);
      if (rows.length > 0) {
        problemas.push({ item: check.label, ocorrencias: rows.length, exemplos: rows.slice(0, 5) });
      }
    } catch (err) {
      problemas.push({ item: check.label, erro: err.message });
    }
  }

  return problemas.length === 0
    ? ok('Nenhuma duplicidade encontrada')
    : warn(`${problemas.length} tipo(s) de duplicidade detectados`, { problemas });
}

// ─── 5. Dados inconsistentes ──────────────────────────────────────────────────
async function checkConsistencia() {
  const problemas = [];

  const checks = [
    {
      label: 'OS com valor negativo',
      sql: `SELECT COUNT(*) n FROM ordens_servico WHERE valor < 0 OR valor_mo < 0 OR valor_pecas < 0`,
    },
    {
      label: 'OS com valor_mo + valor_pecas ≠ valor',
      sql: `SELECT COUNT(*) n FROM ordens_servico
            WHERE ABS((valor_mo + valor_pecas) - valor) > 0.01
              AND valor > 0`,
    },
    {
      label: 'Orçamentos com desconto maior que o total',
      sql: `SELECT COUNT(*) n FROM orcamentos
            WHERE desconto > (valor_mo + valor_pecas) AND desconto > 0`,
    },
    {
      label: 'Parcelas a receber com valor negativo',
      sql: `SELECT COUNT(*) n FROM parcelas_receber WHERE valor <= 0`,
    },
    {
      label: 'Despesas com valor zero ou negativo',
      sql: `SELECT COUNT(*) n FROM despesas WHERE valor <= 0`,
    },
    {
      label: 'Usuários ativos sem nome ou email',
      sql: `SELECT COUNT(*) n FROM usuarios
            WHERE ativo = 1 AND (nome IS NULL OR nome = '' OR email IS NULL OR email = '')`,
    },
    {
      label: 'Oficinas sem email',
      sql: `SELECT COUNT(*) n FROM oficinas WHERE email IS NULL OR email = ''`,
    },
  ];

  for (const check of checks) {
    try {
      const row = await queryOne(check.sql);
      const n = parseInt(row?.n || 0);
      if (n > 0) problemas.push({ item: check.label, quantidade: n });
    } catch (err) {
      problemas.push({ item: check.label, erro: err.message });
    }
  }

  return problemas.length === 0
    ? ok('Dados consistentes')
    : warn(`${problemas.length} inconsistência(s) encontrada(s)`, { problemas });
}

// ─── 6. Índices críticos ──────────────────────────────────────────────────────
async function checkIndices() {
  try {
    const rows = await query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY indexname
    `);
    const existentes = new Set(rows.map(r => r.indexname));

    const criticos = [
      'idx_usuarios_email', 'idx_clientes_oficina', 'idx_os_oficina',
      'idx_os_status', 'idx_audit_logs_created', 'idx_audit_logs_severidade',
      'idx_alerts_resolvido', 'idx_approval_links_token',
    ];

    const ausentes = criticos.filter(i => !existentes.has(i));

    return ausentes.length === 0
      ? ok('Todos os índices críticos existem', { total_indices: existentes.size })
      : warn('Índices críticos ausentes', { ausentes });
  } catch (err) {
    return warn('Não foi possível verificar índices', { erro: err.message });
  }
}

// ─── 7. Status das migrations ─────────────────────────────────────────────────
async function checkMigrations() {
  try {
    const existe = await queryOne(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'schema_migrations'
      ) AS existe
    `);

    if (!existe?.existe) {
      return warn('Tabela schema_migrations não encontrada — execute o migrationRunner.js');
    }

    const rows = await query(
      `SELECT version, name, applied_at FROM schema_migrations ORDER BY version`
    );
    return ok('Sistema de migrations ativo', { migrations_aplicadas: rows });
  } catch (err) {
    return warn('Não foi possível verificar migrations', { erro: err.message });
  }
}

// ─── 8. Pool de conexões ──────────────────────────────────────────────────────
async function checkPool() {
  try {
    const total   = pool.totalCount;
    const idle    = pool.idleCount;
    const waiting = pool.waitingCount;
    const max     = 10; // igual ao configurado em db.js

    const pct = Math.round((total / max) * 100);
    const dados = { total, idle, waiting, max, uso_pct: pct };

    if (waiting > 0)  return fail('Conexões em fila de espera', dados);
    if (pct > 80)     return warn('Pool de conexões quase cheio', dados);
    return ok('Pool de conexões saudável', dados);
  } catch (err) {
    return warn('Não foi possível verificar pool', { erro: err.message });
  }
}

// ─── Runner principal ─────────────────────────────────────────────────────────

async function runHealthCheck() {
  const inicio = Date.now();
  const checks = await Promise.allSettled([
    checkConectividade(),
    checkTamanhoTabelas(),
    checkOrfaos(),
    checkDuplicidades(),
    checkConsistencia(),
    checkIndices(),
    checkMigrations(),
    checkPool(),
  ]);

  const nomes = [
    'conectividade', 'tamanho_tabelas', 'orfaos',
    'duplicidades', 'consistencia', 'indices',
    'migrations', 'pool_conexoes',
  ];

  const resultado = {};
  let erros = 0, avisos = 0;

  nomes.forEach((nome, i) => {
    const r = checks[i].status === 'fulfilled' ? checks[i].value : fail('Exceção', { erro: checks[i].reason?.message });
    resultado[nome] = r;
    if (r.status === 'erro')  erros++;
    if (r.status === 'aviso') avisos++;
  });

  const status_geral = erros > 0 ? 'erro' : avisos > 0 ? 'aviso' : 'ok';

  return {
    status_geral,
    erros,
    avisos,
    duracao_ms: Date.now() - inicio,
    verificado_em: new Date().toISOString(),
    checks: resultado,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  runHealthCheck().then(resultado => {
    const icon = { ok: '✅', aviso: '⚠️ ', erro: '❌' };
    console.log('\n══════════════════════════════════════════');
    console.log(' Chave 10 — Verificação de Saúde do Banco');
    console.log('══════════════════════════════════════════\n');

    for (const [nome, check] of Object.entries(resultado.checks)) {
      const i = icon[check.status] || '•';
      console.log(`${i} ${nome.padEnd(20)} ${check.label}`);
      if (check.status !== 'ok' && check.problemas) {
        check.problemas.forEach(p => console.log(`     • ${p.item}: ${p.quantidade ?? p.ocorrencias ?? p.erro ?? ''}`));
      }
    }

    console.log(`\nStatus geral: ${icon[resultado.status_geral]} ${resultado.status_geral.toUpperCase()}`);
    console.log(`Erros: ${resultado.erros} | Avisos: ${resultado.avisos} | Duração: ${resultado.duracao_ms}ms\n`);
    process.exit(resultado.erros > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Erro fatal:', err.message);
    process.exit(1);
  });
}

module.exports = { runHealthCheck };
