import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
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
            <button className="lp-nav-cta" onClick={() => navigate('/cadastro')}>Teste grátis 7 dias</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-hero-content lp-reveal">
            <h1 className="lp-hero-title">
              Mais controle. Menos bagunça.<br/>
              <span>Mais lucro para sua oficina.</span>
            </h1>
            <p className="lp-hero-sub">
              Organize clientes, ordens de serviço e faturamento em um único sistema. Use pelo computador ou celular.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-btn-primary" onClick={() => navigate('/cadastro')}>Teste grátis por 7 dias</button>
              <a className="lp-btn-outline" href="https://wa.me/5516992915540" target="_blank" rel="noopener">Ver demonstração</a>
            </div>
            <div className="lp-hero-trust">
              <span>✓ Sem cartão de crédito</span>
              <span>✓ Configuração rápida</span>
              <span>✓ Suporte humanizado</span>
            </div>
          </div>
          <div className="lp-hero-mockup lp-reveal lp-reveal-delay-2">
            <div className="lp-mockup-laptop">
              <div className="lp-mockup-screen">
                {/* Simula sidebar + dashboard */}
                <div className="lp-mock-sidebar">
                  <div className="lp-mock-sidebar-item active"></div>
                  <div className="lp-mock-sidebar-item"></div>
                  <div className="lp-mock-sidebar-item"></div>
                  <div className="lp-mock-sidebar-item"></div>
                </div>
                <div className="lp-mock-main">
                  <div className="lp-mock-topbar"></div>
                  <div className="lp-mock-stats">
                    <div className="lp-mock-stat"><div className="lp-mock-stat-val"></div><div className="lp-mock-stat-label"></div></div>
                    <div className="lp-mock-stat"><div className="lp-mock-stat-val orange"></div><div className="lp-mock-stat-label"></div></div>
                    <div className="lp-mock-stat"><div className="lp-mock-stat-val green"></div><div className="lp-mock-stat-label"></div></div>
                  </div>
                  <div className="lp-mock-chart">
                    <div className="lp-mock-bar" style={{height:'40%'}}></div>
                    <div className="lp-mock-bar" style={{height:'65%'}}></div>
                    <div className="lp-mock-bar" style={{height:'45%'}}></div>
                    <div className="lp-mock-bar" style={{height:'80%'}}></div>
                    <div className="lp-mock-bar active" style={{height:'60%'}}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lp-mockup-phone">
              <div className="lp-mock-phone-header"></div>
              <div className="lp-mock-phone-card"></div>
              <div className="lp-mock-phone-card accent"></div>
              <div className="lp-mock-phone-card"></div>
              <div className="lp-mock-phone-btn"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DOR ── */}
      <section className="lp-pain">
        <div className="lp-container">
          <div className="lp-pain-header lp-reveal">
            <p className="lp-section-label">O problema</p>
            <h2 className="lp-section-title">Sua oficina passa por isso?</h2>
          </div>
          <div className="lp-pain-grid">
            {[
              { icon: '📋', title: 'Papel para todo lado', desc: 'Fichas, anotações e recibos que se perdem com o tempo.' },
              { icon: '💸', title: 'Orçamentos perdidos', desc: 'Clientes que somem porque o orçamento nunca chegou.' },
              { icon: '📞', title: 'Cliente perguntando do carro', desc: 'Ligações constantes pedindo status que você não tem.' },
              { icon: '📊', title: 'Falta controle financeiro', desc: 'Não sabe quanto entrou, quanto saiu, nem o lucro real.' },
              { icon: '🗂️', title: 'Informações espalhadas', desc: 'Dados em cadernos, WhatsApp, planilhas e cabeça do dono.' },
              { icon: '⏰', title: 'Tempo perdido', desc: 'Horas gastas procurando informação que deveria estar em um clique.' },
            ].map((item, i) => (
              <div key={i} className={`lp-pain-card lp-reveal lp-reveal-delay-${i % 3}`}>
                <div className="lp-pain-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="lp-pain-resolve lp-reveal">O <span>Chave 10</span> resolve tudo isso.</p>
        </div>
      </section>

      {/* ── BENEFÍCIOS (Editorial) ── */}
      <section className="lp-benefits">
        <div className="lp-container">
          {['Nunca mais perca um orçamento.', 'Saiba exatamente quanto faturou.', 'Atenda seus clientes mais rápido.', 'Tenha toda a oficina organizada.'].map((text, i) => (
            <div key={i} className={`lp-benefit-line lp-reveal lp-reveal-delay-${i}`}>{text}</div>
          ))}
        </div>
      </section>

      {/* ── MOBILE ── */}
      <section className="lp-mobile">
        <div className="lp-container">
          <div className="lp-mobile-content lp-reveal">
            <p className="lp-section-label">Mobilidade</p>
            <h2 className="lp-section-title">Sua oficina na palma da mão.</h2>
            <ul className="lp-mobile-list">
              <li>Abrir OS de qualquer lugar</li>
              <li>Consultar dados de clientes</li>
              <li>Acompanhar faturamento em tempo real</li>
              <li>Acessar pelo celular, tablet ou computador</li>
            </ul>
          </div>
          <div className="lp-mobile-mockup lp-reveal lp-reveal-delay-2">
            <div className="lp-phone-frame">
              <div className="lp-phone-screen">
                <div className="lp-ph-header">OS Recentes</div>
                <div className="lp-ph-os-card">
                  <div className="lp-ph-os-num">#0091</div>
                  <div className="lp-ph-os-name"></div>
                  <div className="lp-ph-os-badge"></div>
                </div>
                <div className="lp-ph-os-card">
                  <div className="lp-ph-os-num">#0090</div>
                  <div className="lp-ph-os-name"></div>
                  <div className="lp-ph-os-badge done"></div>
                </div>
                <div className="lp-ph-os-card">
                  <div className="lp-ph-os-num">#0089</div>
                  <div className="lp-ph-os-name"></div>
                  <div className="lp-ph-os-badge done"></div>
                </div>
                <div className="lp-ph-btn"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="lp-how">
        <div className="lp-container">
          <div className="lp-how-header lp-reveal">
            <p className="lp-section-label">Como funciona</p>
            <h2 className="lp-section-title">Simples como deve ser.</h2>
          </div>
          <div className="lp-timeline">
            {[
              { num: '1', title: 'Cadastre clientes', desc: 'Registre clientes e veículos em segundos.' },
              { num: '2', title: 'Crie OS', desc: 'Abra ordens de serviço e envie orçamentos.' },
              { num: '3', title: 'Controle financeiro', desc: 'Acompanhe entradas, saídas e lucro real.' },
              { num: '4', title: 'Cresça com organização', desc: 'Relatórios e metas para crescer com dados.' },
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

      {/* ── COMPARAÇÃO ── */}
      <section className="lp-compare">
        <div className="lp-container">
          <div className="lp-compare-header lp-reveal">
            <h2 className="lp-section-title">Antes e depois do Chave 10</h2>
          </div>
          <div className="lp-compare-grid">
            <div className="lp-compare-col lp-compare-col--without lp-reveal">
              <h3>✕ Sem Chave 10</h3>
              <ul className="lp-compare-list">
                <li>Anotações em papel que se perdem</li>
                <li>Orçamentos esquecidos no WhatsApp</li>
                <li>Sem ideia do faturamento real</li>
                <li>Cliente ligando pedindo status</li>
                <li>Informações espalhadas em vários lugares</li>
              </ul>
            </div>
            <div className="lp-compare-col lp-compare-col--with lp-reveal lp-reveal-delay-1">
              <h3>✓ Com Chave 10</h3>
              <ul className="lp-compare-list">
                <li>Tudo digital, organizado e acessível</li>
                <li>Orçamentos enviados em segundos</li>
                <li>Dashboard com faturamento em tempo real</li>
                <li>Status atualizado para cada OS</li>
                <li>Um só sistema, qualquer dispositivo</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── PREÇO ── */}
      <section className="lp-pricing">
        <div className="lp-container">
          <div className="lp-pricing-header lp-reveal">
            <p className="lp-section-label">Investimento</p>
            <h2 className="lp-section-title">Preço justo para sua oficina crescer.</h2>
          </div>
          <div className="lp-pricing-card lp-reveal">
            <div className="lp-pricing-badge">Oferta de lançamento — apenas 10 vagas</div>
            <h3 className="lp-pricing-name">Plano Fundadores</h3>
            <div className="lp-pricing-price">R$29<span>/mês</span></div>
            <p className="lp-pricing-old">Preço normal: R$59/mês</p>
            <ul className="lp-pricing-features">
              <li>Clientes e veículos ilimitados</li>
              <li>Ordens de serviço ilimitadas</li>
              <li>Orçamentos via WhatsApp</li>
              <li>Dashboard com métricas em tempo real</li>
              <li>Acesso multi-dispositivo</li>
              <li>Suporte prioritário por WhatsApp</li>
            </ul>
            <button className="lp-btn-primary" onClick={() => navigate('/cadastro')} style={{width:'100%',justifyContent:'center'}}>Teste grátis por 7 dias</button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-faq">
        <div className="lp-container">
          <div className="lp-faq-header lp-reveal">
            <p className="lp-section-label">Dúvidas</p>
            <h2 className="lp-section-title">Perguntas frequentes</h2>
          </div>
          <div className="lp-faq-list">
            {[
              { q: 'Preciso instalar alguma coisa?', a: 'Não. O Chave 10 funciona direto no navegador, sem instalar nada. Acesse pelo computador, tablet ou celular.' },
              { q: 'Meus dados ficam seguros?', a: 'Sim. Utilizamos criptografia e backups automáticos diários. Seus dados ficam protegidos e acessíveis apenas por você.' },
              { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem fidelidade, sem multa. Cancele quando quiser diretamente pelo sistema.' },
              { q: 'Funciona para oficinas pequenas?', a: 'Com certeza. O Chave 10 foi feito para oficinas de todos os tamanhos, do mecânico solo à equipe com vários funcionários.' },
              { q: 'Tem suporte se eu precisar de ajuda?', a: 'Sim. Suporte humanizado via WhatsApp. Respondemos rápido e ajudamos você a configurar tudo.' },
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

      {/* ── CTA FINAL ── */}
      <section className="lp-final-cta">
        <div className="lp-container">
          <h2 className="lp-reveal">Organize sua oficina hoje.</h2>
          <button className="lp-btn-primary lp-reveal lp-reveal-delay-1" onClick={() => navigate('/cadastro')}>Teste grátis por 7 dias</button>
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
              <a href="https://wa.me/5516992915540" target="_blank" rel="noopener">WhatsApp</a>
              <a href="mailto:chave10sistema@gmail.com">Email</a>
              <span className="lp-footer-link" onClick={() => navigate('/politica-privacidade')} style={{cursor:'pointer'}}>Política de Privacidade</span>
              <span className="lp-footer-link" onClick={() => navigate('/termos-uso')} style={{cursor:'pointer'}}>Termos de Uso</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
