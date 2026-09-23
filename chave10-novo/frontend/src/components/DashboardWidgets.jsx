/**
 * DashboardWidgets.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Componentes reutilizáveis do dashboard: cards de indicador e gráficos (recharts).
 * Todos recebem dados reais via props — nenhum dado fictício é gerado aqui.
 * Cores seguem a identidade do Chave 10 (azul #1E3A5F, laranja #F97316).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const COR = {
  brand:   '#1E3A5F',
  accent:  '#F97316',
  blue:    '#3b82f6',
  green:   '#16a34a',
  red:     '#dc2626',
  gray:    '#9ca3af',
};

const fmtMoeda = v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtCompacto = v => {
  const n = parseFloat(v || 0);
  if (Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + 'k';
  return fmtMoeda(n);
};

/* ── Card de indicador com comparação ──────────────────────── */
export function StatCard({ titulo, valor, moeda = false, variacao = null, cor = 'var(--brand)', invertido = false }) {
  const valorFmt = moeda ? fmtMoeda(valor) : String(valor ?? 0);
  // variacao positiva geralmente é boa; para despesas (invertido), positiva é ruim
  let seta = null, corVar = 'var(--gray-400)';
  if (variacao !== null && variacao !== undefined) {
    const positivo = variacao >= 0;
    const bom = invertido ? !positivo : positivo;
    seta = positivo ? '↑' : '↓';
    corVar = bom ? 'var(--success)' : 'var(--danger)';
  }
  return (
    <div className="dw-stat">
      <div className="dw-stat-top">
        <span className="dw-stat-dot" style={{ background: cor }} />
        <span className="dw-stat-titulo">{titulo}</span>
      </div>
      <div className="dw-stat-valor">{valorFmt}</div>
      {variacao !== null && variacao !== undefined ? (
        <div className="dw-stat-var" style={{ color: corVar }}>
          {seta} {Math.abs(variacao)}% <span className="dw-stat-var-sub">vs. período anterior</span>
        </div>
      ) : (
        <div className="dw-stat-var dw-stat-var-empty">—</div>
      )}
    </div>
  );
}

/* ── Estado vazio genérico de gráfico ──────────────────────── */
function Vazio({ msg = 'Sem dados no período' }) {
  return <div className="dw-vazio">{msg}</div>;
}

function TooltipMoeda({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dw-tooltip">
      <div className="dw-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="dw-tooltip-row">
          <span className="dw-tooltip-dot" style={{ background: p.color }} />
          {p.name}: <strong>{fmtMoeda(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

/* ── Gráfico 1: Faturamento x Despesas ao longo do tempo (área) ── */
export function GraficoFaturamento({ serie }) {
  const temDados = serie?.some(d => (d.faturamento || 0) > 0 || (d.despesas || 0) > 0);
  if (!temDados) return <Vazio msg="Sem faturamento ou despesas no período" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={serie} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR.blue} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COR.blue} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradDesp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR.accent} stopOpacity={0.30} />
            <stop offset="100%" stopColor={COR.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--dw-grid, #eef1f5)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--dw-axis, #9ca3af)' }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--dw-axis, #9ca3af)' }} tickFormatter={fmtCompacto} tickLine={false} axisLine={false} width={54} />
        <Tooltip content={<TooltipMoeda />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke={COR.blue} strokeWidth={2} fill="url(#gradFat)" />
        <Area type="monotone" dataKey="despesas" name="Despesas" stroke={COR.accent} strokeWidth={2} fill="url(#gradDesp)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Gráfico 2: OS por status (rosca) ──────────────────────── */
const CORES_STATUS = { em_andamento: COR.blue, finalizado: COR.green, cancelada: COR.red };
export function GraficoOSStatus({ dados }) {
  const total = (dados || []).reduce((s, d) => s + (d.valor || 0), 0);
  if (total === 0) return <Vazio msg="Nenhuma OS no período" />;
  return (
    <div className="dw-rosca-wrap">
      <div className="dw-rosca-chart">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={dados} dataKey="valor" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
              {dados.map((d) => <Cell key={d.status} fill={CORES_STATUS[d.status] || COR.gray} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="dw-rosca-centro">
          <div className="dw-rosca-total">{total}</div>
          <div className="dw-rosca-total-label">Total</div>
        </div>
      </div>
      <div className="dw-rosca-legenda">
        {dados.map(d => {
          const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0;
          return (
            <div key={d.status} className="dw-legenda-item">
              <span className="dw-legenda-dot" style={{ background: CORES_STATUS[d.status] || COR.gray }} />
              <span className="dw-legenda-label">{d.label}</span>
              <span className="dw-legenda-val">{d.valor} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Gráfico: distribuição por categoria (rosca genérica) ────
   dados: [{ label, valor, cor? }]. Usado, por ex., em Despesas por categoria. */
const PALETA_CAT = ['#F97316', '#3b82f6', '#16a34a', '#8b5cf6', '#dc2626', '#0ea5e9', '#eab308', '#ec4899', '#14b8a6', '#64748b'];
export function GraficoCategorias({ dados, unidadeLabel = 'categorias' }) {
  const lista = (dados || []).filter(d => (d.valor || 0) > 0);
  const total = lista.reduce((s, d) => s + (d.valor || 0), 0);
  if (total === 0) return <Vazio msg="Sem dados no período" />;
  const cor = (d, i) => d.cor || PALETA_CAT[i % PALETA_CAT.length];
  return (
    <div className="dw-rosca-wrap">
      <div className="dw-rosca-chart">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={lista} dataKey="valor" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
              {lista.map((d, i) => <Cell key={d.label} fill={cor(d, i)} />)}
            </Pie>
            <Tooltip content={<TooltipMoeda />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="dw-rosca-centro">
          <div className="dw-rosca-total">{lista.length}</div>
          <div className="dw-rosca-total-label">{unidadeLabel}</div>
        </div>
      </div>
      <div className="dw-rosca-legenda">
        {lista.map((d, i) => {
          const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0;
          return (
            <div key={d.label} className="dw-legenda-item">
              <span className="dw-legenda-dot" style={{ background: cor(d, i) }} />
              <span className="dw-legenda-label">{d.label}</span>
              <span className="dw-legenda-val">{fmtMoeda(d.valor)} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Gráfico 3: Receitas x Despesas por período (barras) ───── */
export function GraficoReceitasDespesas({ serie }) {
  const temDados = serie?.some(d => (d.faturamento || 0) > 0 || (d.despesas || 0) > 0);
  if (!temDados) return <Vazio msg="Sem receitas ou despesas no período" />;
  // Para barras, agrupa por rótulo já pronto na série
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={serie} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--dw-grid, #eef1f5)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--dw-axis, #9ca3af)' }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--dw-axis, #9ca3af)' }} tickFormatter={fmtCompacto} tickLine={false} axisLine={false} width={54} />
        <Tooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(0,0,0,.04)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="faturamento" name="Receitas" fill={COR.blue} radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="despesas" name="Despesas" fill={COR.accent} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Lista: Top clientes por faturamento ───────────────────── */
export function TopClientes({ clientes }) {
  if (!clientes?.length) return <Vazio msg="Sem faturamento por cliente no período" />;
  const max = Math.max(...clientes.map(c => +c.total || 0), 1);
  return (
    <div className="dw-lista">
      {clientes.map((c, i) => (
        <div key={c.id} className="dw-cliente-item">
          <div className="dw-cliente-top">
            <span className="dw-cliente-nome">{i + 1}. {c.nome}</span>
            <span className="dw-cliente-valor">{fmtMoeda(c.total)}</span>
          </div>
          <div className="dw-cliente-bar-track">
            <div className="dw-cliente-bar-fill" style={{ width: `${(+c.total / max) * 100}%` }} />
          </div>
          <div className="dw-cliente-sub">{c.qtd} OS finalizada{+c.qtd > 1 ? 's' : ''}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Lista: Últimas OS ─────────────────────────────────────── */
const STATUS_LABEL = { em_andamento: 'Em andamento', finalizado: 'Concluída', cancelada: 'Cancelada' };
const STATUS_BADGE = { em_andamento: 'badge-orange', finalizado: 'badge-green', cancelada: 'badge-red' };
export function UltimasOS({ lista, onVerTodas }) {
  if (!lista?.length) return <Vazio msg="Nenhuma OS no período" />;
  const fmtData = iso => { if (!iso) return ''; const s = String(iso).slice(0, 10); return s.slice(8, 10) + '/' + s.slice(5, 7); };
  return (
    <div className="dw-lista">
      {lista.map(os => (
        <div key={os.id} className="dw-os-item">
          <div className="dw-os-info">
            <div className="dw-os-num">OS #{os.numero || String(os.id).padStart(4, '0')}</div>
            <div className="dw-os-cliente">{os.cliente_nome || '—'}</div>
            <div className="dw-os-veiculo">{[os.veiculo_marca, os.veiculo_modelo].filter(Boolean).join(' ') || '—'}{os.placa ? ' · ' + os.placa : ''}</div>
          </div>
          <div className="dw-os-right">
            <span className={`badge ${STATUS_BADGE[os.status] || 'badge-gray'}`}>{STATUS_LABEL[os.status] || os.status}</span>
            {os.valor != null && <div className="dw-os-valor">{fmtMoeda(os.valor)}</div>}
            <div className="dw-os-data">{fmtData(os.data)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Linha de resumo (label + valor) ───────────────────────── */
export function ResumoLinha({ label, valor, destaque = false }) {
  return (
    <div className={`dw-resumo-linha${destaque ? ' dw-resumo-linha--destaque' : ''}`}>
      <span className="dw-resumo-label">{label}</span>
      <span className="dw-resumo-valor">{fmtMoeda(valor)}</span>
    </div>
  );
}
