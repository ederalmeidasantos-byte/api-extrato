import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3005;

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

console.log('🤖 ChatGPT Vendedor Independente rodando na porta', PORT);
console.log('🔗 Webhook: http://localhost:3004/webhook/kentro');
console.log('🧪 Teste CPF: http://localhost:3004/teste-cpf');

// Endpoint de status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    port: PORT,
    version: '1.0.0'
  });
});

// Endpoint de teste CPF
app.post('/teste-cpf', async (req, res) => {
  try {
    const { cpf } = req.body;
    
    if (!cpf) {
      return res.json({ error: 'CPF não fornecido' });
    }
    
    console.log('🔍 [TESTE] Buscando cliente por CPF:', cpf);
    
    // Buscar cliente no CRM
    const clienteResponse = await fetch('http://localhost:3001/kentro/buscar-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: cpf })
    });
    
    const clienteData = await clienteResponse.json();
    console.log('📊 [TESTE] Dados encontrados:', clienteData);
    
    res.json({
      success: true,
      cpf: cpf,
      cliente: clienteData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TESTE] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook principal para Kentro
app.post('/webhook/kentro', async (req, res) => {
  try {
    console.log('📨 [WEBHOOK] Mensagem recebida:', req.body);
    
    const { cpf, message, clientNumber, chatId } = req.body;
    const mensagem = message || req.body.text || 'oi';
    
    let resposta = 'Olá! Como posso ajudar com seu empréstimo consignado?';
    let clienteData = null;
    let propostasData = null;
    let margemData = null;
    
    // Buscar dados completos do cliente
    if (cpf) {
      console.log('🔍 [CLIENTE] Buscando cliente por CPF:', cpf);
      try {
        // 1. Buscar dados básicos do cliente
        const clienteResponse = await fetch('http://localhost:3001/kentro/buscar-cliente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpf: cpf })
        });
        
        clienteData = await clienteResponse.json();
        console.log('📊 [CLIENTE] Dados encontrados:', clienteData);
        
        // 2. Se cliente encontrado, buscar propostas
        if (clienteData.success && clienteData.cliente) {
          console.log('🔍 [PROPOSTAS] Buscando propostas do cliente...');
          try {
            const propostasResponse = await fetch(`http://localhost:3001/api/propostas-cliente/${cpf}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (propostasResponse.ok) {
              propostasData = await propostasResponse.json();
              console.log('📋 [PROPOSTAS] Propostas encontradas:', propostasData);
            }
          } catch (error) {
            console.log('⚠️ [PROPOSTAS] Erro ao buscar propostas:', error.message);
          }
          
          // 3. Buscar margem disponível
          console.log('🔍 [MARGEM] Buscando margem disponível...');
          try {
            const margemResponse = await fetch(`http://localhost:3001/api/margem-cliente/${cpf}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (margemResponse.ok) {
              margemData = await margemResponse.json();
              console.log('💰 [MARGEM] Margem encontrada:', margemData);
            }
          } catch (error) {
            console.log('⚠️ [MARGEM] Erro ao buscar margem:', error.message);
          }
        }
      } catch (error) {
        console.error('❌ [CLIENTE] Erro ao buscar cliente:', error);
      }
    }
    
    // Gerar resposta inteligente baseada nos dados encontrados
    if (clienteData && clienteData.success && clienteData.cliente) {
      const cliente = clienteData.cliente;
      const nome = cliente.nome || 'Cliente';
      
      const mensagemLower = mensagem.toLowerCase();
      
      if (mensagemLower.includes('portabilidade')) {
        if (propostasData && propostasData.propostas && propostasData.propostas.length > 0) {
          const propostasAtivas = propostasData.propostas.filter(p => p.status === 'Ativo');
          if (propostasAtivas.length > 0) {
            const proposta = propostasAtivas[0];
            resposta = `Olá ${nome}! Vejo que você tem uma proposta ativa de portabilidade. Parcela atual: R$ ${proposta.parcela}, Saldo: R$ ${proposta.saldoDevedor}. Posso simular uma nova proposta com melhores condições!`;
          } else {
            resposta = `Olá ${nome}! A portabilidade é uma excelente opção! Posso simular as melhores condições para você.`;
          }
        } else {
          resposta = `Olá ${nome}! A portabilidade é uma excelente opção! Posso simular as melhores condições para você.`;
        }
      } else if (mensagemLower.includes('fgts')) {
        resposta = `Olá ${nome}! O saque do FGTS é uma ótima oportunidade! Vou verificar suas condições.`;
      } else if (mensagemLower.includes('taxa')) {
        resposta = `Olá ${nome}! Temos as melhores taxas do mercado! Para portabilidade, posso oferecer até 1,65% ao mês.`;
      } else if (mensagemLower.includes('troco')) {
        if (propostasData && propostasData.propostas && propostasData.propostas.length > 0) {
          const propostasAtivas = propostasData.propostas.filter(p => p.status === 'Ativo');
          if (propostasAtivas.length > 0) {
            const proposta = propostasAtivas[0];
            resposta = `Olá ${nome}! O troco é o dinheiro que sobra após pagar o empréstimo atual! Com sua parcela de R$ ${proposta.parcela}, posso calcular quanto você receberia.`;
          } else {
            resposta = `Olá ${nome}! O troco é o dinheiro que sobra após pagar o empréstimo atual! Posso calcular quanto você receberia.`;
          }
        } else {
          resposta = `Olá ${nome}! O troco é o dinheiro que sobra após pagar o empréstimo atual! Posso calcular quanto você receberia.`;
        }
      } else if (mensagemLower.includes('proposta') || mensagemLower.includes('status')) {
        if (propostasData && propostasData.propostas && propostasData.propostas.length > 0) {
          const propostasAtivas = propostasData.propostas.filter(p => p.status === 'Ativo');
          if (propostasAtivas.length > 0) {
            const proposta = propostasAtivas[0];
            resposta = `Olá ${nome}! Sua proposta está ${proposta.status}. Parcela: R$ ${proposta.parcela}, Saldo: R$ ${proposta.saldoDevedor}. Posso ajudar com alguma dúvida?`;
          } else {
            resposta = `Olá ${nome}! Você tem ${propostasData.propostas.length} propostas no sistema. Posso ajudar com alguma dúvida?`;
          }
        } else {
          resposta = `Olá ${nome}! Não encontrei propostas ativas. Posso ajudar com uma nova proposta?`;
        }
      } else if (mensagemLower.includes('margem')) {
        if (margemData && margemData.margem) {
          resposta = `Olá ${nome}! Sua margem disponível é de R$ ${margemData.margem}. Posso simular propostas dentro desse limite!`;
        } else {
          resposta = `Olá ${nome}! Vou verificar sua margem disponível para simular as melhores propostas!`;
        }
      } else {
        if (propostasData && propostasData.propostas && propostasData.propostas.length > 0) {
          const propostasAtivas = propostasData.propostas.filter(p => p.status === 'Ativo');
          if (propostasAtivas.length > 0) {
            resposta = `Olá ${nome}! Vejo que você tem propostas ativas. Como posso ajudar hoje?`;
          } else {
            resposta = `Olá ${nome}! Você tem ${propostasData.propostas.length} propostas no sistema. Como posso ajudar?`;
          }
        } else {
          resposta = `Olá ${nome}! Como posso ajudar com seu empréstimo consignado hoje?`;
        }
      }
    } else {
      if (mensagem.toLowerCase().includes('portabilidade')) {
        resposta = 'A portabilidade é uma excelente opção! Posso simular as melhores condições para você.';
      } else if (mensagem.toLowerCase().includes('fgts')) {
        resposta = 'O saque do FGTS é uma ótima oportunidade! Vou verificar suas condições.';
      } else if (mensagem.toLowerCase().includes('taxa')) {
        resposta = 'Temos as melhores taxas do mercado! Para portabilidade, posso oferecer até 1,65% ao mês.';
      } else if (mensagem.toLowerCase().includes('troco')) {
        resposta = 'O troco é o dinheiro que sobra após pagar o empréstimo atual! Posso calcular quanto você receberia.';
      }
    }
    
    res.json({
      success: true,
      resposta: resposta,
      cliente: clienteData,
      propostas: propostasData,
      margem: margemData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 ChatGPT Vendedor Independente rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});
