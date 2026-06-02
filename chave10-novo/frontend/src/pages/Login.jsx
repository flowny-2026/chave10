import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../api';

// â”€â”€â”€ CSS injetado via <style> para garantir que não seja sobrescrito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LOGIN_CSS = `
  @keyframes lv2FadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lv2SlideIn { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes lv2OrbFloat { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(24px,-32px) scale(1.06)} 66%{transform:translate(-18px,22px) scale(.94)} }
  @keyframes lv2BarGrow { from{height:0} to{height:var(--h)} }
  @keyframes lv2Spin { to{transform:rotate(360deg)} }
  @keyframes lv2Pulse { 0%,100%{box-shadow:0 4px 20px rgba(249,115,22,.45)} 50%{box-shadow:0 4px 36px rgba(249,115,22,.75)} }
  @keyframes llFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes llDotPulse { 0%,100%{transform:scale(1);background:rgba(249,115,22,.4)} 50%{transform:scale(1.5);background:rgba(249,115,22,1)} }

  .lv2 { box-sizing:border-box; }
  .lv2 *, .lv2 *::before, .lv2 *::after { box-sizing:border-box; }

  .lv2-screen { min-height:100vh; display:flex; opacity:0; transition:opacity .5s ease; }
  .lv2-screen.vis { opacity:1; }

  .lv2-left {
    flex:1; position:relative; overflow:hidden;
    background:linear-gradient(145deg,#0a1628 0%,#1E3A5F 55%,#162f52 100%);
    display:flex; align-items:center; justify-content:center; padding:60px 56px;
  }
  .lv2-grid {
    position:absolute; inset:0; pointer-events:none;
    background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
    background-size:48px 48px;
  }
  .lv2-orb { position:absolute; border-radius:50%; filter:blur(72px); pointer-events:none; }
  .lv2-o1 { width:520px;height:520px;background:radial-gradient(circle,rgba(249,115,22,.28),transparent 70%);top:-140px;right:-80px;animation:lv2OrbFloat 9s ease-in-out infinite; }
  .lv2-o2 { width:380px;height:380px;background:radial-gradient(circle,rgba(96,165,250,.12),transparent 70%);bottom:-100px;left:5%;animation:lv2OrbFloat 12s ease-in-out infinite reverse; }
  .lv2-o3 { width:280px;height:280px;background:radial-gradient(circle,rgba(249,115,22,.08),transparent 70%);top:50%;left:40%;animation:lv2OrbFloat 15s ease-in-out infinite; }

  .lv2-lc { position:relative;z-index:2;max-width:440px;width:100%;animation:lv2FadeIn .8s ease .1s both; }

  .lv2-headline { font-family:'Poppins',sans-serif;font-size:38px;font-weight:800;color:#fff;line-height:1.18;letter-spacing:-.6px;margin:0 0 16px; }
  .lv2-accent-text { background:linear-gradient(135deg,#F97316,#fb923c,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .lv2-desc { font-size:15px;color:rgba(255,255,255,.58);line-height:1.7;margin:0 0 36px;max-width:380px; }

  .lv2-feats { list-style:none;padding:0;margin:0 0 40px;display:flex;flex-direction:column;gap:13px; }
  .lv2-feat { display:flex;align-items:center;gap:11px;font-size:14px;color:rgba(255,255,255,.72);font-weight:500; }
  .lv2-fcheck { width:22px;height:22px;border-radius:50%;background:rgba(249,115,22,.2);border:1px solid rgba(249,115,22,.35);display:flex;align-items:center;justify-content:center;color:#F97316;flex-shrink:0; }

  .lv2-proof { display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px; }
  .lv2-avs { display:flex; }
  .lv2-av { width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#1E3A5F,#F97316);border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;color:#fff;margin-left:-8px;position:relative; }
  .lv2-av:first-child { margin-left:0; }
  .lv2-stars { font-size:12px;color:#fbbf24;letter-spacing:1px;display:block; }
  .lv2-plabel { font-size:12px;color:rgba(255,255,255,.55);font-weight:500;display:block; }

  .lv2-mock { position:absolute;bottom:40px;right:-20px;width:260px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;backdrop-filter:blur(20px);overflow:hidden;z-index:2;box-shadow:0 24px 64px rgba(0,0,0,.4);animation:lv2FadeIn 1s ease .4s both; }
  .lv2-mbar { display:flex;align-items:center;gap:5px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.08); }
  .lv2-mbar span { width:8px;height:8px;border-radius:50%; }
  .lv2-mbody { padding:14px; }
  .lv2-mrow { display:flex;gap:8px;margin-bottom:14px; }
  .lv2-mstat { flex:1;background:rgba(255,255,255,.06);border-radius:8px;padding:8px 10px;border:1px solid rgba(255,255,255,.08); }
  .lv2-mval { font-family:'Poppins',sans-serif;font-size:12px;font-weight:700;color:#fff;line-height:1;margin-bottom:3px; }
  .lv2-mlbl { font-size:9px;color:rgba(255,255,255,.4); }
  .lv2-mchart { display:flex;align-items:flex-end;gap:5px;height:48px; }
  .lv2-mbar-i { flex:1;height:var(--h);background:linear-gradient(180deg,rgba(249,115,22,.7),rgba(249,115,22,.2));border-radius:3px 3px 0 0;animation:lv2BarGrow .8s ease calc(.5s + var(--delay)) both; }

  .lv2-right { width:500px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:48px 40px;position:relative; }
  .lv2-right::before { content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 80% 10%,rgba(249,115,22,.04),transparent 60%),radial-gradient(ellipse at 20% 90%,rgba(30,58,95,.04),transparent 60%);pointer-events:none; }

  .lv2-card { width:100%;max-width:380px;background:#fff;border-radius:20px;padding:40px 36px;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 4px 8px rgba(0,0,0,.04),0 16px 40px rgba(0,0,0,.08),0 32px 64px rgba(0,0,0,.04);position:relative;z-index:1;animation:lv2SlideIn .7s ease .15s both; }

  .lv2-title { font-family:'Poppins',sans-serif;font-size:24px;font-weight:800;color:#111827;letter-spacing:-.4px;margin:0 0 6px; }
  .lv2-sub { font-size:14px;color:#9CA3AF;margin:0 0 28px;line-height:1.5; }

  .lv2-divider { display:flex;align-items:center;gap:12px;margin-bottom:24px; }
  .lv2-dline { flex:1;height:1px;background:#E5E7EB; }
  .lv2-dtext { font-size:12px;color:#9CA3AF;white-space:nowrap;font-weight:500; }

  .lv2-field { display:flex;flex-direction:column;gap:6px;margin-bottom:18px; }
  .lv2-field:last-of-type { margin-bottom:0; }
  .lv2-lbl { font-size:13px;font-weight:600;color:#374151;letter-spacing:.1px; }
  .lv2-lrow { display:flex;align-items:center;justify-content:space-between; }
  .lv2-forg { background:none;border:none;font-size:12px;font-weight:600;color:#F97316;cursor:pointer;padding:0;font-family:inherit;transition:color .15s; }
  .lv2-forg:hover { color:#ea6c0a; }

  .lv2-iwrap { position:relative; }
  .lv2-iico { position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none;display:flex;align-items:center;transition:color .18s;z-index:1; }
  .lv2-inp { width:100%;padding:12px 14px 12px 40px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;color:#111827;background:#fff;font-family:inherit;transition:border-color .18s,box-shadow .18s,background .18s;outline:none; }
  .lv2-inp::placeholder { color:#D1D5DB; }
  .lv2-inp:hover { border-color:#D1D5DB; }
  .lv2-inp:focus { border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,.12);background:#fffbf8; }
  .lv2-iwrap:focus-within .lv2-iico { color:#F97316; }
  .lv2-eye { position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9CA3AF;padding:4px;display:flex;align-items:center;border-radius:6px;transition:color .15s,background .15s; }
  .lv2-eye:hover { color:#374151;background:#F3F4F6; }

  .lv2-err { display:flex;align-items:center;gap:7px;background:#fef2f2;border:1px solid rgba(220,38,38,.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#dc2626;font-weight:500;margin-bottom:18px; }

  .lv2-btn { width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:#F97316;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:0 4px 20px rgba(249,115,22,.4);transition:background .18s,transform .18s,box-shadow .18s;animation:lv2Pulse 3.5s ease-in-out infinite;margin-top:4px;position:relative;overflow:hidden;min-height:50px; }
  .lv2-btn::after { content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.15),transparent);opacity:0;transition:opacity .2s; }
  .lv2-btn:hover:not(:disabled) { background:#ea6c0a;transform:translateY(-2px);box-shadow:0 8px 28px rgba(249,115,22,.55);animation:none; }
  .lv2-btn:hover::after { opacity:1; }
  .lv2-btn:active:not(:disabled) { transform:translateY(0); }
  .lv2-btn:disabled { opacity:.7;cursor:not-allowed;animation:none; }

  .lv2-spin { width:18px;height:18px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:lv2Spin .7s linear infinite;display:inline-block; }

  .lv2-signup { margin-top:22px;text-align:center;font-size:13.5px;color:#6B7280; }
  .lv2-lnk { background:none;border:none;color:#F97316;font-weight:700;font-size:inherit;cursor:pointer;font-family:inherit;padding:0;transition:color .15s; }
  .lv2-lnk:hover { color:#ea6c0a;text-decoration:underline; }

  .lv2-trust { display:flex;align-items:center;justify-content:center;gap:10px;margin-top:20px;padding-top:18px;border-top:1px solid #F3F4F6;flex-wrap:wrap; }
  .lv2-ti { display:flex;align-items:center;gap:5px;font-size:11px;color:#9CA3AF;font-weight:500; }
  .lv2-td { width:3px;height:3px;border-radius:50%;background:#D1D5DB; }

  @media (max-width:1024px) {
    .lv2-left { padding:48px 40px; }
    .lv2-headline { font-size:32px; }
    .lv2-mock { display:none; }
    .lv2-right { width:440px; }
  }
  @media (max-width:768px) {
    .lv2-screen { flex-direction:column; }
    .lv2-left { flex:none;padding:32px 24px 28px; }
    .lv2-lc { max-width:100%;text-align:center; }
    .lv2-headline { font-size:26px; }
    .lv2-desc { font-size:14px;margin-bottom:20px;max-width:100%; }
    .lv2-feats { display:none; }
    .lv2-proof { justify-content:center;flex-wrap:wrap; }
    .lv2-mock { display:none; }
    .lv2-right { width:100%;flex:1;padding:32px 20px 40px; }
    .lv2-card { max-width:100%;padding:32px 24px;border-radius:16px; }
    .lv2-inp { font-size:16px; }
    .lv2-btn { min-height:52px;font-size:16px; }
  }
  @media (max-width:400px) {
    .lv2-left { padding:24px 18px 20px; }
    .lv2-right { padding:24px 16px 36px; }
    .lv2-card { padding:28px 20px; }
    .lv2-headline { font-size:23px; }
  }
`;

// â”€â”€ Injeta CSS via <style> tag â€” imune a sobrescrita do index.css â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LoginStyles() {
  return <style dangerouslySetInnerHTML={{ __html: LOGIN_CSS }} />;
}

// â”€â”€ Ãcones SVG inline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IconEye({ off }) {
  return off ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

// â”€â”€ Animação de loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LoginLoader() {
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState('Iniciando sistema...');

  useEffect(() => {
    const allSteps = [
      [ { pct: 12, msg: 'Apertando os parafusos do sistema...' },
        { pct: 12, msg: 'Calibrando a chave de fenda...' },
        { pct: 12, msg: 'Verificando torque das credenciais...' } ],
      [ { pct: 42, msg: 'Trocando o oleo do banco de dados...' },
        { pct: 42, msg: 'Engrenagens girando, aguarde...' },
        { pct: 42, msg: 'Carregando a bateria do dashboard...' } ],
      [ { pct: 68, msg: 'Aquecendo o motor principal...' },
        { pct: 68, msg: 'Acelerando o carregamento...' },
        { pct: 68, msg: 'Limpando o filtro de ar dos dados...' } ],
      [ { pct: 88, msg: 'Verificando a suspensao do sistema...' },
        { pct: 88, msg: 'Alinhando as rodas do painel...' },
        { pct: 88, msg: 'Rebocando os ultimos dados...' } ],
      [ { pct: 100, msg: 'Carro na vaga, pode entrar!' },
        { pct: 100, msg: 'Motor ligado, bora trabalhar!' },
        { pct: 100, msg: 'Revisao completa, tudo certo!' } ],
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
        <img src="/teste sem fundo 2.png" alt="Chave 10" style={{ height: 72, objectFit: 'contain' }} />
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
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const isAdminEmail = email.toLowerCase().includes('admin') || email.toLowerCase().includes('chave10');
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  function afterLogin(token, usuario) {
    // Salva em localStorage E sessionStorage para máxima persistência
    localStorage.setItem('c10_token', token);
    localStorage.setItem('c10_user', JSON.stringify(usuario));
    sessionStorage.setItem('c10_token', token);
    sessionStorage.setItem('c10_user', JSON.stringify(usuario));
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
      const { token, usuario } = await api.auth.login(email, senha);
      afterLogin(token, usuario);
    } catch (err) {
      setLoading(false);
      if (err.error === 'blocked' || err.error === 'overdue') navigate('/bloqueado');
      else setErro(err.error || 'Credenciais inválidas');
    }
  }

  async function handleGoogleSuccess({ credential }) {
    setErro('');
    setLoading(true);
    try {
      const result = await api.auth.googleLogin(credential);
      if (result.needsOficina) {
        localStorage.setItem('c10_token_temp', result.token);
        navigate('/cadastro?step=2');
        return;
      }
      afterLogin(result.token, result.usuario);
    } catch (err) {
      setLoading(false);
      if (err.error === 'blocked' || err.error === 'overdue') navigate('/bloqueado');
      else setErro(err.error || 'Erro ao autenticar com Google');
    }
  }

  if (showLoader) return <LoginLoader />;

  // â”€â”€ Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isAdminEmail) {
    return (
      <>
        <LoginStyles />
        <div className={`lv2 lv2-screen${mounted ? ' vis' : ''}`}
          style={{ alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg,#0a1628 0%,#1E3A5F 55%,#162f52 100%)' }}>
          <div className="lv2-card" style={{ maxWidth: 420, padding: '44px 40px', boxShadow: '0 32px 80px rgba(0,0,0,.4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <img src="/teste sem fundo 1.png" alt="Chave 10" style={{ height: 52, objectFit: 'contain' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: '#e8eef6', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#1E3A5F', letterSpacing: '.4px', textTransform: 'uppercase' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"/>
                </svg>
                PAINEL ADMINISTRATIVO
              </span>
            </div>
            <div className="lv2-title" style={{ marginBottom: 6 }}>Acesso restrito</div>
            <div className="lv2-sub">Área exclusiva para administradores do sistema.</div>
            <div className="lv2-field">
              <label className="lv2-lbl">E-mail</label>
              <div className="lv2-iwrap">
                <span className="lv2-iico"><IconMail /></span>
                <input className="lv2-inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@chave10.com" required autoFocus />
              </div>
            </div>
            <div className="lv2-field">
              <div className="lv2-lrow">
                <label className="lv2-lbl">Senha</label>
                <button type="button" className="lv2-forg" onClick={() => navigate('/esqueci-senha')}>Esqueci a senha</button>
              </div>
              <div className="lv2-iwrap">
                <span className="lv2-iico"><IconLock /></span>
                <input className="lv2-inp" type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required style={{ paddingRight: 44 }} />
                <button type="button" className="lv2-eye" onClick={() => setShowSenha(s => !s)}><IconEye off={showSenha} /></button>
              </div>
            </div>
            {erro && <div className="lv2-err"><IconAlert />{erro}</div>}
            <button className="lv2-btn" type="button" onClick={handleLogin} disabled={loading}>
              {loading ? <span className="lv2-spin" /> : <>Entrar no painel <IconArrow /></>}
            </button>
            <div className="lv2-signup" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F3F4F6' }}>
              Acesso para oficinas?{' '}
              <button type="button" className="lv2-lnk" onClick={() => setEmail('')}>Clique aqui</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // â”€â”€ Login principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <>
      <LoginStyles />
      <div className={`lv2 lv2-screen${mounted ? ' vis' : ''}`}>

        {/* ESQUERDO */}
        <div className="lv2-left">
          <div className="lv2-grid" />
          <div className="lv2-orb lv2-o1" />
          <div className="lv2-orb lv2-o2" />
          <div className="lv2-orb lv2-o3" />

          <div className="lv2-lc">
            <div style={{ marginBottom: 40 }}>
              <img src="/teste sem fundo 2.png" alt="Chave 10" style={{ height: 52, objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(249,115,22,.3))' }} />
            </div>

            <h2 className="lv2-headline">
              Chega de perder<br />
              <span className="lv2-accent-text">serviço na bagunça.</span>
            </h2>
            <p className="lv2-desc">
              Controle clientes, veículos e faturamento em um só lugar. Simples, rápido e profissional.
            </p>

            <ul className="lv2-feats">
              {['Dashboard com métricas em tempo real', 'Orçamentos enviados pelo WhatsApp', 'Histórico completo de cada veículo', 'Relatórios de desempenho da oficina'].map((f, i) => (
                <li key={i} className="lv2-feat">
                  <span className="lv2-fcheck"><IconCheck /></span>
                  {f}
                </li>
              ))}
            </ul>

          </div>

          {/* Mockup flutuante */}
          <div className="lv2-mock">
            <div className="lv2-mbar">
              <span style={{ background: 'rgba(239,68,68,.6)' }} />
              <span style={{ background: 'rgba(251,191,36,.6)' }} />
              <span style={{ background: 'rgba(74,222,128,.6)' }} />
            </div>
            <div className="lv2-mbody">
              <div className="lv2-mrow">
                <div className="lv2-mstat">
                  <div className="lv2-mval" style={{ color: '#F97316' }}>R$ 18.4k</div>
                  <div className="lv2-mlbl">Faturamento</div>
                </div>
                <div className="lv2-mstat">
                  <div className="lv2-mval">47</div>
                  <div className="lv2-mlbl">OS abertas</div>
                </div>
                <div className="lv2-mstat">
                  <div className="lv2-mval">312</div>
                  <div className="lv2-mlbl">Clientes</div>
                </div>
              </div>
              <div className="lv2-mchart">
                {[40,65,45,80,60,90,75].map((h, i) => (
                  <div key={i} className="lv2-mbar-i" style={{ '--h': h+'%', '--delay': i*0.08+'s' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* DIREITO */}
        <div className="lv2-right">
          <div className="lv2-card">
            <div style={{ marginBottom: 28 }}>
              <img src="/teste sem fundo 1.png" alt="Chave 10" style={{ height: 44, objectFit: 'contain' }} />
            </div>

            <h1 className="lv2-title">Bem-vindo de volta</h1>
            <p className="lv2-sub">Acesse sua conta e gerencie sua oficina.</p>

            {googleClientId && (
              <div style={{ marginBottom: 20 }}>
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setErro('Falha ao conectar com o Google')} width="100%" text="signin_with" shape="rectangular" logo_alignment="left" locale="pt-BR" />
              </div>
            )}

            {googleClientId && (
              <div className="lv2-divider">
                <span className="lv2-dline" />
                <span className="lv2-dtext">ou entre com e-mail</span>
                <span className="lv2-dline" />
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="lv2-field">
                <label className="lv2-lbl">E-mail</label>
                <div className="lv2-iwrap">
                  <span className="lv2-iico"><IconMail /></span>
                  <input className="lv2-inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoComplete="email" />
                </div>
              </div>

              <div className="lv2-field">
                <div className="lv2-lrow">
                  <label className="lv2-lbl">Senha</label>
                  <button type="button" className="lv2-forg" onClick={() => navigate('/esqueci-senha')}>Esqueci a senha</button>
                </div>
                <div className="lv2-iwrap">
                  <span className="lv2-iico"><IconLock /></span>
                  <input className="lv2-inp" type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required autoComplete="current-password" style={{ paddingRight: 44 }} />
                  <button type="button" className="lv2-eye" onClick={() => setShowSenha(s => !s)}><IconEye off={showSenha} /></button>
                </div>
              </div>

              {erro && <div className="lv2-err"><IconAlert />{erro}</div>}

              <button className="lv2-btn" type="submit" disabled={loading}>
                {loading ? <span className="lv2-spin" /> : <>Entrar na conta <IconArrow /></>}
              </button>
            </form>

            <div className="lv2-signup">
              Não tem uma conta?{' '}
              <button type="button" className="lv2-lnk" onClick={() => navigate('/cadastro')}>Criar conta grátis</button>
            </div>

            <div className="lv2-trust">
              <span className="lv2-ti">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Dados seguros
              </span>
              <span className="lv2-td" />
              <span className="lv2-ti">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Criptografado
              </span>
              <span className="lv2-td" />
              <span className="lv2-ti">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Sem fidelidade
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}



