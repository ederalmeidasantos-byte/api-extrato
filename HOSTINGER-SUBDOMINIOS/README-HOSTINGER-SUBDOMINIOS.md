# 🚀 Hostinger VPS - Configuração de Subdomínios

## 📁 **Conteúdo desta Pasta**

Esta pasta contém todos os arquivos necessários para configurar subdomínios na sua VPS Hostinger, permitindo escalar o sistema com múltiplos serviços independentes.

### **📋 Arquivos Incluídos:**

- **`deploy-hostinger-subdominios.sh`** - Script principal de deploy
- **`nginx-hostinger-subdominios.conf`** - Configuração Nginx otimizada
- **`ecosystem-subdominios.config.cjs`** - Configuração PM2 para múltiplos serviços
- **`configurar-subdominios.sh`** - Script de configuração inicial
- **`GUIA-SUBDOMINIOS-VPS.md`** - Guia completo de implementação

## 🎯 **Estrutura de Subdomínios**

```
api.seudominio.com     → Porta 3000 (API Principal)
fgts.seudominio.com    → Porta 3001 (Sistema FGTS)
inss.seudominio.com    → Porta 3002 (Sistema INSS)
admin.seudominio.com   → Porta 3003 (Painel Admin)
```

## 🚀 **Deploy Rápido**

### **1. Preparação**
```bash
# Conectar na VPS
ssh root@72.60.159.149

# Navegar para o projeto
cd "/root/API Lunas"
```

### **2. Executar Deploy**
```bash
# Dar permissão de execução
chmod +x HOSTINGER-SUBDOMINIOS/deploy-hostinger-subdominios.sh

# Executar deploy
sudo bash HOSTINGER-SUBDOMINIOS/deploy-hostinger-subdominios.sh
```

### **3. Configurar DNS**
No seu provedor de domínio, configure:
```
Tipo: A
Nome: api
Valor: 72.60.159.149

Tipo: A
Nome: fgts
Valor: 72.60.159.149

Tipo: A
Nome: inss
Valor: 72.60.159.149

Tipo: A
Nome: admin
Valor: 72.60.159.149
```

### **4. Configurar SSL (Opcional)**
```bash
# Instalar certificados SSL
sudo certbot --nginx -d api.seudominio.com
sudo certbot --nginx -d fgts.seudominio.com
sudo certbot --nginx -d inss.seudominio.com
sudo certbot --nginx -d admin.seudominio.com
```

## 🔧 **Comandos Úteis**

### **Gerenciamento de Serviços**
```bash
# Ver status de todos os serviços
pm2 status

# Reiniciar todos os serviços
pm2 restart all

# Ver logs em tempo real
pm2 logs

# Parar todos os serviços
pm2 stop all

# Iniciar todos os serviços
pm2 start all
```

### **Gerenciamento do Nginx**
```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/api-extrato.access.log
```

### **Monitoramento**
```bash
# Ver logs de um serviço específico
pm2 logs api-principal
pm2 logs fgts-sistema
pm2 logs inss-sistema
pm2 logs admin-painel

# Monitorar recursos
pm2 monit

# Ver status do sistema
systemctl status nginx
```

## 📊 **Verificação de Status**

### **Testar APIs Localmente**
```bash
# API Principal
curl http://localhost:3000/api/health

# Sistema FGTS
curl http://localhost:3001/api/health

# Sistema INSS
curl http://localhost:3002/api/health

# Painel Admin
curl http://localhost:3003/api/health
```

### **Testar APIs Externamente**
```bash
# API Principal
curl http://72.60.159.149/api/health

# Com subdomínios (após configurar DNS)
curl http://api.seudominio.com/api/health
curl http://fgts.seudominio.com/api/health
curl http://inss.seudominio.com/api/health
curl http://admin.seudominio.com/api/health
```

## 🛠️ **Troubleshooting**

### **Problema: Serviço não inicia**
```bash
# Ver logs de erro
pm2 logs nome-do-servico --err

# Reiniciar serviço específico
pm2 restart nome-do-servico

# Verificar se a porta está em uso
netstat -tlnp | grep :3000
```

### **Problema: Nginx não funciona**
```bash
# Testar configuração
sudo nginx -t

# Ver logs de erro
sudo tail -f /var/log/nginx/error.log

# Verificar se Nginx está rodando
sudo systemctl status nginx
```

### **Problema: Subdomínio não resolve**
```bash
# Verificar DNS
nslookup api.seudominio.com

# Aguardar propagação (até 24h)
# Verificar se o domínio está apontando para o IP correto
```

## 📈 **Vantagens desta Configuração**

1. **Escalabilidade**: Cada sistema pode ser escalado independentemente
2. **Isolamento**: Problemas em um sistema não afetam outros
3. **Manutenção**: Pode reiniciar/atualizar sistemas individualmente
4. **Logs**: Logs separados para cada sistema
5. **SSL**: Certificados individuais para cada subdomínio
6. **Performance**: Cada sistema otimizado para sua função específica

## ⚠️ **Importante**

- **Substitua `seudominio.com`** pelo seu domínio real
- **Configure firewall** para permitir portas 80, 443, 3000-3003
- **Faça backup** antes de aplicar mudanças
- **Teste em ambiente de desenvolvimento** primeiro
- **Monitore logs** após deploy para identificar problemas

## 📞 **Suporte**

Se encontrar problemas:

1. Verifique os logs: `pm2 logs`
2. Teste configuração Nginx: `sudo nginx -t`
3. Verifique status dos serviços: `pm2 status`
4. Consulte o guia completo: `GUIA-SUBDOMINIOS-VPS.md`

---

**🎉 Pronto para escalar seu sistema com subdomínios na Hostinger!**
