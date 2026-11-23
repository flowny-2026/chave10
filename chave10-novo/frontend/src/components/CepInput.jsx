import { useState } from 'react';

/**
 * CepInput — CEP + busca ViaCEP + numero + complemento + endereco completo
 *
 * Props:
 *   value    : string  — valor atual do endereco completo (string unica)
 *   onChange : (string) => void  — chamado com a string montada
 *   disabled : boolean
 */
export default function CepInput({ value, onChange, disabled = false }) {
  const [cep, setCep]         = useState('');
  const [numero, setNumero]   = useState('');
  const [complemento, setComplemento] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState('');
  const [sucesso, setSucesso] = useState(false);
  // Guarda a base do endereco vinda do CEP (sem numero/complemento)
  const [baseEndereco, setBaseEndereco] = useState('');

  function maskCep(raw) {
    const d = raw.replace(/[^0-9]/g, '').slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  // Monta a string final: "Rua X, 123, Apto 4, Bairro, Cidade - UF"
  function montarEndereco(base, num, comp) {
    const partes = [base, num, comp].map(s => (s || '').trim()).filter(Boolean);
    return partes.join(', ');
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
      const base   = partes.join(', ');
      setBaseEndereco(base);
      onChange(montarEndereco(base, numero, complemento));
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

  function handleNumeroChange(e) {
    const v = e.target.value;
    setNumero(v);
    // Atualiza o endereco completo em tempo real
    const base = baseEndereco || value;
    onChange(montarEndereco(base, v, complemento));
  }

  function handleComplementoChange(e) {
    const v = e.target.value;
    setComplemento(v);
    const base = baseEndereco || value;
    onChange(montarEndereco(base, numero, v));
  }

  const cepValido = cep.replace(/[^0-9]/g, '').length === 8;

  return (
    <div className="form-group full">
      <label>Endereco</label>

      {/* Linha 1: CEP + botao buscar + link */}
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

      {/* Feedback erro */}
      {erro && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--danger)', marginBottom: 6, fontWeight: 500 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {erro}
        </div>
      )}

      {/* Feedback sucesso */}
      {sucesso && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--success)', marginBottom: 6, fontWeight: 500 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Endereco encontrado! Preencha o numero e complemento abaixo.
        </div>
      )}

      {/* Linha 2: Numero + Complemento */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 3, display: 'block' }}>Numero *</label>
          <input
            type="text"
            value={numero}
            onChange={handleNumeroChange}
            placeholder="Ex: 123"
            disabled={disabled}
            maxLength={20}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 3, display: 'block' }}>Complemento</label>
          <input
            type="text"
            value={complemento}
            onChange={handleComplementoChange}
            placeholder="Apto, Sala, Bloco..."
            disabled={disabled}
            maxLength={60}
          />
        </div>
      </div>

      {/* Linha 3: Endereco completo (editavel manualmente) */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Rua, numero, complemento, bairro, cidade - UF"
        disabled={disabled}
      />
      <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'var(--gray-400)' }}>
        Busque pelo CEP ou preencha o endereco completo manualmente.
      </small>

      <style>{'@keyframes cepSpin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

