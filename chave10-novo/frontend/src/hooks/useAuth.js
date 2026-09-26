import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFromStorage, api } from '../api';

/**
 * Hook de gestão de sessão:
 *   1. Verifica a cada 5 min se o token ainda é válido; faz logout se expirou.
 *   2. Silent refresh: ao iniciar (e a cada verificação), se o token tiver
 *      menos de 7 dias de vida restante, renova silenciosamente sem pedir login.
 *      Isso mantém a sessão indefinidamente enquanto o usuário usar o app.
 */

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

function decodeExp(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    return payload.exp ? payload.exp * 1000 : null; // ms
  } catch {
    return null;
  }
}

export function useAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    async function checkToken() {
      const token = getFromStorage('c10_token');
      if (!token) return;

      const expMs = decodeExp(token);

      // Token sem expiração — não faz nada
      if (expMs === null) return;

      const agora = Date.now();

      // Token expirado → logout
      if (expMs <= agora) {
        ['c10_token', 'c10_user', 'c10_token_temp'].forEach(k => {
          localStorage.removeItem(k);
        });
        navigate('/login');
        return;
      }

      // Token expira em menos de 7 dias → renova silenciosamente
      if (expMs - agora < SETE_DIAS_MS) {
        try {
          const result = await api.auth.refresh();
          if (result?.token) {
            localStorage.setItem('c10_token', result.token);
          }
        } catch {
          // Falha no refresh é silenciosa — o token atual ainda é válido
        }
      }
    }

    // Verifica imediatamente ao montar e a cada 5 minutos
    checkToken();
    const interval = setInterval(checkToken, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate]);
}
