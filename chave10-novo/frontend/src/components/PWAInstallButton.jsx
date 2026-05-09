import { useState, useEffect } from 'react';

/**
 * Botão flutuante para instalar o app como PWA.
 * - Aparece somente após login (quando o componente é montado dentro do Layout)
 * - Desaparece permanentemente após a instalação
 * - Pode ser dispensado temporariamente (reaparece na próxima sessão)
 */
export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Se o usuário já instalou, não mostra mais
    const jaInstalou = localStorage.getItem('c10_pwa_installed');
    if (jaInstalou) return;

    // Verifica se já está rodando como PWA instalado
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      localStorage.setItem('c10_pwa_installed', '1');
      return;
    }

    function handleBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detecta quando o app foi instalado via evento nativo
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('c10_pwa_installed', '1');
      setVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('c10_pwa_installed', '1');
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Botão flutuante */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          animation: 'pwaSlideIn .35s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {/* Card de convite */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,.18)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: 300,
            border: '1px solid rgba(30,64,175,.1)',
          }}
        >
          {/* Ícone do app */}
          <img
            src="/logo-icon.png"
            alt="Chave 10"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              flexShrink: 0,
              objectFit: 'contain',
              background: '#1e40af',
              padding: 4,
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#111827',
                marginBottom: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Instalar Chave 10
            </div>
            <div style={{ fontSize: 11.5, color: '#6B7280', lineHeight: 1.4 }}>
              Acesse mais rápido direto da tela inicial
            </div>
          </div>

          {/* Botão fechar */}
          <button
            onClick={handleDismiss}
            title="Fechar"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: 4,
              flexShrink: 0,
              lineHeight: 1,
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {/* Botão principal de instalação */}
        <button
          onClick={handleInstall}
          disabled={installing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: installing
              ? '#93c5fd'
              : 'linear-gradient(135deg, #1e40af, #2563eb)',
            color: '#fff',
            border: 'none',
            borderRadius: 50,
            padding: '12px 22px',
            fontSize: 14,
            fontWeight: 700,
            cursor: installing ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(37,99,235,.45)',
            transition: 'transform .15s, box-shadow .15s',
            whiteSpace: 'nowrap',
          }}
          onMouseOver={e => {
            if (!installing) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,99,235,.55)';
            }
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,.45)';
          }}
        >
          {/* Ícone de download */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {installing ? 'Instalando...' : 'Instalar app'}
        </button>
      </div>

      <style>{`
        @keyframes pwaSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
      `}</style>
    </>
  );
}
