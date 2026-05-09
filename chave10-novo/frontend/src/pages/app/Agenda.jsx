import React, { useEffect, useState } from 'react';
import { api } from '../../api';

const fmt = {
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};

const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const HORAS = Array.from({length:12},(_,i)=>i+7); // 7h às 18h

const EMPTY = { cliente_id:'', veiculo_id:'', titulo:'', data:'', hora:'', descricao:'' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

export default function AppAgenda() {
  const [eventos, setEventos]   = useState([]);
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [toast, setToast]       = useState({ msg:'', type:'' });

  function showToast(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:''}),3000); }

  const hoje = new Date();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay() + semanaOffset * 7);
  inicioSemana.setHours(0,0,0,0);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const diasSemana = Array.from({length:7},(_,i)=>{
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate()+i);
    return d;
  });

  async function load() {
    try {
      const data = await api.app.agenda.list();
      setEventos(Array.isArray(data)?data:[]);
    } catch { setEventos([]); }
  }

  useEffect(() => {
    load();
    api.app.clientes.list().then(setClientes).catch(()=>{});
    api.app.veiculos.list().then(setVeiculos).catch(()=>{});
  }, []);

  const eventosSemana = eventos.filter(e => {
    if (!e.data) return false;
    const d = new Date(e.data + 'T12:00:00');
    return d >= inicioSemana && d <= fimSemana;
  });

  function openCreate(data='', hora='') {
    setForm({ ...EMPTY, data: data || new Date().toISOString().split('T')[0], hora });
    setModal(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data) { showToast('Título e data são obrigatórios','error'); return; }
    try {
      await api.app.agenda.create({
        ...form,
        cliente_id: form.cliente_id || null,
        veiculo_id: form.veiculo_id || null,
      });
      setModal(false); load(); showToast('Agendamento salvo!');
    } catch { showToast('Erro ao salvar','error'); }
  }

  async function remove(id) {
    if (!window.confirm('Excluir este agendamento?')) return;
    await api.app.agenda.remove(id);
    load(); showToast('Agendamento excluído');
  }

  const veiculosCliente = form.cliente_id
    ? veiculos.filter(v => String(v.cliente_id) === String(form.cliente_id))
    : veiculos;

  // Conta eventos por dia para o resumo
  const eventosPorDia = diasSemana.map(d => {
    const ds = d.toISOString().split('T')[0];
    return eventosSemana.filter(e => e.data === ds);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Agenda</div>
          <div className="page-subtitle">
            {fmt.date(inicioSemana.toISOString().split('T')[0])} — {fmt.date(fimSemana.toISOString().split('T')[0])}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-outline btn-sm" onClick={()=>setSemanaOffset(o=>o-1)}>← Anterior</button>
          <button className="btn btn-outline btn-sm" onClick={()=>setSemanaOffset(0)}>Hoje</button>
          <button className="btn btn-outline btn-sm" onClick={()=>setSemanaOffset(o=>o+1)}>Próxima →</button>
          <button className="btn btn-primary" onClick={()=>openCreate()}>+ Agendar</button>
        </div>
      </div>

      {/* Grade semanal */}
      <div className="card" style={{padding:0,overflow:'hidden',marginBottom:20}}>
        <div className="agenda-grid">
          {/* Header */}
          <div className="agenda-header-cell" style={{background:'var(--gray-50)'}}>Hora</div>
          {diasSemana.map((d,i)=>{
            const isToday = d.toDateString() === hoje.toDateString();
            const qtd = eventosPorDia[i].length;
            return (
              <div key={i} className={`agenda-header-cell${isToday?' today':''}`}
                style={{cursor:'pointer'}} onClick={()=>openCreate(d.toISOString().split('T')[0])}>
                {DIAS[d.getDay()]}<br/>
                <strong style={{fontSize:16}}>{d.getDate()}</strong>
                {qtd > 0 && <div style={{fontSize:10,marginTop:2,background:'var(--accent)',color:'#fff',borderRadius:99,padding:'1px 6px',display:'inline-block'}}>{qtd}</div>}
              </div>
            );
          })}

          {/* Linhas de hora */}
          {HORAS.map(h=>(
            <React.Fragment key={h}>
              <div className="agenda-time-cell">{h}:00</div>
              {diasSemana.map((d,i)=>{
                const dateStr = d.toISOString().split('T')[0];
                const evs = eventosSemana.filter(e => {
                  if (e.data !== dateStr) return false;
                  if (!e.hora) return h === 8; // sem hora: coloca às 8h
                  const hEv = parseInt(e.hora.split(':')[0]);
                  return hEv === h;
                });
                return (
                  <div key={`${h}-${i}`} className="agenda-slot"
                    onClick={()=>openCreate(dateStr, `${String(h).padStart(2,'0')}:00`)}
                    style={{cursor:'pointer'}}>
                    {evs.map(ev=>(
                      <div key={ev.id} className="agenda-event orange"
                        onClick={e=>{e.stopPropagation();}}
                        title={`${ev.titulo}${ev.cliente_nome?' — '+ev.cliente_nome:''}`}
                        style={{cursor:'default',position:'relative'}}>
                        <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {ev.hora&&<strong>{ev.hora.substring(0,5)} </strong>}{ev.titulo}
                        </span>
                        <button onClick={e=>{e.stopPropagation();remove(ev.id);}}
                          style={{background:'none',border:'none',cursor:'pointer',color:'inherit',opacity:.7,padding:'0 2px',fontSize:13,lineHeight:1,flexShrink:0}}>×</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Lista de eventos da semana */}
      {eventosSemana.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">📋 Agendamentos desta semana</div></div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Data</th><th>Hora</th><th>Título</th><th>Cliente</th><th>Veículo</th><th></th></tr></thead>
              <tbody>
                {[...eventosSemana].sort((a,b)=>(a.data+a.hora)>(b.data+b.hora)?1:-1).map(ev=>(
                  <tr key={ev.id}>
                    <td>{fmt.date(ev.data)}</td>
                    <td>{ev.hora?.substring(0,5)||'—'}</td>
                    <td><strong>{ev.titulo}</strong>{ev.descricao&&<><br/><small style={{color:'var(--gray-400)'}}>{ev.descricao}</small></>}</td>
                    <td>{ev.cliente_nome||'—'}</td>
                    <td>{ev.veiculo_modelo||'—'}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={()=>remove(ev.id)}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>📅 Novo Agendamento</h2>
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Título *</label>
                    <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Ex: Revisão, Troca de óleo..." required autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Data *</label>
                    <input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label>Hora</label>
                    <input type="time" value={form.hora} onChange={e=>setForm(f=>({...f,hora:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Cliente</label>
                    <select value={form.cliente_id} onChange={e=>setForm(f=>({...f,cliente_id:e.target.value,veiculo_id:''}))}>
                      <option value="">Selecionar...</option>
                      {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Veículo</label>
                    <select value={form.veiculo_id} onChange={e=>setForm(f=>({...f,veiculo_id:e.target.value}))}>
                      <option value="">Selecionar...</option>
                      {veiculosCliente.map(v=><option key={v.id} value={v.id}>{v.marca} {v.modelo} — {v.placa}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Descrição</label>
                    <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Detalhes do agendamento..." rows={3} />
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
