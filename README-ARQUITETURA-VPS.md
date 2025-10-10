# 🏗️ Arquitetura VPS Reestruturada - Lunas Digital

## 📋 Visão Geral

A arquitetura foi reestruturada para usar containers Docker com separação de responsabilidades por porta:

| Porta | Serviço | Descrição | Container |
|-------|---------|-----------|-----------|
| **3000** | Servidor Principal | API principal + Simulador | `servidor-principal` |
| **3001** | CRM | Sistema operacional | `crm` |
| **3002** | API + Simulador | API e simulador HTML | `api-simulador` |
| **3003** | Base de Dados | Clientes e propostas | `base-dados` |
| **80** | Nginx | Load balancer e proxy | `nginx` |

## 🐳 Containers Docker

### 1. Servidor Principal (Porta 3000)
- **Arquivo**: `Dockerfile.servidor`
- **Função**: API principal com todas as funcionalidades
- **Dependências**: Base de dados (porta 3003)

### 2. CRM (Porta 3001)
- **Arquivo**: `Dockerfile.crm`
- **Função**: Sistema operacional (CRM)
- **Dependências**: Base de dados (porta 3003)

### 3. API + Simulador (Porta 3002)
- **Arquivo**: `Dockerfile.api`
- **Função**: API e simulador HTML
- **Dependências**: Base de dados (porta 3003)

### 4. Base de Dados (Porta 3003)
- **Arquivo**: `Dockerfile.database`
- **Função**: Gerenciamento de clientes e propostas
- **Dados**: Armazenados em `var/data/`

### 5. Nginx (Porta 80)
- **Função**: Load balancer e proxy reverso
- **Configuração**: `nginx/nginx.conf`

## 🔧 Configuração do Nginx

### Roteamento:
- `/` → Servidor Principal (3000)
- `/operacional/` → CRM (3001)
- `/api/` → API Simulador (3002)
- `/simulador` → API Simulador (3002)
- `/inss/` → API Simulador (3002)
- `/db/` → Base de Dados (3003)

### Recursos:
- Rate limiting
- Gzip compression
- Security headers
- Health checks
- Load balancing

## 📦 Estrutura de Dados

### Backup:
```
backup-data/
├── clientes/
│   ├── 1.json
│   ├── 2.json
│   └── ...
└── propostas/
    ├── proposta_xxx.json
    └── ...
```

### Dados Ativos:
```
var/data/
├── clientes/
├── propostas/
├── extratos/
├── uploads/
└── tenants/
```

## 🚀 Deploy

### Windows (PowerShell):
```powershell
.\deploy-vps-restructured.ps1
```

### Linux/Mac (Bash):
```bash
./deploy-vps-restructured.sh
```

### Manual:
```bash
# Construir imagens
docker-compose build --no-cache

# Iniciar serviços
docker-compose up -d

# Migrar dados
curl -X POST http://localhost:3003/api/migrate-backup
```

## 🔍 Verificação de Saúde

### URLs de Health Check:
- Servidor Principal: `http://localhost:3000/health`
- CRM: `http://localhost:3001/health`
- API Simulador: `http://localhost:3002/health`
- Base de Dados: `http://localhost:3003/health`
- Nginx: `http://localhost/health`

### Comandos Docker:
```bash
# Status dos containers
docker-compose ps

# Logs de um serviço
docker-compose logs servidor-principal

# Reiniciar um serviço
docker-compose restart crm
```

## 📱 URLs de Acesso

### Produção:
- **Principal**: `https://lunasdigital.com.br`
- **CRM**: `https://lunasdigital.com.br/operacional`
- **Simulador**: `https://lunasdigital.com.br/simulador`

### Desenvolvimento:
- **Principal**: `http://localhost`
- **CRM**: `http://localhost/operacional`
- **Simulador**: `http://localhost/simulador`
- **Base de Dados**: `http://localhost:3003`

## 🔄 Migração de Dados

Os dados são automaticamente migrados do diretório `backup-data/` para a base de dados ativa durante o deploy.

### Migração Manual:
```bash
curl -X POST http://localhost:3003/api/migrate-backup
```

## 🛠️ Desenvolvimento

### Adicionar Novo Serviço:
1. Criar `Dockerfile.novo-servico`
2. Adicionar serviço no `docker-compose.yml`
3. Configurar roteamento no `nginx/nginx.conf`
4. Atualizar scripts de deploy

### Modificar Configuração:
1. Editar arquivos de configuração
2. Reconstruir containers: `docker-compose build`
3. Reiniciar serviços: `docker-compose restart`

## 📊 Monitoramento

### Logs:
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f base-dados
```

### Recursos:
```bash
# Uso de recursos
docker stats

# Espaço em disco
docker system df
```

## 🔒 Segurança

### Headers de Segurança:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Rate Limiting:
- API: 10 req/s
- Static: 30 req/s

## 🆘 Troubleshooting

### Container não inicia:
```bash
docker-compose logs nome-do-container
```

### Dados não aparecem:
```bash
# Verificar migração
curl -X POST http://localhost:3003/api/migrate-backup

# Verificar dados
curl http://localhost:3003/api/clientes
```

### Nginx não roteia:
```bash
# Verificar configuração
docker-compose exec nginx nginx -t

# Recarregar configuração
docker-compose exec nginx nginx -s reload
```

