# 🔍 Como Buscar Oportunidade por CPF - API Kentro

## 📋 **Visão Geral**

Este documento explica como buscar oportunidades no CRM Kentro usando o CPF do cliente através da API `/int/getPipeOpportunities`.

## 🎯 **Endpoint Utilizado**

```http
POST https://lunasdigital.atenderbem.com/int/getPipeOpportunities
```

## 📝 **Parâmetros Obrigatórios**

```json
{
  "queueId": 25,        // ID da fila (25 = Portabilidade)
  "apiKey": "sua_api_key_aqui",
  "pipelineId": 2       // ID do pipeline (2 = Portabilidade)
}
```

## 🔧 **Implementação**

### **1. Função de Busca por CPF**

```javascript
const axios = require('axios');

async function buscarOportunidadePorCPF(cpf) {
  try {
    // 1. Buscar todas as oportunidades da fila de portabilidade
    const response = await axios.post('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      queueId: 25,        // Fila de portabilidade
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      pipelineId: 2       // Pipeline de portabilidade
    }, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // 2. Filtrar oportunidades pelo CPF no campo mainmail
    const oportunidades = response.data;
    const cpfProcurado = cpf.replace(/\D/g, ''); // Remove formatação
    
    const oportunidadesEncontradas = oportunidades.filter(oportunidade => {
      const mainmail = oportunidade.mainmail || '';
      return mainmail.includes(cpfProcurado);
    });
    
    return oportunidadesEncontradas;
    
  } catch (error) {
    console.error('Erro ao buscar oportunidades:', error.message);
    throw error;
  }
}
```

### **2. Função Completa com Análise**

```javascript
async function buscarOportunidadeCompletaPorCPF(cpf) {
  console.log(`🔍 Buscando oportunidades para CPF: ${cpf}`);
  
  try {
    // 1. Buscar oportunidades
    const response = await axios.post('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      queueId: 25,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      pipelineId: 2
    }, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ ${response.data.length} oportunidades carregadas`);
    
    // 2. Procurar CPF
    const cpfProcurado = cpf.replace(/\D/g, '');
    const oportunidadesEncontradas = [];
    
    for (const oportunidade of response.data) {
      const mainmail = oportunidade.mainmail || '';
      
      if (mainmail.includes(cpfProcurado)) {
        oportunidadesEncontradas.push({
          id: oportunidade.id,
          titulo: oportunidade.title,
          cpf: oportunidade.mainmail,
          status: oportunidade.fkStage,
          pipeline: oportunidade.fkPipeline,
          criadaEm: oportunidade.createdAt,
          dadosFormulario: oportunidade.formsdata || {},
          arquivos: oportunidade.files || [],
          contatos: oportunidade.contacts || []
        });
      }
    }
    
    console.log(`🎯 ${oportunidadesEncontradas.length} oportunidades encontradas para CPF ${cpf}`);
    
    return oportunidadesEncontradas;
    
  } catch (error) {
    console.error('❌ Erro na busca:', error.message);
    throw error;
  }
}
```

## 📊 **Estrutura da Resposta**

### **Oportunidade Encontrada:**
```json
{
  "id": 36383,
  "title": "MARIA DE JESUS SABINO DA SILVA",
  "mainmail": "04973279889",
  "fkStage": 9,
  "fkPipeline": 2,
  "createdAt": "2025-09-12T16:09:27.000Z",
  "formsdata": {
    "98011220": "04973279889",        // CPF
    "0bfc6250": "12/08/1959",         // Data de Nascimento
    "9ed1cef0": "66",                 // Idade
    "917456f0": "MARIA DE JESUS",     // Nome da mãe
    "98167d80": "5581988457906",      // Celular
    "9e7f92b0": "email@exemplo.com",  // Email
    "233a7b80": "1630.32",           // Saldo Devedor
    "5fc51220": "37.79",             // Nova Parcela
    "9cceda30": "37.79",             // Parcela
    "9d947420": "137.72",            // Troco
    "f5f58820": "1.66",              // Taxa Atual
    "f71e0290": "1.66",              // Taxa Nova
    "cd34f870": "BANCO MERCANTIL",   // Banco
    "7f6a0eb0": "1",                 // Agência
    "769db520": "0010185906",        // Conta
    "2fe18130": "DAYCOVAL",          // Banco Proposta
    "2e1d3bf0": "DAYCOVAL",          // Banco Originador
    "79562580": "96",                // Prazo Atual
    "69da8d80": "96",                // Prazo
    "b4e24e90": "84",                // Prazo Restante
    "a88afbf0": "1631008150",        // Número do Benefício
    "3d8b2ff0": "41",                // Espécie do Benefício
    "0c993430": "NÃO",               // NB Bloqueado
    "9af53830": "1"                  // Campo adicional
  },
  "files": [
    {
      "id": 7168,
      "name": "gigacorbanoffline04973279889-2025-09-12.html",
      "mimetype": "text/html",
      "file_length": 73123
    }
  ],
  "contacts": [8872]
}
```

## 🎯 **Mapeamento de Status**

### **Status da Portabilidade:**
- **8** - Início
- **9** - Oferta Troco
- **10** - Digitando
- **35** - Redigitar
- **11** - Aguardando Assinatura
- **12** - Retenção
- **36** - Aguardando Desbloqueio
- **13** - Aguardando Saldo CIP
- **26** - Atuando Saldo
- **14** - Aguardando Averbação
- **15** - Pago

## 🔍 **Exemplo de Uso**

```javascript
// Buscar oportunidade por CPF
const cpf = '04973279889';
const oportunidades = await buscarOportunidadeCompletaPorCPF(cpf);

if (oportunidades.length > 0) {
  console.log('✅ Oportunidades encontradas:');
  
  oportunidades.forEach((op, index) => {
    console.log(`\n${index + 1}. Oportunidade ID: ${op.id}`);
    console.log(`   Nome: ${op.titulo}`);
    console.log(`   CPF: ${op.cpf}`);
    console.log(`   Status: ${op.status}`);
    console.log(`   Criada em: ${new Date(op.criadaEm).toLocaleString('pt-BR')}`);
    
    // Dados do formulário
    const dados = op.dadosFormulario;
    console.log(`   Saldo Devedor: R$ ${dados['233a7b80'] || 'N/A'}`);
    console.log(`   Nova Parcela: R$ ${dados['5fc51220'] || 'N/A'}`);
    console.log(`   Troco: R$ ${dados['9d947420'] || 'N/A'}`);
    console.log(`   Banco: ${dados['cd34f870'] || 'N/A'}`);
    console.log(`   Agência: ${dados['7f6a0eb0'] || 'N/A'}`);
    console.log(`   Conta: ${dados['769db520'] || 'N/A'}`);
  });
} else {
  console.log('❌ Nenhuma oportunidade encontrada para este CPF');
}
```

## ⚠️ **Pontos Importantes**

### **1. Campo mainmail**
- A Kentro usa o campo `mainmail` para armazenar o CPF
- Sempre buscar por CPF no campo `mainmail`, não no campo `email`

### **2. Formatação do CPF**
- Remover formatação antes da busca: `cpf.replace(/\D/g, '')`
- A API pode retornar CPF com ou sem formatação

### **3. Filtros Adicionais**
- Verificar se a oportunidade está aberta (status não final)
- Filtrar por pipeline específico se necessário
- Verificar data de criação para oportunidades recentes

### **4. Tratamento de Erros**
- API pode retornar erro 401 (não autorizado)
- API pode retornar erro 429 (limite de requisições)
- Sempre verificar se a resposta é JSON válido

## 🚀 **Implementação no Sistema Operacional**

```javascript
// Integração com sistema operacional
class BuscadorOportunidades {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.queueId = 25; // Portabilidade
    this.pipelineId = 2; // Portabilidade
  }
  
  async buscarPorCPF(cpf) {
    try {
      const response = await axios.post('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
        queueId: this.queueId,
        apiKey: this.apiKey,
        pipelineId: this.pipelineId
      }, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const cpfProcurado = cpf.replace(/\D/g, '');
      return response.data.filter(op => 
        op.mainmail && op.mainmail.includes(cpfProcurado)
      );
      
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error.message);
      throw error;
    }
  }
  
  async processarOportunidade(oportunidade) {
    // Lógica para processar a oportunidade encontrada
    console.log(`Processando oportunidade ${oportunidade.id}...`);
    
    // Extrair dados do formulário
    const dados = oportunidade.formsdata || {};
    
    return {
      id: oportunidade.id,
      nome: oportunidade.title,
      cpf: oportunidade.mainmail,
      status: oportunidade.fkStage,
      saldoDevedor: dados['233a7b80'],
      novaParcela: dados['5fc51220'],
      troco: dados['9d947420'],
      banco: dados['cd34f870'],
      agencia: dados['7f6a0eb0'],
      conta: dados['769db520']
    };
  }
}

// Uso
const buscador = new BuscadorOportunidades('sua_api_key');
const oportunidades = await buscador.buscarPorCPF('04973279889');
const processadas = oportunidades.map(op => buscador.processarOportunidade(op));
```

## ✅ **Resumo**

1. **Endpoint:** `POST /int/getPipeOpportunities`
2. **Parâmetros:** `queueId: 25`, `pipelineId: 2`, `apiKey`
3. **Busca:** Filtrar por CPF no campo `mainmail`
4. **Dados:** Extrair informações do `formsdata`
5. **Processamento:** Usar dados para integração operacional

**A busca por CPF está funcionando perfeitamente e retorna todos os dados necessários para processamento!** 🎯



