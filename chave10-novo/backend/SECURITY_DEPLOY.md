# Checklist de Segurança para Deploy — Chave 10

Guia de configuração de segurança para os ambientes de produção:
**Render** (backend), **Vercel** (frontend), **Supabase** (banco de dados).

---

## 1. Render (Backend)

### Variáveis de Ambiente obrigatórias

| Variável | Valor | Por quê |
|---|---|---|
| `NODE_ENV` | `production` | Ativa HSTS, desabilita seed, ajusta logs |
| `JWT_SECRET` | string aleatória ≥ 64 chars | Assinar tokens JWT |
| `MASTER_ADMIN_PASSWORD` | senha forte ≥ 12 chars | Senha inicial do admin |
| `DATABASE_URL` | connection string Supabase | Conexão ao banco |
| `FRONTEND_URL` | `https://seuapp.vercel.app` | CORS — bloqueia todas as outras origens |
| `REQUEST_TIMEOUT_MS` | `30000` | Timeout de requisição (anti-slowloris) |

### Configurações no painel do Render

- **Health Check Path**: `/health`
- **Auto-Deploy**: ativado apenas na branch `main`
- **Environment**: selecione `Production`
- **Plan**: mínimo **Starter** — o free tier dorme após inatividade, o que quebra o rate limit (memória zerada)

### HTTPS no Render

O Render provisiona TLS automaticamente via Let's Encrypt.  
Certifique-se de:

- [ ] Domínio customizado configurado com registro CNAME para `onrender.com`
- [ ] "Force HTTPS" ativado nas configurações do serviço
- [ ] O header `Strict-Transport-Security` é enviado pelo backend (já configurado no Helmet)

### Headers de segurança extras no Render

No painel **Settings → Headers**, adicione:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

> O Helmet já envia esses headers pela aplicação, mas adicioná-los no nível do CDN/proxy
> garante que cheguem mesmo em respostas de erro geradas pelo Render antes da app.

---

## 2. Vercel (Frontend)

### `vercel.json` — Headers de segurança e CSP do frontend

Crie ou atualize o `vercel.json` na raiz do frontend:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options",        "value": "DENY" },
        { "key": "X-Content-Type-Options",  "value": "nosniff" },
        { "key": "Referrer-Policy",         "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",      "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://seubackend.onrender.com; font-src 'self'; frame-ancestors 'none';"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

> Substitua `https://seubackend.onrender.com` pela URL real do seu backend no Render.

### Variáveis de Ambiente no Vercel

| Variável | Valor |
|---|---|
| `VITE_API_URL` | URL do backend no Render (sem barra final) |

- Defina apenas em **Production** e **Preview** — nunca comite no repositório.
- Nunca exponha `JWT_SECRET` ou credenciais no frontend.

### Configurações de segurança no Vercel

- [ ] **Branch Protection**: configure deployments apenas a partir de `main`
- [ ] **Password Protection**: ative em Preview deployments para não expor versões de desenvolvimento
- [ ] **Team SSO**: se usar plano Team, ative SSO com MFA

---

## 3. Supabase (Banco de Dados PostgreSQL)

### Configurações essenciais

- [ ] **Senha do banco**: use senha forte gerada automaticamente pelo Supabase (não troque por algo fraco)
- [ ] **Connection Pooling**: ative o PgBouncer em modo **Transaction** para o backend Node.js
  - Isso evita que o free tier esgote as conexões (limite de 60 conexões no plano free)
  - Use a connection string do **pooler** no `DATABASE_URL`, não a direta

### SSL obrigatório

A connection string do Supabase já inclui `?sslmode=require`.  
No código, `DATABASE_SSL_REJECT_UNAUTHORIZED` deve ser `true` (padrão) — nunca `false` em produção.

```
# .env de produção
DATABASE_URL=postgresql://postgres:[senha]@db.[ref].supabase.co:5432/postgres?sslmode=require
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

### Row Level Security (RLS)

O sistema Chave 10 usa isolamento por `oficina_id` na camada da aplicação.  
Como reforço adicional, considere ativar RLS nas tabelas principais:

```sql
-- Exemplo: bloqueia qualquer acesso sem uma policy explícita
ALTER TABLE clientes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
-- Adicione policies conforme necessário para o usuário da aplicação
```

> O RLS no Supabase é opcional se o backend já filtra por `oficina_id` em todas as queries
> (o que é o caso após a auditoria de IDOR). Mas é uma camada adicional valiosa.

### IP Allowlist (Supabase Pro)

No plano Pro, restrinja conexões ao banco apenas ao IP do Render:

- Painel Supabase → **Database → Network restrictions**
- Adicione o IP do seu serviço Render (estático no plano Starter+)

### Backups

- [ ] Ative **Point-in-Time Recovery** (plano Pro) ou
- [ ] Configure o backup automático do próprio Chave 10 (`BACKUP_INTERVAL_HOURS=24`)
- [ ] Teste o restore periodicamente

---

## 4. Checklist Geral pré-go-live

- [ ] `NODE_ENV=production` no Render
- [ ] `JWT_SECRET` com ≥ 64 caracteres aleatórios
- [ ] `MASTER_ADMIN_PASSWORD` definido e trocado no primeiro login
- [ ] `SEED_KEY` vazio (desabilita o endpoint `/seed-demo`)
- [ ] `FRONTEND_URL` aponta exatamente para o domínio Vercel (sem barra final)
- [ ] HTTPS forçado no Render
- [ ] SSL `rejectUnauthorized=true` no Supabase
- [ ] Rate limiting validado (testar com `scripts/test-security.js`)
- [ ] Logs monitorados (Render → Logs; alertas em `LOGIN_FAIL` em sequência)
- [ ] Backups automáticos configurados e testados
- [ ] `vercel.json` com headers de segurança no frontend

---

## 5. Monitorar em produção

Eventos de log que merecem alerta imediato:

| Evento | Significado |
|---|---|
| `LOGIN_FAIL` em sequência do mesmo IP | Brute force em andamento |
| `SECURITY:idor_tentativa` | Tentativa de acesso a dados de outra oficina |
| `SECURITY:acesso_negado` múltiplos | Varredura de endpoints |
| `pg_error_desconhecido` | Possível problema de integridade no banco |
| HTTP 429 em volume | Flood ou abuso de automação |
