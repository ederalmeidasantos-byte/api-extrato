# 🔒 RESOLUÇÃO DE PROBLEMAS SSL/DNS - SERVIDOR HOSTINGER

## 🚨 **PROBLEMA: ERR_SSL_PROTOCOL_ERROR**

### **Sintomas:**
- Erro "Não foi possível estabelecer uma conexão segura com este site"
- "lunasdigital.com.br enviou uma resposta inválida"
- `ERR_SSL_PROTOCOL_ERROR` no navegador
- Site não carrega via HTTPS

---

## 🔍 **DIAGNÓSTICO DO PROBLEMA**

### **1. Verificar DNS:**
```bash
# Verificar resolução DNS
nslookup lunasdigital.com.br
```

**❌ Problema identificado:**
```
Nome:    lunasdigital.com.br
Addresses:  72.60.159.149    # ✅ IP correto com SSL
          84.32.84.32        # ❌ IP sem SSL configurado
```

### **2. Verificar conectividade:**
```bash
# Testar conexão com IP correto
Test-NetConnection lunasdigital.com.br -Port 443
```

**Resultado esperado:**
```
ComputerName     : lunasdigital.com.br
RemoteAddress    : 72.60.159.149
RemotePort       : 443
TcpTestSucceeded : True
```

### **3. Verificar SSL:**
```bash
# Testar SSL diretamente
Invoke-WebRequest -Uri "https://lunasdigital.com.br/fgts" -Method Head
```

---

## 🔧 **SOLUÇÃO: CORRIGIR DNS**

### **Causa Raiz:**
O domínio está resolvendo para **dois IPs**:
- `72.60.159.149` ✅ (IP correto com SSL configurado)
- `84.32.84.32` ❌ (IP sem SSL configurado)

### **Solução:**
Remover o IP duplicado do DNS e manter apenas o IP correto.

---

## 📋 **PASSOS PARA RESOLVER**

### **1. Acessar Painel de DNS:**
1. **Acesse o painel do seu provedor de DNS**
2. **Navegue para "Gerenciar DNS" ou "Zona DNS"**
3. **Localize os registros A do domínio**

### **2. Identificar Registros Problemáticos:**
**Manter:**
```
A @ 72.60.159.149
A www 72.60.159.149
```

**Remover:**
```
A @ 84.32.84.32
```

### **3. Remover IP Duplicado:**
1. **Localize o registro A com IP `84.32.84.32`**
2. **Clique em "Excluir" ou "Remover"**
3. **Confirme a exclusão**
4. **Salve as alterações**

### **4. Aguardar Propagação:**
- **Tempo**: 5-15 minutos (pode levar até 24h)
- **Teste**: `nslookup lunasdigital.com.br`
- **Resultado esperado**: Apenas `72.60.159.149`

---

## ✅ **VERIFICAÇÃO DA SOLUÇÃO**

### **1. Verificar DNS:**
```bash
nslookup lunasdigital.com.br
```

**Resultado correto:**
```
Nome:    lunasdigital.com.br
Address: 72.60.159.149
```

### **2. Testar Conectividade:**
```bash
Test-NetConnection lunasdigital.com.br -Port 443
```

### **3. Testar SSL:**
```bash
Invoke-WebRequest -Uri "https://lunasdigital.com.br/fgts" -Method Head
```

**Resultado esperado:**
```
StatusCode        : 200
StatusDescription : OK
```

### **4. Testar no Navegador:**
- **URL**: https://lunasdigital.com.br/fgts
- **Resultado**: Site carrega normalmente
- **SSL**: Cadeado verde no navegador

---

## 🚨 **PROBLEMAS ALTERNATIVOS**

### **Se o problema persistir:**

#### **1. Cache do Navegador:**
```bash
# Limpar cache
Ctrl + F5 (Windows)
Cmd + Shift + R (Mac)
```

#### **2. Cache DNS Local:**
```bash
# Windows
ipconfig /flushdns

# Linux/Mac
sudo systemctl flush-dns
```

#### **3. Testar em Modo Incógnito:**
- Abrir navegador em modo privado
- Testar a URL novamente

#### **4. Testar em Outro Navegador:**
- Chrome, Firefox, Edge, Safari
- Verificar se o problema é específico do navegador

#### **5. Testar de Outro Dispositivo:**
- Celular, tablet, outro computador
- Verificar se o problema é local

---

## 🔍 **COMANDOS DE DIAGNÓSTICO**

### **Verificar DNS:**
```bash
# DNS local
nslookup lunasdigital.com.br

# DNS específico
nslookup lunasdigital.com.br 8.8.8.8
nslookup lunasdigital.com.br 1.1.1.1
```

### **Verificar Conectividade:**
```bash
# Teste de ping
ping lunasdigital.com.br

# Teste de porta
Test-NetConnection lunasdigital.com.br -Port 443

# Teste de SSL
openssl s_client -connect lunasdigital.com.br:443 -servername lunasdigital.com.br
```

### **Verificar SSL:**
```bash
# Teste HTTP
curl -I http://lunasdigital.com.br

# Teste HTTPS
curl -I https://lunasdigital.com.br

# Teste específico
curl -I https://lunasdigital.com.br/fgts
```

---

## 📊 **MONITORAMENTO PÓS-RESOLUÇÃO**

### **Verificações Regulares:**
```bash
# Script de verificação
#!/bin/bash
echo "=== VERIFICAÇÃO SSL/DNS ==="
echo "Data: $(date)"
echo "DNS:"
nslookup lunasdigital.com.br
echo "Conectividade:"
curl -I https://lunasdigital.com.br/fgts
echo "SSL:"
openssl s_client -connect lunasdigital.com.br:443 -servername lunasdigital.com.br < /dev/null 2>/dev/null | grep -E "(Protocol|Cipher|Verify return code)"
```

### **Alertas:**
- **DNS**: Verificar se não há IPs duplicados
- **SSL**: Verificar se certificado está válido
- **Conectividade**: Verificar se site responde

---

## 🚀 **PREVENÇÃO**

### **1. Configuração DNS Correta:**
- **Apenas um IP A** para o domínio principal
- **Apenas um IP A** para www
- **Verificar regularmente** se não há duplicatas

### **2. Monitoramento:**
- **Verificar DNS** semanalmente
- **Testar SSL** regularmente
- **Configurar alertas** para problemas

### **3. Backup:**
- **Salvar configuração DNS** atual
- **Documentar alterações** feitas
- **Ter plano de rollback** se necessário

---

## 📞 **SUPORTE TÉCNICO**

### **Informações para Suporte:**
```bash
# Coletar informações
echo "=== DIAGNÓSTICO SSL/DNS ===" > /tmp/ssl-diagnostic.txt
echo "Data: $(date)" >> /tmp/ssl-diagnostic.txt
echo "DNS:" >> /tmp/ssl-diagnostic.txt
nslookup lunasdigital.com.br >> /tmp/ssl-diagnostic.txt
echo "Conectividade:" >> /tmp/ssl-diagnostic.txt
Test-NetConnection lunasdigital.com.br -Port 443 >> /tmp/ssl-diagnostic.txt
echo "SSL:" >> /tmp/ssl-diagnostic.txt
curl -I https://lunasdigital.com.br/fgts >> /tmp/ssl-diagnostic.txt
cat /tmp/ssl-diagnostic.txt
```

### **Checklist de Resolução:**
- [ ] DNS resolve apenas para IP correto?
- [ ] Conectividade na porta 443 funciona?
- [ ] SSL responde com status 200?
- [ ] Site carrega no navegador?
- [ ] Cadeado verde aparece?
- [ ] Teste em modo incógnito funciona?

---

## 🎯 **RESUMO DA SOLUÇÃO**

### **Problema:**
- Domínio resolvendo para dois IPs
- Um IP sem SSL configurado
- Navegador tentando acessar IP sem SSL

### **Solução:**
- Remover IP duplicado do DNS
- Manter apenas IP com SSL configurado
- Aguardar propagação DNS

### **Resultado:**
- Site funciona via HTTPS
- SSL funcionando corretamente
- Navegador acessa IP correto

---

**Última atualização**: 01/10/2025  
**Versão**: 1.0  
**Status**: ✅ Problema resolvido  
**Causa**: DNS com IPs duplicados  
**Solução**: Remoção de IP sem SSL

