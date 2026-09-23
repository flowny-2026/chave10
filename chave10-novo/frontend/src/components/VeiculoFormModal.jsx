import { useState } from 'react';
import { api } from '../api';
import { useSegmento } from '../hooks/useSegmento';
import { compressImage } from '../utils/imageCompressor';

const EMPTY = { marca: '', modelo: '', ano: '', placa: '', km: '', cliente_id: '' };

/**
 * VeiculoFormModal — modal reutilizável de cadastro/edição de veículo.
 * Inclui leitura de placa por foto (OCR). Usado em Veículos e no fluxo
 * pós-cadastro de Cliente (para já cadastrar o veículo do cliente).
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSaved: (veiculo|null) => void   — chamado após salvar com sucesso
 *  - clientes: [{id, nome}]            — lista para o select de proprietário
 *  - editing: id|null                  — id do veículo em edição (ou null p/ criar)
 *  - initial: objeto parcial p/ pré-preencher (ex.: { cliente_id })
 *  - lockCliente: boolean              — trava o select do cliente (fluxo pós-cliente)
 *  - contexto: string|null             — mensagem contextual no topo (ex.: fluxo pós-cliente)
 *  - closeLabel: string                — rótulo do botão de fechar (ex.: "Pular veículo")
 *  - onToast: (msg, type) => void
 */
export default function VeiculoFormModal({
  open,
  onClose,
  onSaved,
  clientes = [],
  editing = null,
  initial = null,
  lockCliente = false,
  contexto = null,
  closeLabel = 'Cancelar',
  onToast = () => {},
}) {
  const t = useSegmento();
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) });
  const [lendoPlaca, setLendoPlaca] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function lerPlacaPorFoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLendoPlaca(true);
    onToast('Lendo a placa da foto...', 'info');
    try {
      const { dataUrl } = await compressImage(file, { maxDimension: 1280, quality: 0.85 });
      const r = await api.app.veiculos.consultaPlaca(dataUrl);
      setForm(f => ({
        ...f,
        placa:  r.placa  ? r.placa  : f.placa,
        marca:  r.marca  ? r.marca  : f.marca,
        modelo: r.modelo ? r.modelo : f.modelo,
        ano:    r.ano    ? r.ano    : f.ano,
      }));
      if (r.marca || r.modelo) {
        onToast(`Placa ${r.placa} — ${[r.marca, r.modelo].filter(Boolean).join(' ')}`, 'success');
      } else if (r.placa) {
        onToast(`Placa ${r.placa} lida. Complete os demais dados.`, 'success');
      } else {
        onToast('Placa lida, mas sem dados do veículo.', 'info');
      }
    } catch (err) {
      onToast(err.error || 'Não foi possível ler a placa. Tente uma foto mais nítida.', 'error');
    } finally {
      setLendoPlaca(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!form.marca.trim() || !form.modelo.trim() || !form.placa.trim()) {
      onToast(`${t.marca}, ${t.modelo.toLowerCase()} e ${t.placa.toLowerCase()} são obrigatórios`, 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, placa: form.placa.toUpperCase(), cliente_id: form.cliente_id || null };
      let veiculo = null;
      if (editing) veiculo = await api.app.veiculos.update(editing, payload);
      else veiculo = await api.app.veiculos.create(payload);
      onToast(editing ? `${t.veiculo} atualizado!` : `${t.veiculo} salvo!`, 'success');
      onSaved?.(veiculo);
    } catch (err) {
      onToast(err.error || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay open">
      <div className="modal">
        <div className="modal-header">
          <h2>{editing ? t.editVeiculo : t.novoVeiculo}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Mensagem contextual (ex.: fluxo pós-cadastro de cliente) */}
          {contexto && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--success-light, #ecfdf5)', border: '1px solid var(--success, #16a34a)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success, #16a34a)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.4 }}>{contexto}</span>
            </div>
          )}
          {/* Leitura de placa por foto (OCR) */}
          <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--r-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label className="btn btn-primary btn-sm" style={{ cursor: lendoPlaca ? 'wait' : 'pointer', margin: 0, opacity: lendoPlaca ? 0.7 : 1 }}>
                {lendoPlaca ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg style={{ animation: 'spin .7s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Lendo...
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Ler {t.placa.toLowerCase()} por foto</span>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style={{ display: 'none' }} onChange={lerPlacaPorFoto} disabled={lendoPlaca} />
              </label>
              <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                Tire uma foto da placa para preencher {t.marca.toLowerCase()}, {t.modelo.toLowerCase()} e {t.ano.toLowerCase()} automaticamente.
              </span>
            </div>
          </div>
          <form onSubmit={save}>
            <div className="form-grid">
              <div className="form-group">
                <label>{t.marca} *</label>
                <input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Ex: Chevrolet" required autoFocus />
              </div>
              <div className="form-group">
                <label>{t.modelo} *</label>
                <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: Onix" required />
              </div>
              <div className="form-group">
                <label>{t.ano}</label>
                <input value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} placeholder="Ex: 2022" />
              </div>
              <div className="form-group">
                <label>{t.placa} *</label>
                <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" style={{ textTransform: 'uppercase' }} required />
              </div>
              <div className="form-group">
                <label>{t.km}</label>
                <input type="number" value={form.km} onChange={e => setForm(f => ({ ...f, km: e.target.value }))} placeholder={t.kmPlaceholder} />
              </div>
              <div className="form-group">
                <label>Cliente responsável</label>
                <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))} disabled={lockCliente}>
                  <option value="">Selecionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>{closeLabel}</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
