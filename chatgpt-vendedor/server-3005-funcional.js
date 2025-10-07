import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3004;

// Middleware básico do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('🤖 ChatGPT Vendedor FUNCIONAL rodando na porta', PORT);
console.log('🔗 Webhook: http://localhost:3005/webhook/kentro');

// Endpoint de status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    port: PORT,
    version: '4.0.0'
  });
});

// Webhook principal para Kentro
app.post('/webhook/kentro', async (req, res) => {
  try {
    console.log('📨 [WEBHOOK] Mensagem recebida:', req.body);
    
    const { cpf, message, clientNumber, chatId } = req.body;
    const mensagem = message || req.body.text || 'oi';
    
    let resposta = 'Olá! Como posso ajudar com seu empréstimo consignado?';
    let clienteData = null;
    
    // Buscar dados do cliente
    if (cpf) {
      console.log('🔍 [CLIENTE] Buscando cliente por CPF:', cpf);
      try {
        const clienteResponse = await fetch('http://localhost:3002/kentro/buscar-cliente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpf: cpf })
        });
        
        clienteData = await clienteResponse.json();
        console.log('📊 [CLIENTE] Dados encontrados:', clienteData);
        
        // Gerar resposta personalizada
        if (clienteData.success && clienteData.cliente) {
          const cliente = clienteData.cliente;
          const nome = cliente.nome || 'Cliente';
          
          const mensagemLower = mensagem.toLowerCase();
          
          if (mensagemLower.includes('portabilidade')) {
            resposta = `Olá ${nome}! A portabilidade é uma excelente opção! Posso simular as melhores condições para você.`;
          } else if (mensagemLower.includes('fgts')) {
            resposta = `Olá ${nome}! O saque do FGTS é uma ótima oportunidade! Vou verificar suas condições.`;
          } else if (mensagemLower.includes('taxa')) {
            resposta = `Olá ${nome}! Temos as melhores taxas do mercado! Para portabilidade, posso oferecer até 1,65% ao mês.`;
          } else {
            resposta = `Olá ${nome}! Como posso ajudar com seu empréstimo consignado hoje?`;
          }
        }
      } catch (error) {
        console.error('❌ [CLIENTE] Erro ao buscar cliente:', error);
      }
    }
    
    res.json({
      success: true,
      resposta: resposta,
      cliente: clienteData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 ChatGPT Vendedor FUNCIONAL rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});
