import { useEffect, useState } from 'react';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  date: iso => { if (!iso) return '—'; const [y, m, d] = iso.split('T')[0].split('-'); return `${d}/${m}/${y}`; },
  pct: v => parseFloat(v || 0).toFixed(1) + '%',
};

const STATUS_LABEL = { pendente: 'Pendente', aprovada: 'Aprovada', paga: 'Paga', cancelada: 'Cancelada' };
const STATUS_COLOR = {
  pendente:  { bg: '#fff7ed', color: '#d97706' },
  aprovada:  { bg: '#eff6ff', color: '#2563eb' },
  paga:      { bg: '#dcfce7', color: '#16a34a' },
  cancelada: { bg: '#fee2e2', color: '#dc2626' },
};

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{msg}</div>;
}

function getUser() {
  try {
    const raw = localStorage.getItem('c10_user') || sessionStorage.getItem('c10_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function MeuPerfil() {
  const user = getUser();
  const isMecanico = user?.perfil === 'mecanico';

  const [tab, setTab] = useState('comissoes'); // 'comissoes' | 'senha'
  const [comissoes, setComissoes] = useState([]);
  const [resumo, setResumo] = useState({ totalPendente: 0, totalAprovado: 0, totalPago: 0, totalGeral: 0 });
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ inicio: '', fim: '', status: '' });
  const [toast, setToast] = useState({ msg: '', type: '' });

  // Trocar senha
  const [senhaForm, setSenhaForm] = useState({ senha_atual: '', nova_senha: '', confirmar: '' });
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  };

  async function carregarComissoes(f = filtros) {
    if (!isMecanico) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (f.inicio) qs.set('inicio', f.inicio);
      if (f.fim)    qs.set('fim', f.fim);
      if (f.status) qs.set('status', f.status);
      const data = await api.get(`/app/meu-perfil/comissoes?${qs}`);
      setComissoes(data.comissoes || []);
      setResumo(data.resumo || { totalPendente: 0, totalAprovado: 0, totalPago: 0, totalGeral: 0 });
    } catch (e) {
      showToast(e?.error || 'Erro ao carregar comissões', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isMecanico) carregarComissoes();
  }, []);

  async function trocarSenha(e) {
    e.preventDefault();
    if (!senhaForm.senha_atual) return showToast('Informe a senha atual', 'error');
    if (!senhaForm.nova_senha || senhaForm.nova_senha.length < 6) return showToast('Nova senha deve ter no mínimo 6 caracteres', 'error');
    if (senhaForm.nova_senha !== senhaForm.confirmar) return showToast('As senhas não coincidem', 'error');
    setSalvandoSenha(true);
    try {
      await api.patch('/app/meu-perfil/senha', {
        senha_atual: senhaForm.senha_atual,
        nova_senha: senhaForm.nova_senha,
      });
      showToast('Senha alterada com sucesso!');
      setSenhaForm({ senha_atual: '', nova_senha: '', confirmar: '' });
    } catch (e) {
      showToast(e?.error || 'Erro ao alterar senha', 'error');
    } finally {
      setSalvandoSenha(false);
    }
  }

  const tabs = isMecanico
    ? [{ id: 'comissoes', label: '💰 Minhas Comissões' }, { id: 'senha', label: '🔐 Trocar Senha' }]
    : [{ id: 'senha', label: '🔐 Trocar Senha' }];

  return (
    <div className="page-container">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Cabeçalho do perfil */}
      <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #d97706))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {user?.nome?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gray-900)' }}>{user?.nome || 'Usuário'}</div>
            <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
              {user?.perfil === 'mecanico' ? '🔧 Mecânico' : user?.perfil === 'funcionario' ? '👷 Funcionário' : '👑 Admin'}
            </div>
            {user?.email && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>✉ {user.email}</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--gray-100)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--primary)' : 'var(--gray-500)',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Comissões (só mecânico) */}
      {tab === 'comissoes' && isMecanico && (
        <>
          {/* Cards resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Pendente',  value: resumo.totalPendente, color: '#d97706' },
              { label: 'Aprovado',  value: resumo.totalAprovado, color: '#2563eb' },
              { label: 'Recebido', value: resumo.totalPago,     color: '#16a34a' },
            ].map(c => (
              <div key={c.label} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: c.color }}>{fmt.currency(c.value)}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>De</label>
              <input type="date" className="form-input" style={{ height: 36, fontSize: 13 }}
                value={filtros.inicio} onChange={e => setFiltros(f => ({ ...f, inicio: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Até</label>
              <input type="date" className="form-input" style={{ height: 36, fontSize: 13 }}
                value={filtros.fim} onChange={e => setFiltros(f => ({ ...f, fim: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Status</label>
              <select className="form-input" style={{ height: 36, fontSize: 13 }}
                value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="aprovada">Aprovada</option>
                <option value="paga">Paga</option>
              </select>
            </div>
            <button className="btn-primary" style={{ height: 36, fontSize: 13 }} onClick={() => carregarComissoes(filtros)}>
              🔍 Filtrar
            </button>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="loading-state"><div className="spinner" /><span>Carregando comissões...</span></div>
          ) : comissoes.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
              <h3>Nenhuma comissão encontrada</h3>
              <p>Suas comissões aparecerão aqui quando houver OS atribuídas a você.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comissoes.map(c => {
                const sc = STATUS_COLOR[c.status] || STATUS_COLOR.pendente;
                return (
                  <div key={c.id} className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>
                            OS #{c.os_numero || String(c.os_id).padStart(4, '0')}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: sc.bg, color: sc.color,
                          }}>
                            {STATUS_LABEL[c.status]}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 8 }}>
                          {fmt.date(c.criado_em)} · {c.os_descricao?.slice(0, 60) || '—'}
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {parseFloat(c.valor_servicos) > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                              M.O.: <strong>{fmt.currency(c.valor_servicos)}</strong> ({fmt.pct(c.pct_servicos)})
                            </div>
                          )}
                          {parseFloat(c.valor_pecas) > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                              Peças: <strong>{fmt.currency(c.valor_pecas)}</strong> ({fmt.pct(c.pct_pecas)})
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                          {fmt.currency(c.valor_total)}
                        </div>
                        {c.pago_em && (
                          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>
                            Pago em {fmt.date(c.pago_em)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Trocar Senha */}
      {tab === 'senha' && (
        <div className="card" style={{ maxWidth: 440 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, color: 'var(--gray-800)' }}>
            🔐 Alterar Senha
          </div>
          <form onSubmit={trocarSenha} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Senha atual *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={mostrarSenhas ? 'text' : 'password'}
                  value={senhaForm.senha_atual}
                  onChange={e => setSenhaForm(f => ({ ...f, senha_atual: e.target.value }))}
                  placeholder="••••••"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setMostrarSenhas(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--gray-400)' }}>
                  {mostrarSenhas ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nova senha *</label>
              <input
                className="form-input"
                type={mostrarSenhas ? 'text' : 'password'}
                value={senhaForm.nova_senha}
                onChange={e => setSenhaForm(f => ({ ...f, nova_senha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar nova senha *</label>
              <input
                className="form-input"
                type={mostrarSenhas ? 'text' : 'password'}
                value={senhaForm.confirmar}
                onChange={e => setSenhaForm(f => ({ ...f, confirmar: e.target.value }))}
                placeholder="Repita a nova senha"
              />
            </div>

            {senhaForm.nova_senha && senhaForm.confirmar && senhaForm.nova_senha !== senhaForm.confirmar && (
              <div style={{ fontSize: 12, color: '#dc2626' }}>⚠️ As senhas não coincidem</div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={salvandoSenha}
              style={{ marginTop: 6 }}
            >
              {salvandoSenha ? 'Salvando...' : '🔐 Alterar Senha'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
