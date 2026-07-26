// Validação e sanitização de entradas
// Rejeita dados inválidos antes de chegarem nas rotas

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/** Valida telefone brasileiro (somente dígitos, 10-11 chars) */
function phone(val) {
  if (typeof val !== 'string') return null;
  const digits = val.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) return null;
  return digits;
}

/** Valida inteiro positivo */
function positiveInt(val) {
  const n = parseInt(val, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Remove tags HTML/script e limita tamanho.
 * Não usa regex complexo — apenas strip de tags básico para evitar XSS em campos de texto.
 */
function safeText(val, max = 500) {
  if (typeof val !== 'string') return null;
  // Remove tags HTML e caracteres de controle perigosos
  const stripped = val
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .trim();
  if (stripped.length === 0) return null;
  if (stripped.length > max) return stripped.slice(0, max);
  return stripped;
}

/**
 * Rejeita campos não esperados no body para evitar mass-assignment.
 * allowedKeys: array de strings com os campos permitidos.
 */
function stripUnknownFields(body, allowedKeys) {
  const clean = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      clean[key] = body[key];
    }
  }
  return clean;
}

/**
 * Valida nome de arquivo para evitar path traversal.
 * Permite apenas letras, números, hífen, underscore e ponto.
 */
function safeFilename(val) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  // Rejeita path separators e null bytes
  if (/[/\\<>:"|?*\x00]/.test(trimmed)) return null;
  // Rejeita tentativas de traversal
  if (trimmed.includes('..')) return null;
  // Limita tamanho
  if (trimmed.length === 0 || trimmed.length > 255) return null;
  return trimmed;
}

// ─── Validators existentes ────────────────────────────────────────────────────

/** Middleware: valida body do login — rejeita campos extras */
function validateLogin(req, res, next) {
  const emailVal = email(req.body?.email);
  const senha = str(req.body?.senha, 128);
  if (!emailVal || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios e devem ser válidos' });
  }
  // Strip campos desconhecidos
  req.body = { email: emailVal, senha };
  next();
}

/** Middleware: valida criação/edição de oficina — rejeita campos extras */
function validateOficina(req, res, next) {
  const nome = str(req.body?.nome, 120);
  const emailVal = email(req.body?.email);
  if (!nome || !emailVal) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  const planoValidos = ['mensal', 'trimestral', 'semestral', 'anual', 'trial'];
  const statusValidos = ['active', 'pending', 'overdue', 'blocked'];

  const responsavel  = req.body.responsavel ? (str(req.body.responsavel, 120) || undefined) : undefined;
  const telefone     = req.body.telefone    ? (str(req.body.telefone, 30)    || undefined) : undefined;
  const observacoes  = req.body.observacoes ? (safeText(req.body.observacoes, 500) || undefined) : undefined;
  const logo         = req.body.logo        ? (str(req.body.logo, 2000)      || undefined) : undefined;
  const endereco     = req.body.endereco    ? (safeText(req.body.endereco, 300) || undefined) : undefined;

  if (req.body.plano !== undefined && req.body.plano !== null && !planoValidos.includes(req.body.plano)) {
    return res.status(400).json({ error: 'Plano inválido' });
  }
  if (req.body.status_assinatura !== undefined && req.body.status_assinatura !== null
      && !statusValidos.includes(req.body.status_assinatura)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  if (req.body.data_vencimento !== undefined && req.body.data_vencimento !== null && req.body.data_vencimento !== '') {
    const d = dateStr(req.body.data_vencimento);
    if (!d) return res.status(400).json({ error: 'Data de vencimento inválida (formato: YYYY-MM-DD)' });
    req.body.data_vencimento = d;
  }

  // Strip campos desconhecidos
  req.body = {
    nome,
    email: emailVal,
    ...(responsavel !== undefined   && { responsavel }),
    ...(telefone !== undefined      && { telefone }),
    ...(observacoes !== undefined   && { observacoes }),
    ...(logo !== undefined          && { logo }),
    ...(endereco !== undefined      && { endereco }),
    ...(req.body.plano              && { plano: req.body.plano }),
    ...(req.body.status_assinatura  && { status_assinatura: req.body.status_assinatura }),
    ...(req.body.data_vencimento    && { data_vencimento: req.body.data_vencimento }),
  };
  next();
}

/** Middleware: valida criação de usuário — rejeita campos extras */
function validateUsuario(req, res, next) {
  const nome  = str(req.body?.nome, 120);
  const emailVal = email(req.body?.email);
  const senha = str(req.body?.senha, 128);
  const perfisValidos = ['master_admin', 'admin_oficina', 'funcionario'];
  if (!nome || !emailVal || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  }
  if (req.body.perfil && !perfisValidos.includes(req.body.perfil)) {
    return res.status(400).json({ error: 'Perfil inválido' });
  }
  const oficina_id = req.body.oficina_id !== undefined
    ? (positiveInt(req.body.oficina_id) || null)
    : undefined;

  // Strip campos desconhecidos
  req.body = {
    nome,
    email: emailVal,
    senha,
    ...(req.body.perfil    && { perfil: req.body.perfil }),
    ...(oficina_id !== undefined && { oficina_id }),
  };
  next();
}

/** Middleware: valida cliente — com sanitização de obs e endereco, rejeita campos extras */
function validateCliente(req, res, next) {
  const nome = str(req.body?.nome, 120);
  if (!nome) return res.status(400).json({ error: 'Nome do cliente é obrigatório' });

  const telefone = req.body.telefone ? (str(req.body.telefone, 30) || undefined) : undefined;
  const emailVal = req.body.email    ? (email(req.body.email)      || undefined) : undefined;
  const obs      = req.body.obs      ? (safeText(req.body.obs, 500) || undefined) : undefined;
  const endereco = req.body.endereco ? (safeText(req.body.endereco, 300) || undefined) : undefined;

  // Strip campos desconhecidos
  req.body = {
    nome,
    ...(telefone !== undefined && { telefone }),
    ...(emailVal !== undefined && { email: emailVal }),
    ...(obs      !== undefined && { obs }),
    ...(endereco !== undefined && { endereco }),
  };
  next();
}

/** Middleware: valida veículo — com validação de ano e km, rejeita campos extras */
function validateVeiculo(req, res, next) {
  const modelo = str(req.body?.modelo, 100);
  if (!modelo) return res.status(400).json({ error: 'Modelo do veículo é obrigatório' });

  const placa      = req.body.placa      ? (str(req.body.placa, 20)   || undefined) : undefined;
  const marca      = req.body.marca      ? (str(req.body.marca, 80)   || undefined) : undefined;
  const aplicacao  = req.body.aplicacao  ? (str(req.body.aplicacao, 200) || undefined) : undefined;
  const cliente_id = req.body.cliente_id !== undefined
    ? (positiveInt(req.body.cliente_id) || null)
    : undefined;

  let ano = undefined;
  if (req.body.ano !== undefined && req.body.ano !== null && req.body.ano !== '') {
    const parsedAno = parseInt(req.body.ano, 10);
    if (isNaN(parsedAno) || parsedAno < 1900 || parsedAno > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: `Ano do veículo inválido (1900–${new Date().getFullYear() + 1})` });
    }
    ano = parsedAno;
  }

  let km = undefined;
  if (req.body.km !== undefined && req.body.km !== null && req.body.km !== '') {
    const parsedKm = parseFloat(req.body.km);
    if (isNaN(parsedKm) || parsedKm < 0 || parsedKm > 9999999) {
      return res.status(400).json({ error: 'KM inválido' });
    }
    km = parsedKm;
  }

  // Strip campos desconhecidos
  req.body = {
    modelo,
    ...(placa      !== undefined && { placa }),
    ...(marca      !== undefined && { marca }),
    ...(aplicacao  !== undefined && { aplicacao }),
    ...(cliente_id !== undefined && { cliente_id }),
    ...(ano        !== undefined && { ano }),
    ...(km         !== undefined && { km }),
  };
  next();
}

/** Middleware: valida OS — valor_mo e valor_pecas separadamente, limita pecas_itens, rejeita campos extras */
function validateOS(req, res, next) {
  const descricao = str(req.body?.descricao, 1000);
  if (!descricao) return res.status(400).json({ error: 'Descrição da OS é obrigatória' });

  const observacao = req.body.observacao ? (safeText(req.body.observacao, 500) || undefined) : undefined;
  const servicos   = req.body.servicos   ? (safeText(req.body.servicos, 2000)  || undefined) : undefined;
  const pecas      = req.body.pecas      ? (safeText(req.body.pecas, 2000)     || undefined) : undefined;

  let valor_mo, valor_pecas;
  if (req.body.valor_mo !== undefined) {
    valor_mo = money(req.body.valor_mo);
    if (valor_mo === null) return res.status(400).json({ error: 'Valor de mão de obra inválido' });
  }
  if (req.body.valor_pecas !== undefined) {
    valor_pecas = money(req.body.valor_pecas);
    if (valor_pecas === null) return res.status(400).json({ error: 'Valor de peças inválido' });
  }

  let pecas_itens;
  if (req.body.pecas_itens !== undefined) {
    if (!Array.isArray(req.body.pecas_itens)) {
      return res.status(400).json({ error: 'pecas_itens deve ser um array' });
    }
    if (req.body.pecas_itens.length > 100) {
      return res.status(400).json({ error: 'Máximo de 100 itens de peças por OS' });
    }
    pecas_itens = req.body.pecas_itens.map(item => ({
      nome:       str(String(item.nome || ''), 200) || '',
      qtd:        Math.max(0, parseFloat(item.qtd) || 1),
      valor_unit: Math.max(0, parseFloat(item.valor_unit) || 0),
      referencia: item.referencia ? (str(String(item.referencia), 100) || undefined) : undefined,
    }));
  }

  let cliente_id, veiculo_id;
  if (req.body.cliente_id !== undefined) {
    cliente_id = req.body.cliente_id ? (positiveInt(req.body.cliente_id) || null) : null;
  }
  if (req.body.veiculo_id !== undefined) {
    veiculo_id = req.body.veiculo_id ? (positiveInt(req.body.veiculo_id) || null) : null;
  }

  let data;
  if (req.body.data !== undefined && req.body.data !== null && req.body.data !== '') {
    data = dateStr(req.body.data);
    if (!data) return res.status(400).json({ error: 'Data inválida (formato: YYYY-MM-DD)' });
  }

  // Strip campos desconhecidos
  req.body = {
    descricao,
    ...(observacao  !== undefined  && { observacao }),
    ...(servicos    !== undefined  && { servicos }),
    ...(pecas       !== undefined  && { pecas }),
    ...(valor_mo    !== undefined  && { valor_mo }),
    ...(valor_pecas !== undefined  && { valor_pecas }),
    ...(pecas_itens !== undefined  && { pecas_itens }),
    ...(cliente_id  !== undefined  && { cliente_id }),
    ...(veiculo_id  !== undefined  && { veiculo_id }),
    ...(data        !== undefined  && { data }),
  };
  next();
}

/** Middleware: valida pagamento (admin — pagamento de assinatura) — rejeita campos extras */
function validatePagamento(req, res, next) {
  const valor = money(req.body?.valor);
  const novo_vencimento = dateStr(req.body?.novo_vencimento);
  if (valor === null || valor <= 0) return res.status(400).json({ error: 'Valor inválido (deve ser maior que zero)' });
  if (!novo_vencimento) return res.status(400).json({ error: 'Novo vencimento inválido (formato: YYYY-MM-DD)' });

  const formasValidas = ['pix', 'dinheiro', 'transferencia'];
  if (req.body.forma_pagamento && !formasValidas.includes(req.body.forma_pagamento)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida' });
  }

  let data_pagamento;
  if (req.body.data_pagamento) {
    data_pagamento = dateStr(req.body.data_pagamento);
    if (!data_pagamento) return res.status(400).json({ error: 'Data de pagamento inválida' });
  }

  const oficina_id = req.body.oficina_id !== undefined
    ? (positiveInt(req.body.oficina_id) || null)
    : undefined;

  const observacao = req.body.observacao ? (str(req.body.observacao, 500) || undefined) : undefined;

  // Strip campos desconhecidos
  req.body = {
    valor,
    novo_vencimento,
    ...(req.body.forma_pagamento && { forma_pagamento: req.body.forma_pagamento }),
    ...(data_pagamento           && { data_pagamento }),
    ...(oficina_id !== undefined && { oficina_id }),
    ...(observacao !== undefined && { observacao }),
  };
  next();
}

/** Middleware: valida parâmetro :id como inteiro positivo */
function validateId(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  req.params.id = id;
  next();
}

// ─── Novos validators ────────────────────────────────────────────────────────

const CATEGORIAS_DESPESA = ['Aluguel', 'Salários', 'Fornecedores', 'Impostos', 'Manutenção', 'Outros'];

/** Middleware: valida criação/edição de despesa — rejeita campos extras */
function validateDespesa(req, res, next) {
  const descricao = str(req.body?.descricao, 200);
  if (!descricao) return res.status(400).json({ error: 'Descrição da despesa é obrigatória' });

  let valor;
  if (req.body.valor !== undefined) {
    valor = money(req.body.valor);
    if (valor === null || valor <= 0) return res.status(400).json({ error: 'Valor da despesa inválido (deve ser maior que zero)' });
  }

  let data;
  if (req.body.data !== undefined) {
    data = dateStr(req.body.data);
    if (!data) return res.status(400).json({ error: 'Data da despesa inválida (formato: YYYY-MM-DD)' });
  }

  let vencimento;
  if (req.body.vencimento !== undefined && req.body.vencimento !== null && req.body.vencimento !== '') {
    vencimento = dateStr(req.body.vencimento);
    if (!vencimento) return res.status(400).json({ error: 'Vencimento inválido (formato: YYYY-MM-DD)' });
  }

  let categoria;
  if (req.body.categoria) {
    categoria = CATEGORIAS_DESPESA.includes(req.body.categoria)
      ? req.body.categoria
      : (str(req.body.categoria, 50) || 'Outros');
  }

  const obs  = req.body.obs  ? (safeText(req.body.obs, 500) || undefined) : undefined;
  const pago = req.body.pago != null ? (req.body.pago ? 1 : 0) : undefined;

  // Strip campos desconhecidos
  req.body = {
    descricao,
    ...(valor     !== undefined && { valor }),
    ...(data      !== undefined && { data }),
    ...(vencimento !== undefined && { vencimento }),
    ...(categoria !== undefined && { categoria }),
    ...(obs       !== undefined && { obs }),
    ...(pago      !== undefined && { pago }),
  };
  next();
}

const TIPOS_LEMBRETE = ['revisao', 'troca_oleo', 'seguro', 'ipva', 'manutencao', 'outro'];

/** Middleware: valida criação/edição de lembrete — rejeita campos extras */
function validateLembrete(req, res, next) {
  const descricao = str(req.body?.descricao, 300);
  if (!descricao) return res.status(400).json({ error: 'Descrição do lembrete é obrigatória' });

  if (req.body.tipo !== undefined) {
    if (!TIPOS_LEMBRETE.includes(req.body.tipo)) {
      return res.status(400).json({ error: `Tipo de lembrete inválido. Use: ${TIPOS_LEMBRETE.join(', ')}` });
    }
  }

  let data_previsao;
  if (req.body.data_previsao !== undefined && req.body.data_previsao !== null && req.body.data_previsao !== '') {
    data_previsao = dateStr(req.body.data_previsao);
    if (!data_previsao) return res.status(400).json({ error: 'data_previsao inválida (formato: YYYY-MM-DD)' });
  }

  let km_previsao;
  if (req.body.km_previsao !== undefined && req.body.km_previsao !== null && req.body.km_previsao !== '') {
    km_previsao = parseFloat(req.body.km_previsao);
    if (isNaN(km_previsao) || km_previsao < 0 || km_previsao > 9999999) {
      return res.status(400).json({ error: 'KM de previsão inválido' });
    }
  }

  const veiculo_id = req.body.veiculo_id !== undefined
    ? (req.body.veiculo_id ? (positiveInt(req.body.veiculo_id) || null) : null)
    : undefined;
  const visto = req.body.visto != null ? (req.body.visto ? 1 : 0) : undefined;

  // Strip campos desconhecidos
  req.body = {
    descricao,
    ...(req.body.tipo   !== undefined && { tipo: req.body.tipo }),
    ...(data_previsao   !== undefined && { data_previsao }),
    ...(km_previsao     !== undefined && { km_previsao }),
    ...(veiculo_id      !== undefined && { veiculo_id }),
    ...(visto           !== undefined && { visto }),
  };
  next();
}

/** Middleware: valida criação/edição de agenda — rejeita campos extras */
function validateAgenda(req, res, next) {
  const titulo = str(req.body?.titulo, 200);
  if (!titulo) return res.status(400).json({ error: 'Título do agendamento é obrigatório' });

  let data;
  if (req.body.data !== undefined) {
    data = dateStr(req.body.data);
    if (!data) return res.status(400).json({ error: 'Data inválida (formato: YYYY-MM-DD)' });
  }

  if (req.body.hora !== undefined && req.body.hora !== null && req.body.hora !== '') {
    if (!/^\d{2}:\d{2}$/.test(req.body.hora)) {
      return res.status(400).json({ error: 'Hora inválida (formato: HH:MM)' });
    }
  }

  const descricao  = req.body.descricao  ? (safeText(req.body.descricao, 500) || undefined) : undefined;
  const cliente_id = req.body.cliente_id !== undefined
    ? (req.body.cliente_id ? (positiveInt(req.body.cliente_id) || null) : null)
    : undefined;
  const veiculo_id = req.body.veiculo_id !== undefined
    ? (req.body.veiculo_id ? (positiveInt(req.body.veiculo_id) || null) : null)
    : undefined;

  // Strip campos desconhecidos
  req.body = {
    titulo,
    ...(data        !== undefined && { data }),
    ...(req.body.hora !== undefined && req.body.hora !== null && { hora: req.body.hora }),
    ...(descricao   !== undefined && { descricao }),
    ...(cliente_id  !== undefined && { cliente_id }),
    ...(veiculo_id  !== undefined && { veiculo_id }),
  };
  next();
}

/** Middleware: valida criação/edição de item de estoque — rejeita campos extras */
function validateEstoque(req, res, next) {
  const nome = str(req.body?.nome, 200);
  if (!nome) return res.status(400).json({ error: 'Nome do item é obrigatório' });

  let quantidade;
  if (req.body.quantidade !== undefined && req.body.quantidade !== null) {
    quantidade = parseInt(req.body.quantidade, 10);
    if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > 999999) {
      return res.status(400).json({ error: 'Quantidade deve ser um número inteiro não negativo (máx. 999999)' });
    }
  }

  let preco;
  if (req.body.preco !== undefined && req.body.preco !== null && req.body.preco !== '') {
    preco = money(req.body.preco);
    if (preco === null) return res.status(400).json({ error: 'Preço inválido' });
  }

  let estoque_min;
  if (req.body.estoque_min !== undefined && req.body.estoque_min !== null) {
    estoque_min = parseInt(req.body.estoque_min, 10);
    if (!Number.isInteger(estoque_min) || estoque_min < 0) {
      return res.status(400).json({ error: 'Estoque mínimo deve ser um inteiro não negativo' });
    }
  }

  let data_compra;
  if (req.body.data_compra !== undefined && req.body.data_compra !== null && req.body.data_compra !== '') {
    data_compra = dateStr(req.body.data_compra);
    if (!data_compra) return res.status(400).json({ error: 'data_compra inválida (formato: YYYY-MM-DD)' });
  }

  const categoria      = req.body.categoria     ? (str(req.body.categoria, 50)     || undefined) : undefined;
  const tipo           = req.body.tipo          ? (str(req.body.tipo, 50)           || undefined) : undefined;
  const marca          = req.body.marca         ? (str(req.body.marca, 80)          || undefined) : undefined;
  const aplicacao      = req.body.aplicacao     ? (safeText(req.body.aplicacao, 200) || undefined) : undefined;
  const obs            = req.body.obs           ? (safeText(req.body.obs, 300)      || undefined) : undefined;
  const codigo_barras  = req.body.codigo_barras ? (str(req.body.codigo_barras, 60)  || undefined) : undefined;

  // Strip campos desconhecidos
  req.body = {
    nome,
    ...(categoria     !== undefined && { categoria }),
    ...(tipo          !== undefined && { tipo }),
    ...(marca         !== undefined && { marca }),
    ...(aplicacao     !== undefined && { aplicacao }),
    ...(quantidade    !== undefined && { quantidade }),
    ...(estoque_min   !== undefined && { estoque_min }),
    ...(preco         !== undefined && { preco }),
    ...(data_compra   !== undefined && { data_compra }),
    ...(obs           !== undefined && { obs }),
    ...(codigo_barras !== undefined && { codigo_barras }),
  };
  next();
}

const FORMAS_PAGAMENTO_OS = ['pix', 'dinheiro', 'debito', 'credito'];

/** Middleware: valida pagamento de OS — rejeita campos extras */
function validatePagamentoOS(req, res, next) {
  const { forma, valor_total, parcelas } = req.body;

  if (!forma || !FORMAS_PAGAMENTO_OS.includes(forma)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida' });
  }

  const vTotal = money(valor_total);
  if (vTotal === null || vTotal <= 0) {
    return res.status(400).json({ error: 'Valor total inválido (deve ser maior que zero)' });
  }

  let parsedParcelas = 1;
  if (parcelas !== undefined && parcelas !== null) {
    parsedParcelas = parseInt(parcelas, 10);
    if (!Number.isInteger(parsedParcelas) || parsedParcelas < 1 || parsedParcelas > 12) {
      return res.status(400).json({ error: 'Número de parcelas deve ser entre 1 e 12' });
    }
  }

  let taxa = 0;
  if (req.body.taxa_maquininha !== undefined && req.body.taxa_maquininha !== '') {
    taxa = parseFloat(req.body.taxa_maquininha);
    if (isNaN(taxa) || taxa < 0 || taxa > 100) {
      return res.status(400).json({ error: 'Taxa da maquininha inválida (0–100%)' });
    }
  }

  const observacao = req.body.observacao ? (str(req.body.observacao, 300) || undefined) : undefined;
  const bandeira   = req.body.bandeira   ? (str(req.body.bandeira, 30)   || undefined) : undefined;

  // Strip campos desconhecidos
  req.body = {
    forma,
    valor_total:      vTotal,
    parcelas:         parsedParcelas,
    taxa_maquininha:  taxa,
    ...(observacao !== undefined && { observacao }),
    ...(bandeira   !== undefined && { bandeira }),
  };
  next();
}

/** Middleware: valida criação e edição de orçamento — rejeita campos extras */
function validateOrcamento(req, res, next) {
  // IDs relacionados (opcionais)
  let cliente_id, veiculo_id;
  if (req.body.cliente_id !== undefined) {
    cliente_id = req.body.cliente_id ? (positiveInt(req.body.cliente_id) || null) : null;
  }
  if (req.body.veiculo_id !== undefined) {
    veiculo_id = req.body.veiculo_id ? (positiveInt(req.body.veiculo_id) || null) : null;
  }

  // Campos de texto — sanitiza XSS e limita tamanho
  const descricao = req.body.descricao ? (safeText(req.body.descricao, 1000) || null) : null;
  const servicos  = req.body.servicos  ? (safeText(req.body.servicos,  2000) || null) : null;
  const obs       = req.body.obs       ? (safeText(req.body.obs,        500) || null) : null;

  // Status
  const statusValidos = ['pendente', 'aprovado', 'rejeitado'];
  let status;
  if (req.body.status !== undefined && req.body.status !== null) {
    if (!statusValidos.includes(req.body.status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    status = req.body.status;
  }

  // Validade
  let validade = null;
  if (req.body.validade !== undefined && req.body.validade !== null && req.body.validade !== '') {
    validade = dateStr(req.body.validade);
    if (!validade) return res.status(400).json({ error: 'Data de validade inválida (formato: YYYY-MM-DD)' });
  }

  // Valores monetários
  let valor_mo, desconto;
  if (req.body.valor_mo !== undefined) {
    valor_mo = money(req.body.valor_mo);
    if (valor_mo === null) return res.status(400).json({ error: 'Valor de mão de obra inválido' });
  }
  if (req.body.desconto !== undefined) {
    desconto = money(req.body.desconto);
    if (desconto === null) return res.status(400).json({ error: 'Desconto inválido' });
  }

  // Itens de peças
  let pecas_itens;
  if (req.body.pecas_itens !== undefined) {
    if (!Array.isArray(req.body.pecas_itens)) {
      return res.status(400).json({ error: 'pecas_itens deve ser um array' });
    }
    if (req.body.pecas_itens.length > 100) {
      return res.status(400).json({ error: 'Máximo de 100 itens de peças por orçamento' });
    }
    pecas_itens = req.body.pecas_itens.map(p => ({
      nome:       str(String(p.nome || ''), 100) || '',
      qtd:        Math.max(0, parseFloat(p.qtd)        || 1),
      valor_unit: Math.max(0, parseFloat(p.valor_unit) || 0),
      referencia: p.referencia ? (str(String(p.referencia), 50) || undefined) : undefined,
    }));
  }

  // os_id (opcional) — ID da OS vinculada
  let os_id;
  if (req.body.os_id !== undefined) {
    os_id = req.body.os_id ? (positiveInt(req.body.os_id) || null) : null;
  }

  // interativo (opcional) — flag booleano
  let interativo;
  if (req.body.interativo !== undefined) {
    interativo = !!req.body.interativo;
  }

  // Strip campos desconhecidos
  req.body = {
    ...(descricao   !== null     && { descricao }),
    ...(servicos    !== null     && { servicos }),
    ...(obs         !== null     && { obs }),
    ...(status      !== undefined && { status }),
    ...(validade    !== undefined && { validade }),
    ...(valor_mo    !== undefined && { valor_mo }),
    ...(desconto    !== undefined && { desconto }),
    ...(pecas_itens !== undefined && { pecas_itens }),
    ...(cliente_id  !== undefined && { cliente_id }),
    ...(veiculo_id  !== undefined && { veiculo_id }),
    ...(os_id       !== undefined && { os_id }),
    ...(interativo  !== undefined && { interativo }),
  };
  next();
}


function validateRenovarLote(req, res, next) {
  const { ids, novo_vencimento } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids deve ser um array não vazio de inteiros' });
  }

  if (ids.length > 500) {
    return res.status(400).json({ error: 'Máximo de 500 ids por lote' });
  }

  const idsValidos = ids.map(id => parseInt(id, 10));
  if (idsValidos.some(id => !Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ error: 'Todos os ids devem ser inteiros positivos' });
  }

  const novoVenc = dateStr(novo_vencimento);
  if (!novoVenc) {
    return res.status(400).json({ error: 'novo_vencimento inválido (formato: YYYY-MM-DD)' });
  }

  let valor;
  if (req.body.valor !== undefined && req.body.valor !== null && req.body.valor !== '') {
    valor = money(req.body.valor);
    if (valor === null) return res.status(400).json({ error: 'Valor inválido' });
  }

  const formasValidas = ['pix', 'dinheiro', 'transferencia'];
  if (req.body.forma_pagamento && !formasValidas.includes(req.body.forma_pagamento)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida' });
  }

  // Strip campos desconhecidos
  req.body = {
    ids: idsValidos,
    novo_vencimento: novoVenc,
    ...(valor             !== undefined && { valor }),
    ...(req.body.forma_pagamento       && { forma_pagamento: req.body.forma_pagamento }),
  };
  next();
}

/** Middleware: valida redefinição de senha — rejeita campos extras */
function validateRedefinirSenha(req, res, next) {
  const nova_senha = req.body?.nova_senha;
  if (!nova_senha || typeof nova_senha !== 'string' || nova_senha.length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
  }
  if (nova_senha.length > 128) {
    return res.status(400).json({ error: 'Nova senha muito longa (máximo 128 caracteres)' });
  }
  // Strip campos desconhecidos
  req.body = { nova_senha };
  next();
}

/** Middleware: sanitiza parâmetro de busca `q` na query string */
function validateQuery(req, res, next) {
  if (req.query.q !== undefined) {
    if (typeof req.query.q !== 'string') {
      return res.status(400).json({ error: 'Parâmetro de busca inválido' });
    }
    req.query.q = req.query.q.trim().slice(0, 100);
  }
  next();
}

/**
 * Middleware: valida paginação via query string.
 * Injeta req.pagination = { limit, offset } após validação.
 * Padrão: limit=50, offset=0. Máximo: limit=200.
 */
function validatePagination(req, res, next) {
  let limit  = parseInt(req.query.limit,  10);
  let offset = parseInt(req.query.offset, 10);

  if (isNaN(limit)  || limit  < 1)   limit  = 50;
  if (isNaN(offset) || offset < 0)   offset = 0;
  if (limit > 200) limit = 200;

  req.pagination = { limit, offset };
  next();
}

/**
 * Middleware: valida nome de arquivo para operações de backup.
 * Previne path traversal.
 */
function validateBackupFilename(req, res, next) {
  if (req.body?.backupFileName !== undefined) {
    const safe = safeFilename(req.body.backupFileName);
    if (!safe) return res.status(400).json({ error: 'Nome de arquivo inválido' });
    req.body = { backupFileName: safe };
  }
  next();
}

module.exports = {
  // Helpers exportados para uso externo se necessário
  phone,
  positiveInt,
  safeText,
  safeFilename,
  stripUnknownFields,
  // Validators
  validateLogin,
  validateOficina,
  validateUsuario,
  validateCliente,
  validateVeiculo,
  validateOS,
  validateOrcamento,
  validatePagamento,
  validateId,
  validateDespesa,
  validateLembrete,
  validateAgenda,
  validateEstoque,
  validatePagamentoOS,
  validateRenovarLote,
  validateRedefinirSenha,
  validateQuery,
  validatePagination,
  validateBackupFilename,
};
