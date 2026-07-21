import { useState, useEffect } from 'react';
import { api } from '../../api';

const TIPO_ICON = {
  orcamento_aprovado: '✅',
  orcamento_recusado: '❌',
  os_finalizada: '🔧',
  lembrete_vencido: '⏰',
  assinatura_vencendo: '⚠️',
};

const TIPO_COLOR = {
  orcamento_aprovado: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  orcamento_recusado: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  os_finalizada: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
  lembrete_vencido: { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  assinatura_vencendo: { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c' },
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Agora mesmo';
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return date.toLocaleDateString('pt-BR');
}

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas'); // todas | nao_lidas

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/app/notificacoes');
      setNotificacoes(res.notificacoes || []);
      setNaoLidas(res.naoLidas || 0);
    } catch { setNotificacoes([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function marcarLida(id) {
    await api.patch(`/app/notificacoes/${id}/lida`, {});
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lido: true } : n));
    setNaoLidas(prev => Math.max(0, prev - 1));
  }

  async function marcarTodas() {
    await api.patch('/app/notificacoes/marcar-todas', {});
    setNotificacoes(prev => prev.map(n => ({ ...n, lido: true })));
    setNaoLidas(0);
  }

  const lista = filtro === 'nao_lidas'
    ? notificacoes.filter(n => !n.lido)
    : notificacoes;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Notificações</h1>
          <p className="page-subtitle">
            {naoLidas > 0
              ? <><strong>{naoLidas}</strong> não lida{naoLidas > 1 ? 's' : ''}</>
              : 'Todas lidas'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {naoLidas > 0 && (
            <button className="btn btn-outline btn-sm" onClick={marcarTodas}>
              ✓ Marcar todas como lidas
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={load}>↻</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${filtro === 'todas' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFiltro('todas')}
        >
          Todas ({notificacoes.length})
        </button>
        <button
          className={`btn btn-sm ${filtro === 'nao_lidas' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFiltro('nao_lidas')}
        >
          Não lidas ({naoLidas})
        </button>
      </div>

      {/* Lista */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>
        ) : lista.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>
              {filtro === 'nao_lidas' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação ainda'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>
              Quando um cliente aprovar ou recusar um orçamento, você verá aqui.
            </div>
          </div>
        ) : (
          lista.map((n, i) => {
            const cor = TIPO_COLOR[n.tipo] || { bg: '#f9fafb', border: '#e5e7eb', text: '#374151' };
            const icon = TIPO_ICON[n.tipo] || '🔔';
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 18px',
                  borderBottom: i < lista.length - 1 ? '1px solid var(--gray-100)' : 'none',
                  background: n.lido ? '#fff' : cor.bg,
                  borderLeft: n.lido ? 'none' : `4px solid ${cor.border}`,
                  transition: 'background .15s',
                  cursor: n.lido ? 'default' : 'pointer',
                }}
                onClick={() => !n.lido && marcarLida(n.id)}
              >
                {/* Ícone */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: n.lido ? 'var(--gray-100)' : cor.bg,
                  border: `1px solid ${n.lido ? 'var(--gray-200)' : cor.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {icon}
                </div>

                {/* Conteúdo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: n.lido ? 400 : 700,
                    color: n.lido ? 'var(--gray-600)' : 'var(--gray-800)',
                    lineHeight: 1.3,
                  }}>
                    {n.titulo}
                  </div>
                  {n.mensagem && (
                    <div style={{
                      fontSize: 13, color: 'var(--gray-500)', marginTop: 3,
                      lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {n.mensagem}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 5 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>

                {/* Badge não lida */}
                {!n.lido && (
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: cor.text, flexShrink: 0, marginTop: 4,
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
