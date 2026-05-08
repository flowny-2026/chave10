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
  const showError = touched && error;

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
      
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        className={showError ? 'error' : ''}
        {...props}
      />
      
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
