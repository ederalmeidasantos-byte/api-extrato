# 🔐 Sistema de Contingência - API de Tokens V8

## 📋 **Visão Geral**

O Sistema de Contingência da API de Tokens V8 é um mecanismo de fallback automático que ativa quando os logins diretos para a API V8 falham repetidamente. Ele garante que o processamento de FGTS continue funcionando mesmo quando há problemas de autenticação.

---

## 🎯 **Como Funciona**

### **1. Detecção Automática de Falhas**
- **Contador de falhas**: Sistema monitora falhas de autenticação direta
- **Limite configurável**: Após 3 falhas consecutivas, ativa contingência
- **Verificação de saúde**: Testa disponibilidade da API de tokens antes de ativar

### **2. Ativação da Contingência**
- **API de tokens**: Usa a API externa para gerar tokens V8
- **Cache inteligente**: Armazena tokens válidos por 24 horas
- **Fallback automático**: Se API de tokens falhar, volta para autenticação direta

### **3. Monitoramento Contínuo**
- **Verificação periódica**: A cada 5 minutos testa saúde da API de tokens
- **Reset automático**: Volta para autenticação direta quando API de tokens falha
- **Logs detalhados**: Registra todas as transições e falhas

---

## ⚙️ **Configuração**

### **Variáveis de Ambiente**
```bash
# URL da API de tokens V8 (opcional)
API_TOKENS_URL=https://api-extrato-1.onrender.com

# Credenciais FGTS (obrigatórias)
FGTS_USER_1=seu@email.com
FGTS_PASS_1=sua_senha
FGTS_USER_2=outro@email.com
FGTS_PASS_2=outra_senha
```

### **Parâmetros Configuráveis**
- **MAX_DIRECT_AUTH_FAILURES**: 3 (máximo de falhas antes de ativar contingência)
- **API_TOKENS_CHECK_INTERVAL**: 5 minutos (verificação de saúde)
- **TOKEN_VALIDITY**: 24 horas (validade do cache de tokens)

---

## 🔧 **Endpoints de Gerenciamento**

### **1. Status do Sistema de Contingência**
```http
GET /api/contingency/status
```

**Resposta:**
```json
{
  "success": true,
  "status": {
    "usingApiTokens": false,
    "directAuthFailures": 1,
    "maxDirectAuthFailures": 3,
    "lastApiTokensCheck": 1696123456789,
    "apiTokensStats": {
      "totalCached": 2,
      "credentials": 3,
      "cacheDetails": [
        {
          "username": "user1@email.com",
          "isValid": true,
          "ageMinutes": 30,
          "expiresIn": 1410
        }
      ]
    }
  }
}
```

### **2. Resetar Sistema de Contingência**
```http
POST /api/contingency/reset
```

**Resposta:**
```json
{
  "success": true,
  "message": "Sistema de contingência resetado com sucesso"
}
```

### **3. Forçar Uso da API de Tokens**
```http
POST /api/contingency/force-api-tokens
```

**Resposta:**
```json
{
  "success": true,
  "message": "Sistema configurado para usar API de tokens"
}
```

### **4. Forçar Uso da Autenticação Direta**
```http
POST /api/contingency/force-direct-auth
```

**Resposta:**
```json
{
  "success": true,
  "message": "Sistema configurado para usar autenticação direta"
}
```

---

## 📊 **Monitoramento e Logs**

### **Logs de Ativação**
```
[2024-09-30T21:45:00.000Z] 🔄 Ativando API de tokens como contingência (3 falhas diretas)
[2024-09-30T21:45:01.000Z] 🔑 AUTENTICANDO VIA API DE TOKENS (contingência)
[2024-09-30T21:45:02.000Z] ✅ AUTENTICAÇÃO VIA API DE TOKENS CONCLUÍDA: user1@email.com
```

### **Logs de Desativação**
```
[2024-09-30T21:50:00.000Z] ⚠️ API de tokens indisponível, voltando para autenticação direta
[2024-09-30T21:50:01.000Z] 🔑 AUTENTICANDO DIRETO: user1@email.com (force: false)
[2024-09-30T21:50:02.000Z] ✅ AUTENTICAÇÃO DIRETA CONCLUÍDA: user1@email.com
```

### **Métricas de Performance**
- **Taxa de sucesso**: Percentual de autenticações bem-sucedidas
- **Tempo de resposta**: Latência média das requisições
- **Cache hit rate**: Taxa de acerto do cache de tokens
- **Falhas por tipo**: Distribuição de erros (429, 401, timeout, etc.)

---

## 🚨 **Cenários de Uso**

### **Cenário 1: Falhas de Rate Limit (429)**
1. **Problema**: Muitas requisições diretas causam erro 429
2. **Solução**: Sistema ativa API de tokens automaticamente
3. **Resultado**: Processamento continua sem interrupção

### **Cenário 2: Bloqueio Temporário de IP**
1. **Problema**: IP bloqueado temporariamente pela V8
2. **Solução**: API de tokens usa proxy para contornar bloqueio
3. **Resultado**: Acesso restaurado via API de tokens

### **Cenário 3: Problemas de Conectividade**
1. **Problema**: Instabilidade na conexão direta com V8
2. **Solução**: API de tokens com retry automático
3. **Resultado**: Maior estabilidade no processamento

### **Cenário 4: Manutenção da API V8**
1. **Problema**: API V8 em manutenção
2. **Solução**: API de tokens com cache de tokens válidos
3. **Resultado**: Processamento continua com tokens em cache

---

## 🔍 **Troubleshooting**

### **Problema: API de Tokens Não Ativa**
**Sintomas:**
- Falhas diretas continuam mesmo após 3 tentativas
- Logs mostram "API de tokens indisponível"

**Soluções:**
1. Verificar conectividade com API de tokens:
   ```bash
   curl https://api-extrato-1.onrender.com/health
   ```

2. Verificar configuração da URL:
   ```bash
   echo $API_TOKENS_URL
   ```

3. Forçar ativação manual:
   ```bash
   curl -X POST http://localhost:3000/api/contingency/force-api-tokens
   ```

### **Problema: API de Tokens Falha Constantemente**
**Sintomas:**
- Sistema alterna entre API de tokens e autenticação direta
- Logs mostram "Erro na API de tokens"

**Soluções:**
1. Verificar status da API de tokens:
   ```bash
   curl https://api-extrato-1.onrender.com/status
   ```

2. Resetar sistema de contingência:
   ```bash
   curl -X POST http://localhost:3000/api/contingency/reset
   ```

3. Forçar autenticação direta:
   ```bash
   curl -X POST http://localhost:3000/api/contingency/force-direct-auth
   ```

### **Problema: Tokens Expiram Rapidamente**
**Sintomas:**
- Logs mostram "Token expirado" frequentemente
- Performance degradada

**Soluções:**
1. Verificar configuração de validade:
   ```javascript
   // No código: TOKEN_VALIDITY = 24 * 60 * 60 * 1000; // 24 horas
   ```

2. Limpar cache de tokens:
   ```bash
   curl -X POST http://localhost:3000/api/contingency/reset
   ```

---

## 📈 **Otimizações**

### **1. Cache Inteligente**
- **Validação automática**: Verifica validade antes de usar
- **Renovação proativa**: Renova tokens antes de expirar
- **Limpeza automática**: Remove tokens expirados

### **2. Retry com Backoff**
- **Tentativas múltiplas**: 3 tentativas por credencial
- **Delay progressivo**: Aumenta delay entre tentativas
- **Fallback inteligente**: Alterna entre métodos de autenticação

### **3. Monitoramento Proativo**
- **Health checks**: Verifica saúde das APIs periodicamente
- **Métricas em tempo real**: Coleta estatísticas de performance
- **Alertas automáticos**: Notifica sobre problemas críticos

---

## 🎯 **Benefícios**

### **1. Alta Disponibilidade**
- **Zero downtime**: Processamento nunca para por falhas de autenticação
- **Recuperação automática**: Sistema se recupera automaticamente de falhas
- **Redundância**: Múltiplos métodos de autenticação

### **2. Performance Otimizada**
- **Cache eficiente**: Reduz chamadas desnecessárias à API
- **Latência baixa**: Tokens em cache respondem instantaneamente
- **Throughput alto**: Processa mais CPFs por minuto

### **3. Confiabilidade**
- **Logs detalhados**: Facilita diagnóstico de problemas
- **Métricas precisas**: Monitora performance em tempo real
- **Controle manual**: Permite intervenção quando necessário

---

## 📞 **Suporte**

### **Comandos Úteis**
```bash
# Verificar status
curl http://localhost:3000/api/contingency/status

# Resetar sistema
curl -X POST http://localhost:3000/api/contingency/reset

# Forçar API de tokens
curl -X POST http://localhost:3000/api/contingency/force-api-tokens

# Forçar autenticação direta
curl -X POST http://localhost:3000/api/contingency/force-direct-auth
```

### **Logs Importantes**
```bash
# Ver logs de contingência
grep "CONTINGÊNCIA\|API DE TOKENS" logs/combined.log

# Ver logs de autenticação
grep "AUTENTICANDO" logs/combined.log

# Ver logs de erro
grep "ERRO.*AUTH" logs/err.log
```

---

**Última atualização**: 01/10/2025  
**Versão**: 1.0  
**Status**: ✅ Ativo e funcionando  
**Configuração**: Sistema de contingência ativo









