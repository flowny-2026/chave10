/**
 * printHTML — imprime um documento HTML completo de forma robusta.
 *
 * Estratégia principal: renderiza o HTML num <iframe> oculto na própria página
 * e dispara a impressão a partir dele. Isso NÃO abre uma aba/janela nova, então
 * não é afetado por bloqueadores de pop-up — o ponto que mais falhava antes.
 *
 * Fallback: se por algum motivo o iframe falhar (navegadores muito antigos ou
 * ambientes restritos), cai para window.open('_blank') + print, como era antes.
 *
 * @param {string} html  Documento HTML completo (com <html>...<body>...).
 * @param {object} [opts]
 * @param {number} [opts.timeout=800]  ms de espera antes de imprimir (deixa imagens/estilos carregarem).
 */
export function printHTML(html, opts = {}) {
  const timeout = opts.timeout ?? 800;

  // Alguns navegadores mobile lidam melhor com a aba nova; o iframe cobre desktop
  // e a maioria dos mobiles atuais. Tentamos o iframe primeiro.
  try {
    return printViaIframe(html, timeout);
  } catch (e) {
    return printViaWindow(html, timeout);
  }
}

function printViaIframe(html, timeout) {
  // Remove um iframe anterior, se existir (evita acúmulo)
  const anterior = document.getElementById('c10-print-frame');
  if (anterior) anterior.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'c10-print-frame';
  // Oculto, mas presente no layout (display:none quebra print em alguns navegadores)
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error('iframe sem document');
  }

  doc.open();
  doc.write(html);
  doc.close();

  let done = false;
  const acionar = () => {
    if (done) return;
    done = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (_) {
      // Se falhar aqui, tenta o fallback de janela
      printViaWindow(html, timeout);
    }
    // Devolve o foco para a janela principal assim que o dialog de impressão
    // for disparado — sem isso, o foco fica preso no iframe invisível e a
    // aplicação React fica sem responder até um F5.
    // afterprint dispara ao fechar o dialog; o fallback de 500ms cobre browsers
    // que não suportam o evento mas ainda assim retornam o foco.
    const aoFecharDialog = () => {
      try { window.focus(); document.body.focus(); } catch (_) {}
    };
    const removerIframe = () => {
      try { iframe.remove(); } catch (_) {}
    };
    try {
      iframe.contentWindow.addEventListener('afterprint', () => {
        aoFecharDialog();
        setTimeout(removerIframe, 500);
      }, { once: true });
    } catch (_) {}
    // Fallback: devolve o foco após 500ms sem remover o iframe (o afterprint cuida disso)
    setTimeout(aoFecharDialog, 500);
    // Limpeza de segurança: remove o iframe após 2 minutos caso afterprint não dispare
    setTimeout(removerIframe, 120_000);
  };

  // Imprime quando o conteúdo carregar; com timeout de segurança
  iframe.onload = () => setTimeout(acionar, timeout);
  setTimeout(acionar, timeout + 400);
}

function printViaWindow(html, timeout) {
  const win = window.open('', '_blank');
  if (!win) {
    // Pop-up bloqueado e iframe indisponível — avisa o usuário
    alert('Não foi possível abrir a impressão. Verifique se o bloqueador de pop-ups está ativo e tente novamente.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); } catch (_) {} }, timeout);
}
