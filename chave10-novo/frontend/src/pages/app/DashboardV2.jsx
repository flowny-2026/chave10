import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import WelcomeModal from '../../components/WelcomeModal';
import OnboardingTour from '../../components/OnboardingTour';
import KPICard from '../../components/KPICard';
import { useOnboarding } from '../../hooks/useOnboarding';
import '../../styles/dashboardPremium.css';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}`; },
  diasAtras: iso => { if(!iso) return 0; const diff=(new Date()-new Date(iso))/(1000*60*60*24); return Math.floor(diff); },
};

function getUser() {
  try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; }
}

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function loadMeta() {
  try { return parseFloat(localStorage.getItem('c10_meta'))||0; } catch { return 0; }
}
function saveMeta(v) { localStorage.setItem('c10_meta', v); }

// Gráfico de barras com SVG — coordenadas absolutas, sem distorção
function ModernChart({ data }) {
  const [selected, setSelected] = useState(null);
  
  if (!data?.length || data.every(d => (d.total||0) === 0))
    return <div style={{textAlign:'center',padding:'32px 0',color:'#9ca3af',fontSize:13}}>Sem dados de faturamento ainda</div>;

  const SVG_W   = 340;
  const SVG_H   = 160;
  const BAR_H   = 100; // área útil das barras
  const TOP     = 24;  // espaço acima para o valor
  const BOTTOM  = 22;  // espaço abaixo para o label do mês
  const n       = data.length;
  const colW    = SVG_W / n;
  const barW    = colW * 0.55;
  const max     = Math.max(...data.map(d => d.total||0), 1);
  const baseY   = TOP + BAR_H;

  return (
    <div style={{width:'100%',overflowX:'hidden'}}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        height={SVG_H}
        style={{display:'block'}}
      >
        <defs>
          <linearGradient id="g-orange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316"/>
            <stop offset="100%" stopColor="#fed7aa"/>
          </linearGradient>
          <linearGradient id="g-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E3A5F"/>
            <stop offset="100%" stopColor="#3b82f6"/>
          </linearGradient>
          <linearGradient id="g-blue-active" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb"/>
            <stop offset="100%" stopColor="#60a5fa"/>
          </linearGradient>
        </defs>

        {/* Linhas de grade */}
        {[0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={i}
            x1={0} y1={TOP + BAR_H * (1 - f)}
            x2={SVG_W} y2={TOP + BAR_H * (1 - f)}
            stroke={f === 1 ? '#cbd5e1' : '#f1f5f9'}
            strokeWidth={f === 1 ? 1 : 0.5}
          />
        ))}

        {data.map((item, i) => {
          const valor  = item.total || 0;
          const h      = valor > 0 ? Math.max((valor / max) * BAR_H, 4) : 0;
          const cx     = i * colW + colW / 2;
          const x      = cx - barW / 2;
          const y      = baseY - h;
          const isLast = i === n - 1;
          const isSelected = selected === i;
          const fill   = isLast ? 'url(#g-orange)' : isSelected ? 'url(#g-blue-active)' : 'url(#g-blue)';
          const tc     = isLast ? '#ea6c0a' : isSelected ? '#2563eb' : '#1E3A5F';

          return (
            <g key={i} onClick={()=>setSelected(isSelected?null:i)} style={{cursor:'pointer'}}>
              {/* Hit area invisível para facilitar o toque */}
              <rect x={i*colW} y={0} width={colW} height={SVG_H} fill="transparent"/>
              
              {/* Barra */}
              {h > 0 && (
                <rect x={x} y={y} width={barW} height={h} rx={3} fill={fill}
                  style={{transition:'all .2s',opacity:selected!==null&&!isSelected&&!isLast?0.5:1}}
                />
              )}

              {/* Valor acima */}
              {valor > 0 && (
                <text x={cx} y={y - 4} textAnchor="middle" fontSize={isSelected?10:9} fontWeight={isSelected?'800':'600'} fill={tc}>
                  {fmt.currency(valor).replace('R$ ', '')}
                </text>
              )}

              {/* Label mês */}
              <text x={cx} y={baseY + 14} textAnchor="middle" fontSize={9}
                fontWeight={isLast||isSelected ? '700' : '400'} fill={tc}>
                {item.mes}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Card de item do Painel do Dia
function PainelItem({ emoji, color, label, count, items, renderItem, onAction, actionLabel, emptyMsg }) {
  const [expanded, setExpanded] = useState(false);
  if (!count) return null;
  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid rgba(0,0,0,0.07)',
      overflow: 'hidden',
      marginBottom: 0,
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 12px',
          cursor: 'pointer',
          background: '#fff',
          borderBottom: expanded ? '1px solid rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
          <span style={{fontSize:18,flexShrink:0}}>{emoji}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'#1f2937',lineHeight:1.3}}>{label}</div>
            {!expanded && <div style={{fontSize:11,color:'#6b7280',fontWeight:700,marginTop:1}}>{count} {count===1?'item':'itens'}</div>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {onAction && (
            <button
              onClick={e=>{e.stopPropagation();onAction();}}
              style={{
                background:color,color:'#fff',border:'none',borderRadius:6,
                padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer',
                whiteSpace:'nowrap',flexShrink:0,
              }}
            >
              {actionLabel}
            </button>
          )}
          <svg style={{color:'#9ca3af',transition:'transform .2s',transform:expanded?'rotate(180deg)':'rotate(0)',flexShrink:0}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      {expanded && (
        <div style={{padding:'8px 12px 10px',background:'#f9fafb',display:'flex',flexDirection:'column',gap:6}}>
          {items.length === 0
            ? <div style={{fontSize:12,color:'#9ca3af',padding:'8px 0'}}>{emptyMsg||'Nenhum item'}</div>
            : items.map((item, i) => renderItem(item, i))
          }
        </div>
      )}
    </div>
  );
}

export default function DashboardV2() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [meta, setMetaState]      = useState(loadMeta);
  const [showMeta, setShowMeta]   = useState(false);
  const [metaInput, setMetaInput] = useState('');
  const { showWelcome, tourActive, currentStep, startTour, skipTour, nextStep, prevStep, endTour } = useOnboarding();
  const navigate = useNavigate();
  const user = getUser();
  const isFuncionario = user?.perfil === 'funcionario';
  // Usa o nome do responsável da oficina se disponível, senão o nome do usuário
  const nomeUsuario = (user?.responsavel || user?.nome)?.split(' ')[0] || 'você';

  useEffect(() => {
    api.app.dashboard().then(setData).catch(()=>setData(null)).finally(()=>setLoading(false));
  }, []);

  function handleSaveMeta() {
    const v = parseFloat(metaInput)||0;
    setMetaState(v);
    saveMeta(v);
    setShowMeta(false);
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{textAlign:'center'}}>
        <div className="spinner" style={{margin:'0 auto 16px'}}></div>
        <p style={{color:'var(--gray-400)',fontSize:14}}>Carregando...</p>
      </div>
    </div>
  );

  const stats             = data?.stats || {};
  const recentes          = data?.recentes || [];
  const faturamentoMensal = data?.faturamentoMensal || [];
  const painel            = data?.painelDoDia || {};

  const fat            = parseFloat(stats.faturamentoMes||0);
  const fatHoje        = parseFloat(stats.faturamentoHoje||0);
  const fatMO          = parseFloat(stats.moMes||0);
  const fatPecas       = parseFloat(stats.pecasMes||0);
  const pctMO          = fat>0?Math.round((fatMO/fat)*100):0;
  const pctPecas       = fat>0?Math.round((fatPecas/fat)*100):0;
  const finalizadasHoje= parseInt(stats.finalizadasHoje||0);
  const emAndamento    = parseInt(stats.emAndamento||0);
  const totalClientes  = parseInt(stats.totalClientes||0);

  // Meta
  const pctMeta      = meta>0?Math.min(100,(fat/meta)*100):0;
  const now          = new Date();
  const diasRestantes= Math.max(1,new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate());
  const faltaMeta    = Math.max(0,meta-fat);
  const porDia       = diasRestantes>0?faltaMeta/diasRestantes:0;

  // Painel do Dia — total de itens de atenção
  const osProntas          = painel.osProntas||[];
  const orcAguardando      = painel.orcamentosAguardando||[];
  const agendaHoje         = painel.agendaHoje||[];
  const agendaAmanha       = painel.agendaAmanha||[];
  const osAtrasadas        = painel.osAtrasadas||[];
  const despVencidas       = painel.despesasVencidas||[];
  const semFatHoje         = painel.semFaturamentoHoje && !isFuncionario;
  const totalAtencao       = osProntas.length + orcAguardando.length + agendaHoje.length + osAtrasadas.length + despVencidas.length;

  // Mensagem de assistente inteligente
  function getMensagemAssistente() {
    if (osAtrasadas.length > 0)      return `⚠️ ${osAtrasadas.length} OS com mais de 3 dias em aberto.`;
    if (osProntas.length > 0)        return `🚗 ${osProntas.length} veículo${osProntas.length>1?'s':''} pronto${osProntas.length>1?'s':''} para entrega.`;
    if (orcAguardando.length > 0)    return `📋 ${orcAguardando.length} orçamento${orcAguardando.length>1?'s':''} aguardando resposta.`;
    if (agendaHoje.length > 0)       return `📅 ${agendaHoje.length} cliente${agendaHoje.length>1?'s':''} agendado${agendaHoje.length>1?'s':''} para hoje.`;
    if (despVencidas.length > 0)     return `💸 ${despVencidas.length} conta${despVencidas.length>1?'s':''} vencida${despVencidas.length>1?'s':''} sem pagamento.`;
    if (semFatHoje)                  return `💡 Você ainda não registrou faturamento hoje.`;
    if (emAndamento > 0)             return `🔧 ${emAndamento} OS em andamento. Boa produção!`;
    return `✅ Tudo em ordem por aqui. Bom trabalho!`;
  }

  return (
    <div>
      {showWelcome && <WelcomeModal onStartTour={startTour} onSkip={skipTour} />}
      {tourActive && <OnboardingTour isActive={tourActive} currentStep={currentStep} onNext={nextStep} onPrev={prevStep} onEnd={endTour} />}

      {/* ── SAUDAÇÃO INTELIGENTE ────────────────────────────── */}
      <div className="dash-greeting">
        <div className="dash-greeting-left">
          <div className="dash-greeting-title">
            {saudacao()}, {nomeUsuario} 👋
          </div>
          <div className="dash-greeting-msg">{getMensagemAssistente()}</div>
        </div>
        <button className="btn btn-primary dash-nova-os-btn" onClick={() => navigate('/app/os')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova OS
        </button>
      </div>

      {/* ── PAINEL DO DIA ───────────────────────────────────── */}
      {(totalAtencao > 0 || semFatHoje) && (
        <div className="painel-do-dia">
          <div className="painel-do-dia-header">
            <div className="painel-do-dia-title">
              {totalAtencao > 0 ? '🚨' : '💡'}
              <span>Atenção hoje</span>
              {totalAtencao > 0 && <span className="painel-badge">{totalAtencao}</span>}
            </div>
          </div>
          <div style={{padding:'8px 12px 12px',display:'flex',flexDirection:'column',gap:6}}>
            <PainelItem
              emoji="🟢" color="#16a34a"
              label="Veículos prontos para entrega"
              count={osProntas.length}
              items={osProntas}
              onAction={() => navigate('/app/os')}
              actionLabel="Ver OS"
              renderItem={(os, i) => (
                <div key={i} className="painel-row">
                  <div className="painel-row-info">
                    <span className="painel-row-name">{os.cliente_nome||'—'}</span>
                    <span className="painel-row-sub">{os.veiculo_modelo||'—'}{os.placa?` · ${os.placa}`:''}</span>
                  </div>
                  <span className="painel-row-badge" style={{background:'#f0fdf4',color:'#16a34a'}}>
                    Finalizada {fmt.date(os.data)}
                  </span>
                </div>
              )}
            />
            <PainelItem
              emoji="🟠" color="#f97316"
              label="Orçamentos aguardando aprovação"
              count={orcAguardando.length}
              items={orcAguardando}
              onAction={() => navigate('/app/orcamentos')}
              actionLabel="Ver"
              renderItem={(orc, i) => (
                <div key={i} className="painel-row">
                  <span className="painel-row-name">{orc.cliente_nome||'—'}</span>
                  <span className="painel-row-badge" style={{background:'#fff7ed',color:'#f97316'}}>{fmt.currency(orc.total)}</span>
                </div>
              )}
            />
            <PainelItem
              emoji="📅" color="#0284c7"
              label="Agendamentos de hoje"
              count={agendaHoje.length}
              items={agendaHoje}
              onAction={() => navigate('/app/agenda')}
              actionLabel="Agenda"
              renderItem={(ag, i) => (
                <div key={i} className="painel-row">
                  <div className="painel-row-info">
                    <span className="painel-row-name">{ag.cliente_nome||'—'}</span>
                    <span className="painel-row-sub">{ag.descricao||''}</span>
                  </div>
                  {ag.hora && <span className="painel-row-badge" style={{background:'#f0f9ff',color:'#0284c7'}}>{ag.hora}</span>}
                </div>
              )}
            />
            <PainelItem
              emoji="🔧" color="#dc2626"
              label="OS atrasadas (+ 3 dias)"
              count={osAtrasadas.length}
              items={osAtrasadas}
              onAction={() => navigate('/app/os')}
              actionLabel="Ver OS"
              renderItem={(os, i) => (
                <div key={i} className="painel-row">
                  <div className="painel-row-info">
                    <span className="painel-row-name">{os.cliente_nome||'—'}</span>
                    <span className="painel-row-sub">{os.veiculo_modelo||'—'}</span>
                  </div>
                  <span className="painel-row-badge" style={{background:'#fef2f2',color:'#dc2626'}}>
                    {fmt.diasAtras(os.data)}d atrás
                  </span>
                </div>
              )}
            />
            {!isFuncionario && (
              <PainelItem
                emoji="💰" color="#dc2626"
                label="Contas vencidas sem pagamento"
                count={despVencidas.length}
                items={despVencidas}
                onAction={() => navigate('/app/financeiro')}
                actionLabel="Financeiro"
                renderItem={(d, i) => (
                  <div key={i} className="painel-row">
                    <span className="painel-row-name">{d.descricao}</span>
                    <span className="painel-row-badge" style={{background:'#fef2f2',color:'#dc2626'}}>{fmt.currency(d.valor)}</span>
                  </div>
                )}
              />
            )}
            {agendaAmanha.length > 0 && (
              <PainelItem
                emoji="📆" color="#7c3aed"
                label="Agendamentos amanhã"
                count={agendaAmanha.length}
                items={agendaAmanha}
                onAction={() => navigate('/app/agenda')}
                actionLabel="Ver"
                renderItem={(ag, i) => (
                  <div key={i} className="painel-row">
                    <span className="painel-row-name">{ag.cliente_nome||'—'}</span>
                    {ag.hora && <span className="painel-row-badge" style={{background:'#f5f3ff',color:'#7c3aed'}}>{ag.hora}</span>}
                  </div>
                )}
              />
            )}
            {semFatHoje && (
              <div style={{borderRadius:10,border:'1px solid rgba(0,0,0,0.07)',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'#fff',cursor:'default'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:18}}>💡</span>
                    <div style={{fontSize:13,fontWeight:600,color:'#1f2937'}}>Você ainda não registrou faturamento hoje</div>
                  </div>
                  <button
                    onClick={() => navigate('/app/os')}
                    style={{background:'#6b7280',color:'#fff',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}
                  >
                    + OS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPIs COMPACTOS ─────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {!isFuncionario && (
          <KPICard title="Faturamento" value={fmt.currency(fat)} subvalue={`Hoje: ${fmt.currency(fatHoje)}`} color="var(--accent)"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          />
        )}
        <KPICard title="OS Finalizadas" value={finalizadasHoje} subvalue="hoje" color="var(--success)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <KPICard title="Em Andamento" value={emAndamento} subvalue="OS abertas" color="var(--brand)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
        />
        <KPICard title="Clientes" value={totalClientes} subvalue="cadastrados" color="#7c3aed"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
        />
      </div>

      {/* ── META MENSAL ────────────────────────────────────── */}
      {!isFuncionario && (
        <div className="meta-progress-premium" style={{marginBottom:20}}>
          <div className="meta-header">
            <div className="meta-title"><span>🎯</span><span>Meta do mês</span></div>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setMetaInput(meta||'');setShowMeta(true);}}>
              {meta>0?'Editar':'Definir meta'}
            </button>
          </div>
          {meta>0 ? (
            <>
              <div className="meta-progress-info" style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6}}>
                <span>{fmt.currency(fat)} faturado</span>
                <span style={{fontWeight:700,color:pctMeta>=100?'var(--success)':'var(--accent)'}}>{pctMeta.toFixed(0)}%</span>
              </div>
              <div className="meta-progress-bar">
                <div className="meta-progress-fill" style={{width:`${pctMeta}%`}}/>
              </div>
              <div className="meta-progress-hint" style={{marginTop:10,fontSize:12,fontWeight:600,textAlign:'center'}}>
                {pctMeta>=100?'🎉 Meta atingida!':`Faturar ${fmt.currency(porDia)}/dia nos próximos ${diasRestantes} dias`}
              </div>
            </>
          ) : (
            <div style={{fontSize:13,color:'var(--gray-400)',textAlign:'center',padding:'8px 0'}}>
              Defina uma meta para acompanhar seu progresso
            </div>
          )}
        </div>
      )}

      {/* ── GRID: GRÁFICO + MO/PEÇAS + OS RECENTES ────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,marginBottom:24,alignItems:'start'}}>
        {!isFuncionario && (
          <div className="modern-chart-card" style={{display:'flex',flexDirection:'column'}}>
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <span style={{fontSize:14,fontWeight:700,color:'var(--gray-800)'}}>📊 Faturamento mensal</span>
              <span style={{fontSize:11,color:'#9ca3af'}}>{faturamentoMensal.length} meses</span>
            </div>

            {/* Gráfico */}
            <ModernChart data={faturamentoMensal} />

            {/* Resumo abaixo do gráfico */}
            {(() => {
              const comValor = faturamentoMensal.filter(d => (d.total||0) > 0);
              if (!comValor.length) return null;
              const melhor = comValor.reduce((a, b) => (b.total||0) > (a.total||0) ? b : a);
              const totalAcum = comValor.reduce((s, d) => s + (d.total||0), 0);
              const ultimo = faturamentoMensal[faturamentoMensal.length - 1]?.total || 0;
              const penultimo = faturamentoMensal[faturamentoMensal.length - 2]?.total || 0;
              const var_pct = penultimo > 0 ? ((ultimo - penultimo) / penultimo) * 100 : null;
              return (
                <div style={{
                  marginTop:14,
                  paddingTop:14,
                  borderTop:'1px solid #f1f5f9',
                  display:'grid',
                  gridTemplateColumns:'1fr 1fr 1fr',
                  gap:8,
                }}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:10,color:'#9ca3af',marginBottom:3,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.4px'}}>Acumulado</div>
                    <div style={{fontSize:13,fontWeight:800,color:'#1f2937'}}>{fmt.currency(totalAcum).replace('R$ ','R$')}</div>
                  </div>
                  <div style={{textAlign:'center',borderLeft:'1px solid #f1f5f9',borderRight:'1px solid #f1f5f9'}}>
                    <div style={{fontSize:10,color:'#9ca3af',marginBottom:3,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.4px'}}>Melhor mês</div>
                    <div style={{fontSize:13,fontWeight:800,color:'#1f2937'}}>{melhor.mes}</div>
                    <div style={{fontSize:10,color:'#F97316',fontWeight:600}}>{fmt.currency(melhor.total).replace('R$ ','')}</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:10,color:'#9ca3af',marginBottom:3,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.4px'}}>vs mês ant.</div>
                    {var_pct !== null ? (
                      <div style={{fontSize:13,fontWeight:800,color: var_pct >= 0 ? '#16a34a' : '#dc2626'}}>
                        {var_pct >= 0 ? '↗' : '↘'} {Math.abs(var_pct).toFixed(0)}%
                      </div>
                    ) : (
                      <div style={{fontSize:12,color:'#9ca3af'}}>—</div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {!isFuncionario && fat > 0 && (
          <div className="modern-chart-card">
            <div style={{marginBottom:12}}>
              <span style={{fontSize:14,fontWeight:700,color:'var(--gray-800)'}}>🔩 MO vs Peças</span>
            </div>
            <div style={{marginBottom:12,textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:800,color:'var(--gray-900)',fontFamily:'Poppins'}}>{fmt.currency(fat)}</div>
              <div style={{fontSize:11,color:'var(--gray-400)'}}>total do mês</div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                <span style={{color:'var(--accent)',fontWeight:600}}>● Mão de obra</span>
                <span style={{fontWeight:700,color:'var(--accent)'}}>{fmt.currency(fatMO)}</span>
              </div>
              <div style={{height:8,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pctMO}%`,background:'var(--accent)',borderRadius:99}}/>
              </div>
            </div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                <span style={{color:'var(--info)',fontWeight:600}}>● Peças</span>
                <span style={{fontWeight:700,color:'var(--info)'}}>{fmt.currency(fatPecas)}</span>
              </div>
              <div style={{height:8,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pctPecas}%`,background:'var(--info)',borderRadius:99}}/>
              </div>
            </div>
          </div>
        )}

        <div className="activity-feed">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--gray-800)'}}>📋 OS recentes</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/app/os')}>Ver todas</button>
          </div>
          {recentes.length===0 ? (
            <div style={{textAlign:'center',padding:24,color:'var(--gray-400)'}}>
              <div style={{fontSize:28,marginBottom:8}}>🔧</div>
              <p style={{fontSize:13}}>Nenhuma OS ainda</p>
              <button className="btn btn-primary btn-sm" style={{marginTop:12}} onClick={()=>navigate('/app/os')}>Criar primeira OS</button>
            </div>
          ) : recentes.slice(0,5).map(os => (
            <div key={os.id} className="activity-item">
              <div className="activity-icon" style={{background:'var(--brand-light)',color:'var(--brand)'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </div>
              <div className="activity-content">
                <div className="activity-title">OS #{String(os.id).padStart(4,'0')} · {os.cliente_nome||'—'}</div>
                <div className="activity-desc">{os.veiculo_modelo||'—'}{os.placa?` · ${os.placa}`:''}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                <span className={`badge ${os.status==='finalizado'?'badge-green':'badge-orange'}`} style={{fontSize:9}}>
                  {os.status==='finalizado'?'Finalizado':'Em andamento'}
                </span>
                {!isFuncionario && <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)'}}>{fmt.currency(parseFloat(os.valor||0))}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL META ─────────────────────────────────────── */}
      {showMeta && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:380}}>
            <div className="modal-header">
              <h2>🎯 Meta mensal</h2>
              <button className="modal-close" onClick={()=>setShowMeta(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:13,color:'var(--gray-500)',marginBottom:16}}>Defina quanto sua oficina precisa faturar este mês.</p>
              <div className="form-group" style={{marginBottom:16}}>
                <label>Meta de faturamento (R$)</label>
                <input type="number" step="100" min="0" value={metaInput} onChange={e=>setMetaInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSaveMeta()} placeholder="Ex: 30000" style={{fontSize:18,fontWeight:700,padding:'12px 16px'}} autoFocus />
              </div>
              <div className="form-actions">
                <button className="btn btn-outline" onClick={()=>setShowMeta(false)}>Cancelar</button>
                {meta>0 && <button className="btn btn-ghost" style={{color:'var(--danger)'}} onClick={()=>{setMetaState(0);saveMeta(0);setShowMeta(false);}}>Remover</button>}
                <button className="btn btn-primary" onClick={handleSaveMeta}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
