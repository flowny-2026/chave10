/**
 * Componente de Paginação — Mobile First
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
  // No mobile mostra menos páginas
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 480;
  const maxVisible = isMobile ? 3 : 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push('...');
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  return (
    <div className="pagination-wrapper">
      {totalItems && itemsPerPage && (
        <div className="pagination-info">
          <strong>{startItem}</strong>–<strong>{endItem}</strong> de <strong>{totalItems}</strong>
        </div>
      )}
      
      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {pages.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={page}
              className={`pagination-btn${page === currentPage ? ' active' : ''}`}
              onClick={() => onPageChange(page)}
              aria-label={`Página ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        ))}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Próxima página"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
