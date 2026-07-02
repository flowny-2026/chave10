import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import DashboardCustomizer, { DEFAULT_LAYOUT, AVAILABLE_WIDGETS } from '../../components/DashboardCustomizer';
import PeriodFilter from '../../components/PeriodFilter';
import '../../styles/dashboardPremium.css';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
};

function getUser() {
  try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; }
}

// Carrega layout salvo ou retorna padrão
function loadLayout() {
  try {
    const saved = localStorage.getItem('c10_dashboard_layout');
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

// Salva layout
function saveLayout(layout) {
  localStorage.setItem('c10_dashboard_layout', JSON.stringify(layout));
}

// Componente de gráfico de barras
function BarChart({ data }) {
  if (!data?.length || data.every(d => d.total === 0))
    return <div className="empty-state" style={{padding:24}}><p>Sem dados</p></div>;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="dashboard-chart" style={{display:'flex',alignItems:'flex-end',gap:6,height:110,marginTop:12,overflowX:'auto'}}>
      {data.map((d,i) => (
        <div key={i} style={{flex:1,minWidth:32,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
          <div style={{fontSize:9,color:'var(--gray-400)'}}>{d.total>0?fmt.currency(d.total).replace('R$ ',''):''}</div>
          <div style={{width:'100%',background:'var(--accent)',borderRadius:4,height:Math.max((d.total/max)*80,d.total>0?4:0),opacity:.85}} />
          <div style={{fontSize:9,color:'var(--gray-400)'}}>{d.mes}</div>
        </div>
      ))}
    </div>
  );
}

const STATUS_CLASS = { em_andamento:'badge-orange', finalizado:'badge-green' };
const STATUS_LABEL = { em_andamento:'Em andamento', finalizado:'Finalizado' };

// KPI Card Moderno
function KPICard({ title, value, subvalue, trend, icon, color = 'var(--accent)', size = 'normal' }) {
  const trendNum = parseFloat(trend || 0);
  const isUp = trendNum > 0;
  const isDown = trendNum < 0;
  
  return (
    <div className={`kpi-premium ${size}`} style={{ '--kpi-color': color }}>
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

export default function DashboardV2() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(loadLayout);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [meta, setMeta] = useState(() => { try { return parseFloat(localStorage.getItem('c10_meta'))||0; } catch { return 0; } });
  const [showMeta, setShowMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      preset: 'thisMonth',
      start: firstDay.toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    };
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    api.app.dashboard().then(setData).catch(()=>setData(null)).finally(()=>setLoading(false));
  }, [period]);

  function saveMeta() {
    const v = parseFloat(metaInput)||0;
    setMeta(v);
    localStorage.setItem('c10_meta', v);
    setShowMeta(false);
  }

  function handleLayoutSave(newLayout) {
    setLayout(newLayout);
    saveLayout(newLayout);
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{textAlign:'center'}}>
        <div className="spinner" style={{margin:'0 auto 16px'}}></div>
        <p style={{color:'var(--gray-400)',fontSize:14}}>Carregando dashboard...</p>
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const recentes = data?.recentes || [];
  const faturamentoMensal = data?.faturamentoMensal || [];
  const isFuncionario = getUser()?.perfil === 'funcionario';
  
  // Cálculos
  const fat = parseFloat(stats.faturamentoMes||0);
  const fatHoje = parseFloat(stats.faturamentoHoje||0);
  const fatMO = parseFloat(stats.moMes||0);
  const fatPecas = parseFloat(stats.pecasMes||0);
  const finalizadasHoje = parseInt(stats.finalizadasHoje||0);
  const emAndamento = parseInt(stats.emAndamento||0);
  const totalClientes = parseInt(stats.totalClientes||0);
  const ticketMedio = fat > 0 && finalizadasHoje > 0 ? fat / finalizadasHoje : 0;
  
  // Meta
  const pctMeta = meta > 0 ? Math.min(100,(fat/meta)*100) : 0;
  const now = new Date();
  const diasRestantes = Math.max(1, new Date(now.getFullYear(),now.getMonth()+1,0).getDate() - now.getDate());
  const faltaMeta = Math.max(0, meta - fat);
  const porDia = diasRestantes > 0 ? faltaMeta/diasRestantes : 0;
  
  // Tendências (simuladas - você pode calcular do backend depois)
  const trendFat = 12.5;
  const trendOS = -3.2;
  const trendClientes = 8.1;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{marginBottom:28}}>
        <div>
          <h1 className="page-title" style={{fontSize:26,marginBottom:6}}>Dashboard</h1>
          <p className="page-subtitle">Visão geral da sua oficina em tempo real</p>
        </div>
        <div className="page-actions" style={{gap:10}}>
          <button className="btn btn-primary" onClick={() => navigate('/app/os')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova OS
          </button>
        </div>
      </div>

      {/* KPIs Principais - Linha 1 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,marginBottom:24}}>
        {!isFuncionario && (
          <KPICard
            title="Faturamento do Mês"
            value={fmt.currency(fat)}
            subvalue={`Hoje: ${fmt.currency(fatHoje)}`}
            trend={trendFat}
            color="var(--accent)"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          />
        )}
        
        <KPICard
          title="OS Finalizadas Hoje"
          value={finalizadasHoje}
          subvalue={`${emAndamento} em andamento`}
          trend={trendOS}
          color="var(--success)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        
        <KPICard
          title="OS em Andamento"
          value={emAndamento}
          subvalue="Ordens abertas"
          color="var(--brand)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
        />
        
        <KPICard
          title="Total de Clientes"
          value={totalClientes}
          subvalue="Base ativa"
          trend={trendClientes}
          color="#7c3aed"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
        />
        
        {!isFuncionario && ticketMedio > 0 && (
          <KPICard
            title="Ticket Médio"
            value={fmt.currency(ticketMedio)}
            subvalue="Por OS finalizada"
            color="var(--info)"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
          />
        )}
      </div>

      {/* Meta Mensal Premium */}
      {!isFuncionario && meta > 0 && (
        <div className="meta-progress-premium" style={{marginBottom:24}}>
          <div className="meta-header">
            <div className="meta-title">
              <span>🎯</span>
              <span>Meta Mensal</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setMetaInput(meta);setShowMeta(true);}}>
              Editar
            </button>
          </div>
          
          <div className="meta-progress-bar">
            <div className="meta-progress-fill" style={{width:`${pctMeta}%`}}></div>
          </div>
          
          <div className="meta-stats-grid">
            <div className="meta-stat-box">
              <div className="meta-stat-label">Faturado</div>
              <div className="meta-stat-value">{fmt.currency(fat)}</div>
            </div>
            <div className="meta-stat-box">
              <div className="meta-stat-label">Meta</div>
              <div className="meta-stat-value">{fmt.currency(meta)}</div>
            </div>
            <div className="meta-stat-box">
              <div className="meta-stat-label">Restante</div>
              <div className="meta-stat-value">{fmt.currency(faltaMeta)}</div>
            </div>
          </div>
          
          <div style={{marginTop:16,padding:'14px',background:'var(--brand-light)',borderRadius:10,textAlign:'center'}}>
            <div style={{fontSize:13,color:'var(--brand)',fontWeight:600}}>
              {pctMeta >= 100 
                ? '🎉 Meta atingida! Parabéns!' 
                : `Você precisa faturar ${fmt.currency(porDia)}/dia nos próximos ${diasRestantes} dias`
              }
            </div>
          </div>
        </div>
      )}

      {/* Grid Principal - Gráfico e OS Recentes */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:24}}>
        {/* Gráfico de Faturamento */}
        {!isFuncionario && (
          <div className="modern-chart-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h3 style={{fontSize:16,fontWeight:700,color:'var(--gray-800)'}}>📊 Faturamento Mensal</h3>
            </div>
            <ModernChart data={faturamentoMensal} />
          </div>
        )}
        
        {/* OS Recentes */}
        <div className="activity-feed">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <h3 style={{fontSize:16,fontWeight:700,color:'var(--gray-800)'}}>📋 OS Recentes</h3>
            <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/app/os')}>Ver todas</button>
          </div>
          
          {recentes.length === 0 ? (
            <div style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>
              <div style={{fontSize:32,marginBottom:8}}>🔧</div>
              <p style={{fontSize:13}}>Nenhuma OS ainda</p>
            </div>
          ) : (
            recentes.slice(0,5).map(os=>(
              <div key={os.id} className="activity-item">
                <div className="activity-icon" style={{background:'var(--brand-light)',color:'var(--brand)'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <div className="activity-content">
                  <div className="activity-title">OS #{String(os.id).padStart(4,'0')} · {os.cliente_nome||'—'}</div>
                  <div className="activity-desc">{os.veiculo_modelo||'—'}{os.placa?` · ${os.placa}`:''}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                  <span className={`badge ${STATUS_CLASS[os.status]||'badge-gray'}`} style={{fontSize:10}}>
                    {STATUS_LABEL[os.status]||os.status}
                  </span>
                  {!isFuncionario && (
                    <div style={{fontSize:12,fontWeight:700,color:'var(--gray-700)'}}>
                      {fmt.currency(parseFloat(os.valor||0))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Botão Meta se não definida */}
      {!isFuncionario && meta === 0 && (
        <div className="insight-card" style={{marginBottom:24}}>
          <div className="insight-icon">🎯</div>
          <div className="insight-text" style={{marginBottom:16}}>
            <strong>Defina sua meta mensal</strong> e acompanhe o progresso do seu faturamento com clareza.
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>{setMetaInput('');setShowMeta(true);}}>
            Definir Meta Agora
          </button>
        </div>
      )}

      {/* Meta Modal */}
      {showMeta && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-header">
              <h2>🎯 Meta mensal</h2>
              <button className="modal-close" onClick={()=>setShowMeta(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:13.5,color:'var(--gray-500)',marginBottom:20}}>Defina quanto sua oficina precisa faturar este mês.</p>
              <div className="form-group" style={{marginBottom:20}}>
                <label>Meta de faturamento (R$)</label>
                <input type="number" step="100" min="0" value={metaInput} onChange={e=>setMetaInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveMeta()} placeholder="Ex: 30000" style={{fontSize:18,fontWeight:700,padding:'13px 16px'}} autoFocus />
              </div>
              <div className="form-actions">
                <button className="btn btn-outline" onClick={()=>setShowMeta(false)}>Cancelar</button>
                {meta>0 && <button className="btn btn-ghost" style={{color:'var(--danger)'}} onClick={()=>{setMeta(0);localStorage.removeItem('c10_meta');setShowMeta(false);}}>Remover meta</button>}
                <button className="btn btn-primary" onClick={saveMeta}>💾 Salvar meta</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
