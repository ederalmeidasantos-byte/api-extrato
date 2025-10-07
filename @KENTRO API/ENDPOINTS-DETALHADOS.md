# 📚 Endpoints Detalhados - API AtenderBem

## 🗨️ Chat e Atendimentos

### **1. Abrir Novo Atendimento (Navegador)**
```http
GET /externalnewchat
```

**Descrição:** Abre um novo atendimento para o usuário logado no navegador. Não necessita API Key, mas exige sessão válida.

**Parâmetros Query:**
- `queueId` (integer, obrigatório): ID da fila
- `templateId` (integer, obrigatório): ID do template (obrigatório para filas oficiais)
- `templateParams` (string, opcional): Parâmetros do template em JSON
- `number` (string, obrigatório): Número de telefone do cliente
- `openchat` (boolean, obrigatório): Deve ser sempre `true`
- `message` (string, opcional): Mensagem pré-digitada

**Exemplo:**
```javascript
const url = `https://lunasdigital.atenderbem.com/externalnewchat?queueId=25&templateId=1&number=5511999999999&openchat=true&message=Olá!`;
```

### **2. Abrir Novo Atendimento (API)**
```http
GET /int/openNewChat
```

**Descrição:** Abre um novo atendimento para o usuário informado em userId.

**Parâmetros Query:**
- `queueId` (integer, obrigatório): ID da fila
- `apiKey` (string, obrigatório): Chave de autenticação
- `userId` (integer, opcional): ID do usuário (se não informado, será distribuído pela fila)
- `number` (string, obrigatório): Número de telefone do cliente
- `country` (string, opcional): Código do país (ex: BR)
- `markerId` (integer, opcional): ID do marcador
- `message` (string, opcional): Mensagem pré-digitada

**Exemplo:**
```javascript
const url = `https://lunasdigital.atenderbem.com/int/openNewChat?queueId=25&apiKey=cd4d0509169d4e2ea9177ac66c1c9376&number=5511999999999&country=BR`;
```

### **3. Abrir Atendimento (POST)**
```http
POST /int/openChat
```

**Descrição:** Abre um novo atendimento na fila ou para um usuário especificado.

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "number": "5511999999999",
  "userId": 123,
  "country": "BR",
  "markerId": 1,
  "filters": "filtro1,filtro2",
  "message": "Mensagem pré-digitada"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Atendimento aberto com sucesso",
  "data": {
    "chatId": 12345,
    "protocol": "ATD-2025-001",
    "queueId": 25,
    "userId": 123
  }
}
```

### **4. Enviar Template WhatsApp**
```http
POST /int/sendWaTemplate
```

**Descrição:** Envia um modelo pré-aprovado na Cloud API.

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "number": "5511999999999",
  "templateId": 1,
  "data": ["param1", "param2", "param3"],
  "userId": 123,
  "country": "BR",
  "markerId": 1,
  "message": "Mensagem adicional"
}
```

## 📊 CRM e Oportunidades

### **1. Alterar Fase da Oportunidade**
```http
POST /int/changeOpportunityStage
```

**Descrição:** Altera o estágio/fase de uma oportunidade no CRM.

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "id": 20764,
  "destStageId": 43
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Fase alterada com sucesso",
  "data": {
    "opportunityId": 20764,
    "oldStageId": 42,
    "newStageId": 43,
    "timestamp": "2025-01-01T10:00:00Z"
  }
}
```

### **2. Atualizar Dados da Oportunidade**
```http
POST /int/updateOpportunity
```

**Descrição:** Atualiza informações de uma oportunidade no CRM.

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "id": 36478,
  "value": 40
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Oportunidade atualizada com sucesso",
  "data": {
    "opportunityId": 36478,
    "oldValue": 35,
    "newValue": 40,
    "timestamp": "2025-01-01T10:00:00Z"
  }
}
```

## 👥 Contatos e Empresas

### **1. Listar Contatos**
```http
GET /int/getContacts
```

**Parâmetros Query:**
- `queueId` (integer, obrigatório): ID da fila
- `apiKey` (string, obrigatório): Chave de autenticação
- `page` (integer, opcional): Página (padrão: 1)
- `limit` (integer, opcional): Limite por página (padrão: 50)
- `search` (string, opcional): Termo de busca

**Exemplo:**
```javascript
const url = `https://lunasdigital.atenderbem.com/int/getContacts?queueId=25&apiKey=cd4d0509169d4e2ea9177ac66c1c9376&page=1&limit=50&search=João`;
```

### **2. Criar Contato**
```http
POST /int/createContact
```

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "name": "João Silva",
  "number": "5511999999999",
  "email": "joao@email.com",
  "company": "Empresa ABC",
  "notes": "Cliente VIP"
}
```

## 💬 Mensagens

### **1. Enviar Mensagem**
```http
POST /int/sendMessage
```

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "chatId": 12345,
  "message": "Olá! Como posso ajudar?",
  "type": "text"
}
```

### **2. Listar Mensagens**
```http
GET /int/getMessages
```

**Parâmetros Query:**
- `queueId` (integer, obrigatório): ID da fila
- `apiKey` (string, obrigatório): Chave de autenticação
- `chatId` (integer, opcional): ID do chat
- `page` (integer, opcional): Página
- `limit` (integer, opcional): Limite por página

## 📁 Arquivos e Galeria

### **1. Upload de Arquivo**
```http
POST /int/uploadFile
```

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "fileName": "documento.pdf",
  "mimeType": "application/pdf",
  "data": "base64_encoded_content",
  "saveToGallery": true,
  "title": "Documento do Cliente"
}
```

### **2. Listar Arquivos**
```http
GET /int/getFiles
```

**Parâmetros Query:**
- `queueId` (integer, obrigatório): ID da fila
- `apiKey` (string, obrigatório): Chave de autenticação
- `page` (integer, opcional): Página
- `limit` (integer, opcional): Limite por página

## 👤 Usuários e Filas

### **1. Listar Usuários**
```http
GET /int/getUsers
```

**Parâmetros Query:**
- `queueId` (integer, obrigatório): ID da fila
- `apiKey` (string, obrigatório): Chave de autenticação
- `page` (integer, opcional): Página
- `limit` (integer, opcional): Limite por página

### **2. Listar Filas**
```http
GET /int/getQueues
```

**Parâmetros Query:**
- `apiKey` (string, obrigatório): Chave de autenticação

## ✅ Tarefas

### **1. Listar Tarefas**
```http
GET /int/getTasks
```

**Parâmetros Query:**
- `queueId` (integer, obrigatório): ID da fila
- `apiKey` (string, obrigatório): Chave de autenticação
- `userId` (integer, opcional): ID do usuário
- `status` (string, opcional): Status da tarefa
- `page` (integer, opcional): Página
- `limit` (integer, opcional): Limite por página

### **2. Criar Tarefa**
```http
POST /int/createTask
```

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "title": "Ligar para cliente",
  "description": "Entrar em contato com cliente sobre proposta",
  "userId": 123,
  "dueDate": "2025-01-15T10:00:00Z",
  "priority": "high"
}
```

## 🛍️ Produtos

### **1. Listar Produtos**
```http
GET /int/getProducts
```

**Parâmetros Query:**
- `queueId` (integer, obrigatório): ID da fila
- `apiKey` (string, obrigatório): Chave de autenticação
- `page` (integer, opcional): Página
- `limit` (integer, opcional): Limite por página

### **2. Criar Produto**
```http
POST /int/createProduct
```

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "name": "Produto Exemplo",
  "description": "Descrição do produto",
  "price": 10000,
  "recurrentvalue": 5000,
  "maxdiscount": 2000,
  "commission": 1000,
  "hiddenfromclients": 0,
  "addtoqueues": 1,
  "queues": [25, 26],
  "files": [],
  "photos": []
}
```

## 🔗 Webhooks e Backup

### **1. Listar Webhooks**
```http
GET /int/getWebhooks
```

**Parâmetros Query:**
- `queueId` (integer, obrigatório): ID da fila
- `apiKey` (string, obrigatório): Chave de autenticação

### **2. Criar Webhook**
```http
POST /int/createWebhook
```

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "url": "https://meusite.com/webhook",
  "method": "POST",
  "dataType": "json",
  "events": ["chat.created", "message.sent"],
  "headers": {
    "Authorization": "Bearer token123"
  }
}
```

### **3. Executar Backup**
```http
POST /int/backup
```

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "type": "full",
  "includeFiles": true,
  "includeMessages": true
}
```

## 📊 Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 400 | Dados obrigatórios faltando ou inválidos |
| 401 | Autenticação falhou |
| 403 | Permissão negada ou usuário indisponível |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |
| 503 | Serviço indisponível |

## 🔐 Autenticação

Todos os endpoints (exceto `/externalnewchat`) requerem:
- `queueId`: ID da fila
- `apiKey`: Chave de autenticação da API

## 📝 Exemplos de Uso

### **JavaScript/Node.js**
```javascript
const axios = require('axios');

const atenderBemAPI = axios.create({
  baseURL: 'https://lunasdigital.atenderbem.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Abrir atendimento
async function abrirAtendimento() {
  try {
    const response = await atenderBemAPI.post('/int/openChat', {
      queueId: 25,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      number: '5511999999999',
      country: 'BR',
      message: 'Olá! Como posso ajudar?'
    });
    
    console.log('Atendimento aberto:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao abrir atendimento:', error.response.data);
    throw error;
  }
}

// Alterar fase da oportunidade
async function alterarFaseOportunidade() {
  try {
    const response = await atenderBemAPI.post('/int/changeOpportunityStage', {
      queueId: 25,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      id: 20764,
      destStageId: 43
    });
    
    console.log('Fase alterada:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar fase:', error.response.data);
    throw error;
  }
}
```

### **Python**
```python
import requests

class AtenderBemAPI:
    def __init__(self, base_url="https://lunasdigital.atenderbem.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
    
    def abrir_atendimento(self, queue_id, api_key, number, **kwargs):
        url = f"{self.base_url}/int/openChat"
        data = {
            'queueId': queue_id,
            'apiKey': api_key,
            'number': number,
            **kwargs
        }
        
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()
    
    def alterar_fase_oportunidade(self, queue_id, api_key, opportunity_id, dest_stage_id):
        url = f"{self.base_url}/int/changeOpportunityStage"
        data = {
            'queueId': queue_id,
            'apiKey': api_key,
            'id': opportunity_id,
            'destStageId': dest_stage_id
        }
        
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()
```

---

**Referência:** [Especificação Oficial da API](https://lunasdigital.atenderbem.com/static/getAPPAPISpecs)  
**Versão:** 5.6.2  
**Última atualização:** 01/01/2025



