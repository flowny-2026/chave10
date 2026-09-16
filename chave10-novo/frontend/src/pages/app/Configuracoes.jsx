import { useState, useEffect } from 'react';
import { maskDocumento, maskPhone } from '../../utils/validation';
import ImportarClientes from '../../components/ImportarClientes';
import ExportarDados from '../../components/ExportarDados';
import CepInput from '../../components/CepInput';
import { useOnboarding } from '../../hooks/useOnboarding';
import { api } from '../../api';
import { SEGMENTOS } from '../../config/segmentos';

const EMPTY = { nome: '', responsavel: '', documento: '', email: '', endereco: '', telefone: '', whatsapp: '', logo: null, segmento: 'oficina_mecanica' };

function F({ label, type = 'text', placeholder, value, onChange, half }) {
  return (
    <div className={`form-group${half ? '' : ' full'}`}>
      <label>{label}</label>
      <input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>
      {msg}
    </div>
  );
}

export default function AppConfiguracoes() {
  const [of, setOf]         = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState({ msg: '', type: '' });
  const { resetOnboarding }   = useOnboarding();

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }

  // Carrega dados do servidor ao montar
  useEffect(() => {
    api.app.config.get()
      .then(data => setOf({ ...EMPTY, ...data }))
      .catch(() => showToast('Erro ao carregar configurações', 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    if (!of.nome?.trim()) { showToast('Nome da oficina é obrigatório', 'error'); return; }
    setSaving(true);
    try {
      await api.app.config.save(of);
      showToast('✓ Configurações salvas com sucesso!');
      // Atualiza localStorage para uso offline (ex: PDFs) e para o nome no dashboard
      localStorage.setItem('c10_oficina', JSON.stringify(of));
      // Atualiza o nome do usuário no cache local para refletir na saudação imediatamente
      if (of.responsavel?.trim()) {
        try {
          const u = JSON.parse(localStorage.getItem('c10_user') || '{}');
          u.nome = of.responsavel.trim();
          // Sincroniza o segmento para que useSegmento reflita imediatamente
          if (of.segmento) u.segmento = of.segmento;
          localStorage.setItem('c10_user', JSON.stringify(u));
          sessionStorage.setItem('c10_user', JSON.stringify(u));
        } catch {}
      }
    } catch (err) {
      showToast(err?.error || 'Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  }

  function uploadLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Imagem muito grande. Use até 2MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => setOf(o => ({ ...o, logo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Configurações da Oficina</div>
          <div className="page-subtitle">Dados que aparecem nos orçamentos e mensagens</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ width: 160, height: 80, border: '2px dashed var(--gray-200)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', overflow: 'hidden', flexShrink: 0 }}>
            {of.logo
              ? <img src={of.logo} alt="Logo" style={{ maxHeight: 76, maxWidth: 156, objectFit: 'contain' }} />
              : <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}><div style={{ fontSize: 28, marginBottom: 4 }}>🖼️</div>Sem logo</div>}
          </div>
          <div>
            <label className="btn btn-outline" style={{ cursor: 'pointer', marginBottom: 8, display: 'inline-flex' }}>
              📷 Carregar logo
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadLogo} />
            </label>
            {of.logo && (
              <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', marginLeft: 8 }}
                onClick={() => setOf(o => ({ ...o, logo: null }))}>
                🗑️ Remover
              </button>
            )}
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }}>PNG, JPG ou SVG. Aparece no PDF do orçamento.</p>
          </div>
        </div>

        <form onSubmit={save}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Nome da oficina *</label>
              <input value={of.nome || ''} onChange={e => setOf(o => ({ ...o, nome: e.target.value }))} placeholder="Ex: Oficina do João" required />
            </div>

            <div className="form-group full">
              <label>Nome do responsável</label>
              <input
                value={of.responsavel || ''}
                onChange={e => setOf(o => ({ ...o, responsavel: e.target.value }))}
                placeholder="Nome e sobrenome de quem gerencia"
              />
              <small style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
                Este nome aparece na saudação do dashboard ("Bom dia, João 👋")
              </small>
            </div>

            <div className="form-group">
              <label>CPF / CNPJ</label>
              <input value={of.documento || ''} onChange={e => setOf(o => ({ ...o, documento: maskDocumento(e.target.value) }))} placeholder="00.000.000/0001-00" />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" value={of.email || ''} onChange={e => setOf(o => ({ ...o, email: e.target.value }))} placeholder="contato@oficina.com" />
            </div>

            <CepInput
              value={of.endereco || ''}
              onChange={v => setOf(o => ({ ...o, endereco: v }))}
            />

            <div className="form-group">
              <label>Telefone fixo</label>
              <input value={of.telefone || ''} onChange={e => setOf(o => ({ ...o, telefone: maskPhone(e.target.value) }))} placeholder="(11) 3333-4444" />
            </div>

            <div className="form-group">
              <label>WhatsApp</label>
              <input value={of.whatsapp || ''} onChange={e => setOf(o => ({ ...o, whatsapp: maskPhone(e.target.value) }))} placeholder="(11) 99999-0000" />
            </div>

            <div className="form-group full">
              <label>Segmento do negócio</label>
              <select
                value={of.segmento || 'oficina_mecanica'}
                onChange={e => setOf(o => ({ ...o, segmento: e.target.value }))}
              >
                {Object.entries(SEGMENTOS).map(([key, seg]) => (
                  <option key={key} value={key}>{seg.emoji} {seg.label}</option>
                ))}
              </select>
              <small style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4, display: 'block' }}>
                Define a nomenclatura usada no sistema (Veículo/Equipamento, Placa/Nº Série, KM/Horímetro, etc.)
              </small>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Salvando...' : '💾 Salvar configurações'}
            </button>
          </div>
        </form>
      </div>

      <ImportarClientes onImportado={() => {}} />

      <ExportarDados />

      {/* Ajuda */}
      <div className="card" style={{ maxWidth: 720, marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 16 }}>🎓 Ajuda e Tutorial</h3>
        <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 20, lineHeight: 1.6 }}>
          Quer rever como funciona o sistema? Refaça o tour guiado que mostra as principais funcionalidades.
        </p>
        <button className="btn btn-outline" onClick={() => { resetOnboarding(); window.location.href = '/app/dashboard'; }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Refazer Tour Guiado
        </button>
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
