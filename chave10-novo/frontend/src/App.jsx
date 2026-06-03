import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from './components/Layout';

// Páginas públicas — carregadas imediatamente
import Landing from './pages/Landing';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import EsqueciSenha from './pages/EsqueciSenha';
import AdminLogin from './pages/AdminLogin';
import Bloqueado from './pages/Bloqueado';

// Páginas do app — carregadas sob demanda (lazy)
const AdminDashboard   = lazy(() => import('./pages/admin/Dashboard'));
const AdminOficinas    = lazy(() => import('./pages/admin/Oficinas'));
const AdminPagamentos  = lazy(() => import('./pages/admin/Pagamentos'));
const AdminTrocarSenha = lazy(() => import('./pages/admin/TrocarSenha'));
const AppDashboard     = lazy(() => import('./pages/app/Dashboard'));
const AppClientes      = lazy(() => import('./pages/app/Clientes'));
const AppVeiculos      = lazy(() => import('./pages/app/Veiculos'));
const AppOS            = lazy(() => import('./pages/app/OS'));
const AppOrcamentos    = lazy(() => import('./pages/app/Orcamentos'));
const AppAgenda        = lazy(() => import('./pages/app/Agenda'));
const AppMensagens     = lazy(() => import('./pages/app/Mensagens'));
const AppFinanceiro    = lazy(() => import('./pages/app/Financeiro'));
const AppRelatorios    = lazy(() => import('./pages/app/Relatorios'));
const AppLembretes     = lazy(() => import('./pages/app/Lembretes'));
const AppEstoque       = lazy(() => import('./pages/app/Estoque'));
const AppConfiguracoes = lazy(() => import('./pages/app/Configuracoes'));
const AppPlanos        = lazy(() => import('./pages/app/Planos'));

// Fallback simples enquanto carrega a página
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function getUser() {
  try { 
    const user = localStorage.getItem('c10_user') || sessionStorage.getItem('c10_user');
    if (user) {
      console.log('✅ Usuário recuperado do storage');
      return JSON.parse(user);
    }
    console.log('⚠️ Nenhum usuário encontrado no storage');
    return null;
  } catch (error) { 
    console.error('❌ Erro ao recuperar usuário:', error);
    return null; 
  }
}

function getToken() {
  const token = localStorage.getItem('c10_token') || sessionStorage.getItem('c10_token') || null;
  if (token) {
    console.log('✅ Token recuperado do storage');
  } else {
    console.log('⚠️ Nenhum token encontrado no storage');
  }
  return token;
}

// Verifica se o token JWT ainda é válido (sem chamar o servidor)
function isTokenValid() {
  const token = getToken();
  if (!token) {
    console.log('🔐 Validação: SEM TOKEN');
    return false;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('❌ Validação: Token com formato inválido');
      return false;
    }
    
    // Base64url -> base64 padrão
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    
    console.log('🔍 Payload do token:', payload);
    
    // Se não tem expiração, considera válido
    if (!payload.exp) {
      console.log('✅ Validação: Token SEM EXPIRAÇÃO (sempre válido)');
      return true;
    }
    
    // Verifica se ainda não expirou (exp está em segundos, Date.now() em milissegundos)
    const expirationTime = payload.exp * 1000;
    const now = Date.now();
    const isValid = expirationTime > now;
    
    if (isValid) {
      const timeLeft = expirationTime - now;
      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      console.log(`✅ Validação: Token VÁLIDO por mais ${daysLeft} dias e ${hoursLeft} horas`);
    } else {
      const expirado = new Date(expirationTime).toLocaleString();
      console.log(`❌ Validação: Token EXPIRADO em ${expirado}`);
    }
    
    return isValid;
  } catch (error) {
    // Em caso de erro no parse, considera inválido (segurança)
    console.error('❌ Validação: Erro ao processar token:', error);
    return false;
  }
}

function PrivateRoute({ children, adminOnly = false, noFuncionario = false }) {
  console.log('🛡️ PrivateRoute: Verificando autenticação...');
  
  const user = getUser();
  const tokenOk = isTokenValid();

  console.log('🛡️ PrivateRoute: user =', user);
  console.log('🛡️ PrivateRoute: tokenOk =', tokenOk);

  // Sem token válido → redireciona para login
  if (!tokenOk) {
    const token = getToken();
    
    // Só limpa se realmente tinha um token mas ele expirou
    if (token) {
      console.log('🔐 Token inválido/expirado encontrado, limpando sessão...');
      localStorage.removeItem('c10_token');
      localStorage.removeItem('c10_user');
      sessionStorage.removeItem('c10_token');
      sessionStorage.removeItem('c10_user');
    } else {
      console.log('🔐 Nenhum token encontrado');
    }
    
    console.log('🔐 Redirecionando para login...');
    // Redireciona para o login apropriado
    if (adminOnly) return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login" replace />;
  }

  // Token válido mas sem dados do usuário em cache → problema
  if (!user) {
    console.log('⚠️ Token válido mas sem dados do usuário!');
    console.log('🔐 Redirecionando para login...');
    if (adminOnly) return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login" replace />;
  }

  console.log('✅ Autenticação OK, perfil:', user.perfil);

  // Validações de perfil
  if (adminOnly && user.perfil !== 'master_admin') {
    console.log('⚠️ Tentativa de acesso admin por usuário não-admin');
    return <Navigate to="/app/dashboard" replace />;
  }
  
  if (noFuncionario && user.perfil === 'funcionario') {
    console.log('⚠️ Tentativa de acesso restrito por funcionário');
    return <Navigate to="/app/dashboard" replace />;
  }
  
  return children;
}

function AppRedirect() {
  const user = getUser();
  if (!user || !isTokenValid()) return <Navigate to="/login" replace />;
  if (user.perfil === 'master_admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

export default function App() {
  // Log de inicialização para debug
  useEffect(() => {
    console.log('==================================================');
    console.log('🚀 APP INICIALIZADO');
    console.log('==================================================');
    console.log('📍 URL atual:', window.location.href);
    
    const token = localStorage.getItem('c10_token');
    const user = localStorage.getItem('c10_user');
    
    console.log('🔍 Estado do LocalStorage:');
    console.log('  - Token:', token ? '✅ EXISTE' : '❌ NÃO EXISTE');
    console.log('  - User:', user ? '✅ EXISTE' : '❌ NÃO EXISTE');
    
    if (token && user) {
      console.log('👤 Dados do usuário:', JSON.parse(user));
      
      // Valida o token
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
          const payload = JSON.parse(atob(padded));
          
          if (payload.exp) {
            const expirationTime = payload.exp * 1000;
            const now = Date.now();
            const isValid = expirationTime > now;
            
            if (isValid) {
              const daysLeft = Math.floor((expirationTime - now) / (1000 * 60 * 60 * 24));
              console.log(`✅ Token VÁLIDO por mais ${daysLeft} dias`);
              console.log('✅ SESSÃO RESTAURADA COM SUCESSO');
            } else {
              console.log('❌ Token EXPIRADO');
            }
          }
        }
      } catch (e) {
        console.error('❌ Erro ao validar token:', e);
      }
    } else {
      console.log('❌ Não há sessão salva');
    }
    
    console.log('==================================================');
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app-redirect" element={<AppRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/bloqueado" element={<Bloqueado />} />

          <Route path="/admin" element={<PrivateRoute adminOnly><Layout area="admin" /></PrivateRoute>}>
            <Route path="dashboard"    element={<AdminDashboard />} />
            <Route path="oficinas"     element={<AdminOficinas />} />
            <Route path="pagamentos"   element={<AdminPagamentos />} />
            <Route path="trocar-senha" element={<AdminTrocarSenha />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="/app" element={<PrivateRoute><Layout area="app" /></PrivateRoute>}>
            <Route path="dashboard"     element={<AppDashboard />} />
            <Route path="clientes"      element={<AppClientes />} />
            <Route path="veiculos"      element={<AppVeiculos />} />
            <Route path="os"            element={<AppOS />} />
            <Route path="orcamentos"    element={<AppOrcamentos />} />
            <Route path="agenda"        element={<AppAgenda />} />
            <Route path="mensagens"     element={<AppMensagens />} />
            <Route path="financeiro"    element={<PrivateRoute noFuncionario><AppFinanceiro /></PrivateRoute>} />
            <Route path="relatorios"    element={<PrivateRoute noFuncionario><AppRelatorios /></PrivateRoute>} />
            <Route path="lembretes"     element={<AppLembretes />} />
            <Route path="estoque"       element={<AppEstoque />} />
            <Route path="configuracoes" element={<PrivateRoute noFuncionario><AppConfiguracoes /></PrivateRoute>} />
            <Route path="planos"        element={<AppPlanos />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
