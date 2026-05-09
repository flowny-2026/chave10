import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
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
  try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; }
}

function PrivateRoute({ children, adminOnly = false, noFuncionario = false }) {
  const user = getUser();
  if (!user && adminOnly) return <Navigate to="/admin/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.perfil !== 'master_admin') return <Navigate to="/app/dashboard" replace />;
  if (noFuncionario && user.perfil === 'funcionario') return <Navigate to="/app/dashboard" replace />;
  return children;
}

function AppRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.perfil === 'master_admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

export default function App() {
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
