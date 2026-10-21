const axios = require('axios');

/**
 * Format phone number to WhatsApp format (55DDNNNNNNNNN)
 * @param {string} phone - Brazilian phone number in any format
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) throw new Error('Phone number is required');

  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');

  // Ensure it starts with country code 55
  if (cleanPhone.startsWith('55')) {
    return cleanPhone;
  }

  // Add country code
  return `55${cleanPhone}`;
}

/**
 * Format date for display in Brazilian format
 * @param {Date|string} date 
 * @returns {string}
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Send approval link via WhatsApp
 * @param {object} options
 * @param {string} options.phoneNumber - Client phone number
 * @param {object} options.budgetData - Budget information
 * @param {string} options.approvalLink - Generated approval link
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendApprovalLink({ phoneNumber, budgetData, approvalLink }) {
  const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
  const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

  // Check if WhatsApp is configured
  if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
    console.warn('WhatsApp not configured. Set WHATSAPP_API_URL and WHATSAPP_API_TOKEN');
    return {
      success: false,
      error: 'whatsapp_not_configured'
    };
  }

  try {
    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Compose message
    const message = `Olá ${budgetData.clienteNome}! 👋\n\n` +
      `Seu orçamento #${budgetData.numero} está pronto!\n\n` +
      `🚗 Veículo: ${budgetData.veiculoModelo} - ${budgetData.veiculoPlaca}\n` +
      `💰 Valor Total: R$ ${budgetData.total.toFixed(2).replace('.', ',')}\n\n` +
      `📋 Clique no link abaixo para visualizar os detalhes e aprovar:\n` +
      `${approvalLink}\n\n` +
      `⏰ Este link é válido até ${formatDate(budgetData.expiryDate)}\n\n` +
      `--\n${budgetData.oficinaNome}\n${budgetData.oficinaTelefone}`;

    // Send via WhatsApp API
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        phone: formattedPhone,
        message: message
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    return {
      success: true,
      messageId: response.data?.id || response.data?.messageId
    };
  } catch (error) {
    console.error('WhatsApp send error:', error.message);

    // Handle different error types
    if (error.code === 'ECONNABORTED') {
      return { success: false, error: 'timeout' };
    }
    if (error.response) {
      // Não repassa detalhes da API externa — pode conter informações sensíveis
      return {
        success: false,
        error: 'api_error'
      };
    }

    return { success: false, error: 'send_failed' };
  }
}

/**
 * Validate phone number format
 * @param {string} phone 
 * @returns {boolean}
 */
function isValidPhoneNumber(phone) {
  if (!phone) return false;

  const cleanPhone = phone.replace(/\D/g, '');

  // Brazilian phone: 10 or 11 digits (without country code) or 12-13 with country code
  return cleanPhone.length >= 10 && cleanPhone.length <= 13;
}

module.exports = {
  sendApprovalLink,
  formatPhoneNumber,
  isValidPhoneNumber
};
