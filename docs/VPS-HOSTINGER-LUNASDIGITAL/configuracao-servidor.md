# ⚙️ CONFIGURAÇÃO DO SERVIDOR HOSTINGER

## 📊 **ESPECIFICAÇÕES TÉCNICAS**

### **Hardware:**
- **CPU**: 2 vCPU (4x mais que Render)
- **RAM**: 8GB (16x mais que Render)
- **Storage**: 100GB NVMe SSD (100x mais que Render)
- **Bandwidth**: 8TB/mês

### **Sistema Operacional:**
- **OS**: Ubuntu 22.04.5 LTS
- **Kernel**: 5.15.0-153-generic x86_64
- **Arquitetura**: x86_64

---

## 🔧 **SOFTWARE INSTALADO**

### **Node.js e NPM:**
- **Node.js**: v18.20.8
- **NPM**: 10.8.2
- **PM2**: 6.0.13 (gerenciador de processos)

### **Servidor Web:**
- **Nginx**: 1.18.0-6ubuntu14.7
- **Certbot**: 1.21.0-1build1 (SSL/HTTPS)

### **Ferramentas:**
- **Git**: 1:2.34.1-1ubuntu1.15
- **Curl**: 7.81.0-1ubuntu1.21
- **Htop**: 3.0.5-7build2 (monitor de sistema)

---

## 🌐 **CONFIGURAÇÃO DE REDE**

### **IPs:**
- **IPv4**: 72.60.159.149
- **IPv6**: 2a02:4780:66:b92f::1
- **Hostname**: srv1035582.hstgr.cloud

### **Portas:**
- **80**: HTTP (Nginx)
- **443**: HTTPS (Nginx)
- **3000**: API Node.js (proxy)

---

## 📁 **ESTRUTURA DE DIRETÓRIOS (ATUALIZADA 01/10/2025)**

### **Diretório Principal:**
- **Projeto**: `/root/api-lunas/`
- **Aplicação**: `/root/api-lunas/API Lunas/`
- **Package.json**: `/root/api-lunas/API Lunas/package.json`
- **Server.js**: `/root/api-lunas/API Lunas/server.js`

### **Diretórios de Dados:**
- **Cache**: `/var/data/cache/`
- **Uploads**: `/var/data/uploads/`
- **Logs**: `/var/data/logs/`
- **Config**: `/var/data/config/`

### **Configurações:**
- **PM2**: `/root/api-lunas/API Lunas/ecosystem.config.cjs`
- **Nginx**: `/etc/nginx/sites-available/api-extrato`
- **SSH**: `C:\Users\srcor\.ssh\id_ed25519` (local)

---

## 🔑 **CONFIGURAÇÃO SSH ATUALIZADA**

### **Chave SSH Atual:**
- **Tipo**: ED25519 (mais segura)
- **Email**: srcor@hotmail.com
- **Localização**: `C:\Users\srcor\.ssh\id_ed25519`
- **Configurada em**: 01/10/2025
- **Status**: ✅ Funcionando

### **GitHub Actions:**
- **Workflow**: `.github/workflows/deploy-vps.yml`
- **Secret**: `VPS_SSH_KEY` (chave privada ED25519)
- **Status**: ✅ Configurado e funcionando

---

## 📁 **ESTRUTURA DE DIRETÓRIOS**

