import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../api';

// ── Animação de loading ──────────────────────────────────────
function LoginLoader() {
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState('Iniciando sistema...');

  useEffect(() => {
    const allSteps = [
      [ { pct: 12, msg: '🔧 Apertando os parafusos do sistema...' },
        { pct: 12, msg: '🪛 Calibrando a chave de fenda...' },
        { pct: 12, msg: '🔩 Verificando torque das credenciais...' } ],
      [ { pct: 42, msg: '🛢️ Trocando o óleo do banco de dados...' },
        { pct: 42, msg: '⚙️ Engrenagens girando, aguarde...' },
        { pct: 42, msg: '🔋 Carregando a bateria do dashboard...' } ],
      [ { pct: 68, msg: '🚗 Aquecendo o motor principal...' },
        { pct: 68, msg: '🏎️ Acelerando o carregamento...' },
        { pct: 68, msg: '💨 Limpando o filtro de ar dos dados...' } ],
      [ { pct: 88, msg: '🔦 Verificando a suspensão do sistema...' },
        { pct: 88, msg: '🛞 Alinhando as rodas do painel...' },
        { pct: 88, msg: '🪝 Rebocando os últimos dados...' } ],
      [ { pct: 100, msg: '✅ Carro na vaga, pode entrar!' },
        { pct: 100, msg: '✅ Motor ligado, bora trabalhar!' },
        { pct: 100, msg: '✅ Revisão completa, tudo certo!' } ],
    ];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const steps = allSteps.map(pick);
    const timings = [200, 350, 300, 350, 200];
    let elapsed = 0;
    steps.forEach((s, i) => {
      elapsed += timings[i];
      setTimeout(() => { setPct(s.pct); setStatus(s.msg); }, elapsed);
    });
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: '#0d1b2e',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ marginBottom: 48, animation: 'llFadeUp 0.6s ease both' }}>
        <img src="/teste sem fundo 2.png" alt="Chave 10" style={{ height: 38, objectFit: 'contain' }} />
      </div>
      <div style={{ width: 320, marginBottom: 20, animation: 'llFadeUp 0.6s 0.15s ease both' }}>
        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'visible', position: 'relative' }}>
          <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, #F97316, #fb923c)', borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)', position: 'relative' }}>
            {pct > 0 && <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, background: '#fff', borderRadius: '50%', boxShadow: '0 0 12px 5px rgba(249,115,22,0.9)' }}/>}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.3px', height: 20, marginBottom: 40, animation: 'llFadeUp 0.6s 0.25s ease both', transition: 'opacity 0.3s' }}>{status}</div>
      <div style={{ display: 'flex', gap: 8, animation: 'llFadeUp 0.6s 0.35s ease both' }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(249,115,22,0.4)', animation: `llDotPulse 1.2s ${delay}s ease-in-out infinite` }}/>
        ))}
      </div>
      <style>{`
        @keyframes llFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes llDotPulse { 0%, 100% { transform: scale(1); background: rgba(249,115,22,0.4); } 50% { transform: scale(1.5); background: rgba(249,115,22,1); } }
      `}</style>
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

  const isAdminEmail = email.toLowerCase().includes('admin') || email.toLowerCase().includes('chave10');
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  function afterLogin(token, usuario) {
    localStorage.setItem('c10_token', token);
    localStorage.setItem('c10_user', JSON.stringify(usuario));
    setShowLoader(true);
    setTimeout(() => {
      if (usuario.perfil === 'master_admin') navigate('/admin/dashboard');
      else navigate('/app/dashboard');
    }, 1500); // reduzido de 3200ms para 1500ms
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const { token, usuario } = await api.auth.login(email, senha);
      afterLogin(token, usuario);
    } catch (err) {
      setLoading(false);
      if (err.error === 'blocked' || err.error === 'overdue') {
        navigate('/bloqueado');
      } else {
        setErro(err.error || 'Credenciais inválidas');
      }
    }
  }

  async function handleGoogleSuccess({ credential }) {
    setErro('');
    setLoading(true);
    try {
      const result = await api.auth.googleLogin(credential);
      // Novo usuário sem oficina — redireciona para completar cadastro
      if (result.needsOficina) {
        localStorage.setItem('c10_token_temp', result.token);
        navigate('/cadastro?step=2');
        return;
      }
      afterLogin(result.token, result.usuario);
    } catch (err) {
      setLoading(false);
      if (err.error === 'blocked' || err.error === 'overdue') {
        navigate('/bloqueado');
      } else {
        setErro(err.error || 'Erro ao autenticar com Google');
      }
    }
  }

  if (showLoader) return <LoginLoader />;

  if (isAdminEmail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1b2e' }}>
        <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, padding: '48px 40px', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src="/teste sem fundo 1.png" alt="Chave 10" style={{ height: 30, objectFit: 'contain' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '4px 14px', background: 'var(--brand-light)', borderRadius: 20, fontSize: 11, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              ⚙️ Painel Administrativo
            </div>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 6 }}>Acesso restrito</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 28 }}>Área exclusiva para administradores do sistema.</p>
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@chave10.com" required autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label>Senha</label>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/esqueci-senha')}>
                  Esqueci a senha
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowSenha(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0, display: 'flex' }}>
                  {showSenha
                    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            {erro && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>{erro}</div>}
            <button className="btn btn-primary login-btn" type="submit" disabled={loading}>{loading ? 'Verificando...' : 'Entrar no painel'}</button>
          </form>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--gray-100)', textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>
            Acesso para oficinas? <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setEmail('')}>Clique aqui</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-left">
        <div className="login-left-content">
          <div style={{ marginBottom: 24 }}>
            <img src="/teste sem fundo 2.png" alt="Chave 10" style={{ height: 34, objectFit: 'contain' }} />
          </div>
          <h2 className="login-headline">Organize sua oficina.<br/>Cresça com dados.</h2>
          <p className="login-desc">Controle ordens de serviço, clientes, veículos e faturamento em um só lugar.</p>
          <div className="login-features">
            <div className="login-feat"><span className="feat-dot" />Dashboard com métricas em tempo real</div>
            <div className="login-feat"><span className="feat-dot" />Orçamentos enviados pelo WhatsApp</div>
            <div className="login-feat"><span className="feat-dot" />Histórico completo de cada veículo</div>
            <div className="login-feat"><span className="feat-dot" />Relatórios de desempenho da oficina</div>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-box">
          <div style={{ marginBottom: 20 }}>
            <img src="/teste sem fundo 1.png" alt="Chave 10" style={{ height: 30, objectFit: 'contain' }} />
          </div>
          <h1 className="login-title">Acesse sua conta</h1>
          <p className="login-subtitle">Sistema completo para gestão de oficinas.</p>

          {/* Botão Google */}
          {googleClientId && (
            <div style={{ marginBottom: 20 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErro('Falha ao conectar com o Google')}
                width="100%"
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
                locale="pt-BR"
              />
            </div>
          )}

          {/* Divisor */}
          {googleClientId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
              <span style={{ fontSize: 12, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>ou entre com e-mail</span>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label>Senha</label>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/esqueci-senha')}>
                  Esqueci a senha
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowSenha(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0, display: 'flex' }}>
                  {showSenha
                    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            {erro && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{erro}</p>}
            <button className="btn btn-primary login-btn" type="submit" disabled={loading}>{loading ? 'Verificando...' : 'Entrar na conta'}</button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--gray-500)' }}>
            Não tem uma conta?{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/cadastro')}>
              Criar conta grátis
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
