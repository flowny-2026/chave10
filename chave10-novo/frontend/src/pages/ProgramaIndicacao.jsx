/**
 * ProgramaIndicacao.jsx — Página pública do Programa de Indicação
 * Rota: /indicar
 * Pública — não exige login.
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { registrarCliqueReferral } from '../api';

const COMISSAO_UNIT = 24.95;
const PRECO_PLANO   = 49.90;

const fmt = {
  currency: v =>
    'R$\u00a0' + parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
};

/* ── SVG icons ── */
const IcoCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoArrow = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export default function ProgramaIndicacao() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cadastroRef = useRef(null);
  const simuladorRef = useRef(null);
  const [qtd, setQtd] = useState(10);

  // Preserva ?ref no sessionStorage ao visitar esta página também
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode && /^C10-[A-F0-9]{6}$/.test(refCode)) {
      sessionStorage.setItem('c10_ref', refCode);
      registrarCliqueReferral(refCode);
    }
    window.scrollTo(0, 0);
  }, [searchParams]);

  function irParaCadastro() {
    cadastroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function irParaSimulador() {
    simuladorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const ganho = (qtd * COMISSAO_UNIT).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const EXEMPLOS = [1, 5, 10, 20, 50, 100];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1F2937', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(15,27,45,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <img src="/teste sem fundo 2.png" alt="Chave 10"
          style={{ height: 36, objectFit: 'contain', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/')} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.65)',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: '8px 10px',
              whiteSpace: 'nowrap' }}>
            Entrar
          </button>
          <button onClick={irParaCadastro}
            style={{ background: '#F97316', border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              padding: '9px 16px', borderRadius: 8,
              boxShadow: '0 2px 12px rgba(249,115,22,.4)',
              whiteSpace: 'nowrap' }}>
            Cadastrar grátis
          </button>
        </div>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section style={{
        background: 'radial-gradient(ellipse 130% 90% at 60% 30%, #1a3558 0%, #0a1525 65%)',
        padding: '140px 24px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* glow decorativo */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-150px',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.13) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(249,115,22,.12)', border: '1px solid rgba(249,115,22,.3)',
          color: '#F97316', borderRadius: 100, padding: '5px 14px',
          fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
          marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316',
            boxShadow: '0 0 8px 2px rgba(249,115,22,.8)', display: 'inline-block' }} />
          Programa de Indicação
        </div>

        <h1 style={{
          fontFamily: 'Poppins, sans-serif',
          fontSize: 'clamp(2rem, 5vw, 3.6rem)',
          fontWeight: 900, color: '#fff',
          lineHeight: 1.1, letterSpacing: '-.03em',
          maxWidth: 720, margin: '0 auto 20px',
        }}>
          Indicou, fechou,{' '}
          <span style={{
            background: 'linear-gradient(90deg,#F97316,#fbbf24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>ganhou!</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'rgba(255,255,255,.72)',
          maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.75,
        }}>
          Indique oficinas para o Chave 10 e ganhe{' '}
          <strong style={{ color: '#fff' }}>{fmt.currency(COMISSAO_UNIT)}</strong>{' '}
          por cada novo cliente que contratar o plano mensal e pagar a primeira mensalidade.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={irParaCadastro}
            style={{
              background: 'linear-gradient(135deg,#F97316,#f45c08)',
              border: 'none', color: '#fff',
              padding: '17px 36px', borderRadius: 12, cursor: 'pointer',
              fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 6px 28px rgba(249,115,22,.4)',
            }}>
            Quero ser um indicador <IcoArrow />
          </button>
          <button onClick={irParaSimulador}
            style={{
              background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.18)',
              color: 'rgba(255,255,255,.85)', padding: '17px 28px', borderRadius: 12, cursor: 'pointer',
              fontSize: '1rem', fontWeight: 600,
            }}>
            Simular meus ganhos
          </button>
        </div>

        {/* trust */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap',
          marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
          <span>Cadastro gratuito</span>
          <span>Sem necessidade de ter oficina</span>
          <span>{fmt.currency(COMISSAO_UNIT)} por cliente pagante</span>
        </div>
      </section>

      {/* ══ COMO FUNCIONA ═════════════════════════════════════ */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '.07em', color: '#F97316',
              background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)',
              borderRadius: 100, padding: '4px 12px', marginBottom: 14 }}>Como funciona</div>
            <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(1.6rem,3.5vw,2.4rem)',
              fontWeight: 900, color: '#0f1f38', letterSpacing: '-.02em', margin: 0 }}>
              4 passos simples
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 20 }}>
            {[
              { num: '01', title: 'Cadastre-se gratuitamente',
                desc: 'Qualquer pessoa pode participar. Não é obrigatório ter uma oficina no Chave 10.' },
              { num: '02', title: 'Compartilhe seu link',
                desc: 'Após o cadastro você recebe um link exclusivo. Divulgue para oficinas mecânicas.' },
              { num: '03', title: 'A oficina contrata',
                desc: 'Quando a oficina cadastrada pelo seu link pagar o primeiro mês, a indicação é confirmada.' },
              { num: '04', title: 'Receba sua comissão',
                desc: `Você recebe ${fmt.currency(COMISSAO_UNIT)} por cada cliente que efetivamente pagar a primeira mensalidade.` },
            ].map((s, i) => (
              <div key={i} style={{
                background: '#F9FAFB', borderRadius: 16,
                padding: '28px 24px', border: '1px solid #E5E7EB',
              }}>
                <div style={{
                  fontFamily: 'Poppins,sans-serif', fontSize: 13, fontWeight: 800,
                  color: '#F97316', marginBottom: 14, letterSpacing: '.02em',
                }}>{s.num}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f1f38', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: '#6B7280', lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ REGRAS ═══════════════════════════════════════════ */}
      <section style={{ background: '#F3F4F6', padding: '72px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(1.4rem,3vw,2rem)',
            fontWeight: 900, color: '#0f1f38', textAlign: 'center', marginBottom: 36 }}>
            Regras do programa
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Cadastro gratuito — qualquer pessoa pode participar, mesmo sem ser cliente do Chave 10.',
              `Plano mensal do Chave 10: ${fmt.currency(PRECO_PLANO)}/mês.`,
              `Comissão por novo cliente mensal pagante: ${fmt.currency(COMISSAO_UNIT)} (50% da primeira mensalidade).`,
              'A comissão só é gerada após a confirmação do primeiro pagamento. Teste gratuito não gera comissão.',
              'A comissão é paga uma única vez por cliente indicado — sem recorrência nas mensalidades seguintes.',
              'Não é permitido indicar a si mesmo para obter comissão.',
              'Cada cliente pode ser atribuído a apenas um indicador.',
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12,
                background: '#fff', borderRadius: 10, padding: '14px 18px',
                border: '1px solid #E5E7EB' }}>
                <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(249,115,22,.1)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#F97316', marginTop: 1 }}>
                  <IcoCheck />
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SIMULADOR ════════════════════════════════════════ */}
      <section ref={simuladorRef} style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '.07em', color: '#F97316',
            background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)',
            borderRadius: 100, padding: '4px 12px', marginBottom: 14 }}>Simulador de ganhos</div>

          <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(1.5rem,3vw,2.2rem)',
            fontWeight: 900, color: '#0f1f38', letterSpacing: '-.02em', marginBottom: 12 }}>
            Quanto você pode ganhar?
          </h2>
          <p style={{ fontSize: 14.5, color: '#6B7280', lineHeight: 1.7, marginBottom: 40,
            maxWidth: 520, margin: '0 auto 40px' }}>
            Simule quanto você receberia se as oficinas indicadas contratassem o plano mensal
            e pagassem a primeira mensalidade.
          </p>

          {/* Slider */}
          <div style={{ background: '#F9FAFB', borderRadius: 20, padding: '36px 32px',
            border: '1px solid #E5E7EB', marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 20 }}>
              Quantas oficinas você pretende indicar que se tornarão clientes pagantes?
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input type="range" min={1} max={100} value={qtd}
                onChange={e => setQtd(+e.target.value)}
                style={{ width: '100%', accentColor: '#F97316', height: 6, cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: '#9CA3AF', marginBottom: 32 }}>
              <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF',
                  textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                  Clientes pagantes
                </div>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 36,
                  fontWeight: 900, color: '#0f1f38' }}>
                  {qtd}
                </div>
              </div>

              <div style={{ fontSize: 28, color: '#D1D5DB' }}>→</div>

              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF',
                  textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                  Comissão projetada
                </div>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 36,
                  fontWeight: 900, color: '#F97316' }}>
                  R$&nbsp;{ganho}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 20, lineHeight: 1.6, margin: '20px 0 0' }}>
              Cálculo: {qtd} cliente{qtd !== 1 ? 's' : ''} × {fmt.currency(COMISSAO_UNIT)} = R$&nbsp;{ganho}
            </p>
          </div>

          {/* Tabela de exemplos */}
          <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden',
            border: '1px solid #E5E7EB', marginBottom: 20, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 260 }}>
              <thead>
                <tr style={{ background: '#1E3A5F' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Clientes pagantes
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12,
                    fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Comissão
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXEMPLOS.map((n) => (
                  <tr key={n} style={{ borderTop: '1px solid #E5E7EB',
                    background: n === qtd ? 'rgba(249,115,22,.1)' : '#fff',
                    cursor: 'pointer' }}
                    onClick={() => setQtd(n)}>
                    <td style={{ padding: '12px 16px', fontSize: 14,
                      fontWeight: n === qtd ? 700 : 500, color: n === qtd ? '#EA6C00' : '#111827' }}>
                      {n} cliente{n !== 1 ? 's' : ''}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14,
                      fontWeight: 700, color: n === qtd ? '#EA6C00' : '#111827' }}>
                      {fmt.currency(n * COMISSAO_UNIT)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 32 }}>
            Simulação ilustrativa, não uma promessa de ganhos. Os valores dependem de oficinas que
            efetivamente contratarem o plano mensal e tiverem o primeiro pagamento confirmado.
            A comissão é paga uma única vez por cliente indicado.
          </p>

          <button onClick={irParaCadastro}
            style={{
              background: 'linear-gradient(135deg,#F97316,#f45c08)',
              border: 'none', color: '#fff',
              padding: '16px 36px', borderRadius: 12, cursor: 'pointer',
              fontSize: '1rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(249,115,22,.35)',
            }}>
            Quero começar a indicar <IcoArrow />
          </button>
        </div>
      </section>

      {/* ══ CADASTRO ════════════════════════════════════════ */}
      <section ref={cadastroRef} style={{
        background: 'radial-gradient(ellipse 120% 100% at 50% 50%, #1a3558 0%, #0a1525 70%)',
        padding: '80px 20px',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(1.5rem,3vw,2rem)',
              fontWeight: 900, color: '#fff', letterSpacing: '-.02em', marginBottom: 10 }}>
              Crie sua conta de indicador
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', lineHeight: 1.7 }}>
              Gratuito. Sem precisar ter uma oficina. Comece a indicar hoje.
            </p>
          </div>

          <FormCadastroIndicador navigate={navigate} />

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
            Já tem conta?{' '}
            <button onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', color: '#F97316', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, padding: 0 }}>
              Entrar
            </button>
          </p>
        </div>
      </section>

      {/* ══ FOOTER SIMPLES ══════════════════════════════════ */}
      <footer style={{ background: '#060e1a', padding: '28px 24px',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
        gap: 12, alignItems: 'center' }}>
        <img src="/teste sem fundo 2.png" alt="Chave 10" style={{ height: 34, objectFit: 'contain' }} />
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Início', to: '/' },
            { label: 'Privacidade', to: '/politica-privacidade' },
            { label: 'Termos', to: '/termos-uso' },
          ].map(l => (
            <button key={l.to} onClick={() => navigate(l.to)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)',
                fontSize: 13, cursor: 'pointer', padding: 0 }}>
              {l.label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}

/* ── Formulário de cadastro ─────────────────────────────────── */
function FormCadastroIndicador({ navigate }) {
  const [form, setForm] = useState({ nome: '', email: '', whatsapp: '', senha: '', confirmar: '', aceite: false });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (form.senha !== form.confirmar) { setErro('As senhas não coincidem.'); return; }
    if (form.senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (!form.aceite) { setErro('Você precisa aceitar os termos para continuar.'); return; }

    setLoading(true);
    try {
      const { cadastrarIndicador, saveToken, saveUser } = await import('../api');
      const result = await cadastrarIndicador({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        whatsapp: form.whatsapp,
        senha: form.senha,
        aceite_termos: true,
      });
      saveToken(result.token);
      saveUser(result.usuario);
      navigate('/painel-indicador');
    } catch (err) {
      setErro(err?.error || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  /* Estilo base dos inputs — fundo branco com texto escuro para máxima
     compatibilidade em iOS/Android (evita textos invisíveis em temas escuros) */
  const inp = {
    background: '#fff',
    border: '1px solid #D1D5DB',
    color: '#111827',
    borderRadius: 10,
    padding: '13px 16px',
    fontSize: 15,
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
    WebkitAppearance: 'none',
  };

  const label = {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,.75)',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', boxSizing: 'border-box' }}>
      {[
        { name: 'nome',     label: 'Nome completo *',  type: 'text',  ph: 'Seu nome completo',  auto: 'name' },
        { name: 'email',    label: 'E-mail *',         type: 'email', ph: 'seu@email.com',       auto: 'email' },
        { name: 'whatsapp', label: 'WhatsApp',         type: 'tel',   ph: '(00) 00000-0000',     auto: 'tel' },
      ].map(f => (
        <div key={f.name}>
          <label style={label}>{f.label}</label>
          <input
            type={f.type} placeholder={f.ph} required={f.name !== 'whatsapp'}
            value={form[f.name]}
            onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
            style={inp} autoComplete={f.auto}
          />
        </div>
      ))}

      {/* Senha */}
      <div>
        <label style={label}>Senha * <span style={{ fontWeight: 400, opacity: .7 }}>(mín. 6 caracteres)</span></label>
        <div style={{ position: 'relative' }}>
          <input
            type={showSenha ? 'text' : 'password'}
            placeholder="••••••••" required
            value={form.senha}
            onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
            style={{ ...inp, paddingRight: 48 }}
            autoComplete="new-password"
          />
          <button type="button" onClick={() => setShowSenha(s => !s)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer',
              fontSize: 17, lineHeight: 1, padding: 4,
            }}>
            {showSenha ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      {/* Confirmar senha */}
      <div>
        <label style={label}>Confirmar senha *</label>
        <input
          type={showSenha ? 'text' : 'password'}
          placeholder="Repita a senha" required
          value={form.confirmar}
          onChange={e => setForm(p => ({ ...p, confirmar: e.target.value }))}
          style={inp} autoComplete="new-password"
        />
        {form.confirmar && form.senha !== form.confirmar && (
          <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 5, margin: '5px 0 0' }}>
            As senhas não coincidem
          </p>
        )}
      </div>

      {/* Aceite — checkbox nativo oculto com label estilizado */}
      <label htmlFor="aceite-termos" style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
        background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)',
        borderRadius: 10, padding: '14px 16px', boxSizing: 'border-box', width: '100%',
      }}>
        {/* Input nativo oculto — acessível e sem bugs de clique */}
        <input
          id="aceite-termos"
          type="checkbox"
          checked={form.aceite}
          onChange={e => setForm(p => ({ ...p, aceite: e.target.checked }))}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        />
        {/* Checkbox visual */}
        <div style={{
          flexShrink: 0, width: 24, height: 24, borderRadius: 6, marginTop: 1,
          background: form.aceite ? '#F97316' : 'rgba(255,255,255,.1)',
          border: `2px solid ${form.aceite ? '#F97316' : 'rgba(255,255,255,.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}>
          {form.aceite && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff"
              strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', lineHeight: 1.65, flex: 1, minWidth: 0 }}>
          Li e aceito os{' '}
          <a href="/termos-uso" target="_blank" rel="noopener"
            onClick={e => e.stopPropagation()}
            style={{ color: '#F97316', textDecoration: 'underline' }}>
            Termos de Uso
          </a>
          {' '}e a{' '}
          <a href="/politica-privacidade" target="_blank" rel="noopener"
            onClick={e => e.stopPropagation()}
            style={{ color: '#F97316', textDecoration: 'underline' }}>
            Política de Privacidade
          </a>
          {' '}do Programa de Indicação.
        </span>
      </label>

      {/* Erro */}
      {erro && (
        <div style={{
          background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.35)',
          borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#fca5a5', lineHeight: 1.5,
        }}>
          {erro}
        </div>
      )}

      <button type="submit" disabled={loading}
        style={{
          background: loading ? 'rgba(249,115,22,.5)' : 'linear-gradient(135deg,#F97316,#f45c08)',
          border: 'none', color: '#fff',
          padding: '16px', borderRadius: 12,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem', fontWeight: 800, marginTop: 4,
          boxShadow: loading ? 'none' : '0 4px 20px rgba(249,115,22,.35)',
          transition: 'all .2s',
        }}>
        {loading ? 'Criando conta…' : 'Criar conta e começar a indicar'}
      </button>
    </form>
  );
}
