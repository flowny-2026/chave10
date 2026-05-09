import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useLocalPagination } from '../../hooks/usePagination';
import Pagination from '../../components/Pagination';
import { maskPhone } from '../../utils/validation';

const EMPTY = { nome: '', telefone: '', email: '', obs: '', endereco: '' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>{msg}</div>;
}

export default function AppClientes() {
  const [allClientes, setAllClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: '' });

  // Filtra clientes baseado na busca
  const filteredClientes = allClientes.filter(c => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(searchLower) ||
      c.telefone?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower)
    );
  });

  // Paginação local
  const {
    data: clientes,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    goToPage
  } = useLocalPagination(filteredClientes, 10);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }

  async function load(q) {
    try {
      const data = await api.app.clientes.list(q);
      setAllClientes(data);
    } catch { setAllClientes([]); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(c) {
    setForm({ nome: c.nome || '', telefone: c.telefone || '', email: c.email || '', obs: c.obs || '', endereco: c.endereco || '' });
    setEditing(c.id);
    setModal(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.nome.trim()) { showToast('Nome é obrigatório', 'error'); return; }
    try {
      if (editing) await api.app.clientes.update(editing, form);
      else await api.app.clientes.create(form);
      setModal(false);
      load();
      showToast(editing ? 'Cliente atualizado!' : 'Cliente salvo com sucesso!');
    } catch (err) {
      showToast(err.error || 'Erro ao salvar', 'error');
    }
  }

  async function remove(id) {
    if (!window.confirm('Deseja excluir este cliente?')) return;
    try {
      await api.app.clientes.remove(id);
      load();
      showToast('Cliente excluído');
    } catch { showToast('Erro ao excluir', 'error'); }
  }

  function handleSearch(e) {
    setSearch(e.target.value);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-subtitle">{totalItems} cadastrado(s){search && ` (${filteredClientes.length} encontrado(s))`}</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Novo Cliente</button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por nome ou telefone..." value={search} onChange={handleSearch} />
        </div>
      </div>

      <div className="card">
        {clientes.length ? (
          <>
            {/* Tabela — desktop */}
            <div className="table-wrapper desktop-table">
              <table>
                <thead>
                  <tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Veículos</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.nome}</strong></td>
                      <td>{c.telefone || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td><span className="badge badge-blue">{c.total_veiculos || 0} veículo(s)</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>✏️ Editar</button>
                          <button className="btn btn-outline btn-sm" onClick={() => remove(c.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — mobile */}
            <div className="mobile-card-list">
              {clientes.map(c => (
                <div key={c.id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div className="mobile-card-avatar">
                      {c.nome?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mobile-card-title">{c.nome}</div>
                      <div className="mobile-card-sub">
                        <span className="badge badge-blue" style={{ fontSize: 11 }}>{c.total_veiculos || 0} veículo(s)</span>
                      </div>
                    </div>
                  </div>
                  <div className="mobile-card-body">
                    {c.telefone && (
                      <div className="mobile-card-row">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {c.telefone}
                      </div>
                    )}
                    {c.email && (
                      <div className="mobile-card-row">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="mobile-card-footer">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>✏️ Editar</button>
                    <button className="btn btn-outline btn-sm" onClick={() => remove(c.id)} style={{ flex: 'none', minWidth: 44 }}>🗑️</button>
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
            <div className="empty-icon">👤</div>
            <p>{search ? 'Nenhum cliente encontrado com esse termo' : 'Nenhum cliente encontrado'}</p>
            <button className="btn btn-primary" onClick={openCreate}>Cadastrar primeiro cliente</button>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Nome *</label>
                    <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" required autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: maskPhone(e.target.value) }))} placeholder="(11) 99999-0000" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
                  </div>
                  <div className="form-group full">
                    <label>Endereço</label>
                    <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade" />
                  </div>
                  <div className="form-group full">
                    <label>Observações</label>
                    <textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} placeholder="Anotações sobre o cliente..." />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
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
