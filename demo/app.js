/// ===== USER DROPDOWN =====
function toggleUserMenu() {
  const dd = document.getElementById('userDropdown');
  if (!dd) return;
  dd.classList.toggle('open');
}

function closeUserMenu() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.remove('open');
}

// Fecha ao clicar fora
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('userMenuWrap');
  if (wrap && !wrap.contains(e.target)) closeUserMenu();
});

// ===== LANDING PAGE =====
function irParaLogin() {
  stopLandingAnimations();
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('loginScreen').classList.remove('hidden');
  history.pushState({ view: 'login' }, '', '#login');
}

// ===== GLOBAL SEARCH =====
function globalSearchHandler(q) {
  const box = document.getElementById('globalResults');
  if (!q || q.length < 2) { box.style.display = 'none'; return; }
  const ql = q.toLowerCase();
  const results = [];

  Clientes.all().filter(c => c.nome.toLowerCase().includes(ql)).slice(0,3).forEach(c => {
    results.push({ icon: '👤', label: c.nome, sub: c.telefone || '', action: `navigate('clientes')` });
  });
  Veiculos.all().filter(v => (v.marca+' '+v.modelo+' '+v.placa).toLowerCase().includes(ql)).slice(0,3).forEach(v => {
    const c = Clientes.get(v.clienteId);
    results.push({ icon: '🚗', label: v.marca+' '+v.modelo, sub: v.placa + (c ? ' · '+c.nome : ''), action: `navigate('veiculos')` });
  });
  Ordens.all().filter(o => ('#'+o.numero).includes(ql) || (o.problema||'').toLowerCase().includes(ql)).slice(0,3).forEach(o => {
    const c = Clientes.get(o.clienteId);
    results.push({ icon: '🔧', label: 'OS #'+o.numero, sub: c ? c.nome : o.problema, action: `navigate('ordens')` });
  });

  if (!results.length) { box.innerHTML = '<div class="gr-empty">Nenhum resultado</div>'; box.style.display = 'block'; return; }
  box.innerHTML = results.map(r =>
    `<div class="gr-item" onclick="${r.action};document.getElementById('globalSearch').value='';document.getElementById('globalResults').style.display='none'">
      <span class="gr-icon">${r.icon}</span>
      <div><div class="gr-label">${r.label}</div><div class="gr-sub">${r.sub}</div></div>
    </div>`
  ).join('');
  box.style.display = 'block';
}

// ===== AUTH =====
async function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;

  // Tenta autenticar no backend primeiro
  try {
    const data = await apiClient.login(user, pass);
    if (data.token) {
      stopLandingAnimations();
      document.getElementById('loginScreen').classList.add('hidden');
      showLoginLoader(function() {
        document.getElementById('appShell').style.display = 'flex';
        sessionStorage.setItem('of_auth', '1');
        sessionStorage.setItem('of_mode', 'api'); // modo API
        navigate('dashboard');
        Notif.start();
        history.pushState({ view: 'app', page: 'dashboard' }, '', '#app');
      });
      return;
    }
  } catch (err) {
    // Backend indisponível ou credenciais erradas via API
    // Tenta modo demo local
  }

  // Fallback: modo demo local (teste / 1234)
  if (user === 'teste' && pass === '1234') {
    stopLandingAnimations();
    document.getElementById('loginScreen').classList.add('hidden');
    showLoginLoader(function() {
      document.getElementById('appShell').style.display = 'flex';
      sessionStorage.setItem('of_auth', '1');
      sessionStorage.setItem('of_mode', 'local'); // modo localStorage
      navigate('dashboard');
      Notif.start();
      history.pushState({ view: 'app', page: 'dashboard' }, '', '#app');
    });
  } else {
    const box = document.querySelector('.login-box');
    box.style.animation = 'none';
    box.style.transform = 'translateX(-8px)';
    setTimeout(() => { box.style.transform = 'translateX(8px)'; }, 80);
    setTimeout(() => { box.style.transform = ''; }, 160);
    showToast('Usuário ou senha incorretos', 'error');
  }
}

function showLoginLoader(onDone) {
  const overlay = document.createElement('div');
  overlay.id = 'loginLoader';
  overlay.innerHTML = `
    <div class="ll-logo-wrap">
      <span class="ll-logo-text">Chave <span class="ll-logo-accent">10</span></span>
    </div>
    <div class="ll-bar-wrap">
      <div class="ll-bar-track">
        <div class="ll-bar-fill" id="llBarFill"></div>
      </div>
      <div class="ll-bar-glow"></div>
    </div>
    <div class="ll-status" id="llStatus">Iniciando sistema...</div>
    <div class="ll-dots">
      <span class="ll-dot"></span>
      <span class="ll-dot"></span>
      <span class="ll-dot"></span>
    </div>
    <!-- CARRO LEGO (vista lateral) -->
  `;
  document.body.appendChild(overlay);

  // Barra de progresso animada
  const allSteps = [
    // 0-20%
    [ { pct: 12, msg: '🔧 Apertando os parafusos do sistema...' },
      { pct: 12, msg: '🪛 Calibrando a chave de fenda...' },
      { pct: 12, msg: '🔩 Verificando torque das credenciais...' } ],
    // 20-45%
    [ { pct: 42, msg: '🛢️ Trocando o óleo do banco de dados...' },
      { pct: 42, msg: '⚙️ Engrenagens girando, aguarde...' },
      { pct: 42, msg: '🔋 Carregando a bateria do dashboard...' } ],
    // 45-70%
    [ { pct: 68, msg: '🚗 Aquecendo o motor principal...' },
      { pct: 68, msg: '🏎️ Acelerando o carregamento...' },
      { pct: 68, msg: '💨 Limpando o filtro de ar dos dados...' } ],
    // 70-90%
    [ { pct: 88, msg: '🔦 Verificando a suspensão do sistema...' },
      { pct: 88, msg: '🛞 Alinhando as rodas do painel...' },
      { pct: 88, msg: '🪝 Rebocando os últimos dados...' } ],
    // 100%
    [ { pct: 100, msg: '✅ Carro na vaga, pode entrar!' },
      { pct: 100, msg: '✅ Motor ligado, bora trabalhar!' },
      { pct: 100, msg: '✅ Revisão completa, tudo certo!' } ],
  ];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const steps = allSteps.map(pick);
  const timings = [400, 800, 600, 700, 500];
  let elapsed = 0;
  steps.forEach((s, i) => {
    elapsed += timings[i];
    setTimeout(() => {
      const bar = document.getElementById('llBarFill');
      const status = document.getElementById('llStatus');
      if (bar) bar.style.width = s.pct + '%';
      if (status) status.textContent = s.msg;
    }, elapsed);
  });

  setTimeout(() => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.4s';
    setTimeout(() => { overlay.remove(); onDone(); }, 400);
  }, 3200);
}


function doLogout() {
  sessionStorage.removeItem('of_auth');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('landingPage').style.display = '';
  history.pushState({ view: 'landing' }, '', '#');
  requestAnimationFrame(initLandingAnimations);
}

function updateNotifBadge() {
  const hoje = new Date().toISOString().split('T')[0];
  const vencidos = Lembretes.all().filter(l => l.dataPrevisao && l.dataPrevisao <= hoje).length;
  const badge = document.getElementById('notifBadge');
  if (badge) {
    badge.style.display = vencidos > 0 ? 'block' : 'none';
    badge.textContent = vencidos > 0 ? vencidos : '';
  }
}

// ===== SISTEMA DE NOTIFICAÇÕES COM SOM =====
const Notif = {
  _lastCount: null,

  // Gera som de notificação via Web Audio API (sem arquivo externo)
  playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const play = (freq, start, dur, vol = 0.3) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      // Dois bipes suaves: dó + mi
      play(880, 0,    0.18);
      play(1100, 0.2, 0.22);
    } catch(e) {}
  },

  // Mostra notificação nativa do browser
  async showNativa(titulo, corpo) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      const n = new Notification(titulo, {
        body: corpo,
        icon: '/Imagens/logo.png',
        badge: '/Imagens/logo.png',
        tag: 'chave10-alerta',
        renotify: true,
      });
      n.onclick = () => { window.focus(); navigate('lembretes'); n.close(); };
      setTimeout(() => n.close(), 8000);
    }
  },

  // Mostra banner in-app
  showBanner(vencidos, proximos) {
    let banner = document.getElementById('notifBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'notifBanner';
      banner.style.cssText = `
        position:fixed;top:70px;right:20px;z-index:9998;
        background:#fff;border-radius:12px;
        box-shadow:0 8px 32px rgba(0,0,0,.18);
        border:1px solid var(--gray-200);
        width:320px;padding:16px 18px;
        animation:notifSlideIn .3s cubic-bezier(.4,0,.2,1);
        border-left:4px solid var(--accent);
      `;
      document.body.appendChild(banner);
    }

    const itens = [...vencidos.map(l => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray-100)">
        <span style="font-size:16px">🔴</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.descricao}</div>
          <div style="font-size:11px;color:var(--danger)">Vencido em ${fmt.date(l.dataPrevisao)}</div>
        </div>
      </div>`),
      ...proximos.map(l => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray-100)">
        <span style="font-size:16px">🟡</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.descricao}</div>
          <div style="font-size:11px;color:var(--warning)">Vence em ${fmt.date(l.dataPrevisao)}</div>
        </div>
      </div>`)
    ].slice(0, 5).join('');

    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">🔔</span>
          <span style="font-size:14px;font-weight:700;color:var(--gray-900)">Alertas de manutenção</span>
        </div>
        <button onclick="document.getElementById('notifBanner').remove()" style="background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:18px;line-height:1;padding:2px">×</button>
      </div>
      ${itens}
      <button onclick="navigate('lembretes');document.getElementById('notifBanner')?.remove()" 
        class="btn btn-primary btn-sm" style="width:100%;justify-content:center;margin-top:10px">
        Ver todos os lembretes
      </button>`;

    // Auto-fecha em 12s
    clearTimeout(Notif._bannerTimer);
    Notif._bannerTimer = setTimeout(() => banner?.remove(), 12000);
  },

  // Verifica alertas e dispara se necessário
  check(forcar = false) {
    const hoje = new Date().toISOString().split('T')[0];
    const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7);
    const em7str = em7dias.toISOString().split('T')[0];

    const todos = Lembretes.all();
    const vencidos = todos.filter(l => !l.visto && l.dataPrevisao && l.dataPrevisao <= hoje);
    const proximos = todos.filter(l => !l.visto && l.dataPrevisao && l.dataPrevisao > hoje && l.dataPrevisao <= em7str);
    const total = vencidos.length + proximos.length;

    // Atualiza badge
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.style.display = total > 0 ? 'block' : 'none';
      badge.textContent = total > 0 ? total : '';
    }

    // Só dispara som/notificação se mudou ou foi forçado
    if (!forcar && Notif._lastCount === total) return;
    const era = Notif._lastCount;
    Notif._lastCount = total;

    if (total === 0) return;
    // Só toca se aumentou ou é a primeira vez
    if (!forcar && era !== null && total <= era) return;

    Notif.playSound();

    const corpo = [
      vencidos.length ? `${vencidos.length} vencido(s)` : '',
      proximos.length ? `${proximos.length} vence(m) em 7 dias` : ''
    ].filter(Boolean).join(' · ');

    Notif.showNativa('🔔 Chave 10 — Alertas de manutenção', corpo);
    Notif.showBanner(vencidos, proximos);
  },

  // Inicia verificação periódica
  start() {
    Notif.check(true);
    // Verifica a cada 5 minutos
    setInterval(() => Notif.check(), 5 * 60 * 1000);
  }
};

// Adiciona CSS da animação do banner
(function() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes notifSlideIn {
      from { opacity:0; transform:translateX(20px); }
      to   { opacity:1; transform:translateX(0); }
    }
  `;
  document.head.appendChild(s);
})();

// ===== UTILS =====
const fmt = {
  currency: (v) => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  date: (iso) => { if (!iso) return '-'; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; },
  phone: (v) => v || '-'
};

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 3000);
}

function openModal(title, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function confirm(msg, cb) {
  openModal('Confirmar', `
    <p style="margin-bottom:20px;font-size:15px;color:var(--gray-700)">${msg}</p>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" onclick="closeModal();(${cb.toString()})()">Confirmar</button>
    </div>`);
}

// ===== ROUTER =====
let currentPage = 'dashboard';

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const main = document.getElementById('mainContent');
  const pages = { dashboard, clientes, veiculos, ordens, lembretes, orcamentos, agenda, financeiro, relatorios, configuracoes, estoque, planos, mensagens };
  main.innerHTML = '';
  main.classList.remove('page-enter');
  void main.offsetWidth;
  main.classList.add('page-enter');
  pages[page]();
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  // Só faz pushState se não for chamado pelo popstate
  if (!navigate._fromPop) {
    history.pushState({ view: 'app', page }, '', '#app/' + page);
  }
}

// ===== DASHBOARD =====
function dashboard() {
  const now = new Date();
  const periodoSalvo = sessionStorage.getItem('dash_periodo') || 'mes_atual';
  const { inicio, fim } = getPeriodoDates(periodoSalvo, now);
  renderDashboard(periodoSalvo, inicio, fim);
}

function getPeriodoDates(periodo, now) {
  const y = now.getFullYear(), m = now.getMonth();
  let inicio, fim;
  if (periodo === 'mes_atual') {
    inicio = new Date(y, m, 1).toISOString().split('T')[0];
    fim = new Date(y, m + 1, 0).toISOString().split('T')[0];
  } else if (periodo === 'mes_anterior') {
    inicio = new Date(y, m - 1, 1).toISOString().split('T')[0];
    fim = new Date(y, m, 0).toISOString().split('T')[0];
  } else if (periodo === 'ano_atual') {
    inicio = new Date(y, 0, 1).toISOString().split('T')[0];
    fim = new Date(y, 11, 31).toISOString().split('T')[0];
  } else if (periodo === 'ultimos_30') {
    const d = new Date(now); d.setDate(d.getDate() - 29);
    inicio = d.toISOString().split('T')[0];
    fim = now.toISOString().split('T')[0];
  } else {
    inicio = sessionStorage.getItem('dash_inicio') || new Date(y, m, 1).toISOString().split('T')[0];
    fim = sessionStorage.getItem('dash_fim') || now.toISOString().split('T')[0];
  }
  return { inicio, fim };
}

function dashChangePeriodo(val) {
  sessionStorage.setItem('dash_periodo', val);
  if (val === 'personalizado') return;
  dashboard();
}

function dashApplyCustom() {
  const i = document.getElementById('dashIni').value;
  const f = document.getElementById('dashFim').value;
  if (!i || !f) return;
  sessionStorage.setItem('dash_inicio', i);
  sessionStorage.setItem('dash_fim', f);
  renderDashboard('personalizado', i, f);
}

function saveMeta() {
  const inp = document.getElementById('dashMeta');
  if (!inp) { showToast('Erro ao ler o campo', 'error'); return; }
  const v = parseFloat(inp.value || 0);
  if (isNaN(v) || v < 0) { showToast('Valor inválido', 'error'); return; }
  Meta.set(v);
  closeModal();
  showToast('Meta salva!', 'success');
  // Força re-render do dashboard após o modal fechar
  requestAnimationFrame(() => dashboard());
}

function abrirModalMeta() {
  const meta = Meta.get().valor || 0;
  openModal('🎯 Meta mensal', `
    <p style="font-size:13.5px;color:var(--gray-500);margin-bottom:20px">
      Defina quanto sua oficina precisa faturar este mês. O dashboard vai calcular automaticamente quanto falta e quanto você precisa faturar por dia.
    </p>
    <div class="form-group" style="margin-bottom:20px">
      <label>Meta de faturamento (R$)</label>
      <input id="dashMeta" type="number" step="100" min="0"
        value="${meta || ''}" placeholder="Ex: 30000"
        style="font-size:18px;font-weight:700;padding:13px 16px"
        onkeydown="if(event.key==='Enter')saveMeta()" />
      <span style="font-size:12px;color:var(--gray-400);margin-top:4px">Pressione Enter ou clique em Salvar</span>
    </div>
    ${meta > 0 ? `
    <div style="background:var(--gray-50);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--gray-500)">
      Meta atual: <strong style="color:var(--gray-800)">${fmt.currency(meta)}</strong>
    </div>` : ''}
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      ${meta > 0 ? `<button class="btn btn-ghost" style="color:var(--danger)" onclick="Meta.set(0);closeModal();showToast('Meta removida');requestAnimationFrame(()=>dashboard())">Remover meta</button>` : ''}
      <button class="btn btn-primary" onclick="saveMeta()">💾 Salvar meta</button>
    </div>`);
  setTimeout(() => {
    const inp = document.getElementById('dashMeta');
    if (inp) { inp.focus(); inp.select(); }
  }, 100);
}

function renderDashboard(periodo, inicio, fim) {
  const todasOrdens = Ordens.all();
  const ordensPeriodo = todasOrdens.filter(o => o.data >= inicio && o.data <= fim && o.status === 'finalizado');
  const ordensAbertas = todasOrdens.filter(o => o.status === 'em_andamento');

  // --- KPIs ---
  const faturamento = ordensPeriodo.reduce((s, o) => s + parseFloat(o.valorMO || 0) + parseFloat(o.valorPecas || 0), 0);
  const qtdServicos = ordensPeriodo.length;
  const ticketMedio = qtdServicos > 0 ? faturamento / qtdServicos : 0;
  const veiculosSet = new Set(ordensPeriodo.map(o => o.veiculoId));
  const clientesSet = new Set(ordensPeriodo.map(o => o.clienteId));

  // --- Período anterior para variação ---
  const diffDias = Math.max(1, Math.round((new Date(fim) - new Date(inicio)) / 86400000) + 1);
  const antFim = new Date(inicio); antFim.setDate(antFim.getDate() - 1);
  const antIni = new Date(antFim); antIni.setDate(antIni.getDate() - diffDias + 1);
  const antIniStr = antIni.toISOString().split('T')[0];
  const antFimStr = antFim.toISOString().split('T')[0];
  const ordensAnt = todasOrdens.filter(o => o.data >= antIniStr && o.data <= antFimStr && o.status === 'finalizado');
  const fatAnt = ordensAnt.reduce((s, o) => s + parseFloat(o.valorMO || 0) + parseFloat(o.valorPecas || 0), 0);

  function variacao(atual, anterior) {
    if (anterior === 0) return atual > 0 ? '<span class="dash-var up">▲ novo</span>' : '';
    const pct = ((atual - anterior) / anterior * 100).toFixed(1);
    return pct >= 0
      ? `<span class="dash-var up">▲ ${pct}%</span>`
      : `<span class="dash-var down">▼ ${Math.abs(pct)}%</span>`;
  }

  // --- Meta ---
  const meta = Meta.get().valor || 0;
  const now = new Date();
  const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const diaAtual = now.getDate();
  const diasRestantes = Math.max(1, diasNoMes - diaAtual);
  const faltaMeta = Math.max(0, meta - faturamento);
  const porDia = diasRestantes > 0 ? faltaMeta / diasRestantes : 0;
  const pctMeta = meta > 0 ? Math.min(100, (faturamento / meta) * 100) : 0;

  // --- Faturamento por dia (gráfico de linha) ---
  const diasPeriodo = [];
  const cur = new Date(inicio);
  const fimDate = new Date(fim);
  while (cur <= fimDate) { diasPeriodo.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1); }
  const fatPorDia = diasPeriodo.map(d => ({
    d,
    v: ordensPeriodo.filter(o => o.data === d).reduce((s, o) => s + parseFloat(o.valorMO || 0) + parseFloat(o.valorPecas || 0), 0)
  }));

  // --- Faturamento acumulado vs meta ---
  let acum = 0;
  const fatAcum = fatPorDia.map(({ d, v }) => { acum += v; return { d, v: acum }; });

  // --- Serviços por dia (barras) ---
  const servPorDia = diasPeriodo.map(d => ({
    d,
    v: ordensPeriodo.filter(o => o.data === d).length
  }));

  // --- Top 5 serviços ---
  const servicoMap = {};
  ordensPeriodo.forEach(o => {
    const servs = (o.servicos || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    servs.forEach(s => {
      const key = s.toLowerCase().substring(0, 30);
      if (!servicoMap[key]) servicoMap[key] = { nome: s, qtd: 0, fat: 0 };
      servicoMap[key].qtd++;
      servicoMap[key].fat += (parseFloat(o.valorMO || 0) + parseFloat(o.valorPecas || 0)) / Math.max(1, servs.length);
    });
  });
  const top5 = Object.values(servicoMap).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  const maxQtd = top5.length ? top5[0].qtd : 1;

  // --- Top clientes ---
  const clienteMap = {};
  ordensPeriodo.forEach(o => {
    const c = Clientes.get(o.clienteId);
    const v = Veiculos.get(o.veiculoId);
    if (!c) return;
    if (!clienteMap[c.id]) clienteMap[c.id] = { nome: c.nome, veiculo: v ? v.marca + ' ' + v.modelo : '-', total: 0 };
    clienteMap[c.id].total += parseFloat(o.valorMO || 0) + parseFloat(o.valorPecas || 0);
  });
  const topClientes = Object.values(clienteMap).sort((a, b) => b.total - a.total).slice(0, 5);

  // --- Distribuição por categoria (pizza) ---
  const categorias = { 'Troca de óleo': 0, 'Freios': 0, 'Suspensão': 0, 'Elétrica': 0, 'Revisão': 0, 'Outros': 0 };
  ordensPeriodo.forEach(o => {
    const s = (o.servicos || '').toLowerCase();
    const val = parseFloat(o.valorMO || 0) + parseFloat(o.valorPecas || 0);
    if (s.includes('óleo') || s.includes('oleo')) categorias['Troca de óleo'] += val;
    else if (s.includes('freio') || s.includes('pastilha') || s.includes('disco')) categorias['Freios'] += val;
    else if (s.includes('suspensão') || s.includes('suspensao') || s.includes('amortecedor') || s.includes('bucha')) categorias['Suspensão'] += val;
    else if (s.includes('elétric') || s.includes('eletric') || s.includes('bateria') || s.includes('lâmpada')) categorias['Elétrica'] += val;
    else if (s.includes('revisão') || s.includes('revisao') || s.includes('correia')) categorias['Revisão'] += val;
    else categorias['Outros'] += val;
  });

  const periodoLabel = { mes_atual: 'Mês atual', mes_anterior: 'Mês anterior', ano_atual: 'Ano atual', ultimos_30: 'Últimos 30 dias', personalizado: 'Personalizado' }[periodo] || periodo;

  // Faturamento hoje e semana
  const _hoje = new Date().toISOString().split('T')[0];
  const _semAgo = new Date(); _semAgo.setDate(_semAgo.getDate() - 6);
  const _semStr = _semAgo.toISOString().split('T')[0];
  const fatSemana = todasOrdens.filter(o => o.data >= _semStr && o.data <= _hoje && o.status === 'finalizado')
    .reduce((s,o) => s + parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0), 0);
  const fatHoje = todasOrdens.filter(o => o.data === _hoje && o.status === 'finalizado')
    .reduce((s,o) => s + parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0), 0);

  document.getElementById('mainContent').innerHTML = `

    <!-- HERO SECTION -->
    <div style="background:linear-gradient(135deg,var(--brand) 0%,var(--brand-mid) 100%);border-radius:var(--r-lg);padding:28px 32px;margin-bottom:24px;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 80% 50%,rgba(249,115,22,.18),transparent 60%);pointer-events:none"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;position:relative;z-index:1">
        <div>
          <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Faturamento do mês</div>
          <div style="font-family:'Poppins',sans-serif;font-size:38px;font-weight:800;color:#fff;line-height:1;margin-bottom:10px">${fmt.currency(faturamento)}</div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:${meta>0?'14px':'4px'}">
            ${fatAnt > 0 ? variacao(faturamento, fatAnt) : ''}
            <span style="font-size:13px;color:rgba(255,255,255,.55)">${qtdServicos} serviço(s) · ticket médio ${fmt.currency(ticketMedio)}</span>
          </div>
          ${meta > 0 ? `
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:12px;color:rgba(255,255,255,.5)">Meta: ${fmt.currency(meta)}</span>
              <span style="font-size:12px;font-weight:700;color:${pctMeta>=100?'#4ade80':'rgba(255,255,255,.8)'}">${pctMeta.toFixed(1)}%</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,.15);border-radius:99px;overflow:hidden;width:320px;max-width:100%">
              <div style="height:100%;width:${pctMeta}%;background:${pctMeta>=100?'#4ade80':'var(--accent)'};border-radius:99px"></div>
            </div>
            <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,.7)">
              ${pctMeta >= 100 ? '🏆 Meta atingida! Parabéns!' : `Hoje você precisa faturar <strong style="color:#fff">${fmt.currency(porDia)}</strong> para bater a meta`}
            </div>
          </div>` : `<button class="btn btn-sm" onclick="abrirModalMeta()" style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2)">🎯 Definir meta mensal</button>`}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end">
          <button class="btn btn-primary" onclick="navigate('ordens');setTimeout(novaOrdem,100)"
            style="font-size:15px;padding:14px 22px;box-shadow:0 4px 20px rgba(249,115,22,.5)">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            Nova Ordem de Serviço
          </button>
          <div style="display:flex;gap:8px">
            <div style="background:rgba(255,255,255,.1);border-radius:var(--r-sm);padding:10px 14px;text-align:center;min-width:80px">
              <div style="font-size:10px;color:rgba(255,255,255,.45);margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px">Hoje</div>
              <div style="font-size:15px;font-weight:800;color:#fff">${fmt.currency(fatHoje)}</div>
            </div>
            <div style="background:rgba(255,255,255,.1);border-radius:var(--r-sm);padding:10px 14px;text-align:center;min-width:80px">
              <div style="font-size:10px;color:rgba(255,255,255,.45);margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px">Semana</div>
              <div style="font-size:15px;font-weight:800;color:#fff">${fmt.currency(fatSemana)}</div>
            </div>
            <div style="background:rgba(255,255,255,.1);border-radius:var(--r-sm);padding:10px 14px;text-align:center;min-width:80px">
              <div style="font-size:10px;color:rgba(255,255,255,.45);margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px">OS abertas</div>
              <div style="font-size:15px;font-weight:800;color:${ordensAbertas.length>0?'#fbbf24':'#fff'}">${ordensAbertas.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="page-header" style="margin-bottom:16px">
      <div><div class="page-title">Dashboard</div><div class="page-subtitle">${periodoLabel} · ${fmt.date(inicio)} a ${fmt.date(fim)}</div></div>
    </div>

    <!-- PERÍODO -->
    <div class="dash-toolbar">
      <div class="dash-group">
        <label class="dash-label">Período</label>
        <select class="dash-select" onchange="dashChangePeriodo(this.value)">
          <option value="mes_atual" ${periodo==='mes_atual'?'selected':''}>Mês atual</option>
          <option value="mes_anterior" ${periodo==='mes_anterior'?'selected':''}>Mês anterior</option>
          <option value="ultimos_30" ${periodo==='ultimos_30'?'selected':''}>Últimos 30 dias</option>
          <option value="ano_atual" ${periodo==='ano_atual'?'selected':''}>Ano atual</option>
          <option value="personalizado" ${periodo==='personalizado'?'selected':''}>Personalizado</option>
        </select>
        ${periodo === 'personalizado' ? `
          <input type="date" id="dashIni" class="dash-date-input" value="${inicio}" />
          <span style="color:var(--gray-400)">até</span>
          <input type="date" id="dashFim" class="dash-date-input" value="${fim}" />
          <button class="btn btn-primary btn-sm" onclick="dashApplyCustom()">Aplicar</button>` : ''}
      </div>
      <div class="dash-meta-inline">
        <span class="dash-meta-inline-label">🎯 Meta do mês:</span>
        ${meta > 0
          ? `<span class="dash-meta-inline-val">${fmt.currency(meta)}</span>`
          : `<span class="dash-meta-inline-empty">Não definida</span>`}
        <button class="btn btn-outline btn-sm" onclick="abrirModalMeta()">✏️ Alterar meta</button>
      </div>
    </div>

    <!-- KPI CARDS -->
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:24px">
      <div class="stat-card orange">
        <div class="stat-icon orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div><div class="stat-value anim-count" data-val="${faturamento}" data-currency="1" style="font-size:18px">${fmt.currency(faturamento)}</div><div class="stat-label">Faturamento</div>${variacao(faturamento, fatAnt)}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div><div class="stat-value">${qtdServicos}</div><div class="stat-label">Serviços realizados</div>${variacao(qtdServicos, ordensAnt.length)}</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div><div class="stat-value anim-count" data-val="${ticketMedio}" data-currency="1" style="font-size:18px">${fmt.currency(ticketMedio)}</div><div class="stat-label">Ticket médio</div></div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
        <div><div class="stat-value">${veiculosSet.size}</div><div class="stat-label">Veículos atendidos</div></div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <div><div class="stat-value">${clientesSet.size}</div><div class="stat-label">Clientes atendidos</div></div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
        <div><div class="stat-value">${ordensAbertas.length}</div><div class="stat-label">OS abertas</div></div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div><div class="stat-value">${qtdServicos}</div><div class="stat-label">OS finalizadas</div></div>
      </div>
    </div>

    <!-- GRÁFICO FATURAMENTO DIÁRIO -->
    <div class="card" style="margin-bottom:20px">
      <div class="dash-card-header">
        <span>📈 Faturamento diário</span>
      </div>
      ${renderLineChart(fatPorDia, '#2563eb')}
    </div>

    <!-- META + BARRAS SERVIÇOS -->
    <div class="dash-two-col" style="margin-bottom:20px">
      <div class="card">
        <div class="dash-card-header"><span>🎯 Progresso da meta</span></div>
        ${meta > 0 ? `
        <div class="meta-progress-wrap">
          <div class="meta-progress-bar-bg">
            <div class="meta-progress-bar-fill" style="width:${pctMeta}%;background:${pctMeta>=100?'var(--success)':pctMeta>=70?'var(--warning)':'var(--primary)'}"></div>
          </div>
          <div class="meta-progress-labels">
            <span>${fmt.currency(faturamento)}</span>
            <span style="font-weight:700;color:${pctMeta>=100?'var(--success)':'var(--primary)'}">${pctMeta.toFixed(1)}%</span>
            <span>${fmt.currency(meta)}</span>
          </div>
        </div>
        <div class="meta-info-box ${pctMeta>=100?'meta-ok':''}">
          ${pctMeta >= 100
            ? `<div class="meta-info-icon">🏆</div><div><div class="meta-info-title">Meta atingida!</div><div class="meta-info-sub">Parabéns! Você superou a meta do período.</div></div>`
            : `<div class="meta-info-icon">📊</div><div>
                <div class="meta-info-title">Falta ${fmt.currency(faltaMeta)}</div>
                <div class="meta-info-sub">${diasRestantes} dias restantes · Precisa de <strong>${fmt.currency(porDia)}/dia</strong></div>
              </div>`}
        </div>
        ${renderAcumChart(fatAcum, meta, diasPeriodo.length)}
        ` : `<div class="empty-state" style="padding:32px"><div class="empty-icon">🎯</div><p>Defina uma meta mensal acima</p></div>`}
      </div>

      <div class="card">
        <div class="dash-card-header"><span>📊 Serviços por dia</span></div>
        ${renderBarChart(servPorDia)}
      </div>
    </div>

    <!-- TOP 5 SERVIÇOS + TOP CLIENTES -->
    <div class="dash-two-col" style="margin-bottom:20px">
      <div class="card">
        <div class="dash-card-header"><span>🔧 Top 5 serviços do período</span></div>
        ${top5.length ? top5.map((s, i) => `
          <div class="top-item">
            <div class="top-rank">${i + 1}</div>
            <div class="top-info">
              <div class="top-name">${s.nome}</div>
              <div class="top-bar-wrap">
                <div class="top-bar" style="width:${(s.qtd/maxQtd*100).toFixed(0)}%"></div>
              </div>
            </div>
            <div class="top-stats">
              <div class="top-qtd">${s.qtd}x</div>
              <div class="top-fat">${fmt.currency(s.fat)}</div>
            </div>
          </div>`).join('')
          : '<div class="empty-state" style="padding:32px"><div class="empty-icon">🔧</div><p>Sem dados no período</p></div>'}
      </div>

      <div class="card">
        <div class="dash-card-header"><span>👑 Top clientes do período</span></div>
        ${topClientes.length ? topClientes.map((c, i) => `
          <div class="top-item">
            <div class="top-rank">${i + 1}</div>
            <div class="top-info">
              <div class="top-name">${c.nome}</div>
              <div class="top-sub">${c.veiculo}</div>
            </div>
            <div class="top-stats">
              <div class="top-fat">${fmt.currency(c.total)}</div>
            </div>
          </div>`).join('')
          : '<div class="empty-state" style="padding:32px"><div class="empty-icon">👤</div><p>Sem dados no período</p></div>'}
      </div>
    </div>

    <!-- PIZZA DISTRIBUIÇÃO -->
    <div class="card" style="margin-bottom:20px">
      <div class="dash-card-header"><span>🥧 Distribuição de receita por categoria</span></div>
      ${renderPieChart(categorias)}
    </div>`;

  // Animação de contagem nos KPI cards
  requestAnimationFrame(() => {
    document.querySelectorAll('.anim-count').forEach(el => {
      const target = parseFloat(el.dataset.val) || 0;
      if (target === 0) return;
      const isCurrency = el.dataset.currency === '1';
      let step = 0; const steps = 30;
      const timer = setInterval(() => {
        step++;
        const val = target * Math.min(step / steps, 1);
        el.textContent = isCurrency ? fmt.currency(val) : Math.round(val);
        if (step >= steps) { clearInterval(timer); el.textContent = isCurrency ? fmt.currency(target) : target; }
      }, 800 / steps);
    });
  });
}

// ===== CHART TOOLTIP =====
function showChartTip(event, el) {
  if (!el) return;
  const tip = document.getElementById('chartTip');
  if (!tip) return;
  tip.textContent = el.dataset.tip || '';
  tip.style.display = 'block';
  _moveChartTip(event);
}

function _moveChartTip(event) {
  const tip = document.getElementById('chartTip');
  if (!tip || tip.style.display === 'none') return;
  const x = event.clientX, y = event.clientY;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  tip.style.left = (x + 14 + tw > vw ? x - tw - 10 : x + 14) + 'px';
  tip.style.top  = (y - 10 + th > vh ? y - th - 4  : y - 10) + 'px';
}

function hideChartTip() {
  const tip = document.getElementById('chartTip');
  if (tip) tip.style.display = 'none';
}

document.addEventListener('mousemove', _moveChartTip);

// ===== CHART HELPERS =====
function renderLineChart(data, color) {
  if (!data.length || data.every(d => d.v === 0)) return '<div class="empty-state" style="padding:24px"><p>Sem dados no período</p></div>';
  const id = 'lc_' + Math.random().toString(36).slice(2);
  // Largura adaptativa: mais espaço por ponto para períodos mensais
  const minW = 900, perPt = 26;
  const W = Math.max(minW, data.length * perPt);
  const H = 180, pad = { t: 16, r: 20, b: 36, l: 64 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const maxV = Math.max(...data.map(d => d.v), 1);
  const xStep = cW / Math.max(data.length - 1, 1);

  const pts = data.map((d, i) => `${pad.l + i * xStep},${pad.t + cH - (d.v / maxV) * cH}`).join(' ');
  const area = `${pad.l},${pad.t + cH} ` + pts + ` ${pad.l + (data.length - 1) * xStep},${pad.t + cH}`;

  // Mostrar todos os dias se <= 31, senão a cada 2 ou mais
  const step = data.length <= 31 ? 1 : data.length <= 60 ? 2 : Math.ceil(data.length / 20);
  const xLabels = data.map((d, i) => {
    if (i % step !== 0) return '';
    const day = d.d.split('-')[2];
    return `<text x="${pad.l + i * xStep}" y="${H - 6}" text-anchor="middle" font-size="9.5" fill="#9ca3af">${day}</text>`;
  }).join('');

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = pad.t + cH - f * cH;
    const v = f * maxV;
    return `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="#f3f4f6" stroke-width="1"/>
            <text x="${pad.l - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#9ca3af">${v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0)}</text>`;
  }).join('');

  const dots = data.map((d, i) => {
    const cx = pad.l + i * xStep;
    const cy = pad.t + cH - (d.v / maxV) * cH;
    const label = d.d.split('-')[2] + '/' + d.d.split('-')[1];
    const val = 'R$ ' + d.v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return d.v > 0 ? `
      <circle class="chart-dot" cx="${cx}" cy="${cy}" r="4" fill="${color}" stroke="#fff" stroke-width="2"
        data-tip="${label}: ${val}" onmouseenter="showChartTip(event,this)" onmouseleave="hideChartTip()"/>
      <circle cx="${cx}" cy="${cy}" r="14" fill="transparent"
        onmouseenter="showChartTip(event,document.querySelector('[data-tip=\\'${label}: ${val}\\']'))" onmouseleave="hideChartTip()"/>` : '';
  }).join('');

  return `<div style="overflow-x:auto;position:relative"><svg id="${id}" viewBox="0 0 ${W} ${H}" style="width:100%;min-width:${Math.min(W,600)}px;height:${H}px;overflow:visible">
    <defs><linearGradient id="lg_${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity=".18"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    ${yLabels}
    <polygon points="${area}" fill="url(#lg_${id})"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${xLabels}
  </svg></div>`;
}

function renderBarChart(data) {
  if (!data.length || data.every(d => d.v === 0)) return '<div class="empty-state" style="padding:24px"><p>Sem dados no período</p></div>';
  const minW = 900, perPt = 26;
  const W = Math.max(minW, data.length * perPt);
  const H = 180, pad = { t: 16, r: 20, b: 36, l: 40 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const maxV = Math.max(...data.map(d => d.v), 1);
  const barW = Math.max(2, cW / data.length - 3);
  const step = data.length <= 31 ? 1 : data.length <= 60 ? 2 : Math.ceil(data.length / 20);

  const bars = data.map((d, i) => {
    const bH = Math.max((d.v / maxV) * cH, d.v > 0 ? 2 : 0);
    const x = pad.l + i * (cW / data.length);
    const y = pad.t + cH - bH;
    const label = d.d.split('-')[2] + '/' + d.d.split('-')[1];
    return `
      <rect class="chart-bar" x="${x}" y="${y}" width="${barW}" height="${bH}" rx="3"
        fill="${d.v > 0 ? '#1E3A5F' : '#e5e7eb'}"
        data-tip="${label}: ${d.v} serviço(s)"
        onmouseenter="showChartTip(event,this)" onmouseleave="hideChartTip()"
        style="cursor:${d.v > 0 ? 'pointer' : 'default'}"/>
      <rect x="${x}" y="${pad.t}" width="${barW}" height="${cH}" fill="transparent"
        onmouseenter="showChartTip(event,document.querySelector('[data-tip=\\'${label}: ${d.v} serviço(s)\\']'))" onmouseleave="hideChartTip()"/>
      ${i % step === 0 ? `<text x="${x + barW/2}" y="${H - 6}" text-anchor="middle" font-size="9.5" fill="#9ca3af">${d.d.split('-')[2]}</text>` : ''}`;
  }).join('');

  const yLabels = [0, 0.5, 1].map(f => {
    const y = pad.t + cH - f * cH;
    return `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="#f3f4f6" stroke-width="1"/>
            <text x="${pad.l - 4}" y="${y + 4}" text-anchor="end" font-size="10" fill="#9ca3af">${Math.round(f * maxV)}</text>`;
  }).join('');

  return `<div style="overflow-x:auto;position:relative"><svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:${Math.min(W,600)}px;height:${H}px;overflow:visible">
    ${yLabels}${bars}
  </svg></div>`;
}

function renderAcumChart(acumData, meta, totalDias) {
  if (!acumData.length) return '';
  const W = 800, H = 120, pad = { t: 12, r: 16, b: 28, l: 64 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const maxV = Math.max(meta * 1.1, acumData[acumData.length - 1].v * 1.1, 1);
  const xStep = cW / Math.max(acumData.length - 1, 1);

  const pts = acumData.map((d, i) => `${pad.l + i * xStep},${pad.t + cH - (d.v / maxV) * cH}`).join(' ');
  const metaY = pad.t + cH - (meta / maxV) * cH;

  return `<div style="overflow-x:auto;margin-top:12px"><svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:280px;height:${H}px">
    <line x1="${pad.l}" y1="${metaY}" x2="${W - pad.r}" y2="${metaY}" stroke="#d97706" stroke-width="1.5" stroke-dasharray="6,4"/>
    <text x="${W - pad.r + 2}" y="${metaY + 4}" font-size="10" fill="#d97706">Meta</text>
    <polyline points="${pts}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linejoin="round"/>
    <text x="${pad.l - 4}" y="${metaY + 4}" text-anchor="end" font-size="10" fill="#d97706">${fmt.currency(meta)}</text>
  </svg></div>`;
}

function renderPieChart(categorias) {
  const entries = Object.entries(categorias).filter(([, v]) => v > 0);
  if (!entries.length) return '<div class="empty-state" style="padding:24px"><p>Sem dados no período</p></div>';
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colors = ['#1E3A5F', '#F97316', '#16a34a', '#dc2626', '#7c3aed', '#0891b2'];
  const cx = 100, cy = 100, r = 80;
  let startAngle = -Math.PI / 2;

  const slices = entries.map(([name, val], i) => {
    const angle = (val / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    startAngle += angle;
    const x2 = cx + r * Math.cos(startAngle), y2 = cy + r * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    const pct = (val / total * 100).toFixed(1);
    const valFmt = 'R$ ' + val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return { path, color: colors[i % colors.length], name, val, pct, valFmt };
  });

  const svgSlices = slices.map(s => `
    <path class="pie-slice" d="${s.path}" fill="${s.color}" stroke="#fff" stroke-width="2"
      data-tip="${s.name}: ${s.pct}% · ${s.valFmt}"
      onmouseenter="showChartTip(event,this);this.style.transform='scale(1.04)';this.style.transformOrigin='${cx}px ${cy}px'"
      onmouseleave="hideChartTip();this.style.transform=''"
      style="cursor:pointer;transition:transform .15s"/>`).join('');

  const legend = slices.map(s => `
    <div class="pie-legend-item">
      <span class="pie-dot" style="background:${s.color}"></span>
      <span class="pie-legend-name">${s.name}</span>
      <span class="pie-legend-pct">${s.pct}%</span>
      <span class="pie-legend-val">${s.valFmt}</span>
    </div>`).join('');

  const totalFmt = 'R$ ' + total.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `<div class="pie-wrap">
    <svg viewBox="0 0 200 200" style="width:200px;height:200px;flex-shrink:0;overflow:visible">
      ${svgSlices}
      <circle cx="${cx}" cy="${cy}" r="42" fill="white" pointer-events="none"/>
      <text x="${cx}" y="${cy - 7}" text-anchor="middle" font-size="11" fill="#6b7280" pointer-events="none">Total</text>
      <text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="10" font-weight="bold" fill="#1f2937" pointer-events="none">${totalFmt}</text>
    </svg>
    <div class="pie-legend">${legend}</div>
  </div>`;
}



// ===== CLIENTES =====
function clientes() {
  renderClientes('');
}

function renderClientes(filtro) {
  const lista = Clientes.all().filter(c =>
    c.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    (c.telefone || '').includes(filtro)
  );

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Clientes</div><div class="page-subtitle">${lista.length} cadastrado(s)</div></div>
      <button class="btn btn-primary" onclick="formCliente()">+ Novo Cliente</button>
    </div>
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Buscar por nome ou telefone..." value="${filtro}"
          oninput="renderClientes(this.value)" />
      </div>
    </div>
    <div class="card">
      ${lista.length ? `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Veículos</th><th>Ações</th></tr></thead>
          <tbody>
            ${lista.map(c => {
              const veics = Veiculos.byCliente(c.id).length;
              return `<tr>
                <td><strong>${c.nome}</strong></td>
                <td>${fmt.phone(c.telefone)}</td>
                <td>${c.email || '-'}</td>
                <td><span class="badge badge-blue">${veics} veículo(s)</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="formCliente(${c.id})">✏️ Editar</button>
                  <button class="btn btn-outline btn-sm" style="margin-left:6px" onclick="deleteCliente(${c.id})">🗑️</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="empty-icon">👤</div><p>Nenhum cliente encontrado</p><button class="btn btn-primary" onclick="formCliente()">Cadastrar primeiro cliente</button></div>`}
    </div>`;
}

function formCliente(id) {
  const c = id ? Clientes.get(id) : {};
  openModal(id ? 'Editar Cliente' : 'Novo Cliente', `
    <div class="form-grid">
      <div class="form-group full">
        <label>Nome *</label>
        <input id="fNome" type="text" value="${c.nome || ''}" placeholder="Nome completo" />
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input id="fTel" type="text" value="${c.telefone || ''}" placeholder="(11) 99999-0000" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input id="fEmail" type="email" value="${c.email || ''}" placeholder="email@exemplo.com" />
      </div>
      <div class="form-group full">
        <label>Endereço</label>
        <input id="fEndereco" type="text" value="${c.endereco || ''}" placeholder="Rua, número, bairro, cidade" />
      </div>
      <div class="form-group full">
        <label>Observações</label>
        <textarea id="fObs" placeholder="Anotações sobre o cliente...">${c.obs || ''}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveCliente(${id || 'null'})">💾 Salvar</button>
    </div>`);
}

function saveCliente(id) {
  const nome = document.getElementById('fNome').value.trim();
  if (!nome) { showToast('Nome é obrigatório', 'error'); return; }
  Clientes.save({ id: id || undefined, nome, telefone: document.getElementById('fTel').value, email: document.getElementById('fEmail').value, endereco: document.getElementById('fEndereco').value, obs: document.getElementById('fObs').value });
  closeModal();
  showToast('Cliente salvo com sucesso!', 'success');
  renderClientes('');
}

function deleteCliente(id) {
  confirm('Deseja excluir este cliente?', () => {
    Clientes.delete(id);
    showToast('Cliente excluído');
    renderClientes('');
  });
}

// ===== VEÍCULOS =====
function veiculos() {
  renderVeiculos('');
}

function renderVeiculos(filtro) {
  const lista = Veiculos.all().filter(v =>
    (v.marca + ' ' + v.modelo + ' ' + v.placa).toLowerCase().includes(filtro.toLowerCase())
  );

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Veículos</div><div class="page-subtitle">${lista.length} cadastrado(s)</div></div>
      <button class="btn btn-primary" onclick="formVeiculo()">+ Novo Veículo</button>
    </div>
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Buscar por marca, modelo ou placa..." value="${filtro}"
          oninput="renderVeiculos(this.value)" />
      </div>
    </div>
    <div class="card">
      ${lista.length ? `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Veículo</th><th>Placa</th><th>Ano</th><th>KM</th><th>Proprietário</th><th>Ações</th></tr></thead>
          <tbody>
            ${lista.map(v => {
              const c = Clientes.get(v.clienteId);
              return `<tr>
                <td><strong>${v.marca} ${v.modelo}</strong></td>
                <td><span class="badge badge-gray">${v.placa}</span></td>
                <td>${v.ano}</td>
                <td>${parseInt(v.km || 0).toLocaleString('pt-BR')} km</td>
                <td>${c ? c.nome : '-'}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="verHistorico(${v.id})">📜 Histórico</button>
                  <button class="btn btn-outline btn-sm" style="margin-left:6px" onclick="formVeiculo(${v.id})">✏️</button>
                  <button class="btn btn-outline btn-sm" style="margin-left:6px" onclick="deleteVeiculo(${v.id})">🗑️</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="empty-icon">🚗</div><p>Nenhum veículo encontrado</p><button class="btn btn-primary" onclick="formVeiculo()">Cadastrar primeiro veículo</button></div>`}
    </div>`;
}

function formVeiculo(id) {
  const v = id ? Veiculos.get(id) : {};
  const clienteOpts = Clientes.all().map(c =>
    `<option value="${c.id}" ${v.clienteId === c.id ? 'selected' : ''}>${c.nome}</option>`
  ).join('');

  openModal(id ? 'Editar Veículo' : 'Novo Veículo', `
    <div class="form-grid">
      <div class="form-group">
        <label>Marca *</label>
        <input id="vMarca" type="text" value="${v.marca || ''}" placeholder="Ex: Chevrolet" />
      </div>
      <div class="form-group">
        <label>Modelo *</label>
        <input id="vModelo" type="text" value="${v.modelo || ''}" placeholder="Ex: Onix" />
      </div>
      <div class="form-group">
        <label>Ano</label>
        <input id="vAno" type="text" value="${v.ano || ''}" placeholder="Ex: 2022" />
      </div>
      <div class="form-group">
        <label>Placa *</label>
        <input id="vPlaca" type="text" value="${v.placa || ''}" placeholder="ABC-1234" style="text-transform:uppercase" />
      </div>
      <div class="form-group">
        <label>Quilometragem</label>
        <input id="vKm" type="number" value="${v.km || ''}" placeholder="Ex: 45000" />
      </div>
      <div class="form-group">
        <label>Cliente responsável</label>
        <select id="vCliente">
          <option value="">Selecionar cliente...</option>
          ${clienteOpts}
        </select>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveVeiculo(${id || 'null'})">💾 Salvar</button>
    </div>`);
}

function saveVeiculo(id) {
  const marca = document.getElementById('vMarca').value.trim();
  const modelo = document.getElementById('vModelo').value.trim();
  const placa = document.getElementById('vPlaca').value.trim();
  if (!marca || !modelo || !placa) { showToast('Marca, modelo e placa são obrigatórios', 'error'); return; }
  Veiculos.save({
    id: id || undefined, marca, modelo,
    ano: document.getElementById('vAno').value,
    placa: placa.toUpperCase(),
    km: document.getElementById('vKm').value,
    clienteId: parseInt(document.getElementById('vCliente').value) || null
  });
  closeModal();
  showToast('Veículo salvo!', 'success');
  renderVeiculos('');
}

function deleteVeiculo(id) {
  confirm('Deseja excluir este veículo?', () => {
    Veiculos.delete(id);
    showToast('Veículo excluído');
    renderVeiculos('');
  });
}

function verHistorico(veiculoId) {
  const v = Veiculos.get(veiculoId);
  const historico = Ordens.byVeiculo(veiculoId).sort((a,b) => b.id - a.id);
  const c = v.clienteId ? Clientes.get(v.clienteId) : null;

  openModal(`Histórico — ${v.marca} ${v.modelo} (${v.placa})`, `
    <p style="color:var(--gray-500);font-size:13px;margin-bottom:16px">
      Proprietário: <strong>${c ? c.nome : 'Não informado'}</strong> · ${historico.length} manutenção(ões)
    </p>
    ${historico.length ? historico.map(o => `
      <div class="historico-item">
        <div class="hist-date">OS #${o.numero} · ${fmt.date(o.data)} · ${statusBadge(o.status)}</div>
        <div class="hist-title">${o.problema}</div>
        <div class="hist-desc">Serviços: ${o.servicos || '-'}</div>
        <div class="hist-desc">Peças: ${o.pecas || '-'}</div>
        <div class="hist-desc" style="margin-top:4px;font-weight:600;color:var(--primary)">
          Total: ${fmt.currency(parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0))}
        </div>
      </div>`).join('') : '<div class="empty-state"><div class="empty-icon">📜</div><p>Nenhuma manutenção registrada</p></div>'}
  `);
}

// ===== ORDENS DE SERVIÇO =====
function statusBadge(s) {
  return s === 'finalizado'
    ? '<span class="badge badge-green">✅ Finalizado</span>'
    : '<span class="badge badge-yellow">🔧 Em andamento</span>';
}

function ordens() {
  renderOrdens('', 'todos');
}

function renderOrdens(filtro, statusFiltro) {
  let lista = Ordens.all();
  if (filtro) lista = lista.filter(o => {
    const c = Clientes.get(o.clienteId);
    const v = Veiculos.get(o.veiculoId);
    return (c && c.nome.toLowerCase().includes(filtro.toLowerCase())) ||
           (v && (v.marca + ' ' + v.modelo + ' ' + v.placa).toLowerCase().includes(filtro.toLowerCase())) ||
           ('#' + o.numero).includes(filtro);
  });
  if (statusFiltro !== 'todos') lista = lista.filter(o => o.status === statusFiltro);
  lista = lista.sort((a,b) => b.id - a.id);

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Ordens de Serviço</div><div class="page-subtitle">${lista.length} ordem(ns)</div></div>
      <button class="btn btn-primary" onclick="novaOrdem()">+ Nova OS</button>
    </div>
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Buscar por cliente, veículo ou nº OS..." value="${filtro}"
          oninput="renderOrdens(this.value,'${statusFiltro}')" />
      </div>
      <select onchange="renderOrdens('${filtro}',this.value)" style="padding:11px 14px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:14px;background:#fff">
        <option value="todos" ${statusFiltro==='todos'?'selected':''}>Todos</option>
        <option value="em_andamento" ${statusFiltro==='em_andamento'?'selected':''}>Em andamento</option>
        <option value="finalizado" ${statusFiltro==='finalizado'?'selected':''}>Finalizados</option>
      </select>
    </div>
    <div class="card">
      ${lista.length ? `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>OS</th><th>Data</th><th>Cliente</th><th>Veículo</th><th>Problema</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            ${lista.map(o => {
              const c = Clientes.get(o.clienteId);
              const v = Veiculos.get(o.veiculoId);
              const total = parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0);
              return `<tr>
                <td><strong>#${o.numero}</strong></td>
                <td>${fmt.date(o.data)}</td>
                <td>${c ? c.nome : '-'}</td>
                <td>${v ? v.marca + ' ' + v.modelo : '-'}<br><small style="color:var(--gray-400)">${v ? v.placa : ''}</small></td>
                <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.problema}</td>
                <td><strong>${fmt.currency(total)}</strong></td>
                <td>${statusBadge(o.status)}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="verOS(${o.id})">👁️ Ver</button>
                  <button class="btn btn-outline btn-sm" style="margin-left:6px" onclick="editOS(${o.id})">✏️</button>
                  <button class="btn btn-outline btn-sm" style="margin-left:6px" onclick="deleteOS(${o.id})">🗑️</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhuma ordem encontrada</p><button class="btn btn-primary" onclick="novaOrdem()">Criar primeira OS</button></div>`}
    </div>`;
}

function novaOrdem() { formOS(null); }
function editOS(id) { formOS(id); }

function formOS(id) {
  const o = id ? Ordens.get(id) : {};
  const hoje = new Date().toISOString().split('T')[0];
  const clienteOpts = Clientes.all().map(c =>
    `<option value="${c.id}" ${o.clienteId === c.id ? 'selected' : ''}>${c.nome}</option>`
  ).join('');
  const veiculoOpts = Veiculos.all().map(v =>
    `<option value="${v.id}" ${o.veiculoId === v.id ? 'selected' : ''}>${v.marca} ${v.modelo} — ${v.placa}</option>`
  ).join('');

  openModal(id ? `Editar OS #${o.numero}` : 'Nova Ordem de Serviço', `
    <div class="form-grid">
      <div class="form-group">
        <label>Cliente *</label>
        <select id="osCliente">
          <option value="">Selecionar...</option>${clienteOpts}
        </select>
      </div>
      <div class="form-group">
        <label>Veículo *</label>
        <select id="osVeiculo">
          <option value="">Selecionar...</option>${veiculoOpts}
        </select>
      </div>
      <div class="form-group full">
        <label>Problema relatado *</label>
        <textarea id="osProblema" placeholder="Descreva o problema...">${o.problema || ''}</textarea>
      </div>
      <div class="form-group full">
        <label>Serviços realizados</label>
        <textarea id="osServicos" placeholder="Liste os serviços feitos...">${o.servicos || ''}</textarea>
      </div>
      <div class="form-group full">
        <label>Peças utilizadas</label>
        <textarea id="osPecas" placeholder="Liste as peças...">${o.pecas || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Valor mão de obra (R$)</label>
        <input id="osMO" type="number" step="0.01" value="${o.valorMO || ''}" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label>Valor das peças (R$)</label>
        <input id="osPecasVal" type="number" step="0.01" value="${o.valorPecas || ''}" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label>Data</label>
        <input id="osData" type="date" value="${o.data || hoje}" />
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="osStatus">
          <option value="em_andamento" ${o.status !== 'finalizado' ? 'selected' : ''}>🔧 Em andamento</option>
          <option value="finalizado" ${o.status === 'finalizado' ? 'selected' : ''}>✅ Finalizado</option>
        </select>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveOS(${id || 'null'})">💾 Salvar OS</button>
    </div>`);
}

function saveOS(id) {
  const clienteId = parseInt(document.getElementById('osCliente').value);
  const veiculoId = parseInt(document.getElementById('osVeiculo').value);
  const problema = document.getElementById('osProblema').value.trim();
  if (!clienteId || !veiculoId || !problema) { showToast('Cliente, veículo e problema são obrigatórios', 'error'); return; }
  Ordens.save({
    id: id || undefined, clienteId, veiculoId, problema,
    servicos: document.getElementById('osServicos').value,
    pecas: document.getElementById('osPecas').value,
    valorMO: document.getElementById('osMO').value,
    valorPecas: document.getElementById('osPecasVal').value,
    data: document.getElementById('osData').value,
    status: document.getElementById('osStatus').value
  });
  closeModal();
  showToast('Ordem de serviço salva!', 'success');
  renderOrdens('', 'todos');
}

function verOS(id) {
  const o = Ordens.get(id);
  const c = Clientes.get(o.clienteId);
  const v = Veiculos.get(o.veiculoId);
  const total = parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0);

  openModal(`OS #${o.numero}`, `
    <div class="os-detail-grid">
      <div class="os-detail-item"><label>Cliente</label><p>${c ? c.nome : '-'}</p></div>
      <div class="os-detail-item"><label>Telefone</label><p>${c ? fmt.phone(c.telefone) : '-'}</p></div>
      <div class="os-detail-item"><label>Endereço</label><p>${c && c.endereco ? c.endereco : '-'}</p></div>
      <div class="os-detail-item"><label>Veículo</label><p>${v ? v.marca + ' ' + v.modelo : '-'}</p></div>
      <div class="os-detail-item"><label>Placa</label><p>${v ? v.placa : '-'}</p></div>
      <div class="os-detail-item"><label>Data</label><p>${fmt.date(o.data)}</p></div>
      <div class="os-detail-item"><label>Status</label><p>${statusBadge(o.status)}</p></div>
    </div>
    <div class="os-section-title">Problema relatado</div>
    <p style="font-size:14px;color:var(--gray-700);background:var(--gray-50);padding:12px;border-radius:8px">${o.problema}</p>
    <div class="os-section-title">Serviços realizados</div>
    <p style="font-size:14px;color:var(--gray-700);background:var(--gray-50);padding:12px;border-radius:8px">${o.servicos || 'Não informado'}</p>
    <div class="os-section-title">Peças utilizadas</div>
    <p style="font-size:14px;color:var(--gray-700);background:var(--gray-50);padding:12px;border-radius:8px">${o.pecas || 'Não informado'}</p>
    <div class="os-section-title">Valores</div>
    <div style="display:flex;gap:16px;margin-bottom:8px">
      <div style="flex:1;background:var(--gray-50);padding:12px;border-radius:8px;text-align:center">
        <div style="font-size:12px;color:var(--gray-400);margin-bottom:4px">MÃO DE OBRA</div>
        <div style="font-size:18px;font-weight:700">${fmt.currency(o.valorMO)}</div>
      </div>
      <div style="flex:1;background:var(--gray-50);padding:12px;border-radius:8px;text-align:center">
        <div style="font-size:12px;color:var(--gray-400);margin-bottom:4px">PEÇAS</div>
        <div style="font-size:18px;font-weight:700">${fmt.currency(o.valorPecas)}</div>
      </div>
    </div>
    <div class="os-total-row">
      <span class="os-total-label">Total</span>
      <span class="os-total-value">${fmt.currency(total)}</span>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Fechar</button>
      <button class="btn btn-outline" onclick="imprimirOS(${o.id})">🖨️ Imprimir</button>
      <button class="btn btn-outline" onclick="enviarOSWhatsApp(${o.id})">💬 WhatsApp</button>
      <button class="btn btn-primary" onclick="closeModal();editOS(${o.id})">✏️ Editar</button>
      ${o.status === 'em_andamento' ? `<button class="btn btn-success" onclick="finalizarOS(${o.id})">✅ Finalizar</button>` : ''}
    </div>`);
}

function imprimirOS(id) {
  const o = Ordens.get(id);
  const c = Clientes.get(o.clienteId);
  const v = Veiculos.get(o.veiculoId);
  const of = Oficina.get();
  const total = parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0);
  const logoHtml = of.logo
    ? `<img src="${of.logo}" style="max-height:60px;max-width:180px;object-fit:contain" alt="Logo" />`
    : `<div style="font-size:24px;font-weight:800;color:#1E3A5F">Chave <span style="color:#F97316">10</span></div>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>OS #${o.numero}</title>
    <style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:720px;margin:32px auto;padding:0 24px;color:#1f2937;font-size:13px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;margin-bottom:16px;border-bottom:3px solid #1E3A5F}
      .oficina-info{font-size:11px;color:#6b7280;margin-top:6px;line-height:1.6}
      .os-num{font-size:18px;font-weight:700;color:#1E3A5F;text-align:right}
      h3{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;margin:16px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
      .lbl{font-size:10px;color:#9ca3af;display:block;margin-bottom:1px}
      .val{font-size:13px;font-weight:600;color:#111827}
      .text-block{background:#f9fafb;padding:10px 14px;border-radius:6px;font-size:13px;border:1px solid #e5e7eb;white-space:pre-wrap}
      .valores{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-top:8px}
      .vrow{display:flex;justify-content:space-between;padding:8px 16px;border-bottom:1px solid #f3f4f6;font-size:13px}
      .vrow.total{font-weight:800;font-size:16px;background:#eff6ff;color:#1E3A5F;border-bottom:none}
      .footer{margin-top:24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}
      @media print{body{margin:0;padding:16px}}
    </style></head><body>
    <div class="header">
      <div>${logoHtml}<div class="oficina-info">${of.nome||''} ${of.telefone?'· Tel: '+of.telefone:''} ${of.endereco?'<br>'+of.endereco:''}</div></div>
      <div class="os-num">OS #${o.numero}<br><span style="font-size:12px;color:#6b7280;font-weight:400">${fmt.date(o.data)}</span><br>
        <span style="font-size:11px;padding:2px 8px;background:${o.status==='finalizado'?'#f0fdf4':'#fff7ed'};color:${o.status==='finalizado'?'#16a34a':'#d97706'};border-radius:20px;font-weight:700">${o.status==='finalizado'?'Finalizado':'Em andamento'}</span>
      </div>
    </div>
    <h3>Cliente</h3>
    <div class="grid">
      <div><span class="lbl">Nome</span><span class="val">${c?c.nome:'-'}</span></div>
      <div><span class="lbl">Telefone</span><span class="val">${c&&c.telefone?c.telefone:'-'}</span></div>
      <div><span class="lbl">Email</span><span class="val">${c&&c.email?c.email:'-'}</span></div>
      <div><span class="lbl">Endereço</span><span class="val">${c&&c.endereco?c.endereco:'-'}</span></div>
    </div>
    <h3>Veículo</h3>
    <div class="grid">
      <div><span class="lbl">Veículo</span><span class="val">${v?v.marca+' '+v.modelo:'-'}</span></div>
      <div><span class="lbl">Placa</span><span class="val">${v?v.placa:'-'}</span></div>
      <div><span class="lbl">Ano</span><span class="val">${v&&v.ano?v.ano:'-'}</span></div>
      <div><span class="lbl">KM</span><span class="val">${v&&v.km?parseInt(v.km).toLocaleString('pt-BR')+' km':'-'}</span></div>
    </div>
    <h3>Problema relatado</h3><div class="text-block">${o.problema}</div>
    ${o.servicos?`<h3>Serviços realizados</h3><div class="text-block">${o.servicos}</div>`:''}
    ${o.pecas?`<h3>Peças utilizadas</h3><div class="text-block">${o.pecas}</div>`:''}
    <h3>Valores</h3>
    <div class="valores">
      <div class="vrow"><span>Mão de obra</span><span>${fmt.currency(o.valorMO)}</span></div>
      <div class="vrow"><span>Peças</span><span>${fmt.currency(o.valorPecas)}</span></div>
      <div class="vrow total"><span>TOTAL</span><span>${fmt.currency(total)}</span></div>
    </div>
    <div class="footer">${of.nome||'Chave 10'} ${of.telefone?'· '+of.telefone:''} — Documento gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

function enviarOSWhatsApp(id) {
  const o = Ordens.get(id);
  const c = Clientes.get(o.clienteId);
  if (!c?.telefone) { showToast('Cliente sem telefone cadastrado', 'error'); return; }
  const v = Veiculos.get(o.veiculoId);
  const of = Oficina.get();
  const total = parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0);
  let msg = `*OS #${o.numero} — ${of.nome||'Chave 10'}*\n`;
  msg += `Data: ${fmt.date(o.data)}\n`;
  msg += `Veículo: ${v?v.marca+' '+v.modelo+' — '+v.placa:'—'}\n\n`;
  msg += `*Problema:* ${o.problema}\n`;
  if (o.servicos) msg += `*Serviços:* ${o.servicos}\n`;
  if (o.pecas) msg += `*Peças:* ${o.pecas}\n`;
  msg += `\n*Mão de obra:* ${fmt.currency(o.valorMO)}`;
  msg += `\n*Peças:* ${fmt.currency(o.valorPecas)}`;
  msg += `\n*TOTAL: ${fmt.currency(total)}*`;
  const tel = c.telefone.replace(/\D/g,'');
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  showToast('WhatsApp aberto!', 'success');
  closeModal();
}

function finalizarOS(id) {
  const o = Ordens.get(id);
  o.status = 'finalizado';
  Ordens.save(o);
  closeModal();
  showToast('OS finalizada!', 'success');
  renderOrdens('', 'todos');
}

function deleteOS(id) {
  confirm('Deseja excluir esta ordem de serviço?', () => {
    Ordens.delete(id);
    showToast('OS excluída');
    renderOrdens('', 'todos');
  });
}

// ===== LEMBRETES =====
function lembretes() {
  renderLembretes();
}

function renderLembretes(mostrarVistos = false) {
  const hoje = new Date().toISOString().split('T')[0];
  const todos = Lembretes.all().sort((a,b) => (a.dataPrevisao || '9999') > (b.dataPrevisao || '9999') ? 1 : -1);
  const lista = mostrarVistos ? todos : todos.filter(l => !l.visto);
  const qtdVistos = todos.filter(l => l.visto).length;

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Lembretes de Manutenção</div>
        <div class="page-subtitle">${lista.length} lembrete(s) ativo(s)${qtdVistos ? ` · ${qtdVistos} visto(s)` : ''}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${qtdVistos ? `<button class="btn btn-ghost btn-sm" onclick="renderLembretes(${!mostrarVistos})">${mostrarVistos ? '� Ocultar vistos' : '�️ Mostrar vistos'}</button>` : ''}
        <button class="btn btn-primary" onclick="formLembrete()">+ Novo Lembrete</button>
      </div>
    </div>
    ${lista.length ? lista.map(l => {
      const v = Veiculos.get(l.veiculoId);
      const c = v && v.clienteId ? Clientes.get(v.clienteId) : null;
      const vencido = l.dataPrevisao && l.dataPrevisao < hoje;
      const tipoIcon = l.tipo === 'oleo' ? '🛢️' : l.tipo === 'revisao' ? '🔧' : '📅';
      return `<div class="lembrete-card ${l.visto ? 'ok' : vencido ? 'vencido' : 'ok'}" style="${l.visto ? 'opacity:.55;' : ''}">
        <div class="lembrete-icon">${tipoIcon}</div>
        <div class="lembrete-info">
          <div class="lembrete-title" style="${l.visto ? 'text-decoration:line-through;color:var(--gray-400)' : ''}">${l.descricao}</div>
          <div class="lembrete-sub">
            ${v ? `${v.marca} ${v.modelo} — ${v.placa}` : 'Veículo não encontrado'}
            ${c ? ` · ${c.nome}` : ''}
          </div>
          <div class="lembrete-sub" style="margin-top:4px">
            ${l.dataPrevisao ? `📅 ${fmt.date(l.dataPrevisao)}` : ''}
            ${l.kmPrevisao ? ` · 🛣️ ${parseInt(l.kmPrevisao).toLocaleString('pt-BR')} km` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          ${l.visto
            ? '<span class="badge badge-gray">✓ Visto</span>'
            : vencido ? '<span class="badge badge-red">Vencido</span>' : '<span class="badge badge-green">OK</span>'}
          ${!l.visto ? `<button class="btn btn-success btn-sm" onclick="marcarLembreteVisto(${l.id})" title="Marcar como visto">✓ Visto</button>` : `<button class="btn btn-ghost btn-sm" onclick="desmarcarLembreteVisto(${l.id})" title="Reativar">↩ Reativar</button>`}
          <button class="btn btn-outline btn-sm" onclick="enviarLembreteWhatsApp(${l.id})" style="${c && c.telefone ? '' : 'opacity:.4;cursor:not-allowed'}" ${c && c.telefone ? '' : 'disabled'}>💬</button>
          <button class="btn btn-outline btn-sm" onclick="formLembrete(${l.id})">✏️</button>
          <button class="btn btn-outline btn-sm" onclick="deleteLembrete(${l.id})">🗑️</button>
        </div>
      </div>`;
    }).join('') : `<div class="card"><div class="empty-state"><div class="empty-icon">🔔</div>
      <p>${mostrarVistos ? 'Nenhum lembrete cadastrado' : 'Nenhum lembrete ativo'}</p>
      ${!mostrarVistos && qtdVistos ? `<p style="font-size:13px;color:var(--gray-400);margin-top:4px">${qtdVistos} lembrete(s) marcado(s) como visto</p>` : ''}
      <button class="btn btn-primary" style="margin-top:12px" onclick="formLembrete()">Criar lembrete</button>
    </div></div>`}`;
}

function marcarLembreteVisto(id) {
  const l = Lembretes.get(id);
  if (!l) return;
  l.visto = true;
  Lembretes.save(l);
  showToast('Lembrete marcado como visto', 'success');
  renderLembretes();
  Notif.check();
}

function desmarcarLembreteVisto(id) {
  const l = Lembretes.get(id);
  if (!l) return;
  l.visto = false;
  Lembretes.save(l);
  showToast('Lembrete reativado');
  renderLembretes(true);
  Notif.check();
}

function formLembrete(id) {
  const l = id ? Lembretes.get(id) : {};
  const veiculoOpts = Veiculos.all().map(v =>
    `<option value="${v.id}" ${l.veiculoId === v.id ? 'selected' : ''}>${v.marca} ${v.modelo} — ${v.placa}</option>`
  ).join('');

  openModal(id ? 'Editar Lembrete' : 'Novo Lembrete', `
    <div class="form-grid">
      <div class="form-group full">
        <label>Veículo *</label>
        <select id="lVeiculo">
          <option value="">Selecionar veículo...</option>${veiculoOpts}
        </select>
      </div>
      <div class="form-group full">
        <label>Tipo</label>
        <select id="lTipo">
          <option value="oleo" ${l.tipo==='oleo'?'selected':''}>🛢️ Troca de óleo</option>
          <option value="revisao" ${l.tipo==='revisao'?'selected':''}>🔧 Revisão</option>
          <option value="outro" ${l.tipo==='outro'?'selected':''}>📅 Outro</option>
        </select>
      </div>
      <div class="form-group full">
        <label>Descrição *</label>
        <input id="lDesc" type="text" value="${l.descricao || ''}" placeholder="Ex: Próxima troca de óleo" />
      </div>
      <div class="form-group">
        <label>Data prevista</label>
        <input id="lData" type="date" value="${l.dataPrevisao || ''}" />
      </div>
      <div class="form-group">
        <label>KM prevista</label>
        <input id="lKm" type="number" value="${l.kmPrevisao || ''}" placeholder="Ex: 50000" />
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveLembrete(${id || 'null'})">💾 Salvar</button>
    </div>`);
}

function saveLembrete(id) {
  const veiculoId = parseInt(document.getElementById('lVeiculo').value);
  const descricao = document.getElementById('lDesc').value.trim();
  if (!veiculoId || !descricao) { showToast('Veículo e descrição são obrigatórios', 'error'); return; }
  Lembretes.save({
    id: id || undefined, veiculoId, descricao,
    tipo: document.getElementById('lTipo').value,
    dataPrevisao: document.getElementById('lData').value,
    kmPrevisao: document.getElementById('lKm').value
  });
  closeModal();
  showToast('Lembrete salvo!', 'success');
  renderLembretes();
  Notif.check();
}

function deleteLembrete(id) {
  confirm('Deseja excluir este lembrete?', () => {
    Lembretes.delete(id);
    showToast('Lembrete excluído');
    renderLembretes();
    Notif.check();
  });
}

function enviarLembreteWhatsApp(id) {
  const l = Lembretes.get(id);
  const v = Veiculos.get(l.veiculoId);
  const c = v && v.clienteId ? Clientes.get(v.clienteId) : null;
  const of = Oficina.get();

  if (!c || !c.telefone) {
    showToast('Cliente sem telefone cadastrado', 'error');
    return;
  }

  const nomeOficina = of.nome || 'Chave 10';
  const tipoLabel = l.tipo === 'oleo' ? 'Troca de óleo' : l.tipo === 'revisao' ? 'Revisão' : 'Manutenção';
  const tipoEmoji = l.tipo === 'oleo' ? '🛢️' : l.tipo === 'revisao' ? '🔧' : '📅';
  const veiculo = v ? `${v.marca} ${v.modelo} (${v.placa})` : 'seu veículo';
  const dataFmt = l.dataPrevisao ? fmt.date(l.dataPrevisao) : null;
  const kmFmt = l.kmPrevisao ? parseInt(l.kmPrevisao).toLocaleString('pt-BR') + ' km' : null;

  // Mensagem padrão pré-preenchida
  const msgPadrao =
    `Olá, ${c.nome.split(' ')[0]}! 👋\n\n` +
    `${tipoEmoji} *Lembrete de ${tipoLabel}*\n\n` +
    `Identificamos que o seu *${veiculo}* está com ${l.descricao.toLowerCase()}.\n\n` +
    (dataFmt ? `📅 *Data prevista:* ${dataFmt}\n` : '') +
    (kmFmt   ? `🛣️ *Quilometragem prevista:* ${kmFmt}\n` : '') +
    `\nAgende agora e evite problemas maiores! Entre em contato conosco para marcar o melhor horário.\n\n` +
    `_${nomeOficina}${of.whatsapp ? ' · ' + of.whatsapp : ''}${of.telefone ? ' · ' + of.telefone : ''}_`;

  openModal('💬 Enviar lembrete pelo WhatsApp', `
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--gray-50);border-radius:var(--r-sm);margin-bottom:14px">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:'Poppins',sans-serif;flex-shrink:0">${c.nome[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--gray-800)">${c.nome}</div>
          <div style="font-size:12.5px;color:var(--gray-400)">${c.telefone}</div>
        </div>
      </div>
      <div class="form-group">
        <label>Mensagem (editável)</label>
        <textarea id="wppMsg" style="min-height:200px;font-size:13px;line-height:1.6">${msgPadrao}</textarea>
      </div>
      <p style="font-size:11.5px;color:var(--gray-400);margin-top:6px">
        💡 A mensagem será aberta no WhatsApp Web já preenchida. Você pode editar antes de enviar.
      </p>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="confirmarEnvioLembrete('${c.telefone}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Abrir no WhatsApp
      </button>
    </div>`);
}

function confirmarEnvioLembrete(telefone) {
  const msg = document.getElementById('wppMsg').value.trim();
  if (!msg) { showToast('Mensagem não pode estar vazia', 'error'); return; }
  const tel = telefone.replace(/\D/g, '');
  const url = `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  closeModal();
}

// ===== ORÇAMENTOS =====
function statusOrcBadge(s) {
  if (s === 'aprovado') return '<span class="badge badge-green">✅ Aprovado</span>';
  if (s === 'rejeitado') return '<span class="badge badge-red">❌ Rejeitado</span>';
  return '<span class="badge badge-yellow">⏳ Pendente</span>';
}

function orcamentos() { renderOrcamentos('', 'todos'); }

function renderOrcamentos(filtro, statusFiltro) {
  let lista = Orcamentos.all();
  if (filtro) lista = lista.filter(o => {
    return o.numero.toLowerCase().includes(filtro.toLowerCase()) ||
           (o.clienteNome || '').toLowerCase().includes(filtro.toLowerCase()) ||
           (o.veiculo || '').toLowerCase().includes(filtro.toLowerCase());
  });
  if (statusFiltro !== 'todos') lista = lista.filter(o => o.status === statusFiltro);
  lista = lista.sort((a, b) => b.id - a.id);

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Orçamentos</div><div class="page-subtitle">${lista.length} orçamento(s)</div></div>
      <button class="btn btn-primary" onclick="formOrcamento()">+ Novo Orçamento</button>
    </div>
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Buscar por cliente, veículo ou número..." value="${filtro}"
          oninput="renderOrcamentos(this.value,'${statusFiltro}')" />
      </div>
      <select onchange="renderOrcamentos('${filtro}',this.value)" style="padding:11px 14px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:14px;background:#fff">
        <option value="todos" ${statusFiltro==='todos'?'selected':''}>Todos</option>
        <option value="pendente" ${statusFiltro==='pendente'?'selected':''}>Pendentes</option>
        <option value="aprovado" ${statusFiltro==='aprovado'?'selected':''}>Aprovados</option>
        <option value="rejeitado" ${statusFiltro==='rejeitado'?'selected':''}>Rejeitados</option>
      </select>
    </div>
    <div class="card">
      ${lista.length ? `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Veículo</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            ${lista.map(o => {
              const total = calcTotalOrc(o);
              return `<tr>
                <td><strong>${o.numero}</strong></td>
                <td>${fmt.date(o.criadoEm ? o.criadoEm.split('T')[0] : '')}</td>
                <td>${o.clienteNome || '-'}<br><small style="color:var(--gray-400)">${o.clienteTel || ''}</small></td>
                <td>${o.veiculo || '-'}<br><small style="color:var(--gray-400)">${o.placa || ''}</small></td>
                <td><strong>${fmt.currency(total)}</strong></td>
                <td>${statusOrcBadge(o.status)}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-outline btn-sm" onclick="verOrcamento(${o.id})">👁️ Ver</button>
                  <button class="btn btn-outline btn-sm" style="margin-left:4px" onclick="enviarWhatsApp(${o.id})" title="WhatsApp">💬</button>
                  <button class="btn btn-outline btn-sm" style="margin-left:4px" onclick="formOrcamento(${o.id})">✏️</button>
                  <button class="btn btn-outline btn-sm" style="margin-left:4px" onclick="deleteOrc(${o.id})">🗑️</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="empty-icon">📝</div><p>Nenhum orçamento encontrado</p><button class="btn btn-primary" onclick="formOrcamento()">Criar primeiro orçamento</button></div>`}
    </div>`;
}

function calcTotalOrc(o) {
  const mo = parseFloat(o.valorMO || 0);
  const pecas = parseFloat(o.valorPecas || 0);
  const desc = parseFloat(o.desconto || 0);
  return mo + pecas - desc;
}

function formOrcamento(id) {
  const o = id ? Orcamentos.get(id) : { status: 'pendente', itensServico: [], itensPeca: [] };
  const hoje = new Date().toISOString().split('T')[0];

  const clienteOpts = Clientes.all().map(c =>
    `<option value="${c.id}" data-nome="${c.nome}" data-tel="${c.telefone || ''}" ${o.clienteId === c.id ? 'selected' : ''}>${c.nome}</option>`
  ).join('');
  const veiculoOpts = Veiculos.all().map(v =>
    `<option value="${v.id}" data-label="${v.marca} ${v.modelo}" data-placa="${v.placa}" data-km="${v.km||''}" ${o.veiculoId === v.id ? 'selected' : ''}>${v.marca} ${v.modelo} — ${v.placa}</option>`
  ).join('');

  openModal(id ? `Editar ${o.numero}` : 'Novo Orçamento', `
    <div class="form-grid">
      <div class="form-group">
        <label>Cliente *</label>
        <select id="orcCliente" onchange="orcAutoFillCliente(this)">
          <option value="">Selecionar...</option>${clienteOpts}
        </select>
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input id="orcTel" type="text" value="${o.clienteTel || ''}" placeholder="(11) 99999-0000" />
      </div>
      <div class="form-group">
        <label>Veículo</label>
        <select id="orcVeiculo" onchange="orcAutoFillVeiculo(this)">
          <option value="">Selecionar...</option>${veiculoOpts}
        </select>
      </div>
      <div class="form-group">
        <label>Placa</label>
        <input id="orcPlaca" type="text" value="${o.placa || ''}" placeholder="ABC-1234" />
      </div>
      <div class="form-group">
        <label>Quilometragem</label>
        <input id="orcKm" type="text" value="${o.km || ''}" placeholder="Ex: 45000" />
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="orcStatus">
          <option value="pendente" ${o.status==='pendente'?'selected':''}>⏳ Pendente</option>
          <option value="aprovado" ${o.status==='aprovado'?'selected':''}>✅ Aprovado</option>
          <option value="rejeitado" ${o.status==='rejeitado'?'selected':''}>❌ Rejeitado</option>
        </select>
      </div>
      <div class="form-group full">
        <label>Problema relatado</label>
        <textarea id="orcProblema" placeholder="Descreva o problema do veículo...">${o.problema || ''}</textarea>
      </div>
      <div class="form-group full">
        <label>Serviços</label>
        <textarea id="orcServicos" placeholder="Liste os serviços a realizar...">${o.servicos || ''}</textarea>
      </div>
      <div class="form-group full">
        <label>Peças</label>
        <textarea id="orcPecas" placeholder="Liste as peças necessárias...">${o.pecas || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Mão de obra (R$)</label>
        <input id="orcMO" type="number" step="0.01" value="${o.valorMO || ''}" placeholder="0,00" oninput="orcCalcTotal()" />
      </div>
      <div class="form-group">
        <label>Valor das peças (R$)</label>
        <input id="orcPecasVal" type="number" step="0.01" value="${o.valorPecas || ''}" placeholder="0,00" oninput="orcCalcTotal()" />
      </div>
      <div class="form-group">
        <label>Desconto (R$)</label>
        <input id="orcDesconto" type="number" step="0.01" value="${o.desconto || ''}" placeholder="0,00" oninput="orcCalcTotal()" />
      </div>
      <div class="form-group">
        <label>Total</label>
        <div id="orcTotalDisplay" class="orc-total-display">${fmt.currency(calcTotalOrc(o))}</div>
      </div>
      <div class="form-group full">
        <label>Observações</label>
        <textarea id="orcObs" placeholder="Condições, prazo, garantia...">${o.obs || ''}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveOrcamento(${id || 'null'})">💾 Salvar</button>
    </div>`);
}

function orcAutoFillCliente(sel) {
  const opt = sel.options[sel.selectedIndex];
  if (opt.value) {
    document.getElementById('orcTel').value = opt.dataset.tel || '';
  }
}

function orcAutoFillVeiculo(sel) {
  const opt = sel.options[sel.selectedIndex];
  if (opt.value) {
    document.getElementById('orcPlaca').value = opt.dataset.placa || '';
    document.getElementById('orcKm').value = opt.dataset.km || '';
  }
}

function orcCalcTotal() {
  const mo = parseFloat(document.getElementById('orcMO').value || 0);
  const pecas = parseFloat(document.getElementById('orcPecasVal').value || 0);
  const desc = parseFloat(document.getElementById('orcDesconto').value || 0);
  const total = mo + pecas - desc;
  document.getElementById('orcTotalDisplay').textContent = fmt.currency(total < 0 ? 0 : total);
}

function saveOrcamento(id) {
  const clienteEl = document.getElementById('orcCliente');
  const clienteId = parseInt(clienteEl.value) || null;
  const clienteNome = clienteId ? clienteEl.options[clienteEl.selectedIndex].dataset.nome : '';

  Orcamentos.save({
    id: id || undefined,
    clienteId, clienteNome,
    clienteTel: document.getElementById('orcTel').value,
    veiculoId: parseInt(document.getElementById('orcVeiculo').value) || null,
    veiculo: (() => { const s = document.getElementById('orcVeiculo'); return s.value ? s.options[s.selectedIndex].text.split('—')[0].trim() : ''; })(),
    placa: document.getElementById('orcPlaca').value,
    km: document.getElementById('orcKm').value,
    problema: document.getElementById('orcProblema').value,
    servicos: document.getElementById('orcServicos').value,
    pecas: document.getElementById('orcPecas').value,
    valorMO: document.getElementById('orcMO').value,
    valorPecas: document.getElementById('orcPecasVal').value,
    desconto: document.getElementById('orcDesconto').value,
    obs: document.getElementById('orcObs').value,
    status: document.getElementById('orcStatus').value
  });
  closeModal();
  showToast('Orçamento salvo!', 'success');
  renderOrcamentos('', 'todos');
}

function deleteOrc(id) {
  confirm('Deseja excluir este orçamento?', () => {
    Orcamentos.delete(id);
    showToast('Orçamento excluído');
    renderOrcamentos('', 'todos');
  });
}

function verOrcamento(id) {
  const o = Orcamentos.get(id);
  const total = calcTotalOrc(o);
  const dataFmt = fmt.date(o.criadoEm ? o.criadoEm.split('T')[0] : '');

  openModal(`${o.numero} — Visualização`, `
    <div class="orc-preview">
      <div class="orc-preview-header">
        <div class="orc-preview-logo">🔧 Chave 10</div>
        <div class="orc-preview-meta">
          <div><strong>${o.numero}</strong></div>
          <div>Data: ${dataFmt}</div>
          <div>${statusOrcBadge(o.status)}</div>
        </div>
      </div>

      <div class="orc-preview-section">
        <div class="orc-preview-section-title">Cliente</div>
        <div class="orc-preview-grid">
          <div><span class="orc-lbl">Nome</span><span>${o.clienteNome || '-'}</span></div>
          <div><span class="orc-lbl">Telefone</span><span>${o.clienteTel || '-'}</span></div>
        </div>
      </div>

      <div class="orc-preview-section">
        <div class="orc-preview-section-title">Veículo</div>
        <div class="orc-preview-grid">
          <div><span class="orc-lbl">Veículo</span><span>${o.veiculo || '-'}</span></div>
          <div><span class="orc-lbl">Placa</span><span>${o.placa || '-'}</span></div>
          <div><span class="orc-lbl">Quilometragem</span><span>${o.km ? parseInt(o.km).toLocaleString('pt-BR') + ' km' : '-'}</span></div>
          <div><span class="orc-lbl">Problema</span><span>${o.problema || '-'}</span></div>
        </div>
      </div>

      <div class="orc-preview-section">
        <div class="orc-preview-section-title">Serviços</div>
        <p class="orc-text-block">${(o.servicos || 'Não informado').replace(/\n/g,'<br>')}</p>
      </div>

      <div class="orc-preview-section">
        <div class="orc-preview-section-title">Peças</div>
        <p class="orc-text-block">${(o.pecas || 'Não informado').replace(/\n/g,'<br>')}</p>
      </div>

      <div class="orc-preview-section">
        <div class="orc-preview-section-title">Valores</div>
        <div class="orc-valores">
          <div class="orc-valor-row"><span>Mão de obra</span><span>${fmt.currency(o.valorMO)}</span></div>
          <div class="orc-valor-row"><span>Peças</span><span>${fmt.currency(o.valorPecas)}</span></div>
          ${parseFloat(o.desconto||0) > 0 ? `<div class="orc-valor-row" style="color:var(--success)"><span>Desconto</span><span>- ${fmt.currency(o.desconto)}</span></div>` : ''}
          <div class="orc-valor-row orc-valor-total"><span>Total</span><span>${fmt.currency(total)}</span></div>
        </div>
      </div>

      ${o.obs ? `<div class="orc-preview-section"><div class="orc-preview-section-title">Observações</div><p class="orc-text-block">${o.obs.replace(/\n/g,'<br>')}</p></div>` : ''}
    </div>

    <div class="form-actions" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn-outline" onclick="closeModal()">Fechar</button>
      <button class="btn btn-outline" onclick="closeModal();formOrcamento(${o.id})">✏️ Editar</button>
      <button class="btn btn-success" onclick="enviarWhatsApp(${o.id})">💬 WhatsApp</button>
      <button class="btn btn-outline" onclick="imprimirOrcamento(${o.id})">🖨️ Imprimir / PDF</button>
      ${o.status === 'aprovado' ? `<button class="btn btn-primary" onclick="converterEmOS(${o.id})">🔧 Converter em OS</button>` : ''}
      ${o.status === 'pendente' ? `
        <button class="btn btn-success btn-sm" onclick="mudarStatusOrc(${o.id},'aprovado')">✅ Aprovar</button>
        <button class="btn btn-danger btn-sm" onclick="mudarStatusOrc(${o.id},'rejeitado')">❌ Rejeitar</button>` : ''}
    </div>`);
}

function mudarStatusOrc(id, status) {
  const o = Orcamentos.get(id);
  o.status = status;
  Orcamentos.save(o);
  closeModal();
  showToast(status === 'aprovado' ? 'Orçamento aprovado!' : 'Orçamento rejeitado', status === 'aprovado' ? 'success' : '');
  renderOrcamentos('', 'todos');
}

function enviarWhatsApp(id) {
  const o = Orcamentos.get(id);
  const of = Oficina.get();
  const total = calcTotalOrc(o);
  const tel = (o.clienteTel || '').replace(/\D/g, '');
  const nomeOficina = of.nome || 'Chave 10';
  const telOficina = of.whatsapp || of.telefone || '';

  const msg =
    `Olá, ${o.clienteNome || 'cliente'}! 👋\n\n` +
    `Segue o orçamento do seu veículo *${o.veiculo || ''}${o.placa ? ' (' + o.placa + ')' : ''}*.\n\n` +
    `📋 *${o.numero}*\n\n` +
    (o.problema ? `🔍 *Problema:* ${o.problema}\n\n` : '') +
    (o.servicos ? `🔧 *Serviços:*\n${o.servicos}\n\n` : '') +
    (o.pecas ? `⚙️ *Peças:*\n${o.pecas}\n\n` : '') +
    `💰 *Valor total: ${fmt.currency(total)}*\n\n` +
    (o.obs ? `📌 ${o.obs}\n\n` : '') +
    `Para aprovar, responda esta mensagem.\n\n` +
    `_${nomeOficina}${telOficina ? ' · ' + telOficina : ''}_`;

  const url = `https://wa.me/${tel ? '55' + tel : ''}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function imprimirOrcamento(id) {
  const o = Orcamentos.get(id);
  const of = Oficina.get();
  const total = calcTotalOrc(o);
  const dataFmt = fmt.date(o.criadoEm ? o.criadoEm.split('T')[0] : '');
  const nomeOficina = of.nome || 'Chave 10';

  // Cabeçalho da oficina: logo ou nome
  const logoHtml = of.logo
    ? `<img src="${of.logo}" style="max-height:64px;max-width:200px;object-fit:contain" alt="Logo" />`
    : `<div style="font-size:24px;font-weight:800;color:#1E3A5F">${nomeOficina}</div>`;

  const infoOficina = [
    of.documento ? `CNPJ/CPF: ${of.documento}` : '',
    of.endereco  ? of.endereco : '',
    of.telefone  ? `Tel: ${of.telefone}` : '',
    of.whatsapp  ? `WhatsApp: ${of.whatsapp}` : '',
    of.email     ? of.email : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>${o.numero} — ${nomeOficina}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Arial,sans-serif;max-width:720px;margin:32px auto;padding:0 24px;color:#1f2937;font-size:14px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;margin-bottom:6px;border-bottom:3px solid #F97316}
      .header-left{}
      .oficina-info{font-size:11px;color:#6b7280;margin-top:6px;line-height:1.6}
      .meta{text-align:right;font-size:13px;color:#6b7280}
      .meta strong{font-size:17px;color:#1f2937;display:block;margin-bottom:4px}
      .status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#fffbeb;color:#d97706;border:1px solid #fde68a}
      h3{font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;margin:18px 0 7px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:4px}
      .lbl{font-size:10.5px;color:#9ca3af;display:block;margin-bottom:1px}
      .val{font-size:13.5px;font-weight:600;color:#111827}
      .text-block{background:#f9fafb;padding:10px 14px;border-radius:6px;white-space:pre-wrap;font-size:13px;border:1px solid #e5e7eb}
      .valores{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-top:8px}
      .vrow{display:flex;justify-content:space-between;padding:9px 16px;border-bottom:1px solid #f3f4f6;font-size:13.5px}
      .vrow:last-child{border-bottom:none;font-weight:800;font-size:16px;background:#fff7ed;color:#F97316}
      .footer{margin-top:28px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:14px}
      @media print{body{margin:0;padding:16px}}
    </style></head><body>
    <div class="header">
      <div class="header-left">
        ${logoHtml}
        ${infoOficina ? `<div class="oficina-info">${infoOficina}</div>` : ''}
      </div>
      <div class="meta">
        <strong>${o.numero}</strong>
        Data: ${dataFmt}<br>
        <span class="status-badge">${o.status.toUpperCase()}</span>
      </div>
    </div>
    <h3>Cliente</h3>
    <div class="grid">
      <div><span class="lbl">Nome</span><span class="val">${o.clienteNome||'-'}</span></div>
      <div><span class="lbl">Telefone</span><span class="val">${o.clienteTel||'-'}</span></div>
    </div>
    <h3>Veículo</h3>
    <div class="grid">
      <div><span class="lbl">Veículo</span><span class="val">${o.veiculo||'-'}</span></div>
      <div><span class="lbl">Placa</span><span class="val">${o.placa||'-'}</span></div>
      <div><span class="lbl">Quilometragem</span><span class="val">${o.km ? parseInt(o.km).toLocaleString('pt-BR')+' km' : '-'}</span></div>
      <div><span class="lbl">Problema</span><span class="val">${o.problema||'-'}</span></div>
    </div>
    <h3>Serviços</h3><div class="text-block">${o.servicos||'Não informado'}</div>
    <h3>Peças</h3><div class="text-block">${o.pecas||'Não informado'}</div>
    <h3>Valores</h3>
    <div class="valores">
      <div class="vrow"><span>Mão de obra</span><span>${fmt.currency(o.valorMO)}</span></div>
      <div class="vrow"><span>Peças</span><span>${fmt.currency(o.valorPecas)}</span></div>
      ${parseFloat(o.desconto||0)>0?`<div class="vrow" style="color:#16a34a"><span>Desconto</span><span>- ${fmt.currency(o.desconto)}</span></div>`:''}
      <div class="vrow"><span>Total</span><span>${fmt.currency(total)}</span></div>
    </div>
    ${o.obs?`<h3>Observações</h3><div class="text-block">${o.obs}</div>`:''}
    <div class="footer">${nomeOficina} · Orçamento gerado em ${dataFmt}${of.whatsapp ? ' · WhatsApp: ' + of.whatsapp : ''}</div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

function converterEmOS(orcId) {
  const o = Orcamentos.get(orcId);
  if (!o.clienteId || !o.veiculoId) {
    showToast('Orçamento precisa ter cliente e veículo vinculados', 'error');
    return;
  }
  const novaOS = Ordens.save({
    clienteId: o.clienteId,
    veiculoId: o.veiculoId,
    problema: o.problema || '',
    servicos: o.servicos || '',
    pecas: o.pecas || '',
    valorMO: o.valorMO || '0',
    valorPecas: o.valorPecas || '0',
    data: new Date().toISOString().split('T')[0],
    status: 'em_andamento'
  });
  closeModal();
  showToast(`OS #${novaOS.numero} criada com sucesso!`, 'success');
  navigate('ordens');
}

// ===== MENSAGENS (WhatsApp) =====
function mensagens() {
  const clientes = Clientes.all();
  const historico = MsgHistorico.all();

  const templates = [
    { id: 'orcamento',  label: '💰 Orçamento aprovado',    texto: (c, v, os) => `Olá ${c}! Seu orçamento para o *${v}* foi aprovado. Pode trazer o veículo que já vamos iniciar o serviço. Qualquer dúvida estamos à disposição! 🔧` },
    { id: 'os_pronta',  label: '✅ OS finalizada',          texto: (c, v, os) => `Olá ${c}! Seu *${v}* está pronto para retirada. ${os ? `OS #${os} finalizada com sucesso.` : ''} Aguardamos você! 😊` },
    { id: 'revisao',    label: '🔔 Lembrete de revisão',    texto: (c, v, os) => `Olá ${c}! Passando para lembrar que o *${v}* está próximo da revisão. Agende agora e evite problemas! 📅` },
    { id: 'orcamento_envio', label: '📋 Enviar orçamento', texto: (c, v, os) => `Olá ${c}! Segue o orçamento para o *${v}*:\n\n📌 Serviços: [descreva aqui]\n💰 Valor total: R$ [valor]\n\nAguardo sua confirmação! 🔧` },
    { id: 'agradecimento', label: '⭐ Agradecimento',       texto: (c, v, os) => `Olá ${c}! Obrigado por confiar em nossos serviços! Esperamos que o *${v}* esteja rodando perfeitamente. Qualquer problema, pode chamar! 😊` },
    { id: 'cobranca',   label: '💳 Cobrança pendente',      texto: (c, v, os) => `Olá ${c}! Identificamos um pagamento pendente referente ao serviço do *${v}*. Por favor, entre em contato para regularizar. Obrigado!` },
    { id: 'personalizada', label: '✏️ Mensagem personalizada', texto: (c, v, os) => `` },
  ];

  // Conta mensagens enviadas hoje
  const hoje = new Date().toISOString().split('T')[0];
  const enviadas = historico.filter(h => h.data === hoje).length;

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Mensagens WhatsApp</div>
        <div class="page-subtitle">${enviadas} mensagem(ns) enviada(s) hoje</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start">

      <!-- PAINEL ESQUERDO: selecionar cliente + template -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Busca de cliente -->
        <div class="card">
          <div class="card-title" style="margin-bottom:14px">👤 Selecionar cliente</div>
          <div class="search-input-wrap" style="margin-bottom:12px">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Buscar cliente..." id="msgBuscaCliente" oninput="msgFiltrarClientes(this.value)" style="padding-left:36px" />
          </div>
          <div id="msgListaClientes" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:2px">
            ${clientes.length ? clientes.map(c => `
              <div class="msg-cliente-item" id="msgc_${c.id}" onclick="msgSelecionarCliente(${c.id})" style="padding:10px 12px;border-radius:8px;cursor:pointer;transition:background .15s;border:1.5px solid transparent">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:34px;height:34px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${c.nome[0].toUpperCase()}</div>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--gray-800)">${c.nome}</div>
                    <div style="font-size:11.5px;color:var(--gray-400)">${c.telefone||'Sem telefone'}</div>
                  </div>
                </div>
              </div>`).join('') : `<div style="text-align:center;padding:24px;color:var(--gray-400);font-size:13px">Nenhum cliente cadastrado</div>`}
          </div>
        </div>

        <!-- Templates -->
        <div class="card">
          <div class="card-title" style="margin-bottom:14px">📋 Templates de mensagem</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${templates.map(t => `
              <button class="msg-template-btn" id="msgt_${t.id}" onclick="msgSelecionarTemplate('${t.id}')"
                style="text-align:left;padding:10px 12px;border-radius:8px;border:1.5px solid var(--gray-200);background:#fff;cursor:pointer;font-size:13px;font-weight:500;color:var(--gray-700);transition:all .15s">
                ${t.label}
              </button>`).join('')}
          </div>
        </div>
      </div>

      <!-- PAINEL DIREITO: composer + histórico -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Composer -->
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">✍️ Compor mensagem</div>

          <!-- Cliente selecionado -->
          <div id="msgClienteSel" style="display:none;background:var(--brand-light);border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:12px;color:var(--gray-500);margin-bottom:2px">Enviando para:</div>
              <div id="msgClienteNome" style="font-size:14px;font-weight:700;color:var(--brand)"></div>
              <div id="msgClienteTel" style="font-size:12px;color:var(--gray-500)"></div>
            </div>
            <button onclick="msgLimparCliente()" style="background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:18px;padding:4px">×</button>
          </div>

          <!-- Veículo (opcional) -->
          <div class="form-group" style="margin-bottom:12px">
            <label>Veículo (opcional)</label>
            <select id="msgVeiculo">
              <option value="">Selecione um veículo...</option>
            </select>
          </div>

          <!-- OS (opcional) -->
          <div class="form-group" style="margin-bottom:14px">
            <label>OS relacionada (opcional)</label>
            <select id="msgOS">
              <option value="">Nenhuma</option>
            </select>
          </div>

          <!-- Texto da mensagem -->
          <div class="form-group" style="margin-bottom:16px">
            <label>Mensagem</label>
            <textarea id="msgTexto" rows="6" placeholder="Selecione um cliente e um template, ou escreva sua mensagem..." style="resize:vertical;font-size:13.5px;line-height:1.6"></textarea>
          </div>

          <!-- Contador + botão -->
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span id="msgContador" style="font-size:12px;color:var(--gray-400)">0 caracteres</span>
            <button class="btn btn-primary" onclick="msgEnviar()" style="background:#25D366;box-shadow:0 2px 8px rgba(37,211,102,.3)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              Abrir no WhatsApp
            </button>
          </div>
        </div>

        <!-- Histórico -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📨 Histórico de mensagens</div>
            ${historico.length ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="msgLimparHistorico()">Limpar</button>` : ''}
          </div>
          ${historico.length ? `
          <div style="display:flex;flex-direction:column;gap:0;max-height:320px;overflow-y:auto">
            ${[...historico].reverse().map(h => `
              <div style="padding:12px 0;border-bottom:1px solid var(--gray-100);display:flex;gap:12px;align-items:flex-start">
                <div style="width:32px;height:32px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                </div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                    <span style="font-size:13px;font-weight:600;color:var(--gray-800)">${h.clienteNome}</span>
                    <span style="font-size:11px;color:var(--gray-400)">${fmt.date(h.data)} ${h.hora}</span>
                  </div>
                  <div style="font-size:12.5px;color:var(--gray-500);white-space:pre-wrap;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${h.texto}</div>
                </div>
              </div>`).join('')}
          </div>` : `<div class="empty-state" style="padding:28px"><div class="empty-icon">💬</div><p>Nenhuma mensagem enviada ainda</p></div>`}
        </div>
      </div>
    </div>`;

  // Estado interno
  window._msgClienteId = null;
  window._msgTemplateId = null;

  // Contador de caracteres
  document.getElementById('msgTexto').addEventListener('input', function() {
    document.getElementById('msgContador').textContent = this.value.length + ' caracteres';
  });

  // Atualiza texto ao mudar veículo ou OS
  document.getElementById('msgVeiculo').addEventListener('change', msgAtualizarTexto);
  document.getElementById('msgOS').addEventListener('change', msgAtualizarTexto);
}

// Store de histórico de mensagens — definido em data.js

function msgFiltrarClientes(q) {
  const ql = q.toLowerCase();
  document.querySelectorAll('.msg-cliente-item').forEach(el => {
    const nome = el.querySelector('div > div > div').textContent.toLowerCase();
    const tel  = el.querySelectorAll('div > div > div')[1]?.textContent.toLowerCase() || '';
    el.style.display = (!q || nome.includes(ql) || tel.includes(ql)) ? '' : 'none';
  });
}

function msgSelecionarCliente(id) {
  const c = Clientes.get(id);
  if (!c) return;
  window._msgClienteId = id;

  // Destaca item selecionado
  document.querySelectorAll('.msg-cliente-item').forEach(el => {
    el.style.background = '';
    el.style.borderColor = 'transparent';
  });
  const el = document.getElementById('msgc_' + id);
  if (el) { el.style.background = 'var(--brand-light)'; el.style.borderColor = 'var(--brand)'; }

  // Mostra info do cliente no composer
  const box = document.getElementById('msgClienteSel');
  if (box) { box.style.display = 'flex'; }
  document.getElementById('msgClienteNome').textContent = c.nome;
  document.getElementById('msgClienteTel').textContent = c.telefone || 'Sem telefone cadastrado';

  // Carrega veículos do cliente
  const veiculos = Veiculos.byCliente(id);
  const selV = document.getElementById('msgVeiculo');
  selV.innerHTML = '<option value="">Selecione um veículo...</option>' +
    veiculos.map(v => `<option value="${v.id}">${v.marca} ${v.modelo} — ${v.placa}</option>`).join('');

  // Carrega OS do cliente
  const ordens = Ordens.all().filter(o => o.clienteId === id).sort((a,b) => b.id - a.id).slice(0, 10);
  const selOS = document.getElementById('msgOS');
  selOS.innerHTML = '<option value="">Nenhuma</option>' +
    ordens.map(o => `<option value="${o.numero}">OS #${o.numero} — ${o.problema?.substring(0,40)||''}</option>`).join('');

  // Atualiza texto se já tem template
  msgAtualizarTexto();
}

function msgLimparCliente() {
  window._msgClienteId = null;
  document.querySelectorAll('.msg-cliente-item').forEach(el => {
    el.style.background = '';
    el.style.borderColor = 'transparent';
  });
  const box = document.getElementById('msgClienteSel');
  if (box) box.style.display = 'none';
  document.getElementById('msgVeiculo').innerHTML = '<option value="">Selecione um veículo...</option>';
  document.getElementById('msgOS').innerHTML = '<option value="">Nenhuma</option>';
  document.getElementById('msgTexto').value = '';
  document.getElementById('msgContador').textContent = '0 caracteres';
}

function msgSelecionarTemplate(id) {
  window._msgTemplateId = id;
  document.querySelectorAll('.msg-template-btn').forEach(el => {
    el.style.background = '';
    el.style.borderColor = 'var(--gray-200)';
    el.style.color = 'var(--gray-700)';
  });
  const btn = document.getElementById('msgt_' + id);
  if (btn) {
    btn.style.background = 'var(--brand-light)';
    btn.style.borderColor = 'var(--brand)';
    btn.style.color = 'var(--brand)';
  }
  msgAtualizarTexto();
}

function msgAtualizarTexto() {
  const templates = {
    orcamento:      (c, v, os) => `Olá ${c}! Seu orçamento para o *${v}* foi aprovado. Pode trazer o veículo que já vamos iniciar o serviço. Qualquer dúvida estamos à disposição! 🔧`,
    os_pronta:      (c, v, os) => `Olá ${c}! Seu *${v}* está pronto para retirada.${os ? ` OS #${os} finalizada com sucesso.` : ''} Aguardamos você! 😊`,
    revisao:        (c, v, os) => `Olá ${c}! Passando para lembrar que o *${v}* está próximo da revisão. Agende agora e evite problemas! 📅`,
    orcamento_envio:(c, v, os) => `Olá ${c}! Segue o orçamento para o *${v}*:\n\n📌 Serviços: [descreva aqui]\n💰 Valor total: R$ [valor]\n\nAguardo sua confirmação! 🔧`,
    agradecimento:  (c, v, os) => `Olá ${c}! Obrigado por confiar em nossos serviços! Esperamos que o *${v}* esteja rodando perfeitamente. Qualquer problema, pode chamar! 😊`,
    cobranca:       (c, v, os) => `Olá ${c}! Identificamos um pagamento pendente referente ao serviço do *${v}*. Por favor, entre em contato para regularizar. Obrigado!`,
    personalizada:  (c, v, os) => ``,
  };

  const tid = window._msgTemplateId;
  const cid = window._msgClienteId;
  if (!tid) return;

  const c = cid ? (Clientes.get(cid)?.nome || 'cliente') : 'cliente';
  const selV = document.getElementById('msgVeiculo');
  const selOS = document.getElementById('msgOS');
  const vLabel = selV?.options[selV.selectedIndex]?.text || 'seu veículo';
  const osNum  = selOS?.value || '';

  const v = (selV?.value && vLabel !== 'Selecione um veículo...') ? vLabel.split(' — ')[0] : 'seu veículo';

  const fn = templates[tid];
  if (fn) {
    const txt = fn(c, v, osNum);
    document.getElementById('msgTexto').value = txt;
    document.getElementById('msgContador').textContent = txt.length + ' caracteres';
  }
}

function msgEnviar() {
  const cid = window._msgClienteId;
  const texto = document.getElementById('msgTexto').value.trim();

  if (!cid) { showToast('Selecione um cliente', 'error'); return; }
  if (!texto) { showToast('Escreva uma mensagem', 'error'); return; }

  const c = Clientes.get(cid);
  if (!c?.telefone) { showToast('Cliente sem telefone cadastrado', 'error'); return; }

  // Limpa o número: remove tudo que não é dígito
  const tel = c.telefone.replace(/\D/g, '');
  // Adiciona DDI 55 se não tiver
  const telFull = tel.startsWith('55') ? tel : '55' + tel;

  const url = `https://wa.me/${telFull}?text=${encodeURIComponent(texto)}`;

  // Salva no histórico
  const agora = new Date();
  MsgHistorico.add({
    clienteId: cid,
    clienteNome: c.nome,
    telefone: c.telefone,
    texto,
    data: agora.toISOString().split('T')[0],
    hora: agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
  });

  window.open(url, '_blank');
  showToast('WhatsApp aberto!', 'success');

  // Recarrega para atualizar histórico
  setTimeout(() => mensagens(), 300);
}

function msgLimparHistorico() {
  confirm('Limpar todo o histórico de mensagens?', () => {
    MsgHistorico.clear();
    mensagens();
    showToast('Histórico limpo');
  });
}

// ===== AGENDA =====
function agenda() {
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - diaSemana);

  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const horas = Array.from({length: 11}, (_, i) => i + 8); // 8h às 18h

  const agendamentos = Ordens.all().filter(o => {
    const d = new Date(o.data + 'T12:00:00');
    const fim = new Date(inicioSemana); fim.setDate(fim.getDate() + 6);
    return d >= inicioSemana && d <= fim;
  });

  const headerCells = `<div class="agenda-header-cell" style="background:var(--gray-50)">Hora</div>` +
    Array.from({length:7}, (_, i) => {
      const d = new Date(inicioSemana); d.setDate(d.getDate() + i);
      const isToday = d.toDateString() === hoje.toDateString();
      const label = `${dias[i]}<br><strong style="font-size:16px">${d.getDate()}</strong>`;
      return `<div class="agenda-header-cell ${isToday ? 'today' : ''}">${label}</div>`;
    }).join('');

  const rows = horas.map(h => {
    const timecell = `<div class="agenda-time-cell">${h}:00</div>`;
    const slots = Array.from({length:7}, (_, i) => {
      const d = new Date(inicioSemana); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const ags = agendamentos.filter(o => o.data === dateStr);
      const events = ags.map(o => {
        const c = Clientes.get(o.clienteId);
        const v = Veiculos.get(o.veiculoId);
        return `<div class="agenda-event orange" onclick="verOS(${o.id})" title="${c?c.nome:''} — ${v?v.modelo:''}">
          ${c ? c.nome.split(' ')[0] : 'OS #'+o.numero}
        </div>`;
      }).join('');
      return `<div class="agenda-slot">${events}</div>`;
    }).join('');
    return timecell + slots;
  }).join('');

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Agenda</div><div class="page-subtitle">Semana de ${fmt.date(inicioSemana.toISOString().split('T')[0])}</div></div>
      <button class="btn btn-primary" onclick="navigate('ordens');setTimeout(novaOrdem,100)">+ Agendar Serviço</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="agenda-grid">
        ${headerCells}${rows}
      </div>
    </div>
    <p style="font-size:12px;color:var(--gray-400);margin-top:12px;text-align:center">
      Os agendamentos são baseados nas datas das Ordens de Serviço desta semana.
    </p>`;
}

// ===== FINANCEIRO =====
function financeiro() {
  const hoje = new Date();
  const y = hoje.getFullYear(), m = hoje.getMonth();
  const inicioMes = new Date(y, m, 1).toISOString().split('T')[0];
  const fimMes    = new Date(y, m+1, 0).toISOString().split('T')[0];
  renderFinanceiro(inicioMes, fimMes);
}

function renderFinanceiro(inicioMes, fimMes) {
  const hoje = new Date();
  const ordens = Ordens.all().filter(o => o.data >= inicioMes && o.data <= fimMes && o.status === 'finalizado');
  const receita = ordens.reduce((s,o) => s + parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0), 0);

  const todasDespesas = Despesas.all().filter(d => d.data >= inicioMes && d.data <= fimMes);
  const totalDespesas = todasDespesas.reduce((s,d) => s + parseFloat(d.valor||0), 0);
  const lucro = receita - totalDespesas;

  const mesLabel = new Date(inicioMes).toLocaleDateString('pt-BR', {month:'long', year:'numeric'});

  // Faturamento por dia
  const diasMes = [];
  const cur = new Date(inicioMes);
  while (cur <= new Date(fimMes)) { diasMes.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate()+1); }
  const fatDia = diasMes.map(d => ({
    d, v: ordens.filter(o => o.data === d).reduce((s,o) => s + parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0), 0)
  }));

  // Categorias de despesas
  const catMap = {};
  todasDespesas.forEach(d => {
    if (!catMap[d.categoria]) catMap[d.categoria] = 0;
    catMap[d.categoria] += parseFloat(d.valor||0);
  });

  const catIcons = {
    'Aluguel': '🏠', 'Energia': '⚡', 'Água': '💧', 'Internet': '🌐',
    'Folha de pagamento': '👥', 'Peças/Estoque': '🔩', 'Ferramentas': '🔧',
    'Boleto/Financiamento': '📄', 'Impostos': '🏛️', 'Marketing': '📣',
    'Combustível': '⛽', 'Manutenção': '🛠️', 'Outros': '📦'
  };

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Financeiro</div><div class="page-subtitle">${mesLabel}</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="dash-select" onchange="finChangeMes(this.value)" id="finMesSel">
          ${Array.from({length:6},(_,i)=>{
            const d = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1);
            const ini = d.toISOString().split('T')[0];
            const fim = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0];
            const lbl = d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
            const sel = ini === inicioMes ? 'selected' : '';
            return `<option value="${ini}|${fim}" ${sel}>${lbl}</option>`;
          }).join('')}
        </select>
        <button class="btn btn-primary btn-sm" onclick="abrirModalDespesa()">+ Nova despesa</button>
      </div>
    </div>

    <!-- CARDS RESUMO -->
    <div class="fin-summary">
      <div class="fin-card receita">
        <div class="fin-card-label">💰 Receita do mês</div>
        <div class="fin-card-value">${fmt.currency(receita)}</div>
        <div style="font-size:12px;color:var(--gray-400);margin-top:6px">${ordens.length} serviços finalizados</div>
      </div>
      <div class="fin-card despesa">
        <div class="fin-card-label">📉 Despesas do mês</div>
        <div class="fin-card-value">${fmt.currency(totalDespesas)}</div>
        <div style="font-size:12px;color:var(--gray-400);margin-top:6px">${todasDespesas.length} lançamento(s)</div>
      </div>
      <div class="fin-card ${lucro >= 0 ? 'lucro' : 'prejuizo'}">
        <div class="fin-card-label">${lucro >= 0 ? '📈 Lucro líquido' : '⚠️ Prejuízo'}</div>
        <div class="fin-card-value" style="color:${lucro>=0?'var(--success)':'var(--danger)'}">${fmt.currency(lucro)}</div>
        <div style="font-size:12px;color:var(--gray-400);margin-top:6px">Margem: ${receita > 0 ? ((lucro/receita)*100).toFixed(1) : 0}%</div>
      </div>
    </div>

    <!-- GRÁFICO -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">Faturamento diário — ${mesLabel}</div></div>
      ${renderLineChart(fatDia, '#F97316')}
    </div>

    <!-- DESPESAS + RECEITAS lado a lado -->
    <div class="dash-two-col" style="margin-bottom:20px">

      <!-- DESPESAS POR CATEGORIA -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Despesas por categoria</div>
        </div>
        ${Object.keys(catMap).length ? `
          <div style="display:flex;flex-direction:column;gap:10px">
            ${Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat, val]) => {
              const pct = totalDespesas > 0 ? (val/totalDespesas*100).toFixed(1) : 0;
              return `<div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:600;color:var(--gray-700)">${catIcons[cat]||'📦'} ${cat}</span>
                  <span style="font-size:13px;font-weight:700;color:var(--danger)">${fmt.currency(val)}</span>
                </div>
                <div style="height:6px;background:var(--gray-100);border-radius:99px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:var(--danger);border-radius:99px;transition:width .4s"></div>
                </div>
                <div style="font-size:11px;color:var(--gray-400);margin-top:2px">${pct}% do total</div>
              </div>`;
            }).join('')}
          </div>
        ` : `<div class="empty-state" style="padding:32px"><div class="empty-icon">📊</div><p>Nenhuma despesa cadastrada</p></div>`}
      </div>

      <!-- ÚLTIMAS RECEITAS -->
      <div class="card">
        <div class="card-header"><div class="card-title">Últimas receitas</div></div>
        ${ordens.length ? `
        <div style="display:flex;flex-direction:column;gap:0">
          ${[...ordens].sort((a,b)=>b.id-a.id).slice(0,8).map(o => {
            const c = Clientes.get(o.clienteId);
            const total = parseFloat(o.valorMO||0)+parseFloat(o.valorPecas||0);
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-100)">
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--gray-800)">OS #${o.numero} · ${c?c.nome:'-'}</div>
                <div style="font-size:11.5px;color:var(--gray-400)">${fmt.date(o.data)}</div>
              </div>
              <span style="font-size:13px;font-weight:700;color:var(--success)">${fmt.currency(total)}</span>
            </div>`;
          }).join('')}
        </div>` : `<div class="empty-state" style="padding:32px"><div class="empty-icon">💰</div><p>Nenhuma receita este mês</p></div>`}
      </div>
    </div>

    <!-- TABELA DE DESPESAS -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Lançamentos de despesas</div>
      </div>
      ${todasDespesas.length ? `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Status</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            ${[...todasDespesas].sort((a,b)=>b.data.localeCompare(a.data)).map(d => `
              <tr>
                <td>${fmt.date(d.data)}</td>
                <td><strong>${d.descricao}</strong></td>
                <td><span class="badge badge-gray">${catIcons[d.categoria]||'📦'} ${d.categoria}</span></td>
                <td>${d.vencimento ? fmt.date(d.vencimento) : '-'}</td>
                <td>${d.pago
                  ? '<span class="badge badge-green">✓ Pago</span>'
                  : (d.vencimento && d.vencimento < new Date().toISOString().split("T")[0]
                    ? '<span class="badge badge-red">Vencido</span>'
                    : '<span class="badge badge-yellow">Pendente</span>')}</td>
                <td><strong style="color:var(--danger)">${fmt.currency(d.valor)}</strong></td>
                <td>
                  <div style="display:flex;gap:4px">
                    ${!d.pago ? `<button class="btn btn-success btn-sm" onclick="marcarDespesaPaga(${d.id})" title="Marcar como pago">✓</button>` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="editarDespesa(${d.id})" title="Editar">✏️</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="excluirDespesa(${d.id})" title="Excluir">🗑️</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="empty-state" style="padding:40px">
        <div class="empty-icon">📄</div>
        <p>Nenhuma despesa lançada neste mês</p>
      </div>`}
    </div>`;

  // Guarda período atual para recarregar após salvar
  window._finIni = inicioMes;
  window._finFim = fimMes;
}

function finChangeMes(val) {
  const [ini, fim] = val.split('|');
  renderFinanceiro(ini, fim);
}

function abrirModalDespesa(id) {
  const d = id ? Despesas.get(id) : null;
  const hoje = new Date().toISOString().split('T')[0];
  const categorias = ['Aluguel','Energia','Água','Internet','Folha de pagamento','Peças/Estoque','Ferramentas','Boleto/Financiamento','Impostos','Marketing','Combustível','Manutenção','Outros'];

  openModal(d ? '✏️ Editar despesa' : '📄 Nova despesa', `
    <div class="form-grid">
      <div class="form-group">
        <label>Descrição *</label>
        <input id="despDesc" type="text" placeholder="Ex: Boleto aluguel, Conta de luz..." value="${d?.descricao||''}" />
      </div>
      <div class="form-group">
        <label>Categoria *</label>
        <select id="despCat">
          ${categorias.map(c => `<option value="${c}" ${d?.categoria===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Valor (R$) *</label>
        <input id="despValor" type="number" step="0.01" min="0" placeholder="0,00" value="${d?.valor||''}" />
      </div>
      <div class="form-group">
        <label>Data do lançamento *</label>
        <input id="despData" type="date" value="${d?.data||hoje}" />
      </div>
      <div class="form-group">
        <label>Data de vencimento</label>
        <input id="despVenc" type="date" value="${d?.vencimento||''}" />
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="despPago">
          <option value="0" ${!d?.pago?'selected':''}>Pendente</option>
          <option value="1" ${d?.pago?'selected':''}>Pago</option>
        </select>
      </div>
      <div class="form-group full">
        <label>Observação</label>
        <textarea id="despObs" rows="2" placeholder="Detalhes adicionais...">${d?.obs||''}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarDespesa(${id||''})">💾 Salvar</button>
    </div>`);
  setTimeout(() => document.getElementById('despDesc')?.focus(), 100);
}

function editarDespesa(id) { abrirModalDespesa(id); }

function salvarDespesa(id) {
  const desc  = document.getElementById('despDesc').value.trim();
  const cat   = document.getElementById('despCat').value;
  const valor = parseFloat(document.getElementById('despValor').value);
  const data  = document.getElementById('despData').value;
  const venc  = document.getElementById('despVenc').value;
  const pago  = document.getElementById('despPago').value === '1';
  const obs   = document.getElementById('despObs').value.trim();

  if (!desc) { showToast('Informe a descrição', 'error'); return; }
  if (!valor || valor <= 0) { showToast('Informe um valor válido', 'error'); return; }
  if (!data) { showToast('Informe a data', 'error'); return; }

  Despesas.save({ id: id||undefined, descricao: desc, categoria: cat, valor, data, vencimento: venc||null, pago, obs });
  closeModal();
  showToast(id ? 'Despesa atualizada!' : 'Despesa cadastrada!', 'success');

  // Garante que _finIni/_finFim existem antes de renderizar
  if (!window._finIni) {
    const hoje = new Date();
    window._finIni = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    window._finFim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().split('T')[0];
  }
  renderFinanceiro(window._finIni, window._finFim);
}

function marcarDespesaPaga(id) {
  const d = Despesas.get(id);
  if (!d) return;
  d.pago = true;
  Despesas.save(d);
  showToast('Marcado como pago!', 'success');
  renderFinanceiro(window._finIni, window._finFim);
}

function excluirDespesa(id) {
  confirm('Excluir esta despesa?', () => {
    Despesas.delete(id);
    showToast('Despesa excluída', 'success');
    renderFinanceiro(window._finIni, window._finFim);
  });
}

// ===== RELATÓRIOS =====
function relatorios() {
  const todasOrdens = Ordens.all().filter(o => o.status === 'finalizado');
  const totalFat = todasOrdens.reduce((s,o) => s + parseFloat(o.valorMO||0) + parseFloat(o.valorPecas||0), 0);
  const ticketMedio = todasOrdens.length ? totalFat / todasOrdens.length : 0;

  // Top serviços
  const svcMap = {};
  todasOrdens.forEach(o => {
    const servs = (o.servicos||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    servs.forEach(s => {
      const k = s.toLowerCase().substring(0,30);
      if (!svcMap[k]) svcMap[k] = { nome: s, qtd: 0, fat: 0 };
      svcMap[k].qtd++;
      svcMap[k].fat += (parseFloat(o.valorMO||0)+parseFloat(o.valorPecas||0)) / Math.max(1,servs.length);
    });
  });
  const topSvc = Object.values(svcMap).sort((a,b)=>b.qtd-a.qtd).slice(0,5);
  const maxQtd = topSvc.length ? topSvc[0].qtd : 1;

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Relatórios</div><div class="page-subtitle">Visão geral do desempenho da oficina</div></div>
      <button class="btn btn-outline" onclick="window.print()">🖨️ Imprimir</button>
    </div>

    <div class="stats-grid" style="margin-bottom:24px">
      <div class="stat-card c-orange">
        <div class="stat-icon c-orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="stat-body"><div class="stat-value" style="font-size:18px">${fmt.currency(totalFat)}</div><div class="stat-label">Faturamento total</div></div>
      </div>
      <div class="stat-card c-blue">
        <div class="stat-icon c-blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="stat-body"><div class="stat-value">${todasOrdens.length}</div><div class="stat-label">Serviços realizados</div></div>
      </div>
      <div class="stat-card c-green">
        <div class="stat-icon c-green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="stat-body"><div class="stat-value" style="font-size:18px">${fmt.currency(ticketMedio)}</div><div class="stat-label">Ticket médio</div></div>
      </div>
      <div class="stat-card c-blue">
        <div class="stat-icon c-blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <div class="stat-body"><div class="stat-value">${Clientes.all().length}</div><div class="stat-label">Clientes cadastrados</div></div>
      </div>
    </div>

    <div class="dash-grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Top 5 serviços mais realizados</div></div>
        ${topSvc.length ? topSvc.map((s,i) => `
          <div class="top-item">
            <div class="top-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
            <div class="top-bar-wrap">
              <div class="top-bar-label">${s.nome}</div>
              <div class="top-bar-bg"><div class="top-bar-fill" style="width:${(s.qtd/maxQtd*100).toFixed(0)}%"></div></div>
            </div>
            <div class="top-val">${s.qtd}x</div>
            <div class="top-val" style="margin-left:8px;color:var(--accent)">${fmt.currency(s.fat)}</div>
          </div>`).join('') : '<div class="empty-state"><div class="empty-icon">📊</div><p>Sem dados ainda</p></div>'}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Distribuição de receita</div></div>
        ${renderPieChart(buildCategorias(todasOrdens))}
      </div>
    </div>`;
}

function buildCategorias(ordens) {
  const cat = { 'Troca de óleo': 0, 'Freios': 0, 'Suspensão': 0, 'Elétrica': 0, 'Revisão': 0, 'Outros': 0 };
  ordens.forEach(o => {
    const s = (o.servicos||'').toLowerCase();
    const v = parseFloat(o.valorMO||0)+parseFloat(o.valorPecas||0);
    if (s.includes('óleo')||s.includes('oleo')) cat['Troca de óleo']+=v;
    else if (s.includes('freio')||s.includes('pastilha')) cat['Freios']+=v;
    else if (s.includes('suspensão')||s.includes('amortecedor')) cat['Suspensão']+=v;
    else if (s.includes('elétric')||s.includes('bateria')) cat['Elétrica']+=v;
    else if (s.includes('revisão')||s.includes('correia')) cat['Revisão']+=v;
    else cat['Outros']+=v;
  });
  return cat;
}

// ===== ESTOQUE =====
function estoque() {
  renderEstoquePatrimonio();
}

function renderEstoquePatrimonio() {
  const todos    = Estoque.all();
  const pecas    = Estoque.byCategoria('peca');
  const ferr     = Estoque.byCategoria('ferramenta');
  const baixo    = pecas.filter(i => parseInt(i.quantidade||0) <= parseInt(i.estoqueMin||0) && parseInt(i.estoqueMin||0) > 0);
  const zerado   = pecas.filter(i => parseInt(i.quantidade||0) === 0);

  const valPecas = pecas.reduce((s,i) => s + parseFloat(i.preco||0) * parseInt(i.quantidade||1), 0);
  const valFerr  = ferr.reduce((s,i)  => s + parseFloat(i.preco||0) * parseInt(i.quantidade||1), 0);
  const valTotal = valPecas + valFerr;

  // Top 5 itens mais valiosos
  const top5 = [...todos]
    .map(i => ({ ...i, valorTotal: parseFloat(i.preco||0) * parseInt(i.quantidade||1) }))
    .sort((a,b) => b.valorTotal - a.valorTotal)
    .slice(0, 5);

  // Distribuição por tipo de peça
  const tipoMap = {};
  pecas.forEach(i => {
    const t = i.tipo || 'Outros';
    if (!tipoMap[t]) tipoMap[t] = 0;
    tipoMap[t] += parseFloat(i.preco||0) * parseInt(i.quantidade||1);
  });
  const tipoEntries = Object.entries(tipoMap).sort((a,b) => b[1]-a[1]).slice(0, 6);
  const maxTipo = tipoEntries[0]?.[1] || 1;

  // Marcas mais presentes
  const marcaMap = {};
  todos.forEach(i => {
    if (!i.marca) return;
    if (!marcaMap[i.marca]) marcaMap[i.marca] = 0;
    marcaMap[i.marca]++;
  });
  const topMarcas = Object.entries(marcaMap).sort((a,b) => b[1]-a[1]).slice(0, 5);

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Estoque & Patrimônio</div>
        <div class="page-subtitle">${todos.length} item(ns) cadastrado(s)</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" onclick="renderEstoque('','todos')">📋 Ver lista</button>
        <button class="btn btn-outline" onclick="formEstoque(null,'ferramenta')">+ Ferramenta</button>
        <button class="btn btn-primary" onclick="formEstoque(null,'peca')">+ Peça</button>
      </div>
    </div>

    ${baixo.length || zerado.length ? `
    <div class="estoque-alerta" style="margin-bottom:20px">
      <span>⚠️</span>
      <span>
        ${zerado.length ? `<strong>${zerado.length} peça(s) zerada(s)</strong>` : ''}
        ${zerado.length && baixo.length ? ' · ' : ''}
        ${baixo.length ? `<strong>${baixo.length} peça(s) com estoque baixo</strong>: ${baixo.map(i=>i.nome).join(', ')}` : ''}
      </span>
    </div>` : ''}

    <!-- KPI CARDS -->
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:24px">
      <div class="stat-card c-orange">
        <div class="stat-icon c-orange">💰</div>
        <div>
          <div class="stat-value" style="font-size:17px">${fmt.currency(valTotal)}</div>
          <div class="stat-label">Patrimônio total</div>
        </div>
      </div>
      <div class="stat-card c-blue">
        <div class="stat-icon c-blue">⚙️</div>
        <div>
          <div class="stat-value" style="font-size:17px">${fmt.currency(valPecas)}</div>
          <div class="stat-label">Em peças (${pecas.length})</div>
        </div>
      </div>
      <div class="stat-card c-purple">
        <div class="stat-icon c-purple">🔧</div>
        <div>
          <div class="stat-value" style="font-size:17px">${fmt.currency(valFerr)}</div>
          <div class="stat-label">Em ferramentas (${ferr.length})</div>
        </div>
      </div>
      <div class="stat-card c-red">
        <div class="stat-icon c-red">⚠️</div>
        <div>
          <div class="stat-value">${baixo.length + zerado.length}</div>
          <div class="stat-label">Alertas de estoque</div>
        </div>
      </div>
    </div>

    <!-- GRÁFICOS: distribuição + top itens -->
    <div class="dash-two-col" style="margin-bottom:20px">

      <!-- Distribuição por tipo -->
      <div class="card">
        <div class="card-header"><div class="card-title">📊 Valor por tipo de peça</div></div>
        ${tipoEntries.length ? `
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:4px">
          ${tipoEntries.map(([tipo, val]) => {
            const pct = (val / maxTipo * 100).toFixed(1);
            const pctTotal = valTotal > 0 ? (val/valTotal*100).toFixed(1) : 0;
            return `<div>
              <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                <span style="font-size:13px;font-weight:600;color:var(--gray-700)">${tipo}</span>
                <span style="font-size:13px;font-weight:700;color:var(--brand)">${fmt.currency(val)} <span style="font-weight:400;color:var(--gray-400);font-size:11px">(${pctTotal}%)</span></span>
              </div>
              <div style="height:8px;background:var(--gray-100);border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--brand),var(--brand-mid));border-radius:99px;transition:width .5s"></div>
              </div>
            </div>`;
          }).join('')}
        </div>` : `<div class="empty-state" style="padding:24px"><p>Nenhuma peça cadastrada</p></div>`}
      </div>

      <!-- Divisão peças x ferramentas (visual) -->
      <div class="card">
        <div class="card-header"><div class="card-title">🥧 Composição do patrimônio</div></div>
        ${valTotal > 0 ? (() => {
          const pPecas = (valPecas/valTotal*100).toFixed(1);
          const pFerr  = (valFerr/valTotal*100).toFixed(1);
          return `
          <div style="display:flex;flex-direction:column;gap:20px;margin-top:8px">
            <div style="display:flex;height:28px;border-radius:99px;overflow:hidden;gap:2px">
              ${valPecas > 0 ? `<div style="flex:${valPecas};background:var(--brand);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;min-width:40px">${pPecas}%</div>` : ''}
              ${valFerr  > 0 ? `<div style="flex:${valFerr};background:#7c3aed;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;min-width:40px">${pFerr}%</div>` : ''}
            </div>
            <div style="display:flex;gap:24px;justify-content:center">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:12px;height:12px;border-radius:3px;background:var(--brand)"></div>
                <div>
                  <div style="font-size:12px;color:var(--gray-500)">Peças</div>
                  <div style="font-size:15px;font-weight:700;color:var(--brand)">${fmt.currency(valPecas)}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:12px;height:12px;border-radius:3px;background:#7c3aed"></div>
                <div>
                  <div style="font-size:12px;color:var(--gray-500)">Ferramentas</div>
                  <div style="font-size:15px;font-weight:700;color:#7c3aed">${fmt.currency(valFerr)}</div>
                </div>
              </div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:var(--r);border:1px solid var(--gray-200)">
              <div style="font-size:12px;color:var(--gray-400);margin-bottom:4px">Patrimônio total em estoque</div>
              <div style="font-family:'Poppins',sans-serif;font-size:28px;font-weight:800;color:var(--accent)">${fmt.currency(valTotal)}</div>
            </div>
          </div>`;
        })() : `<div class="empty-state" style="padding:24px"><p>Nenhum item cadastrado</p></div>`}
      </div>
    </div>

    <!-- TOP 5 MAIS VALIOSOS + TOP MARCAS -->
    <div class="dash-two-col" style="margin-bottom:20px">

      <!-- Top 5 itens -->
      <div class="card">
        <div class="card-header"><div class="card-title">🏆 Top 5 itens mais valiosos</div></div>
        ${top5.length ? `
        <div style="display:flex;flex-direction:column;gap:0">
          ${top5.map((i, idx) => `
            <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--gray-100)">
              <div style="width:26px;height:26px;border-radius:50%;background:${idx===0?'var(--accent)':idx===1?'var(--gray-300)':idx===2?'#cd7f32':'var(--gray-100)'};color:${idx<3?'#fff':'var(--gray-500)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${idx+1}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.nome}</div>
                <div style="font-size:11.5px;color:var(--gray-400)">${i.categoria==='peca'?'⚙️ Peça':'🔧 Ferramenta'}${i.marca?' · '+i.marca:''}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:13px;font-weight:700;color:var(--success)">${fmt.currency(i.valorTotal)}</div>
                ${i.categoria==='peca'?`<div style="font-size:11px;color:var(--gray-400)">${i.quantidade||0} un × ${fmt.currency(i.preco||0)}</div>`:''}
              </div>
            </div>`).join('')}
        </div>` : `<div class="empty-state" style="padding:24px"><p>Nenhum item cadastrado</p></div>`}
      </div>

      <!-- Top marcas -->
      <div class="card">
        <div class="card-header"><div class="card-title">🏷️ Marcas no estoque</div></div>
        ${topMarcas.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
          ${topMarcas.map(([marca, qtd]) => `
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:600;color:var(--gray-700)">${marca}</span>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="height:6px;width:${Math.round(qtd/topMarcas[0][1]*100)}px;background:var(--accent);border-radius:99px;min-width:8px"></div>
                <span class="badge badge-gray">${qtd} item(ns)</span>
              </div>
            </div>`).join('')}
        </div>
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray-400)">
            <span>${todos.filter(i=>i.marca).length} itens com marca cadastrada</span>
            <span>${todos.filter(i=>!i.marca).length} sem marca</span>
          </div>
        </div>` : `<div class="empty-state" style="padding:24px"><p>Nenhuma marca cadastrada</p></div>`}
      </div>
    </div>

    <!-- ALERTAS DETALHADOS -->
    ${zerado.length || baixo.length ? `
    <div class="card">
      <div class="card-header"><div class="card-title">🚨 Itens que precisam de atenção</div></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Item</th><th>Tipo</th><th>Qtd atual</th><th>Mínimo</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${[...zerado.map(i=>({...i,_status:'zerado'})), ...baixo.filter(i=>parseInt(i.quantidade||0)>0).map(i=>({...i,_status:'baixo'}))]
              .map(i => `<tr>
                <td><strong>${i.nome}</strong>${i.marca?` <span style="color:var(--gray-400);font-size:12px">· ${i.marca}</span>`:''}</td>
                <td>${i.tipo||'-'}</td>
                <td><strong style="color:${i._status==='zerado'?'var(--danger)':'var(--warning)'}">${i.quantidade||0}</strong></td>
                <td>${i.estoqueMin||0}</td>
                <td>${i._status==='zerado'
                  ? '<span class="badge badge-red">Zerado</span>'
                  : '<span class="badge badge-yellow">Baixo</span>'}</td>
                <td><button class="btn btn-outline btn-sm" onclick="formEstoque(${i.id})">✏️ Repor</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : `
    <div class="card" style="text-align:center;padding:28px">
      <div style="font-size:32px;margin-bottom:8px">✅</div>
      <div style="font-size:14px;font-weight:600;color:var(--success)">Estoque saudável</div>
      <div style="font-size:13px;color:var(--gray-400);margin-top:4px">Nenhum item com estoque baixo ou zerado</div>
    </div>`}`;
}

function renderEstoque(filtro, catFiltro) {
  let lista = Estoque.all();
  if (catFiltro !== 'todos') lista = lista.filter(i => i.categoria === catFiltro);
  if (filtro) lista = lista.filter(i =>
    i.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    (i.marca || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (i.tipo || '').toLowerCase().includes(filtro.toLowerCase())
  );
  lista = lista.sort((a, b) => a.nome.localeCompare(b.nome));

  const totalPecas = Estoque.byCategoria('peca').length;
  const totalFerr  = Estoque.byCategoria('ferramenta').length;
  const baixoEstoque = Estoque.all().filter(i => i.categoria === 'peca' && parseInt(i.quantidade || 0) <= parseInt(i.estoqueMin || 0) && parseInt(i.estoqueMin || 0) > 0);

  const valorPecas = Estoque.byCategoria('peca').reduce((s, i) => s + (parseFloat(i.preco || 0) * parseInt(i.quantidade || 0)), 0);
  const valorFerr  = Estoque.byCategoria('ferramenta').reduce((s, i) => s + (parseFloat(i.preco || 0) * parseInt(i.quantidade || 0)), 0);
  const valorTotal = valorPecas + valorFerr;

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Estoque</div>
        <div class="page-subtitle">${totalPecas} peça(s) · ${totalFerr} ferramenta(s)</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" onclick="renderEstoquePatrimonio()">📊 Patrimônio</button>
        <button class="btn btn-outline" onclick="formEstoque(null,'ferramenta')">+ Ferramenta</button>
        <button class="btn btn-primary" onclick="formEstoque(null,'peca')">+ Peça</button>
      </div>
    </div>

    ${baixoEstoque.length ? `
    <div class="estoque-alerta">
      <span>⚠️</span>
      <span><strong>${baixoEstoque.length} peça(s)</strong> com estoque baixo ou zerado: ${baixoEstoque.map(i => i.nome).join(', ')}</span>
    </div>` : ''}

    <!-- RESUMO -->
    <div class="estoque-summary">
      <div class="estoque-sum-card">
        <div class="estoque-sum-icon" style="background:var(--brand-light);color:var(--brand)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        </div>
        <div>
          <div class="estoque-sum-val">${totalPecas}</div>
          <div class="estoque-sum-lbl">Peças cadastradas</div>
        </div>
      </div>
      <div class="estoque-sum-card">
        <div class="estoque-sum-icon" style="background:var(--accent-light);color:var(--accent)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <div>
          <div class="estoque-sum-val">${totalFerr}</div>
          <div class="estoque-sum-lbl">Ferramentas</div>
        </div>
      </div>
      <div class="estoque-sum-card">
        <div class="estoque-sum-icon" style="background:var(--danger-bg);color:var(--danger)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div>
          <div class="estoque-sum-val">${baixoEstoque.length}</div>
          <div class="estoque-sum-lbl">Estoque baixo</div>
        </div>
      </div>
      <div class="estoque-sum-card">
        <div class="estoque-sum-icon" style="background:var(--success-bg);color:var(--success)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <div class="estoque-sum-val">${fmt.currency(valorPecas)}</div>
          <div class="estoque-sum-lbl">Valor em peças</div>
        </div>
      </div>
      <div class="estoque-sum-card">
        <div class="estoque-sum-icon" style="background:#f5f3ff;color:#7c3aed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div>
          <div class="estoque-sum-val">${fmt.currency(valorFerr)}</div>
          <div class="estoque-sum-lbl">Valor em ferramentas</div>
        </div>
      </div>
    </div>

    <!-- BALANÇO DE PATRIMÔNIO -->
    <div class="card" style="margin-bottom:20px;border-left:4px solid var(--accent)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:12px;background:var(--accent-light);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--gray-800)">Balanço de Patrimônio — Estoque</div>
            <div style="font-size:12px;color:var(--gray-400);margin-top:2px">${totalPecas + totalFerr} itens cadastrados</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:32px;flex-wrap:wrap">
          <div style="text-align:center">
            <div style="font-size:11px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Peças</div>
            <div style="font-family:'Poppins',sans-serif;font-size:18px;font-weight:800;color:var(--success)">${fmt.currency(valorPecas)}</div>
          </div>
          <div style="width:1px;height:36px;background:var(--gray-200)"></div>
          <div style="text-align:center">
            <div style="font-size:11px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Ferramentas</div>
            <div style="font-family:'Poppins',sans-serif;font-size:18px;font-weight:800;color:#7c3aed">${fmt.currency(valorFerr)}</div>
          </div>
          <div style="width:1px;height:36px;background:var(--gray-200)"></div>
          <div style="text-align:center">
            <div style="font-size:11px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Total patrimônio</div>
            <div style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${fmt.currency(valorTotal)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- FILTROS -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Buscar por nome, marca ou tipo..." value="${filtro}"
          oninput="renderEstoque(this.value,'${catFiltro}')" />
      </div>
      <div class="estoque-tab-group">
        <button class="estoque-tab" onclick="renderEstoquePatrimonio()">📊 Patrimônio</button>
        <button class="estoque-tab ${catFiltro==='todos'?'active':''}" onclick="renderEstoque('${filtro}','todos')">Todos</button>
        <button class="estoque-tab ${catFiltro==='peca'?'active':''}" onclick="renderEstoque('${filtro}','peca')">⚙️ Peças</button>
        <button class="estoque-tab ${catFiltro==='ferramenta'?'active':''}" onclick="renderEstoque('${filtro}','ferramenta')">🔧 Ferramentas</button>
      </div>
    </div>

    <!-- LISTA -->
    <div class="card">
      ${lista.length ? `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Marca</th>
              <th>Aplicação</th>
              <th>Qtd</th>
              <th>Preço unit.</th>
              <th>Compra</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map(i => {
              const baixo = i.categoria === 'peca' && parseInt(i.quantidade||0) <= parseInt(i.estoqueMin||0) && parseInt(i.estoqueMin||0) > 0;
              const zeroed = i.categoria === 'peca' && parseInt(i.quantidade||0) === 0;
              return `<tr>
                <td><strong>${i.nome}</strong>${i.obs ? `<br><small style="color:var(--gray-400)">${i.obs}</small>` : ''}</td>
                <td>${i.categoria === 'peca'
                  ? '<span class="badge badge-blue">⚙️ Peça</span>'
                  : '<span class="badge badge-orange">🔧 Ferramenta</span>'}</td>
                <td>${i.tipo || '-'}</td>
                <td>${i.marca || '-'}</td>
                <td style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.aplicacao || '-'}</td>
                <td>${i.categoria === 'peca'
                  ? `<span class="badge ${zeroed ? 'badge-red' : baixo ? 'badge-yellow' : 'badge-green'}">${i.quantidade || 0}</span>`
                  : '-'}</td>
                <td>${i.preco ? fmt.currency(i.preco) : '-'}</td>
                <td>${i.dataCompra ? fmt.date(i.dataCompra) : '-'}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-outline btn-sm" onclick="formEstoque(${i.id})">✏️</button>
                  <button class="btn btn-outline btn-sm" style="margin-left:4px" onclick="deleteEstoque(${i.id})">🗑️</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>${catFiltro === 'peca' ? 'Nenhuma peça cadastrada' : catFiltro === 'ferramenta' ? 'Nenhuma ferramenta cadastrada' : 'Estoque vazio'}</p>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-outline" onclick="formEstoque(null,'ferramenta')">+ Ferramenta</button>
          <button class="btn btn-primary" onclick="formEstoque(null,'peca')">+ Peça</button>
        </div>
      </div>`}
    </div>`;
}

function formEstoque(id, catDefault) {
  const item = id ? Estoque.get(id) : { categoria: catDefault || 'peca' };
  const isPeca = (item.categoria || 'peca') === 'peca';

  openModal(id ? 'Editar item' : (isPeca ? 'Nova Peça' : 'Nova Ferramenta'), `
    <div class="form-grid">
      <div class="form-group full">
        <label>Categoria</label>
        <div style="display:flex;gap:8px">
          <label class="estoque-radio ${isPeca ? 'active' : ''}" id="rbPecaLabel">
            <input type="radio" name="estCat" value="peca" ${isPeca ? 'checked' : ''} onchange="estoqueToggleCat(this.value)" style="display:none" />
            ⚙️ Peça
          </label>
          <label class="estoque-radio ${!isPeca ? 'active' : ''}" id="rbFerrLabel">
            <input type="radio" name="estCat" value="ferramenta" ${!isPeca ? 'checked' : ''} onchange="estoqueToggleCat(this.value)" style="display:none" />
            🔧 Ferramenta
          </label>
        </div>
      </div>
      <div class="form-group full">
        <label>Nome *</label>
        <input id="estNome" type="text" value="${item.nome || ''}" placeholder="Ex: Filtro de óleo, Chave de impacto..." />
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <input id="estTipo" type="text" value="${item.tipo || ''}" placeholder="${isPeca ? 'Ex: Filtro, Correia, Pastilha...' : 'Ex: Elétrica, Manual, Pneumática...'}" />
      </div>
      <div class="form-group">
        <label>Marca</label>
        <input id="estMarca" type="text" value="${item.marca || ''}" placeholder="Ex: Bosch, NGK, Snap-on..." />
      </div>
      <div id="estAplicacaoGroup" class="form-group full" style="${isPeca ? '' : 'display:none'}">
        <label>Aplicação</label>
        <input id="estAplicacao" type="text" value="${item.aplicacao || ''}" placeholder="Ex: Motores 1.0 flex, Gol/Polo/Fox..." />
      </div>
      <div id="estQtdGroup" class="form-group" style="${isPeca ? '' : 'display:none'}">
        <label>Quantidade em estoque</label>
        <input id="estQtd" type="number" min="0" value="${item.quantidade || ''}" placeholder="0" />
      </div>
      <div id="estMinGroup" class="form-group" style="${isPeca ? '' : 'display:none'}">
        <label>Estoque mínimo</label>
        <input id="estMin" type="number" min="0" value="${item.estoqueMin || ''}" placeholder="Ex: 2" />
      </div>
      <div class="form-group">
        <label>${isPeca ? 'Preço unitário (R$)' : 'Valor (R$)'}</label>
        <input id="estPreco" type="number" step="0.01" min="0" value="${item.preco || ''}" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label>Data de compra</label>
        <input id="estDataCompra" type="date" value="${item.dataCompra || ''}" />
      </div>
      <div class="form-group full">
        <label>Observações</label>
        <textarea id="estObs" placeholder="Anotações adicionais...">${item.obs || ''}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveEstoque(${id || 'null'})">💾 Salvar</button>
    </div>`);
}

function estoqueToggleCat(val) {
  const isPeca = val === 'peca';
  document.getElementById('rbPecaLabel').classList.toggle('active', isPeca);
  document.getElementById('rbFerrLabel').classList.toggle('active', !isPeca);
  document.getElementById('estAplicacaoGroup').style.display = isPeca ? '' : 'none';
  document.getElementById('estQtdGroup').style.display = isPeca ? '' : 'none';
  document.getElementById('estMinGroup').style.display = isPeca ? '' : 'none';
  document.getElementById('estTipo').placeholder = isPeca ? 'Ex: Filtro, Correia, Pastilha...' : 'Ex: Elétrica, Manual, Pneumática...';
}

function saveEstoque(id) {
  const nome = document.getElementById('estNome').value.trim();
  if (!nome) { showToast('Nome é obrigatório', 'error'); return; }
  const cat = document.querySelector('input[name="estCat"]:checked').value;
  Estoque.save({
    id: id || undefined,
    nome,
    categoria:   cat,
    tipo:        document.getElementById('estTipo').value.trim(),
    marca:       document.getElementById('estMarca').value.trim(),
    aplicacao:   cat === 'peca' ? document.getElementById('estAplicacao').value.trim() : '',
    quantidade:  cat === 'peca' ? parseInt(document.getElementById('estQtd').value || 0) : null,
    estoqueMin:  cat === 'peca' ? parseInt(document.getElementById('estMin').value || 0) : null,
    preco:       parseFloat(document.getElementById('estPreco').value || 0),
    dataCompra:  document.getElementById('estDataCompra').value,
    obs:         document.getElementById('estObs').value.trim(),
  });
  closeModal();
  showToast('Item salvo!', 'success');
  renderEstoque('', 'todos');
}

function deleteEstoque(id) {
  confirm('Deseja excluir este item do estoque?', () => {
    Estoque.delete(id);
    showToast('Item excluído');
    renderEstoque('', 'todos');
  });
}

// ===== CONFIGURAÇÕES =====
function configuracoes() {
  const of = Oficina.get();

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Configurações da Oficina</div><div class="page-subtitle">Dados que aparecem nos orçamentos e mensagens</div></div>
    </div>

    <div class="card" style="max-width:720px">
      <div class="config-logo-section">
        <div class="config-logo-preview" id="logoPreview">
          ${of.logo
            ? `<img src="${of.logo}" alt="Logo" style="max-height:100px;max-width:220px;object-fit:contain" />`
            : `<div class="config-logo-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Sem logo</span></div>`}
        </div>
        <div class="config-logo-actions">
          <label class="btn btn-outline" style="cursor:pointer">
            📷 Carregar logo
            <input type="file" accept="image/*" style="display:none" onchange="configUploadLogo(this)" />
          </label>
          ${of.logo ? `<button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="configRemoverLogo()">🗑️ Remover</button>` : ''}
          <p style="font-size:12px;color:var(--gray-400);margin-top:6px">PNG, JPG ou SVG. Aparece no PDF do orçamento.</p>
        </div>
      </div>

      <div class="form-grid" style="margin-top:24px">
        <div class="form-group full">
          <label>Nome da oficina *</label>
          <input id="cfNome" type="text" value="${of.nome || ''}" placeholder="Ex: Oficina do João" />
        </div>
        <div class="form-group">
          <label>CPF / CNPJ</label>
          <input id="cfDoc" type="text" value="${of.documento || ''}" placeholder="00.000.000/0001-00" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input id="cfEmail" type="email" value="${of.email || ''}" placeholder="contato@oficina.com" />
        </div>
        <div class="form-group full">
          <label>Endereço</label>
          <input id="cfEnd" type="text" value="${of.endereco || ''}" placeholder="Rua, número, bairro, cidade — UF" />
        </div>
        <div class="form-group">
          <label>Telefone fixo</label>
          <input id="cfTel" type="text" value="${of.telefone || ''}" placeholder="(11) 3333-4444" />
        </div>
        <div class="form-group">
          <label>WhatsApp</label>
          <input id="cfWpp" type="text" value="${of.whatsapp || ''}" placeholder="(11) 99999-0000" />
        </div>
      </div>

      <div class="form-actions" style="margin-top:8px">
        <button class="btn btn-primary" onclick="configSalvar()">💾 Salvar configurações</button>
      </div>
    </div>`;
}

function configUploadLogo(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Imagem muito grande. Use até 2MB.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    const of = Oficina.get();
    Oficina.set({ ...of, logo: base64 });
    document.getElementById('logoPreview').innerHTML =
      `<img src="${base64}" alt="Logo" style="max-height:100px;max-width:220px;object-fit:contain" />`;
    showToast('Logo carregada!', 'success');
  };
  reader.readAsDataURL(file);
}

function configRemoverLogo() {
  const of = Oficina.get();
  delete of.logo;
  Oficina.set(of);
  configuracoes();
  showToast('Logo removida');
}

function configSalvar() {
  const nome = document.getElementById('cfNome').value.trim();
  if (!nome) { showToast('Nome da oficina é obrigatório', 'error'); return; }
  const of = Oficina.get();
  Oficina.set({
    ...of,
    nome,
    documento: document.getElementById('cfDoc').value.trim(),
    email:     document.getElementById('cfEmail').value.trim(),
    endereco:  document.getElementById('cfEnd').value.trim(),
    telefone:  document.getElementById('cfTel').value.trim(),
    whatsapp:  document.getElementById('cfWpp').value.trim(),
  });
  showToast('Configurações salvas!', 'success');
}

// ===== PLANOS =====
function planos() {
  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Planos do Chave 10</div>
        <div class="page-subtitle">Escolha o plano ideal para organizar sua oficina</div>
      </div>
    </div>

    <div class="planos-wrap">

      <!-- Card gratuito -->
      <div class="plano-card">
        <div class="plano-nome">Plano Gratuito</div>
        <div class="plano-preco-wrap">
          <span class="plano-preco">R$0</span>
          <span class="plano-periodo">/mês</span>
        </div>
        <p class="plano-desc">Para quem está começando e quer experimentar o sistema.</p>
        <ul class="plano-lista">
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Até 5 clientes</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Até 10 ordens de serviço</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Dashboard básico</li>
          <li class="plano-item-off"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Orçamentos via WhatsApp</li>
          <li class="plano-item-off"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Relatórios avançados</li>
          <li class="plano-item-off"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Suporte prioritário</li>
        </ul>
        <button class="btn btn-outline" style="width:100%;justify-content:center" disabled>Plano atual</button>
      </div>

      <!-- Card profissional — destaque -->
      <div class="plano-card plano-destaque">
        <div class="plano-selo">⭐ Mais escolhido</div>
        <div class="plano-nome">Plano Profissional</div>
        <div class="plano-preco-wrap">
          <span class="plano-preco">R$29</span>
          <span class="plano-periodo">/mês</span>
        </div>
        <div class="plano-urgencia">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Oferta exclusiva para os 10 primeiros clientes
        </div>
        <div class="plano-depois">Depois será R$49/mês</div>
        <p class="plano-sem-fidelidade">Sem fidelidade • Cancele quando quiser</p>
        <ul class="plano-lista">
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Clientes ilimitados</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Veículos ilimitados</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Ordens de serviço ilimitadas</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Orçamentos via WhatsApp</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Relatórios e dashboard completo</li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Suporte prioritário</li>
        </ul>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px;font-size:15px" onclick="window.open('https://wa.me/5516992915540?text=Ol%C3%A1%2C%20quero%20garantir%20o%20plano%20promocional%20de%20R%2429%20do%20Minha%20Oficina.','_blank')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
          Quero esse plano
        </button>
      </div>

    </div>

    <!-- Modal interesse -->
    <div class="modal-overlay" id="modalPlano" style="display:none">
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <h2>Quase lá 🚀</h2>
          <button class="modal-close" onclick="document.getElementById('modalPlano').style.display='none'">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;padding:32px 28px">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px">🚀</div>
          <p style="font-size:15px;color:var(--gray-700);line-height:1.7;margin-bottom:10px">Você está garantindo o valor promocional de <strong style="color:var(--accent)">R$29/mês</strong> como um dos primeiros clientes.</p>
          <p style="font-size:13px;color:var(--gray-400);line-height:1.7;margin-bottom:28px">Em breve entraremos em contato para ativar sua conta completa.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-outline" onclick="document.getElementById('modalPlano').style.display='none'">Confirmar interesse</button>
            <button class="btn btn-primary" onclick="window.open('https://wa.me/5516992915540?text=Ol%C3%A1%21+Tenho+interesse+no+Plano+Profissional+do+Chave+10+por+R%2429%2Fm%C3%AAs.','_blank')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
              Falar no WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function abrirModalPlano() {
  document.getElementById('modalPlano').style.display = 'flex';
}

// ===== LANDING PAGE ANIMATIONS =====

// Mockup screens content
const LP_SCREENS = [
  {
    title: 'Dashboard',
    html: `<div class="lp-mock-screen">
      <div class="lp-mock-cards">
        <div class="lp-mock-card orange"><div class="lp-mock-val">R$ 30.4k</div><div class="lp-mock-lbl">Faturamento</div></div>
        <div class="lp-mock-card blue"><div class="lp-mock-val">50</div><div class="lp-mock-lbl">Serviços</div></div>
        <div class="lp-mock-card green"><div class="lp-mock-val">R$ 608</div><div class="lp-mock-lbl">Ticket médio</div></div>
      </div>
      <div class="lp-mock-chart">
        <svg viewBox="0 0 280 70" style="width:100%;height:70px">
          <defs><linearGradient id="lg_lp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F97316" stop-opacity=".3"/><stop offset="100%" stop-color="#F97316" stop-opacity="0"/></linearGradient></defs>
          <polygon points="0,70 0,55 35,48 70,58 105,28 140,35 175,15 210,20 245,8 280,12 280,70" fill="url(#lg_lp)"/>
          <polyline points="0,55 35,48 70,58 105,28 140,35 175,15 210,20 245,8 280,12" fill="none" stroke="#F97316" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="lp-chart-line"/>
        </svg>
      </div>
      <div class="lp-mock-rows">
        <div class="lp-mock-row"><div class="lp-mock-row-dot"></div><div class="lp-mock-row-bar" style="width:85%"></div><div class="lp-mock-row-val">R$ 1.200</div></div>
        <div class="lp-mock-row"><div class="lp-mock-row-dot" style="background:#4ade80"></div><div class="lp-mock-row-bar" style="width:60%;background:rgba(74,222,128,.3)"></div><div class="lp-mock-row-val">R$ 860</div></div>
        <div class="lp-mock-row"><div class="lp-mock-row-dot" style="background:#F97316"></div><div class="lp-mock-row-bar" style="width:40%;background:rgba(249,115,22,.3)"></div><div class="lp-mock-row-val">R$ 580</div></div>
      </div>
    </div>`
  },
  {
    title: 'Ordens de Serviço',
    html: `<div class="lp-mock-screen">
      <div class="lp-mock-label">Ordens em andamento</div>
      <div class="lp-mock-os-row">
        <div class="lp-mock-os-num">#0047</div>
        <div class="lp-mock-os-info"><div class="lp-mock-os-name">João Silva — Onix 2021</div><div class="lp-mock-os-sub">Revisão 45.000 km</div></div>
        <div class="lp-mock-os-badge orange">Em andamento</div>
      </div>
      <div class="lp-mock-os-row">
        <div class="lp-mock-os-num">#0046</div>
        <div class="lp-mock-os-info"><div class="lp-mock-os-name">Maria Souza — Gol 2018</div><div class="lp-mock-os-sub">Troca de pastilhas</div></div>
        <div class="lp-mock-os-badge green">Finalizado</div>
      </div>
      <div class="lp-mock-os-row">
        <div class="lp-mock-os-num">#0045</div>
        <div class="lp-mock-os-info"><div class="lp-mock-os-name">Carlos Pereira — Strada</div><div class="lp-mock-os-sub">Suspensão dianteira</div></div>
        <div class="lp-mock-os-badge green">Finalizado</div>
      </div>
      <div class="lp-mock-os-row">
        <div class="lp-mock-os-num">#0044</div>
        <div class="lp-mock-os-info"><div class="lp-mock-os-name">Ana Lima — Corolla 2020</div><div class="lp-mock-os-sub">Troca de óleo 0W20</div></div>
        <div class="lp-mock-os-badge green">Finalizado</div>
      </div>
    </div>`
  },
  {
    title: 'Orçamentos',
    html: `<div class="lp-mock-screen">
      <div class="lp-mock-label">Orçamentos recentes</div>
      <div class="lp-mock-orc-row">
        <div><div class="lp-mock-orc-name">ORC-0012 · João Silva</div><div class="lp-mock-orc-status">Revisão completa</div></div>
        <div class="lp-mock-orc-val">R$ 800</div>
      </div>
      <div class="lp-mock-orc-row">
        <div><div class="lp-mock-orc-name">ORC-0011 · Fernanda Costa</div><div class="lp-mock-orc-status">Freios dianteiros</div></div>
        <div class="lp-mock-orc-val">R$ 740</div>
      </div>
      <div class="lp-mock-orc-row">
        <div><div class="lp-mock-orc-name">ORC-0010 · Marcos Oliveira</div><div class="lp-mock-orc-status">Suspensão + alinhamento</div></div>
        <div class="lp-mock-orc-val">R$ 1.100</div>
      </div>
      <div style="margin-top:12px;padding:8px 10px;background:rgba(249,115,22,.1);border-radius:6px;display:flex;align-items:center;gap:8px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
        <span style="font-size:10px;color:rgba(255,255,255,.5)">Enviar via WhatsApp</span>
      </div>
    </div>`
  },
  {
    title: 'Relatórios',
    html: `<div class="lp-mock-screen">
      <div class="lp-mock-label">Faturamento — Março 2026</div>
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:10px;color:rgba(255,255,255,.4)">Meta: R$ 30.000</span>
          <span style="font-size:10px;font-weight:700;color:#4ade80">101.3%</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,.08);border-radius:20px;overflow:hidden">
          <div style="height:100%;width:100%;background:linear-gradient(90deg,#F97316,#fbbf24);border-radius:20px"></div>
        </div>
      </div>
      <div class="lp-mock-rows">
        <div class="lp-mock-row"><div class="lp-mock-row-dot" style="background:#F97316"></div><div class="lp-mock-row-bar" style="width:100%;background:rgba(249,115,22,.3)"></div><div class="lp-mock-row-val">R$ 30.4k</div></div>
        <div class="lp-mock-row"><div class="lp-mock-row-dot" style="background:#60a5fa"></div><div class="lp-mock-row-bar" style="width:75%"></div><div class="lp-mock-row-val">50 OS</div></div>
        <div class="lp-mock-row"><div class="lp-mock-row-dot" style="background:#4ade80"></div><div class="lp-mock-row-bar" style="width:60%;background:rgba(74,222,128,.3)"></div><div class="lp-mock-row-val">15 cli.</div></div>
      </div>
    </div>`
  }
];

let _lpScreenIdx = 0;
let _lpScreenTimer = null;

function initLandingAnimations() {
  // Mockup carousel
  const body = document.getElementById('lpMockBody');
  const title = document.getElementById('lpMockTitle');
  if (body && title) {
    body.innerHTML = LP_SCREENS[0].html;
    title.textContent = LP_SCREENS[0].title;
    _lpScreenTimer = setInterval(() => {
      _lpScreenIdx = (_lpScreenIdx + 1) % LP_SCREENS.length;
      const s = LP_SCREENS[_lpScreenIdx];
      title.textContent = s.title;
      body.innerHTML = s.html;
    }, 3200);
  }



  // Scroll reveal (IntersectionObserver)
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.lp-reveal').forEach(el => observer.observe(el));

  // Parallax on scroll
  window.addEventListener('scroll', lpParallax, { passive: true });
}

function lpParallax() {
  const lp = document.getElementById('landingPage');
  if (!lp || lp.style.display === 'none') return;
  const y = window.scrollY;
  const orbs = document.querySelectorAll('.lp-orb-1, .lp-orb-2');
  orbs.forEach((orb, i) => {
    orb.style.transform = `translateY(${y * (i === 0 ? 0.08 : -0.05)}px)`;
  });
}

function stopLandingAnimations() {
  if (_lpScreenTimer) { clearInterval(_lpScreenTimer); _lpScreenTimer = null; }
  window.removeEventListener('scroll', lpParallax);
}

// ===== HELPER: resolve store (local síncrono ou API assíncrono) =====
// Uso: resolve(Clientes.all()).then(lista => ...)
function resolve(val) {
  return val instanceof Promise ? val : Promise.resolve(val);
}

// Invalida todos os caches ao navegar (garante dados frescos)
const _origNavigate = navigate;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();

  // Detecta rota /admin/dashboard para auto-login
  const isAdminRoute = window.location.pathname.includes('/admin/dashboard') ||
                       window.location.hash === '#admin/dashboard';
  if (isAdminRoute) {
    sessionStorage.setItem('of_auth', '1');
  }

  // Check auth — se já logado, pula landing e login direto pro app
  if (sessionStorage.getItem('of_auth') === '1') {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appShell').style.display = 'flex';
    navigate('dashboard');
    Notif.start();
    history.replaceState({ view: 'app', page: 'dashboard' }, '', '#app');
  } else {
    document.getElementById('appShell').style.display = 'none';
    history.replaceState({ view: 'landing' }, '', '#');
    // Inicia animações da landing
    requestAnimationFrame(initLandingAnimations);
  }

  // Login with Enter key
  document.getElementById('loginPass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('loginUser').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
  });

  // Navigation
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
    });
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Mobile menu
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  });

  // ===== POPSTATE — botão voltar/avançar do navegador =====
  window.addEventListener('popstate', (e) => {
    const state = e.state;
    if (!state) return;

    if (state.view === 'landing') {
      // Volta para landing — faz logout se estava no app
      if (sessionStorage.getItem('of_auth') === '1') {
        sessionStorage.removeItem('of_auth');
        document.getElementById('loginUser').value = '';
        document.getElementById('loginPass').value = '';
      }
      document.getElementById('appShell').style.display = 'none';
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('landingPage').style.display = '';
      requestAnimationFrame(initLandingAnimations);
      return;
    }

    if (state.view === 'login') {
      document.getElementById('appShell').style.display = 'none';
      document.getElementById('landingPage').style.display = 'none';
      document.getElementById('loginScreen').classList.remove('hidden');
      return;
    }

    if (state.view === 'app') {
      // Se não está autenticado, volta para landing
      if (sessionStorage.getItem('of_auth') !== '1') {
        document.getElementById('appShell').style.display = 'none';
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('landingPage').style.display = '';
        return;
      }
      document.getElementById('landingPage').style.display = 'none';
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('appShell').style.display = 'flex';
      if (state.page) {
        navigate._fromPop = true;
        navigate(state.page);
        navigate._fromPop = false;
      }
    }
  });
});
