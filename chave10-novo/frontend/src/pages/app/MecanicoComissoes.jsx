import { useEffect, useState, useCallback } from 'react';
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

export default function MecanicoComissoes() {
  const [mecanicos, setMecanicos] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [mecSelecionado, setMecSelecionado] = useState(null);
  const [comissoes, setComissoes] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingComissoes, setLoadingComissoes] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [filtros, setFiltros] = useState({ inicio: '', fim: '', status: '' });
  const [confirmAcao, setConfirmAcao] = useState(null); // { comissao, acao }
  const [tab, setTab] = useState('resumo'); // 'resumo' | 'historico'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  };

  const carregarResumo = useCallback(async () => {
    setLoadingLista(true);
    try {
      const [mecData, resData] = await Promise.all([
        api.get('/app/mecanicos'),
        api.get('/app/mecanicos/comissoes/resumo'),
      ]);
      setMecanicos(mecData);
      setResumo(resData);
    } catch (e) {
      showToast(e?.error || 'Erro ao carregar dados', 'error');
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => { carregarResumo(); }, [carregarResumo]);

  const carregarComissoes = useCallback(async (mecId, f = filtros) => {
    setLoadingComissoes(true);
    try {
      const qs = new URLSearchParams();
      if (f.inicio) qs.set('inicio', f.inicio);
      if (f.fim)    qs.set('fim', f.fim);
      if (f.status) qs.set('status', f.status);
      const data = await api.get(`/app/mecanicos/${mecId}/comissoes?${qs}`);
      setComissoes(data.comissoes || []);
    } catch (e) {
      showToast(e?.error || 'Erro ao carregar comissões', 'error');
    } finally {
      setLoadingComissoes(false);
    }
  }, [filtros]);

  function selecionarMecanico(mec) {
    setMecSelecionado(mec);
    setTab('historico');
    carregarComissoes(mec.mecanico_id || mec.id);
  }

  function voltar() {
    setMecSelecionado(null);
    setComissoes([]);
    setTab('resumo');
    setFiltros({ inicio: '', fim: '', status: '' });
  }

  async function aplicarFiltros() {
    if (mecSelecionado) {
      carregarComissoes(mecSelecionado.mecanico_id || mecSelecionado.id, filtros);
    }
  }

  async function executarAcao(comissao, acao) {
    try {
      const url = `/app/mecanicos/comissoes/${comissao.id}/${acao}`;
      const body = acao === 'cancelar' ? { obs: '' } : {};
      await api.patch(url, body);
      const label = { aprovar: 'Comissão aprovada', pagar: 'Comissão marcada como paga', cancelar: 'Comissão cancelada' };
      showToast(label[acao] || 'Atualizado');
      setConfirmAcao(null);
      carregarComissoes(mecSelecionado.mecanico_id || mecSelecionado.id);
      carregarResumo();
    } catch (e) {
      showToast(e?.error || 'Erro ao executar ação', 'error');
    }
  }

  // Totais do mecanico selecionado
  const totalPendente = comissoes.filter(c => c.status === 'pendente').reduce((s, c) => s + parseFloat(c.valor_total || 0), 0);
  const totalAprovado = comissoes.filter(c => c.status === 'aprovada').reduce((s, c) => s + parseFloat(c.valor_total || 0), 0);
  const totalPago     = comissoes.filter(c => c.status === 'paga').reduce((s, c) => s + parseFloat(c.valor_total || 0), 0);

  // Totais globais do resumo
  const globalPendente = resumo.reduce((s, r) => s + parseFloat(r.total_pendente || 0), 0);
  const globalPago     = resumo.reduce((s, r) => s + parseFloat(r.total_pago || 0), 0);

  return (
    <div className="page-container">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Header */}
      <div className="page-header">
        <div>
          {mecSelecionado ? (
            <>
              <button
                onClick={voltar}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--gray-400)', marginBottom: 4, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                ← Voltar ao resumo
              </button>
              <h1 className="page-title">💰 Comissões — {mecSelecionado.mecanico_nome}</h1>
              <p className="page-subtitle">Histórico detalhado por OS</p>
            </>
          ) : (
            <>
              <h1 className="page-title">💰 Comissões</h1>
              <p className="page-subtitle">Controle de comissões por mecânico</p>
            </>
          )}
        </div>
      </div>

      {/* VISÃO RESUMO */}
      {!mecSelecionado && (
        <>
          {/* Cards globais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>A Pagar</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{fmt.currency(globalPendente)}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Total Pago</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{fmt.currency(globalPago)}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Mecânicos</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-700)' }}>{mecanicos.length}</div>
            </div>
          </div>

          {/* Tabela resumo por mecânico */}
          {loadingLista ? (
            <div className="loading-state"><div className="spinner" /><span>Carregando...</span></div>
          ) : resumo.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
              <h3>Nenhuma comissão registrada</h3>
              <p>As comissões aparecem automaticamente ao criar OS com mecânico responsável.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mecânico</th>
                      <th style={{ textAlign: 'center' }}>OS</th>
                      <th style={{ textAlign: 'right' }}>Pendente</th>
                      <th style={{ textAlign: 'right' }}>Aprovado</th>
                      <th style={{ textAlign: 'right' }}>Pago</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.map(r => (
                      <tr key={r.mecanico_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #d97706))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
                            }}>
                              {r.mecanico_nome?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span style={{ fontWeight: 600 }}>{r.mecanico_nome}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{r.total_comissoes}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#d97706' }}>{fmt.currency(r.total_pendente)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#2563eb' }}>{fmt.currency(r.total_aprovado)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>{fmt.currency(r.total_pago)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            onClick={() => selecionarMecanico(r)}
                          >
                            Ver detalhes →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* VISÃO DETALHADA POR MECÂNICO */}
      {mecSelecionado && (
        <>
          {/* Cards do mecânico selecionado */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Pendente', value: totalPendente, color: '#d97706' },
              { label: 'Aprovado', value: totalAprovado, color: '#2563eb' },
              { label: 'Pago',     value: totalPago,     color: '#16a34a' },
            ].map(c => (
              <div key={c.label} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{fmt.currency(c.value)}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Data início</label>
              <input type="date" className="form-input" style={{ height: 36, fontSize: 13 }}
                value={filtros.inicio} onChange={e => setFiltros(f => ({ ...f, inicio: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Data fim</label>
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
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ height: 36, fontSize: 13 }} onClick={aplicarFiltros}>
              Filtrar
            </button>
            <button className="btn btn-outline" style={{ height: 36, fontSize: 13 }} onClick={() => {
              const f = { inicio: '', fim: '', status: '' };
              setFiltros(f);
              carregarComissoes(mecSelecionado.mecanico_id || mecSelecionado.id, f);
            }}>
              Limpar
            </button>
          </div>

          {/* Lista de comissões */}
          {loadingComissoes ? (
            <div className="loading-state"><div className="spinner" /><span>Carregando comissões...</span></div>
          ) : comissoes.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <h3>Nenhuma comissão encontrada</h3>
              <p>Tente ajustar os filtros ou aguarde novas OS.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>OS</th>
                      <th>Data</th>
                      <th style={{ textAlign: 'right' }}>M.O.</th>
                      <th style={{ textAlign: 'right' }}>Peças</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comissoes.map(c => {
                      const sc = STATUS_COLOR[c.status] || STATUS_COLOR.pendente;
                      return (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>#{c.os_numero || String(c.os_id).padStart(4, '0')}</div>
                            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{c.os_descricao?.slice(0, 40) || '—'}</div>
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                            {fmt.date(c.criado_em)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt.currency(c.valor_servicos)}</div>
                            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{fmt.pct(c.pct_servicos)}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt.currency(c.valor_pecas)}</div>
                            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{fmt.pct(c.pct_pecas)}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
                              {fmt.currency(c.valor_total)}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                              fontSize: 11, fontWeight: 700,
                              background: sc.bg, color: sc.color,
                            }}>
                              {STATUS_LABEL[c.status] || c.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              {c.status === 'pendente' && (
                                <>
                                  <button
                                    onClick={() => setConfirmAcao({ comissao: c, acao: 'aprovar' })}
                                    title="Aprovar"
                                    style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    ✓ Aprovar
                                  </button>
                                  <button
                                    onClick={() => setConfirmAcao({ comissao: c, acao: 'pagar' })}
                                    title="Marcar como paga"
                                    style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    💵 Pagar
                                  </button>
                                  <button
                                    onClick={() => setConfirmAcao({ comissao: c, acao: 'cancelar' })}
                                    title="Cancelar"
                                    style={{ padding: '4px 8px', borderRadius: 6, border: '1.5px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                              {c.status === 'aprovada' && (
                                <button
                                  onClick={() => setConfirmAcao({ comissao: c, acao: 'pagar' })}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  💵 Pagar
                                </button>
                              )}
                              {(c.status === 'paga' || c.status === 'cancelada') && (
                                <span style={{ fontSize: 12, color: 'var(--gray-300)' }}>
                                  {c.status === 'paga' ? `Pago em ${fmt.date(c.pago_em)}` : 'Cancelada'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal confirmação de ação */}
      {confirmAcao && (
        <div className="modal-overlay open" onClick={() => setConfirmAcao(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--gray-900)' }}>
                {confirmAcao.acao === 'aprovar' && '✓ Aprovar Comissão'}
                {confirmAcao.acao === 'pagar'   && '💵 Marcar como Paga'}
                {confirmAcao.acao === 'cancelar' && '✕ Cancelar Comissão'}
              </h2>
              <button className="modal-close" onClick={() => setConfirmAcao(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                {confirmAcao.acao === 'aprovar' && `Aprovar comissão de ${fmt.currency(confirmAcao.comissao.valor_total)} da OS #${confirmAcao.comissao.os_numero || confirmAcao.comissao.os_id}?`}
                {confirmAcao.acao === 'pagar'   && `Marcar como paga a comissão de ${fmt.currency(confirmAcao.comissao.valor_total)}?`}
                {confirmAcao.acao === 'cancelar' && `Cancelar comissão de ${fmt.currency(confirmAcao.comissao.valor_total)}? Esta ação não pode ser desfeita.`}
              </p>
            </div>
            <div className="form-actions" style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setConfirmAcao(null)} style={{ flex: 1 }}>
                Voltar
              </button>
              <button
                onClick={() => executarAcao(confirmAcao.comissao, confirmAcao.acao)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  fontWeight: 700, color: '#fff', cursor: 'pointer', fontSize: 14,
                  background: confirmAcao.acao === 'cancelar' ? '#dc2626' : confirmAcao.acao === 'pagar' ? '#16a34a' : '#2563eb',
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
