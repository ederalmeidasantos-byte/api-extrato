# 🖥️ Configuração Completa do VPS

## 📋 Visão Geral

Este guia detalha como configurar um VPS do zero para executar os sistemas CRM e INSS com Docker.

## 🎯 Requisitos do VPS

### **Especificações Mínimas**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Disco**: 20GB SSD
- **Rede**: 1Gbps
- **OS**: Ubuntu 20.04+ ou Debian 10+

### **Especificações Recomendadas**
- **CPU**: 4 cores
- **RAM**: 8GB
- **Disco**: 50GB SSD
- **Rede**: 1Gbps
- **OS**: Ubuntu 22.04 LTS

## 🚀 Configuração Inicial

### **1. Conectar ao VPS**
```bash
# Via SSH
ssh root@seu-vps.com

# Ou com usuário específico
ssh usuario@seu-vps.com
```

### **2. Atualizar Sistema**
```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS/RHEL
yum update -y

# Fedora
dnf update -y
```

### **3. Instalar Pacotes Essenciais**
```bash
# Ubuntu/Debian
apt install -y curl wget git nano htop unzip software-properties-common

# CentOS/RHEL
yum install -y curl wget git nano htop unzip epel-release

# Fedora
dnf install -y curl wget git nano htop unzip
```

## 🐳 Instalação do Docker

### **Método 1: Script Oficial (Recomendado)**
```bash
# Baixar e executar script oficial
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Adicionar usuário ao grupo docker
usermod -aG docker $USER

# Verificar instalação
docker --version
docker run hello-world
```

### **Método 2: Instalação Manual**
```bash
# Ubuntu/Debian
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Adicionar chave GPG
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# CentOS/RHEL
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io
```

### **3. Instalar Docker Compose**
```bash
# Ubuntu/Debian
apt install -y docker-compose

# CentOS/RHEL
yum install -y docker-compose

# Ou via pip
pip install docker-compose
```

## 🌐 Configuração de Rede

### **1. Configurar Firewall**
```bash
# Ubuntu/Debian (UFW)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# CentOS/RHEL (firewalld)
firewall-cmd --permanent --add-port=22/tcp
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload

# Verificar status
ufw status  # Ubuntu
firewall-cmd --list-all  # CentOS
```

### **2. Configurar DNS**
```bash
# Verificar DNS atual
cat /etc/resolv.conf

# Configurar DNS (se necessário)
echo "nameserver 8.8.8.8" >> /etc/resolv.conf
echo "nameserver 8.8.4.4" >> /etc/resolv.conf
```

## 📁 Estrutura de Diretórios

### **Criar Estrutura**
```bash
# Diretório principal
mkdir -p /opt/lunasdigital
cd /opt/lunasdigital

# Subdiretórios
mkdir -p {crm,inss,nginx,ssl,backups,logs}

# Permissões
chown -R $USER:$USER /opt/lunasdigital
chmod -R 755 /opt/lunasdigital
```

### **Estrutura Final**
```
/opt/lunasdigital/
├── crm/                    # Sistema CRM
├── inss/                   # Sistema INSS
├── nginx/                  # Configurações Nginx
├── ssl/                    # Certificados SSL
├── backups/                # Backups do sistema
├── logs/                   # Logs do sistema
└── scripts/                # Scripts de automação
```

## 🔧 Configuração do Sistema

### **1. Configurar Swap (Opcional)**
```bash
# Criar arquivo de swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verificar
swapon --show
```

### **2. Configurar Limites do Sistema**
```bash
# Editar limites
nano /etc/security/limits.conf

# Adicionar linhas:
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
```

### **3. Configurar Timezone**
```bash
# Listar timezones
timedatectl list-timezones

# Configurar timezone
timedatectl set-timezone America/Sao_Paulo

# Verificar
timedatectl status
```

## 🐳 Configuração do Docker

### **1. Configurar Docker Daemon**
```bash
# Criar arquivo de configuração
mkdir -p /etc/docker
nano /etc/docker/daemon.json

# Conteúdo:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}

# Reiniciar Docker
systemctl restart docker
```

### **2. Configurar Docker Compose**
```bash
# Criar arquivo de configuração
nano /etc/docker-compose.yml

# Conteúdo básico:
version: '3.8'
services:
  crm:
    build: ./crm
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
      - ./backups:/app/backups

  inss:
    build: ./inss
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
      - ./backups:/app/backups

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - crm
      - inss
```

## 🌐 Configuração do Nginx

### **1. Instalar Nginx**
```bash
# Ubuntu/Debian
apt install -y nginx

# CentOS/RHEL
yum install -y nginx

# Iniciar e habilitar
systemctl start nginx
systemctl enable nginx
```

### **2. Configurar Nginx**
```bash
# Criar configuração principal
nano /etc/nginx/nginx.conf

# Conteúdo:
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Configurações de performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Incluir sites
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### **3. Configurar Sites**
```bash
# Criar diretório de sites
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Criar configuração do site
nano /etc/nginx/sites-available/lunasdigital

# Conteúdo:
server {
    listen 80;
    server_name crm.lunasdigital.com.br inss.lunasdigital.com.br api.lunasdigital.com.br;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.lunasdigital.com.br;
    
    ssl_certificate /etc/nginx/ssl/crm.lunasdigital.com.br.crt;
    ssl_certificate_key /etc/nginx/ssl/crm.lunasdigital.com.br.key;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name inss.lunasdigital.com.br;
    
    ssl_certificate /etc/nginx/ssl/inss.lunasdigital.com.br.crt;
    ssl_certificate_key /etc/nginx/ssl/inss.lunasdigital.com.br.key;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.lunasdigital.com.br;
    
    ssl_certificate /etc/nginx/ssl/api.lunasdigital.com.br.crt;
    ssl_certificate_key /etc/nginx/ssl/api.lunasdigital.com.br.key;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Habilitar site
ln -s /etc/nginx/sites-available/lunasdigital /etc/nginx/sites-enabled/

# Remover site padrão
rm /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

## 🔒 Configuração de SSL

### **1. Instalar Certbot**
```bash
# Ubuntu/Debian
apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
yum install -y certbot python3-certbot-nginx
```

### **2. Gerar Certificados**
```bash
# CRM
certbot --nginx -d crm.lunasdigital.com.br

# INSS
certbot --nginx -d inss.lunasdigital.com.br

# API
certbot --nginx -d api.lunasdigital.com.br
```

### **3. Configurar Renovação Automática**
```bash
# Adicionar ao crontab
crontab -e

# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoramento e Logs

### **1. Configurar Logrotate**
```bash
# Criar configuração para logs do Docker
nano /etc/logrotate.d/docker

# Conteúdo:
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
```

### **2. Configurar Monitoramento**
```bash
# Instalar htop e iotop
apt install -y htop iotop

# Criar script de monitoramento
nano /opt/lunasdigital/scripts/monitor.sh

# Conteúdo:
#!/bin/bash
echo "=== Status do Sistema ==="
echo "Data: $(date)"
echo "Uptime: $(uptime)"
echo ""

echo "=== Containers Docker ==="
docker ps
echo ""

echo "=== Uso de Memória ==="
free -h
echo ""

echo "=== Uso de Disco ==="
df -h
echo ""

echo "=== Logs de Erro Recentes ==="
tail -n 10 /var/log/nginx/error.log
echo ""

# Tornar executável
chmod +x /opt/lunasdigital/scripts/monitor.sh
```

## 🔄 Backup e Restore

### **1. Script de Backup**
```bash
# Criar script de backup
nano /opt/lunasdigital/scripts/backup.sh

# Conteúdo:
#!/bin/bash
BACKUP_DIR="/opt/lunasdigital/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p $BACKUP_DIR/$DATE

# Backup dos containers
docker save crm-container > $BACKUP_DIR/$DATE/crm-container.tar
docker save inss-container > $BACKUP_DIR/$DATE/inss-container.tar

# Backup das configurações
cp -r /etc/nginx $BACKUP_DIR/$DATE/
cp -r /etc/ssl $BACKUP_DIR/$DATE/

# Backup dos dados
docker exec crm-container pg_dump -U postgres crm_db > $BACKUP_DIR/$DATE/crm_db.sql
docker exec inss-container pg_dump -U postgres inss_db > $BACKUP_DIR/$DATE/inss_db.sql

# Compactar backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR $DATE

# Remover diretório temporário
rm -rf $BACKUP_DIR/$DATE

echo "Backup criado: backup_$DATE.tar.gz"

# Tornar executável
chmod +x /opt/lunasdigital/scripts/backup.sh
```

### **2. Script de Restore**
```bash
# Criar script de restore
nano /opt/lunasdigital/scripts/restore.sh

# Conteúdo:
#!/bin/bash
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Uso: $0 <arquivo_backup.tar.gz>"
    exit 1
fi

# Extrair backup
tar -xzf $BACKUP_FILE

# Restaurar containers
docker load < crm-container.tar
docker load < inss-container.tar

# Restaurar configurações
cp -r nginx /etc/
cp -r ssl /etc/

# Restaurar dados
docker exec -i crm-container psql -U postgres crm_db < crm_db.sql
docker exec -i inss-container psql -U postgres inss_db < inss_db.sql

echo "Restore concluído!"

# Tornar executável
chmod +x /opt/lunasdigital/scripts/restore.sh
```

## ✅ Verificação Final

### **1. Testar Sistema**
```bash
# Verificar containers
docker ps

# Testar URLs
curl http://localhost:3001  # CRM
curl http://localhost:3002  # INSS
curl http://localhost       # Nginx

# Verificar logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **2. Configurar Inicialização Automática**
```bash
# Habilitar serviços
systemctl enable docker
systemctl enable nginx

# Verificar status
systemctl status docker
systemctl status nginx
```

## 🎉 VPS Configurado!

Seu VPS está pronto para executar os sistemas CRM e INSS! 🚀

### **Próximos Passos**
1. **Clonar repositórios**
2. **Configurar variáveis de ambiente**
3. **Executar deploy**
4. **Testar funcionalidades**

### **Comandos Úteis**
```bash
# Status geral
systemctl status docker nginx
docker ps
nginx -t

# Logs
journalctl -u docker -f
journalctl -u nginx -f
docker logs -f crm-container

# Backup
/opt/lunasdigital/scripts/backup.sh

# Monitoramento
/opt/lunasdigital/scripts/monitor.sh
```

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025  
**Status**: Pronto para produção ✅
