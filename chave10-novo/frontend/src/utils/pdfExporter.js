/**
 * 📄 PDF EXPORTER - Chave 10
 * 
 * Utilitário para exportar relatórios e dados em PDF
 * Sem dependências externas - usa apenas jsPDF via CDN ou window.jspdf
 */

// Função para carregar jsPDF dinamicamente se não estiver disponível
async function ensureJsPDF() {
  if (window.jspdf) {
    return window.jspdf.jsPDF;
  }

  // Carrega jsPDF do CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      if (window.jspdf) {
        resolve(window.jspdf.jsPDF);
      } else {
        reject(new Error('jsPDF não carregou corretamente'));
      }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => {
    if (!iso) return '-';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  },
  datetime: iso => {
    if (!iso) return '-';
    const date = new Date(iso);
    return date.toLocaleString('pt-BR');
  },
};

// Cores do tema
const COLORS = {
  brand: '#1E3A5F',
  accent: '#F97316',
  success: '#16a34a',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  darkGray: '#374151',
};

/**
 * Exporta relatório financeiro em PDF
 */
export async function exportRelatorioFinanceiro(data) {
  try {
    const jsPDF = await ensureJsPDF();
    const doc = new jsPDF();
    
    let yPos = 20;
    
    // Header
    doc.setFillColor(COLORS.brand);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Chave 10', 15, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório Financeiro', 15, 25);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 15, 32);
    
    yPos = 45;
    
    // KPIs
    doc.setTextColor(COLORS.darkGray);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 15, yPos);
    yPos += 10;
    
    const kpis = [
      { label: 'Faturamento Total', value: fmt.currency(data.totalFaturamento || 0), color: COLORS.accent },
      { label: 'Serviços Realizados', value: String(data.totalServicos || 0), color: COLORS.brand },
      { label: 'Ticket Médio', value: fmt.currency(data.ticketMedio || 0), color: COLORS.success },
      { label: 'Clientes Atendidos', value: String(data.totalClientes || 0), color: COLORS.gray },
    ];
    
    kpis.forEach((kpi, index) => {
      const xPos = 15 + (index % 2) * 95;
      const yOffset = Math.floor(index / 2) * 20;
      
      doc.setFillColor(COLORS.lightGray);
      doc.roundedRect(xPos, yPos + yOffset, 85, 15, 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.gray);
      doc.text(kpi.label, xPos + 3, yPos + yOffset + 5);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(kpi.color);
      doc.text(kpi.value, xPos + 3, yPos + yOffset + 12);
    });
    
    yPos += 50;
    
    // Top Serviços
    if (data.topServicos && data.topServicos.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.darkGray);
      doc.text('Top 5 Serviços Mais Realizados', 15, yPos);
      yPos += 8;
      
      data.topServicos.slice(0, 5).forEach((servico, index) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLORS.gray);
        doc.text(`${index + 1}. ${servico.nome}`, 20, yPos);
        doc.text(`${servico.qtd}x`, 150, yPos);
        doc.text(fmt.currency(servico.fat), 170, yPos);
        yPos += 6;
      });
      
      yPos += 5;
    }
    
    // Categorias
    if (data.categorias && data.categorias.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.darkGray);
      doc.text('Distribuição de Receita por Categoria', 15, yPos);
      yPos += 8;
      
      const total = data.categorias.reduce((s, c) => s + c.valor, 0);
      
      data.categorias.forEach((cat, index) => {
        const pct = total > 0 ? ((cat.valor / total) * 100).toFixed(1) : 0;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLORS.gray);
        doc.text(`${cat.nome}`, 20, yPos);
        doc.text(`${pct}%`, 130, yPos);
        doc.text(fmt.currency(cat.valor), 160, yPos);
        
        // Barra de progresso
        const barWidth = (pct / 100) * 100;
        doc.setFillColor(COLORS.accent);
        doc.rect(20, yPos + 2, barWidth, 2, 'F');
        
        yPos += 10;
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(COLORS.gray);
      doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
      doc.text('Chave 10 - Sistema de Gestão para Oficinas', 105, 290, { align: 'center' });
    }
    
    // Salva o PDF
    const filename = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('[PDF Export] Erro ao gerar PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exporta lista de OS em PDF
 */
export async function exportOSListPDF(osList, filtros = {}) {
  try {
    const jsPDF = await ensureJsPDF();
    const doc = new jsPDF();
    
    let yPos = 20;
    
    // Header
    doc.setFillColor(COLORS.brand);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Chave 10', 15, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Ordens de Serviço', 15, 25);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 15, 32);
    
    yPos = 50;
    
    // Filtros aplicados
    if (filtros.periodo || filtros.status) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.gray);
      let filtroText = 'Filtros: ';
      if (filtros.periodo) filtroText += `Período: ${filtros.periodo} `;
      if (filtros.status) filtroText += `Status: ${filtros.status}`;
      doc.text(filtroText, 15, yPos);
      yPos += 10;
    }
    
    // Cabeçalho da tabela
    doc.setFillColor(COLORS.lightGray);
    doc.rect(15, yPos, 180, 8, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.darkGray);
    doc.text('OS', 18, yPos + 5);
    doc.text('Cliente', 35, yPos + 5);
    doc.text('Veículo', 85, yPos + 5);
    doc.text('Status', 130, yPos + 5);
    doc.text('Valor', 165, yPos + 5);
    
    yPos += 12;
    
    // Lista de OS
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    osList.forEach((os, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      // Zebrado
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, yPos - 3, 180, 7, 'F');
      }
      
      doc.setTextColor(COLORS.darkGray);
      doc.text(`#${String(os.id).padStart(4, '0')}`, 18, yPos);
      doc.text((os.cliente_nome || '-').substring(0, 25), 35, yPos);
      doc.text((os.veiculo_modelo || '-').substring(0, 20), 85, yPos);
      
      // Status com cor
      const statusColor = os.status === 'finalizado' ? COLORS.success : COLORS.accent;
      doc.setTextColor(statusColor);
      doc.text(os.status === 'finalizado' ? 'Finalizado' : 'Em Andamento', 130, yPos);
      
      doc.setTextColor(COLORS.darkGray);
      doc.text(fmt.currency(os.valor || 0), 165, yPos);
      
      yPos += 7;
    });
    
    // Totais
    yPos += 5;
    const total = osList.reduce((sum, os) => sum + parseFloat(os.valor || 0), 0);
    
    doc.setFillColor(COLORS.brand);
    doc.rect(130, yPos, 65, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 135, yPos + 5);
    doc.text(fmt.currency(total), 165, yPos + 5);
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(COLORS.gray);
      doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
      doc.text('Chave 10 - Sistema de Gestão para Oficinas', 105, 290, { align: 'center' });
    }
    
    const filename = `os-list-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('[PDF Export] Erro ao gerar PDF de OS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exporta OS individual detalhada em PDF
 */
export async function exportOSDetalhePDF(os) {
  try {
    const jsPDF = await ensureJsPDF();
    const doc = new jsPDF();
    
    let yPos = 20;
    
    // Header
    doc.setFillColor(COLORS.brand);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Chave 10', 15, 15);
    
    doc.setFontSize(16);
    doc.text(`Ordem de Serviço #${String(os.id).padStart(4, '0')}`, 15, 27);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emitida em: ${fmt.date(os.created_at)}`, 15, 35);
    
    yPos = 50;
    
    // Cliente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.darkGray);
    doc.text('Cliente', 15, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(os.cliente_nome || '-', 15, yPos);
    yPos += 5;
    doc.text(os.cliente_telefone || '-', 15, yPos);
    yPos += 10;
    
    // Veículo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Veículo', 15, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${os.veiculo_marca || ''} ${os.veiculo_modelo || ''}`, 15, yPos);
    yPos += 5;
    doc.text(`Placa: ${os.placa || '-'}`, 15, yPos);
    yPos += 10;
    
    // Serviços
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Serviços Realizados', 15, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const servicos = (os.servicos || 'Não especificado').split('\n');
    servicos.forEach(servico => {
      doc.text(servico, 15, yPos);
      yPos += 5;
    });
    
    yPos += 5;
    
    // Valores
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Valores', 15, yPos);
    yPos += 8;
    
    const valores = [
      { label: 'Mão de Obra', valor: os.valor_mo || 0 },
      { label: 'Peças', valor: os.valor_pecas || 0 },
    ];
    
    valores.forEach(item => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, 20, yPos);
      doc.text(fmt.currency(item.valor), 170, yPos, { align: 'right' });
      yPos += 6;
    });
    
    // Total
    yPos += 2;
    doc.setFillColor(COLORS.accent);
    doc.rect(15, yPos - 3, 180, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL', 20, yPos + 3);
    doc.text(fmt.currency(parseFloat(os.valor_mo || 0) + parseFloat(os.valor_pecas || 0)), 170, yPos + 3, { align: 'right' });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(COLORS.gray);
    doc.text('Chave 10 - Sistema de Gestão para Oficinas', 105, 290, { align: 'center' });
    
    const filename = `os-${String(os.id).padStart(4, '0')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('[PDF Export] Erro ao gerar PDF de OS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mostra toast de sucesso/erro
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast show ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Wrapper com feedback visual
export async function exportWithFeedback(exportFunction, ...args) {
  try {
    const loadingToast = document.createElement('div');
    loadingToast.className = 'toast show';
    loadingToast.textContent = '⏳ Gerando PDF...';
    document.body.appendChild(loadingToast);
    
    const result = await exportFunction(...args);
    
    loadingToast.remove();
    
    if (result.success) {
      showToast(`✅ PDF gerado: ${result.filename}`, 'success');
    } else {
      showToast(`❌ Erro: ${result.error}`, 'error');
    }
    
    return result;
  } catch (error) {
    showToast(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}
