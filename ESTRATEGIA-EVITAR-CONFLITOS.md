# 🎯 ESTRATÉGIA PARA EVITAR CONFLITOS - SISTEMA LUNAS DIGITAL

## 📋 **ANÁLISE DOS PROBLEMAS ENFRENTADOS**

### **1. Problemas Identificados:**
- ❌ Nginx sempre se desconfigurava (IPs hardcoded)
- ❌ Google Fonts bloqueados por CSP duplo
- ❌ Arquivos não encontrados (detalhes-proposta-padronizado.html)
- ❌ Conflitos de headers CSP entre nginx e Node.js
- ❌ Containers com nomes inconsistentes

### **2. Causas Raiz:**
- **Configuração nginx:** Uso de IPs em vez de nomes de containers
- **CSP conflitante:** Express.static + nginx enviando headers diferentes
- **Arquivos desatualizados:** Código local vs servidor não sincronizados
- **Falta de padronização:** Nomes de containers inconsistentes

---

## 🚀 **ESTRATÉGIA RECOMENDADA**

### **1. PADRÃO DE NOMENCLATURA**
```yaml
# ✅ PADRÃO RECOMENDADO
containers:
  - nginx-lunasdigital
  - servidor-principal-lunasdigital  
  - api-simulador-lunasdigital
  - crm-lunasdigital
  - base-dados-lunasdigital

# ❌ EVITAR
containers:
  - nginx
  - servidor-principal
  - api-simulador
  - crm
  - base-dados
```

### **2. CONFIGURAÇÃO NGINX ROBUSTA**
```nginx
# ✅ SEMPRE usar nomes de containers
upstream servidor_principal {
    server servidor-principal-lunasdigital:3000;
    keepalive 32;
}

upstream crm {
    server crm-lunasdigital:3001;
    keepalive 32;
}

# ✅ CSP único e consistente
add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; img-src 'self' data: https:;" always;
```

### **3. MIDDLEWARE NODE.JS CORRETO**
```javascript
// ✅ Remover CSP automático do express.static
app.use('/', express.static(path.join(__dirname), {
  setHeaders: (res, path) => {
    res.removeHeader('Content-Security-Policy');
  }
}));
```

---

## 🔧 **IMPLEMENTAÇÃO RECOMENDADA**

### **FASE 1: PADRONIZAÇÃO IMEDIATA**

#### **1.1 Atualizar docker-compose.yml**
```yaml
services:
  nginx-lunasdigital:
    container_name: nginx-lunasdigital
    # ... configurações

  servidor-principal-lunasdigital:
    container_name: servidor-principal-lunasdigital
    # ... configurações

  api-simulador-lunasdigital:
    container_name: api-simulador-lunasdigital
    # ... configurações

  crm-lunasdigital:
    container_name: crm-lunasdigital
    # ... configurações

  base-dados-lunasdigital:
    container_name: base-dados-lunasdigital
    # ... configurações
```

#### **1.2 Atualizar nginx.conf**
```nginx
# Usar SEMPRE nomes completos dos containers
upstream servidor_principal {
    server servidor-principal-lunasdigital:3000;
}

upstream crm {
    server crm-lunasdigital:3001;
}

upstream api_simulador {
    server api-simulador-lunasdigital:3002;
}

upstream base_dados {
    server base-dados-lunasdigital:3003;
}
```

### **FASE 2: MIDDLEWARE CONSISTENTE**

#### **2.1 Padrão para todos os servidores Node.js**
```javascript
// Template padrão para todos os servidores
app.use('/', express.static(path.join(__dirname), {
  setHeaders: (res, path) => {
    // Remover CSP automático - deixar nginx gerenciar
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Type-Options');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('X-XSS-Protection');
    res.removeHeader('Referrer-Policy');
  }
}));
```

#### **2.2 CSP apenas no nginx**
```nginx
# CSP único e centralizado no nginx
add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; img-src 'self' data: https:;" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### **FASE 3: DEPLOY AUTOMATIZADO**

#### **3.1 Script de Deploy Seguro**
```powershell
# deploy-seguro.ps1
Write-Host "🚀 DEPLOY SEGURO - LUNAS DIGITAL" -ForegroundColor Blue

# 1. Backup automático
Write-Host "📦 Fazendo backup..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker exec nginx-lunasdigital cp /etc/nginx/nginx.conf /etc/nginx/nginx-backup-$(date +%Y%m%d-%H%M%S).conf"

# 2. Parar containers
Write-Host "⏹️ Parando containers..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker stop nginx-lunasdigital api-simulador-lunasdigital servidor-principal-lunasdigital crm-lunasdigital base-dados-lunasdigital"

# 3. Atualizar código
Write-Host "📥 Atualizando código..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "cd /root/api-lunas && git pull origin master"

# 4. Rebuild containers
Write-Host "🔨 Rebuild containers..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "cd /root/api-lunas && docker compose up -d --build"

# 5. Testar configuração
Write-Host "🧪 Testando..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker exec nginx-lunasdigital nginx -t"

# 6. Verificar funcionamento
Write-Host "✅ Verificando..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "curl -I http://localhost/health"

Write-Host "🎉 DEPLOY CONCLUÍDO!" -ForegroundColor Green
```

#### **3.2 Validação Automática**
```powershell
# validar-sistema.ps1
Write-Host "🔍 VALIDAÇÃO DO SISTEMA" -ForegroundColor Blue

# Verificar containers
Write-Host "🐳 Verificando containers..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker ps --format 'table {{.Names}}\t{{.Status}}'"

# Verificar nginx
Write-Host "🌐 Verificando nginx..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker exec nginx-lunasdigital nginx -t"

# Verificar CSP
Write-Host "🔒 Verificando CSP..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "curl -I https://lunasdigital.com.br/ | grep Content-Security-Policy"

# Verificar Google Fonts
Write-Host "🎨 Verificando Google Fonts..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "curl -I https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"

Write-Host "✅ VALIDAÇÃO CONCLUÍDA!" -ForegroundColor Green
```

---

## 📊 **MONITORAMENTO CONTÍNUO**

### **1. Health Checks Automáticos**
```bash
# Verificar status dos containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar logs de erro
docker logs nginx-lunasdigital --tail=20 | grep -i error
docker logs api-simulador-lunasdigital --tail=20 | grep -i error

# Verificar conectividade
curl -I https://lunasdigital.com.br/health
curl -I https://inss.lunasdigital.com.br/health
```

### **2. Alertas Automáticos**
```bash
# Script de monitoramento
#!/bin/bash
if ! curl -f https://lunasdigital.com.br/health > /dev/null 2>&1; then
    echo "ALERTA: Sistema principal não responde!"
    # Enviar notificação
fi

if ! curl -f https://inss.lunasdigital.com.br/health > /dev/null 2>&1; then
    echo "ALERTA: Sistema INSS não responde!"
    # Enviar notificação
fi
```

---

## 🎯 **RECOMENDAÇÕES FINAIS**

### **✅ FAZER:**
1. **Sempre usar nomes completos** dos containers
2. **CSP apenas no nginx** - remover dos Node.js
3. **Backup antes de qualquer mudança**
4. **Testar configuração** antes de aplicar
5. **Deploy automatizado** com validação
6. **Monitoramento contínuo** do sistema

### **❌ EVITAR:**
1. **IPs hardcoded** em configurações
2. **CSP duplo** (nginx + Node.js)
3. **Nomes de containers curtos** (conflitos)
4. **Deploy manual** sem backup
5. **Mudanças sem teste** prévio
6. **Headers de segurança** em múltiplos lugares

### **🚀 PRÓXIMOS PASSOS:**
1. **Implementar padrão** de nomenclatura
2. **Centralizar CSP** no nginx
3. **Criar scripts** de deploy seguro
4. **Configurar monitoramento** automático
5. **Documentar procedimentos** padrão

---

## 📈 **BENEFÍCIOS ESPERADOS**

### **✅ Estabilidade:**
- Nginx não se desconfigura mais
- Containers sempre funcionam
- CSP consistente e funcional

### **✅ Manutenibilidade:**
- Configuração clara e padronizada
- Deploy automatizado e seguro
- Monitoramento proativo

### **✅ Performance:**
- Sem reconexões desnecessárias
- Headers otimizados
- Cache eficiente

### **✅ Segurança:**
- CSP configurado corretamente
- Headers de segurança consistentes
- Monitoramento de falhas

---

**📅 Estratégia criada em:** 13/10/2025  
**👤 Responsável:** Assistente IA  
**🎯 Objetivo:** Evitar conflitos e garantir estabilidade do sistema  
**📊 Status:** ✅ **PRONTO PARA IMPLEMENTAÇÃO**
