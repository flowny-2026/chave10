import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api';
import KPICard from '../../components/KPICard';
import { IcoEdit, IcoTrash, IcoCheck } from '../../components/ActionIcons';
import { GraficoReceitasDespesas, GraficoCategorias } from '../../components/DashboardWidgets';
import '../../styles/dashboardPremium.css';

const fmt = {
  currency: v => 'R$\u00a0' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return '—'; const [y,m,d]=(iso+'').split('-'); return `${d}/${m}/${y}`; },
  pct: v => (v > 0 ? '+' : '') + v + '%',
};

const CATEGORIAS = ['Aluguel','Energia','Água','Internet','Folha de pagamento','Peças/Estoque','Ferramentas','Boleto/Financiamento','Impostos','Marketing','Combustível','Manutenção','Outros'];
const CAT_ICONS  = {'Aluguel':'🏠','Energia':'⚡','Água':'💧','Internet':'🌐','Folha de pagamento':'👥','Peças/Estoque':'🔩','Ferramentas':'🔧','Boleto/Financiamento':'📄','Impostos':'🏛️','Marketing':'📣','Combustível':'⛽','Manutenção':'🛠️','Outros':'📦'};
const EMPTY_DESP = { descricao:'', categoria:'Outros', valor:'', data:new Date().toISOString().split('T')[0], vencimento:'', pago:false, obs:'', fornecedor_id:'' };

const ABAS = [
  { key:'visao-geral',      label:'Visão Geral' },
  { key:'contas-receber',   label:'A Receber' },
  { key:'contas-pagar',     label:'A Pagar' },
  { key:'fluxo-caixa',      label:'Fluxo de Caixa' },
  { key:'fornecedores',     label:'Fornecedores' },
  { key:'relatorios',       label:'Relatórios' },
];

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

function VariacaoBadge({ v }) {
  if (v === null || v === undefined) return null;
  const cor = v >= 0 ? 'var(--success)' : 'var(--danger)';
  return <span style={{fontSize:11,fontWeight:700,color:cor,marginLeft:6}}>{v > 0 ? '▲' : '▼'} {Math.abs(v)}%</span>;
}

function KPIFin({ title, value, sub, color, variacao, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background:'var(--card-bg,#fff)',border:'1px solid var(--gray-200)',
        borderRadius:'var(--r-md,10px)',padding:'16px 18px',display:'flex',
        flexDirection:'column',gap:4,
        cursor: onClick ? 'pointer' : 'default',
        transition:'box-shadow .15s, border-color .15s',
        ...(onClick ? {'boxShadow':'none'} : {}),
      }}
      onMouseEnter={e=>{ if(onClick){ e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor='var(--brand)'; }}}
      onMouseLeave={e=>{ if(onClick){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='var(--gray-200)'; }}}
    >
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <span style={{fontSize:12,fontWeight:600,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:.5}}>{title}</span>
        {icon && <span style={{opacity:.5}}>{icon}</span>}
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:4}}>
        <span style={{fontSize:22,fontWeight:800,color:color||'var(--gray-800)',fontFamily:'Poppins,sans-serif'}}>{value}</span>
        <VariacaoBadge v={variacao} />
      </div>
      {sub && <span style={{fontSize:12,color:'var(--gray-400)'}}>{sub}</span>}
      {onClick && <span style={{fontSize:10,color:'var(--gray-300)',marginTop:2}}>Clique para detalhar</span>}
    </div>
  );
}

export default function AppFinanceiro() {
  // ── Período ───────────────────────────────────────────────
  const [periodoTipo, setPeriodoTipo] = useState('mes_atual');
  const [dataInicio, setDataInicio]   = useState('');
  const [dataFim, setDataFim]         = useState('');

  const calcPeriodo = useCallback(() => {
    const hoje = new Date();
    const hStr = hoje.toISOString().split('T')[0];
    // Último dia do mês corrente (ex: 2026-11-30)
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().split('T')[0];
    switch (periodoTipo) {
      case 'hoje':           return { ini: hStr, fim: hStr, label: 'Hoje' };
      case '7':              { const d=new Date(); d.setDate(d.getDate()-6); return { ini:d.toISOString().split('T')[0], fim:hStr, label:'Últimos 7 dias' }; }
      case '30':             { const d=new Date(); d.setDate(d.getDate()-29); return { ini:d.toISOString().split('T')[0], fim:hStr, label:'Últimos 30 dias' }; }
      case 'mes_atual':      return { ini: hStr.substring(0,7)+'-01', fim: hStr, label: 'Mês atual (até hoje)' };
      // Mês completo — do dia 1 ao último dia, inclui lançamentos futuros do mês
      case 'mes_completo':   return { ini: hStr.substring(0,7)+'-01', fim: ultimoDiaMes, label: 'Mês completo' };
      case 'mes_anterior':   { const d=new Date(hoje.getFullYear(),hoje.getMonth()-1,1); const f=new Date(hoje.getFullYear(),hoje.getMonth(),0); return { ini:d.toISOString().split('T')[0], fim:f.toISOString().split('T')[0], label:'Mês anterior' }; }
      case 'proximo_30':     { const d=new Date(); d.setDate(d.getDate()+29); return { ini:hStr, fim:d.toISOString().split('T')[0], label:'Próximos 30 dias' }; }
      case 'proximo_60':     { const d=new Date(); d.setDate(d.getDate()+59); return { ini:hStr, fim:d.toISOString().split('T')[0], label:'Próximos 60 dias' }; }
      case 'proximo_90':     { const d=new Date(); d.setDate(d.getDate()+89); return { ini:hStr, fim:d.toISOString().split('T')[0], label:'Próximos 90 dias' }; }
      case 'ano':            return { ini: hoje.getFullYear()+'-01-01', fim: hStr, label: String(hoje.getFullYear()) };
      case 'custom':         return { ini: dataInicio||hStr, fim: dataFim||hStr, label: `${(dataInicio||hStr).split('-').reverse().join('/')} a ${(dataFim||hStr).split('-').reverse().join('/')}` };
      default:               return { ini: hStr.substring(0,7)+'-01', fim: hStr, label: 'Mês atual (até hoje)' };
    }
  }, [periodoTipo, dataInicio, dataFim]);

  const periodo = calcPeriodo();

  // ── Abas ──────────────────────────────────────────────────
  const [abaAtiva, setAbaAtiva] = useState('visao-geral');

  // ── Dados financeiros ─────────────────────────────────────
  const [resumo, setResumo]               = useState(null);
  const [despesas, setDespesas]           = useState([]);
  const [despesasFluxo, setDespesasFluxo] = useState([]); // próximos 90 dias — para o fluxo de caixa
  const [parcelas, setParcelas]           = useState([]);
  const [boletosPendentes, setBoletos]    = useState([]);
  const [pagamentosOS, setPagamentosOS]   = useState([]);
  const [recebimentos, setRecebimentos]   = useState(null);
  const [recebimentoCartao, setRecebimentoCartao] = useState('proximo_dia');
  const [recebManuais, setRecebManuais]   = useState([]);
  const [modalRecebManual, setModalRecebManual] = useState(false);
  const [formRecebManual, setFormRecebManual]   = useState({descricao:'',valor:'',vencimento:'',obs:''});
  const [editingRecebManual, setEditingRecebManual] = useState(null);
  // Modal de detalhe dos KPI cards da aba A Receber
  // null | 'recebido' | 'a_receber' | 'boletos' | 'atraso'
  const [modalDetalheKPI, setModalDetalheKPI] = useState(null);
  const [diaDetalhe, setDiaDetalhe]       = useState(null); // data selecionada no grid de previsão
  const [diasPrevisao, setDiasPrevisao]   = useState(7);    // janela da previsão: 7/14/30/60/90 dias
  // Modal de confirmação de recebimento (boleto ou parcela de cartão)
  const [modalRecebimento, setModalRecebimento] = useState(null);
  // { tipo: 'boleto'|'parcela', id, cliente, valor, dataRef }
  const [loading, setLoading]             = useState(false);
  const [toast, setToast]                 = useState({msg:'',type:''});

  // ── UI ────────────────────────────────────────────────────
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY_DESP);
  const [editing, setEditing]   = useState(null);
  const [filtroDespStatus, setFiltroDespStatus] = useState('todos'); // 'todos','pago','pendente','vencido'
  const [filtroDespCat, setFiltroDespCat]       = useState('');
  const [filtroDespForn, setFiltroDespForn]      = useState('');

  // ── Categorias e fornecedores ─────────────────────────────
  const [categoriasDinamicas, setCatsDin] = useState([]);
  const [fornecedores, setFornecedores]   = useState([]);
  const [modalCat, setModalCat]           = useState(false);
  const [modalForn, setModalForn]         = useState(false);
  const [formCat, setFormCat]             = useState({nome:'',icone:'📦'});
  const [editingCat, setEditingCat]       = useState(null);
  const [formForn, setFormForn]           = useState({nome:'',cnpj_cpf:'',telefone:'',email:'',obs:''});
  const [editingForn, setEditingForn]     = useState(null);

  function showToast(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:''}),3000); }

  const categoriasDisponiveis = categoriasDinamicas.filter(c=>c.ativo).map(c=>c.nome).length > 0
    ? categoriasDinamicas.filter(c=>c.ativo).map(c=>c.nome)
    : CATEGORIAS;

  // ── Carregamento ──────────────────────────────────────────
  const loadResumo = useCallback(async () => {
    try {
      const r = await api.app.financeiroResumo.get(periodo.ini, periodo.fim);
      setResumo(r);
    } catch { setResumo(null); }
  }, [periodo.ini, periodo.fim]);

  const loadDespesas = useCallback(async () => {
    try { const d = await api.app.despesas.list(periodo.ini, periodo.fim); setDespesas(Array.isArray(d)?d:[]); }
    catch { setDespesas([]); }
  }, [periodo.ini, periodo.fim]);

  async function loadParcelas() {
    try { const d = await api.app.parcelasReceber.list(); setParcelas(Array.isArray(d)?d:[]); } catch { setParcelas([]); }
  }
  async function loadRecebManuais() {
    try { const d = await api.app.recebimentosManuais.list(); setRecebManuais(Array.isArray(d)?d:[]); } catch { setRecebManuais([]); }
  }  async function loadBoletos() {
    try { const d = await api.app.boletosPendentes.list(); setBoletos(Array.isArray(d)?d:[]); } catch { setBoletos([]); }
  }
  async function loadPagamentos() {
    try { const d = await api.app.pagamentosOS.list(); setPagamentosOS(Array.isArray(d)?d:[]); } catch { setPagamentosOS([]); }
  }
  async function loadDespesasFluxo() {
    // Busca despesas não pagas dos próximos 90 dias para o cálculo do fluxo de caixa,
    // independente do filtro de período da tela.
    try {
      const hStr = new Date().toISOString().split('T')[0];
      const d90  = new Date(Date.now()+90*86400000).toISOString().split('T')[0];
      const d = await api.app.despesas.list(hStr, d90);
      setDespesasFluxo(Array.isArray(d) ? d.filter(x=>!x.pago&&x.vencimento) : []);
    } catch { setDespesasFluxo([]); }
  }

  useEffect(() => {
    api.app.categoriasDespesas?.list().then(d=>setCatsDin(d||[])).catch(()=>{});
    api.app.fornecedores?.list().then(d=>setFornecedores(d||[])).catch(()=>{});
    api.app.config?.get().then(cfg=>{ if(cfg?.recebimento_cartao) setRecebimentoCartao(cfg.recebimento_cartao); }).catch(()=>{});
    loadParcelas(); loadBoletos(); loadPagamentos(); loadDespesasFluxo(); loadRecebManuais();
  }, []);

  const loadRecebimentos = useCallback(async () => {
    try { const r = await api.app.recebimentos.get(periodo.ini, periodo.fim); setRecebimentos(r); }
    catch { setRecebimentos(null); }
  }, [periodo.ini, periodo.fim]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadResumo(), loadDespesas(), loadRecebimentos()]).finally(() => setLoading(false));
  }, [periodo.ini, periodo.fim]);

  // ── Ações de despesa ──────────────────────────────────────
  async function saveDespesa(e) {
    e.preventDefault();
    if (!form.descricao.trim()||!form.valor||parseFloat(form.valor)<=0) { showToast('Preencha descrição e valor','error'); return; }
    try {
      const payload = {...form, valor:parseFloat(form.valor), pago:form.pago?1:0, fornecedor_id:form.fornecedor_id||null};
      if (editing) await api.app.despesas.update(editing, payload);
      else await api.app.despesas.create(payload);
      setModal(false);

      // Se a data relevante da despesa estiver fora do período exibido,
      // ajusta o filtro automaticamente para que ela apareça na lista.
      const dataRelevante = form.vencimento || form.data;
      if (dataRelevante && dataRelevante > periodo.fim) {
        const hoje = new Date().toISOString().split('T')[0];
        const mesCorrente = hoje.substring(0, 7);
        // Dentro do mês corrente → mês completo; além disso → próximos 90 dias
        if (dataRelevante.substring(0, 7) === mesCorrente) {
          setPeriodoTipo('mes_completo');
          showToast('Período ajustado para "Mês completo" para exibir o lançamento');
        } else {
          setPeriodoTipo('proximo_90');
          showToast('Período ajustado para "Próximos 90 dias" para exibir o lançamento');
        }
        // O useEffect[periodo.ini, periodo.fim] vai re-buscar automaticamente
      } else {
        loadDespesas();
        showToast(editing ? 'Despesa atualizada!' : 'Despesa cadastrada!');
      }
      loadResumo();
    } catch { showToast('Erro ao salvar','error'); }
  }

  async function marcarPago(id) {
    await api.app.despesas.pagar(id);
    loadDespesas(); loadResumo(); showToast('Marcado como pago!');
  }
  async function removeDespesa(id) {
    if (!window.confirm('Excluir esta despesa?')) return;
    await api.app.despesas.remove(id);
    loadDespesas(); loadResumo(); showToast('Despesa excluída');
  }
  async function marcarRecebido(id) {
    try { await api.app.parcelasReceber.marcarRecebido(id); loadParcelas(); loadResumo(); loadRecebimentos(); showToast('Parcela marcada como recebida!'); }
    catch { showToast('Erro','error'); }
  }

  // Abre o mini-modal de confirmação de recebimento (boleto ou parcela de cartão)
  function abrirModalRecebimento({ tipo, id, cliente, valor, dataRef }) {
    setModalRecebimento({ tipo, id, cliente, valor, dataRef, dataEfetiva: new Date().toISOString().split('T')[0] });
  }

  async function confirmarRecebimento() {
    if (!modalRecebimento) return;
    const { tipo, id, dataEfetiva } = modalRecebimento;
    try {
      if (tipo === 'boleto') {
        await api.app.boletosPendentes.confirmar(id, { recebido_em: dataEfetiva });
        loadBoletos(); loadResumo(); loadRecebimentos();
        showToast('Boleto confirmado!');
      } else if (tipo === 'manual') {
        await api.app.recebimentosManuais.receber(id, dataEfetiva);
        loadRecebManuais(); loadResumo();
        showToast('Recebimento confirmado!');
      } else {
        await api.app.parcelasReceber.marcarRecebido(id, dataEfetiva);
        loadParcelas(); loadResumo(); loadRecebimentos();
        showToast('Parcela marcada como recebida!');
      }
      setModalRecebimento(null);
    } catch (err) {
      showToast(err?.error || 'Erro ao confirmar', 'error');
    }
  }

  async function saveRecebManual(e) {
    e.preventDefault();
    if (!formRecebManual.descricao.trim() || !formRecebManual.valor || !formRecebManual.vencimento) {
      showToast('Preencha descrição, valor e vencimento','error'); return;
    }
    try {
      const payload = { ...formRecebManual, valor: parseFloat(formRecebManual.valor) };
      if (editingRecebManual) await api.app.recebimentosManuais.update(editingRecebManual, payload);
      else await api.app.recebimentosManuais.create(payload);
      setModalRecebManual(false);
      setFormRecebManual({descricao:'',valor:'',vencimento:'',obs:''});
      setEditingRecebManual(null);
      loadRecebManuais(); loadResumo();
      showToast(editingRecebManual ? 'Lançamento atualizado!' : 'Lançamento criado!');
    } catch(err){ showToast(err?.error||'Erro ao salvar','error'); }
  }

  async function removeRecebManual(id) {
    if (!window.confirm('Excluir este lançamento?')) return;
    try {
      await api.app.recebimentosManuais.remove(id);
      loadRecebManuais(); loadResumo();
      showToast('Lançamento excluído');
    } catch(err){ showToast(err?.error||'Erro','error'); }
  }
  // ── Ações de categoria ────────────────────────────────────
  async function saveCat(e) {
    e.preventDefault();
    try {
      if (editingCat) await api.app.categoriasDespesas.update(editingCat, formCat);
      else await api.app.categoriasDespesas.create(formCat);
      setModalCat(false); setFormCat({nome:'',icone:'📦'}); setEditingCat(null);
      const d = await api.app.categoriasDespesas.list(); setCatsDin(d||[]);
      showToast('Categoria salva!');
    } catch(err){ showToast(err?.error||'Erro ao salvar','error'); }
  }
  async function removeCat(id) {
    try { await api.app.categoriasDespesas.remove(id); const d = await api.app.categoriasDespesas.list(); setCatsDin(d||[]); showToast('Categoria excluída'); }
    catch(err){ showToast(err?.error||'Categoria em uso','error'); }
  }

  // ── Ações de fornecedor ───────────────────────────────────
  async function saveForn(e) {
    e.preventDefault();
    try {
      if (editingForn) await api.app.fornecedores.update(editingForn, formForn);
      else await api.app.fornecedores.create(formForn);
      setModalForn(false); setFormForn({nome:'',cnpj_cpf:'',telefone:'',email:'',obs:''}); setEditingForn(null);
      const d = await api.app.fornecedores.list(); setFornecedores(d||[]);
      showToast('Fornecedor salvo!');
    } catch(err){ showToast(err?.error||'Erro ao salvar','error'); }
  }
  async function removeForn(id) {
    if (!window.confirm('Desativar este fornecedor?')) return;
    try { await api.app.fornecedores.remove(id); const d = await api.app.fornecedores.list(); setFornecedores(d||[]); showToast('Fornecedor desativado'); }
    catch { showToast('Erro','error'); }
  }

  // ── Despesas filtradas ────────────────────────────────────
  const hoje = new Date().toISOString().split('T')[0];
  const despesasFiltradas = despesas.filter(d => {
    const vencido = d.vencimento && d.vencimento < hoje && !d.pago;
    if (filtroDespStatus === 'pago'     && !d.pago)   return false;
    if (filtroDespStatus === 'pendente' && (d.pago || vencido)) return false;
    if (filtroDespStatus === 'vencido'  && !vencido)   return false;
    if (filtroDespCat  && d.categoria !== filtroDespCat)  return false;
    if (filtroDespForn && String(d.fornecedor_id) !== filtroDespForn) return false;
    return true;
  });

  const kpis = resumo?.kpis;
  const serie = resumo?.serie || [];

  // ── Dados do gráfico de categorias ───────────────────────
  const catMap = {};
  despesas.forEach(d => { if (!catMap[d.categoria]) catMap[d.categoria]=0; catMap[d.categoria]+=parseFloat(d.valor||0); });
  const dadosCategorias = Object.entries(catMap).map(([label,valor])=>({label,valor})).sort((a,b)=>b.valor-a.valor);

  // ── Fluxo de caixa: próximos 90 dias ─────────────────────
  const fluxo90 = (() => {
    const entradas = {30:0, 60:0, 90:0};
    const saidas   = {30:0, 60:0, 90:0};
    const d30 = new Date(Date.now()+30*86400000).toISOString().split('T')[0];
    const d60 = new Date(Date.now()+60*86400000).toISOString().split('T')[0];
    const d90 = new Date(Date.now()+90*86400000).toISOString().split('T')[0];
    parcelas.filter(p=>!p.recebido).forEach(p => {
      const v = parseFloat(p.valor||0);
      if (p.data_recebimento <= d90) { entradas[90]+=v; if(p.data_recebimento<=d60){entradas[60]+=v;} if(p.data_recebimento<=d30){entradas[30]+=v;} }
    });
    boletosPendentes.forEach(b => {
      const v = parseFloat(b.valor_liquido||b.valor_total||0);
      const dt = b.boleto_vencimento;
      if (dt && dt <= d90) { entradas[90]+=v; if(dt<=d60){entradas[60]+=v;} if(dt<=d30){entradas[30]+=v;} }
    });
    // Usa despesasFluxo (próx. 90 dias fixos) para não depender do filtro de período da tela
    despesasFluxo.forEach(d => {
      const v = parseFloat(d.valor||0);
      if (d.vencimento <= d90) { saidas[90]+=v; if(d.vencimento<=d60){saidas[60]+=v;} if(d.vencimento<=d30){saidas[30]+=v;} }
    });
    return { entradas, saidas };
  })();

  // ── Relatórios: despesas por categoria e fornecedor ───────
  const relCategorias = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const totalDespesas  = despesas.reduce((s,d)=>s+parseFloat(d.valor||0),0);
  const relFornecedor  = {};
  despesas.forEach(d => {
    if (!d.fornecedor_id) return;
    const f = fornecedores.find(f=>f.id===d.fornecedor_id);
    const nome = f?.nome || `Fornecedor #${d.fornecedor_id}`;
    if (!relFornecedor[nome]) relFornecedor[nome] = 0;
    relFornecedor[nome] += parseFloat(d.valor||0);
  });

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Financeiro</div>
          <div className="page-subtitle">{periodo.label}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {/* Seletor de período */}
          <select className="dash-select" value={periodoTipo} onChange={e=>{setPeriodoTipo(e.target.value);}}>
            <optgroup label="Passado / Atual">
              <option value="hoje">Hoje</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="mes_atual">Mês atual (até hoje)</option>
              <option value="mes_completo">Mês completo ★</option>
              <option value="mes_anterior">Mês anterior</option>
              <option value="ano">Este ano</option>
            </optgroup>
            <optgroup label="Futuro">
              <option value="proximo_30">Próximos 30 dias</option>
              <option value="proximo_60">Próximos 60 dias</option>
              <option value="proximo_90">Próximos 90 dias</option>
            </optgroup>
            <optgroup label="Personalizado">
              <option value="custom">Período personalizado</option>
            </optgroup>
          </select>
          {periodoTipo === 'custom' && (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} style={{padding:'6px 8px',borderRadius:6,border:'1px solid var(--gray-300)',fontSize:12,background:'var(--gray-50)'}} />
              <span style={{fontSize:12,color:'var(--gray-400)'}}>até</span>
              <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} style={{padding:'6px 8px',borderRadius:6,border:'1px solid var(--gray-300)',fontSize:12,background:'var(--gray-50)'}} />
            </div>
          )}
          <button className="btn btn-primary btn-sm" onClick={()=>{setForm({...EMPTY_DESP,data:new Date().toISOString().split('T')[0]});setEditing(null);setModal(true);}}>+ Nova despesa</button>
          <button className="btn btn-outline btn-sm" onClick={()=>setModalCat(true)}>Categorias</button>
        </div>
      </div>

      {/* Abas */}
      <div style={{display:'flex',gap:0,borderBottom:'2px solid var(--gray-200)',marginBottom:24,overflowX:'auto'}}>
        {ABAS.map(tab=>(
          <button key={tab.key} onClick={()=>setAbaAtiva(tab.key)} style={{
            padding:'10px 20px',border:'none',background:'none',cursor:'pointer',fontSize:13,whiteSpace:'nowrap',
            fontWeight: abaAtiva===tab.key ? 700 : 500,
            color: abaAtiva===tab.key ? 'var(--brand)' : 'var(--gray-500)',
            borderBottom: abaAtiva===tab.key ? '2px solid var(--brand)' : '2px solid transparent',
            marginBottom:-2, transition:'color .15s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          ABA: VISÃO GERAL
      ═══════════════════════════════════════════════════════ */}
      {abaAtiva === 'visao-geral' && (
        <>
          {/* KPI Cards — 6 métricas */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:24}}>
            <KPIFin title="Receita" value={fmt.currency(kpis?.receita?.valor||0)} variacao={kpis?.receita?.variacao} color="var(--success)"
              sub={`vs período anterior`} icon="💰" />
            <KPIFin title="Despesas pagas" value={fmt.currency(kpis?.despesasPagas?.valor||0)} variacao={kpis?.despesasPagas?.variacao} color="var(--danger)"
              sub={`Total: ${fmt.currency(kpis?.despesasTotal?.valor||0)}`} icon="💸" />
            <KPIFin title="Resultado" value={fmt.currency(kpis?.lucro?.valor||0)} variacao={kpis?.lucro?.variacao}
              color={(kpis?.lucro?.valor||0)>=0?'var(--success)':'var(--danger)'}
              sub={`Margem: ${kpis?.margem?.valor||0}%`} icon="📊" />
            <KPIFin title="Total a receber" value={fmt.currency(kpis?.totalAReceber?.valor||0)}
              sub={`${kpis?.totalAReceber?.quantidade||0} parcela(s) pendente(s)`} color="var(--brand)" icon="📥" />
            <KPIFin title="Total a pagar" value={fmt.currency(kpis?.totalAPagar?.valor||0)}
              sub={`${kpis?.totalAPagar?.quantidade||0} despesa(s) pendente(s)`} color="var(--warning,#f59e0b)" icon="📤" />
            <KPIFin title="Contas vencidas" value={fmt.currency(kpis?.despesasVencidas?.valor||0)}
              sub={`${kpis?.despesasVencidas?.quantidade||0} conta(s) em atraso`}
              color={(kpis?.despesasVencidas?.quantidade||0)>0?'var(--danger)':'var(--success)'} icon="⚠️" />
          </div>

          {/* Gráficos */}
          <div className="dw-grid-2" style={{marginBottom:20}}>
            <div className="dw-card">
              <div className="dw-card-head"><div className="dw-card-titulo">Receitas x Despesas</div></div>
              <div className="dw-card-sub">Evolução no período</div>
              <GraficoReceitasDespesas serie={serie.map(s=>({...s,faturamento:s.receita}))} />
            </div>
            <div className="dw-card">
              <div className="dw-card-head"><div className="dw-card-titulo">Despesas por categoria</div></div>
              <div className="dw-card-sub">Distribuição no período</div>
              <GraficoCategorias dados={dadosCategorias} unidadeLabel="categorias" />
            </div>
          </div>

          {/* Formas de pagamento */}
          {resumo?.formasPagamento?.length > 0 && (() => {
            const formas = resumo.formasPagamento;
            const total = formas.reduce((s,f)=>s+f.total,0);
            if (total === 0) return null;
            const cores  = { pix:'#00B4D8', dinheiro:'#10b981', debito:'#8b5cf6', credito:'#f59e0b', boleto:'#64748b' };
            const labels = { pix:'PIX', dinheiro:'Dinheiro', debito:'Débito', credito:'Crédito', boleto:'Boleto' };
            return (
              <div className="card" style={{marginBottom:20}}>
                <div className="card-header"><div className="card-title">Formas de pagamento do período</div></div>
                <div style={{display:'flex',flexDirection:'column',gap:10,padding:'0 4px'}}>
                  {formas.sort((a,b)=>b.total-a.total).map(f => {
                    const pct = total > 0 ? (f.total/total*100).toFixed(1) : 0;
                    return (
                      <div key={f.forma}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:13,fontWeight:600}}>{labels[f.forma]||f.forma}</span>
                          <span style={{fontSize:13,fontWeight:700}}>{fmt.currency(f.total)} <span style={{fontSize:11,color:'var(--gray-400)',fontWeight:400}}>({pct}%)</span></span>
                        </div>
                        <div style={{height:6,background:'var(--gray-100)',borderRadius:99,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:cores[f.forma]||'#94a3b8',borderRadius:99}} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{borderTop:'1px solid var(--gray-100)',paddingTop:8,display:'flex',justifyContent:'space-between',fontSize:13}}>
                    <span style={{fontWeight:600,color:'var(--gray-600)'}}>Total recebido</span>
                    <span style={{fontWeight:800,color:'var(--brand)'}}>{fmt.currency(total)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Despesas recentes */}
          <div className="card">
            <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div className="card-title">Lançamentos de despesas</div>
              <button className="btn btn-primary btn-sm" onClick={()=>{setForm({...EMPTY_DESP,data:new Date().toISOString().split('T')[0]});setEditing(null);setModal(true);}}>+ Nova</button>
            </div>
            {despesas.length ? (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Status</th><th>Valor</th><th></th></tr></thead>
                  <tbody>
                    {[...despesas].slice(0,10).map(d=>{
                      const vencido = d.vencimento && d.vencimento < hoje && !d.pago;
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
                              {!d.pago&&<button className="btn btn-success btn-sm" onClick={()=>marcarPago(d.id)} title="Marcar pago"><IcoCheck /></button>}
                              <button className="btn btn-ghost btn-sm" onClick={()=>{setForm({descricao:d.descricao,categoria:d.categoria,valor:d.valor,data:d.data,vencimento:d.vencimento||'',pago:!!d.pago,obs:d.obs||'',fornecedor_id:d.fornecedor_id||''});setEditing(d.id);setModal(true);}}><IcoEdit /></button>
                              <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>removeDespesa(d.id)}><IcoTrash /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {despesas.length > 10 && (
                  <div style={{textAlign:'center',padding:'10px 0',fontSize:13,color:'var(--gray-400)'}}>
                    + {despesas.length-10} lançamentos — <button className="btn btn-ghost btn-sm" onClick={()=>setAbaAtiva('contas-pagar')}>Ver todos em Contas a Pagar</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state" style={{padding:32}}><div className="empty-icon">📄</div><p>Nenhuma despesa neste período</p></div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          ABA: CONTAS A RECEBER
      ═══════════════════════════════════════════════════════ */}
      {abaAtiva === 'contas-receber' && (() => {
        const hojeStr = hoje;
        const hojeDate = new Date();

        // Boletos pendentes sempre são "a receber"
        const boletosVencidos = boletosPendentes.filter(b => b.boleto_vencimento && b.boleto_vencimento < hojeStr);
        const totalBoletos    = boletosPendentes.reduce((s,b) => s + parseFloat(b.valor_liquido||b.valor_total||0), 0);

        // Parcelas de cartão pendentes — sempre consideradas (crédito + débito)
        const parcelasPendentes = parcelas.filter(p => !p.recebido);
        const parcelasAtrasadas = parcelasPendentes.filter(p => p.data_recebimento < hojeStr);
        const totalParcelas     = parcelasPendentes.reduce((s,p) => s + parseFloat(p.valor||0), 0);

        // Recebimentos manuais pendentes
        const recebManuaisPendentes = recebManuais.filter(r => !r.recebido);
        const recebManuaisAtrasados = recebManuaisPendentes.filter(r => r.vencimento < hojeStr);
        const totalRecebManuais     = recebManuaisPendentes.reduce((s,r) => s + parseFloat(r.valor||0), 0);

        // Total a receber = boletos + parcelas de cartão + manuais
        const totalAReceber = totalBoletos + totalParcelas + totalRecebManuais;

        // Em atraso = boletos vencidos + parcelas atrasadas + manuais atrasados
        const totalAtraso = boletosVencidos.reduce((s,b) => s + parseFloat(b.valor_liquido||b.valor_total||0), 0)
          + parcelasAtrasadas.reduce((s,p) => s + parseFloat(p.valor||0), 0)
          + recebManuaisAtrasados.reduce((s,r) => s + parseFloat(r.valor||0), 0);

        // Total recebido no período (do endpoint /recebimentos)
        const totalRecebido = recebimentos?.totalRecebido || 0;

        // ── Faturamento 3 meses fechados ──
        const fatMeses = recebimentos?.faturamentoMeses || Array.from({length:3},(_,i)=>{
          const d = new Date(hojeDate.getFullYear(), hojeDate.getMonth()+i, 1);
          return { ym: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), total:0, quantidade:0, ini:'', fim:'' };
        });
        const nomeMes = (ym) => {
          const [y,m] = ym.split('-');
          return new Date(+y, +m-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
        };

        // ── Previsão: janela configurável (diasPrevisao dias) ──
        const diasJanela = Array.from({length: diasPrevisao}, (_,i) => {
          const d = new Date(hojeDate.getTime() + i*86400000);
          return d.toISOString().split('T')[0];
        });

        const previsaoDias = diasJanela.map(dia => {
          const bolsDia    = boletosPendentes.filter(b => b.boleto_vencimento === dia);
          const parcelaDia = parcelasPendentes.filter(p => p.data_recebimento === dia);
          const totalBol   = bolsDia.reduce((s,b) => s + parseFloat(b.valor_liquido||b.valor_total||0), 0);
          const totalParc  = parcelaDia.reduce((s,p) => s + parseFloat(p.valor||0), 0);
          return { dia, totalBol, totalParc, total: totalBol + totalParc, boletos: bolsDia, parcelasCartao: parcelaDia };
        });

        // Itens do dia selecionado
        const diaAtual = previsaoDias.find(d => d.dia === diaDetalhe);

        return (
          <div>
            {/* ── 4 KPIs principais ── */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
              <KPIFin title="Total recebido" value={fmt.currency(totalRecebido)}
                sub="no período selecionado" color="var(--success)" icon="✅"
                onClick={()=>setModalDetalheKPI('recebido')} />
              <KPIFin title="Total a receber" value={fmt.currency(totalAReceber)}
                sub={`${boletosPendentes.length} boleto(s) · ${parcelasPendentes.length} parcela(s) cartão · ${recebManuaisPendentes.length} manual(is)`}
                color="var(--brand)" icon="📥"
                onClick={()=>setModalDetalheKPI('a_receber')} />
              <KPIFin title="Boletos pendentes" value={fmt.currency(totalBoletos)}
                sub={`${boletosPendentes.length} boleto(s) em aberto`}
                color="#f59e0b" icon="📄"
                onClick={()=>setModalDetalheKPI('boletos')} />
              <KPIFin title="Em atraso" value={fmt.currency(totalAtraso)}
                sub={`${boletosVencidos.length + parcelasAtrasadas.length} vencido(s)`}
                color={totalAtraso>0?'var(--danger)':'var(--success)'} icon="⚠️"
                onClick={()=>setModalDetalheKPI('atraso')} />
            </div>

            {/* ── Faturamento por mês (3 meses fechados) ── */}
            <div className="card" style={{marginBottom:20}}>
              <div className="card-header">
                <div className="card-title">Faturamento por mês</div>
                <span style={{fontSize:12,color:'var(--gray-400)'}}>OS finalizadas — independente de recebimento</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,padding:'4px 0'}}>
                {fatMeses.map((m,i) => (
                  <div key={m.ym} style={{
                    background: i===0?'#fff7ed':'#f9fafb',
                    border:`1px solid ${i===0?'#F97316':'#e5e7eb'}`,
                    borderRadius:8, padding:'14px 16px', textAlign:'center',
                  }}>
                    <div style={{fontSize:11,fontWeight:600,color:'#6b7280',marginBottom:4,textTransform:'capitalize'}}>
                      {nomeMes(m.ym)}
                    </div>
                    <div style={{fontSize:18,fontWeight:800,color:i===0?'#F97316':'#1f2937'}}>
                      {fmt.currency(m.total)}
                    </div>
                    <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>
                      {m.quantidade} OS finalizada{m.quantidade!==1?'s':''}
                    </div>
                    {i===0 && <div style={{fontSize:10,color:'#9ca3af',marginTop:4}}>
                      {m.ini&&m.fim?`${fmt.date(m.ini)} a ${fmt.date(m.fim)}`:''}
                    </div>}
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,color:'#9ca3af',marginTop:12,padding:'8px 4px',borderTop:'1px solid #f3f4f6'}}>
                💡 Faturamento = serviços concluídos no período. Pode diferir do valor efetivamente recebido.
              </div>
            </div>

            {/* ── Previsão de recebimentos ── */}
            <div className="card" style={{marginBottom:20}}>
              <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                <div>
                  <div className="card-title">Previsão de recebimentos</div>
                  <span style={{fontSize:12,color:'var(--gray-400)'}}>Boletos + cartão (crédito/débito)</span>
                </div>
                {/* Seletor de janela */}
                <select
                  value={diasPrevisao}
                  onChange={e => { setDiasPrevisao(Number(e.target.value)); setDiaDetalhe(null); }}
                  style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--gray-300)',fontSize:12,background:'var(--gray-50)'}}>
                  <option value={7}>Próximos 7 dias</option>
                  <option value={14}>Próximos 14 dias</option>
                  <option value={30}>Próximos 30 dias</option>
                  <option value={60}>Próximos 60 dias</option>
                  <option value={90}>Próximos 90 dias</option>
                </select>
              </div>

              {/* Resumo rápido do total previsto na janela */}
              {(() => {
                const totalJanela = previsaoDias.reduce((s,d) => s + d.total, 0);
                const totalJanelaBol  = previsaoDias.reduce((s,d) => s + d.totalBol, 0);
                const totalJanelaParc = previsaoDias.reduce((s,d) => s + d.totalParc, 0);
                if (totalJanela === 0) return null;
                return (
                  <div style={{display:'flex',gap:12,padding:'10px 0 4px',flexWrap:'wrap'}}>
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:6,padding:'8px 14px',fontSize:12}}>
                      <span style={{color:'#166534',fontWeight:700}}>Total previsto: {fmt.currency(totalJanela)}</span>
                    </div>
                    {totalJanelaBol > 0 && <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:6,padding:'8px 14px',fontSize:12}}>
                      <span style={{color:'#92400e',fontWeight:600}}>📄 Boletos: {fmt.currency(totalJanelaBol)}</span>
                    </div>}
                    {totalJanelaParc > 0 && <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,padding:'8px 14px',fontSize:12}}>
                      <span style={{color:'#1e40af',fontWeight:600}}>💳 Cartão: {fmt.currency(totalJanelaParc)}</span>
                    </div>}
                  </div>
                );
              })()}

              <div className="table-wrapper" style={{marginTop:8}}>
                <table>
                  <thead>
                    <tr>
                      <th>Vencimento</th>
                      <th>Boletos</th>
                      <th>Cartão (créd/déb)</th>
                      <th>Total do dia</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {previsaoDias.map(({dia, totalBol, totalParc, total, boletos, parcelasCartao}) => {
                      const isHoje  = dia === hojeStr;
                      const isAtras = dia < hojeStr;
                      const temItens = boletos.length + parcelasCartao.length > 0;
                      return (
                        <>
                          <tr key={dia} style={{background: isHoje?'#fff7ed':isAtras&&total>0?'#fef2f2':''}}>
                            <td style={{fontWeight: isHoje||isAtras?700:400, whiteSpace:'nowrap'}}>
                              {fmt.date(dia)}
                              {isHoje && <span style={{marginLeft:6,fontSize:11,background:'#F97316',color:'#fff',borderRadius:4,padding:'1px 6px'}}>Hoje</span>}
                            </td>
                            <td>
                              {totalBol > 0
                                ? <strong style={{color: isAtras?'var(--danger)':'#92400e'}}>{fmt.currency(totalBol)}</strong>
                                : <span style={{color:'var(--gray-300)',fontSize:12}}>—</span>}
                            </td>
                            <td>
                              {totalParc > 0
                                ? <strong style={{color: isAtras?'var(--danger)':'#1e40af'}}>{fmt.currency(totalParc)}</strong>
                                : <span style={{color:'var(--gray-300)',fontSize:12}}>—</span>}
                            </td>
                            <td>
                              {total > 0
                                ? <strong style={{color: isAtras?'var(--danger)':'var(--success)'}}>{fmt.currency(total)}</strong>
                                : <span style={{color:'var(--gray-300)',fontSize:12}}>—</span>}
                            </td>
                            <td>
                              {total === 0
                                ? <span style={{fontSize:12,color:'var(--gray-300)'}}>Sem previsão</span>
                                : isAtras ? <span className="badge badge-red">Vencido</span>
                                : isHoje  ? <span className="badge badge-green">Hoje</span>
                                : <span className="badge badge-gray">Pendente</span>}
                            </td>
                            <td>
                              {temItens && (
                                <button className="btn btn-ghost btn-sm"
                                  onClick={() => setDiaDetalhe(diaDetalhe === dia ? null : dia)}
                                  title={`${boletos.length} boleto(s) + ${parcelasCartao.length} parcela(s)`}>
                                  {boletos.length + parcelasCartao.length} item{boletos.length+parcelasCartao.length>1?'s':''} {diaDetalhe===dia?'▲':'▼'}
                                </button>
                              )}
                            </td>
                          </tr>
                          {/* Detalhe expansível do dia */}
                          {diaDetalhe === dia && diaAtual && (
                            <tr key={`det-${dia}`}>
                              <td colSpan={6} style={{padding:0}}>
                                <div style={{margin:'0 4px 8px',border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden'}}>
                                  <div style={{background:'#f9fafb',padding:'8px 14px',fontSize:12,fontWeight:700,color:'#374151',borderBottom:'1px solid #e5e7eb'}}>
                                    Recebimentos previstos em {fmt.date(dia)}
                                  </div>
                                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                                    <thead>
                                      <tr style={{background:'#f9fafb'}}>
                                        <th style={{padding:'7px 12px',fontSize:12,textAlign:'left',fontWeight:600,color:'#6b7280'}}>Tipo</th>
                                        <th style={{padding:'7px 12px',fontSize:12,textAlign:'left',fontWeight:600,color:'#6b7280'}}>Cliente</th>
                                        <th style={{padding:'7px 12px',fontSize:12,textAlign:'left',fontWeight:600,color:'#6b7280'}}>OS</th>
                                        <th style={{padding:'7px 12px',fontSize:12,textAlign:'left',fontWeight:600,color:'#6b7280'}}>Detalhe</th>
                                        <th style={{padding:'7px 12px',fontSize:12,textAlign:'right',fontWeight:600,color:'#6b7280'}}>Valor</th>
                                        <th style={{padding:'7px 12px',fontSize:12,textAlign:'center',fontWeight:600,color:'#6b7280'}}>Ação</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {diaAtual.boletos.map(b => (
                                        <tr key={`b-${b.id}`} style={{borderTop:'1px solid #f3f4f6'}}>
                                          <td style={{padding:'7px 12px'}}><span className="badge badge-yellow">📄 Boleto</span></td>
                                          <td style={{padding:'7px 12px',fontSize:13}}>{b.cliente_nome||'—'}</td>
                                          <td style={{padding:'7px 12px',fontSize:13,color:'var(--brand)',fontWeight:600}}>#{b.os_numero||String(b.os_id).padStart(4,'0')}</td>
                                          <td style={{padding:'7px 12px',fontSize:12,color:'var(--gray-500)'}}>Venc. {fmt.date(b.boleto_vencimento)}</td>
                                          <td style={{padding:'7px 12px',fontSize:13,textAlign:'right',fontWeight:700,color:'var(--success)'}}>{fmt.currency(b.valor_liquido||b.valor_total)}</td>
                                          <td style={{padding:'7px 12px',textAlign:'center'}}>
                                            <button className="btn btn-success btn-sm" title="Confirmar recebimento"
                                              onClick={()=>abrirModalRecebimento({tipo:'boleto',id:b.id,cliente:b.cliente_nome,valor:b.valor_liquido||b.valor_total,dataRef:b.boleto_vencimento})}>✓ Recebido</button>
                                          </td>
                                        </tr>
                                      ))}
                                      {diaAtual.parcelasCartao.map(p => (
                                        <tr key={`p-${p.id}`} style={{borderTop:'1px solid #f3f4f6'}}>
                                          <td style={{padding:'7px 12px'}}><span className="badge badge-blue" style={{background:'#dbeafe',color:'#1e40af'}}>💳 Cartão</span></td>
                                          <td style={{padding:'7px 12px',fontSize:13}}>{p.cliente_nome||'—'}</td>
                                          <td style={{padding:'7px 12px',fontSize:13,color:'var(--brand)',fontWeight:600}}>#{p.os_numero||String(p.os_id).padStart(4,'0')}</td>
                                          <td style={{padding:'7px 12px',fontSize:12,color:'var(--gray-500)'}}>Parcela {p.numero_parcela}ª</td>
                                          <td style={{padding:'7px 12px',fontSize:13,textAlign:'right',fontWeight:700,color:'#1e40af'}}>{fmt.currency(p.valor)}</td>
                                          <td style={{padding:'7px 12px',textAlign:'center'}}>
                                            <button className="btn btn-success btn-sm" onClick={()=>abrirModalRecebimento({tipo:'parcela',id:p.id,cliente:p.cliente_nome,valor:p.valor,dataRef:p.data_recebimento})}>✓ Recebido</button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Tabela completa de boletos pendentes ── */}
            {boletosPendentes.length > 0 && (
              <div className="card" style={{marginBottom:20}}>
                <div className="card-header">
                  <div className="card-title">Todos os boletos pendentes</div>
                  <span style={{fontSize:12,color:'var(--gray-400)'}}>{boletosPendentes.length} boleto(s)</span>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Vencimento</th>
                        <th>Cliente</th>
                        <th>OS</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...boletosPendentes].sort((a,b)=>(a.boleto_vencimento||'').localeCompare(b.boleto_vencimento||'')).map(b => {
                        const venc  = b.boleto_vencimento;
                        const isV   = venc && venc < hojeStr;
                        const isH   = venc === hojeStr;
                        return (
                          <tr key={b.id} className={isV?'fin-row-atrasado':isH?'fin-row-hoje':''}>
                            <td style={{whiteSpace:'nowrap',fontWeight:isV||isH?700:400}}>{venc?fmt.date(venc):'—'}</td>
                            <td style={{maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.cliente_nome||'—'}</td>
                            <td><strong style={{color:'var(--brand)'}}>#{b.os_numero||String(b.os_id).padStart(4,'0')}</strong></td>
                            <td><strong style={{color:'var(--success)',whiteSpace:'nowrap'}}>{fmt.currency(b.valor_liquido||b.valor_total)}</strong></td>
                            <td>{isV?<span className="badge badge-red">Vencido</span>:isH?<span className="badge badge-green">Hoje</span>:<span className="badge badge-gray">Aguardando</span>}</td>
                            <td>
                              <button className="btn btn-success btn-sm" title="Confirmar recebimento"
                                onClick={()=>abrirModalRecebimento({tipo:'boleto',id:b.id,cliente:b.cliente_nome,valor:b.valor_liquido||b.valor_total,dataRef:venc})}>✓</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Parcelas de cartão pendentes (todas) ── */}
            {parcelasPendentes.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Parcelas de cartão pendentes</div>
                  <span style={{fontSize:12,color:'var(--gray-400)'}}>{parcelasPendentes.length} parcela(s)</span>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr><th>Vencimento</th><th>Cliente</th><th>OS</th><th>Parcela</th><th>Valor</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {parcelasPendentes.sort((a,b)=>a.data_recebimento.localeCompare(b.data_recebimento)).map(p => {
                        const isH=p.data_recebimento===hojeStr; const isA=p.data_recebimento<hojeStr;
                        return (
                          <tr key={p.id} className={isH?'fin-row-hoje':isA?'fin-row-atrasado':''}>
                            <td style={{whiteSpace:'nowrap',fontWeight:isH||isA?700:400}}>{fmt.date(p.data_recebimento)}</td>
                            <td style={{maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.cliente_nome||'—'}</td>
                            <td><strong style={{color:'var(--brand)'}}>#{p.os_numero||String(p.os_id).padStart(4,'0')}</strong></td>
                            <td style={{fontSize:12,color:'var(--gray-500)'}}>{p.numero_parcela}ª parcela</td>
                            <td><strong style={{color:'#1e40af',whiteSpace:'nowrap'}}>{fmt.currency(p.valor)}</strong></td>
                            <td>{isA?<span className="badge badge-red">Atrasado</span>:isH?<span className="badge badge-green">Hoje</span>:<span className="badge badge-gray">Agendado</span>}</td>
                            <td><button className="btn btn-success btn-sm" onClick={()=>abrirModalRecebimento({tipo:'parcela',id:p.id,cliente:p.cliente_nome,valor:p.valor,dataRef:p.data_recebimento})}>✓</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Lançamentos manuais a receber ── */}
            <div className="card" style={{marginBottom:20}}>
              <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div className="card-title">Lançamentos a receber</div>
                  <span style={{fontSize:12,color:'var(--gray-400)'}}>Valores com qualquer data de vencimento</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>{setFormRecebManual({descricao:'',valor:'',vencimento:'',obs:''});setEditingRecebManual(null);setModalRecebManual(true);}}>
                  + Lançar a receber
                </button>
              </div>
              {recebManuais.length > 0 ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Vencimento</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...recebManuais].sort((a,b)=>a.vencimento.localeCompare(b.vencimento)).map(r => {
                        const isV = !r.recebido && r.vencimento < hojeStr;
                        const isH = !r.recebido && r.vencimento === hojeStr;
                        const isFut = !r.recebido && r.vencimento > hojeStr;
                        return (
                          <tr key={r.id}>
                            <td style={{whiteSpace:'nowrap',fontWeight:isV||isH?700:400,color:isV?'var(--danger)':undefined}}>
                              {fmt.date(r.vencimento)}
                              {isV && <div style={{fontSize:10,color:'var(--danger)'}}>Vencido</div>}
                            </td>
                            <td><strong>{r.descricao}</strong>{r.obs&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{r.obs}</div>}</td>
                            <td><strong style={{color:'var(--success)',whiteSpace:'nowrap'}}>{fmt.currency(r.valor)}</strong></td>
                            <td>
                              {r.recebido
                                ? <span className="badge badge-green">✓ Recebido {r.recebido_em ? fmt.date(r.recebido_em) : ''}</span>
                                : isV ? <span className="badge badge-red">Vencido</span>
                                : isH ? <span className="badge badge-green">Hoje</span>
                                : <span className="badge badge-gray">Pendente</span>}
                            </td>
                            <td>
                              <div style={{display:'flex',gap:4}}>
                                {!r.recebido && (
                                  <button className="btn btn-success btn-sm"
                                    onClick={()=>abrirModalRecebimento({tipo:'manual',id:r.id,cliente:r.descricao,valor:r.valor,dataRef:r.vencimento})}
                                    title="Confirmar recebimento">✓</button>
                                )}
                                {!r.recebido && (
                                  <button className="btn btn-ghost btn-sm"
                                    onClick={()=>{setFormRecebManual({descricao:r.descricao,valor:r.valor,vencimento:r.vencimento,obs:r.obs||''});setEditingRecebManual(r.id);setModalRecebManual(true);}}>
                                    ✏️
                                  </button>
                                )}
                                <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>removeRecebManual(r.id)}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{padding:'24px 16px',textAlign:'center',color:'var(--gray-400)',fontSize:13}}>
                  Nenhum lançamento manual. Use o botão acima para registrar valores a receber com qualquer data futura.
                </div>
              )}
            </div>

            {boletosPendentes.length===0 && parcelasPendentes.length===0 && recebManuaisPendentes.length===0 && (
              <div className="empty-state" style={{padding:40}}>
                <div className="empty-icon">🎉</div>
                <p>Nenhum valor a receber pendente</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════
          ABA: CONTAS A PAGAR
      ═══════════════════════════════════════════════════════ */}
      {abaAtiva === 'contas-pagar' && (
        <div>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
            <KPIFin title="Total no período" value={fmt.currency(despesas.reduce((s,d)=>s+parseFloat(d.valor||0),0))} color="var(--danger)" icon="💸" />
            <KPIFin title="Pagas" value={fmt.currency(despesas.filter(d=>d.pago).reduce((s,d)=>s+parseFloat(d.valor||0),0))} color="var(--success)" sub={`${despesas.filter(d=>d.pago).length} lançamento(s)`} icon="✅" />
            <KPIFin title="Pendentes" value={fmt.currency(despesas.filter(d=>!d.pago).reduce((s,d)=>s+parseFloat(d.valor||0),0))} color="var(--warning,#f59e0b)" sub={`${despesas.filter(d=>!d.pago).length} lançamento(s)`} icon="⏳" />
            <KPIFin title="Vencidas" value={fmt.currency(despesas.filter(d=>!d.pago&&d.vencimento&&d.vencimento<hoje).reduce((s,d)=>s+parseFloat(d.valor||0),0))} color="var(--danger)" sub={`${despesas.filter(d=>!d.pago&&d.vencimento&&d.vencimento<hoje).length} em atraso`} icon="⚠️" />
          </div>

          {/* Filtros */}
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:12,fontWeight:600,color:'var(--gray-500)'}}>Filtrar:</span>
            {['todos','pendente','pago','vencido'].map(s=>(
              <button key={s} onClick={()=>setFiltroDespStatus(s)} className={`btn btn-sm ${filtroDespStatus===s?'btn-primary':'btn-outline'}`}>
                {{todos:'Todos',pendente:'Pendentes',pago:'Pagos',vencido:'Vencidos'}[s]}
              </button>
            ))}
            <select value={filtroDespCat} onChange={e=>setFiltroDespCat(e.target.value)} style={{padding:'6px 10px',borderRadius:6,border:'1px solid var(--gray-300)',fontSize:12}}>
              <option value="">Todas categorias</option>
              {categoriasDisponiveis.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtroDespForn} onChange={e=>setFiltroDespForn(e.target.value)} style={{padding:'6px 10px',borderRadius:6,border:'1px solid var(--gray-300)',fontSize:12}}>
              <option value="">Todos fornecedores</option>
              {fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}} onClick={()=>{setForm({...EMPTY_DESP,data:new Date().toISOString().split('T')[0]});setEditing(null);setModal(true);}}>+ Nova despesa</button>
          </div>

          {/* Tabela de despesas */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Despesas {filtroDespStatus!=='todos'?`— ${filtroDespStatus}`:''}</div>
              <span style={{fontSize:12,color:'var(--gray-400)'}}>{despesasFiltradas.length} registro(s)</span>
            </div>
            {despesasFiltradas.length ? (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Fornecedor</th><th>Vencimento</th><th>Forma</th><th>Status</th><th>Valor</th><th></th></tr></thead>
                  <tbody>
                    {despesasFiltradas.map(d=>{
                      const vencido=d.vencimento&&d.vencimento<hoje&&!d.pago;
                      const forn=fornecedores.find(f=>f.id===d.fornecedor_id);
                      return (
                        <tr key={d.id}>
                          <td style={{whiteSpace:'nowrap'}}>{fmt.date(d.data)}</td>
                          <td><strong>{d.descricao}</strong>{d.obs&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{d.obs}</div>}</td>
                          <td><span className="badge badge-gray">{CAT_ICONS[d.categoria]||'📦'} {d.categoria}</span></td>
                          <td style={{fontSize:12,color:'var(--gray-600)'}}>{forn?.nome||'—'}</td>
                          <td style={{whiteSpace:'nowrap'}}>{d.vencimento?fmt.date(d.vencimento):'—'}</td>
                          <td style={{fontSize:12}}>—</td>
                          <td>{d.pago?<span className="badge badge-green">✓ Pago</span>:vencido?<span className="badge badge-red">Vencido</span>:<span className="badge badge-yellow">Pendente</span>}</td>
                          <td><strong style={{color:'var(--danger)',whiteSpace:'nowrap'}}>{fmt.currency(d.valor)}</strong></td>
                          <td>
                            <div style={{display:'flex',gap:4}}>
                              {!d.pago&&<button className="btn btn-success btn-sm" onClick={()=>marcarPago(d.id)} title="Marcar pago"><IcoCheck /></button>}
                              <button className="btn btn-ghost btn-sm" onClick={()=>{setForm({descricao:d.descricao,categoria:d.categoria,valor:d.valor,data:d.data,vencimento:d.vencimento||'',pago:!!d.pago,obs:d.obs||'',fornecedor_id:d.fornecedor_id||''});setEditing(d.id);setModal(true);}}><IcoEdit /></button>
                              <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>removeDespesa(d.id)}><IcoTrash /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{padding:32}}><div className="empty-icon">📄</div><p>Nenhuma despesa encontrada</p></div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ABA: FLUXO DE CAIXA
      ═══════════════════════════════════════════════════════ */}
      {abaAtiva === 'fluxo-caixa' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
            <KPIFin title="Receita realizada" value={fmt.currency(kpis?.receita?.valor||0)} color="var(--success)" icon="📈" sub="No período selecionado" />
            <KPIFin title="Despesas pagas" value={fmt.currency(kpis?.despesasPagas?.valor||0)} color="var(--danger)" icon="📉" sub="No período selecionado" />
            <KPIFin title="Resultado do período" value={fmt.currency((kpis?.lucro?.valor||0))} color={(kpis?.lucro?.valor||0)>=0?'var(--success)':'var(--danger)'} icon="💼" />
          </div>

          {/* Projeção */}
          <div className="card" style={{marginBottom:20}}>
            <div className="card-header"><div className="card-title">Projeção de entradas</div><span style={{fontSize:12,color:'var(--gray-400)'}}>Parcelas + boletos pendentes</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,padding:'4px 0'}}>
              {[30,60,90].map(d=>(
                <div key={d} style={{background:'var(--gray-50)',border:'1px solid var(--gray-200)',borderRadius:'var(--r-sm,6px)',padding:'14px 16px',textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--gray-500)',marginBottom:6}}>Próximos {d} dias</div>
                  <div style={{fontSize:18,fontWeight:800,color:'var(--success)',marginBottom:4}}>{fmt.currency(fluxo90.entradas[d])}</div>
                  <div style={{fontSize:11,color:'var(--gray-400)'}}>a receber</div>
                  <div style={{borderTop:'1px solid var(--gray-200)',marginTop:8,paddingTop:8,fontSize:12,color:'var(--danger)',fontWeight:600}}>{fmt.currency(fluxo90.saidas[d])} a pagar</div>
                  <div style={{fontSize:12,fontWeight:800,marginTop:4,color:(fluxo90.entradas[d]-fluxo90.saidas[d])>=0?'var(--success)':'var(--danger)'}}>
                    Saldo: {fmt.currency(fluxo90.entradas[d]-fluxo90.saidas[d])}
                  </div>
                </div>
              ))}
            </div>
            {(fluxo90.entradas[30]-fluxo90.saidas[30])<0&&(
              <div style={{margin:'12px 0 0',padding:'10px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'var(--r-sm,6px)',fontSize:13,color:'#b91c1c',fontWeight:600}}>
                ⚠️ Saldo projetado negativo nos próximos 30 dias. Revise suas despesas ou antecipe recebimentos.
              </div>
            )}
          </div>

          {/* Gráfico de evolução */}
          {serie.length > 0 && (
            <div className="dw-card" style={{marginBottom:20}}>
              <div className="dw-card-head"><div className="dw-card-titulo">Evolução Receitas x Despesas</div></div>
              <div className="dw-card-sub">Período selecionado</div>
              <GraficoReceitasDespesas serie={serie.map(s=>({...s,faturamento:s.receita}))} />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ABA: FORNECEDORES
      ═══════════════════════════════════════════════════════ */}
      {abaAtiva === 'fornecedores' && (
        <div className="card">
          <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="card-title">Fornecedores</div>
            <button className="btn btn-primary btn-sm" onClick={()=>{setFormForn({nome:'',cnpj_cpf:'',telefone:'',email:'',obs:''});setEditingForn(null);setModalForn(true);}}>+ Novo fornecedor</button>
          </div>
          {fornecedores.length ? (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Nome / Razão social</th><th>CNPJ / CPF</th><th>Telefone</th><th>E-mail</th><th>Observações</th><th></th></tr></thead>
                <tbody>
                  {fornecedores.map(f=>(
                    <tr key={f.id}>
                      <td><strong>{f.nome}</strong></td>
                      <td>{f.cnpj_cpf||'—'}</td>
                      <td>{f.telefone||'—'}</td>
                      <td>{f.email||'—'}</td>
                      <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.obs||'—'}</td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>{setFormForn({nome:f.nome,cnpj_cpf:f.cnpj_cpf||'',telefone:f.telefone||'',email:f.email||'',obs:f.obs||''});setEditingForn(f.id);setModalForn(true);}}><IcoEdit /></button>
                          <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>removeForn(f.id)}><IcoTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{padding:40}}><div className="empty-icon">🏭</div><p>Nenhum fornecedor cadastrado</p><button className="btn btn-primary" style={{marginTop:16}} onClick={()=>{setFormForn({nome:'',cnpj_cpf:'',telefone:'',email:'',obs:''});setEditingForn(null);setModalForn(true);}}>+ Cadastrar primeiro fornecedor</button></div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ABA: RELATÓRIOS
      ═══════════════════════════════════════════════════════ */}
      {abaAtiva === 'relatorios' && (
        <div>
          {/* Resultado financeiro */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
            <KPIFin title="Receita" value={fmt.currency(kpis?.receita?.valor||0)} color="var(--success)" variacao={kpis?.receita?.variacao} />
            <KPIFin title="Despesas (pagas)" value={fmt.currency(kpis?.despesasPagas?.valor||0)} color="var(--danger)" variacao={kpis?.despesasPagas?.variacao} />
            <KPIFin title="Lucro líquido" value={fmt.currency(kpis?.lucro?.valor||0)} color={(kpis?.lucro?.valor||0)>=0?'var(--success)':'var(--danger)'} variacao={kpis?.lucro?.variacao} />
            <KPIFin title="Margem" value={`${kpis?.margem?.valor||0}%`} sub={`Anterior: ${kpis?.margem?.anterior||0}%`} />
          </div>

          {/* Despesas por categoria */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
            <div className="card">
              <div className="card-header"><div className="card-title">Despesas por categoria</div></div>
              {relCategorias.length ? relCategorias.map(([cat,val])=>(
                <div key={cat} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  <span style={{fontSize:13}}>{CAT_ICONS[cat]||'📦'} {cat}</span>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--danger)'}}>{fmt.currency(val)}</div>
                    <div style={{fontSize:11,color:'var(--gray-400)'}}>{totalDespesas>0?(val/totalDespesas*100).toFixed(1):0}%</div>
                  </div>
                </div>
              )) : <div style={{padding:16,color:'var(--gray-400)',fontSize:13}}>Sem dados</div>}
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Despesas por fornecedor</div></div>
              {Object.entries(relFornecedor).length ? Object.entries(relFornecedor).sort((a,b)=>b[1]-a[1]).map(([nome,val])=>(
                <div key={nome} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  <span style={{fontSize:13}}>{nome}</span>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--danger)'}}>{fmt.currency(val)}</span>
                </div>
              )) : <div style={{padding:16,color:'var(--gray-400)',fontSize:13}}>Nenhuma despesa vinculada a fornecedor</div>}
            </div>
          </div>

          {/* Formas de pagamento */}
          {resumo?.formasPagamento?.length > 0 && (
            <div className="card" style={{marginBottom:20}}>
              <div className="card-header"><div className="card-title">Receita por forma de pagamento</div></div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Forma</th><th>Total</th><th>%</th></tr></thead>
                  <tbody>
                    {(() => {
                      const total = resumo.formasPagamento.reduce((s,f)=>s+f.total,0);
                      const labels = { pix:'PIX', dinheiro:'Dinheiro', debito:'Débito', credito:'Crédito', boleto:'Boleto' };
                      return resumo.formasPagamento.sort((a,b)=>b.total-a.total).map(f=>(
                        <tr key={f.forma}>
                          <td>{labels[f.forma]||f.forma}</td>
                          <td><strong>{fmt.currency(f.total)}</strong></td>
                          <td>{total>0?(f.total/total*100).toFixed(1):0}%</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{padding:'12px 16px',background:'var(--gray-50)',borderRadius:'var(--r-sm)',fontSize:13,color:'var(--gray-500)',border:'1px solid var(--gray-200)'}}>
            💡 Para exportar os dados, use o botão <strong>Exportar</strong> disponível nas Configurações do sistema.
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAIS
      ═══════════════════════════════════════════════════════ */}

      {/* Modal despesa */}
      {modal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing?'Editar despesa':'Nova despesa'}</h2>
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={saveDespesa}>
                <div className="form-grid">
                  <div className="form-group full"><label>Descrição *</label><input value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Ex: Boleto aluguel, Conta de luz..." required autoFocus /></div>
                  <div className="form-group"><label>Categoria *</label><select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>{categoriasDisponiveis.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                  <div className="form-group"><label>Fornecedor</label><select value={form.fornecedor_id||''} onChange={e=>setForm(f=>({...f,fornecedor_id:e.target.value||''}))}><option value="">Sem fornecedor</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
                  <div className="form-group"><label>Valor (R$) *</label><input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} placeholder="0,00" required /></div>
                  <div className="form-group"><label>Data do lançamento *</label><input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} required /></div>
                  <div className="form-group"><label>Data de vencimento</label><input type="date" value={form.vencimento} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))} /></div>
                  <div className="form-group"><label>Status</label><select value={form.pago?'1':'0'} onChange={e=>setForm(f=>({...f,pago:e.target.value==='1'}))}><option value="0">Pendente</option><option value="1">Pago</option></select></div>
                  <div className="form-group full"><label>Observação</label><textarea value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} placeholder="Detalhes adicionais..." /></div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fornecedor */}
      {modalForn && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-header">
              <h2>{editingForn?'Editar fornecedor':'Novo fornecedor'}</h2>
              <button className="modal-close" onClick={()=>{setModalForn(false);setEditingForn(null);setFormForn({nome:'',cnpj_cpf:'',telefone:'',email:'',obs:''});}}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={saveForn}>
                <div className="form-grid">
                  <div className="form-group full"><label>Nome / Razão social *</label><input value={formForn.nome} onChange={e=>setFormForn(f=>({...f,nome:e.target.value}))} required autoFocus /></div>
                  <div className="form-group"><label>CNPJ / CPF</label><input value={formForn.cnpj_cpf} onChange={e=>setFormForn(f=>({...f,cnpj_cpf:e.target.value}))} placeholder="00.000.000/0001-00" /></div>
                  <div className="form-group"><label>Telefone</label><input value={formForn.telefone} onChange={e=>setFormForn(f=>({...f,telefone:e.target.value}))} placeholder="(00) 00000-0000" /></div>
                  <div className="form-group full"><label>E-mail</label><input type="email" value={formForn.email} onChange={e=>setFormForn(f=>({...f,email:e.target.value}))} /></div>
                  <div className="form-group full"><label>Observações</label><textarea value={formForn.obs} onChange={e=>setFormForn(f=>({...f,obs:e.target.value}))} /></div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>{setModalForn(false);setEditingForn(null);}}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Categorias */}
      {modalCat && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header">
              <h2>Categorias de despesas</h2>
              <button className="modal-close" onClick={()=>setModalCat(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={saveCat} style={{marginBottom:20}}>
                <div className="form-grid">
                  <div className="form-group"><label>Ícone</label><input value={formCat.icone} onChange={e=>setFormCat(f=>({...f,icone:e.target.value}))} style={{width:60}} maxLength={2} /></div>
                  <div className="form-group"><label>Nome *</label><input value={formCat.nome} onChange={e=>setFormCat(f=>({...f,nome:e.target.value}))} required autoFocus /></div>
                </div>
                <div className="form-actions">
                  {editingCat&&<button type="button" className="btn btn-outline" onClick={()=>{setEditingCat(null);setFormCat({nome:'',icone:'📦'});}}>Cancelar edição</button>}
                  <button type="submit" className="btn btn-primary">{editingCat?'Salvar':'Adicionar'}</button>
                </div>
              </form>
              <div style={{maxHeight:280,overflowY:'auto'}}>
                {categoriasDinamicas.map(c=>(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                    <span style={{fontSize:18}}>{c.icone}</span>
                    <span style={{flex:1,fontSize:14,color:c.ativo?'var(--gray-800)':'var(--gray-400)',textDecoration:c.ativo?'none':'line-through'}}>{c.nome}</span>
                    <button className="btn btn-outline btn-sm" onClick={()=>{setEditingCat(c.id);setFormCat({nome:c.nome,icone:c.icone||'📦'});}}>Editar</button>
                    {c.ativo&&<button className="btn btn-outline btn-sm" onClick={()=>removeCat(c.id)} style={{color:'var(--danger)'}}>Excluir</button>}
                  </div>
                ))}
                {categoriasDinamicas.length===0&&<p style={{color:'var(--gray-400)',fontSize:13}}>Nenhuma categoria personalizada.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação de recebimento ── */}
      {modalRecebimento && (
        <div className="modal-overlay open" onClick={()=>setModalRecebimento(null)}>
          <div className="modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar recebimento</h2>
              <button className="modal-close" onClick={()=>setModalRecebimento(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Resumo do item */}
              <div style={{background:'var(--gray-50)',border:'1px solid var(--gray-200)',borderRadius:8,padding:'12px 16px',marginBottom:20}}>
                <div style={{fontSize:12,color:'var(--gray-500)',marginBottom:4}}>
                  {modalRecebimento.tipo === 'boleto' ? '📄 Boleto' : '💳 Parcela de cartão'}
                </div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--gray-800)'}}>{modalRecebimento.cliente||'—'}</div>
                <div style={{fontSize:18,fontWeight:800,color:'var(--success)',marginTop:4}}>{fmt.currency(modalRecebimento.valor)}</div>
                {modalRecebimento.dataRef && (
                  <div style={{fontSize:12,color:'var(--gray-400)',marginTop:4}}>
                    Vencimento: {fmt.date(modalRecebimento.dataRef)}
                  </div>
                )}
              </div>
              {/* Seletor de data efetiva */}
              <div className="form-group" style={{marginBottom:20}}>
                <label style={{fontWeight:600}}>Data do recebimento</label>
                <input
                  type="date"
                  value={modalRecebimento.dataEfetiva}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e=>setModalRecebimento(m=>({...m,dataEfetiva:e.target.value}))}
                  style={{width:'100%',padding:'8px 12px',borderRadius:6,border:'1px solid var(--gray-300)',fontSize:14}}
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-outline" onClick={()=>setModalRecebimento(null)}>Cancelar</button>
                <button className="btn btn-success" onClick={confirmarRecebimento}>✓ Confirmar recebimento</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de detalhe dos KPI cards ── */}
      {modalDetalheKPI && (() => {
        const fechar = () => setModalDetalheKPI(null);
        const hojeStr = hoje;

        // ── TOTAL RECEBIDO ────────────────────────────────
        if (modalDetalheKPI === 'recebido') {
          const recebidosPeriodo = recebimentos?.recebidos || [];
          const total = recebimentos?.totalRecebido || 0;
          const formaLabel = {pix:'PIX',dinheiro:'Dinheiro',debito:'Débito',credito:'Crédito',boleto:'Boleto'};
          return (
            <div className="modal-overlay open" onClick={fechar}>
              <div className="modal" style={{maxWidth:640}} onClick={e=>e.stopPropagation()}>
                <div className="modal-header">
                  <h2>✅ Total recebido — {periodo.label}</h2>
                  <button className="modal-close" onClick={fechar}>✕</button>
                </div>
                <div className="modal-body">
                  <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#166534'}}>Total no período</span>
                    <span style={{fontSize:20,fontWeight:800,color:'#166534'}}>{fmt.currency(total)}</span>
                  </div>
                  {recebidosPeriodo.length > 0 ? (
                    <div className="table-wrapper">
                      <table>
                        <thead><tr><th>Data</th><th>Cliente</th><th>OS</th><th>Forma</th><th style={{textAlign:'right'}}>Valor</th></tr></thead>
                        <tbody>
                          {recebidosPeriodo.map(p=>(
                            <tr key={p.id}>
                              <td style={{whiteSpace:'nowrap'}}>{fmt.date(p.data_pagamento)}</td>
                              <td>{p.cliente_nome||'—'}</td>
                              <td style={{color:'var(--brand)',fontWeight:600}}>#{p.os_numero||String(p.os_id).padStart(4,'0')}</td>
                              <td><span className="badge badge-gray">{formaLabel[p.forma]||p.forma}</span></td>
                              <td style={{textAlign:'right',fontWeight:700,color:'var(--success)'}}>{fmt.currency(p.valor_liquido||p.valor_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>Nenhum recebimento no período selecionado</div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // ── TOTAL A RECEBER ───────────────────────────────
        if (modalDetalheKPI === 'a_receber') {
          const totalBolSec   = boletosPendentes.reduce((s,b)=>s+parseFloat(b.valor_liquido||b.valor_total||0),0);
          const totalParcSec  = parcelasPendentes.reduce((s,p)=>s+parseFloat(p.valor||0),0);
          const totalManuSec  = recebManuaisPendentes.reduce((s,r)=>s+parseFloat(r.valor||0),0);
          const totalGeral    = totalBolSec + totalParcSec + totalManuSec;
          return (
            <div className="modal-overlay open" onClick={fechar}>
              <div className="modal" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
                <div className="modal-header">
                  <h2>📥 Total a receber</h2>
                  <button className="modal-close" onClick={fechar}>✕</button>
                </div>
                <div className="modal-body">
                  <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'10px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#1e40af'}}>Total geral pendente</span>
                    <span style={{fontSize:20,fontWeight:800,color:'#1e40af'}}>{fmt.currency(totalGeral)}</span>
                  </div>
                  {/* Boletos */}
                  {boletosPendentes.length > 0 && (
                    <div style={{marginBottom:20}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#92400e'}}>📄 Boletos pendentes — {fmt.currency(totalBolSec)}</div>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Vencimento</th><th>Cliente</th><th>OS</th><th style={{textAlign:'right'}}>Valor</th></tr></thead>
                          <tbody>
                            {[...boletosPendentes].sort((a,b)=>(a.boleto_vencimento||'').localeCompare(b.boleto_vencimento||'')).map(b=>{
                              const isV=b.boleto_vencimento&&b.boleto_vencimento<hojeStr;
                              return (
                                <tr key={b.id}>
                                  <td style={{whiteSpace:'nowrap',color:isV?'var(--danger)':undefined,fontWeight:isV?700:400}}>{b.boleto_vencimento?fmt.date(b.boleto_vencimento):'—'}{isV&&<div style={{fontSize:10,color:'var(--danger)'}}>Vencido</div>}</td>
                                  <td>{b.cliente_nome||'—'}</td>
                                  <td style={{color:'var(--brand)',fontWeight:600}}>#{b.os_numero||String(b.os_id).padStart(4,'0')}</td>
                                  <td style={{textAlign:'right',fontWeight:700,color:'#92400e'}}>{fmt.currency(b.valor_liquido||b.valor_total)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {/* Parcelas de cartão */}
                  {parcelasPendentes.length > 0 && (
                    <div style={{marginBottom:20}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#1e40af'}}>💳 Parcelas de cartão — {fmt.currency(totalParcSec)}</div>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Vencimento</th><th>Cliente</th><th>OS</th><th>Parcela</th><th style={{textAlign:'right'}}>Valor</th></tr></thead>
                          <tbody>
                            {parcelasPendentes.sort((a,b)=>a.data_recebimento.localeCompare(b.data_recebimento)).map(p=>(
                              <tr key={p.id}>
                                <td style={{whiteSpace:'nowrap'}}>{fmt.date(p.data_recebimento)}</td>
                                <td>{p.cliente_nome||'—'}</td>
                                <td style={{color:'var(--brand)',fontWeight:600}}>#{p.os_numero||String(p.os_id).padStart(4,'0')}</td>
                                <td style={{fontSize:12,color:'var(--gray-500)'}}>{p.numero_parcela}ª</td>
                                <td style={{textAlign:'right',fontWeight:700,color:'#1e40af'}}>{fmt.currency(p.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {/* Manuais */}
                  {recebManuaisPendentes.length > 0 && (
                    <div>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'var(--success)'}}>📋 Lançamentos manuais — {fmt.currency(totalManuSec)}</div>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Vencimento</th><th>Descrição</th><th style={{textAlign:'right'}}>Valor</th></tr></thead>
                          <tbody>
                            {recebManuaisPendentes.sort((a,b)=>a.vencimento.localeCompare(b.vencimento)).map(r=>(
                              <tr key={r.id}>
                                <td style={{whiteSpace:'nowrap'}}>{fmt.date(r.vencimento)}</td>
                                <td>{r.descricao}{r.obs&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{r.obs}</div>}</td>
                                <td style={{textAlign:'right',fontWeight:700,color:'var(--success)'}}>{fmt.currency(r.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {totalGeral===0 && <div style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>Nenhum valor pendente</div>}
                </div>
              </div>
            </div>
          );
        }

        // ── BOLETOS PENDENTES ─────────────────────────────
        if (modalDetalheKPI === 'boletos') {
          return (
            <div className="modal-overlay open" onClick={fechar}>
              <div className="modal" style={{maxWidth:620}} onClick={e=>e.stopPropagation()}>
                <div className="modal-header">
                  <h2>📄 Boletos pendentes</h2>
                  <button className="modal-close" onClick={fechar}>✕</button>
                </div>
                <div className="modal-body">
                  <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#92400e'}}>{boletosPendentes.length} boleto(s) em aberto</span>
                    <span style={{fontSize:20,fontWeight:800,color:'#92400e'}}>{fmt.currency(boletosPendentes.reduce((s,b)=>s+parseFloat(b.valor_liquido||b.valor_total||0),0))}</span>
                  </div>
                  {boletosPendentes.length > 0 ? (
                    <div className="table-wrapper">
                      <table>
                        <thead><tr><th>Vencimento</th><th>Cliente</th><th>OS</th><th>Status</th><th style={{textAlign:'right'}}>Valor</th><th></th></tr></thead>
                        <tbody>
                          {[...boletosPendentes].sort((a,b)=>(a.boleto_vencimento||'').localeCompare(b.boleto_vencimento||'')).map(b=>{
                            const venc=b.boleto_vencimento; const isV=venc&&venc<hojeStr; const isH=venc===hojeStr;
                            return (
                              <tr key={b.id}>
                                <td style={{whiteSpace:'nowrap',fontWeight:isV||isH?700:400,color:isV?'var(--danger)':undefined}}>{venc?fmt.date(venc):'—'}</td>
                                <td>{b.cliente_nome||'—'}</td>
                                <td style={{color:'var(--brand)',fontWeight:600}}>#{b.os_numero||String(b.os_id).padStart(4,'0')}</td>
                                <td>{isV?<span className="badge badge-red">Vencido</span>:isH?<span className="badge badge-green">Hoje</span>:<span className="badge badge-gray">Aguardando</span>}</td>
                                <td style={{textAlign:'right',fontWeight:700,color:'#92400e'}}>{fmt.currency(b.valor_liquido||b.valor_total)}</td>
                                <td><button className="btn btn-success btn-sm" onClick={()=>{fechar();abrirModalRecebimento({tipo:'boleto',id:b.id,cliente:b.cliente_nome,valor:b.valor_liquido||b.valor_total,dataRef:venc});}}>✓</button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>Nenhum boleto pendente</div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // ── EM ATRASO ─────────────────────────────────────
        if (modalDetalheKPI === 'atraso') {
          const boletosAtr  = boletosPendentes.filter(b=>b.boleto_vencimento&&b.boleto_vencimento<hojeStr);
          const parcelasAtr = parcelasPendentes.filter(p=>p.data_recebimento<hojeStr);
          const manuaisAtr  = recebManuaisPendentes.filter(r=>r.vencimento<hojeStr);
          const totalAtr    = boletosAtr.reduce((s,b)=>s+parseFloat(b.valor_liquido||b.valor_total||0),0)
                            + parcelasAtr.reduce((s,p)=>s+parseFloat(p.valor||0),0)
                            + manuaisAtr.reduce((s,r)=>s+parseFloat(r.valor||0),0);
          return (
            <div className="modal-overlay open" onClick={fechar}>
              <div className="modal" style={{maxWidth:660}} onClick={e=>e.stopPropagation()}>
                <div className="modal-header">
                  <h2>⚠️ Em atraso</h2>
                  <button className="modal-close" onClick={fechar}>✕</button>
                </div>
                <div className="modal-body">
                  <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#b91c1c'}}>{boletosAtr.length+parcelasAtr.length+manuaisAtr.length} item(s) vencido(s)</span>
                    <span style={{fontSize:20,fontWeight:800,color:'#b91c1c'}}>{fmt.currency(totalAtr)}</span>
                  </div>
                  {boletosAtr.length > 0 && (
                    <div style={{marginBottom:20}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#b91c1c'}}>📄 Boletos vencidos</div>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Vencimento</th><th>Cliente</th><th>OS</th><th style={{textAlign:'right'}}>Valor</th><th></th></tr></thead>
                          <tbody>
                            {boletosAtr.sort((a,b)=>(a.boleto_vencimento||'').localeCompare(b.boleto_vencimento||'')).map(b=>(
                              <tr key={b.id}>
                                <td style={{whiteSpace:'nowrap',fontWeight:700,color:'var(--danger)'}}>{fmt.date(b.boleto_vencimento)}</td>
                                <td>{b.cliente_nome||'—'}</td>
                                <td style={{color:'var(--brand)',fontWeight:600}}>#{b.os_numero||String(b.os_id).padStart(4,'0')}</td>
                                <td style={{textAlign:'right',fontWeight:700,color:'var(--danger)'}}>{fmt.currency(b.valor_liquido||b.valor_total)}</td>
                                <td><button className="btn btn-success btn-sm" onClick={()=>{fechar();abrirModalRecebimento({tipo:'boleto',id:b.id,cliente:b.cliente_nome,valor:b.valor_liquido||b.valor_total,dataRef:b.boleto_vencimento});}}>✓</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {parcelasAtr.length > 0 && (
                    <div style={{marginBottom:20}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#b91c1c'}}>💳 Parcelas vencidas</div>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Vencimento</th><th>Cliente</th><th>OS</th><th>Parcela</th><th style={{textAlign:'right'}}>Valor</th><th></th></tr></thead>
                          <tbody>
                            {parcelasAtr.sort((a,b)=>a.data_recebimento.localeCompare(b.data_recebimento)).map(p=>(
                              <tr key={p.id}>
                                <td style={{whiteSpace:'nowrap',fontWeight:700,color:'var(--danger)'}}>{fmt.date(p.data_recebimento)}</td>
                                <td>{p.cliente_nome||'—'}</td>
                                <td style={{color:'var(--brand)',fontWeight:600}}>#{p.os_numero||String(p.os_id).padStart(4,'0')}</td>
                                <td style={{fontSize:12,color:'var(--gray-500)'}}>{p.numero_parcela}ª</td>
                                <td style={{textAlign:'right',fontWeight:700,color:'var(--danger)'}}>{fmt.currency(p.valor)}</td>
                                <td><button className="btn btn-success btn-sm" onClick={()=>{fechar();abrirModalRecebimento({tipo:'parcela',id:p.id,cliente:p.cliente_nome,valor:p.valor,dataRef:p.data_recebimento});}}>✓</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {manuaisAtr.length > 0 && (
                    <div>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#b91c1c'}}>📋 Lançamentos manuais vencidos</div>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Vencimento</th><th>Descrição</th><th style={{textAlign:'right'}}>Valor</th><th></th></tr></thead>
                          <tbody>
                            {manuaisAtr.sort((a,b)=>a.vencimento.localeCompare(b.vencimento)).map(r=>(
                              <tr key={r.id}>
                                <td style={{whiteSpace:'nowrap',fontWeight:700,color:'var(--danger)'}}>{fmt.date(r.vencimento)}</td>
                                <td>{r.descricao}{r.obs&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{r.obs}</div>}</td>
                                <td style={{textAlign:'right',fontWeight:700,color:'var(--danger)'}}>{fmt.currency(r.valor)}</td>
                                <td><button className="btn btn-success btn-sm" onClick={()=>{fechar();abrirModalRecebimento({tipo:'manual',id:r.id,cliente:r.descricao,valor:r.valor,dataRef:r.vencimento});}}>✓</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {totalAtr===0 && <div style={{textAlign:'center',padding:32,color:'var(--gray-400)'}}>🎉 Nenhum valor em atraso</div>}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* ── Modal de lançamento manual a receber ── */}
      {modalRecebManual && (
        <div className="modal-overlay open" onClick={()=>setModalRecebManual(false)}>
          <div className="modal" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRecebManual ? 'Editar lançamento' : 'Novo lançamento a receber'}</h2>
              <button className="modal-close" onClick={()=>setModalRecebManual(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={saveRecebManual}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Descrição *</label>
                    <input value={formRecebManual.descricao} onChange={e=>setFormRecebManual(f=>({...f,descricao:e.target.value}))}
                      placeholder="Ex: Cheque pré-datado, Acordo parcela 1..." required autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Valor (R$) *</label>
                    <input type="number" step="0.01" min="0.01" value={formRecebManual.valor}
                      onChange={e=>setFormRecebManual(f=>({...f,valor:e.target.value}))} placeholder="0,00" required />
                  </div>
                  <div className="form-group">
                    <label>Vencimento *</label>
                    <input type="date" value={formRecebManual.vencimento}
                      onChange={e=>setFormRecebManual(f=>({...f,vencimento:e.target.value}))} required />
                  </div>
                  <div className="form-group full">
                    <label>Observação</label>
                    <textarea value={formRecebManual.obs} onChange={e=>setFormRecebManual(f=>({...f,obs:e.target.value}))}
                      placeholder="Detalhes adicionais..." rows={2} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModalRecebManual(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
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
