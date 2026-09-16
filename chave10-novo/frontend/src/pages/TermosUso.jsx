import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import '../styles/landing.css';

export default function TermosUso() {
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

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
          <h1 style={{fontFamily:'Poppins,sans-serif',fontSize:'2rem',fontWeight:800,color:'#1E3A5F',marginBottom:8}}>Termos de Uso</h1>
          <p style={{color:'#64748b',marginBottom:32,fontSize:14}}>Última atualização: 28 de julho de 2026</p>

          <div style={{fontSize:15,lineHeight:1.8,color:'#334155'}}>
            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>1. Aceitação dos termos</h2>
            <p>Ao acessar e utilizar o Chave 10, você concorda com estes Termos de Uso. Se não concordar com algum dos termos, não utilize o serviço.</p>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>2. Descrição do serviço</h2>
            <p>O Chave 10 é um sistema de gestão online para oficinas mecânicas que permite:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Gerenciar clientes e veículos</li>
              <li>Criar e controlar ordens de serviço</li>
              <li>Gerar e enviar orçamentos</li>
              <li>Controlar o financeiro da oficina</li>
              <li>Gerenciar estoque de peças</li>
              <li>Acessar relatórios e métricas</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>3. Cadastro e conta</h2>
            <p>Para utilizar o Chave 10, você deve:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Fornecer informações verdadeiras e atualizadas</li>
              <li>Manter a segurança da sua senha</li>
              <li>Ser responsável por todas as atividades realizadas em sua conta</li>
              <li>Notificar imediatamente sobre uso não autorizado</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>4. Planos e pagamento</h2>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>O período de teste gratuito é de 7 dias</li>
              <li>Após o teste, é necessário contratar um plano para continuar usando</li>
              <li>Os pagamentos são mensais e recorrentes</li>
              <li>O não pagamento resultará na suspensão do acesso após o período de carência</li>
              <li>Não há multa por cancelamento</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>5. Uso aceitável</h2>
            <p>Ao usar o Chave 10, você concorda em NÃO:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Utilizar o sistema para fins ilegais</li>
              <li>Tentar acessar dados de outros usuários</li>
              <li>Sobrecarregar os servidores intencionalmente</li>
              <li>Reproduzir, modificar ou distribuir o sistema</li>
              <li>Utilizar automações não autorizadas contra a plataforma</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>6. Propriedade intelectual</h2>
            <p>O Chave 10, incluindo seu código, design, marca e conteúdo, é propriedade exclusiva de seus criadores. Você recebe apenas uma licença de uso limitada e não exclusiva enquanto mantiver uma conta ativa.</p>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>7. Seus dados</h2>
            <p>Você é o proprietário dos dados que insere no sistema. O Chave 10 não reivindica propriedade sobre seus dados de clientes, veículos, ordens de serviço ou qualquer informação que você cadastrar.</p>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>8. Disponibilidade</h2>
            <p>Nos esforçamos para manter o sistema disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência sempre que possível.</p>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>9. Limitação de responsabilidade</h2>
            <p>O Chave 10 é fornecido "como está". Não nos responsabilizamos por:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Perdas decorrentes de indisponibilidade temporária</li>
              <li>Decisões de negócio baseadas em dados do sistema</li>
              <li>Danos indiretos ou consequenciais</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>10. Cancelamento</h2>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>Você pode cancelar sua conta a qualquer momento</li>
              <li>Após o cancelamento, seus dados ficam disponíveis para exportação por 30 dias</li>
              <li>Após 30 dias, os dados são excluídos permanentemente</li>
              <li>O Chave 10 pode encerrar contas que violem estes termos</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>11. Alterações nos termos</h2>
            <p>Podemos atualizar estes termos periodicamente. Alterações significativas serão comunicadas por e-mail ou pelo sistema com pelo menos 15 dias de antecedência.</p>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>12. Contato</h2>
            <p>Para dúvidas sobre estes termos:</p>
            <ul style={{paddingLeft:20,margin:'12px 0'}}>
              <li>E-mail: chave10sistema@gmail.com</li>
              <li>WhatsApp: (16) 99238-3821</li>
              <li>Instagram: @chave10gestao</li>
            </ul>

            <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#1E3A5F',margin:'32px 0 12px'}}>13. Foro</h2>
            <p>Fica eleito o foro da comarca de Ribeirão Preto/SP para dirimir quaisquer questões decorrentes destes termos.</p>
          </div>

          <div style={{marginTop:48,paddingTop:24,borderTop:'1px solid #e2e8f0'}}>
            <button className="lp-btn-primary" onClick={() => { navigate('/'); window.scrollTo(0, 0); }}>← Voltar para o início</button>
          </div>
        </div>
      </section>
    </div>
  );
}
