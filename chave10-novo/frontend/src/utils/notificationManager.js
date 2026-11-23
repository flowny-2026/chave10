/**
 * 🔔 NOTIFICATION MANAGER - Chave 10
 * 
 * Sistema completo de notificações push para PWA
 * - Suporte a permissões
 * - Agendamento de notificações
 * - Verificação de triggers (OS finalizadas, pagamentos, etc.)
 * - Gerenciamento de preferências
 */

class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.subscription = null;
    this.preferences = this.loadPreferences();
    this.checkInterval = null;
  }

  // ─────────────────────────────────────────────────────────────
  // INICIALIZAÇÃO
  // ─────────────────────────────────────────────────────────────

  async init() {
    console.log('[Notifications] Inicializando...');
    
    if (!('Notification' in window)) {
      console.warn('[Notifications] API de notificações não suportada');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[Notifications] Service Worker não suportado');
      return false;
    }

    this.permission = Notification.permission;
    
    // Se já tem permissão, registra subscription
    if (this.permission === 'granted') {
      await this.registerPushSubscription();
      this.startPeriodicChecks();
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // PERMISSÕES
  // ─────────────────────────────────────────────────────────────

  async requestPermission() {
    if (!('Notification' in window)) {
      return { success: false, error: 'Notificações não suportadas' };
    }

    try {
      this.permission = await Notification.requestPermission();
      
      if (this.permission === 'granted') {
        console.log('[Notifications] Permissão concedida');
        await this.registerPushSubscription();
        this.startPeriodicChecks();
        return { success: true };
      } else {
        console.warn('[Notifications] Permissão negada');
        return { success: false, error: 'Permissão negada pelo usuário' };
      }
    } catch (error) {
      console.error('[Notifications] Erro ao solicitar permissão:', error);
      return { success: false, error: error.message };
    }
  }

  hasPermission() {
    return this.permission === 'granted';
  }

  // ─────────────────────────────────────────────────────────────
  // PUSH SUBSCRIPTION (para notificações do servidor)
  // ─────────────────────────────────────────────────────────────

  async registerPushSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Chave pública VAPID (você precisa gerar isso no backend)
      // Por enquanto, vamos apenas preparar a estrutura
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('[Notifications] Push subscription já existe');
        this.subscription = subscription;
      } else {
        console.log('[Notifications] Criando nova push subscription...');
        // TODO: Implementar quando tiver VAPID keys
        // const newSubscription = await registration.pushManager.subscribe({...});
        // this.subscription = newSubscription;
      }
    } catch (error) {
      console.error('[Notifications] Erro ao registrar push subscription:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // NOTIFICAÇÕES LOCAIS
  // ─────────────────────────────────────────────────────────────

  async showNotification(options) {
    if (!this.hasPermission()) {
      console.warn('[Notifications] Sem permissão para mostrar notificações');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const defaultOptions = {
        icon: '/pwa.jpeg',
        badge: '/favicon.jpeg',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: 'chave10-notification',
        ...options,
      };

      await registration.showNotification(
        options.title || 'Chave 10',
        defaultOptions
      );

      console.log('[Notifications] Notificação exibida:', options.title);
      return true;
    } catch (error) {
      console.error('[Notifications] Erro ao exibir notificação:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PREFERÊNCIAS
  // ─────────────────────────────────────────────────────────────

  loadPreferences() {
    try {
      const saved = localStorage.getItem('notificationPreferences');
      return saved ? JSON.parse(saved) : this.getDefaultPreferences();
    } catch {
      return this.getDefaultPreferences();
    }
  }

  getDefaultPreferences() {
    return {
      osFinalizadas: true,
      pagamentosVencendo: true,
      revisoesAgendadas: true,
      clientesInativos: true,
      diasAvisoVencimento: 3,      // Avisar 3 dias antes do vencimento
      diasInatividade: 90,          // Considerar inativo após 90 dias
      horaVerificacao: '09:00',     // Horário para checks diários
    };
  }

  savePreferences(prefs) {
    this.preferences = { ...this.preferences, ...prefs };
    localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
    console.log('[Notifications] Preferências salvas:', this.preferences);
  }

  getPreferences() {
    return { ...this.preferences };
  }

  // ─────────────────────────────────────────────────────────────
  // VERIFICAÇÕES PERIÓDICAS
  // ─────────────────────────────────────────────────────────────

  startPeriodicChecks() {
    // Verifica a cada 5 minutos (300000ms)
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    console.log('[Notifications] Iniciando verificações periódicas...');
    
    // Primeira verificação imediata
    this.runChecks();
    
    // Verificações periódicas
    this.checkInterval = setInterval(() => {
      this.runChecks();
    }, 5 * 60 * 1000); // 5 minutos
  }

  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[Notifications] Verificações periódicas pausadas');
    }
  }

  async runChecks() {
    if (!this.hasPermission()) {
      return;
    }

    console.log('[Notifications] Executando verificações...');

    try {
      // Importa a API (lazy loading para evitar circular dependency)
      const { api } = await import('../api');
      
      // Verifica cada tipo de notificação conforme preferências
      if (this.preferences.osFinalizadas) {
        await this.checkOSFinalizadas(api);
      }

      if (this.preferences.pagamentosVencendo) {
        await this.checkPagamentosVencendo(api);
      }

      if (this.preferences.revisoesAgendadas) {
        await this.checkRevisoesAgendadas(api);
      }

      if (this.preferences.clientesInativos) {
        await this.checkClientesInativos(api);
      }

    } catch (error) {
      console.error('[Notifications] Erro nas verificações:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // VERIFICAÇÕES ESPECÍFICAS
  // ─────────────────────────────────────────────────────────────

  async checkOSFinalizadas(api) {
    try {
      const lastCheck = this.getLastCheck('osFinalizadas');
      const osList = await api.app.os.list();
      
      // Filtra OS finalizadas recentemente (nas últimas 6 horas)
      const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
      const recentlyFinalized = osList.filter(os => {
        if (os.status !== 'finalizado') return false;
        
        const updateTime = os.data_finalizacao ? new Date(os.data_finalizacao).getTime() : 0;
        return updateTime > lastCheck && updateTime > sixHoursAgo;
      });

      if (recentlyFinalized.length > 0) {
        const title = recentlyFinalized.length === 1
          ? `OS #${String(recentlyFinalized[0].id).padStart(4, '0')} finalizada! ✅`
          : `${recentlyFinalized.length} OS finalizadas! ✅`;
        
        const body = recentlyFinalized.length === 1
          ? `${recentlyFinalized[0].cliente_nome || 'Cliente'} - ${recentlyFinalized[0].veiculo_modelo || 'Veículo'}`
          : `Confira as ordens de serviço concluídas`;

        await this.showNotification({
          title,
          body,
          tag: 'os-finalizadas',
          data: { url: '/app/os', type: 'os-finalizadas' },
        });

        this.setLastCheck('osFinalizadas');
      }
    } catch (error) {
      console.error('[Notifications] Erro ao verificar OS finalizadas:', error);
    }
  }

  async checkPagamentosVencendo(api) {
    try {
      const osList = await api.app.os.list();
      const diasAviso = this.preferences.diasAvisoVencimento;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const limitDate = new Date(today);
      limitDate.setDate(limitDate.getDate() + diasAviso);

      // Filtra OS com pagamento pendente vencendo em breve
      const vencendo = osList.filter(os => {
        if (os.status_pagamento === 'pago') return false;
        if (!os.data_vencimento) return false;

        const vencimento = new Date(os.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);

        return vencimento >= today && vencimento <= limitDate;
      });

      if (vencendo.length > 0) {
        // Agrupa por data de vencimento
        const hoje = vencendo.filter(os => {
          const v = new Date(os.data_vencimento);
          v.setHours(0, 0, 0, 0);
          return v.getTime() === today.getTime();
        });

        if (hoje.length > 0) {
          await this.showNotification({
            title: `⚠️ ${hoje.length} pagamento${hoje.length > 1 ? 's' : ''} vence${hoje.length === 1 ? '' : 'm'} hoje!`,
            body: 'Confira os pagamentos pendentes no financeiro',
            tag: 'pagamentos-hoje',
            data: { url: '/app/financeiro', type: 'pagamentos-vencendo' },
          });
        } else {
          await this.showNotification({
            title: `💰 ${vencendo.length} pagamento${vencendo.length > 1 ? 's' : ''} vencendo em breve`,
            body: `Pagamentos vencem nos próximos ${diasAviso} dias`,
            tag: 'pagamentos-vencendo',
            data: { url: '/app/financeiro', type: 'pagamentos-vencendo' },
          });
        }

        this.setLastCheck('pagamentosVencendo');
      }
    } catch (error) {
      console.error('[Notifications] Erro ao verificar pagamentos:', error);
    }
  }

  async checkRevisoesAgendadas(api) {
    try {
      const agendaList = await api.app.agenda.list();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Filtra agendamentos para hoje e amanhã
      const proximasRevisoes = agendaList.filter(item => {
        if (!item.data || !item.tipo || !item.tipo.toLowerCase().includes('revisão')) {
          return false;
        }

        const agendamento = new Date(item.data);
        agendamento.setHours(0, 0, 0, 0);

        return agendamento.getTime() === today.getTime() || 
               agendamento.getTime() === tomorrow.getTime();
      });

      if (proximasRevisoes.length > 0) {
        const hojeRevisoes = proximasRevisoes.filter(item => {
          const agendamento = new Date(item.data);
          agendamento.setHours(0, 0, 0, 0);
          return agendamento.getTime() === today.getTime();
        });

        const title = hojeRevisoes.length > 0
          ? `📅 ${hojeRevisoes.length} revisão${hojeRevisoes.length > 1 ? 'ões' : ''} hoje`
          : `📅 ${proximasRevisoes.length} revisão${proximasRevisoes.length > 1 ? 'ões' : ''} amanhã`;

        await this.showNotification({
          title,
          body: 'Confira a agenda para mais detalhes',
          tag: 'revisoes-agendadas',
          data: { url: '/app/agenda', type: 'revisoes-agendadas' },
        });

        this.setLastCheck('revisoesAgendadas');
      }
    } catch (error) {
      console.error('[Notifications] Erro ao verificar revisões:', error);
    }
  }

  async checkClientesInativos(api) {
    try {
      const lastCheck = this.getLastCheck('clientesInativos');
      const now = Date.now();
      
      // Verifica apenas 1x por dia
      if (now - lastCheck < 24 * 60 * 60 * 1000) {
        return;
      }

      const clientes = await api.app.clientes.list();
      const osList = await api.app.os.list();
      const diasInatividade = this.preferences.diasInatividade;
      const limitDate = Date.now() - (diasInatividade * 24 * 60 * 60 * 1000);

      // Agrupa OS por cliente
      const clientesComOS = {};
      osList.forEach(os => {
        if (!os.cliente_id) return;
        if (!clientesComOS[os.cliente_id] || new Date(os.created_at) > new Date(clientesComOS[os.cliente_id].created_at)) {
          clientesComOS[os.cliente_id] = os;
        }
      });

      // Encontra clientes inativos
      const inativos = clientes.filter(cliente => {
        const ultimaOS = clientesComOS[cliente.id];
        if (!ultimaOS) {
          // Cliente nunca teve OS - verifica data de criação
          const criacao = new Date(cliente.created_at).getTime();
          return criacao < limitDate;
        }
        
        const ultimaData = new Date(ultimaOS.created_at).getTime();
        return ultimaData < limitDate;
      });

      if (inativos.length > 0) {
        await this.showNotification({
          title: `😴 ${inativos.length} cliente${inativos.length > 1 ? 's inativos' : ' inativo'}`,
          body: `Sem movimento há mais de ${diasInatividade} dias`,
          tag: 'clientes-inativos',
          data: { url: '/app/clientes', type: 'clientes-inativos' },
        });

        this.setLastCheck('clientesInativos');
      }
    } catch (error) {
      console.error('[Notifications] Erro ao verificar clientes inativos:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS - LAST CHECK
  // ─────────────────────────────────────────────────────────────

  getLastCheck(type) {
    try {
      const key = `lastNotificationCheck_${type}`;
      const saved = localStorage.getItem(key);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  setLastCheck(type) {
    try {
      const key = `lastNotificationCheck_${type}`;
      localStorage.setItem(key, Date.now().toString());
    } catch (error) {
      console.error('[Notifications] Erro ao salvar last check:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────

  destroy() {
    this.stopPeriodicChecks();
    console.log('[Notifications] Notification Manager destruído');
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();

// Auto-init quando o módulo é carregado
if (typeof window !== 'undefined') {
  notificationManager.init().catch(console.error);
}
