import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout';
import { getFromStorage, api } from './api';
import PWAInstallBanner from './components/PWAInstallBanner';

// Páginas públicas — carregadas imediatamente
import Landing from './pages/Landing';
import Login from './pages/Login';
import Diag from './pages/Diag';
import Cadastro from './pages/Cadastro';
import EsqueciSenha from './pages/EsqueciSenha';
import AdminLogin from './pages/AdminLogin';
import Bloqueado from './pages/Bloqueado';
import ApprovalPage from './pages/ApprovalPage';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade';
import TermosUso from './pages/TermosUso';

// Páginas do app — carregadas sob demanda (lazy)
const AdminDashboard      = lazy(() => import('./pages/admin/Dashboard'));
const AdminOficinas       = lazy(() => import('./pages/admin/Oficinas'));
const AdminPagamentos     = lazy(() => import('./pages/admin/Pagamentos'));
const AdminTrocarSenha    = lazy(() => import('./pages/admin/TrocarSenha'));
const AdminAuditLogs      = lazy(() => import('./pages/admin/AuditLogs'));
const AdminSecurityAlerts = lazy(() => import('./pages/admin/SecurityAlerts'));
const AppDashboard     = lazy(() => import('./pages/app/DashboardV2'));
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
const AppNotificacoes  = lazy(() => import('./pages/app/Notificacoes'));
const AppDashboardV2   = lazy(() => import('./pages/app/DashboardV2'));
const AppMecanicos       = lazy(() => import('./pages/app/Mecanicos'));
const AppMecanicoComissoes = lazy(() => import('./pages/app/MecanicoComissoes'));
const AppMeuPerfil     = lazy(() => import('./pages/app/MeuPerfil'));
const AppPosVenda      = lazy(() => import('./pages/app/PosVenda'));

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
    const user = getFromStorage('c10_user');
    return user ? JSON.parse(user) : null;
  } catch { return null; }
}

function getToken() {
  return getFromStorage('c10_token');
}

// Limpa toda a sessão de forma segura
function clearSession() {
  ['c10_token', 'c10_user', 'c10_token_temp'].forEach(k => {
    localStorage.removeItem(k);
  });
}

// Decodifica exp do JWT localmente (ms) sem verificar assinatura
function getTokenExp(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    return payload.exp ? payload.exp * 1000 : Infinity;
  } catch { return 0; }
}

// Verifica se o token JWT ainda é válido (decodificação local — rápido, sem rede)
function isTokenValid() {
  const token = getToken();
  if (!token) return false;
  const exp = getTokenExp(token);
  if (exp === 0) return false;
  return exp > Date.now();
}

/**
 * PrivateRoute — Proteção de rotas com restauração de sessão.
 *
 * Lógica de decisão:
 * 1. Token válido + user no localStorage → renderiza imediatamente (sem rede)
 * 2. Token válido + user ausente → busca /auth/me, renderiza após
 * 3. Token expirado → /auth/refresh → /auth/me → renderiza
 * 4. Sem token → login
 * 5. Erro 401/403 → limpa sessão → login
 * 6. Erro de rede → tenta usar cache, renderiza se possível
 */
function PrivateRoute({ children, adminOnly = false, noFuncionario = false, noMecanico = false }) {
  // Leitura síncrona inicial — evita flash de tela de login quando há sessão válida
  const tokenInit  = getToken();
  const userInit   = getUser();
  const validInit  = tokenInit ? isTokenValid() : false;
  // Se token válido e user no cache: estado inicial já autenticado (sem loader)
  const startReady = validInit && !!userInit;

  const [checking, setChecking] = useState(!startReady);
  const [user, setUser]         = useState(startReady ? userInit : null);

  useEffect(() => {
    // Se já está pronto desde o início, não precisa fazer nada
    if (startReady) return;

    async function check() {
      const token = getToken();

      // Sem token → login
      if (!token) { setChecking(false); return; }

      // Token válido → garante que temos o user
      if (isTokenValid()) {
        const cached = getUser();
        if (cached) {
          setUser(cached);
          setChecking(false);
          return;
        }
        // Token válido mas user ausente → busca /auth/me
        try {
          const userData = await api.auth.me();
          if (userData) {
            localStorage.setItem('c10_user', JSON.stringify(userData));
            setUser(userData);
          }
        } catch {
          // Erro de rede: user fica null → vai para login
        }
        setChecking(false);
        return;
      }

      // Token expirado → tenta refresh
      try {
        const result = await api.auth.refresh();
        if (result?.token) {
          localStorage.setItem('c10_token', result.token);
        }
        const userData = await api.auth.me();
        if (userData) {
          localStorage.setItem('c10_user', JSON.stringify(userData));
          setUser(userData);
        }
      } catch (err) {
        const status = err?.status;
        if (status === 401 || status === 403) {
          clearSession();
        } else {
          const cached = getUser();
          if (cached) setUser(cached);
        }
      }
      setChecking(false);
    }

    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) return <PageLoader />;

  if (!user) {
    if (adminOnly) return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && user.perfil !== 'master_admin') return <Navigate to="/app/dashboard" replace />;
  if (noFuncionario && (user.perfil === 'funcionario' || user.perfil === 'mecanico')) return <Navigate to="/app/dashboard" replace />;
  if (noMecanico && user.perfil === 'mecanico') return <Navigate to="/app/dashboard" replace />;

  return children;
}

// SessionCleaner já não é necessário — PrivateRoute cuida da renovação/limpeza.
// Mantido como stub para não quebrar o JSX abaixo.
function SessionCleaner() { return null; }

function AppRedirect() {
  const tokenInit = getToken();
  const userInit  = getUser();
  const validInit = tokenInit ? isTokenValid() : false;

  // Se já tem sessão válida, redireciona imediatamente sem esperar rede
  if (validInit && userInit) {
    if (userInit.perfil === 'master_admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/app/dashboard" replace />;
  }

  // Sem token → login imediato
  if (!tokenInit) return <Navigate to="/login" replace />;

  // Token expirado → precisa tentar refresh (assíncrono)
  return <AppRedirectAsync />;
}

function AppRedirectAsync() {
  const [dest, setDest] = useState(null);

  useEffect(() => {
    async function check() {
      try {
        const result = await api.auth.refresh();
        if (result?.token) {
          localStorage.setItem('c10_token', result.token);
        }
        const userData = await api.auth.me();
        if (userData) {
          localStorage.setItem('c10_user', JSON.stringify(userData));
          setDest(userData.perfil === 'master_admin' ? 'admin' : 'app');
          return;
        }
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          clearSession();
        }
      }
      setDest('login');
    }
    check();
  }, []);

  if (!dest) return <PageLoader />;
  if (dest === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (dest === 'app')   return <Navigate to="/app/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionCleaner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/diag" element={<Diag />} />
          <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
          <Route path="/termos-uso" element={<TermosUso />} />
          <Route path="/app-redirect" element={<AppRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/bloqueado" element={<Bloqueado />} />
          <Route path="/approve/:token" element={<ApprovalPage />} />

          <Route path="/admin" element={<PrivateRoute adminOnly><Layout area="admin" /></PrivateRoute>}>
            <Route path="dashboard"       element={<AdminDashboard />} />
            <Route path="oficinas"        element={<AdminOficinas />} />
            <Route path="pagamentos"      element={<AdminPagamentos />} />
            <Route path="audit-logs"      element={<AdminAuditLogs />} />
            <Route path="security-alerts" element={<AdminSecurityAlerts />} />
            <Route path="trocar-senha"    element={<AdminTrocarSenha />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="/app" element={<PrivateRoute><Layout area="app" /></PrivateRoute>}>
            <Route path="dashboard"     element={<AppDashboardV2 />} />
            <Route path="clientes"      element={<AppClientes />} />
            <Route path="veiculos"      element={<AppVeiculos />} />
            <Route path="os"            element={<AppOS />} />
            <Route path="orcamentos"    element={<AppOrcamentos />} />
            <Route path="agenda"        element={<AppAgenda />} />
            <Route path="mensagens"     element={<AppMensagens />} />
            <Route path="pos-venda"     element={<PrivateRoute noFuncionario noMecanico><AppPosVenda /></PrivateRoute>} />
            <Route path="financeiro"    element={<PrivateRoute noFuncionario><AppFinanceiro /></PrivateRoute>} />
            <Route path="relatorios"    element={<PrivateRoute noFuncionario><AppRelatorios /></PrivateRoute>} />
            <Route path="lembretes"     element={<PrivateRoute noMecanico><AppLembretes /></PrivateRoute>} />
            <Route path="estoque"       element={<PrivateRoute noMecanico><AppEstoque /></PrivateRoute>} />
            <Route path="configuracoes" element={<PrivateRoute noFuncionario><AppConfiguracoes /></PrivateRoute>} />
            <Route path="notificacoes"  element={<AppNotificacoes />} />
            <Route path="planos"        element={<PrivateRoute noMecanico><AppPlanos /></PrivateRoute>} />
            <Route path="mecanicos"     element={<PrivateRoute noFuncionario><AppMecanicos /></PrivateRoute>} />
            <Route path="comissoes"     element={<PrivateRoute noFuncionario><AppMecanicoComissoes /></PrivateRoute>} />
            <Route path="meu-perfil"    element={<AppMeuPerfil />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
