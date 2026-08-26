/**
 * segmentos.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuração de nomenclaturas por segmento de negócio.
 *
 * Para adicionar um novo segmento, basta criar uma nova chave com os termos
 * equivalentes. Todos os campos são obrigatórios.
 *
 * Segmentos disponíveis:
 *   - oficina_mecanica  (padrão)
 *   - compressores
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
    // Categoria do item
    marca:      'Marca',
    modelo:     'Modelo',
    aplicacao:  'Aplicação',
    ano:        'Ano',
  },

  compressores: {
    label:      'Compressores',
    emoji:      '⚙️',
    // Veículo → Equipamento
    veiculo:    'Equipamento',
    veiculos:   'Equipamentos',
    novoVeiculo:'Novo Equipamento',
    editVeiculo:'Editar Equipamento',
    // Placa → Nº de Série
    placa:      'Nº de Série',
    placaAbrev: 'Série',
    // KM → Horímetro
    km:         'Horímetro',
    kmAbrev:    'HRS',
    kmUnit:     'h',
    kmPlaceholder: 'Ex: 1500',
    // Peças → Componentes
    peca:       'Componente',
    pecas:      'Componentes',
    pecaLabel:  '⚙️ Componentes utilizados',
    // Ordens
    os:         'Ordem de Serviço',
    oss:        'Ordens de Serviço',
    novaOs:     'Nova OS',
    // Outros
    marca:      'Fabricante',
    modelo:     'Modelo',
    aplicacao:  'Localização',
    ano:        'Ano de Fab.',
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
