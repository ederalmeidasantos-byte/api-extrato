# 🔐 API de Tokens V8 - Documentação Completa

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Configuração](#configuração)
4. [Endpoints](#endpoints)
5. [Exemplos de Uso](#exemplos-de-uso)
6. [Códigos de Erro](#códigos-de-erro)
7. [Monitoramento](#monitoramento)
8. [Troubleshooting](#troubleshooting)
9. [Changelog](#changelog)

---

## 🎯 Visão Geral

A **API de Tokens V8** é um serviço especializado que atua como um **proxy inteligente** entre seu sistema e a API V8, gerenciando automaticamente a autenticação e fornecendo tokens válidos para consultas FGTS.

### 🚀 **URL Base**
```
https://api-extrato-1.onrender.com
```

### ⚡ **Características Principais**
- ✅ **Geração automática de tokens** V8
- ✅ **Cache inteligente** com renovação automática
- ✅ **Proxy para contornar bloqueios** de IP
- ✅ **API RESTful** simples e eficiente
- ✅ **Monitoramento em tempo real**
- ✅ **Alta disponibilidade** no Render

---

## 🏗️ Arquitetura

### 📊 **Diagrama de Fluxo**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Seu Sistema   │───▶│  API de Tokens  │───▶│    API V8       │
│   (Hostinger)   │    │    (Render)     │    │  (Autenticação) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │   Token V8      │
         │                       │              │   (Válido)      │
         │                       │              └─────────────────┘
         │                       │                       │
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   Cache Local   │              │
         │              │   (Memória)     │              │
         │              └─────────────────┘              │
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Token Retornado│
                        │  para o Sistema │
                        └─────────────────┘
```

### 🔄 **Fluxo de Funcionamento**

1. **Sistema solicita token** → `POST /authenticate`
2. **API valida credenciais** → Verifica username/password
3. **API gera token V8** → Comunica com API V8
4. **Token é armazenado** → Cache local com TTL
5. **Token é retornado** → Para o sistema solicitante
6. **Consultas subsequentes** → `GET /token/:username`

---

## ⚙️ Configuração

### 🔧 **Variáveis de Ambiente (Render)**

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `V8_CLIENT_ID` | `DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn` | ID do cliente V8 (fixo) |
| `V8_AUDIENCE` | `https://bff.v8sistema.com` | Audience V8 (fixo) |
| `V8_SCOPE` | `offline_access` | Escopo V8 (fixo) |
| `V8_AUTH_URL` | `https://auth.v8sistema.com/oauth/token` | URL de autenticação V8 (fixo) |
| `PORT` | `3000` | Porta do servidor (automática no Render) |

### 📝 **Configuração no Render**

1. Acesse o dashboard do Render
2. Vá para o serviço `fgts-token-api`
3. Clique em **Environment**
4. Adicione as variáveis acima
5. Clique em **Save Changes**

---

## 🌐 Endpoints

### 1. **GET /** - Informações da API
**Descrição:** Retorna informações básicas sobre a API e lista de endpoints disponíveis.

**URL:** `GET https://api-extrato-1.onrender.com/`

**Resposta:**
```json
{
  "service": "FGTS Token API",
  "version": "1.0.0",
  "status": "online",
  "endpoints": {
    "health": "/health",
    "status": "/status",
    "authenticate": "/authenticate",
    "token": "/token/:username"
  }
}
```

---

### 2. **GET /health** - Health Check
**Descrição:** Verifica se a API está funcionando corretamente.

**URL:** `GET https://api-extrato-1.onrender.com/health`

**Resposta:**
```json
{
  "status": "healthy",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```

---

### 3. **GET /status** - Status Detalhado
**Descrição:** Retorna informações detalhadas sobre o status da API, incluindo métricas de performance.

**URL:** `GET https://api-extrato-1.onrender.com/status`

**Resposta:**
```json
{
  "service": "FGTS Token API",
  "uptime": 3600.5,
  "memory": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 12345678,
    "external": 1024000
  },
  "cache": {
    "size": 2,
    "users": ["user1@email.com", "user2@email.com"]
  },
  "v8_config": {
    "client_id": "DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn",
    "audience": "https://bff.v8sistema.com",
    "scope": "offline_access"
  }
}
```

---

### 4. **POST /authenticate** - Gerar Token
**Descrição:** Gera um novo token V8 usando as credenciais fornecidas.

**URL:** `POST https://api-extrato-1.onrender.com/authenticate`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "username": "seu@email.com",
  "password": "sua_senha"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "token_type": "Bearer",
  "username": "seu@email.com",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```

**Resposta de Erro (400):**
```json
{
  "success": false,
  "error": "Username e password são obrigatórios",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```

**Resposta de Erro (401):**
```json
{
  "success": false,
  "error": "Credenciais inválidas",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```

**Resposta de Erro (429):**
```json
{
  "success": false,
  "error": "Muitas tentativas. Tente novamente em alguns minutos",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```

---

### 5. **GET /token/:username** - Obter Token do Cache
**Descrição:** Retorna um token válido do cache para o usuário especificado.

**URL:** `GET https://api-extrato-1.onrender.com/token/seu@email.com`

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "seu@email.com",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```

**Resposta de Erro (404):**
```json
{
  "success": false,
  "error": "Token não encontrado ou expirado. Faça login novamente.",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```

---

## 💡 Exemplos de Uso

### 🔐 **Exemplo 1: Gerar Token (JavaScript)**

```javascript
const axios = require('axios');

async function gerarToken() {
  try {
    const response = await axios.post('https://api-extrato-1.onrender.com/authenticate', {
      username: 'seu@email.com',
      password: 'sua_senha'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Token gerado:', response.data.access_token);
    console.log('Expira em:', response.data.expires_in, 'segundos');
    
    return response.data.access_token;
  } catch (error) {
    console.error('Erro ao gerar token:', error.response?.data || error.message);
    throw error;
  }
}

// Uso
gerarToken();
```

### 🔑 **Exemplo 2: Obter Token do Cache (JavaScript)**

```javascript
const axios = require('axios');

async function obterToken(username) {
  try {
    const response = await axios.get(`https://api-extrato-1.onrender.com/token/${username}`);
    
    console.log('Token obtido:', response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('Token expirado, gerando novo...');
      return await gerarToken();
    }
    throw error;
  }
}

// Uso
obterToken('seu@email.com');
```

### 🐍 **Exemplo 3: Python**

```python
import requests
import json

def gerar_token(username, password):
    url = "https://api-extrato-1.onrender.com/authenticate"
    data = {
        "username": username,
        "password": password
    }
    
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        return response.json()['access_token']
    else:
        raise Exception(f"Erro: {response.json()['error']}")

def obter_token(username):
    url = f"https://api-extrato-1.onrender.com/token/{username}"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json()['access_token']
    elif response.status_code == 404:
        print("Token expirado, gerando novo...")
        return gerar_token(username, "sua_senha")
    else:
        raise Exception(f"Erro: {response.json()['error']}")

# Uso
token = obter_token("seu@email.com")
print(f"Token: {token}")
```

### 🔧 **Exemplo 4: cURL**

```bash
# Gerar token
curl -X POST https://api-extrato-1.onrender.com/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "username": "seu@email.com",
    "password": "sua_senha"
  }'

# Obter token do cache
curl -X GET https://api-extrato-1.onrender.com/token/seu@email.com

# Verificar status
curl -X GET https://api-extrato-1.onrender.com/status
```

---

## ❌ Códigos de Erro

### 📊 **Tabela de Códigos HTTP**

| Código | Descrição | Solução |
|--------|-----------|---------|
| `200` | ✅ Sucesso | Operação realizada com sucesso |
| `400` | ❌ Bad Request | Verificar parâmetros da requisição |
| `401` | ❌ Unauthorized | Credenciais inválidas |
| `404` | ❌ Not Found | Token não encontrado ou expirado |
| `429` | ❌ Too Many Requests | Muitas tentativas, aguardar |
| `500` | ❌ Internal Server Error | Erro interno do servidor |
| `502` | ❌ Bad Gateway | Serviço temporariamente indisponível |

### 🔍 **Detalhamento dos Erros**

#### **400 - Bad Request**
```json
{
  "success": false,
  "error": "Username e password são obrigatórios",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```
**Causa:** Parâmetros obrigatórios não fornecidos
**Solução:** Verificar se `username` e `password` estão sendo enviados

#### **401 - Unauthorized**
```json
{
  "success": false,
  "error": "Credenciais inválidas",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```
**Causa:** Username ou password incorretos
**Solução:** Verificar credenciais com o provedor V8

#### **404 - Not Found**
```json
{
  "success": false,
  "error": "Token não encontrado ou expirado. Faça login novamente.",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```
**Causa:** Token não existe no cache ou expirou
**Solução:** Fazer nova autenticação via `POST /authenticate`

#### **429 - Too Many Requests**
```json
{
  "success": false,
  "error": "Muitas tentativas. Tente novamente em alguns minutos",
  "timestamp": "2024-09-30T21:45:00.000Z"
}
```
**Causa:** Rate limit atingido na API V8
**Solução:** Aguardar alguns minutos antes de tentar novamente

---

## 📊 Monitoramento

### 🔍 **Métricas Disponíveis**

#### **Uptime**
- **Descrição:** Tempo de funcionamento da API
- **Endpoint:** `GET /status`
- **Unidade:** Segundos

#### **Memória**
- **RSS:** Memória física utilizada
- **Heap Total:** Total de memória heap alocada
- **Heap Used:** Memória heap em uso
- **External:** Memória externa (buffers, etc.)

#### **Cache**
- **Size:** Número de tokens em cache
- **Users:** Lista de usuários com tokens ativos

### 📈 **Monitoramento em Tempo Real**

```javascript
// Verificar status da API
async function verificarStatus() {
  try {
    const response = await axios.get('https://api-extrato-1.onrender.com/status');
    
    console.log('Status da API:');
    console.log('- Uptime:', response.data.uptime, 'segundos');
    console.log('- Memória:', response.data.memory.heapUsed, 'bytes');
    console.log('- Cache:', response.data.cache.size, 'tokens');
    console.log('- Usuários:', response.data.cache.users);
    
  } catch (error) {
    console.error('Erro ao verificar status:', error.message);
  }
}

// Executar a cada 30 segundos
setInterval(verificarStatus, 30000);
```

---

## 🔧 Troubleshooting

### 🚨 **Problemas Comuns**

#### **1. API retornando 502 Bad Gateway**
**Sintomas:**
- Erro 502 ao acessar qualquer endpoint
- Página de erro do Render

**Possíveis Causas:**
- Deploy em andamento
- Servidor sobrecarregado
- Erro na aplicação

**Soluções:**
1. Aguardar alguns minutos
2. Verificar logs no Render
3. Reiniciar o serviço

#### **2. Token não encontrado (404)**
**Sintomas:**
- Erro 404 ao buscar token
- Token expirado

**Soluções:**
1. Fazer nova autenticação
2. Verificar se o username está correto
3. Aguardar renovação automática

#### **3. Credenciais inválidas (401)**
**Sintomas:**
- Erro 401 ao autenticar
- Credenciais rejeitadas

**Soluções:**
1. Verificar username e password
2. Testar credenciais diretamente na V8
3. Aguardar desbloqueio (se rate limit)

#### **4. Muitas tentativas (429)**
**Sintomas:**
- Erro 429 em todas as requisições
- Rate limit atingido

**Soluções:**
1. Aguardar 15-30 minutos
2. Implementar retry com backoff
3. Usar cache de tokens

### 🔍 **Logs e Debugging**

#### **Verificar Logs no Render**
1. Acesse o dashboard do Render
2. Vá para o serviço `fgts-token-api`
3. Clique em **Logs**
4. Analise os logs em tempo real

#### **Teste de Conectividade**
```bash
# Testar conectividade básica
curl -I https://api-extrato-1.onrender.com/

# Testar endpoint de health
curl https://api-extrato-1.onrender.com/health

# Testar autenticação
curl -X POST https://api-extrato-1.onrender.com/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username":"teste","password":"teste"}'
```

---

## 📝 Changelog

### **v1.0.0** - 2024-09-30
- ✅ **Lançamento inicial**
- ✅ Implementação de autenticação V8
- ✅ Sistema de cache de tokens
- ✅ Endpoints RESTful completos
- ✅ Monitoramento e métricas
- ✅ Documentação completa

### **Próximas Versões**
- 🔄 **v1.1.0** - Melhorias de performance
- 🔄 **v1.2.0** - Dashboard de monitoramento
- 🔄 **v1.3.0** - Suporte a múltiplos usuários
- 🔄 **v1.4.0** - Métricas avançadas

---

## 📞 Suporte

### 🆘 **Contato**
- **Desenvolvedor:** Lunas Digital
- **Email:** crislunasdigital@gmail.com
- **Projeto:** API de Tokens V8

### 📚 **Recursos Adicionais**
- [Documentação V8](https://v8sistema.com/docs)
- [Render Documentation](https://render.com/docs)
- [Node.js Documentation](https://nodejs.org/docs)

### 🐛 **Reportar Bugs**
Para reportar bugs ou solicitar features:
1. Documente o problema detalhadamente
2. Inclua logs relevantes
3. Especifique passos para reproduzir
4. Entre em contato via email

---

## 📄 Licença

**MIT License** - Veja o arquivo LICENSE para detalhes.

---

*Documentação gerada em: 30 de Setembro de 2024*
*Versão da API: 1.0.0*
*Última atualização: 30/09/2024 21:45*
