// ===== API CLIENT — Chave 10 =====
// Camada de comunicação com o backend Node.js
// Substitui o localStorage quando o backend está disponível

const API_URL = 'http://localhost:3001/api';

const apiClient = {
  // Token JWT salvo na sessão
  getToken() { return sessionStorage.getItem('of_api_token'); },
  setToken(t) { sessionStorage.setItem('of_api_token', t); },
  clearToken() { sessionStorage.removeItem('of_api_token'); },

  async req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(API_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      // Token expirado — força logout
      this.clearToken();
      sessionStorage.removeItem('of_auth');
      window.location.reload();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data;
    return data;
  },

  get(path)         { return this.req('GET', path); },
  post(path, body)  { return this.req('POST', path, body); },
  put(path, body)   { return this.req('PUT', path, body); },
  patch(path, body) { return this.req('PATCH', path, body); },
  del(path)         { return this.req('DELETE', path); },

  // ── AUTH ──────────────────────────────────────────────────
  async login(email, senha) {
    const data = await this.post('/auth/login', { email, senha });
    if (data.token) this.setToken(data.token);
    return data;
  },

  // ── CLIENTES ──────────────────────────────────────────────
  clientes: {
    all(q)      { return apiClient.get('/app/clientes' + (q ? '?q=' + encodeURIComponent(q) : '')); },
    save(data)  { return data.id ? apiClient.put('/app/clientes/' + data.id, data) : apiClient.post('/app/clientes', data); },
    delete(id)  { return apiClient.del('/app/clientes/' + id); },
  },

  // ── VEÍCULOS ──────────────────────────────────────────────
  veiculos: {
    all(clienteId) { return apiClient.get('/app/veiculos' + (clienteId ? '?cliente_id=' + clienteId : '')); },
    save(data)     { return data.id ? apiClient.put('/app/veiculos/' + data.id, data) : apiClient.post('/app/veiculos', data); },
    delete(id)     { return apiClient.del('/app/veiculos/' + id); },
  },

  // ── ORDENS DE SERVIÇO ─────────────────────────────────────
  os: {
    all(status)  { return apiClient.get('/app/os' + (status ? '?status=' + status : '')); },
    save(data)   { return data.id ? apiClient.put('/app/os/' + data.id, data) : apiClient.post('/app/os', data); },
    status(id,s) { return apiClient.patch('/app/os/' + id + '/status', { status: s }); },
    delete(id)   { return apiClient.del('/app/os/' + id); },
  },

  // ── LEMBRETES ─────────────────────────────────────────────
  lembretes: {
    all()       { return apiClient.get('/app/lembretes'); },
    save(data)  { return data.id ? apiClient.put('/app/lembretes/' + data.id, data) : apiClient.post('/app/lembretes', data); },
    delete(id)  { return apiClient.del('/app/lembretes/' + id); },
  },

  // ── ESTOQUE ───────────────────────────────────────────────
  estoque: {
    all(cat)    { return apiClient.get('/app/estoque' + (cat ? '?categoria=' + cat : '')); },
    save(data)  { return data.id ? apiClient.put('/app/estoque/' + data.id, data) : apiClient.post('/app/estoque', data); },
    delete(id)  { return apiClient.del('/app/estoque/' + id); },
  },

  // ── DESPESAS ──────────────────────────────────────────────
  despesas: {
    all(inicio, fim) {
      let q = '';
      if (inicio) q += '?inicio=' + inicio;
      if (fim)    q += (q ? '&' : '?') + 'fim=' + fim;
      return apiClient.get('/app/despesas' + q);
    },
    save(data)  { return data.id ? apiClient.put('/app/despesas/' + data.id, data) : apiClient.post('/app/despesas', data); },
    delete(id)  { return apiClient.del('/app/despesas/' + id); },
  },

  // ── ORÇAMENTOS ────────────────────────────────────────────
  orcamentos: {
    all()       { return apiClient.get('/app/orcamentos'); },
    save(data)  { return data.id ? apiClient.put('/app/orcamentos/' + data.id, data) : apiClient.post('/app/orcamentos', data); },
    delete(id)  { return apiClient.del('/app/orcamentos/' + id); },
  },

  // ── AGENDA ────────────────────────────────────────────────
  agenda: {
    all(data)   { return apiClient.get('/app/agenda' + (data ? '?data=' + data : '')); },
    save(data)  { return apiClient.post('/app/agenda', data); },
    delete(id)  { return apiClient.del('/app/agenda/' + id); },
  },

  // ── DASHBOARD ─────────────────────────────────────────────
  dashboard() { return this.get('/app/dashboard'); },
};
