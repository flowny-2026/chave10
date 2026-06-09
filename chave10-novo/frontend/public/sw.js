// Service Worker Aprimorado — Chave 10
// Network-first para HTML/JS/API, cache-first para assets estáticos
// Background Sync para operações offline

const CACHE_NAME = 'chave10-v6';
const RUNTIME_CACHE = 'chave10-runtime-v6';
const STATIC_ASSETS = [
  '/',
  '/favicon.jpeg',
  '/pwa.jpeg',
  '/teste sem fundo 1.png',
  '/teste sem fundo 2.png',
  '/logo 160x40.png',
  '/logo 250x50.png',
  '/logo 320x160.png',
];

// Rotas principais para pre-cache
const ROUTES_TO_CACHE = [
  '/app/dashboard',
  '/app/clientes',
  '/app/veiculos',
  '/app/os',
  '/app/orcamentos',
  '/app/agenda',
  '/app/financeiro',
  '/login',
];

// ===============================
// INSTALAÇÃO
// ===============================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando service worker v6...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto, adicionando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Assets estáticos cacheados com sucesso');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erro ao cachear assets:', error);
      })
  );
});

// ===============================
// ATIVAÇÃO
// ===============================
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando service worker v6...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Deletando cache antigo:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker ativado e pronto');
        return self.clients.claim();
      })
  );
});

// ===============================
// FETCH
// ===============================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignora requisições de Chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // ─── ESTRATÉGIA POR TIPO ───────────────────────

  // 1. APIs: Network-first com fallback silencioso
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cacheia apenas respostas bem-sucedidas
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Tenta buscar do cache
          return caches.match(request)
            .then((cached) => {
              if (cached) {
                console.log('[SW] API offline - retornando do cache:', url.pathname);
                return cached;
              }
              // Retorna erro 503 se não há cache
              return new Response(
                JSON.stringify({ error: 'Sem conexão e sem cache disponível' }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            });
        })
    );
    return;
  }

  // 2. Imagens e Fontes: Cache-first
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          });
        })
        .catch(() => {
          // Fallback: imagem placeholder se disponível
          return caches.match('/pwa.jpeg');
        })
    );
    return;
  }

  // 3. JS e CSS: Network-first com cache runtime
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 4. Navegação (HTML): Network-first
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => {
              if (cached) {
                return cached;
              }
              // Fallback para index.html (SPA)
              return caches.match('/');
            });
        })
    );
    return;
  }

  // 5. Default: Network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// ===============================
// BACKGROUND SYNC
// ===============================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync event:', event.tag);
  
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      syncOfflineQueue()
    );
  }
});

async function syncOfflineQueue() {
  console.log('[SW] Iniciando sincronização da fila offline...');
  
  try {
    // Notifica a aplicação para sincronizar
    const clients = await self.clients.matchAll({ type: 'window' });
    
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_OFFLINE_QUEUE',
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log('[SW] Mensagem de sincronização enviada para', clients.length, 'cliente(s)');
  } catch (error) {
    console.error('[SW] Erro ao sincronizar fila offline:', error);
    throw error;
  }
}

// ===============================
// MENSAGENS
// ===============================
self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_ROUTES') {
    event.waitUntil(
      cacheRoutes(event.data.routes || ROUTES_TO_CACHE)
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      })
    );
  }
});

// Pre-cache de rotas
async function cacheRoutes(routes) {
  console.log('[SW] Pre-caching rotas:', routes);
  
  const cache = await caches.open(RUNTIME_CACHE);
  
  for (const route of routes) {
    try {
      const response = await fetch(route);
      if (response.ok) {
        await cache.put(route, response);
        console.log('[SW] Rota cacheada:', route);
      }
    } catch (error) {
      console.warn('[SW] Falha ao cachear rota:', route, error);
    }
  }
}

// ===============================
// NOTIFICAÇÕES PUSH (futuro)
// ===============================
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Chave 10',
    icon: '/pwa.jpeg',
    badge: '/favicon.jpeg',
    vibrate: [200, 100, 200],
    tag: 'chave10-notification',
    requireInteraction: false,
  };
  
  event.waitUntil(
    self.registration.showNotification('Chave 10', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/app/dashboard')
  );
});

// ===============================
// LOGGING & DEBUG
// ===============================
console.log('[SW] Service Worker v6 carregado');
console.log('[SW] Cache principal:', CACHE_NAME);
console.log('[SW] Cache runtime:', RUNTIME_CACHE);
console.log('[SW] Assets estáticos:', STATIC_ASSETS.length);
