import { useEffect, useState, useCallback } from 'react';
import '../styles/onboarding.css';

/**
 * Tour guiado interativo que destaca elementos da interface
 * e ensina o usuário a usar o sistema passo a passo
 */

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Dashboard - Visão Geral',
    description: 'Este é o coração do sistema! Aqui você vê todas as métricas importantes da sua oficina em tempo real.',
    target: null,
    position: 'center',
    highlightPadding: 0,
  },
  {
    id: 'kpi-cards',
    title: 'Métricas em Tempo Real',
    description: 'Estes cards mostram faturamento, OS finalizadas, clientes e outras métricas importantes. Atualizam automaticamente!',
    target: '[class*="kpi-premium"]',
    position: 'bottom',
    highlightPadding: 12,
  },
  {
    id: 'new-os-btn',
    title: 'Criar Ordem de Serviço',
    description: 'Clique aqui para criar uma nova OS rapidamente. É o botão mais usado do sistema!',
    target: 'button.btn-primary',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'sidebar-clientes',
    title: 'Menu - Clientes',
    description: 'Aqui você gerencia todos os seus clientes. Cadastre dados completos, histórico e muito mais.',
    target: 'a[href="/app/clientes"]',
    position: 'right',
    highlightPadding: 8,
    isSidebarItem: true,
  },
  {
    id: 'sidebar-veiculos',
    title: 'Menu - Veículos',
    description: 'Cadastre os veículos dos clientes com placa, modelo, KM e vincule aos donos.',
    target: 'a[href="/app/veiculos"]',
    position: 'right',
    highlightPadding: 8,
    isSidebarItem: true,
  },
  {
    id: 'sidebar-os',
    title: 'Menu - Ordens de Serviço',
    description: 'Gerencie todas as OS: em andamento, finalizadas, histórico completo e impressão.',
    target: 'a[href="/app/os"]',
    position: 'right',
    highlightPadding: 8,
    isSidebarItem: true,
  },
  {
    id: 'sidebar-financeiro',
    title: 'Menu - Financeiro',
    description: 'Controle completo de receitas, despesas, pagamentos parcelados e relatórios.',
    target: 'a[href="/app/financeiro"]',
    position: 'right',
    highlightPadding: 8,
    isSidebarItem: true,
  },
  {
    id: 'sidebar-estoque',
    title: 'Menu - Estoque',
    description: 'Gerencie peças, ferramentas, controle de estoque mínimo e valor do patrimônio.',
    target: 'a[href="/app/estoque"]',
    position: 'right',
    highlightPadding: 8,
    isSidebarItem: true,
  },
  {
    id: 'sidebar-config',
    title: 'Menu - Configurações',
    description: 'Configure dados da oficina, logo, endereço e outras personalizações.',
    target: 'a[href="/app/configuracoes"]',
    position: 'right',
    highlightPadding: 8,
    isSidebarItem: true,
  },
  {
    id: 'complete',
    title: 'Pronto para Começar! 🎉',
    description: 'Você já conhece o básico! Agora é só começar a usar. Se precisar refazer este tour, clique em "Tour guiado" no menu lateral.',
    target: null,
    position: 'center',
    highlightPadding: 0,
  },
];

// Verifica se está no mobile (sidebar recolhida)
function isMobile() {
  return window.innerWidth < 768;
}

// Abre ou fecha a sidebar no mobile manipulando o estado do Layout
// A sidebar tem a classe .open quando está aberta
function setSidebarOpen(open) {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (!sidebar) return;
  if (open) {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  } else {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }
}

export default function OnboardingTour({ isActive, currentStep, onNext, onPrev, onEnd }) {
  const [highlightRect, setHighlightRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const mobile = typeof window !== 'undefined' && isMobile();

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const calculateTooltipPosition = useCallback((rect, position) => {
    // No mobile, o tooltip sempre vai para baixo fixo (bottom sheet)
    if (isMobile()) {
      setTooltipStyle({ position: 'fixed', bottom: 0, left: 0, right: 0 });
      return;
    }

    const tooltipWidth = 360;
    const tooltipHeight = 200;
    const gap = 16;
    let style = {};

    switch (position) {
      case 'bottom':
        style = {
          top: rect.bottom + gap,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
        break;
      case 'top':
        style = {
          top: rect.top - tooltipHeight - gap,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
        break;
      case 'right':
        style = {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.right + gap,
        };
        break;
      case 'left':
        style = {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.left - tooltipWidth - gap,
        };
        break;
      case 'center':
      default:
        style = {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          position: 'fixed',
        };
    }

    if (style.left !== undefined) {
      if (style.left < 16) style.left = 16;
      if (style.left + tooltipWidth > window.innerWidth - 16) {
        style.left = window.innerWidth - tooltipWidth - 16;
      }
    }

    setTooltipStyle(style);
  }, []);

  useEffect(() => {
    if (!isActive || !step) return;

    const mobile = isMobile();

    // Se é um item de sidebar no mobile, abrir a sidebar primeiro
    if (step.isSidebarItem && mobile) {
      setSidebarOpen(true);
    }

    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const timeout = setTimeout(() => {
          const rect = element.getBoundingClientRect();
          const padding = step.highlightPadding || 8;

          setHighlightRect({
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });

          calculateTooltipPosition(rect, step.position);
        }, 400);

        return () => clearTimeout(timeout);
      } else {
        // Elemento não encontrado — mostra tooltip central
        setHighlightRect(null);
        setTooltipStyle(
          isMobile()
            ? { position: 'fixed', bottom: 0, left: 0, right: 0 }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' }
        );
      }
    } else {
      // Step central sem target
      setHighlightRect(null);
      setTooltipStyle(
        isMobile()
          ? { position: 'fixed', bottom: 0, left: 0, right: 0 }
          : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' }
      );
    }

    // Cleanup: fecha sidebar se o próximo step não precisar dela
    return () => {
      const nextStep = TOUR_STEPS[currentStep + 1];
      if (step.isSidebarItem && mobile && (!nextStep || !nextStep.isSidebarItem)) {
        setSidebarOpen(false);
      }
    };
  }, [isActive, currentStep, step, calculateTooltipPosition]);

  // Fechar sidebar ao encerrar o tour no mobile
  const handleEnd = useCallback(() => {
    if (isMobile()) setSidebarOpen(false);
    onEnd();
  }, [onEnd]);

  if (!isActive) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const renderBackdrop = () => {
    if (!highlightRect) {
      return (
        <svg
          className="tour-svg-backdrop"
          width={vw}
          height={vh}
          viewBox={`0 0 ${vw} ${vh}`}
          onClick={handleEnd}
        >
          <rect width={vw} height={vh} fill="rgba(0,0,0,0.75)" />
        </svg>
      );
    }

    const { top, left, width, height } = highlightRect;
    const r = 8;

    return (
      <svg
        className="tour-svg-backdrop"
        width={vw}
        height={vh}
        viewBox={`0 0 ${vw} ${vh}`}
        onClick={handleEnd}
      >
        <defs>
          <mask id="tour-cutout">
            <rect width={vw} height={vh} fill="white" />
            <rect x={left} y={top} width={width} height={height} rx={r} ry={r} fill="black" />
          </mask>
        </defs>
        <rect width={vw} height={vh} fill="rgba(0,0,0,0.75)" mask="url(#tour-cutout)" />
        <rect
          x={left} y={top} width={width} height={height}
          rx={r} ry={r}
          fill="none"
          stroke="var(--accent, #F97316)"
          strokeWidth="2.5"
          className="tour-highlight-border"
        />
      </svg>
    );
  };

  // Detecta se o tooltip é mobile bottom sheet
  const isMobileSheet = tooltipStyle.bottom === 0;

  return (
    <div className="onboarding-tour-overlay">
      {renderBackdrop()}

      <div
        className={`tour-tooltip ${step.position === 'center' && !isMobileSheet ? 'center' : ''} ${isMobileSheet ? 'mobile-sheet' : ''}`}
        style={tooltipStyle}
      >
        <div className="tour-tooltip-header">
          <div className="tour-step-indicator">
            Passo {currentStep + 1} de {TOUR_STEPS.length}
          </div>
          <button className="tour-close-btn" onClick={handleEnd} title="Fechar tour">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="tour-tooltip-body">
          <h3 className="tour-title">{step.title}</h3>
          <p className="tour-description">{step.description}</p>
        </div>

        <div className="tour-tooltip-footer">
          <div className="tour-progress">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`tour-progress-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>

          <div className="tour-actions">
            {!isFirstStep && (
              <button className="btn btn-ghost btn-sm" onClick={onPrev}>
                ← Anterior
              </button>
            )}

            <button className="btn btn-outline btn-sm" onClick={handleEnd}>
              Pular
            </button>

            {isLastStep ? (
              <button className="btn btn-primary btn-sm" onClick={handleEnd}>
                ✓ Concluir
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={onNext}>
                Próximo →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
