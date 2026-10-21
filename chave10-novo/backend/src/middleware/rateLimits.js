/**
 * rateLimits.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Rate limiters centralizados do Chave 10 com logging de segurança integrado.
 *
 * Estratégia de defesa em camadas:
 *
 *  Camada 0 — globalLimiter     : 500 req / min / IP  — flood geral
 *  Camada 1 — readLimiter       : 300 req / min / IP  — GETs
 *  Camada 2 — writeLimiter      : 100 req / min / IP  — POST/PUT/PATCH/DELETE
 *  Camada 3 — adminLimiter      :  60 req / min / IP  — painel admin
 *  Camada 4 — loginLimiter      :   5 req / 15min/ IP — brute force/credential stuffing
 *  Camada 5 — registerLimiter   :   3 req / hora/ IP  — spam de contas
 *  Camada 6 — googleAuthLimiter :  10 req / 15min/ IP — abuso OAuth
 *  Camada 7 — sensitiveOpsLimiter: 10 req / 15min/ IP — troca de senha
 *
 * Recursos de segurança:
 *   - Log automático de todo 429 com IP, rota, método e tipo de limite
 *   - Bloqueio progressivo para brute force de login (escala até 1h)
 *   - Retry-After header em todas as respostas 429
 *   - Mensagens genéricas — não revelam detalhes internos
 *   - skipSuccessfulRequests: false nos limiters de auth (anti credential stuffing)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const rateLimit = require('express-rate-limit');
const log       = require('../utils/logger');

// ─── Bloqueio progressivo de login por IP ────────────────────────────────────
// Registra quantas violações de rate limit cada IP acumulou no endpoint de login.
// A janela escala: 1ª violação=15min, 2ª=30min, 3ª+=60min.
// Armazenado em memória — adequado para instância única. Em cluster, use Redis.
const loginViolations = new Map(); // ip -> { count, resetAt }

function getLoginWindow(ip) {
  const v = loginViolations.get(ip);
  if (!v || Date.now() > v.resetAt) return 15 * 60 * 1000; // 15 min padrão
  if (v.count >= 3) return 60 * 60 * 1000;  // 3ª+ violação: 1 hora
  if (v.count === 2) return 30 * 60 * 1000; // 2ª violação: 30 min
  return 15 * 60 * 1000;                     // 1ª violação: 15 min
}

function recordLoginViolation(ip, windowMs) {
  const v = loginViolations.get(ip) || { count: 0, resetAt: 0 };
  v.count  = (Date.now() > v.resetAt) ? 1 : v.count + 1;
  v.resetAt = Date.now() + windowMs;
  loginViolations.set(ip, v);
  // Limpeza periódica — evita memory leak
  if (loginViolations.size > 10000) {
    const now = Date.now();
    for (const [k, val] of loginViolations) {
      if (now > val.resetAt) loginViolations.delete(k);
    }
  }
}

// ─── Helpers de log ───────────────────────────────────────────────────────────

/**
 * Anonimiza parcialmente o IP para os logs:
 * IPv4: mantém os 3 primeiros octetos (ex: 192.168.1.xxx)
 * IPv6: mantém os 4 primeiros grupos (ex: 2001:db8:85a3:0::xxxx)
 * Nunca loga o IP completo — reduz exposição de dados pessoais (LGPD).
 */
function anonymizeIp(ip) {
  if (!ip || typeof ip !== 'string') return 'unknown';
  // Remove prefixo ::ffff: de IPv4-mapeado em IPv6
  const clean = ip.replace(/^::ffff:/, '');
  if (clean.includes(':')) {
    // IPv6 — mantém os primeiros 4 grupos
    const parts = clean.split(':');
    return parts.slice(0, 4).join(':') + ':xxxx';
  }
  // IPv4 — mascara o último octeto
  const parts = clean.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  return 'masked';
}

/**
 * Gera um handler padrão para onLimitReached / handler do express-rate-limit.
 * Registra o evento no log de segurança com contexto suficiente para investigação,
 * sem expor dados sensíveis.
 */
function makeRateLimitHandler(limiterName, onBlock) {
  return (req, res) => {
    const ip      = anonymizeIp(req.ip);
    const path    = req.path?.slice(0, 80) || '/';
    const method  = req.method || 'UNKNOWN';
    const ua      = (req.headers['user-agent'] || '').slice(0, 100);

    log.rateLimitBlocked({
      limiter:  limiterName,
      ip,
      method,
      path,
      ua,
    });

    if (typeof onBlock === 'function') onBlock(req, ip);

    // Calcula Retry-After em segundos a partir do header RateLimit-Reset
    const resetHeader = res.getHeader('RateLimit-Reset');
    let retryAfter = 60;
    if (resetHeader) {
      const resetTs = typeof resetHeader === 'number' ? resetHeader : parseInt(resetHeader);
      if (!isNaN(resetTs)) retryAfter = Math.max(1, resetTs - Math.floor(Date.now() / 1000));
    }
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({ error: messageFor(limiterName), retryAfter });
  };
}

function messageFor(limiterName) {
  const msgs = {
    login:       'Muitas tentativas. Tente novamente mais tarde.',
    register:    'Muitos cadastros deste IP. Tente novamente em 1 hora.',
    googleAuth:  'Muitas tentativas. Tente novamente mais tarde.',
    sensitive:   'Operação bloqueada temporariamente. Tente mais tarde.',
    admin:       'Muitas requisições administrativas. Tente novamente em instantes.',
    write:       'Muitas requisições. Tente novamente em instantes.',
    read:        'Muitas requisições. Tente novamente em instantes.',
    global:      'Muitas requisições. Tente novamente em instantes.',
  };
  return msgs[limiterName] || 'Muitas requisições. Tente novamente em instantes.';
}

// ─── Opções comuns ────────────────────────────────────────────────────────────
const commonOpts = {
  standardHeaders: 'draft-7', // RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
  legacyHeaders:   false,     // remove X-RateLimit-* antigos
};

// ─── 0. Flood global ─────────────────────────────────────────────────────────
// Primeira barreira — corta floods antes de chegar em qualquer lógica.
const globalLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 1000,
  max: 500,
  handler: makeRateLimitHandler('global'),
});

// ─── 1. Leitura (GET) ─────────────────────────────────────────────────────────
const readLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 1000,
  max: 300,
  skip: (req) => req.method !== 'GET',
  handler: makeRateLimitHandler('read'),
});

// ─── 2. Escrita (POST / PUT / PATCH / DELETE) ─────────────────────────────────
const writeLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 1000,
  max: 100,
  skip: (req) => req.method === 'GET',
  handler: makeRateLimitHandler('write'),
});

// ─── 3. Painel admin ─────────────────────────────────────────────────────────
const adminLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 1000,
  max: 60,
  handler: makeRateLimitHandler('admin'),
});

// ─── 4. Login — brute force / credential stuffing ────────────────────────────
// Janela dinâmica baseada no histórico de violações do IP.
// skipSuccessfulRequests: false — logins corretos também contam (impede
// credential stuffing que testa uma senha por vez e para no acerto).
const loginLimiter = rateLimit({
  ...commonOpts,
  windowMs: (req) => getLoginWindow(req.ip),
  max: 5,
  skipSuccessfulRequests: false,
  handler: makeRateLimitHandler('login', (req, ip) => {
    const windowMs = getLoginWindow(req.ip);
    recordLoginViolation(req.ip, windowMs);
    const v = loginViolations.get(req.ip);
    log.bruteForceDetected({
      ip,
      violacoes_acumuladas: v?.count || 1,
      proximo_bloqueio_min: windowMs / 60000,
    });
  }),
});

// ─── 5. Registro de conta ────────────────────────────────────────────────────
// 3 cadastros por IP por hora — anti spam de criação de contas.
const registerLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 60 * 1000,
  max: 3,
  skipSuccessfulRequests: false,
  handler: makeRateLimitHandler('register'),
});

// ─── 6. Autenticação Google ──────────────────────────────────────────────────
// 10 req por IP em 15 minutos — previne abuso do fluxo OAuth.
const googleAuthLimiter = rateLimit({
  ...commonOpts,
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  handler: makeRateLimitHandler('googleAuth'),
});

// ─── 7. Operações sensíveis (troca/redefinição de senha) ─────────────────────
// 10 ops por IP em 15 minutos.
const sensitiveOpsLimiter = rateLimit({
  ...commonOpts,
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  handler: makeRateLimitHandler('sensitive'),
});

module.exports = {
  globalLimiter,
  readLimiter,
  writeLimiter,
  adminLimiter,
  loginLimiter,
  registerLimiter,
  googleAuthLimiter,
  sensitiveOpsLimiter,
};
