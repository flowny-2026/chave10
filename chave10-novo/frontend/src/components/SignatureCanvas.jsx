import { useRef, useState, useEffect } from 'react';
import '../styles/SignatureCanvas.css';

export default function SignatureCanvas({ onComplete, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 200;

    // Get context
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setContext(ctx);

    // Fill with white background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function startDrawing(e) {
    if (!context) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    context.beginPath();
    context.moveTo(x, y);
  }

  function draw(e) {
    if (!isDrawing || !context) return;

    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    context.lineTo(x, y);
    context.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (context) {
      context.closePath();
    }
  }

  function clearSignature() {
    if (!context || !canvasRef.current) return;

    const canvas = canvasRef.current;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  function handleConfirm() {
    if (!hasSignature) {
      alert('Por favor, assine antes de confirmar');
      return;
    }

    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    onComplete(signatureData);
  }

  return (
    <div className="signature-modal">
      <div className="signature-modal-content">
        <h3>Assine para confirmar</h3>
        <p className="signature-instructions">
          Desenhe sua assinatura no espaço abaixo
        </p>

        <div className="signature-canvas-container">
          <canvas
            ref={canvasRef}
            className="signature-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="signature-line"></div>
        </div>

        <div className="signature-actions">
          <button
            className="btn-clear"
            onClick={clearSignature}
            disabled={!hasSignature}
          >
            🗑️ Limpar
          </button>
          <button
            className="btn-cancel"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!hasSignature}
          >
            ✓ Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
