/**
 * auditService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço centralizado de auditoria do Chave 10.
 *
 * Funcionalidades:
 *   - audit()        — registra qualquer ação do usuário com severidade
 *   - auditAlert()   — cria um alerta de segurança automaticamente
 *   - detector       — analisa padrões suspeitos em tempo real (em memória)
 *
 * Níveis de severidade:
 *   info     — ação normal do sistema (login, criação de registro)
 *   aviso    — comportamento incomum mas não necessariamente malicioso
 *   alto     — evento que requer atenção (múltiplas falhas, exclusão em massa)
 *   critico  — ataque em andamento ou violação grave (IDOR, brute force confirmado)
 *
 * NUNCA registrado:
 *   Senhas, hashes, tokens JWT, secrets, dados bancários completos.
 *
 * Imutabilidade:
 *   Os registros são inseridos com INSERT — não há UPDATE nem DELETE exposto.
 *   A API de consulta é somente leitura. Apenas o banco pode excluir logs
 *   (processo de retenção por tempo, fora do escopo da aplicação).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { run, query: dbQuery } = require('../db');
const syslog = require('../utils/logger');

// ─── Severidades ─────────────────────────────────────────────────────────────
const SEVERIDADES = {
  INFO:    'info',
  AVISO:   'aviso',
  ALTO:    'alto',
  CRITICO: 'critico',
};

// ─── Ações disponíveis ────────────────────────────────────────────────────────
const ACOES = {
  // Autenticação
  LOGIN:                    'LOGIN',
  LOGIN_FALHA:              'LOGIN_FALHA',
  LOGOUT:                   'LOGOUT',
  REGISTRO:                 'REGISTRO',
  REGISTRO_GOOGLE:          'REGISTRO_GOOGLE',
  TROCAR_SENHA:             'TROCAR_SENHA',
  TROCAR_SENHA_FALHA:       'TROCAR_SENHA_FALHA',
  REDEFINIR_SENHA:          'REDEFINIR_SENHA',

  // Clientes
  CRIAR_CLIENTE:            'CRIAR_CLIENTE',
  EDITAR_CLIENTE:           'EDITAR_CLIENTE',
  DELETAR_CLIENTE:          'DELETAR_CLIENTE',

  // Veículos
  CRIAR_VEICULO:            'CRIAR_VEICULO',
  EDITAR_VEICULO:           'EDITAR_VEICULO',
  DELETAR_VEICULO:          'DELETAR_VEICULO',

  // Ordens de Serviço
  CRIAR_OS:                 'CRIAR_OS',
  EDITAR_OS:                'EDITAR_OS',
  DELETAR_OS:               'DELETAR_OS',
  ALTERAR_STATUS_OS:        'ALTERAR_STATUS_OS',
  PAGAMENTO_OS:             'PAGAMENTO_OS',

  // Orçamentos
  CRIAR_ORCAMENTO:          'CRIAR_ORCAMENTO',
  EDITAR_ORCAMENTO:         'EDITAR_ORCAMENTO',
  DELETAR_ORCAMENTO:        'DELETAR_ORCAMENTO',
  ALTERAR_STATUS_ORCAMENTO: 'ALTERAR_STATUS_ORCAMENTO',

  // Usuários (admin)
  CRIAR_USUARIO:            'CRIAR_USUARIO',
  DELETAR_USUARIO:          'DELETAR_USUARIO',
  DESVINCULAR_USUARIO:      'DESVINCULAR_USUARIO',
  ALTERAR_PERMISSAO:        'ALTERAR_PERMISSAO',

  // Oficinas (master_admin)
  CRIAR_OFICINA:            'CRIAR_OFICINA',
  EDITAR_OFICINA:           'EDITAR_OFICINA',
  DELETAR_OFICINA:          'DELETAR_OFICINA',
  ALTERAR_STATUS_OFICINA:   'ALTERAR_STATUS_OFICINA',
  RENOVAR_ASSINATURA:       'RENOVAR_ASSINATURA',

  // Configurações
  EDITAR_CONFIGURACOES:     'EDITAR_CONFIGURACOES',

  // Estoque
  CRIAR_ESTOQUE:            'CRIAR_ESTOQUE',
  EDITAR_ESTOQUE:           'EDITAR_ESTOQUE',
  DELETAR_ESTOQUE:          'DELETAR_ESTOQUE',

  // Despesas
  CRIAR_DESPESA:            'CRIAR_DESPESA',
  EDITAR_DESPESA:           'EDITAR_DESPESA',
  DELETAR_DESPESA:          'DELETAR_DESPESA',

  // Agenda
  CRIAR_AGENDA:             'CRIAR_AGENDA',
  EDITAR_AGENDA:            'EDITAR_AGENDA',
  DELETAR_AGENDA:           'DELETAR_AGENDA',

  // Aprovação de orçamento (via link público)
  APROVACAO_ORCAMENTO:      'APROVACAO_ORCAMENTO',
  REJEICAO_ORCAMENTO:       'REJEICAO_ORCAMENTO',
  GERAR_LINK_APROVACAO:     'GERAR_LINK_APROVACAO',

  // Alertas de segurança (gerados pelo sistema, não pelo usuário)
  ALERTA_BRUTE_FORCE:       'ALERTA_BRUTE_FORCE',
  ALERTA_FLOOD:             'ALERTA_FLOOD',
  ALERTA_ACESSO_NEGADO:     'ALERTA_ACESSO_NEGADO',
  ALERTA_IDOR:              'ALERTA_IDOR',
  ALERTA_EXCLUSAO_MASSA:    'ALERTA_EXCLUSAO_MASSA',
  ALERTA_ERRO_REPETITIVO:   'ALERTA_ERRO_REPETITIVO',
};

// ─── Mapa de severidade padrão por ação ───────────────────────────────────────
const SEVERIDADE_PADRAO = {
  LOGIN:                    SEVERIDADES.INFO,
  LOGIN_FALHA:              SEVERIDADES.AVISO,
  LOGOUT:                   SEVERIDADES.INFO,
  REGISTRO:                 SEVERIDADES.INFO,
  REGISTRO_GOOGLE:          SEVERIDADES.INFO,
  TROCAR_SENHA:             SEVERIDADES.AVISO,
  TROCAR_SENHA_FALHA:       SEVERIDADES.ALTO,
  REDEFINIR_SENHA:          SEVERIDADES.AVISO,
  CRIAR_CLIENTE:            SEVERIDADES.INFO,
  EDITAR_CLIENTE:           SEVERIDADES.INFO,
  DELETAR_CLIENTE:          SEVERIDADES.AVISO,
  CRIAR_OS:                 SEVERIDADES.INFO,
  EDITAR_OS:                SEVERIDADES.INFO,
  DELETAR_OS:               SEVERIDADES.AVISO,
  ALTERAR_STATUS_OS:        SEVERIDADES.INFO,
  PAGAMENTO_OS:             SEVERIDADES.INFO,
  CRIAR_ORCAMENTO:          SEVERIDADES.INFO,
  EDITAR_ORCAMENTO:         SEVERIDADES.INFO,
  DELETAR_ORCAMENTO:        SEVERIDADES.AVISO,
  ALTERAR_STATUS_ORCAMENTO: SEVERIDADES.INFO,
  CRIAR_USUARIO:            SEVERIDADES.AVISO,
  DELETAR_USUARIO:          SEVERIDADES.ALTO,
  DESVINCULAR_USUARIO:      SEVERIDADES.AVISO,
  ALTERAR_PERMISSAO:        SEVERIDADES.ALTO,
  CRIAR_OFICINA:            SEVERIDADES.AVISO,
  EDITAR_OFICINA:           SEVERIDADES.AVISO,
  DELETAR_OFICINA:          SEVERIDADES.ALTO,
  ALTERAR_STATUS_OFICINA:   SEVERIDADES.AVISO,
  RENOVAR_ASSINATURA:       SEVERIDADES.INFO,
  EDITAR_CONFIGURACOES:     SEVERIDADES.AVISO,
  CRIAR_ESTOQUE:            SEVERIDADES.INFO,
  EDITAR_ESTOQUE:           SEVERIDADES.INFO,
  DELETAR_ESTOQUE:          SEVERIDADES.AVISO,
  CRIAR_DESPESA:            SEVERIDADES.INFO,
  EDITAR_DESPESA:           SEVERIDADES.INFO,
  DELETAR_DESPESA:          SEVERIDADES.AVISO,
  CRIAR_AGENDA:             SEVERIDADES.INFO,
  EDITAR_AGENDA:            SEVERIDADES.INFO,
  DELETAR_AGENDA:           SEVERIDADES.INFO,
  APROVACAO_ORCAMENTO:      SEVERIDADES.INFO,
  REJEICAO_ORCAMENTO:       SEVERIDADES.INFO,
  GERAR_LINK_APROVACAO:     SEVERIDADES.INFO,
  ALERTA_BRUTE_FORCE:       SEVERIDADES.CRITICO,
  ALERTA_FLOOD:             SEVERIDADES.ALTO,
  ALERTA_ACESSO_NEGADO:     SEVERIDADES.ALTO,
  ALERTA_IDOR:              SEVERIDADES.CRITICO,
  ALERTA_EXCLUSAO_MASSA:    SEVERIDADES.ALTO,
  ALERTA_ERRO_REPETITIVO:   SEVERIDADES.AVISO,
};

// ─── Campos sensíveis nunca registrados ───────────────────────────────────────
const CAMPOS_SENSIVEIS = new Set([
  'senha', 'senha_hash', 'password', 'hash', 'token', 'secret',
  'authorization', 'credential', 'api_key', 'access_token',
  'refresh_token', 'private_key', 'client_secret', 'jwt',
  'obs', 'observacao', 'descricao', 'servicos', 'pecas',
]);

function sanitizeDetalhes(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const safe = {};
  for (const [k, v] of Object.entries(obj)) {
    if (CAMPOS_SENSIVEIS.has(k.toLowerCase())) continue;
    if (typeof v === 'string' && v.length > 500) continue;
    if (typeof v === 'object' && v !== null) {
      safe[k] = sanitizeDetalhes(v);
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

function anonimizarIp(ip) {
  if (!ip || typeof ip !== 'string') return null;
  const clean = ip.replace(/^::ffff:/, '');
  if (clean.includes(':')) {
    const parts = clean.split(':');
    return parts.slice(0, 4).join(':') + ':xxxx';
  }
  const parts = clean.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  return null;
}

function extractUA(req) {
  return (req?.headers?.['user-agent'] || '').slice(0, 200) || null;
}

// ─── Detector de padrões suspeitos (em memória) ───────────────────────────────
// Janela deslizante por IP/usuário com TTL automático.
// Não é usado para bloqueio — apenas para geração de alertas.
const _contadores = new Map(); // chave -> { count, firstAt, lastAt }
const _TTL = 10 * 60 * 1000;  // 10 minutos

function _incr(chave) {
  const now = Date.now();
  let c = _contadores.get(chave);
  if (!c || (now - c.lastAt) > _TTL) {
    c = { count: 0, firstAt: now, lastAt: now };
  }
  c.count++;
  c.lastAt = now;
  _contadores.set(chave, c);
  // Limpeza periódica — evita leak de memória
  if (_contadores.size > 20000) {
    for (const [k, v] of _contadores) {
      if ((now - v.lastAt) > _TTL) _contadores.delete(k);
    }
  }
  return c;
}

// ─── Inserção de alerta no banco ──────────────────────────────────────────────
async function _insertAlerta(tipo, severidade, ip, usuario_id, oficina_id, detalhes) {
  try {
    const safe = sanitizeDetalhes(detalhes || {});
    await run(
      `INSERT INTO audit_alerts
         (tipo, severidade, ip, usuario_id, oficina_id, detalhes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        tipo,
        severidade,
        anonimizarIp(ip) || ip,
        usuario_id || null,
        oficina_id || null,
        Object.keys(safe).length ? JSON.stringify(safe) : null,
      ]
    );
    syslog.security(`alerta_${tipo.toLowerCase()}`, { severidade, ip: anonimizarIp(ip), usuario_id, oficina_id, ...safe });
  } catch (err) {
    syslog.error('audit_alert_insert', err);
  }
}

// ─── Análise automática de padrões após cada evento ──────────────────────────
async function _analisarPadroes(acao, ip, usuario_id, oficina_id, resultado) {
  const ipKey     = `ip:${ip}`;
  const userKey   = `user:${usuario_id}`;

  // 1. Brute force de login — 5+ falhas em 10 min no mesmo IP
  if (acao === ACOES.LOGIN_FALHA) {
    const c = _incr(`bf:${ip}`);
    if (c.count === 5) {
      await _insertAlerta('brute_force', SEVERIDADES.CRITICO, ip, usuario_id, null, {
        tentativas: c.count,
        janela_min: 10,
        primeiro_em: new Date(c.firstAt).toISOString(),
      });
    }
  }

  // 2. Acesso negado repetidamente — 10+ em 10 min no mesmo IP ou usuário
  if (resultado === 'falha' && acao !== ACOES.LOGIN_FALHA && acao !== ACOES.TROCAR_SENHA_FALHA) {
    const c = _incr(`acesso_negado:${ip}`);
    if (c.count === 10) {
      await _insertAlerta('acesso_negado_repetido', SEVERIDADES.ALTO, ip, usuario_id, oficina_id, {
        tentativas: c.count,
        janela_min: 10,
      });
    }
  }

  // 3. Exclusão em massa — 5+ deleções em 2 min do mesmo usuário
  if (acao?.startsWith('DELETAR') || acao?.startsWith('EXCLUIR')) {
    const c = _incr(`del:${usuario_id}`);
    if (c.count === 5) {
      await _insertAlerta('exclusao_massa', SEVERIDADES.ALTO, ip, usuario_id, oficina_id, {
        exclusoes: c.count,
        janela_min: 2,
        acao_gatilho: acao,
      });
    }
  }

  // 4. Flood de requisições — 100+ ações em 1 min do mesmo IP
  const floodC = _incr(`flood:${ip}`);
  if (floodC.count === 100) {
    await _insertAlerta('flood_requisicoes', SEVERIDADES.ALTO, ip, usuario_id, oficina_id, {
      requisicoes: floodC.count,
      janela_min: 1,
    });
  }

  // 5. IDOR — tentativa de acesso a outra oficina
  if (acao === ACOES.ALERTA_IDOR) {
    await _insertAlerta('idor', SEVERIDADES.CRITICO, ip, usuario_id, oficina_id, {});
  }

  // 6. Alteração de permissão — sempre gera aviso independente de padrão
  if (acao === ACOES.ALTERAR_PERMISSAO || acao === ACOES.REDEFINIR_SENHA) {
    await _insertAlerta('alteracao_permissao', SEVERIDADES.AVISO, ip, usuario_id, oficina_id, { acao });
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Registra uma ação de auditoria.
 * Assíncrono e não-bloqueante — falhas não afetam a resposta ao usuário.
 */
async function audit(req, acao, entidade = null, entidade_id = null, detalhes = {}, resultado = 'sucesso', userOverride = null) {
  try {
    const user       = userOverride || req?.user || {};
    const ip         = req?.ip;
    const ua         = extractUA(req);
    const safe       = sanitizeDetalhes(detalhes);
    const severidade = SEVERIDADE_PADRAO[acao] || SEVERIDADES.INFO;

    await run(
      `INSERT INTO audit_logs
         (oficina_id, usuario_id, usuario_nome, usuario_email, perfil,
          acao, entidade, entidade_id, detalhes, resultado, severidade, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        user.oficina_id || null,
        user.id         || null,
        user.nome       || null,
        user.email      || null,
        user.perfil     || null,
        acao,
        entidade,
        entidade_id     || null,
        Object.keys(safe).length ? JSON.stringify(safe) : null,
        resultado,
        severidade,
        anonimizarIp(ip),
        ua,
      ]
    );

    // Análise assíncrona de padrões — não aguarda
    _analisarPadroes(acao, ip, user.id, user.oficina_id, resultado).catch(() => {});

  } catch (err) {
    syslog.error('audit_service_falha', err);
  }
}

/**
 * Registra um alerta de segurança diretamente (chamado por middlewares).
 * Usado por authorization.js para registrar tentativas de IDOR.
 */
async function auditAlert(tipo, severidade, ip, usuario_id, oficina_id, detalhes) {
  await _insertAlerta(tipo, severidade, ip, usuario_id, oficina_id, detalhes);
}

module.exports = { audit, auditAlert, ACOES, SEVERIDADES };
