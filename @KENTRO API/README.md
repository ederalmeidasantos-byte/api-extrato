# 🚀 API AtenderBem - Documentação Completa

## 📋 Visão Geral

A API AtenderBem é uma API de integração completa para sistemas de atendimento e CRM. Baseada na [especificação oficial](https://lunasdigital.atenderbem.com/static/getAPPAPISpecs) versão 5.6.2, oferece funcionalidades para:

1. **Chat e Atendimentos** - Gerenciamento completo de conversas
2. **CRM e Oportunidades** - Controle de vendas e leads
3. **Contatos e Empresas** - Gestão de dados de clientes
4. **Mensagens e Templates** - Envio de mensagens automatizadas
5. **Arquivos e Galeria** - Gerenciamento de mídias
6. **Usuários e Filas** - Controle de equipes
7. **Tarefas e Produtos** - Gestão de atividades e catálogo
8. **Webhooks e Backup** - Automação e integração

## 🔧 Estrutura da API

### **Categorias de Endpoints**

#### 🗨️ **Chat e Atendimentos**
- `GET /externalnewchat` - Abrir novo atendimento (navegador)
- `GET /int/openNewChat` - Abrir novo atendimento (API)
- `POST /int/openChat` - Abrir atendimento com parâmetros completos
- `POST /int/sendWaTemplate` - Enviar template do WhatsApp

#### 📊 **CRM e Oportunidades**
- `POST /int/changeOpportunityStage` - Alterar fase da oportunidade
- `POST /int/updateOpportunity` - Atualizar dados da oportunidade
- `GET /int/getOpportunities` - Listar oportunidades
- `POST /int/createOpportunity` - Criar nova oportunidade

#### 👥 **Contatos e Empresas**
- `GET /int/getContacts` - Listar contatos
- `POST /int/createContact` - Criar contato
- `PUT /int/updateContact` - Atualizar contato
- `GET /int/getCompanies` - Listar empresas

#### 💬 **Mensagens**
- `POST /int/sendMessage` - Enviar mensagem
- `GET /int/getMessages` - Listar mensagens
- `POST /int/sendWaTemplate` - Enviar template WhatsApp

#### 📁 **Arquivos e Galeria**
- `POST /int/uploadFile` - Upload de arquivo
- `GET /int/getFiles` - Listar arquivos
- `GET /int/getGallery` - Listar galeria

#### 👤 **Usuários e Filas**
- `GET /int/getUsers` - Listar usuários
- `GET /int/getQueues` - Listar filas
- `POST /int/createUser` - Criar usuário

#### ✅ **Tarefas**
- `GET /int/getTasks` - Listar tarefas
- `POST /int/createTask` - Criar tarefa
- `PUT /int/updateTask` - Atualizar tarefa

#### 🛍️ **Produtos**
- `GET /int/getProducts` - Listar produtos
- `POST /int/createProduct` - Criar produto
- `PUT /int/updateProduct` - Atualizar produto

#### 🔗 **Webhooks e Backup**
- `GET /int/getWebhooks` - Listar webhooks
- `POST /int/createWebhook` - Criar webhook
- `POST /int/backup` - Executar backup

#### 2. **Atualizar Dados da Oportunidade**
```
POST https://lunasdigital.atenderbem.com/int/updateOpportunity
```

**Descrição:** Atualiza informações de uma oportunidade no CRM Kentro

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "queueId": 25,
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "id": 36478,
  "value": 40
}
```

**Parâmetros:**
- `queueId` (number): ID da fila/queue da oportunidade
- `apiKey` (string): Chave de autenticação da API
- `id` (number): ID da oportunidade
- `value` (number): Novo valor da oportunidade

**Response Success (200):**
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

**Response Error (400/500):**
```json
{
  "success": false,
  "error": "Oportunidade não encontrada",
  "code": "OPPORTUNITY_NOT_FOUND",
  "details": {
    "id": 36478,
    "message": "Oportunidade com ID 36478 não foi encontrada"
  }
}
```

### **Endpoints de Consulta**

#### 3. **Status da Proposta**
```
GET /api/lunas/status/{proposta_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "proposta_123456789",
    "status": "aprovada",
    "progresso": 100,
    "etapas": [
      {
        "nome": "Validação de Dados",
        "status": "concluida",
        "timestamp": "2025-01-01T10:05:00Z"
      },
      {
        "nome": "Análise de Crédito",
        "status": "concluida",
        "timestamp": "2025-01-01T10:10:00Z"
      },
      {
        "nome": "Aprovação Final",
        "status": "concluida",
        "timestamp": "2025-01-01T10:15:00Z"
      }
    ]
  }
}
```

#### 4. **Listar Contratos do Cliente**
```
GET /api/lunas/contratos/{cliente_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cliente_id": "cliente_987654321",
    "contratos": [
      {
        "id": "contrato_987654321",
        "numero": "CTR-2025-001",
        "valor": 15000.00,
        "parcelas": 84,
        "status": "ativo",
        "data_criacao": "2025-01-01T10:00:00Z"
      }
    ],
    "total": 1
  }
}
```

## 🔐 Autenticação

### **Método 1: Bearer Token**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Método 2: API Key**
```http
X-API-Key: kentro_api_key_123456789
```

### **Método 3: Basic Auth**
```http
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```

## 📊 Códigos de Status

| Código | Status | Descrição |
|--------|--------|-----------|
| 200 | OK | Requisição processada com sucesso |
| 201 | Created | Recurso criado com sucesso |
| 400 | Bad Request | Dados inválidos na requisição |
| 401 | Unauthorized | Token de autenticação inválido |
| 403 | Forbidden | Acesso negado |
| 404 | Not Found | Recurso não encontrado |
| 422 | Unprocessable Entity | Dados válidos mas não processáveis |
| 500 | Internal Server Error | Erro interno do servidor |
| 503 | Service Unavailable | Serviço temporariamente indisponível |

## 🚨 Códigos de Erro Específicos

### **Lunas - Propostas**
| Código | Descrição | Solução |
|--------|-----------|---------|
| `LUNAS_001` | CPF inválido | Verificar formato do CPF |
| `LUNAS_002` | Dados insuficientes | Verificar dados obrigatórios |
| `LUNAS_003` | Cliente não autorizado | Verificar autorização |
| `LUNAS_004` | Proposta já existe | Verificar duplicação |
| `LUNAS_005` | Serviço indisponível | Tentar novamente mais tarde |

### **Lunas - Contratos**
| Código | Descrição | Solução |
|--------|-----------|---------|
| `CTR_001` | Proposta não encontrada | Verificar ID da proposta |
| `CTR_002` | Dados bancários inválidos | Verificar conta bancária |
| `CTR_003` | Contrato já existe | Verificar duplicação |
| `CTR_004` | Cliente inativo | Verificar status do cliente |
| `CTR_005` | Limite excedido | Verificar limites do cliente |

## 🔄 Webhooks

### **Configuração**
```json
{
  "webhook_url": "https://seu-sistema.com/webhook/kentro",
  "events": [
    "proposta.aprovada",
    "proposta.rejeitada",
    "contrato.criado",
    "contrato.cancelado"
  ]
}
```

### **Payload do Webhook**
```json
{
  "event": "proposta.aprovada",
  "timestamp": "2025-01-01T10:00:00Z",
  "data": {
    "proposta_id": "proposta_123456789",
    "cliente_id": "cliente_987654321",
    "status": "aprovada",
    "valor": 15000.00,
    "parcelas": 84
  }
}
```

## 📈 Rate Limiting

### **Limites por Minuto**
- **Disparo de Propostas:** 100 requests/min
- **Criação de Contratos:** 50 requests/min
- **Consultas:** 200 requests/min

### **Headers de Rate Limit**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🧪 Ambiente de Testes

### **URL Base**
```
https://api-lunas-test.lunas.com.br/v1
```

### **Credenciais de Teste**
```json
{
  "api_key": "test_lunas_key_123456789",
  "username": "test_user",
  "password": "test_password"
}
```

## 🚀 Ambiente de Produção

### **URL Base**
```
https://api-lunas.lunas.com.br/v1
```

### **Credenciais**
```json
{
  "api_key": "prod_lunas_key_987654321",
  "username": "prod_user",
  "password": "prod_password"
}
```

## 📝 Exemplos de Integração

### **JavaScript/Node.js**
```javascript
const axios = require('axios');

const lunasAPI = axios.create({
  baseURL: 'https://api-lunas.lunas.com.br/v1',
  headers: {
    'Authorization': 'Bearer ' + process.env.LUNAS_TOKEN,
    'X-API-Key': process.env.LUNAS_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Disparar proposta
async function dispararProposta(dados) {
  try {
    const response = await lunasAPI.post('/lunas/disparar', dados);
    return response.data;
  } catch (error) {
    console.error('Erro ao disparar proposta:', error.response.data);
    throw error;
  }
}

// Criar contrato
async function criarContrato(dados) {
  try {
    const response = await lunasAPI.post('/lunas/criar-contrato', dados);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar contrato:', error.response.data);
    throw error;
  }
}
```

### **Python**
```python
import requests
import os

class LunasAPI:
    def __init__(self):
        self.base_url = "https://api-lunas.lunas.com.br/v1"
        self.headers = {
            "Authorization": f"Bearer {os.getenv('LUNAS_TOKEN')}",
            "X-API-Key": os.getenv('LUNAS_API_KEY'),
            "Content-Type": "application/json"
        }
    
    def disparar_proposta(self, dados):
        response = requests.post(
            f"{self.base_url}/lunas/disparar",
            json=dados,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def criar_contrato(self, dados):
        response = requests.post(
            f"{self.base_url}/lunas/criar-contrato",
            json=dados,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
```

## 🔧 Configuração no Sistema Operacional

### **Variáveis de Ambiente**
```env
# Lunas API Configuration
LUNAS_API_URL=https://api-lunas.lunas.com.br/v1
LUNAS_API_KEY=your_api_key_here
LUNAS_TOKEN=your_bearer_token_here
LUNAS_WEBHOOK_SECRET=your_webhook_secret_here

# Rate Limiting
LUNAS_RATE_LIMIT=100
LUNAS_RATE_WINDOW=60000

# Retry Configuration
LUNAS_MAX_RETRIES=3
LUNAS_RETRY_DELAY=1000
```

### **Integração com Sistema Operacional**
```javascript
// operacional/kentro-integration.js
class KentroIntegration {
  constructor() {
    this.apiUrl = process.env.KENTRO_API_URL;
    this.apiKey = process.env.KENTRO_API_KEY;
    this.token = process.env.KENTRO_TOKEN;
  }

  async dispararPropostaFGTS(dadosCliente, dadosProposta) {
    const payload = {
      cpf: dadosCliente.cpf,
      valor: dadosProposta.valor,
      parcelas: dadosProposta.parcelas,
      margem: dadosProposta.margem,
      provider: dadosProposta.provider,
      dados_cliente: {
        nome: dadosCliente.nome,
        nb: dadosCliente.nb,
        especie: dadosCliente.especie,
        telefone: dadosCliente.telefone
      }
    };

    return await this.makeRequest('POST', '/fgts/disparar', payload);
  }

  async criarContratoFGTS(propostaId, dadosContrato) {
    const payload = {
      proposta_id: propostaId,
      cliente_id: dadosContrato.clienteId,
      contrato: {
        valor: dadosContrato.valor,
        parcelas: dadosContrato.parcelas,
        taxa_juros: dadosContrato.taxaJuros,
        valor_parcela: dadosContrato.valorParcela,
        data_vencimento: dadosContrato.dataVencimento,
        banco: dadosContrato.banco,
        agencia: dadosContrato.agencia,
        conta: dadosContrato.conta
      },
      dados_bancarios: dadosContrato.dadosBancarios
    };

    return await this.makeRequest('POST', '/fgts/criar-contrato', payload);
  }

  async makeRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `${this.apiUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Erro na API Kentro:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = KentroIntegration;
```

## 📞 Suporte

### **Contato Técnico**
- **Email:** api-support@kentro.com.br
- **Telefone:** (11) 99999-9999
- **Horário:** Segunda a Sexta, 8h às 18h

### **Documentação Online**
- **Swagger UI:** https://api-kentro.lunas.com.br/docs
- **Postman Collection:** https://api-kentro.lunas.com.br/postman

### **Status da API**
- **Status Page:** https://status.kentro.com.br
- **Uptime:** 99.9%
- **SLA:** 4 horas de resposta

---

## 📋 Checklist de Integração

- [ ] Configurar variáveis de ambiente
- [ ] Implementar autenticação
- [ ] Configurar rate limiting
- [ ] Implementar retry logic
- [ ] Configurar webhooks
- [ ] Implementar logging
- [ ] Configurar monitoramento
- [ ] Testar em ambiente de desenvolvimento
- [ ] Validar em ambiente de homologação
- [ ] Deploy em produção

---

**Última atualização:** 01/01/2025

## 📊 Mapeamento de Dados

### **Campos do Formulário Mapeados**

A API inclui mapeamento completo de todos os campos do formulário operacional:

#### **💰 Campos Financeiros**
- **TROCO** (`#9d947420`) - Valor do troco da operação
- **PARCELA** (`#9cceda30`) - Valor da parcela atual
- **Nova Parcela** (`#5fc51220`) - Valor da nova parcela proposta
- **Saldo Devedor** (`#233a7b80`) - Saldo devedor atual
- **Valor Liberado** (`#08715950`) - Valor a ser liberado

#### **📋 Campos do Contrato**
- **CONTRATO** (`#9af53830`) - Número do contrato atual
- **PRAZO RESTANTE** (`#b4e24e90`) - Prazo restante do contrato
- **Prazo** (`#69da8d80`) - Prazo da nova proposta

#### **👤 Campos do Cliente**
- **CPF** (`#98011220`) - CPF do cliente
- **Nome** (`#6a93f650`) - Nome do cliente
- **Data de Nascimento** (`#0bfc6250`) - Data de nascimento
- **Celular** (`#98167d80`) - Celular para SMS
- **E-mail** (`#9e7f92b0`) - E-mail do cliente

#### **🏦 Campos Bancários**
- **Banco Proposta** (`#2fe18130`) - Banco da nova proposta
- **Banco Originador** (`#2e1d3bf0`) - Banco originador
- **Agência** (`#7f6a0eb0`) - Agência bancária
- **Conta** (`#769db520`) - Conta bancária
- **PIX** (`#66f9ee40`) - Chave PIX

### **Validações Automáticas**
- ✅ Validação de CPF
- ✅ Validação de e-mail
- ✅ Validação de telefone
- ✅ Validação de CEP
- ✅ Validação de valores monetários
- ✅ Validação de percentuais
- ✅ Validação de URLs

### **Exemplo de Processamento Completo**
```javascript
const OperacionalIntegration = require('./operacional-integration');

const integracao = new OperacionalIntegration('development');

// Dados do formulário
const dadosFormulario = {
  '9d947420': 'R$ 1.500,00', // TROCO
  '9cceda30': 'R$ 2.800,00', // PARCELA
  '5fc51220': 'R$ 2.200,00', // Nova Parcela
  '98011220': '123.456.789-00', // CPF
  '6a93f650': 'João Silva Santos', // Nome
  // ... outros campos
};

// Processar proposta completa
const resultado = await integracao.processarProposta(dadosFormulario);
console.log('Proposta processada:', resultado);
```  
**Versão da API:** v1.2.0  
**Mantenedor:** Equipe Lunas Digital
