// Carrega variáveis de ambiente antes de tudo
require('dotenv').config();

// Valida variáveis obrigatórias — encerra o processo se algo crítico estiver faltando
const { validateEnv } = require('./utils/envValidator');
validateEnv();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const compression = require('compression');
const {
  errorHandler,
  notFoundHandler,
  blockUnusedMethods,
  requireJsonContentType,
} = require('./middleware/errorHandler');
const {
  globalLimiter,
  readLimiter,
  writeLimiter,
  adminLimiter,
  loginLimiter,
} = require('./middleware/rateLimits');
const {
  requestId,
  responseMetrics,
  getHealthStatus,
  getMetricsSummary,
  setupProcessHandlers,
  recordError,
} = require('./middleware/observability');

// Captura exceções globais antes de qualquer coisa
setupProcessHandlers();

// ── SENTRY (desabilitado até configurar SENTRY_DSN) ──────────
// Para habilitar: defina SENTRY_DSN no .env do Render.
// Instalação futura: npm install @sentry/node
// if (process.env.SENTRY_DSN) {
//   const Sentry = require('@sentry/node');
//   Sentry.init({
//     dsn: process.env.SENTRY_DSN,
//     environment: process.env.NODE_ENV || 'development',
//     tracesSampleRate: 0.1,
//     beforeSend(event) {
//       // Remove dados sensíveis antes de enviar ao Sentry
//       if (event.request?.headers) delete event.request.headers.authorization;
//       if (event.request?.cookies) delete event.request.cookies;
//       return event;
//     },
//   });
//   app.use(Sentry.Handlers.requestHandler());
// }

const app = express();

// ── TRUST PROXY ───────────────────────────────────────────────
// Necessário para req.ip e rate limit funcionarem corretamente
// atrás de proxies reversos (Nginx, Heroku, Railway, Render, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
} else {
  app.set('trust proxy', false);
}

// ── REQUEST ID + MÉTRICAS ─────────────────────────────────────
// Gera ID único por requisição e mede tempo de resposta.
// Deve ser o PRIMEIRO middleware para capturar a latência completa.
app.use(requestId);
app.use(responseMetrics);

// ── TIMEOUT DE REQUISIÇÃO ─────────────────────────────────────
// Mata requisições que demoram mais de 30s — protege contra slowloris e
// ataques que mantêm conexões abertas para esgotar recursos do servidor.
// O timeout é aplicado antes de qualquer rota.
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000;
app.use((req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Requisição excedeu o tempo limite' });
    }
  });
  next();
});

// ── FLOOD GLOBAL ─────────────────────────────────────────────
// Última linha antes do Helmet — corta floods antes de processar qualquer lógica.
app.use(globalLimiter);

// ── RATE LIMIT POR MÉTODO ─────────────────────────────────────
// Limites separados para leitura e escrita — GETs têm orçamento maior.
app.use(readLimiter);

// ── BLOQUEAR MÉTODOS HTTP DESNECESSÁRIOS ──────────────────────
// Bloqueia TRACE, TRACK, CONNECT, etc. — apenas GET/POST/PUT/PATCH/DELETE/OPTIONS
app.use(blockUnusedMethods);

// ── HELMET: headers de segurança HTTP ────────────────────────
// Configuração explícita de cada diretiva — não depende dos defaults
app.use(helmet({
  // ── Content-Security-Policy ──────────────────────────────
  // Esta é uma API REST pura — bloqueia carregamento de qualquer recurso externo.
  // O frontend React tem seu próprio CSP configurado no servidor de arquivos estáticos.
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'none'"],          // bloqueia tudo por padrão
      scriptSrc:      ["'none'"],          // sem scripts
      styleSrc:       ["'none'"],          // sem estilos
      imgSrc:         ["'none'"],          // sem imagens
      connectSrc:     ["'self'"],          // permite apenas conexões à própria origem
      fontSrc:        ["'none'"],
      objectSrc:      ["'none'"],
      mediaSrc:       ["'none'"],
      frameSrc:       ["'none'"],
      frameAncestors: ["'none'"],          // equivale a X-Frame-Options: DENY
      formAction:     ["'self'"],
      baseUri:        ["'none'"],
      upgradeInsecureRequests: [],         // força HTTPS em produção
    },
  },

  // ── HTTP Strict Transport Security (HSTS) ────────────────
  // Força HTTPS por 1 ano; inclui subdomínios; pré-carregamento opcional.
  // Em desenvolvimento é desativado automaticamente pelo Helmet quando !production.
  hsts: {
    maxAge:            365 * 24 * 60 * 60, // 1 ano em segundos
    includeSubDomains: true,
    preload:           true,
  },

  // ── X-Frame-Options ──────────────────────────────────────
  // Impede que a API seja embutida em <iframe> — já coberto pelo CSP frameAncestors
  // mas mantemos para compatibilidade com browsers mais antigos.
  frameguard: { action: 'deny' },

  // ── X-Content-Type-Options ───────────────────────────────
  // Impede MIME sniffing — o browser deve respeitar o Content-Type declarado.
  noSniff: true,

  // ── Referrer-Policy ──────────────────────────────────────
  // Não envia a URL de origem em requisições cross-origin.
  referrerPolicy: { policy: 'no-referrer' },

  // ── X-DNS-Prefetch-Control ────────────────────────────────
  dnsPrefetchControl: { allow: false },

  // ── X-Download-Options (IE) ──────────────────────────────
  ieNoOpen: true,

  // ── X-Permitted-Cross-Domain-Policies ────────────────────
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // ── X-Powered-By ─────────────────────────────────────────
  // Remove o header que identifica Express — reduz fingerprinting.
  hidePoweredBy: true,

  // ── Cross-Origin Embedder/Opener/Resource Policies ───────
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy:   { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// ── Permissions-Policy ────────────────────────────────────────
// Header não coberto pelo Helmet v7 — adicionado manualmente.
// Desativa todas as APIs de hardware/sensor — esta é uma API REST, não precisa de nenhuma.
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'fullscreen=(self)',      // permite fullscreen apenas da própria origem
      'picture-in-picture=()',
    ].join(', ')
  );
  next();
});

// ── COMPRESSÃO GZIP/BROTLI ───────────────────────────────────
// Reduz tamanho das respostas JSON em ~70%. Aplicado após headers de segurança.
app.use(compression({
  level: 6,
  threshold: 1024, // só comprime respostas > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ── CORS ─────────────────────────────────────────────────────
// Permite apenas os domínios oficiais do Chave 10.
// Em produção: lê FRONTEND_URL e FRONTEND_URL_2 do .env.
// Em desenvolvimento: localhost:5173 (Vite) e localhost:3000.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL_2,
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.error('❌ FATAL: FRONTEND_URL não definido. Configure a variável de ambiente.');
  process.exit(1);
}

// Métodos e headers permitidos — lista explícita (não usa wildcard)
const CORS_ALLOWED_METHODS  = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const CORS_ALLOWED_HEADERS  = ['Content-Type', 'Authorization'];
const CORS_EXPOSED_HEADERS  = ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'];

app.use(cors({
  origin(origin, cb) {
    // Sem origin = Postman, apps mobile, server-to-server
    // Em produção bloqueamos por segurança — só o frontend autorizado acessa a API.
    // Se precisar de chamadas server-to-server, adicione o IP/domínio em FRONTEND_URL_2.
    if (!origin) {
      return cb(null, process.env.NODE_ENV !== 'production');
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origem não permitida'));
  },
  methods:          CORS_ALLOWED_METHODS,
  allowedHeaders:   CORS_ALLOWED_HEADERS,
  exposedHeaders:   CORS_EXPOSED_HEADERS,
  credentials:      true,  // necessário para o frontend enviar o Authorization header
  maxAge:           86400, // cache do preflight OPTIONS por 24h — reduz requisições extras
  optionsSuccessStatus: 204, // alguns browsers antigos precisam de 204 no OPTIONS
}));

// ── VALIDAÇÃO DE CONTENT-TYPE ─────────────────────────────────
// POST, PUT e PATCH devem obrigatoriamente enviar application/json.
// Rejeita requisições com body sem Content-Type correto.
app.use(requireJsonContentType);

// ── BODY PARSER ───────────────────────────────────────────────
// Limite global: 3MB para cobrir logos em base64 (2MB original * 1.37 de overhead base64).
// A validação real de tamanho é feita pelo uploadValidator em cada rota específica.
app.use(express.json({
  limit: '10mb',
  strict: true,   // rejeita qualquer coisa que não seja array ou objeto JSON
  type: 'application/json',
}));

// ── REMOVER HEADERS QUE IDENTIFICAM A STACK ───────────────────
// X-Powered-By já foi removido pelo Helmet (hidePoweredBy: true).
// Server header: Express não adiciona — mas adicionamos remoção explícita por garantia.
// Cache-Control: respostas de API nunca devem ser cacheadas por proxies/CDN.
app.use((req, res, next) => {
  res.removeHeader('Server');
  res.removeHeader('X-AspNet-Version');
  res.removeHeader('X-AspNetMvc-Version');
  // API responses não devem ser cacheadas por proxies intermediários
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// ── CACHE SIMPLES EM MEMÓRIA ─────────────────────────────────
// Chave inclui oficina_id para garantir isolamento entre tenants.
const cache = new Map();
function cacheMiddleware(ttlSeconds = 30) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl + '|' + (req.user?.oficina_id || req.user?.id || '');
    const cached = cache.get(key);
    if (cached && Date.now() - cached.time < ttlSeconds * 1000) {
      return res.json(cached.data);
    }
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, { data, time: Date.now() });
      if (cache.size > 500) {
        const oldest = [...cache.entries()].sort((a,b) => a[1].time - b[1].time).slice(0, 200);
        oldest.forEach(([k]) => cache.delete(k));
      }
      return originalJson(data);
    };
    next();
  };
}

// ── RATE LIMIT: login / registro ─────────────────────────────
// Importados de middleware/rateLimits.js — configurações detalhadas lá.

// ── RATE LIMIT: rotas de escrita ──────────────────────────────
// Importados de middleware/rateLimits.js — configurações detalhadas lá.

// ── RATE LIMIT: rotas administrativas ────────────────────────
// Importados de middleware/rateLimits.js — configurações detalhadas lá.

// ── RASTREAMENTO PÚBLICO DE CLIQUE (antes das rotas autenticadas) ──
// Rota pública — não exige JWT. Rate-limited pelo readLimiter global.
// Chamada pelo frontend quando alguém acessa via ?ref=CODIGO.
app.post('/api/public/referral/clique', async (req, res) => {
  try {
    const { query: pgQuery, queryOne: pgOne, run: pgRun } = require('./db');
    const crypto = require('crypto');
    const codigo = req.body?.codigo;
    if (!codigo || typeof codigo !== 'string' || !/^C10-[A-F0-9]{6}$/.test(codigo)) {
      return res.status(400).json({ error: 'Código inválido' });
    }
    const codigoRow = await pgOne('SELECT * FROM referral_codigos WHERE codigo=$1 AND ativo=true', [codigo]);
    if (!codigoRow) return res.status(404).json({ error: 'Código não encontrado' });

    const ipHash = crypto.createHash('sha256')
      .update((req.ip || 'unknown') + (process.env.JWT_SECRET || ''))
      .digest('hex').slice(0, 16);

    const hoje = new Date().toISOString().slice(0, 10);
    const jaCli = await pgOne(
      `SELECT id FROM referral_cliques WHERE codigo=$1 AND ip_hash=$2 AND criado_em::date=$3::date`,
      [codigo, ipHash, hoje]
    );
    if (!jaCli) {
      await pgRun(
        'INSERT INTO referral_cliques(codigo, ip_hash, user_agent) VALUES($1,$2,$3)',
        [codigo, ipHash, (req.headers['user-agent'] || '').slice(0, 200)]
      );
      await pgRun(
        'UPDATE referral_codigos SET total_cliques=total_cliques+1 WHERE codigo=$1',
        [codigo]
      );
    }
    res.json({ ok: true, novo: !jaCli });
  } catch (err) {
    require('./utils/logger').error('referral_clique', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── ROTAS ─────────────────────────────────────────────────────
// loginLimiter aplicado em /api/auth — cobre /login, /register, /google e /google-register.
// Cada rota sensível dentro do auth router tem seu limiter específico (ver routes/auth.js).
app.use('/api/auth',              loginLimiter, require('./routes/auth'));
app.use('/api/admin',             adminLimiter, require('./routes/admin'));
app.use('/api/admin/referral',    adminLimiter, require('./routes/referral-admin'));
app.use('/api/app/os-fotos',      writeLimiter, require('./routes/os-fotos'));
app.use('/api/app/mecanicos',     writeLimiter, require('./routes/mecanicos'));
app.use('/api/app/meu-perfil',    writeLimiter, require('./routes/mecanico-perfil'));
app.use('/api/app/referral',      writeLimiter, require('./routes/referral'));
app.use('/api/app',               writeLimiter, cacheMiddleware(15), require('./routes/app'));
app.use('/api/backup',            writeLimiter, require('./routes/backup'));
app.use('/api/approval',          writeLimiter, require('./routes/approval'));

// ── PING — keep-alive para monitoramento externo ─────────────
// Rota pública — usada por load balancers e monitoramento.
// Retorna status do sistema com detalhes de saúde.
app.get('/health', async (_, res) => {
  try {
    const status = await getHealthStatus();
    const httpCode = status.status === 'healthy' ? 200 : 503;
    res.status(httpCode).json(status);
  } catch {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// ── MÉTRICAS DO SISTEMA (somente master_admin) ────────────────
// Retorna métricas detalhadas de performance e erros recentes.
app.get('/api/admin/metrics', (req, res, next) => {
  // Valida auth inline (não usa o router do admin para evitar dependência circular)
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    const jwt = require('jsonwebtoken');
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil !== 'master_admin') return res.status(403).json({ error: 'Acesso restrito' });
    res.json(getMetricsSummary());
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

// ── SEED DEMO (protegido por chave secreta) ───────────────────
// Desabilitado em produção se SEED_KEY não estiver definida.
app.get('/seed-demo', async (req, res) => {
  const chave    = req.query.chave;
  const SEED_KEY = process.env.SEED_KEY;
  if (!SEED_KEY) return res.status(503).json({ error: 'Seed desabilitado em produção' });
  if (chave !== SEED_KEY) return res.status(403).json({ error: 'Chave inválida' });

  try {
    const seed = require('./scripts/seed-demo');
    await seed();
    res.json({ ok: true, message: 'Conta demo criada! Email: teste@teste.com | Senha: demo1234' });
  } catch (err) {
    const log = require('./utils/logger');
    log.error('seed_demo', err);
    res.status(500).json({ error: 'Erro ao criar conta demo' });
  }
});

// ── SEED DEMO 60K — popula a conta demo com faturamento de R$ 60.000 ──
app.get('/seed-demo-60k', async (req, res) => {
  const chave    = req.query.chave;
  const SEED_KEY = process.env.SEED_KEY;
  if (!SEED_KEY) return res.status(503).json({ error: 'Seed desabilitado em produção' });
  if (chave !== SEED_KEY) return res.status(403).json({ error: 'Chave inválida' });

  try {
    const seed = require('./scripts/seed-demo-60k');
    await seed();
    res.json({ ok: true, message: 'Seed 60k aplicado! Faturamento demo: R$ 60.000' });
  } catch (err) {
    const log = require('./utils/logger');
    log.error('seed_demo_60k', err);
    res.status(500).json({ error: 'Erro ao aplicar seed 60k' });
  }
});

// ── 404 — ROTAS NÃO ENCONTRADAS ──────────────────────────────
// Deve ficar DEPOIS de todas as rotas e ANTES do errorHandler.
app.use(notFoundHandler);

// ── HANDLER DE ERROS GLOBAL ───────────────────────────────────
// Captura todos os erros lançados com next(err) ou throw em async handlers.
// Nunca expõe stack trace, SQL, paths internos ou tokens ao cliente.
app.use(errorHandler);

// ── START ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const { initDB, run } = require('./db');
const { scheduleBackup } = require('./utils/backup');

async function jobAtualizarVencidos() {
  try {
    const hoje  = new Date().toISOString().split('T')[0];
    const grace = new Date(); grace.setDate(grace.getDate() - 3);
    const graceStr = grace.toISOString().split('T')[0];
    await run("UPDATE oficinas SET status_assinatura='blocked' WHERE status_assinatura='overdue' AND data_vencimento < $1",   [graceStr]);
    await run("UPDATE oficinas SET status_assinatura='overdue' WHERE status_assinatura IN ('active','pending') AND data_vencimento < $1", [hoje]);
  } catch (err) {
    const log = require('./utils/logger');
    log.error('job_atualizar_vencidos', err);
  }
}

// Job de verificação de integridade do banco — roda 1x por dia
async function jobDbHealth() {
  try {
    const { runHealthCheck } = require('./services/dbHealthService');
    const resultado = await runHealthCheck();
    const log = require('./utils/logger');
    if (resultado.erros > 0) {
      log.error('db_health_erros', { erros: resultado.erros, avisos: resultado.avisos, duracao_ms: resultado.duracao_ms });
    } else if (resultado.avisos > 0) {
      log.warn('db_health_avisos', { avisos: resultado.avisos, duracao_ms: resultado.duracao_ms });
    } else {
      log.info('db_health_ok', { duracao_ms: resultado.duracao_ms });
    }
  } catch (err) {
    const log = require('./utils/logger');
    log.error('job_db_health', err);
  }
}

initDB()
  .then(async () => {
    app.listen(PORT, () =>
      console.log(`✅ Chave 10 backend rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`)
    );
    await jobAtualizarVencidos();
    setInterval(jobAtualizarVencidos, 60 * 60 * 1000);

    // Health check do banco 1x por dia (offset de 5 min para não coincidir com outros jobs)
    setTimeout(() => {
      jobDbHealth();
      setInterval(jobDbHealth, 24 * 60 * 60 * 1000);
    }, 5 * 60 * 1000);

    const backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24;
    scheduleBackup(backupInterval);
  })
  .catch(err => {
    console.error('❌ Erro ao inicializar banco:', err);
    process.exit(1);
  });
