// Logger de segurança — eventos importantes sem expor dados sensíveis

function timestamp() {
  return new Date().toISOString();
}

function fmt(event, data) {
  const parts = [`[${timestamp()}] [${event.toUpperCase()}]`];
  if (data) {
    // Nunca logar senhas ou tokens
    const safe = { ...data };
    delete safe.senha;
    delete safe.senha_hash;
    delete safe.token;
    parts.push(JSON.stringify(safe));
  }
  return parts.join(' ');
}

const log = {
  // Eventos de autenticação
  loginOk(data)      { console.log(fmt('LOGIN_OK', data)); },
  loginFail(data)    { console.warn(fmt('LOGIN_FAIL', data)); },

  // Eventos de segurança
  security(event, data) { console.warn(fmt(`SECURITY:${event}`, data)); },

  // Eventos de negócio relevantes
  info(event, data)  { console.log(fmt(event, data)); },

  // Avisos (não erros críticos)
  warn(event, data)  { console.warn(fmt(event, data)); },

  // Erros internos (sem stack trace para o cliente)
  error(event, err)  {
    console.error(fmt(event, { message: err?.message }));
    if (process.env.NODE_ENV !== 'production') console.error(err);
  },
};

module.exports = log;
