# 🔄 API Extrair Extrato com ID Kentro

## 📋 **Visão Geral**

Modificação da API de extrair extrato para incluir o ID da oportunidade Kentro, permitindo que o ChatGPT retorne o ID junto com os dados extraídos para preenchimento automático no sistema.

## 🎯 **Fluxo Atual vs Novo**

### **Fluxo Atual:**
1. Upload do extrato PDF
2. ChatGPT extrai dados
3. Retorna apenas dados extraídos
4. Sistema precisa buscar manualmente a oportunidade

### **Fluxo Novo:**
1. Upload do extrato PDF + ID Kentro
2. ChatGPT extrai dados
3. Retorna dados extraídos + ID Kentro
4. Sistema preenche automaticamente a oportunidade

## 🔧 **Modificações Necessárias**

### **1. Endpoint de Upload**

```javascript
// Endpoint modificado para receber ID Kentro
app.post('/api/extrair-extrato', upload.single('extrato'), async (req, res) => {
  try {
    const { kentroId, cpf } = req.body; // Novos parâmetros
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Arquivo não enviado',
        required: ['extrato', 'kentroId', 'cpf']
      });
    }
    
    if (!kentroId || !cpf) {
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios não informados',
        required: ['kentroId', 'cpf']
      });
    }
    
    // Processar extrato com ChatGPT
    const dadosExtraidos = await processarExtratoComChatGPT(req.file, cpf);
    
    // Retornar dados + ID Kentro
    res.json({
      success: true,
      kentroId: kentroId,
      cpf: cpf,
      dadosExtraidos: dadosExtraidos,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao processar extrato:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});
```

### **2. Função de Processamento com ChatGPT**

```javascript
async function processarExtratoComChatGPT(arquivo, cpf) {
  try {
    // 1. Converter PDF para texto
    const textoExtrato = await extrairTextoPDF(arquivo);
    
    // 2. Enviar para ChatGPT com prompt específico
    const prompt = `
    Extraia os seguintes dados do extrato de empréstimo consignado:
    
    CPF: ${cpf}
    
    Dados a extrair:
    - Nome completo
    - Data de nascimento
    - Nome da mãe
    - Celular
    - Email
    - Saldo devedor
    - Valor da parcela atual
    - Taxa de juros atual
    - Prazo restante
    - Banco originador
    - Banco da proposta
    - Agência
    - Conta
    - Número do benefício
    - Espécie do benefício
    
    Retorne os dados em formato JSON válido.
    `;
    
    const respostaChatGPT = await enviarParaChatGPT(prompt, textoExtrato);
    
    // 3. Processar resposta do ChatGPT
    const dadosExtraidos = JSON.parse(respostaChatGPT);
    
    return dadosExtraidos;
    
  } catch (error) {
    console.error('Erro ao processar com ChatGPT:', error);
    throw error;
  }
}
```

### **3. Endpoint de Preenchimento Automático**

```javascript
// Novo endpoint para preencher dados na Kentro
app.post('/api/preencher-kentro', async (req, res) => {
  try {
    const { kentroId, dadosExtraidos, cpf } = req.body;
    
    // 1. Buscar oportunidade na Kentro
    const oportunidade = await buscarOportunidadeKentro(kentroId);
    
    if (!oportunidade) {
      return res.status(404).json({ 
        error: 'Oportunidade não encontrada',
        kentroId: kentroId 
      });
    }
    
    // 2. Mapear dados extraídos para campos da Kentro
    const dadosMapeados = mapearDadosParaKentro(dadosExtraidos);
    
    // 3. Atualizar oportunidade na Kentro
    const resultado = await atualizarOportunidadeKentro(kentroId, dadosMapeados);
    
    res.json({
      success: true,
      kentroId: kentroId,
      cpf: cpf,
      dadosAtualizados: dadosMapeados,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao preencher Kentro:', error);
    res.status(500).json({ 
      error: 'Erro ao preencher dados na Kentro',
      message: error.message 
    });
  }
});
```

## 📝 **Estrutura da Requisição**

### **Upload de Extrato:**
```javascript
const formData = new FormData();
formData.append('extrato', arquivoPDF);
formData.append('kentroId', '36383');        // ID da oportunidade Kentro
formData.append('cpf', '04973279889');       // CPF do cliente

fetch('/api/extrair-extrato', {
  method: 'POST',
  body: formData
});
```

### **Resposta da Extração:**
```json
{
  "success": true,
  "kentroId": "36383",
  "cpf": "04973279889",
  "dadosExtraidos": {
    "nomeCompleto": "MARIA DE JESUS SABINO DA SILVA",
    "dataNascimento": "12/08/1959",
    "nomeMae": "MARIA DE JESUS",
    "celular": "5581988457906",
    "email": "maria@exemplo.com",
    "saldoDevedor": "1630.32",
    "parcelaAtual": "37.79",
    "taxaJuros": "1.66",
    "prazoRestante": "84",
    "bancoOriginador": "DAYCOVAL",
    "bancoProposta": "DAYCOVAL",
    "agencia": "1",
    "conta": "0010185906",
    "numeroBeneficio": "1631008150",
    "especieBeneficio": "41"
  },
  "timestamp": "2025-10-01T23:56:55.000Z"
}
```

## 🔄 **Fluxo Completo**

### **1. Upload com ID Kentro:**
```javascript
// Frontend - Upload do extrato
async function uploadExtratoComKentro(arquivo, kentroId, cpf) {
  const formData = new FormData();
  formData.append('extrato', arquivo);
  formData.append('kentroId', kentroId);
  formData.append('cpf', cpf);
  
  const response = await fetch('/api/extrair-extrato', {
    method: 'POST',
    body: formData
  });
  
  const resultado = await response.json();
  return resultado;
}
```

### **2. Preenchimento Automático:**
```javascript
// Frontend - Preencher dados na Kentro
async function preencherKentro(kentroId, dadosExtraidos, cpf) {
  const response = await fetch('/api/preencher-kentro', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      kentroId: kentroId,
      dadosExtraidos: dadosExtraidos,
      cpf: cpf
    })
  });
  
  const resultado = await response.json();
  return resultado;
}
```

### **3. Fluxo Integrado:**
```javascript
// Fluxo completo
async function processarExtratoCompleto(arquivo, kentroId, cpf) {
  try {
    // 1. Extrair dados do extrato
    console.log('📄 Extraindo dados do extrato...');
    const extração = await uploadExtratoComKentro(arquivo, kentroId, cpf);
    
    if (!extração.success) {
      throw new Error('Erro na extração: ' + extração.error);
    }
    
    console.log('✅ Dados extraídos:', extração.dadosExtraidos);
    
    // 2. Preencher dados na Kentro
    console.log('🔄 Preenchendo dados na Kentro...');
    const preenchimento = await preencherKentro(kentroId, extração.dadosExtraidos, cpf);
    
    if (!preenchimento.success) {
      throw new Error('Erro no preenchimento: ' + preenchimento.error);
    }
    
    console.log('✅ Dados preenchidos na Kentro:', preenchimento.dadosAtualizados);
    
    return {
      success: true,
      kentroId: kentroId,
      cpf: cpf,
      dadosExtraidos: extração.dadosExtraidos,
      dadosAtualizados: preenchimento.dadosAtualizados
    };
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    throw error;
  }
}
```

## 🎯 **Mapeamento de Campos**

### **Dados Extraídos → Campos Kentro:**
```javascript
function mapearDadosParaKentro(dadosExtraidos) {
  return {
    // Dados do Cliente
    '98011220': dadosExtraidos.cpf,                    // CPF
    '0bfc6250': dadosExtraidos.dataNascimento,         // Data de Nascimento
    '9ed1cef0': calcularIdade(dadosExtraidos.dataNascimento), // Idade
    '917456f0': dadosExtraidos.nomeMae,                // Nome da mãe
    '98167d80': dadosExtraidos.celular,                // Celular
    '9e7f92b0': dadosExtraidos.email,                  // Email
    
    // Dados Financeiros
    '233a7b80': dadosExtraidos.saldoDevedor,           // Saldo Devedor
    '5fc51220': dadosExtraidos.parcelaAtual,           // Nova Parcela
    '9cceda30': dadosExtraidos.parcelaAtual,           // Parcela
    'f5f58820': dadosExtraidos.taxaJuros,              // Taxa Atual
    'f71e0290': dadosExtraidos.taxaJuros,              // Taxa Nova
    'b4e24e90': dadosExtraidos.prazoRestante,          // Prazo Restante
    
    // Dados Bancários
    'cd34f870': dadosExtraidos.bancoProposta,          // Banco
    '7f6a0eb0': dadosExtraidos.agencia,                // Agência
    '769db520': dadosExtraidos.conta,                  // Conta
    '2fe18130': dadosExtraidos.bancoProposta,          // Banco Proposta
    '2e1d3bf0': dadosExtraidos.bancoOriginador,        // Banco Originador
    
    // Dados do Benefício
    'a88afbf0': dadosExtraidos.numeroBeneficio,        // Número do Benefício
    '3d8b2ff0': dadosExtraidos.especieBeneficio        // Espécie do Benefício
  };
}
```

## 🔧 **Implementação no Sistema Operacional**

### **1. Interface de Upload:**
```html
<!-- Formulário de upload com ID Kentro -->
<form id="uploadForm" enctype="multipart/form-data">
  <div class="form-group">
    <label>ID Kentro:</label>
    <input type="text" id="kentroId" name="kentroId" required>
  </div>
  
  <div class="form-group">
    <label>CPF:</label>
    <input type="text" id="cpf" name="cpf" required>
  </div>
  
  <div class="form-group">
    <label>Extrato PDF:</label>
    <input type="file" id="extrato" name="extrato" accept=".pdf" required>
  </div>
  
  <button type="submit">Processar Extrato</button>
</form>
```

### **2. JavaScript de Processamento:**
```javascript
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const kentroId = document.getElementById('kentroId').value;
  const cpf = document.getElementById('cpf').value;
  const arquivo = document.getElementById('extrato').files[0];
  
  try {
    // Processar extrato completo
    const resultado = await processarExtratoCompleto(arquivo, kentroId, cpf);
    
    console.log('✅ Processamento concluído:', resultado);
    
    // Mostrar resultado na interface
    mostrarResultado(resultado);
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    mostrarErro(error.message);
  }
});
```

## ✅ **Benefícios da Modificação**

1. **🔄 Integração Automática** - Dados preenchidos automaticamente na Kentro
2. **⚡ Eficiência** - Elimina busca manual de oportunidades
3. **🎯 Precisão** - ID Kentro garante que os dados vão para a oportunidade correta
4. **📊 Rastreabilidade** - Possível rastrear qual extrato gerou quais dados
5. **🔧 Flexibilidade** - Sistema pode funcionar com ou sem ID Kentro

## 🚀 **Próximos Passos**

1. **✅ Modificar endpoint** de extrair extrato
2. **✅ Implementar mapeamento** de dados para Kentro
3. **✅ Criar endpoint** de preenchimento automático
4. **✅ Atualizar interface** para incluir ID Kentro
5. **✅ Testar fluxo completo** com dados reais

**A modificação está pronta para implementação!** 🎯



