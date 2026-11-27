import { useState, useEffect } from 'react';
import { api } from '../../api';

const SEGMENTOS = ['carro', 'moto', 'caminhao'];
const SEGMENTO_LABELS = { carro: '🚗 Carros', moto: '🏍️ Motos', caminhao: '🚚 Caminhões' };

const CATEGORIAS = ['Manutenção', 'Inspeção', 'Limpeza', 'Segurança', 'Outro'];

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
  const [toast, setToast] = useState({ msg: '', type: '' });
  
  // Form principal
  const [form, setForm] = useState({
    nome: '',
    categoria: 'Manutenção',
    tipo: 'veiculo', // 'veiculo' | 'servico'
    status_inicial: 'ativo', // 'ativo' | 'inativo'
    descricao: '',
    itens: []
  });

  // Para drag and drop
  const [dragSource, setDragSource] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Detecta mudanças de tamanho de janela
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setForm({
      nome: '',
      categoria: 'Manutenção',
      tipo: 'veiculo',
      status_inicial: 'ativo',
      descricao: '',
      itens: []
    });
    setEditando(null);
    setModal('form');
  }

  function abrirEditar(modelo) {
    setForm({
      nome: modelo.nome || '',
      categoria: modelo.categoria || 'Manutenção',
      tipo: modelo.tipo || 'veiculo',
      status_inicial: modelo.status_inicial || 'ativo',
      descricao: modelo.descricao || '',
      itens: Array.isArray(modelo.itens) ? JSON.parse(JSON.stringify(modelo.itens)) : []
    });
    setEditando(modelo);
    setModal('form');
  }

  function fecharModal() {
    setModal(null);
    setForm({ nome: '', categoria: 'Manutenção', tipo: 'veiculo', status_inicial: 'ativo', descricao: '', itens: [] });
    setEditando(null);
  }

  function adicionarItem() {
    setForm(f => ({
      ...f,
      itens: [...f.itens, { 
        id: Date.now(), 
        nome: '', 
        obrigatorio: true,
        ordem: (f.itens.length || 0) + 1
      }]
    }));
  }

  function removerItem(id) {
    setForm(f => ({
      ...f,
      itens: f.itens.filter(i => i.id !== id)
    }));
  }

  function atualizarItem(id, campo, valor) {
    setForm(f => ({
      ...f,
      itens: f.itens.map(i => i.id === id ? { ...i, [campo]: valor } : i)
    }));
  }

  function handleDragStart(id) {
    setDragSource(id);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(targetId) {
    if (!dragSource || dragSource === targetId) return;
    
    const sourceIdx = form.itens.findIndex(i => i.id === dragSource);
    const targetIdx = form.itens.findIndex(i => i.id === targetId);
    
    if (sourceIdx === -1 || targetIdx === -1) return;

    const novoItens = [...form.itens];
    [novoItens[sourceIdx], novoItens[targetIdx]] = [novoItens[targetIdx], novoItens[sourceIdx]];
    
    setForm(f => ({ ...f, itens: novoItens }));
    setDragSource(null);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return showToast('Nome é obrigatório', 'error');
    if (!form.itens.length) return showToast('Adicione pelo menos um item', 'error');
    if (form.itens.some(i => !i.nome.trim())) return showToast('Todos os itens devem ter nome', 'error');

    try {
      const payload = {
        segmento,
        nome: form.nome,
        categoria: form.categoria,
        tipo: form.tipo,
        status_inicial: form.status_inicial,
        descricao: form.descricao,
        itens: form.itens
      };

      if (editando) {
        await api.app.checklists.update(editando.id, payload);
        showToast('Checklist atualizado!');
      } else {
        await api.app.checklists.create(payload);
        showToast('Checklist criado!');
      }
      fecharModal();
      carregar();
    } catch (err) {
      showToast(err?.error || 'Erro ao salvar', 'error');
    }
  }

  async function deletar(modelo) {
    if (!window.confirm(`Deletar "${modelo.nome}"?`)) return;
    try {
      await api.app.checklists.remove(modelo.id);
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



      {/* Lista de Modelos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Carregando...</div>
      ) : modelos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          Nenhum checklist disponível
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {modelos.map(modelo => (
            <div key={modelo.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#1f2937' }}>
                    {modelo.nome}
                  </h3>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
                    <span>📁 {modelo.categoria || 'Sem categoria'}</span>
                    <span>•</span>
                    <span>{Array.isArray(modelo.itens) ? modelo.itens.length : 0} itens</span>
                  </div>
                  {modelo.descricao && (
                    <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{modelo.descricao}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => abrirEditar(modelo)}
                  >
                    ✎ Editar
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: '#dc2626', borderColor: '#fecaca' }}
                    onClick={() => deletar(modelo)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar com 2 colunas */}
      {modal === 'form' && (
        <div className="modal-overlay open" onClick={fecharModal}>
          <div 
            className="modal" 
            style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflow: 'auto' }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>📋</span>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                  {editando ? 'Editar Checklist' : 'Criar Checklist'}
                </h2>
              </div>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>

            <div className="modal-body" style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
              gap: 20, 
              padding: '20px' 
            }}>
              
              {/* COLUNA ESQUERDA: Itens */}
              <div style={{ order: isMobile ? 1 : 0 }}>
                {/* Nome e Categoria */}
                <div style={{ marginBottom: 20 }}>
                  <div className="form-group full">
                    <label>Nome do Checklist *</label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      placeholder="Ex: Inspeção Inicial"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Itens Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>☰</span> Itens do Checklist
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm"
                    onClick={adicionarItem}
                    style={{ fontSize: 12, padding: '6px 10px' }}
                  >
                    + Adicionar Item
                  </button>
                </div>

                {/* Lista de Itens */}
                <div style={{ background: '#f9fafb', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  {form.itens.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                      Nenhum item adicionado
                    </div>
                  ) : (
                    <div>
                      {form.itens.map((item, idx) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(item.id)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '12px 14px',
                            borderBottom: idx < form.itens.length - 1 ? '1px solid #e5e7eb' : 'none',
                            background: dragSource === item.id ? '#f0fdf4' : '#fff',
                            cursor: 'grab',
                            transition: 'all 0.2s'
                          }}
                        >
                          {/* Drag Handle */}
                          <span style={{ color: '#d1d5db', fontSize: 18, cursor: 'grab', flexShrink: 0 }}>⋮⋮</span>

                          {/* Checkbox (desabilitado, apenas visual) */}
                          <input type="checkbox" disabled style={{ flexShrink: 0, cursor: 'not-allowed' }} />

                          {/* Nome Item */}
                          <input
                            type="text"
                            value={item.nome}
                            onChange={e => atualizarItem(item.id, 'nome', e.target.value)}
                            placeholder="Nome do item"
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              border: '1px solid #d1d5db',
                              borderRadius: 4,
                              fontSize: 13
                            }}
                          />

                          {/* Obrigatório/Opcional */}
                          <select
                            value={item.obrigatorio ? 'obrigatorio' : 'opcional'}
                            onChange={e => atualizarItem(item.id, 'obrigatorio', e.target.value === 'obrigatorio')}
                            style={{
                              padding: '6px 10px',
                              border: '1px solid #d1d5db',
                              borderRadius: 4,
                              fontSize: 12,
                              background: '#fff',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <option value="obrigatorio">Obrigatório</option>
                            <option value="opcional">Opcional</option>
                          </select>

                          {/* Edit & Delete */}
                          <button
                            type="button"
                            onClick={() => removerItem(item.id)}
                            style={{
                              padding: '6px 8px',
                              border: 'none',
                              background: '#fee2e2',
                              color: '#dc2626',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 14,
                              fontWeight: 600,
                              flexShrink: 0
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#1e40af'
                }}>
                  💡 Você pode marcar os itens durante o atendimento e acompanhar o progresso do checklist.
                </div>
              </div>

              {/* COLUNA DIREITA: Configurações */}
              <div style={{ order: isMobile ? 2 : 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ⚙️ Configurações
                </div>

                {/* Categoria */}
                <div className="form-group full" style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13
                    }}
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    Tipo de Checklist
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { val: 'veiculo', label: '🚗 Veículo', icon: '🚗' },
                      { val: 'servico', label: '⚙️ Serviço', icon: '⚙️' }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, tipo: opt.val }))}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: form.tipo === opt.val ? '2px solid #F97316' : '1px solid #d1d5db',
                          background: form.tipo === opt.val ? '#fff7ed' : '#fff',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          color: form.tipo === opt.val ? '#F97316' : '#6b7280'
                        }}
                      >
                        {opt.icon} {opt.label.split(' ')[1]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Inicial */}
                <div className="form-group full" style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Status Inicial</label>
                  <select
                    value={form.status_inicial}
                    onChange={e => setForm(f => ({ ...f, status_inicial: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13
                    }}
                  >
                    <option value="ativo">🟢 Ativo</option>
                    <option value="inativo">🔴 Inativo</option>
                  </select>
                </div>

                {/* Descrição */}
                <div className="form-group full">
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Descrição (opcional)</label>
                  <textarea
                    value={form.descricao}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Adicione uma descrição..."
                    maxLength={500}
                    style={{
                      width: '100%',
                      minHeight: 80,
                      padding: '8px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 }}>
                    {form.descricao.length}/500
                  </div>
                </div>
              </div>
            </div>

            {/* Footer com botões */}
            <div className="form-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', padding: '14px 20px' }}>
              <button type="button" className="btn btn-outline" onClick={fecharModal}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={salvar} style={{ background: '#F97316', borderColor: '#F97316' }}>
                💾 Salvar Checklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
