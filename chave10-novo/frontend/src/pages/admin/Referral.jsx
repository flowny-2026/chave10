/**
 * Admin — Programa de Indicações
 * Gerencia participantes, indicações, comissões e repasses.
 */
import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$\u00a0' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  date: iso => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR'); },
};

const TIPO_LABEL  = { influenciador: 'Influenciador', cliente: 'Cliente', parceiro: 'Parceiro', outro: 'Outro' };
const STATUS_PART = { pendente: 'badge-yellow', ativo: 'badge-green', suspenso: 'badge-red' };
const STATUS_IND  = { cadastro: 'badge-yellow', trial: 'badge-orange', pagante: 'badge-green', cancelado: 'badge-red' };
const STATUS_COM  = { aguardando_validacao: 'badge-yellow', aprovada: 'badge-blue', cancelada: 'badge-red', paga: 'badge-green' };

function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast show success" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 400 }}>{msg}</div>;
}

function Confirm({ msg, onOk, onCancel }) {
  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-body" style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 15, marginBottom: 24, color: 'var(--gray-700)' }}>{msg}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
            <button className="btn btn-primary" onClick={onOk}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminReferral() {
  const [tab, setTab]               = useState('dashboard');
  const [dashboard, setDashboard]   = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [indicacoes, setIndicacoes] = useState([]);
  const [comissoes, setComissoes]   = useState([]);
  const [oficinas, setOficinas]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState('');
  const [confirm, setConfirm]       = useState(null);

  // Modal de novo participante
  const [modalPart, setModalPart]   = useState(false);
  const [formPart, setFormPart]     = useState({ oficina_id: '', tipo: 'cliente', nome_contato: '', email: '', telefone: '', observacoes: '' });

  // Modal de novo repasse
  const [modalRep, setModalRep]     = useState(null); // comissao object
  const [formRep, setFormRep]       = useState({ valor: '', metodo: 'pix', referencia: '', obs: '' });

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, parts, inds, coms, ofs] = await Promise.all([
        api.admin.referral.dashboard(),
        api.admin.referral.participantes.list(),
        api.admin.referral.indicacoes.list(),
        api.admin.referral.comissoes.list(),
        api.admin.oficinas.list(),
      ]);
      setDashboard(dash);
      setParticipantes(parts || []);
      setIndicacoes(inds || []);
      setComissoes(coms || []);
      setOficinas(ofs || []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function salvarParticipante(e) {
    e.preventDefault();
    try {
      await api.admin.referral.participantes.create(formPart);
      showToast('Participante salvo!');
      setModalPart(false);
      setFormPart({ oficina_id: '', tipo: 'cliente', nome_contato: '', email: '', telefone: '', observacoes: '' });
      load();
    } catch (err) { showToast(err.error || 'Erro ao salvar'); }
  }

  function pedirConfirmacao(msg, fn) {
    setConfirm({ msg, fn });
  }

  async function alterarStatusPart(id, status) {
    pedirConfirmacao(`Confirmar alteração de status para "${status}"?`, async () => {
      setConfirm(null);
      try {
        await api.admin.referral.participantes.setStatus(id, status);
        showToast('Status atualizado');
        load();
      } catch (err) { showToast(err.error || 'Erro'); }
    });
  }

  async function aprovarComissao(id) {
    pedirConfirmacao('Aprovar esta comissão?', async () => {
      setConfirm(null);
      try {
        await api.admin.referral.comissoes.aprovar(id);
        showToast('Comissão aprovada!');
        load();
      } catch (err) { showToast(err.error || 'Erro'); }
    });
  }

  async function cancelarComissao(id) {
    pedirConfirmacao('Cancelar esta comissão? O histórico será mantido.', async () => {
      setConfirm(null);
      try {
        await api.admin.referral.comissoes.cancelar(id);
        showToast('Comissão cancelada');
        load();
      } catch (err) { showToast(err.error || 'Erro'); }
    });
  }

  async function salvarRepasse(e) {
    e.preventDefault();
    try {
      await api.admin.referral.repasses.create({ comissao_id: modalRep.id, ...formRep });
      showToast('Repasse registrado!');
      setModalRep(null);
      setFormRep({ valor: '', metodo: 'pix', referencia: '', obs: '' });
      load();
    } catch (err) { showToast(err.error || 'Erro ao registrar repasse'); }
  }

  const TABS = [
    { id: 'dashboard',     label: 'Resumo' },
    { id: 'participantes', label: 'Participantes' },
    { id: 'indicacoes',    label: 'Indicações' },
    { id: 'comissoes',     label: 'Comissões' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div className="spinner" />
    </div>
  );

  const d = dashboard?.totais || {};

  return (
    <div>
      <Toast msg={toast} />
      {confirm && <Confirm msg={confirm.msg} onOk={confirm.fn} onCancel={() => setConfirm(null)} />}

      <div className="page-header">
        <div>
          <div className="page-title">Programa de Indicações</div>
          <div className="page-subtitle">Gerenciamento completo do programa</div>
        </div>
        {tab === 'participantes' && (
          <button className="btn btn-primary" onClick={() => setModalPart(true)}>+ Adicionar participante</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--gray-200)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--brand)' : 'var(--gray-500)',
              borderBottom: tab === t.id ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard ── */}
      {tab === 'dashboard' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Indicadores ativos',  val: d.indicadores_ativos  || 0 },
              { label: 'Total indicações',     val: d.total_indicacoes    || 0 },
              { label: 'Clientes pagantes',    val: d.pagantes            || 0 },
              { label: 'Cliques totais',       val: d.total_cliques       || 0 },
              { label: 'Comissões pendentes',  val: fmt.currency(d.comissoes_pendentes), highlight: true },
              { label: 'Comissões aprovadas',  val: fmt.currency(d.comissoes_aprovadas), highlight: true },
              { label: 'Comissões pagas',      val: fmt.currency(d.comissoes_pagas),     highlight: true },
            ].map((c, i) => (
              <div key={i} style={{ background: 'var(--bg-card,#fff)', border: '1px solid var(--gray-200)', borderRadius: 'var(--r-md,10px)', padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 800, color: c.highlight ? 'var(--accent,#F97316)' : 'var(--gray-900)' }}>{c.val}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Indicações recentes</div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Data</th><th>Indicador</th><th>Indicado</th><th>Status</th></tr></thead>
                <tbody>
                  {(dashboard?.recentes || []).map(r => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{fmt.date(r.criado_em)}</td>
                      <td>{r.indicador_nome}</td>
                      <td>{r.indicado_nome}</td>
                      <td><span className={`badge ${STATUS_IND[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                  {!dashboard?.recentes?.length && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>Nenhuma indicação ainda</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Participantes ── */}
      {tab === 'participantes' && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Oficina</th><th>Tipo</th><th>Código</th><th>Cliques</th><th>Indicações</th><th>Pagantes</th><th>Comissões</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {participantes.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.oficina_nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{p.oficina_email}</div>
                    </td>
                    <td><span className="badge badge-blue">{TIPO_LABEL[p.tipo] || p.tipo}</span></td>
                    <td><code style={{ fontSize: 12, background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>{p.codigo || '—'}</code></td>
                    <td style={{ textAlign: 'center' }}>{p.total_cliques || 0}</td>
                    <td style={{ textAlign: 'center' }}>{p.total_indicacoes || 0}</td>
                    <td style={{ textAlign: 'center' }}>{p.total_pagantes || 0}</td>
                    <td style={{ textAlign: 'right' }}>{fmt.currency(p.total_comissoes)}</td>
                    <td><span className={`badge ${STATUS_PART[p.status] || 'badge-gray'}`}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.status !== 'ativo'     && <button className="btn btn-success btn-sm"  onClick={() => alterarStatusPart(p.id, 'ativo')}>Ativar</button>}
                        {p.status === 'ativo'     && <button className="btn btn-outline btn-sm"  onClick={() => alterarStatusPart(p.id, 'suspenso')}>Suspender</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!participantes.length && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>Nenhum participante cadastrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Indicações ── */}
      {tab === 'indicacoes' && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Data</th><th>Indicador</th><th>Indicado</th><th>Situação</th><th>Comissão</th><th>Status comissão</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {indicacoes.map(ind => (
                  <tr key={ind.id}>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{fmt.date(ind.criado_em)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ind.indicador_nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{ind.indicador_tipo}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ind.indicado_nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{ind.indicado_email}</div>
                    </td>
                    <td><span className={`badge ${STATUS_IND[ind.status] || 'badge-gray'}`}>{ind.status}</span></td>
                    <td style={{ textAlign: 'right' }}>{ind.comissao_valor ? fmt.currency(ind.comissao_valor) : '—'}</td>
                    <td>
                      {ind.comissao_status
                        ? <span className={`badge ${STATUS_COM[ind.comissao_status] || 'badge-gray'}`}>{ind.comissao_status}</span>
                        : '—'}
                    </td>
                    <td>
                      <select
                        className="dash-select"
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        value={ind.status}
                        onChange={e => {
                          pedirConfirmacao(`Alterar status para "${e.target.value}"?`, async () => {
                            setConfirm(null);
                            try { await api.admin.referral.indicacoes.setStatus(ind.id, e.target.value); showToast('Status atualizado'); load(); }
                            catch (err) { showToast(err.error || 'Erro'); }
                          });
                        }}
                      >
                        <option value="cadastro">Cadastro</option>
                        <option value="trial">Teste</option>
                        <option value="pagante">Pagante</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {!indicacoes.length && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>Nenhuma indicação registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Comissões ── */}
      {tab === 'comissoes' && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Data</th><th>Indicador</th><th>Indicado</th><th style={{ textAlign: 'right' }}>Valor</th><th>Status</th><th>Pagamento</th><th>Repasse</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {comissoes.map(com => (
                  <tr key={com.id}>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{fmt.date(com.criado_em)}</td>
                    <td style={{ fontWeight: 600 }}>{com.indicador_nome}</td>
                    <td>{com.indicado_nome}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt.currency(com.valor)}</td>
                    <td><span className={`badge ${STATUS_COM[com.status] || 'badge-gray'}`}>{com.status}</span></td>
                    <td style={{ fontSize: 12 }}>
                      <div>{fmt.currency(com.pagamento_valor)}</div>
                      <div style={{ color: 'var(--gray-400)' }}>{fmt.date(com.pagamento_data)} · {com.pagamento_forma}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {com.repasse_id
                        ? <><div style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt.currency(com.repasse_valor)}</div><div style={{ color: 'var(--gray-400)' }}>{fmt.date(com.repasse_em)}</div></>
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {com.status === 'aguardando_validacao' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => aprovarComissao(com.id)}>Aprovar</button>
                            <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => cancelarComissao(com.id)}>Cancelar</button>
                          </>
                        )}
                        {com.status === 'aprovada' && !com.repasse_id && (
                          <button className="btn btn-primary btn-sm" onClick={() => { setModalRep(com); setFormRep({ valor: String(com.valor), metodo: 'pix', referencia: '', obs: '' }); }}>
                            Registrar repasse
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!comissoes.length && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>Nenhuma comissão registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal novo participante ── */}
      {modalPart && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2>Adicionar participante</h2>
              <button className="modal-close" onClick={() => setModalPart(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={salvarParticipante}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Oficina *</label>
                    <select value={formPart.oficina_id} onChange={e => setFormPart(f => ({ ...f, oficina_id: e.target.value }))} required>
                      <option value="">Selecione uma oficina</option>
                      {oficinas.map(o => <option key={o.id} value={o.id}>{o.nome} — {o.email}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo *</label>
                    <select value={formPart.tipo} onChange={e => setFormPart(f => ({ ...f, tipo: e.target.value }))}>
                      {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Nome de contato</label><input value={formPart.nome_contato} onChange={e => setFormPart(f => ({ ...f, nome_contato: e.target.value }))} /></div>
                  <div className="form-group"><label>E-mail</label><input type="email" value={formPart.email} onChange={e => setFormPart(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="form-group"><label>Telefone</label><input value={formPart.telefone} onChange={e => setFormPart(f => ({ ...f, telefone: e.target.value }))} /></div>
                  <div className="form-group full"><label>Observações</label><textarea value={formPart.observacoes} onChange={e => setFormPart(f => ({ ...f, observacoes: e.target.value }))} rows={3} /></div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModalPart(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal repasse ── */}
      {modalRep && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Registrar repasse</h2>
              <button className="modal-close" onClick={() => setModalRep(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--brand-light)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--brand)' }}>Comissão aprovada — {modalRep.indicador_nome}</div>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--brand)' }}>{fmt.currency(modalRep.valor)}</div>
              </div>
              <form onSubmit={salvarRepasse}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Valor pago *</label>
                    <input type="number" step="0.01" min="0.01" value={formRep.valor} onChange={e => setFormRep(f => ({ ...f, valor: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Método *</label>
                    <select value={formRep.metodo} onChange={e => setFormRep(f => ({ ...f, metodo: e.target.value }))}>
                      <option value="pix">PIX</option>
                      <option value="transferencia">Transferência</option>
                      <option value="credito">Crédito na conta</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="form-group full"><label>Referência / comprovante</label><input value={formRep.referencia} onChange={e => setFormRep(f => ({ ...f, referencia: e.target.value }))} placeholder="Código, chave PIX, etc." /></div>
                  <div className="form-group full"><label>Observação</label><textarea value={formRep.obs} onChange={e => setFormRep(f => ({ ...f, obs: e.target.value }))} rows={2} /></div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModalRep(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Registrar repasse</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
