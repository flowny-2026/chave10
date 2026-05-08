import { useState, useEffect } from 'react';

const CHECK = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const X     = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

function getUser() {
  try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; }
}

export default function AppPlanos() {
  const user = getUser();
  const dataVenc = user?.data_vencimento;
  const statusAssinatura = user?.status_assinatura;
  const planoAtual = user?.plano || 'trial';
  
  const [diasRestantes, setDiasRestantes] = useState(null);
  const [statusInfo, setStatusInfo] = useState({ tipo: 'active', mensagem: '', cor: '' });

  useEffect(() => {
    if (dataVenc) {
      const hoje = new Date();
      const vencimento = new Date(dataVenc);
      const dias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
      setDiasRestantes(dias);

      // Define status visual
      if (statusAssinatura === 'overdue') {
        setStatusInfo({
          tipo: 'overdue',
          mensagem: 'Assinatura vencida',
          cor: '#dc2626',
          bgCor: '#fef2f2',
        });
      } else if (statusAssinatura === 'blocked') {
        setStatusInfo({
          tipo: 'blocked',
          mensagem: 'Acesso bloqueado',
          cor: '#991b1b',
          bgCor: '#fef2f2',
        });
      } else if (dias <= 0) {
        setStatusInfo({
          tipo: 'expiring',
          mensagem: 'Vence hoje',
          cor: '#ea580c',
          bgCor: '#fff7ed',
        });
      } else if (dias <= 3) {
        setStatusInfo({
          tipo: 'warning',
          mensagem: `Vence em ${dias} dia${dias > 1 ? 's' : ''}`,
          cor: '#f59e0b',
          bgCor: '#fffbeb',
        });
      } else {
        setStatusInfo({
          tipo: 'active',
          mensagem: 'Ativa',
          cor: '#16a34a',
          bgCor: '#f0fdf4',
        });
      }
    }
  }, [dataVenc, statusAssinatura]);

  const formatarData = (data) => {
    if (!data) return '—';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Planos e Assinatura</div><div className="page-subtitle">Gerencie sua assinatura do Chave 10</div></div>
      </div>

      {/* CARD DE STATUS DA ASSINATURA */}
      <div style={{
        background: '#fff',
        borderRadius: 'var(--r-lg)',
        padding: '28px 32px',
        marginBottom: 32,
        border: '2px solid var(--gray-200)',
        boxShadow: 'var(--sh-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: statusInfo.bgCor,
                color: statusInfo.cor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}>
                {statusInfo.tipo === 'active' ? '✓' : statusInfo.tipo === 'blocked' ? '🔒' : '⚠️'}
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 2 }}>Status da Assinatura</div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: statusInfo.cor,
                }}>
                  {statusInfo.mensagem}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Plano Atual</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-800)' }}>
                  {planoAtual === 'trial' ? '🎁 Trial (7 dias)' : planoAtual === 'mensal' ? '💼 Profissional' : planoAtual}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Data de Vencimento</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-800)' }}>
                  {formatarData(dataVenc)}
                </div>
              </div>
              {diasRestantes !== null && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Dias Restantes</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: diasRestantes <= 3 ? statusInfo.cor : 'var(--gray-800)' }}>
                    {diasRestantes > 0 ? `${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}` : diasRestantes === 0 ? 'Vence hoje' : 'Vencido'}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Valor Mensal</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-800)' }}>
                  {planoAtual === 'trial' ? 'R$ 0,00' : 'R$ 29,00'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
            {(statusInfo.tipo === 'overdue' || statusInfo.tipo === 'blocked' || statusInfo.tipo === 'expiring' || statusInfo.tipo === 'warning') && (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px 20px' }}
                onClick={() => window.open('https://wa.me/5516992915540?text=Ol%C3%A1%2C%20preciso%20renovar%20minha%20assinatura%20do%20Chave%2010', '_blank')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                💳 Renovar Agora
              </button>
            )}
            <button
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => window.open('https://wa.me/5516992915540?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20minha%20assinatura%20do%20Chave%2010', '_blank')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Falar com Suporte
            </button>
          </div>
        </div>
      </div>

      {/* PLANOS DISPONÍVEIS */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8 }}>Planos Disponíveis</h3>
        <p style={{ fontSize: 14, color: 'var(--gray-500)' }}>Escolha o plano ideal para sua oficina</p>
      </div>

      <div className="planos-wrap">

        {/* Profissional — destaque */}
        <div className="plano-card plano-destaque">
          <div className="plano-selo">⭐ Mais escolhido</div>
          <div className="plano-nome">Plano Profissional</div>
          <div className="plano-preco-wrap">
            <span className="plano-preco">R$29</span>
            <span className="plano-periodo">/mês</span>
          </div>
          <div className="plano-urgencia">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Oferta exclusiva para os primeiros clientes
          </div>
          <div className="plano-depois">Depois será R$49/mês</div>
          <p className="plano-sem-fidelidade">Sem fidelidade • Cancele quando quiser</p>
          <ul className="plano-lista">
            <li>{CHECK} Clientes ilimitados</li>
            <li>{CHECK} Veículos ilimitados</li>
            <li>{CHECK} Ordens de serviço ilimitadas</li>
            <li>{CHECK} Orçamentos via WhatsApp</li>
            <li>{CHECK} Relatórios e dashboard completo</li>
            <li>{CHECK} Controle de estoque</li>
            <li>{CHECK} Agenda de serviços</li>
            <li>{CHECK} Suporte prioritário</li>
          </ul>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:13,fontSize:15}}
            onClick={()=>window.open('https://wa.me/5516992915540?text=Ol%C3%A1%2C%20quero%20assinar%20o%20plano%20Profissional%20de%20R%2429%20do%20Chave%2010.','_blank')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            Quero esse plano
          </button>
        </div>

        {/* Trial */}
        <div className="plano-card">
          <div className="plano-nome">Trial Gratuito</div>
          <div className="plano-preco-wrap">
            <span className="plano-preco">R$0</span>
            <span className="plano-periodo">/7 dias</span>
          </div>
          <p className="plano-desc">Teste todas as funcionalidades por 7 dias gratuitamente.</p>
          <ul className="plano-lista">
            <li>{CHECK} Acesso completo por 7 dias</li>
            <li>{CHECK} Clientes ilimitados</li>
            <li>{CHECK} Veículos ilimitados</li>
            <li>{CHECK} Ordens de serviço ilimitadas</li>
            <li>{CHECK} Orçamentos via WhatsApp</li>
            <li>{CHECK} Relatórios e dashboard</li>
            <li>{CHECK} Controle de estoque</li>
            <li>{CHECK} Suporte por WhatsApp</li>
          </ul>
          {planoAtual === 'trial' ? (
            <button className="btn btn-outline" style={{width:'100%',justifyContent:'center'}} disabled>
              ✓ Plano atual
            </button>
          ) : (
            <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center'}} disabled>
              Trial já utilizado
            </button>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: 48, background: 'var(--gray-50)', borderRadius: 'var(--r-lg)', padding: '28px 32px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 20 }}>❓ Perguntas Frequentes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>Como funciona o pagamento?</div>
            <div style={{ fontSize: 13.5, color: 'var(--gray-600)', lineHeight: 1.6 }}>
              Entre em contato pelo WhatsApp e enviaremos o link de pagamento. Aceitamos PIX, cartão de crédito e boleto.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>Posso cancelar a qualquer momento?</div>
            <div style={{ fontSize: 13.5, color: 'var(--gray-600)', lineHeight: 1.6 }}>
              Sim! Não há fidelidade. Você pode cancelar quando quiser pelo WhatsApp.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>O que acontece se eu não renovar?</div>
            <div style={{ fontSize: 13.5, color: 'var(--gray-600)', lineHeight: 1.6 }}>
              Após o vencimento, você tem 3 dias de tolerância. Depois disso, o acesso é bloqueado até a renovação. Seus dados ficam salvos.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>Preciso de ajuda?</div>
            <div style={{ fontSize: 13.5, color: 'var(--gray-600)', lineHeight: 1.6 }}>
              Fale conosco pelo WhatsApp: <a href="https://wa.me/5516992915540" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>(16) 99291-5540</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
