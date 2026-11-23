# Design Document - Budget Approval Workflow

## Overview

This document describes the technical design for the Budget Approval Workflow feature, which enables clients to approve vehicle service budgets via unique, time-limited links sent through WhatsApp. The system supports optional digital signatures and maintains a complete audit trail.

## Architecture

### High-Level Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Workshop UI   │────────▶│  Express API     │────────▶│  PostgreSQL DB  │
│   (React)       │         │  (Node.js)       │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                    │
                                    ▼
                            ┌──────────────────┐
                            │  WhatsApp API    │
                            │  Integration     │
                            └──────────────────┘
                                    │
                                    ▼
                            ┌──────────────────┐
                            │  Client Mobile   │◀────┐
                            │  Approval Page   │     │
                            │  (Public)        │     │
                            └──────────────────┘     │
                                                     │
                            Unique approval link ────┘
```

### Component Diagram

```
Backend Components:
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Approval Links  │      │  Audit Logger    │          │
│  │  Controller      │─────▶│  Service         │          │
│  └──────────────────┘      └──────────────────┘          │
│           │                                                │
│           ▼                                                │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Link Generator  │      │  WhatsApp        │          │
│  │  Service         │─────▶│  Gateway         │          │
│  └──────────────────┘      └──────────────────┘          │
│           │                                                │
│           ▼                                                │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Link Validator  │      │  Signature       │          │
│  │  Service         │      │  Handler         │          │
│  └──────────────────┘      └──────────────────┘          │
│                                                            │
└────────────────────────────────────────────────────────────┘

Frontend Components:
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Workshop Interface:                                       │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Budget List     │      │  Approval Link   │          │
│  │  Component       │─────▶│  Manager         │          │
│  └──────────────────┘      └──────────────────┘          │
│                                                            │
│  Client Interface (Public):                                │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │  Approval Page   │      │  Signature       │          │
│  │  Component       │─────▶│  Canvas          │          │
│  └──────────────────┘      └──────────────────┘          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Data Model

### New Tables

#### approval_links
Stores generated approval links and their metadata.

```sql
CREATE TABLE approval_links (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  first_accessed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_approval_links_token ON approval_links(token);
CREATE INDEX idx_approval_links_orcamento ON approval_links(orcamento_id);
CREATE INDEX idx_approval_links_expires ON approval_links(expires_at);
```

#### approval_link_accesses
Tracks each access to approval links for analytics and security.

```sql
CREATE TABLE approval_link_accesses (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES approval_links(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_link_accesses_link ON approval_link_accesses(link_id);
CREATE INDEX idx_link_accesses_time ON approval_link_accesses(accessed_at);
```

#### approval_actions
Audit trail for all approval-related actions.

```sql
CREATE TABLE approval_actions (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  link_id INTEGER REFERENCES approval_links(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK(action_type IN (
    'link_generated',
    'link_sent',
    'link_accessed',
    'approved',
    'rejected',
    'expired',
    'regenerated'
  )),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performed_by_user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  client_ip_address INET,
  metadata JSONB,
  link_token TEXT
);

CREATE INDEX idx_approval_actions_orcamento ON approval_actions(orcamento_id);
CREATE INDEX idx_approval_actions_type ON approval_actions(action_type);
CREATE INDEX idx_approval_actions_time ON approval_actions(performed_at DESC);
```

#### budget_signatures
Stores digital signatures captured during approval.

```sql
CREATE TABLE budget_signatures (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,  -- Base64 encoded PNG
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_ip_address INET
);

CREATE INDEX idx_budget_signatures_orcamento ON budget_signatures(orcamento_id);
```

### Modified Tables

#### orcamentos (existing)
Add new columns to support approval workflow.

```sql
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
  CHECK(approval_status IN ('pending', 'approved', 'rejected', 'expired'));
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
```

#### oficinas (existing)
Add configuration for signature requirement.

```sql
ALTER TABLE oficinas ADD COLUMN IF NOT EXISTS require_signature BOOLEAN DEFAULT false;
```

## API Design

### Backend Endpoints

#### POST /api/app/orcamentos/:id/approval-link
Generate a new approval link for a budget.

**Request:**
```json
{
  "validityHours": 168,  // Optional, default 168 (7 days)
  "sendViaWhatsApp": true  // Optional, default false
}
```

**Response:**
```json
{
  "link": "https://chave10.com/approve/a3f8c9d2e1b4f7a8c5d9e2f3a6b8c1d4e7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4",
  "token": "a3f8c9d2e1b4f7a8c5d9e2f3a6b8c1d4e7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4",
  "expiresAt": "2026-06-16T12:00:00Z",
  "sent": true
}
```

#### GET /api/public/approval/:token
Retrieve budget details for client approval (public, no auth).

**Response:**
```json
{
  "valid": true,
  "budget": {
    "numero": "ORC-2026-001",
    "cliente": {
      "nome": "João Silva",
      "telefone": "(11) 98765-4321"
    },
    "veiculo": {
      "placa": "ABC-1234",
      "modelo": "Civic",
      "marca": "Honda",
      "ano": "2020"
    },
    "servicos": [...],
    "pecas": [...],
    "valorMO": 500.00,
    "valorPecas": 1200.00,
    "desconto": 50.00,
    "total": 1650.00,
    "obs": "Troca de óleo e pastilhas",
    "oficina": {
      "nome": "Oficina Chave 10",
      "telefone": "(11) 3456-7890",
      "endereco": "Rua das Flores, 123"
    },
    "requireSignature": false
  },
  "expiresAt": "2026-06-16T12:00:00Z"
}
```

**Error Response (expired):**
```json
{
  "valid": false,
  "error": "expired",
  "message": "Este link expirou em 16/06/2026",
  "oficina": {
    "nome": "Oficina Chave 10",
    "telefone": "(11) 3456-7890"
  }
}
```

#### POST /api/public/approval/:token/approve
Process client approval.

**Request:**
```json
{
  "signature": "data:image/png;base64,iVBORw0KGgo..."  // Optional, required if oficina.require_signature = true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orçamento aprovado com sucesso!",
  "approvedAt": "2026-06-09T14:30:00Z"
}
```

#### POST /api/public/approval/:token/reject
Process client rejection.

**Request:**
```json
{
  "reason": "Valor muito alto"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orçamento recusado",
  "rejectedAt": "2026-06-09T14:30:00Z"
}
```

#### POST /api/app/orcamentos/:id/regenerate-link
Regenerate an expired or unused approval link.

**Request:**
```json
{
  "validityHours": 168  // Optional
}
```

**Response:** Same as POST /approval-link

#### GET /api/app/orcamentos/:id/approval-stats
Get approval link statistics and audit trail.

**Response:**
```json
{
  "currentLink": {
    "token": "abc...",
    "createdAt": "2026-06-09T10:00:00Z",
    "expiresAt": "2026-06-16T10:00:00Z",
    "sentAt": "2026-06-09T10:01:00Z",
    "accessCount": 3,
    "firstAccessedAt": "2026-06-09T11:00:00Z",
    "lastAccessedAt": "2026-06-09T14:00:00Z"
  },
  "status": "approved",
  "approvedAt": "2026-06-09T14:30:00Z",
  "signature": "data:image/png;base64,...",
  "auditTrail": [
    {
      "action": "link_generated",
      "timestamp": "2026-06-09T10:00:00Z",
      "user": "João Admin"
    },
    {
      "action": "link_sent",
      "timestamp": "2026-06-09T10:01:00Z",
      "user": "João Admin"
    },
    {
      "action": "link_accessed",
      "timestamp": "2026-06-09T11:00:00Z",
      "ipAddress": "192.168.1.100"
    },
    {
      "action": "approved",
      "timestamp": "2026-06-09T14:30:00Z",
      "ipAddress": "192.168.1.100"
    }
  ]
}
```

## Security Considerations

### Token Generation
- Use `crypto.randomBytes(32)` for cryptographically secure random tokens
- Convert to URL-safe base64 string (remove +, /, =)
- Tokens are 43 characters long (32 bytes → 43 chars in base64)
- Verify uniqueness before storing (retry on collision)

### Rate Limiting
- Apply rate limiting to public approval endpoints to prevent abuse
- Limit: 10 requests per IP per minute for approval actions
- Limit: 20 requests per IP per minute for link retrieval

### Input Validation
- Validate token format (alphanumeric, 32-64 chars)
- Validate signature data format (data URI with image/png)
- Validate signature size (max 200KB)
- Sanitize rejection reason (max 500 chars)

### CORS
- Public approval endpoints must allow cross-origin requests
- Set appropriate CORS headers for mobile access

## WhatsApp Integration

### Strategy
Use third-party WhatsApp API service (options):
1. **Twilio API** (recommended) - Official Business API
2. **WhatsApp Business API** - Direct integration
3. **WAHA** (WhatsApp HTTP API) - Self-hosted option

### Message Template

```
Olá {cliente_nome}! 👋

Seu orçamento #{orcamento_numero} está pronto!

🚗 Veículo: {veiculo_modelo} - {veiculo_placa}
💰 Valor Total: R$ {valor_total}

📋 Clique no link abaixo para visualizar os detalhes e aprovar:
{approval_link}

⏰ Este link é válido até {expiry_date}

--
{oficina_nome}
{oficina_telefone}
```

### Implementation Details

```javascript
// utils/whatsapp.js
const axios = require('axios');

async function sendApprovalLink(phoneNumber, budgetData, approvalLink) {
  const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
  const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
  
  // Format phone number: remove non-digits, ensure country code
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  
  const message = `Olá ${budgetData.clienteNome}! 👋\n\n` +
    `Seu orçamento #${budgetData.numero} está pronto!\n\n` +
    `🚗 Veículo: ${budgetData.veiculoModelo} - ${budgetData.veiculoPlaca}\n` +
    `💰 Valor Total: R$ ${budgetData.total.toFixed(2)}\n\n` +
    `📋 Clique no link abaixo para visualizar os detalhes e aprovar:\n` +
    `${approvalLink}\n\n` +
    `⏰ Este link é válido até ${budgetData.expiryDate}\n\n` +
    `--\n${budgetData.oficinaNome}\n${budgetData.oficinaTelefone}`;
  
  try {
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        phone: formattedPhone,
        message: message
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    return { success: true, messageId: response.data.id };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    throw new Error('Falha ao enviar mensagem via WhatsApp');
  }
}

module.exports = { sendApprovalLink };
```

## Frontend Design

### Workshop Interface Changes

#### Budget List Component
Add approval status column showing:
- ⏳ Pendente (pending)
- ✅ Aprovado (approved)
- ❌ Recusado (rejected)
- ⏰ Expirado (expired)

Add action buttons:
- "Gerar Link" (if no active link)
- "Enviar via WhatsApp" (if link exists and not sent)
- "Reenviar Link" (if link was sent)
- "Regenerar Link" (if expired)

#### Budget Detail Component
Add approval section showing:
- Current approval status
- Approval link (with copy button)
- Link expiration date
- Access statistics (views, last accessed)
- Signature image (if captured)
- Audit trail timeline

### Client Approval Page (Public)

Mobile-first standalone page at `/approve/:token`:

**Layout:**
```
┌──────────────────────────────┐
│ [Logo Oficina]               │
│                              │
│ Orçamento #ORC-2026-001      │
│ ────────────────────────────│
│                              │
│ Cliente: João Silva          │
│ Veículo: Honda Civic         │
│ Placa: ABC-1234              │
│                              │
│ ──── Serviços ────          │
│ • Troca de óleo     R$ 150   │
│ • Troca de filtro   R$ 80    │
│                              │
│ ──── Peças ────             │
│ • Óleo 5W30 (4L)    R$ 200   │
│ • Filtro de óleo    R$ 50    │
│                              │
│ ────────────────────────────│
│ Mão de Obra:      R$ 230,00  │
│ Peças:            R$ 250,00  │
│ Desconto:        -R$ 30,00   │
│ ────────────────────────────│
│ TOTAL:            R$ 450,00  │
│ ────────────────────────────│
│                              │
│ [Botão APROVAR - Verde]      │
│ [Botão RECUSAR - Vermelho]   │
│                              │
│ Válido até: 16/06/2026       │
│                              │
│ Oficina Chave 10             │
│ (11) 3456-7890               │
└──────────────────────────────┘
```

**Signature Modal (if required):**
```
┌──────────────────────────────┐
│ Assine para confirmar        │
│ ────────────────────────────│
│                              │
│ ┌──────────────────────────┐│
│ │                          ││
│ │  [Canvas para assinatura]││
│ │                          ││
│ │                          ││
│ └──────────────────────────┘│
│                              │
│ [Limpar] [Confirmar]         │
│                              │
└──────────────────────────────┘
```

### Routing

Add new public route (no authentication):
```javascript
// App.jsx
<Route path="/approve/:token" element={<ApprovalPage />} />
```

## Implementation Phases

### Phase 1: Database & Backend Core
1. Create new tables (migrations)
2. Implement token generation service
3. Create approval link endpoints
4. Implement link validation logic
5. Add audit logging

**Files to create:**
- `backend/src/migrations/add-approval-tables.js`
- `backend/src/services/approval-links.js`
- `backend/src/services/audit-logger.js`
- `backend/src/routes/approval.js`

### Phase 2: WhatsApp Integration
1. Set up WhatsApp API credentials
2. Implement message sending service
3. Add phone number formatting/validation
4. Test message delivery

**Files to create:**
- `backend/src/services/whatsapp.js`
- `backend/src/utils/phone-formatter.js`

### Phase 3: Public Approval Page
1. Create public approval page component
2. Implement signature canvas
3. Add mobile-responsive styling
4. Handle approval/rejection flow

**Files to create:**
- `frontend/src/pages/ApprovalPage.jsx`
- `frontend/src/components/SignatureCanvas.jsx`
- `frontend/src/components/BudgetDetails.jsx`

### Phase 4: Workshop Interface Integration
1. Update budget list with approval status
2. Add link management UI
3. Display approval statistics
4. Show audit trail

**Files to modify:**
- `frontend/src/pages/Orcamentos.jsx`
- `frontend/src/components/OrcamentoForm.jsx`

### Phase 5: Testing & Deployment
1. Unit tests for token generation
2. Integration tests for approval flow
3. E2E tests for client approval
4. Load testing for public endpoints
5. Deploy and monitor

## Configuration

### Environment Variables

**Backend (.env):**
```env
# WhatsApp Integration
WHATSAPP_API_URL=https://api.whatsapp.com/send
WHATSAPP_API_TOKEN=your_token_here

# Public URL for approval links
PUBLIC_URL=https://chave10.com

# Default link validity (hours)
DEFAULT_LINK_VALIDITY_HOURS=168

# Max link validity (hours)
MAX_LINK_VALIDITY_HOURS=2160
```

**Frontend (.env):**
```env
# No additional config needed for approval feature
```

## Performance Considerations

### Caching
- Cache oficina settings (require_signature) for 5 minutes
- No caching on approval endpoints (real-time status required)

### Database Indexes
- Token lookup must be fast (index on approval_links.token)
- Audit trail queries optimized with time-based index
- Access tracking queries use link_id index

### Cleanup Jobs
Add scheduled job to clean up old data:
```javascript
// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  // Delete approval link accesses older than 90 days
  await query(
    'DELETE FROM approval_link_accesses WHERE accessed_at < NOW() - INTERVAL \'90 days\''
  );
  
  // Delete invalidated links older than 30 days
  await query(
    'DELETE FROM approval_links WHERE invalidated_at < NOW() - INTERVAL \'30 days\''
  );
});
```

## Monitoring & Alerts

### Metrics to Track
1. Link generation rate
2. Link access rate
3. Approval/rejection ratio
4. Average time to approval
5. WhatsApp delivery success rate
6. Token collision rate (should be 0)

### Alerts
- WhatsApp delivery failure rate > 5%
- Public endpoint error rate > 1%
- Token generation failure
- Database connection issues

## Future Enhancements

### Phase 2 Features (not in current scope)
1. SMS fallback if WhatsApp fails
2. Email approval option
3. Multiple approval requirements (for high-value budgets)
4. Approval reminders (auto-send after X days)
5. Client feedback form after approval
6. Integration with payment gateway (approve + pay)
7. Approval analytics dashboard
8. Bulk link generation for multiple budgets
