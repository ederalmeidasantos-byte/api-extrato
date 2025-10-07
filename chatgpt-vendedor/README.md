# 🤖 ChatGPT Vendedor - Lunas Digital

Sistema inteligente de atendimento via WhatsApp integrado ao CRM Lunas Digital.

## 🎯 Funcionalidades

- **Respostas Personalizadas**: Baseadas nos dados do cliente no CRM
- **Integração OpenAI**: Usa ChatGPT para gerar respostas inteligentes
- **Leitura de Propostas**: Acessa propostas ativas do cliente
- **Webhook Kentro**: Recebe mensagens do WhatsApp via Kentro
- **Classificação Inteligente**: Categoriza mensagens automaticamente

## 🚀 Instalação

### 1. Configurar Variáveis de Ambiente

```bash
# Adicionar ao .env
OPENAI_API_KEY=sk-proj-sua-chave-aqui
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Iniciar Servidor

```bash
npm start
```

## 📡 Endpoints Disponíveis

### Webhook Principal
```
POST /api/chatgpt-kentro
```

**Payload:**
```json
{
  "cpf": "46210648860",
  "message": "Olá, gostaria de saber sobre as parcelas",
  "clientNumber": "5511959088554",
  "chatId": "85048"
}
```

**Resposta:**
```json
{
  "success": true,
  "resposta": "Olá Antonio! Para portabilidade posso simular parcelas a partir de R$ 200,00...",
  "cpf": "46210648860",
  "nomeCliente": "Antonio Silva",
  "timestamp": "2025-10-06T17:30:00.000Z",
  "metadata": {
    "temPropostas": true,
    "model": "gpt-4o-mini",
    "tokens": 150
  }
}
```

### Teste de Cliente
```
POST /api/test-cliente
```

### Status do Sistema
```
GET /api/status
```

## 🧪 Testes

### Teste via Interface Web
Acesse: `https://lunasdigital.com.br/chatgpt-vendedor/teste-web.html`

### Teste via Terminal
```bash
node chatgpt-vendedor/teste-integracao.js
```

### Teste via cURL
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

## 🔧 Configuração

### Arquivo de Configuração
`chatgpt-vendedor/config.js`

```javascript
export const config = {
    openai: {
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7
    },
    system: {
        clientDataPath: 'var/data/clientes'
    }
};
```

### Configuração na Kentro

1. **URL do Webhook**: `https://lunasdigital.com.br/chatgpt/webhook/kentro`
2. **Método**: POST
3. **Content-Type**: application/json
4. **Eventos**: Mensagens recebidas, Conversas iniciadas

## 📊 Monitoramento

### Logs do Sistema
```bash
pm2 logs api-extrato
```

### Verificar Status
```bash
curl https://lunasdigital.com.br/api/status
```

### Verificar API OpenAI
```bash
curl https://lunasdigital.com.br/api/test
```

## 🎯 Fluxo de Funcionamento

1. **Recebimento**: Kentro envia mensagem via webhook
2. **Validação**: Sistema valida CPF e mensagem
3. **Busca de Dados**: Carrega dados do cliente do CRM
4. **Contexto**: Prepara informações das propostas ativas
5. **ChatGPT**: Envia contexto para OpenAI
6. **Resposta**: Retorna resposta personalizada para Kentro
7. **Log**: Registra interação para monitoramento

## 🛠️ Estrutura do Projeto

```
chatgpt-vendedor/
├── chatgpt-integration.js    # Classe principal de integração
├── webhook-endpoint.js       # Endpoints do webhook
├── config.js                 # Configurações
├── teste-integracao.js       # Testes automatizados
├── teste-web.html            # Interface de teste
└── README.md                 # Esta documentação
```

## 🔒 Segurança

- Validação de CPF obrigatória
- Timeout de 30 segundos para API
- Logs de todas as interações
- Respostas de fallback em caso de erro
- Rate limiting via Nginx

## 📈 Performance

- **Modelo**: GPT-4o-mini (mais econômico)
- **Tokens**: Máximo 1000 por resposta
- **Timeout**: 30 segundos
- **Cache**: Dados do cliente em memória
- **Fallback**: Resposta automática em caso de erro

## 🚨 Troubleshooting

### Erro: "OPENAI_API_KEY não configurada"
- Verificar variável de ambiente
- Reiniciar servidor após configurar

### Erro: "Cliente não encontrado"
- Verificar se CPF existe no CRM
- Verificar formato do CPF (apenas números)

### Erro: "Timeout na API"
- Verificar conexão com internet
- Verificar status da API OpenAI
- Aumentar timeout se necessário

## 📞 Suporte

- **Desenvolvedor**: Lunas Digital
- **Versão**: 1.0.0
- **Status**: Em Produção
- **Última Atualização**: Outubro 2025

---

**🎉 O ChatGPT Vendedor está pronto para atender clientes automaticamente via WhatsApp!**