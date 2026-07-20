/**
 * notificationService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço de notificações do Chave 10.
 *
 * Funcionalidades:
 *   - Grava notificação in-app (tabela notificacoes)
 *   - Dispara WhatsApp para a oficina (se configurado)
 *   - Não bloqueia o fluxo principal em caso de falha
 *
 * Tipos de notificação:
 *   - orcamento_aprovado
 *   - orcamento_recusado
 *   - os_finalizada
 *   - lembrete_vencido
 *   - assinatura_vencendo
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { run, queryOne } = require('../db');
const log = require('../utils/logger');

/**
 * Cria notificação in-app no banco.
 */
async function criarNotificacao({ oficina_id, tipo, titulo, mensagem, link = null }) {
  try {
    await run(
      `INSERT INTO notificacoes (oficina_id, tipo, titulo, mensagem, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [oficina_id, tipo, titulo, mensagem, link]
    );
  } catch (err) {
    log.error('notificacao_criar', err);
  }
}

/**
 * Envia mensagem WhatsApp para o telefone da oficina.
 * Não bloqueia se falhar.
 */
async function notificarOficinaWhatsApp(oficina_id, mensagem) {
  try {
    const oficina = await queryOne(
      'SELECT telefone, whatsapp, nome FROM oficinas WHERE id=$1',
      [oficina_id]
    );
    if (!oficina) return;

    const telefone = oficina.whatsapp || oficina.telefone;
    if (!telefone) return;

    const WHATSAPP_API_URL   = process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

    // Se a API de WhatsApp não está configurada, gera link wa.me como fallback
    // (não envia automaticamente, mas registra a intenção no log)
    if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
      log.info('notificacao_whatsapp_pendente', {
        oficina_id,
        telefone,
        mensagem: mensagem.slice(0, 100),
      });
      return;
    }

    // Envia via API se configurada
    const axios = require('axios');
    const tel   = telefone.replace(/\D/g, '');
    const telFormatado = tel.startsWith('55') ? tel : `55${tel}`;

    await axios.post(WHATSAPP_API_URL, {
      phone: telFormatado,
      message: mensagem,
    }, {
      headers: { Authorization: `Bearer ${WHATSAPP_API_TOKEN}` },
      timeout: 10000,
    });
  } catch (err) {
    // Falha no WhatsApp não deve impactar o fluxo
    log.warn('notificacao_whatsapp_falhou', { oficina_id, erro: err.message });
  }
}

/**
 * Notifica a oficina sobre aprovação do orçamento.
 */
async function notificarAprovacao(oficina_id, orcamento) {
  const numero   = orcamento.numero || `ORC-${orcamento.id}`;
  const cliente  = orcamento.cliente_nome || 'Cliente';
  const veiculo  = orcamento.veiculo_modelo ? `${orcamento.veiculo_modelo} — ${orcamento.placa || ''}` : '';
  const valor    = ((orcamento.valor_mo || 0) + (orcamento.valor_pecas || 0) - (orcamento.desconto || 0)).toFixed(2).replace('.', ',');

  const titulo   = `✅ Orçamento ${numero} aprovado!`;
  const mensagem = `${cliente} aprovou o orçamento ${numero}${veiculo ? ` (${veiculo})` : ''}. Valor: R$ ${valor}`;

  // In-app
  await criarNotificacao({
    oficina_id,
    tipo: 'orcamento_aprovado',
    titulo,
    mensagem,
    link: `/app/orcamentos`,
  });

  // WhatsApp
  const msgWa = `✅ *ORÇAMENTO APROVADO*\n\n` +
    `${numero}\n` +
    `Cliente: ${cliente}\n` +
    `${veiculo ? `Veículo: ${veiculo}\n` : ''}` +
    `Valor: R$ ${valor}\n\n` +
    `O cliente aprovou online. Serviço liberado para execução!`;

  await notificarOficinaWhatsApp(oficina_id, msgWa);
}

/**
 * Notifica a oficina sobre recusa do orçamento.
 */
async function notificarRecusa(oficina_id, orcamento, motivo = null) {
  const numero   = orcamento.numero || `ORC-${orcamento.id}`;
  const cliente  = orcamento.cliente_nome || 'Cliente';

  const titulo   = `❌ Orçamento ${numero} recusado`;
  const mensagem = `${cliente} recusou o orçamento ${numero}.${motivo ? ` Motivo: ${motivo}` : ''}`;

  // In-app
  await criarNotificacao({
    oficina_id,
    tipo: 'orcamento_recusado',
    titulo,
    mensagem,
    link: `/app/orcamentos`,
  });

  // WhatsApp
  const msgWa = `❌ *ORÇAMENTO RECUSADO*\n\n` +
    `${numero}\n` +
    `Cliente: ${cliente}\n` +
    `${motivo ? `Motivo: ${motivo}\n` : ''}` +
    `\nEntre em contato com o cliente para negociar.`;

  await notificarOficinaWhatsApp(oficina_id, msgWa);
}

module.exports = {
  criarNotificacao,
  notificarAprovacao,
  notificarRecusa,
  notificarOficinaWhatsApp,
};
