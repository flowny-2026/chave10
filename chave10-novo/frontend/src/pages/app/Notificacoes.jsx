import NotificationSettings from '../../components/NotificationSettings';

export default function Notificacoes() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notificações</h1>
          <p className="page-subtitle">Configure alertas importantes para sua oficina</p>
        </div>
      </div>

      <NotificationSettings />
    </div>
  );
}
