import { useState, useEffect } from 'react';
import { notificationManager } from '../utils/notificationManager';

export default function NotificationSettings() {
  const [permission, setPermission] = useState('default');
  const [preferences, setPreferences] = useState(notificationManager.getPreferences());
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    setPermission(notificationManager.permission);
  }, []);

  async function handleRequestPermission() {
    setIsRequesting(true);
    const result = await notificationManager.requestPermission();
    setPermission(notificationManager.permission);
    setIsRequesting(false);

    if (result.success) {
      // Mostra notificação de teste
      notificationManager.showNotification({
        title: '🔔 Notificações ativadas!',
        body: 'Você receberá alertas importantes do Chave 10',
        tag: 'welcome-notification',
      });
    }
  }

  function handlePreferenceChange(key, value) {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    notificationManager.savePreferences(newPrefs);
  }

  function handleTestNotification() {
    notificationManager.showNotification({
      title: '🔔 Notificação de teste',
      body: 'Se você viu isso, as notificações estão funcionando!',
      tag: 'test-notification',
    });
  }

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
          🔔 Notificações
        </h2>
        <p style={{ fontSize: 14, color: 'var(--gray-500)', margin: 0 }}>
          Configure alertas importantes para não perder nada
        </p>
      </div>

      {/* Status de Permissão */}
      <div style={{
        padding: 16,
        borderRadius: 12,
        background: permission === 'granted' ? '#F0FDF4' : permission === 'denied' ? '#FEF2F2' : '#FFF7ED',
        border: `1px solid ${permission === 'granted' ? '#BBF7D0' : permission === 'denied' ? '#FECACA' : '#FED7AA'}`,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>
            {permission === 'granted' ? '✅' : permission === 'denied' ? '🚫' : '⚠️'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 2 }}>
              {permission === 'granted' && 'Notificações ativadas'}
              {permission === 'denied' && 'Notificações bloqueadas'}
              {permission === 'default' && 'Permissão necessária'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>
              {permission === 'granted' && 'Você receberá alertas quando necessário'}
              {permission === 'denied' && 'Ative as notificações nas configurações do navegador'}
              {permission === 'default' && 'Clique no botão abaixo para ativar'}
            </div>
          </div>
          {permission === 'default' && (
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="btn-primary"
              style={{ fontSize: 13 }}
            >
              {isRequesting ? 'Aguarde...' : 'Ativar'}
            </button>
          )}
          {permission === 'granted' && (
            <button
              onClick={handleTestNotification}
              className="btn-secondary"
              style={{ fontSize: 13 }}
            >
              Testar
            </button>
          )}
        </div>
      </div>

      {/* Preferências (só mostra se tem permissão) */}
      {permission === 'granted' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 12 }}>
              Tipos de Notificação
            </h3>

            <NotificationToggle
              icon="✅"
              label="OS Finalizadas"
              description="Receba alerta quando uma ordem de serviço for concluída"
              checked={preferences.osFinalizadas}
              onChange={(checked) => handlePreferenceChange('osFinalizadas', checked)}
            />

            <NotificationToggle
              icon="💰"
              label="Pagamentos Vencendo"
              description="Alerta sobre pagamentos próximos do vencimento"
              checked={preferences.pagamentosVencendo}
              onChange={(checked) => handlePreferenceChange('pagamentosVencendo', checked)}
            />

            <NotificationToggle
              icon="📅"
              label="Revisões Agendadas"
              description="Lembrete de revisões marcadas para hoje e amanhã"
              checked={preferences.revisoesAgendadas}
              onChange={(checked) => handlePreferenceChange('revisoesAgendadas', checked)}
            />

            <NotificationToggle
              icon="😴"
              label="Clientes Inativos"
              description="Notificação sobre clientes sem movimento há muito tempo"
              checked={preferences.clientesInativos}
              onChange={(checked) => handlePreferenceChange('clientesInativos', checked)}
            />
          </div>

          {/* Configurações Avançadas */}
          <div style={{ paddingTop: 20, borderTop: '1px solid var(--gray-200)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 12 }}>
              Configurações Avançadas
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                Avisar sobre vencimentos com quantos dias de antecedência?
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={preferences.diasAvisoVencimento}
                onChange={(e) => handlePreferenceChange('diasAvisoVencimento', parseInt(e.target.value, 10))}
                style={{
                  width: 80,
                  padding: '8px 12px',
                  border: '1px solid var(--gray-300)',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--gray-500)' }}>dias</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                Considerar cliente inativo após quantos dias sem movimento?
              </label>
              <input
                type="number"
                min="30"
                max="365"
                step="30"
                value={preferences.diasInatividade}
                onChange={(e) => handlePreferenceChange('diasInatividade', parseInt(e.target.value, 10))}
                style={{
                  width: 80,
                  padding: '8px 12px',
                  border: '1px solid var(--gray-300)',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--gray-500)' }}>dias</span>
            </div>
          </div>
        </>
      )}

      {/* Info sobre navegadores */}
      <div style={{
        marginTop: 24,
        padding: 12,
        background: 'var(--gray-50)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--gray-600)',
      }}>
        <strong>💡 Dica:</strong> Para receber notificações mesmo com o navegador fechado, instale o Chave 10 como aplicativo (PWA) através do menu do navegador.
      </div>
    </div>
  );
}

function NotificationToggle({ icon, label, description, checked, onChange }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid var(--gray-100)',
    }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          {description}
        </div>
      </div>
      <label className="toggle-switch" style={{ flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
}
