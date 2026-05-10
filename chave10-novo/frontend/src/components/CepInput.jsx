import { useState } from 'react';

/**
 * CepInput — campo CEP + busca automática via ViaCEP + campo de endereço editável
 *
 * Props:
 *   value    : string  — valor atual do endereço completo
 *   onChange : (string) => void  — chamado com o endereço preenchido/editado
 *   disabled : boolean
 */
export default function CepInput({ value, onChange, disabled = false }) {
  const [cep, setCep]         = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState('');
  const [sucesso, setSucesso] = useState(false);

  function maskCep(raw) {
    const d = raw.replace(/[^0-9]/g, '').slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  async function buscarCep() {
    const limpo = cep.replace(/[^0-9]/g, '');
    if (limpo.length !== 8) { setErro('CEP deve ter 8 digitos'); return; }
    setErro(''); setSucesso(false); setLoading(true);
    try {
      const res  = await fetch('https://viacep.com.br/ws/' + limpo + '/json/');
      const data = await res.json();
      if (data.erro) { setErro('CEP nao encontrado. Verifique e tente novamente.'); return; }
      const cidade = [data.localidade, data.uf].filter(Boolean).join(' - ');
      const partes = [data.logradouro, data.bairro, cidade].filter(Boolean);
      onChange(partes.join(', '));
      setSucesso(true);
    } catch {
      setErro('Erro ao buscar CEP. Verifique sua conexao.');
    } finally {
      setLoading(false);
    }
  }

  function handleCepKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); buscarCep(); }
  }

  const cepValido = cep.replace(/[^0-9]/g, '').length === 8;

  return (
    <div className="form-group full">
      <label>Endereco</label>

      {/* Linha do CEP */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={cep}
          onChange={e => { setCep(maskCep(e.target.value)); setErro(''); setSucesso(false); }}
          onKeyDown={handleCepKeyDown}
          placeholder="00000-000"
          disabled={disabled}
          maxLength={9}
          style={{ width: 140, flexShrink: 0 }}
          aria-label="CEP"
        />

        <button
          type="button"
          onClick={buscarCep}
          disabled={disabled || loading || !cepValido}
          className="btn btn-outline btn-sm"
          style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          title="Buscar endereco pelo CEP"
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg style={{ animation: 'cepSpin .7s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Buscando...
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Buscar CEP
            </span>
          )}
        </button>

        <a
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none' }}
        >
          Nao sei o CEP
        </a>
      </div>

      {/* Feedback */}
      {erro && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--danger)', marginBottom: 6, fontWeight: 500 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {erro}
        </div>
      )}
      {sucesso && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--success)', marginBottom: 6, fontWeight: 500 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Endereco encontrado! Confira e ajuste se necessario.
        </div>
      )}

      {/* Campo de endereco completo — editavel manualmente */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Rua, numero, bairro, cidade - UF"
        disabled={disabled}
      />
      <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'var(--gray-400)' }}>
        Digite o CEP e clique em Buscar CEP, ou preencha o endereco manualmente.
      </small>

      <style>{'@keyframes cepSpin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
