import { useEffect, useState } from 'react';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$\u00a0' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  date: iso => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('pt-BR'); },
};

const STATUS_IND = {
  cadastro:  { label: 'Cadastro',  cls: 'badge-yellow' },
  trial:     { label: 'Teste',     cls: 'badge-orange' },
  pagante:   { label: 'Pagante',   cls: 'badge-green'  },
  cancelado: { label: 'Cancelado', cls: 'badge-red'    },
};
const STATUS_COM = {
  aguardando_validacao: { label: 'Pendente',   cls: 'badge-yellow' },
  aprovada:             { label: 'Aprovada',   cls: 'badge-blue'   },
  cancelada:            { label: 'Cancelada',  cls: 'badge-red'    },
  paga:                 { label: 'Paga',       cls: 'badge-green'  },
};

function Card({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--gray-200)',
      borderRadius: 'var(--r-md, 10px)',
      padding: '18px 20px',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{label}</div>
      <div style={{
        fontFamily: 'Poppins, sans-serif',
        fontSize: 22, fontWeight: 800,
        color: highlight ? 'var(--accent, #F97316)' : 'var(--gray-800)',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AppIndicacoes() {
  const [loading, setLoading]     = useState(true);
  const [dados, setDados]         = useState(null);
  const [indicacoes, setIndicacoes] = useState([]);
  const [copiado, setCopiado]     = useState(false);
  const [toast, setToast]         = useState('');

  const BASE_URL = 'https://www.chave10.tech';

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    async function load() {
      try {
        const [me, inds] = await Promise.all([
          api.app.referral.me(),
          api.app.referral.indicacoes().catch(() => []),
        ]);
        setDados(me);
        setIndicacoes(inds || []);
      } catch {
        setDados({ participante: false });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function copiarLink() {
    const link = `${BASE_URL}/?ref=${dados.codigo}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(true);
      showToast('Link copiado!');
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function compartilharWhatsApp() {
    const link = `${BASE_URL}/?ref=${dados.codigo}`;
    const msg = `Estou usando o *Chave 10* para gerenciar minha oficina e recomendo muito! Organize suas OS, orçamentos e faturamento em um só lugar.\n\nExperimente grátis por 7 dias:\n${link}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Não é participante ou está pendente/suspenso
  if (!dados?.participante || dados?.aprovado === false) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Indique e Ganhe</div>
            <div className="page-subtitle">Programa de indicações Chave 10</div>
          </div>
        </div>
        <div className="card" style={{ maxWidth: 560, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 12 }}>
            {dados?.status === 'suspenso' ? 'Participação suspensa' : 'Programa de indicações'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.7, marginBottom: 24 }}>
            {dados?.status === 'suspenso'
              ? 'Sua participação no programa está temporariamente suspensa. Entre em contato com o suporte para mais informações.'
              : 'Para participar do programa de indicações e ganhar comissões, entre em contato com nossa equipe pelo WhatsApp.'
            }
          </p>
          <a
            href="/indicar"
            className="btn btn-primary"
          >
            Saiba como funciona e cadastre-se
          </a>
        </div>
      </div>
    );
  }

  const t = dados.totais || {};
  const link = `${BASE_URL}/?ref=${dados.codigo}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Indique e Ganhe</div>
          <div className="page-subtitle">Compartilhe seu link e acompanhe seus resultados</div>
        </div>
      </div>

      {toast && (
        <div className="toast show success" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>
          {toast}
        </div>
      )}

      {/* ── Bloco do link ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 4 }}>Seu link exclusivo</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              flex: 1, minWidth: 200,
              background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px',
              fontSize: 13, fontFamily: 'monospace', color: 'var(--accent, #F97316)',
              wordBreak: 'break-all',
            }}>
              {link}
            </div>
            <button className="btn btn-outline" onClick={copiarLink} style={{ flexShrink: 0 }}>
              {copiado ? '✓ Copiado!' : '📋 Copiar link'}
            </button>
            <button className="btn btn-success" onClick={compartilharWhatsApp} style={{ flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.122 1.534 5.86L.057 23.126a.75.75 0 0 0 .923.899l5.444-1.744A11.951 11.951 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.716 9.716 0 0 1-4.953-1.355l-.354-.213-3.672 1.175 1.13-3.562-.231-.369A9.71 9.71 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
              WhatsApp
            </button>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray-500)' }}>
            <span>Código:</span>
            <code style={{ background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, color: 'var(--accent, #F97316)' }}>
              {dados.codigo}
            </code>
          </div>
        </div>

        {/* Mensagem pronta */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>Mensagem pronta para divulgar</div>
          <div style={{
            background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--r-sm)', padding: '14px 16px',
            fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.65,
          }}>
            Estou usando o <strong>Chave 10</strong> para gerenciar minha oficina e recomendo muito!
            Organize suas OS, orçamentos e faturamento em um só lugar.{' '}
            <strong>Experimente grátis por 7 dias:</strong>{' '}
            <span style={{ color: 'var(--accent, #F97316)' }}>{link}</span>
          </div>
        </div>
      </div>

      {/* ── Cards de indicadores ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Card label="Cliques"              value={t.cliques   || 0} />
        <Card label="Cadastros"            value={t.indicacoes || 0} />
        <Card label="Testes iniciados"     value={t.trials    || 0} />
        <Card label="Clientes pagantes"    value={t.pagantes  || 0} />
        <Card label="Comissão pendente"    value={fmt.currency(t.comissao_pendente)}  highlight />
        <Card label="Comissão aprovada"    value={fmt.currency(t.comissao_aprovada)}  highlight />
        <Card label="Comissão paga"        value={fmt.currency(t.comissao_paga)}      highlight />
      </div>

      {/* ── Histórico de indicações ── */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 16 }}>
          Histórico de indicações
        </div>

        {indicacoes.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p style={{ color: 'var(--gray-400)', fontSize: 14, marginTop: 12 }}>
              Nenhuma indicação ainda. Compartilhe seu link para começar!
            </p>
          </div>
        ) : (
          <>
            {/* Tabela desktop */}
            <div className="os-table-desktop">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Indicado</th>
                      <th>Situação</th>
                      <th style={{ textAlign: 'right' }}>Comissão</th>
                      <th>Status comissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicacoes.map(ind => (
                      <tr key={ind.id}>
                        <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{fmt.date(ind.criado_em)}</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{ind.nome_parcial}</span>
                          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Cadastro: {fmt.date(ind.data_cadastro)}</div>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_IND[ind.status]?.cls || 'badge-gray'}`}>
                            {STATUS_IND[ind.status]?.label || ind.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {ind.comissao_valor ? fmt.currency(ind.comissao_valor) : '—'}
                        </td>
                        <td>
                          {ind.comissao_status ? (
                            <span className={`badge ${STATUS_COM[ind.comissao_status]?.cls || 'badge-gray'}`}>
                              {STATUS_COM[ind.comissao_status]?.label || ind.comissao_status}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards mobile */}
            <div className="os-cards-mobile">
              {indicacoes.map(ind => (
                <div key={ind.id} className="os-card-mobile" style={{ cursor: 'default' }}>
                  <div className="os-card-top">
                    <span style={{ fontWeight: 700 }}>{ind.nome_parcial}</span>
                    <span className={`badge ${STATUS_IND[ind.status]?.cls || 'badge-gray'}`}>
                      {STATUS_IND[ind.status]?.label || ind.status}
                    </span>
                  </div>
                  <div className="os-card-info">
                    <span>Cadastro: {fmt.date(ind.data_cadastro)}</span>
                    <span>{fmt.date(ind.criado_em)}</span>
                  </div>
                  {ind.comissao_valor && (
                    <div className="os-card-bottom">
                      <span className="os-card-valor">{fmt.currency(ind.comissao_valor)}</span>
                      {ind.comissao_status && (
                        <span className={`badge ${STATUS_COM[ind.comissao_status]?.cls || 'badge-gray'}`}>
                          {STATUS_COM[ind.comissao_status]?.label || ind.comissao_status}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Nota informativa */}
      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 16, lineHeight: 1.6 }}>
        As comissões são calculadas sobre a primeira mensalidade de cada cliente indicado, após confirmação do pagamento.
        O repasse é realizado após aprovação pela equipe do Chave 10.
      </p>
    </div>
  );
}
