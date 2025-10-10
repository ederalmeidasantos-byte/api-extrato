# 🚨 Solução: DNS_PROBE_FINISHED_NXDOMAIN

## 📋 **Problema Identificado**

O erro `DNS_PROBE_FINISHED_NXDOMAIN` indica que:
1. O DNS não está configurado para `inss.lunasdigital.com.br`
2. O servidor pode não estar rodando corretamente

## 🔍 **Diagnóstico**

### **1. Servidor Funcionando?**
✅ **SIM** - O servidor está respondendo em `http://72.60.159.149`

### **2. DNS Configurado?**
❌ **NÃO** - O subdomínio `inss.lunasdigital.com.br` não resolve

## 🚀 **Solução Passo a Passo**

### **PASSO 1: Configurar o VPS**

Execute no VPS (72.60.159.149):

```bash
# Conectar na VPS
ssh root@72.60.159.149

# Navegar para o projeto
cd "/root/API Lunas"

# Executar configuração rápida
bash configurar-vps-rapido.sh
```

### **PASSO 2: Configurar DNS**

No seu provedor de domínio (onde lunasdigital.com.br está registrado), adicione:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | inss | 72.60.159.149 | 3600 |
| A | api | 72.60.159.149 | 3600 |
| A | crm | 72.60.159.149 | 3600 |
| A | admin | 72.60.159.149 | 3600 |

### **PASSO 3: Aguardar Propagação**

- **Tempo**: 1-24 horas
- **Verificar**: https://www.whatsmydns.net/
- **Teste local**: `nslookup inss.lunasdigital.com.br`

### **PASSO 4: Testar**

Após a propagação DNS:

```bash
# Testar DNS
nslookup inss.lunasdigital.com.br

# Testar site
curl http://inss.lunasdigital.com.br
```

## 🌐 **URLs Temporárias (Funcionam Agora)**

Enquanto o DNS não propaga, use:

- **Site Principal**: http://72.60.159.149
- **Simulador INSS**: http://72.60.159.149 (acessará o INSS)

## 🔧 **Verificação Rápida**

### **Testar Servidor**
```bash
# Testar se o servidor está rodando
curl http://72.60.159.149

# Testar porta 3002 (INSS)
curl http://72.60.159.149:3002/health
```

### **Verificar DNS**
```bash
# Verificar se o DNS está configurado
nslookup inss.lunasdigital.com.br

# Deve retornar: 72.60.159.149
```

## 📊 **Status Atual**

| Item | Status | Observação |
|------|--------|------------|
| Servidor VPS | ✅ Funcionando | http://72.60.159.149 |
| Porta 3000 | ✅ Funcionando | API Principal |
| Porta 3002 | ❓ Verificar | INSS Simulador |
| DNS inss.lunasdigital.com.br | ❌ Não configurado | Precisa configurar |
| DNS api.lunasdigital.com.br | ❌ Não configurado | Precisa configurar |
| DNS crm.lunasdigital.com.br | ❌ Não configurado | Precisa configurar |
| DNS admin.lunasdigital.com.br | ❌ Não configurado | Precisa configurar |

## 🚨 **Ação Imediata Necessária**

1. **Execute o script no VPS**: `bash configurar-vps-rapido.sh`
2. **Configure o DNS** no seu provedor de domínio
3. **Aguarde a propagação** (até 24h)

## 📞 **Se Ainda Não Funcionar**

### **Verificar Logs**
```bash
# Logs PM2
pm2 logs

# Logs Nginx
tail -f /var/log/nginx/lunasdigital.error.log
```

### **Reiniciar Serviços**
```bash
# Reiniciar PM2
pm2 restart all

# Reiniciar Nginx
systemctl restart nginx
```

### **Verificar Portas**
```bash
# Verificar se as portas estão abertas
netstat -tlnp | grep :3000
netstat -tlnp | grep :3002
netstat -tlnp | grep :3003
```

## ✅ **Resultado Esperado**

Após configurar o DNS e aguardar a propagação:

- ✅ `inss.lunasdigital.com.br` → Simulador INSS
- ✅ `api.lunasdigital.com.br` → API Principal  
- ✅ `crm.lunasdigital.com.br` → CRM Sistema
- ✅ `admin.lunasdigital.com.br` → Base de Dados

---

**🎯 Resumo: O problema é DNS não configurado. Execute o script no VPS e configure o DNS!**

