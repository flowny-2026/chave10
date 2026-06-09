import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './utils/storageMonitor'; // MONITOR DE STORAGE - DEVE SER PRIMEIRO
import './index.css';
import './styles/mobile.css';
import App from './App';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Registra o Service Worker para habilitar PWA e notificações
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('✅ SW registrado:', reg.scope);

        // Detecta quando há uma nova versão disponível
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner();
            }
          });
        });
      })
      .catch(err => console.warn('⚠️ SW falhou:', err));

    // Listener para mensagens do Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[Main] Mensagem do SW:', event.data);
      
      // Handler para navegação via notificação
      if (event.data && event.data.type === 'NAVIGATE') {
        window.location.href = event.data.url;
      }
      
      // Handler para sincronização offline
      if (event.data && event.data.type === 'SYNC_OFFLINE_QUEUE') {
        // O offlineManager vai lidar com isso
        console.log('[Main] Sincronização solicitada pelo SW');
      }
    });
  });
}

function showUpdateBanner() {
  if (document.getElementById('sw-update-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.innerHTML = `
    <div style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;background:#1E3A5F;color:#fff;padding:14px 24px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.25);display:flex;align-items:center;gap:14px;font-family:Inter,sans-serif;font-size:14px;animation:slideUp .3s ease">
      <span style="font-size:20px">🔄</span>
      <span>Nova versão disponível!</span>
      <button onclick="window.location.reload()" style="background:#F97316;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">Atualizar</button>
      <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.5);font-size:18px;cursor:pointer;padding:0 4px">×</button>
    </div>
  `;
  document.body.appendChild(banner);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
