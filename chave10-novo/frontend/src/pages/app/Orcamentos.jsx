import { useEffect, useState } from 'react';
import { api } from '../../api';
import FotoUploader from '../../components/FotoUploader';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};

const STATUS_CLASS = { pendente:'badge-orange', aprovado:'badge-green', rejeitado:'badge-red' };
const STATUS_LABEL = { pendente:'Pendente', aprovado:'Aprovado', rejeitado:'Rejeitado' };
const PECA_EMPTY = { nome:'', qtd:'1', valor_unit:'', cliente_fornece: false };

function novaPeca() { return { ...PECA_EMPTY, id: Date.now() + Math.random() }; }

function calcTotal(pecas, valor_mo, desconto) {
  const totalPecas = pecas.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
  const subtotal = (parseFloat(valor_mo)||0) + totalPecas;
  return subtotal - (parseFloat(desconto)||0);
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

function gerarHTMLOrcamento(orc, clientes, veiculos, oficina) {
  const c = clientes.find(x=>x.id===orc.cliente_id);
  const v = veiculos.find(x=>x.id===orc.veiculo_id);
  const pecas = orc.pecas_itens || [];
  const totalPecas = pecas.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
  const subtotal = (parseFloat(orc.valor_mo)||0) + totalPecas;
  const total = subtotal - (parseFloat(orc.desconto)||0);
  // cnpj/cpf fica em observacoes quando salvo pelo admin, ou em cnpj_cpf se salvo pela config
  const docFiscal = oficina?.cnpj_cpf || oficina?.observacoes || '';

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Orçamento ${orc.numero||''}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1E3A5F}
    .oficina-info{display:flex;flex-direction:column;gap:2px}
    .oficina-nome{font-size:20px;font-weight:800;color:#1E3A5F}
    .oficina-detalhe{font-size:11px;color:#6B7280}
    .orc-num{font-size:20px;font-weight:700;color:#1E3A5F}
    .section{margin-bottom:20px}
    .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6B7280;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #E5E7EB}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}
    .field label{font-size:11px;color:#9CA3AF;display:block;margin-bottom:2px}
    .field span{font-size:13px;color:#1a1a1a}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{background:#F3F4F6;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6B7280}
    td{padding:8px 10px;border-bottom:1px solid #F3F4F6;font-size:13px}
    .total-row{display:flex;justify-content:space-between;padding:8px 10px;font-weight:500}
    .total-final{background:#1E3A5F;color:#fff;border-radius:6px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:8px}
    .total-final .val{font-size:20px;font-weight:800;color:#F97316}
    .status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;text-align:center;font-size:11px;color:#9CA3AF}
    @media print{body{padding:16px}}
  </style></head><body>
  <div class="header">
    <div class="oficina-info">
      ${oficina?.logo
        ? `<img src="${oficina.logo}" style="max-height:70px;max-width:200px;object-fit:contain;margin-bottom:6px" alt="${oficina.nome||''}" />`
        : `<div class="oficina-nome">${oficina?.nome || 'Chave 10'}</div>`
      }
      ${oficina?.logo && oficina?.nome ? `<div class="oficina-nome" style="font-size:15px">${oficina.nome}</div>` : ''}
      ${oficina?.endereco   ? `<div class="oficina-detalhe">📍 ${oficina.endereco}</div>` : ''}
      ${oficina?.telefone   ? `<div class="oficina-detalhe">📞 ${oficina.telefone}</div>` : ''}
      ${oficina?.whatsapp   ? `<div class="oficina-detalhe">💬 WhatsApp: ${oficina.whatsapp}</div>` : ''}
      ${oficina?.email      ? `<div class="oficina-detalhe">✉ ${oficina.email}</div>` : ''}
      ${docFiscal           ? `<div class="oficina-detalhe">CNPJ/CPF: ${docFiscal}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="orc-num">${orc.numero||'Orçamento'}</div>
      <div style="font-size:12px;color:#6B7280;margin-top:2px">${new Date().toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
      ${orc.validade?`<div style="font-size:12px;color:#6B7280;margin-top:2px">Válido até: ${fmt.date(orc.validade)}</div>`:''}
      <div style="margin-top:4px"><span class="status" style="background:${orc.status==='aprovado'?'#f0fdf4':orc.status==='rejeitado'?'#fef2f2':'#fff7ed'};color:${orc.status==='aprovado'?'#16a34a':orc.status==='rejeitado'?'#dc2626':'#d97706'}">${STATUS_LABEL[orc.status]||orc.status}</span></div>
    </div>
  </div>

  ${c?`<div class="section"><div class="section-title">Cliente</div><div class="grid-2">
    <div class="field"><label>Nome</label><span>${c.nome||'—'}</span></div>
    <div class="field"><label>Telefone</label><span>${c.telefone||'—'}</span></div>
    <div class="field"><label>Email</label><span>${c.email||'—'}</span></div>
    <div class="field"><label>Endereço</label><span>${c.endereco||'—'}</span></div>
  </div></div>`:''}

  ${v?`<div class="section"><div class="section-title">Veículo</div><div class="grid-2">
    <div class="field"><label>Veículo</label><span>${(v.marca||'')+' '+(v.modelo||'')}</span></div>
    <div class="field"><label>Placa</label><span>${v.placa||'—'}</span></div>
    <div class="field"><label>Ano</label><span>${v.ano||'—'}</span></div>
    ${v.km?`<div class="field"><label>KM</label><span>${v.km}</span></div>`:''}
  </div></div>`:''}

  ${orc.descricao?`<div class="section"><div class="section-title">Descrição / Problema</div><p style="background:#F9FAFB;padding:10px 12px;border-radius:6px">${orc.descricao}</p></div>`:''}
  ${orc.servicos?`<div class="section"><div class="section-title">Serviços</div><p style="background:#F9FAFB;padding:10px 12px;border-radius:6px">${orc.servicos}</p></div>`:''}

  <div class="section">
    <div class="section-title">Peças</div>
    ${pecas.length ? `
    <table>
      <thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Valor unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>
        ${pecas.map(p=>`<tr><td>${p.nome||'—'}</td><td style="text-align:center">${p.qtd||1}</td><td style="text-align:right">${fmt.currency(p.valor_unit)}</td><td style="text-align:right">${fmt.currency((parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1))}</td></tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#9CA3AF;font-size:12px">Nenhuma peça</p>'}
  </div>

  <div class="section">
    <div class="section-title">Valores</div>
    <div class="total-row"><span>Mão de obra</span><span>${fmt.currency(orc.valor_mo)}</span></div>
    <div class="total-row"><span>Total peças</span><span>${fmt.currency(totalPecas)}</span></div>
    ${(parseFloat(orc.desconto)||0)>0?`<div class="total-row" style="color:#dc2626"><span>Desconto</span><span>- ${fmt.currency(orc.desconto)}</span></div>`:''}
    <div class="total-final"><span style="font-size:15px;font-weight:700">TOTAL</span><span class="val">${fmt.currency(total)}</span></div>
  </div>

  ${orc.obs?`<div class="section"><div class="section-title">Observações</div><p style="background:#F9FAFB;padding:10px 12px;border-radius:6px">${orc.obs}</p></div>`:''}

  <div class="footer">
    ${oficina?.nome||''}${oficina?.telefone?' · '+oficina.telefone:''}${oficina?.email?' · '+oficina.email:''}<br/>
    Documento gerado em ${new Date().toLocaleDateString('pt-BR')}
  </div>
  </body></html>`;
}

export default function AppOrcamentos() {
  const isFuncionario = (() => { try { return JSON.parse(localStorage.getItem('c10_user'))?.perfil === 'funcionario'; } catch { return false; } })();
  const [lista, setLista]       = useState([]);
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [search, setSearch]     = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({ cliente_id:'', veiculo_id:'', descricao:'', servicos:'', pecas_itens:[novaPeca()], valor_mo:'', desconto:'', status:'pendente', validade:'', obs:'' });
  const [editing, setEditing]   = useState(null);
  const [viewing, setViewing]   = useState(null);
  const [viewFotos, setViewFotos] = useState([]);
  const [toast, setToast]       = useState({ msg:'', type:'' });
  const [pendingPhotos, setPendingPhotos] = useState([]);

  function openView(orc) {
    setViewing(orc);
    setModal('ver');
    setViewFotos([]);
    if (orc.os_id) {
      api.app.os.fotos.list(orc.os_id).then(data => setViewFotos(data||[])).catch(()=>setViewFotos([]));
    }
  }

  function handlePendingPhotos(e) {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = 15 - pendingPhotos.length;
    const batch = Array.from(files).slice(0, Math.min(5, remaining));
    const newPhotos = batch.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPendingPhotos(prev => [...prev, ...newPhotos].slice(0, 15));
    e.target.value = '';
  }

  function showToast(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:''}),3000); }

  async function load() {
    try { const data = await api.app.orcamentos.list(); setLista(data); }
    catch { setLista([]); }
  }

  useEffect(() => {
    Promise.all([api.app.clientes.list(), api.app.veiculos.list()])
      .then(([c,v])=>{ setClientes(c); setVeiculos(v); }).catch(()=>{});
    load();
  }, []);

  function openCreate() {
    setForm({ cliente_id:'', veiculo_id:'', descricao:'', servicos:'', pecas_itens:[novaPeca()], valor_mo:'', desconto:'', status:'pendente', validade:'', obs:'' });
    setEditing(null); setPendingPhotos([]); setModal('form');
  }

  function openEdit(orc) {
    const pecas = orc.pecas_itens && orc.pecas_itens.length ? orc.pecas_itens : [novaPeca()];
    setForm({
      cliente_id: orc.cliente_id||'',
      veiculo_id: orc.veiculo_id||'',
      descricao:  orc.descricao||'',
      servicos:   orc.servicos||'',
      pecas_itens: pecas.map(p=>({...p, id: p.id||Date.now()+Math.random()})),
      valor_mo:   orc.valor_mo||'',
      desconto:   orc.desconto||'',
      status:     orc.status||'pendente',
      validade:   orc.validade||'',
      obs:        orc.obs||'',
    });
    setEditing(orc.id); setModal('form');
  }

  function setPeca(id, field, val) { setForm(f=>({...f, pecas_itens: f.pecas_itens.map(p=>p.id===id?{...p,[field]:val}:p)})); }
  function addPeca() { setForm(f=>({...f, pecas_itens:[...f.pecas_itens, novaPeca()]})); }
  function removePeca(id) { setForm(f=>({...f, pecas_itens: f.pecas_itens.filter(p=>p.id!==id)})); }

  async function save(e) {
    e.preventDefault();
    try {
      const pecasValidas = form.pecas_itens.filter(p=>p.nome.trim());
      const payload = {
        ...form,
        cliente_id: form.cliente_id||null,
        veiculo_id: form.veiculo_id||null,
        valor_mo:   parseFloat(form.valor_mo)||0,
        desconto:   parseFloat(form.desconto)||0,
        pecas_itens: pecasValidas,
      };

      // Se tem fotos pendentes, cria a OS primeiro para hospedar as imagens
      let osIdCriado = null;
      if (pendingPhotos.length > 0) {
        try {
          const osRes = await api.app.os.create({
            descricao: form.descricao || 'Orçamento com fotos',
            cliente_id: form.cliente_id || null,
            veiculo_id: form.veiculo_id || null,
            valor_mo: 0,
          });
          if (osRes?.id) {
            osIdCriado = osRes.id;
            // Comprime e envia as fotos
            const { compressImages } = await import('../../utils/imageCompressor');
            const files = pendingPhotos.map(p => p.file).filter(Boolean);
            if (files.length > 0) {
              const compressed = await compressImages(files);
              const validas = compressed.filter(c => !c.error);
              if (validas.length > 0) {
                await api.app.os.fotos.upload(osRes.id, validas.map(c => ({
                  imagem: c.dataUrl,
                  titulo: '',
                  descricao: '',
                  categoria: 'problema',
                })));
              }
            }
          }
        } catch (fotoErr) {
          console.warn('Fotos do orçamento não enviadas:', fotoErr);
        }
      }

      // Inclui os_id no payload se a OS foi criada
      if (osIdCriado) {
        payload.os_id = osIdCriado;
        payload.interativo = true;
      }

      if (editing) {
        await api.app.orcamentos.update(editing, payload);
      } else {
        await api.app.orcamentos.create(payload);
      }

      setPendingPhotos([]);
      setModal(null); load(); showToast(editing?'Orçamento atualizado!':'Orçamento criado!');
    } catch (err) { showToast(err.error||'Erro ao salvar','error'); }
  }

  async function setStatus(id, status) {
    await api.app.orcamentos.setStatus(id, status);
    load();
    // Atualiza viewing imediatamente para refletir o novo status sem fechar o modal
    setViewing(v => v && v.id === id ? { ...v, status } : v);
    showToast('Status atualizado!');
  }

  async function remove(id) {
    if (!window.confirm('Deseja excluir este orçamento?')) return;
    await api.app.orcamentos.remove(id); load(); showToast('Orçamento excluído');
  }

  async function imprimir(orc) {
    // Busca dados atualizados da oficina da API (não depende só do localStorage)
    let oficina = (() => { try { return JSON.parse(localStorage.getItem('c10_oficina'))||{}; } catch { return {}; } })();
    try {
      const config = await api.app.config.get();
      if (config) {
        oficina = { ...config, cnpj_cpf: config.documento || oficina.cnpj_cpf };
        // Atualiza o cache local com os dados mais recentes
        localStorage.setItem('c10_oficina', JSON.stringify(oficina));
      }
    } catch { /* usa o cache local se a API falhar */ }
    const html = gerarHTMLOrcamento(orc, clientes, veiculos, oficina);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  async function enviarLinkAprovacao(orc) {
    const c = clientes.find(x => x.id === orc.cliente_id);
    if (!c?.telefone) { showToast('Cliente sem telefone cadastrado', 'error'); return; }

    try {
      showToast('Gerando link de aprovação...', 'info');
      // Gera o link via API de approval
      const res = await api.post(`/approval/orcamentos/${orc.id}/link`, {
        sendViaWhatsApp: false,
        validityHours: 168, // 7 dias
      });

      if (res.link) {
        // Monta mensagem do WhatsApp com o link
        const oficina = (() => { try { return JSON.parse(localStorage.getItem('c10_oficina')) || {}; } catch { return {}; } })();
        const pecas = orc.pecas_itens || [];
        const totalPecas = pecas.reduce((s, p) => s + (parseFloat(p.valor_unit) || 0) * (parseFloat(p.qtd) || 1), 0);
        const total = (parseFloat(orc.valor_mo) || 0) + totalPecas - (parseFloat(orc.desconto) || 0);

        let msg = `*${orc.numero || 'Orçamento'} — ${oficina.nome || 'Oficina'}*\n\n`;
        msg += `Olá ${c.nome}! 👋\n\n`;
        msg += `Seu orçamento está pronto para análise.\n`;
        msg += `*Valor total: ${fmt.currency(total)}*\n\n`;
        msg += `📋 Veja os detalhes completos e aprove online:\n`;
        msg += `${res.link}\n\n`;
        msg += `Válido por 7 dias. Qualquer dúvida estou à disposição!`;

        const tel = c.telefone.replace(/\D/g, '');
        window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
        showToast('Link gerado! WhatsApp aberto.', 'success');
      }
    } catch (err) {
      showToast(err.error || 'Erro ao gerar link de aprovação', 'error');
    }
  }

  function enviarWhatsApp(orc) {
    const c = clientes.find(x=>x.id===orc.cliente_id);
    if (!c?.telefone) { showToast('Cliente sem telefone','error'); return; }
    const pecas = orc.pecas_itens || [];
    const totalPecas = pecas.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
    const subtotal = (parseFloat(orc.valor_mo)||0)+totalPecas;
    const total = subtotal - (parseFloat(orc.desconto)||0);
    const v = veiculos.find(x=>x.id===orc.veiculo_id);
    const oficina = (() => { try { return JSON.parse(localStorage.getItem('c10_oficina'))||{}; } catch { return {}; } })();
    let msg = `*${orc.numero||'Orçamento'} — ${oficina.nome||'Chave 10'}*\n`;
    if (orc.validade) msg += `Válido até: ${fmt.date(orc.validade)}\n`;
    if (v) msg += `Veículo: ${v.marca} ${v.modelo} — ${v.placa}\n`;
    if (orc.descricao) msg += `\n*Descrição:* ${orc.descricao}\n`;
    if (orc.servicos) msg += `*Serviços:* ${orc.servicos}\n`;
    if (pecas.length) {
      msg += `\n*Peças:*\n`;
      pecas.filter(p=>p.nome).forEach(p=>{ msg += `• ${p.qtd||1}x ${p.nome} — ${fmt.currency((parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1))}\n`; });
    }
    msg += `\n*Mão de obra:* ${fmt.currency(orc.valor_mo)}`;
    msg += `\n*Total peças:* ${fmt.currency(totalPecas)}`;
    if ((parseFloat(orc.desconto)||0)>0) msg += `\n*Desconto:* - ${fmt.currency(orc.desconto)}`;
    msg += `\n*TOTAL: ${fmt.currency(total)}*`;
    const tel = c.telefone.replace(/\D/g,'');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  const veiculosFiltrados = form.cliente_id ? veiculos.filter(v=>String(v.cliente_id)===String(form.cliente_id)) : veiculos;
  const listaFiltrada = lista.filter(o => {
    const matchSearch = !search || (o.cliente_nome||'').toLowerCase().includes(search.toLowerCase()) || (o.numero||'').toLowerCase().includes(search.toLowerCase()) || (o.descricao||'').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFiltro || o.status === statusFiltro;
    return matchSearch && matchStatus;
  });

  const totalForm = calcTotal(form.pecas_itens, form.valor_mo, form.desconto);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Orçamentos</div><div className="page-subtitle">{listaFiltrada.length} orçamento(s)</div></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Novo Orçamento</button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por cliente, número ou descrição..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="dash-select" value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
        </select>
      </div>

      <div className="card">
        {listaFiltrada.length ? (
          <>
          {/* Tabela desktop */}
          <div className="os-table-desktop">
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Nº</th><th>Cliente</th><th>Veículo</th><th>Descrição</th>{!isFuncionario&&<th>Total</th>}<th>Validade</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {listaFiltrada.map(orc => {
                    const totalPecas = (orc.pecas_itens||[]).reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
                    const total = (parseFloat(orc.valor_mo)||0)+totalPecas-(parseFloat(orc.desconto)||0);
                    return (
                      <tr key={orc.id}>
                        <td><strong style={{color:'var(--brand)'}}>{orc.numero||`#${orc.id}`}</strong></td>
                        <td>{orc.cliente_nome||'—'}</td>
                        <td>{orc.veiculo_modelo||'—'}{orc.placa&&<small style={{display:'block',color:'var(--gray-400)'}}>{orc.placa}</small>}</td>
                        <td style={{maxWidth:180,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{orc.descricao||'—'}</td>
                        {!isFuncionario&&<td><strong>{fmt.currency(total)}</strong></td>}
                        <td style={{color:'var(--gray-500)',fontSize:12}}>{fmt.date(orc.validade)}</td>
                        <td><span className={`badge ${STATUS_CLASS[orc.status]||'badge-gray'}`}>{STATUS_LABEL[orc.status]||orc.status}</span></td>
                        <td>
                          <div style={{display:'flex',gap:4}}>
                            <button className="btn btn-outline btn-sm" onClick={()=>openView(orc)}>👁️</button>
                            <button className="btn btn-outline btn-sm" onClick={()=>imprimir(orc)} title="Imprimir">🖨️</button>
                            <button className="btn btn-outline btn-sm" onClick={()=>enviarWhatsApp(orc)} title="WhatsApp">💬</button>
                            <button className="btn btn-outline btn-sm" onClick={()=>openEdit(orc)}>✏️</button>
                            <button className="btn btn-outline btn-sm" onClick={()=>remove(orc.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards mobile */}
          <div className="os-cards-mobile">
            {listaFiltrada.map(orc => {
              const totalPecas = (orc.pecas_itens||[]).reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
              const total = (parseFloat(orc.valor_mo)||0)+totalPecas-(parseFloat(orc.desconto)||0);
              return (
                <div key={orc.id} className="os-card-mobile" onClick={()=>openView(orc)}>
                  <div className="os-card-top">
                    <div className="os-card-num">{orc.numero||`#${orc.id}`}</div>
                    <span className={`badge ${STATUS_CLASS[orc.status]||'badge-gray'}`}>{STATUS_LABEL[orc.status]||orc.status}</span>
                  </div>
                  <div className="os-card-cliente">{orc.cliente_nome||'Sem cliente'}</div>
                  <div className="os-card-info">
                    <span>{orc.veiculo_modelo||'—'}{orc.placa?` · ${orc.placa}`:''}</span>
                    <span>Val: {fmt.date(orc.validade)}</span>
                  </div>
                  {orc.descricao&&<div className="os-card-desc">{orc.descricao}</div>}
                  <div className="os-card-bottom">
                    {!isFuncionario&&<span className="os-card-valor">{fmt.currency(total)}</span>}
                    <div className="os-card-actions">
                      <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();imprimir(orc);}}>🖨️</button>
                      <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();openEdit(orc);}}>✏️</button>
                      <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();enviarWhatsApp(orc);}}>💬</button>
                      <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();remove(orc.id);}}>🗑️</button>
                    </div>
                  </div>
                  <div className="os-card-tap-hint">
                    <span>Toque para ver detalhes</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        ) : (
          <div className="empty-state"><div className="empty-icon">📄</div><p>Nenhum orçamento encontrado</p><button className="btn btn-primary" onClick={openCreate}>Criar primeiro orçamento</button></div>
        )}
      </div>

      {/* Modal Form */}
      {modal==='form' && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:700}}>
            <div className="modal-header">
              <h2>{editing?'Editar Orçamento':'Novo Orçamento'}</h2>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
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
                      {veiculosFiltrados.map(v=><option key={v.id} value={v.id}>{v.marca} {v.modelo} — {v.placa}</option>)}
                    </select>
                  </div>
                  <div className="form-group full"><label>Descrição / Problema</label><textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descreva o problema ou serviço solicitado..." /></div>
                  <div className="form-group full"><label>Serviços</label><textarea value={form.servicos} onChange={e=>setForm(f=>({...f,servicos:e.target.value}))} placeholder="Liste os serviços a realizar..." /></div>
                </div>

                {/* Peças */}
                {!isFuncionario && (
                <div style={{marginTop:16,marginBottom:16}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <label style={{fontWeight:700,fontSize:13,color:'var(--gray-700)'}}>🔩 Peças</label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addPeca}>+ Adicionar peça</button>
                  </div>
                  <div style={{background:'var(--gray-50)',borderRadius:'var(--r-sm)',overflow:'hidden',border:'1px solid var(--gray-200)'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 60px 100px auto 28px',gap:0,padding:'6px 10px',background:'var(--gray-100)',fontSize:11,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.5px'}}>
                      <span>Descrição</span><span style={{textAlign:'center'}}>Qtd</span><span style={{textAlign:'right'}}>Valor</span><span></span><span/>
                    </div>
                    {form.pecas_itens.map((p)=>(
                      <div key={p.id} style={{display:'grid',gridTemplateColumns:'1fr 60px 100px auto 28px',gap:4,padding:'6px 10px',borderTop:'1px solid var(--gray-200)',alignItems:'center'}}>
                        <input
                          value={p.nome}
                          onChange={e=>setPeca(p.id,'nome',e.target.value)}
                          placeholder="Ex: Filtro de óleo Bosch"
                          style={{padding:'6px 8px',fontSize:12}}
                        />
                        <input
                          type="number"
                          min="1"
                          value={p.qtd}
                          onChange={e=>setPeca(p.id,'qtd',e.target.value)}
                          style={{padding:'6px 8px',fontSize:12,textAlign:'center'}}
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={p.cliente_fornece ? '0' : p.valor_unit}
                          onChange={e=>setPeca(p.id,'valor_unit',e.target.value)}
                          placeholder="0,00"
                          style={{padding:'6px 8px',fontSize:12,textAlign:'right',opacity:p.cliente_fornece?0.4:1}}
                          disabled={p.cliente_fornece}
                        />
                        <label style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:'var(--gray-500)',whiteSpace:'nowrap',cursor:'pointer'}} title="Cliente fornece a peça (só mão de obra)">
                          <input type="checkbox" checked={!!p.cliente_fornece} onChange={e=>setPeca(p.id,'cliente_fornece',e.target.checked)} style={{width:13,height:13}} />
                          <span>Peça do cliente</span>
                        </label>
                        <button
                          type="button"
                          onClick={()=>removePeca(p.id)}
                          style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}
                          disabled={form.pecas_itens.length===1}
                        >×</button>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'flex-end',padding:'8px 10px',borderTop:'1px solid var(--gray-200)',fontSize:12,fontWeight:600,color:'var(--gray-600)'}}>
                      Total peças: <strong style={{marginLeft:8,color:'var(--gray-900)'}}>{fmt.currency(form.pecas_itens.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0))}</strong>
                    </div>
                  </div>
                </div>
                )}

                <div className="form-grid">
                  {!isFuncionario && <div className="form-group"><label>Mão de obra (R$)</label><input type="number" step="0.01" min="0" value={form.valor_mo} onChange={e=>setForm(f=>({...f,valor_mo:e.target.value}))} placeholder="0,00" /></div>}
                  {!isFuncionario && <div className="form-group"><label>Desconto (R$)</label><input type="number" step="0.01" min="0" value={form.desconto} onChange={e=>setForm(f=>({...f,desconto:e.target.value}))} placeholder="0,00" /></div>}
                  {!isFuncionario && (
                  <div className="form-group">
                    <label>Total geral</label>
                    <div style={{padding:'10px 13px',background:'var(--brand-light)',borderRadius:'var(--r-sm)',fontFamily:'Poppins,sans-serif',fontSize:16,fontWeight:800,color:'var(--brand)'}}>{fmt.currency(totalForm)}</div>
                  </div>
                  )}
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                      <option value="pendente">⏳ Pendente</option>
                      <option value="aprovado">✅ Aprovado</option>
                      <option value="rejeitado">❌ Rejeitado</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Validade</label><input type="date" value={form.validade} onChange={e=>setForm(f=>({...f,validade:e.target.value}))} /></div>
                  <div className="form-group full"><label>Observações</label><input value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} placeholder="Observações adicionais..." /></div>
                </div>

                {/* Upload de fotos — serão vinculadas à OS do orçamento */}
                <div style={{ marginTop: 16, marginBottom: 16, padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 10, border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>
                      📷 Fotos dos problemas {pendingPhotos.length > 0 && <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>({pendingPhotos.length} selecionada{pendingPhotos.length > 1 ? 's' : ''})</span>}
                    </div>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                      background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600,
                    }}>
                      + Adicionar
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handlePendingPhotos}
                      />
                    </label>
                  </div>
                  {pendingPhotos.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '8px 0' }}>
                      Tire fotos claras dos problemas para enviar ao cliente — aumenta a taxa de aprovação!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {pendingPhotos.map((p, i) => (
                        <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
                          <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={() => setPendingPhotos(f => f.filter((_, j) => j !== i))} style={{
                            position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
                            background: 'rgba(220,38,38,.85)', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">💾 Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver */}
      {modal==='ver' && viewing && (()=>{
        const pecas = viewing.pecas_itens || [];
        const totalPecas = pecas.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
        const subtotal = (parseFloat(viewing.valor_mo)||0)+totalPecas;
        const total = subtotal - (parseFloat(viewing.desconto)||0);
        return (
          <div className="modal-overlay open">
            <div className="modal" style={{maxWidth:620}}>
              <div className="modal-header">
                <h2>{viewing.numero||'Orçamento'}</h2>
                <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="os-view-fields">
                  {[
                    {l:'Cliente',v:viewing.cliente_nome||'—'},
                    {l:'Veículo',v:viewing.veiculo_modelo||'—'},
                    {l:'Placa',v:viewing.placa||'—'},
                    {l:'Validade',v:fmt.date(viewing.validade)},
                    {l:'Status',v:<span className={`badge ${STATUS_CLASS[viewing.status]||'badge-gray'}`}>{STATUS_LABEL[viewing.status]||viewing.status}</span>},
                  ].map(item=>(
                    <div key={item.l} className="os-view-field">
                      <div className="os-view-label">{item.l}</div>
                      <div className="os-view-value">{item.v}</div>
                    </div>
                  ))}
                </div>

                {[{t:'Descrição / Problema',v:viewing.descricao},{t:'Serviços',v:viewing.servicos},{t:'Observações',v:viewing.obs}].filter(s=>s.v).map(s=>(
                  <div key={s.t} style={{marginBottom:12}}>
                    <div className="os-view-label">{s.t}</div>
                    <div className="os-view-text-block">{s.v}</div>
                  </div>
                ))}

                <div style={{marginBottom:12}}>
                  <div className="os-view-label">Peças</div>
                  {pecas.filter(p=>p.nome).length ? (
                    <div className="os-view-pecas">
                      {pecas.filter(p=>p.nome).map((p,i)=>(
                        <div key={i} className="os-view-peca-item">
                          <div style={{flex:1,minWidth:0}}>
                            <div className="os-view-peca-nome">{p.nome}</div>
                            <div className="os-view-peca-qtd">Qtd: {p.qtd||1}</div>
                          </div>
                          {!isFuncionario&&(
                            <div style={{textAlign:'right',flexShrink:0}}>
                              <div className="os-view-peca-qtd">{fmt.currency(p.valor_unit)} un.</div>
                              <div className="os-view-peca-total">{fmt.currency((parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1))}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : <p style={{fontSize:13,color:'var(--gray-400)'}}>Nenhuma peça registrada</p>}
                </div>

                {!isFuncionario && (
                <>
                <div className="os-view-totais">
                  <div className="os-view-total-item">
                    <span>Mão de obra</span>
                    <span>{fmt.currency(viewing.valor_mo)}</span>
                  </div>
                  <div className="os-view-total-item">
                    <span>Total peças</span>
                    <span>{fmt.currency(totalPecas)}</span>
                  </div>
                  {(parseFloat(viewing.desconto)||0)>0 && (
                    <div className="os-view-total-item" style={{color:'var(--danger)'}}>
                      <span>Desconto</span>
                      <span>- {fmt.currency(viewing.desconto)}</span>
                    </div>
                  )}
                  <div className="os-view-total-final">
                    <span>Total</span>
                    <span>{fmt.currency(total)}</span>
                  </div>
                </div>
                </>
                )}

                {viewing.os_id ? (
                  <FotoUploader
                    osId={viewing.os_id}
                    fotos={viewFotos}
                    onUpdate={() => api.app.os.fotos.list(viewing.os_id).then(data => setViewFotos(data||[])).catch(()=>{})}
                    disabled={viewing.status === 'aprovado' || viewing.status === 'rejeitado'}
                  />
                ) : (
                  <div style={{marginTop:16,padding:'16px',background:'var(--gray-50)',borderRadius:10,border:'2px dashed var(--gray-200)',textAlign:'center'}}>
                    <div style={{fontSize:24,marginBottom:6}}>📷</div>
                    <div style={{fontSize:12,color:'var(--gray-500)'}}>Nenhuma foto vinculada a este orçamento</div>
                    <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>Ao criar o orçamento, adicione fotos para que apareçam aqui e no link de aprovação</div>
                  </div>
                )}

                <div className="os-view-actions">
                  <button className="btn btn-outline" onClick={()=>setModal(null)}>Fechar</button>
                  <button className="btn btn-outline" onClick={()=>imprimir(viewing)}>🖨️ Imprimir</button>
                  <button className="btn btn-outline" onClick={()=>enviarWhatsApp(viewing)}>💬 WhatsApp</button>
                  <button className="btn btn-outline" style={{background:'#25D366',color:'#fff',borderColor:'#25D366'}} onClick={()=>enviarLinkAprovacao(viewing)}>🔗 Link de Aprovação</button>
                  <button className="btn btn-primary" onClick={()=>openEdit(viewing)}>✏️ Editar</button>
                  {viewing.status==='pendente'&&<button className="btn btn-success" onClick={()=>setStatus(viewing.id,'aprovado')}>✅ Aprovar</button>}
                  {viewing.status==='pendente'&&<button className="btn btn-outline" style={{color:'var(--danger)',borderColor:'var(--danger)'}} onClick={()=>setStatus(viewing.id,'rejeitado')}>❌ Rejeitar</button>}
                  {viewing.status!=='pendente'&&<button className="btn btn-outline" onClick={()=>setStatus(viewing.id,'pendente')}>↩ Reabrir</button>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
