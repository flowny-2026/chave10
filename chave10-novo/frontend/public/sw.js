// Service Worker para PWA — Network-first para HTML/JS, cache-first para assets estáticos
const CACHE_NAME = 'chave10-v5';
const STATIC_ASSETS = [
  '/favicon.jpeg',
  '/pwa.jpeg'
];

// Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Ativação — limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first para navegação e JS, cache-first para imagens
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET e de APIs
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api')) return;

  // Imagens e fontes: cache-first
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // HTML, JS, CSS: network-first (sempre busca a versão nova)
  event.respondWith(
    fetch(request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
  );
});
