# 🌐 URLs E ENDPOINTS - SERVIDOR HOSTINGER

## 📋 **INFORMAÇÕES DO SERVIDOR**

### **Dados de Acesso:**
- **IP Principal**: 72.60.159.149
- **Hostname**: srv1035582.hstgr.cloud
- **IPv6**: 2a02:4780:66:b92f::1
- **Protocolo**: HTTP/HTTPS

---

## 🔗 **URLS PRINCIPAIS**

### **🌐 Acesso Web (ATUALIZADO 01/10/2025):**
- **Painel Principal**: https://lunasdigital.com.br/
- **Painel FGTS**: https://lunasdigital.com.br/fgts
- **Simulador**: https://lunasdigital.com.br/simulador
- **Status CPFs**: https://lunasdigital.com.br/status-cpfs
- **IP Direto**: http://72.60.159.149/ (backup)

### **🔌 APIs:**
- **Health Check**: http://72.60.159.149/api/health
- **Upload CSV**: http://72.60.159.149/api/upload-csv
- **Processar CPFs**: http://72.60.159.149/api/processar-cpfs
- **Status Processamento**: http://72.60.159.149/api/status-processamento

---

## 📊 **ENDPOINTS DETALHADOS**

### **🔍 Health Check:**
```bash
GET http://72.60.159.149/api/health
```
**Resposta:**
```json
{
  "status": "success",
  "message": "API funcionando",
  "timestamp": "2025-09-29T20:28:02.420Z",
  "uptime": 397.8827132,
  "environment": "production",
  "services": {
    "pdf": "ativo",
    "fgts": "ativo",
    "simulador": "ativo",
    "cache": "ativo"
  }
}
```

### **📤 Upload CSV:**
```bash
POST http://72.60.159.149/api/upload-csv
Content-Type: multipart/form-data
```
**Parâmetros:**
- `file`: Arquivo CSV com CPFs
- `tipo`: Tipo de processamento

### **⚡ Processar CPFs:**
```bash
POST http://72.60.159.149/api/processar-cpfs
Content-Type: application/json
```
**Body:**
```json
{
  "cpfs": ["12345678901", "98765432100"],
  "tipo": "fgts",
  "prioridade": "normal"
}
```

### **📊 Status Processamento:**
```bash
GET http://72.60.159.149/api/status-processamento
```
**Resposta:**
```json
{
  "status": "success",
  "total": 1000,
  "processados": 850,
  "pendentes": 150,
  "erros": 0,
  "tempo_estimado": "5 minutos"
}
```

---

## 🔌 **SOCKET.IO ENDPOINTS**

### **Conexão WebSocket:**
```javascript
const socket = io('http://72.60.159.149');
```

### **Eventos disponíveis:**
- `processamento_iniciado` - Processamento iniciado
- `processamento_progresso` - Progresso do processamento
- `processamento_concluido` - Processamento concluído
- `erro_processamento` - Erro no processamento
- `status_atualizado` - Status atualizado

---

## 📱 **PAINÉIS WEB**

### ** Painel Principal:**
- **URL**: http://72.60.159.149/
- **Funcionalidades**:
  - Upload de CSV
  - Monitoramento em tempo real
  - Estatísticas de processamento
  - Logs de sistema

### ** Painel FGTS:**
- **URL**: http://72.60.159.149/fgts
- **Funcionalidades**:
  - Consulta de FGTS
  - Processamento em lote
  - Status de CPFs
  - Relatórios

### ** Simulador:**
- **URL**: http://72.60.159.149/simulador
- **Funcionalidades**:
  - Simulação de consultas
  - Testes de performance
  - Validação de dados

---

## 🔐 **AUTENTICAÇÃO**

### **APIs Públicas:**
- `/api/health` - Health check
- `/api/status-processamento` - Status geral
- `/fgts` - Painel FGTS
- `/simulador` - Simulador

### **APIs Protegidas:**
- `/api/upload-csv` - Upload de arquivos
- `/api/processar-cpfs` - Processamento
- `/api/logs` - Logs do sistema
- `/api/cache` - Gerenciamento de cache

---

## 📊 **MONITORAMENTO**

### **Métricas disponíveis:**
- **Uptime**: Tempo de funcionamento
- **CPU**: Uso de processador
- **RAM**: Uso de memória
- **Storage**: Uso de disco
- **Network**: Tráfego de rede

### **Logs disponíveis:**
- **Aplicação**: `/root/api-extrato/logs/`
- **Nginx**: `/var/log/nginx/`
- **Sistema**: `/var/log/syslog`

---

## 🚀 **TESTES DE CONECTIVIDADE**

### **Teste básico:**
```bash
curl http://72.60.159.149/api/health
```

### **Teste de upload:**
```bash
curl -X POST -F "file=@teste.csv" http://72.60.159.149/api/upload-csv
```

### **Teste de processamento:**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"cpfs":["12345678901"],"tipo":"fgts"}' \
  http://72.60.159.149/api/processar-cpfs
```

---

## 🔄 **BACKUP E RESTAURE**

### **Backup automático:**
- **Frequência**: Diária
- **Local**: `/var/backups/api-extrato/`
- **Retenção**: 30 dias

### **Restauração:**
```bash
# Restaurar backup
pm2 stop api-extrato
cp /var/backups/api-extrato/backup-YYYY-MM-DD.tar.gz /root/
tar -xzf backup-YYYY-MM-DD.tar.gz
pm2 start api-extrato
```

---

## 📞 **SUPORTE TÉCNICO**

### **Comandos de diagnóstico:**
```bash
# Status geral
pm2 status && systemctl status nginx

# Logs de erro
pm2 logs api-extrato --err

# Teste de conectividade
curl -I http://72.60.159.149/api/health

# Verificação de recursos
htop
```

### **Contatos:**
- **Servidor**: srv1035582.hstgr.cloud
- **IP**: 72.60.159.149
- **SSH**: root@72.60.159.149

---

**Última atualização**: 29/09/2025
**Versão**: 1.0
**Status**: ✅ Ativo e funcionando
