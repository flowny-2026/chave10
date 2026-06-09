# 📄 Sistema de Exportação de PDFs - Chave 10

Sistema completo para exportar relatórios e documentos em formato PDF.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades](#funcionalidades)
3. [Como Usar](#como-usar)
4. [API Reference](#api-reference)
5. [Customização](#customização)
6. [Exemplos](#exemplos)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema de exportação de PDFs permite que usuários gerem relatórios profissionais em PDF com apenas um clique. Os PDFs são gerados no navegador usando jsPDF, sem necessidade de processamento no servidor.

### Recursos Principais:

- ✅ **Geração no Cliente** - PDFs criados no navegador (sem servidor)
- ✅ **Templates Prontos** - Layouts profissionais pré-configurados
- ✅ **Branding Automático** - Logo e cores do Chave 10
- ✅ **Múltiplos Formatos** - Relatórios, OS, Listas, Detalhes
- ✅ **Feedback Visual** - Loading e toasts de sucesso/erro
- ✅ **Mobile-Friendly** - Funciona em dispositivos móveis

---

## 📦 Funcionalidades

### 1. Relatório Financeiro

**Conteúdo:**
- KPIs principais (Faturamento, Serviços, Ticket Médio, Clientes)
- Top 5 serviços mais realizados
- Distribuição de receita por categoria
- Gráficos e barras de progresso

**Uso:**
```javascript
import { exportRelatorioFinanceiro } from './utils/pdfExporter';

const data = {
  totalFaturamento: 15000,
  totalServicos: 45,
  ticketMedio: 333.33,
  totalClientes: 78,
  topServicos: [...],
  categorias: [...],
};

await exportRelatorioFinanceiro(data);
```

---

### 2. Lista de OS

**Conteúdo:**
- Tabela com todas as OS
- Filtros aplicados
- Zebrado para legibilidade
- Total geral

**Uso:**
```javascript
import { exportOSListPDF } from './utils/pdfExporter';

const osList = [...]; // Array de OS
const filtros = {
  periodo: 'Este mês',
  status: 'Finalizado',
};

await exportOSListPDF(osList, filtros);
```

---

### 3. OS Detalhada

**Conteúdo:**
- Dados do cliente
- Informações do veículo
- Serviços realizados
- Breakdown de valores (MO + Peças)
- Total destacado

**Uso:**
```javascript
import { exportOSDetalhePDF } from './utils/pdfExporter';

const os = {
  id: 47,
  cliente_nome: 'João Silva',
  cliente_telefone: '(11) 98765-4321',
  veiculo_marca: 'Fiat',
  veiculo_modelo: 'Uno',
  placa: 'ABC-1234',
  servicos: 'Troca de óleo\nAlinhamento',
  valor_mo: 150,
  valor_pecas: 250,
  created_at: '2026-06-09',
};

await exportOSDetalhePDF(os);
```

---

## 🎨 Como Usar

### Passo 1: Importar Funções

```javascript
import {
  exportRelatorioFinanceiro,
  exportOSListPDF,
  exportOSDetalhePDF,
  exportWithFeedback,
} from './utils/pdfExporter';
```

### Passo 2: Preparar Dados

```javascript
const dadosRelatorio = {
  totalFaturamento: calcularFaturamento(),
  totalServicos: contarServicos(),
  ticketMedio: calcularTicketMedio(),
  totalClientes: clientes.length,
  topServicos: getTopServicos(),
  categorias: getCategorias(),
};
```

### Passo 3: Chamar Função de Export

**Sem feedback:**
```javascript
await exportRelatorioFinanceiro(dadosRelatorio);
```

**Com feedback visual (recomendado):**
```javascript
await exportWithFeedback(exportRelatorioFinanceiro, dadosRelatorio);
```

### Passo 4: Adicionar Botão na UI

```jsx
<button 
  className="btn btn-primary" 
  onClick={() => exportWithFeedback(exportRelatorioFinanceiro, dados)}
>
  📄 Exportar PDF
</button>
```

---

## 🔧 API Reference

### `exportRelatorioFinanceiro(data)`

Gera PDF do relatório financeiro completo.

**Parâmetros:**
```typescript
{
  totalFaturamento: number;      // Faturamento total em R$
  totalServicos: number;          // Quantidade de serviços
  ticketMedio: number;            // Valor médio por serviço
  totalClientes: number;          // Quantidade de clientes
  topServicos: Array<{            // Top 5 serviços
    nome: string;
    qtd: number;
    fat: number;
  }>;
  categorias: Array<{             // Categorias de receita
    nome: string;
    valor: number;
  }>;
}
```

**Retorno:**
```typescript
{
  success: boolean;
  filename?: string;  // Nome do arquivo gerado
  error?: string;     // Mensagem de erro (se falhar)
}
```

---

### `exportOSListPDF(osList, filtros?)`

Gera PDF com lista de ordens de serviço.

**Parâmetros:**
```typescript
osList: Array<{
  id: number;
  cliente_nome: string;
  veiculo_modelo: string;
  status: 'em_andamento' | 'finalizado';
  valor: number;
}>;

filtros?: {
  periodo?: string;   // Ex: "Este mês"
  status?: string;    // Ex: "Finalizado"
}
```

---

### `exportOSDetalhePDF(os)`

Gera PDF detalhado de uma OS específica.

**Parâmetros:**
```typescript
os: {
  id: number;
  cliente_nome: string;
  cliente_telefone?: string;
  veiculo_marca: string;
  veiculo_modelo: string;
  placa: string;
  servicos: string;        // Serviços separados por \n
  valor_mo: number;        // Mão de obra
  valor_pecas: number;     // Peças
  created_at: string;      // ISO date
}
```

---

### `exportWithFeedback(exportFunction, ...args)`

Wrapper que adiciona feedback visual (loading + toast).

**Uso:**
```javascript
await exportWithFeedback(exportRelatorioFinanceiro, dados);
```

**Comportamento:**
1. Mostra toast "⏳ Gerando PDF..."
2. Executa função de export
3. Mostra toast de sucesso ou erro
4. Retorna resultado

---

## 🎨 Customização

### Cores do Tema

Edite as constantes em `pdfExporter.js`:

```javascript
const COLORS = {
  brand: '#1E3A5F',      // Azul principal
  accent: '#F97316',     // Laranja destaque
  success: '#16a34a',    // Verde sucesso
  gray: '#6B7280',       // Cinza texto
  lightGray: '#F3F4F6',  // Cinza claro fundo
  darkGray: '#374151',   // Cinza escuro
};
```

---

### Formatação

Funções de formatação disponíveis:

```javascript
const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => {
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  },
  datetime: iso => {
    return new Date(iso).toLocaleString('pt-BR');
  },
};
```

---

### Header Customizado

Para customizar o header, edite a função:

```javascript
// Header
doc.setFillColor(COLORS.brand);
doc.rect(0, 0, 210, 35, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(22);
doc.setFont('helvetica', 'bold');
doc.text('Chave 10', 15, 15);
```

---

### Footer Customizado

Para customizar o footer, edite:

```javascript
// Footer
const pageCount = doc.internal.getNumberOfPages();
for (let i = 1; i <= pageCount; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(COLORS.gray);
  doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
  doc.text('Chave 10 - Sistema de Gestão para Oficinas', 105, 290, { align: 'center' });
}
```

---

## 📖 Exemplos

### Exemplo 1: Botão de Export em Relatórios

```jsx
import { exportWithFeedback, exportRelatorioFinanceiro } from '../utils/pdfExporter';

function Relatorios() {
  const [dados, setDados] = useState(null);

  function handleExport() {
    exportWithFeedback(exportRelatorioFinanceiro, dados);
  }

  return (
    <div>
      <button className="btn btn-primary" onClick={handleExport}>
        📄 Exportar PDF
      </button>
    </div>
  );
}
```

---

### Exemplo 2: Export de OS Individual

```jsx
import { exportOSDetalhePDF } from '../utils/pdfExporter';

function OSCard({ os }) {
  return (
    <div className="os-card">
      <h3>OS #{os.id}</h3>
      <button onClick={() => exportOSDetalhePDF(os)}>
        Exportar PDF
      </button>
    </div>
  );
}
```

---

### Exemplo 3: Export em Lote

```jsx
async function exportMultipleOS(osList) {
  for (const os of osList) {
    await exportOSDetalhePDF(os);
    // Aguarda 500ms entre exports para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  alert(`${osList.length} PDFs exportados!`);
}
```

---

## 🐛 Troubleshooting

### Erro: "jsPDF is not defined"

**Causa:** Script jsPDF não carregou

**Solução:**
1. Verifique se o script está no `index.html`:
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
   ```

2. Aguarde o carregamento antes de exportar:
   ```javascript
   await ensureJsPDF(); // Carrega automaticamente se necessário
   ```

---

### PDFs não abrem no mobile

**Causa:** Configurações de download do navegador mobile

**Solução:**
1. Use `doc.output('bloburl')` em vez de `doc.save()` no mobile
2. Abra o PDF em nova aba:
   ```javascript
   const pdfBlob = doc.output('bloburl');
   window.open(pdfBlob, '_blank');
   ```

---

### Texto cortado ou sobreposto

**Causa:** Posicionamento `yPos` incorreto

**Solução:**
1. Sempre incremente `yPos` após cada elemento
2. Verifique limites de página (270-280)
3. Adicione `doc.addPage()` quando necessário

---

### Caracteres especiais não aparecem

**Causa:** jsPDF não suporta todos os caracteres por padrão

**Solução:**
Use fontes Unicode ou substitua caracteres:
```javascript
const texto = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
```

---

## 📊 Performance

### Métricas:

- **Relatório Simples:** ~100-200ms
- **OS Lista (50 itens):** ~300-500ms
- **OS Detalhada:** ~150-250ms

### Otimizações:

- ✅ Carregamento lazy do jsPDF
- ✅ Reuso de instância jsPDF
- ✅ Formatação otimizada
- ✅ Paginação automática

---

## 🚀 Melhorias Futuras

### Planejadas:

- [ ] **Adicionar logo** da oficina no header
- [ ] **QR Code** para rastreamento de OS
- [ ] **Assinatura digital** em OS
- [ ] **Templates customizáveis** por usuário
- [ ] **Export em lote** com ZIP
- [ ] **Gráficos** (Chart.js para imagens)
- [ ] **Anexos** de fotos do veículo
- [ ] **Histórico** de exports gerados
- [ ] **Agendamento** de relatórios automáticos
- [ ] **Envio por email** direto do sistema

---

## 📞 Suporte

Dúvidas sobre exportação de PDFs? Entre em contato pelo WhatsApp do suporte.

---

**Última atualização:** Junho 2026  
**Versão:** 1.0.0  
**Dependências:** jsPDF 2.5.1  
**Autor:** Equipe Chave 10
