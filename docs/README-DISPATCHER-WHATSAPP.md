# 📱 Disparador WhatsApp Kentro - Documentação Completa

## 🎯 **Visão Geral**

Sistema completo de disparo em massa de mensagens WhatsApp via API Kentro, integrado à arquitetura Lunas Digital com interface web para gerenciamento e monitoramento em tempo real.

---

## 🏗️ **Arquitetura Integrada**

### **Container WhatsApp Dispatcher**
```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA LUNAS DIGITAL                        │
├─────────────────────────────────────────────────────────────────┤
│  🌐 nginx-lunasdigital (Porta 80/443)                          │
│     ├── lunasdigital.com.br → servidor-principal:3000          │
│     ├── inss.lunasdigital.com.br → api-simulador:3002          │
│     ├── crm.lunasdigital.com.br → crm-lunasdigital:3001        │
│     └── /whatsapp/ → whatsapp-dispatcher:3004                  │
├─────────────────────────────────────────────────────────────────┤
│  📱 whatsapp-dispatcher (Porta 3004) - NOVO                    │
│     └── Sistema de disparo WhatsApp via API Kentro             │
├─────────────────────────────────────────────────────────────────┤
│  🖥️ servidor-principal (Porta 3000)                            │
│     └── Sistema principal Lunas Digital                       │
├─────────────────────────────────────────────────────────────────┤
│  🧮 api-simulador-lunasdigital (Porta 3002)                    │
│     └── Simulador INSS + APIs relacionadas                     │
├─────────────────────────────────────────────────────────────────┤
│  📊 crm-lunasdigital (Porta 3001)                              │
│     └── Sistema CRM + Interface Operacional                    │
├─────────────────────────────────────────────────────────────────┤
│  🗄️ base-dados-lunasdigital (Porta 3003)                      │
│     └── API de dados (clientes/propostas)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 **URLs de Acesso**

### **Interface WhatsApp Dispatcher**
- **URL Principal**: `http://72.60.159.149/whatsapp/`
- **URL Alternativa**: `https://lunasdigital.com.br/whatsapp/`
- **Container**: `whatsapp-dispatcher:3004`
- **Função**: Sistema de disparo em massa WhatsApp

### **APIs do Disparador**
- **Status**: `http://72.60.159.149/whatsapp/api/status`
- **Disparar**: `http://72.60.159.149/whatsapp/api/disparar`
- **Histórico**: `http://72.60.159.149/whatsapp/api/historico`
- **Logs SSE**: `http://72.60.159.149/whatsapp/api/logs`

---

## 🚀 **Funcionalidades Principais**

### **1. Interface Web Responsiva**
- **Dashboard em tempo real** com contadores de status
- **Formulário de disparo** com validação automática
- **Logs detalhados** com filtros e atualização via SSE
- **Controles de pausar/retomar/limpar** fila

### **2. Sistema de Fila Inteligente**
- **Processamento sequencial** (evita rate limit da API Kentro)
- **Retry automático** com backoff exponencial (máximo 3 tentativas)
- **Delay configurável** entre disparos (padrão 2 segundos)
- **Normalização automática** de números brasileiros

### **3. Integração API Kentro**
- **Endpoint**: `https://lunasdigital.atenderbem.com/int/sendWaTemplate`
- **API Key**: `cd4d0509169d4e2ea9177ac66c1c9376`
- **Queue ID**: `25` (configurável)
- **Template ID**: `99` (configurável)

### **4. Monitoramento e Logs**
- **Server-Sent Events** para logs em tempo real
- **Mascaramento de números** para privacidade
- **Histórico persistente** em arquivos JSON
- **Métricas de performance** e taxa de sucesso

---

## 📊 **Estrutura de Dados**

### **Arquivos de Armazenamento**
```
@KENTRO API/data/
├── dispatcher-queue.json      # Fila atual de disparos
├── dispatcher-history.json    # Histórico completo
└── dispatcher-config.json     # Configurações do sistema
```

### **Estrutura da Fila**
```json
{
  "processing": false,
  "currentIndex": 0,
  "items": [
    {
      "id": "uuid-v4",
      "number": "5511959088554",
      "templateId": 99,
      "queueId": 25,
      "data": ["nome"],
      "status": "pending|processing|success|failed",
      "attempts": 0,
      "error": null,
      "response": null,
      "createdAt": "2025-01-14T16:30:00.000Z",
      "processedAt": null
    }
  ]
}
```

---

## 🔧 **Configuração e Deploy**

### **1. Variáveis de Ambiente**
```bash
# config-vps-restructured.env
PORT_WHATSAPP_DISPATCHER=3004
KENTRO_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376
KENTRO_QUEUE_ID=25
KENTRO_TEMPLATE_ID=99
DISPATCH_DELAY=2000
MAX_RETRIES=3
MAX_BATCH_SIZE=1000
ALLOWED_ORIGINS=http://localhost:3004,http://72.60.159.149:3004,http://72.60.159.149:80
```

### **2. Docker Compose**
```yaml
# docker-compose.yml
whatsapp-dispatcher:
  build:
    context: ./@KENTRO API
    dockerfile: Dockerfile.whatsapp
  ports:
    - "3004:3004"
  env_file:
    - config-vps-restructured.env
  environment:
    - NODE_ENV=production
    - PORT=3004
    - CONTAINER_NAME=whatsapp-dispatcher
  networks:
    - lunas-network
  volumes:
    - ./@KENTRO API/data:/app/data
```

### **3. Nginx Configuration**
```nginx
# nginx/nginx.conf
upstream whatsapp_dispatcher {
    server whatsapp-dispatcher:3004;
    keepalive 32;
}

location /whatsapp/ {
    limit_req zone=static burst=20 nodelay;
    proxy_pass http://whatsapp_dispatcher/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Configurações específicas para SSE
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 24h;
    proxy_send_timeout 24h;
    
    add_header Cache-Control no-cache;
    add_header Connection keep-alive;
}
```

---

## 🚀 **Comandos de Deploy**

### **Deploy Manual**
```bash
# 1. Conectar ao VPS
ssh root@72.60.159.149

# 2. Navegar para o projeto
cd /root/API\ Lunas

# 3. Atualizar código
git pull origin master

# 4. Build e deploy
docker-compose build whatsapp-dispatcher
docker-compose up -d whatsapp-dispatcher

# 5. Verificar status
docker-compose ps whatsapp-dispatcher
docker-compose logs whatsapp-dispatcher
```

### **Deploy Automático (GitHub Actions)**
```yaml
# .github/workflows/deploy-whatsapp.yml
name: Deploy WhatsApp Dispatcher
on:
  push:
    paths:
      - '@KENTRO API/whatsapp-dispatcher-server.js'
      - '@KENTRO API/whatsapp-dispatcher.html'
      - 'docker-compose.yml'
      - 'nginx/nginx.conf'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: 72.60.159.149
          username: root
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /root/API\ Lunas
            git pull origin master
            docker-compose build whatsapp-dispatcher
            docker-compose up -d whatsapp-dispatcher
            docker-compose restart nginx
```

---

## 🧪 **Testes e Validação**

### **Teste Local**
```bash
# Windows PowerShell
cd "@KENTRO API"
.\teste-local-disparador.ps1

# Linux/Mac
cd "@KENTRO API"
chmod +x teste-local-disparador.sh
./teste-local-disparador.sh
```

### **Teste de Conectividade**
```bash
# Testar container direto
curl http://localhost:3004/api/status

# Testar via Nginx
curl http://72.60.159.149/whatsapp/api/status

# Testar interface web
curl http://72.60.159.149/whatsapp/
```

### **Teste de Disparo**
```bash
# Disparo de teste
curl -X POST http://72.60.159.149/whatsapp/api/disparar \
  -H "Content-Type: application/json" \
  -d '{
    "numbers": ["11959088554", "11987654321"],
    "templateId": 99,
    "queueId": 25,
    "data": ["Teste"]
  }'
```

---

## 🔒 **Segurança e Validações**

### **Validações Implementadas**
- ✅ **Números brasileiros**: Validação de formato (55 + 11 dígitos)
- ✅ **Sanitização**: Remove caracteres especiais automaticamente
- ✅ **Rate limiting**: Máximo 1000 números por lote
- ✅ **CORS**: Configurado apenas para IPs permitidos
- ✅ **Mascaramento**: Números mascarados nos logs (11959****554)
- ✅ **Timeout**: 30 segundos por requisição à API Kentro

### **Configurações de Segurança**
```javascript
// Rate limiting no backend
const rateLimit = {
  limit: 10,        // 10 requisições por segundo
  window: 60000,     // Janela de 1 minuto
  burst: 20         // Burst de 20 requisições
};

// Validação de números
const phoneRegex = /^55\d{11}$/;
const maxBatchSize = 1000;
const maxRetries = 3;
```

---

## 📈 **Monitoramento e Métricas**

### **Logs em Tempo Real**
```bash
# Logs do container
docker-compose logs -f whatsapp-dispatcher

# Logs do Nginx
docker-compose logs -f nginx

# Logs específicos do WhatsApp
docker-compose logs whatsapp-dispatcher | grep "DISPATCH"
```

### **Métricas Disponíveis**
- **Total de disparos**: Números processados
- **Taxa de sucesso**: Percentual de disparos bem-sucedidos
- **Taxa de falha**: Percentual de disparos com erro
- **Tempo médio**: Tempo médio por disparo
- **Fila atual**: Números aguardando processamento

### **Dashboard de Status**
```json
{
  "total": 150,
  "success": 142,
  "failed": 5,
  "pending": 3,
  "isProcessing": true,
  "currentIndex": 145,
  "processingId": "uuid-v4"
}
```

---

## 🛠️ **Troubleshooting**

### **Problemas Comuns**

#### **1. Container não inicia**
```bash
# Verificar logs
docker-compose logs whatsapp-dispatcher

# Verificar se porta está livre
netstat -tulpn | grep 3004

# Rebuild da imagem
docker-compose build --no-cache whatsapp-dispatcher
```

#### **2. API Kentro não responde**
```bash
# Testar conectividade
curl -X POST https://lunasdigital.atenderbem.com/int/sendWaTemplate \
  -H "Content-Type: application/json" \
  -d '{
    "queueId": 25,
    "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
    "number": "11959088554",
    "templateId": 99,
    "data": ["teste"]
  }'
```

#### **3. Interface web não carrega**
```bash
# Verificar Nginx
docker-compose logs nginx

# Testar acesso direto
curl http://localhost:3004/

# Verificar configuração Nginx
docker-compose exec nginx nginx -t
```

#### **4. Logs SSE não funcionam**
- Verificar configurações do Nginx para SSE
- Confirmar que `proxy_buffering` está desabilitado
- Verificar timeout do proxy (24h configurado)

### **Comandos de Diagnóstico**
```bash
# Status geral do sistema
docker-compose ps

# Uso de recursos
docker stats whatsapp-dispatcher

# Verificar conectividade
curl -I http://72.60.159.149/whatsapp/

# Testar API
curl http://72.60.159.149/whatsapp/api/status
```

---

## 📚 **Documentação Relacionada**

### **Arquivos de Referência**
- `@KENTRO API/README-DEPLOY-WHATSAPP.md` - Guia completo de deploy
- `@KENTRO API/DEPLOY-SEM-DOMINIO.md` - Configuração sem domínio
- `@KENTRO API/teste-local-disparador.ps1` - Script de teste Windows
- `@KENTRO API/teste-local-disparador.sh` - Script de teste Linux

### **Integração com Sistema Existente**
- **CRM**: Integração via API Kentro para disparos automáticos
- **Base de Dados**: Possível integração futura para histórico
- **Nginx**: Proxy reverso configurado para acesso unificado
- **Docker**: Container integrado à rede `lunas-network`

---

## ✅ **Checklist de Deploy**

- [ ] Código commitado e enviado para Git
- [ ] Container `whatsapp-dispatcher` buildado
- [ ] Serviço iniciado na porta 3004
- [ ] Nginx configurado com proxy reverso
- [ ] Variáveis de ambiente configuradas
- [ ] Interface web acessível
- [ ] API respondendo corretamente
- [ ] Teste de disparo realizado
- [ ] Logs SSE funcionando
- [ ] Monitoramento configurado

---

**Sistema WhatsApp Dispatcher integrado com sucesso à arquitetura Lunas Digital! 🎉**

**Acesso**: `http://72.60.159.149/whatsapp/`
