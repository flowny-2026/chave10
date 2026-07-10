/**
 * errorHandler.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Middleware global de tratamento de erros do Chave 10.
 *
 * Garante que NUNCA seja exposto ao cliente:
 *   - Stack trace
 *   - Caminhos internos do servidor
 *   - Queries SQL / detalhes do banco
 *   - Variáveis de ambiente
 *   - Tokens ou credenciais
 *
 * Padrão de status codes:
 *   400 — Requisição malformada / payload inválido
 *   401 — Não autenticado
 *   403 — Sem permissão / CORS bloqueado
 *   404 — Recurso não encontrado
 *   405 — Método HTTP não permitido
 *   409 — Conflito (registro duplicado)
 *   413 — Payload muito grande
 *   415 — Content-Type não suportado
 *   429 — Rate limit atingido
 *   500 — Erro interno (genérico, sem detalhes)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const log = require('../utils/logger');

/**
 * Mapeia códigos de erro do PostgreSQL para respostas HTTP seguras.
 * Não expõe mensagem do driver ao cliente.
 */
function pgErrorToHttp(err) {
  switch (err.code) {
    case '23505': return { status: 409, message: 'Registro já existe (conflito de dados únicos)' };
    case '23503': return { status: 409, message: 'Referência inválida — registro relacionado não encontrado' };
    case '23502': return { status: 400, message: 'Campo obrigatório ausente' };
    case '22P02': return { status: 400, message: 'Formato de dado inválido' };
    case '42501': return { status: 403, message: 'Permissão negada pelo banco de dados' };
    case '08006':
    case '08001':
    case '08004': return { status: 503, message: 'Serviço temporariamente indisponível' };
    default:      return null;
  }
}

/**
 * Remove qualquer informação sensível de strings de erro antes de logar.
 * Evita que tokens JWT, senhas ou connection strings apareçam nos logs.
 */
function sanitizeForLog(err) {
  const msg = err?.message || String(err);
  return msg
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, '[TOKEN_REDACTED]')
    .replace(/password=[^\s&]*/gi, 'password=[REDACTED]')
    .replace(/postgresql:\/\/[^\s]*/gi, '[DB_URL_REDACTED]')
    .replace(/DATABASE_URL=[^\s]*/gi, 'DATABASE_URL=[REDACTED]');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // ── 1. Payload muito grande (express.json / express.urlencoded) ──────────
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload muito grande. Limite: 50kb.' });
  }

  // ── 2. JSON malformado no body ────────────────────────────────────────────
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }

  // ── 3. Content-Type inválido (express.json rejeita outros tipos) ──────────
  if (err.status === 415) {
    return res.status(415).json({ error: 'Content-Type não suportado. Use application/json' });
  }

  // ── 4. Erro de CORS ───────────────────────────────────────────────────────
  if (err.message?.startsWith('CORS') || err.message?.includes('origem não permitida')) {
    return res.status(403).json({ error: 'Origem não permitida' });
  }

  // ── 5. Método HTTP não permitido ──────────────────────────────────────────
  if (err.status === 405) {
    return res.status(405).json({ error: 'Método HTTP não permitido' });
  }

  // ── 6. Erros do PostgreSQL — mapeia para HTTP sem expor SQL ──────────────
  if (err.code && /^\d{5}$/.test(err.code)) {
    const mapped = pgErrorToHttp(err);
    if (mapped) {
      log.warn('pg_error_mapeado', { code: err.code, path: req.path, method: req.method });
      return res.status(mapped.status).json({ error: mapped.message });
    }
    // Erro pg desconhecido — loga internamente mas nunca expõe ao cliente
    log.error('pg_error_desconhecido', {
      code: err.code,
      path: req.path,
      method: req.method,
      message: sanitizeForLog(err),
    });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }

  // ── 7. Erro de JWT (token inválido / expirado) ────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  // ── 8. Qualquer outro erro não tratado ────────────────────────────────────
  // Loga internamente com dados sanitizados — NUNCA envia stack ao cliente
  log.error('unhandled_error', {
    message: sanitizeForLog(err),
    path:    req.path,
    method:  req.method,
    ip:      req.ip,
    // stack apenas em desenvolvimento
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  res.status(500).json({ error: 'Erro interno do servidor' });
}

/**
 * Middleware para rotas não encontradas (404).
 * Deve ser registrado ANTES do errorHandler e DEPOIS de todas as rotas.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rota não encontrada' });
}

/**
 * Middleware que bloqueia métodos HTTP não utilizados pela API.
 * A API usa apenas: GET, POST, PUT, PATCH, DELETE, OPTIONS (CORS preflight).
 */
function blockUnusedMethods(req, res, next) {
  const allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  if (!allowed.includes(req.method)) {
    res.set('Allow', allowed.join(', '));
    return res.status(405).json({ error: 'Método HTTP não permitido' });
  }
  next();
}

/**
 * Middleware que valida Content-Type para requisições com body.
 * POST, PUT e PATCH devem enviar application/json.
 * Exceção: OPTIONS (CORS preflight) — passa sempre.
 */
function requireJsonContentType(req, res, next) {
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];
  if (!methodsWithBody.includes(req.method)) return next();

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return res.status(415).json({
      error: 'Content-Type deve ser application/json',
    });
  }
  next();
}

module.exports = { errorHandler, notFoundHandler, blockUnusedMethods, requireJsonContentType };
