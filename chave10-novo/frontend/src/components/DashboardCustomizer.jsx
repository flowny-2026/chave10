import { useState } from 'react';

// Widgets disponíveis
export const AVAILABLE_WIDGETS = {
  faturamento: {
    id: 'faturamento',
    title: '💰 Faturamento',
    description: 'Valor total faturado no período',
    defaultSize: 'medium',
    category: 'financeiro',
  },
  os_finalizadas: {
    id: 'os_finalizadas',
    title: '✅ OS Finalizadas',
    description: 'Ordens de serviço concluídas',
    defaultSize: 'small',
    category: 'operacional',
  },
  os_andamento: {
    id: 'os_andamento',
    title: '🔧 OS em Andamento',
    description: 'Ordens em progresso',
    defaultSize: 'small',
    category: 'operacional',
  },
  clientes: {
    id: 'clientes',
    title: '👥 Total de Clientes',
    description: 'Base de clientes cadastrados',
    defaultSize: 'small',
    category: 'clientes',
  },
  meta_mensal: {
    id: 'meta_mensal',
    title: '🎯 Meta Mensal',
    description: 'Progresso da meta de faturamento',
    defaultSize: 'large',
    category: 'financeiro',
  },
  grafico_mensal: {
    id: 'grafico_mensal',
    title: '📊 Gráfico Mensal',
    description: 'Faturamento dos últimos meses',
    defaultSize: 'large',
    category: 'financeiro',
  },
  os_recentes: {
    id: 'os_recentes',
    title: '📋 OS Recentes',
    description: 'Últimas ordens de serviço',
    defaultSize: 'large',
    category: 'operacional',
  },
  breakdown_mo_pecas: {
    id: 'breakdown_mo_pecas',
    title: '🔩 MO vs Peças',
    description: 'Divisão entre mão de obra e peças',
    defaultSize: 'medium',
    category: 'financeiro',
  },
};

// Layout padrão
export const DEFAULT_LAYOUT = [
  { id: 'meta_mensal', order: 0 },
  { id: 'faturamento', order: 1 },
  { id: 'os_finalizadas', order: 2 },
  { id: 'os_andamento', order: 3 },
  { id: 'clientes', order: 4 },
  { id: 'grafico_mensal', order: 5 },
  { id: 'os_recentes', order: 6 },
];

export default function DashboardCustomizer({ layout, onSave, onClose }) {
  const [selectedWidgets, setSelectedWidgets] = useState(layout.map(w => w.id));
  const [widgetOrder, setWidgetOrder] = useState(layout);

  function toggleWidget(widgetId) {
    if (selectedWidgets.includes(widgetId)) {
      setSelectedWidgets(prev => prev.filter(id => id !== widgetId));
      setWidgetOrder(prev => prev.filter(w => w.id !== widgetId));
    } else {
      setSelectedWidgets(prev => [...prev, widgetId]);
      const newOrder = widgetOrder.length;
      setWidgetOrder(prev => [...prev, { id: widgetId, order: newOrder }]);
    }
  }

  function moveWidget(widgetId, direction) {
    const currentIndex = widgetOrder.findIndex(w => w.id === widgetId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= widgetOrder.length) return;

    const newOrder = [...widgetOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    
    // Atualiza os índices de ordem
    newOrder.forEach((widget, idx) => {
      widget.order = idx;
    });

    setWidgetOrder(newOrder);
  }

  function handleSave() {
    onSave(widgetOrder);
    onClose();
  }

  function resetToDefault() {
    setSelectedWidgets(DEFAULT_LAYOUT.map(w => w.id));
    setWidgetOrder(DEFAULT_LAYOUT);
  }

  const categories = {
    financeiro: { label: 'Financeiro', icon: '💰', color: '#F97316' },
    operacional: { label: 'Operacional', icon: '🔧', color: '#1E3A5F' },
    clientes: { label: 'Clientes', icon: '👥', color: '#7c3aed' },
  };

  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h2>🎨 Personalizar Dashboard</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Info */}
          <div style={{
            padding: 14,
            background: 'var(--info-bg)',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--gray-700)',
          }}>
            💡 <strong>Dica:</strong> Selecione os widgets que deseja visualizar e reorganize a ordem usando as setas.
          </div>

          {/* Widgets Selecionados */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)' }}>
                Widgets Ativos ({selectedWidgets.length})
              </h3>
              <button
                onClick={resetToDefault}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12 }}
              >
                🔄 Restaurar padrão
              </button>
            </div>

            {widgetOrder.length === 0 ? (
              <div style={{
                padding: 32,
                textAlign: 'center',
                background: 'var(--gray-50)',
                borderRadius: 8,
                color: 'var(--gray-400)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                <p style={{ fontSize: 13 }}>Nenhum widget selecionado</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {widgetOrder.map((widget, index) => {
                  const widgetInfo = AVAILABLE_WIDGETS[widget.id];
                  const category = categories[widgetInfo.category];
                  
                  return (
                    <div
                      key={widget.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        background: '#fff',
                        border: '2px solid var(--gray-200)',
                        borderRadius: 8,
                        transition: 'all .15s',
                      }}
                    >
                      {/* Ordem */}
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: 'var(--brand-light)',
                        color: 'var(--brand)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {index + 1}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 2 }}>
                          {widgetInfo.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: `${category.color}15`,
                              color: category.color,
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {category.icon} {category.label}
                          </span>
                        </div>
                      </div>

                      {/* Controles */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => moveWidget(widget.id, 'up')}
                          disabled={index === 0}
                          className="btn btn-ghost btn-icon"
                          style={{ opacity: index === 0 ? 0.3 : 1 }}
                          title="Mover para cima"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => moveWidget(widget.id, 'down')}
                          disabled={index === widgetOrder.length - 1}
                          className="btn btn-ghost btn-icon"
                          style={{ opacity: index === widgetOrder.length - 1 ? 0.3 : 1 }}
                          title="Mover para baixo"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleWidget(widget.id)}
                          className="btn btn-ghost btn-icon"
                          style={{ color: 'var(--danger)' }}
                          title="Remover"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Widgets Disponíveis */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 12 }}>
              Adicionar Widgets
            </h3>

            {Object.entries(categories).map(([categoryId, category]) => {
              const widgetsInCategory = Object.values(AVAILABLE_WIDGETS).filter(
                w => w.category === categoryId && !selectedWidgets.includes(w.id)
              );

              if (widgetsInCategory.length === 0) return null;

              return (
                <div key={categoryId} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: category.color,
                    textTransform: 'uppercase',
                    letterSpacing: '.6px',
                    marginBottom: 8,
                  }}>
                    {category.icon} {category.label}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {widgetsInCategory.map(widget => (
                      <button
                        key={widget.id}
                        onClick={() => toggleWidget(widget.id)}
                        style={{
                          padding: '10px 12px',
                          background: '#fff',
                          border: '1.5px dashed var(--gray-300)',
                          borderRadius: 8,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all .15s',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.borderColor = category.color;
                          e.currentTarget.style.background = `${category.color}08`;
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.borderColor = 'var(--gray-300)';
                          e.currentTarget.style.background = '#fff';
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 3 }}>
                          {widget.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                          {widget.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-actions" style={{ borderTop: '1px solid var(--gray-200)', padding: '16px 22px' }}>
          <button className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Salvar Layout
          </button>
        </div>
      </div>
    </div>
  );
}
