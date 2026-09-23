import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import WelcomeModal from '../../components/WelcomeModal';
import OnboardingTour from '../../components/OnboardingTour';
import KPICard from '../../components/KPICard';
import { useOnboarding } from '../../hooks/useOnboarding';
import '../../styles/dashboardPremium.css';
import { useSegmento } from '../../hooks/useSegmento';
import PeriodFilter from '../../components/PeriodFilter';
import {
  StatCard, GraficoFaturamento, GraficoOSStatus, GraficoReceitasDespesas,
  TopClientes, UltimasOS, ResumoLinha,
} from '../../components/DashboardWidgets';

// Período inicial: mês corrente
function periodoInicial() {
  const now = new Date();
  const iso = d => d.toISOString().split('T')[0];
  return {
    preset: 'thisMonth',
    start: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: iso(now),
  };
}

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

// A meta é sincronizada no backend (por oficina). Mantemos o localStorage
// apenas como cache local para exibir imediatamente enquanto o backend responde.
function loadMetaCache() {
  try { return parseFloat(localStorage.getItem('c10_meta'))||0; } catch { return 0; }
}
function cacheMeta(v) { try { localStorage.setItem('c10_meta', v); } catch {} }

// Card de item do Painel do Dia
// Usa classes CSS reais (.painel-item*) em vez de estilos inline, garantindo
// que o tema (claro/escuro) seja aplicado corretamente via CSS.
function PainelItem({ color, label, count, items, renderItem, onAction, actionLabel, emptyMsg }) {
  const [expanded, setExpanded] = useState(false);
  if (!count) return null;
  return (
    <div className="painel-item">
      <div className="painel-item-header" onClick={() => setExpanded(e => !e)}>
        <div className="painel-item-left">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
          <div>
            <div className="painel-item-label">{label}</div>
            {!expanded && <div className="painel-item-count">{count} {count===1?'item':'itens'}</div>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {onAction && (
            <button
              className="painel-item-action"
              style={{ '--pi-color': color, background: color }}
              onClick={e=>{e.stopPropagation();onAction();}}
            >
              {actionLabel}
            </button>
          )}
          <svg className="painel-item-chevron" style={{color:'#9ca3af',transition:'transform .2s',transform:expanded?'rotate(180deg)':'rotate(0)',flexShrink:0}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      {expanded && (
        <div className="painel-item-body">
          {items.length === 0
            ? <div className="painel-item-empty">{emptyMsg||'Nenhum item'}</div>
            : items.map((item, i) => renderItem(item, i))
          }
        </div>
      )}
    </div>
  );
}

export default function DashboardV2() {
  const t = useSegmento();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [meta, setMetaState]      = useState(loadMetaCache);
  const [showMeta, setShowMeta]   = useState(false);
  const [metaInput, setMetaInput] = useState('');
  const { showWelcome, tourActive, currentStep, startTour, skipTour, nextStep, prevStep, endTour } = useOnboarding();
  const navigate = useNavigate();
  const user = getUser();
  const isFuncionario = user?.perfil === 'funcionario' || user?.perfil === 'mecanico';
  // Usa o nome do responsável da oficina se disponível, senão o nome do usuário
  const nomeUsuario = (user?.responsavel || user?.nome)?.split(' ')[0] || 'você';

  useEffect(() => {
    api.app.dashboard().then(setData).catch(()=>setData(null)).finally(()=>setLoading(false));
  }, []);

  // Carrega a meta salva no backend (sincroniza entre dispositivos).
  // Funcionários não têm acesso ao endpoint, então mantêm só o cache local.
  useEffect(() => {
    if (isFuncionario) return;
    api.app.meta.get()
      .then(r => {
        const v = parseFloat(r?.meta_mensal) || 0;
        setMetaState(v);
        cacheMeta(v);
      })
      .catch(() => {}); // mantém o cache local em caso de falha
  }, [isFuncionario]);

  // ── Novo painel analítico (cards + gráficos por período) ──
  const [periodo, setPeriodo]       = useState(periodoInicial);
  const [resumo, setResumo]         = useState(null);
  const [resumoLoading, setResumoLoading] = useState(true);
  const [resumoErro, setResumoErro] = useState(false);

  const carregarResumo = useCallback((p) => {
    setResumoLoading(true);
    setResumoErro(false);
    api.app.dashboardResumo(p.start, p.end)
      .then(setResumo)
      .catch(() => { setResumo(null); setResumoErro(true); })
      .finally(() => setResumoLoading(false));
  }, []);

  useEffect(() => {
    // Só carrega para perfis com acesso financeiro (backend também bloqueia)
    if (isFuncionario) { setResumoLoading(false); return; }
    carregarResumo(periodo);
  }, [periodo, carregarResumo, isFuncionario]);

  async function persistMeta(v) {
    setMetaState(v);       // atualização otimista da UI
    cacheMeta(v);
    try {
      await api.app.meta.save(v);
    } catch {
      // Se falhar no servidor, a meta ainda fica no cache local deste device.
    }
  }

  function handleSaveMeta() {
    const v = parseFloat(metaInput)||0;
    persistMeta(v);
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
  const painel            = data?.painelDoDia || {};

  const fat            = parseFloat(stats.faturamentoMes||0);
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
  const lembretesVencendo  = painel.lembretesVencendo||[];
  const semFatHoje         = painel.semFaturamentoHoje && !isFuncionario;
  const totalAtencao       = osProntas.length + orcAguardando.length + agendaHoje.length + osAtrasadas.length + despVencidas.length + lembretesVencendo.length;

  // Mensagem de assistente inteligente
  function getMensagemAssistente() {
    if (osAtrasadas.length > 0)      return `${osAtrasadas.length} OS com mais de 3 dias em aberto.`;
    if (osProntas.length > 0)        return `${osProntas.length} veículo${osProntas.length>1?'s':''} pronto${osProntas.length>1?'s':''} para entrega.`;
    if (orcAguardando.length > 0)    return `${orcAguardando.length} orçamento${orcAguardando.length>1?'s':''} aguardando resposta.`;
    if (agendaHoje.length > 0)       return `${agendaHoje.length} cliente${agendaHoje.length>1?'s':''} agendado${agendaHoje.length>1?'s':''} para hoje.`;
    if (despVencidas.length > 0)     return `${despVencidas.length} conta${despVencidas.length>1?'s':''} vencida${despVencidas.length>1?'s':''} sem pagamento.`;
    if (lembretesVencendo.length > 0) return `${lembretesVencendo.length} lembrete${lembretesVencendo.length>1?'s':''} de manutenção vencendo. Contate o cliente!`;
    if (semFatHoje)                  return `Você ainda não registrou faturamento hoje.`;
    if (emAndamento > 0)             return `${emAndamento} OS em andamento. Boa produção!`;
    return `Tudo em ordem por aqui. Bom trabalho!`;
  }

  return (
    <div>
      {showWelcome && <WelcomeModal onStartTour={startTour} onSkip={skipTour} />}
      {tourActive && <OnboardingTour isActive={tourActive} currentStep={currentStep} onNext={nextStep} onPrev={prevStep} onEnd={endTour} />}

      {/* ── SAUDAÇÃO INTELIGENTE ────────────────────────────── */}
      <div className="dash-greeting">
        <div className="dash-greeting-left">
          <div className="dash-greeting-title">
            {saudacao()}, {nomeUsuario}
          </div>
          <div className="dash-greeting-msg">{getMensagemAssistente()}</div>
        </div>
        <button className="btn btn-primary dash-nova-os-btn" onClick={() => navigate('/app/os')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t.novaOs}
        </button>
      </div>

      {/* ── PAINEL DO DIA ───────────────────────────────────── */}
      {(totalAtencao > 0 || semFatHoje) && (
        <div className="painel-do-dia">
          <div className="painel-do-dia-header">
            <div className="painel-do-dia-title">
              <span>Atenção hoje</span>
              {totalAtencao > 0 && <span className="painel-badge">{totalAtencao}</span>}
            </div>
          </div>
          <div style={{padding:'8px 12px 12px',display:'flex',flexDirection:'column',gap:6}}>
            <PainelItem
              color="#16a34a"
            label={`${t.veiculos} prontos para entrega`}
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
              color="#f97316"
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
              color="#0284c7"
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
              color="#dc2626"
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
                color="#dc2626"
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
            <PainelItem
              color="#0891b2"
              label="Lembretes de manutenção vencendo"
              count={lembretesVencendo.length}
              items={lembretesVencendo}
              onAction={() => navigate('/app/lembretes')}
              actionLabel="Ver"
              renderItem={(lem, i) => (
                <div key={i} className="painel-row">
                  <div className="painel-row-info">
                    <span className="painel-row-name">{lem.cliente_nome || lem.descricao}</span>
                    <span className="painel-row-sub">
                      {[lem.veiculo_marca, lem.veiculo_modelo].filter(Boolean).join(' ')}
                      {lem.placa ? ` · ${lem.placa}` : ''}
                    </span>
                  </div>
                  <span className="painel-row-badge" style={{background:'#ecfeff',color:'#0891b2'}}>
                    {lem.data_previsao ? fmt.date(lem.data_previsao) : '—'}
                  </span>
                </div>
              )}
            />
            {agendaAmanha.length > 0 && (
              <PainelItem
                color="#7c3aed"
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
              <div className="painel-item">
                <div className="painel-item-header" style={{cursor:'default'}}>
                  <div className="painel-item-left">
                    <div className="painel-item-label">Você ainda não registrou faturamento hoje</div>
                  </div>
                  <button
                    className="painel-item-action"
                    style={{ '--pi-color': '#6b7280', background: '#6b7280' }}
                    onClick={() => navigate('/app/os')}
                  >
                    + OS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ PAINEL ANALÍTICO (cards + gráficos por período) ═══ */}
      {!isFuncionario && (
        <>
          <div className="dw-header">
            <div className="dw-header-titulo">Visão geral</div>
            <PeriodFilter value={periodo} onChange={setPeriodo} />
          </div>

          {resumoErro ? (
            <div className="dw-card"><div className="dw-vazio">Não foi possível carregar os indicadores. Tente novamente.</div></div>
          ) : resumoLoading ? (
            <div className="dw-card"><div className="dw-vazio"><div className="spinner" /></div></div>
          ) : resumo ? (
            <>
              {/* Cards de indicadores */}
              <div className="dw-stats-grid">
                <StatCard titulo="Faturamento" valor={resumo.cards.faturamento.valor} moeda variacao={resumo.cards.faturamento.variacao} cor="var(--blue, #3b82f6)" />
                <StatCard titulo="Despesas" valor={resumo.cards.despesas.valor} moeda variacao={resumo.cards.despesas.variacao} cor="var(--accent)" invertido />
                <StatCard titulo="Lucro" valor={resumo.cards.lucro.valor} moeda variacao={resumo.cards.lucro.variacao} cor="var(--success)" />
                <StatCard titulo="OS em andamento" valor={resumo.cards.osEmAndamento.valor} cor="#3b82f6" />
                <StatCard titulo="OS concluídas" valor={resumo.cards.osConcluidas.valor} variacao={resumo.cards.osConcluidas.variacao} cor="var(--success)" />
                <StatCard titulo="Orçamentos pendentes" valor={resumo.cards.orcamentosPendentes.valor} cor="var(--accent)" />
              </div>

              {/* Linha 1: Faturamento x Despesas | OS por status | Top clientes */}
              <div className="dw-grid">
                <div className="dw-card">
                  <div className="dw-card-head"><div className="dw-card-titulo">Faturamento e Despesas</div></div>
                  <div className="dw-card-sub">Evolução no período ({resumo.periodo.agrupamento === 'diario' ? 'diária' : 'mensal'})</div>
                  <GraficoFaturamento serie={resumo.serie} />
                </div>
                <div className="dw-card">
                  <div className="dw-card-head"><div className="dw-card-titulo">Status das OS</div></div>
                  <div className="dw-card-sub">Quantidade por status</div>
                  <GraficoOSStatus dados={resumo.osPorStatus} />
                </div>
                <div className="dw-card">
                  <div className="dw-card-head">
                    <div className="dw-card-titulo">Top clientes</div>
                    <button className="dw-card-link" onClick={() => navigate('/app/clientes')}>Ver todos</button>
                  </div>
                  <div className="dw-card-sub">Por faturamento no período</div>
                  <TopClientes clientes={resumo.topClientes} />
                </div>
              </div>

              {/* Linha 2: Receitas x Despesas | Últimas OS | Resumo */}
              <div className="dw-grid-2">
                <div className="dw-card">
                  <div className="dw-card-head"><div className="dw-card-titulo">Receitas x Despesas</div></div>
                  <div className="dw-card-sub">Comparativo por período</div>
                  <GraficoReceitasDespesas serie={resumo.serie} />
                </div>
                <div className="dw-card">
                  <div className="dw-card-head">
                    <div className="dw-card-titulo">Últimas OS</div>
                    <button className="dw-card-link" onClick={() => navigate('/app/os')}>Ver todas</button>
                  </div>
                  <UltimasOS lista={resumo.ultimasOS} />
                </div>
                <div className="dw-card">
                  <div className="dw-card-head"><div className="dw-card-titulo">Resumo do período</div></div>
                  <div className="dw-card-sub">&nbsp;</div>
                  <ResumoLinha label="Serviços (mão de obra)" valor={resumo.resumo.servicos} />
                  <ResumoLinha label={`${t.pecas} vendidas`} valor={resumo.resumo.pecas} />
                  <ResumoLinha label="Total de receitas" valor={resumo.resumo.receitas} />
                  <ResumoLinha label="Total de despesas" valor={resumo.resumo.despesas} />
                  <ResumoLinha label="Lucro do período" valor={resumo.resumo.lucro} destaque />
                </div>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* ── KPIs COMPACTOS (apenas funcionários — não veem o painel analítico) ── */}
      {isFuncionario && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
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
      )}

      {/* ── META MENSAL ────────────────────────────────────── */}
      {!isFuncionario && (
        <div className="meta-progress-premium" style={{marginBottom:20}}>
          <div className="meta-header">
            <div className="meta-title"><span>Meta do mês</span></div>
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
                {pctMeta>=100?'Meta atingida!':`Faturar ${fmt.currency(porDia)}/dia nos próximos ${diasRestantes} dias`}
              </div>
            </>
          ) : (
            <div style={{fontSize:13,color:'var(--gray-400)',textAlign:'center',padding:'8px 0'}}>
              Defina uma meta para acompanhar seu progresso
            </div>
          )}
        </div>
      )}

      {/* ── OS RECENTES (apenas funcionários — não veem o painel analítico) ── */}
      {isFuncionario && (
        <div className="activity-feed" style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--gray-800)'}}>OS recentes</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/app/os')}>Ver todas</button>
          </div>
          {recentes.length===0 ? (
            <div style={{textAlign:'center',padding:24,color:'var(--gray-400)'}}>
              <p style={{fontSize:13}}>Nenhuma OS ainda</p>
              <button className="btn btn-primary btn-sm" style={{marginTop:12}} onClick={()=>navigate('/app/os')}>Criar primeira OS</button>
            </div>
          ) : recentes.slice(0,5).map(os => (
            <div key={os.id} className="activity-item">
              <div className="activity-icon">
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL META ─────────────────────────────────────── */}
      {showMeta && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:380}}>
            <div className="modal-header">
              <h2>Meta mensal</h2>
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
                {meta>0 && <button className="btn btn-ghost" style={{color:'var(--danger)'}} onClick={()=>{persistMeta(0);setShowMeta(false);}}>Remover</button>}
                <button className="btn btn-primary" onClick={handleSaveMeta}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
