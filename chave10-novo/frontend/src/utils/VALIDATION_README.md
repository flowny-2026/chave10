# Sistema de Validação de Formulários

Este documento explica como usar o sistema de validação de formulários do Chave 10.

## 📚 Componentes

### 1. **validation.js** - Funções de validação
Contém todas as funções de validação e formatação.

### 2. **useForm.js** - Hook customizado
Hook React para gerenciar estado e validação de formulários.

### 3. **FormInput.jsx** - Componente de input
Componente de input com feedback visual de validação.

---

## 🚀 Como usar

### Exemplo básico com useForm:

```jsx
import { useForm } from '../hooks/useForm';
import FormInput from '../components/FormInput';
import { validateEmail, validatePassword } from '../utils/validation';

function MeuFormulario() {
  const { values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting } = useForm(
    // Valores iniciais
    { email: '', senha: '' },
    
    // Função de submit
    async (values) => {
      await api.auth.login(values.email, values.senha);
    },
    
    // Regras de validação
    {
      email: [validateEmail],
      senha: [(v) => validatePassword(v, 6)]
    }
  );

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="E-mail"
        name="email"
        type="email"
        value={values.email}
        error={errors.email}
        touched={touched.email}
        onChange={handleChange}
        onBlur={handleBlur}
        required
      />
      
      <FormInput
        label="Senha"
        name="senha"
        type="password"
        value={values.senha}
        error={errors.senha}
        touched={touched.senha}
        onChange={handleChange}
        onBlur={handleBlur}
        required
      />
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : 'Entrar'}
      </button>
    </form>
  );
}
```

---

## 📋 Funções de validação disponíveis

### Validações básicas:
- `validateEmail(email)` - Valida e-mail
- `validatePassword(senha, minLength)` - Valida senha
- `validateName(nome, minLength)` - Valida nome
- `validatePhone(telefone)` - Valida telefone brasileiro
- `validateRequired(value, fieldName)` - Campo obrigatório
- `validateMinLength(value, minLength, fieldName)` - Comprimento mínimo
- `validateMaxLength(value, maxLength, fieldName)` - Comprimento máximo

### Validações de documentos:
- `validateCPF(cpf)` - Valida CPF
- `validateCNPJ(cnpj)` - Valida CNPJ
- `validatePlaca(placa)` - Valida placa de veículo

### Validações de valores:
- `validateMoney(valor)` - Valida valor monetário
- `validateDate(data)` - Valida data
- `validatePositiveInteger(value, fieldName)` - Número inteiro positivo

---

## 🎨 Funções de formatação

### Documentos:
- `formatCPF(cpf)` - Formata CPF: 123.456.789-01
- `formatCNPJ(cnpj)` - Formata CNPJ: 12.345.678/0001-90
- `formatPhone(phone)` - Formata telefone: (16) 99291-5540
- `formatPlaca(placa)` - Formata placa: ABC-1234

### Valores:
- `formatMoney(value)` - Formata dinheiro: R$ 1.234,56
- `formatDate(date)` - Formata data: DD/MM/YYYY

---

## 🔧 Uso avançado

### Validação customizada:

```jsx
const { values, errors, handleChange, handleSubmit } = useForm(
  { senha: '', confirmarSenha: '' },
  async (values) => { /* submit */ },
  {
    senha: [(v) => validatePassword(v, 8)],
    confirmarSenha: [(v) => {
      if (!v) return 'Confirmação é obrigatória';
      if (v !== values.senha) return 'Senhas não coincidem';
      return null;
    }]
  }
);
```

### Múltiplas validações por campo:

```jsx
{
  email: [
    validateRequired,
    validateEmail,
    (v) => v.includes('@empresa.com') ? null : 'Use e-mail corporativo'
  ]
}
```

### Formatação com máscara:

```jsx
<FormInput
  name="telefone"
  mask={formatPhone}
  {...formProps}
/>
```

### Validação manual:

```jsx
const form = useForm(/* ... */);

// Validar um campo específico
form.validateField('email', 'test@test.com');

// Validar todos os campos
const isValid = form.validateAll();

// Definir valor manualmente
form.setFieldValue('email', 'novo@email.com');

// Definir erro manualmente
form.setFieldError('email', 'E-mail já cadastrado');

// Resetar formulário
form.reset();
```

---

## 🎯 Boas práticas

1. **Sempre use validação no frontend E backend**
   - Frontend: melhor UX
   - Backend: segurança

2. **Valide no blur e no submit**
   - `onBlur`: feedback imediato
   - `onSubmit`: validação final

3. **Mensagens de erro claras**
   - ❌ "Campo inválido"
   - ✅ "E-mail deve ter formato válido"

4. **Use formatação para melhor UX**
   - Telefone: (16) 99291-5540
   - CPF: 123.456.789-01
   - Dinheiro: R$ 1.234,56

5. **Desabilite botão durante submit**
   ```jsx
   <button disabled={isSubmitting}>
     {isSubmitting ? 'Enviando...' : 'Enviar'}
   </button>
   ```

---

## 🐛 Troubleshooting

### Validação não está funcionando:
- Verifique se passou as regras de validação no useForm
- Confirme que está usando `handleBlur` no input
- Verifique se o `name` do input corresponde à chave nas regras

### Erro não aparece:
- Verifique se o campo foi "tocado" (`touched`)
- Confirme que está passando `error` e `touched` para o FormInput

### Máscara não funciona:
- Verifique se a função de máscara retorna string
- Confirme que está usando a prop `mask` no FormInput

---

## 📝 Exemplos completos

Veja os arquivos:
- `src/pages/Cadastro.jsx` - Exemplo completo de formulário com validação
- `src/pages/admin/TrocarSenha.jsx` - Validação de senha

---

## 🔄 Migração de formulários existentes

### Antes (sem validação):
```jsx
const [email, setEmail] = useState('');
const [erro, setErro] = useState('');

<input 
  value={email} 
  onChange={e => setEmail(e.target.value)} 
/>
```

### Depois (com validação):
```jsx
const form = useForm(
  { email: '' },
  async (values) => { /* submit */ },
  { email: [validateEmail] }
);

<FormInput
  name="email"
  value={form.values.email}
  error={form.errors.email}
  touched={form.touched.email}
  onChange={form.handleChange}
  onBlur={form.handleBlur}
/>
```

---

## 🎓 Próximos passos

1. Migrar formulários existentes para usar validação
2. Adicionar mais validações conforme necessário
3. Criar validações customizadas para regras de negócio
4. Adicionar testes unitários para validações

---

**Dúvidas?** Consulte os exemplos nos arquivos ou peça ajuda no time! 🚀
