# 🔧 Guia de Troubleshooting - APIs

## 🎯 Visão Geral
Este guia contém soluções para problemas comuns com APIs, especialmente focado na integração Kentro e ViaCEP.

## 🚨 Problemas Comuns e Soluções

### 1. API Kentro - "Bad Request" (400)

#### Sintomas
```bash
curl -X POST https://lunasdigital.atenderbem.com/int/getPipeOpportunities \
  -H 'Content-Type: application/json' \
  -d '{"queueId":25,"apiKey":"sua-key","pipelineId":2}'

# Resultado: "Bad Request"
```

#### Causa
A API Kentro **NÃO aceita JSON**. Ela requer form-data.

#### Solução
```bash
# ✅ CORRETO
curl -X POST https://lunasdigital.atenderbem.com/int/getPipeOpportunities \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'queueId=25&apiKey=sua-key&pipelineId=2'
```

#### Implementação JavaScript
```javascript
// ❌ INCORRETO
const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// ✅ CORRETO
const formData = new URLSearchParams();
formData.append('queueId', 25);
formData.append('apiKey', 'sua-key');
formData.append('pipelineId', 2);

const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
});
```

### 2. API Kentro - "Missing required data"

#### Sintomas
```bash
curl -X POST https://lunasdigital.atenderbem.com/int/getPipeOpportunities \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d ''

# Resultado: {"message":"Missing required data"}
```

#### Causa
Payload vazio ou parâmetros obrigatórios faltando.

#### Solução
Verificar se todos os parâmetros obrigatórios estão sendo enviados:
- `queueId`
- `apiKey`
- `pipelineId` (para getPipeOpportunities)
- `id` (para getOpportunity)

### 3. Timeout em APIs

#### Sintomas
```javascript
// Requisição trava por muito tempo
const response = await fetch(url);
// Nunca retorna
```

#### Solução - Implementar Timeout
```javascript
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error(`Timeout após ${timeout}ms`);
        }
        throw error;
    }
}
```

### 4. Rate Limiting

#### Sintomas
```bash
# Resposta HTTP 429
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
```

#### Solução - Implementar Retry com Backoff
```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt);
                console.log(`Rate limit atingido. Tentando novamente em ${retryAfter}s...`);
                
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }
            }
            
            return response;
        } catch (error) {
            if (attempt === maxRetries) throw error;
            
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Tentativa ${attempt} falhou. Tentando novamente em ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

### 5. Problemas de CORS

#### Sintomas
```javascript
// Erro no console do navegador
Access to fetch at 'https://api.exemplo.com' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

#### Solução - Proxy no Servidor
```javascript
// No servidor Node.js
app.use('/api/kentro', createProxyMiddleware({
    target: 'https://lunasdigital.atenderbem.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api/kentro': '/int'
    }
}));
```

### 6. Problemas de Certificado SSL

#### Sintomas
```bash
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

#### Solução - Desabilitar Verificação SSL (apenas para desenvolvimento)
```bash
curl -k https://api.exemplo.com/endpoint
```

```javascript
// Node.js - apenas para desenvolvimento
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
```

## 🔍 Debugging

### 1. Logs Detalhados
```javascript
async function debugApiCall(url, options) {
    console.log('🔍 [DEBUG] URL:', url);
    console.log('🔍 [DEBUG] Method:', options.method || 'GET');
    console.log('🔍 [DEBUG] Headers:', options.headers);
    console.log('🔍 [DEBUG] Body:', options.body);
    
    const startTime = Date.now();
    
    try {
        const response = await fetch(url, options);
        const endTime = Date.now();
        
        console.log('✅ [DEBUG] Status:', response.status);
        console.log('✅ [DEBUG] Headers:', Object.fromEntries(response.headers));
        console.log('✅ [DEBUG] Tempo:', endTime - startTime, 'ms');
        
        const data = await response.text();
        console.log('📊 [DEBUG] Response:', data);
        
        return response;
    } catch (error) {
        const endTime = Date.now();
        console.error('❌ [DEBUG] Erro:', error.message);
        console.error('❌ [DEBUG] Tempo:', endTime - startTime, 'ms');
        throw error;
    }
}
```

### 2. Teste de Conectividade
```bash
# Teste básico de conectividade
ping api.exemplo.com

# Teste de porta
telnet api.exemplo.com 443

# Teste de DNS
nslookup api.exemplo.com
```

### 3. Verificação de Headers
```bash
# Verificar headers de resposta
curl -I https://api.exemplo.com/endpoint

# Verificar headers de requisição
curl -v https://api.exemplo.com/endpoint
```

## 📊 Monitoramento

### 1. Health Check
```javascript
async function healthCheck() {
    const apis = [
        { name: 'Kentro', url: 'https://lunasdigital.atenderbem.com/int/getPipeOpportunities' },
        { name: 'ViaCEP', url: 'https://viacep.com.br/ws/01310-100/json/' }
    ];
    
    for (const api of apis) {
        try {
            const startTime = Date.now();
            const response = await fetch(api.url, { method: 'HEAD' });
            const endTime = Date.now();
            
            console.log(`✅ ${api.name}: ${response.status} (${endTime - startTime}ms)`);
        } catch (error) {
            console.error(`❌ ${api.name}: ${error.message}`);
        }
    }
}
```

### 2. Métricas de Performance
```javascript
class ApiMetrics {
    constructor() {
        this.metrics = new Map();
    }
    
    recordCall(apiName, success, duration) {
        if (!this.metrics.has(apiName)) {
            this.metrics.set(apiName, {
                totalCalls: 0,
                successfulCalls: 0,
                totalDuration: 0,
                averageDuration: 0
            });
        }
        
        const metric = this.metrics.get(apiName);
        metric.totalCalls++;
        if (success) metric.successfulCalls++;
        metric.totalDuration += duration;
        metric.averageDuration = metric.totalDuration / metric.totalCalls;
        
        console.log(`📊 ${apiName}: ${metric.successfulCalls}/${metric.totalCalls} sucessos, média: ${metric.averageDuration}ms`);
    }
}
```

## 🛡️ Boas Práticas

### 1. Fallback Robusto
```javascript
async function buscarDadosComFallback(primaryApi, fallbackApi) {
    try {
        return await primaryApi();
    } catch (error) {
        console.warn('⚠️ API primária falhou, usando fallback:', error.message);
        try {
            return await fallbackApi();
        } catch (fallbackError) {
            console.error('❌ Fallback também falhou:', fallbackError.message);
            throw new Error('Todas as APIs falharam');
        }
    }
}
```

### 2. Cache Inteligente
```javascript
class ApiCache {
    constructor(ttl = 300000) { // 5 minutos
        this.cache = new Map();
        this.ttl = ttl;
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}
```

### 3. Validação de Dados
```javascript
function validarRespostaApi(data, schema) {
    const errors = [];
    
    for (const [field, validator] of Object.entries(schema)) {
        if (!validator(data[field])) {
            errors.push(`Campo ${field} inválido`);
        }
    }
    
    if (errors.length > 0) {
        throw new Error(`Dados inválidos: ${errors.join(', ')}`);
    }
    
    return true;
}

// Uso
const schema = {
    cpf: (value) => /^\d{11}$/.test(value),
    telefone: (value) => /^\d{10,11}$/.test(value),
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
};
```

## 📞 Suporte

### Checklist de Troubleshooting
1. ✅ Verificar formato dos dados (JSON vs form-data)
2. ✅ Confirmar parâmetros obrigatórios
3. ✅ Testar conectividade básica
4. ✅ Verificar logs de erro
5. ✅ Implementar timeout adequado
6. ✅ Configurar fallback robusto
7. ✅ Monitorar métricas de performance

### Contatos
- **Kentro API:** Suporte AtenderBem
- **ViaCEP:** Documentação oficial
- **Desenvolvimento:** Equipe Lunas Digital

---

**Última atualização:** 08/10/2025
**Versão:** 1.0.0

