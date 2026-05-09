import { useState } from 'react';
import { maskDocumento, maskPhone } from '../../utils/validation';
import ImportarClientes from '../../components/ImportarClientes';

const KEY = 'c10_oficina';
function getOficina() { try { return JSON.parse(localStorage.getItem(KEY))||{}; } catch { return {}; } }
function setOficina(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

// Definido FORA do componente para evitar re-criação a cada render (bug de perda de foco)
function F({ label, type = 'text', placeholder, value, onChange }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

export default function AppConfiguracoes() {
  const [of, setOf] = useState(getOficina);
  const [saved, setSaved] = useState(false);

  function save(e) {
    e.preventDefault();
    setOficina(of);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2500);
  }

  function uploadLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { alert('Imagem muito grande. Use até 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => { const novo = {...of, logo:ev.target.result}; setOf(novo); setOficina(novo); };
    reader.readAsDataURL(file);
  }

  function removeLogo() { const novo={...of}; delete novo.logo; setOf(novo); setOficina(novo); }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Configurações da Oficina</div><div className="page-subtitle">Dados que aparecem nos orçamentos e mensagens</div></div>
      </div>

      <div className="card" style={{maxWidth:720}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:20,marginBottom:24,paddingBottom:20,borderBottom:'1px solid var(--gray-100)'}}>
          <div style={{width:160,height:80,border:'2px dashed var(--gray-200)',borderRadius:'var(--r)',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--gray-50)',overflow:'hidden',flexShrink:0}}>
            {of.logo
              ? <img src={of.logo} alt="Logo" style={{maxHeight:76,maxWidth:156,objectFit:'contain'}} />
              : <div style={{textAlign:'center',color:'var(--gray-400)',fontSize:12}}><div style={{fontSize:28,marginBottom:4}}>🖼️</div>Sem logo</div>}
          </div>
          <div>
            <label className="btn btn-outline" style={{cursor:'pointer',marginBottom:8,display:'inline-flex'}}>
              📷 Carregar logo
              <input type="file" accept="image/*" style={{display:'none'}} onChange={uploadLogo} />
            </label>
            {of.logo && <button className="btn btn-outline btn-sm" style={{color:'var(--danger)',marginLeft:8}} onClick={removeLogo}>🗑️ Remover</button>}
            <p style={{fontSize:12,color:'var(--gray-400)',marginTop:6}}>PNG, JPG ou SVG. Aparece no PDF do orçamento.</p>
          </div>
        </div>

        <form onSubmit={save}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Nome da oficina *</label>
              <input value={of.nome||''} onChange={e=>setOf(o=>({...o,nome:e.target.value}))} placeholder="Ex: Oficina do João" required />
            </div>
            <F label="CPF / CNPJ" value={of.documento} onChange={e=>setOf(o=>({...o,documento:maskDocumento(e.target.value)}))} placeholder="00.000.000/0001-00" />
            <F label="Email" type="email" value={of.email} onChange={e=>setOf(o=>({...o,email:e.target.value}))} placeholder="contato@oficina.com" />
            <div className="form-group full">
              <label>Endereço</label>
              <input value={of.endereco||''} onChange={e=>setOf(o=>({...o,endereco:e.target.value}))} placeholder="Rua, número, bairro, cidade — UF" />
            </div>
            <F label="Telefone fixo" value={of.telefone} onChange={e=>setOf(o=>({...o,telefone:maskPhone(e.target.value)}))} placeholder="(11) 3333-4444" />
            <F label="WhatsApp" value={of.whatsapp} onChange={e=>setOf(o=>({...o,whatsapp:maskPhone(e.target.value)}))} placeholder="(11) 99999-0000" />
          </div>
          <div className="form-actions" style={{marginTop:8}}>
            <button type="submit" className="btn btn-primary">{saved?'✓ Salvo!':'💾 Salvar configurações'}</button>
          </div>
        </form>
      </div>

      <ImportarClientes onImportado={() => {}} />
    </div>
  );
}
