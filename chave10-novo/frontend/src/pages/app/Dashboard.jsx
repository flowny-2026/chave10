import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
};

function getUser() {
  try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; }
}

function BarChart({ data }) {
  if (!data?.length || data.every(d => d.total === 0))
    return <div className="empty-state" style={{padding:24}}><p>Sem dados</p></div>;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120,marginTop:12,overflowX:'auto'}}>
      {data.map((d,i) => (
        <div key={i} style={{flex:1,minWidth:32,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
          <div style={{fontSize:9,color:'var(--gray-400)'}}>{d.total>0?fmt.currency(d.total).replace('R$ ',''):''}</div>
          <div style={{width:'100%',background:'var(--accent)',borderRadius:4,height:Math.max((d.total/max)*90,d.total>0?4:0),opacity:.85}} />
          <div style={{fontSize:9,color:'var(--gray-400)'}}>{d.mes}</div>
        </div>
      ))}
    </div>
  );
}

const STATUS_CLASS = { em_andamento:'badge-orange', finalizado:'badge-green' };
const STATUS_LABEL = { em_andamento:'Em andamento', finalizado:'Finalizado' };

export default function AppDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(() => { try { return parseFloat(localStorage.getItem('c10_meta'))||0; } catch { return 0; } });
  const [showMeta, setShowMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.app.dashboard().then(setData).catch(()=>setData(null)).finally(()=>setLoading(false));
  }, []);

  function saveMeta() {
    const v = parseFloat(metaInput)||0;
    setMeta(v);
    localStorage.setItem('c10_meta', v);
    setShowMeta(false);
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

  // Verificar status da assinatura
  const user = getUser();
  const dataVenc = user?.data_vencimento;
  const statusAssinatura = user?.status_assinatura;
  
  let diasRestantesAssinatura = null;
  let mostrarAviso = false;
  let avisoTipo = 'warning'; // warning, danger, critical
  let avisoMensagem = '';
  
  if (dataVenc && statusAssinatura !== 'blocked') {
    const hoje = new Date();
    const vencimento = new Date(dataVenc);
    diasRestantesAssinatura = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    
    if (statusAssinatura === 'overdue') {
      mostrarAviso = true;
      avisoTipo = 'critical';
      avisoMensagem = '⚠️ Sua assinatura está vencida! Regularize agora para não perder o acesso.';
    } else if (diasRestantesAssinatura <= 3 && diasRestantesAssinatura > 0) {
      mostrarAviso = true;
      avisoTipo = 'warning';
      avisoMensagem = `⏰ Sua assinatura vence em ${diasRestantesAssinatura} dia${diasRestantesAssinatura > 1 ? 's' : ''}. Renove agora!`;
    } else if (diasRestantesAssinatura === 0) {
      mostrarAviso = true;
      avisoTipo = 'danger';
      avisoMensagem = '⚠️ Sua assinatura vence hoje! Renove agora para não perder o acesso.';
    }
  }

  return (
    <div>
      {/* BANNER DE AVISO */}
      {mostrarAviso && (
        <div style={{
          background: avisoTipo === 'critical' ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : avisoTipo === 'danger' ? 'linear-gradient(135deg, #ea580c, #c2410c)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
          borderRadius: 'var(--r-lg)',
          padding: '18px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          boxShadow: '0 4px 20px rgba(0,0,0,.15)',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              {avisoMensagem}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
              Acesse a página de planos para renovar sua assinatura e continuar usando o sistema.
            </div>
          </div>
          <button 
            onClick={() => navigate('/app/planos')} 
            style={{
              background: '#fff',
              color: avisoTipo === 'critical' ? '#dc2626' : avisoTipo === 'danger' ? '#ea580c' : '#f59e0b',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              padding: '11px 22px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,.15)',
              transition: 'transform .15s',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.target.style.transform = 'translateY(0)'}
          >
            💳 Ver Planos
          </button>
        </div>
      )}
      
      {/* HERO */}
      {!isFuncionario && (
      <div style={{background:'linear-gradient(135deg,var(--brand) 0%,var(--brand-mid) 100%)',borderRadius:'var(--r-lg)',padding:'28px 32px',marginBottom:24,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 80% 50%,rgba(249,115,22,.18),transparent 60%)',pointerEvents:'none'}} />
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20,position:'relative',zIndex:1}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:6}}>Faturamento do mês</div>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:38,fontWeight:800,color:'#fff',lineHeight:1,marginBottom:8}}>{fmt.currency(fat)}</div>

            {/* Breakdown MO vs Peças */}
            {fat > 0 && (
              <div style={{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:'#F97316',flexShrink:0}}/>
                  <span style={{fontSize:12,color:'rgba(255,255,255,.7)'}}>
                    Mão de obra: <strong style={{color:'#fff'}}>{fmt.currency(fatMO)}</strong>
                    <span style={{color:'rgba(255,255,255,.45)',marginLeft:4}}>({pctMO}%)</span>
                  </span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:'#60a5fa',flexShrink:0}}/>
                  <span style={{fontSize:12,color:'rgba(255,255,255,.7)'}}>
                    Peças: <strong style={{color:'#fff'}}>{fmt.currency(fatPecas)}</strong>
                    <span style={{color:'rgba(255,255,255,.45)',marginLeft:4}}>({pctPecas}%)</span>
                  </span>
                </div>
              </div>
            )}

            <div style={{fontSize:13,color:'rgba(255,255,255,.6)',marginBottom:meta>0?14:4}}>
              {stats.finalizadasHoje||0} OS finalizada(s) hoje · {stats.emAndamento||0} em andamento
            </div>
            {meta > 0 ? (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Meta: {fmt.currency(meta)}</span>
                  <span style={{fontSize:12,fontWeight:700,color:pctMeta>=100?'#4ade80':'rgba(255,255,255,.8)'}}>{pctMeta.toFixed(1)}%</span>
                </div>
                <div style={{height:6,background:'rgba(255,255,255,.15)',borderRadius:99,overflow:'hidden',width:320,maxWidth:'100%'}}>
                  <div style={{height:'100%',width:`${pctMeta}%`,background:pctMeta>=100?'#4ade80':'var(--accent)',borderRadius:99}} />
                </div>
                <div style={{marginTop:8,fontSize:13,color:'rgba(255,255,255,.7)'}}>
                  {pctMeta>=100 ? '🏆 Meta atingida! Parabéns!' : `Hoje você precisa faturar ${fmt.currency(porDia)} para bater a meta`}
                </div>
              </div>
            ) : (
              <button onClick={()=>{setMetaInput('');setShowMeta(true);}} style={{background:'rgba(255,255,255,.12)',color:'#fff',border:'1px solid rgba(255,255,255,.2)',borderRadius:'var(--r-sm)',padding:'6px 14px',fontSize:13,cursor:'pointer'}}>
                🎯 Definir meta mensal
              </button>
            )}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'flex-end'}}>
            <button className="btn btn-primary" onClick={()=>navigate('/app/os')} style={{fontSize:15,padding:'14px 22px',boxShadow:'0 4px 20px rgba(249,115,22,.5)'}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Nova Ordem de Serviço
            </button>
            <div style={{display:'flex',gap:8}}>
              {[{label:'OS abertas',val:stats.emAndamento||0,color:(stats.emAndamento||0)>0?'#fbbf24':'#fff'},{label:'Clientes',val:stats.totalClientes||0,color:'#fff'}].map(item=>(
                <div key={item.label} style={{background:'rgba(255,255,255,.1)',borderRadius:'var(--r-sm)',padding:'10px 14px',textAlign:'center',minWidth:80}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.45)',marginBottom:3,textTransform:'uppercase',letterSpacing:'.5px'}}>{item.label}</div>
                  <div style={{fontSize:15,fontWeight:800,color:item.color}}>{item.val}</div>
                </div>
              ))}
              {meta > 0 && (
                <button onClick={()=>{setMetaInput(meta);setShowMeta(true);}} style={{background:'rgba(255,255,255,.1)',borderRadius:'var(--r-sm)',padding:'10px 14px',textAlign:'center',minWidth:80,border:'none',cursor:'pointer',color:'#fff'}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.45)',marginBottom:3,textTransform:'uppercase',letterSpacing:'.5px'}}>Meta</div>
                  <div style={{fontSize:12,fontWeight:700}}>✏️ Editar</div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* KPI CARDS */}
      <div className="stats-grid" style={{marginBottom:24}}>
        {!isFuncionario && (
        <div className="stat-card c-orange">
          <div className="stat-icon c-orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div style={{flex:1,minWidth:0}}>
            <div className="stat-value" style={{fontSize:17}}>{fmt.currency(fat)}</div>
            <div className="stat-label">Faturamento total</div>
            {fat > 0 && (
              <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:3}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:'var(--gray-400)'}}>🔧 Mão de obra</span>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--accent)'}}>{fmt.currency(fatMO)}</span>
                </div>
                <div style={{height:4,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pctMO}%`,background:'var(--accent)',borderRadius:99}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:'var(--gray-400)'}}>🔩 Peças</span>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--info)'}}>{fmt.currency(fatPecas)}</span>
                </div>
                <div style={{height:4,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pctPecas}%`,background:'var(--info)',borderRadius:99}}/>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
        <div className="stat-card c-green">
          <div className="stat-icon c-green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div><div className="stat-value">{stats.finalizadasHoje||0}</div><div className="stat-label">Finalizadas hoje</div></div>
        </div>
        <div className="stat-card c-blue">
          <div className="stat-icon c-blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
          <div><div className="stat-value">{stats.emAndamento||0}</div><div className="stat-label">OS em andamento</div></div>
        </div>
        <div className="stat-card c-purple">
          <div className="stat-icon c-purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div><div className="stat-value">{stats.totalClientes||0}</div><div className="stat-label">Total de clientes</div></div>
        </div>
      </div>

      {/* GRÁFICO + OS RECENTES */}
      <div style={{display:'grid',gridTemplateColumns: isFuncionario ? '1fr' : '1fr 1fr',gap:20,marginBottom:20}}>
        {!isFuncionario && (
        <div className="card">
          <div className="card-header"><div className="card-title">📈 Faturamento mensal</div></div>
          <BarChart data={faturamentoMensal} />
        </div>
        )}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔧 OS recentes</div>
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
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--gray-800)'}}>{fmt.currency(parseFloat(os.valor||0))}</div>
                      {parseFloat(os.valor_mo||0) > 0 && (
                        <div style={{fontSize:11,color:'var(--accent)',fontWeight:600}}>
                          🔧 MO: {fmt.currency(os.valor_mo)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* MODAL META */}
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
