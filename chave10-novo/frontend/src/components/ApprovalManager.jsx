import { useState } from 'react';
import { api } from '../api';
import '../styles/ApprovalManager.css';

export default function ApprovalManager({ orcamentoId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [validityHours, setValidityHours] = useState(168); // 7 days default

  async function generateLink(sendWhatsApp = false) {
    setLoading(true);
    try {
      const response = await api.post(`/approval/orcamentos/${orcamentoId}/link`, {
        validityHours,
        sendViaWhatsApp: sendWhatsApp
      });

      if (sendWhatsApp && response.sent) {
        alert('✅ Link gerado e enviado via WhatsApp!');
      } else if (sendWhatsApp && !response.sent) {
        alert(`⚠️ Link gerado mas não foi possível enviar via WhatsApp: ${response.whatsappError || 'erro desconhecido'}`);
      } else {
        // Copy to clipboard
        navigator.clipboard.writeText(response.link);
        alert('✅ Link gerado e copiado para área de transferência!');
      }

      if (onSuccess) onSuccess();
      loadStats();
    } catch (error) {
      alert('❌ ' + (error.error || 'Erro ao gerar link'));
    } finally {
      setLoading(false);
    }
  }

  async function regenerateLink() {
    if (!window.confirm('Deseja regenerar o link? O link anterior será invalidado.')) return;

    setLoading(true);
    try {
      const response = await api.post(`/approval/orcamentos/${orcamentoId}/regenerate-link`, {
        validityHours
      });

      navigator.clipboard.writeText(response.link);
      alert('✅ Novo link gerado e copiado para área de transferência!');

      if (onSuccess) onSuccess();
      loadStats();
    } catch (error) {
      alert('❌ ' + (error.error || 'Erro ao regenerar link'));
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    setLoading(true);
    try {
      const data = await api.get(`/approval/orcamentos/${orcamentoId}/stats`);
      setStats(data);
      setShowStats(true);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (stats?.currentLink?.link) {
      navigator.clipboard.writeText(stats.currentLink.link);
      alert('✅ Link copiado para área de transferência!');
    }
  }

  function formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const statusLabel = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    expired: 'Expirado'
  };

  const statusClass = {
    pending: 'badge-orange',
    approved: 'badge-green',
    rejected: 'badge-red',
    expired: 'badge-gray'
  };

  const actionLabel = {
    link_generated: '🔗 Link gerado',
    link_sent: '📤 Enviado via WhatsApp',
    link_accessed: '👁️ Link acessado',
    approved: '✅ Aprovado',
    rejected: '❌ Rejeitado',
    expired: '⏰ Expirado',
    regenerated: '🔄 Link regenerado'
  };

  return (
    <div className="approval-manager">
      <div className="approval-header">
        <h3>📱 Aprovação via WhatsApp</h3>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <div className="approval-body">
        {!showStats ? (
          <>
            <p className="approval-desc">
              Gere um link único para o cliente aprovar este orçamento pelo celular.
            </p>

            <div className="form-group">
              <label>Validade do link</label>
              <select 
                value={validityHours} 
                onChange={(e) => setValidityHours(Number(e.target.value))}
                disabled={loading}
              >
                <option value={24}>24 horas</option>
                <option value={48}>2 dias</option>
                <option value={72}>3 dias</option>
                <option value={168}>7 dias (padrão)</option>
                <option value={336}>14 dias</option>
                <option value={720}>30 dias</option>
              </select>
            </div>

            <div className="approval-actions">
              <button
                className="btn btn-primary"
                onClick={() => generateLink(true)}
                disabled={loading}
              >
                {loading ? '⏳ Gerando...' : '📤 Gerar e Enviar via WhatsApp'}
              </button>

              <button
                className="btn btn-outline"
                onClick={() => generateLink(false)}
                disabled={loading}
              >
                {loading ? '⏳ Gerando...' : '🔗 Apenas Gerar Link'}
              </button>

              <button
                className="btn btn-outline btn-sm"
                onClick={loadStats}
                disabled={loading}
              >
                📊 Ver Estatísticas
              </button>
            </div>
          </>
        ) : (
          <>
            {stats.currentLink ? (
              <div className="stats-section">
                <h4>📊 Link Ativo</h4>
                
                <div className="stat-card">
                  <div className="stat-label">Link de aprovação</div>
                  <div className="link-display">
                    <input 
                      type="text" 
                      value={stats.currentLink.link} 
                      readOnly 
                      className="link-input"
                    />
                    <button className="btn btn-sm" onClick={copyLink}>
                      📋 Copiar
                    </button>
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-label">Criado em</div>
                    <div className="stat-value">{formatDate(stats.currentLink.createdAt)}</div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">Expira em</div>
                    <div className="stat-value">{formatDate(stats.currentLink.expiresAt)}</div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">Acessos</div>
                    <div className="stat-value">{stats.currentLink.accessCount || 0}</div>
                  </div>

                  {stats.currentLink.sentAt && (
                    <div className="stat-item">
                      <div className="stat-label">Enviado em</div>
                      <div className="stat-value">{formatDate(stats.currentLink.sentAt)}</div>
                    </div>
                  )}

                  {stats.currentLink.lastAccessedAt && (
                    <div className="stat-item">
                      <div className="stat-label">Último acesso</div>
                      <div className="stat-value">{formatDate(stats.currentLink.lastAccessedAt)}</div>
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-outline btn-sm"
                  onClick={regenerateLink}
                  disabled={loading}
                >
                  🔄 Regenerar Link
                </button>
              </div>
            ) : (
              <div className="empty-stats">
                <p>Nenhum link ativo encontrado</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowStats(false)}
                >
                  Gerar Link
                </button>
              </div>
            )}

            {stats.status && (
              <div className="stats-section">
                <h4>Status do Orçamento</h4>
                <div className="status-display">
                  <span className={`badge ${statusClass[stats.status]}`}>
                    {statusLabel[stats.status] || stats.status}
                  </span>
                  {stats.approvedAt && (
                    <span className="status-date">
                      Aprovado em {formatDate(stats.approvedAt)}
                    </span>
                  )}
                  {stats.rejectedAt && (
                    <>
                      <span className="status-date">
                        Rejeitado em {formatDate(stats.rejectedAt)}
                      </span>
                      {stats.rejectionReason && (
                        <div className="rejection-reason">
                          <strong>Motivo:</strong> {stats.rejectionReason}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {stats.signature && (
              <div className="stats-section">
                <h4>✍️ Assinatura Digital</h4>
                <div className="signature-display">
                  <img src={stats.signature.data} alt="Assinatura" />
                  <div className="signature-date">
                    Assinado em {formatDate(stats.signature.signedAt)}
                  </div>
                </div>
              </div>
            )}

            {stats.auditTrail && stats.auditTrail.length > 0 && (
              <div className="stats-section">
                <h4>📋 Histórico</h4>
                <div className="audit-trail">
                  {stats.auditTrail.map((entry, idx) => (
                    <div key={idx} className="audit-entry">
                      <div className="audit-action">
                        {actionLabel[entry.action] || entry.action}
                      </div>
                      <div className="audit-details">
                        <span className="audit-time">{formatDate(entry.timestamp)}</span>
                        {entry.user && (
                          <span className="audit-user">por {entry.user}</span>
                        )}
                        {entry.ipAddress && (
                          <span className="audit-ip">IP: {entry.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-outline"
              onClick={() => setShowStats(false)}
            >
              ← Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
