import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFromStorage, api } from '../api';

/**
 * Hook de gestão de sessão — CONSERVADOR:
 *   - Nunca apaga o token por decodificação local (o relógio do dispositivo pode estar errado,
 *     o token pode ter acabado de ser renovado, etc.)
 *   - Tenta sempre o refresh primeiro; só faz logout se receber 401 explícito do servidor
 *   - Verifica ao montar e a cada 20 minutos
 */

const VINTE_MIN_MS = 20 * 60 * 1000;
const SETE_DIAS_MS =  7 * 24 * 60 * 60 * 1000;

function decodeExp(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const p = JSON.parse(atob(padded));
    return p.exp ? p.exp * 1000 : null;
  } catch { return null; }
}

export function useAuth() {
  const navigate = useNavigate();
  const refreshing = useRef(false); // evita disparos simultâneos

  useEffect(() => {
    async function checkToken() {
      if (refreshing.current) return;
      const token = getFromStorage('c10_token');
      if (!token) return;

      const expMs = decodeExp(token);
      const agora = Date.now();

      // Token ainda tem mais de 7 dias: nada a fazer
      if (expMs !== null && expMs - agora > SETE_DIAS_MS) return;

      // Token perto de expirar ou já expirado → tenta refresh silencioso
      refreshing.current = true;
      try {
        const result = await api.auth.refresh();
        if (result?.token) {
          localStorage.setItem('c10_token', result.token);
        }
      } catch (err) {
        // Só faz logout se o servidor explicitamente recusou (401/403)
        // Erros de rede (offline, timeout, 5xx) NÃO apagam o token
        const status = err?.status || err?.statusCode;
        if (status === 401 || status === 403) {
          localStorage.removeItem('c10_token');
          localStorage.removeItem('c10_user');
          navigate('/login');
        }
        // qualquer outro erro: silencioso, tenta de novo no próximo ciclo
      } finally {
        refreshing.current = false;
      }
    }

    checkToken();
    const interval = setInterval(checkToken, VINTE_MIN_MS);
    return () => clearInterval(interval);
  }, [navigate]);
}
