import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';

// ── Badge de resultado ────────────────────────────────────────
function ResultadoBadge({ resultado }) {
  const cor = resultado === 'sucesso'
    ? { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' }
    : { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 9999,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
      background: cor.bg, color: cor.text, border: `1px solid ${cor.border}`,
    }}>
      {resultado === 'sucesso' ? '✓ Sucesso' : '✗ Falha'}
    </span>
  );
}

// ── Badge de ação ─────────────────────────────────────────────
function AcaoBadge({ acao }) {
  const isDelete = acao?.includes('DELETAR') || acao?.includes('FALHA');
  const isCreate = acao?.includes('CRIAR') || acao?.includes('REGISTRO') || acao?.includes('LOGIN');
  const isEdit   = acao?.includes('EDITAR') || acao?.includes('ALTERAR') || acao?.includes('TROCAR') || acao?.includes('REDEFINIR');
  const bg    = isDelete ? '#fff1f2' : isCreate ? '#f0fdf4' : isEdit ? '#eff6ff' : '#f9fafb';
  const color = isDelete ? '#e11d48' : isCreate ? '#15803d' : isEdit ? '#1d4ed8' : '#374151';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, background: bg, color,
      fontFamily: 'monospace', whiteSpace: 'nowrap',
    }}>
      {acao || '—'}
    </span>
  );
}

// ── Perfil badge ──────────────────────────────────────────────
function PerfilBadge({ perfil }) {
  const map = {
    master_admin: { label: 'Master Admin', color: '#7c3aed', bg: '#f5f3ff' },
    admin_oficina:{ label: 'Admin',        color: '#0369a1', bg: '#e0f2fe' },
    funcionario:  { label: 'Funcionário',  color: '#4b5563', bg: '#f3f4f6' },
  };
  const s = map[perfil] || { label: perfil || '—', color: '#6b7280', bg: '#f9fafb' };
  return (
    <span style={{
      display:'inline-block', padding:'2px 7px', borderRadius:9999,
      fontSize:11, fontWeight:600, background:s.bg, color:s.color,
    }}>
      {s.label}
    </span>
  );
}

// ── Detalhes inline colapsáveis ───────────────────────────────
function Detalhes({ detalhes }) {
  const [aberto, setAberto] = useState(false);
  if (!detalhes) return <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>;
  let obj;
  try { obj = typeof detalhes === 'string' ? JSON.parse(detalhes) : detalhes; }
  catch { return <span style={{ fontSize: 12, color: '#6b7280' }}>{String(detalhes)}</span>; }
  const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>;
  return (
    <span>
      <button onClick={() => setAberto(a => !a)} style={{
        fontSize: 11, color: '#6b7280', background: 'none', border: 'none',
        cursor: 'pointer', padding: '0 4px', textDecoration: 'underline dotted',
      }}>
        {aberto ? '▲ ocultar' : `▶ ${entries.length} campo${entries.length > 1 ? 's' : ''}`}
      </button>
      {aberto && (
        <div style={{
          marginTop: 4, padding: '6px 8px', background: '#f9fafb',
          borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
          border: '1px solid #e5e7eb', maxWidth: 280,
        }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: '#6b7280', minWidth: 80 }}>{k}:</span>
              <span style={{ color: '#111827', wordBreak: 'break-all' }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

const LIMIT = 50;

export default function AuditLogs() {
  const [logs,      setLogs]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [acoes,     setAcoes]     = useState([]);
  const [filtros, setFiltros] = useState({
    busca: '', acao: '', resultado: '', data_inicio: '', data_fim: '',
  });

  // Carrega lista de ações disponíveis para o filtro
  useEffect(() => {
    api.get('/api/admin/audit-logs/acoes')
      .then(r => setAcoes(r.data || []))
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(async (p = 1, f = filtros) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (f.busca)       params.set('busca',       f.busca);
      if (f.acao)        params.set('acao',         f.acao);
      if (f.resultado)   params.set('resultado',    f.resultado);
      if (f.data_inicio) params.set('data_inicio',  f.data_inicio);
      if (f.data_fim)    params.set('data_fim',     f.data_fim);
      const r = await api.get(`/api/admin/audit-logs?${params}`);
      setLogs(r.data.logs || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { fetchLogs(1, filtros); }, []); // eslint-disable-line

  function handleFiltroChange(e) {
    setFiltros(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleBuscar(e) {
    e.preventDefault();
    fetchLogs(1, filtros);
  }

  function handleLimpar() {
    const vazio = { busca: '', acao: '', resultado: '', data_inicio: '', data_fim: '' };
    setFiltros(vazio);
    fetchLogs(1, vazio);
  }

  // ── Estilos ────────────────────────────────────────────────
  const inputSt = {
    padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db',
    fontSize: 13, background: '#fff', color: '#111827', height: 34,
  };
  const btnSt = {
    padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, height: 34,
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
          Logs de Auditoria
        </h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
          Registro completo de ações dos usuários no sistema.
          {total > 0 && <> — <strong>{total.toLocaleString('pt-BR')}</strong> registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</>}
        </p>
      </div>

      {/* Filtros */}
      <form onSubmit={handleBuscar} style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16,
        padding: '12px 14px', background: '#f9fafb',
        borderRadius: 8, border: '1px solid #e5e7eb',
      }}>
        <input
          name="busca" value={filtros.busca} onChange={handleFiltroChange}
          placeholder="Buscar por usuário, e-mail ou ação..."
          style={{ ...inputSt, flex: '1 1 220px', minWidth: 180 }}
        />
        <select name="acao" value={filtros.acao} onChange={handleFiltroChange} style={{ ...inputSt, minWidth: 160 }}>
          <option value="">Todas as ações</option>
          {acoes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select name="resultado" value={filtros.resultado} onChange={handleFiltroChange} style={{ ...inputSt, minWidth: 120 }}>
          <option value="">Todos os resultados</option>
          <option value="sucesso">Sucesso</option>
          <option value="falha">Falha</option>
        </select>
        <input type="date" name="data_inicio" value={filtros.data_inicio} onChange={handleFiltroChange}
          style={{ ...inputSt, minWidth: 140 }} title="Data início" />
        <input type="date" name="data_fim" value={filtros.data_fim} onChange={handleFiltroChange}
          style={{ ...inputSt, minWidth: 140 }} title="Data fim" />
        <button type="submit" style={{ ...btnSt, background: '#F97316', color: '#fff' }}>
          Filtrar
        </button>
        <button type="button" onClick={handleLimpar} style={{ ...btnSt, background: '#e5e7eb', color: '#374151' }}>
          Limpar
        </button>
        <button type="button" onClick={() => fetchLogs(page, filtros)}
          style={{ ...btnSt, background: '#eff6ff', color: '#1d4ed8' }} title="Atualizar">
          ↻ Atualizar
        </button>
      </form>

      {/* Tabela */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 8px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Carregando logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Nenhum registro encontrado com os filtros aplicados.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Data/Hora', 'Usuário', 'Perfil', 'Oficina', 'Ação', 'Entidade', 'Resultado', 'IP', 'Detalhes'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                    color: '#374151', fontSize: 12, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} style={{
                  borderBottom: '1px solid #f3f4f6',
                  background: i % 2 === 0 ? '#fff' : '#fafafa',
                  transition: 'background 0.1s',
                }}>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: '#374151' }}>
                    <span style={{ fontSize: 12 }}>{l.created_at_br || l.created_at?.slice(0, 19).replace('T', ' ')}</span>
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ fontWeight: 500, color: '#111827', fontSize: 13 }}>{l.usuario_nome || '—'}</div>
                    {l.usuario_email && <div style={{ fontSize: 11, color: '#9ca3af' }}>{l.usuario_email}</div>}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <PerfilBadge perfil={l.perfil} />
                  </td>
                  <td style={{ padding: '9px 12px', color: '#374151', fontSize: 12 }}>
                    {l.oficina_nome || <span style={{ color: '#9ca3af' }}>Global</span>}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <AcaoBadge acao={l.acao} />
                  </td>
                  <td style={{ padding: '9px 12px', color: '#6b7280', fontSize: 12 }}>
                    {l.entidade
                      ? <>{l.entidade}{l.entidade_id ? <span style={{ color: '#9ca3af' }}> #{l.entidade_id}</span> : ''}</>
                      : '—'}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <ResultadoBadge resultado={l.resultado} />
                  </td>
                  <td style={{ padding: '9px 12px', color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>
                    {l.ip || '—'}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <Detalhes detalhes={l.detalhes} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>
            Página {page} de {pages} — {total.toLocaleString('pt-BR')} registros
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => fetchLogs(1, filtros)} disabled={page === 1}
              style={{ ...btnSt, background: page === 1 ? '#f3f4f6' : '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '4px 10px' }}>
              «
            </button>
            <button onClick={() => fetchLogs(page - 1, filtros)} disabled={page === 1}
              style={{ ...btnSt, background: page === 1 ? '#f3f4f6' : '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '4px 10px' }}>
              ‹ Anterior
            </button>
            {/* Páginas ao redor da atual */}
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const p = Math.max(1, Math.min(pages - 4, page - 2)) + i;
              return (
                <button key={p} onClick={() => fetchLogs(p, filtros)}
                  style={{ ...btnSt, background: p === page ? '#F97316' : '#fff', color: p === page ? '#fff' : '#374151', border: '1px solid #d1d5db', padding: '4px 10px', minWidth: 36 }}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => fetchLogs(page + 1, filtros)} disabled={page === pages}
              style={{ ...btnSt, background: page === pages ? '#f3f4f6' : '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '4px 10px' }}>
              Próxima ›
            </button>
            <button onClick={() => fetchLogs(pages, filtros)} disabled={page === pages}
              style={{ ...btnSt, background: page === pages ? '#f3f4f6' : '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '4px 10px' }}>
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
