# 📡 Modo Offline - Chave 10

Sistema completo de gerenciamento offline com sincronização automática.

## 🎯 Funcionalidades

### ✅ Implementado

1. **Indicador Visual de Conexão**
   - Badge flutuante mostrando status (Online/Offline/Sincronizando)
   - Contador de operações pendentes
   - Painel de detalhes expansível
   - Animações suaves

2. **Fila de Sincronização**
   - Salva operações quando offline
   - Sincroniza automaticamente ao voltar online
   - Retry automático para operações falhadas
   - Persistência em localStorage

3. **Sistema de Rascunhos**
   - Salvar OS, orçamentos, clientes em rascunho
   - Recuperar rascunhos salvos
   - Auto-save periódico (futuro)

4. **Gerenciador Offline**
   - Classe singleton para gerenciar estado
   - Listeners para eventos de rede
   - API unificada para todas as operações

---

## 📖 Como Usar

### 1. Indicador Offline (já está no Layout)

O componente `<OfflineIndicator />` é adicionado automaticamente ao Layout.

**Comportamento:**
- ❌ **Offline**: Badge vermelho com texto "Offline"
- ✅ **Online**: Badge verde (só aparece se há operações pendentes)
- 🔄 **Sincronizando**: Badge azul com animação de loading
- 📊 **Painel de Detalhes**: Clique no badge para ver operações pendentes

---

### 2. Usar Hook em Componentes

```jsx
import { useOfflineManager, OPERATION_TYPES } from '../utils/offlineManager';

function MeuComponente() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    saveDraft,
    getDraft,
    addToQueue,
    syncAll,
  } = useOfflineManager();

  // Verifica se está offline
  if (!isOnline) {
    console.log('Modo offline ativado!');
  }

  // Mostra contagem de operações pendentes
  console.log(`${pendingCount} operações aguardando sincronização`);
}
```

---

### 3. Salvar Rascunho de OS

```jsx
import { offlineManager } from '../utils/offlineManager';

function NovaOS() {
  const [form, setForm] = useState({ cliente_id: '', veiculo_id: '', ... });

  // Salvar rascunho (manual)
  function handleSaveDraft() {
    const draftId = offlineManager.saveDraft('os', form);
    alert('Rascunho salvo!');
  }

  // Carregar rascunho
  useEffect(() => {
    const drafts = offlineManager.listDrafts('os');
    if (drafts.length > 0) {
      const lastDraft = drafts[0];
      if (window.confirm('Recuperar rascunho salvo?')) {
        setForm(lastDraft);
      }
    }
  }, []);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (form.cliente_id || form.veiculo_id) {
        offlineManager.saveDraft('os', form);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [form]);
}
```

---

### 4. Adicionar Operação à Fila Offline

```jsx
import { offlineManager, OPERATION_TYPES } from '../utils/offlineManager';

async function handleCreateOS(osData) {
  try {
    if (navigator.onLine) {
      // Online: envia diretamente
      await api.app.os.create(osData);
      alert('OS criada com sucesso!');
    } else {
      // Offline: adiciona à fila
      offlineManager.addToQueue({
        type: OPERATION_TYPES.CREATE_OS,
        data: osData,
      });
      alert('OS salva! Será enviada quando você voltar online.');
    }
  } catch (error) {
    // Se falhar online, adiciona à fila
    offlineManager.addToQueue({
      type: OPERATION_TYPES.CREATE_OS,
      data: osData,
    });
    alert('Erro na conexão. OS salva localmente.');
  }
}
```

---

### 5. Sincronizar Manualmente

```jsx
import { offlineManager } from '../utils/offlineManager';

async function handleSync() {
  const result = await offlineManager.syncAll();
  
  console.log(`
    Total: ${result.total}
    Sucesso: ${result.success}
    Falhas: ${result.failed}
    Restantes: ${result.remaining}
  `);
}
```

---

## 🔧 Operações Suportadas

```javascript
export const OPERATION_TYPES = {
  CREATE_OS: 'create_os',
  UPDATE_OS: 'update_os',
  CREATE_CLIENTE: 'create_cliente',
  UPDATE_CLIENTE: 'update_cliente',
  CREATE_VEICULO: 'create_veiculo',
  CREATE_ORCAMENTO: 'create_orcamento',
};
```

---

## 📊 Eventos do Offline Manager

O `offlineManager` emite eventos que você pode escutar:

```javascript
import { offlineManager } from '../utils/offlineManager';

const unsubscribe = offlineManager.addListener((event) => {
  switch (event.type) {
    case 'offline':
      console.log('Conexão perdida');
      break;
    
    case 'sync_start':
      console.log('Iniciando sincronização...');
      break;
    
    case 'sync_complete':
      console.log('Sincronização concluída!');
      console.log(`Sucesso: ${event.success}, Falhas: ${event.failed}`);
      break;
    
    case 'queue_updated':
      console.log(`${event.queue.length} operações na fila`);
      break;
    
    case 'draft_saved':
      console.log(`Rascunho salvo: ${event.draftType}`);
      break;
  }
});

// Remover listener quando não precisar mais
unsubscribe();
```

---

## 🎨 Customização do Indicador

O `<OfflineIndicator />` já está pronto, mas você pode customizar:

```jsx
// Posição do badge
<OfflineIndicator 
  position={{ bottom: 80, right: 20 }} 
/>

// Cor customizada
<OfflineIndicator 
  colors={{
    online: '#10b981',
    offline: '#ef4444',
    syncing: '#3b82f6',
  }}
/>
```

---

## 🚀 Próximas Melhorias

### Service Worker Aprimorado
- [ ] Cache de assets estáticos
- [ ] Cache de imagens
- [ ] Pre-cache de rotas principais
- [ ] Background sync nativo

### Auto-save Inteligente
- [ ] Detectar mudanças no formulário
- [ ] Salvar apenas se houver alterações
- [ ] Feedback visual de "salvando..."

### Rascunhos Avançados
- [ ] Lista de todos os rascunhos
- [ ] Deletar rascunhos antigos
- [ ] Comparar rascunho com versão online
- [ ] Merge automático de conflitos

### Sincronização Robusta
- [ ] Priorização de operações
- [ ] Retry exponencial
- [ ] Detecção de conflitos
- [ ] Sincronização parcial

---

## 📝 Exemplo Completo: Página de OS com Offline

```jsx
import { useState, useEffect } from 'react';
import { useOfflineManager, offlineManager, OPERATION_TYPES } from '../utils/offlineManager';

export default function NovaOS() {
  const [form, setForm] = useState({ cliente_id: '', veiculo_id: '', descricao: '' });
  const { isOnline, pendingCount } = useOfflineManager();

  // Auto-save rascunho a cada 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (form.cliente_id || form.descricao) {
        offlineManager.saveDraft('os', { ...form, draftId: 'current_os' });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [form]);

  // Carregar rascunho ao montar
  useEffect(() => {
    const draft = offlineManager.getDraft('os', 'current_os');
    if (draft) {
      if (window.confirm('Recuperar rascunho salvo?')) {
        setForm(draft);
      }
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (isOnline) {
        await api.app.os.create(form);
        alert('OS criada com sucesso!');
        offlineManager.removeDraft('os', 'current_os'); // Remove rascunho
      } else {
        // Adiciona à fila offline
        offlineManager.addToQueue({
          type: OPERATION_TYPES.CREATE_OS,
          data: form,
        });
        alert('Sem conexão! OS será enviada automaticamente quando voltar online.');
      }
    } catch (error) {
      // Fallback: adiciona à fila mesmo se online
      offlineManager.addToQueue({
        type: OPERATION_TYPES.CREATE_OS,
        data: form,
      });
      alert('Erro ao salvar. OS guardada localmente.');
    }
  }

  return (
    <div>
      {!isOnline && (
        <div className="alert alert-warning">
          ⚠️ Você está offline. As alterações serão sincronizadas quando a conexão voltar.
        </div>
      )}

      {pendingCount > 0 && (
        <div className="alert alert-info">
          📋 {pendingCount} operação(ões) aguardando sincronização
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* seus campos... */}
        <button type="submit" className="btn btn-primary">
          {isOnline ? 'Criar OS' : 'Salvar Offline'}
        </button>
      </form>
    </div>
  );
}
```

---

## 🔍 Debugging

Para ver logs do offline manager no console:

```javascript
// Em qualquer componente
import { offlineManager } from '../utils/offlineManager';

// Ver fila atual
console.log(offlineManager.getQueue());

// Ver rascunhos
console.log(offlineManager.getDrafts());

// Forçar sincronização
offlineManager.syncAll();

// Reprocessar falhas
offlineManager.retryFailed();
```

---

## ⚠️ Limitações

1. **localStorage tem limite de 5-10MB**: Para grandes volumes, considere IndexedDB
2. **Sincronização manual em PWA**: Background Sync API requer registro adicional
3. **Conflitos**: Atualmente, última escrita vence (Last-Write-Wins)

---

## 📞 Suporte

Dúvidas sobre implementação? Entre em contato pelo WhatsApp do suporte.

---

**Última atualização:** Junho 2026
