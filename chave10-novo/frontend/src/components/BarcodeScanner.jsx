import { useEffect, useRef, useState } from 'react';

/**
 * Leitor de código de barras via câmera (BarcodeDetector API)
 * Fallback: input manual
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const [status, setStatus]     = useState('iniciando'); // iniciando | lendo | erro | manual
  const [manual, setManual]     = useState('');
  const [erro, setErro]         = useState('');
  const [suportado, setSuportado] = useState(true);

  useEffect(() => {
    // Verifica suporte
    if (!('BarcodeDetector' in window)) {
      setSuportado(false);
      setStatus('manual');
      return;
    }
    iniciarCamera();
    return () => pararCamera();
  }, []);

  async function iniciarCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStatus('lendo');
        escanear();
      }
    } catch (err) {
      setErro('Câmera não disponível. Use o campo manual abaixo.');
      setStatus('manual');
    }
  }

  function pararCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }

  async function escanear() {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      rafRef.current = requestAnimationFrame(escanear);
      return;
    }
    try {
      const detector = new window.BarcodeDetector({
        formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e']
      });
      const codes = await detector.detect(videoRef.current);
      if (codes.length > 0) {
        pararCamera();
        onDetected(codes[0].rawValue);
        return;
      }
    } catch {}
    rafRef.current = requestAnimationFrame(escanear);
  }

  function submitManual(e) {
    e.preventDefault();
    if (!manual.trim()) return;
    onDetected(manual.trim());
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
          padding: '16px 20px', borderBottom: '1px solid var(--gray-100)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
              <rect x="3" y="16" width="5" height="5"/>
              <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
              <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>Leitor de código de barras</span>
          </div>
          <button onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', fontSize: 16 }}>✕</button>
        </div>

        {/* Câmera */}
        {status !== 'manual' && suportado && (
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
                {/* Cantos */}
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
                {/* Linha de scan */}
                <div style={{
                  position:'absolute', left:4, right:4, top:'50%',
                  height:2, background:'rgba(249,115,22,.7)',
                  animation:'scanLine 1.5s ease-in-out infinite',
                }} />
              </div>
            </div>
            {status === 'lendo' && (
              <div style={{ position:'absolute', bottom:12, left:0, right:0, textAlign:'center', fontSize:12, color:'rgba(255,255,255,.7)' }}>
                Aponte a câmera para o código de barras
              </div>
            )}
          </div>
        )}

        {/* Erro ou sem suporte */}
        {(erro || !suportado) && (
          <div style={{ padding:'12px 20px', background:'var(--warning-bg)', fontSize:13, color:'var(--warning)', borderBottom:'1px solid rgba(217,119,6,.2)' }}>
            {!suportado ? '⚠️ Seu browser não suporta leitura automática. Use o campo abaixo.' : `⚠️ ${erro}`}
          </div>
        )}

        {/* Input manual */}
        <div style={{ padding: 20 }}>
          <form onSubmit={submitManual}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Código de barras (manual)</label>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  type="text"
                  value={manual}
                  onChange={e => setManual(e.target.value)}
                  placeholder="Digite ou cole o código..."
                  autoFocus={status === 'manual'}
                  style={{ flex:1 }}
                />
                <button type="submit" className="btn btn-primary">Buscar</button>
              </div>
              <span style={{ fontSize:11, color:'var(--gray-400)', marginTop:4, display:'block' }}>
                Ex: 7891234567890
              </span>
            </div>
          </form>

          {status === 'lendo' && (
            <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center', color:'var(--gray-500)' }}
              onClick={() => { pararCamera(); setStatus('manual'); }}>
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
