import { useState, useEffect } from 'react';

/**
 * Hook para gerenciar o estado do onboarding do usuário
 * Controla se o tutorial já foi completado e qual step está ativo
 */
export function useOnboarding() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Tour NUNCA abre automaticamente — apenas pelo botão no menu lateral.
    // O WelcomeModal fica desabilitado para não interromper o uso.
    const completed = localStorage.getItem('chave10_onboarding_completed');
    setIsOnboardingComplete(completed === 'true');
    // Não define showWelcome = true — o tour só inicia manualmente
  }, []);

  const startTour = () => {
    setShowWelcome(false);
    setTourActive(true);
    setCurrentStep(0);
  };

  // Inicia o tour diretamente, sem passar pelo WelcomeModal
  const startTourDirect = () => {
    setShowWelcome(false);
    setTourActive(true);
    setCurrentStep(0);
  };

  const skipTour = () => {
    setShowWelcome(false);
    setTourActive(false);
    markAsComplete();
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const endTour = () => {
    setTourActive(false);
    setCurrentStep(0);
    markAsComplete();
  };

  const markAsComplete = () => {
    localStorage.setItem('chave10_onboarding_completed', 'true');
    setIsOnboardingComplete(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('chave10_onboarding_completed');
    setIsOnboardingComplete(false);
    setShowWelcome(true);
    setTourActive(false);
    setCurrentStep(0);
  };

  return {
    isOnboardingComplete,
    showWelcome,
    tourActive,
    currentStep,
    startTour,
    startTourDirect,
    skipTour,
    nextStep,
    prevStep,
    endTour,
    resetOnboarding,
  };
}
