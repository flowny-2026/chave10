/**
 * Monitor de localStorage
 * Detecta quando dados são removidos e loga quem removeu
 */

// Salva referência original
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
const originalClear = localStorage.clear.bind(localStorage);
const originalSetItem = localStorage.setItem.bind(localStorage);

// Intercepta removeItem
localStorage.removeItem = function(key) {
  if (key.startsWith('c10_')) {
    console.error('❌❌❌ ALERTA: localStorage.removeItem() chamado!');
    console.error('   Key:', key);
    console.error('   Stack trace:', new Error().stack);
  }
  return originalRemoveItem(key);
};

// Intercepta clear
localStorage.clear = function() {
  console.error('❌❌❌ ALERTA: localStorage.clear() chamado!');
  console.error('   Stack trace:', new Error().stack);
  return originalClear();
};

// Monitora setItem
localStorage.setItem = function(key, value) {
  if (key.startsWith('c10_')) {
    console.log('💾 localStorage.setItem() chamado:', key);
  }
  return originalSetItem(key, value);
};

console.log('🔍 Storage Monitor ATIVADO - monitorando c10_* keys');

// Monitora eventos de storage (cross-tab)
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith('c10_')) {
    console.warn('⚠️ Storage event detectado:', {
      key: e.key,
      oldValue: e.oldValue ? 'EXISTE' : 'NULL',
      newValue: e.newValue ? 'EXISTE' : 'NULL',
      url: e.url,
    });
  }
});

// Monitora beforeunload (quando página fecha)
window.addEventListener('beforeunload', () => {
  const token = localStorage.getItem('c10_token');
  const user = localStorage.getItem('c10_user');
  console.log('👋 Página fechando...');
  console.log('   Token ainda existe?', token ? 'SIM' : 'NÃO');
  console.log('   User ainda existe?', user ? 'SIM' : 'NÃO');
});

// Monitora pagehide (mobile/PWA)
window.addEventListener('pagehide', () => {
  const token = localStorage.getItem('c10_token');
  const user = localStorage.getItem('c10_user');
  console.log('👋 Página escondida (pagehide)...');
  console.log('   Token ainda existe?', token ? 'SIM' : 'NÃO');
  console.log('   User ainda existe?', user ? 'SIM' : 'NÃO');
});
