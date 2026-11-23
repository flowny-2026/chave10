import { useState, useEffect } from 'react';
import { offlineManager } from '../utils/offlineManager';

/**
 * Indicador visual de status da conexão e sincronização
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Atualiza contadores iniciais
    setPendingCount(offlineManager.getPendingCount());

    // Listener para eventos do offline manager
    const unsubscribe = offlineManager.addListener((event) => {
      switch (event.type) {
        case 'offline':
          setIsOnline(false);
          break;
        
        case 'sync_start':
          setIsSyncing(true);
          setIsOnline(true);
          break;
        
        case 'sync_complete':
          setIsSyncing(false);
          setPendingCount(event.remaining);
          setLastSync({
            timestamp: new Date(),
            success: event.success,
            failed: event.failed,
          });
          
          // Auto-fechar após 3 segundos se tudo sincronizado
          if (event.remaining === 0 && showDetails) {
            setTimeout(() => setShowDetails(false), 3000);
          }
          break;
        
        case 'queue_updated':
          setPendingCount(event.queue.filter(op => op.status === 'pending').length);
          break;
        
        case 'draft_saved':
          // Feedback visual rápido quando salva rascunho
          console.log('💾 Rascunho salvo em modo offline');
          break;
      }
    });

    // Listeners nativos
    const handleOnline = () => {
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showDetails]);

  // Não mostra nada se estiver online e sem pendências
  if (isOnline && pendingCount === 0 && !isSyncing && !showDetails) {
    return null;
  }

  const handleClick = () => {
    if (pendingCount > 0 || lastSync) {
      setShowDetails(!showDetails);
    }
  };

  const handleSync = () => {
    offlineManager.syncAll();
  };

  const handleRetry = () => {
    offlineManager.retryFailed();
  };

  return (
    <>
      {/* Indicador compacto */}
      <div
        onClick={handleClick}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: isOnline 
            ? (isSyncing ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #10b981, #059669)')
            : 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: '#fff',
          borderRadius: 99,
          padding: '10px 18px',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: pendingCount > 0 ? 'pointer' : 'default',
          boxShadow: '0 4px 20px rgba(0,0,0,.2)',
          zIndex: 999,
          transition: 'all .2s',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (pendingCount > 0 || isSyncing) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.25)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.2)';
        }}
      >
        {/* Ícone animado */}
        {isSyncing ? (
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            style={{
              animation: 'spin 1s linear infinite',
            }}
          >
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        ) : isOnline ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <circle cx="12" cy="20" r="1"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <circle cx="12" cy="20" r="1"/>
          </svg>
        )}

        {/* Texto */}
        <span>
          {isSyncing 
            ? 'Sincronizando...'
            : isOnline
              ? pendingCount > 0 
                ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`
                : 'Online'
              : 'Offline'
          }
        </span>

        {/* Badge de contagem */}
        {pendingCount > 0 && !isSyncing && (
          <div style={{
            background: 'rgba(255,255,255,.25)',
            borderRadius: 99,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {pendingCount}
          </div>
        )}
      </div>

      {/* Painel de detalhes */}
      {showDetails && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            background: '#1a1d23',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 12,
            padding: 16,
            minWidth: 280,
            maxWidth: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,.3)',
            zIndex: 998,
            color: '#e6edf3',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: '1px solid rgba(255,255,255,.1)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Status da Sincronização
            </div>
            <button
              onClick={() => setShowDetails(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,.5)',
                cursor: 'pointer',
                padding: 4,
                fontSize: 16,
              }}
            >
              ×
            </button>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: isOnline ? 'rgba(16, 185, 129, .1)' : 'rgba(239, 68, 68, .1)',
              borderRadius: 8,
              marginBottom: 8,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isOnline ? '#10b981' : '#ef4444',
              }} />
              <span style={{ fontSize: 13 }}>
                {isOnline ? 'Conectado' : 'Sem conexão'}
              </span>
            </div>

            {pendingCount > 0 && (
              <div style={{
                fontSize: 13,
                color: 'rgba(255,255,255,.7)',
                marginBottom: 8,
              }}>
                📋 {pendingCount} operação{pendingCount > 1 ? 'ões' : ''} aguardando sincronização
              </div>
            )}

            {lastSync && (
              <div style={{
                fontSize: 12,
                color: 'rgba(255,255,255,.5)',
              }}>
                Última sincronização: {lastSync.timestamp.toLocaleTimeString('pt-BR')}
                <br />
                ✅ {lastSync.success} sucesso · ❌ {lastSync.failed} falhas
              </div>
            )}
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8 }}>
            {pendingCount > 0 && isOnline && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                style={{
                  flex: 1,
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  opacity: isSyncing ? 0.6 : 1,
                }}
              >
                {isSyncing ? 'Sincronizando...' : '🔄 Sincronizar agora'}
              </button>
            )}
            
            {lastSync && lastSync.failed > 0 && (
              <button
                onClick={handleRetry}
                disabled={isSyncing}
                style={{
                  flex: 1,
                  background: 'rgba(239, 68, 68, .2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, .3)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  opacity: isSyncing ? 0.6 : 1,
                }}
              >
                🔁 Retentar
              </button>
            )}
          </div>
        </div>
      )}

      {/* CSS para animação */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
