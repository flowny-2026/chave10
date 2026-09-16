import { useEffect, useState } from 'react';
import { api } from '../../api';

const EMPTY = { veiculo_id:'', tipo:'oleo', descricao:'', data_previsao:'', km_previsao:'' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

const fmt = { date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; } };

export default function AppLembretes() {
  const [lembretes, setLembretes] = useState([]);
  const [veiculos, setVeiculos]   = useState([]);
  const [clientes, setClientes]   = useState([]);
  const [mostrarVistos, setMostrarVistos] = useState(false);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [editing, setEditing]     = useState(null);
  const [toast, setToast]         = useState({ msg:'', type:'' });

  function showToast(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:''}),3000); }

  async function load() {
    try {
      const [l,v,c] = await Promise.all([
        api.app.lembretes.list(),
        api.app.veiculos.list(),
        api.app.clientes.list(),
      ]);
      setLembretes(Array.isArray(l)?l:[]);
      setVeiculos(v); setClientes(c);
    } catch { setLembretes([]); }
  }

  useEffect(()=>{ load(); },[]);

  function openCreate() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(l) { setForm({ veiculo_id:l.veiculo_id||'', tipo:l.tipo||'oleo', descricao:l.descricao||'', data_previsao:l.data_previsao||'', km_previsao:l.km_previsao||'' }); setEditing(l.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    if (!form.veiculo_id || !form.descricao.trim()) { showToast('Veículo e descrição são obrigatórios','error'); return; }
    try {
      if (editing) await api.app.lembretes.update(editing, form);
      else await api.app.lembretes.create(form);
      setModal(false); load(); showToast('Lembrete salvo!');
    } catch { showToast('Erro ao salvar','error'); }
  }

  async function marcarVisto(id, visto) {
    await api.app.lembretes.update(id, { visto: visto ? 1 : 0 });
    load(); showToast(visto?'Marcado como visto':'Lembrete reativado');
  }

  async function remove(id) {
    if (!window.confirm('Deseja excluir este lembrete?')) return;
    await api.app.lembretes.remove(id);
    load(); showToast('Lembrete excluído');
  }

  function enviarWhatsApp(l) {
    const v = veiculos.find(v=>v.id===l.veiculo_id);
    const c = v ? clientes.find(c=>c.id===v.cliente_id) : null;
    if (!c?.telefone) { showToast('Cliente sem telefone cadastrado','error'); return; }
    const veiculo = v ? `${v.marca} ${v.modelo} (${v.placa})` : 'seu veículo';
    const tipoLabel = l.tipo==='oleo'?'Troca de óleo':l.tipo==='revisao'?'Revisão':'Manutenção';
    const msg = `Olá, ${c.nome.split(' ')[0]}! 👋\n\n🔧 *Lembrete de ${tipoLabel}*\n\nIdentificamos que o seu *${veiculo}* está com ${l.descricao.toLowerCase()}.\n${l.data_previsao?`\n📅 Data prevista: ${fmt.date(l.data_previsao)}`:''}${l.km_previsao?`\n🛣️ KM prevista: ${parseInt(l.km_previsao).toLocaleString('pt-BR')} km`:''}\n\nAgende agora e evite problemas maiores!`;
    const tel = c.telefone.replace(/\D/g,'');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  const hoje = new Date().toISOString().split('T')[0];
  const todos = [...lembretes].sort((a,b)=>(a.data_previsao||'9999')>(b.data_previsao||'9999')?1:-1);
  const lista = mostrarVistos ? todos : todos.filter(l=>!l.visto);
  const qtdVistos = todos.filter(l=>l.visto).length;

  const tipoIcon = t => t==='oleo'?'🛢️':t==='revisao'?'🔧':'📅';

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Lembretes de Manutenção</div>
          <div className="page-subtitle">{lista.length} lembrete(s) ativo(s){qtdVistos?` · ${qtdVistos} visto(s)`:''}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {qtdVistos>0 && <button className="btn btn-ghost btn-sm" onClick={()=>setMostrarVistos(v=>!v)}>{mostrarVistos?'🙈 Ocultar vistos':'👁️ Mostrar vistos'}</button>}
          <button className="btn btn-primary" onClick={openCreate}>+ Novo Lembrete</button>
        </div>
      </div>

      {lista.length ? lista.map(l=>{
        const v = veiculos.find(vv=>vv.id===l.veiculo_id);
        const c = v ? clientes.find(cc=>cc.id===v.cliente_id) : null;
        const vencido = l.data_previsao && l.data_previsao < hoje;
        return (
          <div key={l.id} className={`lembrete-card ${l.visto?'ok':vencido?'vencido':'ok'}`} style={l.visto?{opacity:.55}:{}}>
            <div className="lembrete-icon">{tipoIcon(l.tipo)}</div>
            <div className="lembrete-info">
              <div className="lembrete-title" style={l.visto?{textDecoration:'line-through',color:'var(--gray-400)'}:{}}>{l.descricao}</div>
              <div className="lembrete-sub">
                {v ? `${v.marca} ${v.modelo} — ${v.placa}` : 'Veículo não encontrado'}
                {c ? ` · ${c.nome}` : ''}
              </div>
              <div className="lembrete-sub" style={{marginTop:4}}>
                {l.data_previsao && `📅 ${fmt.date(l.data_previsao)}`}
                {l.km_previsao && ` · 🛣️ ${parseInt(l.km_previsao).toLocaleString('pt-BR')} km`}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
              {l.visto ? <span className="badge badge-gray">✓ Visto</span> : vencido ? <span className="badge badge-red">Vencido</span> : <span className="badge badge-green">OK</span>}
              {!l.visto
                ? <button className="btn btn-success btn-sm" onClick={()=>marcarVisto(l.id,true)}>✓ Visto</button>
                : <button className="btn btn-ghost btn-sm" onClick={()=>marcarVisto(l.id,false)}>↩ Reativar</button>}
              <button className="btn btn-outline btn-sm" onClick={()=>enviarWhatsApp(l)} disabled={!c?.telefone} style={!c?.telefone?{opacity:.4,cursor:'not-allowed'}:{}}>💬</button>
              <button className="btn btn-outline btn-sm" onClick={()=>openEdit(l)}>✏️</button>
              <button className="btn btn-outline btn-sm" onClick={()=>remove(l.id)}>🗑️</button>
            </div>
          </div>
        );
      }) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <p>{mostrarVistos?'Nenhum lembrete cadastrado':'Nenhum lembrete ativo'}</p>
            {!mostrarVistos && qtdVistos>0 && <p style={{fontSize:13,color:'var(--gray-400)',marginTop:4}}>{qtdVistos} lembrete(s) marcado(s) como visto</p>}
            <button className="btn btn-primary" style={{marginTop:12}} onClick={openCreate}>Criar lembrete</button>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing?'Editar Lembrete':'Novo Lembrete'}</h2>
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Veículo *</label>
                    <select value={form.veiculo_id} onChange={e=>setForm(f=>({...f,veiculo_id:e.target.value}))} required>
                      <option value="">Selecionar veículo...</option>
                      {veiculos.map(v=><option key={v.id} value={v.id}>{v.marca} {v.modelo} — {v.placa}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Tipo</label>
                    <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                      <option value="oleo">🛢️ Troca de óleo</option>
                      <option value="revisao">🔧 Revisão</option>
                      <option value="outro">📅 Outro</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Descrição *</label>
                    <input value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Ex: Próxima troca de óleo" required autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Data prevista</label>
                    <input type="date" value={form.data_previsao} onChange={e=>setForm(f=>({...f,data_previsao:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>KM prevista</label>
                    <input type="number" value={form.km_previsao} onChange={e=>setForm(f=>({...f,km_previsao:e.target.value}))} placeholder="Ex: 50000" />
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
