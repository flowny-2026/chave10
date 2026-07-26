const crypto = require('crypto');
const { query, queryOne, run, pool } = require('../db');
const log = require('../utils/logger');

/**
 * Generate a cryptographically secure URL-safe token
 * @returns {string} 43-character base64url token
 */
function generateSecureToken() {
  return crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a unique approval link for a budget
 * @param {number} oficina_id 
 * @param {number} orcamento_id 
 * @param {number} user_id - User who generated the link
 * @param {number} validityHours - Link validity in hours (default 168 = 7 days)
 * @returns {Promise<{token: string, link: string, expiresAt: string}>}
 */
async function generateApprovalLink(oficina_id, orcamento_id, user_id, validityHours = 168) {
  // Validate validity period (1 hour to 90 days)
  if (validityHours < 1 || validityHours > 2160) {
    throw new Error('Validity period must be between 1 hour and 90 days');
  }

  // Generate unique token (retry on collision)
  let token;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    token = generateSecureToken();
    const existing = await queryOne('SELECT id FROM approval_links WHERE token = $1', [token]);
    if (!existing) break;
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique token after multiple attempts');
  }

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + validityHours);

  // Invalidate any existing active links for this budget
  await run(
    `UPDATE approval_links 
     SET invalidated_at = NOW() 
     WHERE orcamento_id = $1 
       AND invalidated_at IS NULL 
       AND expires_at > NOW()`,
    [orcamento_id]
  );

  // Insert new link
  const linkResult = await queryOne(
    `INSERT INTO approval_links 
     (oficina_id, orcamento_id, token, expires_at) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, token, created_at, expires_at`,
    [oficina_id, orcamento_id, token, expiresAt]
  );

  // Log action
  await run(
    `INSERT INTO approval_actions 
     (oficina_id, orcamento_id, link_id, action_type, performed_by_user_id, link_token, metadata) 
     VALUES ($1, $2, $3, 'link_generated', $4, $5, $6)`,
    [
      oficina_id,
      orcamento_id,
      linkResult.id,
      user_id,
      token,
      JSON.stringify({ validityHours })
    ]
  );

  // Reset budget status to pending if it was expired
  await run(
    `UPDATE orcamentos 
     SET approval_status = 'pending' 
     WHERE id = $1 AND approval_status = 'expired'`,
    [orcamento_id]
  );

  const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
  const link = `${publicUrl}/approve/${token}`;

  return {
    id: linkResult.id,
    token: linkResult.token,
    link,
    createdAt: linkResult.created_at,
    expiresAt: linkResult.expires_at
  };
}

/**
 * Validate an approval link token
 * @param {string} token 
 * @returns {Promise<{valid: boolean, link?: object, budget?: object, error?: string}>}
 */
async function validateApprovalLink(token, ipAddress = null, userAgent = null) {
  // Validate token format
  if (!token || typeof token !== 'string' || token.length < 32 || token.length > 64) {
    return { valid: false, error: 'invalid_format' };
  }

  // Retrieve link
  const link = await queryOne(
    `SELECT al.*, o.numero, o.cliente_id, o.veiculo_id, o.approval_status, o.oficina_id
     FROM approval_links al
     JOIN orcamentos o ON o.id = al.orcamento_id
     WHERE al.token = $1`,
    [token]
  );

  if (!link) {
    return { valid: false, error: 'not_found' };
  }

  // Check if invalidated
  if (link.invalidated_at) {
    return { valid: false, error: 'invalidated' };
  }

  // Check if expired
  if (new Date(link.expires_at) < new Date()) {
    // Update budget status to expired if not already processed
    if (link.approval_status === 'pending') {
      await run(
        `UPDATE orcamentos 
         SET approval_status = 'expired' 
         WHERE id = $1 AND approval_status = 'pending'`,
        [link.orcamento_id]
      );
    }
    return { valid: false, error: 'expired', expiresAt: link.expires_at, oficina_id: link.oficina_id };
  }

  // Check if already processed
  if (link.approval_status === 'approved' || link.approval_status === 'rejected') {
    return { valid: false, error: 'already_processed', status: link.approval_status };
  }

  // Record access
  await run(
    `INSERT INTO approval_link_accesses (link_id, ip_address, user_agent) 
     VALUES ($1, $2, $3)`,
    [link.id, ipAddress, userAgent]
  );

  // Update access count and timestamps
  await run(
    `UPDATE approval_links 
     SET access_count = access_count + 1,
         first_accessed_at = COALESCE(first_accessed_at, NOW()),
         last_accessed_at = NOW()
     WHERE id = $1`,
    [link.id]
  );

  // Log access action
  await run(
    `INSERT INTO approval_actions 
     (oficina_id, orcamento_id, link_id, action_type, client_ip_address, link_token) 
     VALUES ($1, $2, $3, 'link_accessed', $4, $5)`,
    [link.oficina_id, link.orcamento_id, link.id, ipAddress, token]
  );

  return { valid: true, link };
}

/**
 * Process budget approval
 * @param {string} token 
 * @param {string|null} signatureData - Base64 PNG signature (if required)
 * @param {string|null} ipAddress 
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function approveBudget(token, signatureData = null, ipAddress = null) {
  // Validate link
  const validation = await validateApprovalLink(token, ipAddress, null);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { link } = validation;

  // Check if signature is required
  const oficina = await queryOne(
    'SELECT require_signature FROM oficinas WHERE id = $1',
    [link.oficina_id]
  );

  if (oficina?.require_signature && !signatureData) {
    return { success: false, error: 'signature_required' };
  }

  // Validate signature format if provided
  if (signatureData) {
    if (!signatureData.startsWith('data:image/png;base64,')) {
      return { success: false, error: 'invalid_signature_format' };
    }
    // Check size (max 200KB)
    const sizeInBytes = (signatureData.length * 3) / 4;
    if (sizeInBytes > 200 * 1024) {
      return { success: false, error: 'signature_too_large' };
    }
  }

  try {
    // Executa aprovação dentro de uma transação para garantir atomicidade.
    // Sem transação, uma falha entre o UPDATE do orçamento e a invalidação do link
    // deixaria o estado inconsistente.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update budget status
      const result = await client.query(
        `UPDATE orcamentos 
         SET approval_status = 'approved', approved_at = NOW(), status = 'aprovado' 
         WHERE id = $1 AND approval_status = 'pending'`,
        [link.orcamento_id]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'budget_already_processed' };
      }

      // Invalidate link
      await client.query(
        `UPDATE approval_links 
         SET invalidated_at = NOW() 
         WHERE id = $1`,
        [link.id]
      );

      // Save signature if provided
      if (signatureData) {
        await client.query(
          `INSERT INTO budget_signatures 
           (oficina_id, orcamento_id, signature_data, client_ip_address) 
           VALUES ($1, $2, $3, $4)`,
          [link.oficina_id, link.orcamento_id, signatureData, ipAddress]
        );
      }

      // Log approval action
      await client.query(
        `INSERT INTO approval_actions 
         (oficina_id, orcamento_id, link_id, action_type, client_ip_address, link_token, metadata) 
         VALUES ($1, $2, $3, 'approved', $4, $5, $6)`,
        [
          link.oficina_id,
          link.orcamento_id,
          link.id,
          ipAddress,
          token,
          JSON.stringify({ hasSignature: !!signatureData })
        ]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // Notifica a oficina (in-app + WhatsApp) — assíncrono, não bloqueia
    try {
      const { notificarAprovacao } = require('./notificationService');
      const orcDados = await queryOne(
        `SELECT o.id, o.numero, o.valor_mo, o.valor_pecas, o.desconto,
                c.nome as cliente_nome, v.modelo as veiculo_modelo, v.placa
         FROM orcamentos o
         LEFT JOIN clientes c ON c.id = o.cliente_id
         LEFT JOIN veiculos v ON v.id = o.veiculo_id
         WHERE o.id = $1`,
        [link.orcamento_id]
      );
      console.log('[APPROVAL] Notificando aprovação:', { oficina_id: link.oficina_id, orcamento_id: link.orcamento_id, orcDados: !!orcDados });
      if (orcDados) await notificarAprovacao(link.oficina_id, orcDados);
    } catch (notifErr) {
      log.warn('notificacao_aprovacao_falhou', { erro: notifErr.message });
    }

    return {
      success: true,
      message: 'Orçamento aprovado com sucesso!',
      approvedAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('approval_links_approve', error);
    return { success: false, error: 'approval_failed' };
  }
}

/**
 * Process budget rejection
 * @param {string} token 
 * @param {string|null} reason 
 * @param {string|null} ipAddress 
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function rejectBudget(token, reason = null, ipAddress = null) {
  // Validate link
  const validation = await validateApprovalLink(token, ipAddress, null);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { link } = validation;

  // Validate and sanitize reason
  let sanitizedReason = null;
  if (reason) {
    sanitizedReason = reason.trim().substring(0, 500);
  }

  try {
    // Executa rejeição dentro de uma transação para garantir atomicidade.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update budget status
      const result = await client.query(
        `UPDATE orcamentos 
         SET approval_status = 'rejected', 
             rejected_at = NOW(), 
             rejection_reason = $2,
             status = 'rejeitado' 
         WHERE id = $1 AND approval_status = 'pending'`,
        [link.orcamento_id, sanitizedReason]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'budget_already_processed' };
      }

      // Invalidate link
      await client.query(
        `UPDATE approval_links 
         SET invalidated_at = NOW() 
         WHERE id = $1`,
        [link.id]
      );

      // Log rejection action
      await client.query(
        `INSERT INTO approval_actions 
         (oficina_id, orcamento_id, link_id, action_type, client_ip_address, link_token, metadata) 
         VALUES ($1, $2, $3, 'rejected', $4, $5, $6)`,
        [
          link.oficina_id,
          link.orcamento_id,
          link.id,
          ipAddress,
          token,
          JSON.stringify({ reason: sanitizedReason })
        ]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // Notifica a oficina (in-app + WhatsApp) — assíncrono, não bloqueia
    try {
      const { notificarRecusa } = require('./notificationService');
      const orcDados = await queryOne(
        `SELECT o.id, o.numero, c.nome as cliente_nome
         FROM orcamentos o
         LEFT JOIN clientes c ON c.id = o.cliente_id
         WHERE o.id = $1`,
        [link.orcamento_id]
      );
      console.log('[APPROVAL] Notificando recusa:', { oficina_id: link.oficina_id, orcamento_id: link.orcamento_id, orcDados: !!orcDados });
      if (orcDados) await notificarRecusa(link.oficina_id, orcDados, sanitizedReason);
    } catch (notifErr) {
      log.warn('notificacao_recusa_falhou', { erro: notifErr.message });
    }

    return {
      success: true,
      message: 'Orçamento recusado',
      rejectedAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('approval_links_reject', error);
    return { success: false, error: 'rejection_failed' };
  }
}

/**
 * Get approval statistics and audit trail for a budget
 * @param {number} orcamento_id 
 * @returns {Promise<object>}
 */
async function getApprovalStats(orcamento_id) {
  // Get current active link
  const currentLink = await queryOne(
    `SELECT * FROM approval_links 
     WHERE orcamento_id = $1 
       AND invalidated_at IS NULL 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [orcamento_id]
  );

  // Get budget status
  const budget = await queryOne(
    `SELECT approval_status, approved_at, rejected_at, rejection_reason 
     FROM orcamentos 
     WHERE id = $1`,
    [orcamento_id]
  );

  // Get signature if exists
  const signature = await queryOne(
    `SELECT signed_at 
     FROM budget_signatures 
     WHERE orcamento_id = $1 
     ORDER BY signed_at DESC 
     LIMIT 1`,
    [orcamento_id]
  );

  // Get audit trail
  const auditTrail = await query(
    `SELECT 
       aa.action_type, 
       aa.performed_at, 
       aa.client_ip_address,
       aa.metadata,
       u.nome as user_name
     FROM approval_actions aa
     LEFT JOIN usuarios u ON u.id = aa.performed_by_user_id
     WHERE aa.orcamento_id = $1
     ORDER BY aa.performed_at DESC
     LIMIT 50`,
    [orcamento_id]
  );

  return {
    currentLink: currentLink ? {
      token: currentLink.token,
      createdAt: currentLink.created_at,
      expiresAt: currentLink.expires_at,
      sentAt: currentLink.sent_at,
      accessCount: currentLink.access_count,
      firstAccessedAt: currentLink.first_accessed_at,
      lastAccessedAt: currentLink.last_accessed_at,
      link: `${process.env.PUBLIC_URL || 'http://localhost:5173'}/approve/${currentLink.token}`
    } : null,
    status: budget?.approval_status || 'pending',
    approvedAt: budget?.approved_at,
    rejectedAt: budget?.rejected_at,
    rejectionReason: budget?.rejection_reason,
    signature: signature ? {
      hasSignature: true, // não retorna o base64 — evita payload gigantesco
      signedAt: signature.signed_at
    } : null,
    auditTrail: auditTrail.map(entry => ({
      action: entry.action_type,
      timestamp: entry.performed_at,
      user: entry.user_name,
      ipAddress: entry.client_ip_address,
      metadata: entry.metadata
    }))
  };
}

/**
 * Mark link as sent via WhatsApp
 * @param {number} link_id 
 */
async function markLinkAsSent(link_id) {
  await run(
    `UPDATE approval_links 
     SET sent_at = NOW() 
     WHERE id = $1`,
    [link_id]
  );
}

module.exports = {
  generateApprovalLink,
  validateApprovalLink,
  approveBudget,
  rejectBudget,
  getApprovalStats,
  markLinkAsSent
};
