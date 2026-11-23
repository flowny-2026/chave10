import { useState } from 'react';

/**
 * Hook customizado para gerenciar formulários com validação
 * 
 * @param {Object} initialValues - Valores iniciais do formulário
 * @param {Function} onSubmit - Função a ser chamada no submit
 * @param {Object} validationRules - Regras de validação (opcional)
 * 
 * @returns {Object} - Objeto com valores, erros, handlers e funções auxiliares
 * 
 * Exemplo de uso:
 * 
 * const { values, errors, handleChange, handleSubmit, isSubmitting } = useForm(
 *   { email: '', senha: '' },
 *   async (values) => {
 *     await api.auth.login(values.email, values.senha);
 *   },
 *   {
 *     email: [validateEmail],
 *     senha: [(v) => validatePassword(v, 6)]
 *   }
 * );
 */
export function useForm(initialValues, onSubmit, validationRules = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Atualiza o valor de um campo
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  /**
   * Marca um campo como "tocado" (blur)
   */
  const handleBlur = (e) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Valida o campo quando perde o foco
    if (validationRules[name]) {
      validateField(name, values[name]);
    }
  };

  /**
   * Valida um campo específico
   */
  const validateField = (fieldName, value) => {
    const validators = validationRules[fieldName];
    if (!validators) return null;

    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: error
        }));
        return error;
      }
    }

    setErrors(prev => ({
      ...prev,
      [fieldName]: null
    }));
    return null;
  };

  /**
   * Valida todos os campos
   */
  const validateAll = () => {
    const newErrors = {};
    let isValid = true;

    for (const [fieldName, validators] of Object.entries(validationRules)) {
      const value = values[fieldName];
      
      for (const validator of validators) {
        const error = validator(value);
        if (error) {
          newErrors[fieldName] = error;
          isValid = false;
          break;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Handler do submit do formulário
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Marca todos os campos como tocados
    const allTouched = {};
    Object.keys(values).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Valida todos os campos
    const isValid = validateAll();
    
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(values);
    } catch (error) {
      // O erro será tratado pelo componente
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reseta o formulário
   */
  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  };

  /**
   * Define valores manualmente
   */
  const setFieldValue = (name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Define erro manualmente
   */
  const setFieldError = (name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    validateField,
    validateAll
  };
}
