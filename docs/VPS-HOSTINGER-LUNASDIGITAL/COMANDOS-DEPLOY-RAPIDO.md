# ⚡ Comandos de Deploy Rápido - Lunas Digital

## 🚀 Deploy em 1 Comando

```bash
# Deploy completo (recomendado)
git add . && git commit -m "Deploy: $(date)" && git push origin master && ssh root@lunasdigital.com.br "cd /root/api-lunas/API\ Lunas && git pull origin master && pm2 restart api-extrato"
```

## 📋 Comandos Individuais

### 1. Git + Push
```bash
git add .
git commit -m "Descrição das alterações"
git push origin master
```

### 2. Deploy no VPS
```bash
ssh root@lunasdigital.com.br "cd /root/api-lunas/API\ Lunas && git pull origin master && pm2 restart api-extrato"
```

### 3. Verificar Status
```bash
ssh root@lunasdigital.com.br "pm2 status"
```

### 4. Ver Logs
```bash
ssh root@lunasdigital.com.br "pm2 logs api-extrato --lines 20"
```

## 🔧 Comandos de Manutenção

### Reiniciar Aplicação
```bash
ssh root@lunasdigital.com.br "pm2 restart api-extrato"
```

### Parar Aplicação
```bash
ssh root@lunasdigital.com.br "pm2 stop api-extrato"
```

### Iniciar Aplicação
```bash
ssh root@lunasdigital.com.br "pm2 start api-extrato"
```

### Verificar Saúde da Aplicação
```bash
curl https://lunasdigital.com.br/api/health
```

## 📁 Comandos de Arquivos

### Copiar Arquivo Específico
```bash
scp server.js root@lunasdigital.com.br:/root/api-lunas/API\ Lunas/
```

### Copiar Pasta
```bash
scp -r operacional/ root@lunasdigital.com.br:/root/api-lunas/API\ Lunas/
```

### Baixar Arquivo do Servidor
```bash
scp root@lunasdigital.com.br:/root/api-lunas/API\ Lunas/server.js ./
```

## 🐛 Comandos de Debug

### Verificar Conectividade
```bash
ssh root@lunasdigital.com.br "echo 'Conexão OK'"
```

### Verificar Portas
```bash
ssh root@lunasdigital.com.br "netstat -tlnp | grep :3000"
```

### Verificar Uso de Memória
```bash
ssh root@lunasdigital.com.br "free -h"
```

### Verificar Uso de Disco
```bash
ssh root@lunasdigital.com.br "df -h"
```

## 🔄 Comandos de Rollback

### Voltar para Commit Anterior
```bash
git log --oneline -5  # Ver últimos commits
git reset --hard HEAD~1  # Voltar 1 commit
git push origin master --force
ssh root@lunasdigital.com.br "cd /root/api-lunas/API\ Lunas && git pull origin master && pm2 restart api-extrato"
```

### Voltar para Commit Específico
```bash
git reset --hard <hash-do-commit>
git push origin master --force
ssh root@lunasdigital.com.br "cd /root/api-lunas/API\ Lunas && git pull origin master && pm2 restart api-extrato"
```

## 📊 Comandos de Monitoramento

### Status Completo
```bash
ssh root@lunasdigital.com.br "pm2 status && echo '---' && free -h && echo '---' && df -h"
```

### Logs em Tempo Real
```bash
ssh root@lunasdigital.com.br "pm2 logs api-extrato --follow"
```

### Verificar Nginx
```bash
ssh root@lunasdigital.com.br "systemctl status nginx"
```

## 🎯 Scripts Personalizados

### Script de Deploy Completo
```bash
#!/bin/bash
echo "🚀 Iniciando deploy..."
git add .
git commit -m "Deploy: $(date)"
git push origin master
echo "📥 Código enviado para GitHub"
ssh root@lunasdigital.com.br "cd /root/api-lunas/API\ Lunas && git pull origin master && pm2 restart api-extrato"
echo "✅ Deploy concluído!"
```

### Script de Verificação
```bash
#!/bin/bash
echo "🔍 Verificando status..."
ssh root@lunasdigital.com.br "pm2 status"
echo "🌐 Testando aplicação..."
curl -f https://lunasdigital.com.br/api/health || echo "❌ Aplicação não responde"
```

## ⚠️ Comandos de Emergência

### Parar Tudo
```bash
ssh root@lunasdigital.com.br "pm2 stop all"
```

### Reiniciar Tudo
```bash
ssh root@lunasdigital.com.br "pm2 restart all"
```

### Limpar Logs
```bash
ssh root@lunasdigital.com.br "pm2 flush"
```

### Reiniciar Servidor (CUIDADO!)
```bash
ssh root@lunasdigital.com.br "sudo reboot"
```

---

## 💡 Dicas Rápidas

1. **Sempre teste localmente antes do deploy**
2. **Use commits descritivos**
3. **Verifique o status após cada deploy**
4. **Mantenha logs limpos**
5. **Tenha um plano de rollback**

---

**📅 Última atualização:** 04/01/2025  
**⚡ Para uso rápido e eficiente**
