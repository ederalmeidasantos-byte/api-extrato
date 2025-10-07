# 🔧 Configuração ChatGPT Vendedor

## 1. Configurar API Key do OpenAI

### Obter Chave da API
1. Acesse: https://platform.openai.com/api-keys
2. Faça login na sua conta OpenAI
3. Clique em "Create new secret key"
4. Copie a chave gerada

### Configurar no Servidor
```bash
# Editar arquivo .env no servidor
nano /root/api-lunas/API\ Lunas/.env

# Adicionar a linha:
OPENAI_API_KEY=sk-proj-sua-chave-aqui

# Reiniciar o servidor
pm2 restart api-extrato
```

## 2. Testar Configuração

### Via Interface Web
Acesse: `https://lunasdigital.com.br/chatgpt-vendedor/teste-web.html`

### Via Terminal
```bash
curl https://lunasdigital.com.br/api/status
```

### Resposta Esperada
```json
{
  "status": "online",
  "timestamp": "2025-10-06T17:46:29.182Z",
  "chatgpt": {
    "status": "ok",
    "message": "API funcionando"
  },
  "version": "1.0.0"
}
```

## 3. Configurar na Kentro

### URL do Webhook
```
https://lunasdigital.com.br/chatgpt/webhook/kentro
```

### Configurações
- **Método**: POST
- **Content-Type**: application/json
- **Eventos**: Mensagens recebidas, Conversas iniciadas

### Payload de Teste
```json
{
  "cpf": "46210648860",
  "message": "Olá, gostaria de saber sobre as parcelas",
  "clientNumber": "5511959088554",
  "chatId": "85048"
}
```

## 4. Monitoramento

### Ver Logs
```bash
pm2 logs api-extrato
```

### Verificar Status
```bash
curl https://lunasdigital.com.br/api/status
```

### Testar Webhook
```bash
curl -X POST https://lunasdigital.com.br/api/chatgpt-kentro \
  -H 'Content-Type: application/json' \
  -d '{
    "cpf": "46210648860",
    "message": "teste",
    "clientNumber": "5511999999999",
    "chatId": "test123"
  }'
```

## 5. Troubleshooting

### Erro: "API Key não configurada"
- Verificar se a variável OPENAI_API_KEY está definida
- Reiniciar o servidor após configurar

### Erro: "Cliente não encontrado"
- Verificar se o CPF existe no CRM
- Verificar formato do CPF (apenas números)

### Erro: "Timeout na API"
- Verificar conexão com internet
- Verificar status da API OpenAI
- Verificar se há créditos na conta OpenAI

## 6. Custos da API

### Modelo GPT-4o-mini
- **Custo**: ~$0.15 por 1M tokens de entrada
- **Custo**: ~$0.60 por 1M tokens de saída
- **Resposta típica**: ~100-200 tokens

### Estimativa de Custos
- **100 mensagens/dia**: ~$0.50/mês
- **1000 mensagens/dia**: ~$5.00/mês
- **10000 mensagens/dia**: ~$50.00/mês

## 7. Otimizações

### Reduzir Custos
- Usar modelo gpt-4o-mini (mais barato)
- Reduzir maxTokens para 500
- Implementar cache de respostas similares

### Melhorar Performance
- Implementar cache de dados do cliente
- Usar streaming para respostas longas
- Implementar rate limiting

---

**🎉 Após configurar a API Key, o ChatGPT Vendedor estará pronto para atender clientes automaticamente!**
