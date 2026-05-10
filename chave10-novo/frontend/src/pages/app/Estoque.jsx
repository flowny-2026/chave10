import { useEffect, useState } from 'react';
import { api } from '../../api';
import BarcodeScanner from '../../components/BarcodeScanner';

const fmt = { currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.') };
const EMPTY = { nome:'', categoria:'peca', tipo:'', marca:'', aplicacao:'', quantidade:'', estoque_min:'', preco:'', data_compra:'', obs:'' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

function getUser() { try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; } }

export default function AppEstoque() {
  const isFuncionario = getUser()?.perfil === 'funcionario';
  const [itens, setItens]     = useState([]);
  const [catFiltro, setCatFiltro] = useState('todos');
  const [search, setSearch]   = useState('');
  const [view, setView]       = useState(isFuncionario ? 'lista' : 'patrimonio'); // 'patrimonio' | 'lista'
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [scanner, setScanner] = useState(false);
  const [toast, setToast]     = useState({msg:'',type:''});

  function showToast(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:''}),3000); }

  async function load() {
    try {
      const data = await api.app.estoque.list();
      setItens(Array.isArray(data)?data:[]);
    } catch { setItens([]); }
  }

  useEffect(()=>{ load(); },[]);

  function openCreate(cat='peca') { setForm({...EMPTY,categoria:cat}); setEditing(null); setModal(true); }
  function openEdit(i) { setForm({nome:i.nome||'',categoria:i.categoria||'peca',tipo:i.tipo||'',marca:i.marca||'',aplicacao:i.aplicacao||'',quantidade:i.quantidade||'',estoque_min:i.estoque_min||'',preco:i.preco||'',data_compra:i.data_compra||'',obs:i.obs||''}); setEditing(i.id); setModal(true); }

  // Trata código de barras detectado — busca item existente ou pré-preenche novo
  function handleBarcode(codigo) {
    setScanner(false);
    const existente = itens.find(i => i.codigo_barras === codigo);
    if (existente) {
      openEdit(existente);
      showToast(`Item encontrado: ${existente.nome}`);
    } else {
      setForm({...EMPTY, categoria:'peca', codigo_barras: codigo});
      setEditing(null);
      setModal(true);
      showToast(`Código ${codigo} — cadastre o item`, 'success');
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!form.nome.trim()) { showToast('Nome é obrigatório','error'); return; }
    try {
      const payload = {...form, quantidade:parseInt(form.quantidade)||0, estoque_min:parseInt(form.estoque_min)||0, preco:parseFloat(form.preco)||0, codigo_barras:form.codigo_barras||null};
      if (editing) await api.app.estoque.update(editing, payload);
      else await api.app.estoque.create(payload);
      setModal(false); load(); showToast(editing?'Item atualizado!':'Item salvo!');
    } catch { showToast('Erro ao salvar','error'); }
  }

  async function remove(id) {
    if (!window.confirm('Excluir este item?')) return;
    await api.app.estoque.remove(id);
    load(); showToast('Item excluído');
  }

  const pecas = itens.filter(i=>i.categoria==='peca');
  const ferr  = itens.filter(i=>i.categoria==='ferramenta');
  const valPecas = pecas.reduce((s,i)=>s+parseFloat(i.preco||0)*parseInt(i.quantidade||1),0);
  const valFerr  = ferr.reduce((s,i)=>s+parseFloat(i.preco||0)*parseInt(i.quantidade||1),0);
  const valTotal = valPecas + valFerr;
  const baixo = pecas.filter(i=>parseInt(i.quantidade||0)<=parseInt(i.estoque_min||0)&&parseInt(i.estoque_min||0)>0);
  const zerado = pecas.filter(i=>parseInt(i.quantidade||0)===0);

  const top5 = [...itens].map(i=>({...i,valorTotal:parseFloat(i.preco||0)*parseInt(i.quantidade||1)})).sort((a,b)=>b.valorTotal-a.valorTotal).slice(0,5);

  const listaFiltrada = itens.filter(i=>{
    const matchCat = catFiltro==='todos'||i.categoria===catFiltro;
    const matchSearch = !search||(i.nome||'').toLowerCase().includes(search.toLowerCase())||(i.marca||'').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Estoque & Patrimônio</div><div className="page-subtitle">{itens.length} item(ns) cadastrado(s)</div></div>
        <div style={{display:'flex',gap:8}}>
          {!isFuncionario && <button className={`btn ${view==='patrimonio'?'btn-primary':'btn-outline'} btn-sm`} onClick={()=>setView('patrimonio')}>📊 Patrimônio</button>}
          <button className={`btn ${view==='lista'?'btn-primary':'btn-outline'} btn-sm`} onClick={()=>setView('lista')}>📋 Lista</button>
          <button className="btn btn-outline" onClick={()=>setScanner(true)} title="Ler código de barras">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/></svg>
            Scanner
          </button>
          <button className="btn btn-outline" onClick={()=>openCreate('ferramenta')}>+ Ferramenta</button>
          <button className="btn btn-primary" onClick={()=>openCreate('peca')}>+ Peça</button>
        </div>
      </div>

      {(baixo.length>0||zerado.length>0) && (
        <div className="estoque-alerta" style={{marginBottom:20}}>
          <span>⚠️</span>
          <span>{zerado.length>0&&<strong>{zerado.length} peça(s) zerada(s)</strong>}{zerado.length>0&&baixo.length>0&&' · '}{baixo.length>0&&<strong>{baixo.length} peça(s) com estoque baixo</strong>}</span>
        </div>
      )}

      {view==='patrimonio' && !isFuncionario && (
        <>
          {/* KPI */}
          <div className="stats-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',marginBottom:24}}>
            <div className="stat-card c-orange"><div className="stat-icon c-orange">💰</div><div><div className="stat-value" style={{fontSize:17}}>{fmt.currency(valTotal)}</div><div className="stat-label">Patrimônio total</div></div></div>
            <div className="stat-card c-blue"><div className="stat-icon c-blue">⚙️</div><div><div className="stat-value" style={{fontSize:17}}>{fmt.currency(valPecas)}</div><div className="stat-label">Em peças ({pecas.length})</div></div></div>
            <div className="stat-card c-purple"><div className="stat-icon c-purple">🔧</div><div><div className="stat-value" style={{fontSize:17}}>{fmt.currency(valFerr)}</div><div className="stat-label">Em ferramentas ({ferr.length})</div></div></div>
            <div className="stat-card c-red"><div className="stat-icon c-red">⚠️</div><div><div className="stat-value">{baixo.length+zerado.length}</div><div className="stat-label">Alertas de estoque</div></div></div>
          </div>

          <div className="estoque-grid-2">
            {/* Top 5 */}
            <div className="card">
              <div className="card-header"><div className="card-title">🏆 Top 5 itens mais valiosos</div></div>
              {top5.length ? top5.map((i,idx)=>(
                <div key={i.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:idx===0?'var(--accent)':idx===1?'var(--gray-300)':idx===2?'#cd7f32':'var(--gray-100)',color:idx<3?'#fff':'var(--gray-500)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{idx+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--gray-800)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{i.nome}</div>
                    <div style={{fontSize:11.5,color:'var(--gray-400)'}}>{i.categoria==='peca'?'⚙️ Peça':'🔧 Ferramenta'}{i.marca?` · ${i.marca}`:''}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--success)'}}>{fmt.currency(i.valorTotal)}</div>
                    {i.categoria==='peca'&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{i.quantidade||0} un × {fmt.currency(i.preco||0)}</div>}
                  </div>
                </div>
              )) : <div className="empty-state" style={{padding:24}}><p>Nenhum item cadastrado</p></div>}
            </div>

            {/* Composição */}
            <div className="card">
              <div className="card-header"><div className="card-title">🥧 Composição do patrimônio</div></div>
              {valTotal>0 ? (
                <div style={{display:'flex',flexDirection:'column',gap:20,marginTop:8}}>
                  <div style={{display:'flex',height:28,borderRadius:99,overflow:'hidden',gap:2}}>
                    {valPecas>0&&<div style={{flex:valPecas,background:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',minWidth:40}}>{(valPecas/valTotal*100).toFixed(1)}%</div>}
                    {valFerr>0&&<div style={{flex:valFerr,background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',minWidth:40}}>{(valFerr/valTotal*100).toFixed(1)}%</div>}
                  </div>
                  <div style={{display:'flex',gap:24,justifyContent:'center'}}>
                    {[{label:'Peças',val:valPecas,color:'var(--brand)'},{label:'Ferramentas',val:valFerr,color:'#7c3aed'}].map(item=>(
                      <div key={item.label} style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:12,height:12,borderRadius:3,background:item.color}} />
                        <div><div style={{fontSize:12,color:'var(--gray-500)'}}>{item.label}</div><div style={{fontSize:15,fontWeight:700,color:item.color}}>{fmt.currency(item.val)}</div></div>
                      </div>
                    ))}
                  </div>
                  <div style={{textAlign:'center',padding:16,background:'var(--gray-50)',borderRadius:'var(--r)',border:'1px solid var(--gray-200)'}}>
                    <div style={{fontSize:12,color:'var(--gray-400)',marginBottom:4}}>Patrimônio total em estoque</div>
                    <div style={{fontFamily:'Poppins,sans-serif',fontSize:28,fontWeight:800,color:'var(--accent)'}}>{fmt.currency(valTotal)}</div>
                  </div>
                </div>
              ) : <div className="empty-state" style={{padding:24}}><p>Nenhum item cadastrado</p></div>}
            </div>
          </div>

          {/* Alertas */}
          {(zerado.length>0||baixo.length>0) ? (
            <div className="card">
              <div className="card-header"><div className="card-title">🚨 Itens que precisam de atenção</div></div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Item</th><th>Tipo</th><th>Qtd atual</th><th>Mínimo</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {[...zerado.map(i=>({...i,_s:'zerado'})),...baixo.filter(i=>parseInt(i.quantidade||0)>0).map(i=>({...i,_s:'baixo'}))].map(i=>(
                      <tr key={i.id}>
                        <td><strong>{i.nome}</strong>{i.marca&&<span style={{color:'var(--gray-400)',fontSize:12}}> · {i.marca}</span>}</td>
                        <td>{i.tipo||'—'}</td>
                        <td><strong style={{color:i._s==='zerado'?'var(--danger)':'var(--warning)'}}>{i.quantidade||0}</strong></td>
                        <td>{i.estoque_min||0}</td>
                        <td>{i._s==='zerado'?<span className="badge badge-red">Zerado</span>:<span className="badge badge-yellow">Baixo</span>}</td>
                        <td><button className="btn btn-outline btn-sm" onClick={()=>openEdit(i)}>✏️ Repor</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card" style={{textAlign:'center',padding:28}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--success)'}}>Estoque saudável</div>
              <div style={{fontSize:13,color:'var(--gray-400)',marginTop:4}}>Nenhum item com estoque baixo ou zerado</div>
            </div>
          )}
        </>
      )}

      {view==='lista' && (
        <>
          <div className="search-bar">
            <div className="search-input-wrap">
              <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Buscar por nome ou marca..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <div className="estoque-tab-group">
              {['todos','peca','ferramenta'].map(c=>(
                <button key={c} className={`estoque-tab${catFiltro===c?' active':''}`} onClick={()=>setCatFiltro(c)}>
                  {c==='todos'?'Todos':c==='peca'?'⚙️ Peças':'🔧 Ferramentas'}
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            {listaFiltrada.length ? (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Nome</th><th>Categoria</th><th>Tipo</th><th>Marca</th><th>Qtd</th>{!isFuncionario&&<th>Preço unit.</th>}<th>Ações</th></tr></thead>
                  <tbody>
                    {listaFiltrada.map(i=>{
                      const baixoItem = i.categoria==='peca'&&parseInt(i.quantidade||0)<=parseInt(i.estoque_min||0)&&parseInt(i.estoque_min||0)>0;
                      const zeradoItem = i.categoria==='peca'&&parseInt(i.quantidade||0)===0;
                      return (
                        <tr key={i.id}>
                          <td><strong>{i.nome}</strong>{i.obs&&<><br/><small style={{color:'var(--gray-400)'}}>{i.obs}</small></>}</td>
                          <td>{i.categoria==='peca'?<span className="badge badge-blue">⚙️ Peça</span>:<span className="badge badge-orange">🔧 Ferramenta</span>}</td>
                          <td>{i.tipo||'—'}</td>
                          <td>{i.marca||'—'}</td>
                          <td>{i.categoria==='peca'?<span className={`badge ${zeradoItem?'badge-red':baixoItem?'badge-yellow':'badge-green'}`}>{i.quantidade||0}</span>:'—'}</td>
                          {!isFuncionario&&<td>{i.preco?fmt.currency(i.preco):'—'}</td>}
                          <td>
                            <div style={{display:'flex',gap:4}}>
                              <button className="btn btn-outline btn-sm" onClick={()=>openEdit(i)}>✏️</button>
                              <button className="btn btn-outline btn-sm" onClick={()=>remove(i.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><div className="empty-icon">📦</div><p>Nenhum item encontrado</p><div style={{display:'flex',gap:8,justifyContent:'center'}}><button className="btn btn-outline" onClick={()=>openCreate('ferramenta')}>+ Ferramenta</button><button className="btn btn-primary" onClick={()=>openCreate('peca')}>+ Peça</button></div></div>
            )}
          </div>
        </>
      )}

      {modal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing?'Editar item':form.categoria==='peca'?'Nova Peça':'Nova Ferramenta'}</h2>
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Categoria</label>
                    <div style={{display:'flex',gap:8}}>
                      {['peca','ferramenta'].map(c=>(
                        <label key={c} className={`estoque-radio${form.categoria===c?' active':''}`} style={{cursor:'pointer'}}>
                          <input type="radio" name="cat" value={c} checked={form.categoria===c} onChange={()=>setForm(f=>({...f,categoria:c}))} style={{display:'none'}} />
                          {c==='peca'?'⚙️ Peça':'🔧 Ferramenta'}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group full"><label>Nome *</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Filtro de óleo, Chave de impacto..." required autoFocus /></div>
                  <div className="form-group">
                    <label>Código de barras</label>
                    <div style={{display:'flex',gap:6}}>
                      <input value={form.codigo_barras||''} onChange={e=>setForm(f=>({...f,codigo_barras:e.target.value}))} placeholder="Ex: 7891234567890" style={{flex:1}} />
                      <button type="button" className="btn btn-outline btn-sm" onClick={()=>setScanner(true)} title="Ler código de barras">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="form-group"><label>Tipo</label><input value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} placeholder={form.categoria==='peca'?'Ex: Filtro, Correia...':'Ex: Elétrica, Manual...'} /></div>
                  <div className="form-group"><label>Marca</label><input value={form.marca} onChange={e=>setForm(f=>({...f,marca:e.target.value}))} placeholder="Ex: Bosch, NGK..." /></div>                  {form.categoria==='peca' && <>
                    <div className="form-group full"><label>Aplicação</label><input value={form.aplicacao} onChange={e=>setForm(f=>({...f,aplicacao:e.target.value}))} placeholder="Ex: Motores 1.0 flex..." /></div>
                    <div className="form-group"><label>Quantidade em estoque</label><input type="number" min="0" value={form.quantidade} onChange={e=>setForm(f=>({...f,quantidade:e.target.value}))} placeholder="0" /></div>
                    <div className="form-group"><label>Estoque mínimo</label><input type="number" min="0" value={form.estoque_min} onChange={e=>setForm(f=>({...f,estoque_min:e.target.value}))} placeholder="Ex: 2" /></div>
                  </>}
                  {!isFuncionario && <div className="form-group"><label>{form.categoria==='peca'?'Preço unitário (R$)':'Valor (R$)'}</label><input type="number" step="0.01" min="0" value={form.preco} onChange={e=>setForm(f=>({...f,preco:e.target.value}))} placeholder="0,00" /></div>}
                  <div className="form-group"><label>Data de compra</label><input type="date" value={form.data_compra} onChange={e=>setForm(f=>({...f,data_compra:e.target.value}))} /></div>
                  <div className="form-group full"><label>Observações</label><textarea value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} placeholder="Anotações adicionais..." /></div>
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
      {scanner && <BarcodeScanner onDetected={handleBarcode} onClose={()=>setScanner(false)} />}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
