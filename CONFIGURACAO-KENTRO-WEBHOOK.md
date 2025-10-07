# 🔧 Configuração Webhook Kentro - ChatGPT Vendedor

## 📋 **Informações do Webhook**

### **URL do Webhook:**
```
http://72.60.159.149:3004/webhook/kentro
```

### **Configurações Técnicas:**
- **Método:** POST
- **Content-Type:** application/json
- **Timeout:** 30 segundos
- **Retry:** 3 tentativas

## 🚀 **Passo a Passo na Kentro**

### **1. Acessar Painel Kentro**
1. Faça login no painel da Kentro
2. Navegue para **"Integrações"** ou **"Webhooks"**
3. Clique em **"Criar Novo Webhook"**

### **2. Configurar Webhook**

#### **Informações Básicas:**
- **Nome:** `ChatGPT Vendedor Lunas Digital`
- **Descrição:** `Sistema de ChatGPT para vendedor de empréstimo consignado`
- **URL:** `http://72.60.159.149:3004/webhook/kentro`

#### **Configurações Avançadas:**
- **Método HTTP:** `POST`
- **Content-Type:** `application/json`
- **Timeout:** `30000` (30 segundos)
- **Retry:** `3` tentativas
- **Headers Customizados:**
  ```
  Content-Type: application/json
  User-Agent: Kentro-Webhook/1.0
  ```

### **3. Eventos a Monitorar**

Selecione os seguintes eventos:
- ✅ **Mensagem Recebida**
- ✅ **Conversa Iniciada**
- ✅ **Cliente Online**
- ✅ **Status Alterado**

### **4. Estrutura de Dados**

O webhook enviará dados no formato:

```json
{
  "cpf": "12345678901",
  "message": "Texto da mensagem",
  "clientNumber": "5511999999999",
  "chatId": "kentro_chat_123",
  "messageType": "text",
  "timestamp": "2025-01-04T14:30:00Z",
  "clientName": "Nome do Cliente"
}
```

## 🧪 **Teste da Configuração**

### **1. Teste Manual**
Execute o script de teste:
```powershell
.\teste-webhook-kentro.ps1
```

### **2. Teste via cURL**
```bash
curl -X POST http://72.60.159.149:3004/webhook/kentro \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "12345678901",
    "message": "Teste de integração",
    "clientNumber": "5511999999999",
    "chatId": "test_123"
  }'
```

### **3. Verificar Logs**
```bash
ssh root@lunasdigital.com.br "cd /root/api-lunas/API\ Lunas/chatgpt-vendedor && tail -f chatgpt.log"
```

## 🔍 **Troubleshooting**

### **Problema: Webhook não recebe dados**
1. Verificar se a URL está correta
2. Verificar se o ChatGPT vendedor está rodando
3. Verificar logs do servidor

### **Problema: Erro 502 Bad Gateway**
1. Verificar se a porta 3004 está aberta
2. Verificar se o serviço está rodando
3. Verificar firewall

### **Problema: Timeout**
1. Aumentar timeout na Kentro
2. Verificar performance do servidor
3. Verificar logs de erro

## 📊 **Monitoramento**

### **URLs de Status:**
- **Webhook:** http://72.60.159.149:3004/webhook/kentro
- **Teste CPF:** http://72.60.159.149:3004/teste-cpf
- **Status:** http://72.60.159.149:3004/status

### **Comandos de Verificação:**
```bash
# Verificar se está rodando
ssh root@lunasdigital.com.br "netstat -tlnp | grep :3004"

# Ver logs
ssh root@lunasdigital.com.br "cd /root/api-lunas/API\ Lunas/chatgpt-vendedor && tail -f chatgpt.log"

# Reiniciar serviço
ssh root@lunasdigital.com.br "cd /root/api-lunas/API\ Lunas/chatgpt-vendedor && pkill -f server-simples.js && nohup node server-simples.js > chatgpt.log 2>&1 &"
```

## 🎯 **Funcionalidades Implementadas**

### **1. Busca de Cliente por CPF**
- Integração com CRM Lunas
- Busca dados completos do cliente
- Verifica propostas ativas

### **2. Respostas Inteligentes**
- Classificação automática de mensagens
- Respostas personalizadas por produto
- Integração com dados reais do cliente

### **3. Produtos Suportados**
- **Portabilidade** - Empréstimo consignado
- **FGTS** - Saque do FGTS
- **Simulação** - Cálculo de propostas

## ⚠️ **Importante**

1. **Substitua o IP** `72.60.159.149` pelo domínio real quando disponível
2. **Configure SSL** para produção
3. **Monitore logs** regularmente
4. **Teste** antes de colocar em produção

## 📞 **Suporte**

Em caso de problemas:
1. Verificar logs do ChatGPT vendedor
2. Testar conectividade com o servidor
3. Verificar configuração na Kentro
4. Consultar documentação técnica

---

**🎉 Configuração concluída! O ChatGPT vendedor está pronto para receber mensagens da Kentro!**
