import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para gerenciar a autenticação e manter a sessão ativa
 * IMPORTANTE: Só faz logout quando o token realmente expira
 */
export function useAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔐 useAuth: Hook inicializado');
    
    // Verifica a cada 10 minutos se o token ainda é válido
    const checkInterval = setInterval(() => {
      console.log('🔐 useAuth: Verificando validade do token...');
      
      const token = localStorage.getItem('c10_token') || sessionStorage.getItem('c10_token');
      
      if (!token) {
        console.log('🔐 useAuth: Nenhum token encontrado, ignorando verificação');
        return;
      }

      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.log('❌ useAuth: Token com formato inválido');
          return;
        }

        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
        const payload = JSON.parse(atob(padded));

        if (!payload.exp) {
          console.log('✅ useAuth: Token sem expiração');
          return; // sem expiração = sempre válido
        }

        const expirationTime = payload.exp * 1000;
        const now = Date.now();
        const timeLeft = expirationTime - now;
        const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        // Se falta menos de 24 horas para expirar, avisa no console
        if (timeLeft < 24 * 60 * 60 * 1000 && timeLeft > 0) {
          console.log(`⚠️ useAuth: Token expira em ${daysLeft} dias e ${hoursLeft} horas`);
        } else if (timeLeft > 0) {
          console.log(`✅ useAuth: Token válido por mais ${daysLeft} dias e ${hoursLeft} horas`);
        }

        // SOMENTE FAZ LOGOUT SE REALMENTE EXPIROU
        if (timeLeft <= 0) {
          console.log('🔐 useAuth: Token EXPIROU, fazendo logout...');
          localStorage.removeItem('c10_token');
          localStorage.removeItem('c10_user');
          sessionStorage.removeItem('c10_token');
          sessionStorage.removeItem('c10_user');
          navigate('/login');
        }
      } catch (error) {
        console.error('❌ useAuth: Erro ao verificar token:', error);
        // NÃO faz logout em caso de erro, deixa o PrivateRoute decidir
      }
    }, 10 * 60 * 1000); // Verifica a cada 10 minutos

    // Cleanup
    return () => {
      console.log('🔐 useAuth: Hook desmontado');
      clearInterval(checkInterval);
    };
  }, [navigate]);
}
