import { useState, useEffect } from 'react';

const WA_LINK = 'https://wa.me/5516992383821?text=Olá%2C%20quero%20garantir%20minha%20vaga%20no%20plano%20de%20lançamento%20do%20Chave%2010%20por%20R%2429%2Fmês!';

function getUser() {
  try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; }
}

export default function AppPlanos() {
  const user = getUser();
  const isTrial = user?.plano === 'trial' || !user?.plano;
  const [diasRestantes, setDiasRestantes] = useState(null);
  const [dataVencFormatada, setDataVencFormatada] = useState('');

  useEffect(() => {
    if (user?.data_vencimento) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const venc = new Date(user.data_vencimento + 'T00:00:00');
      const dias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
      setDiasRestantes(dias);
      // Formata a data de vencimento
      const [y, m, d] = user.data_vencimento.split('-');
      setDataVencFormatada(`${d}/${m}/${y}`);
    }
  }, []);

  const beneficios = [
    'Cadastro ilimitado de clientes',
    'Controle completo de veículos',
    'Ordens de serviço ilimitadas',
    'Orçamentos enviados pelo WhatsApp',
    'Controle financeiro e despesas',
    'Relatórios e dashboard completo',
    'Agenda de serviços',
    'Estoque de peças',
    'Acesso rápido e fácil — funciona no celular',
  ];

  return (
    <div className="planos-page" style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* BANNER TRIAL */}
      {isTrial && diasRestantes !== null && (
        <div style={{
          background: 'linear-gradient(135deg, #1E3A5F, #2d5a8e)',
          borderRadius: 14,
          padding: '16px 24px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 28 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              Você está no período de teste gratuito
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)' }}>
              {diasRestantes > 0
                ? `Seu trial vence em ${dataVencFormatada} — ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''} restante${diasRestantes > 1 ? 's' : ''}. Assine agora e não perca o acesso.`
                : 'Seu trial venceu. Assine agora para continuar usando.'}
            </div>
          </div>
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
            style={{ background: '#F97316', color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Assinar agora →
          </a>
        </div>
      )}

      {/* HERO */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#FFF3E0', border: '1px solid #F97316',
          borderRadius: 20, padding: '5px 14px',
          fontSize: 12, fontWeight: 700, color: '#F97316',
          marginBottom: 16, letterSpacing: '.4px',
        }}>
          🔥 OFERTA DE LANÇAMENTO — VAGAS LIMITADAS
        </div>

        <h1 style={{
          fontFamily: 'Poppins, sans-serif',
          fontSize: 30, fontWeight: 800,
          color: 'var(--planos-hero-title, #1E3A5F)', lineHeight: 1.2,
          marginBottom: 12,
        }}>
          A ferramenta que faltava<br />na sua gestão
        </h1>

        <p style={{ fontSize: 15, color: 'var(--planos-hero-sub, #6B7280)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
          Organize sua oficina, controle serviços e acompanhe seu faturamento de forma simples — tudo em um só lugar.
        </p>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="planos-card-principal" style={{
        background: 'var(--planos-card-bg, #fff)',
        borderRadius: 20,
        border: '2px solid #F97316',
        boxShadow: '0 8px 40px rgba(249,115,22,.15)',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        {/* Faixa topo */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A5F, #2563eb)',
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 4 }}>
              Plano Completo
            </div>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff' }}>
              Chave 10 — Profissional
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textDecoration: 'line-through', marginBottom: 2 }}>
              De R$ 59/mês
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 42, fontWeight: 900, color: '#F97316', lineHeight: 1 }}>R$29</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', marginBottom: 6 }}>/mês</span>
            </div>
          </div>
        </div>

        {/* Urgência — sem barra de vagas */}
        <div className="planos-urgencia" style={{
          background: 'var(--planos-urgencia-bg, #FFF3E0)',
          borderBottom: '1px solid var(--planos-urgencia-border, #FED7AA)',
          padding: '10px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span className="planos-urgencia-text" style={{ fontSize: 13, fontWeight: 700, color: 'var(--planos-urgencia-color, #C2410C)' }}>
            Apenas para os 10 primeiros clientes — vagas promocionais limitadas
          </span>
        </div>

        {/* Benefícios */}
        <div className="planos-body" style={{ padding: '28px 32px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--planos-label-color, #6B7280)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 16 }}>
            Tudo incluído no plano:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 28 }}>
            {beneficios.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#FFF3E0', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13.5, color: 'var(--planos-item-color, #374151)' }}>{b}</span>
              </div>
            ))}
          </div>

          {/* Garantias */}
          <div className="planos-garantias" style={{
            display: 'flex', gap: 16, flexWrap: 'wrap',
            background: 'var(--planos-garantias-bg, #F9FAFB)', borderRadius: 10,
            padding: '14px 18px', marginBottom: 24,
          }}>
            {[
              { icon: '🔓', text: 'Sem fidelidade' },
              { icon: '❌', text: 'Cancele quando quiser' },
              { icon: '💾', text: 'Dados sempre salvos' },
              { icon: '📱', text: 'Funciona no celular' },
            ].map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--planos-garantia-color, #6B7280)' }}>
                <span>{g.icon}</span> {g.text}
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              color: '#fff',
              borderRadius: 12,
              padding: '16px 0',
              fontSize: 16,
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(249,115,22,.45)',
              transition: 'transform .15s, box-shadow .15s',
              letterSpacing: '.2px',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(249,115,22,.55)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(249,115,22,.45)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            Quero garantir minha vaga — R$29/mês
          </a>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>
            Após as 10 primeiras assinaturas, o valor volta para <strong>R$59/mês</strong>
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="planos-faq" style={{ background: 'var(--planos-faq-bg, #F9FAFB)', borderRadius: 14, padding: '24px 28px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--planos-faq-title, #1E3A5F)', marginBottom: 18 }}>❓ Dúvidas frequentes</div>
        {[
          { p: 'Como funciona o pagamento?', r: 'Pagamento somente via PIX. Após entrar em contato pelo WhatsApp, enviamos a chave PIX para você realizar o pagamento e ativar o plano.' },
          { p: 'Posso cancelar a qualquer momento?', r: 'Sim, sem fidelidade. Cancele quando quiser pelo WhatsApp, sem burocracia.' },
          { p: 'O que acontece com meus dados se eu cancelar?', r: 'Seus dados ficam salvos por 30 dias. Se voltar, tudo estará lá.' },
          { p: 'Funciona no celular?', r: 'Sim! O sistema é responsivo e pode ser instalado como app no celular (PWA).' },
        ].map((faq, i) => (
          <div key={i} style={{ marginBottom: i < 3 ? 16 : 0, paddingBottom: i < 3 ? 16 : 0, borderBottom: i < 3 ? '1px solid var(--planos-faq-border, #E5E7EB)' : 'none' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--planos-faq-q, #1F2937)', marginBottom: 4 }}>{faq.p}</div>
            <div style={{ fontSize: 13, color: 'var(--planos-faq-a, #6B7280)', lineHeight: 1.6 }}>{faq.r}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
