# 🔐 API de Tokens V8 - Como Funciona

## 📋 Visão Geral

Esta API atua como um **proxy inteligente** entre o seu sistema e a API V8, gerenciando automaticamente a autenticação e fornecendo tokens válidos para consultas FGTS.

## 🎯 Problema Resolvido

- **Problema**: Servidor Hostinger bloqueado pela API V8 (erro 429)
- **Solução**: API no Render com IP diferente + cache inteligente de tokens
- **Resultado**: Sistema funciona sem bloqueios

## 🏗️ Arquitetura

```
[Seu Sistema] → [API Render] → [API V8] → [Token Válido]
     ↓              ↓            ↓
  Envia credenciais  Cache local  Retorna token
```

## 🔄 Fluxo de Funcionamento

### 1. **Primeira Autenticação**
```http
POST https://api-extrato-1.onrender.com/authenticate
Content-Type: application/json

{
  "username": "seu@email.com",
  "password": "sua_senha"
}
```

**O que acontece:**
1. API recebe suas credenciais
2. Envia para API V8 com IP do Render (não bloqueado)
3. Recebe token válido da V8
4. Armazena no cache local
5. Retorna token para você

### 2. **Consultas Subsequentes**
```http
GET https://api-extrato-1.onrender.com/token/seu@email.com
```

**O que acontece:**
1. API verifica cache local
2. Se token válido: retorna imediatamente
3. Se expirado: gera novo token automaticamente

## 📊 Endpoints Disponíveis

### **POST /authenticate** - Autenticação
- **Função**: Gerar token com suas credenciais
- **Entrada**: `username` e `password`
- **Saída**: Token válido + informações de expiração

### **GET /token/:username** - Obter Token
- **Função**: Buscar token do cache
- **Entrada**: Username na URL
- **Saída**: Token válido ou erro se não encontrado

### **GET /health** - Status da API
- **Função**: Verificar se API está funcionando
- **Saída**: Status "healthy" + timestamp

### **GET /status** - Informações Detalhadas
- **Função**: Ver estatísticas da API
- **Saída**: Uptime, memória, cache, configurações

## ⚡ Cache Inteligente

### **Como Funciona:**
- Tokens são armazenados em memória
- Cada usuário tem seu próprio token
- Renovação automática quando expira
- 1 minuto de margem de segurança

### **Vantagens:**
- ✅ Resposta instantânea para tokens válidos
- ✅ Renovação automática transparente
- ✅ Múltiplos usuários simultâneos
- ✅ Sem requisições desnecessárias à V8

## 🔧 Configuração no Render

### **Variáveis de Ambiente:**
```env
V8_CLIENT_ID=DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn
V8_AUDIENCE=https://bff.v8sistema.com
V8_SCOPE=offline_access
V8_AUTH_URL=https://auth.v8sistema.com/oauth/token
PORT=3000
```

### **Arquivos Necessários:**
- `api-token-main.cjs` - Código principal
- `package.json` - Dependências
- `env-example.txt` - Exemplo de configuração

## 🚀 Como Usar no Seu Sistema

### **1. Integração Básica:**
```javascript
// Função para obter token
async function obterToken(username, password) {
  try {
    // Primeira autenticação
    const authResponse = await fetch('https://api-extrato-1.onrender.com/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const authData = await authResponse.json();
    return authData.access_token;
  } catch (error) {
    console.error('Erro na autenticação:', error);
    throw error;
  }
}
```

### **2. Uso em Consultas FGTS:**
```javascript
// Usar token nas consultas
const token = await obterToken('seu@email.com', 'sua_senha');

const response = await fetch('https://api-v8.com/consulta', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 🛡️ Segurança

### **Proteções Implementadas:**
- ✅ Credenciais não armazenadas permanentemente
- ✅ Tokens com expiração automática
- ✅ Validação de entrada
- ✅ Tratamento de erros robusto
- ✅ CORS configurado

### **Recomendações:**
- Use HTTPS sempre
- Não exponha credenciais no frontend
- Monitore logs de erro
- Renove credenciais periodicamente

## 📈 Monitoramento

### **Logs Importantes:**
- `🔐 Gerando token para: username` - Nova autenticação
- `✅ Token gerado com sucesso` - Sucesso na autenticação
- `❌ Erro ao gerar token` - Falha na autenticação
- `🔄 Token renovado automaticamente` - Renovação automática

### **Métricas Disponíveis:**
- Uptime da API
- Uso de memória
- Tamanho do cache
- Usuários ativos

## 🔄 Renovação Automática

### **Quando Acontece:**
- Token expira em 1 hora
- Renovação 1 minuto antes do vencimento
- Falha na renovação: retorna erro 404
- Cliente deve fazer nova autenticação

### **Vantagens:**
- ✅ Transparente para o cliente
- ✅ Evita erros de token expirado
- ✅ Mantém sistema funcionando
- ✅ Reduz carga na API V8

## 🚨 Tratamento de Erros

### **Códigos de Erro:**
- `400` - Credenciais inválidas
- `401` - Falha na autenticação V8
- `404` - Token não encontrado/expirado
- `429` - Muitas tentativas (rate limit)
- `500` - Erro interno do servidor

### **Respostas de Erro:**
```json
{
  "success": false,
  "error": "Descrição do erro",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 💡 Dicas de Uso

### **Para Desenvolvedores:**
1. **Sempre verifique `success: true`** nas respostas
2. **Implemente retry** para erros temporários
3. **Monitore logs** para identificar problemas
4. **Use cache local** para evitar requisições desnecessárias

### **Para Administradores:**
1. **Monitore `/status`** regularmente
2. **Verifique logs** de erro
3. **Renove credenciais** periodicamente
4. **Teste endpoints** após mudanças

## 🔧 Troubleshooting

### **Problemas Comuns:**

#### **API retorna 502/404:**
- Verifique se deploy foi concluído
- Confirme variáveis de ambiente
- Teste endpoint `/health`

#### **Token não é gerado:**
- Verifique credenciais
- Confirme se API V8 está acessível
- Teste com `curl` local

#### **Token expira rapidamente:**
- Verifique configuração de expiração
- Confirme se renovação automática está ativa
- Monitore logs de renovação

## 📞 Suporte

### **Para Problemas:**
1. Verifique logs da API
2. Teste endpoints individualmente
3. Confirme configurações
4. Consulte documentação V8

### **Informações Úteis:**
- URL da API: `https://api-extrato-1.onrender.com`
- Documentação V8: `https://auth.v8sistema.com`
- Logs Render: Dashboard do Render

---

## 🎉 Resumo

Esta API resolve o problema de bloqueio do servidor Hostinger, fornecendo:

- ✅ **Tokens válidos** para consultas FGTS
- ✅ **Cache inteligente** para performance
- ✅ **Renovação automática** transparente
- ✅ **Múltiplos usuários** simultâneos
- ✅ **Monitoramento** completo
- ✅ **Tratamento de erros** robusto

**Resultado**: Sistema FGTS funcionando sem bloqueios! 🚀
