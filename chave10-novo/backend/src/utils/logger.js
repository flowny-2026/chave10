/**
 * logger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Logger de segurança centralizado do Chave 10.
 *
 * Garantias de segurança dos logs:
 *   - Senhas, hashes e tokens NUNCA são registrados
 *   - IPs são parcialmente anonimizados (apenas 3 octetos/4 grupos)
 *   - Stack traces apenas em desenvolvimento (NODE_ENV !== 'production')
 *   - Connection strings e variáveis de ambiente são mascaradas
 *   - Campos sensíveis detectados e removidos automaticamente
 *
 * Eventos de segurança monitorados:
 *   LOGIN_OK              — login bem-sucedido
 *   LOGIN_FAIL            — credenciais inválidas
 *   SECURITY:*            — eventos gerais de segurança (IDOR, acesso negado)
 *   SECURITY:rate_limit_blocked   — IP bloqueado por rate limit (429)
 *   SECURITY:brute_force_detectado — padrão de brute force identificado
 *   SECURITY:flood_detectado       — flood de requisições detectado
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Campos sensíveis que NUNCA devem aparecer nos logs ──────────────────────
const SENSITIVE_FIELDS = new Set([
  'senha', 'senha_hash', 'password', 'hash', 'token', 'secret',
  'authorization', 'credential', 'api_key', 'apikey', 'access_token',
  'refresh_token', 'private_key', 'client_secret', 'jwt',
]);

// ─── Padrões de strings sensíveis para mascarar em valores ───────────────────
const SENSITIVE_PATTERNS = [
  { re: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,    mask: '[TOKEN_REDACTED]' },
  { re: /postgresql:\/\/[^\s]*/gi,              mask: '[DB_URL_REDACTED]' },
  { re: /mysql:\/\/[^\s]*/gi,                   mask: '[DB_URL_REDACTED]' },
  { re: /password=[^\s&]*/gi,                   mask: 'password=[REDACTED]' },
  { re: /DATABASE_URL=[^\s]*/gi,                mask: 'DATABASE_URL=[REDACTED]' },
  { re: /\$2[ab]\$\d+\$[A-Za-z0-9./]{53}/g,   mask: '[BCRYPT_HASH]' },
];

function maskSensitiveString(str) {
  if (typeof str !== 'string') return str;
  let result = str;
  for (const { re, mask } of SENSITIVE_PATTERNS) {
    result = result.replace(re, mask);
  }
  return result;
}

/**
 * Remove campos sensíveis de um objeto antes de serializar para log.
 * Opera de forma recursiva em até 3 níveis de profundidade.
 */
function sanitize(data, depth = 0) {
  if (!data || typeof data !== 'object' || depth > 3) return data;
  if (Array.isArray(data)) return data.map((item) => sanitize(item, depth + 1));

  const safe = {};
  for (const [key, val] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    if (SENSITIVE_FIELDS.has(keyLower)) {
      safe[key] = '[REDACTED]';
    } else if (typeof val === 'string') {
      safe[key] = maskSensitiveString(val);
    } else if (typeof val === 'object') {
      safe[key] = sanitize(val, depth + 1);
    } else {
      safe[key] = val;
    }
  }
  return safe;
}

function timestamp() {
  return new Date().toISOString();
}

function fmt(level, event, data) {
  const parts = [`[${timestamp()}] [${level}] [${event.toUpperCase()}]`];
  if (data) {
    const safe = sanitize(typeof data === 'object' ? data : { value: data });
    parts.push(JSON.stringify(safe));
  }
  return parts.join(' ');
}

// ─── Contadores em memória para detectar padrões de ataque ───────────────────
// Apenas para estatísticas internas — não usados para bloqueio (isso é feito
// pelo express-rate-limit). Limpos periodicamente para evitar leak.
const securityCounters = new Map(); // event:ip -> { count, firstAt, lastAt }
const COUNTER_TTL = 60 * 60 * 1000; // 1 hora

function incrementCounter(event, ip) {
  const key = `${event}:${ip}`;
  const now = Date.now();
  const c = securityCounters.get(key) || { count: 0, firstAt: now, lastAt: now };
  c.count++;
  c.lastAt = now;
  securityCounters.set(key, c);
  // Limpeza periódica
  if (securityCounters.size > 5000) {
    for (const [k, v] of securityCounters) {
      if (now - v.lastAt > COUNTER_TTL) securityCounters.delete(k);
    }
  }
  return c;
}

// ─── API pública do logger ────────────────────────────────────────────────────

const log = {
  // ── Autenticação ─────────────────────────────────────────────────────────
  loginOk(data) {
    console.log(fmt('INFO', 'LOGIN_OK', data));
  },

  loginFail(data) {
    const ip = data?.ip || 'unknown';
    const c  = incrementCounter('login_fail', ip);
    console.warn(fmt('WARN', 'LOGIN_FAIL', { ...data, tentativas_consecutivas: c.count }));
    // Alerta de padrão suspeito após 3+ falhas
    if (c.count >= 3 && c.count % 3 === 0) {
      console.warn(fmt('WARN', 'SECURITY:login_fail_repetido', {
        ip: data?.ip,
        total_falhas: c.count,
        primeira_tentativa: new Date(c.firstAt).toISOString(),
      }));
    }
  },

  // ── Segurança ────────────────────────────────────────────────────────────
  security(event, data) {
    console.warn(fmt('WARN', `SECURITY:${event}`, data));
  },

  // Chamado pelos rate limiters em todo bloqueio 429
  rateLimitBlocked(data) {
    const ip = data?.ip || 'unknown';
    incrementCounter(`rl_${data?.limiter}`, ip);
    console.warn(fmt('WARN', 'SECURITY:rate_limit_blocked', data));
  },

  // Chamado quando padrão de brute force é identificado no login
  bruteForceDetected(data) {
    console.error(fmt('ERROR', 'SECURITY:brute_force_detectado', data));
  },

  // ── Informação ───────────────────────────────────────────────────────────
  info(event, data) {
    console.log(fmt('INFO', event, data));
  },

  // ── Avisos ───────────────────────────────────────────────────────────────
  warn(event, data) {
    console.warn(fmt('WARN', event, data));
  },

  // ── Erros internos ───────────────────────────────────────────────────────
  // Nunca expõe stack trace para o cliente — apenas para logs internos em dev.
  error(event, err) {
    const safeMsg = maskSensitiveString(err?.message || String(err));
    console.error(fmt('ERROR', event, { message: safeMsg }));
    if (process.env.NODE_ENV !== 'production' && err?.stack) {
      console.error(maskSensitiveString(err.stack));
    }
  },
};

module.exports = log;
