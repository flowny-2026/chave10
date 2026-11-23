import { useEffect, useState } from 'react';
import { api } from '../../api';

const fmtCurrency = v =>
  'R$\u00a0' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = iso => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// ── Gráfico de barras SVG ─────────────────────────────────────
function BarChart({ data, color = '#F97316' }) {
  if (!data?.length) return null;
  const W = 500, H = 90, pad = { t: 8, b: 24, l: 0, r: 0 };
  const vals = data.map(d => d.total);
  const max = Math.max(...vals, 1);
  const barW = (W - pad.l - pad.r) / vals.length - 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      {vals.map((v, i) => {
        const x = pad.l + i * ((W - pad.l - pad.r) / vals.length) + 3;
        const bH = Math.max((v / max) * (H - pad.t - pad.b), v > 0 ? 4 : 0);
        const y = H - pad.b - bH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bH} rx={3} fill={color} opacity={0.85} />
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#64748b">
              {data[i].mes}
            </text>
            {v > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="8.5" fill="#94a3b8">
                {(v / 1000).toFixed(0)}k
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Badge forma de pagamento ──────────────────────────────────
function FormaBadge({ forma }) {
  const map = {
    pix:         { label: 'PIX',         color: '#4ade80', bg: '#16a34a22' },
    dinheiro:    { label: 'Dinheiro',     color: '#fb923c', bg: '#d9770622' },
    transferencia:{ label: 'Transferência',color: '#60a5fa', bg: '#2563eb22' },
  };
  const s = map[forma] || { label: forma, color: '#94a3b8', bg: '#64748b22' };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── KPI mini ──────────────────────────────────────────────────
function MiniKpi({ label, value, color = '#F97316' }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '16px 20px', flex: '1 1 140px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function AdminPagamentos() {
  const [pagamentos,     setPagamentos]     = useState([]);
  const [oficinas,       setOficinas]       = useState([]);
  const [filterOficina,  setFilterOficina]  = useState('');
  const [busca,          setBusca]          = useState('');
  const [loading,        setLoading]        = useState(true);
  const [receitaMensal,  setReceitaMensal]  = useState([]);

  async function load() {
    setLoading(true);
    try {
      const [pags, ofs, dash] = await Promise.all([
        api.admin.pagamentos.list(filterOficina || undefined),
        api.admin.oficinas.list(),
        api.admin.dashboard(),
      ]);
      setPagamentos(pags);
      setOficinas(ofs);
      setReceitaMensal(dash.receitaMensal || []);
    } catch {
      setPagamentos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterOficina]); // eslint-disable-line

  const filtrados = pagamentos.filter(p =>
    !busca || p.nome_oficina?.toLowerCase().includes(busca.toLowerCase())
  );
  const total     = filtrados.reduce((s, p) => s + parseFloat(p.valor || 0), 0);
  const totalPix  = filtrados.filter(p => p.forma_pagamento === 'pix').reduce((s, p) => s + parseFloat(p.valor || 0), 0);
  const qtdMes    = filtrados.filter(p => {
    const hoje = new Date(); const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return new Date(p.data_pagamento) >= ini;
  }).length;

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: '24px 28px', color: '#f1f5f9' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#f8fafc' }}>Pagamentos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''} · Total: {fmtCurrency(total)}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <MiniKpi label="Total recebido" value={fmtCurrency(total)} color="#4ade80" />
        <MiniKpi label="Recebido via PIX" value={fmtCurrency(totalPix)} color="#60a5fa" />
        <MiniKpi label="Pagamentos no mês" value={qtdMes} color="#F97316" />
        <MiniKpi label="Registros filtrados" value={filtrados.length} color="#a78bfa" />
      </div>

      {/* Gráfico de receita mensal */}
      {receitaMensal.length > 0 && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Receita Mensal (últimos 6 meses)</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Valores em milhares (R$)</div>
          <BarChart data={receitaMensal} color="#F97316" />
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por oficina..."
          style={{ flex: '1 1 200px', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13 }}
        />
        <select
          value={filterOficina} onChange={e => setFilterOficina(e.target.value)}
          style={{ flex: '1 1 180px', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13 }}
        >
          <option value="">Todas as oficinas</option>
          {oficinas.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <button onClick={load} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>↻</button>
      </div>

      {/* Tabela */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Nenhum pagamento encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                  {['Oficina', 'Valor', 'Data', 'Novo Vencimento', 'Forma', 'Observação'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1e3a5f29', background: i % 2 === 0 ? 'transparent' : '#0f172a18' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0' }}>{p.nome_oficina}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 15, color: '#4ade80' }}>{fmtCurrency(p.valor)}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{fmtDate(p.data_pagamento)}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{fmtDate(p.novo_vencimento)}</td>
                    <td style={{ padding: '12px 16px' }}><FormaBadge forma={p.forma_pagamento} /></td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: 12 }}>{p.observacao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé com total */}
        {filtrados.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: 24, background: '#0f172a' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{filtrados.length} registros</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#4ade80' }}>Total: {fmtCurrency(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
