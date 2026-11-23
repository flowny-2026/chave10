# Design Document - Smart Inventory Management

## Overview

This document describes the technical design for the Smart Inventory Management feature, which provides intelligent monitoring, automatic alerts, usage-based purchase suggestions, and supplier management.

## Architecture

### High-Level Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Workshop UI    │────────▶│  Express API     │────────▶│  PostgreSQL DB  │
│  (React)        │         │  (Node.js)       │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                    │
                                    ▼
                            ┌──────────────────┐
                            │  Notification    │
                            │  System          │
                            └──────────────────┘
                                    │
                                    ▼
                            ┌──────────────────┐
                            │  Background      │
                            │  Jobs (Cron)     │
                            └──────────────────┘
```

### Component Diagram

```
Backend Components:
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Inventory       │      │  Stock Movement  │          │
│  │  Controller      │─────▶│  Service         │          │
│  └──────────────────┘      └──────────────────┘          │
│           │                                                │
│           ▼                                                │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Alert           │      │  Purchase        │          │
│  │  Generator       │─────▶│  Suggestion      │          │
│  └──────────────────┘      │  Engine          │          │
│                            └──────────────────┘          │
│           │                         │                      │
│           ▼                         ▼                      │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Supplier        │      │  Usage           │          │
│  │  Manager         │      │  Analytics       │          │
│  └──────────────────┘      └──────────────────┘          │
│                                                            │
└────────────────────────────────────────────────────────────┘

Frontend Components:
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Inventory List  │      │  Low Stock       │          │
│  │  Component       │─────▶│  Alerts Widget   │          │
│  └──────────────────┘      └──────────────────┘          │
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Purchase        │      │  Supplier        │          │
│  │  Suggestions     │─────▶│  Manager         │          │
│  └──────────────────┘      └──────────────────┘          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Data Model

### New Tables

#### suppliers
```sql
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  contato_pessoa TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cnpj TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(oficina_id, nome)
);

CREATE INDEX idx_suppliers_oficina ON suppliers(oficina_id);
CREATE INDEX idx_suppliers_ativo ON suppliers(oficina_id, ativo);
```

#### item_suppliers
```sql
CREATE TABLE item_suppliers (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES estoque(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  preco_unitario DECIMAL(10,2) NOT NULL,
  moeda TEXT DEFAULT 'BRL',
  qtd_minima_pedido INTEGER DEFAULT 1,
  tempo_entrega_dias INTEGER DEFAULT 7,
  is_preferencial BOOLEAN DEFAULT false,
  ultima_atualizacao_preco TIMESTAMPTZ DEFAULT NOW(),
  observacoes TEXT,
  UNIQUE(item_id, supplier_id)
);

CREATE INDEX idx_item_suppliers_item ON item_suppliers(item_id);
CREATE INDEX idx_item_suppliers_supplier ON item_suppliers(supplier_id);
CREATE INDEX idx_item_suppliers_preferencial ON item_suppliers(item_id, is_preferencial);
```

#### stock_movements
```sql
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES estoque(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida', 'ajuste', 'compra', 'venda', 'uso_os', 'devolucao', 'perda')),
  qtd_anterior INTEGER NOT NULL,
  qtd_nova INTEGER NOT NULL,
  qtd_alteracao INTEGER NOT NULL,
  os_id INTEGER REFERENCES ordens_servico(id) ON DELETE SET NULL,
  fornecedor_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_oficina ON stock_movements(oficina_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id, criado_em DESC);
CREATE INDEX idx_stock_movements_tipo ON stock_movements(oficina_id, tipo);
CREATE INDEX idx_stock_movements_os ON stock_movements(os_id);
```

#### purchase_suggestions
```sql
CREATE TABLE purchase_suggestions (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES estoque(id) ON DELETE CASCADE,
  fornecedor_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  qtd_sugerida INTEGER NOT NULL,
  preco_unitario DECIMAL(10,2),
  custo_total DECIMAL(10,2),
  motivo TEXT,
  status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'aprovado', 'rejeitado', 'concluido')),
  aprovado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  aprovado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_suggestions_oficina ON purchase_suggestions(oficina_id, status);
CREATE INDEX idx_purchase_suggestions_item ON purchase_suggestions(item_id);
CREATE INDEX idx_purchase_suggestions_fornecedor ON purchase_suggestions(fornecedor_id);
```

#### supplier_orders
```sql
CREATE TABLE supplier_orders (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  fornecedor_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  numero_pedido TEXT,
  data_pedido TIMESTAMPTZ DEFAULT NOW(),
  data_entrega_prevista TIMESTAMPTZ,
  data_entrega_real TIMESTAMPTZ,
  status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'enviado', 'recebido_parcial', 'recebido', 'cancelado')),
  valor_total DECIMAL(10,2),
  observacoes TEXT,
  avaliacao INTEGER CHECK(avaliacao BETWEEN 1 AND 5),
  criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_orders_oficina ON supplier_orders(oficina_id);
CREATE INDEX idx_supplier_orders_fornecedor ON supplier_orders(fornecedor_id);
CREATE INDEX idx_supplier_orders_status ON supplier_orders(oficina_id, status);
```

#### supplier_order_items
```sql
CREATE TABLE supplier_order_items (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES estoque(id) ON DELETE RESTRICT,
  qtd_pedida INTEGER NOT NULL,
  qtd_recebida INTEGER DEFAULT 0,
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_supplier_order_items_pedido ON supplier_order_items(pedido_id);
CREATE INDEX idx_supplier_order_items_item ON supplier_order_items(item_id);
```

### Modified Tables

#### estoque (existing)
```sql
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS estoque_min INTEGER DEFAULT 5;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS ponto_reposicao INTEGER;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS alerta_estoque_baixo BOOLEAN DEFAULT false;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS ultima_compra TIMESTAMPTZ;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS uso_medio_diario DECIMAL(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_estoque_alerta ON estoque(oficina_id, alerta_estoque_baixo);
```

## API Design

### Suppliers

#### GET /api/app/suppliers
List all suppliers for the workshop
```json
Response: [
  {
    "id": 1,
    "nome": "Distribuidora Auto Peças Ltda",
    "contato_pessoa": "João Silva",
    "telefone": "(11) 3456-7890",
    "email": "contato@distribuidora.com",
    "ativo": true,
    "totalPedidos": 15,
    "avaliacaoMedia": 4.5
  }
]
```

#### POST /api/app/suppliers
Create new supplier
```json
Request: {
  "nome": "Fornecedor XYZ",
  "contato_pessoa": "Maria Santos",
  "telefone": "(11) 98765-4321",
  "email": "maria@fornecedor.com",
  "endereco": "Rua das Flores, 123",
  "cnpj": "12.345.678/0001-90",
  "observacoes": "Entrega rápida"
}
```

#### PUT /api/app/suppliers/:id
Update supplier

#### DELETE /api/app/suppliers/:id
Deactivate supplier (soft delete)

### Item-Supplier Links

#### POST /api/app/estoque/:itemId/suppliers
Link supplier to item
```json
Request: {
  "supplier_id": 1,
  "preco_unitario": 45.90,
  "tempo_entrega_dias": 5,
  "qtd_minima_pedido": 10,
  "is_preferencial": true
}
```

#### GET /api/app/estoque/:itemId/suppliers
Get all suppliers for an item
```json
Response: [
  {
    "id": 1,
    "supplier_id": 1,
    "supplier_nome": "Distribuidora Auto Peças",
    "preco_unitario": 45.90,
    "tempo_entrega_dias": 5,
    "is_preferencial": true,
    "custo_estimado": 459.00
  }
]
```

### Stock Movements

#### POST /api/app/estoque/:id/movement
Record stock movement
```json
Request: {
  "tipo": "entrada",
  "quantidade": 50,
  "observacoes": "Compra do fornecedor XYZ",
  "fornecedor_id": 1
}

Response: {
  "success": true,
  "item": {
    "id": 1,
    "nome": "Filtro de óleo",
    "quantidade": 75,
    "movimento": {
      "tipo": "entrada",
      "qtd_alteracao": 50,
      "qtd_anterior": 25,
      "qtd_nova": 75
    }
  }
}
```

#### GET /api/app/estoque/:id/movements
Get movement history
```json
Response: {
  "movements": [
    {
      "id": 123,
      "tipo": "saida",
      "qtd_alteracao": -2,
      "qtd_anterior": 77,
      "qtd_nova": 75,
      "usuario_nome": "João Admin",
      "observacoes": "Usado em OS #456",
      "criado_em": "2026-06-09T10:30:00Z"
    }
  ],
  "stats": {
    "totalEntradas": 150,
    "totalSaidas": 75,
    "saldoLiquido": 75
  }
}
```

### Purchase Suggestions

#### GET /api/app/purchase-suggestions
Get all pending suggestions
```json
Response: {
  "suggestions": [
    {
      "id": 1,
      "item_id": 5,
      "item_nome": "Pastilha de freio",
      "estoque_atual": 3,
      "estoque_min": 10,
      "qtd_sugerida": 20,
      "fornecedor_id": 2,
      "fornecedor_nome": "Auto Peças Brasil",
      "preco_unitario": 89.90,
      "custo_total": 1798.00,
      "tempo_entrega": 3,
      "motivo": "Estoque abaixo do mínimo + uso médio alto",
      "criado_em": "2026-06-09T08:00:00Z"
    }
  ],
  "totalPendentes": 5,
  "custoTotalEstimado": 5430.00
}
```

#### POST /api/app/purchase-suggestions/:id/approve
Approve and create order

#### POST /api/app/purchase-suggestions/:id/dismiss
Dismiss suggestion

#### POST /api/app/purchase-suggestions/generate
Manually trigger suggestion generation

### Purchase Orders

#### POST /api/app/supplier-orders
Create purchase order
```json
Request: {
  "fornecedor_id": 1,
  "items": [
    {
      "item_id": 5,
      "qtd_pedida": 20,
      "preco_unitario": 89.90
    }
  ],
  "data_entrega_prevista": "2026-06-14",
  "observacoes": "Pedido urgente"
}
```

#### GET /api/app/supplier-orders
List orders

#### POST /api/app/supplier-orders/:id/receive
Mark order as received
```json
Request: {
  "items": [
    {
      "item_id": 5,
      "qtd_recebida": 18
    }
  ],
  "data_entrega_real": "2026-06-13",
  "avaliacao": 5,
  "observacoes": "Entrega antecipada"
}
```

#### GET /api/app/supplier-orders/:id/export
Export as PDF or CSV

### Analytics

#### GET /api/app/inventory/analytics
Get inventory analytics
```json
Response: {
  "lowStock": 8,
  "outOfStock": 2,
  "pendingSuggestions": 5,
  "totalValue": 45670.50,
  "topUsedItems": [
    {"id": 1, "nome": "Filtro de óleo", "uso_mes": 45},
    {"id": 2, "nome": "Óleo 5W30", "uso_mes": 38}
  ],
  "criticalItems": [
    {"id": 5, "nome": "Pastilha de freio", "estoque": 3, "min": 10, "percentual": 30}
  ]
}
```

#### GET /api/app/suppliers/:id/performance
Get supplier performance
```json
Response: {
  "supplier_id": 1,
  "nome": "Distribuidora Auto Peças",
  "totalPedidos": 25,
  "pedidosNorazo": 22,
  "percentualNorazo": 88,
  "tempoEntregaMedio": 4.2,
  "avaliacaoMedia": 4.6,
  "valorTotalCompras": 125430.00
}
```

## Background Jobs

### Daily Alert Check
Runs every day at 8:00 AM

```javascript
// Check for low stock and generate alerts
cron.schedule('0 8 * * *', async () => {
  const items = await query(
    `SELECT id, nome, quantidade, estoque_min 
     FROM estoque 
     WHERE quantidade <= estoque_min 
       AND alerta_estoque_baixo = false`
  );
  
  for (const item of items) {
    // Create alert
    await query(
      `UPDATE estoque SET alerta_estoque_baixo = true WHERE id = $1`,
      [item.id]
    );
    
    // Create notification
    await createNotification({
      type: 'stock_alert',
      title: `Estoque baixo: ${item.nome}`,
      message: `Quantidade: ${item.quantidade} (mín: ${item.estoque_min})`,
      item_id: item.id
    });
  }
});
```

### Purchase Suggestion Generation
Runs every day at 9:00 AM

```javascript
cron.schedule('0 9 * * *', async () => {
  const items = await query(
    `SELECT e.*, 
            COALESCE(e.uso_medio_diario, 0) as uso_diario,
            isp.supplier_id, isp.preco_unitario, isp.tempo_entrega_dias
     FROM estoque e
     LEFT JOIN item_suppliers isp ON isp.item_id = e.id AND isp.is_preferencial = true
     WHERE e.ponto_reposicao IS NOT NULL 
       AND e.quantidade <= e.ponto_reposicao
       AND NOT EXISTS (
         SELECT 1 FROM purchase_suggestions ps 
         WHERE ps.item_id = e.id AND ps.status = 'pendente'
       )`
  );
  
  for (const item of items) {
    const qtdSugerida = (item.estoque_min * 2) - item.quantidade;
    const custoTotal = qtdSugerida * (item.preco_unitario || 0);
    
    await query(
      `INSERT INTO purchase_suggestions 
       (oficina_id, item_id, fornecedor_id, qtd_sugerida, preco_unitario, custo_total, motivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        item.oficina_id,
        item.id,
        item.supplier_id,
        qtdSugerida,
        item.preco_unitario,
        custoTotal,
        'Ponto de reposição atingido'
      ]
    );
  }
});
```

### Usage Analytics Update
Runs daily at 2:00 AM

```javascript
cron.schedule('0 2 * * *', async () => {
  // Calculate average daily usage for last 30 days
  await query(`
    UPDATE estoque e
    SET uso_medio_diario = (
      SELECT COALESCE(ABS(SUM(sm.qtd_alteracao)) / 30.0, 0)
      FROM stock_movements sm
      WHERE sm.item_id = e.id
        AND sm.tipo IN ('saida', 'uso_os', 'venda')
        AND sm.criado_em >= NOW() - INTERVAL '30 days'
    )
  `);
  
  // Update reorder points
  await query(`
    UPDATE estoque e
    SET ponto_reposicao = e.estoque_min + CEIL(
      e.uso_medio_diario * COALESCE(
        (SELECT isp.tempo_entrega_dias 
         FROM item_suppliers isp 
         WHERE isp.item_id = e.id AND isp.is_preferencial = true 
         LIMIT 1),
        7
      )
    )
  `);
});
```

## Frontend Components

### LowStockAlert Widget
Dashboard widget showing critical inventory items

```jsx
<div className="low-stock-widget">
  <div className="widget-header">
    <h3>⚠️ Estoque Baixo</h3>
    <span className="badge">{lowStockCount}</span>
  </div>
  <div className="critical-items">
    {criticalItems.map(item => (
      <div className="item-alert" key={item.id}>
        <div className="item-name">{item.nome}</div>
        <div className="stock-info">
          <span className="current">{item.quantidade}</span>
          <span className="separator">/</span>
          <span className="minimum">{item.estoque_min} mín</span>
        </div>
        <ProgressBar 
          value={item.quantidade} 
          max={item.estoque_min * 2}
          className="danger"
        />
      </div>
    ))}
  </div>
  <button onClick={() => navigate('/app/estoque?filter=low')}>
    Ver Todos
  </button>
</div>
```

### PurchaseSuggestions Page
Full page for managing purchase suggestions

```jsx
<div className="purchase-suggestions-page">
  <PageHeader title="Sugestões de Compra" subtitle={`${total} sugestões pendentes`} />
  
  <div className="filter-bar">
    <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
      <option value="">Todos os fornecedores</option>
      {suppliers.map(s => (
        <option key={s.id} value={s.id}>{s.nome}</option>
      ))}
    </select>
  </div>
  
  <div className="suggestions-by-supplier">
    {groupedSuggestions.map(group => (
      <div className="supplier-group" key={group.supplier_id}>
        <div className="supplier-header">
          <h3>{group.supplier_nome}</h3>
          <div className="group-total">R$ {group.total.toFixed(2)}</div>
        </div>
        
        <table className="suggestions-table">
          <thead>
            <tr>
              <th><input type="checkbox" onChange={e => selectAll(group.id, e.target.checked)} /></th>
              <th>Item</th>
              <th>Est. Atual</th>
              <th>Qtd. Sugerida</th>
              <th>Preço Unit.</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map(item => (
              <tr key={item.id}>
                <td><input type="checkbox" checked={selected.includes(item.id)} /></td>
                <td>{item.item_nome}</td>
                <td className="warning">{item.estoque_atual}</td>
                <td>{item.qtd_sugerida}</td>
                <td>R$ {item.preco_unitario.toFixed(2)}</td>
                <td>R$ {item.custo_total.toFixed(2)}</td>
                <td>
                  <button onClick={() => dismiss(item.id)}>Descartar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="group-actions">
          <button className="btn-primary" onClick={() => createOrder(group)}>
            Criar Pedido de Compra
          </button>
        </div>
      </div>
    ))}
  </div>
</div>
```

## Security & Performance

### Security
- All endpoints require authentication
- Oficina_id validation on all queries
- Input sanitization for supplier data
- CSRF protection on state-changing operations

### Performance
- Indexes on all foreign keys and filter columns
- Cron jobs run during low-traffic hours
- Dashboard queries optimized with aggregate functions
- Pagination for large result sets

### Caching
- Dashboard widget data cached for 5 minutes
- Supplier list cached for 15 minutes
- Analytics recalculated daily, cached between

## Implementation Phases

### Phase 1: Suppliers & Basic Tracking
- Create supplier tables
- Supplier CRUD operations
- Link items to suppliers
- Stock movement tracking

### Phase 2: Alerts & Notifications
- Low stock detection
- Alert generation
- Dashboard widget
- Notification system integration

### Phase 3: Purchase Suggestions
- Usage analytics calculation
- Reorder point logic
- Suggestion generation (manual & auto)
- Purchase suggestions UI

### Phase 4: Purchase Orders
- Order creation from suggestions
- Order tracking
- Receiving process
- PDF/CSV export

### Phase 5: Analytics & Optimization
- Supplier performance metrics
- Usage patterns visualization
- Bulk pricing updates
- Advanced reporting

## Configuration

### Environment Variables
```env
# Inventory Settings
INVENTORY_CHECK_SCHEDULE=0 8 * * *
SUGGESTIONS_SCHEDULE=0 9 * * *
USAGE_ANALYTICS_SCHEDULE=0 2 * * *
DEFAULT_REORDER_MULTIPLIER=2
```

## Future Enhancements

- Barcode scanning for quick stock in/out
- Integration with accounting systems
- Automated email to suppliers
- Price comparison across multiple suppliers
- Seasonal demand forecasting
- Integration with e-commerce for parts sales
