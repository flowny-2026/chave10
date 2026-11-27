import { useState, useEffect } from 'react';
import { api } from '../../api';

const SEGMENTOS = ['carro', 'moto', 'caminhao'];
const SEGMENTO_LABELS = { carro: '🚗 Carros', moto: '🏍️ Motos', caminhao: '🚚 Caminhões' };

const ITENS_PREDEFINIDOS = {
  moto: [
    { nome: 'Pneus', ordem: 1 },
    { nome: 'Corrente', ordem: 2 },
    { nome: 'Óleo', ordem: 3 },
    { nome: 'Freios', ordem: 4 },
    { nome: 'Banco da moto', ordem: 5 },
    { nome: 'Tanque de combustível', ordem: 6 },
  ],
  carro: [
    { nome: 'Pneus', ordem: 1 },
    { nome: 'Óleo', ordem: 2 },
    { nome: 'Bateria', ordem: 3 },
    { nome: 'Freios', ordem: 4 },
    { nome: 'Vidros', ordem: 5 },
    { nome: 'Iluminação', ordem: 6 },
  ],
  caminhao: [
    { nome: 'Pneus', ordem: 1 },
    { nome: 'Óleo', ordem: 2 },
    { nome: 'Freios', ordem: 3 },
    { nome: 'Suspensão', ordem: 4 },
    { nome: 'Iluminação', ordem: 5 },
    { nome: 'Carroceria', ordem: 6 },
  ],
};

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {msg}
    </div>
  );
}

export default function Checklists() {
  const [segmento, setSegmento] = useState('moto');
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | 'criar' | 'editar'
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', itens: [] });
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [saving, setSaving] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  };

  async function carregar() {
    setLoading(true);
    try {
      const data = await api.app.checklists.modelos(segmento);
      setModelos(data || []);
    } catch (err) {
      showToast(err?.error || 'Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [segmento]);

  function abrirCriar() {
    setForm({ nome: '', itens: ITENS_PREDEFINIDOS[segmento] || [] });
    setEditando(null);
    setModal('criar');
  }

  function abrirEditar(modelo) {
    setForm({ nome: modelo.nome, itens: Array.isArray(modelo.itens) ? modelo.itens : [] });
    setEditando(modelo);
    setModal('editar');
  }

  function fecharModal() {
    setModal(null);
    setForm({ nome: '', itens: [] });
    setEditando(null);
  }

  function adicionarItem() {
    setForm(f => ({
      ...f,
      itens: [...f.itens, { nome: '', ordem: (f.itens.length || 0) + 1 }]
    }));
  }

  function removerItem(idx) {
    setForm(f => ({
      ...f,
      itens: f.itens.filter((_, i) => i !== idx)
    }));
  }

  function atualizarItem(idx, campo, valor) {
    setForm(f => ({
      ...f,
      itens: f.itens.map((item, i) => i === idx ? { ...item, [campo]: valor } : item)
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return showToast('Nome é obrigatório', 'error');
    if (!form.itens.length) return showToast('Adicione pelo menos um item', 'error');
    if (form.itens.some(i => !i.nome.trim())) return showToast('Todos os itens devem ter nome', 'error');

    setSaving(true);
    try {
      if (modal === 'criar') {
        await api.post('/app/checklists/modelos', {
          segmento,
          nome: form.nome,
          itens: form.itens
        });
        showToast('Checklist criado!');
      } else {
        await api.put(`/app/checklists/modelos/${editando.id}`, {
          nome: form.nome,
          itens: form.itens
        });
        showToast('Checklist atualizado!');
      }
      fecharModal();
      carregar();
    } catch (err) {
      showToast(err?.error || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deletar(modelo) {
    if (!window.confirm(`Deletar "${modelo.nome}"?`)) return;
    try {
      await api.delete(`/app/checklists/modelos/${modelo.id}`);
      showToast('Checklist deletado!');
      carregar();
    } catch (err) {
      showToast(err?.error || 'Erro ao deletar', 'error');
    }
  }

  return (
    <div className="page-container">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)' }}>📋 Checklists</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>
          + Novo Checklist
        </button>
      </div>

      {/* Seletor de Segmento */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {SEGMENTOS.map(seg => (
          <button
            key={seg}
            onClick={() => setSegmento(seg)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: segmento === seg ? 'var(--brand)' : '#e5e7eb',
              color: segmento === seg ? '#fff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {SEGMENTO_LABELS[seg]}
          </button>
        ))}
      </div>

      {/* Lista de Modelos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Carregando...</div>
      ) : modelos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          Nenhum checklist para {SEGMENTO_LABELS[segmento]}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {modelos.map(modelo => (
            <div key={modelo.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{modelo.nome}</h3>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>
                    {Array.isArray(modelo.itens) ? modelo.itens.length : 0} itens
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => abrirEditar(modelo)}
                  >
                    ✎ Editar
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => deletar(modelo)}
                  >
                    🗑️ Deletar
                  </button>
                </div>
              </div>
              {Array.isArray(modelo.itens) && modelo.itens.length > 0 && (
                <ul style={{ marginTop: 12, fontSize: 13, color: '#6b7280', paddingLeft: 24 }}>
                  {modelo.itens.slice(0, 5).map((item, i) => (
                    <li key={i}>{item.nome}</li>
                  ))}
                  {modelo.itens.length > 5 && <li>... +{modelo.itens.length - 5} mais</li>}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {modal && (
        <div className="modal-overlay open" onClick={fecharModal}>
          <div className="modal" style={{ maxWidth: 600, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--gray-900)' }}>
                {modal === 'criar' ? '+ Novo Checklist' : 'Editar Checklist'}
              </h2>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>

            <form onSubmit={salvar} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Nome do Checklist *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Inspeção Inicial"
                  maxLength={100}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ marginBottom: 0, fontWeight: 700 }}>Itens do Checklist *</label>
                  <button type="button" className="btn btn-outline btn-sm" onClick={adicionarItem}>
                    + Adicionar Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.itens.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <input
                        type="text"
                        value={item.nome}
                        onChange={e => atualizarItem(idx, 'nome', e.target.value)}
                        placeholder="Nome do item"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => removerItem(idx)}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          background: '#fee2e2',
                          color: '#dc2626',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions" style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={fecharModal} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Salvando...' : 'Salvar Checklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
