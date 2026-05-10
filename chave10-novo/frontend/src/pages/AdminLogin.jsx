import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

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
    const timings = [400, 800, 600, 700, 500];
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
        <img src="/logo 250x50.png" alt="Chave 10" style={{ height: 44, objectFit: 'contain' }} />
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

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const { token, usuario } = await api.auth.login(email, senha);
      if (usuario.perfil !== 'master_admin') {
        setLoading(false);
        setErro('Acesso restrito ao administrador.');
        return;
      }
      localStorage.setItem('c10_token', token);
      localStorage.setItem('c10_user', JSON.stringify(usuario));
      setShowLoader(true);
      setTimeout(() => navigate('/admin/dashboard'), 3200);
    } catch (err) {
      setLoading(false);
      setErro(err.error || 'Credenciais inválidas');
    }
  }

  if (showLoader) return <LoginLoader />;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1b2e',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#fff',
        borderRadius: 16,
        padding: '48px 40px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <img src="/logo 250x50.png" alt="Chave 10" style={{ height: 40, objectFit: 'contain' }} />
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 10, padding: '4px 12px',
            background: 'var(--brand-light)',
            borderRadius: 20,
            fontSize: 11, fontWeight: 700,
            color: 'var(--brand)', letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4" fill="var(--brand)"/>
              <path d="M3 5l1.5 1.5L7 3.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Painel Administrativo
          </div>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 6 }}>
          Acesso restrito
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 28 }}>
          Área exclusiva para administradores do sistema.
        </p>

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@chave10.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {erro && (
            <div style={{
              background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,.2)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: 'var(--danger)',
              marginBottom: 16,
            }}>
              {erro}
            </div>
          )}

          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Entrar no painel'}
          </button>
        </form>

        <div style={{
          marginTop: 24, paddingTop: 20,
          borderTop: '1px solid var(--gray-100)',
          textAlign: 'center',
          fontSize: 12, color: 'var(--gray-400)',
        }}>
          Acesso para oficinas?{' '}
          <a href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Entrar aqui
          </a>
        </div>
      </div>
    </div>
  );
}
