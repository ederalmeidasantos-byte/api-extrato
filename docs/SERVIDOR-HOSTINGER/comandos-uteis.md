# 🛠️ COMANDOS ÚTEIS - SERVIDOR HOSTINGER

## 📋 **COMANDOS BÁSICOS**

### **🔐 Conectar ao servidor:**
```bash
ssh root@72.60.159.149
# Senha: Lunas@202525
```

### **📁 Navegar no projeto:**
```bash
cd /root/api-extrato
```

---

## 🚀 **COMANDOS PM2**

### **📊 Gerenciar aplicação:**
```bash
# Status da aplicação
pm2 status

# Iniciar aplicação
pm2 start ecosystem.config.cjs

# Parar aplicação
pm2 stop api-extrato

# Reiniciar aplicação
pm2 restart api-extrato

# Recarregar aplicação (sem downtime)
pm2 reload api-extrato

# Deletar aplicação
pm2 delete api-extrato
```

### **📝 Logs:**
```bash
# Ver logs em tempo real
pm2 logs api-extrato

# Ver logs de erro
pm2 logs api-extrato --err

# Ver logs de saída
pm2 logs api-extrato --out

# Ver últimas 50 linhas
pm2 logs api-extrato --lines 50

# Limpar logs
pm2 flush api-extrato
```

### **🔄 Configuração:**
```bash
# Salvar configuração atual
pm2 save

# Restaurar configuração salva
pm2 resurrect

# Configurar para iniciar automaticamente
pm2 startup

# Desabilitar startup automático
pm2 unstartup
```

---

## 🌐 **COMANDOS NGINX**

### **🔄 Gerenciar Nginx:**
```bash
# Status do Nginx
systemctl status nginx

# Iniciar Nginx
systemctl start nginx

# Parar Nginx
systemctl stop nginx

# Reiniciar Nginx
systemctl restart nginx

# Recarregar configuração
systemctl reload nginx

# Habilitar Nginx (iniciar automaticamente)
systemctl enable nginx

# Desabilitar Nginx
systemctl disable nginx
```

### **🔧 Configuração:**
```bash
# Testar configuração
nginx -t

# Ver configuração ativa
nginx -T

# Recarregar configuração
nginx -s reload

# Parar Nginx
nginx -s stop

# Ver logs de erro
tail -f /var/log/nginx/error.log

# Ver logs de acesso
tail -f /var/log/nginx/access.log
```

---

## 📊 **COMANDOS DE MONITORAMENTO**

### **💻 Sistema:**
```bash
# Monitor de sistema
htop

# Informações do sistema
uname -a

# Uso de disco
df -h

# Uso de memória
free -h

# Processos em execução
ps aux

# Processos Node.js
ps aux | grep node

# Uso de CPU
top

# Informações de rede
ip addr show
```

### **📈 Performance:**
```bash
# Uso de CPU por processo
ps aux --sort=-%cpu | head -10

# Uso de memória por processo
ps aux --sort=-%mem | head -10

# Espaço em disco por diretório
du -sh /*

# Arquivos maiores
find / -type f -size +100M 2>/dev/null | head -10
```

---

## 🔍 **COMANDOS DE DIAGNÓSTICO**

### **🌐 Conectividade:**
```bash
# Testar API local
curl http://localhost:3000/api/health

# Testar API externa
curl http://72.60.159.149/api/health

# Testar conectividade
ping google.com

# Verificar portas abertas
netstat -tlnp

# Verificar porta 3000
netstat -tlnp | grep :3000

# Verificar porta 80
netstat -tlnp | grep :80
```

### **📝 Logs:**
```bash
# Logs do sistema
journalctl -f

# Logs do Nginx
tail -f /var/log/nginx/error.log

# Logs da aplicação
tail -f /root/api-extrato/logs/combined.log

# Logs de erro da aplicação
tail -f /root/api-extrato/logs/err.log

# Logs de saída da aplicação
tail -f /root/api-extrato/logs/out.log
```

---

## 🔧 **COMANDOS DE MANUTENÇÃO**

### **📦 Atualizações:**
```bash
# Atualizar lista de pacotes
apt update

# Atualizar sistema
apt upgrade -y

# Atualizar Node.js
npm install -g npm@latest

# Atualizar PM2
npm install -g pm2@latest
```

### **🧹 Limpeza:**
```bash
# Limpar cache do apt
apt clean

# Limpar logs antigos
pm2 flush

# Limpar logs do sistema
journalctl --vacuum-time=7d

# Limpar arquivos temporários
rm -rf /tmp/*
```

---

## 🚀 **COMANDOS DE DEPLOY**

### **📥 Atualizar código:**
```bash
# Entrar na pasta do projeto
cd /root/api-extrato

# Baixar atualizações
git pull origin main

# Instalar dependências
npm install

# Reiniciar aplicação
pm2 restart api-extrato
```

### **🔄 Deploy completo:**
```bash
# Parar aplicação
pm2 stop api-extrato

# Backup do código atual
cp -r /root/api-extrato /root/api-extrato-backup-$(date +%Y%m%d)

# Baixar nova versão
cd /root
rm -rf api-extrato
git clone https://github.com/ederalmeidasantos-byte/api-extrato.git

# Configurar
cd api-extrato
npm install
mkdir -p logs

# Iniciar aplicação
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 🔐 **COMANDOS DE SEGURANÇA**

### **🛡️ Firewall:**
```bash
# Ver status do firewall
ufw status

# Habilitar firewall
ufw enable

# Permitir SSH
ufw allow ssh

# Permitir HTTP
ufw allow 80

# Permitir HTTPS
ufw allow 443

# Bloquear porta
ufw deny 3000
```

### **🔑 SSL/HTTPS:**
```bash
# Instalar certificado SSL
certbot --nginx -d 72.60.159.149 -d srv1035582.hstgr.cloud

# Renovar certificado
certbot renew

# Verificar certificado
certbot certificates
```

---

## 📊 **COMANDOS DE BACKUP**

### **💾 Backup completo:**
```bash
# Criar backup do projeto
tar -czf /var/backups/api-extrato-$(date +%Y%m%d).tar.gz /root/api-extrato

# Criar backup do banco de dados
cp -r /var/data/cache /var/backups/cache-$(date +%Y%m%d)

# Backup do Nginx
cp -r /etc/nginx /var/backups/nginx-$(date +%Y%m%d)
```

### **🔄 Restauração:**
```bash
# Restaurar projeto
tar -xzf /var/backups/api-extrato-YYYYMMDD.tar.gz -C /

# Restaurar cache
cp -r /var/backups/cache-YYYYMMDD /var/data/cache

# Restaurar Nginx
cp -r /var/backups/nginx-YYYYMMDD /etc/nginx
```

---

## 🚨 **COMANDOS DE EMERGÊNCIA**

### **🆘 Problemas críticos:**
```bash
# Reiniciar tudo
pm2 restart all && systemctl restart nginx

# Verificar status
pm2 status && systemctl status nginx

# Ver logs de erro
pm2 logs --err && tail -f /var/log/nginx/error.log

# Reiniciar servidor
reboot
```

### **🔧 Recuperação:**
```bash
# Restaurar configuração PM2
pm2 resurrect

# Restaurar configuração Nginx
systemctl restart nginx

# Verificar conectividade
curl -I http://72.60.159.149/api/health
```

---

## 📞 **COMANDOS DE SUPORTE**

### **📋 Informações do sistema:**
```bash
# Informações completas
uname -a && cat /etc/os-release && free -h && df -h

# Status dos serviços
systemctl status nginx pm2-root

# Versões instaladas
node --version && npm --version && pm2 --version

# Configuração de rede
ip addr show && netstat -tlnp
```

---

**Última atualização**: 29/09/2025
**Versão**: 1.0
**Status**: ✅ Ativo e funcionando
