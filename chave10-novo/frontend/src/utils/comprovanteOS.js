/**
 * comprovanteOS.js — Chave 10
 *
 * Gera o HTML completo do comprovante de serviço de uma OS finalizada.
 * Recebe os dados retornados pelo endpoint GET /app/os/:id/comprovante
 * que garante isolamento por oficina_id.
 *
 * Também exporta funções para download de PDF (via jsPDF via CDN)
 * e para montar a mensagem WhatsApp.
 */

const fmt = {
  currency: v => 'R$\u00a0' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  date: iso => {
    if (!iso) return '—';
    const d = iso.split('T')[0];
    const [y, m, dd] = d.split('-');
    return `${dd}/${m}/${y}`;
  },
  datetime: iso => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return iso; }
  },
  addDays: (iso, days) => {
    if (!iso || !days) return null;
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
};

// ─── Cores da identidade visual Chave 10 ─────────────────────
const C = {
  brand:      '#1E3A5F',
  accent:     '#F97316',
  accentDark: '#c05c0a',
  success:    '#16a34a',
  gray50:     '#F9FAFB',
  gray100:    '#F3F4F6',
  gray200:    '#E5E7EB',
  gray400:    '#9CA3AF',
  gray500:    '#6B7280',
  gray700:    '#374151',
  gray800:    '#1F2937',
  white:      '#FFFFFF',
};

/** Converte número de dias em texto legível */
function prazoTexto(dias) {
  if (!dias || dias <= 0) return null;
  if (dias % 365 === 0) {
    const anos = dias / 365;
    return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  }
  if (dias % 30 === 0) {
    const meses = dias / 30;
    return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }
  return `${dias} dias`;
}

/** Retorna texto da forma de pagamento */
function formaPagLabel(pag) {
  const mapa = { pix: 'PIX', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito' };
  let label = mapa[pag.forma] || pag.forma;
  if (pag.forma === 'credito' && pag.parcelas > 1) label += ` ${pag.parcelas}x`;
  if (pag.bandeira) label += ` · ${pag.bandeira.charAt(0).toUpperCase() + pag.bandeira.slice(1)}`;
  return label;
}

/**
 * Gera HTML completo do comprovante de serviço.
 *
 * @param {object} os        - Dados da OS (inclui join com cliente/veículo)
 * @param {object} oficina   - Dados da oficina (logo, nome, CNPJ, etc.)
 * @param {Array}  pagamentos - Lista de pagamentos da OS
 * @returns {string} HTML completo pronto para impressão ou conversão
 */
export function gerarComprovanteHTML(os, oficina, pagamentos = []) {
  const pecas     = Array.isArray(os.pecas_itens) ? os.pecas_itens : [];
  const totalMO   = parseFloat(os.valor_mo)    || 0;
  const totalPecas = parseFloat(os.valor_pecas) ||
    pecas.reduce((s, p) => s + (parseFloat(p.valor_unit) || 0) * (parseFloat(p.qtd) || 1), 0);
  const totalGeral = totalMO + totalPecas;

  // ─── Financeiro ───────────────────────────────────────────
  const totalPago   = pagamentos.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0);
  const saldoPend   = Math.max(0, totalGeral - totalPago);

  // ─── Garantia ─────────────────────────────────────────────
  // Prioridade: garantia da OS > padrão da oficina
  const garantiaDias = os.garantia_prazo_dias || oficina.garantia_padrao_dias || 0;
  const garantiaCond = os.garantia_condicoes  || oficina.garantia_padrao_condicoes || null;
  const garantiaIni  = os.garantia_data_inicio ||
    (os.data_conclusao ? os.data_conclusao.split('T')[0] : null) ||
    os.data || null;
  const garantiaFim  = garantiaDias > 0 ? fmt.addDays(garantiaIni, garantiaDias) : null;
  const garantiaPrazoTxt = prazoTexto(garantiaDias);

  // ─── Número da OS ─────────────────────────────────────────
  const osNumero = os.numero || String(os.id).padStart(4, '0');

  // ─── Logo ─────────────────────────────────────────────────
  const logoHTML = oficina.logo
    ? `<img src="${oficina.logo}" alt="${oficina.nome || 'Oficina'}" style="max-height:72px;max-width:220px;object-fit:contain;display:block;margin-bottom:6px" />`
    : '';

  // ─── Peças ────────────────────────────────────────────────
  const pecasFiltered = pecas.filter(p => p.nome && !p.cliente_fornece);
  const pecasRowsHTML = pecasFiltered.length
    ? pecasFiltered.map(p => {
        const qty     = parseFloat(p.qtd) || 1;
        const unit    = parseFloat(p.valor_unit) || 0;
        const subtotal = qty * unit;
        return `
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid ${C.gray100};font-size:13px;color:${C.gray800}">${p.nome}</td>
            <td style="padding:9px 12px;border-bottom:1px solid ${C.gray100};font-size:13px;color:${C.gray500};text-align:center">${qty % 1 === 0 ? qty : qty.toFixed(2)}</td>
            <td style="padding:9px 12px;border-bottom:1px solid ${C.gray100};font-size:13px;color:${C.gray500};text-align:right">${fmt.currency(unit)}</td>
            <td style="padding:9px 12px;border-bottom:1px solid ${C.gray100};font-size:13px;color:${C.gray800};text-align:right;font-weight:600">${fmt.currency(subtotal)}</td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="padding:12px;font-size:12px;color:${C.gray400};text-align:center">Nenhuma peça registrada</td></tr>`;

  // ─── Pagamentos ───────────────────────────────────────────
  const pagRowsHTML = pagamentos.length
    ? pagamentos.map(pag => `
        <tr>
          <td style="padding:9px 12px;border-bottom:1px solid ${C.gray100};font-size:13px;color:${C.gray800}">${formaPagLabel(pag)}</td>
          <td style="padding:9px 12px;border-bottom:1px solid ${C.gray100};font-size:12px;color:${C.gray500}">${fmt.date(pag.data_pagamento)}</td>
          <td style="padding:9px 12px;border-bottom:1px solid ${C.gray100};font-size:13px;font-weight:600;color:${C.success};text-align:right">${fmt.currency(pag.valor_total)}</td>
        </tr>`).join('')
    : '';

  // ─── Garantia HTML ────────────────────────────────────────
  const garantiaHTML = garantiaPrazoTxt ? `
    <div style="margin-top:28px;background:${C.gray50};border:1px solid ${C.gray200};border-radius:8px;padding:18px 20px;page-break-inside:avoid">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:18px">🛡️</span>
        <span style="font-size:13px;font-weight:700;color:${C.brand};text-transform:uppercase;letter-spacing:.5px">Garantia do Serviço</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 24px">
        <div>
          <div style="font-size:11px;color:${C.gray400};margin-bottom:2px">Prazo</div>
          <div style="font-size:14px;font-weight:700;color:${C.brand}">${garantiaPrazoTxt}</div>
        </div>
        ${garantiaIni ? `
        <div>
          <div style="font-size:11px;color:${C.gray400};margin-bottom:2px">Início</div>
          <div style="font-size:13px;font-weight:600;color:${C.gray800}">${fmt.date(garantiaIni)}</div>
        </div>` : ''}
        ${garantiaFim ? `
        <div>
          <div style="font-size:11px;color:${C.gray400};margin-bottom:2px">Válida até</div>
          <div style="font-size:13px;font-weight:600;color:${C.success}">${fmt.date(garantiaFim)}</div>
        </div>` : ''}
      </div>
      ${garantiaCond ? `
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid ${C.gray200}">
        <div style="font-size:11px;color:${C.gray400};margin-bottom:4px">Condições</div>
        <div style="font-size:12px;color:${C.gray700};line-height:1.5">${garantiaCond}</div>
      </div>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comprovante OS #${osNumero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: ${C.gray800};
      background: #fff;
      padding: 32px;
      max-width: 760px;
      margin: 0 auto;
    }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .7px;
      color: ${C.gray500};
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid ${C.gray200};
    }
    .section { margin-bottom: 22px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 28px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 20px; }
    .field label { font-size: 11px; color: ${C.gray400}; display: block; margin-bottom: 2px; }
    .field span  { font-size: 13px; color: ${C.gray800}; }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: ${C.gray100};
      padding: 8px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: ${C.gray500};
    }
    .page-break { page-break-before: always; }
    @media print {
      body { padding: 16px; }
      @page { margin: 12mm; }
    }
    @media (max-width: 600px) {
      body { padding: 16px; }
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- ══ CABEÇALHO ══════════════════════════════════════════ -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:18px;border-bottom:2px solid ${C.brand}">
    <div style="flex:1">
      ${logoHTML}
      ${oficina.logo && oficina.nome
        ? `<div style="font-size:16px;font-weight:800;color:${C.brand};margin-bottom:2px">${oficina.nome}</div>`
        : !oficina.logo
          ? `<div style="font-size:20px;font-weight:800;color:${C.brand};margin-bottom:4px">${oficina.nome || 'Minha Oficina'}</div>`
          : ''}
      ${oficina.documento ? `<div style="font-size:11px;color:${C.gray500};margin-top:1px">CNPJ/CPF: ${oficina.documento}</div>` : ''}
      ${oficina.telefone  ? `<div style="font-size:11px;color:${C.gray500};margin-top:1px">📞 ${oficina.telefone}</div>` : ''}
      ${oficina.whatsapp  ? `<div style="font-size:11px;color:${C.gray500};margin-top:1px">💬 WhatsApp: ${oficina.whatsapp}</div>` : ''}
      ${oficina.email     ? `<div style="font-size:11px;color:${C.gray500};margin-top:1px">✉ ${oficina.email}</div>` : ''}
      ${oficina.endereco  ? `<div style="font-size:11px;color:${C.gray500};margin-top:1px">📍 ${oficina.endereco}</div>` : ''}
    </div>
    <div style="text-align:right;flex-shrink:0;margin-left:20px">
      <div style="font-size:11px;font-weight:700;color:${C.gray500};text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">COMPROVANTE DE SERVIÇO CONCLUÍDO</div>
      <div style="font-size:22px;font-weight:800;color:${C.brand}">OS Nº ${osNumero}</div>
      <div style="font-size:12px;color:${C.gray500};margin-top:3px">Abertura: ${fmt.date(os.data)}</div>
      ${os.data_conclusao ? `<div style="font-size:12px;color:${C.success};margin-top:1px;font-weight:600">Concluída: ${fmt.datetime(os.data_conclusao)}</div>` : ''}
      <div style="margin-top:6px">
        <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#f0fdf4;color:${C.success};border:1px solid #bbf7d0">✓ Finalizado</span>
      </div>
    </div>
  </div>

  <!-- ══ CLIENTE ════════════════════════════════════════════ -->
  <div class="section">
    <div class="section-title">Dados do cliente</div>
    <div class="grid-2">
      <div class="field"><label>Nome</label><span>${os.cliente_nome || '—'}</span></div>
      <div class="field"><label>Telefone</label><span>${os.cliente_telefone || '—'}</span></div>
      ${os.cliente_email    ? `<div class="field"><label>E-mail</label><span>${os.cliente_email}</span></div>` : ''}
      ${os.cliente_endereco ? `<div class="field"><label>Endereço</label><span>${os.cliente_endereco}</span></div>` : ''}
    </div>
  </div>

  <!-- ══ VEÍCULO ════════════════════════════════════════════ -->
  <div class="section">
    <div class="section-title">Veículo</div>
    <div class="grid-3">
      <div class="field"><label>Marca / Modelo</label><span>${[os.veiculo_marca, os.veiculo_modelo].filter(Boolean).join(' ') || '—'}</span></div>
      <div class="field"><label>Placa</label><span style="font-weight:700;letter-spacing:.5px">${os.veiculo_placa || os.placa || '—'}</span></div>
      ${os.veiculo_ano ? `<div class="field"><label>Ano</label><span>${os.veiculo_ano}</span></div>` : ''}
      ${os.veiculo_km  ? `<div class="field"><label>Quilometragem</label><span>${parseInt(os.veiculo_km).toLocaleString('pt-BR')} km</span></div>` : ''}
      ${os.mecanico_nome ? `<div class="field"><label>Mecânico responsável</label><span>${os.mecanico_nome}</span></div>` : ''}
    </div>
  </div>

  <!-- ══ PROBLEMA / SERVIÇOS ════════════════════════════════ -->
  ${os.descricao ? `
  <div class="section">
    <div class="section-title">Problema relatado</div>
    <p style="background:${C.gray50};padding:10px 14px;border-radius:6px;border:1px solid ${C.gray200};font-size:13px;line-height:1.5;color:${C.gray800}">${os.descricao}</p>
  </div>` : ''}

  ${os.servicos ? `
  <div class="section">
    <div class="section-title">Serviços e mão de obra realizados</div>
    <p style="background:${C.gray50};padding:10px 14px;border-radius:6px;border:1px solid ${C.gray200};font-size:13px;line-height:1.5;color:${C.gray800}">${os.servicos}</p>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:8px 14px;background:${C.gray100};border-radius:6px">
      <span style="font-size:12px;color:${C.gray500}">Mão de obra</span>
      <span style="font-size:14px;font-weight:700;color:${C.brand}">${fmt.currency(totalMO)}</span>
    </div>
  </div>` : ''}

  <!-- ══ PEÇAS ══════════════════════════════════════════════ -->
  <div class="section">
    <div class="section-title">Peças utilizadas</div>
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th style="text-align:center">Qtd</th>
          <th style="text-align:right">Valor unit.</th>
          <th style="text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${pecasRowsHTML}
      </tbody>
    </table>
  </div>

  <!-- ══ RESUMO FINANCEIRO ══════════════════════════════════ -->
  <div class="section" style="page-break-inside:avoid">
    <div class="section-title">Resumo financeiro</div>
    <div style="background:${C.gray50};border:1px solid ${C.gray200};border-radius:8px;overflow:hidden">
      ${totalMO > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid ${C.gray200}">
        <span style="font-size:13px;color:${C.gray700}">Mão de obra / Serviços</span>
        <span style="font-size:13px;color:${C.gray800}">${fmt.currency(totalMO)}</span>
      </div>` : ''}
      ${totalPecas > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid ${C.gray200}">
        <span style="font-size:13px;color:${C.gray700}">Peças</span>
        <span style="font-size:13px;color:${C.gray800}">${fmt.currency(totalPecas)}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:${C.brand}">
        <span style="font-size:14px;font-weight:700;color:${C.white}">TOTAL DO SERVIÇO</span>
        <span style="font-size:20px;font-weight:800;color:${C.accent}">${fmt.currency(totalGeral)}</span>
      </div>
      ${pagamentos.length > 0 ? `
      <div style="padding:0 16px">
        ${pagRowsHTML.replace(/<tr>/g, '<tr>').replace(/border-bottom:1px solid [^;]+/g, 'border-bottom:1px solid ' + C.gray200)}
      </div>
      ${saldoPend > 0.01 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#fff7ed;border-top:1px solid #fed7aa">
        <span style="font-size:13px;font-weight:600;color:#c05c0a">Saldo pendente</span>
        <span style="font-size:15px;font-weight:700;color:#c05c0a">${fmt.currency(saldoPend)}</span>
      </div>` : `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#f0fdf4;border-top:1px solid #bbf7d0">
        <span style="font-size:13px;font-weight:600;color:${C.success}">✓ Pagamento recebido</span>
        <span style="font-size:14px;font-weight:700;color:${C.success}">${fmt.currency(totalPago)}</span>
      </div>`}` : ''}
    </div>
  </div>

  <!-- ══ OBSERVAÇÕES ════════════════════════════════════════ -->
  ${os.observacao ? `
  <div class="section">
    <div class="section-title">Observações</div>
    <p style="background:${C.gray50};padding:10px 14px;border-radius:6px;border:1px solid ${C.gray200};font-size:12px;line-height:1.5;color:${C.gray700}">${os.observacao}</p>
  </div>` : ''}

  <!-- ══ GARANTIA ═══════════════════════════════════════════ -->
  ${garantiaHTML}

  <!-- ══ RODAPÉ ═════════════════════════════════════════════ -->
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid ${C.gray200};text-align:center">
    <div style="font-size:11px;color:${C.gray400};line-height:1.7">
      ${[oficina.nome, oficina.telefone, oficina.email].filter(Boolean).join(' · ')}<br/>
      Comprovante gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}<br/>
      <span style="font-style:italic">Este documento é um comprovante de serviço. Não substitui nota fiscal obrigatória.</span>
    </div>
  </div>

</body>
</html>`;
}

/**
 * Gera a mensagem de WhatsApp para envio do comprovante ao cliente.
 *
 * @param {object} os         - Dados da OS
 * @param {object} oficina    - Dados da oficina
 * @param {Array}  pagamentos - Pagamentos registrados
 * @returns {{ tel: string|null, msg: string }} telefone limpo + texto da mensagem
 */
export function montarMsgWhatsApp(os, oficina, pagamentos = []) {
  const pecas      = Array.isArray(os.pecas_itens) ? os.pecas_itens : [];
  const totalMO    = parseFloat(os.valor_mo)    || 0;
  const totalPecas = parseFloat(os.valor_pecas) ||
    pecas.reduce((s, p) => s + (parseFloat(p.valor_unit) || 0) * (parseFloat(p.qtd) || 1), 0);
  const totalGeral = totalMO + totalPecas;
  const totalPago  = pagamentos.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0);
  const saldo      = Math.max(0, totalGeral - totalPago);

  const osNumero = os.numero || String(os.id).padStart(4, '0');
  const garantiaDias = os.garantia_prazo_dias || oficina.garantia_padrao_dias || 0;
  const prazoTxt = prazoTexto(garantiaDias);

  let msg = `*${oficina.nome || 'Oficina'}* — Comprovante de Serviço\n`;
  msg += `OS Nº ${osNumero} | Data: ${fmt.date(os.data)}\n\n`;

  // Veículo
  const veiculo = [os.veiculo_marca, os.veiculo_modelo].filter(Boolean).join(' ');
  if (veiculo || os.veiculo_placa || os.placa) {
    msg += `🚗 *Veículo:* ${veiculo || '—'}${(os.veiculo_placa || os.placa) ? ' · ' + (os.veiculo_placa || os.placa) : ''}\n\n`;
  }

  // Serviços
  if (os.servicos) msg += `🔧 *Serviços realizados:*\n${os.servicos}\n\n`;
  if (os.descricao && !os.servicos) msg += `📋 *Problema:* ${os.descricao}\n\n`;

  // Peças
  const pecasFiltradas = pecas.filter(p => p.nome && !p.cliente_fornece);
  if (pecasFiltradas.length) {
    msg += `🔩 *Peças utilizadas:*\n`;
    pecasFiltradas.forEach(p => {
      const qty = parseFloat(p.qtd) || 1;
      const sub = (parseFloat(p.valor_unit) || 0) * qty;
      msg += `• ${qty % 1 === 0 ? qty : qty.toFixed(2)}x ${p.nome} — ${fmt.currency(sub)}\n`;
    });
    msg += '\n';
  }

  // Financeiro
  msg += `💰 *Resumo financeiro:*\n`;
  if (totalMO   > 0) msg += `Mão de obra: ${fmt.currency(totalMO)}\n`;
  if (totalPecas > 0) msg += `Peças: ${fmt.currency(totalPecas)}\n`;
  msg += `*TOTAL: ${fmt.currency(totalGeral)}*\n`;
  if (pagamentos.length) {
    pagamentos.forEach(pag => { msg += `Pagamento (${formaPagLabel(pag)}): ${fmt.currency(pag.valor_total)}\n`; });
  }
  if (saldo > 0.01) msg += `*Saldo pendente: ${fmt.currency(saldo)}*\n`;

  // Garantia
  if (prazoTxt) {
    msg += `\n🛡️ *Garantia: ${prazoTxt}*`;
    const garantiaIni = os.garantia_data_inicio ||
      (os.data_conclusao ? os.data_conclusao.split('T')[0] : null) || os.data;
    const garantiaFim = garantiaDias > 0 ? fmt.addDays(garantiaIni, garantiaDias) : null;
    if (garantiaFim) msg += ` (válida até ${fmt.date(garantiaFim)})`;
    msg += '\n';
  }

  msg += `\nObrigado pela confiança! 🙏\n`;
  if (oficina.nome) msg += `${oficina.nome}`;
  if (oficina.telefone) msg += ` · ${oficina.telefone}`;

  const tel = (os.cliente_telefone || '').replace(/\D/g, '');
  return { tel: tel || null, msg };
}

/**
 * Carrega jsPDF via CDN (mesmo padrão do pdfExporter.js existente).
 */
async function ensureJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF;
  return new Promise((resolve, reject) => {
    // Evita duplicar script se já estiver sendo carregado
    const existing = document.getElementById('c10-jspdf-script');
    if (existing) {
      existing.addEventListener('load', () => window.jspdf ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF não carregou')));
      return;
    }
    const script = document.createElement('script');
    script.id  = 'c10-jspdf-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => window.jspdf ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF não carregou'));
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Gera PDF do comprovante usando HTML → jsPDF (via html method).
 * Dispara o download direto no navegador sem dialog de impressão.
 *
 * @param {object} os
 * @param {object} oficina
 * @param {Array}  pagamentos
 * @returns {Promise<{success:boolean, filename?:string, error?:string}>}
 */
export async function downloadComprovanteOSPDF(os, oficina, pagamentos = []) {
  try {
    const jsPDF  = await ensureJsPDF();
    const html   = gerarComprovanteHTML(os, oficina, pagamentos);
    const osNum  = os.numero || String(os.id).padStart(4, '0');
    const dataStr = (os.data || new Date().toISOString().split('T')[0]).replace(/-/g, '');

    // Cria elemento oculto para renderizar o HTML
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:760px;background:#fff;font-family:Arial,sans-serif';
    container.innerHTML = html.replace(/^<!DOCTYPE[^>]*>[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '');
    document.body.appendChild(container);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    await doc.html(container, {
      callback: (d) => {
        document.body.removeChild(container);
        const filename = `comprovante-os-${osNum}-${dataStr}.pdf`;
        d.save(filename);
      },
      x: 10,
      y: 10,
      width: 190,        // largura útil em mm (A4 = 210 - 20 margem)
      windowWidth: 760,  // corresponde ao max-width do HTML
      margin: [5, 10, 5, 10],
      autoPaging: 'text',
    });

    const filename = `comprovante-os-${osNum}-${dataStr}.pdf`;
    return { success: true, filename };
  } catch (err) {
    console.error('[Comprovante PDF] Erro:', err);
    // Remove container se ainda estiver no DOM
    const c = document.querySelector('[style*="left:-9999px"]');
    if (c) { try { document.body.removeChild(c); } catch { /* ok */ } }
    return { success: false, error: err.message || 'Erro ao gerar PDF' };
  }
}
