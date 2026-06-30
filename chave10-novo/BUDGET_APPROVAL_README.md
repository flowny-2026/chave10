# 📱 Fluxo de Aprovação de Orçamentos via WhatsApp

Sistema completo de aprovação de orçamentos onde clientes podem aprovar/rejeitar diretamente pelo WhatsApp através de um link único e seguro.

## ✨ Funcionalidades

### Para a Oficina
- ✅ **Gerar links únicos** de aprovação com validade configurável (1h a 90 dias)
- ✅ **Envio automático** via WhatsApp para o cliente
- ✅ **Rastreamento completo** de acessos (quantos, quando, de onde)
- ✅ **Audit trail** com histórico de todas as ações
- ✅ **Estatísticas** de aprovação em tempo real
- ✅ **Regeneração** de links expirados
- ✅ **Assinatura digital** opcional configurável por oficina

### Para o Cliente
- ✅ **Interface mobile-first** otimizada para celular
- ✅ **Sem necessidade de cadastro** ou login
- ✅ **Visualização completa** do orçamento (serviços, peças, valores)
- ✅ **Aprovação** com um clique
- ✅ **Rejeição** com campo opcional para motivo
- ✅ **Assinatura digital** em tela touch quando obrigatória
- ✅ **Feedback visual** claro do status

## 🚀 Instalação

### 1. Rodar Migrations do Banco

```bash
cd backend
node src/migrations/run-migrations.js
```

Isso criará as tabelas necessárias:
- `approval_links` - Links de aprovação gerados
- `approval_link_accesses` - Rastreamento de acessos
- `approval_actions` - Audit trail de ações
- `budget_signatures` - Assinaturas digitais capturadas

E adicionará colunas nas tabelas existentes:
- `orcamentos`: approval_status, approved_at, rejected_at, rejection_reason
- `oficinas`: require_signature

### 2. Configurar Variáveis de Ambiente

Edite o arquivo `backend/.env` e adicione:

```env
# WhatsApp Integration
WHATSAPP_API_URL=https://api.whatsapp.com/send
WHATSAPP_API_TOKEN=seu_token_aqui

# Public URL for approval links
PUBLIC_URL=https://seusite.com

# Link validity (optional, defaults)
DEFAULT_LINK_VALIDITY_HOURS=168
MAX_LINK_VALIDITY_HOURS=2160
```

### 3. Configurar WhatsApp API

Você pode usar uma das seguintes opções:

#### Opção 1: Twilio (Recomendado)
1. Criar conta em https://www.twilio.com
2. Obter credenciais da WhatsApp API
3. Configurar:
```env
WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT/Messages.json
WHATSAPP_API_TOKEN=your_auth_token
```

#### Opção 2: WhatsApp Business API
1. Registrar empresa no WhatsApp Business
2. Obter credenciais da API oficial
3. Configurar endpoints apropriados

#### Opção 3: WAHA (Self-hosted)
1. Instalar WAHA: https://github.com/devlikeapro/waha
2. Configurar:
```env
WHATSAPP_API_URL=http://localhost:3000/api/sendText
WHATSAPP_API_TOKEN=seu_token_local
```

### 4. Reiniciar o Backend

```bash
npm run dev
```

### 5. Testar

1. Acesse a página de orçamentos
2. Clique no botão "📱 Aprovação" em um orçamento
3. Gere um link de teste
4. Acesse o link em modo anônimo ou outro dispositivo

## 📖 Como Usar

### Gerar Link de Aprovação

1. Na tela de orçamentos, localize o orçamento desejado
2. Clique em "📱 Aprovação"
3. Selecione a validade do link (padrão: 7 dias)
4. Escolha:
   - **Gerar e Enviar via WhatsApp** - Envia automaticamente para o cliente
   - **Apenas Gerar Link** - Copia o link para compartilhar manualmente

### Requisitos para Gerar Link

O sistema valida que o orçamento tenha:
- ✅ Cliente associado
- ✅ Telefone válido do cliente
- ✅ Pelo menos um serviço ou peça
- ✅ Valor total maior que zero

### Acompanhar Status

No modal de aprovação, clique em "📊 Ver Estatísticas" para ver:
- Link ativo e sua validade
- Número de acessos
- Data/hora do primeiro e último acesso
- Status atual (pendente, aprovado, rejeitado, expirado)
- Assinatura digital (se capturada)
- Histórico completo de ações

### Regenerar Link Expirado

1. Abra as estatísticas do orçamento
2. Clique em "🔄 Regenerar Link"
3. O link anterior será invalidado
4. Um novo link será gerado com validade renovada

## 🔐 Segurança

### Tokens
- Gerados com `crypto.randomBytes(32)` (criptograficamente seguros)
- 43 caracteres em formato URL-safe base64
- Verificação de unicidade antes de inserir no banco
- Retry automático em caso de colisão (muito improvável)

### Validações
- Token válido e não expirado
- Verificação de timestamp antes de cada ação
- Links invalidados após aprovação/rejeição
- Proteção contra uso múltiplo do mesmo link

### Rate Limiting
- Endpoints públicos limitados por IP
- Proteção contra força bruta

### Audit Trail
- Todas as ações são registradas
- IP address capturado para ações de clientes
- User ID capturado para ações da oficina
- Timestamps em UTC com timezone
- Imutável (append-only)

## 🎨 Personalização

### Assinatura Digital Obrigatória

Para exigir assinatura digital em uma oficina:

```sql
UPDATE oficinas 
SET require_signature = true 
WHERE id = [oficina_id];
```

### Mensagem do WhatsApp

Edite o template em `backend/src/services/whatsapp.js`:

```javascript
const message = `Olá ${budgetData.clienteNome}! 👋\n\n` +
  `Seu orçamento #${budgetData.numero} está pronto!\n\n` +
  `🚗 Veículo: ${budgetData.veiculoModelo} - ${budgetData.veiculoPlaca}\n` +
  `💰 Valor Total: R$ ${budgetData.total.toFixed(2)}\n\n` +
  // ... personalizar aqui
```

### Validade Padrão do Link

No backend `.env`:
```env
DEFAULT_LINK_VALIDITY_HOURS=168  # 7 dias
```

Ou diretamente na chamada da API:
```javascript
api.post(`/approval/orcamentos/${id}/link`, {
  validityHours: 48  // 2 dias
})
```

## 📊 Estrutura do Banco de Dados

### approval_links
```sql
- id: serial primary key
- oficina_id: integer (FK)
- orcamento_id: integer (FK)
- token: text unique
- created_at: timestamptz
- expires_at: timestamptz
- sent_at: timestamptz (null se não enviado)
- invalidated_at: timestamptz (null se ativo)
- access_count: integer
- first_accessed_at: timestamptz
- last_accessed_at: timestamptz
```

### approval_actions
```sql
- id: serial primary key
- oficina_id: integer (FK)
- orcamento_id: integer (FK)
- link_id: integer (FK, nullable)
- action_type: text (enum)
- performed_at: timestamptz
- performed_by_user_id: integer (FK, nullable)
- client_ip_address: inet
- metadata: jsonb
- link_token: text
```

Tipos de ação:
- `link_generated` - Link criado
- `link_sent` - Enviado via WhatsApp
- `link_accessed` - Cliente acessou o link
- `approved` - Orçamento aprovado
- `rejected` - Orçamento rejeitado
- `expired` - Link expirou
- `regenerated` - Link regenerado

## 🔍 Troubleshooting

### Link não envia via WhatsApp

1. Verifique as variáveis `WHATSAPP_API_URL` e `WHATSAPP_API_TOKEN`
2. Confirme que o cliente tem telefone válido
3. Veja os logs do backend para erros da API do WhatsApp
4. Teste a API do WhatsApp diretamente com cURL

### Cliente não consegue acessar o link

1. Verifique se o link não expirou
2. Confirme que a variável `PUBLIC_URL` está correta
3. Teste o link em modo anônimo
4. Verifique se não há bloqueio de CORS

### Assinatura não é capturada

1. Confirme que `require_signature = true` na oficina
2. Verifique se o canvas está funcionando (touch events)
3. Teste em diferentes navegadores/dispositivos
4. Veja logs do navegador (F12) para erros JavaScript

### Migrations falharam

1. Verifique conexão com PostgreSQL
2. Confirme que `DATABASE_URL` está correta
3. Verifique permissões do usuário do banco
4. Rode migrations manualmente linha por linha se necessário

## 📱 Testes

### Testar Fluxo Completo

1. Criar orçamento com cliente e telefone válido
2. Gerar link (não precisa enviar WhatsApp para teste)
3. Copiar link e abrir em outra aba/dispositivo
4. Aprovar/rejeitar o orçamento
5. Verificar estatísticas e audit trail

### Testar Expiração

1. Criar link com validade de 1 hora
2. Aguardar 1 hora ou ajustar `expires_at` no banco:
```sql
UPDATE approval_links 
SET expires_at = NOW() - INTERVAL '1 hour' 
WHERE token = 'seu_token_aqui';
```
3. Tentar acessar o link
4. Verificar mensagem de expirado

### Testar Assinatura

1. Ativar assinatura obrigatória na oficina
2. Gerar link e acessar
3. Clicar em aprovar
4. Canvas de assinatura deve aparecer
5. Desenhar assinatura e confirmar
6. Verificar nas estatísticas que a assinatura foi salva

## 🚀 Performance

### Cleanup Automático

Adicione um cron job para limpar dados antigos:

```javascript
// backend/src/index.js
const cron = require('node-cron');

// Roda diariamente às 2 AM
cron.schedule('0 2 * * *', async () => {
  // Limpa acessos de links com mais de 90 dias
  await pool.query(
    "DELETE FROM approval_link_accesses WHERE accessed_at < NOW() - INTERVAL '90 days'"
  );
  
  // Limpa links invalidados com mais de 30 dias
  await pool.query(
    "DELETE FROM approval_links WHERE invalidated_at < NOW() - INTERVAL '30 days'"
  );
  
  console.log('✅ Cleanup de dados antigos concluído');
});
```

### Índices Importantes

Todos os índices necessários já são criados pela migration:
- `idx_approval_links_token` - Busca rápida por token
- `idx_approval_links_orcamento` - Busca por orçamento
- `idx_approval_links_expires` - Queries de expiração
- `idx_approval_actions_time` - Audit trail ordenado

## 📝 API Endpoints

### Autenticados (Oficina)

```
POST   /api/approval/orcamentos/:id/link
POST   /api/approval/orcamentos/:id/regenerate-link
GET    /api/approval/orcamentos/:id/stats
```

### Públicos (Cliente)

```
GET    /api/approval/public/:token
POST   /api/approval/public/:token/approve
POST   /api/approval/public/:token/reject
```

Ver documentação completa em `.kiro/specs/budget-approval-workflow/design.md`

## 📄 Licença

Este recurso faz parte do sistema Chave 10.

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique este README primeiro
2. Consulte a documentação técnica em `.kiro/specs/budget-approval-workflow/`
3. Verifique logs do backend e frontend
4. Contate o desenvolvedor se o problema persistir
