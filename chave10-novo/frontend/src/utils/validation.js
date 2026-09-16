// ── Utilitário de validação de formulários ──────────────────

/**
 * Valida e-mail
 */
export function validateEmail(email) {
  if (!email) return 'E-mail é obrigatório';
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return 'E-mail inválido';
  return null;
}

/**
 * Valida senha
 */
export function validatePassword(senha, minLength = 6) {
  if (!senha) return 'Senha é obrigatória';
  if (senha.length < minLength) return `Senha deve ter no mínimo ${minLength} caracteres`;
  return null;
}

/**
 * Valida nome
 */
export function validateName(nome, minLength = 3) {
  if (!nome) return 'Nome é obrigatório';
  if (nome.trim().length < minLength) return `Nome deve ter no mínimo ${minLength} caracteres`;
  return null;
}

/**
 * Valida telefone brasileiro
 */
export function validatePhone(telefone) {
  if (!telefone) return 'Telefone é obrigatório';
  const cleaned = telefone.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 11) return 'Telefone inválido';
  return null;
}

/**
 * Valida CPF
 */
export function validateCPF(cpf) {
  if (!cpf) return null; // CPF é opcional
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return 'CPF inválido';
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return 'CPF inválido';
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return 'CPF inválido';
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return 'CPF inválido';
  
  return null;
}

/**
 * Valida CNPJ
 */
export function validateCNPJ(cnpj) {
  if (!cnpj) return null; // CNPJ é opcional
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return 'CNPJ inválido';
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleaned)) return 'CNPJ inválido';
  
  // Validação dos dígitos verificadores
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return 'CNPJ inválido';
  
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return 'CNPJ inválido';
  
  return null;
}

/**
 * Valida placa de veículo (Mercosul e antiga)
 */
export function validatePlaca(placa) {
  if (!placa) return null; // Placa é opcional
  const cleaned = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Placa antiga: ABC1234
  const regexAntiga = /^[A-Z]{3}[0-9]{4}$/;
  // Placa Mercosul: ABC1D23
  const regexMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  
  if (!regexAntiga.test(cleaned) && !regexMercosul.test(cleaned)) {
    return 'Placa inválida';
  }
  
  return null;
}

/**
 * Valida valor monetário
 */
export function validateMoney(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const num = parseFloat(valor);
  if (isNaN(num) || num < 0) return 'Valor inválido';
  return null;
}

/**
 * Valida data (formato YYYY-MM-DD ou DD/MM/YYYY)
 */
export function validateDate(data) {
  if (!data) return null; // Data é opcional
  
  // Tenta parsear a data
  const date = new Date(data);
  if (isNaN(date.getTime())) return 'Data inválida';
  
  return null;
}

/**
 * Valida campo obrigatório genérico
 */
export function validateRequired(value, fieldName = 'Campo') {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} é obrigatório`;
  }
  return null;
}

/**
 * Valida comprimento mínimo
 */
export function validateMinLength(value, minLength, fieldName = 'Campo') {
  if (!value) return null;
  if (value.length < minLength) {
    return `${fieldName} deve ter no mínimo ${minLength} caracteres`;
  }
  return null;
}

/**
 * Valida comprimento máximo
 */
export function validateMaxLength(value, maxLength, fieldName = 'Campo') {
  if (!value) return null;
  if (value.length > maxLength) {
    return `${fieldName} deve ter no máximo ${maxLength} caracteres`;
  }
  return null;
}

/**
 * Valida número inteiro positivo
 */
export function validatePositiveInteger(value, fieldName = 'Campo') {
  if (value === '' || value === null || value === undefined) return null;
  const num = parseInt(value);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
    return `${fieldName} deve ser um número inteiro positivo`;
  }
  return null;
}

/**
 * Valida múltiplos campos de uma vez
 * @param {Object} fields - Objeto com os campos a validar
 * @param {Object} rules - Objeto com as regras de validação
 * @returns {Object} - Objeto com os erros encontrados
 * 
 * Exemplo:
 * const errors = validateFields(
 *   { email: 'test@test.com', senha: '123' },
 *   { 
 *     email: [validateEmail],
 *     senha: [(v) => validatePassword(v, 6)]
 *   }
 * );
 */
export function validateFields(fields, rules) {
  const errors = {};
  
  for (const [fieldName, validators] of Object.entries(rules)) {
    const value = fields[fieldName];
    
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        errors[fieldName] = error;
        break; // Para no primeiro erro
      }
    }
  }
  
  return errors;
}

/**
 * Máscara de CPF/CNPJ com limite de dígitos
 * Detecta automaticamente pelo tamanho: até 11 dígitos = CPF, até 14 = CNPJ
 */
export function maskDocumento(v) {
  if (!v) return '';
  const digits = v.replace(/\D/g, '').slice(0, 14); // máx 14 dígitos (CNPJ)
  if (digits.length <= 11) return formatCPF(digits);
  return formatCNPJ(digits);
}

/**
 * Máscara de telefone com limite de dígitos
 * Fixo: (XX) XXXX-XXXX — 10 dígitos
 * Celular: (XX) XXXXX-XXXX — 11 dígitos
 */
export function maskPhone(v) {
  if (!v) return '';
  const digits = v.replace(/\D/g, '').slice(0, 11); // máx 11 dígitos
  return formatPhone(digits);
}

/**
 * Formata CPF: 123.456.789-01
 */
export function formatCPF(cpf) {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Formata CNPJ: 12.345.678/0001-90
 */
export function formatCNPJ(cnpj) {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Formata telefone: (16) 99291-5540
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return cleaned
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Formata placa: ABC-1234 ou ABC1D23
 */
export function formatPlaca(placa) {
  if (!placa) return '';
  const cleaned = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Placa Mercosul: ABC1D23
  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Placa antiga: ABC-1234
  if (cleaned.length <= 7) {
    return cleaned.replace(/([A-Z]{3})([0-9]{1,4})/, '$1-$2');
  }
  
  return cleaned;
}

/**
 * Formata valor monetário: R$ 1.234,56
 */
export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return 'R$ 0,00';
  const num = parseFloat(value);
  if (isNaN(num)) return 'R$ 0,00';
  return 'R$ ' + num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formata data: DD/MM/YYYY
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
