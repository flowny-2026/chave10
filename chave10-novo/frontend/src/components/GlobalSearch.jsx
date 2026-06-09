import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const STATUS_LABEL = { em_andamento: 'Em andamento', finalizado: 'Finalizado' };
const STATUS_CLASS = { em_andamento: 'badge-orange', finalizado: 'badge-green' };

function normalizar(str) {
  return (str || '').toLowerCase().replace(/[-\s]/g, '');
}

function match(str, q) {
  return normalizar(str).includes(normalizar(q));
}

export default function GlobalSearch() {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState({ os: [], clientes: [], veiculos: [], orcamentos: [] });
  const [cache, setCache]       = useState({ os: [], clientes: [], veiculos: [], orcamentos: [] });
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);
  const navigate  = useNavigate();

  // Atalho de teclado global (Ctrl+K / Cmd+K)
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      // Ctrl+K (Windows/Linux) ou Cmd+K (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      
      // ESC para fechar
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open]);

  // Carrega todos os dados uma vez (cache local)
  async function loadCache() {
    if (cacheLoaded) return;
    setLoading(true);
    try {
      const [os, clientes, veiculos, orcamentos] = await Promise.all([
        api.app.os.list(),
        api.app.clientes.list(),
        api.app.veiculos.list(),
        api.app.orcamentos.list().catch(() => []), // Fallback se não existir
      ]);
      setCache({ os, clientes, veiculos, orcamentos: orcamentos || [] });
      setCacheLoaded(true);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  // Filtra localmente
  const filtrar = useCallback((q) => {
    if (!q.trim()) { setResults({ os: [], clientes: [], veiculos: [], orcamentos: [] }); return; }

    const os = cache.os.filter(o =>
      match(o.cliente_nome, q) ||
      match(o.placa, q) ||
      match(o.veiculo_modelo, q) ||
      match(o.veiculo_marca, q) ||
      match(o.descricao, q) ||
      String(o.id).includes(q.replace(/\D/g, ''))
    ).slice(0, 5);

    const clientes = cache.clientes.filter(c =>
      match(c.nome, q) ||
      match(c.telefone, q) ||
      match(c.email, q)
    ).slice(0, 4);

    const veiculos = cache.veiculos.filter(v =>
      match(v.placa, q) ||
      match(v.modelo, q) ||
      match(v.marca, q) ||
      match(v.cliente_nome, q)
    ).slice(0, 4);

    const orcamentos = cache.orcamentos.filter(orc =>
      match(orc.cliente_nome, q) ||
      match(orc.veiculo_modelo, q) ||
      match(orc.placa, q) ||
      String(orc.id).includes(q.replace(/\D/g, ''))
    ).slice(0, 3);

    setResults({ os, clientes, veiculos, orcamentos });
    setSelectedIndex(0); // Reset selection
  }, [cache]);

  useEffect(() => {
    filtrar(query);
  }, [query, filtrar]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleFocus() {
    setOpen(true);
    loadCache();
  }

  function handleChange(e) {
    setQuery(e.target.value);
    setOpen(true);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { 
      setOpen(false); 
      inputRef.current?.blur(); 
      return;
    }
    
    // Navegação por setas
    const allResults = [
      ...results.os,
      ...results.clientes,
      ...results.veiculos,
      ...results.orcamentos,
    ];
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }
    
    if (e.key === 'Enter' && allResults.length > 0) {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected) {
        // Determina o tipo e navega
        if (cache.os.includes(selected)) goTo('/app/os');
        else if (cache.clientes.includes(selected)) goTo('/app/clientes');
        else if (cache.veiculos.includes(selected)) goTo('/app/veiculos');
        else if (cache.orcamentos.includes(selected)) goTo('/app/orcamentos');
      }
    }
  }

  function goTo(path) {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
    navigate(path);
  }

  const total = results.os.length + results.clientes.length + results.veiculos.length + results.orcamentos.length;
  const hasQuery = query.trim().length > 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, maxWidth: 420, minWidth: 0 }}>
      {/* Input */}
      <div className="topbar-search" style={{ width: '100%' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder={`Buscar... (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K)`}
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults({ os: [], clientes: [], veiculos: [], orcamentos: [] }); inputRef.current?.focus(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '0 2px', lineHeight: 1, fontSize: 16 }}
          >✕</button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,.16)',
          border: '1px solid var(--gray-200)',
          zIndex: 9000,
          overflow: 'hidden',
          minWidth: 0,
          width: '100%',
          animation: 'pwaSlideIn .15s ease',
        }}>

          {/* Estado: carregando */}
          {loading && (
            <div style={{ padding: '16px 18px', fontSize: 13, color: 'var(--gray-400)', textAlign: 'center' }}>
              Carregando...
            </div>
          )}

          {/* Estado: sem query */}
          {!loading && !hasQuery && (
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>
                Acesso rápido
              </div>
              {[
                { label: 'Ordens de Serviço', icon: '🔧', path: '/app/os' },
                { label: 'Clientes',          icon: '👤', path: '/app/clientes' },
                { label: 'Veículos',          icon: '🚗', path: '/app/veiculos' },
              ].map(item => (
                <button key={item.path} onClick={() => goTo(item.path)} style={rowStyle}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--gray-700)' }}>{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Estado: sem resultados */}
          {!loading && hasQuery && total === 0 && (
            <div style={{ padding: '20px 18px', textAlign: 'center', fontSize: 13, color: 'var(--gray-400)' }}>
              Nenhum resultado para <strong>"{query}"</strong>
            </div>
          )}

          {/* Resultados */}
          {!loading && hasQuery && total > 0 && (
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>

              {/* OS */}
              {results.os.length > 0 && (
                <Section label="Ordens de Serviço">
                  {results.os.map((os, idx) => {
                    const globalIndex = idx;
                    const isSelected = selectedIndex === globalIndex;
                    return (
                    <button key={os.id} onClick={() => goTo('/app/os')} style={{...rowStyle, background: isSelected ? 'var(--brand-light)' : 'none'}}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>
                            #{String(os.id).padStart(4, '0')}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {os.cliente_nome || '—'}
                          </span>
                          <span className={`badge ${STATUS_CLASS[os.status] || 'badge-gray'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                            {STATUS_LABEL[os.status] || os.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {os.veiculo_modelo ? `${os.veiculo_modelo}${os.placa ? ' · ' + os.placa : ''}` : os.descricao}
                        </div>
                      </div>
                    </button>
                  )})}
                </Section>
              )}

              {/* Clientes */}
              {results.clientes.length > 0 && (
                <Section label="Clientes">
                  {results.clientes.map((c, idx) => {
                    const globalIndex = results.os.length + idx;
                    const isSelected = selectedIndex === globalIndex;
                    return (
                    <button key={c.id} onClick={() => goTo('/app/clientes')} style={{...rowStyle, background: isSelected ? '#EFF6FF' : 'none'}}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: '#2563EB' }}>
                        {c.nome?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.nome}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--gray-400)' }}>
                          {c.telefone || c.email || 'Sem contato'}
                        </div>
                      </div>
                    </button>
                  )})}
                </Section>
              )}

              {/* Veículos */}
              {results.veiculos.length > 0 && (
                <Section label="Veículos">
                  {results.veiculos.map((v, idx) => {
                    const globalIndex = results.os.length + results.clientes.length + idx;
                    const isSelected = selectedIndex === globalIndex;
                    return (
                    <button key={v.id} onClick={() => goTo('/app/veiculos')} style={{...rowStyle, background: isSelected ? '#F0FDF4' : 'none'}}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.marca} {v.modelo}
                          {v.placa && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '1px 6px', borderRadius: 4 }}>{v.placa}</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--gray-400)' }}>
                          {v.cliente_nome || 'Sem proprietário'}{v.ano ? ' · ' + v.ano : ''}
                        </div>
                      </div>
                    </button>
                  )})}
                </Section>
              )}

              {/* Orçamentos */}
              {results.orcamentos.length > 0 && (
                <Section label="Orçamentos">
                  {results.orcamentos.map((orc, idx) => {
                    const globalIndex = results.os.length + results.clientes.length + results.veiculos.length + idx;
                    const isSelected = selectedIndex === globalIndex;
                    return (
                    <button key={orc.id} onClick={() => goTo('/app/orcamentos')} style={{...rowStyle, background: isSelected ? '#FFF7ED' : 'none'}}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                            #{String(orc.id).padStart(4, '0')}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {orc.cliente_nome || '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {orc.veiculo_modelo || orc.descricao || 'Orçamento'}
                        </div>
                      </div>
                    </button>
                  )})}
                </Section>
              )}
            </div>
          )}
          
          {/* Footer com dicas de teclado */}
          {hasQuery && total > 0 && (
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--gray-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--gray-400)',
              background: 'var(--gray-50)',
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span>
                  <kbd style={{ padding: '2px 6px', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 4, fontSize: 10 }}>↑</kbd>
                  <kbd style={{ padding: '2px 6px', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 4, fontSize: 10, marginLeft: 2 }}>↓</kbd>
                  {' '}navegar
                </span>
                <span>
                  <kbd style={{ padding: '2px 6px', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 4, fontSize: 10 }}>Enter</kbd>
                  {' '}abrir
                </span>
                <span>
                  <kbd style={{ padding: '2px 6px', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 4, fontSize: 10 }}>Esc</kbd>
                  {' '}fechar
                </span>
              </div>
              <span style={{ fontWeight: 600 }}>{total} resultado{total > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 14px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  borderRadius: 8,
  transition: 'background .1s',
  margin: '1px 0',
};

function Section({ label, children }) {
  return (
    <div style={{ padding: '10px 6px 4px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.7px', padding: '0 8px', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
