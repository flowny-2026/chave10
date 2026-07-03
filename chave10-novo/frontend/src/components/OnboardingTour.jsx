import { useEffect, useState } from 'react';
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
    target: null, // null = sem highlight, apenas tooltip central
    position: 'center',
    highlightPadding: 0,
  },
  {
    id: 'kpi-cards',
    title: 'Métricas em Tempo Real',
    description: 'Estes cards mostram faturamento, OS finalizadas, clientes e outras métricas importantes. Atualizam automaticamente!',
    target: '[class*="kpi-premium"]', // Primeiro KPI card
    position: 'bottom',
    highlightPadding: 12,
  },
  {
    id: 'new-os-btn',
    title: 'Criar Ordem de Serviço',
    description: 'Clique aqui para criar uma nova OS rapidamente. É o botão mais usado do sistema!',
    target: 'button.btn-primary', // Botão "Nova OS"
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
  },
  {
    id: 'sidebar-veiculos',
    title: 'Menu - Veículos',
    description: 'Cadastre os veículos dos clientes com placa, modelo, KM e vincule aos donos.',
    target: 'a[href="/app/veiculos"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'sidebar-os',
    title: 'Menu - Ordens de Serviço',
    description: 'Gerencie todas as OS: em andamento, finalizadas, histórico completo e impressão.',
    target: 'a[href="/app/os"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'sidebar-financeiro',
    title: 'Menu - Financeiro',
    description: 'Controle completo de receitas, despesas, pagamentos parcelados e relatórios.',
    target: 'a[href="/app/financeiro"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'sidebar-estoque',
    title: 'Menu - Estoque',
    description: 'Gerencie peças, ferramentas, controle de estoque mínimo e valor do patrimônio.',
    target: 'a[href="/app/estoque"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'sidebar-config',
    title: 'Menu - Configurações',
    description: 'Configure dados da oficina, logo, endereço e outras personalizações.',
    target: 'a[href="/app/configuracoes"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'complete',
    title: 'Pronto para Começar! 🎉',
    description: 'Você já conhece o básico! Agora é só começar a usar. Se precisar refazer este tour, vá em Configurações > Ajuda.',
    target: null,
    position: 'center',
    highlightPadding: 0,
  },
];

export default function OnboardingTour({ isActive, currentStep, onNext, onPrev, onEnd }) {
  const [targetElement, setTargetElement] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [highlightStyle, setHighlightStyle] = useState({});

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (!isActive || !step) return;

    if (step.target) {
      // Busca o elemento target
      const element = document.querySelector(step.target);
      if (element) {
        setTargetElement(element);
        
        // Calcula posição do highlight
        const rect = element.getBoundingClientRect();
        const padding = step.highlightPadding || 8;
        
        setHighlightStyle({
          top: rect.top - padding + window.scrollY,
          left: rect.left - padding,
          width: rect.width + (padding * 2),
          height: rect.height + (padding * 2),
        });

        // Calcula posição do tooltip
        calculateTooltipPosition(rect, step.position);

        // Scroll suave até o elemento
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetElement(null);
      }
    } else {
      // Step sem target (central)
      setTargetElement(null);
      setTooltipStyle({});
      setHighlightStyle({});
    }
  }, [isActive, currentStep, step]);

  const calculateTooltipPosition = (rect, position) => {
    const tooltipWidth = 360;
    const tooltipHeight = 200; // estimado
    const gap = 16;

    let style = {};

    switch (position) {
      case 'bottom':
        style = {
          top: rect.bottom + gap + window.scrollY,
          left: rect.left + (rect.width / 2) - (tooltipWidth / 2),
        };
        break;
      case 'top':
        style = {
          top: rect.top - tooltipHeight - gap + window.scrollY,
          left: rect.left + (rect.width / 2) - (tooltipWidth / 2),
        };
        break;
      case 'right':
        style = {
          top: rect.top + (rect.height / 2) - (tooltipHeight / 2) + window.scrollY,
          left: rect.right + gap,
        };
        break;
      case 'left':
        style = {
          top: rect.top + (rect.height / 2) - (tooltipHeight / 2) + window.scrollY,
          left: rect.left - tooltipWidth - gap,
        };
        break;
      case 'center':
      default:
        style = {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }

    // Garante que não saia da tela
    if (style.left < 16) style.left = 16;
    if (style.left + tooltipWidth > window.innerWidth - 16) {
      style.left = window.innerWidth - tooltipWidth - 16;
    }

    setTooltipStyle(style);
  };

  if (!isActive) return null;

  return (
    <div className="onboarding-tour-overlay">
      {/* Backdrop escuro */}
      <div className="tour-backdrop" onClick={onEnd} />

      {/* Highlight do elemento target */}
      {targetElement && (
        <div 
          className="tour-highlight" 
          style={highlightStyle}
        />
      )}

      {/* Tooltip com conteúdo */}
      <div 
        className={`tour-tooltip ${step.position === 'center' ? 'center' : ''}`}
        style={tooltipStyle}
      >
        <div className="tour-tooltip-header">
          <div className="tour-step-indicator">
            Passo {currentStep + 1} de {TOUR_STEPS.length}
          </div>
          <button className="tour-close-btn" onClick={onEnd} title="Fechar tour">
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
            
            <button className="btn btn-outline btn-sm" onClick={onEnd}>
              Pular tour
            </button>

            {isLastStep ? (
              <button className="btn btn-primary btn-sm" onClick={onEnd}>
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
