/**
 * segmentos.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuração de nomenclaturas por segmento de negócio.
 *
 * Segmentos disponíveis (aparecem no cadastro e nas configurações):
 *   - carro      (padrão)
 *   - moto
 *   - caminhao
 *   - jetski
 *   - barco
 *   - industrial  (manutenção de equipamentos industriais)
 *
 * Para adicionar um novo segmento, basta acrescentar uma nova chave abaixo
 * com todos os termos equivalentes — nenhuma tela precisa mudar.
 *
 * Compatibilidade: 'oficina_mecanica' (segmento antigo) é mapeado para 'carro'
 * via ALIAS_SEGMENTOS, e qualquer segmento desconhecido cai no padrão.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BASE_VEICULAR = {
  // Placa como identificador, KM como métrica
  placa:      'Placa',
  placaAbrev: 'Placa',
  km:         'Quilometragem',
  kmAbrev:    'KM',
  kmUnit:     'km',
  kmPlaceholder: 'Ex: 45000',
  peca:       'Peça',
  pecas:      'Peças',
  pecaLabel:  'Peças utilizadas',
  os:         'Ordem de Serviço',
  oss:        'Ordens de Serviço',
  novaOs:     'Nova OS',
  orcamento:  'Orçamento',
  orcamentos: 'Orçamentos',
  novoOrcamento: 'Novo Orçamento',
  editOrcamento: 'Editar Orçamento',
  marca:      'Marca',
  modelo:     'Modelo',
  aplicacao:  'Aplicação',
  ano:        'Ano',
  mecanico:   'Mecânico',
  mecanicos:  'Mecânicos',
};

const BASE_NAUTICO = {
  // Identificador de registro, Horímetro como métrica
  placa:      'Nº de Série',
  placaAbrev: 'Série',
  km:         'Horímetro',
  kmAbrev:    'HRS',
  kmUnit:     'h',
  kmPlaceholder: 'Ex: 1500',
  peca:       'Peça',
  pecas:      'Peças',
  pecaLabel:  'Peças utilizadas',
  os:         'Ordem de Serviço',
  oss:        'Ordens de Serviço',
  novaOs:     'Nova OS',
  orcamento:  'Orçamento',
  orcamentos: 'Orçamentos',
  novoOrcamento: 'Novo Orçamento',
  editOrcamento: 'Editar Orçamento',
  marca:      'Fabricante',
  modelo:     'Modelo',
  aplicacao:  'Localização',
  ano:        'Ano',
  mecanico:   'Mecânico',
  mecanicos:  'Mecânicos',
};

export const SEGMENTOS = {
  carro: {
    label:      'Carro',
    ...BASE_VEICULAR,
    veiculo:    'Veículo',
    veiculos:   'Veículos',
    novoVeiculo:'Novo Veículo',
    editVeiculo:'Editar Veículo',
  },

  moto: {
    label:      'Moto',
    ...BASE_VEICULAR,
    veiculo:    'Moto',
    veiculos:   'Motos',
    novoVeiculo:'Nova Moto',
    editVeiculo:'Editar Moto',
  },

  caminhao: {
    label:      'Caminhão',
    ...BASE_VEICULAR,
    veiculo:    'Caminhão',
    veiculos:   'Caminhões',
    novoVeiculo:'Novo Caminhão',
    editVeiculo:'Editar Caminhão',
  },

  jetski: {
    label:      'Jet Ski',
    ...BASE_NAUTICO,
    veiculo:    'Jet Ski',
    veiculos:   'Jet Skis',
    novoVeiculo:'Novo Jet Ski',
    editVeiculo:'Editar Jet Ski',
  },

  barco: {
    label:      'Barco',
    ...BASE_NAUTICO,
    veiculo:    'Embarcação',
    veiculos:   'Embarcações',
    novoVeiculo:'Nova Embarcação',
    editVeiculo:'Editar Embarcação',
    placa:      'Registro',
    placaAbrev: 'Registro',
  },

  industrial: {
    label:      'Manutenção Industrial',
    // Identificador de patrimônio, Horímetro como métrica
    placa:      'Nº de Série / Patrimônio',
    placaAbrev: 'Patrimônio',
    km:         'Horas de Operação',
    kmAbrev:    'HRS',
    kmUnit:     'h',
    kmPlaceholder: 'Ex: 2500',
    peca:       'Peça / Componente',
    pecas:      'Peças e Componentes',
    pecaLabel:  'Peças e componentes utilizados',
    os:         'Ordem de Serviço',
    oss:        'Ordens de Serviço',
    novaOs:     'Nova OS',
    orcamento:  'Orçamento',
    orcamentos: 'Orçamentos',
    novoOrcamento: 'Novo Orçamento',
    editOrcamento: 'Editar Orçamento',
    veiculo:    'Equipamento',
    veiculos:   'Equipamentos',
    novoVeiculo:'Novo Equipamento',
    editVeiculo:'Editar Equipamento',
    marca:      'Fabricante',
    modelo:     'Modelo do Equipamento',
    aplicacao:  'Localização / Setor',
    ano:        'Ano de Fabricação',
    mecanico:   'Técnico',
    mecanicos:  'Técnicos',
  },
};

/** Segmento padrão — usado quando o campo não está definido */
export const SEGMENTO_PADRAO = 'carro';

/**
 * Aliases de compatibilidade: segmentos antigos → novo equivalente.
 * Oficinas cadastradas antes desta mudança continuam funcionando.
 */
const ALIAS_SEGMENTOS = {
  oficina_mecanica:    'carro',
  compressores:        'carro',
  manutencao_industrial: 'industrial',
};

/**
 * Retorna os termos do segmento informado.
 * Resolve aliases antigos e cai no padrão se o segmento não existir.
 */
export function getTermos(segmento) {
  const chave = ALIAS_SEGMENTOS[segmento] || segmento;
  return SEGMENTOS[chave] || SEGMENTOS[SEGMENTO_PADRAO];
}
