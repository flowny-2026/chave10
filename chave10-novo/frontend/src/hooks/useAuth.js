import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFromStorage } from '../api';

/**
 * Hook para monitorar expiração do token em background.
 * Verifica a cada 5 minutos e faz logout automático ao expirar.
 */
export function useAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    function checkToken() {
      const token = getFromStorage('c10_token');
      if (!token) return;

      try {
        const parts = token.split('.');
        if (parts.length !== 3) return;

        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
        const payload = JSON.parse(atob(padded));

        if (!payload.exp) return; // sem expiração = sempre válido

        if (payload.exp * 1000 <= Date.now()) {
          // Token expirou — limpa sessão e redireciona
          ['c10_token', 'c10_user', 'c10_token_temp'].forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
          });
          navigate('/login');
        }
      } catch {
        // Token malformado — não faz logout, deixa o PrivateRoute decidir
      }
    }

    // Verifica imediatamente ao montar e a cada 5 minutos
    checkToken();
    const interval = setInterval(checkToken, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate]);
}
