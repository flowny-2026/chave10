import { useState, useEffect } from 'react';

/**
 * Hook customizado para gerenciar paginação
 * 
 * @param {Function} fetchFunction - Função que busca os dados (recebe page e limit)
 * @param {number} itemsPerPage - Itens por página (padrão: 10)
 * @param {Array} dependencies - Dependências para recarregar (opcional)
 * 
 * @returns {Object} - Objeto com dados, paginação e funções
 * 
 * Exemplo de uso:
 * 
 * const { 
 *   data, 
 *   loading, 
 *   currentPage, 
 *   totalPages, 
 *   totalItems,
 *   goToPage,
 *   nextPage,
 *   prevPage,
 *   reload
 * } = usePagination(
 *   async (page, limit) => {
 *     return await api.app.clientes.list({ page, limit });
 *   },
 *   10,
 *   [searchQuery] // Recarrega quando searchQuery muda
 * );
 */
export function usePagination(fetchFunction, itemsPerPage = 10, dependencies = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState(null);

  async function loadData(page = currentPage) {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchFunction(page, itemsPerPage);
      
      // Suporta dois formatos de resposta:
      // 1. { data, total, page, totalPages }
      // 2. Array direto (sem paginação no backend)
      if (Array.isArray(response)) {
        // Sem paginação no backend - faz paginação no frontend
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedData = response.slice(start, end);
        
        setData(paginatedData);
        setTotalItems(response.length);
        setTotalPages(Math.ceil(response.length / itemsPerPage));
      } else {
        // Com paginação no backend
        setData(response.data || response.items || []);
        setTotalItems(response.total || 0);
        setTotalPages(response.totalPages || Math.ceil((response.total || 0) / itemsPerPage));
        setCurrentPage(response.page || page);
      }
    } catch (err) {
      setError(err);
      setData([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(1); // Reset para página 1 quando dependências mudam
    loadData(1);
  }, dependencies);

  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    loadData(page);
  }

  function nextPage() {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }

  function reload() {
    loadData(currentPage);
  }

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    reload
  };
}

/**
 * Hook simplificado para paginação local (sem backend)
 * Útil quando você já tem todos os dados e quer apenas paginar no frontend
 */
export function useLocalPagination(allData, itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(allData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = allData.slice(startIndex, endIndex);

  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }

  function nextPage() {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }

  // Reset para página 1 quando os dados mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [allData.length]);

  return {
    data: paginatedData,
    currentPage,
    totalPages,
    totalItems: allData.length,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage
  };
}
