# ⚡ Deploy Rápido - 5 Minutos

## 🎯 Objetivo
Configurar e executar os sistemas CRM e INSS em um VPS em menos de 5 minutos.

## 📋 Pré-requisitos
- ✅ VPS com Ubuntu 20.04+ ou Debian 10+
- ✅ Acesso root ou sudo
- ✅ Domínios configurados no DNS
- ✅ Portas 80/443 abertas

## 🚀 Passo a Passo

### **1. Conectar ao VPS (30 segundos)**
```bash
ssh root@seu-vps.com
# ou
ssh usuario@seu-vps.com
```

### **2. Instalar Docker (1 minuto)**
```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose -y

# Verificar instalação
docker --version
docker-compose --version
```

### **3. Clonar Repositórios (1 minuto)**
```bash
# Criar diretório
mkdir -p /opt/lunasdigital
cd /opt/lunasdigital

# Clonar CRM
git clone https://github.com/lunasdigital/crm-lunasdigital.git
cd crm-lunasdigital

# Clonar INSS
cd ..
git clone https://github.com/lunasdigital/inss-simulador.git
cd inss-simulador
```

### **4. Configurar Variáveis (1 minuto)**
```bash
# CRM
cd /opt/lunasdigital/crm-lunasdigital
cp env-example.txt .env
nano .env

# Configurações mínimas necessárias:
# NODE_ENV=production
# PORT=3001
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=crm_db
# DB_USER=postgres
# DB_PASS=sua_senha_segura

# INSS
cd /opt/lunasdigital/inss-simulador
cp env-example.txt .env
nano .env

# Configurações mínimas necessárias:
# NODE_ENV=production
# PORT=3002
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=inss_db
# DB_USER=postgres
# DB_PASS=sua_senha_segura
```

### **5. Deploy dos Sistemas (2 minutos)**
```bash
# CRM
cd /opt/lunasdigital/crm-lunasdigital
chmod +x deploy.sh
./deploy.sh

# INSS
cd /opt/lunasdigital/inss-simulador
chmod +x deploy.sh
./deploy.sh
```

### **6. Configurar Nginx (1 minuto)**
```bash
# Instalar Nginx
apt install nginx -y

# Copiar configuração unificada
cp /opt/lunasdigital/crm-lunasdigital/nginx-unificado.conf /etc/nginx/sites-available/lunasdigital

# Habilitar site
ln -s /etc/nginx/sites-available/lunasdigital /etc/nginx/sites-enabled/

# Remover site padrão
rm /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx
```

## ✅ Verificação Final

### **Testar Sistemas**
```bash
# Verificar containers
docker ps

# Testar CRM
curl http://localhost:3001

# Testar INSS
curl http://localhost:3002

# Testar Nginx
curl http://localhost
```

### **Acessar URLs**
- **CRM**: http://crm.lunasdigital.com.br
- **INSS**: http://inss.lunasdigital.com.br
- **API**: http://api.lunasdigital.com.br

## 🔒 Configurar SSL (Opcional - 2 minutos extras)

### **Instalar Certbot**
```bash
apt install certbot python3-certbot-nginx -y
```

### **Gerar Certificados**
```bash
# CRM
certbot --nginx -d crm.lunasdigital.com.br

# INSS
certbot --nginx -d inss.lunasdigital.com.br

# API
certbot --nginx -d api.lunasdigital.com.br
```

### **Configurar Renovação Automática**
```bash
crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚨 Troubleshooting Rápido

### **Problema: Containers não iniciam**
```bash
# Verificar logs
docker logs crm-container
docker logs inss-container

# Reiniciar containers
docker restart crm-container
docker restart inss-container
```

### **Problema: Nginx não funciona**
```bash
# Verificar configuração
nginx -t

# Verificar logs
tail -f /var/log/nginx/error.log

# Reiniciar Nginx
systemctl restart nginx
```

### **Problema: Domínio não resolve**
```bash
# Verificar DNS
nslookup crm.lunasdigital.com.br

# Verificar configuração Nginx
cat /etc/nginx/sites-available/lunasdigital
```

## 📊 Status do Sistema

### **Comandos Úteis**
```bash
# Status geral
docker ps
systemctl status nginx

# Logs em tempo real
docker logs -f crm-container
docker logs -f inss-container
tail -f /var/log/nginx/access.log

# Uso de recursos
docker stats
htop
```

### **URLs de Acesso**
- **CRM**: https://crm.lunasdigital.com.br
- **INSS**: https://inss.lunasdigital.com.br
- **API**: https://api.lunasdigital.com.br

## 🎉 Deploy Concluído!

Seu sistema está rodando! 🚀

### **Próximos Passos**
1. **Configurar SSL** (se ainda não fez)
2. **Configurar backup automático**
3. **Configurar monitoramento**
4. **Testar todas as funcionalidades**

### **Suporte**
- **Email**: suporte@lunasdigital.com.br
- **WhatsApp**: +55 11 95908-8554
- **GitHub**: https://github.com/lunasdigital

---

**Tempo total**: 5 minutos ⏱️  
**Status**: Pronto para produção ✅
