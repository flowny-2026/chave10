/**
 * orcamentoConversor.js
 * Converte um orçamento aprovado em OS automaticamente.
 * Reutilizado pelo approval-links.js (aprovação via link) e por app.js (aprovação manual).
 */

const { queryOne, run } = require('../db');
const log = require('../utils/logger');

/**
 * Converte um orçamento aprovado em Ordem de Serviço.
 * Idempotente: se já existe os_id, não cria duplicata.
 *
 * @param {number} orcamentoId
 * @param {number} oficinaId
 * @returns {Promise<number|null>} os_id criado ou existente
 */
async function converterOrcamentoAprovado(orcamentoId, oficinaId) {
  try {
    const orc = await queryOne(
      'SELECT * FROM orcamentos WHERE id=$1 AND oficina_id=$2',
      [orcamentoId, oficinaId]
    );
    if (!orc) return null;

    // Idempotência: já tem OS vinculada — apenas garante status em_andamento
    if (orc.os_id) {
      await run(
        "UPDATE ordens_servico SET status='em_andamento' WHERE id=$1 AND oficina_id=$2 AND status NOT IN ('finalizado')",
        [orc.os_id, oficinaId]
      );
      return orc.os_id;
    }

    // Cria nova OS com os dados do orçamento
    const valorMO    = parseFloat(orc.valor_mo)    || 0;
    const valorPecas = parseFloat(orc.valor_pecas) || 0;
    const desconto   = parseFloat(orc.desconto)    || 0;
    const valor      = Math.max(0, valorMO + valorPecas - desconto);

    const cnt = await queryOne('SELECT COUNT(*) n FROM ordens_servico WHERE oficina_id=$1', [oficinaId]);
    const numero = String(+cnt.n + 1).padStart(4, '0');

    const nova = await queryOne(
      `INSERT INTO ordens_servico
        (oficina_id, cliente_id, veiculo_id, descricao, servicos, pecas, pecas_itens,
         valor_mo, valor_pecas, valor, observacao, data, numero, status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'em_andamento') RETURNING id`,
      [
        oficinaId,
        orc.cliente_id  || null,
        orc.veiculo_id  || null,
        orc.descricao   || 'OS gerada a partir de orçamento aprovado',
        orc.servicos    || null,
        orc.pecas       || null,
        orc.pecas_itens || null,
        valorMO,
        valorPecas,
        valor,
        orc.obs         || null,
        new Date().toISOString().split('T')[0],
        numero,
      ]
    );

    // Vincula a OS ao orçamento
    await run('UPDATE orcamentos SET os_id=$1 WHERE id=$2', [nova.id, orcamentoId]);

    log.info('orcamento_convertido_em_os', {
      orcamento_id: orcamentoId,
      os_id: nova.id,
      oficina_id: oficinaId,
    });

    return nova.id;
  } catch (err) {
    log.error('converter_orcamento_os', err);
    return null;
  }
}

module.exports = { converterOrcamentoAprovado };
