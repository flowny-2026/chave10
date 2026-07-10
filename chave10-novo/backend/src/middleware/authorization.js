/**
 * authorization.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Middlewares centralizados de autorização para o sistema multiempresa Chave 10.
 *
 * REGRA FUNDAMENTAL:
 *   O oficina_id SEMPRE vem de req.user.oficina_id (JWT autenticado).
 *   Nunca confiamos em body.oficina_id, query.oficina_id, params.oficina_id
 *   ou qualquer dado enviado pelo cliente.
 *
 * Padrão de respostas:
 *   401 — Não autenticado
 *   403 — Sem permissão (perfil insuficiente)
 *   404 — Recurso inexistente (ou pertence a outra oficina — não revelar qual)
 *   409 — Conflito
 *   500 — Erro interno
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { queryOne } = require('../db');
const log = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retorna o oficina_id do usuário autenticado.
 * Lança erro se não existir (nunca deve acontecer após oficinaSelf middleware).
 */
function getOficinId(req) {
  const id = req.user?.oficina_id;
  if (!id) throw new Error('oficina_id ausente no token — middleware oficinaSelf deveria ter bloqueado');
  return id;
}

// ─── Ownership validators ────────────────────────────────────────────────────

/**
 * Verifica se um recurso pertence à oficina do usuário autenticado.
 *
 * @param {string} table   - Nome da tabela (ex: 'clientes', 'veiculos')
 * @param {number} id      - PK do recurso
 * @param {number} oficina_id - ID da oficina do usuário autenticado
 * @returns {Promise<object|null>} - Linha encontrada ou null se não pertencer
 */
async function verifyOwnership(table, id, oficina_id) {
  return queryOne(
    `SELECT id FROM ${table} WHERE id=$1 AND oficina_id=$2`,
    [id, oficina_id]
  );
}

/**
 * Middleware factory: verifica que o recurso em req.params.id pertence
 * à oficina do usuário autenticado.
 *
 * Uso:
 *   router.delete('/clientes/:id', validateId, checkOwns('clientes'), handler)
 *
 * Se o recurso não existir OU pertencer a outra oficina → 404
 * (não revelamos a qual oficina o recurso pertence — evita enumeração)
 *
 * @param {string} table - Nome da tabela do banco
 */
function checkOwns(table) {
  return async (req, res, next) => {
    try {
      const row = await verifyOwnership(table, req.params.id, getOficinId(req));
      if (!row) {
        log.security('idor_tentativa', {
          usuario_id: req.user?.id,
          oficina_id: req.user?.oficina_id,
          tabela: table,
          id_solicitado: req.params.id,
          path: req.path,
          ip: req.ip,
        });
        return res.status(404).json({ error: 'Recurso não encontrado' });
      }
      next();
    } catch (err) {
      log.error('check_owns', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  };
}

/**
 * Valida que um cliente_id (vindo do body) pertence à oficina do usuário.
 * Deve ser chamado ANTES do handler de rota quando cliente_id é fornecido.
 *
 * Uso:
 *   router.post('/veiculos', validateVeiculo, checkClienteOwnership, handler)
 *
 * Se cliente_id não for informado, passa (é opcional em alguns contextos).
 */
async function checkClienteOwnership(req, res, next) {
  const cliente_id = req.body?.cliente_id;
  if (!cliente_id) return next(); // opcional

  try {
    const row = await verifyOwnership('clientes', cliente_id, getOficinId(req));
    if (!row) {
      log.security('idor_tentativa_cliente', {
        usuario_id: req.user?.id,
        oficina_id: req.user?.oficina_id,
        cliente_id_solicitado: cliente_id,
        path: req.path,
        ip: req.ip,
      });
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    next();
  } catch (err) {
    log.error('check_cliente_ownership', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * Valida que um veiculo_id (vindo do body) pertence à oficina do usuário.
 */
async function checkVeiculoOwnership(req, res, next) {
  const veiculo_id = req.body?.veiculo_id;
  if (!veiculo_id) return next(); // opcional

  try {
    const row = await verifyOwnership('veiculos', veiculo_id, getOficinId(req));
    if (!row) {
      log.security('idor_tentativa_veiculo', {
        usuario_id: req.user?.id,
        oficina_id: req.user?.oficina_id,
        veiculo_id_solicitado: veiculo_id,
        path: req.path,
        ip: req.ip,
      });
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }
    next();
  } catch (err) {
    log.error('check_veiculo_ownership', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * Valida que ambos cliente_id e veiculo_id (se fornecidos) pertencem
 * à oficina do usuário. Combinação dos dois checks acima em um só middleware.
 */
async function checkClienteVeiculoOwnership(req, res, next) {
  const oficina_id  = getOficinId(req);
  const cliente_id  = req.body?.cliente_id;
  const veiculo_id  = req.body?.veiculo_id;

  try {
    if (cliente_id) {
      const c = await verifyOwnership('clientes', cliente_id, oficina_id);
      if (!c) {
        log.security('idor_tentativa_cliente', {
          usuario_id: req.user?.id,
          oficina_id,
          cliente_id_solicitado: cliente_id,
          path: req.path,
          ip: req.ip,
        });
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
    }

    if (veiculo_id) {
      const v = await verifyOwnership('veiculos', veiculo_id, oficina_id);
      if (!v) {
        log.security('idor_tentativa_veiculo', {
          usuario_id: req.user?.id,
          oficina_id,
          veiculo_id_solicitado: veiculo_id,
          path: req.path,
          ip: req.ip,
        });
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }
    }

    next();
  } catch (err) {
    log.error('check_cliente_veiculo_ownership', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * Valida que um cliente_id na query string (req.query.cliente_id)
 * pertence à oficina do usuário.
 * Usado em GET /veiculos?cliente_id=X
 */
async function checkQueryClienteOwnership(req, res, next) {
  const rawClienteId = req.query.cliente_id;
  if (rawClienteId === undefined) return next(); // sem filtro, passa

  const cliente_id = parseInt(rawClienteId, 10);
  if (!Number.isInteger(cliente_id) || cliente_id <= 0) {
    return res.status(400).json({ error: 'cliente_id inválido' });
  }

  try {
    const row = await verifyOwnership('clientes', cliente_id, getOficinId(req));
    if (!row) {
      log.security('idor_tentativa_query_cliente', {
        usuario_id: req.user?.id,
        oficina_id: req.user?.oficina_id,
        cliente_id_solicitado: rawClienteId,
        path: req.path,
        ip: req.ip,
      });
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    // Normaliza para inteiro validado
    req.query.cliente_id = cliente_id;
    next();
  } catch (err) {
    log.error('check_query_cliente_ownership', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * Wrapper para handlers que fazem UPDATE/DELETE.
 * Verifica se rowCount > 0 e retorna 404 se nenhuma linha foi afetada.
 * Isso previne respostas silenciosas de {ok:true} quando o recurso
 * pertence a outra oficina.
 *
 * Nota: Para usar este helper, os handlers devem chamar checkOwns() ANTES,
 * garantindo que o recurso existe e pertence à oficina. Esse helper é
 * uma defesa em profundidade adicional.
 */
function assertAffected(result, res) {
  if (result && result.rowCount === 0) {
    return res.status(404).json({ error: 'Recurso não encontrado' });
  }
  return null;
}

module.exports = {
  checkOwns,
  checkClienteOwnership,
  checkVeiculoOwnership,
  checkClienteVeiculoOwnership,
  checkQueryClienteOwnership,
  verifyOwnership,
  assertAffected,
  getOficinId,
};
