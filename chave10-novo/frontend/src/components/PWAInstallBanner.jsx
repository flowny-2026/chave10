import { useState, useEffect } from 'react';
import '../styles/PWAInstallBanner.css';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
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
      // Se o prompt não está disponível, mostra instruções manuais atualizadas
      alert(
        '📌 COMO INSTALAR O CHAVE 10:\n\n' +
        '1. Clique nos 3 pontinhos (⋮) no canto superior direito\n\n' +
        '2. Vá em "Mais ferramentas"\n\n' +
        '3. Clique em uma das opções:\n' +
        '   • "Instalar página como app..." OU\n' +
        '   • "Criar atalho..."\n\n' +
        '4. Se aparecer "Criar atalho", marque:\n' +
        '   ✅ "Abrir como janela"\n\n' +
        '5. Clique em "Criar" ou "Instalar"\n\n' +
        '✨ Pronto! O ícone aparecerá na área de trabalho.'
      );
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
    return (
      <div className="pwa-install-banner desktop">
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon">💻</div>
          <div className="pwa-banner-text">
            <strong>Instale o Chave 10 no seu PC</strong>
            <span>Acesso rápido sem abrir o navegador</span>
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
