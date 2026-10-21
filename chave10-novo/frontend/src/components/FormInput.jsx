import { useState } from 'react';

/**
 * Componente de input com validação visual
 * 
 * Props:
 * - label: Label do campo
 * - name: Nome do campo
 * - type: Tipo do input (text, email, password, etc)
 * - value: Valor do campo
 * - error: Mensagem de erro
 * - touched: Se o campo foi tocado
 * - onChange: Handler de mudança
 * - onBlur: Handler de blur
 * - placeholder: Placeholder
 * - required: Se é obrigatório
 * - disabled: Se está desabilitado
 * - autoFocus: Se deve focar automaticamente
 * - maxLength: Comprimento máximo
 * - mask: Função de máscara (opcional)
 */
export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  error,
  touched,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  autoFocus = false,
  maxLength,
  mask,
  helpText,
  ...props
}) {
  const [showPass, setShowPass] = useState(false);
  const showError = touched && error;
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPass ? 'text' : 'password') : type;

  const handleChange = (e) => {
    if (mask) {
      e.target.value = mask(e.target.value);
    }
    onChange(e);
  };

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name}>
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={maxLength}
          className={showError ? 'error' : ''}
          style={isPassword ? { paddingRight: 40 } : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0, display: 'flex' }}
            tabIndex={-1}
          >
            {showPass
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        )}
      </div>
      
      {showError && (
        <span className="form-error">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </span>
      )}
      
      {helpText && !showError && (
        <small style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--gray-400)' }}>
          {helpText}
        </small>
      )}
    </div>
  );
}
