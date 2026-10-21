/**
 * PainelIndicador.jsx — Painel do indicador independente
 * Rota: /painel-indicador
 * Protegido: exige perfil 'indicador' no JWT.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getFromStorage } from '../api';

const fmt = {
  currency: v => 'R$\u00a0' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  date: iso => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR'); },
};

const STATUS_IND = {
  cadastro:  { label: 'Cadastro',  cor: '#d97706' },
  trial:     { label: 'Teste',     cor: '#2563eb' },
  pagante:   { label: 'Pagante',   cor: '#16a34a' },
  cancelado: { label: 'Cancelado', cor: '#dc2626' },
};
const STATUS_COM = {
  aguardando_validacao: { label: 'Pendente',  cor: '#d97706' },
  aprovada:             { label: 'Aprovada',  cor: '#2563eb' },
  cancelada:            { label: 'Cancelada', cor: '#dc2626' },
  paga:                 { label: 'Paga',      cor: '#16a34a' },
};

const BASE_URL = 'https://www.chave10.tech';

function Badge({ status, map }) {
  const s = map[status] || { label: status, cor: '#6B7280' };
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700, borderRadius: 100,
      padding: '2px 10px', background: s.cor + '18', color: s.cor, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

function KPI({ label, value, highlight }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF',
        textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 800,
        color: highlight ? '#F97316' : '#111827' }}>{value}</div>
    </div>
  );
}

export default function PainelIndicador() {
  const navigate = useNavigate();
  const [dados, setDados]       = useState(null);
  const [indicacoes, setIndicacoes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [copiado, setCopiado]   = useState(false);
  const [toast, setToast]       = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  // Verifica se o usuário está logado como indicador
  useEffect(() => {
    const raw = getFromStorage('c10_user');
    let user;
    try { user = JSON.parse(raw); } catch { user = null; }
    if (!user || user.perfil !== 'indicador') {
      navigate('/indicar');
    }
  }, [navigate]);

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

  function logout() {
    localStorage.removeItem('c10_token');
    localStorage.removeItem('c10_user');
    navigate('/indicar');
  }

  function copiarLink() {
    if (!dados?.codigo) return;
    navigator.clipboard.writeText(`${BASE_URL}/?ref=${dados.codigo}`).then(() => {
      setCopiado(true);
      showToast('Link copiado!');
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function compartilharWhatsApp() {
    if (!dados?.codigo) return;
    const link = `${BASE_URL}/?ref=${dados.codigo}`;
    const msg  = `Conheça o *Chave 10*, sistema de gestão para oficinas mecânicas!\n\nOrganize OS, orçamentos e faturamento em um só lugar. *7 dias grátis:*\n${link}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      background: '#F9FAFB' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#F97316',
        borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const t = dados?.totais || {};
  const link = dados?.codigo ? `${BASE_URL}/?ref=${dados.codigo}` : '';
  const nomeUsuario = (() => { try { return JSON.parse(getFromStorage('c10_user'))?.nome?.split(' ')[0]; } catch { return ''; } })();

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 400,
          background: '#16a34a', color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB',
        padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 50 }}>
        <img src="/teste sem fundo 1.png" alt="Chave 10" style={{ height: 36, objectFit: 'contain' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            {nomeUsuario && `Olá, ${nomeUsuario}`}
          </span>
          <button onClick={logout}
            style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8,
              padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>

        {/* Boas-vindas */}
        {dados?.participante && dados?.aprovado && (
          <div style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#243f6a 100%)',
            borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              Bem-vindo ao programa
            </div>
            <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(1.2rem,3vw,1.6rem)',
              fontWeight: 800, margin: '0 0 8px' }}>
              Painel do Indicador
            </h1>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.7)', margin: 0, lineHeight: 1.6 }}>
              Compartilhe seu link, acompanhe seus resultados e receba comissões por cada cliente pagante.
            </p>
          </div>
        )}

        {/* Não aprovado */}
        {(!dados?.participante || dados?.aprovado === false) && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
            padding: '48px 32px', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
              {dados?.status === 'suspenso' ? 'Conta suspensa' : 'Cadastro em análise'}
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>
              {dados?.status === 'suspenso'
                ? 'Sua conta foi suspensa. Entre em contato com o suporte.'
                : 'Seu cadastro está sendo processado. Em breve você receberá seu link exclusivo.'}
            </p>
          </div>
        )}

        {/* Painel completo — só se aprovado */}
        {dados?.participante && dados?.aprovado && dados?.codigo && (
          <>
            {/* Link */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
              padding: '24px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280',
                textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
                Seu link exclusivo
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 200, background: '#F9FAFB',
                  border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px',
                  fontSize: 13, fontFamily: 'monospace', color: '#1E3A5F', wordBreak: 'break-all' }}>
                  {link}
                </div>
                <button onClick={copiarLink}
                  style={{ background: copiado ? '#16a34a' : '#F97316', border: 'none',
                    color: '#fff', padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {copiado ? '✓ Copiado!' : '📋 Copiar'}
                </button>
                <button onClick={compartilharWhatsApp}
                  style={{ background: '#25D366', border: 'none', color: '#fff',
                    padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  WhatsApp
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                Código: <code style={{ background: '#F3F4F6', padding: '2px 8px', borderRadius: 4,
                  fontWeight: 700, color: '#1E3A5F' }}>{dados.codigo}</code>
              </div>
            </div>

            {/* Mensagem pronta */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
              padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280',
                textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
                Mensagem pronta para o WhatsApp
              </div>
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8,
                padding: '14px', fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
                Conhece o <strong>Chave 10</strong>? É um sistema de gestão para oficinas mecânicas —
                OS, orçamentos e faturamento em um lugar só. <strong>7 dias grátis, sem cartão:</strong>{' '}
                <span style={{ color: '#1E3A5F' }}>{link}</span>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
              gap: 12, marginBottom: 24 }}>
              <KPI label="Cliques"           value={t.cliques    || 0} />
              <KPI label="Cadastros"         value={t.indicacoes || 0} />
              <KPI label="Testes iniciados"  value={t.trials     || 0} />
              <KPI label="Clientes pagantes" value={t.pagantes   || 0} />
              <KPI label="Comissão pendente" value={fmt.currency(t.comissao_pendente)}  highlight />
              <KPI label="Comissão aprovada" value={fmt.currency(t.comissao_aprovada)}  highlight />
              <KPI label="Comissão paga"     value={fmt.currency(t.comissao_paga)}      highlight />
            </div>

            {/* Histórico */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
              padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
                Histórico de indicações
              </div>

              {indicacoes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
                  <p style={{ fontSize: 14 }}>Nenhuma indicação ainda. Compartilhe seu link para começar!</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        {['Data', 'Indicado', 'Situação', 'Comissão', 'Status'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Comissão' ? 'right' : 'left',
                            fontSize: 11, fontWeight: 700, color: '#9CA3AF',
                            textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {indicacoes.map(ind => (
                        <tr key={ind.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>
                            {fmt.date(ind.criado_em)}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>
                            {ind.nome_parcial}
                            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>
                              Cadastro: {fmt.date(ind.data_cadastro)}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Badge status={ind.status} map={STATUS_IND} />
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700 }}>
                            {ind.comissao_valor ? fmt.currency(ind.comissao_valor) : '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {ind.comissao_status
                              ? <Badge status={ind.comissao_status} map={STATUS_COM} />
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Nota */}
            <p style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.65, textAlign: 'center' }}>
              As comissões são calculadas sobre a primeira mensalidade de cada cliente indicado,
              após confirmação do pagamento pelo administrador.
              A comissão é paga uma única vez por cliente.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
