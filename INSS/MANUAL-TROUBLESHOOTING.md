# 🆘 MANUAL DE TROUBLESHOOTING - SISTEMA INSS

## 🎯 **STATUS: SISTEMA FUNCIONANDO - GUIA DE EMERGÊNCIA**

**Data**: 03/01/2025  
**Ambiente**: Produção  
**Status**: ✅ OPERACIONAL

---

## 🚨 **PROBLEMAS COMUNS E SOLUÇÕES**

### **1. 🔴 Container não inicia**

#### **Sintomas:**
```bash
docker ps
# Container não aparece na lista ou status "Exited"
```

#### **Diagnóstico:**
```bash
# Verificar logs do container
docker logs api-simulador-lunasdigital
docker logs nginx-lunasdigital
docker logs servidor-principal-lunasdigital

# Verificar se porta está em uso
netstat -tulpn | grep :3002
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

#### **Soluções:**
```bash
# 1. Reiniciar container
docker restart api-simulador-lunasdigital

# 2. Se não funcionar, recriar
docker-compose -f docker-compose-lunasdigital.yml up -d api-simulador

# 3. Se porta em uso, matar processo
sudo kill -9 $(lsof -t -i:3002)
docker restart api-simulador-lunasdigital
```

---

### **2. 🔴 Nginx retorna 502 Bad Gateway**

#### **Sintomas:**
```bash
curl https://inss.lunasdigital.com.br/api/calcular/7539
# HTTP/1.1 502 Bad Gateway
```

#### **Diagnóstico:**
```bash
# Verificar logs Nginx
docker logs nginx-lunasdigital --tail 20

# Verificar se API está rodando
docker ps | grep api-simulador

# Testar conectividade interna
docker exec nginx-lunasdigital ping api-simulador-lunasdigital
```

#### **Soluções:**
```bash
# 1. Verificar configuração Nginx
docker exec nginx-lunasdigital nginx -t

# 2. Reiniciar Nginx
docker restart nginx-lunasdigital

# 3. Verificar IPs dos containers
docker network inspect lunas-network

# 4. Atualizar IPs no nginx.conf se necessário
# Editar nginx.conf com IPs corretos
docker restart nginx-lunasdigital
```

---

### **3. 🔴 API retorna 404 Not Found**

#### **Sintomas:**
```bash
curl https://inss.lunasdigital.com.br/extrair
# HTTP/1.1 404 Not Found
```

#### **Diagnóstico:**
```bash
# Verificar se endpoint existe
docker exec api-simulador-lunasdigital curl http://localhost:3002/extrair

# Verificar logs da API
docker logs api-simulador-lunasdigital --tail 20

# Verificar arquivo server-inss.js
docker exec api-simulador-lunasdigital ls -la /app/INSS/server-inss.js
```

#### **Soluções:**
```bash
# 1. Reiniciar container API
docker restart api-simulador-lunasdigital

# 2. Se arquivo corrompido, restaurar backup
cp backup/server-inss.js INSS/
docker restart api-simulador-lunasdigital

# 3. Verificar se volume está montado corretamente
docker inspect api-simulador-lunasdigital | grep Mounts
```

---

### **4. 🔴 Timeout na API /extrair**

#### **Sintomas:**
```bash
curl -X POST https://inss.lunasdigital.com.br/extrair \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "fileId=7539&idoportunidade=36337"
# Timeout após 30s
```

#### **Diagnóstico:**
```bash
# Verificar logs da API
docker logs api-simulador-lunasdigital --follow

# Verificar timeout Nginx
grep -n "proxy_read_timeout" nginx/nginx.conf

# Testar diretamente no container
docker exec api-simulador-lunasdigital curl -X POST http://localhost:3002/extrair \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "fileId=7539&idoportunidade=36337"
```

#### **Soluções:**
```bash
# 1. Verificar se timeout está configurado
# nginx.conf deve ter:
# proxy_read_timeout 180s;

# 2. Reiniciar Nginx
docker restart nginx-lunasdigital

# 3. Se ChatGPT demorar muito, verificar API key
docker exec api-simulador-lunasdigital env | grep OPENAI
```

---

### **5. 🔴 Certificado SSL inválido**

#### **Sintomas:**
```bash
curl https://inss.lunasdigital.com.br/api/calcular/7539
# SSL certificate problem: unable to get local issuer certificate
```

#### **Diagnóstico:**
```bash
# Verificar certificados
ls -la /etc/letsencrypt/live/inss.lunasdigital.com.br/

# Verificar validade
openssl x509 -in /etc/letsencrypt/live/inss.lunasdigital.com.br/fullchain.pem -text -noout | grep "Not After"

# Verificar logs Nginx
docker logs nginx-lunasdigital | grep SSL
```

#### **Soluções:**
```bash
# 1. Renovar certificado
certbot renew

# 2. Reiniciar Nginx
docker restart nginx-lunasdigital

# 3. Se não funcionar, gerar novo certificado
certbot certonly --standalone -d inss.lunasdigital.com.br
docker restart nginx-lunasdigital
```

---

### **6. 🔴 Cache não funciona**

#### **Sintomas:**
```bash
# Sempre processa com ChatGPT, nunca retorna cache
```

#### **Diagnóstico:**
```bash
# Verificar diretório cache
ls -la var/data/extratos/

# Verificar permissões
ls -la var/data/extratos/extrato_7539.json

# Verificar logs
docker logs api-simulador-lunasdigital | grep cache
```

#### **Soluções:**
```bash
# 1. Verificar permissões
chmod 755 var/data/extratos/
chmod 644 var/data/extratos/*.json

# 2. Reiniciar container
docker restart api-simulador-lunasdigital

# 3. Se volume não montado, verificar docker-compose
docker inspect api-simulador-lunasdigital | grep Mounts
```

---

## 🔧 **COMANDOS DE DIAGNÓSTICO RÁPIDO**

### **Status Geral do Sistema**
```bash
#!/bin/bash
echo "=== STATUS DOS CONTAINERS ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n=== LOGS RECENTES API SIMULADOR ==="
docker logs api-simulador-lunasdigital --tail 5

echo -e "\n=== LOGS RECENTES NGINX ==="
docker logs nginx-lunasdigital --tail 5

echo -e "\n=== TESTE CONECTIVIDADE ==="
curl -s -o /dev/null -w "%{http_code}" https://inss.lunasdigital.com.br/api/calcular/7539
echo " - Status API calcular"

curl -s -o /dev/null -w "%{http_code}" https://inss.lunasdigital.com.br/extrair
echo " - Status API extrair"
```

### **Verificação Completa**
```bash
#!/bin/bash
echo "=== VERIFICAÇÃO COMPLETA DO SISTEMA ==="

echo "1. Containers rodando:"
docker ps

echo -e "\n2. Rede Docker:"
docker network inspect lunas-network | grep -A 5 "Containers"

echo -e "\n3. Volumes montados:"
docker inspect api-simulador-lunasdigital | grep -A 10 "Mounts"

echo -e "\n4. Certificados SSL:"
ls -la /etc/letsencrypt/live/inss.lunasdigital.com.br/

echo -e "\n5. Cache de extratos:"
ls -la var/data/extratos/ | head -5

echo -e "\n6. Teste APIs:"
echo "Extrair: $(curl -s -o /dev/null -w "%{http_code}" https://inss.lunasdigital.com.br/extrair)"
echo "Calcular: $(curl -s -o /dev/null -w "%{http_code}" https://inss.lunasdigital.com.br/api/calcular/7539)"
```

---

## 🚀 **PROCEDIMENTOS DE EMERGÊNCIA**

### **Sistema Completamente Parado**
```bash
#!/bin/bash
echo "=== PROCEDIMENTO DE EMERGÊNCIA ==="

# 1. Parar tudo
docker-compose -f docker-compose-lunasdigital.yml down

# 2. Limpar containers órfãos
docker container prune -f

# 3. Verificar portas em uso
netstat -tulpn | grep -E ":(80|443|3000|3002|3003)"

# 4. Matar processos se necessário
sudo kill -9 $(lsof -t -i:80) 2>/dev/null
sudo kill -9 $(lsof -t -i:443) 2>/dev/null
sudo kill -9 $(lsof -t -i:3000) 2>/dev/null
sudo kill -9 $(lsof -t -i:3002) 2>/dev/null

# 5. Reiniciar sistema
docker-compose -f docker-compose-lunasdigital.yml up -d

# 6. Aguardar inicialização
sleep 30

# 7. Verificar status
docker ps
```

### **Restauração de Backup**
```bash
#!/bin/bash
echo "=== RESTAURAÇÃO DE BACKUP ==="

# 1. Parar containers
docker-compose -f docker-compose-lunasdigital.yml down

# 2. Restaurar arquivos críticos
cp backup/server-inss.js INSS/
cp backup/nginx.conf nginx/
cp backup/docker-compose-lunasdigital.yml .

# 3. Restaurar dados se necessário
if [ -f "backup/var-data-$(date +%Y%m%d).tar.gz" ]; then
    tar -xzf backup/var-data-$(date +%Y%m%d).tar.gz
fi

# 4. Reiniciar sistema
docker-compose -f docker-compose-lunasdigital.yml up -d

# 5. Verificar funcionamento
sleep 30
curl -s -o /dev/null -w "%{http_code}" https://inss.lunasdigital.com.br/api/calcular/7539
```

---

## 📊 **MONITORAMENTO CONTÍNUO**

### **Script de Monitoramento**
```bash
#!/bin/bash
# monitor-sistema.sh

LOG_FILE="/var/log/sistema-inss-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Verificar containers
CONTAINERS=$(docker ps --format "{{.Names}}" | grep -E "(api-simulador|nginx|servidor-principal)")
if [ -z "$CONTAINERS" ]; then
    echo "[$DATE] ERRO: Containers não estão rodando" >> $LOG_FILE
    # Enviar alerta (email, Slack, etc.)
fi

# Verificar APIs
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://inss.lunasdigital.com.br/api/calcular/7539)
if [ "$API_STATUS" != "200" ]; then
    echo "[$DATE] ERRO: API retornou status $API_STATUS" >> $LOG_FILE
fi

# Verificar espaço em disco
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "[$DATE] ALERTA: Espaço em disco ${DISK_USAGE}%" >> $LOG_FILE
fi

echo "[$DATE] Sistema OK" >> $LOG_FILE
```

### **Cron Job para Monitoramento**
```bash
# Adicionar ao crontab
# */5 * * * * /root/monitor-sistema.sh
```

---

## 📞 **CONTATOS DE EMERGÊNCIA**

### **Níveis de Prioridade**

#### **🔴 CRÍTICO (Sistema fora do ar)**
- **Ação**: Procedimento de emergência imediato
- **Tempo**: 5 minutos para resposta
- **Escalação**: Contatar responsável técnico

#### **🟡 ALTO (Funcionalidade limitada)**
- **Ação**: Diagnóstico e correção
- **Tempo**: 30 minutos para resposta
- **Escalação**: Verificar logs e aplicar soluções

#### **🟢 BAIXO (Problemas menores)**
- **Ação**: Monitoramento e documentação
- **Tempo**: 2 horas para resposta
- **Escalação**: Agendar manutenção

---

## 📋 **CHECKLIST DE EMERGÊNCIA**

### **Antes de Qualquer Alteração**
- [ ] Fazer backup completo
- [ ] Documentar estado atual
- [ ] Testar em ambiente de desenvolvimento
- [ ] Ter plano de rollback

### **Durante Problemas**
- [ ] Verificar logs primeiro
- [ ] Não alterar múltiplas coisas simultaneamente
- [ ] Documentar todas as ações
- [ ] Testar após cada correção

### **Após Resolução**
- [ ] Verificar funcionamento completo
- [ ] Atualizar documentação
- [ ] Criar procedimento para evitar recorrência
- [ ] Notificar stakeholders

---

## 📚 **RECURSOS ADICIONAIS**

### **Logs Importantes**
```bash
# Logs do sistema
/var/log/sistema-inss-monitor.log

# Logs Docker
docker logs api-simulador-lunasdigital
docker logs nginx-lunasdigital
docker logs servidor-principal-lunasdigital

# Logs Nginx
docker exec nginx-lunasdigital cat /var/log/nginx/error.log
```

### **Arquivos de Configuração**
```bash
# Configurações críticas
nginx/nginx.conf
docker-compose-lunasdigital.yml
INSS/server-inss.js
config-vps-restructured.env
```

### **Diretórios de Dados**
```bash
# Dados importantes
var/data/extratos/     # Cache de PDFs processados
var/data/propostas/    # Propostas salvas
var/data/logs/         # Logs da aplicação
```

---

**⚠️ IMPORTANTE: Este manual deve ser consultado antes de qualquer alteração no sistema. Sempre fazer backup antes de modificar arquivos críticos.**

**Última atualização**: 03/01/2025
