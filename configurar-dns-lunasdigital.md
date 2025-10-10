# 🌐 Configuração DNS para Lunas Digital

## 📋 **Registros DNS Necessários**

Configure os seguintes registros DNS no seu provedor de domínio (onde lunasdigital.com.br está registrado):

### **Registros A (IPv4)**

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | 72.60.159.149 | 3600 |
| A | www | 72.60.159.149 | 3600 |
| A | api | 72.60.159.149 | 3600 |
| A | crm | 72.60.159.149 | 3600 |
| A | inss | 72.60.159.149 | 3600 |
| A | admin | 72.60.159.149 | 3600 |

### **Registros CNAME (Alternativa)**

Se preferir usar CNAME:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| CNAME | api | lunasdigital.com.br | 3600 |
| CNAME | crm | lunasdigital.com.br | 3600 |
| CNAME | inss | lunasdigital.com.br | 3600 |
| CNAME | admin | lunasdigital.com.br | 3600 |

## 🎯 **URLs Finais**

Após configurar o DNS, as seguintes URLs estarão disponíveis:

- **Site Principal**: https://lunasdigital.com.br
- **API Principal**: https://api.lunasdigital.com.br
- **CRM**: https://crm.lunasdigital.com.br
- **Simulador INSS**: https://inss.lunasdigital.com.br
- **Admin**: https://admin.lunasdigital.com.br

## ⏱️ **Propagação DNS**

- **Tempo estimado**: 1-24 horas
- **Verificar propagação**: https://www.whatsmydns.net/
- **Teste local**: `nslookup api.lunasdigital.com.br`

## 🔧 **Verificação Pós-DNS**

Após a propagação DNS, teste as URLs:

```bash
# Testar APIs
curl https://api.lunasdigital.com.br/health
curl https://crm.lunasdigital.com.br/health
curl https://inss.lunasdigital.com.br/health
curl https://admin.lunasdigital.com.br/health

# Testar simulador
curl https://inss.lunasdigital.com.br/simulador.html
```

## 🛡️ **Configuração SSL (Opcional)**

Para habilitar HTTPS:

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificados
sudo certbot --nginx -d lunasdigital.com.br
sudo certbot --nginx -d api.lunasdigital.com.br
sudo certbot --nginx -d crm.lunasdigital.com.br
sudo certbot --nginx -d inss.lunasdigital.com.br
sudo certbot --nginx -d admin.lunasdigital.com.br

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 **Monitoramento**

### **Verificar Status dos Serviços**

```bash
# Status PM2
pm2 status

# Logs em tempo real
pm2 logs

# Status Nginx
systemctl status nginx

# Logs Nginx
tail -f /var/log/nginx/*.log
```

### **Testar Conectividade**

```bash
# Testar portas
nmap -p 80,443,3000-3003 72.60.159.149

# Testar DNS
nslookup lunasdigital.com.br
nslookup api.lunasdigital.com.br
nslookup crm.lunasdigital.com.br
nslookup inss.lunasdigital.com.br
nslookup admin.lunasdigital.com.br
```

## 🚨 **Troubleshooting**

### **Problema: Subdomínio não resolve**

1. Verificar se o DNS foi configurado corretamente
2. Aguardar propagação (até 24h)
3. Verificar se o domínio está apontando para o IP correto

### **Problema: Serviço não responde**

1. Verificar se o PM2 está rodando: `pm2 status`
2. Verificar logs: `pm2 logs nome-do-servico`
3. Verificar se a porta está aberta: `netstat -tlnp | grep :3000`

### **Problema: Nginx não funciona**

1. Testar configuração: `nginx -t`
2. Verificar logs: `tail -f /var/log/nginx/error.log`
3. Reiniciar: `systemctl restart nginx`

## 📞 **Suporte**

Se encontrar problemas:

1. Verificar logs: `pm2 logs`
2. Testar configuração Nginx: `nginx -t`
3. Verificar status dos serviços: `pm2 status`
4. Verificar DNS: `nslookup subdominio.lunasdigital.com.br`

---

**🎉 Configuração DNS concluída! Sistema pronto para produção!**

