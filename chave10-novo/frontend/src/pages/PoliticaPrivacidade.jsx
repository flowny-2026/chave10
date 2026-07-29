import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

export default function PoliticaPrivacidade() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <img src="/teste sem fundo 2.png" alt="Chave 10" className="lp-logo-img" style={{cursor:'pointer'}} onClick={() => navigate('/')} />
          <button className="lp-nav-cta" onClick={() => navigate('/cadastro')}>Teste grátis 7 dias</button>
        </div>
      </nav>

      <section style={{padding:'120px 0 80px',background:'#fff',minHeight:'100vh'}}>
        <div className="lp-container" style={{maxWidth:760}}>
          <h1 style={{fontFamily:'Poppins,sans-serif',fontSize:'2rem',fontWeight:800,color:'#1E3A5F',marginBottom:8}}>Política de Privacidade</h1>
          <p style={{color:'#64748b',marginBottom:32,fontSize:14}}>Última atualização: 28 de julho de 2026</p>

          <div style={{fontSize:15,lineHeight:1.8,color:'#334155'}}>
            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>1. Informações que coletamos</h2>
            <p>Ao utilizar o Chave 10, coletamos as seguintes informações:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Dados de cadastro: nome, e-mail, telefone, nome da oficina</li>
              <li>Dados operacionais: clientes, veículos, ordens de serviço, orçamentos, despesas</li>
              <li>Dados de uso: páginas acessadas, funcionalidades utilizadas, horários de acesso</li>
              <li>Dados técnicos: endereço IP, navegador, dispositivo</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>2. Como usamos suas informações</h2>
            <p>Utilizamos seus dados para:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Fornecer e manter o serviço do Chave 10</li>
              <li>Melhorar e personalizar sua experiência</li>
              <li>Enviar comunicações sobre o serviço (atualizações, suporte)</li>
              <li>Garantir a segurança da plataforma</li>
              <li>Gerar relatórios e análises para sua oficina</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>3. Compartilhamento de dados</h2>
            <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing. Seus dados podem ser compartilhados apenas:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Com provedores de infraestrutura necessários para operar o serviço (hospedagem, banco de dados)</li>
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Para proteger os direitos e segurança do Chave 10 e seus usuários</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>4. Segurança dos dados</h2>
            <p>Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Criptografia em trânsito (HTTPS/TLS)</li>
              <li>Backups automáticos diários</li>
              <li>Controle de acesso por autenticação</li>
              <li>Monitoramento de segurança contínuo</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>5. Seus direitos</h2>
            <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou inexatos</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Exportar seus dados em formato legível</li>
              <li>Revogar o consentimento a qualquer momento</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>6. Retenção de dados</h2>
            <p>Mantemos seus dados enquanto sua conta estiver ativa. Após o cancelamento, seus dados são mantidos por 30 dias para possível reativação e depois excluídos permanentemente.</p>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>7. Cookies</h2>
            <p>Utilizamos cookies essenciais para o funcionamento do sistema (autenticação e preferências). Não utilizamos cookies de rastreamento de terceiros.</p>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>8. Contato</h2>
            <p>Para dúvidas sobre privacidade ou exercer seus direitos, entre em contato:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>E-mail: chave10sistema@gmail.com</li>
              <li>WhatsApp: (16) 99291-5540</li>
              <li>Instagram: @chave10gestao</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>9. Alterações</h2>
            <p>Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas por e-mail ou pelo sistema.</p>
          </div>

          <div style={{marginTop:48,paddingTop:24,borderTop:'1px solid #e2e8f0'}}>
            <button className="lp-btn-primary" onClick={() => navigate('/')}>← Voltar para o início</button>
          </div>
        </div>
      </section>
    </div>
  );
}
