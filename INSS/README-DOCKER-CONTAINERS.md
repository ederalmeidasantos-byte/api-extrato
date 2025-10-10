# 🐳 README - CONFIGURAÇÃO CONTAINERS DOCKER

## 🎯 **Visão Geral**

Este documento mapeia todos os containers Docker existentes no sistema Lunas Digital e fornece instruções completas para configuração, gerenciamento e troubleshooting.

**Data**: 03/01/2025  
**Versão**: Estável  
**Ambiente**: Produção

---

## 📋 **MAPEAMENTO COMPLETO DOS CONTAINERS**

### **Containers Ativos Atualmente**

| Container | Porta Externa | Porta Interna | Função | Status | Dockerfile |
|-----------|---------------|---------------|--------|--------|------------|
| `nginx-lunasdigital` | 80, 443 | 80, 443 | Proxy Reverso | ✅ Ativo | `nginx:alpine` |
| `servidor-principal-lunasdigital` | 3000 | 3000 | API Principal | ✅ Ativo | `Dockerfile` |
| `api-simulador-lunasdigital` | 3002 | 3002 | Simulador INSS | ✅ Ativo | `Dockerfile.inss` |
| `base-dados-lunasdigital` | 3003 | 27017 | MongoDB | ✅ Ativo | `mongo:latest` |

### **Containers Disponíveis (Não Ativos)**

| Container | Porta Externa | Porta Interna | Função | Status | Dockerfile |
|-----------|---------------|---------------|--------|--------|------------|
| `crm-lunasdigital` | 3001 | 3001 | Sistema CRM | ⚠️ Disponível | `Dockerfile.crm` |
| `servidor-principal` | 3000 | 3000 | Servidor Principal | ⚠️ Disponível | `Dockerfile.servidor` |
| `api-simulador` | 3002 | 3002 | API Simulador | ⚠️ Disponível | `Dockerfile.api` |
| `base-dados` | 3003 | 3003 | Base de Dados | ⚠️ Disponível | `Dockerfile.database` |

---

## 🏗️ **ARQUITETURA ATUAL**

### **Fluxo de Comunicação**
```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DOCKER                       │
├─────────────────────────────────────────────────────────────┤
│  🌐 nginx-lunasdigital (80/443)                             │
│     ├── lunasdigital.com.br → servidor-principal:3000      │
│     └── inss.lunasdigital.com.br → api-simulador:3002      │
│                                                             │
│  🖥️ servidor-principal-lunasdigital (3000)                 │
│     └── APIs gerais da Lunas Digital                       │
│                                                             │
│  📊 api-simulador-lunasdigital (3002)                      │
│     ├── Simulador HTML INSS                                │
│     ├── API /extrair                                       │
│     ├── API /api/calcular                                  │
│     └── API /detalhesdaproposta                            │
│                                                             │
│  🗄️ base-dados-lunasdigital (3003)                        │
│     └── Banco de dados MongoDB                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 **ESTRUTURA DE ARQUIVOS DOCKER**

### **Dockerfiles Disponíveis**
```
📂 Dockerfiles/
├── 📄 Dockerfile                    # Servidor principal (Node 20)
├── 📄 Dockerfile.inss               # Simulador INSS (Node 18)
├── 📄 Dockerfile.crm                # Sistema CRM (Node 18)
├── 📄 Dockerfile.servidor           # Servidor principal (Node 18)
├── 📄 Dockerfile.api                # API Simulador (Node 18)
├── 📄 Dockerfile.database           # Base de dados (Node 18)
└── 📄 Dockerfile.operacional        # Sistema operacional (Node 18)
```

### **Docker Compose Files**
```
📂 Docker Compose/
├── 📄 docker-compose.yml            # Configuração principal
├── 📄 docker-compose-lunasdigital.yml # Configuração produção
└── 📄 docker-compose.production.yml  # Configuração produção alternativa
```

---

## 🔧 **CONFIGURAÇÃO DETALHADA**

### **1. Nginx Container**
```yaml
nginx-lunasdigital:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro
  depends_on:
    - servidor-principal
    - api-simulador
```

**Função**: Proxy reverso e load balancer  
**Configuração**: `nginx/nginx.conf`  
**SSL**: Certificados Let's Encrypt

### **2. Servidor Principal**
```yaml
servidor-principal-lunasdigital:
  build:
    context: .
    dockerfile: Dockerfile
  ports:
    - "3000:3000"
  environment:
    - NODE_ENV=production
    - PORT=3000
    - DB_SERVICE_URL=http://base-dados:3003
```

**Função**: API principal do sistema  
**Dockerfile**: `Dockerfile` (Node 20)  
**Dependências**: PDF processing libraries

### **3. API Simulador INSS**
```yaml
api-simulador-lunasdigital:
  build:
    context: .
    dockerfile: Dockerfile.inss
  ports:
    - "3002:3002"
  environment:
    - NODE_ENV=production
    - PORT=3002
    - DB_SERVICE_URL=http://base-dados:3003
```

**Função**: Simulador INSS + APIs específicas  
**Dockerfile**: `Dockerfile.inss` (Node 18)  
**Arquivos**: `INSS/server-inss.js`

### **4. Base de Dados**
```yaml
base-dados-lunasdigital:
  image: mongo:latest
  ports:
    - "3003:27017"
  volumes:
    - mongodb_data:/data/db
```

**Função**: Banco de dados MongoDB  
**Dados**: Persistidos em volume Docker

---

## 🚀 **COMANDOS DE GERENCIAMENTO**

### **Verificar Status dos Containers**
```bash
# Listar todos os containers
docker ps -a

# Listar apenas containers ativos
docker ps

# Verificar containers específicos
docker ps | grep lunasdigital
```

### **Gerenciar Containers**
```bash
# Iniciar todos os containers
docker-compose -f docker-compose-lunasdigital.yml up -d

# Parar todos os containers
docker-compose -f docker-compose-lunasdigital.yml down

# Reiniciar container específico
docker restart api-simulador-lunasdigital

# Parar container específico
docker stop api-simulador-lunasdigital

# Iniciar container específico
docker start api-simulador-lunasdigital
```

### **Logs e Monitoramento**
```bash
# Ver logs em tempo real
docker logs api-simulador-lunasdigital --follow

# Ver logs com timestamp
docker logs api-simulador-lunasdigital --timestamps

# Ver logs das últimas 50 linhas
docker logs api-simulador-lunasdigital --tail 50

# Ver logs de todos os containers
docker-compose -f docker-compose-lunasdigital.yml logs
```

### **Inspeção e Debug**
```bash
# Inspecionar container
docker inspect api-simulador-lunasdigital

# Verificar recursos utilizados
docker stats api-simulador-lunasdigital

# Executar comando dentro do container
docker exec -it api-simulador-lunasdigital sh

# Verificar rede Docker
docker network inspect lunas-network
```

---

## 🔧 **CONFIGURAÇÃO DE AMBIENTE**

### **Arquivo de Configuração**
```bash
# Arquivo principal de configuração
config-vps-restructured.env
```

### **Variáveis de Ambiente Críticas**
```bash
# Portas
PORT_SERVIDOR_PRINCIPAL=3000
PORT_CRM=3001
PORT_API_SIMULADOR=3002
PORT_BASE_DADOS=3003

# Ambiente
NODE_ENV=production
DB_SERVICE_URL=http://base-dados:3003

# APIs Externas
OPENAI_API_KEY=sua_chave_openai
KENTRO_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376

# Segurança
JWT_SECRET=lunas_digital_jwt_secret_2025
CORS_ORIGIN=https://lunasdigital.com.br
```

---

## 📦 **VOLUMES E PERSISTÊNCIA**

### **Volumes Configurados**
```yaml
volumes:
  # Dados do MongoDB
  mongodb_data:
    driver: local
  
  # Dados da aplicação
  - ./var/data:/app/var/data
  
  # Configuração Nginx
  - ./nginx/nginx.conf:/etc/nginx/nginx.conf
  
  # Certificados SSL
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

### **Estrutura de Dados**
```
📂 var/data/
├── 📂 extratos/          # Cache de PDFs processados
├── 📂 propostas/         # Propostas salvas
├── 📂 clientes/          # Dados dos clientes
├── 📂 logs/              # Logs da aplicação
└── 📂 backup/            # Backups automáticos
```

---

## 🔍 **TROUBLESHOOTING**

### **Problemas Comuns**

#### **Container não inicia**
```bash
# Verificar logs
docker logs container-name

# Verificar se porta está em uso
netstat -tulpn | grep :3002

# Verificar recursos do sistema
docker system df
```

#### **Container reinicia constantemente**
```bash
# Verificar logs de erro
docker logs container-name --tail 100

# Verificar configuração
docker inspect container-name

# Verificar dependências
docker network inspect lunas-network
```

#### **Problemas de conectividade**
```bash
# Testar conectividade entre containers
docker exec api-simulador-lunasdigital ping base-dados-lunasdigital

# Verificar DNS interno
docker exec api-simulador-lunasdigital nslookup base-dados-lunasdigital
```

### **Comandos de Diagnóstico**
```bash
# Status geral do sistema
docker system info

# Uso de recursos
docker system df

# Limpeza de recursos não utilizados
docker system prune -f

# Verificar imagens
docker images
```

---

## 🚨 **PROCEDIMENTOS DE EMERGÊNCIA**

### **Sistema Completamente Parado**
```bash
#!/bin/bash
echo "=== PROCEDIMENTO DE EMERGÊNCIA DOCKER ==="

# 1. Parar todos os containers
docker-compose -f docker-compose-lunasdigital.yml down

# 2. Limpar containers órfãos
docker container prune -f

# 3. Verificar portas em uso
netstat -tulpn | grep -E ":(80|443|3000|3002|3003)"

# 4. Matar processos se necessário
sudo kill -9 $(lsof -t -i:80) 2>/dev/null
sudo kill -9 $(lsof -t -i:443) 2>/dev/null
sudo kill -9 $(lsof -t -i:3000) 2>/dev/null
sudo kill -9 $(lsof -t -i:3002) 2>/dev/null

# 5. Reiniciar sistema
docker-compose -f docker-compose-lunasdigital.yml up -d

# 6. Aguardar inicialização
sleep 30

# 7. Verificar status
docker ps
```

### **Restauração de Backup**
```bash
#!/bin/bash
echo "=== RESTAURAÇÃO DE BACKUP DOCKER ==="

# 1. Parar containers
docker-compose -f docker-compose-lunasdigital.yml down

# 2. Restaurar volumes
tar -xzf backup/var-data-$(date +%Y%m%d).tar.gz

# 3. Restaurar configurações
cp backup/nginx.conf nginx/
cp backup/docker-compose-lunasdigital.yml .

# 4. Reiniciar sistema
docker-compose -f docker-compose-lunasdigital.yml up -d

# 5. Verificar funcionamento
sleep 30
docker ps
```

---

## 📊 **MONITORAMENTO E MÉTRICAS**

### **Script de Monitoramento**
```bash
#!/bin/bash
# monitor-docker.sh

LOG_FILE="/var/log/docker-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Verificar containers
CONTAINERS=$(docker ps --format "{{.Names}}" | grep lunasdigital)
if [ -z "$CONTAINERS" ]; then
    echo "[$DATE] ERRO: Containers não estão rodando" >> $LOG_FILE
fi

# Verificar recursos
MEMORY_USAGE=$(docker stats --no-stream --format "table {{.MemPerc}}" | grep -v "MEM" | head -1 | sed 's/%//')
if [ "$MEMORY_USAGE" -gt 80 ]; then
    echo "[$DATE] ALERTA: Uso de memória ${MEMORY_USAGE}%" >> $LOG_FILE
fi

# Verificar espaço em disco
DISK_USAGE=$(df /var/lib/docker | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "[$DATE] ALERTA: Espaço em disco ${DISK_USAGE}%" >> $LOG_FILE
fi

echo "[$DATE] Sistema Docker OK" >> $LOG_FILE
```

### **Cron Job para Monitoramento**
```bash
# Adicionar ao crontab
# */5 * * * * /root/monitor-docker.sh
```

---

## 🔒 **SEGURANÇA E BACKUP**

### **Backup Automático**
```bash
#!/bin/bash
# backup-docker.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups/docker"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup dos volumes
docker run --rm -v lunasdigital_mongodb_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/mongodb_$DATE.tar.gz -C /data .

# Backup das configurações
tar czf $BACKUP_DIR/configs_$DATE.tar.gz nginx/ docker-compose-lunasdigital.yml config-vps-restructured.env

# Limpar backups antigos (manter últimos 7 dias)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup Docker concluído: $DATE"
```

### **Políticas de Segurança**
- **Imagens**: Sempre usar versões específicas (não `latest`)
- **Volumes**: Dados sensíveis em volumes nomeados
- **Rede**: Containers isolados em rede específica
- **Logs**: Rotação automática de logs
- **Backup**: Backup diário automático

---

## 📋 **CHECKLIST DE MANUTENÇÃO**

### **Diário**
- [ ] Verificar status dos containers (`docker ps`)
- [ ] Verificar logs de erro (`docker logs`)
- [ ] Verificar uso de recursos (`docker stats`)

### **Semanal**
- [ ] Verificar espaço em disco (`docker system df`)
- [ ] Limpar recursos não utilizados (`docker system prune`)
- [ ] Verificar backups automáticos

### **Mensal**
- [ ] Atualizar imagens base
- [ ] Revisar configurações de segurança
- [ ] Testar procedimentos de emergência

---

## 📚 **RECURSOS ADICIONAIS**

### **Documentação Relacionada**
- `INSS/DOCUMENTACAO-DOCKER-NGINX.md` - Configuração Nginx
- `INSS/DOCUMENTACAO-SISTEMA-INSS.md` - Arquitetura geral
- `INSS/MANUAL-TROUBLESHOOTING.md` - Solução de problemas

### **Comandos Úteis**
```bash
# Verificar saúde dos containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Ver logs de todos os containers
docker-compose logs --tail=50

# Reiniciar apenas containers com problemas
docker-compose restart api-simulador nginx

# Verificar uso de recursos
docker stats --no-stream
```

---

**⚠️ IMPORTANTE: Este documento deve ser consultado antes de qualquer alteração nos containers Docker. Sempre fazer backup antes de modificar configurações.**

**Última atualização**: 03/01/2025
