# 🔧 TROUBLESHOOTING - SERVIDOR HOSTINGER

## 🚨 **PROBLEMAS COMUNS E SOLUÇÕES**

### **🚨 502 BAD GATEWAY (RESOLVIDO EM 01/10/2025)**

#### **Sintomas:**
- `502 Bad Gateway nginx/1.18.0 (Ubuntu)`
- Site não carrega
- GitHub Actions não executa

#### **Soluções (testadas e funcionando):**
```bash
# 1. Verificar status PM2
ssh -i C:\Users\srcor\.ssh\id_ed25519 root@72.60.159.149 "pm2 status"

# 2. Resolver conflitos Git
ssh -i C:\Users\srcor\.ssh\id_ed25519 root@72.60.159.149 "cd /root/api-lunas && git stash && rm -f 'API Lunas/fgts.html' && git pull origin master"

# 3. Instalar dependências
ssh -i C:\Users\srcor\.ssh\id_ed25519 root@72.60.159.149 "cd '/root/api-lunas/API Lunas' && npm install"

# 4. Reiniciar aplicação
ssh -i C:\Users\srcor\.ssh\id_ed25519 root@72.60.159.149 "cd '/root/api-lunas/API Lunas' && pm2 restart api-extrato"

# 5. Verificar funcionamento
ssh -i C:\Users\srcor\.ssh\id_ed25519 root@72.60.159.149 "curl -I http://localhost:3000"
```

---

### **❌ Aplicação não inicia**

#### **Sintomas:**
- `pm2 status` mostra "errored" ou "stopped"
- API não responde
- Logs mostram erros

#### **Soluções:**
```bash
# 1. Verificar logs de erro
pm2 logs api-extrato --err

# 2. Verificar se a porta está em uso
netstat -tlnp | grep :3000

# 3. Verificar variáveis de ambiente
cat .env

# 4. Reiniciar aplicação
pm2 restart api-extrato

# 5. Se não funcionar, deletar e recriar
pm2 delete api-extrato
pm2 start ecosystem.config.cjs
```

---

### **❌ Nginx não funciona**

#### **Sintomas:**
- Erro 502 Bad Gateway
- Site não carrega
- `systemctl status nginx` mostra erro

#### **Soluções:**
```bash
# 1. Verificar configuração
nginx -t

# 2. Verificar se a aplicação está rodando
pm2 status

# 3. Verificar logs do Nginx
tail -f /var/log/nginx/error.log

# 4. Reiniciar Nginx
systemctl restart nginx

# 5. Verificar se a porta 80 está aberta
netstat -tlnp | grep :80
```

---

### **❌ Erro de memória**

#### **Sintomas:**
- Aplicação para de funcionar
- Logs mostram "out of memory"
- PM2 reinicia constantemente

#### **Soluções:**
```bash
# 1. Verificar uso de memória
free -h
htop

# 2. Ajustar limite de memória no PM2
nano ecosystem.config.cjs
# Alterar max_memory_restart para '1G'

# 3. Reiniciar aplicação
pm2 restart api-extrato

# 4. Verificar se há vazamentos de memória
pm2 logs api-extrato --lines 100
```

---

### **❌ Erro de permissão**

#### **Sintomas:**
- "Permission denied"
- Não consegue criar arquivos
- Erro ao acessar diretórios

#### **Soluções:**
```bash
# 1. Verificar permissões
ls -la /root/api-extrato/

# 2. Corrigir permissões
chmod 755 /root/api-extrato/
chmod 644 /root/api-extrato/*.js

# 3. Corrigir permissões do PM2
pm2 kill
pm2 start ecosystem.config.cjs

# 4. Verificar usuário
whoami
```

---

### **❌ Erro de conexão**

#### **Sintomas:**
- "Connection refused"
- Timeout ao conectar
- API não responde

#### **Soluções:**
```bash
# 1. Verificar se a aplicação está rodando
pm2 status

# 2. Verificar se a porta está aberta
netstat -tlnp | grep :3000

# 3. Testar localmente
curl http://localhost:3000/api/health

# 4. Verificar firewall
ufw status

# 5. Reiniciar aplicação
pm2 restart api-extrato
```

---

## 🔍 **DIAGNÓSTICO AVANÇADO**

### **📊 Verificar recursos do sistema:**
```bash
# Uso de CPU
top -bn1 | grep "Cpu(s)"

# Uso de memória
free -h

# Uso de disco
df -h

# Processos em execução
ps aux --sort=-%cpu | head -10
```

### **🌐 Verificar conectividade:**
```bash
# Testar DNS
nslookup google.com

# Testar conectividade
ping -c 4 google.com

# Verificar portas
netstat -tlnp

# Testar API
curl -v http://72.60.159.149/api/health
```

### **📝 Verificar logs:**
```bash
# Logs da aplicação
pm2 logs api-extrato --lines 50

# Logs do Nginx
tail -f /var/log/nginx/error.log

# Logs do sistema
journalctl -f

# Logs de erro específicos
grep -i error /var/log/nginx/error.log
```

---

## 🚨 **PROBLEMAS CRÍTICOS**

### **💥 Servidor não responde**

#### **Sintomas:**
- SSH não conecta
- Site não carrega
- Ping não responde

#### **Soluções:**
```bash
# 1. Verificar se o servidor está ligado
# (Acessar painel da Hostinger)

# 2. Reiniciar servidor
# (Via painel da Hostinger)

# 3. Verificar logs do sistema
journalctl -b

# 4. Verificar espaço em disco
df -h

# 5. Verificar memória
free -h
```

---

### **💥 Aplicação consome muita RAM**

#### **Sintomas:**
- Uso de RAM > 90%
- Sistema lento
- Aplicação trava

#### **Soluções:**
```bash
# 1. Verificar processos
ps aux --sort=-%mem | head -10

# 2. Parar aplicação
pm2 stop api-extrato

# 3. Limpar cache
pm2 flush

# 4. Ajustar limite de memória
nano ecosystem.config.cjs
# max_memory_restart: '1G'

# 5. Reiniciar aplicação
pm2 start ecosystem.config.cjs
```

---

## 🔧 **COMANDOS DE RECUPERAÇÃO**

### **🔄 Restaurar aplicação:**
```bash
# 1. Parar aplicação
pm2 stop api-extrato

# 2. Restaurar backup
tar -xzf /var/backups/api-extrato-YYYYMMDD.tar.gz -C /

# 3. Instalar dependências
cd /root/api-extrato
npm install

# 4. Iniciar aplicação
pm2 start ecosystem.config.cjs
```

### **🔄 Restaurar configuração:**
```bash
# 1. Restaurar Nginx
cp -r /var/backups/nginx-YYYYMMDD /etc/nginx

# 2. Testar configuração
nginx -t

# 3. Reiniciar Nginx
systemctl restart nginx

# 4. Verificar status
systemctl status nginx
```

---

## 📞 **SUPORTE TÉCNICO**

### **📋 Informações para suporte:**
```bash
# Coletar informações do sistema
echo "=== SISTEMA ===" > /tmp/support-info.txt
uname -a >> /tmp/support-info.txt
cat /etc/os-release >> /tmp/support-info.txt

echo "=== RECURSOS ===" >> /tmp/support-info.txt
free -h >> /tmp/support-info.txt
df -h >> /tmp/support-info.txt

echo "=== SERVIÇOS ===" >> /tmp/support-info.txt
pm2 status >> /tmp/support-info.txt
systemctl status nginx >> /tmp/support-info.txt

echo "=== LOGS ===" >> /tmp/support-info.txt
pm2 logs api-extrato --lines 20 >> /tmp/support-info.txt

# Enviar arquivo
cat /tmp/support-info.txt
```

### **🔍 Checklist de diagnóstico:**
- [ ] Aplicação está rodando? (`pm2 status`)
- [ ] Nginx está funcionando? (`systemctl status nginx`)
- [ ] Porta 3000 está aberta? (`netstat -tlnp | grep :3000`)
- [ ] API responde localmente? (`curl http://localhost:3000/api/health`)
- [ ] API responde externamente? (`curl http://72.60.159.149/api/health`)
- [ ] Logs mostram erros? (`pm2 logs api-extrato --err`)
- [ ] Recursos do sistema OK? (`htop`)

---

## 🚀 **PREVENÇÃO DE PROBLEMAS**

### **📊 Monitoramento regular:**
```bash
# Script de monitoramento
#!/bin/bash
echo "=== MONITORAMENTO $(date) ==="
echo "PM2 Status:"
pm2 status
echo "Nginx Status:"
systemctl status nginx --no-pager
echo "Recursos:"
free -h
df -h
echo "API Health:"
curl -s http://localhost:3000/api/health
```

### **🔄 Backup automático:**
```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf /var/backups/api-extrato-$DATE.tar.gz /root/api-extrato
find /var/backups -name "api-extrato-*.tar.gz" -mtime +30 -delete
```

---

**Última atualização**: 29/09/2025
**Versão**: 1.0
**Status**: ✅ Ativo e funcionando
