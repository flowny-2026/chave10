# Guia de Backup e Restauração — Chave 10

Procedimentos para backup, verificação de integridade e restauração do banco PostgreSQL.

---

## 1. Estratégia de Backup

### Backup Automático
O backend realiza backup automático a cada 24 horas (configurável via `BACKUP_INTERVAL_HOURS`).
Os arquivos são salvos em `backend/backups/` com o formato:

```
backup_2026-07-12T14-30-00.sql
backup_2026-07-12T14-30-00.sql.json   ← metadata com checksum SHA-256
```

O sistema mantém os últimos **30 backups** e remove os mais antigos automaticamente.

### Backup Manual
```bash
# Via npm script (recomendado)
cd chave10-novo/backend
npm run backup

# Ou diretamente com pg_dump
pg_dump "$DATABASE_URL" -f backup_manual.sql
```

---

## 2. Verificação de Integridade

Antes de qualquer restauração, verifique se o arquivo não está corrompido:

```bash
# Via API (apenas master_admin)
GET /api/admin/db-health

# Via CLI
cd chave10-novo/backend
npm run db:health
```

O health check verifica:
- Conectividade com o banco
- Registros órfãos (FKs quebradas)
- Duplicidades (e-mails, placas, números de OS)
- Dados inconsistentes (valores negativos, somas incorretas)
- Índices críticos presentes
- Status das migrations
- Pool de conexões

---

## 3. Processo de Restauração

### ⚠️ Antes de restaurar

1. **Anote o estado atual** — registre quais dados precisam ser recuperados
2. **Faça um backup do estado atual** (mesmo que corrompido)
3. **Avise os usuários** — a restauração derruba o banco temporariamente
4. **Verifique o arquivo de backup** — confira o checksum

### 3.1 Restauração no Supabase

O Supabase (plano Pro) oferece Point-in-Time Recovery no painel.

Para restaurar um backup manual (`.sql`):

```bash
# 1. Conecte ao banco via psql com a connection string do Supabase
psql "$DATABASE_URL"

# 2. (Opcional) Limpa o schema existente — CUIDADO: destrói todos os dados
# DROP SCHEMA public CASCADE;
# CREATE SCHEMA public;

# 3. Restaura o backup
\i /caminho/para/backup_2026-07-12T14-30-00.sql

# 4. Sai do psql
\q
```

Ou em uma linha:
```bash
psql "$DATABASE_URL" -f /caminho/para/backup_2026-07-12T14-30-00.sql
```

### 3.2 Restauração no Render (PostgreSQL)

O Render (plano pago) possui backups automáticos diários no painel.

Para restaurar um backup manual:

```bash
# Conecte via psql usando as credenciais do Render
psql "postgresql://usuario:senha@host:5432/banco"

# Restaura
\i /caminho/para/backup.sql
```

### 3.3 Restauração local (desenvolvimento)

```bash
# 1. Cria o banco local se não existir
createdb chave10_dev

# 2. Restaura
psql "postgresql://postgres:postgres@localhost:5432/chave10_dev" \
  -f /caminho/para/backup.sql

# 3. Aplica migrations pendentes
cd chave10-novo/backend
npm run db:migrate
```

---

## 4. Migrations Versionadas

O sistema usa migrations numeradas (`001_`, `002_`, ...) com controle de versão via tabela `schema_migrations`.

### Verificar status
```bash
npm run db:migrate:status
```

Saída esperada:
```
✅ [APLICADO]  001_initial_schema.sql
✅ [APLICADO]  002_approval_and_audit.sql
⏳ [PENDENTE]  003_nova_feature.sql   ← se houver nova migration
```

### Aplicar migrations pendentes
```bash
npm run db:migrate
```

### Criar uma nova migration

1. Crie o arquivo com o próximo número sequencial:
   ```
   backend/src/migrations/003_descricao_curta.sql
   ```

2. Escreva SQL idempotente (sempre use `IF NOT EXISTS` / `IF EXISTS`):
   ```sql
   -- Migration 003: Descrição da mudança
   ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cpf TEXT;
   CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(oficina_id, cpf);
   ```

3. Execute:
   ```bash
   npm run db:migrate
   ```

### ⚠️ Regras de migrations

- **Nunca altere** um arquivo `.sql` após ele ter sido aplicado em produção
- Checksum SHA-256 detecta alterações retroativas e bloqueia o runner
- Para corrigir algo, crie uma **nova migration**
- Migrations são executadas em transação — falha faz rollback automático

---

## 5. Checklist pré-deploy

Antes de subir uma nova versão:

```bash
# 1. Verificar saúde do banco
npm run db:health

# 2. Verificar status das migrations
npm run db:migrate:status

# 3. Fazer backup manual
npm run backup

# 4. (Se houver migrations pendentes) Aplicar
npm run db:migrate

# 5. Iniciar o servidor
npm start
```

---

## 6. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Corrupção de dados | Backups automáticos a cada 24h + checksum SHA-256 |
| Migration incorreta | Transações atômicas — falha faz rollback |
| Migration alterada retroativamente | Checksum detecta e bloqueia execução |
| Dados órfãos | Health check diário detecta e alerta |
| Duplicidades | Health check detecta e-mails/placas/números duplicados |
| Banco fora do ar | Health check de conectividade com latência |
| Pool de conexões esgotado | Health check monitora uso do pool |
| Backup corrompido | verifyBackup() compara checksum antes de restaurar |

---

## 7. Variáveis de Ambiente Necessárias

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
BACKUP_INTERVAL_HOURS=24    # padrão: 24h
NODE_ENV=production
```
