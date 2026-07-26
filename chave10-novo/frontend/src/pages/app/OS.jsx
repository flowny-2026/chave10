import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { offlineManager, OPERATION_TYPES, useOfflineManager } from '../../utils/offlineManager';
import FotoUploader from '../../components/FotoUploader';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};
const STATUS_CLASS = { em_andamento:'badge-orange', finalizado:'badge-green' };
const STATUS_LABEL = { em_andamento:'Em andamento', finalizado:'Finalizado' };
const PECA_EMPTY = { nome:'', qtd:'1', valor_unit:'', cliente_fornece: false };

function novaPeca() { return { ...PECA_EMPTY, id: Date.now() }; }

function calcTotal(pecas, valor_mo) {
  const totalPecas = pecas.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
  return (parseFloat(valor_mo)||0) + totalPecas;
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

// Gera HTML para impressão/PDF
function gerarHTMLOS(os, clientes, veiculos, oficina) {
  const c = clientes.find(x=>x.id===os.cliente_id);
  const v = veiculos.find(x=>x.id===os.veiculo_id);
  const pecas = os.pecas_itens || [];
  const totalPecas = pecas.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
  const total = (parseFloat(os.valor_mo)||0) + totalPecas;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>OS #${String(os.id).padStart(4,'0')}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1E3A5F}
    .oficina-nome{font-size:20px;font-weight:800;color:#1E3A5F}
    .oficina-detalhe{font-size:11px;color:#6B7280;margin-top:2px}
    .os-num{font-size:20px;font-weight:700;color:#1E3A5F}
    .section{margin-bottom:20px}
    .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6B7280;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #E5E7EB}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}
    .field label{font-size:11px;color:#9CA3AF;display:block;margin-bottom:2px}
    .field span{font-size:13px;color:#1a1a1a}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{background:#F3F4F6;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6B7280}
    td{padding:8px 10px;border-bottom:1px solid #F3F4F6;font-size:13px}
    .total-row{display:flex;justify-content:space-between;padding:8px 10px;font-weight:700}
    .total-final{background:#1E3A5F;color:#fff;border-radius:6px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:8px}
    .total-final .val{font-size:20px;font-weight:800;color:#F97316}
    .status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${os.status==='finalizado'?'#f0fdf4':'#fff7ed'};color:${os.status==='finalizado'?'#16a34a':'#d97706'}}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;text-align:center;font-size:11px;color:#9CA3AF}
    @media print{body{padding:16px}}
  </style></head><body>
  <div class="header">
    <div>
      ${oficina?.logo
        ? `<img src="${oficina.logo}" style="max-height:70px;max-width:200px;object-fit:contain;margin-bottom:6px" alt="${oficina.nome||''}" />`
        : `<div class="oficina-nome">${oficina?.nome || 'Minha Oficina'}</div>`
      }
      ${oficina?.logo && oficina?.nome ? `<div class="oficina-nome" style="font-size:15px">${oficina.nome}</div>` : ''}
      ${oficina?.endereco   ? `<div class="oficina-detalhe">📍 ${oficina.endereco}</div>` : ''}
      ${oficina?.telefone   ? `<div class="oficina-detalhe">📞 ${oficina.telefone}</div>` : ''}
      ${oficina?.whatsapp   ? `<div class="oficina-detalhe">💬 WhatsApp: ${oficina.whatsapp}</div>` : ''}
      ${oficina?.email      ? `<div class="oficina-detalhe">✉ ${oficina.email}</div>` : ''}
      ${(oficina?.documento || oficina?.cnpj_cpf) ? `<div class="oficina-detalhe">CNPJ/CPF: ${oficina.documento || oficina.cnpj_cpf}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="os-num">OS #${String(os.id).padStart(4,'0')}</div>
      <div style="font-size:12px;color:#6B7280;margin-top:2px">Data: ${fmt.date(os.data)}</div>
      <div style="margin-top:4px"><span class="status">${STATUS_LABEL[os.status]||os.status}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="grid-2">
      <div class="field"><label>Nome</label><span>${c?.nome||'—'}</span></div>
      <div class="field"><label>Telefone</label><span>${c?.telefone||'—'}</span></div>
      <div class="field"><label>Email</label><span>${c?.email||'—'}</span></div>
      <div class="field"><label>Endereço</label><span>${c?.endereco||'—'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Veículo</div>
    <div class="grid-2">
      <div class="field"><label>Veículo</label><span>${v?`${v.marca} ${v.modelo}`:'—'}</span></div>
      <div class="field"><label>Placa</label><span>${v?.placa||'—'}</span></div>
      <div class="field"><label>Ano</label><span>${v?.ano||'—'}</span></div>
      <div class="field"><label>KM</label><span>${v?.km?parseInt(v.km).toLocaleString('pt-BR')+' km':'—'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Problema relatado</div>
    <p style="background:#F9FAFB;padding:10px 12px;border-radius:6px">${os.descricao||'—'}</p>
  </div>

  ${os.servicos?`<div class="section"><div class="section-title">Serviços realizados</div><p style="background:#F9FAFB;padding:10px 12px;border-radius:6px">${os.servicos}</p></div>`:''}

  <div class="section">
    <div class="section-title">Peças utilizadas</div>
    ${pecas.length ? `
    <table>
      <thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Valor unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>
        ${pecas.map(p=>`<tr><td>${p.nome||'—'}</td><td style="text-align:center">${p.qtd||1}</td><td style="text-align:right">${fmt.currency(p.valor_unit)}</td><td style="text-align:right">${fmt.currency((parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1))}</td></tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#9CA3AF;font-size:12px">Nenhuma peça registrada</p>'}
  </div>

  <div class="section">
    <div class="section-title">Valores</div>
    <div class="total-row"><span>Mão de obra</span><span>${fmt.currency(os.valor_mo)}</span></div>
    <div class="total-row"><span>Total peças</span><span>${fmt.currency(totalPecas)}</span></div>
    <div class="total-final"><span style="font-size:15px;font-weight:700">TOTAL</span><span class="val">${fmt.currency(total)}</span></div>
  </div>

  ${os.observacao?`<div class="section"><div class="section-title">Observações</div><p style="background:#F9FAFB;padding:10px 12px;border-radius:6px">${os.observacao}</p></div>`:''}

  <div class="footer">
    ${oficina?.nome||''}${oficina?.telefone?' · '+oficina.telefone:''}${oficina?.email?' · '+oficina.email:''}<br/>
    Documento gerado em ${new Date().toLocaleDateString('pt-BR')}
  </div>
  </body></html>`;
}

export default function AppOS() {
  const isFuncionario = (() => { try { return JSON.parse(localStorage.getItem('c10_user'))?.perfil === 'funcionario'; } catch { return false; } })();
  const [searchParams] = useSearchParams();
  const [osList, setOsList]     = useState([]);
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [search, setSearch]     = useState(() => searchParams.get('q') || '');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({ cliente_id:'', veiculo_id:'', descricao:'', servicos:'', pecas_itens:[novaPeca()], valor_mo:'', data:new Date().toISOString().split('T')[0], status:'em_andamento', observacao:'' });
  const [editing, setEditing]   = useState(null);
  const [viewing, setViewing]   = useState(null);
  const [toast, setToast]       = useState({ msg:'', type:'' });
  const [pagForm, setPagForm]   = useState({ os_id:null, forma:'', valor_total:0, parcelas:1, bandeira:'', taxa_maquininha:'', observacao:'' });
  const [pendingPhotos, setPendingPhotos] = useState([]); // fotos selecionadas antes de salvar

  // Handler para selecionar fotos no formulário (antes de salvar)
  function handlePendingPhotos(e) {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = 15 - pendingPhotos.length;
    const batch = Array.from(files).slice(0, Math.min(5, remaining));
    const newPhotos = batch.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingPhotos(prev => [...prev, ...newPhotos].slice(0, 15));
    e.target.value = '';
  }
  
  // Offline mode
  const { isOnline, pendingCount } = useOfflineManager();
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '', 'saving', 'saved'
  const autoSaveTimerRef = useRef(null);
  const DRAFT_ID = 'current_os';

  // Sincroniza search com query param quando a URL muda (ex: busca da topbar)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearch(q);
  }, [searchParams]);

  function showToast(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:''}),3000); }

  // Auto-save rascunho a cada 30 segundos
  const saveFormDraft = useCallback(() => {
    if (modal !== 'form') return;
    const hasContent = form.descricao || form.servicos || form.cliente_id || form.veiculo_id;
    if (!hasContent) return;
    
    setAutoSaveStatus('saving');
    offlineManager.saveDraft('os', { ...form, draftId: DRAFT_ID });
    
    setTimeout(() => {
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    }, 500);
  }, [form, modal]);

  // Auto-save quando form muda (debounced)
  useEffect(() => {
    if (modal !== 'form') return;
    
    // Limpa timer anterior
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Agenda novo save
    autoSaveTimerRef.current = setTimeout(() => {
      saveFormDraft();
    }, 30000); // 30 segundos
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [form, modal, saveFormDraft]);

  // Recupera rascunho ao abrir modal
  useEffect(() => {
    if (modal === 'form' && !editing) {
      const draft = offlineManager.getDraft('os', DRAFT_ID);
      if (draft && (draft.descricao || draft.servicos)) {
        const shouldRecover = window.confirm('Você tem um rascunho salvo. Deseja recuperá-lo?');
        if (shouldRecover) {
          setForm(draft);
          showToast('Rascunho recuperado!', 'success');
        } else {
          // Remove rascunho se usuário não quiser
          offlineManager.removeDraft('os', DRAFT_ID);
        }
      }
    }
  }, [modal, editing]);

  async function load(status) {
    try { const data = await api.app.os.list(status||undefined); setOsList(data); }
    catch { setOsList([]); }
  }

  useEffect(() => {
    Promise.all([api.app.clientes.list(), api.app.veiculos.list()])
      .then(([c,v])=>{ setClientes(c); setVeiculos(v); }).catch(()=>{});
    load();
  }, []);

  function openCreate() {
    setForm({ cliente_id:'', veiculo_id:'', descricao:'', servicos:'', pecas_itens:[novaPeca()], valor_mo:'', data:new Date().toISOString().split('T')[0], status:'em_andamento', observacao:'' });
    setEditing(null); setPendingPhotos([]); setModal('form');
  }

  function openEdit(os) {
    const pecas = os.pecas_itens && os.pecas_itens.length ? os.pecas_itens : [novaPeca()];
    setForm({ cliente_id:os.cliente_id||'', veiculo_id:os.veiculo_id||'', descricao:os.descricao||'', servicos:os.servicos||'', pecas_itens:pecas.map(p=>({...p,id:p.id||Date.now()})), valor_mo:os.valor_mo||'', data:os.data||new Date().toISOString().split('T')[0], status:os.status||'em_andamento', observacao:os.observacao||'' });
    setEditing(os.id); setModal('form');
  }

  function setPeca(id, field, val) { setForm(f=>({...f, pecas_itens: f.pecas_itens.map(p=>p.id===id?{...p,[field]:val}:p)})); }
  function addPeca() { setForm(f=>({...f, pecas_itens:[...f.pecas_itens, novaPeca()]})); }
  function removePeca(id) { setForm(f=>({...f, pecas_itens: f.pecas_itens.filter(p=>p.id!==id)})); }

  async function save(e) {
    e.preventDefault();
    if (!form.descricao.trim()) { showToast('Problema/descrição é obrigatório','error'); return; }
    
    try {
      const pecasValidas = form.pecas_itens.filter(p=>p.nome.trim());
      const totalPecas = pecasValidas.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
      const payload = { 
        ...form, 
        cliente_id:form.cliente_id||null, 
        veiculo_id:form.veiculo_id||null, 
        valor_mo:parseFloat(form.valor_mo)||0, 
        valor_pecas:totalPecas, 
        valor:(parseFloat(form.valor_mo)||0)+totalPecas, 
        pecas_itens:pecasValidas, 
        pecas: pecasValidas.map(p=>`${p.qtd}x ${p.nome} (${fmt.currency(p.valor_unit)})`).join('\n') 
      };
      
      if (isOnline) {
        // Online: envia normalmente
        let osId = editing;
        if (editing) {
          await api.app.os.update(editing, payload);
        } else {
          const res = await api.app.os.create(payload);
          osId = res.id;
        }
        
        // Upload de fotos pendentes (se houver)
        if (pendingPhotos.length > 0 && osId) {
          try {
            const { compressImages } = await import('../../utils/imageCompressor');
            // pendingPhotos já tem .file (File) — precisa comprimir antes
            const filesToCompress = pendingPhotos.map(p => p.file).filter(Boolean);
            if (filesToCompress.length > 0) {
              const compressed = await compressImages(filesToCompress);
              const validas = compressed.filter(c => !c.error);
              if (validas.length > 0) {
                const fotosPayload = validas.map(c => ({
                  imagem: c.dataUrl,
                  titulo: '',
                  descricao: '',
                  categoria: 'problema',
                }));
                await api.app.os.fotos.upload(osId, fotosPayload);
              }
            }
          } catch (fotoErr) {
            console.warn('Fotos não enviadas:', fotoErr);
            // Não falha a OS por causa das fotos
          }
        }
        
        // Remove rascunho após sucesso
        offlineManager.removeDraft('os', DRAFT_ID);
        setPendingPhotos([]);
        
        setModal(null); 
        load(statusFiltro); 
        showToast(editing?'OS atualizada!':'Ordem de serviço salva!');
      } else {
        // Offline: adiciona à fila
        const operationType = editing ? OPERATION_TYPES.UPDATE_OS : OPERATION_TYPES.CREATE_OS;
        const operationData = editing ? { id: editing, ...payload } : payload;
        
        offlineManager.addToQueue({
          type: operationType,
          data: operationData,
        });
        
        // Remove rascunho
        offlineManager.removeDraft('os', DRAFT_ID);
        
        setModal(null);
        showToast('Você está offline! OS salva e será enviada automaticamente quando voltar online.', 'info');
      }
    } catch (err) {
      // Se falhar mesmo online, adiciona à fila
      const pecasValidas = form.pecas_itens.filter(p=>p.nome.trim());
      const totalPecas = pecasValidas.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
      const payload = { 
        ...form, 
        cliente_id:form.cliente_id||null, 
        veiculo_id:form.veiculo_id||null, 
        valor_mo:parseFloat(form.valor_mo)||0, 
        valor_pecas:totalPecas, 
        valor:(parseFloat(form.valor_mo)||0)+totalPecas, 
        pecas_itens:pecasValidas, 
        pecas: pecasValidas.map(p=>`${p.qtd}x ${p.nome} (${fmt.currency(p.valor_unit)})`).join('\n') 
      };
      
      const operationType = editing ? OPERATION_TYPES.UPDATE_OS : OPERATION_TYPES.CREATE_OS;
      const operationData = editing ? { id: editing, ...payload } : payload;
      
      offlineManager.addToQueue({
        type: operationType,
        data: operationData,
      });
      
      setModal(null);
      showToast('Erro de conexão. OS salva localmente e será sincronizada automaticamente.', 'warning');
    }
  }

  async function finalizar(id) {
    // Abre modal de pagamento em vez de finalizar direto
    const os = osList.find(o => o.id === id);
    if (!os) return;
    const total = (parseFloat(os.valor_mo)||0) + (parseFloat(os.valor_pecas)||0) || parseFloat(os.valor||0);
    setPagForm({ os_id: id, forma: '', valor_total: total, parcelas: 1, bandeira: '', taxa_maquininha: '', observacao: '' });
    setModal('pagamento');
  }

  async function confirmarPagamento(e) {
    e.preventDefault();
    if (!pagForm.forma) { showToast('Selecione a forma de pagamento','error'); return; }
    try {
      const res = await api.app.os.pagamento(pagForm.os_id, pagForm);
      await load(statusFiltro);
      // Atualiza o viewing com o novo status para refletir imediatamente no modal
      setViewing(v => v ? { ...v, status: 'finalizado' } : v);
      // Volta para o modal de detalhes se estava aberto, senão fecha tudo
      setModal(prev => prev === 'pagamento' && viewing ? 'view' : null);
      const msg = pagForm.forma === 'credito' && pagForm.parcelas > 1
        ? `OS finalizada! ${pagForm.parcelas}x de ${fmt.currency(res.valor_parcela)} — Líquido: ${fmt.currency(res.valor_liquido)}`
        : `OS finalizada! Recebimento: ${fmt.currency(res.valor_liquido)}`;
      showToast(msg);
    } catch (err) { showToast(err.error||'Erro ao registrar pagamento','error'); }
  }

  const taxaCalculada = pagForm.taxa_maquininha && pagForm.valor_total
    ? pagForm.valor_total - (pagForm.valor_total * parseFloat(pagForm.taxa_maquininha) / 100)
    : pagForm.valor_total;
  async function reabrir(id) {
    await api.app.os.setStatus(id, 'em_andamento');
    await load(statusFiltro);
    // Atualiza viewing para refletir o novo status imediatamente no modal
    setViewing(v => v && v.id === id ? { ...v, status: 'em_andamento' } : v);
    showToast('OS reaberta');
  }
  async function remove(id) {
    if (!window.confirm('Deseja excluir esta ordem de serviço?')) return;
    await api.app.os.remove(id); load(statusFiltro); showToast('OS excluída');
  }

  async function imprimir(os) {
    // Busca dados atualizados da oficina da API
    let oficina = (() => { try { return JSON.parse(localStorage.getItem('c10_oficina'))||{}; } catch { return {}; } })();
    try {
      const config = await api.app.config.get();
      if (config) {
        oficina = { ...config, cnpj_cpf: config.documento || oficina.cnpj_cpf };
        localStorage.setItem('c10_oficina', JSON.stringify(oficina));
      }
    } catch { /* usa o cache local */ }
    const html = gerarHTMLOS(os, clientes, veiculos, oficina);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  function enviarWhatsApp(os) {
    const c = clientes.find(x=>x.id===os.cliente_id);
    if (!c?.telefone) { showToast('Cliente sem telefone','error'); return; }
    const pecas = os.pecas_itens || [];
    const totalPecas = pecas.reduce((s,p)=>s+(parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1),0);
    const total = (parseFloat(os.valor_mo)||0)+totalPecas;
    const v = veiculos.find(x=>x.id===os.veiculo_id);
    const oficina = (() => { try { return JSON.parse(localStorage.getItem('c10_oficina'))||{}; } catch { return {}; } })();
    let msg = `*OS #${String(os.id).padStart(4,'0')} — ${oficina.nome||'Chave 10'}*\n`;
    msg += `Data: ${fmt.date(os.data)}\n`;
    msg += `Veículo: ${v?`${v.marca} ${v.modelo} — ${v.placa}`:'—'}\n\n`;
    msg += `*Problema:* ${os.descricao}\n`;
    if (os.servicos) msg += `*Serviços:* ${os.servicos}\n`;
    if (pecas.length) {
      msg += `\n*Peças utilizadas:*\n`;
      pecas.filter(p=>p.nome).forEach(p=>{ msg += `• ${p.qtd}x ${p.nome} — ${fmt.currency((parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1))}\n`; });
    }
    msg += `\n*Mão de obra:* ${fmt.currency(os.valor_mo)}`;
    msg += `\n*Total peças:* ${fmt.currency(totalPecas)}`;
    msg += `\n*TOTAL: ${fmt.currency(total)}*`;
    const tel = c.telefone.replace(/\D/g,'');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function openView(os) {
    setViewing(os);
    setModal('ver');
    // Carrega pagamentos e fotos da OS
    api.app.os.pagamentos(os.id).then(data => setViewPagamentos(data||[])).catch(()=>setViewPagamentos([]));
    api.app.os.fotos.list(os.id).then(data => setViewFotos(data||[])).catch(()=>setViewFotos([]));
  }
  const [viewPagamentos, setViewPagamentos] = useState([]);
  const [viewFotos, setViewFotos] = useState([]);

  const veiculosFiltrados = form.cliente_id ? veiculos.filter(v=>String(v.cliente_id)===String(form.cliente_id)) : veiculos;
  const listaFiltrada = search
    ? osList.filter(o => {
        const q = search.toLowerCase().replace(/[-\s]/g, '');
        const placa = (o.placa || '').toLowerCase().replace(/[-\s]/g, '');
        return (
          (o.cliente_nome  || '').toLowerCase().includes(search.toLowerCase()) ||
          (o.veiculo_modelo|| '').toLowerCase().includes(search.toLowerCase()) ||
          (o.veiculo_marca || '').toLowerCase().includes(search.toLowerCase()) ||
          placa.includes(q) ||
          String(o.id).includes(search) ||
          (o.descricao     || '').toLowerCase().includes(search.toLowerCase())
        );
      })
    : osList;

  const totalForm = calcTotal(form.pecas_itens, form.valor_mo);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Ordens de Serviço</div><div className="page-subtitle">{listaFiltrada.length} ordem(ns)</div></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nova OS</button>
      </div>
      <div className="search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por cliente, veículo ou nº OS..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="dash-select" value={statusFiltro} onChange={e=>{setStatusFiltro(e.target.value);load(e.target.value);}}>
          <option value="">Todos</option>
          <option value="em_andamento">Em andamento</option>
          <option value="finalizado">Finalizados</option>
        </select>
      </div>
      <div className="card">
        {listaFiltrada.length ? (
          <>
          {/* Tabela desktop */}
          <div className="os-table-desktop">
            <div className="table-wrapper">
              <table>
                <thead><tr><th>OS</th><th>Data</th><th>Cliente</th><th>Veículo</th><th>Problema</th>{!isFuncionario&&<th>Total</th>}<th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {listaFiltrada.map(os => {
                    const total = parseFloat(os.valor_mo||0)+parseFloat(os.valor_pecas||0)||parseFloat(os.valor||0);
                    return (
                      <tr key={os.id}>
                        <td><strong style={{color:'var(--brand)'}}>#{String(os.id).padStart(4,'0')}</strong></td>
                        <td style={{color:'var(--gray-500)',fontSize:12}}>{fmt.date(os.data)}</td>
                        <td>{os.cliente_nome||'—'}</td>
                        <td><div>{os.veiculo_modelo||'—'}</div>{os.placa&&<small style={{color:'var(--gray-400)'}}>{os.placa}</small>}</td>
                        <td style={{maxWidth:180,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{os.descricao}</td>
                        {!isFuncionario&&<td><strong>{fmt.currency(total)}</strong></td>}
                        <td><span className={`badge ${STATUS_CLASS[os.status]||'badge-gray'}`}>{STATUS_LABEL[os.status]||os.status}</span></td>
                        <td>
                          <div style={{display:'flex',gap:4}}>
                            <button className="btn btn-outline btn-sm" onClick={()=>openView(os)}>👁️</button>
                            <button className="btn btn-outline btn-sm" onClick={()=>imprimir(os)} title="Imprimir">🖨️</button>
                            <button className="btn btn-outline btn-sm" onClick={()=>enviarWhatsApp(os)} title="WhatsApp">💬</button>
                            <button className="btn btn-outline btn-sm" onClick={()=>openEdit(os)}>✏️</button>
                            <button className="btn btn-outline btn-sm" onClick={()=>remove(os.id)}>🗑️</button>
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
            {listaFiltrada.map(os => {
              const total = parseFloat(os.valor_mo||0)+parseFloat(os.valor_pecas||0)||parseFloat(os.valor||0);
              return (
                <div key={os.id} className="os-card-mobile" onClick={()=>openView(os)}>
                  <div className="os-card-top">
                    <div className="os-card-num">#{String(os.id).padStart(4,'0')}</div>
                    <span className={`badge ${STATUS_CLASS[os.status]||'badge-gray'}`}>{STATUS_LABEL[os.status]||os.status}</span>
                  </div>
                  <div className="os-card-cliente">{os.cliente_nome||'Sem cliente'}</div>
                  <div className="os-card-info">
                    <span>{os.veiculo_modelo||'—'}{os.placa?` · ${os.placa}`:''}</span>
                    <span>{fmt.date(os.data)}</span>
                  </div>
                  <div className="os-card-desc">{os.descricao}</div>
                  <div className="os-card-bottom">
                    {!isFuncionario&&<span className="os-card-valor">{fmt.currency(total)}</span>}
                    <div className="os-card-actions">
                      <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();imprimir(os);}}>🖨️</button>
                      <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();openEdit(os);}}>✏️</button>
                      <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();enviarWhatsApp(os);}}>💬</button>
                      <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();remove(os.id);}}>🗑️</button>
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
          <div className="empty-state"><div className="empty-icon">📋</div><p>Nenhuma ordem encontrada</p><button className="btn btn-primary" onClick={openCreate}>Criar primeira OS</button></div>
        )}
      </div>

      {/* Modal Form */}
      {modal==='form' && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-header">
              <h2>{editing?`Editar OS #${String(editing).padStart(4,'0')}`:'Nova Ordem de Serviço'}</h2>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            
            {/* Alertas de status */}
            {!isOnline && (
              <div style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderBottom: '1px solid rgba(0,0,0,.1)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    Você está offline
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
                    A OS será salva localmente e sincronizada quando a conexão voltar
                  </div>
                </div>
              </div>
            )}
            
            {pendingCount > 0 && isOnline && (
              <div style={{
                background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderBottom: '1px solid rgba(0,0,0,.1)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{animation: 'spin 1s linear infinite'}}>
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    Sincronizando operações pendentes...
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
                    {pendingCount} operação{pendingCount > 1 ? 'ões' : ''} sendo processada{pendingCount > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}
            
            {/* Auto-save indicator */}
            {autoSaveStatus && (
              <div style={{
                background: autoSaveStatus === 'saved' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: '1px solid rgba(0,0,0,.1)',
              }}>
                {autoSaveStatus === 'saving' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{animation: 'spin 1s linear infinite'}}>
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Salvando rascunho...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Rascunho salvo</span>
                  </>
                )}
              </div>
            )}
            
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
                  <div className="form-group full"><label>Problema relatado *</label><textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descreva o problema..." required /></div>
                  <div className="form-group full"><label>Serviços realizados</label><textarea value={form.servicos} onChange={e=>setForm(f=>({...f,servicos:e.target.value}))} placeholder="Liste os serviços feitos..." /></div>
                </div>

                {/* Peças detalhadas */}
                {!isFuncionario && (
                <div style={{marginTop:16,marginBottom:16}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <label style={{fontWeight:700,fontSize:13,color:'var(--gray-700)'}}>🔩 Peças utilizadas</label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addPeca}>+ Adicionar peça</button>
                  </div>
                  <div style={{background:'var(--gray-50)',borderRadius:'var(--r-sm)',overflow:'hidden',border:'1px solid var(--gray-200)'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 70px 110px 30px',gap:0,padding:'6px 10px',background:'var(--gray-100)',fontSize:11,fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'.5px'}}>
                      <span>Descrição</span><span style={{textAlign:'center'}}>Qtd</span><span style={{textAlign:'right'}}>Valor unit.</span><span/>
                    </div>
                    {form.pecas_itens.map((p,i)=>(
                      <div key={p.id} style={{display:'grid',gridTemplateColumns:'1fr 70px 110px auto 30px',gap:4,padding:'6px 10px',borderTop:'1px solid var(--gray-200)',alignItems:'center'}}>
                        <input value={p.nome} onChange={e=>setPeca(p.id,'nome',e.target.value)} placeholder="Ex: Filtro de óleo Bosch" style={{padding:'6px 8px',fontSize:12}} />
                        <input type="number" min="1" value={p.qtd} onChange={e=>setPeca(p.id,'qtd',e.target.value)} style={{padding:'6px 8px',fontSize:12,textAlign:'center'}} />
                        <input type="number" step="0.01" min="0" value={p.cliente_fornece ? '0' : p.valor_unit} onChange={e=>setPeca(p.id,'valor_unit',e.target.value)} placeholder="0,00" style={{padding:'6px 8px',fontSize:12,textAlign:'right',opacity:p.cliente_fornece?0.4:1}} disabled={p.cliente_fornece} />
                        <label style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:'var(--gray-500)',whiteSpace:'nowrap',cursor:'pointer'}} title="Cliente fornece a peça">
                          <input type="checkbox" checked={!!p.cliente_fornece} onChange={e=>setPeca(p.id,'cliente_fornece',e.target.checked)} style={{width:14,height:14}} />
                          Peça do cliente
                        </label>
                        <button type="button" onClick={()=>removePeca(p.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}} disabled={form.pecas_itens.length===1}>×</button>
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
                  {!isFuncionario && (
                  <div className="form-group">
                    <label>Total geral</label>
                    <div style={{padding:'10px 13px',background:'var(--brand-light)',borderRadius:'var(--r-sm)',fontFamily:'Poppins,sans-serif',fontSize:16,fontWeight:800,color:'var(--brand)'}}>{fmt.currency(totalForm)}</div>
                  </div>
                  )}
                  <div className="form-group"><label>Data</label><input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} /></div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                      <option value="em_andamento">🔧 Em andamento</option>
                      <option value="finalizado">✅ Finalizado</option>
                    </select>
                  </div>
                  <div className="form-group full"><label>Observações</label><input value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))} placeholder="Observações adicionais..." /></div>
                </div>

                {/* Upload de fotos — disponível na criação e edição */}
                <div style={{ marginTop: 16, marginBottom: 16, padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 10, border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>
                      📷 Fotos {pendingPhotos.length > 0 && <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>({pendingPhotos.length} selecionada{pendingPhotos.length > 1 ? 's' : ''})</span>}
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
                      Tire fotos dos problemas encontrados para enviar ao cliente
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
                  {pendingPhotos.length >= 15 && (
                    <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6 }}>Limite de 15 fotos atingido</div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">💾 Salvar OS</button>
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
        const total = (parseFloat(viewing.valor_mo)||0)+totalPecas||parseFloat(viewing.valor||0);
        return (
          <div className="modal-overlay open">
            <div className="modal" style={{maxWidth:620}}>
              <div className="modal-header">
                <h2>OS #{String(viewing.id).padStart(4,'0')}</h2>
                <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="os-view-fields">
                  {[{l:'Cliente',v:viewing.cliente_nome||'—'},{l:'Veículo',v:(viewing.veiculo_marca?viewing.veiculo_marca+' ':'')+( viewing.veiculo_modelo||'—')},{l:'Placa',v:viewing.placa||'—'},{l:'Data',v:fmt.date(viewing.data)},{l:'Status',v:<span className={`badge ${STATUS_CLASS[viewing.status]||'badge-gray'}`}>{STATUS_LABEL[viewing.status]||viewing.status}</span>}].map(item=>(
                    <div key={item.l} className="os-view-field">
                      <div className="os-view-label">{item.l}</div>
                      <div className="os-view-value">{item.v}</div>
                    </div>
                  ))}
                </div>

                {[{t:'Problema relatado',v:viewing.descricao},{t:'Serviços realizados',v:viewing.servicos},{t:'Observação',v:viewing.observacao}].filter(s=>s.v).map(s=>(
                  <div key={s.t} style={{marginBottom:12}}>
                    <div className="os-view-label">{s.t}</div>
                    <div style={{fontSize:13.5,color:'var(--gray-700)',background:'var(--gray-50)',padding:'10px 12px',borderRadius:'var(--r-sm)',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{s.v}</div>
                  </div>
                ))}

                {/* Peças — cards no mobile em vez de tabela */}
                <div style={{marginBottom:12}}>
                  <div className="os-view-label">Peças utilizadas</div>
                  {pecas.filter(p=>p.nome).length ? (
                    <div className="os-view-pecas">
                      {pecas.filter(p=>p.nome).map((p,i)=>(
                        <div key={i} className="os-view-peca-item">
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:'var(--gray-800)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nome}</div>
                            <div style={{fontSize:12,color:'var(--gray-400)'}}>Qtd: {p.qtd||1}</div>
                          </div>
                          {!isFuncionario&&(
                            <div style={{textAlign:'right',flexShrink:0}}>
                              <div style={{fontSize:12,color:'var(--gray-400)'}}>{fmt.currency(p.valor_unit)} un.</div>
                              <div style={{fontSize:13,fontWeight:700,color:'var(--gray-800)'}}>{fmt.currency((parseFloat(p.valor_unit)||0)*(parseFloat(p.qtd)||1))}</div>
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
                  <div className="os-view-total-final">
                    <span>Total</span>
                    <span>{fmt.currency(total)}</span>
                  </div>
                </div>
                </>
                )}

                {/* Histórico de pagamento */}
                {viewPagamentos.length > 0 && (
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>💳 Pagamento registrado</div>
                    {viewPagamentos.map(pag => {
                      const formaLabel = {pix:'PIX',dinheiro:'Dinheiro',debito:'Débito',credito:'Crédito'}[pag.forma]||pag.forma;
                      return (
                        <div key={pag.id} style={{background:'var(--gray-50)',borderRadius:'var(--r-sm)',padding:'12px 14px',border:'1px solid var(--gray-200)',marginBottom:8}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                            <span style={{fontSize:13,fontWeight:700,color:'var(--gray-800)'}}>
                              {pag.forma==='pix'?'📱':pag.forma==='dinheiro'?'💵':'💳'} {formaLabel}
                              {pag.forma==='credito'&&pag.parcelas>1?` ${pag.parcelas}x`:''}
                              {pag.bandeira?` · ${pag.bandeira.charAt(0).toUpperCase()+pag.bandeira.slice(1)}`:''}
                            </span>
                            <span style={{fontSize:13,fontWeight:700,color:'var(--success)'}}>{fmt.currency(pag.valor_total)}</span>
                          </div>
                          {pag.taxa_maquininha > 0 && (
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--gray-500)'}}>
                              <span>Taxa {pag.taxa_maquininha}% → Líquido:</span>
                              <span style={{fontWeight:600,color:'var(--gray-700)'}}>{fmt.currency(pag.valor_liquido)}</span>
                            </div>
                          )}
                          {pag.forma==='credito'&&pag.parcelas>1&&(
                            <div style={{fontSize:12,color:'var(--gray-500)',marginTop:4}}>
                              {pag.parcelas}x de {fmt.currency(pag.valor_parcela)} (recebimento a cada 30 dias)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <FotoUploader
                  osId={viewing.id}
                  fotos={viewFotos}
                  onUpdate={() => api.app.os.fotos.list(viewing.id).then(data => setViewFotos(data||[])).catch(()=>{})}
                  disabled={viewing.status === 'finalizado'}
                />

                <div className="os-view-actions">
                  <button className="btn btn-outline" onClick={()=>setModal(null)}>Fechar</button>
                  <button className="btn btn-outline" onClick={()=>imprimir(viewing)}>🖨️ Imprimir</button>
                  <button className="btn btn-outline" onClick={()=>enviarWhatsApp(viewing)}>💬 WhatsApp</button>
                  <button className="btn btn-primary" onClick={()=>openEdit(viewing)}>✏️ Editar</button>
                  {viewing.status==='em_andamento'&&<button className="btn btn-success" onClick={()=>finalizar(viewing.id)}>✅ Finalizar</button>}
                  {viewing.status==='finalizado'&&<button className="btn btn-outline" onClick={()=>reabrir(viewing.id)}>↩ Reabrir</button>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <Toast msg={toast.msg} type={toast.type} />

      {/* Modal Pagamento */}
      {modal==='pagamento' && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header">
              <h2>💳 Dar baixa — Forma de pagamento</h2>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={confirmarPagamento}>
                {/* Valor total */}
                <div style={{background:'var(--brand-light)',borderRadius:'var(--r-sm)',padding:'14px 16px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--brand)'}}>Valor da OS</span>
                  <span style={{fontFamily:'Poppins,sans-serif',fontSize:22,fontWeight:800,color:'var(--brand)'}}>{fmt.currency(pagForm.valor_total)}</span>
                </div>

                {/* Formas de pagamento */}
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:700,color:'var(--gray-600)',marginBottom:8,display:'block'}}>Forma de pagamento *</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',gap:8}}>
                    {[
                      {v:'pix',icon:'📱',label:'PIX'},
                      {v:'dinheiro',icon:'💵',label:'Dinheiro'},
                      {v:'debito',icon:'💳',label:'Débito'},
                      {v:'credito',icon:'💳',label:'Crédito'},
                    ].map(f=>(
                      <button key={f.v} type="button" onClick={()=>setPagForm(p=>({...p,forma:f.v,parcelas:1,bandeira:'',taxa_maquininha:''}))}
                        style={{padding:'14px 12px',borderRadius:'var(--r-sm)',border:pagForm.forma===f.v?'2px solid var(--accent)':'2px solid var(--gray-200)',background:pagForm.forma===f.v?'#FFF7ED':'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:14,fontWeight:pagForm.forma===f.v?700:500,color:pagForm.forma===f.v?'var(--accent)':'var(--gray-700)',transition:'all .15s'}}>
                        <span style={{fontSize:20}}>{f.icon}</span>{f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opções de crédito */}
                {pagForm.forma==='credito' && (
                  <div style={{background:'var(--gray-50)',borderRadius:'var(--r-sm)',padding:16,marginBottom:16,border:'1px solid var(--gray-200)'}}>
                    <div className="form-grid" style={{gap:12}}>
                      <div className="form-group">
                        <label>Parcelas</label>
                        <select value={pagForm.parcelas} onChange={e=>setPagForm(p=>({...p,parcelas:parseInt(e.target.value)}))}>
                          {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                            <option key={n} value={n}>{n}x de {fmt.currency(pagForm.valor_total/n)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Bandeira</label>
                        <select value={pagForm.bandeira} onChange={e=>setPagForm(p=>({...p,bandeira:e.target.value}))}>
                          <option value="">Selecionar...</option>
                          <option value="visa">Visa</option>
                          <option value="mastercard">Mastercard</option>
                          <option value="elo">Elo</option>
                          <option value="amex">American Express</option>
                          <option value="hipercard">Hipercard</option>
                          <option value="outra">Outra</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Taxa da maquininha (%)</label>
                        <input type="number" step="0.01" min="0" max="99" placeholder="Ex: 3.5" value={pagForm.taxa_maquininha} onChange={e=>setPagForm(p=>({...p,taxa_maquininha:e.target.value}))} />
                      </div>
                    </div>
                    {pagForm.taxa_maquininha && parseFloat(pagForm.taxa_maquininha) > 0 && (
                      <div style={{marginTop:12,padding:'10px 12px',background:'#fff',borderRadius:'var(--r-sm)',border:'1px solid var(--gray-200)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--gray-500)',marginBottom:4}}>
                          <span>Taxa ({pagForm.taxa_maquininha}%)</span>
                          <span style={{color:'var(--danger)'}}>- {fmt.currency(pagForm.valor_total * parseFloat(pagForm.taxa_maquininha) / 100)}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700}}>
                          <span>Você recebe</span>
                          <span style={{color:'var(--success)'}}>{fmt.currency(taxaCalculada)}</span>
                        </div>
                        {pagForm.parcelas > 1 && (
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--gray-500)',marginTop:4}}>
                            <span>{pagForm.parcelas}x parcelas de</span>
                            <span>{fmt.currency(taxaCalculada / pagForm.parcelas)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Opções de débito */}
                {pagForm.forma==='debito' && (
                  <div style={{background:'var(--gray-50)',borderRadius:'var(--r-sm)',padding:16,marginBottom:16,border:'1px solid var(--gray-200)'}}>
                    <div className="form-grid" style={{gap:12}}>
                      <div className="form-group">
                        <label>Bandeira</label>
                        <select value={pagForm.bandeira} onChange={e=>setPagForm(p=>({...p,bandeira:e.target.value}))}>
                          <option value="">Selecionar...</option>
                          <option value="visa">Visa</option>
                          <option value="mastercard">Mastercard</option>
                          <option value="elo">Elo</option>
                          <option value="outra">Outra</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Taxa da maquininha (%)</label>
                        <input type="number" step="0.01" min="0" max="99" placeholder="Ex: 1.5" value={pagForm.taxa_maquininha} onChange={e=>setPagForm(p=>({...p,taxa_maquininha:e.target.value}))} />
                      </div>
                    </div>
                    {pagForm.taxa_maquininha && parseFloat(pagForm.taxa_maquininha) > 0 && (
                      <div style={{marginTop:12,padding:'10px 12px',background:'#fff',borderRadius:'var(--r-sm)',border:'1px solid var(--gray-200)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--gray-500)',marginBottom:4}}>
                          <span>Taxa ({pagForm.taxa_maquininha}%)</span>
                          <span style={{color:'var(--danger)'}}>- {fmt.currency(pagForm.valor_total * parseFloat(pagForm.taxa_maquininha) / 100)}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700}}>
                          <span>Você recebe</span>
                          <span style={{color:'var(--success)'}}>{fmt.currency(taxaCalculada)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Observação */}
                <div className="form-group" style={{marginBottom:20}}>
                  <label>Observação (opcional)</label>
                  <input value={pagForm.observacao} onChange={e=>setPagForm(p=>({...p,observacao:e.target.value}))} placeholder="Ex: Cliente pagou com 2 cartões..." />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={!pagForm.forma}>✅ Confirmar pagamento e finalizar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
