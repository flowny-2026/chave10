import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

// ── Formatadores ──────────────────────────────────────────────
const fmtCurrency = v =>
  'R$\u00a0' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = iso => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const fmtPct = v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';

// ── Spinner ───────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #1e293b', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, trend, color = '#F97316', onClick }) {
  const up = trend > 0, down = trend < 0;
  return (
    <div onClick={onClick} style={{
      background: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)',
      border: '1px solid #334155', borderRadius: 14, padding: '18px 20px',
      cursor: onClick ? 'pointer' : 'default', transition: 'transform .15s, box-shadow .15s',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}
      onMouseOver={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.4)'; } }}
      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 700, color: up ? '#22c55e' : down ? '#ef4444' : '#94a3b8',
            background: up ? '#22c55e18' : down ? '#ef444418' : '#94a3b818', borderRadius: 20, padding: '2px 8px' }}>
            {up ? '▲' : down ? '▼' : '—'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Gráfico de linha SVG ──────────────────────────────────────
function LineChart({ data, color = '#F97316' }) {
  if (!data?.length) return null;
  const W = 520, H = 120, pad = { t: 10, b: 28, l: 0, r: 0 };
  const vals = data.map(d => d.total);
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => {
    const x = pad.l + (i / (vals.length - 1)) * (W - pad.l - pad.r);
    const y = pad.t + (1 - v / max) * (H - pad.t - pad.b);
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${path} L${pts[pts.length-1][0]},${H-pad.b} L${pts[0][0]},${H-pad.b} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg1)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={4} fill={color} />
          <text x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="#64748b">{data[i].mes}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Donut Chart SVG ───────────────────────────────────────────
function DonutChart({ slices, size = 120 }) {
  const r = 42, cx = size / 2, cy = size / 2, strokeW = 16;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s, sl) => s + (sl.value || 0), 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((sl, i) => {
        const dash = (sl.value / total) * circ;
        const gap = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={sl.color} strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fontWeight="800" fill="#f1f5f9">
        {total}
      </text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize="9" fill="#64748b">total</text>
    </svg>
  );
}

// ── Card container genérico ───────────────────────────────────
function Card({ title, subtitle, action, children, style }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, overflow: 'hidden', ...style }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

// ── Badge de status ────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:  { label: 'Ativa',     bg: '#16a34a22', color: '#4ade80', border: '#16a34a44' },
    overdue: { label: 'Em atraso', bg: '#d9770622', color: '#fb923c', border: '#d9770644' },
    blocked: { label: 'Bloqueada', bg: '#dc262622', color: '#f87171', border: '#dc262644' },
    pending: { label: 'Pendente',  bg: '#64748b22', color: '#94a3b8', border: '#64748b44' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

// ── Alerta de segurança mini ───────────────────────────────────
function AlertaCard({ critico = 0, alto = 0, aviso = 0, onClick }) {
  const total = critico + alto + aviso;
  if (total === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#16a34a18', borderRadius: 10, border: '1px solid #16a34a33' }}>
      <span style={{ fontSize: 18 }}>✅</span>
      <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>Nenhum alerta de segurança aberto</span>
    </div>
  );
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      background: critico > 0 ? '#dc262618' : '#d9770618', borderRadius: 10,
      border: `1px solid ${critico > 0 ? '#dc262644' : '#d9770644'}` }}>
      <span style={{ fontSize: 22 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: critico > 0 ? '#f87171' : '#fb923c' }}>
          {total} alerta{total > 1 ? 's' : ''} de segurança aberto{total > 1 ? 's' : ''}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          {critico > 0 && <span style={{ color: '#f87171', marginRight: 8 }}>●&nbsp;{critico} crítico{critico > 1 ? 's' : ''}</span>}
          {alto > 0   && <span style={{ color: '#fb923c', marginRight: 8 }}>●&nbsp;{alto} alto{alto > 1 ? 's' : ''}</span>}
          {aviso > 0  && <span style={{ color: '#fbbf24' }}>●&nbsp;{aviso} aviso{aviso > 1 ? 's' : ''}</span>}
        </div>
      </div>
      <span style={{ fontSize: 14, color: '#94a3b8' }}>→</span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function AdminDashboard() {
  const [data,       setData]       = useState(null);
  const [vencendo,   setVencendo]   = useState([]);
  const [alertas,    setAlertas]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [oficinas,   setOficinas]   = useState([]);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.admin.dashboard(),
      api.admin.vencendo(),
      api.get('/api/admin/audit-alerts?resolvido=false&limit=1'),
      api.admin.oficinas.list(),
    ]);
    if (results[0].status === 'fulfilled') setData(results[0].value);
    if (results[1].status === 'fulfilled') setVencendo(results[1].value);
    if (results[2].status === 'fulfilled') setAlertas(results[2].value.contadores || {});
    if (results[3].status === 'fulfilled') setOficinas(results[3].value.slice(0, 8));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ background: '#0f172a', minHeight: '100vh' }}><Spinner /></div>;
  if (!data) return null;

  const { stats, receitaMensal, recentes } = data;
  const mesAnterior = receitaMensal?.[receitaMensal.length - 2]?.total || 0;
  const mesAtual    = receitaMensal?.[receitaMensal.length - 1]?.total || 0;
  const varReceita  = mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : 0;
  const ticketMedio = stats.ativas > 0 ? stats.receitaMes / stats.ativas : 0;
  const taxaInadimp = stats.totalOficinas > 0
    ? ((stats.overdue + stats.blocked) / stats.totalOficinas) * 100 : 0;

  const donutSlices = [
    { label: 'Ativas',     value: stats.ativas,  color: '#22c55e' },
    { label: 'Em atraso',  value: stats.overdue, color: '#f97316' },
    { label: 'Bloqueadas', value: stats.blocked, color: '#ef4444' },
    { label: 'Pendentes',  value: Math.max(0, stats.totalOficinas - stats.ativas - stats.overdue - stats.blocked), color: '#64748b' },
  ];

  // ── Ícones ──────────────────────────────────────────────────
  const IC = {
    oficinas: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    ativas:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    receita:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    total:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    ticket:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    risco:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  };

  const now = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: '24px 28px', color: '#f1f5f9' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#f8fafc' }}>Painel Administrativo</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{now}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>↻ Atualizar</button>
          <button onClick={() => navigate('/admin/oficinas')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#F97316', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Nova Oficina</button>
        </div>
      </div>

      {/* Alerta segurança */}
      {(alertas.critico > 0 || alertas.alto > 0 || alertas.aviso > 0) && (
        <div style={{ marginBottom: 20 }}>
          <AlertaCard critico={alertas.critico} alto={alertas.alto} aviso={alertas.aviso}
            onClick={() => navigate('/admin/security-alerts')} />
        </div>
      )}

      {/* Alerta vencimento */}
      {vencendo.length > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: '#d9770618', borderRadius: 10, border: '1px solid #d9770644', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 20 }}>⏰</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fb923c' }}>{vencendo.length} oficina(s) vencendo nos próximos 7 dias</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{vencendo.map(o => o.nome).join(', ')}</div>
            </div>
          </div>
          <button onClick={() => navigate('/admin/oficinas')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#d97706', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Ver oficinas →</button>
        </div>
      )}

      {/* KPIs — linha 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KpiCard icon={IC.oficinas} label="Total de Oficinas" value={stats.totalOficinas} color="#3b82f6" onClick={() => navigate('/admin/oficinas')} />
        <KpiCard icon={IC.ativas} label="Ativas" value={stats.ativas}
          sub={`${((stats.ativas / (stats.totalOficinas || 1)) * 100).toFixed(0)}% do total`} color="#22c55e" onClick={() => navigate('/admin/oficinas?status=active')} />
        <KpiCard icon={IC.receita} label="Receita do Mês" value={fmtCurrency(stats.receitaMes)} trend={varReceita} color="#F97316" />
        <KpiCard icon={IC.total} label="Receita Total" value={fmtCurrency(stats.receitaTotal)} color="#a855f7" />
        <KpiCard icon={IC.ticket} label="Ticket Médio" value={fmtCurrency(ticketMedio)} sub="receita mês / ativas" color="#06b6d4" />
        <KpiCard icon={IC.risco} label="Inadimplência" value={`${taxaInadimp.toFixed(0)}%`}
          sub={`${stats.overdue + stats.blocked} oficinas`} color={taxaInadimp > 20 ? '#ef4444' : '#f59e0b'}
          onClick={() => navigate('/admin/oficinas?status=overdue')} />
      </div>

      {/* Grid principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Gráfico receita */}
        <Card title="Receita Mensal" subtitle="Últimos 6 meses"
          action={<span style={{ fontSize: 11, color: varReceita >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{fmtPct(varReceita)} vs mês anterior</span>}>
          <LineChart data={receitaMensal} color="#F97316" />
        </Card>

        {/* Donut de status */}
        <Card title="Status das Oficinas">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <DonutChart slices={donutSlices} size={110} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {donutSlices.filter(s => s.value > 0).map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Grid inferior */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Últimos pagamentos */}
        <Card title="Últimos Pagamentos" subtitle="10 mais recentes"
          action={<button onClick={() => navigate('/admin/pagamentos')} style={{ fontSize: 11, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todos →</button>}>
          {recentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#475569' }}>Nenhum pagamento ainda</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentes.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1e3a5f29' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome_oficina}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{fmtDate(p.data_pagamento)} · {p.forma_pagamento}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#4ade80' }}>{fmtCurrency(p.valor)}</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>vence {fmtDate(p.novo_vencimento)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Oficinas recentes */}
        <Card title="Oficinas Cadastradas" subtitle="Últimas 8"
          action={<button onClick={() => navigate('/admin/oficinas')} style={{ fontSize: 11, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todas →</button>}>
          {oficinas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#475569' }}>Nenhuma oficina</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {oficinas.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #1e3a5f29', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.nome}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      {o.plano} · vence {fmtDate(o.data_vencimento)}
                    </div>
                  </div>
                  <StatusBadge status={o.status_assinatura} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
