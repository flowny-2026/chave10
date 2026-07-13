/**
 * KPICard — Cartão de métrica compacto e elegante.
 * Usado em Clientes, Veículos e outras páginas do app.
 */
export default function KPICard({
  title,
  value,
  subvalue,
  trend,
  icon,
  color = '#F97316',
  size = 'normal',
  onClick,
}) {
  const trendNum = parseFloat(trend || 0);
  const isUp   = trendNum > 0;
  const isDown = trendNum < 0;

  return (
    <div
      className="kpi-card"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${color}`,
        borderRadius: 10,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        minWidth: 0,
      }}
    >
      {/* Ícone */}
      <div style={{
        width: 42, height: 42, flexShrink: 0, borderRadius: 10,
        background: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>

      {/* Dados */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <div style={{ fontSize: size === 'large' ? 26 : 22, fontWeight: 800, color: '#111827', lineHeight: 1.1, marginTop: 2 }}>
          {value}
        </div>
        {subvalue && (
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
            {subvalue}
          </div>
        )}
      </div>

      {/* Trend badge */}
      {trend !== undefined && (
        <div style={{
          flexShrink: 0,
          fontSize: 11, fontWeight: 700,
          padding: '3px 8px', borderRadius: 20,
          background: isUp ? '#dcfce7' : isDown ? '#fee2e2' : '#f3f4f6',
          color:      isUp ? '#16a34a' : isDown ? '#dc2626' : '#6b7280',
        }}>
          {isUp ? '▲' : isDown ? '▼' : '—'} {Math.abs(trendNum).toFixed(0)}%
        </div>
      )}
    </div>
  );
}
