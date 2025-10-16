# 🚀 Guia Completo - Servidor VPS + Docker + Automação API Hostinger

## 📋 Visão Geral

Este guia explica como configurar e executar os sistemas **CRM Lunas Digital** e **INSS Simulador** em um servidor VPS usando Docker, com **automação completa via API Hostinger**.

### 🎯 Sistemas Incluídos
- **CRM Lunas Digital**: Sistema de gestão de clientes e propostas
- **INSS Simulador**: Simulador de empréstimos consignados
- **Integração WhatsApp**: Via API Kentro
- **Nginx**: Proxy reverso e SSL
- **🤖 Automação Completa**: Controle total do VPS via API Hostinger

### ✨ Novidades - Automação Completa
- 🖥️ **Controle VPS**: Status, backup, reinicialização via API Hostinger
- 🐳 **Gerenciamento Docker**: Containers automatizados
- 🚀 **Deploy Automático**: Deploy completo com um comando
- 💾 **Backup Inteligente**: Backup do VPS + Docker + Configurações
- 📊 **Monitoramento**: Tempo real com alertas automáticos

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cliente Web   │───▶│      Nginx      │───▶│   Docker Apps   │
│                 │    │   (Porta 80/443)│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   SSL/HTTPS     │
                       │   Certificados  │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  🤖 AUTOMAÇÃO    │
                       │  API Hostinger  │
                       │  + Docker       │
                       └─────────────────┘
```

## 📁 Estrutura de Pastas

```
VPS-DOCKER-DEPLOY/
├── README.md                           # Este arquivo
├── AUTOMATION-README.md                # Guia da automação completa
├── DEPLOY-RAPIDO.md                    # Deploy em 5 minutos
├── CONFIGURACAO-VPS.md                 # Configuração do VPS
├── ESTRUTURA-PASTA.md                  # Estrutura detalhada
├── hostinger-docker-automation.js      # 🤖 Classe principal de automação
├── vps-docker-automation.sh           # 🤖 Script interativo completo
├── server-integration.js              # 🤖 Integração com server.js
├── automation-config.env              # 🤖 Configurações da automação
├── package-vps-automation.json        # 🤖 Dependências Node.js
├── scripts/
│   ├── deploy-completo.sh             # Script de deploy completo
│   ├── deploy-crm.sh                  # Deploy apenas CRM
│   ├── deploy-inss.sh                 # Deploy apenas INSS
│   ├── backup-sistema.sh              # Backup do sistema
│   ├── restore-sistema.sh             # Restore do sistema
│   └── monitor-sistema.sh             # Monitoramento
├── configs/
│   ├── docker-compose.yml             # Docker Compose principal
│   ├── nginx.conf                     # Configuração Nginx
│   ├── nginx-ssl.conf                 # Nginx com SSL
│   └── env-example.txt                # Variáveis de ambiente
└── docs/
    └── arquitetura.md                 # Arquitetura detalhada
```

## 🤖 Automação Completa - NOVIDADE!

### **Controle Total do VPS via API Hostinger**

Agora você pode controlar seu VPS completamente via API! 🎯

#### **🚀 Deploy Automático**
```bash
# Deploy completo com um comando
./VPS-DOCKER-DEPLOY/vps-docker-automation.sh
# Escolher: 3 → 1 (Deploy completo)

# Ou via API
curl -X POST http://localhost:3002/api/system/deploy \
  -H "Authorization: Bearer seu_token"
```

#### **💾 Backup Inteligente**
```bash
# Backup completo (VPS + Docker + Configurações)
./VPS-DOCKER-DEPLOY/vps-docker-automation.sh
# Escolher: 3 → 2 (Backup completo)

# Ou via API
curl -X POST http://localhost:3002/api/system/backup
```

#### **📊 Monitoramento em Tempo Real**
```bash
# Monitoramento contínuo
./VPS-DOCKER-DEPLOY/vps-docker-automation.sh
# Escolher: 4 → 3 (Monitoramento contínuo)

# Status completo
curl http://localhost:3002/api/system/status
```

#### **🖥️ Controle do VPS**
```bash
# Status do VPS via API Hostinger
curl http://localhost:3002/api/vps/status

# Backup do VPS
curl -X POST http://localhost:3002/api/vps/backup

# Reiniciar VPS
curl -X POST http://localhost:3002/api/vps/restart \
  -H "Authorization: Bearer seu_token"
```

### **Menu Interativo Completo**
```
🚀 === AUTOMAÇÃO COMPLETA VPS + DOCKER ===

Escolha uma categoria:
1) 🖥️  Gerenciamento VPS (API Hostinger)
2) 🐳 Gerenciamento Docker
3) 🚀 Deploy e Backup
4) 📊 Monitoramento
5) 🔧 Manutenção
6) 📋 Status Completo
7) ❓ Ajuda
8) 🚪 Sair
```

### **Integração com server.js**
```javascript
// Adicionar ao seu server.js
import './VPS-DOCKER-DEPLOY/server-integration.js';

// Agora você tem todas as rotas disponíveis:
// GET  /api/system/status     - Status completo
// POST /api/system/deploy     - Deploy completo
// POST /api/system/backup     - Backup completo
// GET  /api/docker/status     - Status Docker
// POST /api/vps/restart       - Reiniciar VPS
// E muito mais!
```

---

## 🚀 Deploy Rápido (5 minutos)

### **1. Preparar VPS**
```bash
# Conectar ao VPS
ssh root@seu-vps.com

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose -y
```

### **2. Clonar Repositórios**
```bash
# CRM
git clone https://github.com/lunasdigital/crm-lunasdigital.git
cd crm-lunasdigital

# INSS
git clone https://github.com/lunasdigital/inss-simulador.git
cd ../inss-simulador
```

### **3. Configurar Variáveis**
```bash
# CRM
cp env-example.txt .env
nano .env  # Editar configurações

# INSS
cp env-example.txt .env
nano .env  # Editar configurações
```

### **4. Deploy**
```bash
# CRM
./deploy.sh

# INSS
./deploy.sh
```

### **5. Configurar Nginx**
```bash
# Copiar configuração
cp nginx-unificado.conf /etc/nginx/sites-available/lunasdigital
ln -s /etc/nginx/sites-available/lunasdigital /etc/nginx/sites-enabled/

# Testar e reiniciar
nginx -t
systemctl restart nginx
```

## 🔧 Configuração Detalhada

### **Requisitos do VPS**
- **CPU**: 2 cores mínimo
- **RAM**: 4GB mínimo
- **Disco**: 20GB mínimo
- **OS**: Ubuntu 20.04+ ou Debian 10+
- **Rede**: IP público com portas 80/443 abertas

### **Portas Utilizadas**
- **80**: HTTP (redireciona para HTTPS)
- **443**: HTTPS (SSL)
- **3001**: CRM (interno)
- **3002**: INSS (interno)
- **5432**: PostgreSQL (interno)

### **Domínios Configurados**
- **CRM**: `crm.lunasdigital.com.br`
- **INSS**: `inss.lunasdigital.com.br`
- **API**: `api.lunasdigital.com.br`

## 🐳 Docker Containers

### **Containers Principais**
```yaml
services:
  crm:
    build: ./CRM-INTEGRACAO
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    
  inss:
    build: ./INSS-INTEGRACAO
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./configs/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

## 🌐 Configuração de Domínios

### **DNS Records**
```
A    crm.lunasdigital.com.br    → IP_DO_VPS
A    inss.lunasdigital.com.br   → IP_DO_VPS
A    api.lunasdigital.com.br    → IP_DO_VPS
CNAME www.lunasdigital.com.br   → lunasdigital.com.br
```

### **Nginx Virtual Hosts**
```nginx
server {
    listen 80;
    server_name crm.lunasdigital.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name crm.lunasdigital.com.br;
    
    ssl_certificate /etc/nginx/ssl/crm.lunasdigital.com.br.crt;
    ssl_certificate_key /etc/nginx/ssl/crm.lunasdigital.com.br.key;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔒 SSL/HTTPS

### **Certificados Let's Encrypt**
```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Gerar certificados
certbot --nginx -d crm.lunasdigital.com.br
certbot --nginx -d inss.lunasdigital.com.br
certbot --nginx -d api.lunasdigital.com.br

# Renovação automática
crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoramento

### **Logs do Sistema**
```bash
# Logs Docker
docker logs crm-container
docker logs inss-container

# Logs Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs do Sistema
journalctl -u nginx -f
```

### **Status dos Containers**
```bash
# Status geral
docker ps

# Status específico
docker stats crm-container
docker stats inss-container
```

## 💾 Backup e Restore

### **Backup Automático**
```bash
# Script de backup
./scripts/backup-sistema.sh

# Backup manual
docker exec crm-container pg_dump -U postgres crm_db > backup_crm.sql
docker exec inss-container pg_dump -U postgres inss_db > backup_inss.sql
```

### **Restore**
```bash
# Restore completo
./scripts/restore-sistema.sh

# Restore específico
docker exec -i crm-container psql -U postgres crm_db < backup_crm.sql
```

## 🚨 Troubleshooting

### **Problemas Comuns**

#### **502 Bad Gateway**
```bash
# Verificar containers
docker ps

# Verificar logs
docker logs crm-container
docker logs inss-container

# Reiniciar containers
docker restart crm-container
docker restart inss-container
```

#### **SSL não funciona**
```bash
# Verificar certificados
openssl x509 -in /etc/nginx/ssl/crm.lunasdigital.com.br.crt -text -noout

# Testar SSL
curl -I https://crm.lunasdigital.com.br
```

#### **Domínio não resolve**
```bash
# Testar DNS
nslookup crm.lunasdigital.com.br
dig crm.lunasdigital.com.br

# Verificar configuração Nginx
nginx -t
```

## 📈 Performance e Otimização

### **Otimizações Nginx**
```nginx
# Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Cache estático
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### **Otimizações Docker**
```yaml
# Limite de recursos
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
      cpus: '0.25'
```

## 🔐 Segurança

### **Firewall**
```bash
# Configurar UFW
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### **SSL/TLS**
```bash
# Configurações SSL seguras
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
```

## 📞 Suporte

### **Contatos**
- **Email**: suporte@lunasdigital.com.br
- **WhatsApp**: +55 11 95908-8554
- **GitHub**: https://github.com/lunasdigital

### **Documentação Adicional**
- [🤖 Automação Completa](AUTOMATION-README.md) - Guia da automação VPS + Docker
- [⚡ Deploy Rápido](DEPLOY-RAPIDO.md) - Deploy em 5 minutos
- [🖥️ Configuração VPS](CONFIGURACAO-VPS.md) - Configuração detalhada do VPS
- [📁 Estrutura](ESTRUTURA-PASTA.md) - Estrutura detalhada dos arquivos
- [🏗️ Arquitetura](docs/arquitetura.md) - Arquitetura detalhada do sistema

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025  
**Status**: Pronto para produção ✅
