# Checklist de Produção — Chave 10

Verifique todos os itens antes de cada deploy em produção.

---

## ✅ Variáveis de Ambiente Obrigatórias

| Variável | Descrição | Validação |
|---|---|---|
| `JWT_SECRET` | Secret para assinar tokens | ≥ 32 chars, recomendado 128 hex |
| `DATABASE_URL` | Connection string PostgreSQL | Formato `postgresql://...` |
| `FRONTEND_URL` | URL do frontend Vercel | URL sem barra final |
| `MASTER_ADMIN_PASSWORD` | Senha inicial do admin | ≥ 8 chars, ≠ admin123 |
| `NODE_ENV` | Ambiente | `production` |
| `PORT` | Porta do servidor | Número 1-65535 |

## ✅ HTTPS

- [ ] Render: "Force HTTPS" ativado
- [ ] HSTS configurado (1 ano, includeSubDomains, preload)
- [ ] Certificado SSL ativo (automático no Render e Vercel)

## ✅ Backup

- [ ] `BACKUP_INTERVAL_HOURS` configurado (padrão 24h)
- [ ] `pg_dump` disponível no Render ou backup via Supabase PITR
- [ ] Teste de restore realizado pelo menos 1x

## ✅ Logs e Auditoria

- [ ] Logs estruturados em produção (INFO, WARN, ERROR, SECURITY)
- [ ] Nenhum secret nos logs (validado pelo logger.js)
- [ ] Tabela `audit_logs` criada
- [ ] Tabela `audit_alerts` criada
- [ ] IPs anonimizados (LGPD)

## ✅ Rate Limit

- [ ] Login: 5 req / 15 min (progressivo até 1h)
- [ ] Registro: 3 req / hora
- [ ] Global: 500 req / min
- [ ] Escrita: 100 req / min
- [ ] Admin: 60 req / min

## ✅ CORS

- [ ] Apenas `FRONTEND_URL` e `FRONTEND_URL_2` em produção
- [ ] Sem wildcard
- [ ] Requests sem origin bloqueados em produção
- [ ] Credentials: true

## ✅ Content-Security-Policy

- [ ] Backend: `default-src 'none'` (API pura)
- [ ] Frontend (vercel.json): `default-src 'self'` + whitelist explícita
- [ ] `frame-ancestors 'none'` (anti-clickjacking)

## ✅ JWT

- [ ] Expiração: 7 dias (reduzido de 30d)
- [ ] Secret validado na inicialização (envValidator.js)
- [ ] Perfil e oficina_id no payload
- [ ] Sem dados sensíveis no payload

## ✅ Dependabot & Secret Scanning

- [ ] `.github/dependabot.yml` configurado
- [ ] GitHub Secret Scanning habilitado (Settings → Security)
- [ ] Push Protection habilitada (Settings → Security)
- [ ] Workflow `security-audit.yml` rodando em PRs

## ✅ Monitoramento

- [ ] Health check: `GET /health`
- [ ] Métricas: `GET /api/admin/metrics`
- [ ] Request ID: `X-Request-Id` em toda resposta
- [ ] Response time: `X-Response-Time` header
- [ ] Sentry: preparado (descomentar quando configurar DSN)

---

## Migração Futura: Access Token + Refresh Token

### Arquitetura planejada:

```
POST /api/auth/login → { accessToken (exp 15min), refreshToken (exp 7d) }
POST /api/auth/refresh → { accessToken (exp 15min) }  // usa refreshToken
POST /api/auth/logout → invalida refreshToken no banco
```

### Passos para implementar:

1. Criar tabela `refresh_tokens` (id, usuario_id, token_hash, expires_at, revoked)
2. Login: emite accessToken (15min) + refreshToken (7d, salvo no banco)
3. Middleware: verifica accessToken (curta duração)
4. Rota `/refresh`: valida refreshToken, emite novo accessToken
5. Rota `/logout`: marca refreshToken como revoked
6. Job agendado: limpa refresh_tokens expirados 1x por dia
7. Frontend: interceptor no api.js que faz refresh automático quando 401

### Impacto no frontend:
- `api.js`: adicionar interceptor de refresh automático
- Armazenar refreshToken em httpOnly cookie (não em localStorage)
- Atualizar `useAuth.js` para lidar com expiração curta

### Quando implementar:
- Quando houver necessidade de logout remoto
- Quando houver múltiplos dispositivos por usuário
- Quando houver compliance que exija revogação imediata
