import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api, saveToken, saveUser } from '../api';
import '../styles/login.css';

function LoginLoader() {
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState('Iniciando sistema...');

  useEffect(() => {
    const steps = [
      { pct: 20, msg: 'Conectando ao servidor...' },
      { pct: 50, msg: 'Verificando credenciais...' },
      { pct: 75, msg: 'Carregando sua oficina...' },
      { pct: 100, msg: 'Tudo pronto!' },
    ];
    let elapsed = 0;
    steps.forEach((s, i) => {
      elapsed += 350;
      setTimeout(() => { setPct(s.pct); setStatus(s.msg); }, elapsed);
    });
  }, []);

  return (
    <div className="login-loader">
      <img src="/teste sem fundo 2.png" alt="Chave 10" className="login-loader-logo" />
      <div className="login-loader-bar">
        <div className="login-loader-fill" style={{ width: pct + '%' }}></div>
      </div>
      <p className="login-loader-status">{status}</p>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  function afterLogin(token, usuario) {
    saveToken(token);
    saveUser(usuario);
    localStorage.removeItem('c10_token_temp');
    sessionStorage.removeItem('c10_token_temp');
    setShowLoader(true);
    setTimeout(() => {
      if (usuario.perfil === 'master_admin') navigate('/admin/dashboard');
      else navigate('/app/dashboard');
    }, 1500);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const result = await api.auth.login(email, senha);
      if (result.needsOficina) { saveToken(result.token); navigate('/cadastro?step=2'); return; }
      afterLogin(result.token, result.usuario);
    } catch (err) {
      setLoading(false);
      if (err.error === 'blocked' || err.error === 'overdue') navigate('/bloqueado');
      else if (err.needsOficina) { saveToken(err.token); navigate('/cadastro?step=2'); }
      else setErro(err.error || 'Credenciais inválidas');
    }
  }

  async function handleGoogleSuccess({ credential }) {
    setErro('');
    setLoading(true);
    try {
      const result = await api.auth.googleLogin(credential);
      if (result.needsOficina) { saveToken(result.token); localStorage.setItem('c10_token_temp', result.token); navigate('/cadastro?step=2'); return; }
      afterLogin(result.token, result.usuario);
    } catch (err) {
      setLoading(false);
      if (err.error === 'blocked' || err.error === 'overdue') navigate('/bloqueado');
      else setErro(err.error || 'Erro ao autenticar com Google');
    }
  }

  if (showLoader) return <LoginLoader />;

  return (
    <div className="login-page">
      {/* Nav */}
      <nav className="login-nav">
        <img src="/teste sem fundo 2.png" alt="Chave 10" className="login-nav-logo" onClick={() => navigate('/')} />
        <button className="login-nav-btn" onClick={() => navigate('/cadastro')}>Criar conta</button>
      </nav>

      {/* Card central */}
      <div className="login-wrapper">
        <div className="login-card">
          <h1 className="login-title">Entrar na sua conta</h1>
          <p className="login-sub">Acesse sua oficina e continue de onde parou.</p>

          {googleClientId && (
            <>
              <div className="login-google">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setErro('Falha ao conectar com o Google')} width="100%" text="signin_with" shape="rectangular" logo_alignment="left" locale="pt-BR" />
              </div>
              <div className="login-divider">
                <span></span>
                <p>ou entre com e-mail</p>
                <span></span>
              </div>
            </>
          )}

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoComplete="email" />
            </div>

            <div className="login-field">
              <div className="login-field-row">
                <label>Senha</label>
                <button type="button" className="login-forgot" onClick={() => navigate('/esqueci-senha')}>Esqueci a senha</button>
              </div>
              <div className="login-input-wrap">
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
                <button type="button" className="login-eye" onClick={() => setShowSenha(s => !s)}>
                  {showSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {erro && <div className="login-error">{erro}</div>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? <span className="login-spinner"></span> : 'Entrar'}
            </button>
          </form>

          <p className="login-signup">
            Não tem uma conta? <button type="button" onClick={() => navigate('/cadastro')}>Criar conta grátis</button>
          </p>
        </div>

        <div className="login-trust">
          <span>🔒 Dados protegidos</span>
          <span>⚡ Acesso instantâneo</span>
          <span>💬 Suporte humanizado</span>
        </div>
      </div>
    </div>
  );
}
