const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');

// Importar módulos do sistema
const ChatGPTVendedor = require('./core/chatgpt-vendedor');
const PortabilidadeVendedor = require('./portabilidade/vendedor');
const FGTSVendedor = require('./fgts/vendedor');
const KentroAPI = require('./core/kentro-api');
const MessageClassifier = require('./core/message-classifier');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurações
const config = {
  kentro: {
    queueId: 25,
    apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
    baseUrl: 'https://lunasdigital.atenderbem.com'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'sua-chave-aqui'
  }
};

// Instanciar vendedores
const portabilidadeVendedor = new PortabilidadeVendedor(config);
const fgtsVendedor = new FGTSVendedor(config);
const kentroAPI = new KentroAPI(config.kentro);
const messageClassifier = new MessageClassifier();

// ====== WEBHOOK PARA RECEBER MENSAGENS DO KENTRO ======
app.post('/webhook/kentro', async (req, res) => {
  try {
    console.log('📨 [WEBHOOK] Mensagem recebida do Kentro:', req.body);
    
    const { chatId, clientNumber, message, messageType, cpf } = req.body;
    
    if (!chatId || !clientNumber || !message) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    }
    
    // Buscar dados do cliente se CPF foi fornecido
    let clienteData = null;
    if (cpf) {
      console.log('🔍 [CLIENTE] Buscando cliente por CPF:', cpf);
      try {
        const clienteResponse = await fetch('http://localhost:3000/kentro/buscar-cliente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpf: cpf })
        });
        
        clienteData = await clienteResponse.json();
        console.log('📊 [CLIENTE] Dados encontrados:', clienteData);
      } catch (error) {
        console.error('❌ [CLIENTE] Erro ao buscar cliente:', error);
      }
    }
    
    // Classificar a mensagem
    const classification = await messageClassifier.classify(message);
    console.log('🎯 [CLASSIFICACAO]', classification);
    
    // Determinar qual vendedor usar baseado no contexto
    let vendedor;
    if (classification.produto === 'portabilidade') {
      vendedor = portabilidadeVendedor;
    } else if (classification.produto === 'fgts') {
      vendedor = fgtsVendedor;
    } else {
      // Vendedor genérico ou portabilidade como padrão
      vendedor = portabilidadeVendedor;
    }
    
    // Processar mensagem com o vendedor (incluindo dados do cliente)
    const resposta = await vendedor.processarMensagem({
      chatId,
      clientNumber,
      message,
      classification,
      cliente: clienteData
    });
    
    // Enviar resposta via Kentro
    if (resposta.enviarResposta) {
      await kentroAPI.enviarMensagem(chatId, resposta.texto, resposta.botoes);
    }
    
    res.json({
      success: true,
      classification,
      cliente: clienteData,
      resposta: {
        tipoMensagem: resposta.tipoMensagem,
        enviarResposta: resposta.enviarResposta
      }
    });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== ENDPOINT PARA TESTE MANUAL ======
app.post('/teste-chatgpt', async (req, res) => {
  try {
    const { numero, mensagem, produto = 'portabilidade' } = req.body;
    
    console.log(`🤖 [TESTE] Processando mensagem: "${mensagem}" para ${numero}`);
    
    // Buscar ou criar chat
    const chatId = await kentroAPI.buscarOuCriarChat(numero);
    
    // Classificar mensagem
    const classification = await messageClassifier.classify(mensagem);
    
    // Processar com vendedor
    let vendedor = portabilidadeVendedor;
    if (produto === 'fgts') {
      vendedor = fgtsVendedor;
    }
    
    const resposta = await vendedor.processarMensagem({
      chatId,
      clientNumber: numero,
      message: mensagem,
      classification
    });
    
    // Enviar resposta
    if (resposta.enviarResposta) {
      await kentroAPI.enviarMensagem(chatId, resposta.texto, resposta.botoes);
    }
    
    res.json({
      success: true,
      chatId,
      classification,
      resposta
    });
    
  } catch (error) {
    console.error('❌ [TESTE] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== ENDPOINT PARA DADOS DO CLIENTE ======
app.get('/cliente/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    const dadosCliente = await kentroAPI.buscarDadosCliente(numero);
    res.json(dadosCliente);
  } catch (error) {
    console.error('❌ [CLIENTE] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== ENDPOINT PARA SIMULAR PROPOSTA ======
app.post('/simular-proposta', async (req, res) => {
  try {
    const { numero, tipo, dados } = req.body;
    
    let vendedor = portabilidadeVendedor;
    if (tipo === 'fgts') {
      vendedor = fgtsVendedor;
    }
    
    const proposta = await vendedor.simularProposta(numero, dados);
    res.json(proposta);
    
  } catch (error) {
    console.error('❌ [SIMULACAO] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== ENDPOINT SIMPLES PARA TESTE DE CPF ======
app.post('/teste-cpf', async (req, res) => {
  try {
    const { cpf, mensagem } = req.body;
    
    if (!cpf) {
      return res.json({ success: false, error: 'CPF não fornecido' });
    }
    
    console.log('🔍 [TESTE] Buscando cliente por CPF:', cpf);
    
    // Buscar dados do cliente
    let clienteData = null;
    try {
      const clienteResponse = await fetch('http://localhost:3000/kentro/buscar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpf })
      });
      
      clienteData = await clienteResponse.json();
      console.log('📊 [TESTE] Dados encontrados:', clienteData);
    } catch (error) {
      console.error('❌ [TESTE] Erro ao buscar cliente:', error);
      return res.json({ success: false, error: 'Erro ao buscar cliente: ' + error.message });
    }
    
    // Resposta personalizada baseada nos dados do cliente
    let resposta = 'Olá! Como posso ajudar com seu empréstimo consignado?';
    
    if (clienteData.success && clienteData.cliente) {
      const cliente = clienteData.cliente;
      const nome = cliente.nome || 'Cliente';
      
      if (mensagem && mensagem.toLowerCase().includes('portabilidade')) {
        resposta = `Olá ${nome}! A portabilidade é uma excelente opção! Vejo que você está no status: ${cliente.status}. Posso simular as melhores condições para você.`;
      } else if (mensagem && mensagem.toLowerCase().includes('fgts')) {
        resposta = `Olá ${nome}! O saque do FGTS é uma ótima oportunidade! Vou verificar suas condições.`;
      } else {
        resposta = `Olá ${nome}! Como posso ajudar com seu empréstimo consignado?`;
      }
    } else {
      resposta = 'Cliente não encontrado. Posso ajudar com uma nova proposta?';
    }
    
    res.json({
      success: true,
      cpf: cpf,
      cliente: clienteData,
      resposta: resposta,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TESTE] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== PÁGINA DE TESTE ======
app.get('/teste', (req, res) => {
  res.sendFile(path.join(__dirname, 'teste.html'));
});

// ====== INICIAR SERVIDOR ======
app.listen(PORT, () => {
  console.log(`🤖 ChatGPT Vendedor rodando na porta ${PORT}`);
  console.log(`📱 Teste: http://localhost:${PORT}/teste`);
  console.log(`🔗 Webhook: http://localhost:${PORT}/webhook/kentro`);
});

module.exports = app;
