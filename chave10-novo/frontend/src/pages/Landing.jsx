import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import '../styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Add reveal animations on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.lp-reveal').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <span>Chave <span className="lp-accent">10</span></span>
          </div>
          <button className="lp-nav-cta" onClick={() => navigate('/login')}>Iniciar Demo</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-orbs">
          <div className="lp-orb lp-orb-1"></div>
          <div className="lp-orb lp-orb-2"></div>
          <div className="lp-orb lp-orb-3"></div>
        </div>
        <div className="lp-container">
          <div className="lp-hero-content lp-fade-up">
            <div className="lp-hero-badge">
              <span className="lp-badge-dot"></span>
              A ferramenta que faltava na sua oficina
            </div>
            <h1 className="lp-hero-title">Organize sua oficina.<br/><span className="lp-gradient-text">Cresça com controle.</span></h1>
            <p className="lp-hero-sub">Sistema simples para oficinas mecânicas organizarem clientes, serviços e acompanharem o faturamento.</p>
            <div className="lp-hero-actions">
              <button className="lp-btn-primary lp-btn-glow" onClick={() => navigate('/cadastro')}>
                Iniciar Demo gratuita
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
              <a className="lp-btn-whatsapp" href="https://wa.me/5516992915540?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20Chave%2010!" target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                Falar no WhatsApp
              </a>
              <span className="lp-hero-note-inline">Sem cadastro · Acesso imediato · 100% gratuito</span>
            </div>
            <div className="lp-hero-pills">
              <div className="lp-hero-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Clientes e veículos organizados
              </div>
              <div className="lp-hero-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Orçamentos via WhatsApp
              </div>
              <div className="lp-hero-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Relatórios e metas em tempo real
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="lp-section lp-benefits">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-section-tag">Funcionalidades</div>
            <h2 className="lp-section-title">Tudo que sua oficina precisa</h2>
            <p className="lp-section-sub">Ferramentas pensadas para o dia a dia do mecânico</p>
          </div>
          <div className="lp-benefits-grid">
            <div className="lp-benefit-card lp-reveal">
              <div className="lp-benefit-icon" style={{background:'#e8eef6',color:'#1E3A5F'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </div>
              <h3>Controle total</h3>
              <p>Dashboard com métricas em tempo real. Faturamento, OS abertas, ticket médio e muito mais.</p>
              <div className="lp-benefit-arrow">→</div>
            </div>
            <div className="lp-benefit-card lp-reveal lp-reveal-delay-1">
              <div className="lp-benefit-icon" style={{background:'#fff7ed',color:'#F97316'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <h3>Orçamentos via WhatsApp</h3>
              <p>Crie orçamentos profissionais em segundos e envie direto para o cliente pelo WhatsApp.</p>
              <div className="lp-benefit-arrow">→</div>
            </div>
            <div className="lp-benefit-card lp-reveal lp-reveal-delay-2">
              <div className="lp-benefit-icon" style={{background:'#f0fdf4',color:'#16a34a'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3>Histórico completo</h3>
              <p>Todo o histórico de manutenções de cada veículo acessível com um clique.</p>
              <div className="lp-benefit-arrow">→</div>
            </div>
            <div className="lp-benefit-card lp-reveal lp-reveal-delay-3">
              <div className="lp-benefit-icon" style={{background:'#fef2f2',color:'#dc2626'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h3>Relatórios inteligentes</h3>
              <p>Gráficos de faturamento, metas mensais e análise de desempenho da sua oficina.</p>
              <div className="lp-benefit-arrow">→</div>
            </div>
            <div className="lp-benefit-card lp-reveal lp-reveal-delay-1">
              <div className="lp-benefit-icon" style={{background:'#f5f3ff',color:'#7c3aed'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <h3>Controle de estoque</h3>
              <p>Gerencie peças e ferramentas com alertas de estoque baixo automáticos.</p>
              <div className="lp-benefit-arrow">→</div>
            </div>
            <div className="lp-benefit-card lp-reveal lp-reveal-delay-2">
              <div className="lp-benefit-icon" style={{background:'#f0f9ff',color:'#0284c7'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <h3>Lembretes automáticos</h3>
              <p>Notifique clientes sobre revisões e manutenções preventivas no momento certo.</p>
              <div className="lp-benefit-arrow">→</div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="lp-section lp-how">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-section-tag">Como funciona</div>
            <h2 className="lp-section-title">Três passos para organizar sua oficina</h2>
            <p className="lp-section-sub">Comece a usar em minutos, sem treinamento</p>
          </div>
          <div className="lp-steps-new">
            <div className="lp-step-new lp-reveal">
              <div className="lp-step-num-new">01</div>
              <div className="lp-step-icon-new">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3>Cadastre clientes e veículos</h3>
              <p>Registre seus clientes e os veículos deles em segundos. Tudo organizado e fácil de encontrar.</p>
            </div>
            <div className="lp-step-connector lp-reveal lp-reveal-delay-1">
              <svg width="40" height="16" viewBox="0 0 40 16" fill="none"><path d="M0 8 H32 M28 4 L36 8 L28 12" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="lp-step-new lp-reveal lp-reveal-delay-1">
              <div className="lp-step-num-new">02</div>
              <div className="lp-step-icon-new">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </div>
              <h3>Crie ordens de serviço</h3>
              <p>Abra OS rapidamente, registre serviços, peças e valores. Envie orçamentos pelo WhatsApp.</p>
            </div>
            <div className="lp-step-connector lp-reveal lp-reveal-delay-2">
              <svg width="40" height="16" viewBox="0 0 40 16" fill="none"><path d="M0 8 H32 M28 4 L36 8 L28 12" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="lp-step-new lp-reveal lp-reveal-delay-2">
              <div className="lp-step-num-new">03</div>
              <div className="lp-step-icon-new">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3>Acompanhe o faturamento</h3>
              <p>Veja gráficos, metas e relatórios em tempo real. Saiba exatamente como sua oficina está.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="lp-cta">
        <div className="lp-cta-orbs">
          <div className="lp-orb lp-orb-cta-1"></div>
          <div className="lp-orb lp-orb-cta-2"></div>
        </div>
        <div className="lp-container">
          <div className="lp-cta-inner lp-reveal">
            <div className="lp-cta-badge">Comece agora — é gratuito</div>
            <h2 className="lp-cta-title">Organize sua oficina.<br/>Cresça com dados.</h2>
            <p className="lp-cta-sub">Veja na prática como o Chave 10 pode simplificar sua gestão e aumentar seu faturamento.</p>
            <button className="lp-btn-primary lp-btn-lg lp-btn-glow" onClick={() => navigate('/cadastro')}>
              Iniciar Demo gratuita
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <p className="lp-cta-note">Sem cadastro · Sem cartão de crédito · Acesso imediato</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-brand" style={{color:'rgba(255,255,255,.5)'}}>
              <span>Chave <span className="lp-accent">10</span></span>
            </div>
            <span>© 2026 · A ferramenta que faltava na sua oficina</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
