// ===== DASHBOARD COMPLETO =====

function dashboard() {
  const periodo = sessionStorage.getItem('dash_periodo') || 'mes_atual';
  const { inicio, fim } = getPeriodoDates(periodo, new Date());
  renderDashboard(periodo, inicio, fim);
}

function getPeriodoDates(periodo, now) {
  const y = now.getFullYear(), m = now.getMonth();
  if (periodo === 'mes_atual')    return { inicio: new Date(y,m,1).toISOString().split('T')[0], fim: new Date(y,m+1,0).toISOString().split('T')[0] };
  if (periodo === 'mes_anterior') return { inicio: new Date(y,m-1,1).toISOString().split('T')[0], fim: new Date(y,m,0).toISOString().split('T')[0] };
  if (periodo === 'ano_atual')    return { inicio: new Date(y,0,1).toISOString().split('T')[0], fim: new Date(y,11,31).toISOString().split('T')[0] };
  if (periodo === 'ultimos_30') {
    const d = new Date(now); d.setDate(d.getDate()-29);
    return { inicio: d.toISOString().split('T')[0], fim: now.toISOString().split('T')[0] };
  }
  return {
    inicio: sessionStorage.getItem('dash_inicio') || new Date(y,m,1).toISOString().split('T')[0],
    fim:    sessionStorage.getItem('dash_fim')    || now.toISOString().split('T')[0]
  };
}

function dashChangePeriodo(val) {
  sessionStorage.setItem('dash_periodo', val);
  if (val !== 'personalizado') dashboard();
}

function dashApplyPersonalizado() {
  const ini = document.getElementById('dashIni');
  const fim = document.getElementById('dashFim');
  if (!ini || !fim || !ini.value || !fim.value) return;
  sessionStorage.setItem('dash_inicio', ini.value);
  sessionStorage.setItem('dash_fim', fim.value);
  const { inicio, fim: f } = getPeriodoDates('personalizado', new Date());
  renderDashboard('personalizado', inicio, f);
}

function renderDashboard(periodo, inicio, fim) {
  const mc = document.getElementById('mainContent');
  if (!mc) return;

  const allOrdens = Ordens.all();
  const oss = allOrdens.filter(o => o.data >= inicio && o.data <= fim);
  const finalizadas = oss.filter(o => o.status === 'finalizado');
  const emAndamento = allOrdens.filter(o => o.status === 'em_andamento');

  const receita = finalizadas.reduce((s,o) => s + (parseFloat(o.valorMO)||0) + (parseFloat(o.valorPecas)||0), 0);
  const meta = Meta.get().valor || 0;
  const pctMeta = meta > 0 ? Math.min(100, (receita / meta * 100)) : 0;

  // Faturamento por dia (últimos 7 dias do período)
  const diasMap = {};
  finalizadas.forEach(o => { diasMap[o.data] = (diasMap[o.data]||0) + (parseFloat(o.valorMO)||0) + (parseFloat(o.valorPecas)||0); });
  const diasKeys = Object.keys(diasMap).sort().slice(-7);

  // Top clientes
  const porCliente = {};
  finalizadas.forEach(o => { porCliente[o.clienteId] = (porCliente[o.clienteId]||0) + (parseFloat(o.valorMO)||0) + (parseFloat(o.valorPecas)||0); });
  const topClientes = Object.entries(porCliente).sort((a,b) => b[1]-a[1]).slice(0,5);

  // Ticket médio
  const ticketMedio = finalizadas.length ? receita / finalizadas.length : 0;

  mc.innerHTML = `
    <div class="dash-toolbar">
      <div class="dash-group">
        <div>
          <span class="dash-label">Período</span>
          <select class="dash-select" onchange="dashChangePeriodo(this.value)">
            <option value="mes_atual" ${periodo==='mes_atual'?'selected':''}>Mês atual</option>
            <option value="mes_anterior" ${periodo==='mes_anterior'?'selected':''}>Mês anterior</option>
            <option value="ultimos_30" ${periodo==='ultimos_30'?'selected':''}>Últimos 30 dias</option>
            <option value="ano_atual" ${periodo==='ano_atual'?'selected':''}>Ano atual</option>
            <option value="personalizado" ${periodo==='personalizado'?'selected':''}>Personalizado</option>
          </select>
        </div>
        ${periodo === 'personalizado' ? `
        <div>
          <span class="dash-label">De</span>
          <input class="dash-date-input" type="date" id="dashIni" value="${inicio}" onchange="dashApplyPersonalizado()" />
        </div>
        <div>
          <span class="dash-label">Até</span>
          <input class="dash-date-input" type="date" id="dashFim" value="${fim}" onchange="dashApplyPersonalizado()" />
        </div>` : ''}
      </div>
      <div class="dash-meta-inline">
        <span class="dash-meta-inline-label">Meta mensal:</span>
        ${meta > 0
          ? `<span class="dash-meta-inline-val">${fmt.currency(meta)}</span>`
          : `<span class="dash-meta-inline-empty">Não definida</span>`}
        <button class="btn btn-outline btn-sm" onclick="abrirModalMeta()">Definir</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card c-orange">
        <div class="stat-icon c-orange">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">${fmt.currency(receita)}</div>
          <div class="stat-label">Faturamento no período</div>
        </div>
      </div>
      <div class="stat-card c-blue">
        <div class="stat-icon c-blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">${finalizadas.length}</div>
          <div class="stat-label">OS finalizadas</div>
        </div>
      </div>
      <div class="stat-card c-green">
        <div class="stat-icon c-green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">${emAndamento.length}</div>
          <div class="stat-label">OS em andamento</div>
        </div>
      </div>
      <div class="stat-card c-purple">
        <div class="stat-icon c-purple">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">${fmt.currency(ticketMedio)}</div>
          <div class="stat-label">Ticket médio</div>
        </div>
      </div>
    </div>

    <div class="dash-grid-2">
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">Faturamento por Dia</div><div class="card-subtitle">Últimos dias do período</div></div>
        </div>
        <div class="chart-wrap" style="height:180px">
          ${renderBarChart(diasKeys.map(k => ({ label: k.substring(8), val: diasMap[k] })), '#F97316')}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">Meta do Mês</div><div class="card-subtitle">${fmt.currency(receita)} de ${fmt.currency(meta)}</div></div>
        </div>
        <div class="meta-bar-bg"><div class="meta-bar-fill" style="width:${pctMeta.toFixed(0)}%"></div></div>
        <div class="meta-labels"><span>${pctMeta.toFixed(0)}% atingido</span><span>${fmt.currency(meta)}</span></div>
        <div class="meta-stats">
          <div class="meta-stat"><div class="meta-stat-val">${fmt.currency(receita)}</div><div class="meta-stat-lbl">Realizado</div></div>
          <div class="meta-stat"><div class="meta-stat-val">${fmt.currency(Math.max(0, meta - receita))}</div><div class="meta-stat-lbl">Faltando</div></div>
        </div>
      </div>
    </div>

    <div class="dash-grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Top Clientes</div></div>
        ${topClientes.length ? topClientes.map(([cid, val], i) => {
          const c = Clientes.get(parseInt(cid));
          const max = topClientes[0][1];
          const ranks = ['gold','silver','bronze','',''];
          return `<div class="top-item">
            <div class="top-rank ${ranks[i]}">${i+1}</div>
            <div class="top-bar-wrap">
              <div class="top-bar-label">${c ? c.nome : 'Cliente #'+cid}</div>
              <div class="top-bar-bg"><div class="top-bar-fill" style="width:${(val/max*100).toFixed(0)}%"></div></div>
            </div>
            <div class="top-val">${fmt.currency(val)}</div>
          </div>`;
        }).join('') : '<p style="color:var(--gray-400);font-size:13px;padding:10px 0">Sem dados no período</p>'}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">OS em Andamento</div></div>
        ${emAndamento.length ? emAndamento.slice(0,5).map(o => {
          const c = Clientes.get(o.clienteId);
          const v = Veiculos.get(o.veiculoId);
          const total = (parseFloat(o.valorMO)||0) + (parseFloat(o.valorPecas)||0);
          return `<div class="dash-os-row">
            <div class="dash-os-num">#${o.numero}</div>
            <div class="dash-os-info">
              <div class="dash-os-cliente">${c ? c.nome : '—'}</div>
              <div class="dash-os-veiculo">${v ? v.marca+' '+v.modelo : '—'}</div>
            </div>
            <div class="dash-os-val">${fmt.currency(total)}</div>
          </div>`;
        }).join('') : '<p style="color:var(--gray-400);font-size:13px;padding:10px 0">Nenhuma OS em andamento</p>'}
        ${emAndamento.length > 5 ? `<div style="text-align:center;margin-top:10px"><button class="btn btn-ghost btn-sm" onclick="navigate('ordens')">Ver todas (${emAndamento.length})</button></div>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Resumo Geral</div>
      </div>
      <div class="stats-grid" style="margin-bottom:0">
        <div class="stat-card c-blue" style="cursor:pointer" onclick="navigate('clientes')">
          <div class="stat-icon c-blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div class="stat-body"><div class="stat-value">${Clientes.all().length}</div><div class="stat-label">Clientes</div></div>
        </div>
        <div class="stat-card c-purple" style="cursor:pointer" onclick="navigate('veiculos')">
          <div class="stat-icon c-purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
          <div class="stat-body"><div class="stat-value">${Veiculos.all().length}</div><div class="stat-label">Veículos</div></div>
        </div>
        <div class="stat-card c-orange" style="cursor:pointer" onclick="navigate('ordens')">
          <div class="stat-icon c-orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
          <div class="stat-body"><div class="stat-value">${allOrdens.length}</div><div class="stat-label">Total de OS</div></div>
        </div>
        <div class="stat-card c-green" style="cursor:pointer" onclick="navigate('estoque')">
          <div class="stat-icon c-green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
          <div class="stat-body"><div class="stat-value">${Estoque.all().length}</div><div class="stat-label">Itens no Estoque</div></div>
        </div>
      </div>
    </div>`;
}
