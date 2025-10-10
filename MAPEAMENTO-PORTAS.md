# 🚀 MAPA COMPLETO DE PORTAS - SISTEMA LUNAS

## 📋 Resumo Geral das Portas

| Porta | Sistema | Container Docker | Descrição | Status |
|-------|---------|------------------|-----------|--------|
| `3000` | **Servidor Principal** | `servidor-principal` | API principal + Simulador | ✅ Ativo |
| `3001` | **CRM Operacional** | `crm` | Sistema CRM e operacional | ✅ Ativo |
| `3002` | **INSS Simulador** | `api-simulador` | Simulador INSS + API | ✅ Ativo |
| `3003` | **Base de Dados** | `base-dados` | Clientes + Propostas | ✅ Ativo |
| `80` | **Nginx HTTP** | `nginx` | Load Balancer + Proxy | ✅ Ativo |
| `443` | **Nginx HTTPS** | `nginx` | Load Balancer + Proxy SSL | ✅ Ativo |

## 🎯 Detalhes por Sistema

### 1. Servidor Principal (3000)
- **Arquivo**: `server.js`
- **Função**: API principal do sistema
- **Endpoints**: `/api/health`, `/api/extrato`, `/api/simulador`
- **URL**: http://72.60.159.149:3000/

### 2. CRM Operacional (3001)
- **Arquivo**: `operacional/server.js`
- **Função**: Sistema CRM e operacional
- **Endpoints**: `/api/clientes`, `/api/kentro/*`
- **URL**: http://72.60.159.149:3001/

### 3. INSS Simulador (3002)
- **Arquivo**: `INSS/server-inss.js`
- **Função**: Simulador INSS + API
- **Endpoints**: `/api/processar-extrato`, `/api/kentro/*`
- **URL**: http://72.60.159.149:3002/inss/simulador.html

### 4. Base de Dados (3003)
- **Arquivo**: `database/server.js`
- **Função**: Armazenamento de clientes e propostas
- **Endpoints**: `/api/clientes`, `/api/propostas`
- **URL**: http://72.60.159.149:3003/

### 5. Nginx (80/443)
- **Arquivo**: `nginx/nginx.conf`
- **Função**: Load balancer e proxy reverso
- **Endpoints**: Proxy para todos os serviços
- **URL**: http://72.60.159.149/ (HTTP) | https://72.60.159.149/ (HTTPS)

## 🔧 Comandos de Gerenciamento

### Verificar Status de Todos os Serviços
```bash
# Verificar containers Docker
docker ps

# Verificar portas em uso
netstat -tlnp | grep -E ":(3000|3001|3002|3003|80|443)"

# Verificar processos Node.js
ps aux | grep node
```

### Reiniciar Serviços
```bash
# Reiniciar todos os containers
docker-compose restart

# Reiniciar serviço específico
docker restart servidor-principal-lunasdigital
docker restart crm-lunasdigital
docker restart api-simulador-lunasdigital
docker restart base-dados-lunasdigital
docker restart nginx-lunasdigital
```

### Logs dos Serviços
```bash
# Logs de todos os containers
docker-compose logs -f

# Logs de serviço específico
docker logs servidor-principal-lunasdigital
docker logs crm-lunasdigital
docker logs api-simulador-lunasdigital
docker logs base-dados-lunasdigital
docker logs nginx-lunasdigital
```

## ⚠️ REGRAS IMPORTANTES

### ❌ NÃO FAZER
- **NÃO** pare containers Docker sem necessidade
- **NÃO** altere portas sem atualizar docker-compose.yml
- **NÃO** inicie serviços na mesma porta
- **NÃO** modifique configurações sem documentar

### ✅ SEMPRE FAZER
- **SEMPRE** verificar se a porta está livre antes de iniciar
- **SEMPRE** documentar mudanças de porta
- **SEMPRE** testar após mudanças
- **SEMPRE** fazer backup antes de alterações

## 🚨 Troubleshooting

### Porta em Uso
```bash
# Encontrar processo usando a porta
lsof -i :3002

# Matar processo específico
kill -9 PID

# Liberar porta
pkill -f "server-inss.js"
```

### Container Não Inicia
```bash
# Verificar logs do container
docker logs container-name

# Verificar configuração
docker-compose config

# Reconstruir container
docker-compose up --build container-name
```

## 📁 Estrutura de Arquivos

```
API Lunas/
├── server.js                    # Servidor Principal (3000)
├── operacional/
│   ├── server.js               # CRM Operacional (3001)
│   └── PORTAS-SISTEMA.md
├── INSS/
│   ├── server-inss.js          # INSS Simulador (3002)
│   └── PORTAS-SISTEMA.md
├── database/
│   └── server.js               # Base de Dados (3003)
├── nginx/
│   └── nginx.conf              # Nginx (80/443)
├── docker-compose.yml          # Configuração Docker
└── PORTAS-SISTEMA.md           # Este arquivo
```

## 🌐 URLs de Acesso

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Servidor Principal** | http://72.60.159.149:3000/ | API principal |
| **CRM Operacional** | http://72.60.159.149:3001/ | Sistema CRM |
| **INSS Simulador** | http://72.60.159.149:3002/inss/simulador.html | Simulador INSS |
| **Base de Dados** | http://72.60.159.149:3003/ | API de dados |
| **Nginx HTTP** | http://72.60.159.149/ | Proxy HTTP |
| **Nginx HTTPS** | https://72.60.159.149/ | Proxy HTTPS |

---
*Documentação criada em: 03/01/2025*
*Última atualização: 03/01/2025*
*Versão: 1.0*

