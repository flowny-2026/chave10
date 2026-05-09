// Carrega variáveis de ambiente antes de tudo
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ── HELMET: headers de segurança HTTP ────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      // Aceita qualquer subdomínio da Vercel e Railway
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // Postman, mobile, server-to-server
    // Em produção aceita: FRONTEND_URL definido, *.vercel.app, *.railway.app, github.io
    if (process.env.NODE_ENV === 'production') {
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.railway.app') ||
        origin.endsWith('.github.io')
      ) return cb(null, true);
      return cb(new Error('CORS: origem não permitida'));
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origem não permitida'));
  },
  credentials: true,
}));

// ── BODY PARSER ───────────────────────────────────────────────
app.use(express.json({ limit: '50kb' })); // limita tamanho do payload

// ── RATE LIMIT: proteção contra brute force no login ─────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,                   // máx 20 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// ── ROTAS ─────────────────────────────────────────────────────
app.use('/api/auth',   loginLimiter, require('./routes/auth'));
app.use('/api/admin',  require('./routes/admin'));
app.use('/api/app',    require('./routes/app'));
app.use('/api/backup', require('./routes/backup'));

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));

// ── SEED DEMO (protegido por chave secreta) ───────────────────
app.get('/seed-demo', async (req, res) => {
  const chave = req.query.chave;
  const SEED_KEY = process.env.SEED_KEY || 'chave10seed2026';
  if (chave !== SEED_KEY) return res.status(403).json({ error: 'Chave inválida' });

  try {
    const seed = require('./scripts/seed-demo');
    await seed();
    res.json({ ok: true, message: 'Conta demo criada! Email: teste@teste.com | Senha: demo1234' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HANDLER DE ERROS GLOBAL ───────────────────────────────────
// Nunca expõe stack trace para o cliente
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const log = require('./utils/logger');

  // Payload muito grande (body-parser)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload muito grande. Limite: 50kb.' });
  }
  // Erro de CORS
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: 'Origem não permitida' });
  }

  log.error('unhandled_error', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ── START ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const { initDB } = require('./db');
const { scheduleBackup } = require('./utils/backup');

initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Chave 10 backend rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`));
    
    // Configura backup automático (a cada 24 horas por padrão)
    const backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24;
    scheduleBackup(backupInterval);
  })
  .catch(err => {
    console.error('❌ Erro ao inicializar banco:', err);
    process.exit(1);
  });
