import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import '../styles/landing.css';

const WA_LINK = 'https://wa.me/5516992915540?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20Chave%2010!';

function WaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}

function CheckIcon({ color = '#4ade80' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.lp-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">

      {/* ── NAV ── */}
      <nav className="lp-nav" role="navigation" aria-label="Navegação principal">
        <div className="lp-nav-inner">
          <div className="lp-brand">
            Chave <span className="lp-accent">10</span>
          </div>
          <button className="lp-nav-cta" onClick={() => navigate('/cadastro')} aria-label="Testar grátis">
            Testar Grátis
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero" aria-label="Apresentação">
        <div className="lp-hero-orbs" aria-hidden="true">
          <div className="lp-orb lp-orb-1"></div>
          <div className="lp-orb lp-orb-2"></div>
          <div className="lp-orb lp-orb-3"></div>
        </div>
        <div className="lp-container">
          <div className="lp-hero-content lp-fade-up">
            <div className="lp-hero-badge">
              <span className="lp-badge-dot" aria-hidden="true"></span>
              🔥 Oferta de lançamento — R$29/mês
            </div>
            <h1 className="lp-hero-title">
              Sua oficina perde dinheiro<br/>
              <span className="lp-gradient-text">na desorganização?</span>
            </h1>
            <p className="lp-hero-sub">
              Controle clientes, serviços e faturamento em um só lugar. Simples, rápido e profissional.
            </p>
            <div className="lp-hero-actions">
              <button
                className="lp-btn-primary lp-btn-lg lp-btn-glow"
                onClick={() => navigate('/cadastro')}
              >
                TESTAR 7 DIAS GRÁTIS <ArrowIcon />
              </button>
              <a className="lp-btn-whatsapp" href={WA_LINK} target="_blank" rel="noopener noreferrer">
                <WaIcon /> Falar no WhatsApp
              </a>
            </div>
            <p className="lp-hero-note">Sem cartão · Cancele quando quiser</p>
            <div className="lp-hero-pills">
              <div className="lp-hero-pill"><CheckIcon /> Ordens de serviço organizadas</div>
              <div className="lp-hero-pill"><CheckIcon /> Orçamentos via WhatsApp</div>
              <div className="lp-hero-pill"><CheckIcon /> Faturamento em tempo real</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NÚMEROS / PROVA SOCIAL ── */}
      <section className="lp-numbers" aria-label="Números e depoimento">
        <div className="lp-numbers-orb" aria-hidden="true"></div>
        <div className="lp-container">
          <div className="lp-numbers-grid">
            <div className="lp-number-item lp-reveal">
              <div className="lp-number-value">500<span>+</span></div>
              <div className="lp-number-label">Oficinas ativas</div>
            </div>
            <div className="lp-number-item lp-reveal lp-reveal-delay-1">
              <div className="lp-number-value">R$2M<span>+</span></div>
              <div className="lp-number-label">Gerenciados</div>
            </div>
            <div className="lp-number-item lp-reveal lp-reveal-delay-2">
              <div className="lp-number-value">4.9<span>★</span></div>
              <div className="lp-number-label">Avaliação média</div>
            </div>
          </div>
          <div className="lp-testimonial lp-reveal">
            <div className="lp-testimonial-stars">★★★★★</div>
            <p className="lp-testimonial-text">
              "Antes eu perdia serviço no WhatsApp toda semana. Com o Chave 10, tudo ficou organizado em dois dias. Meu faturamento subiu 30% no primeiro mês porque parei de esquecer OS em aberto."
            </p>
            <div className="lp-testimonial-author">
              <div className="lp-testimonial-avatar">R</div>
              <div>
                <div className="lp-testimonial-name">Roberto Alves</div>
                <div className="lp-testimonial-role">Dono da Oficina Alves — Ribeirão Preto, SP</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ANTES X DEPOIS ── */}
      <section className="lp-before-after" aria-label="Antes e depois">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-section-tag">Transformação</div>
            <h2 className="lp-section-title">Chega de perder serviço no WhatsApp</h2>
            <p className="lp-section-sub">Veja a diferença que o Chave 10 faz no dia a dia da sua oficina</p>
          </div>
          <div className="lp-ba-grid">
            <div className="lp-ba-card lp-ba-card-before lp-reveal">
              <div className="lp-ba-header">
                <span className="lp-ba-badge lp-ba-badge-before">❌ ANTES</span>
              </div>
              <ul className="lp-ba-list">
                <li className="lp-ba-item lp-ba-item-before"><span className="lp-ba-emoji">📝</span> Anotações em papel e caderno</li>
                <li className="lp-ba-item lp-ba-item-before"><span className="lp-ba-emoji">📱</span> Orçamentos perdidos no WhatsApp</li>
                <li className="lp-ba-item lp-ba-item-before"><span className="lp-ba-emoji">😤</span> Bagunça e retrabalho constante</li>
                <li className="lp-ba-item lp-ba-item-before"><span className="lp-ba-emoji">💸</span> Serviços esquecidos = dinheiro perdido</li>
                <li className="lp-ba-item lp-ba-item-before"><span className="lp-ba-emoji">🤷</span> Sem controle do faturamento real</li>
              </ul>
            </div>
            <div className="lp-ba-card lp-ba-card-after lp-reveal lp-reveal-delay-1">
              <div className="lp-ba-header">
                <span className="lp-ba-badge lp-ba-badge-after">✅ DEPOIS</span>
              </div>
              <ul className="lp-ba-list">
                <li className="lp-ba-item lp-ba-item-after"><span className="lp-ba-emoji">📋</span> OS digital organizada e rastreável</li>
                <li className="lp-ba-item lp-ba-item-after"><span className="lp-ba-emoji">🚀</span> Orçamento enviado em segundos</li>
                <li className="lp-ba-item lp-ba-item-after"><span className="lp-ba-emoji">😎</span> Cliente cadastrado, histórico completo</li>
                <li className="lp-ba-item lp-ba-item-after"><span className="lp-ba-emoji">💰</span> Faturamento visível em tempo real</li>
                <li className="lp-ba-item lp-ba-item-after"><span className="lp-ba-emoji">🏆</span> Imagem profissional e confiança</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section className="lp-features" aria-label="Funcionalidades">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-section-tag">Funcionalidades</div>
            <h2 className="lp-section-title">Tudo que sua oficina precisa</h2>
            <p className="lp-section-sub">Ferramentas pensadas para o dia a dia do mecânico, sem complicação</p>
          </div>
          <div className="lp-features-grid">
            {[
              { icon: '📊', bg: '#e8eef6', title: 'Dashboard com métricas', desc: 'Faturamento, OS abertas, ticket médio e metas em tempo real. Tudo em uma tela.' },
              { icon: '🔧', bg: '#fff7ed', title: 'Ordens de Serviço digitais', desc: 'Crie, acompanhe e finalize OS rapidamente. Histórico completo de cada serviço.' },
              { icon: '💬', bg: '#f0fdf4', title: 'Orçamentos via WhatsApp', desc: 'Gere orçamentos profissionais e envie direto para o cliente em segundos.' },
              { icon: '🚗', bg: '#f5f3ff', title: 'Histórico de veículos', desc: 'Todo o histórico de manutenções de cada veículo acessível com um clique.' },
              { icon: '💰', bg: '#fef2f2', title: 'Controle financeiro', desc: 'Receitas, despesas e lucro líquido. Saiba exatamente como está sua oficina.' },
              { icon: '🔔', bg: '#f0f9ff', title: 'Lembretes automáticos', desc: 'Notifique clientes sobre revisões e manutenções preventivas no momento certo.' },
            ].map((f, i) => (
              <div key={i} className={`lp-feature-card lp-reveal${i % 3 !== 0 ? ` lp-reveal-delay-${i % 3}` : ''}`}>
                <div className="lp-feature-icon" style={{ background: f.bg }}>
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POR QUE CHAVE 10 ── */}
      <section className="lp-why" aria-label="Por que Chave 10">
        <div className="lp-why-orb" aria-hidden="true"></div>
        <div className="lp-container">
          <div className="lp-why-quote lp-reveal">
            <div className="lp-why-quote-mark">"</div>
            <p className="lp-why-quote-text">
              Assim como a chave 10 não pode faltar na oficina, organização também não pode faltar no seu negócio.
            </p>
          </div>
          <div className="lp-why-pillars">
            <div className="lp-why-pillar lp-reveal">
              <div className="lp-why-pillar-icon">⚡</div>
              <h3>Simples</h3>
              <p>Interface intuitiva que qualquer mecânico aprende em minutos. Sem treinamento, sem complicação.</p>
            </div>
            <div className="lp-why-pillar lp-reveal lp-reveal-delay-1">
              <div className="lp-why-pillar-icon">🎯</div>
              <h3>Completo</h3>
              <p>OS, clientes, veículos, financeiro, estoque e lembretes. Tudo em um só lugar.</p>
            </div>
            <div className="lp-why-pillar lp-reveal lp-reveal-delay-2">
              <div className="lp-why-pillar-icon">💎</div>
              <h3>Acessível</h3>
              <p>Menos que um almoço por semana. Investimento que se paga no primeiro serviço organizado.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── OFERTA / PREÇOS ── */}
      <section className="lp-pricing" aria-label="Planos e preços">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-section-tag">Preço</div>
            <h2 className="lp-section-title">Oferta de Lançamento</h2>
            <p className="lp-section-sub">Garanta agora antes que o preço suba</p>
          </div>
          <div className="lp-pricing-card lp-reveal">
            <div className="lp-pricing-top">
              <div className="lp-pricing-badge">🔥 Oferta de Lançamento</div>
              <div className="lp-pricing-title">Plano Completo</div>
              <div className="lp-pricing-urgency">⚠️ Restam poucas vagas com esse preço</div>
            </div>
            <div className="lp-pricing-body">
              <div className="lp-pricing-price">
                <div className="lp-pricing-old">De R$59/mês</div>
                <div className="lp-pricing-new">
                  <sup>R$</sup>29<sub>/mês</sub>
                </div>
              </div>
              <ul className="lp-pricing-list">
                {[
                  'Ordens de Serviço ilimitadas',
                  'Clientes e veículos ilimitados',
                  'Orçamentos via WhatsApp',
                  'Dashboard financeiro completo',
                  'Controle de estoque',
                  'Lembretes automáticos',
                  'Suporte via WhatsApp',
                  '7 dias grátis para testar',
                ].map((item, i) => (
                  <li key={i} className="lp-pricing-item">
                    <span className="lp-pricing-item-check">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                className="lp-btn-primary lp-btn-xl lp-btn-glow"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => navigate('/cadastro')}
              >
                GARANTIR MINHA VAGA <ArrowIcon />
              </button>
              <p className="lp-pricing-note">Sem cartão de crédito · Cancele quando quiser</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="lp-how" aria-label="Como funciona">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-section-tag">Como funciona</div>
            <h2 className="lp-section-title">Três passos para organizar sua oficina</h2>
            <p className="lp-section-sub">Comece a usar em minutos, sem treinamento</p>
          </div>
          <div className="lp-steps">
            <div className="lp-step lp-reveal">
              <div className="lp-step-num">01</div>
              <div className="lp-step-icon">📝</div>
              <h3>Cadastre</h3>
              <p>Crie sua conta em 2 minutos. Cadastre seus clientes e veículos de forma simples e rápida.</p>
            </div>
            <div className="lp-step-arrow lp-reveal lp-reveal-delay-1" aria-hidden="true">→</div>
            <div className="lp-step lp-reveal lp-reveal-delay-1">
              <div className="lp-step-num">02</div>
              <div className="lp-step-icon">🔧</div>
              <h3>Organize</h3>
              <p>Abra OS, registre serviços e envie orçamentos pelo WhatsApp. Tudo em um só lugar.</p>
            </div>
            <div className="lp-step-arrow lp-reveal lp-reveal-delay-2" aria-hidden="true">→</div>
            <div className="lp-step lp-reveal lp-reveal-delay-2">
              <div className="lp-step-num">03</div>
              <div className="lp-step-icon">📈</div>
              <h3>Cresça</h3>
              <p>Acompanhe faturamento, metas e relatórios. Tome decisões com dados reais da sua oficina.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-cta" aria-label="Chamada para ação">
        <div className="lp-cta-orbs" aria-hidden="true">
          <div className="lp-orb-cta-1"></div>
          <div className="lp-orb-cta-2"></div>
        </div>
        <div className="lp-container">
          <div className="lp-cta-inner lp-reveal">
            <div className="lp-cta-badge">🚀 Comece hoje mesmo</div>
            <h2 className="lp-cta-title">
              Sua oficina organizada.<br/>
              <span className="lp-gradient-text">Seu faturamento crescendo.</span>
            </h2>
            <p className="lp-cta-sub">
              Junte-se a centenas de mecânicos que já transformaram sua gestão com o Chave 10.
            </p>
            <div className="lp-cta-actions">
              <button
                className="lp-btn-primary lp-btn-xl lp-btn-glow"
                onClick={() => navigate('/cadastro')}
              >
                TESTAR 7 DIAS GRÁTIS <ArrowIcon />
              </button>
              <a className="lp-btn-whatsapp" href={WA_LINK} target="_blank" rel="noopener noreferrer">
                <WaIcon /> Falar no WhatsApp
              </a>
            </div>
            <p className="lp-cta-note">Sem cartão · Cancele quando quiser · Suporte via WhatsApp</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-brand" style={{ color: 'rgba(255,255,255,.45)' }}>
              Chave <span className="lp-accent">10</span>
            </div>
            <span>© {new Date().getFullYear()} Chave 10 · A ferramenta que faltava na sua gestão</span>
          </div>
        </div>
      </footer>

      {/* ── WHATSAPP FLUTUANTE ── */}
      <a
        className="lp-whatsapp-float"
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        title="Falar no WhatsApp"
      >
        <WaIcon />
      </a>

      {/* ── CTA MOBILE FIXO ── */}
      <div className="lp-mobile-cta" role="complementary" aria-label="Ação rápida mobile">
        <button
          className="lp-mobile-cta-btn"
          onClick={() => navigate('/cadastro')}
        >
          TESTAR 7 DIAS GRÁTIS <ArrowIcon />
        </button>
      </div>

    </div>
  );
}
