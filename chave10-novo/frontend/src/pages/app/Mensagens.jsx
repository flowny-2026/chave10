import { useEffect, useState, useRef } from 'react';
import { api } from '../../api';

const TEMPLATES = [
  { id:'orcamento',       label:'💰 Orçamento aprovado',      fn:(c,v)=>`Olá ${c}! Seu orçamento para o *${v}* foi aprovado. Pode trazer o veículo que já vamos iniciar o serviço. Qualquer dúvida estamos à disposição! 🔧` },
  { id:'os_pronta',       label:'✅ OS finalizada',            fn:(c,v,os)=>`Olá ${c}! Seu *${v}* está pronto para retirada.${os?` OS #${os} finalizada com sucesso.`:''} Aguardamos você! 😊` },
  { id:'revisao',         label:'🔔 Lembrete de revisão',      fn:(c,v)=>`Olá ${c}! Passando para lembrar que o *${v}* está próximo da revisão. Agende agora e evite problemas! 📅` },
  { id:'orcamento_envio', label:'📋 Enviar orçamento',         fn:(c,v)=>`Olá ${c}! Segue o orçamento para o *${v}*:\n\n📌 Serviços: [descreva aqui]\n💰 Valor total: R$ [valor]\n\nAguardo sua confirmação! 🔧` },
  { id:'agradecimento',   label:'⭐ Agradecimento',             fn:(c,v)=>`Olá ${c}! Obrigado por confiar em nossos serviços! Esperamos que o *${v}* esteja rodando perfeitamente. Qualquer problema, pode chamar! 😊` },
  { id:'cobranca',        label:'💳 Cobrança pendente',        fn:(c,v)=>`Olá ${c}! Identificamos um pagamento pendente referente ao serviço do *${v}*. Por favor, entre em contato para regularizar. Obrigado!` },
  { id:'personalizada',   label:'✏️ Mensagem personalizada',   fn:()=>`` },
];

function getHistorico() { try { return JSON.parse(localStorage.getItem('c10_msg_hist'))||[]; } catch { return []; } }
function addHistorico(item) {
  const list = getHistorico();
  item.id = Date.now();
  list.push(item);
  if (list.length > 100) list.splice(0, list.length-100);
  localStorage.setItem('c10_msg_hist', JSON.stringify(list));
}
function clearHistorico() { localStorage.removeItem('c10_msg_hist'); }

const fmt = { date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; } };

export default function AppMensagens() {
  const [clientes, setClientes]       = useState([]);
  const [veiculos, setVeiculos]       = useState([]);
  const [osList, setOsList]           = useState([]);
  const [historico, setHistorico]     = useState(getHistorico());
  const [search, setSearch]           = useState('');
  const [clienteSel, setClienteSel]   = useState(null);
  const [templateSel, setTemplateSel] = useState(null);
  const [veiculoSel, setVeiculoSel]   = useState('');
  const [osSel, setOsSel]             = useState('');
  const [texto, setTexto]             = useState('');
  const [toast, setToast]             = useState('');

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),3000); }

  useEffect(() => {
    api.app.clientes.list().then(setClientes).catch(()=>{});
    api.app.veiculos.list().then(setVeiculos).catch(()=>{});
    api.app.os.list().then(setOsList).catch(()=>{});
  }, []);

  // Atualiza texto quando muda template, cliente, veículo ou OS
  useEffect(() => {
    if (!templateSel) return;
    const t = TEMPLATES.find(t=>t.id===templateSel);
    if (!t) return;
    const c = clienteSel?.nome || 'cliente';
    const vObj = veiculos.find(v=>String(v.id)===String(veiculoSel));
    const v = vObj ? `${vObj.marca} ${vObj.modelo}` : 'seu veículo';
    const os = osSel || '';
    setTexto(t.fn(c, v, os));
  }, [templateSel, clienteSel, veiculoSel, osSel]);

  function selecionarCliente(c) {
    setClienteSel(c);
    setVeiculoSel('');
    setOsSel('');
  }

  function enviar() {
    if (!clienteSel) { showToast('Selecione um cliente'); return; }
    if (!texto.trim()) { showToast('Escreva uma mensagem'); return; }
    if (!clienteSel.telefone) { showToast('Cliente sem telefone cadastrado'); return; }
    const tel = clienteSel.telefone.replace(/\D/g,'');
    const telFull = tel.startsWith('55') ? tel : '55'+tel;
    window.open(`https://wa.me/${telFull}?text=${encodeURIComponent(texto)}`, '_blank');
    const agora = new Date();
    addHistorico({ clienteNome:clienteSel.nome, telefone:clienteSel.telefone, texto, data:agora.toISOString().split('T')[0], hora:agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) });
    setHistorico(getHistorico());
    showToast('WhatsApp aberto!');
  }

  const clientesFiltrados = search
    ? clientes.filter(c=>(c.nome||'').toLowerCase().includes(search.toLowerCase())||(c.telefone||'').includes(search))
    : clientes;

  const veiculosCliente = clienteSel ? veiculos.filter(v=>String(v.cliente_id)===String(clienteSel.id)) : [];
  const osCliente = clienteSel ? osList.filter(o=>String(o.cliente_id)===String(clienteSel.id)).slice(0,10) : [];
  const hoje = new Date().toISOString().split('T')[0];
  const enviadasHoje = historico.filter(h=>h.data===hoje).length;

  const WaIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Mensagens WhatsApp</div>
          <div className="page-subtitle">{enviadasHoje} mensagem(ns) enviada(s) hoje</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:20,alignItems:'start'}}>

        {/* PAINEL ESQUERDO */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Busca de cliente */}
          <div className="card">
            <div className="card-title" style={{marginBottom:14}}>👤 Selecionar cliente</div>
            <div className="search-input-wrap" style={{marginBottom:12}}>
              <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Buscar cliente..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:36}} />
            </div>
            <div style={{maxHeight:280,overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>
              {clientesFiltrados.length ? clientesFiltrados.map(c=>(
                <div key={c.id} onClick={()=>selecionarCliente(c)}
                  style={{padding:'10px 12px',borderRadius:8,cursor:'pointer',transition:'background .15s',border:`1.5px solid ${clienteSel?.id===c.id?'var(--brand)':'transparent'}`,background:clienteSel?.id===c.id?'var(--brand-light)':''}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:34,height:34,borderRadius:'50%',background:'var(--brand)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,flexShrink:0}}>{c.nome[0].toUpperCase()}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--gray-800)'}}>{c.nome}</div>
                      <div style={{fontSize:11.5,color:'var(--gray-400)'}}>{c.telefone||'Sem telefone'}</div>
                    </div>
                  </div>
                </div>
              )) : <div style={{textAlign:'center',padding:24,color:'var(--gray-400)',fontSize:13}}>Nenhum cliente cadastrado</div>}
            </div>
          </div>

          {/* Templates */}
          <div className="card">
            <div className="card-title" style={{marginBottom:14}}>📋 Templates de mensagem</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {TEMPLATES.map(t=>(
                <button key={t.id} onClick={()=>setTemplateSel(t.id)}
                  style={{textAlign:'left',padding:'10px 12px',borderRadius:8,border:`1.5px solid ${templateSel===t.id?'var(--brand)':'var(--gray-200)'}`,background:templateSel===t.id?'var(--brand-light)':'#fff',cursor:'pointer',fontSize:13,fontWeight:500,color:templateSel===t.id?'var(--brand)':'var(--gray-700)',transition:'all .15s'}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PAINEL DIREITO */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Composer */}
          <div className="card">
            <div className="card-title" style={{marginBottom:16}}>✍️ Compor mensagem</div>

            {/* Cliente selecionado */}
            {clienteSel && (
              <div style={{background:'var(--brand-light)',borderRadius:8,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:12,color:'var(--gray-500)',marginBottom:2}}>Enviando para:</div>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--brand)'}}>{clienteSel.nome}</div>
                  <div style={{fontSize:12,color:'var(--gray-500)'}}>{clienteSel.telefone||'Sem telefone cadastrado'}</div>
                </div>
                <button onClick={()=>{setClienteSel(null);setVeiculoSel('');setOsSel('');}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)',fontSize:18,padding:4}}>×</button>
              </div>
            )}

            <div className="form-group" style={{marginBottom:12}}>
              <label>Veículo (opcional)</label>
              <select value={veiculoSel} onChange={e=>setVeiculoSel(e.target.value)}>
                <option value="">Selecione um veículo...</option>
                {veiculosCliente.map(v=><option key={v.id} value={v.id}>{v.marca} {v.modelo} — {v.placa}</option>)}
              </select>
            </div>

            <div className="form-group" style={{marginBottom:14}}>
              <label>OS relacionada (opcional)</label>
              <select value={osSel} onChange={e=>setOsSel(e.target.value)}>
                <option value="">Nenhuma</option>
                {osCliente.map(o=><option key={o.id} value={String(o.id).padStart(4,'0')}>OS #{String(o.id).padStart(4,'0')} — {(o.descricao||'').substring(0,40)}</option>)}
              </select>
            </div>

            <div className="form-group" style={{marginBottom:16}}>
              <label>Mensagem</label>
              <textarea value={texto} onChange={e=>setTexto(e.target.value)} rows={6} placeholder="Selecione um cliente e um template, ou escreva sua mensagem..." style={{resize:'vertical',fontSize:13.5,lineHeight:1.6}} />
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:12,color:'var(--gray-400)'}}>{texto.length} caracteres</span>
              <button onClick={enviar} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'10px 18px',borderRadius:'var(--r-sm)',fontSize:13.5,fontWeight:600,cursor:'pointer',border:'none',background:'#25D366',color:'#fff',boxShadow:'0 2px 8px rgba(37,211,102,.3)'}}>
                <WaIcon /> Abrir no WhatsApp
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📨 Histórico de mensagens</div>
              {historico.length > 0 && (
                <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>{if(window.confirm('Limpar todo o histórico?')){clearHistorico();setHistorico([]);}}}>Limpar</button>
              )}
            </div>
            {historico.length ? (
              <div style={{display:'flex',flexDirection:'column',gap:0,maxHeight:320,overflowY:'auto'}}>
                {[...historico].reverse().map(h=>(
                  <div key={h.id} style={{padding:'12px 0',borderBottom:'1px solid var(--gray-100)',display:'flex',gap:12,alignItems:'flex-start'}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:'#25D366',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><WaIcon /></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:600,color:'var(--gray-800)'}}>{h.clienteNome}</span>
                        <span style={{fontSize:11,color:'var(--gray-400)'}}>{fmt.date(h.data)} {h.hora}</span>
                      </div>
                      <div style={{fontSize:12.5,color:'var(--gray-500)',whiteSpace:'pre-wrap',lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{h.texto}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{padding:28}}><div className="empty-icon">💬</div><p>Nenhuma mensagem enviada ainda</p></div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast show success" style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{toast}</div>}
    </div>
  );
}
