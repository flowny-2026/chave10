# 🔍 Busca Global Aprimorada - Chave 10

Sistema de busca unificada estilo Command Palette com suporte a atalhos de teclado e navegação completa.

## ✨ Funcionalidades

### 1. **Busca em Múltiplas Áreas**
- ✅ **Ordens de Serviço** - por ID, cliente, placa, veículo, descrição
- ✅ **Clientes** - por nome, telefone, email
- ✅ **Veículos** - por placa, marca, modelo, proprietário
- ✅ **Orçamentos** - por ID, cliente, veículo

### 2. **Atalhos de Teclado**
- ✅ **Ctrl+K** (Windows/Linux) ou **⌘+K** (Mac) - Abre busca de qualquer lugar
- ✅ **Esc** - Fecha a busca
- ✅ **↑↓** - Navega entre resultados
- ✅ **Enter** - Abre item selecionado

### 3. **Resultados Instantâneos**
- ✅ Busca local em cache (sem latência de rede)
- ✅ Resultados aparecem conforme digita
- ✅ Preview com informações contextuais
- ✅ Highlight visual do item selecionado

### 4. **Interface Intuitiva**
- ✅ Ícones coloridos por categoria
- ✅ Preview de dados importantes
- ✅ Status badges para OS
- ✅ Dicas visuais de navegação no rodapé

---

## 🎯 Como Usar

### Método 1: Atalho Global
```
1. Pressione Ctrl+K (ou ⌘+K no Mac) em qualquer tela
2. Digite sua busca
3. Use ↑↓ para navegar
4. Pressione Enter para abrir
```

### Método 2: Campo de Busca
```
1. Clique no campo de busca no topo
2. Digite sua busca
3. Clique no resultado ou use teclado
```

---

## 🔎 Exemplos de Busca

### Buscar OS por Número
```
Digite: 47
Resultado: OS #0047
```

### Buscar por Cliente
```
Digite: João Silva
Resultados:
- Cliente: João Silva
- OS relacionadas ao João
- Veículos do João
```

### Buscar por Placa
```
Digite: ABC1234
Resultados:
- Veículo com placa ABC-1234
- OS relacionadas a essa placa
```

### Buscar por Modelo
```
Digite: HB20
Resultados:
- Veículos HB20 cadastrados
- OS de veículos HB20
```

---

## 🎨 Cores e Categorias

### Ordens de Serviço
- **Cor:** Azul (`#1E3A5F`)
- **Ícone:** Chave inglesa
- **Info:** ID, cliente, status, veículo

### Clientes
- **Cor:** Azul claro (`#2563EB`)
- **Ícone:** Inicial do nome
- **Info:** Nome, telefone/email

### Veículos
- **Cor:** Verde (`#16a34a`)
- **Ícone:** Carro
- **Info:** Marca/modelo, placa, proprietário

### Orçamentos
- **Cor:** Laranja (`#F97316`)
- **Ícone:** Documento
- **Info:** ID, cliente, veículo

---

## ⚙️ Configuração Técnica

### Cache Local
```javascript
const cache = {
  os: [],          // Todas as OS
  clientes: [],    // Todos os clientes
  veiculos: [],    // Todos os veículos
  orcamentos: []   // Todos os orçamentos
};
```

**Carregamento:**
- Cache carregado no primeiro foco
- Permanece em memória durante sessão
- Atualiza ao navegar entre páginas

### Normalização de Busca
```javascript
function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[-\s]/g, ''); // Remove espaços e hífens
}
```

**Suporta:**
- Case insensitive
- Ignora espaços e hífens em placas
- Busca parcial (substring)

---

## 🎹 Navegação por Teclado

### Índice Global
Os resultados são indexados sequencialmente:
```
Índice 0-4:   OS (5 resultados)
Índice 5-8:   Clientes (4 resultados)
Índice 9-12:  Veículos (4 resultados)
Índice 13-15: Orçamentos (3 resultados)
```

### Seleção Visual
```css
background: var(--brand-light);  /* OS selecionada */
background: #EFF6FF;             /* Cliente selecionado */
background: #F0FDF4;             /* Veículo selecionado */
background: #FFF7ED;             /* Orçamento selecionado */
```

---

## 🔧 Customização

### Limitar Resultados por Categoria
```javascript
const os = cache.os.filter(...).slice(0, 5);        // 5 OS
const clientes = cache.clientes.filter(...).slice(0, 4);  // 4 clientes
const veiculos = cache.veiculos.filter(...).slice(0, 4);  // 4 veículos
const orcamentos = cache.orcamentos.filter(...).slice(0, 3); // 3 orçamentos
```

### Adicionar Nova Categoria
```javascript
// 1. Adicionar ao cache
const [os, clientes, veiculos, agenda] = await Promise.all([
  api.app.os.list(),
  api.app.clientes.list(),
  api.app.veiculos.list(),
  api.app.agenda.list(), // Nova categoria
]);

// 2. Adicionar ao filtro
const agenda = cache.agenda.filter(ev =>
  match(ev.titulo, q) ||
  match(ev.cliente_nome, q)
).slice(0, 3);

// 3. Adicionar ao render
{results.agenda.length > 0 && (
  <Section label="Agenda">
    {results.agenda.map(ev => (...))}
  </Section>
)}
```

---

## 📊 Performance

### Métricas
- **Carregamento inicial:** ~200-500ms (cache)
- **Busca:** <10ms (local, em memória)
- **Render:** <16ms (60fps)

### Otimizações
- ✅ Debounce não necessário (busca local)
- ✅ Lazy loading do cache
- ✅ Slice para limitar resultados
- ✅ Memoization do filtro (useCallback)

---

## 🐛 Troubleshooting

### Resultados não aparecem
```javascript
// Verificar cache
console.log(cache);

// Forçar reload do cache
setCacheLoaded(false);
loadCache();
```

### Navegação por teclado não funciona
```javascript
// Verificar índice
console.log('Selected:', selectedIndex);
console.log('Total:', allResults.length);
```

### Busca não encontra item
```javascript
// Testar normalização
console.log(normalizar('ABC-1234')); // "abc1234"
console.log(normalizar('ABC 1234')); // "abc1234"
```

---

## 🚀 Melhorias Futuras

### Planejadas:
- [ ] Busca fuzzy (typo-tolerant)
- [ ] Histórico de buscas recentes
- [ ] Ordenação por relevância
- [ ] Busca por comando (ex: "criar os", "nova cliente")
- [ ] Previews expandidos ao hover
- [ ] Filtros por categoria (ex: "os:47")
- [ ] Highlight de termos buscados
- [ ] Sugestões de busca (autocomplete)
- [ ] Busca em mensagens e lembretes
- [ ] Ações rápidas (ex: finalizar OS direto da busca)

---

## 💡 Dicas de UX

### Para Usuários:
1. Use **Ctrl+K** para busca rápida de qualquer lugar
2. Digite **apenas números** para buscar OS/orçamentos por ID
3. Digite **placa sem hífen** (funciona igual)
4. Use **setas** para navegar (mais rápido que mouse)

### Para Desenvolvedores:
1. Mantenha cache sempre atualizado
2. Limite resultados (performance)
3. Use cores consistentes por categoria
4. Teste com dados reais (edge cases)

---

## 📝 Exemplos de Código

### Buscar Programaticamente
```javascript
// Abrir busca
setOpen(true);
setTimeout(() => inputRef.current?.focus(), 50);

// Buscar termo específico
setQuery('ABC1234');

// Navegar para resultado
setSelectedIndex(2);

// Abrir item selecionado
goTo('/app/os');
```

### Adicionar Ação Customizada
```javascript
// No handleKeyDown
if (e.key === 'Enter' && e.shiftKey) {
  // Shift+Enter = ação alternativa
  e.preventDefault();
  openInNewTab(selected);
}
```

---

## 📞 Suporte

Dúvidas sobre implementação? Entre em contato pelo WhatsApp do suporte.

---

**Última atualização:** Junho 2026  
**Versão:** 2.0
