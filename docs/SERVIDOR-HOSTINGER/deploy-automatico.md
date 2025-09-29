# 🚀 DEPLOY AUTOMÁTICO - SERVIDOR HOSTINGER

## 📋 **VISÃO GERAL**

Este documento detalha como configurar e usar o deploy automático via SSH no servidor Hostinger, permitindo atualizações instantâneas sem necessidade de senha.

---

## 🔑 **CONFIGURAÇÃO INICIAL**

### **1. Gerar Chave SSH Local**

#### **Windows (PowerShell):**
```bash
# Gerar chave SSH
ssh-keygen -t rsa -b 4096 -C "seu-email@exemplo.com" -f "C:\Users\seu-usuario\.ssh\id_rsa" -N '""'

# Mostrar chave pública
type C:\Users\seu-usuario\.ssh\id_rsa.pub
```

#### **Linux/Mac:**
```bash
# Gerar chave SSH
ssh-keygen -t rsa -b 4096 -C "seu-email@exemplo.com"

# Mostrar chave pública
cat ~/.ssh/id_rsa.pub
```

### **2. Adicionar Chave na Hostinger**

1. **Acesse o painel da Hostinger**
2. **Navegue para "Chaves SSH"**
3. **Clique em "Adicionar chave SSH"**
4. **Cole a chave pública completa** (desde `ssh-rsa` até o email)
5. **Nome:** "Meu PC - Deploy Automático"
6. **Salve a configuração**

### **3. Testar Conexão**

```bash
# Testar SSH sem senha
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "echo 'SSH funcionando!'"
```

---

## 🚀 **COMANDOS DE DEPLOY**

### **Deploy Rápido (Recomendado)**
```bash
# Atualizar código e reiniciar aplicação
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "cd /root/api-extrato && git pull origin main && pm2 restart api-extrato"
```

### **Deploy Completo**
```bash
# Deploy com instalação de dependências e verificação
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "cd /root/api-extrato && git pull origin main && npm install && pm2 restart api-extrato && pm2 status"
```

### **Deploy com Logs**
```bash
# Deploy e verificar logs
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "cd /root/api-extrato && git pull origin main && pm2 restart api-extrato && pm2 logs api-extrato --lines 10"
```

---

## 🔧 **COMANDOS DE GERENCIAMENTO**

### **Aplicação**
```bash
# Status da aplicação
ssh root@72.60.159.149 "pm2 status"

# Reiniciar aplicação
ssh root@72.60.159.149 "pm2 restart api-extrato"

# Parar aplicação
ssh root@72.60.159.149 "pm2 stop api-extrato"

# Iniciar aplicação
ssh root@72.60.159.149 "pm2 start api-extrato"

# Ver logs
ssh root@72.60.159.149 "pm2 logs api-extrato --lines 50"

# Ver logs de erro
ssh root@72.60.159.149 "pm2 logs api-extrato --err --lines 20"
```

### **Nginx**
```bash
# Status do Nginx
ssh root@72.60.159.149 "systemctl status nginx"

# Reiniciar Nginx
ssh root@72.60.159.149 "systemctl restart nginx"

# Testar configuração
ssh root@72.60.159.149 "nginx -t"

# Recarregar configuração
ssh root@72.60.159.149 "systemctl reload nginx"
```

### **Sistema**
```bash
# Status geral do servidor
ssh root@72.60.159.149 "pm2 status && systemctl status nginx && curl -s http://localhost:3000/api/health"

# Uso de recursos
ssh root@72.60.159.149 "htop"

# Espaço em disco
ssh root@72.60.159.149 "df -h"

# Uso de memória
ssh root@72.60.159.149 "free -h"

# Processos Node.js
ssh root@72.60.159.149 "ps aux | grep node"
```

---

## 📋 **SCRIPTS DE DEPLOY**

### **Script Windows (deploy.bat)**
```batch
@echo off
echo.
echo ========================================
echo    🚀 DEPLOY AUTOMÁTICO - HOSTINGER
echo ========================================
echo.

echo 📥 Baixando atualizações...
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "cd /root/api-extrato && git pull origin main"

echo.
echo 🔄 Reiniciando aplicação...
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 restart api-extrato"

echo.
echo 📊 Verificando status...
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 status"

echo.
echo ✅ Deploy concluído com sucesso!
echo.
pause
```

### **Script PowerShell (deploy.ps1)**
```powershell
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   🚀 DEPLOY AUTOMÁTICO - HOSTINGER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📥 Baixando atualizações..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "cd /root/api-extrato && git pull origin main"

Write-Host ""
Write-Host "🔄 Reiniciando aplicação..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 restart api-extrato"

Write-Host ""
Write-Host "📊 Verificando status..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 status"

Write-Host ""
Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host ""
```

### **Script Linux/Mac (deploy.sh)**
```bash
#!/bin/bash

echo ""
echo "========================================"
echo "   🚀 DEPLOY AUTOMÁTICO - HOSTINGER"
echo "========================================"
echo ""

echo "📥 Baixando atualizações..."
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "cd /root/api-extrato && git pull origin main"

echo ""
echo "🔄 Reiniciando aplicação..."
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 restart api-extrato"

echo ""
echo "📊 Verificando status..."
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 status"

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
```

---

## 🔍 **COMANDOS DE DIAGNÓSTICO**

### **Verificar Conectividade**
```bash
# Testar API local
ssh root@72.60.159.149 "curl -s http://localhost:3000/api/health"

# Testar API externa
curl -s http://72.60.159.149/api/health

# Verificar portas
ssh root@72.60.159.149 "netstat -tlnp | grep :3000"
```

### **Verificar Logs**
```bash
# Logs da aplicação
ssh root@72.60.159.149 "pm2 logs api-extrato --lines 20"

# Logs de erro
ssh root@72.60.159.149 "pm2 logs api-extrato --err --lines 10"

# Logs do Nginx
ssh root@72.60.159.149 "tail -f /var/log/nginx/error.log"
```

### **Verificar Recursos**
```bash
# Uso de CPU e memória
ssh root@72.60.159.149 "top -bn1 | head -20"

# Espaço em disco
ssh root@72.60.159.149 "df -h"

# Processos em execução
ssh root@72.60.159.149 "ps aux | grep -E '(node|nginx|pm2)'"
```

---

## 🚨 **COMANDOS DE EMERGÊNCIA**

### **Reiniciar Tudo**
```bash
# Reiniciar aplicação e Nginx
ssh root@72.60.159.149 "pm2 restart all && systemctl restart nginx"

# Verificar status
ssh root@72.60.159.149 "pm2 status && systemctl status nginx"
```

### **Recuperação de Erro**
```bash
# Parar tudo
ssh root@72.60.159.149 "pm2 stop all"

# Limpar cache
ssh root@72.60.159.149 "pm2 flush"

# Reiniciar
ssh root@72.60.159.149 "pm2 start ecosystem.config.cjs"
```

### **Rollback**
```bash
# Voltar para commit anterior
ssh root@72.60.159.149 "cd /root/api-extrato && git reset --hard HEAD~1 && pm2 restart api-extrato"
```

---

## 📊 **MONITORAMENTO CONTÍNUO**

### **Status Dashboard**
```bash
# Verificar status completo
ssh root@72.60.159.149 "echo '=== PM2 STATUS ===' && pm2 status && echo '=== NGINX STATUS ===' && systemctl status nginx --no-pager && echo '=== API HEALTH ===' && curl -s http://localhost:3000/api/health"
```

### **Monitor de Recursos**
```bash
# Monitor em tempo real
ssh root@72.60.159.149 "htop"
```

### **Logs em Tempo Real**
```bash
# Acompanhar logs
ssh root@72.60.159.149 "pm2 logs api-extrato --follow"
```

---

## 🎯 **VANTAGENS DO DEPLOY AUTOMÁTICO**

### **✅ Benefícios:**
- **Deploy instantâneo** - Atualizações em segundos
- **Sem interrupção** - Não precisa digitar senha
- **Automação** - Pode ser integrado em CI/CD
- **Segurança** - Chave SSH é mais segura que senha
- **Produtividade** - Deploy com um comando
- **Confiabilidade** - Menos erros manuais
- **Rastreabilidade** - Logs detalhados

### **🔧 Casos de Uso:**
- **Desenvolvimento** - Deploy rápido durante desenvolvimento
- **Produção** - Atualizações seguras e rápidas
- **Manutenção** - Gerenciamento remoto do servidor
- **Monitoramento** - Verificação de status e logs
- **Backup** - Criação de backups automáticos

---

## 📞 **SUPORTE E TROUBLESHOOTING**

### **Problemas Comuns:**

#### **SSH não conecta:**
```bash
# Verificar se a chave está correta
ssh -v root@72.60.159.149

# Testar com senha
ssh root@72.60.159.149
```

#### **Git pull falha:**
```bash
# Verificar status do git
ssh root@72.60.159.149 "cd /root/api-extrato && git status"

# Forçar pull
ssh root@72.60.159.149 "cd /root/api-extrato && git fetch && git reset --hard origin/main"
```

#### **PM2 não reinicia:**
```bash
# Verificar logs de erro
ssh root@72.60.159.149 "pm2 logs api-extrato --err"

# Reiniciar manualmente
ssh root@72.60.159.149 "pm2 delete api-extrato && pm2 start ecosystem.config.cjs"
```

### **Comandos de Diagnóstico:**
```bash
# Status completo do sistema
ssh root@72.60.159.149 "echo '=== SISTEMA ===' && uname -a && echo '=== MEMÓRIA ===' && free -h && echo '=== DISCO ===' && df -h && echo '=== PROCESSOS ===' && ps aux | grep -E '(node|nginx|pm2)' | head -10"
```

---

**Última atualização**: 29/09/2025  
**Versão**: 1.0  
**Status**: ✅ Ativo e funcionando  
**Configuração**: SSH sem senha ativo
