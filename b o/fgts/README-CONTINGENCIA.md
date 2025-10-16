# 🔐 Sistema de Contingência - API de Tokens V8

## 🎯 **Visão Geral**

O Sistema de Contingência da API de Tokens V8 é um mecanismo de fallback automático que garante que o processamento de FGTS continue funcionando mesmo quando há problemas de autenticação direta com a API V8.

### ✨ **Novidades v3.1**
- **Identificação Visual**: Logs diferenciados mostrando "NORMAL" vs "CONTINGÊNCIA"
- **Transparência Total**: Sempre saber quando o sistema está usando contingência
- **Logs Detalhados**: Indicação clara do motivo da troca de credencial

---

## 📊 **Identificação de Contingência nos Logs**

### **Tipos de Troca de Credencial**

#### **🔄 Troca Normal**
```
[15:30:25] 🔄 TROCA DE CREDENCIAL (NORMAL): 1 → 2 (usuario@email.com)
[15:30:25] 📊 Total de trocas: 3
```
- **Quando**: Rotação automática de credenciais
- **Cor no Painel**: Azul (info)
- **Motivo**: Rotação programada

#### **🔄 Troca por Contingência**
```
[15:30:25] 🔄 TROCA DE CREDENCIAL (CONTINGÊNCIA): 1 → 2 (usuario@email.com)
[15:30:25] 📊 Total de trocas: 3
[15:30:25] ✅ Autenticado via API de tokens (CONTINGÊNCIA): usuario@email.com (credencial 2)
```
- **Quando**: Erro 429 ou falha na autenticação direta
- **Cor no Painel**: Amarelo (warning)
- **Motivo**: Sistema usando API de contingência

### **Cenários de Contingência**
1. **Erro 429**: Rate limit atingido na API principal
2. **Falha de Autenticação**: Credencial inválida ou expirada
3. **Timeout**: API principal não responde
4. **Erro de Rede**: Problemas de conectividade

---

## 🚀 **Instalação e Configuração**

### **1. Dependências**
O sistema já está integrado ao projeto principal. Não são necessárias instalações adicionais.

### **2. Configuração**
Adicione a seguinte variável ao seu arquivo `.env`:

```bash
# Sistema de Contingência - API de Tokens V8
API_TOKENS_URL=https://api-extrato-1.onrender.com
```

### **3. Verificação**
Execute o script de teste para verificar se tudo está funcionando:

```bash
node teste-contingencia.js
```

---

## 🔧 **Como Usar**

### **Monitoramento Automático**
O sistema funciona automaticamente. Quando detecta 3 falhas consecutivas de autenticação direta, ativa automaticamente a API de tokens como contingência.

### **Controle Manual**
Você pode controlar o sistema manualmente através dos endpoints:

```bash
# Ver status atual
curl http://localhost:3000/api/contingency/status

# Resetar sistema
curl -X POST http://localhost:3000/api/contingency/reset

# Forçar uso da API de tokens
curl -X POST http://localhost:3000/api/contingency/force-api-tokens

# Forçar autenticação direta
curl -X POST http://localhost:3000/api/contingency/force-direct-auth
```

---

## 📊 **Monitoramento**

### **Logs Importantes**
```bash
# Ver logs de contingência
grep "CONTINGÊNCIA\|API DE TOKENS" logs/combined.log

# Ver logs de autenticação
grep "AUTENTICANDO" logs/combined.log

# Ver logs de erro
grep "ERRO.*AUTH" logs/err.log
```

### **Métricas**
- **Taxa de sucesso**: Percentual de autenticações bem-sucedidas
- **Tempo de resposta**: Latência média das requisições
- **Cache hit rate**: Taxa de acerto do cache de tokens
- **Falhas por tipo**: Distribuição de erros (429, 401, timeout, etc.)

---

## 🚨 **Troubleshooting**

### **Problema: API de Tokens Não Ativa**
**Sintomas:**
- Falhas diretas continuam mesmo após 3 tentativas
- Logs mostram "API de tokens indisponível"

**Soluções:**
1. Verificar conectividade:
   ```bash
   curl https://api-extrato-1.onrender.com/health
   ```

2. Forçar ativação:
   ```bash
   curl -X POST http://localhost:3000/api/contingency/force-api-tokens
   ```

### **Problema: API de Tokens Falha Constantemente**
**Sintomas:**
- Sistema alterna entre API de tokens e autenticação direta
- Logs mostram "Erro na API de tokens"

**Soluções:**
1. Resetar sistema:
   ```bash
   curl -X POST http://localhost:3000/api/contingency/reset
   ```

2. Forçar autenticação direta:
   ```bash
   curl -X POST http://localhost:3000/api/contingency/force-direct-auth
   ```

---

## 📈 **Benefícios**

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

## 🔍 **Arquitetura**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Sistema FGTS  │───▶│  Autenticação   │───▶│    API V8       │
│   (Hostinger)   │    │    Direta       │    │  (Principal)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │  Sistema de     │              │
         │              │  Contingência   │              │
         │              │                 │              │
         │              └─────────────────┘              │
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │  API de Tokens  │              │
         │              │    (Render)     │              │
         │              └─────────────────┘              │
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   Cache de      │              │
         │              │    Tokens       │              │
         │              └─────────────────┘              │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Token Válido   │
                        │  para Consultas │
                        └─────────────────┘
```

---

## 📞 **Suporte**

### **Documentação Completa**
- [Sistema de Contingência - Documentação Detalhada](docs/SISTEMA-CONTINGENCIA-API-TOKENS.md)
- [API de Tokens V8 - Documentação Completa](APIS/DOCUMENTACAO-COMPLETA-API-TOKENS.md)

### **Comandos Úteis**
```bash
# Executar teste completo
node teste-contingencia.js

# Ver status em tempo real
watch -n 5 'curl -s http://localhost:3000/api/contingency/status | jq'

# Monitorar logs
tail -f logs/combined.log | grep -E "(CONTINGÊNCIA|API DE TOKENS|AUTENTICANDO)"
```

---

**Última atualização**: 01/10/2025  
**Versão**: 1.0  
**Status**: ✅ Ativo e funcionando  
**Configuração**: Sistema de contingência ativo

