import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../api';
import { useForm } from '../hooks/useForm';
import FormInput from '../components/FormInput';
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validatePhone,
  validateRequired,
  maskPhone,
  maskDocumento,
} from '../utils/validation';

export default function Cadastro() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [erro, setErro] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Se veio do login Google com ?step=2, pula direto para dados da oficina
  useEffect(() => {
    if (searchParams.get('step') === '2') {
      const token = localStorage.getItem('c10_token_temp');
      if (token) {
        setTempToken(token);
        localStorage.removeItem('c10_token_temp');
        setStep(2);
      }
    }
  }, []);

  // Form de dados pessoais com validação
  const formPessoal = useForm(
    { nome: '', email: '', senha: '', confirmarSenha: '' },
    async (values) => {
      setErro('');
      const { token } = await api.auth.register({ 
        nome: values.nome, 
        email: values.email, 
        senha: values.senha 
      });
      setTempToken(token);
      setStep(2);
    },
    {
      nome: [validateName],
      email: [validateEmail],
      senha: [(v) => validatePassword(v, 6)],
      confirmarSenha: [(v) => {
        if (!v) return 'Confirmação de senha é obrigatória';
        if (v !== formPessoal.values.senha) return 'As senhas não coincidem';
        return null;
      }]
    }
  );

  // Form de dados da oficina com validação
  const formOficina = useForm(
    { nome_oficina: '', cnpj_cpf: '', telefone: '', endereco: '', logo: '' },
    async (values) => {
      setErro('');
      const { token, usuario } = await api.auth.completeOficina(tempToken, values);
      localStorage.setItem('c10_token', token);
      localStorage.setItem('c10_user', JSON.stringify(usuario));
      navigate('/app/dashboard');
    },
    {
      nome_oficina: [validateRequired],
      telefone: [validatePhone]
    }
  );

  async function handleCadastroSubmit(e) {
    try {
      await formPessoal.handleSubmit(e);
    } catch (err) {
      setErro(err.error || 'Erro ao criar conta');
    }
  }

  async function handleOficinaSubmit(e) {
    try {
      await formOficina.handleSubmit(e);
    } catch (err) {
      setErro(err.error || 'Erro ao salvar dados da oficina');
    }
  }

  async function handleGoogleSuccess({ credential }) {
    setErro('');
    try {
      const { token, needsOficina, usuario } = await api.auth.googleRegister(credential);
      if (needsOficina) {
        setTempToken(token);
        setStep(2);
      } else {
        localStorage.setItem('c10_token', token);
        if (usuario) localStorage.setItem('c10_user', JSON.stringify(usuario));
        navigate('/app/dashboard');
      }
    } catch (err) {
      setErro(err.error || 'Erro ao cadastrar com Google');
    }
  }

  if (step === 2) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0d1b2e 0%, #1a2f4a 100%)' }}>
        <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16, padding: '40px', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--brand)', letterSpacing: '-0.5px', marginBottom: 8 }}>
              Chave <span style={{ color: 'var(--accent)' }}>10</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>Dados da sua oficina</h1>
            <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Complete seu cadastro com as informações da oficina</p>
          </div>

          <form onSubmit={handleOficinaSubmit}>
            <FormInput
              label="Nome da oficina"
              name="nome_oficina"
              value={formOficina.values.nome_oficina}
              error={formOficina.errors.nome_oficina}
              touched={formOficina.touched.nome_oficina}
              onChange={formOficina.handleChange}
              onBlur={formOficina.handleBlur}
              placeholder="Ex: Oficina do João"
              required
            />
            
            <FormInput
              label="CNPJ ou CPF"
              name="cnpj_cpf"
              value={formOficina.values.cnpj_cpf}
              error={formOficina.errors.cnpj_cpf}
              touched={formOficina.touched.cnpj_cpf}
              onChange={formOficina.handleChange}
              onBlur={formOficina.handleBlur}
              placeholder="00.000.000/0000-00"
              mask={maskDocumento}
            />
            
            <FormInput
              label="Telefone"
              name="telefone"
              value={formOficina.values.telefone}
              error={formOficina.errors.telefone}
              touched={formOficina.touched.telefone}
              onChange={formOficina.handleChange}
              onBlur={formOficina.handleBlur}
              placeholder="(00) 00000-0000"
              mask={maskPhone}
              required
            />
            
            <FormInput
              label="Endereço"
              name="endereco"
              value={formOficina.values.endereco}
              error={formOficina.errors.endereco}
              touched={formOficina.touched.endereco}
              onChange={formOficina.handleChange}
              onBlur={formOficina.handleBlur}
              placeholder="Rua, número, bairro, cidade"
            />
            
            <FormInput
              label="Logo (URL)"
              name="logo"
              value={formOficina.values.logo}
              error={formOficina.errors.logo}
              touched={formOficina.touched.logo}
              onChange={formOficina.handleChange}
              onBlur={formOficina.handleBlur}
              placeholder="https://..."
              helpText="Opcional: URL da logo da sua oficina"
            />

            {erro && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>{erro}</div>}

            <button className="btn btn-primary" type="submit" disabled={formOficina.isSubmitting} style={{ width: '100%' }}>
              {formOficina.isSubmitting ? 'Salvando...' : 'Concluir cadastro'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-left">
        <div className="login-left-content">
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', marginBottom: 24 }}>
            Chave <span style={{ color: '#F97316' }}>10</span>
          </div>
          <h2 className="login-headline">Organize sua oficina.<br />Cresça com dados.</h2>
          <p className="login-desc">Controle ordens de serviço, clientes, veículos e faturamento em um só lugar.</p>
          <div className="login-features">
            <div className="login-feat"><span className="feat-dot" />Dashboard com métricas em tempo real</div>
            <div className="login-feat"><span className="feat-dot" />Orçamentos enviados pelo WhatsApp</div>
            <div className="login-feat"><span className="feat-dot" />Histórico completo de cada veículo</div>
            <div className="login-feat"><span className="feat-dot" />Relatórios de desempenho da oficina</div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-box">
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--brand)', letterSpacing: '-0.3px', marginBottom: 20 }}>
            Chave <span style={{ color: 'var(--accent)' }}>10</span>
          </div>
          <h1 className="login-title">Criar conta</h1>
          <p className="login-subtitle">Comece a usar gratuitamente por 7 dias.</p>

          {googleClientId && (
            <div style={{ marginBottom: 20 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErro('Falha ao conectar com o Google')}
                width="100%"
                text="signup_with"
                shape="rectangular"
                logo_alignment="left"
                locale="pt-BR"
              />
            </div>
          )}

          {googleClientId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
              <span style={{ fontSize: 12, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>ou preencha os dados</span>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
            </div>
          )}

          <form onSubmit={handleCadastroSubmit}>
            <FormInput
              label="Nome completo"
              name="nome"
              value={formPessoal.values.nome}
              error={formPessoal.errors.nome}
              touched={formPessoal.touched.nome}
              onChange={formPessoal.handleChange}
              onBlur={formPessoal.handleBlur}
              placeholder="Seu nome"
              required
            />
            
            <FormInput
              label="E-mail"
              name="email"
              type="email"
              value={formPessoal.values.email}
              error={formPessoal.errors.email}
              touched={formPessoal.touched.email}
              onChange={formPessoal.handleChange}
              onBlur={formPessoal.handleBlur}
              placeholder="seu@email.com"
              required
            />
            
            <FormInput
              label="Senha"
              name="senha"
              type="password"
              value={formPessoal.values.senha}
              error={formPessoal.errors.senha}
              touched={formPessoal.touched.senha}
              onChange={formPessoal.handleChange}
              onBlur={formPessoal.handleBlur}
              placeholder="Mínimo 6 caracteres"
              helpText="Use letras, números e símbolos para maior segurança"
              required
            />
            
            <FormInput
              label="Confirmar senha"
              name="confirmarSenha"
              type="password"
              value={formPessoal.values.confirmarSenha}
              error={formPessoal.errors.confirmarSenha}
              touched={formPessoal.touched.confirmarSenha}
              onChange={formPessoal.handleChange}
              onBlur={formPessoal.handleBlur}
              placeholder="Digite a senha novamente"
              required
            />

            {erro && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

            <button className="btn btn-primary login-btn" type="submit" disabled={formPessoal.isSubmitting}>
              {formPessoal.isSubmitting ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--gray-500)' }}>
            Já tem uma conta? <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/login')}>Entrar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
