import { useEffect, useState } from 'react';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};
const CATEGORIAS = ['Aluguel','Energia','Água','Internet','Folha de pagamento','Peças/Estoque','Ferramentas','Boleto/Financiamento','Impostos','Marketing','Combustível','Manutenção','Outros'];
const CAT_ICONS = {'Aluguel':'🏠','Energia':'⚡','Água':'💧','Internet':'🌐','Folha de pagamento':'👥','Peças/Estoque':'🔩','Ferramentas':'🔧','Boleto/Financiamento':'📄','Impostos':'🏛️','Marketing':'📣','Combustível':'⛽','Manutenção':'🛠️','Outros':'📦'};
const EMPTY_DESP = { descricao:'', categoria:'Outros', valor:'', data:new Date().toISOString().split('T')[0], vencimento:'', pago:false, obs:'' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

export default function AppFinanceiro() {
  const hoje = new Date();
  const [mesIdx, setMesIdx] = useState(0); // 0 = mês atual
  const [ordens, setOrdens]     = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [pagamentosOS, setPagamentosOS] = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY_DESP);
  const [editing, setEditing]   = useState(null);
  const [toast, setToast]       = useState({msg:'',type:''});

  function showToast(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:''}),3000); }

  // Calcula início/fim do mês selecionado
  const mesDate = new Date(hoje.getFullYear(), hoje.getMonth()-mesIdx, 1);
  const inicioMes = mesDate.toISOString().split('T')[0];
  const fimMes = new Date(mesDate.getFullYear(), mesDate.getMonth()+1, 0).toISOString().split('T')[0];
  const mesLabel = mesDate.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

  async function loadOrdens() {
    try {
      const data = await api.app.os.list();
      setOrdens(Array.isArray(data)?data:[]);
    } catch { setOrdens([]); }
  }

  async function loadDespesas() {
    try {
      const data = await api.app.despesas.list(inicioMes, fimMes);
      setDespesas(Array.isArray(data)?data:[]);
    } catch { setDespesas([]); }
  }

  async function loadParcelas() {
    try {
      const data = await api.app.parcelasReceber.list();
      setParcelas(Array.isArray(data)?data:[]);
    } catch { setParcelas([]); }
  }

  async function loadPagamentosOS() {
    try {
      const data = await api.app.pagamentosOS.list();
      setPagamentosOS(Array.isArray(data)?data:[]);
    } catch { setPagamentosOS([]); }
  }

  async function marcarRecebido(id) {
    try {
      await api.app.parcelasReceber.marcarRecebido(id);
      loadParcelas();
      showToast('Parcela marcada como recebida!');
    } catch { showToast('Erro ao marcar','error'); }
  }

  useEffect(()=>{ loadOrdens(); loadParcelas(); loadPagamentosOS(); },[]);
  useEffect(()=>{ loadDespesas(); },[mesIdx]);

  async function saveDespesa(e) {
    e.preventDefault();
    if (!form.descricao.trim()||!form.valor||parseFloat(form.valor)<=0) { showToast('Preencha descrição e valor','error'); return; }
    try {
      const payload = {...form, valor:parseFloat(form.valor), pago:form.pago?1:0};
      if (editing) await api.app.despesas.update(editing, payload);
      else await api.app.despesas.create(payload);
      setModal(false); loadDespesas(); showToast(editing?'Despesa atualizada!':'Despesa cadastrada!');
    } catch { showToast('Erro ao salvar','error'); }
  }

  async function marcarPago(id) {
    await api.app.despesas.update(id, {pago:1});
    loadDespesas(); showToast('Marcado como pago!');
  }

  async function removeDespesa(id) {
    if (!window.confirm('Excluir esta despesa?')) return;
    await api.app.despesas.remove(id);
    loadDespesas(); showToast('Despesa excluída');
  }

  // Filtra ordens do mês
  const ordensM = ordens.filter(o=>o.data>=inicioMes&&o.data<=fimMes&&o.status==='finalizado');
  const receita = ordensM.reduce((s,o)=>s+parseFloat(o.valor_mo||0)+parseFloat(o.valor_pecas||0)||parseFloat(o.valor||0),0);
  const totalDesp = despesas.reduce((s,d)=>s+parseFloat(d.valor||0),0);
  const lucro = receita - totalDesp;

  // Categorias
  const catMap = {};
  despesas.forEach(d=>{ if(!catMap[d.categoria]) catMap[d.categoria]=0; catMap[d.categoria]+=parseFloat(d.valor||0); });
  const maxCat = Math.max(...Object.values(catMap),1);

  // Meses para select
  const meses = Array.from({length:6},(_,i)=>{
    const d = new Date(hoje.getFullYear(),hoje.getMonth()-i,1);
    return { label:d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}), idx:i };
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Financeiro</div><div className="page-subtitle">{mesLabel}</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="dash-select" value={mesIdx} onChange={e=>setMesIdx(Number(e.target.value))}>
            {meses.map(m=><option key={m.idx} value={m.idx}>{m.label}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={()=>{setForm({...EMPTY_DESP,data:new Date().toISOString().split('T')[0]});setEditing(null);setModal(true);}}>+ Nova despesa</button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="fin-summary">
        <div className="fin-card receita">
          <div className="fin-card-label">💰 Receita do mês</div>
          <div className="fin-card-value">{fmt.currency(receita)}</div>
          <div style={{fontSize:12,color:'var(--gray-400)',marginTop:6}}>{ordensM.length} serviços finalizados</div>
        </div>
        <div className="fin-card despesa">
          <div className="fin-card-label">📉 Despesas do mês</div>
          <div className="fin-card-value">{fmt.currency(totalDesp)}</div>
          <div style={{fontSize:12,color:'var(--gray-400)',marginTop:6}}>{despesas.length} lançamento(s)</div>
        </div>
        <div className={`fin-card ${lucro>=0?'lucro':'prejuizo'}`}>
          <div className="fin-card-label">{lucro>=0?'📈 Lucro líquido':'⚠️ Prejuízo'}</div>
          <div className="fin-card-value" style={{color:lucro>=0?'var(--success)':'var(--danger)'}}>{fmt.currency(lucro)}</div>
          <div style={{fontSize:12,color:'var(--gray-400)',marginTop:6}}>Margem: {receita>0?((lucro/receita)*100).toFixed(1):0}%</div>
        </div>
      </div>

      {/* Gráfico de formas de pagamento */}
      {(() => {
        const pagMes = pagamentosOS.filter(p => p.data_pagamento >= inicioMes && p.data_pagamento <= fimMes);
        if (!pagMes.length) return null;
        const formas = { pix:0, dinheiro:0, debito:0, credito:0 };
        pagMes.forEach(p => { if (formas[p.forma] !== undefined) formas[p.forma] += parseFloat(p.valor_total||0); });
        const total = Object.values(formas).reduce((s,v)=>s+v,0);
        if (total === 0) return null;

        const cores = { pix:'#00B4D8', dinheiro:'#10b981', debito:'#8b5cf6', credito:'#f59e0b' };
        const labels = { pix:'PIX', dinheiro:'Dinheiro', debito:'Débito', credito:'Crédito' };
        const icons = { pix:'📱', dinheiro:'💵', debito:'💳', credito:'💳' };
        const entries = Object.entries(formas).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);

        // Gera arcos SVG
        let startAngle = 0;
        const arcs = entries.map(([forma, valor]) => {
          const pct = valor / total;
          const angle = pct * 360;
          const endAngle = startAngle + angle;
          const largeArc = angle > 180 ? 1 : 0;
          const rad = (a) => (a - 90) * Math.PI / 180;
          const x1 = 50 + 40 * Math.cos(rad(startAngle));
          const y1 = 50 + 40 * Math.sin(rad(startAngle));
          const x2 = 50 + 40 * Math.cos(rad(endAngle));
          const y2 = 50 + 40 * Math.sin(rad(endAngle));
          const path = pct >= 0.999
            ? `M 50 10 A 40 40 0 1 1 49.99 10 Z`
            : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
          startAngle = endAngle;
          return { forma, path, color: cores[forma] };
        });

        return (
          <div className="card" style={{marginBottom:20}}>
            <div className="card-header"><div className="card-title">📊 Formas de pagamento do mês</div></div>
            <div style={{display:'flex',alignItems:'center',gap:24,flexWrap:'wrap',justifyContent:'center'}}>
              {/* Pizza SVG */}
              <svg viewBox="0 0 100 100" style={{width:140,height:140,flexShrink:0,maxWidth:'40%'}}>
                {arcs.map(a => <path key={a.forma} d={a.path} fill={a.color} stroke="#fff" strokeWidth="1" />)}
                <circle cx="50" cy="50" r="20" fill="#fff" />
                <text x="50" y="48" textAnchor="middle" fontSize="7" fontWeight="700" fill="#374151">{entries.length}</text>
                <text x="50" y="57" textAnchor="middle" fontSize="5" fill="#9CA3AF">formas</text>
              </svg>
              {/* Legenda */}
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:10}}>
                {entries.map(([forma, valor]) => {
                  const pct = (valor/total*100).toFixed(1);
                  return (
                    <div key={forma} style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:12,height:12,borderRadius:3,background:cores[forma],flexShrink:0}} />
                      <div style={{flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:13,fontWeight:600,color:'var(--gray-700)'}}>{icons[forma]} {labels[forma]}</span>
                          <span style={{fontSize:13,fontWeight:700,color:'var(--gray-800)'}}>{fmt.currency(valor)}</span>
                        </div>
                        <div style={{height:4,background:'var(--gray-100)',borderRadius:99,marginTop:4,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:cores[forma],borderRadius:99}} />
                        </div>
                        <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2}}>{pct}% do total</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{borderTop:'1px solid var(--gray-100)',paddingTop:8,marginTop:4,display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span style={{fontWeight:600,color:'var(--gray-600)'}}>Total recebido</span>
                  <span style={{fontWeight:800,color:'var(--brand)'}}>{fmt.currency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Despesas por categoria + Últimas receitas */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <div className="card">
          <div className="card-header"><div className="card-title">Despesas por categoria</div></div>
          {Object.keys(catMap).length ? (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>{
                const pct = totalDesp>0?(val/totalDesp*100).toFixed(1):0;
                return (
                  <div key={cat}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--gray-700)'}}>{CAT_ICONS[cat]||'📦'} {cat}</span>
                      <span style={{fontSize:13,fontWeight:700,color:'var(--danger)'}}>{fmt.currency(val)}</span>
                    </div>
                    <div style={{height:6,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:'var(--danger)',borderRadius:99}} />
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2}}>{pct}% do total</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{padding:32}}><div className="empty-icon">📊</div><p>Nenhuma despesa cadastrada</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Últimas receitas</div></div>
          {ordensM.length ? (
            <div style={{display:'flex',flexDirection:'column'}}>
              {[...ordensM].sort((a,b)=>b.id-a.id).slice(0,8).map(o=>{
                const total = parseFloat(o.valor_mo||0)+parseFloat(o.valor_pecas||0)||parseFloat(o.valor||0);
                return (
                  <div key={o.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--gray-800)'}}>OS #{String(o.id).padStart(4,'0')} · {o.cliente_nome||'—'}</div>
                      <div style={{fontSize:11.5,color:'var(--gray-400)'}}>{fmt.date(o.data)}</div>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--success)'}}>{fmt.currency(total)}</span>
                  </div>
                );
              })}
            </div>
          ) : <div className="empty-state" style={{padding:32}}><div className="empty-icon">💰</div><p>Nenhuma receita este mês</p></div>}
        </div>
      </div>

      {/* Parcelas a receber */}
      {parcelas.filter(p=>!p.recebido).length > 0 && (
        <div className="card" style={{marginBottom:20}}>
          <div className="card-header">
            <div className="card-title">💳 Parcelas a receber</div>
            <span style={{fontSize:12,color:'var(--gray-400)'}}>{parcelas.filter(p=>!p.recebido).length} pendente(s)</span>
          </div>
          {(() => {
            const hojeStr = new Date().toISOString().split('T')[0];
            const pendentes = parcelas.filter(p=>!p.recebido).sort((a,b)=>a.data_recebimento.localeCompare(b.data_recebimento));
            const parcelasHoje = pendentes.filter(p=>p.data_recebimento===hojeStr);
            const parcelasAtrasadas = pendentes.filter(p=>p.data_recebimento<hojeStr);
            const parcelasProximas = pendentes.filter(p=>p.data_recebimento>hojeStr).slice(0,10);
            const totalHoje = parcelasHoje.reduce((s,p)=>s+parseFloat(p.valor||0),0);
            const totalAtrasado = parcelasAtrasadas.reduce((s,p)=>s+parseFloat(p.valor||0),0);

            return (
              <div>
                {/* Alerta do dia */}
                {(parcelasHoje.length > 0 || parcelasAtrasadas.length > 0) && (
                  <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:'var(--r-sm)',padding:'12px 16px',marginBottom:16}}>
                    {parcelasHoje.length > 0 && (
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:parcelasAtrasadas.length?8:0}}>
                        <span style={{fontSize:18}}>🔔</span>
                        <span style={{fontSize:13,fontWeight:600,color:'#166534'}}>Hoje você recebe <strong>{fmt.currency(totalHoje)}</strong> ({parcelasHoje.length} parcela{parcelasHoje.length>1?'s':''})</span>
                      </div>
                    )}
                    {parcelasAtrasadas.length > 0 && (
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:18}}>⚠️</span>
                        <span style={{fontSize:13,fontWeight:600,color:'#B91C1C'}}>{parcelasAtrasadas.length} parcela{parcelasAtrasadas.length>1?'s':''} atrasada{parcelasAtrasadas.length>1?'s':''} — {fmt.currency(totalAtrasado)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Data</th><th>Cliente</th><th>OS</th><th>Parcela</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {[...parcelasAtrasadas, ...parcelasHoje, ...parcelasProximas].map(p => {
                        const isHoje = p.data_recebimento === hojeStr;
                        const isAtrasado = p.data_recebimento < hojeStr;
                        return (
                          <tr key={p.id} style={{background:isHoje?'#F0FDF4':isAtrasado?'#FEF2F2':''}}>
                            <td style={{fontWeight:isHoje||isAtrasado?700:400,color:isAtrasado?'var(--danger)':isHoje?'var(--success)':'var(--gray-600)',whiteSpace:'nowrap'}}>{fmt.date(p.data_recebimento)}</td>
                            <td style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.cliente_nome||'—'}</td>
                            <td><strong style={{color:'var(--brand)'}}>#{String(p.os_id).padStart(4,'0')}</strong></td>
                            <td>{p.numero_parcela}ª</td>
                            <td><strong style={{color:'var(--success)',whiteSpace:'nowrap'}}>{fmt.currency(p.valor)}</strong></td>
                            <td>{isAtrasado?<span className="badge badge-red">Atrasado</span>:isHoje?<span className="badge badge-green">Hoje</span>:<span className="badge badge-gray">Agendado</span>}</td>
                            <td><button className="btn btn-success btn-sm" onClick={()=>marcarRecebido(p.id)} title="Marcar como recebido">✓</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tabela de despesas */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Lançamentos de despesas</div>
        </div>
        {despesas.length ? (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Status</th><th>Valor</th><th></th></tr></thead>
              <tbody>
                {[...despesas].sort((a,b)=>b.data?.localeCompare(a.data)).map(d=>{
                  const vencido = d.vencimento && d.vencimento < new Date().toISOString().split('T')[0];
                  return (
                    <tr key={d.id}>
                      <td>{fmt.date(d.data)}</td>
                      <td><strong>{d.descricao}</strong></td>
                      <td><span className="badge badge-gray">{CAT_ICONS[d.categoria]||'📦'} {d.categoria}</span></td>
                      <td>{d.vencimento?fmt.date(d.vencimento):'—'}</td>
                      <td>{d.pago?<span className="badge badge-green">✓ Pago</span>:vencido?<span className="badge badge-red">Vencido</span>:<span className="badge badge-yellow">Pendente</span>}</td>
                      <td><strong style={{color:'var(--danger)'}}>{fmt.currency(d.valor)}</strong></td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          {!d.pago&&<button className="btn btn-success btn-sm" onClick={()=>marcarPago(d.id)} title="Marcar como pago">✓</button>}
                          <button className="btn btn-ghost btn-sm" onClick={()=>{setForm({descricao:d.descricao,categoria:d.categoria,valor:d.valor,data:d.data,vencimento:d.vencimento||'',pago:!!d.pago,obs:d.obs||''});setEditing(d.id);setModal(true);}}>✏️</button>
                          <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>removeDespesa(d.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{padding:40}}>
            <div className="empty-icon">📄</div>
            <p>Nenhuma despesa lançada neste mês</p>
            <button className="btn btn-primary" style={{marginTop:16}} onClick={()=>{setForm({...EMPTY_DESP,data:new Date().toISOString().split('T')[0]});setEditing(null);setModal(true);}}>+ Cadastrar primeira despesa</button>
          </div>
        )}
      </div>

      {/* Modal despesa */}
      {modal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing?'✏️ Editar despesa':'📄 Nova despesa'}</h2>
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={saveDespesa}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Descrição *</label>
                    <input value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Ex: Boleto aluguel, Conta de luz..." required autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Categoria *</label>
                    <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                      {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Valor (R$) *</label>
                    <input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} placeholder="0,00" required />
                  </div>
                  <div className="form-group">
                    <label>Data do lançamento *</label>
                    <input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label>Data de vencimento</label>
                    <input type="date" value={form.vencimento} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.pago?'1':'0'} onChange={e=>setForm(f=>({...f,pago:e.target.value==='1'}))}>
                      <option value="0">Pendente</option>
                      <option value="1">Pago</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Observação</label>
                    <textarea value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} placeholder="Detalhes adicionais..." />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">💾 Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
