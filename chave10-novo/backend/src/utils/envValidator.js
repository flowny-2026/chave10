/**
 * envValidator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Validação centralizada de variáveis de ambiente do Chave 10.
 *
 * Executado ANTES de qualquer outra inicialização.
 * Se uma variável obrigatória estiver ausente ou malformada, o processo
 * encerra com exit code 1 e uma mensagem clara de qual variável falta.
 *
 * NUNCA imprime o valor das variáveis — apenas o nome e o formato esperado.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Regras de validação ──────────────────────────────────────────────────────

const RULES = [
  // ── Obrigatórias em TODOS os ambientes ──────────────────────────────────
  {
    name: 'JWT_SECRET',
    required: true,
    validate: (v) => v.length >= 32,
    errorMsg: 'JWT_SECRET deve ter pelo menos 32 caracteres. Gere com: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
  },
  {
    name: 'DATABASE_URL',
    required: true,
    validate: (v) => /^postgres(ql)?:\/\/.+/.test(v),
    errorMsg: 'DATABASE_URL deve ser uma connection string PostgreSQL válida (postgresql://...)',
  },

  // ── Obrigatórias apenas em PRODUÇÃO ────────────────────────────────────
  {
    name: 'FRONTEND_URL',
    requiredInProduction: true,
    validate: (v) => /^https?:\/\/.+/.test(v) && !v.endsWith('/'),
    errorMsg: 'FRONTEND_URL deve ser uma URL válida sem barra final (ex: https://seuapp.vercel.app)',
  },
  {
    name: 'MASTER_ADMIN_PASSWORD',
    requiredInProduction: true,
    validate: (v) => v.length >= 8 && v !== 'admin123' && v !== 'troque_antes_do_deploy',
    errorMsg: 'MASTER_ADMIN_PASSWORD deve ter pelo menos 8 caracteres e não ser a senha padrão',
  },

  // ── Opcionais mas validadas se presentes ────────────────────────────────
  {
    name: 'GOOGLE_CLIENT_ID',
    required: false,
    validate: (v) => v.endsWith('.apps.googleusercontent.com') || v === '',
    errorMsg: 'GOOGLE_CLIENT_ID deve terminar com .apps.googleusercontent.com',
  },
  {
    name: 'PORT',
    required: false,
    validate: (v) => { const n = parseInt(v); return n >= 1 && n <= 65535; },
    errorMsg: 'PORT deve ser um número entre 1 e 65535',
  },
  {
    name: 'BACKUP_INTERVAL_HOURS',
    required: false,
    validate: (v) => { const n = parseInt(v); return n >= 1 && n <= 720; },
    errorMsg: 'BACKUP_INTERVAL_HOURS deve ser entre 1 e 720',
  },
  {
    name: 'REQUEST_TIMEOUT_MS',
    required: false,
    validate: (v) => { const n = parseInt(v); return n >= 5000 && n <= 120000; },
    errorMsg: 'REQUEST_TIMEOUT_MS deve ser entre 5000 e 120000',
  },
  {
    name: 'NODE_ENV',
    required: false,
    validate: (v) => ['development', 'production', 'test'].includes(v),
    errorMsg: 'NODE_ENV deve ser development, production ou test',
  },
];

// ─── Validador ────────────────────────────────────────────────────────────────

function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  for (const rule of RULES) {
    const value = process.env[rule.name];
    const isRequired = rule.required || (rule.requiredInProduction && isProduction);

    // Variável ausente
    if (!value || value.trim() === '') {
      if (isRequired) {
        errors.push(`❌ ${rule.name} — OBRIGATÓRIA mas não definida`);
      }
      continue; // não valida formato se está ausente e é opcional
    }

    // Valida formato (somente se a variável está definida)
    if (rule.validate && !rule.validate(value.trim())) {
      if (isRequired) {
        errors.push(`❌ ${rule.name} — formato inválido: ${rule.errorMsg}`);
      } else {
        warnings.push(`⚠️  ${rule.name} — ${rule.errorMsg}`);
      }
    }
  }

  // ── Resultado ──────────────────────────────────────────────────────────────
  if (warnings.length > 0) {
    console.warn('\n⚠️  Avisos de variáveis de ambiente:');
    warnings.forEach((w) => console.warn('   ' + w));
    console.warn('');
  }

  if (errors.length > 0) {
    console.error('\n╔══════════════════════════════════════════════════════════╗');
    console.error('║  ERRO FATAL: Variáveis de ambiente inválidas/ausentes  ║');
    console.error('╚══════════════════════════════════════════════════════════╝\n');
    errors.forEach((e) => console.error('   ' + e));
    console.error('\n   Consulte o arquivo .env.example para referência.');
    console.error('   O servidor não será iniciado até que todas as variáveis');
    console.error('   obrigatórias estejam configuradas corretamente.\n');
    process.exit(1);
  }

  // Verificação extra: avisa se JWT_SECRET parece fraco
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
    console.warn('⚠️  JWT_SECRET tem menos de 64 caracteres — recomendado usar 128 hex chars para máxima segurança.');
  }
}

module.exports = { validateEnv };
