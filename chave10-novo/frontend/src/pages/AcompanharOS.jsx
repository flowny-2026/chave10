import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getOsPublica } from '../api';

// ─── helpers ────────────────────────────────────────────────
const fmtDate = iso => {
  if (!iso) return null;
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

const ETAPAS = [
  { key: 'em_andamento', label: 'Em andamento',   icon: '🔧', cor: '#f59e0b' },
  { key: 'finalizado',   label: 'Pronto para retirada', icon: '✅', cor: '#10b981' },
  { key: 'cancelada',    label: 'Cancelada',       icon: '❌', cor: '#ef4444' },
];

const STATUS_LABEL = {
  em_andamento: 'Em andamento',
  finalizado:   'Pronto para retirada! 🎉',
  cancelada:    'Cancelada',
};

const STATUS_COR = {
  em_andamento: '#f59e0b',
  finalizado:   '#10b981',
  cancelada:    '#ef4444',
};

// ─── componente principal ────────────────────────────────────
export default function AcompanharOS() {
  const { token } = useParams();
  const [os, setOs]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]     = useState(null);
  const intervalRef         = useRef(null);

  async function carregar() {
    try {
      const data = await getOsPublica(token);
      setOs(data);
      setErro(null);
    } catch (e) {
      setErro(e?.error || 'OS não encontrada');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // polling a cada 30s para atualização em tempo real
    intervalRef.current = setInterval(carregar, 30000);
    return () => clearInterval(intervalRef.current);
  }, [token]);

  // ── tela de loading ──────────────────────────────────────
  if (loading) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.spinner} />
        <p style={{ color: '#6b7280', marginTop: 16 }}>Carregando…</p>
      </div>
    </div>
  );

  // ── tela de erro ─────────────────────────────────────────
  if (erro) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <h2 style={{ color: '#1f2937', marginBottom: 8 }}>Link não encontrado</h2>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          Este link pode ter expirado ou é inválido.<br />
          Entre em contato com a oficina para obter um novo link.
        </p>
      </div>
    </div>
  );

  const { oficina, veiculo, status } = os;
  const cor = STATUS_COR[status] || '#6b7280';
  const etapaIdx = status === 'cancelada' ? -1 : status === 'finalizado' ? 1 : 0;

  const telLink = oficina?.telefone
    ? 'https://wa.me/' + oficina.telefone.replace(/\D/g, '').replace(/^(?!55)/, '55')
    : null;

  return (
    <div style={s.page}>
      {/* Header da oficina */}
      <div style={s.header}>
        {oficina?.logo
          ? <img src={oficina.logo} alt={oficina.nome} style={{ height: 48, objectFit: 'contain', marginBottom: 8 }} />
          : <div style={s.logoPh}>{(oficina?.nome || 'O')[0]}</div>
        }
        <h1 style={s.oficinaNome}>{oficina?.nome}</h1>
        {oficina?.endereco && <p style={s.oficinaEnd}>{oficina.endereco}</p>}
      </div>

      {/* Card principal */}
      <div style={s.card}>
        {/* Número da OS */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
            Ordem de Serviço
          </span>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1f2937', lineHeight: 1.2 }}>
            #{os.numero}
          </div>
          {os.data && (
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              Aberta em {fmtDate(os.data)}
            </div>
          )}
        </div>

        {/* Status atual */}
        <div style={{ ...s.statusBadge, background: cor + '18', border: `1.5px solid ${cor}`, color: cor }}>
          {STATUS_LABEL[status] || status}
        </div>

        {/* Timeline de etapas */}
        {status !== 'cancelada' && (
          <div style={s.timeline}>
            {/* Recebido — sempre completo */}
            <EtapaItem
              concluida
              label="Veículo recebido"
              data={fmtDate(os.data)}
              cor="#10b981"
              icon="📥"
            />
            {/* Em andamento */}
            <EtapaItem
              concluida={status === 'finalizado'}
              ativa={status === 'em_andamento'}
              label="Serviço em andamento"
              cor={status === 'em_andamento' ? '#f59e0b' : '#10b981'}
              icon="🔧"
            />
            {/* Pronto */}
            <EtapaItem
              concluida={status === 'finalizado'}
              ativa={false}
              label="Pronto para retirada"
              data={status === 'finalizado' ? fmtDate(os.data_conclusao) : null}
              cor="#10b981"
              icon="✅"
              last
            />
          </div>
        )}

        {/* Dados do veículo */}
        {(veiculo?.modelo || veiculo?.placa) && (
          <div style={s.section}>
            <div style={s.sectionTitle}>🚗 Veículo</div>
            <div style={s.infoRow}>
              {[
                veiculo.marca && veiculo.modelo ? `${veiculo.marca} ${veiculo.modelo}` : veiculo.modelo,
                veiculo.ano,
                veiculo.placa,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}

        {/* Serviço */}
        {os.descricao && (
          <div style={s.section}>
            <div style={s.sectionTitle}>🔩 Serviço</div>
            <div style={s.infoRow}>{os.descricao}</div>
          </div>
        )}

        {/* Mecânico */}
        {os.mecanico_nome && (
          <div style={s.section}>
            <div style={s.sectionTitle}>👷 Responsável</div>
            <div style={s.infoRow}>{os.mecanico_nome}</div>
          </div>
        )}

        {/* Observações */}
        {os.observacao && (
          <div style={s.section}>
            <div style={s.sectionTitle}>📝 Observação</div>
            <div style={s.infoRow}>{os.observacao}</div>
          </div>
        )}

        {/* Atualizado em */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 20 }}>
          Atualiza automaticamente a cada 30 segundos
        </p>
      </div>

      {/* Botão WhatsApp */}
      {telLink && (
        <a href={telLink} target="_blank" rel="noopener noreferrer" style={s.waBotao}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Falar com a oficina
        </a>
      )}

      <p style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 24, marginBottom: 8 }}>
        Powered by <strong>Chave 10</strong>
      </p>
    </div>
  );
}

// ─── sub-componente de etapa ─────────────────────────────────
function EtapaItem({ concluida, ativa, label, data, cor, icon, last }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {/* Linha vertical */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: concluida ? cor : ativa ? cor + '22' : '#f3f4f6',
          border: `2px solid ${concluida || ativa ? cor : '#e5e7eb'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, transition: 'all .3s',
        }}>
          {concluida ? '✓' : ativa ? <span style={{ fontSize: 13 }}>{icon}</span> : <span style={{ opacity: 0.3 }}>{icon}</span>}
        </div>
        {!last && (
          <div style={{ width: 2, flex: 1, minHeight: 24, background: concluida ? cor : '#e5e7eb', marginTop: 2, transition: 'background .3s' }} />
        )}
      </div>
      {/* Texto */}
      <div style={{ paddingTop: 4, paddingBottom: last ? 0 : 20 }}>
        <div style={{ fontSize: 14, fontWeight: concluida || ativa ? 700 : 400, color: concluida || ativa ? '#1f2937' : '#9ca3af' }}>
          {label}
        </div>
        {data && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{data}</div>}
        {ativa && !concluida && (
          <div style={{ fontSize: 12, color: cor, fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: cor, animation: 'pulse 1.5s infinite' }} />
            Agora
          </div>
        )}
      </div>
    </div>
  );
}

// ─── estilos ─────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: '#f3f4f6',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px 48px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
    textAlign: 'center',
  },
  logoPh: {
    width: 56, height: 56, borderRadius: '50%',
    background: '#F97316', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 800, marginBottom: 8,
  },
  oficinaNome: {
    fontSize: 20, fontWeight: 800, color: '#1f2937',
    margin: '0 0 4px',
  },
  oficinaEnd: {
    fontSize: 13, color: '#9ca3af', margin: 0,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    background: '#fff',
    borderRadius: 16,
    padding: '28px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 24px rgba(0,0,0,.06)',
    marginBottom: 16,
  },
  statusBadge: {
    display: 'block',
    textAlign: 'center',
    padding: '10px 20px',
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 15,
    marginBottom: 24,
  },
  timeline: {
    marginBottom: 20,
    paddingLeft: 4,
  },
  section: {
    borderTop: '1px solid #f3f4f6',
    paddingTop: 14,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoRow: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: 500,
  },
  waBotao: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 480,
    padding: '14px 20px',
    background: '#25D366',
    color: '#fff',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: 'none',
    boxShadow: '0 2px 12px rgba(37,211,102,.3)',
    marginBottom: 8,
  },
  spinner: {
    width: 36, height: 36,
    border: '3px solid #e5e7eb',
    borderTopColor: '#F97316',
    borderRadius: '50%',
    animation: 'spin .7s linear infinite',
    margin: '0 auto',
  },
};
