import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout';
import { getFromStorage, api } from './api';
import PWAInstallBanner from './components/PWAInstallBanner';

// Páginas públicas — carregadas imediatamente
import Landing from './pages/Landing';
import Login from './pages/Login';
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
 * PrivateRoute — tenta renovar o token silenciosamente antes de redirecionar
 * para o login. Isso resolve o caso de token expirado ao reabrir o app:
 * em vez de jogar para o login imediatamente, tenta um POST /auth/refresh
 * e só redireciona se realmente não houver como renovar.
 */
function PrivateRoute({ children, adminOnly = false, noFuncionario = false, noMecanico = false }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed]     = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function check() {
      const token = getToken();

      // Sem token algum → login direto
      if (!token) { setChecking(false); return; }

      // Token ainda válido → ok
      if (isTokenValid()) { setAuthed(true); setChecking(false); return; }

      // Token expirado → tenta refresh silencioso
      try {
        const result = await api.auth.refresh();
        if (result?.token) {
          localStorage.setItem('c10_token', result.token);
          setAuthed(true);
          setChecking(false);
          return;
        }
      } catch (err) {
        // Só limpa a sessão se o servidor recusou explicitamente (401/403)
        // Erros de rede, timeout ou 5xx NÃO apagam o token — o usuário tenta de novo depois
        if (err?.status === 401 || err?.status === 403) {
          clearSession();
        }
        // Em qualquer caso: vai para o login sem apagar se não for 401/403
        setChecking(false);
        return;
      }

      // refresh retornou sem token (não deveria acontecer)
      setChecking(false);
    }
    check();
  }, []); // eslint-disable-line

  if (checking) return <PageLoader />;

  if (!authed) {
    if (adminOnly) return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login" replace />;
  }

  const user = getUser();
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
  const [checking, setChecking] = useState(true);
  const [dest, setDest] = useState(null);

  useEffect(() => {
    async function check() {
      const token = getToken();
      if (!token) { setDest('login'); setChecking(false); return; }

      if (isTokenValid()) {
        const user = getUser();
        setDest(user?.perfil === 'master_admin' ? 'admin' : 'app');
        setChecking(false);
        return;
      }

      // Tenta refresh
      try {
        const result = await api.auth.refresh();
        if (result?.token) {
          localStorage.setItem('c10_token', result.token);
          const user = getUser();
          setDest(user?.perfil === 'master_admin' ? 'admin' : 'app');
          setChecking(false);
          return;
        }
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          clearSession();
        }
      }

      setDest('login');
      setChecking(false);
    }
    check();
  }, []);

  if (checking) return <PageLoader />;
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
