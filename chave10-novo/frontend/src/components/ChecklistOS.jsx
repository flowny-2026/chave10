import { useState, useEffect } from 'react';
import { api } from '../api';

export default function ChecklistOS({ osId, segmento }) {
  const [checklist, setChecklist] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [uploadando, setUploadando] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  };

  async function carregarChecklist() {
    setLoading(true);
    try {
      const data = await api.app.checklists.osGet(osId);
      setChecklist(data);

      if (segmento) {
        const mods = await api.app.checklists.modelos(segmento);
        setModelos(mods || []);
      }
    } catch (err) {
      console.error('Erro ao carregar checklist:', err);
      setChecklist({ itens: [], concluido: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarChecklist();
  }, [osId, segmento]);

  async function importarModelo(modelo) {
    if (!window.confirm(`Importar checklist "${modelo.nome}"?`)) return;
    
    try {
      const itens = Array.isArray(modelo.itens) 
        ? modelo.itens.map(i => ({ ...i, concluido: false, foto: null, observacao: '' }))
        : [];

      if (checklist?.id) {
        await api.app.checklists.osUpdate(checklist.id, { 
          itens,
          concluido: 0
        });
        setChecklist(prev => ({ ...prev, itens }));
      } else {
        const result = await api.app.checklists.osCreate({ 
          os_id: osId,
          modelo_id: modelo.id
        });
        setChecklist(result);
      }
      showToast('Checklist importado!');
    } catch (err) {
      showToast(err?.error || 'Erro ao importar', 'error');
    }
  }

  function toggleItem(idx) {
    const novoItens = [...(checklist?.itens || [])];
    novoItens[idx].concluido = !novoItens[idx].concluido;
    setChecklist(prev => ({ ...prev, itens: novoItens }));
  }

  function atualizarObservacao(idx, obs) {
    const novoItens = [...(checklist?.itens || [])];
    novoItens[idx].observacao = obs;
    setChecklist(prev => ({ ...prev, itens: novoItens }));
  }

  async function handleFotoUpload(idx, file) {
    if (!file) return;
    setUploadando(prev => ({ ...prev, [idx]: true }));
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const novoItens = [...(checklist?.itens || [])];
        novoItens[idx].foto = e.target.result;
        setChecklist(prev => ({ ...prev, itens: novoItens }));
        showToast('Foto adicionada!');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast('Erro ao enviar foto', 'error');
    } finally {
      setUploadando(prev => ({ ...prev, [idx]: false }));
    }
  }

  async function salvarChecklist() {
    if (!checklist?.itens?.length) {
      return showToast('Nenhum checklist para salvar', 'error');
    }

    try {
      if (checklist.id) {
        await api.app.checklists.osUpdate(checklist.id, {
          itens: checklist.itens,
          concluido: checklist.itens?.every(i => i.concluido) ? 1 : 0
        });
      } else {
        const result = await api.app.checklists.osCreate({
          os_id: osId,
          modelo_id: null
        });
        await api.app.checklists.osUpdate(result.id, {
          itens: checklist.itens,
          concluido: checklist.itens?.every(i => i.concluido) ? 1 : 0
        });
      }
      showToast('Checklist salvo!');
    } catch (err) {
      showToast(err?.error || 'Erro ao salvar', 'error');
    }
  }

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>;
  }

  const itens = checklist?.itens || [];
  const concluidos = itens.filter(i => i.concluido).length;

  return (
    <div>
      {toast.msg && (
        <div className={`toast show ${toast.type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      {/* Header com progresso */}
      <div style={{ background: '#f9fafb', padding: '14px 16px', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>📋 Checklist</h3>
          {itens.length > 0 && (
            <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
              {concluidos}/{itens.length} concluídos
            </span>
          )}
        </div>
        {itens.length > 0 && (
          <div style={{ background: '#e5e7eb', height: 6, borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                background: 'linear-gradient(90deg, #F97316, #fb923c)',
                height: '100%',
                width: `${(concluidos / itens.length) * 100}%`,
                transition: 'width 0.3s'
              }}
            />
          </div>
        )}
      </div>

      {/* Sem checklist */}
      {itens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, background: '#f9fafb', borderRadius: 8 }}>
          <p style={{ color: '#9ca3af', marginBottom: 16 }}>Nenhum checklist adicionado</p>
          {modelos.length > 0 ? (
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                Importar um modelo disponível:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {modelos.map(mod => (
                  <button
                    key={mod.id}
                    onClick={() => importarModelo(mod)}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--brand)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    {mod.nome}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                Nenhum modelo de checklist disponível para este segmento.
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
                Crie um modelo na página de Checklists primeiro.
              </p>
              <button
                onClick={() => {
                  const novoChecklist = { itens: [], concluido: 0 };
                  if (!checklist?.id) {
                    api.app.checklists.osCreate({ os_id: osId, modelo_id: null })
                      .then(result => setChecklist(result))
                      .catch(err => showToast(err?.error || 'Erro ao criar', 'error'));
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                + Criar checklist vazio
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Lista de itens */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {itens.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: item.concluido ? '#f0fdf4' : '#fff',
                  border: `1px solid ${item.concluido ? '#bbf7d0' : '#e5e7eb'}`,
                  borderRadius: 8,
                  padding: 12,
                  opacity: item.concluido ? 0.8 : 1
                }}
              >
                {/* Checkbox + Nome */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={item.concluido || false}
                    onChange={() => toggleItem(idx)}
                    style={{
                      width: 20,
                      height: 20,
                      cursor: 'pointer',
                      accentColor: '#16a34a'
                    }}
                  />
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: item.concluido ? 'line-through' : 'none',
                    color: item.concluido ? '#6b7280' : '#1f2937'
                  }}>
                    {item.nome}
                  </span>
                </div>

                {/* Observação */}
                <textarea
                  value={item.observacao || ''}
                  onChange={(e) => atualizarObservacao(idx, e.target.value)}
                  placeholder="Adicione observações..."
                  style={{
                    width: '100%',
                    minHeight: 50,
                    padding: 8,
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    marginBottom: 10,
                    resize: 'vertical'
                  }}
                />

                {/* Upload de foto */}
                <div style={{ marginBottom: 10 }}>
                  {item.foto ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={item.foto}
                        alt={item.nome}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 180,
                          borderRadius: 6,
                          border: '2px solid #16a34a'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const novoItens = [...itens];
                          novoItens[idx].foto = null;
                          setChecklist(prev => ({ ...prev, itens: novoItens }));
                        }}
                        style={{
                          position: 'absolute',
                          top: -10,
                          right: -10,
                          background: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 28,
                          height: 28,
                          cursor: 'pointer',
                          fontSize: 16,
                          fontWeight: 700
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'block',
                      padding: 10,
                      border: '2px dashed #d1d5db',
                      borderRadius: 6,
                      textAlign: 'center',
                      cursor: uploadando[idx] ? 'default' : 'pointer',
                      background: uploadando[idx] ? '#f9fafb' : '#fff',
                      opacity: uploadando[idx] ? 0.6 : 1
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFotoUpload(idx, e.target.files?.[0])}
                        disabled={uploadando[idx]}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: 13, color: '#6b7280' }}>
                        {uploadando[idx] ? 'Enviando...' : '📸 Clique para adicionar foto'}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botão salvar */}
          <button
            onClick={salvarChecklist}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            💾 Salvar Checklist
          </button>
        </div>
      )}
    </div>
  );
}
