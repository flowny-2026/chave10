import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getFromStorage } from '../api';
import '../styles/landing.css';

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

/* ── SVG icons ─────────────────────────────────────────────── */
const IcoClipboard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const IcoDollar = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const IcoPhone = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 5.55 5.55l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IcoChart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const IcoFolder = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcoClock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoWrench = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IcoMsg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcoTrend = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IcoCal = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoMobile = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);
const IcoBox = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IcoArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IcoWA = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.122 1.534 5.86L.057 23.126a.75.75 0 0 0 .923.899l5.444-1.744A11.951 11.951 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.716 9.716 0 0 1-4.953-1.355l-.354-.213-3.672 1.175 1.13-3.562-.231-.369A9.71 9.71 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

/* ─── Ícones SVG das dores ──────────────────────────────────── */
const PAIN_ITEMS = [
  { ico: <IcoClipboard/>, title: 'OS em papel que some',     desc: 'Fichas rasgadas, anotações ilegíveis e informações perdidas no dia a dia.' },
  { ico: <IcoDollar/>,   title: 'Orçamento sem controle',   desc: 'Cliente aprovou, mas você já não lembra mais o que estava incluso.' },
  { ico: <IcoPhone/>,    title: '"Quando fica meu carro?"',  desc: 'Ligações e mensagens constantes por falta de status atualizado.' },
  { ico: <IcoChart/>,    title: 'Faturamento no escuro',     desc: 'Fim do mês e você ainda não sabe quanto entrou, quanto saiu.' },
  { ico: <IcoFolder/>,   title: 'Informação espalhada',      desc: 'Caderno, WhatsApp, planilha e memória — todos ao mesmo tempo.' },
  { ico: <IcoClock/>,    title: 'Tempo perdido',             desc: 'Horas procurando um dado que deveria estar em um clique.' },
];

/* ─── Ícones SVG das features ──────────────────────────────── */
const FEATURE_ITEMS = [
  { ico: <IcoWrench/>, title: 'Ordens de Serviço',          desc: 'Crie, edite e finalize OS em segundos. Registre serviços, peças e gere comprovante.',       badge: 'Essencial' },
  { ico: <IcoMsg/>,    title: 'Orçamentos via WhatsApp',    desc: 'Envie orçamentos profissionais diretamente no WhatsApp. Cliente aprova com um clique.',       badge: null },
  { ico: <IcoTrend/>,  title: 'Dashboard financeiro',       desc: 'Faturamento, despesas, lucro e OS em andamento — tudo em tempo real, sem planilha.',         badge: null },
  { ico: <IcoCal/>,    title: 'Agenda integrada',           desc: 'Agende revisões e receba alertas automáticos de retorno e manutenções vencendo.',             badge: null },
  { ico: <IcoMobile/>, title: 'Acesso em qualquer tela',    desc: 'Celular, tablet ou computador. Tudo funciona no navegador, sem instalar nada.',               badge: 'Popular' },
  { ico: <IcoBox/>,    title: 'Controle de estoque',        desc: 'Gerencie peças, alertas de estoque mínimo e histórico do que entra e sai da oficina.',        badge: null },
];

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = getFromStorage('c10_token');
    if (token) {
      const exp = getTokenExp(token);
      if (exp === 0 || exp > Date.now()) {
        const raw = getFromStorage('c10_user');
        let perfil = 'admin_oficina';
        try { perfil = JSON.parse(raw)?.perfil || perfil; } catch {}
        navigate(perfil === 'master_admin' ? '/admin/dashboard' : '/app/dashboard', { replace: true });
        return;
      }
    }
    window.scrollTo(0, 0);
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.lp-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const [faqOpen, setFaqOpen] = useState(null);

  return (
    <div className="landing-page">

      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <img src="/teste sem fundo 2.png" alt="Chave 10" className="lp-logo-img" />
          <div className="lp-nav-actions">
            <button className="lp-nav-login" onClick={() => navigate('/login')}>Entrar</button>
            <button className="lp-nav-cta" onClick={() => navigate('/cadastro')}>Teste grátis 7 dias</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-glow lp-hero-glow--1" />
        <div className="lp-hero-glow lp-hero-glow--2" />
        <div className="lp-container">
          <div className="lp-hero-content lp-reveal">
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              Oferta de lançamento — vagas limitadas
            </div>
            <h1 className="lp-hero-title">
              Chega de perder dinheiro<br/>
              por falta de<br/>
              <span className="lp-hero-title-highlight">organização.</span>
            </h1>
            <p className="lp-hero-sub">
              O <strong>Chave 10</strong> reúne OS, clientes, orçamentos e
              faturamento em um único lugar. Você foca em consertar carros.
              O sistema cuida do resto.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-btn-hero" onClick={() => navigate('/cadastro')}>
                Começar grátis agora <IcoArrow />
              </button>
              <a className="lp-btn-ghost" href="https://wa.me/5516992383821" target="_blank" rel="noopener">
                <IcoWA /> Falar no WhatsApp
              </a>
            </div>
            <div className="lp-hero-trust">
              <span>7 dias grátis</span>
              <span>Sem cartão</span>
              <span>Cancela quando quiser</span>
            </div>
          </div>
          <div className="lp-hero-mockup lp-reveal lp-reveal-delay-2">
            <div className="lp-mockup-laptop">
              <img src="/mockup pc.jpg" alt="Dashboard Chave 10" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
            </div>
            <div className="lp-mockup-phone-real">
              <img src="/mockup celular.jpeg" alt="Chave 10 mobile" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
            </div>
          </div>
        </div>
      </section>

      {/* PROOF BAR */}
      <div className="lp-proof-bar">
        <div className="lp-container">
          <div className="lp-proof-grid">
            {[
              { num: '7 dias', label: 'Teste grátis, sem cartão' },
              { num: '2 min',  label: 'Para criar sua primeira OS' },
              { num: '100%',   label: 'Na nuvem, sem instalar nada' },
              { num: '24/7',   label: 'Acesso em qualquer dispositivo' },
            ].map((m, i) => (
              <div key={i} className="lp-proof-item">
                <div className="lp-proof-num">{m.num}</div>
                <div className="lp-proof-label">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROBLEMA */}
      <section className="lp-pain">
        <div className="lp-container">
          <div className="lp-pain-header lp-reveal" style={{maxWidth:640}}>
            <div className="lp-section-tag">O problema</div>
            <h2 className="lp-section-h2">Sua oficina passa por alguma dessas situações?</h2>
            <p className="lp-section-lead">Se a resposta for sim para qualquer uma delas, o Chave 10 foi feito para você.</p>
          </div>
          <div className="lp-pain-grid">
            {PAIN_ITEMS.map((item, i) => (
              <div key={i} className={`lp-pain-card lp-reveal lp-reveal-delay-${i % 3}`}>
                <div className="lp-pain-ico">{item.ico}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-pain-resolve lp-reveal">
            O <strong>Chave 10</strong> resolve tudo isso.
          </div>
        </div>
      </section>

      {/* FRASES EDITORIAIS */}
      <section className="lp-benefits">
        <div className="lp-container">
          {[
            'Nunca mais perca um orçamento.',
            'Saiba exatamente quanto faturou.',
            'Atenda seus clientes mais rápido.',
            'Toda a sua oficina, na palma da mão.',
          ].map((text, i) => (
            <div key={i} className={`lp-benefit-line lp-reveal lp-reveal-delay-${i}`}>{text}</div>
          ))}
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section className="lp-features">
        <div className="lp-container">
          <div className="lp-features-header lp-reveal" style={{maxWidth:640}}>
            <div className="lp-section-tag">Funcionalidades</div>
            <h2 className="lp-section-h2">Tudo que sua oficina precisa, em um único sistema.</h2>
          </div>
          <div className="lp-features-grid">
            {FEATURE_ITEMS.map((f, i) => (
              <div key={i} className={`lp-feature-card lp-reveal lp-reveal-delay-${i % 3}`}>
                {f.badge && <div className="lp-feature-badge">{f.badge}</div>}
                <div className="lp-feature-ico">{f.ico}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="lp-how">
        <div className="lp-container">
          <div className="lp-how-header lp-reveal" style={{maxWidth:600}}>
            <div className="lp-section-tag">Como funciona</div>
            <h2 className="lp-section-h2">Do cadastro à primeira OS em menos de 5 minutos.</h2>
          </div>
          <div className="lp-timeline">
            {[
              { num: '01', title: 'Crie sua conta',       desc: 'Cadastro em 2 minutos. Sem cartão, sem burocracia.' },
              { num: '02', title: 'Cadastre seus clientes', desc: 'Adicione clientes e veículos rapidamente.' },
              { num: '03', title: 'Abra a primeira OS',   desc: 'Registre serviço, peças e valor em um formulário simples.' },
              { num: '04', title: 'Acompanhe tudo',       desc: 'Dashboard com faturamento e OS em tempo real.' },
            ].map((step, i) => (
              <div key={i} className={`lp-timeline-step lp-reveal lp-reveal-delay-${i}`}>
                <div className="lp-timeline-num">{step.num}</div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARAÇÃO */}
      <section className="lp-compare">
        <div className="lp-container">
          <div className="lp-compare-header lp-reveal">
            <div className="lp-section-tag">Antes e depois</div>
            <h2 className="lp-section-h2">O que muda quando você usa o Chave 10</h2>
          </div>
          <div className="lp-compare-grid" style={{margin:'0 auto'}}>
            <div className="lp-compare-col lp-compare-col--without lp-reveal">
              <div className="lp-compare-col-head lp-compare-col-head--without">Sem Chave 10</div>
              <ul className="lp-compare-list">
                {[
                  'OS em papel que se perdem',
                  'Orçamentos esquecidos no WhatsApp',
                  'Faturamento real desconhecido',
                  'Clientes ligando a todo momento',
                  'Informações espalhadas em vários lugares',
                  'Horas perdidas procurando dados',
                ].map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="lp-compare-col lp-compare-col--with lp-reveal lp-reveal-delay-1">
              <div className="lp-compare-col-head lp-compare-col-head--with">Com Chave 10</div>
              <ul className="lp-compare-list">
                {[
                  'Tudo digital, organizado e acessível',
                  'Orçamento enviado e aprovado em segundos',
                  'Dashboard com faturamento em tempo real',
                  'Status atualizado para cada OS',
                  'Um só sistema, qualquer dispositivo',
                  'Informação na ponta dos dedos',
                ].map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PREÇO */}
      <section className="lp-pricing">
        <div className="lp-container">
          <div className="lp-pricing-header lp-reveal" style={{textAlign:'center',maxWidth:640,margin:'0 auto 48px'}}>
            <div className="lp-section-tag lp-section-tag--light">Investimento</div>
            <h2 className="lp-section-h2 lp-section-h2--white">Menos que um almoço por semana.</h2>
            <p className="lp-pricing-sub">Quanto você perde por mês por falta de organização?</p>
          </div>
          <div className="lp-pricing-card lp-reveal" style={{margin:'0 auto'}}>
            <div className="lp-pricing-badge">Oferta de lançamento — vagas limitadas</div>
            <h3 className="lp-pricing-name">Plano Completo</h3>
            <div className="lp-pricing-price">
              <span className="lp-pricing-from">de <s>R$59</s> por</span>
              R$29<span className="lp-pricing-mo">/mês</span>
            </div>
            <ul className="lp-pricing-features">
              {[
                'Clientes e veículos ilimitados',
                'Ordens de serviço ilimitadas',
                'Orçamentos profissionais via WhatsApp',
                'Dashboard financeiro completo',
                'Controle de estoque',
                'Agenda com lembretes automáticos',
                'Acesso em todos os dispositivos',
                'Suporte humanizado via WhatsApp',
              ].map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <button className="lp-btn-hero" style={{width:'100%',justifyContent:'center'}} onClick={() => navigate('/cadastro')}>
              Quero testar grátis por 7 dias
            </button>
            <p className="lp-pricing-note">Sem cartão de crédito · Sem fidelidade · Cancela quando quiser</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq">
        <div className="lp-container">
          <div className="lp-faq-header lp-reveal" style={{maxWidth:600}}>
            <div className="lp-section-tag">Dúvidas</div>
            <h2 className="lp-section-h2">Perguntas frequentes</h2>
          </div>
          <div className="lp-faq-list">
            {[
              { q: 'Preciso instalar alguma coisa?',         a: 'Não. O Chave 10 funciona direto no navegador. Acesse pelo computador, tablet ou celular, sem instalar nada.' },
              { q: 'E se eu não entender de tecnologia?',    a: 'O sistema foi feito para ser simples. Se você usa WhatsApp, consegue usar o Chave 10. E contamos com suporte humano se precisar.' },
              { q: 'Meus dados ficam seguros?',              a: 'Sim. Utilizamos criptografia e backups automáticos. Seus dados são seus e ficam acessíveis apenas por você.' },
              { q: 'Posso cancelar quando quiser?',          a: 'Sim. Sem fidelidade, sem multa. Cancele a qualquer momento diretamente pelo sistema.' },
              { q: 'Funciona para oficinas pequenas?',       a: 'Foi feito exatamente para isso — do mecânico solo à equipe com vários funcionários.' },
              { q: 'Como funciona o teste grátis?',          a: '7 dias completos, sem cartão. Você usa tudo, sem limitação. Se gostar, assina. Se não gostar, não cobramos nada.' },
            ].map((item, i) => (
              <div key={i} className={`lp-faq-item ${faqOpen === i ? 'active' : ''}`}>
                <button type="button" className="lp-faq-question" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  {item.q}
                  <span className="lp-faq-icon">+</span>
                </button>
                <div className="lp-faq-answer"><p>{item.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="lp-final-cta">
        <div className="lp-final-cta-glow" />
        <div className="lp-container" style={{position:'relative',zIndex:2,textAlign:'center'}}>
          <div className="lp-final-cta-tag lp-reveal">Comece agora</div>
          <h2 className="lp-final-cta-title lp-reveal">
            Sua oficina organizada.<br/>
            <span>Do jeito que você sempre quis.</span>
          </h2>
          <p className="lp-final-cta-sub lp-reveal lp-reveal-delay-1">
            7 dias grátis. Sem cartão. Sem complicação.
          </p>
          <button className="lp-btn-hero lp-reveal lp-reveal-delay-2" style={{margin:'0 auto'}} onClick={() => navigate('/cadastro')}>
            Começar grátis agora <IcoArrow />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <img src="/teste sem fundo 2.png" alt="Chave 10" style={{height:38,objectFit:'contain'}} />
              <span>A ferramenta que faltava na sua oficina</span>
            </div>
            <div className="lp-footer-links">
              <a href="https://instagram.com/chave10gestao" target="_blank" rel="noopener">Instagram</a>
              <a href="https://wa.me/5516992383821" target="_blank" rel="noopener">WhatsApp</a>
              <a href="mailto:chave10sistema@gmail.com">Email</a>
              <span style={{cursor:'pointer'}} onClick={() => navigate('/politica-privacidade')}>Privacidade</span>
              <span style={{cursor:'pointer'}} onClick={() => navigate('/termos-uso')}>Termos</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
