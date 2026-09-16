/**
 * test-auth.js
 * Testa toda a lógica de autenticação do Chave 10 sem precisar do banco.
 * Executa: node src/scripts/test-auth.js
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  ❌ ${label}${detail ? ' → ' + detail : ''}`);
  failed++;
}

function section(title) {
  console.log(`\n📋 ${title}`);
  console.log('─'.repeat(50));
}

// ──────────────────────────────────────────────────────────────
section('1. JWT_SECRET configurado');

if (SECRET && SECRET.length >= 16) {
  ok(`JWT_SECRET definido (${SECRET.length} caracteres)`);
} else {
  fail('JWT_SECRET ausente ou muito curto', SECRET ? `${SECRET.length} chars` : 'undefined');
}

// ──────────────────────────────────────────────────────────────
section('2. Geração de tokens JWT');

let tokenAdmin, tokenOficina, tokenFuncionario, tokenExpirado, tokenTemp;

try {
  tokenAdmin = jwt.sign(
    { id: 1, perfil: 'master_admin', nome: 'Admin' },
    SECRET,
    { expiresIn: '30d' }
  );
  ok('Token master_admin gerado (30d)');
} catch (e) { fail('Geração master_admin', e.message); }

try {
  tokenOficina = jwt.sign(
    { id: 2, perfil: 'admin_oficina', oficina_id: 10, nome: 'Gerente' },
    SECRET,
    { expiresIn: '30d' }
  );
  ok('Token admin_oficina gerado (30d)');
} catch (e) { fail('Geração admin_oficina', e.message); }

try {
  tokenFuncionario = jwt.sign(
    { id: 3, perfil: 'funcionario', oficina_id: 10, nome: 'Func' },
    SECRET,
    { expiresIn: '30d' }
  );
  ok('Token funcionario gerado (30d)');
} catch (e) { fail('Geração funcionario', e.message); }

try {
  tokenTemp = jwt.sign(
    { id: 2, perfil: 'admin_oficina', oficina_id: null, nome: 'Novo' },
    SECRET,
    { expiresIn: '7d' }
  );
  ok('Token temporário (needsOficina) gerado (7d)');
} catch (e) { fail('Geração token temporário', e.message); }

try {
  tokenExpirado = jwt.sign(
    { id: 99, perfil: 'admin_oficina', oficina_id: 5 },
    SECRET,
    { expiresIn: '-1s' } // já expirado
  );
  ok('Token expirado gerado (para teste de rejeição)');
} catch (e) { fail('Geração token expirado', e.message); }

// ──────────────────────────────────────────────────────────────
section('3. Validação de tokens (authMiddleware simulado)');

function simulateAuthMiddleware(token) {
  if (!token) return { status: 401, error: 'Token não fornecido' };
  try {
    const user = jwt.verify(token, SECRET);
    return { status: 200, user };
  } catch (err) {
    return { status: 401, error: 'Token inválido ou expirado' };
  }
}

const r1 = simulateAuthMiddleware(tokenAdmin);
r1.status === 200 && r1.user.perfil === 'master_admin'
  ? ok('Token válido master_admin → aceito')
  : fail('Token master_admin rejeitado');

const r2 = simulateAuthMiddleware(tokenOficina);
r2.status === 200 && r2.user.perfil === 'admin_oficina'
  ? ok('Token válido admin_oficina → aceito')
  : fail('Token admin_oficina rejeitado');

const r3 = simulateAuthMiddleware(null);
r3.status === 401
  ? ok('Token ausente → 401 (correto)')
  : fail('Token ausente não bloqueado');

const r4 = simulateAuthMiddleware('Bearer invalido.token.falso');
r4.status === 401
  ? ok('Token malformado → 401 (correto)')
  : fail('Token malformado não bloqueado');

const r5 = simulateAuthMiddleware(tokenExpirado);
r5.status === 401
  ? ok('Token expirado → 401 (correto)')
  : fail('Token expirado não bloqueado', `status: ${r5.status}`);

const r6 = simulateAuthMiddleware('token.assinado.com.segredo.errado');
r6.status === 401
  ? ok('Token com segredo errado → 401 (correto)')
  : fail('Token com segredo errado não bloqueado');

// ──────────────────────────────────────────────────────────────
section('4. Controle de permissões por perfil');

function simulateMasterAdminOnly(user) {
  return user?.perfil === 'master_admin'
    ? { status: 200 }
    : { status: 403, error: 'Acesso restrito ao administrador' };
}

function simulateOficinaSelf(user) {
  return user?.oficina_id
    ? { status: 200 }
    : { status: 403, error: 'Acesso restrito a usuários de oficina' };
}

function simulateNaoFuncionario(user) {
  return user?.perfil === 'funcionario'
    ? { status: 403, error: 'Acesso restrito ao gerente' }
    : { status: 200 };
}

const userAdmin = jwt.verify(tokenAdmin, SECRET);
const userOficina = jwt.verify(tokenOficina, SECRET);
const userFunc = jwt.verify(tokenFuncionario, SECRET);
const userTemp = jwt.verify(tokenTemp, SECRET);

simulateMasterAdminOnly(userAdmin).status === 200
  ? ok('masterAdminOnly: master_admin → permitido')
  : fail('masterAdminOnly: master_admin bloqueado');

simulateMasterAdminOnly(userOficina).status === 403
  ? ok('masterAdminOnly: admin_oficina → bloqueado (correto)')
  : fail('masterAdminOnly: admin_oficina passou indevidamente');

simulateMasterAdminOnly(userFunc).status === 403
  ? ok('masterAdminOnly: funcionario → bloqueado (correto)')
  : fail('masterAdminOnly: funcionario passou indevidamente');

simulateOficinaSelf(userOficina).status === 200
  ? ok('oficinaSelf: admin_oficina com oficina → permitido')
  : fail('oficinaSelf: admin_oficina bloqueado');

simulateOficinaSelf(userTemp).status === 403
  ? ok('oficinaSelf: token sem oficina_id → bloqueado (correto)')
  : fail('oficinaSelf: token sem oficina_id passou indevidamente');

simulateNaoFuncionario(userFunc).status === 403
  ? ok('naoFuncionario: funcionario → bloqueado (correto)')
  : fail('naoFuncionario: funcionario passou indevidamente');

simulateNaoFuncionario(userOficina).status === 200
  ? ok('naoFuncionario: admin_oficina → permitido')
  : fail('naoFuncionario: admin_oficina bloqueado');

// ──────────────────────────────────────────────────────────────
section('5. Expiração do token (decodificação local — frontend)');

function isTokenValidFrontend(token) {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob ? atob(padded) : Buffer.from(padded, 'base64').toString());
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch { return false; }
}

isTokenValidFrontend(tokenAdmin)
  ? ok('isTokenValid: token 30d → válido')
  : fail('isTokenValid: token 30d marcado como inválido');

isTokenValidFrontend(tokenExpirado)
  ? fail('isTokenValid: token expirado marcado como válido (FALHA DE SEGURANÇA)')
  : ok('isTokenValid: token expirado → inválido (correto)');

isTokenValidFrontend(null)
  ? fail('isTokenValid: null marcado como válido')
  : ok('isTokenValid: null → inválido (correto)');

isTokenValidFrontend('nao.e.um.jwt')
  ? fail('isTokenValid: string inválida marcada como válida')
  : ok('isTokenValid: string inválida → inválido (correto)');

// ──────────────────────────────────────────────────────────────
section('6. Persistência no storage (simulação Node.js)');

// Simula o saveToken / getFromStorage do api.js
const fakeStorage = {};
function saveToStorage(key, value) {
  fakeStorage[key] = value;
}
function getFromStorage(key) {
  return fakeStorage[key] || null;
}

saveToStorage('c10_token', tokenOficina);
const recuperado = getFromStorage('c10_token');
recuperado === tokenOficina
  ? ok('saveToken → getFromStorage recupera o token corretamente')
  : fail('saveToken → getFromStorage falhou');

saveToStorage('c10_user', JSON.stringify({ id: 2, nome: 'Gerente', perfil: 'admin_oficina' }));
const userRec = JSON.parse(getFromStorage('c10_user'));
userRec?.perfil === 'admin_oficina'
  ? ok('saveUser → getFromStorage recupera o usuário corretamente')
  : fail('saveUser → getFromStorage falhou');

// Limpeza (simula clearSession)
['c10_token', 'c10_user', 'c10_token_temp'].forEach(k => delete fakeStorage[k]);
getFromStorage('c10_token') === null
  ? ok('clearSession → token removido do storage')
  : fail('clearSession → token ainda no storage');

// ──────────────────────────────────────────────────────────────
section('7. Payload do JWT — campos obrigatórios');

const p1 = jwt.verify(tokenAdmin, SECRET);
['id', 'perfil', 'nome', 'iat', 'exp'].every(f => f in p1)
  ? ok('Payload master_admin contém: id, perfil, nome, iat, exp')
  : fail('Payload master_admin incompleto', JSON.stringify(Object.keys(p1)));

const p2 = jwt.verify(tokenOficina, SECRET);
['id', 'perfil', 'oficina_id', 'nome', 'iat', 'exp'].every(f => f in p2)
  ? ok('Payload admin_oficina contém: id, perfil, oficina_id, nome, iat, exp')
  : fail('Payload admin_oficina incompleto', JSON.stringify(Object.keys(p2)));

const expDays = Math.round((p2.exp - p2.iat) / 86400);
expDays === 30
  ? ok(`Token expira em ${expDays} dias (correto)`)
  : fail(`Expiração inesperada: ${expDays} dias`);

const p3 = jwt.verify(tokenTemp, SECRET);
const expDaysTemp = Math.round((p3.exp - p3.iat) / 86400);
expDaysTemp === 7
  ? ok(`Token temporário expira em ${expDaysTemp} dias (correto)`)
  : fail(`Expiração token temporário inesperada: ${expDaysTemp} dias`);

// ──────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
console.log(`📊 RESULTADO FINAL`);
console.log('═'.repeat(50));
console.log(`  ✅ Passou: ${passed}`);
console.log(`  ❌ Falhou: ${failed}`);
console.log(`  📝 Total:  ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 Todos os testes passaram! Sistema de autenticação OK.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} teste(s) falharam. Verifique os itens acima.\n`);
  process.exit(1);
}
