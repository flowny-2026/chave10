/**
 * rateLimits.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Todos os rate limiters do Chave 10 centralizados em um único lugar.
 *
 * Estratégia de defesa em camadas:
 *
 *  1. loginLimiter        — 5 tentativas / 15 min por IP  (brute force / credential stuffing)
 *  2. registerLimiter     — 3 cadastros / hora por IP     (spam de contas)
 *  3. googleAuthLimiter   — 10 autenticações Google / 15 min por IP
 *  4. sensitiveOpsLimiter — 10 ops sensíveis / 15 min por IP (trocar senha, redefinir senha)
 *  5. adminLimiter        — 60 req / min por IP           (painel admin)
 *  6. writeLimiter        — 100 req / min por IP          (POST/PUT/PATCH/DELETE gerais)
 *  7. readLimiter         — 300 req / min por IP          (GET gerais)
 *  8. globalLimiter       — 500 req / min por IP          (flood geral — última linha)
 *
 * Anti-enumeração de usuários:
 *   Todos os limiters de autenticação usam skipSuccessfulRequests: false para que
 *   ataques de credential stuffing também consumam o limite mesmo em acertos.
 *   Respostas de erro sempre retornam 429 genérico — sem revelar se o email existe.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const rateLimit = require('express-rate-limit');

// ─── Mensagens genéricas (não revelam detalhes internos) ──────────────────────
const MSG_LOGIN      = { error: 'Muitas tentativas. Tente novamente em 15 minutos.' };
const MSG_REGISTER   = { error: 'Muitos cadastros deste IP. Tente novamente em 1 hora.' };
const MSG_SENSITIVE  = { error: 'Operação bloqueada temporariamente. Tente em 15 minutos.' };
const MSG_ADMIN      = { error: 'Muitas requisições administrativas. Tente novamente em instantes.' };
const MSG_WRITE      = { error: 'Muitas requisições. Tente novamente em instantes.' };
const MSG_GLOBAL     = { error: 'Muitas requisições. Tente novamente em instantes.' };

// ─── Opções comuns ────────────────────────────────────────────────────────────
const commonOpts = {
  standardHeaders: 'draft-7', // RateLimit-* headers padronizados
  legacyHeaders:   false,      // remove X-RateLimit-* antigos
};

// ─── 1. Login — anti brute force / credential stuffing ───────────────────────
// 5 tentativas por IP em 15 minutos.
// skipSuccessfulRequests: false — logins corretos também contam (impede credential stuffing
// que testa uma senha por vez e para na primeira que funciona).
const loginLimiter = rateLimit({
  ...commonOpts,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: MSG_LOGIN,
  skipSuccessfulRequests: false,
});

// ─── 2. Registro de conta — anti spam de criação de contas ───────────────────
// 3 cadastros por IP por hora.
const registerLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: MSG_REGISTER,
  skipSuccessfulRequests: false,
});

// ─── 3. Autenticação Google — previne abuso do fluxo OAuth ───────────────────
// 10 requisições por IP em 15 minutos.
const googleAuthLimiter = rateLimit({
  ...commonOpts,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: MSG_LOGIN,
  skipSuccessfulRequests: false,
});

// ─── 4. Operações sensíveis — trocar senha, redefinir senha ──────────────────
// 10 operações por IP em 15 minutos.
const sensitiveOpsLimiter = rateLimit({
  ...commonOpts,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: MSG_SENSITIVE,
  skipSuccessfulRequests: false,
});

// ─── 5. Painel admin — protege operações de alto impacto ─────────────────────
// 60 req / min por IP (admin legítimo raramente precisa de mais).
const adminLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 1000,
  max: 60,
  message: MSG_ADMIN,
});

// ─── 6. Rotas de escrita (POST/PUT/PATCH/DELETE) ──────────────────────────────
// 100 req / min por IP.
const writeLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 1000,
  max: 100,
  message: MSG_WRITE,
  skip: (req) => req.method === 'GET',
});

// ─── 7. Rotas de leitura (GET) ────────────────────────────────────────────────
// 300 req / min por IP — GETs são mais frequentes (polling, atualizações de tela).
const readLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 1000,
  max: 300,
  message: MSG_GLOBAL,
  skip: (req) => req.method !== 'GET',
});

// ─── 8. Flood global — última linha de defesa ────────────────────────────────
// 500 req / min por IP independente do método.
// Aplicado antes de todas as rotas para cortar floods antes de chegar nas rotas.
const globalLimiter = rateLimit({
  ...commonOpts,
  windowMs: 60 * 1000,
  max: 500,
  message: MSG_GLOBAL,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  googleAuthLimiter,
  sensitiveOpsLimiter,
  adminLimiter,
  writeLimiter,
  readLimiter,
  globalLimiter,
};
