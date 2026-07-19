const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const { query, queryOne } = require('../db');
const log = require('../utils/logger');
const { validateId } = require('../middleware/validate');
const {
  generateApprovalLink,
  validateApprovalLink,
  approveBudget,
  rejectBudget,
  getApprovalStats,
  markLinkAsSent
} = require('../services/approval-links');
const { sendApprovalLink, isValidPhoneNumber } = require('../services/whatsapp');
const { validateSignatureUpload } = require('../middleware/uploadValidator');

// ────────────────────────────────────────────────────────────────
// AUTHENTICATED ROUTES (Workshop users)
// ────────────────────────────────────────────────────────────────
/**
 * POST /api/approval/orcamentos/:id/link
 * Generate approval link for a budget
 */
router.post('/orcamentos/:id/link', authMiddleware, validateId, async (req, res) => {
  const orcamento_id = req.params.id; // já validado como inteiro positivo pelo validateId
  const rawHours = req.body?.validityHours;
  const validityHours = rawHours !== undefined ? parseInt(rawHours, 10) : 168;
  if (isNaN(validityHours) || validityHours < 1 || validityHours > 2160) {
    return res.status(400).json({ error: 'validityHours deve ser entre 1 e 2160' });
  }
  const sendViaWhatsApp = req.body?.sendViaWhatsApp === true;
  const user = req.user;

  try {
    // Get budget details and verify ownership
    const orcamento = await queryOne(
      `SELECT o.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
              v.placa, v.modelo, v.marca, v.ano,
              of.nome as oficina_nome, of.telefone as oficina_telefone
       FROM orcamentos o
       LEFT JOIN clientes c ON c.id = o.cliente_id
       LEFT JOIN veiculos v ON v.id = o.veiculo_id
       JOIN oficinas of ON of.id = o.oficina_id
       WHERE o.id = $1 AND o.oficina_id = $2`,
      [orcamento_id, user.oficina_id]
    );

    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    // Validate budget completeness
    if (!orcamento.cliente_id) {
      return res.status(400).json({ error: 'Orçamento sem cliente associado' });
    }

    if (!orcamento.cliente_telefone || !isValidPhoneNumber(orcamento.cliente_telefone)) {
      return res.status(400).json({ error: 'Cliente sem telefone válido' });
    }

    // Check if budget has items
    const hasItems = (orcamento.servicos && orcamento.servicos !== '[]') ||
                     (orcamento.pecas && orcamento.pecas !== '[]');
    if (!hasItems) {
      return res.status(400).json({ error: 'Orçamento sem serviços ou peças' });
    }

    // Calculate total
    const total = (orcamento.valor_mo || 0) + (orcamento.valor_pecas || 0) - (orcamento.desconto || 0);
    if (total <= 0) {
      return res.status(400).json({ error: 'Orçamento com valor total inválido' });
    }

    // Check if budget is already approved or rejected
    if (orcamento.approval_status === 'approved' || orcamento.approval_status === 'rejected') {
      return res.status(400).json({
        error: 'Orçamento já foi processado',
        status: orcamento.approval_status
      });
    }

    // Generate link
    const linkData = await generateApprovalLink(
      user.oficina_id,
      orcamento_id,
      user.id,
      validityHours
    );

    // Send via WhatsApp if requested
    let sent = false;
    let whatsappError = null;

    if (sendViaWhatsApp) {
      const budgetData = {
        numero: orcamento.numero || `ORÇ-${orcamento.id}`,
        clienteNome: orcamento.cliente_nome,
        veiculoModelo: orcamento.modelo || 'Veículo',
        veiculoPlaca: orcamento.placa || 'N/A',
        total,
        expiryDate: linkData.expiresAt,
        oficinaNome: orcamento.oficina_nome,
        oficinaTelefone: orcamento.oficina_telefone || ''
      };

      const result = await sendApprovalLink({
        phoneNumber: orcamento.cliente_telefone,
        budgetData,
        approvalLink: linkData.link
      });

      if (result.success) {
        sent = true;
        await markLinkAsSent(linkData.id);

        // Log send action
        await query(
          `INSERT INTO approval_actions 
           (oficina_id, orcamento_id, link_id, action_type, performed_by_user_id, link_token) 
           VALUES ($1, $2, $3, 'link_sent', $4, $5)`,
          [user.oficina_id, orcamento_id, linkData.id, user.id, linkData.token]
        );
      } else {
        whatsappError = result.error;
      }
    }

    res.json({
      link: linkData.link,
      token: linkData.token,
      expiresAt: linkData.expiresAt,
      sent,
      whatsappError
    });
  } catch (error) {
    log.error('approval_generate_link', error);
    res.status(500).json({ error: 'Erro ao gerar link' });
  }
});

/**
 * POST /api/approval/orcamentos/:id/regenerate-link
 * Regenerate approval link for a budget
 */
router.post('/orcamentos/:id/regenerate-link', authMiddleware, validateId, async (req, res) => {
  const orcamento_id = req.params.id; // já validado como inteiro positivo
  const rawHours = req.body?.validityHours;
  const validityHours = rawHours !== undefined ? parseInt(rawHours, 10) : 168;
  if (isNaN(validityHours) || validityHours < 1 || validityHours > 2160) {
    return res.status(400).json({ error: 'validityHours deve ser entre 1 e 2160' });
  }
  const user = req.user;

  try {
    // Get budget and check ownership
    const orcamento = await queryOne(
      `SELECT approval_status FROM orcamentos 
       WHERE id = $1 AND oficina_id = $2`,
      [orcamento_id, user.oficina_id]
    );

    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    // Don't allow regeneration if already approved or rejected
    if (orcamento.approval_status === 'approved' || orcamento.approval_status === 'rejected') {
      return res.status(400).json({
        error: 'Não é possível regenerar link de orçamento já processado',
        status: orcamento.approval_status
      });
    }

    // Generate new link (this will invalidate old ones)
    const linkData = await generateApprovalLink(
      user.oficina_id,
      orcamento_id,
      user.id,
      validityHours
    );

    // Log regeneration action
    await query(
      `INSERT INTO approval_actions 
       (oficina_id, orcamento_id, link_id, action_type, performed_by_user_id, link_token) 
       VALUES ($1, $2, $3, 'regenerated', $4, $5)`,
      [user.oficina_id, orcamento_id, linkData.id, user.id, linkData.token]
    );

    res.json({
      link: linkData.link,
      token: linkData.token,
      expiresAt: linkData.expiresAt
    });
  } catch (error) {
    log.error('approval_regenerate_link', error);
    res.status(500).json({ error: 'Erro ao regenerar link' });
  }
});

/**
 * GET /api/approval/orcamentos/:id/stats
 * Get approval statistics for a budget
 */
router.get('/orcamentos/:id/stats', authMiddleware, validateId, async (req, res) => {
  const orcamento_id = req.params.id; // já validado como inteiro positivo
  const user = req.user;

  try {
    // Verify ownership
    const orcamento = await queryOne(
      'SELECT id FROM orcamentos WHERE id = $1 AND oficina_id = $2',
      [orcamento_id, user.oficina_id]
    );

    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    const stats = await getApprovalStats(orcamento_id);
    res.json(stats);
  } catch (error) {
    log.error('approval_get_stats', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// ────────────────────────────────────────────────────────────────
// RATE LIMIT para rotas públicas de aprovação (clientes externos)
// ────────────────────────────────────────────────────────────────
const publicApprovalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30,                   // máx 30 acessos por IP (GET + POST de aprovação/rejeição)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
});

// ────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (No authentication required)
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/approval/public/:token
 * Get budget details for client approval (public endpoint)
 */
router.get('/public/:token', publicApprovalLimiter, async (req, res) => {
  const { token } = req.params;

  // Valida formato do token antes de consultar o banco
  if (!token || typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) {
    return res.status(400).json({ valid: false, error: 'invalid_format', message: 'Link inválido' });
  }

  const ipAddress = req.ip;
  const userAgent = req.get('user-agent')?.slice(0, 256); // limita tamanho do UA

  try {
    const validation = await validateApprovalLink(token, ipAddress, userAgent);

    if (!validation.valid) {
      // Handle different error cases
      if (validation.error === 'expired') {
        // Get oficina info for expired link
        const oficina = await queryOne(
          `SELECT of.nome, of.telefone, of.endereco 
           FROM oficinas of 
           WHERE of.id = $1`,
          [validation.oficina_id]
        );

        return res.json({
          valid: false,
          error: 'expired',
          message: `Este link expirou em ${new Date(validation.expiresAt).toLocaleDateString('pt-BR')}`,
          oficina: oficina ? {
            nome: oficina.nome,
            telefone: oficina.telefone,
            endereco: oficina.endereco
          } : null
        });
      }

      if (validation.error === 'already_processed') {
        return res.json({
          valid: false,
          error: 'already_processed',
          message: validation.status === 'approved' ? 
            'Este orçamento já foi aprovado' : 
            'Este orçamento já foi recusado',
          status: validation.status
        });
      }

      return res.json({
        valid: false,
        error: validation.error,
        message: 'Link inválido ou não encontrado'
      });
    }

    // Get complete budget details
    const { link } = validation;

    const budget = await queryOne(
      `SELECT 
        o.id, o.numero, o.descricao, o.servicos, o.pecas, o.pecas_itens,
        o.valor_mo, o.valor_pecas, o.desconto, o.obs,
        c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email,
        v.placa, v.modelo, v.marca, v.ano, v.km,
        of.nome as oficina_nome, of.telefone as oficina_telefone, 
        of.email as oficina_email, of.endereco as oficina_endereco,
        of.require_signature
       FROM orcamentos o
       LEFT JOIN clientes c ON c.id = o.cliente_id
       LEFT JOIN veiculos v ON v.id = o.veiculo_id
       JOIN oficinas of ON of.id = o.oficina_id
       WHERE o.id = $1`,
      [link.orcamento_id]
    );

    if (!budget) {
      return res.status(404).json({ valid: false, error: 'budget_not_found' });
    }

    // Parse JSON fields
    let servicos = [];
    let pecas = [];

    try {
      servicos = budget.servicos ? JSON.parse(budget.servicos) : [];
    } catch (e) {
      log.warn('approval_parse_servicos', { orcamento_id: link.orcamento_id });
      servicos = [];
    }

    try {
      pecas = budget.pecas_itens ? JSON.parse(budget.pecas_itens) : 
              (budget.pecas ? JSON.parse(budget.pecas) : []);
    } catch (e) {
      log.warn('approval_parse_pecas', { orcamento_id: link.orcamento_id });
      pecas = [];
    }

    const total = (budget.valor_mo || 0) + (budget.valor_pecas || 0) - (budget.desconto || 0);

    res.json({
      valid: true,
      budget: {
        numero: budget.numero || `ORÇ-${budget.id}`,
        descricao: budget.descricao,
        cliente: {
          nome: budget.cliente_nome,
          telefone: budget.cliente_telefone,
          email: budget.cliente_email
        },
        veiculo: {
          placa: budget.placa,
          modelo: budget.modelo,
          marca: budget.marca,
          ano: budget.ano,
          km: budget.km
        },
        servicos,
        pecas,
        valorMO: budget.valor_mo || 0,
        valorPecas: budget.valor_pecas || 0,
        desconto: budget.desconto || 0,
        total,
        obs: budget.obs,
        oficina: {
          nome: budget.oficina_nome,
          telefone: budget.oficina_telefone,
          email: budget.oficina_email,
          endereco: budget.oficina_endereco
        },
        requireSignature: budget.require_signature || false
      },
      expiresAt: link.expires_at
    });
  } catch (error) {
    log.error('approval_get_public', error);
    res.status(500).json({ error: 'Erro ao buscar orçamento' });
  }
});

/**
 * POST /api/approval/public/:token/approve
 * Process budget approval (public endpoint)
 */
router.post('/public/:token/approve', publicApprovalLimiter, validateSignatureUpload, async (req, res) => {
  const { token } = req.params;

  // Valida formato do token
  if (!token || typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) {
    return res.status(400).json({ error: 'invalid_format', message: 'Link inválido' });
  }

  // Valida assinatura se presente
  let signature = null;
  if (req.body?.signature !== undefined) {
    if (typeof req.body.signature !== 'string') {
      return res.status(400).json({ error: 'invalid_signature_format', message: 'Formato de assinatura inválido' });
    }
    signature = req.body.signature;
  }

  const ipAddress = req.ip;

  try {
    const result = await approveBudget(token, signature, ipAddress);

    if (!result.success) {
      let message = 'Erro ao aprovar orçamento';
      let statusCode = 400;

      switch (result.error) {
        case 'expired':
          message = 'Link expirado';
          break;
        case 'signature_required':
          message = 'Assinatura obrigatória';
          break;
        case 'invalid_signature_format':
          message = 'Formato de assinatura inválido';
          break;
        case 'signature_too_large':
          message = 'Assinatura muito grande';
          break;
        case 'budget_already_processed':
          message = 'Orçamento já foi processado';
          break;
        case 'approval_failed':
          message = 'Falha ao processar aprovação';
          statusCode = 500;
          break;
      }

      return res.status(statusCode).json({ error: result.error, message });
    }

    res.json(result);
  } catch (error) {
    log.error('approval_approve_budget', error);
    res.status(500).json({ error: 'Erro ao aprovar orçamento' });
  }
});

/**
 * POST /api/approval/public/:token/reject
 * Process budget rejection (public endpoint)
 */
router.post('/public/:token/reject', publicApprovalLimiter, async (req, res) => {
  const { token } = req.params;

  // Valida formato do token
  if (!token || typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) {
    return res.status(400).json({ error: 'invalid_format', message: 'Link inválido' });
  }

  // Valida e sanitiza motivo
  let reason = null;
  if (req.body?.reason !== undefined) {
    if (typeof req.body.reason !== 'string') {
      return res.status(400).json({ error: 'reason deve ser uma string' });
    }
    reason = req.body.reason.replace(/<[^>]*>/g, '').trim().slice(0, 500) || null;
  }

  const ipAddress = req.ip;

  try {
    const result = await rejectBudget(token, reason, ipAddress);

    if (!result.success) {
      let message = 'Erro ao recusar orçamento';
      let statusCode = 400;

      switch (result.error) {
        case 'expired':
          message = 'Link expirado';
          break;
        case 'budget_already_processed':
          message = 'Orçamento já foi processado';
          break;
        case 'rejection_failed':
          message = 'Falha ao processar recusa';
          statusCode = 500;
          break;
      }

      return res.status(statusCode).json({ error: result.error, message });
    }

    res.json(result);
  } catch (error) {
    log.error('approval_reject_budget', error);
    res.status(500).json({ error: 'Erro ao recusar orçamento' });
  }
});

module.exports = router;
