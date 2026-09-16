import { useState, useEffect } from 'react';
import '../styles/PWAInstallBanner.css';

// Retorna true se o app estiver rodando como PWA instalado
function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://') ||
    localStorage.getItem('c10_pwa_installed') === '1'
  );
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Nunca mostra dentro do app logado
    if (window.location.pathname.startsWith('/app')) return;

    // Nunca mostra se já está instalado
    if (isInstalled()) return;

    // Nunca mostra se o usuário já dispensou nesta sessão
    if (sessionStorage.getItem('pwa-banner-dismissed')) return;

    const checkDesktop = () => {
      const desktop = window.innerWidth > 768 &&
        !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      setIsDesktop(desktop);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Escuta instalação via evento nativo
    const handleAppInstalled = () => {
      localStorage.setItem('c10_pwa_installed', '1');
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('resize', checkDesktop);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      const isEdge   = /Edg/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent) && !isEdge;
      let instructions = '';
      if (isEdge) {
        instructions = '📌 COMO INSTALAR NO EDGE:\n\n1. Clique nos 3 pontinhos (⋮) no canto superior direito\n2. Clique em "Instalar este site como app"\n3. Clique em "Instalar"\n\n✨ O ícone aparecerá na área de trabalho.';
      } else if (isChrome) {
        instructions = '📌 COMO INSTALAR NO CHROME:\n\n1. Clique nos 3 pontinhos (⋮) no canto superior direito\n2. Clique em "Instalar Chave 10..." ou "Instalar página como app"\n3. Clique em "Instalar"\n\n✨ O ícone aparecerá na área de trabalho.';
      } else {
        instructions = '📌 Para instalar, use Google Chrome ou Microsoft Edge e acesse: https://chave10.vercel.app';
      }
      alert(instructions);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('c10_pwa_installed', '1');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  // Não renderiza se já instalado ou dispensado
  if (isInstalled()) return null;
  if (sessionStorage.getItem('pwa-banner-dismissed')) return null;

  // Desktop sem prompt ainda — mostra banner de instrução manual
  if (isDesktop && !showBanner) {
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
          <button onClick={handleInstallClick} className="pwa-install-btn">Instalar</button>
          <button onClick={handleDismiss} className="pwa-dismiss-btn">×</button>
        </div>
      </div>
    );
  }

  // Mobile ou desktop com prompt disponível
  if (!showBanner) return null;

  return (
    <div className="pwa-install-banner">
      <div className="pwa-banner-content">
        <div className="pwa-banner-icon">📱</div>
        <div className="pwa-banner-text">
          <strong>Instale o Chave 10</strong>
          <span>Acesso rápido e funciona offline</span>
        </div>
        <button onClick={handleInstallClick} className="pwa-install-btn">Instalar</button>
        <button onClick={handleDismiss} className="pwa-dismiss-btn">×</button>
      </div>
    </div>
  );
}
