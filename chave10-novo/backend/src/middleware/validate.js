// Validação e sanitização de entradas
// Rejeita dados inválidos antes de chegarem nas rotas

function str(val, max = 255) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function email(val) {
  const s = str(val, 254);
  if (!s) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s.toLowerCase() : null;
}

function money(val) {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? null : n;
}

function dateStr(val) {
  const s = str(val, 10);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// Middleware: valida body do login
function validateLogin(req, res, next) {
  const emailVal = email(req.body?.email);
  const senha = str(req.body?.senha, 128);
  if (!emailVal || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios e devem ser válidos' });
  }
  req.body.email = emailVal;
  req.body.senha = senha;
  next();
}

// Middleware: valida criação/edição de oficina
function validateOficina(req, res, next) {
  const nome = str(req.body?.nome, 120);
  const emailVal = email(req.body?.email);
  if (!nome || !emailVal) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }
  // Sanitiza campos opcionais
  if (req.body.responsavel) req.body.responsavel = str(req.body.responsavel, 120) || undefined;
  if (req.body.telefone)    req.body.telefone    = str(req.body.telefone, 30)  || undefined;
  if (req.body.observacoes) req.body.observacoes = str(req.body.observacoes, 500) || undefined;
  req.body.nome  = nome;
  req.body.email = emailVal;
  next();
}

// Middleware: valida criação de usuário
function validateUsuario(req, res, next) {
  const nome  = str(req.body?.nome, 120);
  const emailVal = email(req.body?.email);
  const senha = str(req.body?.senha, 128);
  const perfisValidos = ['master_admin', 'admin_oficina', 'funcionario'];
  if (!nome || !emailVal || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }
  if (req.body.perfil && !perfisValidos.includes(req.body.perfil)) {
    return res.status(400).json({ error: 'Perfil inválido' });
  }
  req.body.nome  = nome;
  req.body.email = emailVal;
  req.body.senha = senha;
  next();
}

// Middleware: valida cliente
function validateCliente(req, res, next) {
  const nome = str(req.body?.nome, 120);
  if (!nome) return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
  if (req.body.telefone) req.body.telefone = str(req.body.telefone, 30) || undefined;
  req.body.nome = nome;
  next();
}

// Middleware: valida veículo
function validateVeiculo(req, res, next) {
  const modelo = str(req.body?.modelo, 100);
  if (!modelo) return res.status(400).json({ error: 'Modelo do veículo é obrigatório' });
  if (req.body.placa) req.body.placa = str(req.body.placa, 20) || undefined;
  if (req.body.ano)   req.body.ano   = str(String(req.body.ano), 4) || undefined;
  req.body.modelo = modelo;
  next();
}

// Middleware: valida OS
function validateOS(req, res, next) {
  const descricao = str(req.body?.descricao, 1000);
  if (!descricao) return res.status(400).json({ error: 'Descrição da OS é obrigatória' });
  if (req.body.observacao) req.body.observacao = str(req.body.observacao, 500) || undefined;
  if (req.body.valor !== undefined) {
    const v = money(req.body.valor);
    if (v === null) return res.status(400).json({ error: 'Valor inválido' });
    req.body.valor = v;
  }
  req.body.descricao = descricao;
  next();
}

// Middleware: valida pagamento
function validatePagamento(req, res, next) {
  const valor = money(req.body?.valor);
  const novo_vencimento = dateStr(req.body?.novo_vencimento);
  if (valor === null) return res.status(400).json({ error: 'Valor inválido' });
  if (!novo_vencimento) return res.status(400).json({ error: 'Novo vencimento inválido (formato: YYYY-MM-DD)' });
  const formasValidas = ['pix', 'dinheiro', 'transferencia'];
  if (req.body.forma_pagamento && !formasValidas.includes(req.body.forma_pagamento)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida' });
  }
  if (req.body.data_pagamento) {
    const dp = dateStr(req.body.data_pagamento);
    if (!dp) return res.status(400).json({ error: 'Data de pagamento inválida' });
    req.body.data_pagamento = dp;
  }
  if (req.body.observacao) req.body.observacao = str(req.body.observacao, 500) || undefined;
  req.body.valor = valor;
  req.body.novo_vencimento = novo_vencimento;
  next();
}

// Middleware: valida parâmetro :id como inteiro positivo
function validateId(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  req.params.id = id;
  next();
}

module.exports = {
  validateLogin,
  validateOficina,
  validateUsuario,
  validateCliente,
  validateVeiculo,
  validateOS,
  validatePagamento,
  validateId,
};
