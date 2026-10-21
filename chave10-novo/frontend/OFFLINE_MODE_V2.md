# 🚀 Modo Offline V2 - Implementação Completa

## ✅ Implementado

### 1. **Auto-save no Componente de OS**

#### Funcionalidades:
- ✅ **Auto-save a cada 30 segundos** quando há conteúdo no formulário
- ✅ **Recuperação automática de rascunho** ao abrir modal (com confirmação)
- ✅ **Indicador visual de salvamento**
  - Badge azul "Salvando rascunho..." enquanto salva
  - Badge verde "Rascunho salvo" após salvar (desaparece após 2s)
- ✅ **Remoção automática do rascunho** após salvar OS com sucesso

#### Como funciona:
```javascript
// Auto-save debounced (30s após última alteração)
useEffect(() => {
  const timer = setTimeout(() => {
    offlineManager.saveDraft('os', { ...form, draftId: 'current_os' });
  }, 30000);
  return () => clearTimeout(timer);
}, [form]);

// Recupera ao abrir modal
useEffect(() => {
  if (modal === 'form' && !editing) {
    const draft = offlineManager.getDraft('os', 'current_os');
    if (draft && window.confirm('Recuperar rascunho?')) {
      setForm(draft);
    }
  }
}, [modal]);
```

---

### 2. **Fila Offline Inteligente**

#### Funcionalidades:
- ✅ **Detecta conexão automaticamente**
- ✅ **Adiciona operações à fila** quando offline ou com erro
- ✅ **Sincroniza automaticamente** ao voltar online
- ✅ **Tratamento de erros** com fallback para fila

#### Fluxo:
1. User tenta salvar OS
2. Se **online**: envia normalmente
3. Se **offline**: adiciona à fila e notifica usuário
4. Se **erro de rede**: adiciona à fila como fallback
5. Ao voltar online: sincroniza todas as pendências

```javascript
async function save(e) {
  e.preventDefault();
  
  try {
    if (isOnline) {
      await api.app.os.create(payload);
      showToast('OS criada!');
    } else {
      offlineManager.addToQueue({
        type: OPERATION_TYPES.CREATE_OS,
        data: payload,
      });
      showToast('Offline! Será enviada automaticamente quando voltar online', 'info');
    }
  } catch (error) {
    // Fallback: adiciona à fila mesmo se online
    offlineManager.addToQueue({
      type: OPERATION_TYPES.CREATE_OS,
      data: payload,
    });
    showToast('Erro de conexão. OS salva localmente.', 'warning');
  }
}
```

---

### 3. **Service Worker Aprimorado**

#### Melhorias:
- ✅ **Cache de assets estáticos** (logos, favicon, PWA icon)
- ✅ **Pre-cache de rotas principais** (dashboard, clientes, OS, etc)
- ✅ **Estratégias de cache por tipo:**
  - **APIs**: Network-first com fallback para cache
  - **Imagens/Fontes**: Cache-first
  - **JS/CSS**: Network-first com cache runtime
  - **Navegação**: Network-first com fallback para index.html
- ✅ **Background Sync API** (quando suportado)
- ✅ **Mensagens bidirecionais** com a aplicação
- ✅ **Notificações Push** (estrutura pronta para futuro)

#### Comandos do Service Worker:
```javascript
// Limpar todos os caches
navigator.serviceWorker.controller.postMessage({
  type: 'CLEAR_CACHE'
});

// Pre-cachear rotas específicas
navigator.serviceWorker.controller.postMessage({
  type: 'CACHE_ROUTES',
  routes: ['/app/dashboard', '/app/os']
});

// Atualizar service worker imediatamente
navigator.serviceWorker.controller.postMessage({
  type: 'SKIP_WAITING'
});
```

---

### 4. **Feedback Visual Completo**

#### Alertas no Modal de OS:

**⚠️ Modo Offline** (amarelo/laranja):
```
⚠️ Você está offline
A OS será salva localmente e sincronizada quando a conexão voltar
```

**🔄 Sincronizando** (azul, animação de loading):
```
🔄 Sincronizando operações pendentes...
3 operações sendo processadas
```

**💾 Auto-save** (azul/verde):
```
💾 Salvando rascunho...  (azul, spinner)
✓ Rascunho salvo       (verde, check)
```

#### Badge Flutuante:
- Aparece no canto inferior direito
- Estados: Offline (vermelho), Online (verde), Sincronizando (azul)
- Contador de operações pendentes
- Painel expansível com detalhes

---

### 5. **Animações CSS**

Adicionadas animações para feedback visual:
```css
@keyframes spin { ... }        /* Loading spinner */
@keyframes fadeIn { ... }      /* Fade suave */
@keyframes slideUp { ... }     /* Slide de baixo */
@keyframes slideDown { ... }   /* Slide de cima */
@keyframes pulse { ... }       /* Pulso */
```

---

## 📊 Arquitetura

### Fluxo de Dados:

```
┌─────────────────────────────────────────────────┐
│                  USER ACTION                     │
│            (Create/Update OS)                    │
└───────────────────┬─────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   isOnline?         │
         └──┬─────────────┬────┘
            │ YES         │ NO
            │             │
    ┌───────▼──────┐  ┌──▼───────────────┐
    │   API Call   │  │  Add to Queue    │
    └───┬──────────┘  │  (localStorage)  │
        │ SUCCESS     └──────┬───────────┘
        │                    │
    ┌───▼──────────┐     ┌──▼───────────┐
    │ Remove Draft │     │ Show Toast   │
    │ Show Toast   │     │ "Saved       │
    └──────────────┘     │  Offline"    │
                         └──────────────┘
                                │
                    ┌───────────▼──────────┐
                    │  Online Event        │
                    │  Detected            │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │  syncAll()           │
                    │  - Process Queue     │
                    │  - Show Progress     │
                    │  - Update UI         │
                    └──────────────────────┘
```

### Componentes:

1. **offlineManager.js** - Gerenciador central
2. **OfflineIndicator.jsx** - UI de status
3. **useOfflineManager** - Hook React
4. **Service Worker** - Cache e Background Sync
5. **OS.jsx** - Implementação de referência

---

## 🎯 Casos de Uso

### Caso 1: Mecânico sem Internet
```
1. Mecânico abre app (carrega do cache)
2. Cria nova OS
3. Preenche dados
4. Auto-save salva rascunho a cada 30s
5. Clica "Salvar"
6. Badge mostra "Offline - OS salva localmente"
7. OS adicionada à fila
8. Internet volta
9. Sincronização automática
10. Badge mostra "Sincronizando..."
11. OS enviada com sucesso
12. Badge desaparece
```

### Caso 2: Queda de Conexão Durante Preenchimento
```
1. Mecânico começa a preencher OS
2. Internet cai no meio
3. Badge muda para "Offline"
4. Auto-save continua funcionando (rascunho local)
5. Mecânico termina de preencher
6. Clica "Salvar"
7. OS vai para fila
8. Internet volta
9. Sincronização automática
10. Sucesso!
```

### Caso 3: Erro de Servidor
```
1. Mecânico preenche OS
2. Internet OK
3. Clica "Salvar"
4. Servidor retorna erro 500
5. Catch: adiciona à fila como fallback
6. Toast: "Erro. OS salva localmente"
7. Próxima tentativa de sincronização envia
```

---

## 🔧 Configuração

### localStorage Keys:
- `c10_offline_queue` - Fila de operações
- `c10_drafts` - Rascunhos salvos

### Service Worker Caches:
- `chave10-v6` - Assets estáticos
- `chave10-runtime-v6` - Cache dinâmico

---

## 📱 Suporte de Navegadores

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |
| Push Notifications | ✅ | ✅ | ❌ | ✅ |

**Nota:** Background Sync não suportado em Firefox/Safari, mas a sincronização manual funciona em todos.

---

## 🐛 Debugging

### Ver fila offline:
```javascript
console.log(offlineManager.getQueue());
```

### Ver rascunhos:
```javascript
console.log(offlineManager.getDrafts());
```

### Forçar sincronização:
```javascript
offlineManager.syncAll();
```

### Limpar tudo:
```javascript
offlineManager.clearQueue();
localStorage.removeItem('c10_drafts');
```

### Simular offline:
1. Chrome DevTools
2. Network tab
3. Throttling: Offline

---

## 🚀 Próximas Melhorias

### Planejadas:
- [ ] IndexedDB para grandes volumes (>5MB)
- [ ] Compressão de dados da fila
- [ ] Retry exponencial com backoff
- [ ] Merge inteligente de conflitos
- [ ] Sincronização parcial
- [ ] Indicador de progresso granular (item por item)
- [ ] Notificação push quando sincronização completa
- [ ] Modo offline deliberado (toggle manual)
- [ ] Export/Import de dados offline

---

## 📞 Suporte

Dúvidas? Consulte o arquivo `OFFLINE_MODE_README.md` para guia completo de uso.

---

**Versão:** 2.0  
**Data:** Junho 2026  
**Status:** ✅ Produção
