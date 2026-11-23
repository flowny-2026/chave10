# 📦 Sistema de Estoque Inteligente - Resumo Executivo

## 🎯 Objetivo

Criar um sistema inteligente de gestão de estoque que automatiza alertas, sugere compras baseadas em uso real e gerencia fornecedores com métricas de performance.

## ✨ Funcionalidades Principais

### 1. **Alertas Automáticos de Estoque Baixo**
- 🔴 Detecta automaticamente quando itens atingem o estoque mínimo
- 📊 Widget no dashboard mostrando itens críticos
- 🔔 Notificações consolidadas diárias para evitar spam
- 📈 Indicadores visuais (badges, cores) em toda interface

### 2. **Sugestões Inteligentes de Compra**
- 🤖 Geração automática baseada em:
  - Estoque atual vs. mínimo
  - Uso médio diário (últimos 30 dias)
  - Tempo de entrega do fornecedor
  - Ponto de reposição calculado
- 💰 Cálculo automático de custos totais
- 📦 Agrupamento por fornecedor para compras consolidadas
- ✅ Conversão direta em pedidos de compra

### 3. **Gestão de Fornecedores Preferidos**
- 📇 Cadastro completo: nome, contato, CNPJ, endereço
- 💵 Múltiplos fornecedores por item com preços diferentes
- ⭐ Marcação de fornecedor preferencial
- 📊 Métricas de performance:
  - Taxa de entrega no prazo
  - Tempo médio de entrega
  - Avaliação média (1-5 estrelas)
  - Total gasto
- 🏆 Destaque de fornecedores ruins (< 80% no prazo ou < 3 estrelas)

### 4. **Rastreamento Completo de Movimentações**
- 📝 Histórico detalhado de todas as entradas/saídas
- 🏷️ Tipos de movimento:
  - Compra (entrada)
  - Venda/Uso (saída)
  - Uso em OS (saída automática)
  - Ajuste manual
  - Devolução
  - Perda/desperdício
- 👤 Registro de quem fez e quando
- 🔗 Vinculação com OS e fornecedores

### 5. **Pedidos de Compra**
- 📄 Criação a partir de sugestões
- 📧 Export PDF/CSV para envio ao fornecedor
- 📬 Processo de recebimento (total ou parcial)
- ⭐ Avaliação do fornecedor ao receber
- 📊 Rastreamento de status (pendente, enviado, recebido)

### 6. **Analytics e Insights**
- 📈 Uso médio diário calculado automaticamente
- 🎯 Ponto de reposição dinâmico
- 💹 Itens mais utilizados
- 💰 Valor total do estoque
- 📉 Tendências de consumo

## 🗄️ Estrutura de Dados

### Novas Tabelas (6)

1. **suppliers** - Fornecedores
2. **item_suppliers** - Link item-fornecedor com preços
3. **stock_movements** - Histórico de movimentações
4. **purchase_suggestions** - Sugestões automáticas
5. **supplier_orders** - Pedidos de compra
6. **supplier_order_items** - Itens dos pedidos

### Colunas Adicionadas em `estoque`

- `estoque_min` - Quantidade mínima
- `ponto_reposicao` - Quando gerar sugestão
- `alerta_estoque_baixo` - Flag de alerta ativo
- `uso_medio_diario` - Consumo médio calculado
- `ultima_compra` - Data da última compra

## 🤖 Automações (Background Jobs)

### 1. **Daily Alert Check** (8:00 AM)
- Verifica estoque baixo
- Cria alertas e notificações

### 2. **Purchase Suggestions** (9:00 AM)
- Analisa pontos de reposição
- Gera sugestões de compra automáticas

### 3. **Usage Analytics** (2:00 AM)
- Calcula uso médio diário
- Atualiza pontos de reposição dinamicamente

## 📱 Interface

### Dashboard Widget
```
┌─────────────────────────────┐
│ ⚠️ Estoque Baixo        [8] │
├─────────────────────────────┤
│ Filtro de óleo      ███ 3/10│
│ Óleo 5W30          ████ 4/10│
│ Pastilha freio      ██  2/10│
├─────────────────────────────┤
│ [Ver Todos]  [Sugestões: 5] │
└─────────────────────────────┘
```

### Página de Sugestões
```
Sugestões de Compra (5 pendentes)

┌─ Distribuidora Auto Peças ────── R$ 2.340,00 ─┐
│ □ Filtro de óleo    | 3  | 20 | R$ 45,00      │
│ □ Óleo 5W30         | 4  | 24 | R$ 52,50      │
│                                                 │
│ [✓ Selecionar Todos]  [Criar Pedido de Compra]│
└─────────────────────────────────────────────────┘
```

### Perfil do Fornecedor
```
Distribuidora Auto Peças ⭐⭐⭐⭐⭐ 4.8

📦 25 pedidos
✅ 92% entregas no prazo
⏱️ 4.2 dias (média)
💰 R$ 125.430,00 total

[Ver Histórico] [Editar] [Nova Cotação]
```

## 🔄 Fluxo de Trabalho Típico

### Cenário: Filtro de Óleo Acabando

1. **8:00 AM** - Sistema detecta que filtro está em 3 unidades (mínimo: 10)
2. **8:01 AM** - Cria alerta de estoque baixo
3. **8:01 AM** - Envia notificação para admin
4. **9:00 AM** - Analisa que uso médio é 2/dia e tempo de entrega é 3 dias
5. **9:00 AM** - Calcula ponto de reposição: 10 + (2 × 3) = 16
6. **9:01 AM** - Gera sugestão: comprar 20 unidades (10×2 - 3 atual)
7. **9:01 AM** - Busca fornecedor preferencial e preço
8. **10:30 AM** - Usuário vê sugestão no dashboard
9. **10:31 AM** - Aprova e cria pedido de compra
10. **10:32 AM** - Exporta PDF e envia ao fornecedor
11. **3 dias depois** - Recebe 20 unidades
12. **Confirma recebimento** - Estoque atualizado para 23
13. **Avalia fornecedor** - 5 estrelas, entrega no prazo

## 💡 Benefícios

### Para a Oficina
- ✅ Nunca mais ficar sem peças críticas
- ✅ Redução de tempo gasto em controle manual
- ✅ Compras mais inteligentes e econômicas
- ✅ Melhor negociação com fornecedores (dados de performance)
- ✅ Menos capital parado em estoque excessivo

### Para o Negócio
- 📈 Aumento de produtividade (menos paradas)
- 💰 Redução de custos operacionais
- 📊 Dados para tomada de decisão
- 🎯 Previsibilidade financeira
- 🏆 Qualidade de serviço (sempre tem as peças)

## 📊 Métricas de Sucesso

- **Redução de 80%** em rupturas de estoque
- **Economia de 30%** em tempo de gestão
- **Redução de 25%** em estoque parado
- **Aumento de 15%** em produtividade

## 🚀 Implementação

### Fases
1. **Fase 1** (2 semanas) - Fornecedores e rastreamento básico
2. **Fase 2** (1 semana) - Alertas e notificações
3. **Fase 3** (2 semanas) - Sugestões automáticas
4. **Fase 4** (1 semana) - Pedidos de compra
5. **Fase 5** (1 semana) - Analytics avançado

**Total: 7 semanas**

### Requisitos Técnicos
- Node.js + PostgreSQL (já existente)
- node-cron para jobs agendados
- jsPDF para export de pedidos
- Notificação system (já existente)

## 📈 Roadmap Futuro

- 📱 Scanner de código de barras mobile
- 🌐 Integração com e-commerces de fornecedores
- 🤝 Comparação automática de preços
- 📊 Previsão de demanda por sazonalidade
- 💳 Integração com sistemas de pagamento
- 📧 Email automático para fornecedores

## ✅ Status Atual

- [x] Requisitos documentados (15/15)
- [x] Design técnico completo
- [ ] Implementação (0%)
- [ ] Testes
- [ ] Deploy

**Pronto para começar a implementação! 🚀**
