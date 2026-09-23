/**
 * segmentos.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuração de nomenclaturas por segmento de negócio.
 *
 * Segmentos disponíveis:
 *   - oficina_mecanica  (padrão)
 *
 * Para adicionar um novo segmento, basta acrescentar uma nova chave abaixo
 * com todos os termos equivalentes — nenhum outro arquivo precisa mudar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const SEGMENTOS = {
  oficina_mecanica: {
    label:      'Oficina Mecânica',
    emoji:      '🔧',
    // Veículo
    veiculo:    'Veículo',
    veiculos:   'Veículos',
    novoVeiculo:'Novo Veículo',
    editVeiculo:'Editar Veículo',
    // Identificador (Placa / Nº Série / etc.)
    placa:      'Placa',
    placaAbrev: 'Placa',
    // Métrica de uso (KM / Horímetro / etc.)
    km:         'Quilometragem',
    kmAbrev:    'KM',
    kmUnit:     'km',
    kmPlaceholder: 'Ex: 45000',
    // Itens de serviço
    peca:       'Peça',
    pecas:      'Peças',
    pecaLabel:  '🔩 Peças utilizadas',
    // Ordens
    os:         'Ordem de Serviço',
    oss:        'Ordens de Serviço',
    novaOs:     'Nova OS',
    // Orçamentos
    orcamento:  'Orçamento',
    orcamentos: 'Orçamentos',
    novoOrcamento: 'Novo Orçamento',
    editOrcamento: 'Editar Orçamento',
    // Categoria do item
    marca:      'Marca',
    modelo:     'Modelo',
    aplicacao:  'Aplicação',
    ano:        'Ano',
  },
};

/** Segmento padrão — usado quando o campo não está definido */
export const SEGMENTO_PADRAO = 'oficina_mecanica';

/**
 * Retorna os termos do segmento informado.
 * Cai no padrão se o segmento não existir.
 */
export function getTermos(segmento) {
  return SEGMENTOS[segmento] || SEGMENTOS[SEGMENTO_PADRAO];
}
