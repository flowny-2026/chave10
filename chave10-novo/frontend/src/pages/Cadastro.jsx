import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api, saveToken, saveUser } from '../api';
import { useForm } from '../hooks/useForm';
import FormInput from '../components/FormInput';
import CepInput from '../components/CepInput';
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validatePhone,
  validateRequired,
  maskPhone,
  maskDocumento,
} from '../utils/validation';

// ─── CSS injetado — mesmo padrão do Login, imune ao index.css ─────────────────
const CAD_CSS = `
  @keyframes cadFadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cadSlideIn { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes cadOrbFloat { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(24px,-32px) scale(1.06)} 66%{transform:translate(-18px,22px) scale(.94)} }
  @keyframes cadBarGrow { from{height:0} to{height:var(--h)} }
  @keyframes cadSpin { to{transform:rotate(360deg)} }
  @keyframes cadPulse { 0%,100%{box-shadow:0 4px 20px rgba(249,115,22,.45)} 50%{box-shadow:0 4px 36px rgba(249,115,22,.75)} }

  .cad { box-sizing:border-box; }
  .cad *, .cad *::before, .cad *::after { box-sizing:border-box; }

  .cad-screen { min-height:100vh; display:flex; opacity:0; transition:opacity .5s ease; }
  .cad-screen.vis { opacity:1; }

  /* LEFT */
  .cad-left {
    flex:1; position:relative; overflow:hidden;
    background:linear-gradient(145deg,#0a1628 0%,#1E3A5F 55%,#162f52 100%);
    display:flex; align-items:center; justify-content:center; padding:60px 56px;
  }
  .cad-grid {
    position:absolute; inset:0; pointer-events:none;
    background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
    background-size:48px 48px;
  }
  .cad-orb { position:absolute; border-radius:50%; filter:blur(72px); pointer-events:none; }
  .cad-o1 { width:520px;height:520px;background:radial-gradient(circle,rgba(249,115,22,.28),transparent 70%);top:-140px;right:-80px;animation:cadOrbFloat 9s ease-in-out infinite; }
  .cad-o2 { width:380px;height:380px;background:radial-gradient(circle,rgba(96,165,250,.12),transparent 70%);bottom:-100px;left:5%;animation:cadOrbFloat 12s ease-in-out infinite reverse; }
  .cad-o3 { width:280px;height:280px;background:radial-gradient(circle,rgba(249,115,22,.08),transparent 70%);top:50%;left:40%;animation:cadOrbFloat 15s ease-in-out infinite; }

  .cad-lc { position:relative;z-index:2;max-width:440px;width:100%;animation:cadFadeIn .8s ease .1s both; }

  .cad-headline { font-family:'Poppins',sans-serif;font-size:38px;font-weight:800;color:#fff;line-height:1.18;letter-spacing:-.6px;margin:0 0 16px; }
  .cad-accent-text { background:linear-gradient(135deg,#F97316,#fb923c,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .cad-desc { font-size:15px;color:rgba(255,255,255,.58);line-height:1.7;margin:0 0 36px;max-width:380px; }

  .cad-feats { list-style:none;padding:0;margin:0 0 40px;display:flex;flex-direction:column;gap:13px; }
  .cad-feat { display:flex;align-items:center;gap:11px;font-size:14px;color:rgba(255,255,255,.72);font-weight:500; }
  .cad-fcheck { width:22px;height:22px;border-radius:50%;background:rgba(249,115,22,.2);border:1px solid rgba(249,115,22,.35);display:flex;align-items:center;justify-content:center;color:#F97316;flex-shrink:0; }

  .cad-proof { display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px; }
  .cad-avs { display:flex; }
  .cad-av { width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#1E3A5F,#F97316);border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;color:#fff;margin-left:-8px;position:relative; }
  .cad-av:first-child { margin-left:0; }
  .cad-stars { font-size:12px;color:#fbbf24;letter-spacing:1px;display:block; }
  .cad-plabel { font-size:12px;color:rgba(255,255,255,.55);font-weight:500;display:block; }

  /* Mockup */
  .cad-mock { position:absolute;bottom:40px;right:-20px;width:260px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;backdrop-filter:blur(20px);overflow:hidden;z-index:2;box-shadow:0 24px 64px rgba(0,0,0,.4);animation:cadFadeIn 1s ease .4s both; }
  .cad-mbar { display:flex;align-items:center;gap:5px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.08); }
  .cad-mbar span { width:8px;height:8px;border-radius:50%; }
  .cad-mbody { padding:14px; }
  .cad-mrow { display:flex;gap:8px;margin-bottom:14px; }
  .cad-mstat { flex:1;background:rgba(255,255,255,.06);border-radius:8px;padding:8px 10px;border:1px solid rgba(255,255,255,.08); }
  .cad-mval { font-family:'Poppins',sans-serif;font-size:12px;font-weight:700;color:#fff;line-height:1;margin-bottom:3px; }
  .cad-mlbl { font-size:9px;color:rgba(255,255,255,.4); }
  .cad-mchart { display:flex;align-items:flex-end;gap:5px;height:48px; }
  .cad-mbar-i { flex:1;height:var(--h);background:linear-gradient(180deg,rgba(249,115,22,.7),rgba(249,115,22,.2));border-radius:3px 3px 0 0;animation:cadBarGrow .8s ease calc(.5s + var(--delay)) both; }

  /* RIGHT */
  .cad-right { width:520px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:40px 40px;position:relative;overflow-y:auto; }
  .cad-right::before { content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 80% 10%,rgba(249,115,22,.04),transparent 60%),radial-gradient(ellipse at 20% 90%,rgba(30,58,95,.04),transparent 60%);pointer-events:none; }

  /* CARD */
  .cad-card { width:100%;max-width:420px;background:#fff;border-radius:20px;padding:36px 32px;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 4px 8px rgba(0,0,0,.04),0 16px 40px rgba(0,0,0,.08),0 32px 64px rgba(0,0,0,.04);position:relative;z-index:1;animation:cadSlideIn .7s ease .15s both; }

  /* STEP INDICATOR */
  .cad-steps { display:flex;align-items:center;gap:8px;margin-bottom:28px; }
  .cad-step-item { display:flex;align-items:center;gap:8px;flex:1; }
  .cad-step-dot { width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;font-size:12px;font-weight:700;flex-shrink:0;transition:all .3s; }
  .cad-step-dot.active { background:#F97316;color:#fff;box-shadow:0 0 0 4px rgba(249,115,22,.15); }
  .cad-step-dot.done { background:#16a34a;color:#fff; }
  .cad-step-dot.idle { background:#F3F4F6;color:#9CA3AF; }
  .cad-step-label { font-size:12px;font-weight:600;color:#374151; }
  .cad-step-label.idle { color:#9CA3AF; }
  .cad-step-line { flex:1;height:2px;background:#E5E7EB;border-radius:2px;margin:0 4px; }
  .cad-step-line.done { background:#16a34a; }

  .cad-title { font-family:'Poppins',sans-serif;font-size:22px;font-weight:800;color:#111827;letter-spacing:-.4px;margin:0 0 4px; }
  .cad-sub { font-size:14px;color:#9CA3AF;margin:0 0 24px;line-height:1.5; }

  .cad-divider { display:flex;align-items:center;gap:12px;margin-bottom:20px; }
  .cad-dline { flex:1;height:1px;background:#E5E7EB; }
  .cad-dtext { font-size:12px;color:#9CA3AF;white-space:nowrap;font-weight:500; }

  /* FORM FIELDS — sobrescreve index.css */
  .cad-card .form-group { display:flex!important;flex-direction:column!important;gap:5px!important;margin-bottom:14px!important; }
  .cad-card label { font-size:13px!important;font-weight:600!important;color:#374151!important;margin:0!important; }
  .cad-card input, .cad-card select, .cad-card textarea {
    width:100%!important; padding:11px 13px!important;
    border:1.5px solid #E5E7EB!important; border-radius:10px!important;
    font-size:14px!important; color:#111827!important;
    background:#fff!important; font-family:inherit!important;
    transition:border-color .18s,box-shadow .18s!important;
    outline:none!important; box-shadow:none!important;
  }
  .cad-card input::placeholder { color:#D1D5DB!important; }
  .cad-card input:hover { border-color:#D1D5DB!important; }
  .cad-card input:focus, .cad-card select:focus, .cad-card textarea:focus {
    border-color:#F97316!important;
    box-shadow:0 0 0 3px rgba(249,115,22,.12)!important;
    background:#fffbf8!important;
  }
  .cad-card input.error { border-color:#dc2626!important;background:#fef2f2!important; }
  .cad-card .form-error { font-size:12px!important;color:#dc2626!important;font-weight:500!important;margin-top:2px!important; }
  .cad-card small { font-size:11px!important;color:#9CA3AF!important; }

  /* Botão buscar CEP dentro do card */
  .cad-card .btn-outline {
    padding:9px 14px!important; border-radius:8px!important;
    border:1.5px solid #E5E7EB!important; background:#fff!important;
    color:#374151!important; font-size:13px!important; font-weight:600!important;
    cursor:pointer!important; font-family:inherit!important;
    transition:border-color .15s,color .15s!important;
  }
  .cad-card .btn-outline:hover { border-color:#F97316!important;color:#F97316!important; }
  .cad-card .btn-outline:disabled { opacity:.5!important;cursor:not-allowed!important; }

  .cad-err { display:flex;align-items:center;gap:7px;background:#fef2f2;border:1px solid rgba(220,38,38,.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#dc2626;font-weight:500;margin-bottom:14px; }

  .cad-btn { width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:#F97316;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:0 4px 20px rgba(249,115,22,.4);transition:background .18s,transform .18s,box-shadow .18s;animation:cadPulse 3.5s ease-in-out infinite;margin-top:6px;position:relative;overflow:hidden;min-height:50px; }
  .cad-btn::after { content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.15),transparent);opacity:0;transition:opacity .2s; }
  .cad-btn:hover:not(:disabled) { background:#ea6c0a;transform:translateY(-2px);box-shadow:0 8px 28px rgba(249,115,22,.55);animation:none; }
  .cad-btn:hover::after { opacity:1; }
  .cad-btn:active:not(:disabled) { transform:translateY(0); }
  .cad-btn:disabled { opacity:.7;cursor:not-allowed;animation:none; }

  .cad-spin { width:18px;height:18px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:cadSpin .7s linear infinite;display:inline-block; }

  .cad-login-row { margin-top:20px;text-align:center;font-size:13.5px;color:#6B7280; }
  .cad-lnk { background:none;border:none;color:#F97316;font-weight:700;font-size:inherit;cursor:pointer;font-family:inherit;padding:0;transition:color .15s; }
  .cad-lnk:hover { color:#ea6c0a;text-decoration:underline; }

  .cad-trust { display:flex;align-items:center;justify-content:center;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid #F3F4F6;flex-wrap:wrap; }
  .cad-ti { display:flex;align-items:center;gap:5px;font-size:11px;color:#9CA3AF;font-weight:500; }
  .cad-td { width:3px;height:3px;border-radius:50%;background:#D1D5DB; }

  /* RESPONSIVE */
  @media (max-width:1024px) {
    .cad-left { padding:48px 40px; }
    .cad-headline { font-size:32px; }
    .cad-mock { display:none; }
    .cad-right { width:480px; }
  }
  @media (max-width:768px) {
    .cad-screen { flex-direction:column; }
    .cad-left { flex:none;padding:32px 24px 28px; }
    .cad-lc { max-width:100%;text-align:center; }
    .cad-headline { font-size:26px; }
    .cad-desc { font-size:14px;margin-bottom:20px;max-width:100%; }
    .cad-feats { display:none; }
    .cad-proof { justify-content:center;flex-wrap:wrap; }
    .cad-mock { display:none; }
    .cad-right { width:100%;flex:1;padding:28px 16px 40px; }
    .cad-card { max-width:100%;padding:28px 20px;border-radius:16px; }
    .cad-card input, .cad-card select { font-size:16px!important; }
    .cad-btn { min-height:52px;font-size:16px; }
  }
  @media (max-width:400px) {
    .cad-left { padding:24px 18px 20px; }
    .cad-right { padding:20px 12px 36px; }
    .cad-card { padding:24px 16px; }
    .cad-headline { font-size:23px; }
  }
`;

function CadStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CAD_CSS }} />;
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

// Painel esquerdo — igual ao Login
function LeftPanel() {
  return (
    <div className="cad-left">
      <div className="cad-grid" />
      <div className="cad-orb cad-o1" />
      <div className="cad-orb cad-o2" />
      <div className="cad-orb cad-o3" />
      <div className="cad-lc">
        <div style={{ marginBottom: 40 }}>
          <img src="/teste sem fundo 2.png" alt="Chave 10" style={{ height: 52, objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(249,115,22,.3))' }} />
        </div>
        <h2 className="cad-headline">
          Sua oficina mais<br />
          <span className="cad-accent-text">organizada e lucrativa.</span>
        </h2>
        <p className="cad-desc">
          Comece grátis por 7 dias. Sem cartão de crédito. Cancele quando quiser.
        </p>
        <ul className="cad-feats">
          {[
            'Dashboard com métricas em tempo real',
            'Orçamentos enviados pelo WhatsApp',
            'Histórico completo de cada veículo',
            'Relatórios de desempenho da oficina',
          ].map((f, i) => (
            <li key={i} className="cad-feat">
              <span className="cad-fcheck"><IconCheck /></span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      {/* Mockup flutuante */}
      <div className="cad-mock">
        <div className="cad-mbar">
          <span style={{ background: 'rgba(239,68,68,.6)' }} />
          <span style={{ background: 'rgba(251,191,36,.6)' }} />
          <span style={{ background: 'rgba(74,222,128,.6)' }} />
        </div>
        <div className="cad-mbody">
          <div className="cad-mrow">
            <div className="cad-mstat"><div className="cad-mval" style={{ color:'#F97316' }}>R$ 18.4k</div><div className="cad-mlbl">Faturamento</div></div>
            <div className="cad-mstat"><div className="cad-mval">47</div><div className="cad-mlbl">OS abertas</div></div>
            <div className="cad-mstat"><div className="cad-mval">312</div><div className="cad-mlbl">Clientes</div></div>
          </div>
          <div className="cad-mchart">
            {[40,65,45,80,60,90,75].map((h, i) => (
              <div key={i} className="cad-mbar-i" style={{ '--h': h+'%', '--delay': i*0.08+'s' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Cadastro() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [erro, setErro] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (searchParams.get('step') === '2') {
      const token = localStorage.getItem('c10_token_temp');
      if (token) {
        setTempToken(token);
        localStorage.removeItem('c10_token_temp');
        setStep(2);
      }
    }
  }, []);

  const formPessoal = useForm(
    { nome: '', email: '', senha: '', confirmarSenha: '' },
    async (values) => {
      setErro('');
      const { token } = await api.auth.register({ nome: values.nome, email: values.email, senha: values.senha });
      setTempToken(token);
      setStep(2);
    },
    {
      nome: [validateName],
      email: [validateEmail],
      senha: [(v) => validatePassword(v, 6)],
      confirmarSenha: [(v) => {
        if (!v) return 'Confirmação de senha é obrigatória';
        if (v !== formPessoal.values.senha) return 'As senhas não coincidem';
        return null;
      }]
    }
  );

  const formOficina = useForm(
    { nome_oficina: '', cnpj_cpf: '', telefone: '', endereco: '', logo: '' },
    async (values) => {
      setErro('');
      const { token, usuario } = await api.auth.completeOficina(tempToken, values);
      saveToken(token);
      saveUser(usuario);
      navigate('/app/dashboard');
    },
    { nome_oficina: [validateRequired], telefone: [validatePhone] }
  );

  async function handleCadastroSubmit(e) {
    try { await formPessoal.handleSubmit(e); }
    catch (err) { setErro(err.error || 'Erro ao criar conta'); }
  }

  async function handleOficinaSubmit(e) {
    try { await formOficina.handleSubmit(e); }
    catch (err) { setErro(err.error || 'Erro ao salvar dados da oficina'); }
  }

  async function handleGoogleSuccess({ credential }) {
    setErro('');
    try {
      const { token, needsOficina, usuario } = await api.auth.googleRegister(credential);
      if (needsOficina) { setTempToken(token); setStep(2); }
      else {
        saveToken(token);
        if (usuario) saveUser(usuario);
        navigate('/app/dashboard');
      }
    } catch (err) { setErro(err.error || 'Erro ao cadastrar com Google'); }
  }

  // ── Step indicator ───────────────────────────────────────────
  function StepIndicator() {
    return (
      <div className="cad-steps">
        <div className="cad-step-item">
          <div className={`cad-step-dot ${step === 1 ? 'active' : step > 1 ? 'done' : 'idle'}`}>
            {step > 1 ? <IconCheck /> : '1'}
          </div>
          <span className={`cad-step-label ${step < 1 ? 'idle' : ''}`}>Sua conta</span>
        </div>
        <div className={`cad-step-line ${step > 1 ? 'done' : ''}`} />
        <div className="cad-step-item">
          <div className={`cad-step-dot ${step === 2 ? 'active' : step > 2 ? 'done' : 'idle'}`}>2</div>
          <span className={`cad-step-label ${step < 2 ? 'idle' : ''}`}>Sua oficina</span>
        </div>
      </div>
    );
  }

  // ── Step 2: dados da oficina ─────────────────────────────────
  if (step === 2) {
    return (
      <>
        <CadStyles />
        <div className={`cad cad-screen${mounted ? ' vis' : ''}`}>
          <LeftPanel />
          <div className="cad-right">
            <div className="cad-card">
              <div style={{ marginBottom: 24 }}>
                <img src="/teste sem fundo 1.png" alt="Chave 10" style={{ height: 40, objectFit: 'contain' }} />
              </div>
              <StepIndicator />
              <h1 className="cad-title">Dados da sua oficina</h1>
              <p className="cad-sub">Quase lá! Complete com as informações da sua oficina.</p>

              <form onSubmit={handleOficinaSubmit}>
                <FormInput label="Nome da oficina" name="nome_oficina" value={formOficina.values.nome_oficina} error={formOficina.errors.nome_oficina} touched={formOficina.touched.nome_oficina} onChange={formOficina.handleChange} onBlur={formOficina.handleBlur} placeholder="Ex: Oficina do João" required />
                <FormInput label="CNPJ ou CPF" name="cnpj_cpf" value={formOficina.values.cnpj_cpf} error={formOficina.errors.cnpj_cpf} touched={formOficina.touched.cnpj_cpf} onChange={formOficina.handleChange} onBlur={formOficina.handleBlur} placeholder="00.000.000/0000-00" mask={maskDocumento} />
                <FormInput label="Telefone" name="telefone" value={formOficina.values.telefone} error={formOficina.errors.telefone} touched={formOficina.touched.telefone} onChange={formOficina.handleChange} onBlur={formOficina.handleBlur} placeholder="(00) 00000-0000" mask={maskPhone} required />
                <CepInput value={formOficina.values.endereco} onChange={v => formOficina.handleChange({ target: { name: 'endereco', value: v } })} />
                <FormInput label="Logo (URL)" name="logo" value={formOficina.values.logo} error={formOficina.errors.logo} touched={formOficina.touched.logo} onChange={formOficina.handleChange} onBlur={formOficina.handleBlur} placeholder="https://..." helpText="Opcional: URL da logo da sua oficina" />

                {erro && <div className="cad-err"><IconAlert />{erro}</div>}

                <button className="cad-btn" type="submit" disabled={formOficina.isSubmitting}>
                  {formOficina.isSubmitting ? <span className="cad-spin" /> : <>Concluir cadastro <IconArrow /></>}
                </button>
              </form>

              <div className="cad-trust">
                <span className="cad-ti">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Dados seguros
                </span>
                <span className="cad-td" />
                <span className="cad-ti">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  7 dias grátis
                </span>
                <span className="cad-td" />
                <span className="cad-ti">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Sem fidelidade
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Step 1: dados pessoais ───────────────────────────────────
  return (
    <>
      <CadStyles />
      <div className={`cad cad-screen${mounted ? ' vis' : ''}`}>
        <LeftPanel />
        <div className="cad-right">
          <div className="cad-card">
            <div style={{ marginBottom: 24 }}>
              <img src="/teste sem fundo 1.png" alt="Chave 10" style={{ height: 40, objectFit: 'contain' }} />
            </div>
            <StepIndicator />
            <h1 className="cad-title">Criar conta grátis</h1>
            <p className="cad-sub">7 dias grátis. Sem cartão de crédito.</p>

            {googleClientId && (
              <div style={{ marginBottom: 18 }}>
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setErro('Falha ao conectar com o Google')} width="100%" text="signup_with" shape="rectangular" logo_alignment="left" locale="pt-BR" />
              </div>
            )}
            {googleClientId && (
              <div className="cad-divider">
                <span className="cad-dline" />
                <span className="cad-dtext">ou preencha os dados</span>
                <span className="cad-dline" />
              </div>
            )}

            <form onSubmit={handleCadastroSubmit}>
              <FormInput label="Nome completo do responsável" name="nome" value={formPessoal.values.nome} error={formPessoal.errors.nome} touched={formPessoal.touched.nome} onChange={formPessoal.handleChange} onBlur={formPessoal.handleBlur} placeholder="Seu nome e sobrenome" required />
              <FormInput label="E-mail" name="email" type="email" value={formPessoal.values.email} error={formPessoal.errors.email} touched={formPessoal.touched.email} onChange={formPessoal.handleChange} onBlur={formPessoal.handleBlur} placeholder="seu@email.com" required />
              <FormInput label="Senha" name="senha" type="password" value={formPessoal.values.senha} error={formPessoal.errors.senha} touched={formPessoal.touched.senha} onChange={formPessoal.handleChange} onBlur={formPessoal.handleBlur} placeholder="Mínimo 6 caracteres" helpText="Use letras, números e símbolos para maior segurança" required />
              <FormInput label="Confirmar senha" name="confirmarSenha" type="password" value={formPessoal.values.confirmarSenha} error={formPessoal.errors.confirmarSenha} touched={formPessoal.touched.confirmarSenha} onChange={formPessoal.handleChange} onBlur={formPessoal.handleBlur} placeholder="Digite a senha novamente" required />

              {erro && <div className="cad-err"><IconAlert />{erro}</div>}

              <button className="cad-btn" type="submit" disabled={formPessoal.isSubmitting}>
                {formPessoal.isSubmitting ? <span className="cad-spin" /> : <>Criar conta grátis <IconArrow /></>}
              </button>
            </form>

            <div className="cad-login-row">
              Já tem uma conta?{' '}
              <button type="button" className="cad-lnk" onClick={() => navigate('/login')}>Entrar</button>
            </div>

            <div className="cad-trust">
              <span className="cad-ti">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Dados seguros
              </span>
              <span className="cad-td" />
              <span className="cad-ti">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                7 dias grátis
              </span>
              <span className="cad-td" />
              <span className="cad-ti">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Sem fidelidade
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
