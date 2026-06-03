import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para gerenciar a autenticação e manter a sessão ativa
 */
export function useAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    // Verifica a cada 5 minutos se o token ainda é válido
    const checkInterval = setInterval(() => {
      const token = localStorage.getItem('c10_token') || sessionStorage.getItem('c10_token');
      
      if (!token) {
        console.log('🔐 Token não encontrado');
        return;
      }

      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.log('❌ Token inválido');
          return;
        }

        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
        const payload = JSON.parse(atob(padded));

        if (!payload.exp) return; // sem expiração

        const expirationTime = payload.exp * 1000;
        const now = Date.now();
        const timeLeft = expirationTime - now;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

        // Se falta menos de 24 horas para expirar, avisa no console
        if (hoursLeft < 24 && hoursLeft > 0) {
          console.log(`⚠️ Token expira em ${hoursLeft} horas`);
        }

        // Se expirou, limpa e redireciona
        if (timeLeft <= 0) {
          console.log('🔐 Token expirou, fazendo logout...');
          localStorage.removeItem('c10_token');
          localStorage.removeItem('c10_user');
          sessionStorage.removeItem('c10_token');
          sessionStorage.removeItem('c10_user');
          navigate('/login');
        }
      } catch (error) {
        console.error('❌ Erro ao verificar token:', error);
      }
    }, 5 * 60 * 1000); // Verifica a cada 5 minutos

    // Cleanup
    return () => clearInterval(checkInterval);
  }, [navigate]);
}
