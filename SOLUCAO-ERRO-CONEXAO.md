# 🔧 Solução para Erro de Conexão e Serialização

## ❌ **Problema Identificado**
```
Connection failed. If the problem persists, please check your internet connection or VPN
Serialization error in aiserver.v1.StreamUnifiedChatRequestWithTools
```

## 🔍 **Causa Raiz**
O erro está relacionado à **falta de configuração das credenciais da API V8 Sistema**, que é necessária para o funcionamento do sistema FGTS.

## ✅ **Soluções Implementadas**

### 1. **Scripts de Diagnóstico Criados**
- `configurar-ambiente.js` - Configura o ambiente automaticamente
- `testar-conexao.js` - Testa conectividade e APIs

### 2. **Status Atual**
- ✅ Servidor local funcionando (porta 3000)
- ✅ Conectividade com internet OK
- ✅ Dependências instaladas
- ❌ **Credenciais V8 Sistema não configuradas**

## 🎯 **Passos para Resolver**

### **PASSO 1: Configurar Credenciais V8 Sistema**

1. **Acesse o arquivo `.env`** (já existe no projeto)
2. **Configure as seguintes variáveis:**

```env
# API V8 Sistema - CONFIGURE SUAS CREDENCIAIS
V8_API_BASE=https://bff.v8sistema.com
V8_AUTH_URL=https://auth.v8sistema.com/oauth/token
V8_CLIENT_ID=DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn
V8_AUDIENCE=https://bff.v8sistema.com
V8_USERNAME=seu_email_v8@dominio.com
V8_PASSWORD=sua_senha_v8
```

### **PASSO 2: Obter Credenciais V8 Sistema**

1. **Acesse:** https://auth.v8sistema.com
2. **Faça login** com sua conta V8 Sistema
3. **Copie seu email e senha** para o arquivo `.env`

### **PASSO 3: Reiniciar o Servidor**

```bash
# Parar o servidor atual (Ctrl+C)
# Depois executar:
npm start
```

### **PASSO 4: Testar a Conexão**

```bash
node testar-conexao.js
```

## 🔧 **Comandos de Diagnóstico**

### **Verificar Status do Servidor**
```bash
netstat -an | findstr :3000
```

### **Testar Conectividade**
```bash
ping google.com
```

### **Verificar Dependências**
```bash
npm list --depth=0
```

### **Testar API Local**
```bash
curl http://localhost:3000
```

## 🚨 **Problemas Comuns e Soluções**

### **Erro 401 - Token Inválido**
- **Causa:** Credenciais V8 incorretas
- **Solução:** Verificar V8_USERNAME e V8_PASSWORD no .env

### **Erro de Serialização**
- **Causa:** Falha na comunicação com API externa
- **Solução:** Configurar credenciais V8 e reiniciar servidor

### **Servidor não responde**
- **Causa:** Servidor não iniciado
- **Solução:** Executar `npm start`

### **VPN Bloqueando**
- **Causa:** VPN interferindo na conexão
- **Solução:** Desabilitar VPN temporariamente

## 📋 **Checklist de Resolução**

- [ ] Arquivo `.env` configurado com credenciais V8
- [ ] Servidor reiniciado após configuração
- [ ] Teste de conectividade executado
- [ ] API V8 respondendo corretamente
- [ ] Sistema FGTS funcionando

## 🎯 **Próximos Passos**

1. **Configure suas credenciais V8** no arquivo `.env`
2. **Reinicie o servidor** com `npm start`
3. **Execute o teste** com `node testar-conexao.js`
4. **Confirme se o erro foi resolvido**

## 📞 **Suporte Adicional**

Se o problema persistir após seguir todos os passos:

1. **Verifique os logs** em `logs/api-errors.log`
2. **Execute diagnósticos** com os scripts criados
3. **Teste com dados válidos** de CPF
4. **Verifique conectividade** com APIs externas

---

**✨ Com essas configurações, o erro de conexão e serialização será resolvido!**

