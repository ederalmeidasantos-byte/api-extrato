# 🚀 Guia Rápido - API de Tokens V8

## ⚡ Início Rápido

### 1. **URL da API**
```
https://api-extrato-1.onrender.com
```

### 2. **Gerar Token (Primeira vez)**
```bash
curl -X POST https://api-extrato-1.onrender.com/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "username": "seu@email.com",
    "password": "sua_senha"
  }'
```

### 3. **Obter Token do Cache**
```bash
curl -X GET https://api-extrato-1.onrender.com/token/seu@email.com
```

### 4. **Verificar Status**
```bash
curl -X GET https://api-extrato-1.onrender.com/status
```

---

## 🔧 Integração JavaScript

### **Função Completa de Integração**
```javascript
const axios = require('axios');

class TokenAPI {
  constructor(baseURL = 'https://api-extrato-1.onrender.com') {
    this.baseURL = baseURL;
    this.cache = new Map();
  }

  async getToken(username, password) {
    // 1. Tentar obter do cache
    try {
      const cached = await this.getCachedToken(username);
      if (cached) return cached;
    } catch (error) {
      console.log('Token não encontrado no cache, gerando novo...');
    }

    // 2. Gerar novo token
    return await this.generateToken(username, password);
  }

  async getCachedToken(username) {
    const response = await axios.get(`${this.baseURL}/token/${username}`);
    return response.data.access_token;
  }

  async generateToken(username, password) {
    const response = await axios.post(`${this.baseURL}/authenticate`, {
      username,
      password
    });
    return response.data.access_token;
  }

  async checkStatus() {
    const response = await axios.get(`${this.baseURL}/status`);
    return response.data;
  }
}

// Uso
const tokenAPI = new TokenAPI();

// Obter token (com cache automático)
const token = await tokenAPI.getToken('seu@email.com', 'sua_senha');
console.log('Token:', token);

// Verificar status
const status = await tokenAPI.checkStatus();
console.log('Status:', status);
```

---

## 🐍 Integração Python

```python
import requests
import json

class TokenAPI:
    def __init__(self, base_url='https://api-extrato-1.onrender.com'):
        self.base_url = base_url
    
    def get_token(self, username, password):
        # 1. Tentar cache
        try:
            cached = self.get_cached_token(username)
            if cached:
                return cached
        except:
            print('Token não encontrado no cache, gerando novo...')
        
        # 2. Gerar novo
        return self.generate_token(username, password)
    
    def get_cached_token(self, username):
        response = requests.get(f'{self.base_url}/token/{username}')
        response.raise_for_status()
        return response.json()['access_token']
    
    def generate_token(self, username, password):
        response = requests.post(f'{self.base_url}/authenticate', json={
            'username': username,
            'password': password
        })
        response.raise_for_status()
        return response.json()['access_token']
    
    def check_status(self):
        response = requests.get(f'{self.base_url}/status')
        response.raise_for_status()
        return response.json()

# Uso
api = TokenAPI()
token = api.get_token('seu@email.com', 'sua_senha')
print(f'Token: {token}')
```

---

## 🔄 Fluxo de Uso Recomendado

### **1. Primeira Autenticação**
```javascript
// Gerar token inicial
const token = await tokenAPI.generateToken('user@email.com', 'password');
console.log('Token gerado:', token);
```

### **2. Uso Contínuo**
```javascript
// Obter token (usa cache se disponível)
const token = await tokenAPI.getToken('user@email.com', 'password');
console.log('Token obtido:', token);
```

### **3. Monitoramento**
```javascript
// Verificar status periodicamente
setInterval(async () => {
  const status = await tokenAPI.checkStatus();
  console.log('Cache size:', status.cache.size);
  console.log('Uptime:', status.uptime);
}, 30000); // A cada 30 segundos
```

---

## ⚠️ Boas Práticas

### ✅ **Do's**
- Use cache de tokens sempre que possível
- Implemente retry com backoff para erros 429
- Monitore o status da API regularmente
- Trate erros 404 como "token expirado"

### ❌ **Don'ts**
- Não faça autenticação a cada requisição
- Não ignore erros de rate limit (429)
- Não use tokens expirados
- Não faça muitas requisições simultâneas

---

## 🚨 Tratamento de Erros

```javascript
async function getTokenSafely(username, password) {
  try {
    return await tokenAPI.getToken(username, password);
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('Rate limit atingido, aguardando...');
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minuto
      return await tokenAPI.getToken(username, password);
    }
    
    if (error.response?.status === 401) {
      throw new Error('Credenciais inválidas');
    }
    
    if (error.response?.status === 404) {
      console.log('Token expirado, gerando novo...');
      return await tokenAPI.generateToken(username, password);
    }
    
    throw error;
  }
}
```

---

## 📊 Monitoramento Básico

```javascript
// Monitor simples
async function monitorAPI() {
  try {
    const status = await tokenAPI.checkStatus();
    
    console.log('📊 Status da API:');
    console.log(`- Uptime: ${Math.floor(status.uptime / 60)} minutos`);
    console.log(`- Memória: ${Math.floor(status.memory.heapUsed / 1024 / 1024)} MB`);
    console.log(`- Tokens em cache: ${status.cache.size}`);
    console.log(`- Usuários ativos: ${status.cache.users.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Erro no monitoramento:', error.message);
  }
}

// Executar a cada 5 minutos
setInterval(monitorAPI, 300000);
```

---

## 🎯 Casos de Uso Comuns

### **1. Sistema de Processamento FGTS**
```javascript
// Processar CPF com token válido
async function processarCPF(cpf, token) {
  const response = await axios.post('https://api-v8.com/consulta', {
    cpf: cpf
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
}

// Fluxo completo
async function processarCPFCompleto(cpf, username, password) {
  const token = await tokenAPI.getToken(username, password);
  return await processarCPF(cpf, token);
}
```

### **2. Sistema de Monitoramento**
```javascript
// Verificar saúde da API
async function verificarSaude() {
  try {
    const health = await axios.get('https://api-extrato-1.onrender.com/health');
    return health.data.status === 'healthy';
  } catch {
    return false;
  }
}
```

---

*Guia criado em: 30 de Setembro de 2024*
*Versão: 1.0.0*
