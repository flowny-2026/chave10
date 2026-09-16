# Sistema de Backup Automático

Este documento descreve o sistema de backup automático do banco de dados PostgreSQL.

## 📋 Funcionalidades

- ✅ Backup automático agendado (padrão: a cada 24 horas)
- ✅ Backup manual via API ou script npm
- ✅ Limpeza automática de backups antigos (mantém últimos 30)
- ✅ Listagem de backups disponíveis
- ✅ Restauração de backups
- ✅ Logs detalhados de operações

## ⚙️ Configuração

### Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# URL de conexão do PostgreSQL
DATABASE_URL=postgresql://usuario:senha@localhost:5432/chave10

# Intervalo entre backups automáticos (em horas)
BACKUP_INTERVAL_HOURS=24
```

### Requisitos

- PostgreSQL instalado com `pg_dump` e `psql` disponíveis no PATH
- Permissões de escrita na pasta `backend/backups/`

## 🚀 Uso

### Backup Automático

O backup automático é iniciado quando o servidor sobe e executa:
- Imediatamente ao iniciar
- A cada intervalo configurado (padrão: 24 horas)

### Backup Manual

#### Via Script NPM

```bash
cd chave10-novo/backend
npm run backup
```

#### Via API

**Criar Backup:**
```bash
POST /api/backup/create
Authorization: Bearer <token_master_admin>
```

**Listar Backups:**
```bash
GET /api/backup/list
Authorization: Bearer <token_master_admin>
```

**Restaurar Backup:**
```bash
POST /api/backup/restore
Authorization: Bearer <token_master_admin>
Content-Type: application/json

{
  "backupFileName": "backup_2026-05-08T10-30-00.sql"
}
```

## 📁 Estrutura de Arquivos

```
backend/
├── backups/                          # Pasta de backups (não versionada)
│   ├── backup_2026-05-08T10-30-00.sql
│   ├── backup_2026-05-07T10-30-00.sql
│   └── ...
├── src/
│   ├── utils/
│   │   └── backup.js                 # Módulo de backup
│   └── routes/
│       └── backup.js                 # Rotas de API
└── BACKUP_README.md                  # Esta documentação
```

## 🔒 Segurança

- ⚠️ Apenas usuários com perfil `master_admin` podem gerenciar backups
- ⚠️ A pasta `backups/` está no `.gitignore` para não versionar dados sensíveis
- ⚠️ Backups contêm dados completos do banco, incluindo senhas hash

## 📊 Logs

O sistema registra todas as operações:

```
✅ Backup realizado com sucesso: backup_2026-05-08T10-30-00.sql (2.45 MB)
🗑️  Backup antigo removido: backup_2026-04-08T10-30-00.sql
⏰ Backup automático agendado a cada 24 horas
```

## 🛠️ Manutenção

### Alterar Intervalo de Backup

Edite `.env`:
```env
BACKUP_INTERVAL_HOURS=12  # Backup a cada 12 horas
```

### Alterar Quantidade de Backups Mantidos

Edite `src/utils/backup.js`:
```javascript
const MAX_BACKUPS = 30; // Altere este valor
```

### Backup Manual em Produção

Para ambientes de produção (Heroku, Railway, etc.), configure um cron job ou scheduled task:

**Heroku:**
```bash
heroku addons:create scheduler:standard
heroku addons:open scheduler
# Adicione: cd backend && npm run backup
```

**Railway:**
Use o Railway Cron ou configure via código.

## 🔄 Restauração de Backup

### Via API (Recomendado)

Use a rota POST `/api/backup/restore` com o nome do arquivo.

### Manual

```bash
# Liste os backups disponíveis
ls backend/backups/

# Restaure um backup específico
psql "postgresql://usuario:senha@localhost:5432/chave10" < backend/backups/backup_2026-05-08T10-30-00.sql
```

## ⚠️ Avisos Importantes

1. **Restauração sobrescreve dados**: A restauração substitui completamente o banco atual
2. **Teste backups regularmente**: Verifique se os backups podem ser restaurados
3. **Armazenamento externo**: Para produção, considere enviar backups para S3, Google Cloud Storage, etc.
4. **Monitoramento**: Configure alertas se backups falharem

## 🐛 Troubleshooting

### Erro: "pg_dump: command not found"

Instale o PostgreSQL client ou adicione ao PATH:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql

# Windows
# Adicione C:\Program Files\PostgreSQL\XX\bin ao PATH
```

### Erro: "DATABASE_URL não configurada"

Verifique se a variável está no `.env`:
```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/chave10
```

### Backups não estão sendo criados

Verifique os logs do servidor e permissões da pasta `backups/`.

## 📞 Suporte

Para problemas ou dúvidas, consulte a documentação do PostgreSQL ou abra uma issue no repositório.
