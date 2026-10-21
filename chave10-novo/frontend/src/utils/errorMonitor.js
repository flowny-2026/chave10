/**
 * errorMonitor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Captura global de erros no frontend — Chave 10.
 *
 * Funcionalidades:
 *   - Captura window.onerror (erros não tratados)
 *   - Captura unhandledrejection (Promises rejeitadas)
 *   - Armazena últimos 50 erros em memória (sessionStorage)
 *   - Envia erros críticos para o backend (quando implementar Sentry/Better Stack)
 *   - Não captura informações sensíveis (tokens, senhas, dados pessoais)
 *
 * Preparado para integração com:
 *   Sentry, Better Stack, Datadog RUM, LogRocket
 *   (basta substituir o callback `sendToBackend`)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MAX_ERRORS = 50;
const STORAGE_KEY = 'c10_error_log';

// ─── Armazena erro no buffer local ───────────────────────────────────────────
function storeError(entry) {
  try {
    const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    existing.push(entry);
    if (existing.length > MAX_ERRORS) existing.splice(0, existing.length - MAX_ERRORS);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch { /* sessionStorage pode estar cheio ou desabilitado */ }
}

// ─── Sanitiza mensagem de erro — remove dados sensíveis ──────────────────────
function sanitize(msg) {
  if (!msg || typeof msg !== 'string') return msg || '';
  return msg
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/=]+/gi, '[TOKEN]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .slice(0, 500);
}

// ─── Hook para envio a backend/serviço externo (stub) ────────────────────────
// Integração com Sentry — desabilitado até configurar VITE_SENTRY_DSN.
// Para habilitar: npm install @sentry/react e definir VITE_SENTRY_DSN no .env
// import * as Sentry from '@sentry/react';
// if (import.meta.env.VITE_SENTRY_DSN) {
//   Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
// }
function sendToBackend(entry) {
  // Quando Sentry estiver habilitado:
  // if (window.Sentry) Sentry.captureException(new Error(entry.message));

  if (import.meta.env.DEV) {
    console.groupCollapsed(`[ErrorMonitor] ${entry.type}`);
    console.error(entry);
    console.groupEnd();
  }
}

// ─── Inicializa captura global ───────────────────────────────────────────────
export function initErrorMonitor() {
  // 1. Erros JavaScript não tratados
  window.onerror = (message, source, lineno, colno, error) => {
    const entry = {
      type:      'uncaught_error',
      message:   sanitize(String(message)),
      source:    source?.replace(window.location.origin, '').slice(0, 100),
      lineno,
      colno,
      stack:     error?.stack ? sanitize(error.stack.split('\n').slice(0, 5).join('\n')) : null,
      timestamp: new Date().toISOString(),
      url:       window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 100),
    };
    storeError(entry);
    sendToBackend(entry);
    // Não retorna true — deixa o erro aparecer no console
  };

  // 2. Promises rejeitadas não tratadas
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const entry = {
      type:      'unhandled_rejection',
      message:   sanitize(reason?.message || String(reason)),
      stack:     reason?.stack ? sanitize(reason.stack.split('\n').slice(0, 5).join('\n')) : null,
      timestamp: new Date().toISOString(),
      url:       window.location.pathname,
    };
    storeError(entry);
    sendToBackend(entry);
  });

  // 3. Erros de recursos (imagens, scripts que falharam ao carregar)
  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      const entry = {
        type:      'resource_error',
        tag:       event.target.tagName,
        src:       event.target.src || event.target.href || '',
        timestamp: new Date().toISOString(),
        url:       window.location.pathname,
      };
      storeError(entry);
    }
  }, true); // useCapture para pegar erros de recursos

  // 4. Captura erros de rede (fetch) via monkey-patch do fetch
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      if (response.status >= 500) {
        const entry = {
          type:      'api_error',
          status:    response.status,
          url:       (typeof args[0] === 'string' ? args[0] : args[0]?.url || '').slice(0, 150),
          timestamp: new Date().toISOString(),
        };
        storeError(entry);
      }
      return response;
    } catch (err) {
      const entry = {
        type:      'network_error',
        message:   sanitize(err.message),
        url:       (typeof args[0] === 'string' ? args[0] : '').slice(0, 150),
        timestamp: new Date().toISOString(),
      };
      storeError(entry);
      throw err; // re-throw para não quebrar o fluxo
    }
  };
}

// ─── API pública ──────────────────────────────────────────────────────────────
export function getErrorLog() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function clearErrorLog() {
  sessionStorage.removeItem(STORAGE_KEY);
}
