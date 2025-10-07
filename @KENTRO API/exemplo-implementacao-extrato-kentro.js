/**
 * Exemplo de Implementação - API Extrair Extrato com ID Kentro
 * Demonstra como modificar a API para incluir ID da Kentro
 */

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();

// Configuração do multer para upload de arquivos
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ========================================
// 1. ENDPOINT MODIFICADO - UPLOAD COM ID KENTRO
// ========================================

app.post('/api/extrair-extrato', upload.single('extrato'), async (req, res) => {
  try {
    console.log('📄 Iniciando extração de extrato...');
    
    // Validar parâmetros obrigatórios
    const { kentroId, cpf } = req.body;
    
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
    
    console.log(`   - ID Kentro: ${kentroId}`);
    console.log(`   - CPF: ${cpf}`);
    console.log(`   - Arquivo: ${req.file.originalname}`);
    
    // 1. Verificar se a oportunidade existe na Kentro
    console.log('🔍 Verificando oportunidade na Kentro...');
    const oportunidadeExiste = await verificarOportunidadeKentro(kentroId, cpf);
    
    if (!oportunidadeExiste) {
      return res.status(404).json({ 
        error: 'Oportunidade não encontrada na Kentro',
        kentroId: kentroId,
        cpf: cpf
      });
    }
    
    console.log('✅ Oportunidade encontrada na Kentro');
    
    // 2. Processar extrato com ChatGPT
    console.log('🤖 Processando extrato com ChatGPT...');
    const dadosExtraidos = await processarExtratoComChatGPT(req.file, cpf);
    
    console.log('✅ Dados extraídos com sucesso');
    
    // 3. Retornar dados + ID Kentro
    const resultado = {
      success: true,
      kentroId: kentroId,
      cpf: cpf,
      dadosExtraidos: dadosExtraidos,
      timestamp: new Date().toISOString(),
      arquivo: {
        nome: req.file.originalname,
        tamanho: req.file.size,
        tipo: req.file.mimetype
      }
    };
    
    console.log('📊 Resultado da extração:', resultado);
    
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro ao processar extrato:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      kentroId: req.body.kentroId,
      cpf: req.body.cpf
    });
  }
});

// ========================================
// 2. FUNÇÃO PARA VERIFICAR OPORTUNIDADE NA KENTRO
// ========================================

async function verificarOportunidadeKentro(kentroId, cpf) {
  try {
    // Buscar oportunidade específica na Kentro
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
    
    // Procurar oportunidade pelo ID e CPF
    const oportunidade = response.data.find(op => 
      op.id == kentroId && 
      op.mainmail && 
      op.mainmail.includes(cpf.replace(/\D/g, ''))
    );
    
    return oportunidade || null;
    
  } catch (error) {
    console.error('Erro ao verificar oportunidade na Kentro:', error.message);
    return null;
  }
}

// ========================================
// 3. FUNÇÃO PARA PROCESSAR EXTRATO COM CHATGPT
// ========================================

async function processarExtratoComChatGPT(arquivo, cpf) {
  try {
    // 1. Converter PDF para texto (simulação)
    console.log('   - Convertendo PDF para texto...');
    const textoExtrato = await extrairTextoPDF(arquivo);
    
    // 2. Enviar para ChatGPT
    console.log('   - Enviando para ChatGPT...');
    const prompt = criarPromptExtracao(cpf);
    const respostaChatGPT = await enviarParaChatGPT(prompt, textoExtrato);
    
    // 3. Processar resposta
    console.log('   - Processando resposta do ChatGPT...');
    const dadosExtraidos = JSON.parse(respostaChatGPT);
    
    return dadosExtraidos;
    
  } catch (error) {
    console.error('Erro ao processar com ChatGPT:', error);
    throw error;
  }
}

// ========================================
// 4. FUNÇÃO PARA EXTRAIR TEXTO DO PDF
// ========================================

async function extrairTextoPDF(arquivo) {
  // Simulação - em produção usar biblioteca como pdf-parse
  return `
    EXTRATO DE EMPRÉSTIMO CONSIGNADO
    CPF: ${arquivo.originalname.includes('04973279889') ? '04973279889' : '00000000000'}
    Nome: MARIA DE JESUS SABINO DA SILVA
    Data Nascimento: 12/08/1959
    Nome da Mãe: MARIA DE JESUS
    Celular: 5581988457906
    Email: maria@exemplo.com
    Saldo Devedor: R$ 1.630,32
    Parcela Atual: R$ 37,79
    Taxa de Juros: 1,66%
    Prazo Restante: 84 meses
    Banco Originador: DAYCOVAL
    Banco Proposta: DAYCOVAL
    Agência: 1
    Conta: 0010185906
    Número do Benefício: 1631008150
    Espécie do Benefício: 41
  `;
}

// ========================================
// 5. FUNÇÃO PARA CRIAR PROMPT DO CHATGPT
// ========================================

function criarPromptExtracao(cpf) {
  return `
    Extraia os seguintes dados do extrato de empréstimo consignado:
    
    CPF: ${cpf}
    
    Dados a extrair (retorne em formato JSON):
    {
      "nomeCompleto": "Nome completo do cliente",
      "dataNascimento": "DD/MM/AAAA",
      "nomeMae": "Nome da mãe",
      "celular": "Número do celular",
      "email": "Email do cliente",
      "saldoDevedor": "Valor do saldo devedor (apenas números)",
      "parcelaAtual": "Valor da parcela atual (apenas números)",
      "taxaJuros": "Taxa de juros (apenas números)",
      "prazoRestante": "Prazo restante em meses",
      "bancoOriginador": "Nome do banco originador",
      "bancoProposta": "Nome do banco da proposta",
      "agencia": "Número da agência",
      "conta": "Número da conta",
      "numeroBeneficio": "Número do benefício",
      "especieBeneficio": "Espécie do benefício"
    }
    
    Retorne apenas o JSON válido, sem texto adicional.
  `;
}

// ========================================
// 6. FUNÇÃO PARA ENVIAR PARA CHATGPT
// ========================================

async function enviarParaChatGPT(prompt, textoExtrato) {
  // Simulação - em produção usar API real do ChatGPT
  console.log('   - Simulando resposta do ChatGPT...');
  
  // Simular resposta baseada no CPF
  if (textoExtrato.includes('04973279889')) {
    return JSON.stringify({
      nomeCompleto: "MARIA DE JESUS SABINO DA SILVA",
      dataNascimento: "12/08/1959",
      nomeMae: "MARIA DE JESUS",
      celular: "5581988457906",
      email: "maria@exemplo.com",
      saldoDevedor: "1630.32",
      parcelaAtual: "37.79",
      taxaJuros: "1.66",
      prazoRestante: "84",
      bancoOriginador: "DAYCOVAL",
      bancoProposta: "DAYCOVAL",
      agencia: "1",
      conta: "0010185906",
      numeroBeneficio: "1631008150",
      especieBeneficio: "41"
    });
  }
  
  // Resposta padrão para outros CPFs
  return JSON.stringify({
    nomeCompleto: "CLIENTE EXEMPLO",
    dataNascimento: "01/01/1980",
    nomeMae: "MÃE EXEMPLO",
    celular: "11999999999",
    email: "cliente@exemplo.com",
    saldoDevedor: "1000.00",
    parcelaAtual: "50.00",
    taxaJuros: "2.00",
    prazoRestante: "60",
    bancoOriginador: "BANCO EXEMPLO",
    bancoProposta: "BANCO EXEMPLO",
    agencia: "1234",
    conta: "12345678",
    numeroBeneficio: "1234567890",
    especieBeneficio: "41"
  });
}

// ========================================
// 7. ENDPOINT PARA PREENCHER DADOS NA KENTRO
// ========================================

app.post('/api/preencher-kentro', async (req, res) => {
  try {
    console.log('🔄 Preenchendo dados na Kentro...');
    
    const { kentroId, dadosExtraidos, cpf } = req.body;
    
    if (!kentroId || !dadosExtraidos || !cpf) {
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios não informados',
        required: ['kentroId', 'dadosExtraidos', 'cpf']
      });
    }
    
    console.log(`   - ID Kentro: ${kentroId}`);
    console.log(`   - CPF: ${cpf}`);
    
    // 1. Mapear dados extraídos para campos da Kentro
    console.log('   - Mapeando dados para campos Kentro...');
    const dadosMapeados = mapearDadosParaKentro(dadosExtraidos);
    
    // 2. Atualizar oportunidade na Kentro
    console.log('   - Atualizando oportunidade na Kentro...');
    const resultado = await atualizarOportunidadeKentro(kentroId, dadosMapeados);
    
    console.log('✅ Dados preenchidos na Kentro com sucesso');
    
    res.json({
      success: true,
      kentroId: kentroId,
      cpf: cpf,
      dadosAtualizados: dadosMapeados,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao preencher Kentro:', error);
    res.status(500).json({ 
      error: 'Erro ao preencher dados na Kentro',
      message: error.message,
      kentroId: req.body.kentroId,
      cpf: req.body.cpf
    });
  }
});

// ========================================
// 8. FUNÇÃO PARA MAPEAR DADOS PARA KENTRO
// ========================================

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

// ========================================
// 9. FUNÇÃO PARA CALCULAR IDADE
// ========================================

function calcularIdade(dataNascimento) {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento.split('/').reverse().join('-'));
  const idade = hoje.getFullYear() - nascimento.getFullYear();
  return idade.toString();
}

// ========================================
// 10. FUNÇÃO PARA ATUALIZAR OPORTUNIDADE NA KENTRO
// ========================================

async function atualizarOportunidadeKentro(kentroId, dadosMapeados) {
  try {
    // Simulação - em produção usar endpoint real da Kentro
    console.log(`   - Atualizando oportunidade ${kentroId}...`);
    console.log(`   - Dados: ${JSON.stringify(dadosMapeados, null, 2)}`);
    
    // Simular sucesso
    return {
      success: true,
      kentroId: kentroId,
      camposAtualizados: Object.keys(dadosMapeados).length
    };
    
  } catch (error) {
    console.error('Erro ao atualizar oportunidade na Kentro:', error);
    throw error;
  }
}

// ========================================
// 11. ENDPOINT DE TESTE
// ========================================

app.get('/api/teste-extrato-kentro', (req, res) => {
  res.json({
    message: 'API Extrair Extrato com ID Kentro funcionando!',
    endpoints: {
      'POST /api/extrair-extrato': 'Upload de extrato com ID Kentro',
      'POST /api/preencher-kentro': 'Preencher dados na Kentro',
      'GET /api/teste-extrato-kentro': 'Teste da API'
    },
    exemplo: {
      url: '/api/extrair-extrato',
      method: 'POST',
      body: {
        kentroId: '36383',
        cpf: '04973279889',
        extrato: 'arquivo.pdf'
      }
    }
  });
});

// ========================================
// 12. CONFIGURAÇÃO DO SERVIDOR
// ========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📄 API Extrair Extrato com ID Kentro ativa`);
  console.log(`🔗 Teste: http://localhost:${PORT}/api/teste-extrato-kentro`);
});

module.exports = app;



