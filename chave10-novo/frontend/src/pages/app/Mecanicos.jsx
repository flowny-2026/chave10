çççççççççççççççççççççççççççççççççççççççççççççççççççççççççççççççççççpimport { useEffect, useState, useCallback } from 'react';
import { api } from '../../api';

const fmt = {
  pct: v => parseFloat(v || 0).toFixed(1) + '%',
};

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {msg}
    </div>
  );
}

const FORM_EMPTY = {
  nome: '', email: '', senha: '', telefone: '',
  recebe_servicos: true, recebe_pecas: false,
  pct_servicos: '0', pct_pecas: '0',
};

export default function Mecanicos() {
  const [mecanicos, setMecanicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [modal, setModal] = useState(null); // null | 'criar' | 'editar'
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDesativar, setConfirmDesativar] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState('todos'); // 'todos' | 'ativos' | 'inativos'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/app/mecanicos');
      setMecanicos(data);
    } catch (e) {
      showToast(e?.error || 'Erro ao carregar mecânicos', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirCriar() {
    setForm(FORM_EMPTY);
    setMostrarSenha(false);
    setEditando(null);
    setModal('criar');
  }

  function abrirEditar(mec) {
    setForm({
      nome: mec.nome || '',
      email: mec.email || '',
      senha: '',
      telefone: mec.telefone || '',
      recebe_servicos: !!mec.recebe_servicos,
      recebe_pecas: !!mec.recebe_pecas,
      pct_servicos: String(parseFloat(mec.pct_servicos || 0)),
      pct_pecas: String(parseFloat(mec.pct_pecas || 0)),
    });
    setMostrarSenha(false);
    setEditando(mec);
    setModal('editar');
  }

  function fecharModal() {
    setModal(null);
    setEditando(null);
    setForm(FORM_EMPTY);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return showToast('Nome é obrigatório', 'error');
    if (!form.email.trim()) return showToast('E-mail é obrigatório', 'error');
    if (modal === 'criar' && (!form.senha || form.senha.length < 6)) {
      return showToast('Senha deve ter no mínimo 6 caracteres', 'error');
    }
    if (modal === 'editar' && form.senha && form.senha.length < 6) {
      return showToast('Nova senha deve ter no mínimo 6 caracteres', 'error');
    }
    const pctSvc = parseFloat(form.pct_servicos || 0);
    const pctPec = parseFloat(form.pct_pecas || 0);
    if (pctSvc < 0 || pctSvc > 100 || pctPec < 0 || pctPec > 100) {
      return showToast('Percentuais devem ser entre 0 e 100', 'error');
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        telefone: form.telefone.trim() || null,
        recebe_servicos: form.recebe_servicos,
        recebe_pecas: form.recebe_pecas,
        pct_servicos: pctSvc,
        pct_pecas: pctPec,
      };
      if (form.senha) payload.senha = form.senha;

      if (modal === 'criar') {
        if (!form.senha) return showToast('Senha obrigatória', 'error');
        payload.senha = form.senha;
        await api.post('/app/mecanicos', payload);
        showToast('Mecânico cadastrado com sucesso!');
      } else {
        await api.put('/app/mecanicos/' + editando.id, payload);
        showToast('Mecânico atualizado com sucesso!');
      }
      fecharModal();
      carregar();
    } catch (e) {
      showToast(e?.error || 'Erro ao salvar mecânico', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(mec) {
    try {
      await api.patch('/app/mecanicos/' + mec.id + '/status', { ativo: !mec.ativo });
      showToast(mec.ativo ? 'Mecânico desativado' : 'Mecânico ativado');
      setConfirmDesativar(null);
      carregar();
    } catch (e) {
      showToast(e?.error || 'Erro ao alterar status', 'error');
    }
  }

  const mecsFiltrados = mecanicos.filter(m => {
    if (filtroAtivo === 'ativos') return m.ativo;
    if (filtroAtivo === 'inativos') return !m.ativo;
    return true;
  });

  return (
    <div className="page-container">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🔧 Mecânicos</h1>
          <p className="page-subtitle">Gerencie os mecânicos da sua oficina e suas comissões</p>
        </div>
        <button className="btn-primary" onClick={abrirCriar}>
          + Novo Mecânico
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['todos', 'ativos', 'inativos'].map(f => (
          <button
            key={f}
            onClick={() => setFiltroAtivo(f)}
            style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: filtroAtivo === f ? 'none' : '1.5px solid var(--gray-200)',
              background: filtroAtivo === f ? 'var(--primary)' : '#fff',
              color: filtroAtivo === f ? '#fff' : 'var(--gray-600)',
              cursor: 'pointer',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--gray-400)', alignSelf: 'center' }}>
          {mecsFiltrados.length} mecânico{mecsFiltrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Carregando mecânicos...</span>
        </div>
      ) : mecsFiltrados.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔧</div>
          <h3>{mecanicos.length === 0 ? 'Nenhum mecânico cadastrado' : 'Nenhum resultado'}</h3>
          <p>{mecanicos.length === 0 ? 'Clique em "Novo Mecânico" para começar.' : 'Tente outro filtro.'}</p>
        </div>
      ) : (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {mecsFiltrados.map(mec => (
            <div
              key={mec.id}
              className="card"
              style={{ opacity: mec.ativo ? 1 : 0.65, position: 'relative' }}
            >
              {/* Badge status */}
              <span style={{
                position: 'absolute', top: 14, right: 14,
                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: mec.ativo ? '#dcfce7' : '#fee2e2',
                color: mec.ativo ? '#16a34a' : '#dc2626',
              }}>
                {mec.ativo ? 'Ativo' : 'Inativo'}
              </span>

              {/* Avatar e nome */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #d97706))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {mec.nome?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mec.nome}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mec.email}
                  </div>
                </div>
              </div>

              {/* Telefone */}
              {mec.telefone && (
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                  📞 {mec.telefone}
                </div>
              )}

              {/* Comissões */}
              <div style={{
                background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px',
                marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
                    Serviços
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: mec.recebe_servicos ? 'var(--primary)' : 'var(--gray-300)' }}>
                    {mec.recebe_servicos ? fmt.pct(mec.pct_servicos) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
                    Peças
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: mec.recebe_pecas ? 'var(--primary)' : 'var(--gray-300)' }}>
                    {mec.recebe_pecas ? fmt.pct(mec.pct_pecas) : '—'}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: 13, padding: '8px 0' }}
                  onClick={() => abrirEditar(mec)}
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => setConfirmDesativar(mec)}
                  style={{
                    flex: 1, fontSize: 13, padding: '8px 0', borderRadius: 8,
                    border: mec.ativo ? '1.5px solid #fee2e2' : '1.5px solid #dcfce7',
                    background: mec.ativo ? '#fff5f5' : '#f0fdf4',
                    color: mec.ativo ? '#dc2626' : '#16a34a',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {mec.ativo ? '🚫 Desativar' : '✅ Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" style={{ maxWidth: 520, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modal === 'criar' ? '+ Novo Mecânico' : '✏️ Editar Mecânico'}
              </h2>
              <button className="modal-close" onClick={fecharModal}>✕</button>
            </div>

            <form onSubmit={salvar}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Nome */}
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    className="form-input"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    placeholder="Nome completo"
                    maxLength={120}
                    autoFocus
                  />
                </div>

                {/* E-mail */}
                <div className="form-group">
                  <label className="form-label">E-mail *</label>
                  <input
                    className="form-input"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="email@exemplo.com"
                  />
                </div>

                {/* Senha */}
                <div className="form-group">
                  <label className="form-label">
                    {modal === 'criar' ? 'Senha *' : 'Nova senha (deixe vazio para não alterar)'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      name="senha"
                      type={mostrarSenha ? 'text' : 'password'}
                      value={form.senha}
                      onChange={handleChange}
                      placeholder={modal === 'criar' ? 'Mínimo 6 caracteres' : '••••••'}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--gray-400)',
                      }}
                    >
                      {mostrarSenha ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Telefone */}
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    className="form-input"
                    name="telefone"
                    value={form.telefone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    maxLength={30}
                  />
                </div>

                {/* Comissões */}
                <div style={{
                  background: 'var(--gray-50)', borderRadius: 10, padding: '14px 16px',
                  border: '1.5px solid var(--gray-200)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--gray-700)' }}>
                    💰 Configuração de Comissão
                  </div>

                  {/* Serviços */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        name="recebe_servicos"
                        checked={form.recebe_servicos}
                        onChange={handleChange}
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>
                        Recebe comissão de serviços (mão de obra)
                      </span>
                    </label>
                    {form.recebe_servicos && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 24 }}>
                        <input
                          className="form-input"
                          name="pct_servicos"
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={form.pct_servicos}
                          onChange={handleChange}
                          style={{ width: 90 }}
                        />
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>%</span>
                        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>sobre o valor de M.O.</span>
                      </div>
                    )}
                  </div>

                  {/* Peças */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        name="recebe_pecas"
                        checked={form.recebe_pecas}
                        onChange={handleChange}
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>
                        Recebe comissão de peças
                      </span>
                    </label>
                    {form.recebe_pecas && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 24 }}>
                        <input
                          className="form-input"
                          name="pct_pecas"
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={form.pct_pecas}
                          onChange={handleChange}
                          style={{ width: 90 }}
                        />
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>%</span>
                        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>sobre o valor das peças</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aviso de alteração de comissão */}
                {modal === 'editar' && (
                  <div style={{
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#92400e',
                    display: 'flex', gap: 8,
                  }}>
                    <span>⚠️</span>
                    <span>Alterações de comissão valem apenas para novas OS. Histórico anterior é preservado.</span>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn-secondary" onClick={fecharModal} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Salvando...' : modal === 'criar' ? 'Cadastrar Mecânico' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar toggle status */}
      {confirmDesativar && (
        <div className="modal-overlay" onClick={() => setConfirmDesativar(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {confirmDesativar.ativo ? '🚫 Desativar Mecânico' : '✅ Ativar Mecânico'}
              </h2>
              <button className="modal-close" onClick={() => setConfirmDesativar(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                {confirmDesativar.ativo
                  ? `Desativar ${confirmDesativar.nome}? Ele não poderá ser atribuído a novas OS, mas o histórico e comissões são preservados.`
                  : `Ativar ${confirmDesativar.nome}? Ele poderá voltar a receber novas OS.`
                }
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setConfirmDesativar(null)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button
                onClick={() => toggleStatus(confirmDesativar)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', fontWeight: 700,
                  background: confirmDesativar.ativo ? '#dc2626' : '#16a34a',
                  color: '#fff', cursor: 'pointer', fontSize: 14,
                }}
              >
                {confirmDesativar.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
