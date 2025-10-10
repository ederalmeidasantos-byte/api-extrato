# 🔧 CORREÇÃO DO ERRO SSL - ERR_CERT_COMMON_NAME_INVALID

## ❌ PROBLEMA IDENTIFICADO
**Erro**: `net::ERR_CERT_COMMON_NAME_INVALID`
**Causa**: Certificado SSL não configurado para o subdomínio `fgts.lunasdigital.com.br`

## 🚀 SOLUÇÕES PARA CORRIGIR

### 📋 **OPÇÃO 1: CONFIGURAR CERTIFICADO PARA SUBDOMÍNIO**

#### 1. Acessar o VPS
```bash
ssh user@72.60.159.149
```

#### 2. Instalar Certbot (se não estiver instalado)
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

#### 3. Gerar certificado específico para o subdomínio
```bash
sudo certbot --nginx -d fgts.lunasdigital.com.br
```

#### 4. Verificar se o certificado foi criado
```bash
sudo ls -la /etc/letsencrypt/live/fgts.lunasdigital.com.br/
```

### 📋 **OPÇÃO 2: USAR CERTIFICADO WILDCARD**

#### 1. Gerar certificado wildcard para *.lunasdigital.com.br
```bash
sudo certbot certonly --manual --preferred-challenges dns -d *.lunasdigital.com.br
```

#### 2. Configurar DNS TXT record conforme solicitado pelo Certbot

#### 3. Atualizar configuração Nginx para usar certificado wildcard
```nginx
ssl_certificate /etc/letsencrypt/live/lunasdigital.com.br/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/lunasdigital.com.br/privkey.pem;
```

### 📋 **OPÇÃO 3: CONFIGURAÇÃO TEMPORÁRIA (SEM SSL)**

#### 1. Usar apenas HTTP temporariamente
```nginx
server {
    listen 80;
    server_name fgts.lunasdigital.com.br;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔍 **VERIFICAÇÕES NECESSÁRIAS**

### 1. Verificar se o DNS está propagado
```bash
nslookup fgts.lunasdigital.com.br
# Deve retornar: 72.60.159.149
```

### 2. Verificar se o container está rodando
```bash
docker ps | grep fgts
```

### 3. Testar conectividade local
```bash
curl http://localhost:3005/fgts/status
```

## 🎯 **SOLUÇÃO RECOMENDADA**

### **PASSO A PASSO COMPLETO:**

#### 1. **Configurar certificado específico:**
```bash
sudo certbot --nginx -d fgts.lunasdigital.com.br
```

#### 2. **Verificar configuração Nginx:**
```bash
sudo nginx -t
```

#### 3. **Recarregar Nginx:**
```bash
sudo nginx -s reload
```

#### 4. **Testar HTTPS:**
```bash
curl -I https://fgts.lunasdigital.com.br
```

## ⚠️ **ALTERNATIVA TEMPORÁRIA**

Se o certificado não funcionar imediatamente, pode usar HTTP temporariamente:

**Acesso temporário**: http://fgts.lunasdigital.com.br

## 🔧 **COMANDOS DE DEBUG**

### Verificar certificados existentes:
```bash
sudo certbot certificates
```

### Verificar configuração Nginx:
```bash
sudo nginx -T | grep -A 20 "fgts.lunasdigital.com.br"
```

### Testar conectividade:
```bash
telnet fgts.lunasdigital.com.br 443
```

---

## 🎯 **PRÓXIMO PASSO**

Execute no VPS:
```bash
sudo certbot --nginx -d fgts.lunasdigital.com.br
```

Isso deve resolver o erro SSL e permitir acesso seguro via HTTPS!
