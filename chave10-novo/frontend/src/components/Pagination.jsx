/**
 * Componente de Paginação
 * 
 * Props:
 * - currentPage: Página atual (1-indexed)
 * - totalPages: Total de páginas
 * - onPageChange: Callback quando a página muda
 * - totalItems: Total de itens (opcional, para exibir)
 * - itemsPerPage: Itens por página (opcional, para exibir)
 */
export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems,
  itemsPerPage 
}) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  
  // Calcula quais páginas mostrar
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  // Adiciona primeira página e reticências
  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push('...');
  }

  // Adiciona páginas do meio
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // Adiciona reticências e última página
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination-wrapper">
      {totalItems && itemsPerPage && (
        <div className="pagination-info">
          Mostrando <strong>{startItem}</strong> a <strong>{endItem}</strong> de <strong>{totalItems}</strong> {totalItems === 1 ? 'item' : 'itens'}
        </div>
      )}
      
      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Página anterior"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {pages.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
          ) : (
            <button
              key={page}
              className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        ))}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Próxima página"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
