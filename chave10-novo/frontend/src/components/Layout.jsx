import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import PWAInstallButton from './PWAInstallButton';
import GlobalSearch from './GlobalSearch';
import OfflineIndicator from './OfflineIndicator';
import OnboardingTour from './OnboardingTour';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';

// SVG Icons
const IC = {
  dashboard:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  clientes:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  veiculos:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  os:           <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  orcamentos:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  agenda:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  mensagens:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  financeiro:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  relatorios:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  lembretes:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  estoque:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  configuracoes:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  notificacoes: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  oficinas:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  pagamentos:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
};

const adminNav = [
  { to: '/admin/dashboard',       label: 'Dashboard',          icon: IC.dashboard },
  { to: '/admin/oficinas',        label: 'Oficinas',           icon: IC.oficinas },
  { to: '/admin/pagamentos',      label: 'Pagamentos',         icon: IC.pagamentos },
  { to: '/admin/audit-logs',      label: 'Logs de Auditoria',  icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> },
  { to: '/admin/security-alerts', label: 'Alertas de Segurança', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  { to: '/admin/trocar-senha',    label: 'Trocar Senha',       icon: IC.configuracoes },
];

const appNavPrincipal = [
  { to: '/app/dashboard',    label: 'Dashboard',         icon: IC.dashboard },
  { to: '/app/clientes',     label: 'Clientes',          icon: IC.clientes },
  { to: '/app/veiculos',     label: 'Veículos',          icon: IC.veiculos },
  { to: '/app/os',           label: 'Ordens de Serviço', icon: IC.os },
  { to: '/app/orcamentos',   label: 'Orçamentos',        icon: IC.orcamentos },
  { to: '/app/agenda',       label: 'Agenda',            icon: IC.agenda, badge: 'Novo' },
  { to: '/app/mensagens',    label: 'Mensagens',         icon: IC.mensagens },
];

const appNavGestao = [
  { to: '/app/financeiro',     label: 'Financeiro',    icon: IC.financeiro },
  { to: '/app/relatorios',     label: 'Relatórios',    icon: IC.relatorios },
  { to: '/app/lembretes',      label: 'Lembretes',     icon: IC.lembretes },
  { to: '/app/estoque',        label: 'Estoque',       icon: IC.estoque },
  { to: '/app/notificacoes',   label: 'Notificações',  icon: IC.notificacoes, badge: 'Novo' },
  { to: '/app/configuracoes',  label: 'Configurações', icon: IC.configuracoes },
];

function getUser() {
  try {
    const raw = localStorage.getItem('c10_user') || sessionStorage.getItem('c10_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Popup de aviso de boletos/contas a vencer ────────────────
function BoletoAlert() {
  const user = getUser();
  const [boletos, setBoletos] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Só exibe para perfis que têm acesso ao financeiro
    if (!user || user.perfil === 'funcionario' || user.perfil === 'master_admin') return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const toISO = d => d.toISOString().split('T')[0];

    // Busca despesas dos próximos 2 dias
    api.app.despesas.list(toISO(hoje), toISO(amanha))
      .then(data => {
        const pendentes = (data || []).filter(d =>
          !d.pago && d.vencimento && (d.vencimento === toISO(hoje) || d.vencimento === toISO(amanha))
        );
        if (pendentes.length > 0) {
          setBoletos(pendentes);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!visible || boletos.length === 0) return null;

  const fmt = {
    currency: v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
    date: iso => { if (!iso) return '-'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; },
  };

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const toISO = d => d.toISOString().split('T')[0];
  const hojeStr = toISO(hoje);

  const venceHoje   = boletos.filter(d => d.vencimento === hojeStr);
  const venceAmanha = boletos.filter(d => d.vencimento !== hojeStr);
  const totalValor  = boletos.reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const temHoje     = venceHoje.length > 0;

  const CAT_ICONS = {
    'Aluguel': '🏠', 'Energia': '⚡', 'Água': '💧', 'Internet': '🌐',
    'Folha de pagamento': '👥', 'Peças/Estoque': '🔩', 'Ferramentas': '🔧',
    'Boleto/Financiamento': '📄', 'Impostos': '🏛️', 'Marketing': '📣',
    'Combustível': '⛽', 'Manutenção': '🛠️', 'Outros': '📦',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1001,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'fadeIn .2s ease',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        maxWidth: 460,
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        animation: 'slideUp .25s ease',
      }}>
        {/* Topo */}
        <div style={{
          background: temHoje
            ? 'linear-gradient(135deg,#dc2626,#ef4444)'
            : 'linear-gradient(135deg,#d97706,#f59e0b)',
          padding: '24px 28px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>{temHoje ? '🚨' : '⚠️'}</div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {temHoje
              ? `${venceHoje.length} conta${venceHoje.length > 1 ? 's' : ''} vence${venceHoje.length > 1 ? 'm' : ''} hoje!`
              : `${boletos.length} conta${boletos.length > 1 ? 's' : ''} vence${boletos.length > 1 ? 'm' : ''} amanhã!`}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            Total pendente: <strong>{fmt.currency(totalValor)}</strong>
          </div>
        </div>

        {/* Lista de boletos */}
        <div style={{ padding: '16px 24px', maxHeight: 260, overflowY: 'auto' }}>
          {venceHoje.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
                Vence hoje
              </div>
              {venceHoje.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#FEF2F2', borderRadius: 8,
                  marginBottom: 6, border: '1px solid #FECACA',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{CAT_ICONS[d.categoria] || '📦'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{d.descricao}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{d.categoria}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{fmt.currency(d.valor)}</span>
                </div>
              ))}
            </>
          )}

          {venceAmanha.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8, marginTop: venceHoje.length > 0 ? 12 : 0 }}>
                Vence amanhã
              </div>
              {venceAmanha.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#FFFBEB', borderRadius: 8,
                  marginBottom: 6, border: '1px solid #FDE68A',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{CAT_ICONS[d.categoria] || '📦'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{d.descricao}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{d.categoria} · vence {fmt.date(d.vencimento)}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>{fmt.currency(d.valor)}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Ações */}
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          <button
            onClick={() => setVisible(false)}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 8,
              border: '1.5px solid #E5E7EB', background: '#fff',
              fontSize: 14, fontWeight: 600, color: '#6B7280', cursor: 'pointer',
            }}
          >
            Fechar
          </button>
          <button
            onClick={() => {
              setVisible(false);
              window.location.href = '/app/financeiro';
            }}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 8,
              border: 'none',
              background: temHoje
                ? 'linear-gradient(135deg,#dc2626,#ef4444)'
                : 'linear-gradient(135deg,#d97706,#f59e0b)',
              fontSize: 14, fontWeight: 700, color: '#fff',
              cursor: 'pointer',
              boxShadow: temHoje ? '0 2px 8px rgba(220,38,38,.35)' : '0 2px 8px rgba(217,119,6,.35)',
            }}
          >
            💰 Ver no Financeiro
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Popup de aviso de vencimento ─────────────────────────────
function VencimentoAlert() {
  const user = getUser();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.data_vencimento) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(user.data_vencimento + 'T00:00:00');
    const diasRestantes = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
    if (diasRestantes >= 0 && diasRestantes <= 5) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const venc = new Date(user.data_vencimento + 'T00:00:00');
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diasRestantes = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
  const isHoje = diasRestantes === 0;
  const isAmanha = diasRestantes === 1;

  const fmtDate = iso => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'fadeIn .2s ease',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        maxWidth: 440,
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        animation: 'slideUp .25s ease',
      }}>
        {/* Topo colorido */}
        <div style={{
          background: isHoje
            ? 'linear-gradient(135deg,#dc2626,#ef4444)'
            : diasRestantes <= 2
            ? 'linear-gradient(135deg,#d97706,#f59e0b)'
            : 'linear-gradient(135deg,#1E3A5F,#2d5a8e)',
          padding: '28px 32px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {isHoje ? '🚨' : diasRestantes <= 2 ? '⚠️' : '🔔'}
          </div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {isHoje
              ? 'Plano vence hoje!'
              : isAmanha
              ? 'Plano vence amanhã!'
              : `Plano vence em ${diasRestantes} dias`}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            Vencimento: {fmtDate(user.data_vencimento)}
          </div>
        </div>

        {/* Corpo */}
        <div style={{ padding: '24px 32px 28px' }}>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
            {isHoje
              ? 'Seu plano vence hoje. Renove agora para não perder o acesso ao sistema.'
              : `Seu plano vence em ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}. Renove antes do prazo para garantir a continuidade do serviço.`}
          </p>

          <div style={{
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <span style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
              Entre em contato com o suporte para renovar seu plano e continuar usando o Chave 10 sem interrupções.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setVisible(false)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 8,
                border: '1.5px solid #E5E7EB', background: '#fff',
                fontSize: 14, fontWeight: 600, color: '#6B7280',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
            <button
              onClick={() => {
                setVisible(false);
                window.open('https://wa.me/5516992383821?text=Olá,%20preciso%20renovar%20meu%20plano%20do%20Chave%2010.', '_blank');
              }}
              style={{
                flex: 2, padding: '11px 0', borderRadius: 8,
                border: 'none',
                background: '#25D366',
                fontSize: 14, fontWeight: 700, color: '#fff',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 2px 8px rgba(37,211,102,.35)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Renovar pelo WhatsApp
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}

// ── Popup de parcelas a receber hoje ─────────────────────────
function ParcelasHojeAlert() {
  const [parcelas, setParcelas] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hojeStr = new Date().toISOString().split('T')[0];
    api.app.parcelasReceber.list()
      .then(data => {
        const dodia = (data || []).filter(p => !p.recebido && p.data_recebimento === hojeStr);
        if (dodia.length > 0) {
          setParcelas(dodia);
          // Só mostra 1x por sessão
          const key = 'c10_parcelas_alert_' + hojeStr;
          if (!sessionStorage.getItem(key)) {
            setVisible(true);
            sessionStorage.setItem(key, '1');
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!visible || parcelas.length === 0) return null;

  const fmt = {
    currency: v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  };
  const total = parcelas.reduce((s, p) => s + parseFloat(p.valor || 0), 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1002,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      animation: 'fadeIn .2s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, maxWidth: 440, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden',
        animation: 'slideUp .25s ease', margin: '0 auto',
      }}>
        <div style={{
          background: 'linear-gradient(135deg,#059669,#10b981)',
          padding: '24px 28px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>💰</div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            Hoje você recebe {fmt.currency(total)}!
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            {parcelas.length} parcela{parcelas.length > 1 ? 's' : ''} de cartão caindo na conta
          </div>
        </div>

        <div style={{ padding: '16px 24px', maxHeight: 220, overflowY: 'auto' }}>
          {parcelas.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', background: '#F0FDF4', borderRadius: 8,
              marginBottom: 6, border: '1px solid #BBF7D0',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>
                  OS #{String(p.os_id).padStart(4, '0')} · {p.cliente_nome || '—'}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{p.numero_parcela}ª parcela</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{fmt.currency(p.valor)}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          <button onClick={() => setVisible(false)} style={{
            flex: 1, padding: '11px 0', borderRadius: 8,
            border: '1.5px solid #E5E7EB', background: '#fff',
            fontSize: 14, fontWeight: 600, color: '#6B7280', cursor: 'pointer',
          }}>Fechar</button>
          <button onClick={() => { setVisible(false); window.location.href = '/app/financeiro'; }} style={{
            flex: 2, padding: '11px 0', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#059669,#10b981)',
            fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(5,150,105,.35)',
          }}>💳 Ver no Financeiro</button>
        </div>
      </div>
    </div>
  );
}

function UserDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="topbar-user" onClick={() => setOpen(o => !o)}>
        <div className="topbar-avatar">{user?.nome?.[0]?.toUpperCase() || 'U'}</div>
        <div className="topbar-user-info">
          <span className="topbar-user-name">{user?.nome || 'Usuário'}</span>
          <span className="topbar-user-role">{user?.perfil === 'master_admin' ? 'Administrador' : user?.perfil === 'funcionario' ? 'Funcionário' : 'Gerente'}</span>
        </div>
        <svg style={{ marginLeft: 4, color: 'var(--gray-400)', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="user-dropdown" style={{ display: 'block' }}>
          <div className="udrop-header">
            <div className="udrop-avatar">{user?.nome?.[0]?.toUpperCase() || 'U'}</div>
            <div>
              <div className="udrop-name">{user?.nome}</div>
              <div className="udrop-role">{user?.perfil === 'master_admin' ? 'Administrador' : user?.perfil === 'funcionario' ? 'Funcionário · oficina' : 'Gerente · oficina'}</div>
            </div>
          </div>
          <div className="udrop-divider" />
          <button className="udrop-item" onClick={() => { 
            setOpen(false); 
            navigate(user?.perfil === 'master_admin' ? '/admin/dashboard' : '/app/dashboard'); 
          }}>
            {IC.dashboard} Dashboard
          </button>
          {user?.perfil === 'master_admin' && (
            <button className="udrop-item" onClick={() => { setOpen(false); navigate('/admin/trocar-senha'); }}>
              {IC.configuracoes} Trocar Senha
            </button>
          )}
          {user?.perfil !== 'funcionario' && user?.perfil !== 'master_admin' && (
            <button className="udrop-item" onClick={() => { setOpen(false); navigate('/app/configuracoes'); }}>
              {IC.configuracoes} Configurações
            </button>
          )}
          <div className="udrop-divider" />
          <button className="udrop-item udrop-item-danger" onClick={() => { setOpen(false); onLogout(); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}

// URL de suporte WhatsApp
const SUPORTE_WA = 'https://wa.me/5516992383821?text=Olá,%20preciso%20de%20suporte%20com%20o%20Chave%2010.';

export default function Layout({ area }) {
  const [open, setOpen] = useState(false);
  const [notiCount, setNotiCount] = useState(0);
  const navigate = useNavigate();
  const user = getUser();
  
  // Hook para manter a sessão ativa e verificar expiração
  useAuth();

  // Polling de notificações a cada 30s
  useEffect(() => {
    if (area !== 'app') return;
    let active = true;
    async function checkNotis() {
      try {
        const res = await api.get('/app/notificacoes');
        if (active) setNotiCount(res.naoLidas || 0);
      } catch {}
    }
    checkNotis();
    const interval = setInterval(checkNotis, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [area]);

  // Tour guiado
  const { tourActive, currentStep, startTourDirect, nextStep, prevStep, endTour } = useOnboarding();

  // Inicia o tour manualmente (mesmo que já tenha feito antes)
  const startTourManually = () => {
    setOpen(false); // fecha sidebar mobile
    startTourDirect();
  };

  // Sincroniza dados do usuário com o servidor ao montar o layout
  // Garante que data_vencimento e status_assinatura estejam sempre atualizados
  useEffect(() => {
    if (area !== 'app') return;
    api.auth.me()
      .then(userData => {
        // Sincroniza em ambos os storages para garantir consistência
        const serialized = JSON.stringify(userData);
        localStorage.setItem('c10_user', serialized);
        sessionStorage.setItem('c10_user', serialized);
      })
      .catch(() => {
        // Silencioso — se falhar, usa os dados do localStorage mesmo
      });
  }, [area]);

  function logout() {
    localStorage.removeItem('c10_token');
    localStorage.removeItem('c10_user');
    sessionStorage.removeItem('c10_token');
    sessionStorage.removeItem('c10_user');
    navigate(area === 'admin' ? '/admin/login' : '/login');
  }

  const NavItem = ({ item }) => (
    <NavLink to={item.to}
      className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
      onClick={() => setOpen(false)}>
      <span className="nav-icon">{item.icon}</span>
      <span>{item.label}</span>
      {item.badge && <span className={`nav-badge ${item.badgeClass || ''}`}>{item.badge}</span>}
    </NavLink>
  );

  // Bottom nav items para mobile (os mais usados)
  const bottomNavItems = [
    { to: '/app/dashboard', label: 'Início',    icon: IC.dashboard },
    { to: '/app/clientes',  label: 'Clientes',  icon: IC.clientes },
    { to: '/app/os',        label: 'Nova OS',   icon: IC.os, isMain: true },
    { to: '/app/agenda',    label: 'Agenda',    icon: IC.agenda },
    { to: '/app/orcamentos',label: 'Orçamentos',icon: IC.orcamentos },
  ];

  return (
    <div className="app-shell">
      {open && <div className="sidebar-overlay open" onClick={() => setOpen(false)} />}
      {area === 'app' && user?.perfil !== 'master_admin' && <VencimentoAlert />}
      {area === 'app' && <BoletoAlert />}
      {area === 'app' && user?.perfil !== 'funcionario' && <ParcelasHojeAlert />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <img
            src="/teste sem fundo 2.png"
            alt="Chave 10"
            style={{ height: 64, maxWidth: 200, objectFit: 'contain' }}
          />
        </div>

        {area === 'admin' ? (
          <>
            <div className="sidebar-section-label">Administração</div>
            <nav className="sidebar-nav">
              {adminNav.map(item => <NavItem key={item.to} item={item} />)}
            </nav>
          </>
        ) : (
          <>
            <div className="sidebar-section-label">Principal</div>
            <nav className="sidebar-nav">
              {appNavPrincipal.map(item => <NavItem key={item.to} item={item} />)}
            </nav>
            <div className="sidebar-section-label">Gestão</div>
            <nav className="sidebar-nav">
              {appNavGestao
                .filter(item => user?.perfil !== 'funcionario' || !['/app/financeiro', '/app/relatorios', '/app/configuracoes'].includes(item.to))
                .map(item => <NavItem key={item.to} item={item} />)}
            </nav>
            {/* Botão de assinar — só aparece no trial */}
            {(user?.plano === 'trial' || !user?.plano) && user?.perfil !== 'master_admin' && (
              <div style={{ padding: '10px 12px 4px' }}>
                <NavLink
                  to="/app/planos"
                  onClick={() => setOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: isActive
                      ? 'rgba(249,115,22,.18)'
                      : 'rgba(249,115,22,.1)',
                    border: '1px solid rgba(249,115,22,.3)',
                    textDecoration: 'none',
                    transition: 'background .15s',
                  })}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#F97316', lineHeight: 1.2 }}>Assinar Plano</div>
                    <div style={{ fontSize: 10, color: 'rgba(249,115,22,.7)', lineHeight: 1.2 }}>R$29/mês — oferta limitada</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </NavLink>
              </div>
            )}
          </>
        )}

        <div className="sidebar-footer">
          {/* Botão Tour Guiado — só na área app */}
          {area === 'app' && (
            <button
              onClick={startTourManually}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                margin: '0 0 8px 0',
                width: '100%',
                background: 'rgba(249,115,22,.08)',
                border: '1px solid rgba(249,115,22,.2)',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                transition: 'background .15s',
                textAlign: 'left',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(249,115,22,.16)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(249,115,22,.08)'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#F97316', lineHeight: 1.2 }}>Tour guiado</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', lineHeight: 1.2 }}>Ver tutorial do sistema</div>
              </div>
            </button>
          )}

          {/* Botão de suporte WhatsApp */}
          <a
            href={SUPORTE_WA}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              margin: '0 0 8px 0',
              background: 'rgba(37,211,102,.12)',
              border: '1px solid rgba(37,211,102,.25)',
              borderRadius: 'var(--r-sm)',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'background .15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(37,211,102,.22)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(37,211,102,.12)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#25D366' }}>Suporte</div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Falar no WhatsApp</div>
            </div>
          </a>

          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.nome?.[0]?.toUpperCase() || 'U'}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.nome || 'Usuário'}</span>
              <span className="sidebar-user-role">{user?.perfil === 'master_admin' ? 'Administrador' : 'Oficina'}</span>
            </div>
            <button className="btn-logout-icon" onClick={logout} title="Sair">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setOpen(o => !o)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="topbar-logo">
            <img
              src="/teste sem fundo 2.png"
              alt="Chave 10"
              style={{ height: 68, maxWidth: 160, objectFit: 'contain' }}
            />
          </div>

          {area === 'app' && <GlobalSearch />}

          <div className="topbar-right">
            {area === 'app' && (
              <>
                <div className="topbar-quick-actions">
                  <button className="btn btn-primary btn-sm topbar-action-btn" onClick={() => navigate('/app/os')} title="Nova OS">
                    {IC.os}
                    <span className="action-label">Nova OS</span>
                  </button>
                  <button className="btn btn-outline btn-sm topbar-action-btn" onClick={() => navigate('/app/clientes')} title="Novo Cliente">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    <span className="action-label">Cliente</span>
                  </button>
                  <button className="btn btn-outline btn-sm topbar-action-btn" onClick={() => navigate('/app/orcamentos')} title="Novo Orçamento">
                    {IC.orcamentos}
                    <span className="action-label">Orçamento</span>
                  </button>
                </div>
                <div className="topbar-divider" />
                <button className="topbar-btn" title="Notificações" onClick={() => navigate('/app/notificacoes')} style={{ position: 'relative' }}>
                  {IC.notificacoes}
                  {notiCount > 0 && (
                    <span style={{
                      position:'absolute',top:2,right:2,width:16,height:16,borderRadius:'50%',
                      background:'#dc2626',color:'#fff',fontSize:9,fontWeight:800,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      border:'2px solid var(--gray-900,#161b22)',
                    }}>{notiCount>9?'9+':notiCount}</span>
                  )}
                </button>
                <div className="topbar-divider" />
              </>
            )}
            <UserDropdown user={user} onLogout={logout} />
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation Mobile — dark theme */}
      {area === 'app' && (
        <nav className="mobile-bottom-nav">
          {[
            { to: '/app/dashboard', label: 'Dashboard', icon: IC.dashboard },
            { to: '/app/os',        label: 'OS',        icon: IC.os },
            { to: '/app/clientes',  label: 'Clientes',  icon: IC.clientes },
            { to: '/app/financeiro',label: 'Financeiro',icon: IC.financeiro },
            { to: '/app/agenda',    label: 'Mais',      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>, onClick: () => setOpen(true) },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'mbn-item' + (isActive ? ' mbn-item--active' : '')}
              onClick={item.onClick}
            >
              <span className="mbn-icon">{item.icon}</span>
              <span className="mbn-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Botão de instalação PWA — aparece após login, some após instalar */}
      <PWAInstallButton />

      {/* Indicador de status offline/sincronização */}
      <OfflineIndicator />

      {/* Tour guiado — só na área app */}
      {area === 'app' && (
        <OnboardingTour
          isActive={tourActive}
          currentStep={currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onEnd={endTour}
        />
      )}
    </div>
  );
}


