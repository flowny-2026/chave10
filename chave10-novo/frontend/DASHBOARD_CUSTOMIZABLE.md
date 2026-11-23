# 📊 Dashboard Personalizável - Chave 10

Sistema completo de dashboard customizável com widgets arrastáveis e filtros de período avançados.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Widgets Disponíveis](#widgets-disponíveis)
3. [Filtros de Período](#filtros-de-período)
4. [Como Personalizar](#como-personalizar)
5. [Armazenamento Local](#armazenamento-local)
6. [Componentes](#componentes)
7. [Exemplos de Uso](#exemplos-de-uso)

---

## 🎯 Visão Geral

O Dashboard Personalizável permite que cada usuário configure sua visualização de acordo com suas necessidades, escolhendo quais widgets exibir e em qual ordem.

### Recursos Principais:

- ✅ **8 tipos de widgets** diferentes
- ✅ **Organização por arrastar e soltar** (drag & drop simulado com setas)
- ✅ **Filtros de período** com 7 presets + personalizado
- ✅ **Layout salvo localmente** por usuário
- ✅ **Categorização** (Financeiro, Operacional, Clientes)
- ✅ **Responsivo** e otimizado para mobile
- ✅ **Restauração ao padrão** com um clique

---

## 🧩 Widgets Disponíveis

### 1. 💰 Faturamento
**Categoria:** Financeiro  
**Descrição:** Valor total faturado no período selecionado  
**Tamanho:** Médio  
**Visível para:** Gerente e Proprietário

Exibe o faturamento total com ícone de cifrão e valor destacado.

---

### 2. ✅ OS Finalizadas
**Categoria:** Operacional  
**Descrição:** Quantidade de ordens de serviço concluídas  
**Tamanho:** Pequeno  
**Visível para:** Todos

Mostra quantas OS foram finalizadas no período.

---

### 3. 🔧 OS em Andamento
**Categoria:** Operacional  
**Descrição:** Ordens de serviço em progresso  
**Tamanho:** Pequeno  
**Visível para:** Todos

Contador de OS que estão sendo executadas no momento.

---

### 4. 👥 Total de Clientes
**Categoria:** Clientes  
**Descrição:** Base de clientes cadastrados  
**Tamanho:** Pequeno  
**Visível para:** Todos

Exibe o número total de clientes na base.

---

### 5. 🎯 Meta Mensal
**Categoria:** Financeiro  
**Descrição:** Progresso da meta de faturamento  
**Tamanho:** Grande  
**Visível para:** Gerente e Proprietário

Widget expandido mostrando:
- Valor atual vs meta
- Barra de progresso
- Percentual atingido
- Valor necessário por dia

---

### 6. 📊 Gráfico Mensal
**Categoria:** Financeiro  
**Descrição:** Faturamento dos últimos meses em gráfico de barras  
**Tamanho:** Grande  
**Visível para:** Gerente e Proprietário

Visualização gráfica da evolução do faturamento.

---

### 7. 📋 OS Recentes
**Categoria:** Operacional  
**Descrição:** Lista das últimas ordens de serviço  
**Tamanho:** Grande  
**Visível para:** Todos

Lista com:
- Número da OS
- Cliente
- Veículo e placa
- Status (badge colorido)
- Valor (se não for funcionário)

---

### 8. 🔩 MO vs Peças
**Categoria:** Financeiro  
**Descrição:** Divisão entre mão de obra e peças  
**Tamanho:** Médio  
**Visível para:** Gerente e Proprietário

Breakdown detalhado com:
- Valor de mão de obra
- Valor de peças
- Percentual de cada um
- Barras de progresso

---

## 📅 Filtros de Período

### Presets Disponíveis:

#### 1. 📅 Hoje
Dados apenas do dia atual.

#### 2. 📆 Ontem
Dados do dia anterior.

#### 3. 📊 Últimos 7 dias
Última semana completa (incluindo hoje).

#### 4. 📈 Últimos 30 dias
Último mês (incluindo hoje).

#### 5. 🗓️ Este mês
Do dia 1 até hoje.

#### 6. 🗓️ Mês passado
Mês anterior completo.

#### 7. 📅 Este ano
De 1º de janeiro até hoje.

#### 8. ⚙️ Personalizado
Selecione data inicial e final manualmente.

---

## 🎨 Como Personalizar

### Passo 1: Abrir o Customizador

Clique no botão **"⚙️ Personalizar"** no canto superior direito do dashboard.

### Passo 2: Adicionar/Remover Widgets

**Remover widget:**
- Na seção "Widgets Ativos", clique no ícone ✕ no widget desejado

**Adicionar widget:**
- Na seção "Adicionar Widgets", clique no card do widget desejado
- Widgets estão organizados por categoria (Financeiro, Operacional, Clientes)

### Passo 3: Reorganizar Ordem

Use as setas ⬆️ e ⬇️ para mover widgets para cima ou para baixo na lista.

A ordem define como os widgets aparecerão no dashboard (da esquerda para direita, de cima para baixo).

### Passo 4: Salvar Layout

Clique em **"💾 Salvar Layout"** para aplicar as mudanças.

O layout é salvo automaticamente no navegador e persistirá entre sessões.

### Restaurar Padrão

Clique em **"🔄 Restaurar padrão"** para voltar ao layout original do sistema.

---

## 💾 Armazenamento Local

### localStorage Keys:

```javascript
// Layout personalizado
c10_dashboard_layout: Array<{id: string, order: number}>

// Meta mensal
c10_meta: number

// Exemplos:
localStorage.getItem('c10_dashboard_layout')
// [{"id":"meta_mensal","order":0},{"id":"faturamento","order":1},...]

localStorage.getItem('c10_meta')
// "30000"
```

### Estrutura do Layout:

```json
[
  { "id": "meta_mensal", "order": 0 },
  { "id": "faturamento", "order": 1 },
  { "id": "os_finalizadas", "order": 2 },
  { "id": "os_andamento", "order": 3 },
  { "id": "clientes", "order": 4 },
  { "id": "grafico_mensal", "order": 5 },
  { "id": "os_recentes", "order": 6 }
]
```

---

## 🔧 Componentes

### 1. DashboardV2.jsx
Componente principal do dashboard personalizável.

**Props:** Nenhuma

**Estado:**
- `layout`: Array de widgets ordenados
- `period`: Período selecionado
- `data`: Dados do dashboard
- `showCustomizer`: Modal de customização aberto/fechado
- `meta`: Meta mensal definida

**Funções principais:**
- `renderWidget(widgetId)`: Renderiza widget específico
- `handleLayoutSave(newLayout)`: Salva novo layout
- `loadLayout()`: Carrega layout salvo
- `saveLayout(layout)`: Persiste layout no localStorage

---

### 2. DashboardCustomizer.jsx
Modal de customização de widgets.

**Props:**
- `layout`: Layout atual
- `onSave(newLayout)`: Callback ao salvar
- `onClose()`: Callback ao fechar

**Funções:**
- `toggleWidget(widgetId)`: Adiciona/remove widget
- `moveWidget(widgetId, direction)`: Move widget na lista
- `resetToDefault()`: Restaura layout padrão

---

### 3. PeriodFilter.jsx
Seletor de período com presets e custom.

**Props:**
- `value`: Período atual `{preset, start, end}`
- `onChange(newPeriod)`: Callback ao mudar período

**Funções:**
- `calculatePeriod(presetId)`: Calcula datas do preset
- `handlePresetSelect(presetId)`: Aplica preset
- `handleCustomApply()`: Aplica período custom
- `formatDate(date)`: Formata data para ISO (YYYY-MM-DD)
- `formatDateBR(date)`: Formata data para BR (DD/MM/YYYY)

---

## 📖 Exemplos de Uso

### Exemplo 1: Layout Minimalista (apenas essencial)

```javascript
const minimalLayout = [
  { id: 'os_andamento', order: 0 },
  { id: 'os_finalizadas', order: 1 },
  { id: 'os_recentes', order: 2 },
];
```

**Use quando:** Funcionário que só precisa ver OS.

---

### Exemplo 2: Layout Financeiro Completo

```javascript
const financeLayout = [
  { id: 'meta_mensal', order: 0 },
  { id: 'faturamento', order: 1 },
  { id: 'breakdown_mo_pecas', order: 2 },
  { id: 'grafico_mensal', order: 3 },
];
```

**Use quando:** Gerente focado em finanças.

---

### Exemplo 3: Layout Operacional

```javascript
const operationalLayout = [
  { id: 'os_andamento', order: 0 },
  { id: 'os_finalizadas', order: 1 },
  { id: 'clientes', order: 2 },
  { id: 'os_recentes', order: 3 },
];
```

**Use quando:** Foco na operação do dia a dia.

---

### Exemplo 4: Filtrar por período personalizado

```javascript
// Buscar dados de Dezembro de 2025
const customPeriod = {
  preset: 'custom',
  start: '2025-12-01',
  end: '2025-12-31',
};

setPeriod(customPeriod);
```

---

## 🎨 Categorias de Widgets

### 💰 Financeiro
Widgets relacionados a faturamento, valores e metas.

**Cor:** Laranja (#F97316)

**Widgets:**
- Faturamento
- Meta Mensal
- Gráfico Mensal
- MO vs Peças

---

### 🔧 Operacional
Widgets relacionados a OS e operações.

**Cor:** Azul (#1E3A5F)

**Widgets:**
- OS Finalizadas
- OS em Andamento
- OS Recentes

---

### 👥 Clientes
Widgets relacionados à base de clientes.

**Cor:** Roxo (#7c3aed)

**Widgets:**
- Total de Clientes

---

## 🚀 Performance

### Otimizações Implementadas:

- ✅ **Lazy Loading**: Componentes carregados sob demanda
- ✅ **Memoization**: Widgets não re-renderizam desnecessariamente
- ✅ **LocalStorage**: Layout salvo localmente (sem requisições)
- ✅ **Animações CSS**: Transições suaves e performáticas
- ✅ **Debounce**: Filtros otimizados para não sobrecarregar API

---

## 🐛 Troubleshooting

### Layout não salva

**Problema:** Mudanças não persistem após reload

**Solução:**
```javascript
// Verificar localStorage
console.log(localStorage.getItem('c10_dashboard_layout'));

// Limpar e redefinir
localStorage.removeItem('c10_dashboard_layout');
// Recarregue a página
```

---

### Widgets não aparecem

**Problema:** Alguns widgets ficam vazios

**Causa:** Permissões de perfil (funcionário vs gerente)

**Solução:** Widgets financeiros só aparecem para gerentes e proprietários.

---

### Período não filtra corretamente

**Problema:** Dados não mudam ao trocar período

**Causa:** API pode não estar implementada para filtro de período

**Solução:** Verifique se a API `/api/app/dashboard` aceita parâmetros `start` e `end`.

---

## 🔮 Melhorias Futuras

### Planejadas:

- [ ] **Drag & Drop real** com biblioteca especializada
- [ ] **Widgets redimensionáveis** (pequeno, médio, grande)
- [ ] **Compartilhar layouts** entre usuários
- [ ] **Templates prontos** (Gerente, Mecânico, etc.)
- [ ] **Widgets personalizados** criados pelo usuário
- [ ] **Exportar dashboard** como PDF ou imagem
- [ ] **Comparação de períodos** (este mês vs mês passado)
- [ ] **Filtro por oficina** (multi-tenant)
- [ ] **Modo escuro** para dashboard
- [ ] **Widgets de gráficos avançados** (pizza, linha, área)

---

## 📞 Suporte

Dúvidas sobre o Dashboard Personalizável? Entre em contato pelo WhatsApp do suporte.

---

**Última atualização:** Junho 2026  
**Versão:** 2.0.0  
**Autor:** Equipe Chave 10 Human: continue

<EnvironmentContext>
This information is provided as context about user environment. Only consider it if it's relevant to the user request ignore it otherwise.

<OPEN-EDITOR-FILES>
<file name="c:\Users\wall_\Desktop\Projetos\CHAVE 10\index.html" />
<file name="c:\Users\wall_\Desktop\Projetos\CHAVE 10\demo\index.html" />
</OPEN-EDITOR-FILES>

<ACTIVE-EDITOR-FILE>
<file name="c:\Users\wall_\Desktop\Projetos\CHAVE 10\demo\index.html" />
</ACTIVE-EDITOR-FILE>
</EnvironmentContext>