// Logger de segurança — registra eventos importantes sem expor dados sensíveis

const LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' };

function log(level, event, details = {}) {
  const ts = new Date().toISOString();
  const safe = JSON.stringify(details);
  console.log(`[${ts}] [${level}] [${event}] ${safe}`);
}

const logger = {
  loginOk:        (email, perfil, ip) => log(LEVELS.INFO,  'LOGIN_OK',        { email, perfil, ip }),
  loginFail:      (email, ip)         => log(LEVELS.WARN,  'LOGIN_FAIL',       { email, ip }),
  loginBlocked:   (email, ip)         => log(LEVELS.WARN,  'LOGIN_BLOCKED',    { email, ip }),
  accessDenied:   (path, perfil, ip)  => log(LEVELS.WARN,  'ACCESS_DENIED',    { path, perfil, ip }),
  tokenInvalid:   (ip)                => log(LEVELS.WARN,  'TOKEN_INVALID',    { ip }),
  oficinaCriada:  (nome, adminId)     => log(LEVELS.INFO,  'OFICINA_CRIADA',   { nome, adminId }),
  statusAlterado: (oficina_id, status, adminId) => log(LEVELS.INFO, 'STATUS_ALTERADO', { oficina_id, status, adminId }),
  pagamentoReg:   (oficina_id, valor, adminId)  => log(LEVELS.INFO, 'PAGAMENTO_REG',   { oficina_id, valor, adminId }),
  rateLimitHit:   (ip)                => log(LEVELS.WARN,  'RATE_LIMIT',       { ip }),
  serverError:    (path, msg)         => log(LEVELS.ERROR, 'SERVER_ERROR',     { path, msg }),
};

module.exports = logger;
