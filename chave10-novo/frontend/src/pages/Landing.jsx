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

      {/* ── NAV ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <img src="/teste sem fundo 2.png" alt="Chave 10" className="lp-logo-img" />
          <div className="lp-nav-actions">
            <button className="lp-nav-login" onClick={() => navigate('/login')}>Entrar</button>
            <button className="lp-nav-cta" onClick={() => navigate('/cadastro')}>
              Teste grátis 7 dias →
            </button>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="lp-hero">
        {/* Partículas decorativas */}
        <div className="lp-hero-glow lp-hero-glow--1" />
        <div className="lp-hero-glow lp-hero-glow--2" />
        <div className="lp-hero-glow lp-hero-glow--3" />

        <div className="lp-container">
          <div className="lp-hero-content lp-reveal">
            {/* Badge urgência */}
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
              O <strong>Chave 10</strong> coloca todas as suas OS, clientes,
              orçamentos e faturamento em um único lugar.
              Você foca em consertar carros. O sistema cuida do resto.
            </p>

            <div className="lp-hero-actions">
              <button className="lp-btn-hero" onClick={() => navigate('/cadastro')}>
                <span>Começar grátis agora</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
              <a className="lp-btn-ghost" href="https://wa.me/5516992383821" target="_blank" rel="noopener">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.122 1.534 5.86L.057 23.126a.75.75 0 0 0 .923.899l5.444-1.744A11.951 11.951 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.716 9.716 0 0 1-4.953-1.355l-.354-.213-3.672 1.175 1.13-3.562-.231-.369A9.71 9.71 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                Falar no WhatsApp
              </a>
            </div>

            <div className="lp-hero-trust">
              <span>✓ 7 dias grátis</span>
              <span>✓ Sem cartão</span>
              <span>✓ Cancela quando quiser</span>
            </div>
          </div>

          {/* Mockups */}
          <div className="lp-hero-mockup lp-reveal lp-reveal-delay-2">
            <div className="lp-mockup-laptop">
              <img src="/mockup pc.jpg" alt="Dashboard Chave 10" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:6,display:'block'}} />
            </div>
            <div className="lp-mockup-phone-real">
              <img src="/mockup celular.jpeg" alt="Chave 10 mobile" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:20,display:'block'}} />
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAIXA SOCIAL PROOF ════════════════════════════════ */}
      <div className="lp-proof-bar">
        <div className="lp-container">
          <div className="lp-proof-grid">
            {[
              { num: '7 dias',  label: 'Teste grátis, sem cartão' },
              { num: '2 min',   label: 'Para criar sua primeira OS' },
              { num: '100%',    label: 'Na nuvem, sem instalar nada' },
              { num: '24/7',    label: 'Acesso de qualquer dispositivo' },
            ].map((m, i) => (
              <div key={i} className="lp-proof-item">
                <div className="lp-proof-num">{m.num}</div>
                <div className="lp-proof-label">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ PROBLEMA ══════════════════════════════════════════ */}
      <section className="lp-pain">
        <div className="lp-container">
          <div className="lp-pain-header lp-reveal">
            <div className="lp-section-tag">O problema</div>
            <h2 className="lp-section-h2">Reconhece alguma dessas situações?</h2>
          </div>
          <div className="lp-pain-grid">
            {[
              { icon: '📋', title: 'OS em papel que some', desc: 'Fichas rasgadas, anotações ilegíveis e informação que vai junto com o lixo.' },
              { icon: '💸', title: 'Orçamento que não fecha', desc: 'Cliente aprovou, mas você nem sabe mais o que estava incluso.' },
              { icon: '📞', title: '"Quando fica meu carro?"', desc: 'Ligação atrás de ligação por falta de status atualizado.' },
              { icon: '📊', title: 'Faturamento no escuro', desc: 'Fim do mês chega e você não sabe quanto entrou, quanto saiu.' },
              { icon: '🗂️', title: 'Informação espalhada', desc: 'Caderno, WhatsApp, planilha, cabeça do dono — tudo ao mesmo tempo.' },
              { icon: '⏰', title: 'Tempo jogado fora', desc: 'Horas procurando dado que deveria estar em um clique.' },
            ].map((item, i) => (
              <div key={i} className={`lp-pain-card lp-reveal lp-reveal-delay-${i % 3}`}>
                <div className="lp-pain-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-pain-resolve lp-reveal">
            O <span>Chave 10</span> resolve tudo isso — hoje mesmo.
          </div>
        </div>
      </section>

      {/* ══ FRASES EDITORIAIS ═════════════════════════════════ */}
      <section className="lp-benefits">
        <div className="lp-container">
          {[
            'Nunca mais perca um orçamento.',
            'Saiba exatamente quanto faturou.',
            'Atenda seus clientes mais rápido.',
            'Tenha toda a oficina na palma da mão.',
          ].map((text, i) => (
            <div key={i} className={`lp-benefit-line lp-reveal lp-reveal-delay-${i}`}>{text}</div>
          ))}
        </div>
      </section>

      {/* ══ FUNCIONALIDADES ════════════════════════════════════ */}
      <section className="lp-features">
        <div className="lp-container">
          <div className="lp-features-header lp-reveal">
            <div className="lp-section-tag">Funcionalidades</div>
            <h2 className="lp-section-h2">Tudo que sua oficina precisa em um só sistema.</h2>
          </div>
          <div className="lp-features-grid">
            {[
              {
                icon: '🔧',
                title: 'Ordens de Serviço',
                desc: 'Crie, edite e finalize OS em segundos. Registre serviços, peças e gere comprovante para o cliente.',
                badge: 'Principal',
              },
              {
                icon: '💬',
                title: 'Orçamentos via WhatsApp',
                desc: 'Envie orçamentos profissionais diretamente no WhatsApp. Cliente aprova com um clique.',
                badge: null,
              },
              {
                icon: '📈',
                title: 'Dashboard financeiro',
                desc: 'Faturamento, despesas, lucro e OS em andamento. Tudo em tempo real, sem planilha.',
                badge: null,
              },
              {
                icon: '📅',
                title: 'Agenda integrada',
                desc: 'Agende clientes e receba alertas automáticos de retorno e manutenções vencendo.',
                badge: null,
              },
              {
                icon: '📱',
                title: 'Funciona no celular',
                desc: 'Acesse de qualquer dispositivo. Celular, tablet ou computador. Sem instalar nada.',
                badge: 'Popular',
              },
              {
                icon: '🔩',
                title: 'Controle de estoque',
                desc: 'Gerencie peças, alertas de estoque mínimo e controle o que entra e sai da oficina.',
                badge: null,
              },
            ].map((f, i) => (
              <div key={i} className={`lp-feature-card lp-reveal lp-reveal-delay-${i % 3}`}>
                {f.badge && <div className="lp-feature-badge">{f.badge}</div>}
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMO FUNCIONA ═════════════════════════════════════ */}
      <section className="lp-how">
        <div className="lp-container">
          <div className="lp-how-header lp-reveal">
            <div className="lp-section-tag">Como funciona</div>
            <h2 className="lp-section-h2">Comece em 4 passos simples.</h2>
          </div>
          <div className="lp-timeline">
            {[
              { num: '1', title: 'Crie sua conta', desc: 'Cadastro em menos de 2 minutos. Sem cartão de crédito.' },
              { num: '2', title: 'Cadastre clientes', desc: 'Adicione clientes e veículos. Importe do WhatsApp ou digita na hora.' },
              { num: '3', title: 'Abra a primeira OS', desc: 'Registre o serviço, as peças e o valor. Tudo em um formulário simples.' },
              { num: '4', title: 'Acompanhe tudo', desc: 'Dashboard com faturamento, OS em andamento e alertas automáticos.' },
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

      {/* ══ COMPARAÇÃO ════════════════════════════════════════ */}
      <section className="lp-compare">
        <div className="lp-container">
          <div className="lp-compare-header lp-reveal">
            <h2 className="lp-section-h2">Como sua oficina fica depois do Chave 10</h2>
          </div>
          <div className="lp-compare-grid">
            <div className="lp-compare-col lp-compare-col--without lp-reveal">
              <h3>✕ Sem Chave 10</h3>
              <ul className="lp-compare-list">
                <li>OS em papel que se perdem</li>
                <li>Orçamento esquecido no WhatsApp</li>
                <li>Faturamento real desconhecido</li>
                <li>Cliente ligando a todo momento</li>
                <li>Informação espalhada em mil lugares</li>
                <li>Tempo perdido procurando dados</li>
              </ul>
            </div>
            <div className="lp-compare-col lp-compare-col--with lp-reveal lp-reveal-delay-1">
              <h3>✓ Com Chave 10</h3>
              <ul className="lp-compare-list">
                <li>Tudo digital, organizado e acessível</li>
                <li>Orçamento enviado e aprovado em segundos</li>
                <li>Dashboard com faturamento em tempo real</li>
                <li>Status atualizado para cada OS</li>
                <li>Um só sistema, qualquer dispositivo</li>
                <li>Informação na ponta dos dedos</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PREÇO ═════════════════════════════════════════════ */}
      <section className="lp-pricing">
        <div className="lp-container">
          <div className="lp-pricing-header lp-reveal">
            <div className="lp-section-tag">Investimento</div>
            <h2 className="lp-section-h2">Menos que um almoço por semana.</h2>
            <p className="lp-pricing-sub">Quanto você perde por mês por falta de organização?</p>
          </div>
          <div className="lp-pricing-card lp-reveal">
            <div className="lp-pricing-badge">🔥 Oferta de lançamento — vagas limitadas</div>
            <h3 className="lp-pricing-name">Plano Completo</h3>
            <div className="lp-pricing-price">
              <span className="lp-pricing-from">de <s>R$59</s> por</span>
              R$29<span className="lp-pricing-mo">/mês</span>
            </div>
            <ul className="lp-pricing-features">
              <li>Clientes e veículos ilimitados</li>
              <li>Ordens de serviço ilimitadas</li>
              <li>Orçamentos profissionais via WhatsApp</li>
              <li>Dashboard financeiro completo</li>
              <li>Controle de estoque</li>
              <li>Agenda com lembretes automáticos</li>
              <li>Acesso em todos os dispositivos</li>
              <li>Suporte humanizado via WhatsApp</li>
            </ul>
            <button className="lp-btn-hero" style={{width:'100%',justifyContent:'center'}} onClick={() => navigate('/cadastro')}>
              Quero testar grátis por 7 dias
            </button>
            <p className="lp-pricing-note">Sem cartão · Sem fidelidade · Cancela quando quiser</p>
          </div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════ */}
      <section className="lp-faq">
        <div className="lp-container">
          <div className="lp-faq-header lp-reveal">
            <div className="lp-section-tag">Dúvidas</div>
            <h2 className="lp-section-h2">Perguntas frequentes</h2>
          </div>
          <div className="lp-faq-list">
            {[
              { q: 'Preciso instalar alguma coisa?', a: 'Não. O Chave 10 funciona direto no navegador. Acesse pelo computador, tablet ou celular sem instalar nada.' },
              { q: 'E se eu não entender de tecnologia?', a: 'O sistema foi feito para ser simples. Se você manda mensagem no WhatsApp, consegue usar o Chave 10. E tem suporte humano se precisar.' },
              { q: 'Meus dados ficam seguros?', a: 'Sim. Criptografia, backups automáticos e acesso restrito por senha. Seus dados são seus.' },
              { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem fidelidade, sem multa. Cancele quando quiser pelo próprio sistema.' },
              { q: 'Funciona para oficina pequena ou solo?', a: 'Foi feito exatamente para isso. Do mecânico solo à equipe com vários funcionários.' },
              { q: 'Como funciona o teste grátis?', a: '7 dias completos, sem cartão. Você usa tudo, sem limitação. Se gostar, assina. Se não gostar, não cobra nada.' },
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

      {/* ══ CTA FINAL ═════════════════════════════════════════ */}
      <section className="lp-final-cta">
        <div className="lp-final-cta-glow" />
        <div className="lp-container" style={{position:'relative',zIndex:2,textAlign:'center'}}>
          <div className="lp-final-cta-tag lp-reveal">Não perca mais tempo</div>
          <h2 className="lp-final-cta-title lp-reveal">
            Sua oficina organizada<br/>
            <span>começa agora.</span>
          </h2>
          <p className="lp-final-cta-sub lp-reveal lp-reveal-delay-1">
            7 dias grátis. Sem cartão. Sem complicação.
          </p>
          <button className="lp-btn-hero lp-reveal lp-reveal-delay-2" style={{margin:'0 auto'}} onClick={() => navigate('/cadastro')}>
            <span>Começar grátis agora</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <img src="/teste sem fundo 2.png" alt="Chave 10" style={{height:40,objectFit:'contain'}} />
              <span>A ferramenta que faltava na sua oficina</span>
            </div>
            <div className="lp-footer-links">
              <a href="https://instagram.com/chave10gestao" target="_blank" rel="noopener">Instagram</a>
              <a href="https://wa.me/5516992383821" target="_blank" rel="noopener">WhatsApp</a>
              <a href="mailto:chave10sistema@gmail.com">Email</a>
              <span className="lp-footer-link" onClick={() => navigate('/politica-privacidade')} style={{cursor:'pointer'}}>Privacidade</span>
              <span className="lp-footer-link" onClick={() => navigate('/termos-uso')} style={{cursor:'pointer'}}>Termos</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
