import { useEffect, useRef, useState } from 'react';

/**
 * Leitor de código de barras via câmera.
 *
 * Estratégia de leitura (com fallback em cascata para funcionar em qualquer
 * dispositivo, incluindo iPhone/Safari):
 *   1. BarcodeDetector nativo — quando disponível (Chrome/Android). Mais leve.
 *   2. ZXing (@zxing/browser) — biblioteca JS que decodifica via canvas.
 *      Cobre iOS/Safari e navegadores sem BarcodeDetector.
 *   3. Input manual — sempre disponível como último recurso.
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const zxingRef  = useRef(null);   // controls do ZXing (para parar)
  const detectedRef = useRef(false); // evita disparo duplicado
  const [status, setStatus] = useState('iniciando'); // iniciando | lendo | manual
  const [manual, setManual] = useState('');
  const [erro, setErro]     = useState('');

  useEffect(() => {
    iniciar();
    return () => parar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finalizar(codigo) {
    if (detectedRef.current) return;
    detectedRef.current = true;
    parar();
    onDetected(codigo);
  }

  async function iniciar() {
    // Sem suporte a câmera → direto no manual
    if (!navigator.mediaDevices?.getUserMedia) {
      setErro('Câmera não disponível neste dispositivo. Use o campo abaixo.');
      setStatus('manual');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      // Aguarda o vídeo estar pronto antes de tentar decodificar
      await videoRef.current.play().catch(() => {});
      setStatus('lendo');

      if ('BarcodeDetector' in window) {
        lerComBarcodeDetector();
      } else {
        await lerComZxing();
      }
    } catch (err) {
      setErro('Não foi possível acessar a câmera. Verifique a permissão ou use o campo abaixo.');
      setStatus('manual');
    }
  }

  // ── Caminho 1: BarcodeDetector nativo ──
  async function lerComBarcodeDetector() {
    let detector;
    try {
      detector = new window.BarcodeDetector({
        formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e','itf','codabar'],
      });
    } catch {
      // Se falhar ao criar (formatos não suportados), cai para ZXing
      return lerComZxing();
    }
    const loop = async () => {
      if (detectedRef.current || !videoRef.current) return;
      if (videoRef.current.readyState >= 2) {
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            finalizar(codes[0].rawValue);
            return;
          }
        } catch { /* ignora frame */ }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }

  // ── Caminho 2: ZXing (fallback universal, inclui iOS) ──
  async function lerComZxing() {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      // Decodifica continuamente a partir do elemento <video> já ativo
      const controls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
        if (result && !detectedRef.current) {
          finalizar(result.getText());
        }
      });
      zxingRef.current = controls;
    } catch (err) {
      setErro('Não foi possível iniciar a leitura. Use o campo abaixo.');
      setStatus('manual');
    }
  }

  function parar() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (zxingRef.current) { try { zxingRef.current.stop(); } catch {} zxingRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }

  function submitManual(e) {
    e.preventDefault();
    if (!manual.trim()) return;
    finalizar(manual.trim());
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 'var(--r-lg)',
        width: '100%', maxWidth: 480,
        overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.4)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #f3f4f6',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
              <rect x="3" y="16" width="5" height="5"/>
              <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
              <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Leitor de código de barras</span>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 16 }}>✕</button>
        </div>

        {/* Câmera */}
        {status !== 'manual' && (
          <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
            {/* Mira */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 240, height: 120,
                border: '2px solid rgba(249,115,22,.8)',
                borderRadius: 8,
                boxShadow: '0 0 0 9999px rgba(0,0,0,.4)',
                position: 'relative',
              }}>
                {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h])=>(
                  <div key={v+h} style={{
                    position:'absolute', [v]:-2, [h]:-2,
                    width:20, height:20,
                    borderTop: v==='top'?'3px solid #F97316':'none',
                    borderBottom: v==='bottom'?'3px solid #F97316':'none',
                    borderLeft: h==='left'?'3px solid #F97316':'none',
                    borderRight: h==='right'?'3px solid #F97316':'none',
                    borderRadius: v==='top'&&h==='left'?'4px 0 0 0':v==='top'&&h==='right'?'0 4px 0 0':v==='bottom'&&h==='left'?'0 0 0 4px':'0 0 4px 0',
                  }} />
                ))}
                <div style={{
                  position:'absolute', left:4, right:4, top:'50%',
                  height:2, background:'rgba(249,115,22,.7)',
                  animation:'scanLine 1.5s ease-in-out infinite',
                }} />
              </div>
            </div>
            {status === 'lendo' && (
              <div style={{ position:'absolute', bottom:12, left:0, right:0, textAlign:'center', fontSize:12, color:'rgba(255,255,255,.75)' }}>
                Aponte a câmera para o código de barras
              </div>
            )}
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div style={{ padding:'12px 20px', background:'#fffbeb', fontSize:13, color:'#b45309', borderBottom:'1px solid rgba(217,119,6,.2)' }}>
            ⚠️ {erro}
          </div>
        )}

        {/* Input manual */}
        <div style={{ padding: 20 }}>
          <form onSubmit={submitManual}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ color: '#374151' }}>Código de barras (manual)</label>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={manual}
                  onChange={e => setManual(e.target.value)}
                  placeholder="Digite ou cole o código..."
                  autoFocus={status === 'manual'}
                  style={{ flex:1, background:'#fff', color:'#111827', border:'1.5px solid #d1d5db' }}
                />
                <button type="submit" className="btn btn-primary">Buscar</button>
              </div>
              <span style={{ fontSize:11, color:'#9ca3af', marginTop:4, display:'block' }}>
                Ex: 7891234567890
              </span>
            </div>
          </form>

          {status === 'lendo' && (
            <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center', color:'#6b7280' }}
              onClick={() => { parar(); setStatus('manual'); }}>
              ⌨️ Digitar manualmente
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%,100% { transform: translateY(-30px); opacity:.4; }
          50% { transform: translateY(30px); opacity:1; }
        }
      `}</style>
    </div>
  );
}
