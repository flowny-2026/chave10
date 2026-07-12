/**
 * auditService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço centralizado de auditoria do Chave 10.
 *
 * Registra ações dos usuários no banco para consulta posterior.
 * A gravação é assíncrona e não-bloqueante — falhas silenciosas não afetam
 * o fluxo normal da aplicação.
 *
 * Campos de cada registro:
 *   id           — identificador único
 *   oficina_id   — tenant isolado (null para ações do master_admin)
 *   usuario_id   — ID do usuário que executou a ação
 *   usuario_nome — nome legível (snapshot no momento da ação)
 *   usuario_email— email (snapshot)
 *   perfil       — master_admin | admin_oficina | funcionario
 *   acao         — verbo da ação (ex: LOGIN, CRIAR_CLIENTE, DELETAR_OS)
 *   entidade     — tabela/recurso afetado (ex: clientes, os, usuarios)
 *   entidade_id  — PK do recurso afetado (null se não se aplica)
 *   detalhes     — JSONB com contexto adicional (sem dados sensíveis)
 *   resultado    — 'sucesso' | 'falha'
 *   ip           — IP anonimizado (3 octetos IPv4 / 4 grupos IPv6)
 *   user_agent   — navegador/cliente (limitado a 200 chars)
 *   created_at   — timestamp do evento
 *
 * NUNCA registrado:
 *   - Senhas ou hashes
 *   - Tokens JWT
 *   - Secrets ou API keys
 *   - Dados bancários completos
 *   - Conteúdo de campos de texto livre (obs, descrição, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { run } = require('../db');
const syslog  = require('../utils/logger');

// ─── Ações disponíveis — constantes para evitar typos ────────────────────────
const ACOES = {
  // Autenticação
  LOGIN:                 'LOGIN',
  LOGIN_FALHA:           'LOGIN_FALHA',
  LOGOUT:                'LOGOUT',
  REGISTRO:              'REGISTRO',
  REGISTRO_GOOGLE:       'REGISTRO_GOOGLE',
  TROCAR_SENHA:          'TROCAR_SENHA',
  TROCAR_SENHA_FALHA:    'TROCAR_SENHA_FALHA',
  REDEFINIR_SENHA:       'REDEFINIR_SENHA',

  // Clientes
  CRIAR_CLIENTE:         'CRIAR_CLIENTE',
  EDITAR_CLIENTE:        'EDITAR_CLIENTE',
  DELETAR_CLIENTE:       'DELETAR_CLIENTE',

  // Veículos
  CRIAR_VEICULO:         'CRIAR_VEICULO',
  EDITAR_VEICULO:        'EDITAR_VEICULO',
  DELETAR_VEICULO:       'DELETAR_VEICULO',

  // Ordens de Serviço
  CRIAR_OS:              'CRIAR_OS',
  EDITAR_OS:             'EDITAR_OS',
  DELETAR_OS:            'DELETAR_OS',
  ALTERAR_STATUS_OS:     'ALTERAR_STATUS_OS',
  PAGAMENTO_OS:          'PAGAMENTO_OS',

  // Orçamentos
  CRIAR_ORCAMENTO:       'CRIAR_ORCAMENTO',
  EDITAR_ORCAMENTO:      'EDITAR_ORCAMENTO',
  DELETAR_ORCAMENTO:     'DELETAR_ORCAMENTO',
  ALTERAR_STATUS_ORCAMENTO: 'ALTERAR_STATUS_ORCAMENTO',

  // Usuários (admin)
  CRIAR_USUARIO:         'CRIAR_USUARIO',
  DELETAR_USUARIO:       'DELETAR_USUARIO',
  DESVINCULAR_USUARIO:   'DESVINCULAR_USUARIO',

  // Oficinas (master_admin)
  CRIAR_OFICINA:         'CRIAR_OFICINA',
  EDITAR_OFICINA:        'EDITAR_OFICINA',
  DELETAR_OFICINA:       'DELETAR_OFICINA',
  ALTERAR_STATUS_OFICINA:'ALTERAR_STATUS_OFICINA',
  RENOVAR_ASSINATURA:    'RENOVAR_ASSINATURA',

  // Configurações
  EDITAR_CONFIGURACOES:  'EDITAR_CONFIGURACOES',

  // Estoque
  CRIAR_ESTOQUE:         'CRIAR_ESTOQUE',
  EDITAR_ESTOQUE:        'EDITAR_ESTOQUE',
  DELETAR_ESTOQUE:       'DELETAR_ESTOQUE',

  // Despesas
  CRIAR_DESPESA:         'CRIAR_DESPESA',
  EDITAR_DESPESA:        'EDITAR_DESPESA',
  DELETAR_DESPESA:       'DELETAR_DESPESA',

  // Agenda
  CRIAR_AGENDA:          'CRIAR_AGENDA',
  EDITAR_AGENDA:         'EDITAR_AGENDA',
  DELETAR_AGENDA:        'DELETAR_AGENDA',

  // Aprovação de orçamento (via link público)
  APROVACAO_ORCAMENTO:   'APROVACAO_ORCAMENTO',
  REJEICAO_ORCAMENTO:    'REJEICAO_ORCAMENTO',
  GERAR_LINK_APROVACAO:  'GERAR_LINK_APROVACAO',
};

// ─── Campos sensíveis nunca registrados nos detalhes ─────────────────────────
const CAMPOS_SENSIVEIS = new Set([
  'senha', 'senha_hash', 'password', 'hash', 'token', 'secret',
  'authorization', 'credential', 'api_key', 'access_token',
  'refresh_token', 'private_key', 'client_secret', 'jwt',
  'obs', 'observacao', 'descricao', 'servicos', 'pecas', // dados de negócio livres
]);

/**
 * Remove campos sensíveis de um objeto de detalhes antes de persistir.
 */
function sanitizeDetalhes(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const safe = {};
  for (const [k, v] of Object.entries(obj)) {
    if (CAMPOS_SENSIVEIS.has(k.toLowerCase())) continue;
    if (typeof v === 'string' && v.length > 500) continue; // não loga textos longos
    if (typeof v === 'object' && v !== null) {
      safe[k] = sanitizeDetalhes(v);
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

/**
 * Anonimiza o IP: mantém 3 octetos (IPv4) ou 4 grupos (IPv6).
 */
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

/**
 * Extrai o User-Agent do request, limitado a 200 chars.
 */
function extractUA(req) {
  return (req?.headers?.['user-agent'] || '').slice(0, 200) || null;
}

/**
 * Função principal de auditoria.
 *
 * @param {object} req          — request do Express (para extrair IP, UA, user)
 * @param {string} acao         — constante de ACOES
 * @param {string} entidade     — nome da tabela/recurso (ex: 'clientes')
 * @param {number|null} entidade_id — PK do recurso afetado
 * @param {object} detalhes     — dados adicionais (sanitizados automaticamente)
 * @param {string} resultado    — 'sucesso' | 'falha'
 * @param {object} userOverride — sobrescreve req.user (para casos de login sem token ainda)
 */
async function audit(req, acao, entidade = null, entidade_id = null, detalhes = {}, resultado = 'sucesso', userOverride = null) {
  try {
    const user = userOverride || req?.user || {};
    const ip   = anonimizarIp(req?.ip);
    const ua   = extractUA(req);
    const safe = sanitizeDetalhes(detalhes);

    await run(
      `INSERT INTO audit_logs
         (oficina_id, usuario_id, usuario_nome, usuario_email, perfil,
          acao, entidade, entidade_id, detalhes, resultado, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        user.oficina_id  || null,
        user.id          || null,
        user.nome        || null,
        user.email       || null,
        user.perfil      || null,
        acao,
        entidade,
        entidade_id      || null,
        Object.keys(safe).length ? JSON.stringify(safe) : null,
        resultado,
        ip,
        ua,
      ]
    );
  } catch (err) {
    // Falha na auditoria NUNCA deve derrubar a resposta ao usuário
    syslog.error('audit_service_falha', err);
  }
}

module.exports = { audit, ACOES };
