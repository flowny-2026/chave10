import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    // Simula envio (por enquanto apenas mostra mensagem)
    setTimeout(() => {
      setLoading(false);
      setEnviado(true);
    }, 1500);
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #0d1b2e 0%, #1a2942 100%)',
      padding: 20
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: 480, 
        background: '#fff', 
        borderRadius: 16, 
        padding: '48px 40px', 
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)' 
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/teste sem fundo 1.png" alt="Chave 10" style={{ height: 58, objectFit: 'contain' }} />
        </div>

        {!enviado ? (
          <>
            {/* Ícone */}
            <div style={{ 
              width: 64, 
              height: 64, 
              margin: '0 auto 24px', 
              background: 'var(--accent-light)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: 32
            }}>
              🔑
            </div>

            <h1 style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              color: 'var(--gray-900)', 
              marginBottom: 8,
              textAlign: 'center'
            }}>
              Esqueceu sua senha?
            </h1>
            
            <p style={{ 
              fontSize: 14, 
              color: 'var(--gray-500)', 
              marginBottom: 32,
              textAlign: 'center',
              lineHeight: 1.6
            }}>
              Sem problemas! Entre em contato com o suporte pelo WhatsApp e nossa equipe irá ajudá-lo a recuperar o acesso à sua conta.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label>Seu e-mail cadastrado</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="seu@email.com" 
                  required 
                  autoFocus
                />
                <small style={{ 
                  display: 'block', 
                  marginTop: 6, 
                  fontSize: 12, 
                  color: 'var(--gray-400)' 
                }}>
                  Digite o e-mail que você usa para acessar o sistema
                </small>
              </div>

              <button 
                className="btn btn-primary" 
                type="submit" 
                disabled={loading}
                style={{ width: '100%', marginBottom: 16 }}
              >
                {loading ? 'Processando...' : 'Solicitar recuperação'}
              </button>

              <button 
                type="button"
                className="btn btn-outline" 
                onClick={() => navigate('/login')}
                style={{ width: '100%' }}
              >
                ← Voltar para o login
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Sucesso */}
            <div style={{ 
              width: 80, 
              height: 80, 
              margin: '0 auto 24px', 
              background: 'var(--success-bg)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: 48
            }}>
              ✅
            </div>

            <h1 style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              color: 'var(--gray-900)', 
              marginBottom: 12,
              textAlign: 'center'
            }}>
              Solicitação recebida!
            </h1>
            
            <p style={{ 
              fontSize: 14, 
              color: 'var(--gray-600)', 
              marginBottom: 32,
              textAlign: 'center',
              lineHeight: 1.7
            }}>
              Recebemos sua solicitação para o e-mail <strong>{email}</strong>.
              <br/><br/>
              Entre em contato com nosso suporte pelo WhatsApp para concluir a recuperação da sua senha.
            </p>

            <button 
              className="btn btn-primary" 
              onClick={() => window.open('https://wa.me/5516992383821?text=Olá,%20preciso%20recuperar%20minha%20senha%20do%20Chave%2010.%20Meu%20e-mail%20é:%20' + encodeURIComponent(email), '_blank')}
              style={{ 
                width: '100%', 
                marginBottom: 12,
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Falar com o suporte
            </button>

            <button 
              className="btn btn-outline" 
              onClick={() => navigate('/login')}
              style={{ width: '100%' }}
            >
              Voltar para o login
            </button>
          </>
        )}

        {/* Informação adicional */}
        <div style={{
          marginTop: 32,
          padding: '16px 20px',
          background: 'var(--gray-50)',
          borderRadius: 12,
          border: '1px solid var(--gray-100)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: 12 
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
            <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>
              <strong>Dica de segurança:</strong> Nossa equipe nunca pedirá sua senha por WhatsApp ou e-mail. Apenas ajudaremos você a criar uma nova senha de forma segura.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


