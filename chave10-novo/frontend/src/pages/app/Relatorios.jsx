import { useEffect, useState } from 'react';
import { api } from '../../api';
import KPICard from '../../components/KPICard';
import { exportRelatorioFinanceiro, exportWithFeedback } from '../../utils/pdfExporter';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
};

const CATS = { 'Troca de óleo':0,'Freios':0,'Suspensão':0,'Elétrica':0,'Revisão':0,'Outros':0 };
const CAT_COLORS = ['#F97316','#1E3A5F','#16a34a','#dc2626','#7c3aed','#9CA3AF'];

function buildCategorias(ordens) {
  const cat = {...CATS};
  ordens.forEach(o => {
    const s = (o.servicos||'').toLowerCase();
    const v = parseFloat(o.valor_mo||0)+parseFloat(o.valor_pecas||0)||parseFloat(o.valor||0);
    if (s.includes('óleo')||s.includes('oleo')) cat['Troca de óleo']+=v;
    else if (s.includes('freio')||s.includes('pastilha')) cat['Freios']+=v;
    else if (s.includes('suspensão')||s.includes('amortecedor')) cat['Suspensão']+=v;
    else if (s.includes('elétric')||s.includes('bateria')) cat['Elétrica']+=v;
    else if (s.includes('revisão')||s.includes('correia')) cat['Revisão']+=v;
    else cat['Outros']+=v;
  });
  return cat;
}

export default function AppRelatorios() {
  const [ordens, setOrdens]     = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([api.app.os.list(), api.app.clientes.list()])
      .then(([o,c])=>{ setOrdens(o); setClientes(c); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--gray-400)'}}>Carregando...</div>;

  const finalizadas = ordens.filter(o=>o.status==='finalizado');
  const totalFat = finalizadas.reduce((s,o)=>s+parseFloat(o.valor_mo||0)+parseFloat(o.valor_pecas||0)||parseFloat(o.valor||0),0);
  const ticketMedio = finalizadas.length ? totalFat/finalizadas.length : 0;

  // Top serviços
  const svcMap = {};
  finalizadas.forEach(o=>{
    const servs = (o.servicos||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    servs.forEach(s=>{
      const k = s.toLowerCase().substring(0,30);
      if (!svcMap[k]) svcMap[k]={nome:s,qtd:0,fat:0};
      svcMap[k].qtd++;
      svcMap[k].fat+=(parseFloat(o.valor_mo||0)+parseFloat(o.valor_pecas||0)||parseFloat(o.valor||0))/Math.max(1,servs.length);
    });
  });
  const topSvc = Object.values(svcMap).sort((a,b)=>b.qtd-a.qtd).slice(0,5);
  const maxQtd = topSvc[0]?.qtd||1;

  // Categorias para pizza
  const cats = buildCategorias(finalizadas);
  const catEntries = Object.entries(cats).filter(([,v])=>v>0);
  const totalCat = catEntries.reduce((s,[,v])=>s+v,0);

  // Prepara dados para export PDF
  function handleExportPDF() {
    const pdfData = {
      totalFaturamento: totalFat,
      totalServicos: finalizadas.length,
      ticketMedio,
      totalClientes: clientes.length,
      topServicos: topSvc,
      categorias: catEntries.map(([nome, valor]) => ({ nome, valor })),
    };
    
    exportWithFeedback(exportRelatorioFinanceiro, pdfData);
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Relatórios</div><div className="page-subtitle">Visão geral do desempenho da oficina</div></div>
        <div className="page-actions" style={{gap:8}}>
          <button className="btn btn-primary" onClick={handleExportPDF}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar PDF
          </button>
          <button className="btn btn-outline" onClick={()=>window.print()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:24}}>
        <KPICard
          title="Faturamento Total"
          value={fmt.currency(totalFat)}
          color="var(--accent)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <KPICard
          title="Serviços Realizados"
          value={finalizadas.length}
          color="var(--brand)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <KPICard
          title="Ticket Médio"
          value={fmt.currency(ticketMedio)}
          color="var(--success)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <KPICard
          title="Clientes Cadastrados"
          value={clientes.length}
          color="#7c3aed"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
        />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="card">
          <div className="card-header"><div className="card-title">Top 5 serviços mais realizados</div></div>
          {topSvc.length ? topSvc.map((s,i)=>(
            <div key={i} className="top-item">
              <div className="top-rank">{i+1}</div>
              <div className="top-info">
                <div className="top-name">{s.nome}</div>
                <div className="top-bar-wrap"><div className="top-bar" style={{width:`${(s.qtd/maxQtd*100).toFixed(0)}%`}} /></div>
              </div>
              <div className="top-stats">
                <div className="top-qtd">{s.qtd}x</div>
                <div className="top-fat">{fmt.currency(s.fat)}</div>
              </div>
            </div>
          )) : <div className="empty-state" style={{padding:32}}><div className="empty-icon">📊</div><p>Sem dados ainda</p></div>}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Distribuição de receita</div></div>
          {catEntries.length ? (
            <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
              {catEntries.sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>{
                const pct = totalCat>0?(val/totalCat*100).toFixed(1):0;
                return (
                  <div key={cat}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--gray-700)',display:'flex',alignItems:'center',gap:6}}>
                        <span style={{width:10,height:10,borderRadius:2,background:CAT_COLORS[i%CAT_COLORS.length],display:'inline-block'}} />
                        {cat}
                      </span>
                      <span style={{fontSize:13,fontWeight:700,color:'var(--gray-800)'}}>{fmt.currency(val)} <span style={{color:'var(--gray-400)',fontWeight:400,fontSize:11}}>({pct}%)</span></span>
                    </div>
                    <div style={{height:6,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:CAT_COLORS[i%CAT_COLORS.length],borderRadius:99}} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="empty-state" style={{padding:32}}><div className="empty-icon">🥧</div><p>Sem dados ainda</p></div>}
        </div>
      </div>
    </div>
  );
}
