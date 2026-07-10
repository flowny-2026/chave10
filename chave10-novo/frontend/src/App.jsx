import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from './components/Layout';
import { getFromStorage } from './api';
import PWAInstallBanner from './components/PWAInstallBanner';

// Páginas públicas — carregadas imediatamente
import Landing from './pages/Landing';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import EsqueciSenha from './pages/EsqueciSenha';
import AdminLogin from './pages/AdminLogin';
import Bloqueado from './pages/Bloqueado';
import ApprovalPage from './pages/ApprovalPage';

// Páginas do app — carregadas sob demanda (lazy)
const AdminDashboard   = lazy(() => import('./pages/admin/Dashboard'));
const AdminOficinas    = lazy(() => import('./pages/admin/Oficinas'));
const AdminPagamentos  = lazy(() => import('./pages/admin/Pagamentos'));
const AdminTrocarSenha = lazy(() => import('./pages/admin/TrocarSenha'));
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
    sessionStorage.removeItem(k);
  });
}

// Verifica se o token JWT ainda é válido (decodificação local — rápido, sem rede)
function isTokenValid() {
  const token = getToken();
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));

    if (!payload.exp) return true; // sem expiração = sempre válido
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function PrivateRoute({ children, adminOnly = false, noFuncionario = false }) {
  const user = getUser();
  const tokenOk = isTokenValid();

  // Sem token válido → limpa sessão e redireciona (via useEffect para evitar
  // side effects dentro do render)
  if (!tokenOk) {
    // Não chamamos clearSession() aqui — fazemos via efeito abaixo
    if (adminOnly) return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    if (adminOnly) return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.perfil !== 'master_admin') return <Navigate to="/app/dashboard" replace />;
  if (noFuncionario && user.perfil === 'funcionario') return <Navigate to="/app/dashboard" replace />;

  return children;
}

// Limpa a sessão quando o token expira (executado fora do render)
function SessionCleaner() {
  const tokenOk = isTokenValid();
  const hasToken = !!getToken();
  useEffect(() => {
    if (!tokenOk && hasToken) {
      clearSession();
    }
  }, []); // eslint-disable-line
  return null;
}

function AppRedirect() {
  const user = getUser();
  if (!user || !isTokenValid()) return <Navigate to="/login" replace />;
  if (user.perfil === 'master_admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionCleaner />
      <PWAInstallBanner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app-redirect" element={<AppRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/bloqueado" element={<Bloqueado />} />
          <Route path="/approve/:token" element={<ApprovalPage />} />

          <Route path="/admin" element={<PrivateRoute adminOnly><Layout area="admin" /></PrivateRoute>}>
            <Route path="dashboard"    element={<AdminDashboard />} />
            <Route path="oficinas"     element={<AdminOficinas />} />
            <Route path="pagamentos"   element={<AdminPagamentos />} />
            <Route path="trocar-senha" element={<AdminTrocarSenha />} />
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
            <Route path="financeiro"    element={<PrivateRoute noFuncionario><AppFinanceiro /></PrivateRoute>} />
            <Route path="relatorios"    element={<PrivateRoute noFuncionario><AppRelatorios /></PrivateRoute>} />
            <Route path="lembretes"     element={<AppLembretes />} />
            <Route path="estoque"       element={<AppEstoque />} />
            <Route path="configuracoes" element={<PrivateRoute noFuncionario><AppConfiguracoes /></PrivateRoute>} />
            <Route path="notificacoes"  element={<AppNotificacoes />} />
            <Route path="planos"        element={<AppPlanos />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
