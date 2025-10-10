# 🔄 Fluxo da API de Extração de Extrato

## 📊 **Diagrama de Fluxo**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CRM Kentro    │    │  API Extrato    │    │   API Lunas     │
│                 │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ 1. POST /extrair     │                      │
          │ {fileId, idoportunidade}                    │
          ├─────────────────────►│                      │
          │                      │                      │
          │                      │ 2. Verificar Cache   │
          │                      │ ┌─────────────────┐  │
          │                      │ │ Cache Hit?      │  │
          │                      │ │ - Sim: Retorna  │  │
          │                      │ │ - Não: Continua │  │
          │                      │ └─────────────────┘  │
          │                      │                      │
          │                      │ 3. POST /api/...     │
          │                      │ {queueId, apiKey,    │
          │                      │  fileId, download}   │
          │                      ├─────────────────────►│
          │                      │                      │
          │                      │ 4. PDF Response      │
          │                      │◄─────────────────────┤
          │                      │                      │
          │                      │ 5. Salvar PDF        │
          │                      │ var/data/uploads/    │
          │                      │                      │
          │                      │ 6. Processar com GPT │
          │                      │ ┌─────────────────┐  │
          │                      │ │ Upload PDF      │  │
          │                      │ │ GPT-4 Analysis  │  │
          │                      │ │ Extract JSON    │  │
          │                      │ └─────────────────┘  │
          │                      │                      │
          │                      │ 7. Salvar Cache      │
          │                      │ var/data/extratos/   │
          │                      │                      │
          │ 8. JSON Response     │                      │
          │ {fileId, idoportunidade, dados}             │
          │◄─────────────────────┤                      │
          │                      │                      │
          │ 9. Atualizar CRM     │                      │
          │ com dados extraídos  │                      │
          └─────────────────────►│                      │
                                 │                      │
```

## 🎯 **Detalhamento do Fluxo**

### **1. Requisição Inicial**
```
Kentro → API Extrato
POST /extrair
{
  "fileId": "7025",
  "idoportunidade": "36400"
}
```

### **2. Verificação de Cache**
```
API Extrato verifica:
- Arquivo existe? var/data/extratos/extrato_7025.json
- Cache válido? (TTL 24h)
- Se válido: Retorna dados + idoportunidade
- Se inválido: Continua processamento
```

### **3. Download da Lunas**
```
API Extrato → API Lunas
POST /api/...
{
  "queueId": 25,
  "apiKey": "***",
  "fileId": 7025,
  "download": true
}
```

### **4. Processamento com IA**
```
1. Upload PDF para OpenAI
2. Análise com GPT-4
3. Extração de dados estruturados
4. Validação e formatação
```

### **5. Resposta Final**
```
API Extrato → Kentro
{
  "fileId": "7025",
  "idoportunidade": "36400",
  "cliente": { ... },
  "dados_bancarios": { ... },
  "extrato": { ... },
  "simulador_link": "..."
}
```

## 🔧 **Componentes Técnicos**

### **Cache System**
```
┌─────────────────┐
│   Cache Layer   │
├─────────────────┤
│ TTL: 24 horas   │
│ Path: var/data/ │
│ Format: JSON    │
└─────────────────┘
```

### **AI Processing**
```
┌─────────────────┐
│  AI Processing  │
├─────────────────┤
│ Model: GPT-4    │
│ Fallback: 4o-mini│
│ Input: PDF      │
│ Output: JSON    │
└─────────────────┘
```

### **Error Handling**
```
┌─────────────────┐
│ Error Handling  │
├─────────────────┤
│ 400: Bad Request│
│ 404: Not Found  │
│ 500: Server Err │
│ Logs: Detailed  │
└─────────────────┘
```

## 📈 **Performance Metrics**

### **Tempos Típicos**
- **Cache Hit:** ~50ms
- **Download Lunas:** ~2-5s
- **GPT Processing:** ~10-30s
- **Total (Cache Miss):** ~15-40s

### **Throughput**
- **Concurrency:** 1 (fila sequencial)
- **Rate Limit:** OpenAI limits
- **Memory:** ~100MB per request

## 🔍 **Monitoring Points**

1. **Request Received** ✅
2. **Parameters Validated** ✅
3. **Cache Checked** ✅
4. **Lunas API Called** ✅
5. **PDF Downloaded** ✅
6. **GPT Processing** ✅
7. **JSON Generated** ✅
8. **Response Sent** ✅

## 🚨 **Error Scenarios**

### **Cenário 1: Cache Miss + Lunas Error**
```
1. Cache não encontrado
2. Erro na API Lunas (404, 500)
3. Retorna erro específico
4. Log detalhado
```

### **Cenário 2: GPT Processing Error**
```
1. PDF baixado com sucesso
2. Erro no GPT (rate limit, invalid PDF)
3. Fallback para modelo alternativo
4. Se falhar: erro 500
```

### **Cenário 3: Invalid Parameters**
```
1. fileId ou idoportunidade faltando
2. Retorna 400 Bad Request
3. Log de validação
4. Não processa
```

---

**Este fluxo garante alta disponibilidade, performance otimizada e rastreabilidade completa das operações.**



