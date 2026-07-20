/**
 * observability.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Monitoramento e observabilidade do Chave 10.
 *
 * Funcionalidades:
 *   - Request ID único (X-Request-Id) em cada requisição
 *   - Medição de tempo de resposta (X-Response-Time)
 *   - Métricas in-memory: total de reqs, erros, latência, por rota
 *   - Health check detalhado (banco, memória, uptime)
 *   - Status endpoint com métricas do sistema
 *   - Captura de uncaughtException e unhandledRejection
 *   - Logs estruturados com request ID para correlação
 *
 * Preparado para integração futura com:
 *   Sentry, Better Stack, Grafana, Datadog, New Relic
 *   (hooks exportados para envio de métricas a serviços externos)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require('crypto');
const os     = require('os');
const log    = require('../utils/logger');

// ─── Métricas em memória ──────────────────────────────────────────────────────
const metrics = {
  startedAt:     Date.now(),
  totalRequests: 0,
  totalErrors:   0,
  statusCodes:   {},  // { 200: count, 404: count, 500: count ... }
  latency:       { total: 0, count: 0, max: 0, min: Infinity },
  routes:        new Map(), // path -> { count, totalMs, errors }
  lastErrors:    [],        // últimos 20 erros (sem dados sensíveis)
};

const MAX_LAST_ERRORS = 20;

// ─── Request ID middleware ────────────────────────────────────────────────────
/**
 * Gera um ID único para cada requisição e injeta em req.id e no header.
 * Permite correlacionar logs do mesmo request em ferramentas externas.
 */
function requestId(req, res, next) {
  const id = crypto.randomBytes(8).toString('hex'); // 16 chars hex
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

// ─── Response time + métricas middleware ──────────────────────────────────────
/**
 * Mede o tempo de resposta e registra métricas por rota.
 */
function responseMetrics(req, res, next) {
  const start = process.hrtime.bigint();

  // Hook no finish do response
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const status     = res.statusCode;
    const route      = req.route?.path || req.path || '/';

    // Header de tempo de resposta
    if (!res.headersSent) {
      try { res.setHeader('X-Response-Time', `${durationMs.toFixed(1)}ms`); } catch {}
    }

    // Métricas globais
    metrics.totalRequests++;
    metrics.statusCodes[status] = (metrics.statusCodes[status] || 0) + 1;
    metrics.latency.total += durationMs;
    metrics.latency.count++;
    if (durationMs > metrics.latency.max) metrics.latency.max = durationMs;
    if (durationMs < metrics.latency.min) metrics.latency.min = durationMs;

    if (status >= 500) metrics.totalErrors++;

    // Métricas por rota (agrupa por prefixo /api/xxx)
    const routeKey = req.baseUrl + (req.route?.path || '');
    if (routeKey && routeKey !== '/') {
      const r = metrics.routes.get(routeKey) || { count: 0, totalMs: 0, errors: 0 };
      r.count++;
      r.totalMs += durationMs;
      if (status >= 400) r.errors++;
      metrics.routes.set(routeKey, r);
      // Limita tamanho do map
      if (metrics.routes.size > 200) {
        const oldest = [...metrics.routes.entries()].sort((a, b) => a[1].count - b[1].count);
        oldest.slice(0, 50).forEach(([k]) => metrics.routes.delete(k));
      }
    }

    // Log de requisições lentas (> 5s)
    if (durationMs > 5000) {
      log.warn('slow_request', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        status,
        durationMs: Math.round(durationMs),
      });
    }
  });

  next();
}

// ─── Registro de erros nas métricas ───────────────────────────────────────────
function recordError(err, req) {
  metrics.lastErrors.push({
    timestamp: new Date().toISOString(),
    requestId: req?.id,
    method:    req?.method,
    path:      req?.path?.slice(0, 80),
    message:   (err?.message || '').slice(0, 200),
    status:    err?.status || 500,
  });
  if (metrics.lastErrors.length > MAX_LAST_ERRORS) {
    metrics.lastErrors.shift();
  }
}

// ─── Health Check detalhado ───────────────────────────────────────────────────
async function getHealthStatus() {
  const uptime    = process.uptime();
  const mem       = process.memoryUsage();
  const osMem     = { total: os.totalmem(), free: os.freemem() };
  const cpuLoad   = os.loadavg();

  // Verifica banco
  let dbStatus = 'ok';
  let dbLatency = null;
  try {
    const { pool } = require('../db');
    const start = Date.now();
    await pool.query('SELECT 1');
    dbLatency = Date.now() - start;
    if (dbLatency > 1000) dbStatus = 'slow';
  } catch (err) {
    dbStatus = 'error';
  }

  return {
    status:  dbStatus === 'error' ? 'degraded' : 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    uptime:  Math.round(uptime),
    uptimeHuman: formatUptime(uptime),
    timestamp: new Date().toISOString(),
    node: process.version,
    memory: {
      rss:       Math.round(mem.rss / 1024 / 1024),
      heapUsed:  Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external:  Math.round(mem.external / 1024 / 1024),
      osFree:    Math.round(osMem.free / 1024 / 1024),
      osTotal:   Math.round(osMem.total / 1024 / 1024),
      usagePct:  Math.round((1 - osMem.free / osMem.total) * 100),
    },
    cpu: {
      load1m:  cpuLoad[0]?.toFixed(2),
      load5m:  cpuLoad[1]?.toFixed(2),
      load15m: cpuLoad[2]?.toFixed(2),
      cores:   os.cpus().length,
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
    },
    requests: {
      total:     metrics.totalRequests,
      errors:    metrics.totalErrors,
      errorRate: metrics.totalRequests > 0
        ? ((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
      avgLatencyMs: metrics.latency.count > 0
        ? Math.round(metrics.latency.total / metrics.latency.count)
        : 0,
      maxLatencyMs: Math.round(metrics.latency.max),
    },
  };
}

// ─── Status endpoint com métricas completas ───────────────────────────────────
function getMetricsSummary() {
  // Top 10 rotas mais usadas
  const topRoutes = [...metrics.routes.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([path, data]) => ({
      path,
      requests: data.count,
      avgMs: Math.round(data.totalMs / data.count),
      errors: data.errors,
    }));

  return {
    since: new Date(metrics.startedAt).toISOString(),
    requests: {
      total:    metrics.totalRequests,
      errors:   metrics.totalErrors,
      byStatus: metrics.statusCodes,
    },
    latency: {
      avgMs: metrics.latency.count > 0 ? Math.round(metrics.latency.total / metrics.latency.count) : 0,
      maxMs: Math.round(metrics.latency.max),
      minMs: metrics.latency.min === Infinity ? 0 : Math.round(metrics.latency.min),
    },
    topRoutes,
    lastErrors: metrics.lastErrors,
  };
}

// ─── Captura global de exceções ───────────────────────────────────────────────
function setupProcessHandlers() {
  process.on('uncaughtException', (err) => {
    log.error('UNCAUGHT_EXCEPTION', err);
    recordError(err);
    // Em produção: tenta fechar gracefully
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => process.exit(1), 1000);
    }
  });

  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    log.error('UNHANDLED_REJECTION', err);
    recordError(err);
  });

  // Log de encerramento
  process.on('SIGTERM', () => {
    log.info('PROCESS_SIGTERM', { uptime: process.uptime() });
    process.exit(0);
  });

  process.on('SIGINT', () => {
    log.info('PROCESS_SIGINT', { uptime: process.uptime() });
    process.exit(0);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

module.exports = {
  requestId,
  responseMetrics,
  recordError,
  getHealthStatus,
  getMetricsSummary,
  setupProcessHandlers,
  metrics,
};
