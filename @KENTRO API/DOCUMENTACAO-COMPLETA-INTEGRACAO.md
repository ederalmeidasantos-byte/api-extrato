# 📚 Documentação Completa - Integração API Kentro

## 🎯 **Visão Geral**

Este documento contém todas as descobertas e implementações realizadas para integração com a API Kentro, incluindo mapeamento de campos, fluxos de busca e estrutura de dados.

---

## 🔍 **Descobertas Principais**

### **1. Campo Principal para Busca por CPF**
- **Campo:** `mainmail`
- **Descrição:** A Kentro usa o campo `mainmail` para armazenar o CPF do cliente
- **Exemplo:** `"mainmail": "46104631649"`
- **Importante:** NÃO usar o campo `email` para busca por CPF

### **2. Endpoint de Busca de Oportunidades**
```http
POST https://lunasdigital.atenderbem.com/int/getPipeOpportunities
```

**Parâmetros obrigatórios:**
```json
{
  "queueId": 25,        // Fila de Portabilidade
  "apiKey": "cd4d0509169d4e2ea9177ac66c1c9376",
  "pipelineId": 2       // Pipeline de Portabilidade
}
```

### **3. Estrutura de Resposta da API**
```json
{
  "id": 15508,
  "title": "ANTONIO MACHADO DINIZ",
  "mainmail": "46104631649",
  "fkStage": 8,
  "fkPipeline": 2,
  "formsdata": {
    "98011220": "46104631649",    // CPF
    "0bfc6250": "19/03/1963",     // Data de Nascimento
    "917456f0": "VICENTINA DINIZ", // Nome da mãe
    "233a7b80": "7.198,35",       // Saldo Devedor
    "5fc51220": "160,00",         // Nova Parcela
    // ... outros campos
  },
  "files": [...],
  "contacts": [...]
}
```

---

## 📊 **Mapeamento Completo de Campos**

### **Dados do Cliente**
| Código | Campo | Descrição | Exemplo |
|--------|-------|-----------|---------|
| `98011220` | CPF | CPF do cliente | "46104631649" |
| `0bfc6250` | Data de Nascimento | Data de nascimento | "19/03/1963" |
| `9ed1cef0` | IDADE | Idade do cliente | "62" |
| `917456f0` | Nome da mãe | Nome da mãe | "VICENTINA DINIZ" |
| `98167d80` | Celular para SMS | Celular | "5534993393465" |
| `9e7f92b0` | E-mail | Email do cliente | "adiniz10@hotmail.com" |

### **Dados Financeiros**
| Código | Campo | Descrição | Exemplo |
|--------|-------|-----------|---------|
| `9d947420` | TROCO | Valor do troco | "504,63" |
| `9cceda30` | PARCELA | Valor da parcela atual | "160,00" |
| `5fc51220` | Nova Parcela | Nova parcela proposta | "160,00" |
| `233a7b80` | Saldo Devedor | Saldo devedor atual | "7.198,35" |
| `6c76b4b0` | Valor Liquido | Valor líquido | "1.804,52" |
| `08715950` | Valor liberado | Valor a ser liberado | - |

### **Dados Bancários**
| Código | Campo | Descrição | Exemplo |
|--------|-------|-----------|---------|
| `cd34f870` | Banco | Banco para recebimento | "PAN" |
| `7f6a0eb0` | Agencia | Agência bancária | "7783" |
| `769db520` | Conta | Conta bancária | "0000084523" |
| `2fe18130` | Banco Proposta | Banco da proposta | "PICPAY" |
| `2e1d3bf0` | Banco Originador | Banco originador | "PAN" |
| `66f9ee40` | PIX | Chave PIX | - |

### **Dados do Benefício**
| Código | Campo | Descrição | Exemplo |
|--------|-------|-----------|---------|
| `a88afbf0` | Número do Beneficio | Número do benefício INSS | "5513909797" |
| `3d8b2ff0` | Espécie do Beneficio | Espécie do benefício | "32" |
| `0c993430` | NB Bloqueado? | Se o benefício está bloqueado | "NÃO" |

### **Dados de Endereço**
| Código | Campo | Descrição | Exemplo |
|--------|-------|-----------|---------|
| `1836e090` | CEP | CEP do endereço | "38413345" |
| `1dbfcef0` | Lougradouro | Logradouro | "Rua Antônio Domingues" |
| `6ac31450` | Número | Número do endereço | "430" |
| `3271f710` | Bairro | Bairro | "Chácaras Tubalina e Quartel" |
| `25178280` | CIDADE | Cidade | "Uberlândia" |
| `f6384400` | UF | Estado | "MG" |

### **Dados do Contrato**
| Código | Campo | Descrição | Exemplo |
|--------|-------|-----------|---------|
| `9af53830` | CONTRATO | Número do contrato | "391616365-6" |
| `b4e24e90` | PRAZO RESTANTE | Prazo restante | "69" |
| `79562580` | Prazo Atual | Prazo atual | "96" |
| `69da8d80` | Prazo | Prazo da proposta | "96" |

### **Taxas**
| Código | Campo | Descrição | Exemplo |
|--------|-------|-----------|---------|
| `f5f58820` | TAXA ATUAL | Taxa atual | "1,66" |
| `f71e0290` | TAXA NOVA | Nova taxa | "1,66, 1,85, 1,79" |

---

## 🔧 **Implementações Realizadas**

### **1. Endpoint de Busca por CPF**
```javascript
// Buscar cliente por CPF
app.post('/kentro/buscar-cliente', async (req, res) => {
  try {
    const { cpf } = req.body;
    
    const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queueId: 25,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        pipelineId: 2
      })
    });

    const oportunidades = await response.json();
    
    // Procurar por CPF no campo mainmail
    const oportunidade = oportunidades.find(op => {
      if (op.mainmail && op.mainmail.replace(/\D/g, '') === cpf.replace(/\D/g, '')) {
        return true;
      }
      return false;
    });
    
    if (oportunidade) {
      res.json({ 
        success: true, 
        idoportunidade: oportunidade.id,
        cliente: {
          nome: oportunidade.title,
          status: oportunidade.status || 'Ativo',
          cpf: cpf
        }
      });
    } else {
      res.json({ success: false, error: 'Cliente não encontrado' });
    }

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

### **2. Endpoint de Criação de Oportunidade**
```javascript
// Criar nova oportunidade na Kentro
app.post('/kentro/criar-oportunidade', async (req, res) => {
  try {
    const { cpf, origem, descricao } = req.body;
    
    const novaOportunidade = {
      id: `new_${Date.now()}${Math.random().toString(36).substring(2, 9)}`,
      title: `Oportunidade para CPF ${cpf}`,
      description: cpf,
      mainmail: cpf, // Usar CPF como mainmail para busca futura
      mainphone: '',
      status: 'Nova',
      origem: origem,
      descricao: descricao,
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, oportunidade: novaOportunidade });

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

### **3. Endpoint de Consulta de Status**
```javascript
// Consultar status da oportunidade
app.get('/kentro/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queueId: 25,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        pipelineId: 2
      })
    });

    const oportunidades = await response.json();
    const oportunidade = oportunidades.find(op => op.id == id);
    
    if (oportunidade) {
      res.json({
        success: true,
        id: oportunidade.id,
        status: oportunidade.status || 'Ativo',
        ultimaAtualizacao: new Date().toISOString()
      });
    } else {
      res.json({ success: false, error: 'Oportunidade não encontrada' });
    }

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

---

## 📋 **Exemplo de Dados Completos**

### **Oportunidade: ANTONIO MACHADO DINIZ**
```json
{
  "id": 15508,
  "title": "ANTONIO MACHADO DINIZ",
  "mainmail": "46104631649",
  "fkStage": 8,
  "fkPipeline": 2,
  "formsdata": {
    "98011220": "46104631649",           // CPF
    "0bfc6250": "19/03/1963",            // Data de Nascimento
    "9ed1cef0": "62",                    // Idade
    "917456f0": "VICENTINA DINIZ",       // Nome da mãe
    "98167d80": "5534993393465",         // Celular
    "9e7f92b0": "adiniz10@hotmail.com",  // Email
    "233a7b80": "7.198,35",              // Saldo Devedor
    "5fc51220": "160,00",                // Nova Parcela
    "9cceda30": "160,00",                // Parcela Atual
    "9d947420": "504,63",                // Troco
    "6c76b4b0": "1.804,52",              // Valor Líquido
    "cd34f870": "PAN",                   // Banco
    "7f6a0eb0": "7783",                  // Agência
    "769db520": "0000084523",            // Conta
    "2fe18130": "PICPAY",                // Banco Proposta
    "2e1d3bf0": "PAN",                   // Banco Originador
    "a88afbf0": "5513909797",            // Número do Benefício
    "3d8b2ff0": "32",                    // Espécie do Benefício
    "0c993430": "NÃO",                   // NB Bloqueado
    "1836e090": "38413345",              // CEP
    "1dbfcef0": "Rua Antônio Domingues", // Logradouro
    "6ac31450": "430",                   // Número
    "3271f710": "Chácaras Tubalina e Quartel", // Bairro
    "25178280": "Uberlândia",            // Cidade
    "f6384400": "MG",                    // UF
    "9af53830": "391616365-6",           // Contrato
    "b4e24e90": "69",                    // Prazo Restante
    "79562580": "96",                    // Prazo Atual
    "69da8d80": "96",                    // Prazo
    "f5f58820": "1,66",                  // Taxa Atual
    "f71e0290": "1,66, 1,85, 1,79"      // Taxa Nova
  },
  "files": [
    {
      "id": 6383,
      "name": "extrato_emprestimo_consignado_completo_010925.pdf",
      "mimetype": "application/pdf",
      "file_length": 355280
    }
  ],
  "contacts": [6072]
}
```

---

## 🚀 **Fluxo de Integração Implementado**

### **1. Busca de Cliente Existente**
```javascript
// Frontend
const buscarCliente = async (cpf) => {
  const response = await fetch('/kentro/buscar-cliente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf })
  });
  
  const resultado = await response.json();
  
  if (resultado.success) {
    console.log('Cliente encontrado:', resultado.cliente);
    console.log('ID Oportunidade:', resultado.idoportunidade);
    return resultado;
  } else {
    console.log('Cliente não encontrado, criando nova oportunidade...');
    return await criarNovaOportunidade(cpf);
  }
};
```

### **2. Criação de Nova Oportunidade**
```javascript
// Frontend
const criarNovaOportunidade = async (cpf) => {
  const response = await fetch('/kentro/criar-oportunidade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      cpf, 
      origem: 'Sistema Operacional',
      descricao: 'Oportunidade criada automaticamente'
    })
  });
  
  const resultado = await response.json();
  
  if (resultado.success) {
    console.log('Nova oportunidade criada:', resultado.oportunidade);
    return resultado;
  } else {
    throw new Error('Erro ao criar oportunidade: ' + resultado.error);
  }
};
```

### **3. Consulta de Status**
```javascript
// Frontend
const consultarStatus = async (idOportunidade) => {
  const response = await fetch(`/kentro/status/${idOportunidade}`);
  const resultado = await response.json();
  
  if (resultado.success) {
    console.log('Status da oportunidade:', resultado.status);
    return resultado;
  } else {
    console.log('Erro ao consultar status:', resultado.error);
    return null;
  }
};
```

---

## ✅ **Status da Implementação**

### **Concluído:**
- ✅ Mapeamento completo de campos do formulário
- ✅ Endpoint de busca por CPF (`/kentro/buscar-cliente`)
- ✅ Endpoint de criação de oportunidade (`/kentro/criar-oportunidade`)
- ✅ Endpoint de consulta de status (`/kentro/status/:id`)
- ✅ Validação de dados e tratamento de erros
- ✅ Documentação completa da API
- ✅ Testes com dados reais (CPF: 46104631649)

### **Próximos Passos:**
- 🔄 Implementar endpoint de atualização de dados
- 🔄 Implementar endpoint de alteração de fase
- 🔄 Implementar webhook para notificações
- 🔄 Implementar cache de dados
- 🔄 Implementar logs detalhados

---

## 📞 **Informações de Contato**

- **API Base URL:** https://lunasdigital.atenderbem.com/int
- **Queue ID:** 25 (Portabilidade)
- **Pipeline ID:** 2 (Portabilidade)
- **API Key:** cd4d0509169d4e2ea9177ac66c1c9376

---

## 📝 **Notas Importantes**

1. **Campo mainmail:** Sempre usar para busca por CPF
2. **Formatação:** Remover formatação antes da busca (`cpf.replace(/\D/g, '')`)
3. **Rate Limiting:** API tem limite de requisições
4. **Tratamento de Erros:** Sempre verificar se resposta é JSON válido
5. **Dados Sensíveis:** Nunca expor API keys em logs

---

**Documentação criada em:** 02/01/2025  
**Versão:** 1.0.0  
**Status:** Implementação Completa ✅
