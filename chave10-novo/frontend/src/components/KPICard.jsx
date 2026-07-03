/**
 * KPI Card Component - Padrão visual reutilizável em todo o sistema
 * Baseado no design do Dashboard Premium
 */

export default function KPICard({ 
  title, 
  value, 
  subvalue, 
  trend, 
  icon, 
  color = 'var(--accent)', 
  size = 'normal',
  onClick 
}) {
  const trendNum = parseFloat(trend || 0);
  const isUp = trendNum > 0;
  const isDown = trendNum < 0;
  
  const cardClass = `kpi-premium ${size}${onClick ? ' clickable' : ''}`;
  const style = { '--kpi-color': color };
  
  if (onClick) {
    style.cursor = 'pointer';
  }
  
  return (
    <div className={cardClass} style={style} onClick={onClick}>
      <div className="kpi-icon-wrap" style={{ background: `${color}12` }}>
        <div className="kpi-icon" style={{ color }}>{icon}</div>
      </div>
      <div className="kpi-data">
        <div className="kpi-label">{title}</div>
        <div className="kpi-value">{value}</div>
        {subvalue && <div className="kpi-sub">{subvalue}</div>}
      </div>
      {trend !== undefined && (
        <div className={`kpi-trend-badge ${isUp?'up':isDown?'down':'neutral'}`}>
          <span className="trend-icon">{isUp?'↗':isDown?'↘':'→'}</span>
          <span className="trend-val">{Math.abs(trendNum).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
