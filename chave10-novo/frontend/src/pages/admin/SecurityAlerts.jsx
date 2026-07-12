import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';

// ── Badges ─────────────────────────────────────────────────────
function SevBadge({ sev }) {
  const map = {
    info:    { label: 'Info',      bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
    aviso:   { label: 'Aviso',     bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    alto:    { label: 'Alto',      bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    critico: { label: '⚠ Crítico', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  };
  const s = map[sev] || { label: sev||'—', bg:'#f9fafb', color:'#6b7280', border:'#e5e7eb' };
  return (
    <span style={{
      display:'inline-block', padding:'2px 8px', borderRadius:9999, fontSize:12,
      fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.border}`,
    }}>{s.label}</span>
  );
}

function TipoBadge({ tipo }) {
  const label = {
    brute_force:          '🔐 Brute Force',
    idor:                 '🔒 IDOR',
    acesso_negado_repetido:'🚫 Acesso Negado Repetido',
    exclusao_massa:       '🗑 Exclusão em Massa',
    flood_requisicoes:    '⚡ Flood',
    alteracao_permissao:  '👤 Alteração de Permissão',
    erro_repetitivo:      '⚠ Erro Repetitivo',
  }[tipo] || tipo;
  return (
    <span style={{
      display:'inline-block', padding:'2px 8px', borderRadius:6,
      fontSize:12, fontWeight:600, background:'#f3f4f6', color:'#374151',
      fontFamily:'monospace',
    }}>{label}</span>
  );
}

// ── Card de contador ────────────────────────────────────────────
function ContadorCard({ label, valor, cor, bg }) {
  return (
    <div style={{
      flex:'1 1 120px', padding:'14px 16px', borderRadius:10,
      background:bg, border:`1px solid ${cor}20`, textAlign:'center',
    }}>
      <div style={{ fontSize:28, fontWeight:800, color:cor }}>{valor ?? 0}</div>
      <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{label}</div>
    </div>
  );
}

// ── Detalhes colapsáveis ────────────────────────────────────────
function Detalhes({ detalhes }) {
  const [aberto, setAberto] = useState(false);
  if (!detalhes) return <span style={{ color:'#9ca3af', fontSize:12 }}>—</span>;
  let obj;
  try { obj = typeof detalhes==='string' ? JSON.parse(detalhes) : detalhes; }
  catch { return <span style={{ fontSize:12 }}>{String(detalhes)}</span>; }
  const entries = Object.entries(obj).filter(([,v]) => v!==null && v!==undefined && v!=='');
  if (!entries.length) return <span style={{ color:'#9ca3af', fontSize:12 }}>—</span>;
  return (
    <span>
      <button onClick={()=>setAberto(a=>!a)} style={{
        fontSize:11, color:'#6b7280', background:'none', border:'none',
        cursor:'pointer', padding:'0 4px', textDecoration:'underline dotted',
      }}>
        {aberto ? '▲ ocultar' : `▶ ${entries.length} campo${entries.length>1?'s':''}`}
      </button>
      {aberto && (
        <div style={{
          marginTop:4, padding:'6px 8px', background:'#f9fafb',
          borderRadius:6, fontSize:11, fontFamily:'monospace',
          border:'1px solid #e5e7eb', maxWidth:280,
        }}>
          {entries.map(([k,v])=>(
            <div key={k} style={{ display:'flex', gap:6 }}>
              <span style={{ color:'#6b7280', minWidth:80 }}>{k}:</span>
              <span style={{ color:'#111827', wordBreak:'break-all' }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

const LIMIT = 50;

export default function SecurityAlerts() {
  const [alerts,   setAlerts]   = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [resolving, setResolving] = useState(null);
  const [contadores, setContadores] = useState({});
  const [tipos,    setTipos]    = useState([]);
  const [filtros, setFiltros] = useState({
    severidade: '', tipo: '', resolvido: 'false', data_inicio: '', data_fim: '',
  });

  // Carrega tipos disponíveis
  useEffect(() => {
    api.get('/api/admin/audit-alerts/tipos')
      .then(r => setTipos(r.data || []))
      .catch(() => {});
  }, []);

  const fetchAlerts = useCallback(async (p = 1, f = filtros) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (f.severidade)  params.set('severidade',  f.severidade);
      if (f.tipo)        params.set('tipo',         f.tipo);
      if (f.resolvido !== '') params.set('resolvido', f.resolvido);
      if (f.data_inicio) params.set('data_inicio',  f.data_inicio);
      if (f.data_fim)    params.set('data_fim',     f.data_fim);
      const r = await api.get(`/api/admin/audit-alerts?${params}`);
      setAlerts(r.data.alerts || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
      setPage(p);
      setContadores(r.data.contadores || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { fetchAlerts(1, filtros); }, []); // eslint-disable-line

  async function handleResolver(id) {
    setResolving(id);
    try {
      await api.patch(`/api/admin/audit-alerts/${id}/resolver`);
      fetchAlerts(page, filtros);
    } catch (e) {
      alert('Erro ao resolver alerta');
    } finally {
      setResolving(null);
    }
  }

  function handleFiltroChange(e) {
    setFiltros(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleBuscar(e) {
    e.preventDefault();
    fetchAlerts(1, filtros);
  }

  function handleLimpar() {
    const vazio = { severidade: '', tipo: '', resolvido: 'false', data_inicio: '', data_fim: '' };
    setFiltros(vazio);
    fetchAlerts(1, vazio);
  }

  const inputSt = {
    padding:'6px 10px', borderRadius:6, border:'1px solid #d1d5db',
    fontSize:13, background:'#fff', color:'#111827', height:34,
  };
  const btnSt = {
    padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer',
    fontSize:13, fontWeight:600, height:34,
  };

  // Total de alertas abertos críticos + alto para destaque
  const alertasAbertos = (contadores.critico || 0) + (contadores.alto || 0);

  return (
    <div style={{ padding:'20px 24px', maxWidth:1400, margin:'0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#111827', margin:0 }}>
            Alertas de Segurança
          </h1>
          {alertasAbertos > 0 && (
            <span style={{
              background:'#fef2f2', color:'#b91c1c', border:'1px solid #fecaca',
              borderRadius:9999, padding:'2px 10px', fontSize:12, fontWeight:700,
            }}>
              {alertasAbertos} aberto{alertasAbertos > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p style={{ color:'#6b7280', fontSize:13, marginTop:4 }}>
          Comportamentos suspeitos detectados automaticamente pelo sistema.
          Apenas o master_admin tem acesso a esta tela.
        </p>
      </div>

      {/* Cards de contadores por severidade */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <ContadorCard label="Crítico (abertos)"  valor={contadores.critico} cor="#b91c1c" bg="#fef2f2" />
        <ContadorCard label="Alto (abertos)"     valor={contadores.alto}    cor="#c2410c" bg="#fff7ed" />
        <ContadorCard label="Aviso (abertos)"    valor={contadores.aviso}   cor="#b45309" bg="#fffbeb" />
        <ContadorCard label="Info (abertos)"     valor={contadores.info}    cor="#0369a1" bg="#f0f9ff" />
      </div>

      {/* Filtros */}
      <form onSubmit={handleBuscar} style={{
        display:'flex', flexWrap:'wrap', gap:8, marginBottom:16,
        padding:'12px 14px', background:'#f9fafb',
        borderRadius:8, border:'1px solid #e5e7eb',
      }}>
        <select name="severidade" value={filtros.severidade} onChange={handleFiltroChange} style={{ ...inputSt, minWidth:130 }}>
          <option value="">Todas as severidades</option>
          <option value="critico">Crítico</option>
          <option value="alto">Alto</option>
          <option value="aviso">Aviso</option>
          <option value="info">Info</option>
        </select>
        <select name="tipo" value={filtros.tipo} onChange={handleFiltroChange} style={{ ...inputSt, minWidth:180 }}>
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="resolvido" value={filtros.resolvido} onChange={handleFiltroChange} style={{ ...inputSt, minWidth:130 }}>
          <option value="false">Não resolvidos</option>
          <option value="true">Resolvidos</option>
          <option value="">Todos</option>
        </select>
        <input type="date" name="data_inicio" value={filtros.data_inicio} onChange={handleFiltroChange}
          style={{ ...inputSt, minWidth:140 }} title="Data início" />
        <input type="date" name="data_fim" value={filtros.data_fim} onChange={handleFiltroChange}
          style={{ ...inputSt, minWidth:140 }} title="Data fim" />
        <button type="submit" style={{ ...btnSt, background:'#F97316', color:'#fff' }}>Filtrar</button>
        <button type="button" onClick={handleLimpar} style={{ ...btnSt, background:'#e5e7eb', color:'#374151' }}>Limpar</button>
        <button type="button" onClick={() => fetchAlerts(page, filtros)}
          style={{ ...btnSt, background:'#eff6ff', color:'#1d4ed8' }}>↻</button>
      </form>

      {/* Tabela */}
      <div style={{ overflowX:'auto', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>
            <div style={{ width:28, height:28, border:'3px solid #e5e7eb', borderTopColor:'#F97316', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto 8px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Carregando alertas...
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:14 }}>
            {filtros.resolvido === 'false'
              ? '✅ Nenhum alerta aberto encontrado.'
              : 'Nenhum alerta encontrado com os filtros aplicados.'}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:'2px solid #e5e7eb' }}>
                {['Data/Hora','Tipo','Severidade','IP','Usuário','Oficina','Detalhes','Status','Ação'].map(h=>(
                  <th key={h} style={{
                    padding:'10px 12px', textAlign:'left', fontWeight:600,
                    color:'#374151', fontSize:12, whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a, i) => (
                <tr key={a.id} style={{
                  borderBottom:'1px solid #f3f4f6',
                  background: a.severidade === 'critico' ? '#fff5f5'
                            : a.severidade === 'alto'    ? '#fffbf5'
                            : i%2===0 ? '#fff' : '#fafafa',
                }}>
                  <td style={{ padding:'9px 12px', whiteSpace:'nowrap', color:'#374151', fontSize:12 }}>
                    {a.created_at_br || a.created_at?.slice(0,19).replace('T',' ')}
                  </td>
                  <td style={{ padding:'9px 12px' }}><TipoBadge tipo={a.tipo} /></td>
                  <td style={{ padding:'9px 12px' }}><SevBadge sev={a.severidade} /></td>
                  <td style={{ padding:'9px 12px', color:'#9ca3af', fontSize:11, fontFamily:'monospace' }}>
                    {a.ip || '—'}
                  </td>
                  <td style={{ padding:'9px 12px', color:'#374151', fontSize:12 }}>
                    {a.usuario_nome_ref || <span style={{ color:'#9ca3af' }}>—</span>}
                  </td>
                  <td style={{ padding:'9px 12px', color:'#374151', fontSize:12 }}>
                    {a.oficina_nome || <span style={{ color:'#9ca3af' }}>Global</span>}
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    <Detalhes detalhes={a.detalhes} />
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    {a.resolvido ? (
                      <span style={{ fontSize:11, color:'#16a34a', fontWeight:600 }}>✓ Resolvido</span>
                    ) : (
                      <span style={{ fontSize:11, color:'#dc2626', fontWeight:600 }}>● Aberto</span>
                    )}
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    {!a.resolvido && (
                      <button
                        onClick={() => handleResolver(a.id)}
                        disabled={resolving === a.id}
                        style={{
                          padding:'4px 10px', borderRadius:6, border:'1px solid #d1d5db',
                          background: resolving===a.id ? '#f3f4f6' : '#fff',
                          color:'#374151', fontSize:12, cursor:'pointer', fontWeight:500,
                        }}
                      >
                        {resolving === a.id ? '...' : 'Resolver'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, flexWrap:'wrap', gap:8 }}>
          <span style={{ color:'#6b7280', fontSize:12 }}>
            Página {page} de {pages} — {total.toLocaleString('pt-BR')} alertas
          </span>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={()=>fetchAlerts(1,filtros)} disabled={page===1}
              style={{ ...btnSt, background:page===1?'#f3f4f6':'#fff', color:'#374151', border:'1px solid #d1d5db', padding:'4px 10px' }}>«</button>
            <button onClick={()=>fetchAlerts(page-1,filtros)} disabled={page===1}
              style={{ ...btnSt, background:page===1?'#f3f4f6':'#fff', color:'#374151', border:'1px solid #d1d5db', padding:'4px 10px' }}>‹</button>
            <button onClick={()=>fetchAlerts(page+1,filtros)} disabled={page===pages}
              style={{ ...btnSt, background:page===pages?'#f3f4f6':'#fff', color:'#374151', border:'1px solid #d1d5db', padding:'4px 10px' }}>›</button>
            <button onClick={()=>fetchAlerts(pages,filtros)} disabled={page===pages}
              style={{ ...btnSt, background:page===pages?'#f3f4f6':'#fff', color:'#374151', border:'1px solid #d1d5db', padding:'4px 10px' }}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
