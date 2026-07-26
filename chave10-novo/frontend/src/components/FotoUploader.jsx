import { useState, useRef } from 'react';
import { compressImages } from '../utils/imageCompressor';
import { api } from '../api';

/**
 * FotoUploader — Componente de upload de fotos para OS
 *
 * Props:
 *   osId       - ID da OS
 *   fotos      - array de fotos existentes [{id, titulo, categoria, ...}]
 *   onUpdate   - callback após upload/delete (recebe array atualizado)
 *   maxFotos   - limite (default 15)
 *   disabled   - desabilita uploads
 */
export default function FotoUploader({ osId, fotos = [], onUpdate, maxFotos = 15, disabled = false }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState('');
  const [error, setError]         = useState('');
  const inputRef = useRef(null);

  const CATEGORIAS = [
    { value: 'problema', label: '⚠️ Problema', color: '#dc2626' },
    { value: 'peca',     label: '🔧 Peça',     color: '#d97706' },
    { value: 'servico',  label: '🛠️ Serviço',  color: '#2563eb' },
    { value: 'antes',    label: '📸 Antes',     color: '#6b7280' },
    { value: 'depois',   label: '✅ Depois',    color: '#16a34a' },
  ];

  async function handleFiles(e) {
    const files = e.target.files;
    if (!files?.length) return;

    const remaining = maxFotos - fotos.length;
    if (remaining <= 0) {
      setError(`Limite de ${maxFotos} fotos atingido`);
      return;
    }

    const batch = Array.from(files).slice(0, Math.min(5, remaining));
    setUploading(true);
    setError('');
    setProgress(`Comprimindo ${batch.length} foto(s)...`);

    try {
      // Comprime todas
      const compressed = await compressImages(batch);
      const erros = compressed.filter(c => c.error);
      if (erros.length) {
        setError(erros.map(e => e.error).join(', '));
        if (erros.length === batch.length) { setUploading(false); return; }
      }

      const validas = compressed.filter(c => !c.error);
      setProgress(`Enviando ${validas.length} foto(s)...`);

      // Envia para a API
      const payload = validas.map(c => ({
        imagem: c.dataUrl,
        titulo: '',
        descricao: '',
        categoria: 'problema',
      }));

      const res = await api.post(`/app/os/${osId}/fotos`, { fotos: payload });
      setProgress('');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.error || 'Erro ao enviar fotos');
    } finally {
      setUploading(false);
      setProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(fotoId) {
    if (!window.confirm('Remover esta foto?')) return;
    try {
      await api.del(`/app/os/${osId}/fotos/${fotoId}`);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.error || 'Erro ao remover');
    }
  }

  async function handleUpdateMeta(fotoId, field, value) {
    // Atualização local optimista — futuro: endpoint PATCH
    // Por enquanto apenas visual
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)' }}>
          📷 Fotos da OS
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8 }}>
            {fotos.length}/{maxFotos}
          </span>
        </div>
        {!disabled && fotos.length < maxFotos && (
          <div style={{ display: 'flex', gap: 6 }}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              📸 Câmera
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFiles}
                disabled={uploading}
              />
            </label>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8,
              background: 'var(--brand)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              🖼️ Galeria
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: 'none' }}
                onChange={handleFiles}
                disabled={uploading}
              />
            </label>
          </div>
        )}
      </div>

      {/* Progress / Error */}
      {progress && (
        <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1d4ed8', marginBottom: 10 }}>
          ⏳ {progress}
        </div>
      )}
      {error && (
        <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 10 }}>
          ❌ {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
        </div>
      )}

      {/* Grid de fotos */}
      {fotos.length === 0 ? (
        <div style={{
          padding: '32px 16px', textAlign: 'center',
          background: 'var(--gray-50)', borderRadius: 12,
          border: '2px dashed var(--gray-200)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            Nenhuma foto adicionada
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
            Tire fotos do problema para enviar ao cliente no orçamento
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}>
          {fotos.map(foto => (
            <div key={foto.id} style={{
              position: 'relative', borderRadius: 10, overflow: 'hidden',
              border: '1px solid var(--gray-200)', background: '#fff',
            }}>
              {/* Imagem (placeholder se não carregada ainda) */}
              <div style={{
                width: '100%', paddingBottom: '100%', position: 'relative',
                background: 'var(--gray-100)',
              }}>
                {foto.imagem_base64 ? (
                  <img
                    src={foto.imagem_base64}
                    alt={foto.titulo || 'Foto'}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: 24 }}>
                    📷
                  </div>
                )}
              </div>

              {/* Badge de categoria */}
              <div style={{
                position: 'absolute', top: 6, left: 6,
                padding: '2px 8px', borderRadius: 20,
                fontSize: 10, fontWeight: 700,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                backdropFilter: 'blur(4px)',
              }}>
                {CATEGORIAS.find(c => c.value === foto.categoria)?.label || foto.categoria}
              </div>

              {/* Botão remover */}
              {!disabled && (
                <button
                  onClick={() => handleDelete(foto.id)}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(220,38,38,0.85)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              )}

              {/* Título/descrição */}
              {foto.titulo && (
                <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--gray-600)', lineHeight: 1.3, borderTop: '1px solid var(--gray-100)' }}>
                  {foto.titulo}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dica */}
      {!disabled && fotos.length > 0 && fotos.length < maxFotos && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gray-400)' }}>
          💡 Tire fotos claras dos problemas encontrados. Elas aparecerão no orçamento enviado ao cliente.
        </div>
      )}
    </div>
  );
}
