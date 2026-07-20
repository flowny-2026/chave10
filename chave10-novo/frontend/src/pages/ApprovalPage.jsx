import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from '../components/SignatureCanvas';
import '../styles/ApprovalPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper para fazer requisições sem autenticação
async function fetchPublic(url, options = {}) {
  const response = await fetch(API_URL + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw error;
  }
  
  return response.json();
}

export default function ApprovalPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [signature, setSignature] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadBudget();
  }, [token]);

  async function loadBudget() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchPublic(`/approval/public/${token}`);
      
      if (!response.valid) {
        setError(response);
      } else {
        setData(response);
      }
    } catch (err) {
      console.error('Error loading budget:', err);
      setError({
        error: 'network_error',
        message: 'Erro ao carregar orçamento. Verifique sua conexão.'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (data.budget.requireSignature && !signature) {
      setShowSignature(true);
      return;
    }

    setProcessing(true);

    try {
      const response = await fetchPublic(`/approval/public/${token}/approve`, {
        method: 'POST',
        body: JSON.stringify({ signature })
      });

      setResult({
        type: 'success',
        message: response.message || 'Orçamento aprovado com sucesso!'
      });
    } catch (err) {
      console.error('Error approving:', err);
      setResult({
        type: 'error',
        message: err.message || 'Erro ao aprovar orçamento'
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!showRejectReason) {
      setShowRejectReason(true);
      return;
    }

    setProcessing(true);

    try {
      const response = await fetchPublic(`/approval/public/${token}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() || null })
      });

      setResult({
        type: 'info',
        message: response.message || 'Orçamento recusado'
      });
    } catch (err) {
      console.error('Error rejecting:', err);
      setResult({
        type: 'error',
        message: err.message || 'Erro ao recusar orçamento'
      });
    } finally {
      setProcessing(false);
    }
  }

  function handleSignatureComplete(signatureData) {
    setSignature(signatureData);
    setShowSignature(false);
    // Auto-approve after signature
    setTimeout(() => handleApprove(), 300);
  }

  if (loading) {
    return (
      <div className="approval-page">
        <div className="approval-container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Carregando orçamento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="approval-page">
        <div className="approval-container">
          <div className="error-state">
            {error.error === 'expired' && (
              <>
                <div className="error-icon">⏰</div>
                <h2>Link Expirado</h2>
                <p>{error.message}</p>
                {error.oficina && (
                  <div className="oficina-contact">
                    <h3>Entre em contato:</h3>
                    <p><strong>{error.oficina.nome}</strong></p>
                    <p>{error.oficina.telefone}</p>
                    {error.oficina.endereco && <p>{error.oficina.endereco}</p>}
                  </div>
                )}
              </>
            )}
            {error.error === 'already_processed' && (
              <>
                <div className="error-icon">
                  {error.status === 'approved' ? '✅' : '❌'}
                </div>
                <h2>Orçamento Já Processado</h2>
                <p>{error.message}</p>
              </>
            )}
            {error.error !== 'expired' && error.error !== 'already_processed' && (
              <>
                <div className="error-icon">⚠️</div>
                <h2>Link Inválido</h2>
                <p>{error.message || 'Este link não é válido ou não existe.'}</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="approval-page">
        <div className="approval-container">
          <div className={`result-state ${result.type}`}>
            <div className="result-icon">
              {result.type === 'success' && '✅'}
              {result.type === 'info' && 'ℹ️'}
              {result.type === 'error' && '❌'}
            </div>
            <h2>{result.message}</h2>
            {result.type === 'success' && (
              <p className="result-subtitle">
                A oficina foi notificada da sua aprovação.
              </p>
            )}
            {result.type === 'info' && (
              <p className="result-subtitle">
                A oficina foi notificada da sua decisão.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { budget, expiresAt } = data;
  const expiryDate = new Date(expiresAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="approval-page">
      <div className="approval-container">
        {/* Header */}
        <div className="approval-header">
          <h1>{budget.oficina.nome}</h1>
          <div className="budget-number">
            Orçamento #{budget.numero}
          </div>
        </div>

        {/* Client & Vehicle Info */}
        <div className="info-section">
          <div className="info-row">
            <span className="label">Cliente:</span>
            <span className="value">{budget.cliente.nome}</span>
          </div>
          {budget.veiculo.placa && (
            <>
              <div className="info-row">
                <span className="label">Veículo:</span>
                <span className="value">
                  {budget.veiculo.marca} {budget.veiculo.modelo}
                  {budget.veiculo.ano && ` (${budget.veiculo.ano})`}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Placa:</span>
                <span className="value">{budget.veiculo.placa}</span>
              </div>
            </>
          )}
        </div>

        {/* Description */}
        {budget.descricao && (
          <div className="description-section">
            <h3>Descrição</h3>
            <p>{budget.descricao}</p>
          </div>
        )}

        {/* Fotos dos problemas encontrados (orçamento interativo) */}
        {budget.fotos && budget.fotos.length > 0 && (
          <div className="items-section">
            <h3>📷 Problemas Encontrados</h3>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
              Fotos reais do seu veículo mostrando os pontos que precisam de atenção.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 10,
            }}>
              {budget.fotos.map((foto, idx) => (
                <div key={idx} style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: '1px solid #E5E7EB', background: '#fff',
                }}>
                  {foto.imagem_base64 && (
                    <img
                      src={foto.imagem_base64}
                      alt={foto.titulo || `Foto ${idx + 1}`}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  {(foto.titulo || foto.descricao) && (
                    <div style={{ padding: '8px 10px' }}>
                      {foto.titulo && <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>{foto.titulo}</div>}
                      {foto.descricao && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{foto.descricao}</div>}
                    </div>
                  )}
                  {foto.categoria && foto.categoria !== 'outro' && (
                    <div style={{
                      padding: '4px 10px 6px', fontSize: 10, fontWeight: 700,
                      color: foto.categoria === 'problema' ? '#dc2626' : '#2563eb',
                      textTransform: 'uppercase',
                    }}>
                      {foto.categoria === 'problema' ? '⚠️ Problema' : foto.categoria === 'peca' ? '🔧 Peça' : foto.categoria}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {budget.servicos && budget.servicos.length > 0 && (
          <div className="items-section">
            <h3>Serviços</h3>
            <div className="items-list">
              {budget.servicos.map((servico, idx) => (
                <div key={idx} className="item-row">
                  <span className="item-name">• {servico.nome || servico.descricao}</span>
                  <span className="item-price">
                    R$ {(servico.valor || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parts */}
        {budget.pecas && budget.pecas.length > 0 && (
          <div className="items-section">
            <h3>Peças</h3>
            <div className="items-list">
              {budget.pecas.map((peca, idx) => (
                <div key={idx} className="item-row">
                  <span className="item-name">
                    • {peca.nome}
                    {peca.quantidade > 1 && ` (${peca.quantidade}x)`}
                  </span>
                  <span className="item-price">
                    R$ {(peca.valor || peca.preco || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Summary */}
        <div className="total-section">
          <div className="total-row">
            <span>Mão de Obra:</span>
            <span>R$ {budget.valorMO.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="total-row">
            <span>Peças:</span>
            <span>R$ {budget.valorPecas.toFixed(2).replace('.', ',')}</span>
          </div>
          {budget.desconto > 0 && (
            <div className="total-row discount">
              <span>Desconto:</span>
              <span>-R$ {budget.desconto.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="total-row final">
            <span>TOTAL:</span>
            <span>R$ {budget.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* Observations */}
        {budget.obs && (
          <div className="obs-section">
            <h4>Observações:</h4>
            <p>{budget.obs}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="btn-approve"
            onClick={handleApprove}
            disabled={processing}
          >
            {processing ? 'Processando...' : '✓ Aprovar Orçamento'}
          </button>
          <button
            className="btn-reject"
            onClick={handleReject}
            disabled={processing}
          >
            ✗ Recusar
          </button>
        </div>

        {/* Reject Reason Input */}
        {showRejectReason && !result && (
          <div className="reject-reason-section">
            <label>Motivo da recusa (opcional):</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Valor acima do esperado"
              maxLength={500}
              rows={3}
            />
            <button
              className="btn-confirm-reject"
              onClick={handleReject}
              disabled={processing}
            >
              Confirmar Recusa
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="approval-footer">
          <p className="expiry-info">
            ⏰ Link válido até {expiryDate}
          </p>
          <div className="oficina-info">
            <p><strong>{budget.oficina.nome}</strong></p>
            {budget.oficina.telefone && <p>📞 {budget.oficina.telefone}</p>}
            {budget.oficina.endereco && <p>📍 {budget.oficina.endereco}</p>}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignature && (
        <SignatureCanvas
          onComplete={handleSignatureComplete}
          onCancel={() => setShowSignature(false)}
        />
      )}
    </div>
  );
}
