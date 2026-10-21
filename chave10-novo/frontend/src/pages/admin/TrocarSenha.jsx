import { useState } from 'react';
import { api } from '../../api';

export default function TrocarSenha() {
  const [form, setForm] = useState({ senha_atual: '', senha_nova: '', senha_confirma: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validações frontend
    if (!form.senha_atual || !form.senha_nova || !form.senha_confirma) {
      setError('Preencha todos os campos');
      return;
    }
    if (form.senha_nova.length < 8) {
      setError('Nova senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (form.senha_nova !== form.senha_confirma) {
      setError('Nova senha e confirmação não coincidem');
      return;
    }
    if (form.senha_nova === form.senha_atual) {
      setError('Nova senha deve ser diferente da atual');
      return;
    }

    setLoading(true);
    try {
      await api.admin.trocarSenha(form.senha_atual, form.senha_nova);
      setSuccess(true);
      setForm({ senha_atual: '', senha_nova: '', senha_confirma: '' });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao trocar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Trocar Senha</div>
          <div className="page-subtitle">Altere sua senha de administrador</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <div className="card-header">
          <div className="card-title">Segurança da Conta</div>
        </div>

        {success && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid rgba(34,197,94,.3)',
            borderRadius: 'var(--r)',
            padding: '14px 18px',
            margin: '0 20px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>
                Senha alterada com sucesso!
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                Use sua nova senha no próximo login
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--error-bg)',
            border: '1px solid rgba(239,68,68,.3)',
            borderRadius: 'var(--r)',
            padding: '14px 18px',
            margin: '0 20px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <span style={{ fontSize: 20 }}>❌</span>
            <div style={{ fontWeight: 600, color: 'var(--error)', fontSize: 14 }}>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px' }}>
          <div className="form-group">
            <label>Senha Atual *</label>
            <input
              type="password"
              className="form-control"
              value={form.senha_atual}
              onChange={(e) => setForm({ ...form, senha_atual: e.target.value })}
              placeholder="Digite sua senha atual"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label>Nova Senha *</label>
            <input
              type="password"
              className="form-control"
              value={form.senha_nova}
              onChange={(e) => setForm({ ...form, senha_nova: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
              autoComplete="new-password"
            />
            <small style={{ color: 'var(--gray-400)', fontSize: 12, marginTop: 4, display: 'block' }}>
              Use letras, números e caracteres especiais para maior segurança
            </small>
          </div>

          <div className="form-group">
            <label>Confirmar Nova Senha *</label>
            <input
              type="password"
              className="form-control"
              value={form.senha_confirma}
              onChange={(e) => setForm({ ...form, senha_confirma: e.target.value })}
              placeholder="Digite a nova senha novamente"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>

        <div style={{
          padding: '16px 20px',
          background: 'var(--gray-50)',
          borderTop: '1px solid var(--gray-100)',
          borderRadius: '0 0 var(--r) var(--r)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
            <strong>💡 Dicas de segurança:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>Use no mínimo 8 caracteres</li>
              <li>Combine letras maiúsculas e minúsculas</li>
              <li>Inclua números e símbolos</li>
              <li>Não use senhas óbvias ou dados pessoais</li>
              <li>Troque sua senha regularmente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
