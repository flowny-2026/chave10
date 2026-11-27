# 🚀 Configuração de Auto-Deploy - Chave 10

## ✅ Método Recomendado: Vercel GitHub Integration

### **1. Conectar Vercel ao GitHub (uma vez só)**

1. Acesse: https://vercel.com/dashboard
2. Clique em **"Add New..."** → **"Project"**
3. Clique em **"Import Git Repository"**
4. Autorize a Vercel a acessar o GitHub (se ainda não autorizou)
5. Selecione o repositório: `flowny-2026/chave10`
6. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `chave10-novo/frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
7. Clique em **"Deploy"**

### **2. Configurar Branch de Produção**

1. No projeto da Vercel, vá em **Settings**
2. Vá em **Git**
3. Configure:
   - **Production Branch:** `main`
   - **Deploy Hooks:** ENABLED ✅

### **3. Verificar Webhook no GitHub**

1. Vá em: https://github.com/flowny-2026/chave10/settings/hooks
2. Você deve ver um webhook da Vercel
3. URL: `https://api.vercel.com/v1/integrations/deploy/...`

---

## 🔄 Como funciona depois de configurado:

1. Você faz alterações no código
2. `git add -A`
3. `git commit -m "sua mensagem"`
4. `git push origin main`
5. **A Vercel detecta automaticamente e faz deploy!** 🎉

**Tempo de deploy:** 2-5 minutos

---

## 🧪 Testar se está funcionando:

1. Faça uma pequena mudança (ex: adicione um comentário no código)
2. Commit e push
3. Vá em: https://vercel.com/dashboard
4. Você deve ver um novo deploy em andamento (amarelo)
5. Aguarde ficar verde (sucesso)
6. Acesse: https://chave10.tech
7. Dê hard refresh: **Ctrl + Shift + R**

---

## 🔧 Se ainda não estiver funcionando:

### **Opção A: Relink o projeto**

1. Vercel Dashboard → Projeto → Settings → Git
2. Clique em **"Disconnect"**
3. Clique em **"Connect Git Repository"**
4. Selecione `flowny-2026/chave10` novamente

### **Opção B: Deploy Hook Manual**

1. Vercel → Settings → Git → Deploy Hooks
2. Clique em **"Create Hook"**
3. Nome: `main-deploy`
4. Branch: `main`
5. Copie a URL gerada (ex: `https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy`)

Depois, adicione no GitHub:
1. GitHub → Settings → Webhooks → Add webhook
2. Payload URL: Cole a URL da Vercel
3. Content type: `application/json`
4. Eventos: `Just the push event`
5. Active: ✅
6. Clique em **"Add webhook"**

---

## 📋 Checklist de Verificação:

- [ ] Vercel conectada ao GitHub
- [ ] Repositório `flowny-2026/chave10` linkado
- [ ] Root directory: `chave10-novo/frontend`
- [ ] Production branch: `main`
- [ ] Webhook existe no GitHub
- [ ] Auto-deploy está ENABLED

---

## 🎯 Resultado Esperado:

Toda vez que você fizer `git push origin main`:
- Vercel detecta o push
- Inicia build automaticamente
- Deploy em produção (chave10.tech)
- Tempo total: 2-5 minutos

**Sem precisar fazer nada manual!** ✨
