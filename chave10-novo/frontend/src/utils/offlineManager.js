/**
 * Gerenciador de modo offline
 * Salva operações pendentes e sincroniza quando voltar online
 */

import React from 'react';

const QUEUE_KEY = 'c10_offline_queue';
const DRAFT_KEY = 'c10_drafts';

// Tipos de operações suportadas
export const OPERATION_TYPES = {
  CREATE_OS: 'create_os',
  UPDATE_OS: 'update_os',
  CREATE_CLIENTE: 'create_cliente',
  UPDATE_CLIENTE: 'update_cliente',
  CREATE_VEICULO: 'create_veiculo',
  CREATE_ORCAMENTO: 'create_orcamento',
};

// Status da operação
export const OPERATION_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  FAILED: 'failed',
};

class OfflineManager {
  constructor() {
    this.listeners = [];
    this.isSyncing = false;
    this.setupOnlineListener();
  }

  /**
   * Configura listener para detectar quando volta online
   */
  setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('🌐 Conexão restaurada! Iniciando sincronização...');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Conexão perdida. Modo offline ativado.');
      this.notifyListeners({ type: 'offline' });
    });
  }

  /**
   * Verifica se está online
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Adiciona operação à fila offline
   */
  addToQueue(operation) {
    const queue = this.getQueue();
    const newOperation = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      status: OPERATION_STATUS.PENDING,
      attempts: 0,
      ...operation,
    };
    
    queue.push(newOperation);
    this.saveQueue(queue);
    
    console.log('💾 Operação salva na fila offline:', newOperation);
    this.notifyListeners({ type: 'queue_updated', queue });
    
    return newOperation.id;
  }

  /**
   * Salva rascunho (OS, orçamento, etc)
   */
  saveDraft(type, data) {
    const drafts = this.getDrafts();
    const draftId = data.draftId || Date.now() + Math.random();
    
    drafts[type] = drafts[type] || {};
    drafts[type][draftId] = {
      ...data,
      draftId,
      savedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    console.log('📝 Rascunho salvo:', type, draftId);
    this.notifyListeners({ type: 'draft_saved', draftType: type, draftId });
    
    return draftId;
  }

  /**
   * Recupera rascunho
   */
  getDraft(type, draftId) {
    const drafts = this.getDrafts();
    return drafts[type]?.[draftId] || null;
  }

  /**
   * Lista todos os rascunhos de um tipo
   */
  listDrafts(type) {
    const drafts = this.getDrafts();
    return Object.values(drafts[type] || {});
  }

  /**
   * Remove rascunho
   */
  removeDraft(type, draftId) {
    const drafts = this.getDrafts();
    if (drafts[type]?.[draftId]) {
      delete drafts[type][draftId];
      localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
      console.log('🗑️ Rascunho removido:', type, draftId);
      this.notifyListeners({ type: 'draft_removed', draftType: type, draftId });
    }
  }

  /**
   * Sincroniza todas as operações pendentes
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log('⏳ Sincronização já em andamento...');
      return;
    }

    if (!this.isOnline()) {
      console.log('📡 Sem conexão. Sincronização cancelada.');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_start' });

    const queue = this.getQueue();
    const pendingOps = queue.filter(op => op.status === OPERATION_STATUS.PENDING);

    console.log(`🔄 Sincronizando ${pendingOps.length} operações pendentes...`);

    let successCount = 0;
    let failedCount = 0;

    for (const operation of pendingOps) {
      try {
        // Atualiza status para syncing
        operation.status = OPERATION_STATUS.SYNCING;
        operation.attempts++;
        this.saveQueue(queue);

        // Executa a operação
        await this.executeOperation(operation);

        // Marca como sucesso
        operation.status = OPERATION_STATUS.SUCCESS;
        successCount++;
        
        console.log('✅ Operação sincronizada:', operation.type);
      } catch (error) {
        console.error('❌ Erro ao sincronizar operação:', operation.type, error);
        operation.status = OPERATION_STATUS.FAILED;
        operation.error = error.message;
        failedCount++;
      }

      this.saveQueue(queue);
    }

    // Remove operações bem-sucedidas da fila
    const updatedQueue = queue.filter(op => op.status !== OPERATION_STATUS.SUCCESS);
    this.saveQueue(updatedQueue);

    this.isSyncing = false;
    
    const result = {
      type: 'sync_complete',
      total: pendingOps.length,
      success: successCount,
      failed: failedCount,
      remaining: updatedQueue.length,
    };

    console.log('🎉 Sincronização concluída:', result);
    this.notifyListeners(result);

    return result;
  }

  /**
   * Executa uma operação específica
   */
  async executeOperation(operation) {
    // Importação dinâmica para evitar circular dependency
    const { api } = await import('../api');

    switch (operation.type) {
      case OPERATION_TYPES.CREATE_OS:
        return await api.app.os.create(operation.data);
      
      case OPERATION_TYPES.UPDATE_OS:
        return await api.app.os.update(operation.data.id, operation.data);
      
      case OPERATION_TYPES.CREATE_CLIENTE:
        return await api.app.clientes.create(operation.data);
      
      case OPERATION_TYPES.UPDATE_CLIENTE:
        return await api.app.clientes.update(operation.data.id, operation.data);
      
      case OPERATION_TYPES.CREATE_VEICULO:
        return await api.app.veiculos.create(operation.data);
      
      case OPERATION_TYPES.CREATE_ORCAMENTO:
        return await api.app.orcamentos.create(operation.data);
      
      default:
        throw new Error(`Tipo de operação não suportado: ${operation.type}`);
    }
  }

  /**
   * Recupera fila do localStorage
   */
  getQueue() {
    try {
      const queue = localStorage.getItem(QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  }

  /**
   * Salva fila no localStorage
   */
  saveQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  /**
   * Recupera rascunhos do localStorage
   */
  getDrafts() {
    try {
      const drafts = localStorage.getItem(DRAFT_KEY);
      return drafts ? JSON.parse(drafts) : {};
    } catch {
      return {};
    }
  }

  /**
   * Conta operações pendentes
   */
  getPendingCount() {
    const queue = this.getQueue();
    return queue.filter(op => op.status === OPERATION_STATUS.PENDING).length;
  }

  /**
   * Limpa fila de operações
   */
  clearQueue() {
    localStorage.removeItem(QUEUE_KEY);
    this.notifyListeners({ type: 'queue_cleared' });
  }

  /**
   * Registra listener para eventos
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notifica todos os listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Erro no listener:', error);
      }
    });
  }

  /**
   * Reprocessa operações falhadas
   */
  async retryFailed() {
    const queue = this.getQueue();
    queue.forEach(op => {
      if (op.status === OPERATION_STATUS.FAILED) {
        op.status = OPERATION_STATUS.PENDING;
      }
    });
    this.saveQueue(queue);
    return await this.syncAll();
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();

// Hook React para usar no componente
export function useOfflineManager() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [pendingCount, setPendingCount] = React.useState(offlineManager.getPendingCount());
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = offlineManager.addListener((event) => {
      if (event.type === 'offline') {
        setIsOnline(false);
      } else if (event.type === 'sync_start') {
        setIsSyncing(true);
        setIsOnline(true);
      } else if (event.type === 'sync_complete') {
        setIsSyncing(false);
        setPendingCount(event.remaining);
      } else if (event.type === 'queue_updated') {
        setPendingCount(event.queue.filter(op => op.status === OPERATION_STATUS.PENDING).length);
      }
    });

    // Listeners nativos do navegador
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    saveDraft: offlineManager.saveDraft.bind(offlineManager),
    getDraft: offlineManager.getDraft.bind(offlineManager),
    listDrafts: offlineManager.listDrafts.bind(offlineManager),
    removeDraft: offlineManager.removeDraft.bind(offlineManager),
    addToQueue: offlineManager.addToQueue.bind(offlineManager),
    syncAll: offlineManager.syncAll.bind(offlineManager),
    retryFailed: offlineManager.retryFailed.bind(offlineManager),
  };
}
