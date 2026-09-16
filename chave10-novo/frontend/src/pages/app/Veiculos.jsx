import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useLocalPagination } from '../../hooks/usePagination';
import Pagination from '../../components/Pagination';
import KPICard from '../../components/KPICard';
import { useSegmento } from '../../hooks/useSegmento';

const EMPTY = { marca: '', modelo: '', ano: '', placa: '', km: '', cliente_id: '' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>{msg}</div>;
}

function fmt(v) {
  return 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
}

export default function AppVeiculos() {
  const t = useSegmento();
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
      showToast(`${t.marca}, ${t.modelo.toLowerCase()} e ${t.placa.toLowerCase()} são obrigatórios`, 'error'); return;
    }
    try {
      const payload = { ...form, placa: form.placa.toUpperCase(), cliente_id: form.cliente_id || null };
      if (editing) await api.app.veiculos.update(editing, payload);
      else await api.app.veiculos.create(payload);
      setModal(null);
      load();
      showToast(editing ? `${t.veiculo} atualizado!` : `${t.veiculo} salvo!`);
    } catch (err) {
      showToast(err.error || 'Erro ao salvar', 'error');
    }
  }

  async function remove(id) {
    if (!window.confirm(`Deseja excluir este ${t.veiculo.toLowerCase()}?`)) return;
    try {
      await api.app.veiculos.remove(id);
      load();
      showToast(`${t.veiculo} excluído`);
    } catch { showToast('Erro ao excluir', 'error'); }
  }

  function handleSearch(e) {
    setSearch(e.target.value);
  }

  const STATUS_LABEL = { em_andamento: 'Em andamento', finalizado: 'Finalizado' };
  const STATUS_CLASS = { em_andamento: 'badge-orange', finalizado: 'badge-green' };

  // Estatísticas dos veículos
  const veiculosVinculados = allVeiculos.filter(v => v.cliente_id).length;
  const veiculosComAno = allVeiculos.filter(v => v.ano).length;
  const veiculosComKm = allVeiculos.filter(v => v.km).length;
  const marcasUnicas = [...new Set(allVeiculos.map(v => v.marca).filter(Boolean))].length;

  return (
    <div>
      <div className="page-header" style={{marginBottom:24}}>
        <div>
          <div className="page-title">{t.veiculos}</div>
          <div className="page-subtitle">{totalItems} cadastrado(s){search && ` (${filteredVeiculos.length} encontrado(s))`}</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ {t.novoVeiculo}</button>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:20}}>
        <KPICard
          title={`Total de ${t.veiculos}`}
          value={allVeiculos.length}
          subvalue="Cadastrados"
          color="var(--brand)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h3l3 6v5a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1H6v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-5l3-6h3"/><rect x="5" y="6" width="14" height="4"/><circle cx="8.5" cy="18.5" r="1.5"/><circle cx="17.5" cy="18.5" r="1.5"/></svg>}
        />
        <KPICard
          title="Com Cliente"
          value={veiculosVinculados}
          subvalue={`${((veiculosVinculados/Math.max(allVeiculos.length,1))*100).toFixed(0)}% vinculados`}
          color="var(--success)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>}
        />
        <KPICard
          title={`${t.marca}s`}
          value={marcasUnicas}
          subvalue="Diferentes"
          color="#7c3aed"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>}
        />
        <KPICard
          title={`Com ${t.kmAbrev} Registrada`}
          value={veiculosComKm}
          subvalue={`${((veiculosComKm/Math.max(allVeiculos.length,1))*100).toFixed(0)}% do total`}
          color="var(--info)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder={`Buscar por ${t.marca.toLowerCase()}, ${t.modelo.toLowerCase()} ou ${t.placa.toLowerCase()}...`} value={search} onChange={handleSearch} />
        </div>
      </div>

      <div className="card">
        {veiculos.length ? (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>{t.veiculo}</th><th>{t.placa}</th><th>{t.ano}</th><th>{t.kmAbrev}</th><th>Proprietário</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {veiculos.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.marca} {v.modelo}</strong></td>
                      <td><span className="badge badge-gray">{v.placa || '—'}</span></td>
                      <td>{v.ano || '—'}</td>
                      <td>{v.km ? parseInt(v.km).toLocaleString('pt-BR') + ` ${t.kmUnit}` : '—'}</td>
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
            <p>{search ? `Nenhum ${t.veiculo.toLowerCase()} encontrado com esse termo` : `Nenhum ${t.veiculo.toLowerCase()} encontrado`}</p>
            <button className="btn btn-primary" onClick={openCreate}>Cadastrar primeiro {t.veiculo.toLowerCase()}</button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {modal === 'form' && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing ? t.editVeiculo : t.novoVeiculo}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>{t.marca} *</label>
                    <input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Ex: Chevrolet" required autoFocus />
                  </div>
                  <div className="form-group">
                    <label>{t.modelo} *</label>
                    <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: Onix" required />
                  </div>
                  <div className="form-group">
                    <label>{t.ano}</label>
                    <input value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} placeholder="Ex: 2022" />
                  </div>
                  <div className="form-group">
                    <label>{t.placa} *</label>
                    <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" style={{ textTransform: 'uppercase' }} required />
                  </div>
                  <div className="form-group">
                    <label>{t.km}</label>
                    <input type="number" value={form.km} onChange={e => setForm(f => ({ ...f, km: e.target.value }))} placeholder={t.kmPlaceholder} />
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
                  {o.pecas && <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t.pecas}: {o.pecas}</div>}
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
