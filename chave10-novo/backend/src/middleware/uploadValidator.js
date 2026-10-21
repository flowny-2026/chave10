/**
 * uploadValidator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Validação centralizada de uploads (base64) do Chave 10.
 *
 * O sistema NÃO utiliza uploads multipart/form-data tradicionais.
 * Todos os "uploads" são enviados como data URLs base64 dentro do body JSON.
 *
 * Este módulo valida:
 *   - MIME type real do conteúdo (magic bytes) vs extensão declarada
 *   - Tamanho máximo (bytes decodificados, não do base64)
 *   - Formato permitido (whitelist rigorosa)
 *   - Bloqueia executáveis, scripts, arquivos mascarados
 *   - Registra tentativas bloqueadas na auditoria
 *
 * Formatos permitidos:
 *   Imagens: image/jpeg, image/png, image/webp, image/gif
 *   Docs:    application/pdf (quando explicitamente habilitado)
 *
 * NUNCA permitido:
 *   .exe, .bat, .cmd, .sh, .js, .php, .jar, .dll, .msi, .com, .scr,
 *   .vbs, .wsf, .ps1, .svg (pode conter scripts), .html, .htm
 * ─────────────────────────────────────────────────────────────────────────────
 */

const log = require('../utils/logger');

// ─── Magic bytes para detecção de tipo real ──────────────────────────────────
const MAGIC_BYTES = [
  { mime: 'image/jpeg',      magic: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',       magic: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',       magic: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp',      magic: null, check: (buf) => buf[0]===0x52 && buf[1]===0x49 && buf[2]===0x46 && buf[3]===0x46 && buf[8]===0x57 && buf[9]===0x45 && buf[10]===0x42 && buf[11]===0x50 },
  { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

// ─── Whitelist de MIME types permitidos por contexto ──────────────────────────
const ALLOWED_MIMES = {
  logo:      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  signature: ['image/png'],
  document:  ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

// ─── Extensões perigosas — NUNCA aceitas independente do contexto ─────────────
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'zsh', 'js', 'mjs', 'cjs',
  'php', 'phtml', 'jar', 'dll', 'msi', 'com', 'scr', 'vbs', 'wsf',
  'ps1', 'psm1', 'psd1', 'svg', 'html', 'htm', 'xhtml', 'asp', 'aspx',
  'jsp', 'py', 'rb', 'pl', 'cgi', 'action', 'apk', 'app', 'bin',
  'class', 'deb', 'dmg', 'elf', 'hta', 'inf', 'lnk', 'msp', 'reg',
  'rpm', 'sys', 'wasm',
]);

// ─── Limites de tamanho por contexto (em bytes decodificados) ────────────────
const SIZE_LIMITS = {
  logo:      2 * 1024 * 1024,   // 2 MB
  signature: 500 * 1024,         // 500 KB
  document:  5 * 1024 * 1024,   // 5 MB
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Decodifica uma data URL e retorna { mime, buffer, extension }.
 * Retorna null se o formato for inválido.
 */
function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;

  const match = dataUrl.match(/^data:([^;,]+)?;?base64,(.+)$/i);
  if (!match) return null;

  const declaredMime = (match[1] || '').toLowerCase().trim();
  const base64Data   = match[2];

  // Valida que o base64 é limpo (sem caracteres inválidos)
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) return null;

  let buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    return null;
  }

  // Extrai extensão do MIME declarado
  const extension = declaredMime.split('/')[1]?.replace('jpeg', 'jpg') || '';

  return { mime: declaredMime, buffer, extension, base64Data };
}

/**
 * Detecta o MIME type real com base nos magic bytes.
 */
function detectRealMime(buffer) {
  if (!buffer || buffer.length < 12) return null;

  for (const entry of MAGIC_BYTES) {
    if (entry.magic) {
      const matches = entry.magic.every((byte, i) => buffer[i] === byte);
      if (matches) return entry.mime;
    } else if (entry.check && entry.check(buffer)) {
      return entry.mime;
    }
  }
  return null;
}

/**
 * Verifica se o buffer contém padrões de código executável/script.
 * Detecta arquivos mascarados como imagem mas com conteúdo perigoso.
 */
function containsExecutablePatterns(buffer) {
  const head = buffer.slice(0, 256).toString('utf8', 0, 256).toLowerCase();
  const patterns = [
    '<?php', '<%', '<script', '#!/', 'powershell', 'cmd.exe',
    'eval(', 'exec(', 'system(', 'passthru(', 'shell_exec(',
    'function()', 'require(', 'import ', 'from ', 'MZ', // MZ = DOS/PE header
  ];
  return patterns.some(p => head.includes(p));
}

// ─── Validador principal ──────────────────────────────────────────────────────

/**
 * Valida uma data URL base64.
 *
 * @param {string} dataUrl     — a string data:image/...;base64,...
 * @param {string} context     — 'logo' | 'signature' | 'document'
 * @param {object} opts        — { req } para logging de auditoria
 * @returns {{ valid: true, mime, size } | { valid: false, error }}
 */
function validateUpload(dataUrl, context = 'logo', opts = {}) {
  const parsed = parseDataUrl(dataUrl);

  // ── 1. Formato da data URL inválido ──────────────────────────────────────
  if (!parsed) {
    logBlocked(context, 'formato_invalido', opts);
    return { valid: false, error: 'Formato de arquivo inválido' };
  }

  const { mime, buffer, extension } = parsed;

  // ── 2. Extensão bloqueada (executáveis) ──────────────────────────────────
  if (BLOCKED_EXTENSIONS.has(extension)) {
    logBlocked(context, `extensao_bloqueada:${extension}`, opts);
    return { valid: false, error: 'Tipo de arquivo não permitido' };
  }

  // ── 3. MIME type na whitelist do contexto ─────────────────────────────────
  const allowed = ALLOWED_MIMES[context] || ALLOWED_MIMES.logo;
  if (!allowed.includes(mime)) {
    logBlocked(context, `mime_nao_permitido:${mime}`, opts);
    return { valid: false, error: 'Tipo de arquivo não permitido' };
  }

  // ── 4. Tamanho máximo ────────────────────────────────────────────────────
  const maxSize = SIZE_LIMITS[context] || SIZE_LIMITS.logo;
  if (buffer.length > maxSize) {
    logBlocked(context, `tamanho_excedido:${buffer.length}>${maxSize}`, opts);
    return { valid: false, error: `Arquivo muito grande. Máximo: ${Math.round(maxSize/1024/1024)}MB` };
  }

  // ── 5. Verificação de magic bytes (conteúdo real) ────────────────────────
  const realMime = detectRealMime(buffer);
  if (realMime && realMime !== mime) {
    logBlocked(context, `mime_mascarado:declarado=${mime},real=${realMime}`, opts);
    return { valid: false, error: 'Tipo de arquivo não corresponde ao conteúdo' };
  }

  // ── 6. Padrões de código executável ──────────────────────────────────────
  if (containsExecutablePatterns(buffer)) {
    logBlocked(context, `conteudo_executavel_detectado`, opts);
    return { valid: false, error: 'Arquivo contém conteúdo não permitido' };
  }

  // ── 7. Tamanho mínimo (arquivo vazio) ────────────────────────────────────
  if (buffer.length < 10) {
    return { valid: false, error: 'Arquivo vazio ou corrompido' };
  }

  return { valid: true, mime, size: buffer.length };
}

// ─── Log de tentativa bloqueada ───────────────────────────────────────────────
function logBlocked(context, motivo, opts = {}) {
  const req = opts.req;
  log.security('upload_bloqueado', {
    contexto: context,
    motivo,
    ip: req?.ip,
    usuario_id: req?.user?.id,
    oficina_id: req?.user?.oficina_id,
    path: req?.path,
  });

  // Registra na tabela de auditoria se disponível
  try {
    const { audit, ACOES } = require('../services/auditService');
    if (req) {
      audit(req, 'UPLOAD_BLOQUEADO', null, null, { contexto: context, motivo }, 'falha');
    }
  } catch { /* auditService pode não estar carregado ainda */ }
}

// ─── Middleware Express para validar logo no body ─────────────────────────────
/**
 * Middleware que valida req.body.logo se estiver presente.
 * Aplica validação completa de conteúdo antes de prosseguir.
 *
 * Uso:
 *   router.put('/config', validateLogoUpload, handler)
 */
function validateLogoUpload(req, res, next) {
  if (!req.body?.logo || req.body.logo === null || req.body.logo === '') {
    return next(); // logo não enviada ou removida — ok
  }

  const result = validateUpload(req.body.logo, 'logo', { req });

  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  next();
}

/**
 * Middleware que valida req.body.signature se estiver presente.
 */
function validateSignatureUpload(req, res, next) {
  if (!req.body?.signature || req.body.signature === null) {
    return next();
  }

  const result = validateUpload(req.body.signature, 'signature', { req });

  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  next();
}

module.exports = {
  validateUpload,
  validateLogoUpload,
  validateSignatureUpload,
  parseDataUrl,
  detectRealMime,
  ALLOWED_MIMES,
  SIZE_LIMITS,
  BLOCKED_EXTENSIONS,
};
