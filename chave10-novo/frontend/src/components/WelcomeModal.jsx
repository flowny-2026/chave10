import '../styles/onboarding.css';

/**
 * Modal de boas-vindas exibido no primeiro acesso
 * Apresenta o sistema e oferece tour guiado
 */
export default function WelcomeModal({ onStartTour, onSkip }) {
  return (
    <div className="onboarding-overlay">
      <div className="welcome-modal">
        <div className="welcome-header">
          <div className="welcome-logo">
            <span className="brand-text">Chave <span style={{color:'var(--accent)'}}>10</span></span>
          </div>
          <h1 className="welcome-title">Bem-vindo à sua Oficina Digital! 🎉</h1>
          <p className="welcome-subtitle">
            Vamos te mostrar como aproveitar ao máximo o sistema
          </p>
        </div>

        <div className="welcome-body">
          <div className="welcome-features">
            <div className="welcome-feature">
              <div className="feature-icon" style={{background:'var(--brand-light)',color:'var(--brand)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <h3>Gerencie Clientes</h3>
                <p>Cadastro completo com histórico de serviços</p>
              </div>
            </div>

            <div className="welcome-feature">
              <div className="feature-icon" style={{background:'#7c3aed12',color:'#7c3aed'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <div>
                <h3>Ordens de Serviço</h3>
                <p>Crie, gerencie e finalize OS com facilidade</p>
              </div>
            </div>

            <div className="welcome-feature">
              <div className="feature-icon" style={{background:'var(--success-light)',color:'var(--success)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div>
                <h3>Controle Financeiro</h3>
                <p>Acompanhe receitas, despesas e metas</p>
              </div>
            </div>

            <div className="welcome-feature">
              <div className="feature-icon" style={{background:'var(--info-light)',color:'var(--info)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
              </div>
              <div>
                <h3>Estoque e Patrimônio</h3>
                <p>Controle completo de peças e ferramentas</p>
              </div>
            </div>
          </div>

          <div className="welcome-checklist">
            <h3 style={{fontSize:15,fontWeight:700,color:'var(--gray-700)',marginBottom:12}}>
              ✨ Primeiros passos recomendados:
            </h3>
            <div className="checklist-item">
              <div className="checklist-icon">1</div>
              <span>Configure os dados da sua oficina</span>
            </div>
            <div className="checklist-item">
              <div className="checklist-icon">2</div>
              <span>Cadastre seus primeiros clientes</span>
            </div>
            <div className="checklist-item">
              <div className="checklist-icon">3</div>
              <span>Crie sua primeira ordem de serviço</span>
            </div>
            <div className="checklist-item">
              <div className="checklist-icon">4</div>
              <span>Defina sua meta mensal</span>
            </div>
          </div>
        </div>

        <div className="welcome-footer">
          <button className="btn btn-ghost" onClick={onSkip}>
            Explorar sozinho
          </button>
          <button className="btn btn-primary btn-lg" onClick={onStartTour}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:8}}>
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Fazer Tour Guiado (2 min)
          </button>
        </div>
      </div>
    </div>
  );
}
