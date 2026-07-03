import { useState, useEffect } from 'react';
import '../styles/PWAInstallBanner.css';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // NÃO mostra o banner se estiver logado (área /app)
    if (window.location.pathname.startsWith('/app')) {
      console.log('[PWA] Usuário logado - banner desabilitado');
      return;
    }

    // Detecta se é desktop
    const checkDesktop = () => {
      const isDesktopDevice = window.innerWidth > 768 && 
        !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      setIsDesktop(isDesktopDevice);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    // Captura evento de instalação
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
      console.log('[PWA] Prompt de instalação capturado');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Verifica se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA] App já está instalado');
      setShowBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('resize', checkDesktop);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Detecta o navegador
      const isEdge = /Edg/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent) && !isEdge;
      
      let browserName = 'navegador';
      let instructions = '';
      
      if (isEdge) {
        browserName = 'Microsoft Edge';
        instructions = 
          '📌 COMO INSTALAR NO EDGE:\n\n' +
          '1. Clique nos 3 pontinhos (⋮) no canto superior direito\n\n' +
          '2. Procure a opção:\n' +
          '   📱 "Instalar este site como app"\n\n' +
          '3. Clique nela\n\n' +
          '4. Digite o nome: "Chave 10"\n\n' +
          '5. Clique em "Instalar"\n\n' +
          '✨ Pronto! O ícone aparecerá na área de trabalho e menu Iniciar.';
      } else if (isChrome) {
        browserName = 'Google Chrome';
        instructions = 
          '📌 COMO INSTALAR NO CHROME:\n\n' +
          '1. Clique nos 3 pontinhos (⋮) no canto superior direito\n\n' +
          '2. Vá em "Mais ferramentas"\n\n' +
          '3. Clique em uma das opções:\n' +
          '   • "Instalar página como app..." OU\n' +
          '   • "Criar atalho..."\n\n' +
          '4. Se aparecer "Criar atalho", marque:\n' +
          '   ✅ "Abrir como janela"\n\n' +
          '5. Clique em "Criar" ou "Instalar"\n\n' +
          '✨ Pronto! O ícone aparecerá na área de trabalho.';
      } else {
        // Firefox ou outro navegador
        instructions = 
          '📌 COMO INSTALAR:\n\n' +
          'Seu navegador não suporta instalação de PWA.\n\n' +
          'Para melhor experiência, use:\n' +
          '• Google Chrome\n' +
          '• Microsoft Edge\n' +
          '• Brave\n\n' +
          'Depois acesse: https://chave10.vercel.app';
      }
      
      alert(instructions);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Escolha do usuário: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('[PWA] Instalação aceita');
    }
    
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Salva que o usuário dispensou (não mostrar novamente nesta sessão)
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  // Não mostra se usuário já dispensou nesta sessão
  if (sessionStorage.getItem('pwa-banner-dismissed')) {
    return null;
  }

  // Sempre mostra banner no desktop (mesmo sem deferredPrompt)
  if (!isDesktop) {
    // No mobile, só mostra se tiver o prompt
    if (!showBanner || !deferredPrompt) return null;
  }

  // No desktop, mostra sempre (com ou sem prompt)
  if (isDesktop && !showBanner) {
    // Detecta navegador para o texto
    const isEdge = /Edg/i.test(navigator.userAgent);
    const browserName = isEdge ? 'Edge' : 'Chrome';
    
    return (
      <div className="pwa-install-banner desktop">
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon">💻</div>
          <div className="pwa-banner-text">
            <strong>Instale o Chave 10 no seu PC</strong>
            <span>Usando {browserName} • Acesso rápido sem navegador</span>
          </div>
          <button onClick={handleInstallClick} className="pwa-install-btn">
            Instalar
          </button>
          <button onClick={handleDismiss} className="pwa-dismiss-btn">×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-install-banner">
      <div className="pwa-banner-content">
        <div className="pwa-banner-icon">📱</div>
        <div className="pwa-banner-text">
          <strong>Instale o Chave 10</strong>
          <span>Acesso rápido e funciona offline</span>
        </div>
        <button onClick={handleInstallClick} className="pwa-install-btn">
          Instalar
        </button>
        <button onClick={handleDismiss} className="pwa-dismiss-btn">×</button>
      </div>
    </div>
  );
}
