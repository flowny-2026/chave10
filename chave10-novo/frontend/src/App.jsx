import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import AdminLogin from './pages/AdminLogin';
import Bloqueado from './pages/Bloqueado';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOficinas from './pages/admin/Oficinas';
import AdminPagamentos from './pages/admin/Pagamentos';
import AppDashboard from './pages/app/Dashboard';
import AppClientes from './pages/app/Clientes';
import AppVeiculos from './pages/app/Veiculos';
import AppOS from './pages/app/OS';
import AppOrcamentos from './pages/app/Orcamentos';
import AppAgenda from './pages/app/Agenda';
import AppMensagens from './pages/app/Mensagens';
import AppFinanceiro from './pages/app/Financeiro';
import AppRelatorios from './pages/app/Relatorios';
import AppLembretes from './pages/app/Lembretes';
import AppEstoque from './pages/app/Estoque';
import AppConfiguracoes from './pages/app/Configuracoes';

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
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app-redirect" element={<AppRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/bloqueado" element={<Bloqueado />} />

        <Route path="/admin" element={<PrivateRoute adminOnly><Layout area="admin" /></PrivateRoute>}>
          <Route path="dashboard"  element={<AdminDashboard />} />
          <Route path="oficinas"   element={<AdminOficinas />} />
          <Route path="pagamentos" element={<AdminPagamentos />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route path="/app" element={<PrivateRoute><Layout area="app" /></PrivateRoute>}>
          <Route path="dashboard"    element={<AppDashboard />} />
          <Route path="clientes"     element={<AppClientes />} />
          <Route path="veiculos"     element={<AppVeiculos />} />
          <Route path="os"           element={<AppOS />} />
          <Route path="orcamentos"   element={<AppOrcamentos />} />
          <Route path="agenda"       element={<AppAgenda />} />
          <Route path="mensagens"    element={<AppMensagens />} />
          <Route path="financeiro"   element={<PrivateRoute noFuncionario><AppFinanceiro /></PrivateRoute>} />
          <Route path="relatorios"   element={<PrivateRoute noFuncionario><AppRelatorios /></PrivateRoute>} />
          <Route path="lembretes"    element={<AppLembretes />} />
          <Route path="estoque"      element={<AppEstoque />} />
          <Route path="configuracoes" element={<PrivateRoute noFuncionario><AppConfiguracoes /></PrivateRoute>} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
