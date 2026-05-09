import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useLocalPagination } from '../../hooks/usePagination';
import Pagination from '../../components/Pagination';

const EMPTY = { marca: '', modelo: '', ano: '', placa: '', km: '', cliente_id: '' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>{msg}</div>;
}

function fmt(v) {
  return 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
}

export default function AppVeiculos() {
  const [allVeiculos, setAllVeiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'form' | 'historico'
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [historico, setHistorico] = useState({ veiculo: null, ordens: [] });
  const [toast, setToast] = useState({ msg: '', type: '' });

  // Filtra veículos baseado na busca
  const filteredVeiculos = allVeiculos.filter(v => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      v.marca?.toLowerCase().includes(searchLower) ||
      v.modelo?.toLowerCase().includes(searchLower) ||
      v.placa?.toLowerCase().includes(searchLower)
    );
  });

  // Paginação local
  const {
    data: veiculos,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    goToPage
  } = useLocalPagination(filteredVeiculos, 10);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }

  async function load(q) {
    try {
      const data = await api.app.veiculos.list();
      setAllVeiculos(data);
    } catch { setAllVeiculos([]); }
  }

  useEffect(() => {
    api.app.clientes.list().then(setClientes).catch(()=>{});
    load();
  }, []);

  function openCreate() { setForm(EMPTY); setEditing(null); setModal('form'); }
  function openEdit(v) {
    setForm({
      marca: v.marca || '', modelo: v.modelo || '', ano: v.ano || '',
      placa: v.placa || '', km: v.km || '', cliente_id: v.cliente_id || ''
    });
    setEditing(v.id);
    setModal('form');
  }

  async function openHistorico(v) {
    try {
      const ordens = await api.app.os.list();
      const hist = ordens.filter(o => o.veiculo_id === v.id).sort((a,b) => b.id - a.id);
      setHistorico({ veiculo: v, ordens: hist });
      setModal('historico');
    } catch { showToast('Erro ao carregar histórico', 'error'); }
  }

  async function save(e) {
    e.preventDefault();
    if (!form.marca.trim() || !form.modelo.trim() || !form.placa.trim()) {
      showToast('Marca, modelo e placa são obrigatórios', 'error'); return;
    }
    try {
      const payload = { ...form, placa: form.placa.toUpperCase(), cliente_id: form.cliente_id || null };
      if (editing) await api.app.veiculos.update(editing, payload);
      else await api.app.veiculos.create(payload);
      setModal(null);
      load();
      showToast(editing ? 'Veículo atualizado!' : 'Veículo salvo!');
    } catch (err) {
      showToast(err.error || 'Erro ao salvar', 'error');
    }
  }

  async function remove(id) {
    if (!window.confirm('Deseja excluir este veículo?')) return;
    try {
      await api.app.veiculos.remove(id);
      load();
      showToast('Veículo excluído');
    } catch { showToast('Erro ao excluir', 'error'); }
  }

  function handleSearch(e) {
    setSearch(e.target.value);
  }

  const STATUS_LABEL = { em_andamento: 'Em andamento', finalizado: 'Finalizado' };
  const STATUS_CLASS = { em_andamento: 'badge-orange', finalizado: 'badge-green' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Veículos</div>
          <div className="page-subtitle">{totalItems} cadastrado(s){search && ` (${filteredVeiculos.length} encontrado(s))`}</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Novo Veículo</button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por marca, modelo ou placa..." value={search} onChange={handleSearch} />
        </div>
      </div>

      <div className="card">
        {veiculos.length ? (
          <>
            {/* Tabela — desktop */}
            <div className="table-wrapper desktop-table">
              <table>
                <thead>
                  <tr><th>Veículo</th><th>Placa</th><th>Ano</th><th>KM</th><th>Proprietário</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {veiculos.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.marca} {v.modelo}</strong></td>
                      <td><span className="badge badge-gray">{v.placa || '—'}</span></td>
                      <td>{v.ano || '—'}</td>
                      <td>{v.km ? parseInt(v.km).toLocaleString('pt-BR') + ' km' : '—'}</td>
                      <td>{v.cliente_nome || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openHistorico(v)}>📜 Histórico</button>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>✏️</button>
                          <button className="btn btn-outline btn-sm" onClick={() => remove(v.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — mobile */}
            <div className="mobile-card-list">
              {veiculos.map(v => (
                <div key={v.id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div className="mobile-card-avatar orange">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mobile-card-title">{v.marca} {v.modelo}</div>
                      <div className="mobile-card-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span className="veiculo-card-placa">{v.placa || '—'}</span>
                        {v.ano && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{v.ano}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mobile-card-body">
                    {v.cliente_nome && (
                      <div className="mobile-card-row">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        {v.cliente_nome}
                      </div>
                    )}
                    {v.km && (
                      <div className="mobile-card-row">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {parseInt(v.km).toLocaleString('pt-BR')} km
                      </div>
                    )}
                  </div>
                  <div className="mobile-card-footer">
                    <button className="btn btn-outline btn-sm" onClick={() => openHistorico(v)}>📜 Histórico</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)} style={{ flex: 'none', minWidth: 44 }}>✏️</button>
                    <button className="btn btn-outline btn-sm" onClick={() => remove(v.id)} style={{ flex: 'none', minWidth: 44 }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={goToPage}
            />
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <p>{search ? 'Nenhum veículo encontrado com esse termo' : 'Nenhum veículo encontrado'}</p>
            <button className="btn btn-primary" onClick={openCreate}>Cadastrar primeiro veículo</button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {modal === 'form' && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing ? 'Editar Veículo' : 'Novo Veículo'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Marca *</label>
                    <input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Ex: Chevrolet" required autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Modelo *</label>
                    <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: Onix" required />
                  </div>
                  <div className="form-group">
                    <label>Ano</label>
                    <input value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} placeholder="Ex: 2022" />
                  </div>
                  <div className="form-group">
                    <label>Placa *</label>
                    <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" style={{ textTransform: 'uppercase' }} required />
                  </div>
                  <div className="form-group">
                    <label>Quilometragem</label>
                    <input type="number" value={form.km} onChange={e => setForm(f => ({ ...f, km: e.target.value }))} placeholder="Ex: 45000" />
                  </div>
                  <div className="form-group">
                    <label>Cliente responsável</label>
                    <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                      <option value="">Selecionar cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">💾 Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {modal === 'historico' && historico.veiculo && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2>📜 Histórico — {historico.veiculo.marca} {historico.veiculo.modelo} ({historico.veiculo.placa})</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray-500)', fontSize: 13, marginBottom: 16 }}>
                Proprietário: <strong>{historico.veiculo.cliente_nome || 'Não informado'}</strong> · {historico.ordens.length} manutenção(ões)
              </p>
              {historico.ordens.length ? historico.ordens.map(o => (
                <div key={o.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>OS #{String(o.id).padStart(4,'0')}</span>
                    <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{o.data}</span>
                    <span className={`badge ${STATUS_CLASS[o.status]||'badge-gray'}`}>{STATUS_LABEL[o.status]||o.status}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>{o.descricao || o.problema || '—'}</div>
                  {o.servicos && <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>Serviços: {o.servicos}</div>}
                  {o.pecas && <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>Peças: {o.pecas}</div>}
                  <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--brand)' }}>
                    Total: {fmt((parseFloat(o.valor_mo||0) + parseFloat(o.valor_pecas||0)))}
                  </div>
                </div>
              )) : (
                <div className="empty-state"><div className="empty-icon">📜</div><p>Nenhuma manutenção registrada</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
