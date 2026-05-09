import { useEffect, useState } from 'react';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};

const STATUS_LABEL = { active:'Ativa', pending:'Pendente', overdue:'Em atraso', blocked:'Bloqueada' };
const STATUS_CLASS = { active:'badge-green', pending:'badge-yellow', overdue:'badge-orange', blocked:'badge-red' };

const EMPTY     = { nome:'', responsavel:'', telefone:'', email:'', plano:'mensal', data_vencimento:'', observacoes:'' };
const EMPTY_USR = { nome:'', email:'', senha:'', perfil:'funcionario' };
const EMPTY_PAG = { valor:'', data_pagamento:new Date().toISOString().split('T')[0], novo_vencimento:'', forma_pagamento:'pix', observacao:'' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

export default function AdminOficinas() {
  const [oficinas, setOficinas]       = useState([]);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected]       = useState(new Set());
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState(EMPTY);
  const [userForm, setUserForm]       = useState(EMPTY_USR);
  const [pagForm, setPagForm]         = useState(EMPTY_PAG);
  const [loteForm, setLoteForm]       = useState({ novo_vencimento:'', valor:'', forma_pagamento:'pix' });
  const [pendentes, setPendentes]     = useState([]);
  const [editing, setEditing]         = useState(null);
  const [selectedOf, setSelectedOf]   = useState(null);
  const [detalhes, setDetalhes]       = useState(null);
  const [toast, setToast]             = useState({msg:'',type:''});

  function showToast(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:''}),3000); }

  async function load() {
    try {
      const data = await api.admin.oficinas.list(filterStatus||undefined);
      setOficinas(data);
    } catch { setOficinas([]); }
  }

  async function loadPendentes() {
    try { setPendentes(await api.admin.usuarios.pendentes()); }
    catch { setPendentes([]); }
  }

  useEffect(()=>{ load(); loadPendentes(); },[filterStatus]);

  async function abrirDetalhes(o) {
    setSelectedOf(o); setModal('detalhes'); setDetalhes(null);
    try { const d = await api.admin.oficinas.detalhes(o.id); setDetalhes(d); }
    catch { setDetalhes({ erro: true }); }
  }

  async function saveOficina(e) {
    e.preventDefault();
    try {
      if (editing) await api.admin.oficinas.update(editing, form);
      else await api.admin.oficinas.create(form);
      setModal(null); load(); showToast(editing?'Oficina atualizada!':'Oficina criada!');
    } catch (err) { showToast(err.error||'Erro ao salvar','error'); }
  }

  async function removeOficina(id) {
    if (!window.confirm('Remover esta oficina?')) return;
    await api.admin.oficinas.remove(id); load(); showToast('Oficina removida');
  }

  async function setStatus(id, status) {
    await api.admin.oficinas.setStatus(id, status); load(); showToast('Status atualizado');
  }

  async function saveUsuario(e) {
    e.preventDefault();
    try {
      await api.admin.usuarios.create({...userForm, oficina_id: selectedOf.id});
      setModal(null); showToast('Usuário criado!');
    } catch (err) { showToast(err.error||'Erro ao criar usuário','error'); }
  }

  async function savePagamento(e) {
    e.preventDefault();
    try {
      await api.admin.pagamentos.create({...pagForm, oficina_id: selectedOf.id});
      setModal(null); load(); showToast('Pagamento registrado!');
    } catch (err) { showToast(err.error||'Erro ao registrar','error'); }
  }

  async function renovarLote(e) {
    e.preventDefault();
    if (!loteForm.novo_vencimento) { showToast('Informe o novo vencimento','error'); return; }
    try {
      const res = await api.admin.renovarLote({ ids:[...selected], ...loteForm, valor:parseFloat(loteForm.valor)||0 });
      setModal(null); setSelected(new Set()); load();
      showToast(`${res.renovadas} oficina(s) renovada(s)!`);
    } catch (err) { showToast(err.error||'Erro ao renovar','error'); }
  }

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(s => s.size === listaFiltrada.length ? new Set() : new Set(listaFiltrada.map(o=>o.id)));
  }

  const listaFiltrada = oficinas.filter(o => {
    const matchSearch = !search || (o.nome||'').toLowerCase().includes(search.toLowerCase()) || (o.email||'').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const hoje = new Date().toISOString().split('T')[0];
  const em7  = new Date(); em7.setDate(em7.getDate()+7);
  const em7str = em7.toISOString().split('T')[0];

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Oficinas</div><div className="page-subtitle">{listaFiltrada.length} oficina(s)</div></div>
        <div className="page-actions">
          {selected.size > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={()=>setModal('lote')}>
              🔄 Renovar {selected.size} selecionada(s)
            </button>
          )}
          <select className="dash-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Em atraso</option>
            <option value="blocked">Bloqueadas</option>
          </select>
          <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setEditing(null);setModal('oficina');}}>+ Nova Oficina</button>
        </div>
      </div>

      {/* Busca */}
      <div className="search-bar" style={{marginBottom:16}}>
        <div className="search-input-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por nome ou email..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{width:36}}>
                  <input type="checkbox" checked={selected.size===listaFiltrada.length&&listaFiltrada.length>0} onChange={toggleAll} />
                </th>
                <th>Nome</th>
                <th>Responsável</th>
                <th>Plano</th>
                <th>Vencimento</th>
                <th>Último acesso</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.length === 0 && (
                <tr><td colSpan={8} style={{textAlign:'center',color:'var(--gray-400)',padding:32}}>Nenhuma oficina encontrada</td></tr>
              )}
              {listaFiltrada.map(o => {
                const vencendo = o.data_vencimento && o.data_vencimento >= hoje && o.data_vencimento <= em7str;
                const vencido  = o.data_vencimento && o.data_vencimento < hoje;
                return (
                  <tr key={o.id} style={selected.has(o.id)?{background:'var(--brand-light)'}:{}}>
                    <td><input type="checkbox" checked={selected.has(o.id)} onChange={()=>toggleSelect(o.id)} /></td>
                    <td>
                      <div style={{fontWeight:600}}>{o.nome}</div>
                      <div style={{fontSize:12,color:'var(--gray-400)'}}>{o.email}</div>
                    </td>
                    <td>{o.responsavel||'—'}</td>
                    <td><span className="badge badge-blue">{o.plano}</span></td>
                    <td>
                      <span style={{color:vencido?'var(--danger)':vencendo?'var(--warning)':'var(--gray-700)',fontWeight:vencido||vencendo?700:400}}>
                        {fmt.date(o.data_vencimento)}
                        {vencendo&&' ⚠️'}
                        {vencido&&' 🔴'}
                      </span>
                    </td>
                    <td style={{fontSize:12,color:'var(--gray-400)'}}>{fmt.date(o.data_criacao)}</td>
                    <td><span className={`badge ${STATUS_CLASS[o.status_assinatura]}`}>{STATUS_LABEL[o.status_assinatura]}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>abrirDetalhes(o)} title="Ver detalhes">🔍</button>
                        <button className="btn btn-outline btn-sm" onClick={()=>{setForm({...o});setEditing(o.id);setModal('oficina');}}>✏️</button>
                        <button className="btn btn-outline btn-sm" onClick={()=>{setSelectedOf(o);setUserForm(EMPTY_USR);setModal('usuario');}}>+ Login</button>
                        <button className="btn btn-success btn-sm" onClick={()=>{setSelectedOf(o);setPagForm({...EMPTY_PAG});setModal('pagamento');}}>💳</button>
                        {o.status_assinatura!=='blocked'
                          ? <button className="btn btn-danger btn-sm" onClick={()=>setStatus(o.id,'blocked')}>🔒</button>
                          : <button className="btn btn-success btn-sm" onClick={()=>setStatus(o.id,'active')}>✓</button>}
                        <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>removeOficina(o.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes */}
      {modal==='detalhes' && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-header">
              <h2>🔍 {selectedOf?.nome}</h2>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {!detalhes ? <div style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>Carregando...</div> : detalhes.erro ? <p style={{color:'var(--danger)'}}>Erro ao carregar detalhes</p> : (
                <>
                  {/* Uso do sistema */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
                    {[
                      {label:'Clientes',val:detalhes.uso.clientes,icon:'👥'},
                      {label:'Veículos',val:detalhes.uso.veiculos,icon:'🚗'},
                      {label:'OS total',val:detalhes.uso.os,icon:'🔧'},
                      {label:'OS este mês',val:detalhes.uso.osMes,icon:'📅'},
                      {label:'Faturamento',val:fmt.currency(detalhes.uso.faturamento),icon:'💰',small:true},
                    ].map(item=>(
                      <div key={item.label} style={{background:'var(--gray-50)',borderRadius:'var(--r-sm)',padding:'12px 10px',textAlign:'center'}}>
                        <div style={{fontSize:20,marginBottom:4}}>{item.icon}</div>
                        <div style={{fontFamily:'Poppins,sans-serif',fontSize:item.small?13:18,fontWeight:800,color:'var(--gray-900)'}}>{item.val}</div>
                        <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2}}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Dados da oficina */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                    {[
                      {l:'Email',v:detalhes.oficina.email},
                      {l:'Telefone',v:detalhes.oficina.telefone||'—'},
                      {l:'CNPJ/CPF',v:detalhes.oficina.observacoes||'—'},
                      {l:'Endereço',v:detalhes.oficina.endereco||'—'},
                      {l:'Plano',v:detalhes.oficina.plano},
                      {l:'Vencimento',v:fmt.date(detalhes.oficina.data_vencimento)},
                      {l:'Status',v:<span className={`badge ${STATUS_CLASS[detalhes.oficina.status_assinatura]}`}>{STATUS_LABEL[detalhes.oficina.status_assinatura]}</span>},
                      {l:'Cadastro',v:fmt.date(detalhes.oficina.data_criacao)},
                    ].map(item=>(
                      <div key={item.l}><div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:2}}>{item.l}</div><div style={{fontSize:13.5,color:'var(--gray-800)'}}>{item.v}</div></div>
                    ))}
                  </div>
                  {detalhes.oficina.logo && (
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Logo</div>
                      <img src={detalhes.oficina.logo} alt="Logo" style={{maxHeight:60,maxWidth:180,objectFit:'contain',borderRadius:6,border:'1px solid var(--gray-200)',padding:4}} />
                    </div>
                  )}

                  {/* Usuários */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Usuários ({detalhes.usuarios.length})</div>
                    {detalhes.usuarios.length ? detalhes.usuarios.map(u=>(
                      <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:'var(--gray-800)'}}>{u.nome}</div>
                          <div style={{fontSize:11.5,color:'var(--gray-400)'}}>{u.email} · {u.perfil}</div>
                        </div>
                        <div style={{fontSize:11,color:'var(--gray-400)'}}>
                          {u.ultimo_acesso ? `Último acesso: ${fmt.date(u.ultimo_acesso?.split('T')[0])}` : 'Nunca acessou'}
                        </div>
                      </div>
                    )) : <p style={{fontSize:13,color:'var(--gray-400)'}}>Nenhum usuário cadastrado</p>}
                  </div>

                  {/* Últimos pagamentos */}
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Últimos pagamentos</div>
                    {detalhes.pagamentos.length ? detalhes.pagamentos.map(p=>(
                      <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--gray-100)',fontSize:13}}>
                        <span style={{color:'var(--gray-600)'}}>{fmt.date(p.data_pagamento)} · {p.forma_pagamento}</span>
                        <span style={{fontWeight:700,color:'var(--success)'}}>{fmt.currency(p.valor)}</span>
                      </div>
                    )) : <p style={{fontSize:13,color:'var(--gray-400)'}}>Nenhum pagamento registrado</p>}
                  </div>

                  <div className="form-actions" style={{marginTop:16}}>
                    <button className="btn btn-outline" onClick={()=>setModal(null)}>Fechar</button>
                    <button className="btn btn-success" onClick={()=>{setModal('pagamento');}}>💳 Registrar pagamento</button>
                    <button className="btn btn-primary" onClick={()=>{setForm({...detalhes.oficina});setEditing(detalhes.oficina.id);setModal('oficina');}}>✏️ Editar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Renovação em Lote */}
      {modal==='lote' && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header">
              <h2>🔄 Renovar {selected.size} oficina(s)</h2>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:13,color:'var(--gray-500)',marginBottom:16}}>
                As oficinas selecionadas serão ativadas com o novo vencimento.
              </p>
              <form onSubmit={renovarLote}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Novo vencimento *</label>
                    <input type="date" value={loteForm.novo_vencimento} onChange={e=>setLoteForm(f=>({...f,novo_vencimento:e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label>Valor do pagamento (R$)</label>
                    <input type="number" step="0.01" min="0" value={loteForm.valor} onChange={e=>setLoteForm(f=>({...f,valor:e.target.value}))} placeholder="0,00 (opcional)" />
                  </div>
                  <div className="form-group">
                    <label>Forma de pagamento</label>
                    <select value={loteForm.forma_pagamento} onChange={e=>setLoteForm(f=>({...f,forma_pagamento:e.target.value}))}>
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="transferencia">Transferência</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">🔄 Renovar todas</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Oficina */}
      {modal==='oficina' && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing?'Editar Oficina':'Nova Oficina'}</h2>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={saveOficina}>
                <div className="form-grid">
                  <div className="form-group"><label>Nome *</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} required autoFocus /></div>
                  <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required /></div>
                  <div className="form-group"><label>Responsável</label><input value={form.responsavel||''} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} /></div>
                  <div className="form-group"><label>Telefone</label><input value={form.telefone||''} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} /></div>
                  <div className="form-group"><label>CNPJ / CPF</label><input value={form.observacoes||''} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="00.000.000/0000-00" /></div>
                  <div className="form-group"><label>Endereço</label><input value={form.endereco||''} onChange={e=>setForm(f=>({...f,endereco:e.target.value}))} placeholder="Rua, número, bairro, cidade" /></div>
                  <div className="form-group full"><label>Logo (URL)</label><input value={form.logo||''} onChange={e=>setForm(f=>({...f,logo:e.target.value}))} placeholder="https://..." /></div>
                  <div className="form-group">
                    <label>Plano</label>
                    <select value={form.plano} onChange={e=>setForm(f=>({...f,plano:e.target.value}))}>
                      <option value="mensal">Mensal</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="anual">Anual</option>
                      <option value="trial">Trial</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Vencimento</label><input type="date" value={form.data_vencimento||''} onChange={e=>setForm(f=>({...f,data_vencimento:e.target.value}))} /></div>
                  <div className="form-group full"><label>Observações</label><textarea value={form.observacoes||''} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} /></div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Usuário */}
      {modal==='usuario' && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>Criar login — {selectedOf?.nome}</h2>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={saveUsuario}>
                <div className="form-grid">
                  <div className="form-group"><label>Nome *</label><input value={userForm.nome} onChange={e=>setUserForm(f=>({...f,nome:e.target.value}))} required autoFocus /></div>
                  <div className="form-group"><label>Email *</label><input type="email" value={userForm.email} onChange={e=>setUserForm(f=>({...f,email:e.target.value}))} required /></div>
                  <div className="form-group"><label>Senha *</label><input type="password" value={userForm.senha} onChange={e=>setUserForm(f=>({...f,senha:e.target.value}))} required /></div>
                  <div className="form-group">
                    <label>Perfil *</label>
                    <select value={userForm.perfil} onChange={e=>setUserForm(f=>({...f,perfil:e.target.value}))}>
                      <option value="funcionario">👷 Funcionário — sem acesso financeiro</option>
                      <option value="admin_oficina">👔 Gerente — acesso completo</option>
                    </select>
                    <small style={{fontSize:11,color:'var(--gray-400)',marginTop:4,display:'block'}}>
                      {userForm.perfil==='funcionario'
                        ? 'Pode criar OS e clientes, mas não vê valores financeiros.'
                        : 'Acesso total: financeiro, relatórios e configurações.'}
                    </small>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Criar login</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {modal==='pagamento' && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>Registrar pagamento — {selectedOf?.nome}</h2>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={savePagamento}>
                <div className="form-grid">
                  <div className="form-group"><label>Valor (R$) *</label><input type="number" step="0.01" min="0" value={pagForm.valor} onChange={e=>setPagForm(f=>({...f,valor:e.target.value}))} required autoFocus /></div>
                  <div className="form-group">
                    <label>Forma de pagamento</label>
                    <select value={pagForm.forma_pagamento} onChange={e=>setPagForm(f=>({...f,forma_pagamento:e.target.value}))}>
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="transferencia">Transferência</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Data do pagamento</label><input type="date" value={pagForm.data_pagamento} onChange={e=>setPagForm(f=>({...f,data_pagamento:e.target.value}))} /></div>
                  <div className="form-group"><label>Novo vencimento *</label><input type="date" value={pagForm.novo_vencimento} onChange={e=>setPagForm(f=>({...f,novo_vencimento:e.target.value}))} required /></div>
                  <div className="form-group full"><label>Observação</label><textarea value={pagForm.observacao} onChange={e=>setPagForm(f=>({...f,observacao:e.target.value}))} /></div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Registrar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Todos os usuários */}
      {pendentes.length > 0 && (
        <div className="card" style={{marginTop:24}}>
          <div className="card-header">
            <div className="card-title">👥 Todos os usuários ({pendentes.length})</div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Nome</th><th>Email</th><th>Oficina ID</th><th>Perfil</th><th>Ações</th></tr></thead>
              <tbody>
                {pendentes.map(u=>(
                  <tr key={u.id} style={{background: !u.oficina_id ? '#FFFBEB' : ''}}>
                    <td><strong>{u.nome}</strong></td>
                    <td style={{fontSize:12,color:'var(--gray-500)'}}>{u.email}</td>
                    <td>{u.oficina_id ? <span className="badge badge-blue">#{u.oficina_id}</span> : <span className="badge badge-yellow">Sem oficina</span>}</td>
                    <td><span className="badge badge-gray">{u.perfil}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        {u.oficina_id && (
                          <button className="btn btn-outline btn-sm" onClick={async()=>{
                            if(!window.confirm(`Desvincular ${u.nome} da oficina #${u.oficina_id}?`)) return;
                            try { await api.admin.usuarios.desvincular(u.id); loadPendentes(); showToast('Usuário desvinculado'); }
                            catch { showToast('Erro','error'); }
                          }}>🔗 Desvincular</button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={async()=>{
                          if(!window.confirm(`Deletar usuário ${u.nome} (${u.email})?`)) return;
                          try { await api.admin.usuarios.remove(u.id); loadPendentes(); showToast('Usuário deletado'); }
                          catch { showToast('Erro ao deletar','error'); }
                        }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
