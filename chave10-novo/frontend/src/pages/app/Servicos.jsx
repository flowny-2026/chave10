import { useState, useEffect } from 'react';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
};

const IcoEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
const IcoTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;

export default function Servicos() {
  const [servicos, setServicos] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nome: '', valor: '' });
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [search, setSearch] = useState('');

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }

  async function load() {
    try {
      const data = await api.app.servicos.list();
      setServicos(data || []);
    } catch (err) {
      showToast(err?.error || 'Erro ao carregar serviços', 'error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ nome: '', valor: '' });
    setEditing(null);
    setModal('form');
  }

  function openEdit(svc) {
    setForm({ nome: svc.nome, valor: String(svc.valor) });
    setEditing(svc.id);
    setModal('form');
  }

  async function save() {
    const nome = (form.nome || '').trim();
    const valor = parseFloat(form.valor) || 0;

    if (!nome) {
      showToast('Nome do serviço é obrigatório', 'error');
      return;
    }

    if (valor <= 0) {
      showToast('Valor deve ser maior que zero', 'error');
      return;
    }

    try {
      if (editing) {
        await api.app.servicos.update(editing, { nome, valor });
        showToast('Serviço atualizado!');
      } else {
        await api.app.servicos.create({ nome, valor });
        showToast('Serviço criado!');
      }
      setModal(null);
      load();
    } catch (err) {
      showToast(err?.error || 'Erro ao salvar serviço', 'error');
    }
  }

  async function remove(id) {
    if (!window.confirm('Deseja excluir este serviço?')) return;
    try {
      await api.app.servicos.remove(id);
      showToast('Serviço excluído!');
      load();
    } catch (err) {
      showToast(err?.error || 'Erro ao excluir serviço', 'error');
    }
  }

  const listaFiltrada = servicos.filter(s =>
    (s.nome || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1>📋 Serviços</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Novo Serviço
        </button>
      </div>

      {toast.msg && (
        <div className={`toast ${toast.type}`} style={{ marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}

      <div className="card">
        <input
          type="text"
          placeholder="Buscar serviço..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid var(--gray-300)',
            marginBottom: 16,
            width: '100%',
            fontSize: 14,
          }}
        />

        {listaFiltrada.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
            {search ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado ainda'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, fontSize: 13, color: 'var(--gray-600)' }}>Serviço</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, fontSize: 13, color: 'var(--gray-600)' }}>Valor padrão</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, fontSize: 13, color: 'var(--gray-600)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((svc, idx) => (
                  <tr key={svc.id} style={{ borderBottom: '1px solid var(--gray-100)', background: idx % 2 === 0 ? 'transparent' : 'var(--gray-50)' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14 }}>{svc.nome}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, textAlign: 'right', fontWeight: 600, color: 'var(--brand)' }}>{fmt.currency(svc.valor)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openEdit(svc)}
                        title="Editar"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                      >
                        <IcoEdit /> Editar
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => remove(svc.id)}
                        title="Excluir"
                        style={{ padding: '6px 12px', fontSize: 13, color: 'var(--danger)' }}
                      >
                        <IcoTrash /> Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal === 'form' && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>{editing ? '✏️ Editar Serviço' : '📋 Novo Serviço'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={e => { e.preventDefault(); save(); }}>
                <div className="form-group">
                  <label>Nome do serviço *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Troca de óleo"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    💾 {editing ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
