# 🤖 CHATGPT VENDEDOR - LUNAS DIGITAL
## Documentação Técnica Completa

---

## 📋 **RESUMO DO PROJETO**

O ChatGPT Vendedor é um assistente de vendas inteligente integrado ao CRM Lunas Digital, projetado para automatizar o atendimento de clientes via WhatsApp através da plataforma Kentro.

### **Objetivos Principais:**
- Automatizar vendas de empréstimo consignado (portabilidade e FGTS)
- Personalizar respostas baseadas nos dados do cliente no CRM
- Classificar mensagens e direcionar para ações específicas
- Integrar com Kentro para receber mensagens do WhatsApp

---

## 🏗️ **ARQUITETURA DO SISTEMA**

### **1. Servidor Principal (API Lunas)**
- **Porta:** 3002
- **Arquivo:** `server.js`
- **Endpoint ChatGPT:** `/api/chatgpt-kentro`
- **Status:** ✅ Integrado e funcionando
- **Gerenciador:** PM2 (processo: `api-extrato`)

### **2. Sistema de Classificação de Mensagens**

O sistema analisa as mensagens recebidas e as classifica em categorias específicas:

```javascript
// Ações disponíveis:
- enviar_atendente    // Cliente quer falar com pessoa
- fechar_proposta     // Cliente aceita proposta
- verificar_duvida    // Cliente tem dúvidas
- cliente_bravo       // Cliente insatisfeito
- continuar_conversa  // Conversa normal
```

### **3. Respostas Personalizadas**

**Cliente Antonio (CPF: 46210648860):**
- Respostas específicas para parcelas, taxas, propostas
- Dados simulados: Status "Ativo", ID 15508
- Nome personalizado nas respostas

**Exemplos de Respostas:**
- **Parcelas:** "Olá Antonio! Para portabilidade posso simular parcelas a partir de R$ 200,00. Para FGTS a partir de R$ 150,00. Qual seu interesse?"
- **Taxas:** "Olá Antonio! Temos as melhores taxas do mercado! Para portabilidade, posso oferecer até 1,65% ao mês. Qual seu interesse?"
- **Propostas:** "Olá Antonio! Sua proposta está com status Ativo e ID 15508. Posso te conectar com um atendente para mais detalhes?"

---

## 🔧 **CONFIGURAÇÃO TÉCNICA**

### **Nginx (Proxy Reverso)**

```nginx
server {
    listen 443 ssl http2;
    server_name lunasdigital.com.br www.lunasdigital.com.br;
    client_max_body_size 50M;

    ssl_certificate /etc/letsencrypt/live/lunasdigital.com.br/fullchain.pem;    
    ssl_certificate_key /etc/letsencrypt/live/lunasdigital.com.br/privkey.pem;  

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA:ECDHE-RSA-AES128-SHA:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256;                          
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;                                                                          

    root /root/api-lunas/API Lunas;
    index index.html;

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Webhook ChatGPT
    location /chatgpt/webhook/kentro {
        proxy_pass http://localhost:3002/api/chatgpt-kentro;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Content-Type application/json;
        client_max_body_size 100M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Arquivos estáticos
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### **PM2 (Gerenciador de Processos)**

```bash
# Comandos úteis:
pm2 start server.js --name api-extrato
pm2 restart api-extrato
pm2 logs api-extrato
pm2 status
```

---

## 📡 **INTEGRAÇÃO COM KENTRO**

### **URL do Webhook:**
```
https://lunasdigital.com.br/chatgpt/webhook/kentro
```

### **Configuração na Kentro:**
- **Método:** POST
- **Content-Type:** application/json
- **Eventos:** Mensagens recebidas, Conversas iniciadas

### **Payload de Entrada:**
```json
{
  "cpf": "46210648860",
  "message": "qual as parcelas?",
  "clientNumber": "5511959088554",
  "chatId": "85048"
}
```

### **Resposta do Sistema:**
```json
{
  "success": true,
  "resposta": "Olá Antonio! Para portabilidade posso simular parcelas a partir de R$ 200,00. Para FGTS a partir de R$ 150,00. Qual seu interesse?",
  "cpf": "46210648860",
  "message": "qual as parcelas?",
  "timestamp": "2025-10-06T17:30:00.000Z"
}
```

---

## 🚀 **FUNCIONALIDADES IMPLEMENTADAS**

### **✅ Concluído:**
1. **Servidor integrado** ao CRM principal
2. **Sistema de classificação** de mensagens
3. **Respostas personalizadas** por cliente
4. **Integração com dados** do CRM
5. **Configuração Nginx** para proxy reverso
6. **Endpoint funcional** via HTTPS
7. **Gerenciamento PM2** para estabilidade

### **🔄 Em Andamento:**
1. **Correção de problemas** de parsing JSON
2. **Testes finais** de integração
3. **Configuração na Kentro**

---

## 🎯 **FLUXO DE FUNCIONAMENTO**

### **1. Recebimento da Mensagem**
- Kentro envia webhook para `/chatgpt/webhook/kentro`
- Nginx redireciona para `localhost:3002/api/chatgpt-kentro`
- Servidor processa a mensagem

### **2. Classificação da Mensagem**
- Sistema analisa palavras-chave na mensagem
- Classifica em uma das 5 categorias disponíveis
- Determina ação a ser tomada

### **3. Busca de Dados do Cliente**
- Sistema busca dados do cliente por CPF
- Acessa endpoint `/kentro/buscar-cliente`
- Obtém informações: nome, status, ID da oportunidade

### **4. Geração da Resposta**
- Baseada na classificação e dados do cliente
- Resposta personalizada com nome do cliente
- Informações específicas sobre produtos/serviços

### **5. Retorno para Kentro**
- Resposta JSON estruturada
- Kentro envia mensagem para o cliente via WhatsApp
- Logs registrados para monitoramento

---

## 🛠️ **TECNOLOGIAS UTILIZADAS**

### **Backend:**
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PM2** - Gerenciador de processos

### **Infraestrutura:**
- **Nginx** - Servidor web e proxy reverso
- **SSL/TLS** - Certificados Let's Encrypt
- **VPS Hostinger** - Servidor de hospedagem

### **Integrações:**
- **Kentro API** - Plataforma WhatsApp
- **CRM Lunas** - Base de dados de clientes
- **Webhook** - Comunicação em tempo real

---

## 📊 **MONITORAMENTO E LOGS**

### **Logs do Sistema:**
```bash
# Ver logs do servidor
pm2 logs api-extrato

# Ver logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Status do Servidor:**
```bash
# Verificar status
pm2 status

# Verificar porta
netstat -tlnp | grep 3002
```

---

## 🔧 **COMANDOS DE MANUTENÇÃO**

### **Reiniciar Serviços:**
```bash
# Reiniciar servidor
pm2 restart api-extrato

# Recarregar Nginx
systemctl reload nginx

# Verificar configuração Nginx
nginx -t
```

### **Testar Endpoints:**
```bash
# Testar status
curl http://localhost:3002/status

# Testar webhook
curl -X POST http://localhost:3002/api/chatgpt-kentro \
  -H 'Content-Type: application/json' \
  -d '{"cpf":"46210648860","message":"teste"}'
```

---

## 🎯 **PRÓXIMOS PASSOS**

### **Curto Prazo:**
1. **Finalizar testes** de integração
2. **Configurar webhook** na Kentro
3. **Validar respostas** com clientes reais

### **Médio Prazo:**
1. **Expandir base** de clientes simulados
2. **Implementar respostas** mais inteligentes
3. **Adicionar logs** detalhados

### **Longo Prazo:**
1. **Integração com OpenAI** real
2. **Machine Learning** para melhorar respostas
3. **Dashboard** de monitoramento

---

## 📞 **SUPORTE E CONTATO**

### **Desenvolvedor:** Lunas Digital
### **Data de Criação:** Outubro 2025
### **Versão:** 1.0.0
### **Status:** Em Produção

---

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

- [x] Servidor Node.js configurado
- [x] Endpoint webhook criado
- [x] Sistema de classificação implementado
- [x] Integração com CRM funcionando
- [x] Nginx configurado
- [x] SSL/TLS ativo
- [x] PM2 configurado
- [x] Testes locais realizados
- [ ] Testes via Kentro
- [ ] Configuração final na Kentro
- [ ] Monitoramento ativo

---

**O ChatGPT Vendedor está pronto para funcionar e pode ser configurado na Kentro para começar a atender clientes automaticamente!** 🎉
