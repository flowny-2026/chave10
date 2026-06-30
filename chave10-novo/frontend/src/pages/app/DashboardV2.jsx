import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import DashboardCustomizer, { DEFAULT_LAYOUT, AVAILABLE_WIDGETS } from '../../components/DashboardCustomizer';
import PeriodFilter from '../../components/PeriodFilter';

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

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--gray-400)'}}>Carregando...</div>;

  const stats = data?.stats || {};
  const recentes = data?.recentes || [];
  const faturamentoMensal = data?.faturamentoMensal || [];
  const isFuncionario = getUser()?.perfil === 'funcionario';
  const fat = parseFloat(stats.faturamentoMes||0);
  const fatMO = parseFloat(stats.moMes||0);
  const fatPecas = parseFloat(stats.pecasMes||0);
  const pctMO = fat > 0 ? Math.round((fatMO/fat)*100) : 0;
  const pctPecas = fat > 0 ? Math.round((fatPecas/fat)*100) : 0;
  const now = new Date();
  const diasRestantes = Math.max(1, new Date(now.getFullYear(),now.getMonth()+1,0).getDate() - now.getDate());
  const faltaMeta = Math.max(0, meta - fat);
  const porDia = diasRestantes > 0 ? faltaMeta/diasRestantes : 0;
  const pctMeta = meta > 0 ? Math.min(100,(fat/meta)*100) : 0;

  // Renderiza widget individual
  function renderWidget(widgetId) {
    const widgetInfo = AVAILABLE_WIDGETS[widgetId];
    if (!widgetInfo) return null;

    switch (widgetId) {
      case 'faturamento':
        if (isFuncionario) return null;
        return (
          <div key="faturamento" className="stat-card c-orange">
            <div className="stat-icon c-orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div className="stat-value" style={{fontSize:20}}>{fmt.currency(fat)}</div>
              <div className="stat-label">Faturamento Total</div>
            </div>
          </div>
        );

      case 'os_finalizadas':
        return (
          <div key="os_finalizadas" className="stat-card c-green">
            <div className="stat-icon c-green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <div className="stat-value" style={{fontSize:20}}>{stats.finalizadasHoje||0}</div>
              <div className="stat-label">Finalizadas Hoje</div>
            </div>
          </div>
        );

      case 'os_andamento':
        return (
          <div key="os_andamento" className="stat-card c-blue">
            <div className="stat-icon c-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <div>
              <div className="stat-value" style={{fontSize:20}}>{stats.emAndamento||0}</div>
              <div className="stat-label">OS em Andamento</div>
            </div>
          </div>
        );

      case 'clientes':
        return (
          <div key="clientes" className="stat-card c-purple">
            <div className="stat-icon c-purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <div className="stat-value" style={{fontSize:20}}>{stats.totalClientes||0}</div>
              <div className="stat-label">Total de Clientes</div>
            </div>
          </div>
        );

      case 'meta_mensal':
        if (isFuncionario || meta === 0) return null;
        return (
          <div key="meta_mensal" className="card" style={{gridColumn:'1 / -1'}}>
            <div className="card-header">
              <div className="card-title">🎯 Meta Mensal</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setMetaInput(meta);setShowMeta(true);}}>
                ✏️ Editar
              </button>
            </div>
            <div style={{padding:'0 6px 6px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:14,fontWeight:600,color:'var(--gray-700)'}}>
                  {fmt.currency(fat)} de {fmt.currency(meta)}
                </span>
                <span style={{fontSize:14,fontWeight:700,color:pctMeta>=100?'var(--success)':'var(--accent)'}}>
                  {pctMeta.toFixed(1)}%
                </span>
              </div>
              <div style={{height:12,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pctMeta}%`,background:pctMeta>=100?'var(--success)':'var(--accent)',borderRadius:99,transition:'width .6s ease'}} />
              </div>
              <div style={{marginTop:12,fontSize:13,color:'var(--gray-600)'}}>
                {pctMeta>=100 ? '🏆 Meta atingida! Parabéns!' : `📊 Você precisa faturar ${fmt.currency(porDia)}/dia para bater a meta`}
              </div>
            </div>
          </div>
        );

      case 'grafico_mensal':
        if (isFuncionario) return null;
        return (
          <div key="grafico_mensal" className="card">
            <div className="card-header">
              <div className="card-title">📊 Faturamento Mensal</div>
            </div>
            <BarChart data={faturamentoMensal} />
          </div>
        );

      case 'os_recentes':
        return (
          <div key="os_recentes" className="card">
            <div className="card-header">
              <div className="card-title">📋 OS Recentes</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/app/os')}>Ver todas</button>
            </div>
            {recentes.length === 0
              ? <div className="empty-state" style={{padding:32}}><div className="empty-icon">🔧</div><p>Nenhuma OS ainda</p></div>
              : recentes.map(os=>(
                <div key={os.id} className="dash-os-row">
                  <div className="dash-os-num">#{String(os.id).padStart(4,'0')}</div>
                  <div className="dash-os-info">
                    <div className="dash-os-cliente">{os.cliente_nome||'—'}</div>
                    <div className="dash-os-veiculo">{os.veiculo_modelo||'—'}{os.placa?` · ${os.placa}`:''}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                    <span className={`badge ${STATUS_CLASS[os.status]||'badge-gray'}`}>{STATUS_LABEL[os.status]||os.status}</span>
                    {!isFuncionario && (
                      <div className="dash-os-val">{fmt.currency(parseFloat(os.valor||0))}</div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        );

      case 'breakdown_mo_pecas':
        if (isFuncionario || fat === 0) return null;
        return (
          <div key="breakdown_mo_pecas" className="card">
            <div className="card-header">
              <div className="card-title">🔩 Mão de Obra vs Peças</div>
            </div>
            <div style={{padding:'10px 6px'}}>
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:13,color:'var(--gray-600)',display:'flex',alignItems:'center',gap:6}}>
                    <span style={{width:10,height:10,borderRadius:'50%',background:'var(--accent)',flexShrink:0}}/>
                    Mão de Obra
                  </span>
                  <span style={{fontSize:14,fontWeight:700,color:'var(--accent)'}}>{fmt.currency(fatMO)}</span>
                </div>
                <div style={{height:8,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pctMO}%`,background:'var(--accent)',borderRadius:99}}/>
                </div>
                <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2,textAlign:'right'}}>{pctMO}%</div>
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:13,color:'var(--gray-600)',display:'flex',alignItems:'center',gap:6}}>
                    <span style={{width:10,height:10,borderRadius:'50%',background:'var(--info)',flexShrink:0}}/>
                    Peças
                  </span>
                  <span style={{fontSize:14,fontWeight:700,color:'var(--info)'}}>{fmt.currency(fatPecas)}</span>
                </div>
                <div style={{height:8,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pctPecas}%`,background:'var(--info)',borderRadius:99}}/>
                </div>
                <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2,textAlign:'right'}}>{pctPecas}%</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div>
      {/* Header com filtros */}
      <div className="page-header" style={{marginBottom:20}}>
        <div>
          <h1 className="page-title">Dashboard Personalizável</h1>
          <p className="page-subtitle">Visualize seus dados do jeito que você prefere</p>
        </div>
        <div className="page-actions" style={{gap:10}}>
          <PeriodFilter value={period} onChange={setPeriod} />
          <button className="btn btn-outline" onClick={() => setShowCustomizer(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Personalizar
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/app/os')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova OS
          </button>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="stats-grid" style={{marginBottom:20}}>
        {layout.map(widget => renderWidget(widget.id)).filter(Boolean)}
      </div>

      {/* Botão de definir meta se não existir */}
      {!isFuncionario && meta === 0 && (
        <div style={{
          background:'linear-gradient(135deg, var(--accent-light), #fff)',
          border:'2px dashed var(--accent)',
          borderRadius:12,
          padding:20,
          textAlign:'center',
          marginBottom:20,
        }}>
          <div style={{fontSize:28,marginBottom:8}}>🎯</div>
          <div style={{fontSize:15,fontWeight:700,color:'var(--gray-800)',marginBottom:6}}>
            Defina sua meta mensal
          </div>
          <p style={{fontSize:13,color:'var(--gray-600)',marginBottom:14}}>
            Acompanhe o progresso do seu faturamento com uma meta clara
          </p>
          <button className="btn btn-primary" onClick={()=>{setMetaInput('');setShowMeta(true);}}>
            🎯 Definir Meta
          </button>
        </div>
      )}

      {/* Customizer Modal */}
      {showCustomizer && (
        <DashboardCustomizer
          layout={layout}
          onSave={handleLayoutSave}
          onClose={() => setShowCustomizer(false)}
        />
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
