import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api, saveToken, saveUser } from '../api';
import { useForm } from '../hooks/useForm';
import FormInput from '../components/FormInput';
import CepInput from '../components/CepInput';
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validatePhone,
  validateRequired,
  maskPhone,
  maskDocumento,
} from '../utils/validation';
import '../styles/login.css';

function PasswordStrength({ senha }) {
  let score = 0;
  if (senha.length >= 6) score++;
  if (senha.length >= 8) score++;
  if (/[A-Z]/.test(senha)) score++;
  if (/[0-9]/.test(senha)) score++;
  if (/[^A-Za-z0-9]/.test(senha)) score++;

  const levels = [
    { label: 'Muito fraca', color: '#dc2626', width: '20%' },
    { label: 'Fraca', color: '#f97316', width: '40%' },
    { label: 'Média', color: '#eab308', width: '60%' },
    { label: 'Forte', color: '#22c55e', width: '80%' },
    { label: 'Muito forte', color: '#16a34a', width: '100%' },
  ];

  const level = levels[Math.min(score, 4)];

  return (
    <div style={{ marginTop: -10, marginBottom: 14 }}>
      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: level.width, background: level.color, borderRadius: 4, transition: 'all 0.3s' }}></div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: level.color }}>{level.label}</span>
    </div>
  );
}

export default function Cadastro() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [erro, setErro] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (searchParams.get('step') === '2') {
      const token = localStorage.getItem('c10_token_temp');
      if (token) { setTempToken(token); localStorage.removeItem('c10_token_temp'); setStep(2); }
    }
  }, []);

  const formPessoal = useForm(
    { nome: '', email: '', senha: '', confirmarSenha: '' },
    async (values) => {
      setErro('');
      const { token } = await api.auth.register({ nome: values.nome, email: values.email, senha: values.senha });
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

  const formOficina = useForm(
    { nome_oficina: '', cnpj_cpf: '', telefone: '', endereco: '', logo: '' },
    async (values) => {
      setErro('');
      const { token, usuario } = await api.auth.completeOficina(tempToken, values);
      saveToken(token);
      saveUser(usuario);
      navigate('/app/dashboard');
    },
    { nome_oficina: [validateRequired], telefone: [validatePhone] }
  );

  async function handleCadastroSubmit(e) {
    try { await formPessoal.handleSubmit(e); }
    catch (err) { setErro(err.error || 'Erro ao criar conta'); }
  }

  async function handleOficinaSubmit(e) {
    try { await formOficina.handleSubmit(e); }
    catch (err) { setErro(err.error || 'Erro ao salvar dados da oficina'); }
  }

  async function handleGoogleSuccess({ credential }) {
    setErro('');
    try {
      const { token, needsOficina, usuario } = await api.auth.googleRegister(credential);
      if (needsOficina) { setTempToken(token); setStep(2); }
      else { saveToken(token); if (usuario) saveUser(usuario); navigate('/app/dashboard'); }
    } catch (err) { setErro(err.error || 'Erro ao cadastrar com Google'); }
  }

  return (
    <div className="login-page">
      <nav className="login-nav">
        <img src="/teste sem fundo 2.png" alt="Chave 10" className="login-nav-logo" onClick={() => navigate('/')} />
        <button className="login-nav-btn" onClick={() => navigate('/login')}>Já tenho conta</button>
      </nav>

      <div className="login-wrapper">
        <div className="login-card" style={{maxWidth: step === 2 ? 460 : 420}}>
          {/* Step indicator */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:28}}>
            <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,background:step>=1?'#F97316':'#e2e8f0',color:step>=1?'#fff':'#94a3b8'}}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div style={{width:40,height:2,background:step>1?'#F97316':'#e2e8f0',borderRadius:2}}></div>
            <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,background:step>=2?'#F97316':'#e2e8f0',color:step>=2?'#fff':'#94a3b8'}}>
              2
            </div>
          </div>

          {step === 1 && (
            <>
              <h1 className="login-title">Criar conta grátis</h1>
              <p className="login-sub">7 dias grátis. Sem cartão de crédito.</p>

              {googleClientId && (
                <>
                  <div className="login-google">
                    <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setErro('Falha ao conectar com o Google')} width="100%" text="signup_with" shape="rectangular" logo_alignment="left" locale="pt-BR" />
                  </div>
                  <div className="login-divider">
                    <span></span>
                    <p>ou preencha os dados</p>
                    <span></span>
                  </div>
                </>
              )}

              <form onSubmit={handleCadastroSubmit}>
                <FormInput label="Nome completo" name="nome" value={formPessoal.values.nome} error={formPessoal.errors.nome} touched={formPessoal.touched.nome} onChange={formPessoal.handleChange} onBlur={formPessoal.handleBlur} placeholder="Seu nome e sobrenome" required />
                <FormInput label="E-mail" name="email" type="email" value={formPessoal.values.email} error={formPessoal.errors.email} touched={formPessoal.touched.email} onChange={formPessoal.handleChange} onBlur={formPessoal.handleBlur} placeholder="seu@email.com" required />
                <FormInput label="Senha" name="senha" type="password" value={formPessoal.values.senha} error={formPessoal.errors.senha} touched={formPessoal.touched.senha} onChange={formPessoal.handleChange} onBlur={formPessoal.handleBlur} placeholder="Mínimo 6 caracteres" required />
                {formPessoal.values.senha && <PasswordStrength senha={formPessoal.values.senha} />}
                <FormInput label="Confirmar senha" name="confirmarSenha" type="password" value={formPessoal.values.confirmarSenha} error={formPessoal.errors.confirmarSenha} touched={formPessoal.touched.confirmarSenha} onChange={formPessoal.handleChange} onBlur={formPessoal.handleBlur} placeholder="Digite a senha novamente" required />

                {erro && <div className="login-error">{erro}</div>}

                <button className="login-btn" type="submit" disabled={formPessoal.isSubmitting}>
                  {formPessoal.isSubmitting ? <span className="login-spinner"></span> : 'Criar conta grátis'}
                </button>
              </form>

              <p className="login-signup">
                Já tem uma conta? <button type="button" onClick={() => navigate('/login')}>Entrar</button>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="login-title">Dados da sua oficina</h1>
              <p className="login-sub">Quase lá! Complete com as informações da sua oficina.</p>

              <form onSubmit={handleOficinaSubmit}>
                <FormInput label="Nome da oficina" name="nome_oficina" value={formOficina.values.nome_oficina} error={formOficina.errors.nome_oficina} touched={formOficina.touched.nome_oficina} onChange={formOficina.handleChange} onBlur={formOficina.handleBlur} placeholder="Ex: Oficina do João" required />
                <FormInput label="CNPJ ou CPF" name="cnpj_cpf" value={formOficina.values.cnpj_cpf} error={formOficina.errors.cnpj_cpf} touched={formOficina.touched.cnpj_cpf} onChange={formOficina.handleChange} onBlur={formOficina.handleBlur} placeholder="00.000.000/0000-00" mask={maskDocumento} />
                <FormInput label="Telefone" name="telefone" value={formOficina.values.telefone} error={formOficina.errors.telefone} touched={formOficina.touched.telefone} onChange={formOficina.handleChange} onBlur={formOficina.handleBlur} placeholder="(00) 00000-0000" mask={maskPhone} required />
                <CepInput value={formOficina.values.endereco} onChange={v => formOficina.handleChange({ target: { name: 'endereco', value: v } })} />

                {erro && <div className="login-error">{erro}</div>}

                <button className="login-btn" type="submit" disabled={formOficina.isSubmitting}>
                  {formOficina.isSubmitting ? <span className="login-spinner"></span> : 'Concluir cadastro'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="login-trust">
          <span>🔒 Dados seguros</span>
          <span>⚡ 7 dias grátis</span>
          <span>🚫 Sem fidelidade</span>
        </div>
      </div>
    </div>
  );
}
