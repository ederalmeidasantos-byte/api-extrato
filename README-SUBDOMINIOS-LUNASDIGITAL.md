# 🌐 Lunas Digital - Configuração de Subdomínios

## 🎯 **Arquitetura de Subdomínios**

```
lunasdigital.com.br          → Site Principal (Porta 3000)
api.lunasdigital.com.br      → API Principal (Porta 3000)
crm.lunasdigital.com.br      → CRM Sistema (Porta 3001)
inss.lunasdigital.com.br     → Simulador INSS (Porta 3002)
admin.lunasdigital.com.br    → Base de Dados (Porta 3003)
```

## 📁 **Arquivos de Configuração**

### **Configuração Nginx**
- `nginx-lunasdigital-subdominios.conf` - Configuração completa do Nginx
- Cada subdomínio tem seu próprio bloco `server`
- Logs separados para cada serviço
- Headers de segurança configurados

### **Scripts de Deploy**
- `deploy-lunasdigital-subdominios.sh` - Deploy completo no VPS
- `test-lunasdigital-subdominios.sh` - Teste de todos os endpoints
- `configurar-dns-lunasdigital.md` - Guia de configuração DNS

## 🚀 **Como Fazer Deploy**

### **1. No VPS (72.60.159.149)**
```bash
# Conectar na VPS
ssh root@72.60.159.149

# Navegar para o projeto
cd "/root/API Lunas"

# Executar deploy
sudo bash deploy-lunasdigital-subdominios.sh
```

### **2. Configurar DNS**
Configure os seguintes registros DNS no seu provedor:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | 72.60.159.149 | 3600 |
| A | www | 72.60.159.149 | 3600 |
| A | api | 72.60.159.149 | 3600 |
| A | crm | 72.60.159.149 | 3600 |
| A | inss | 72.60.159.149 | 3600 |
| A | admin | 72.60.159.149 | 3600 |

### **3. Testar Configuração**
```bash
# Testar localmente
bash test-lunasdigital-subdominios.sh

# Verificar status
pm2 status
systemctl status nginx
```

## 🌐 **URLs Finais**

Após configurar o DNS:

- **Site Principal**: https://lunasdigital.com.br
- **API Principal**: https://api.lunasdigital.com.br
- **CRM**: https://crm.lunasdigital.com.br
- **Simulador INSS**: https://inss.lunasdigital.com.br
- **Admin**: https://admin.lunasdigital.com.br

## 🔧 **Serviços PM2**

O deploy configura automaticamente os seguintes serviços:

```javascript
// ecosystem-lunasdigital.config.cjs
{
  name: 'api-principal',    // Porta 3000
  name: 'crm-sistema',      // Porta 3001  
  name: 'inss-sistema',     // Porta 3002
  name: 'base-dados'        // Porta 3003
}
```

## 📊 **Monitoramento**

### **Comandos Úteis**
```bash
# Status dos serviços
pm2 status

# Logs em tempo real
pm2 logs

# Reiniciar todos
pm2 restart all

# Status Nginx
systemctl status nginx

# Testar configuração Nginx
nginx -t
```

### **Logs**
- PM2: `/var/log/pm2/`
- Nginx: `/var/log/nginx/`
- Aplicação: `./var/log/`

## 🛡️ **Segurança**

### **Headers Configurados**
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer-when-downgrade`
- `Content-Security-Policy`

### **SSL (Opcional)**
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificados
sudo certbot --nginx -d lunasdigital.com.br
sudo certbot --nginx -d api.lunasdigital.com.br
sudo certbot --nginx -d crm.lunasdigital.com.br
sudo certbot --nginx -d inss.lunasdigital.com.br
sudo certbot --nginx -d admin.lunasdigital.com.br
```

## 🚨 **Troubleshooting**

### **Problema: Subdomínio não resolve**
1. Verificar se o DNS foi configurado
2. Aguardar propagação (até 24h)
3. Testar: `nslookup subdominio.lunasdigital.com.br`

### **Problema: Serviço não responde**
1. Verificar PM2: `pm2 status`
2. Ver logs: `pm2 logs nome-do-servico`
3. Reiniciar: `pm2 restart nome-do-servico`

### **Problema: Nginx não funciona**
1. Testar: `nginx -t`
2. Ver logs: `tail -f /var/log/nginx/error.log`
3. Reiniciar: `systemctl restart nginx`

## 📈 **Vantagens desta Configuração**

1. **Escalabilidade**: Cada sistema independente
2. **Isolamento**: Problemas não afetam outros sistemas
3. **Manutenção**: Pode reiniciar/atualizar individualmente
4. **Logs**: Logs separados para cada serviço
5. **SSL**: Certificados individuais
6. **Performance**: Cada sistema otimizado

## ⚠️ **Importante**

- **Configure o DNS** antes de testar externamente
- **Aguarde propagação** (até 24h)
- **Monitore logs** após deploy
- **Faça backup** antes de mudanças
- **Teste em desenvolvimento** primeiro

## 📞 **Suporte**

Se encontrar problemas:

1. Verificar logs: `pm2 logs`
2. Testar configuração: `nginx -t`
3. Verificar status: `pm2 status`
4. Consultar este README

---

**🎉 Sistema Lunas Digital com subdomínios configurado e pronto para produção!**

