/**
 * useSegmento.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook que retorna os termos de nomenclatura do segmento da oficina logada.
 *
 * Lê o campo `segmento` do objeto do usuário em localStorage/sessionStorage.
 * Caso não exista, usa o segmento padrão (oficina_mecanica).
 *
 * Uso:
 *   const t = useSegmento();
 *   <label>{t.veiculo}</label>  → "Veículo" ou "Equipamento"
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getTermos, SEGMENTO_PADRAO } from '../config/segmentos';

function getSegmentoAtual() {
  try {
    const raw = localStorage.getItem('c10_user') || sessionStorage.getItem('c10_user');
    if (!raw) return SEGMENTO_PADRAO;
    const user = JSON.parse(raw);
    return user?.segmento || SEGMENTO_PADRAO;
  } catch {
    return SEGMENTO_PADRAO;
  }
}

/**
 * Hook — retorna os termos do segmento da oficina logada.
 * É síncrono (lê do cache) então não causa loading.
 */
export function useSegmento() {
  const segmento = getSegmentoAtual();
  return getTermos(segmento);
}

/**
 * Versão utilitária (fora de componentes React).
 * Útil em funções de geração de PDF, templates de WhatsApp, etc.
 */
export function getTermosSegmento() {
  const segmento = getSegmentoAtual();
  return getTermos(segmento);
}
