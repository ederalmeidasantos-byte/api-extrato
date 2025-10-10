import express from 'express';
import fetch from 'node-fetch';
import agentToolsHandler from './agent-builder-tools-handler.js';

const app = express();
const PORT = 3004;

// Middleware básico do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registrar handler das Agent Builder Tools
app.use('/api', agentToolsHandler);

console.log('🤖 ChatGPT Vendedor FINAL FUNCIONAL rodando na porta', PORT);

// Sistema de classificação de mensagens simplificado
function classificarMensagem(mensagem) {
  const msg = mensagem.toLowerCase();
  
  // Palavras para enviar atendente
  const enviarAtendente = ['atendente', 'pessoa', 'humano', 'falar com alguém', 'quero falar com', 'não entendi', 'confuso', 'complicado', 'difícil', 'não consigo', 'não funciona'];
  
  // Palavras para fechar proposta
  const fecharProposta = ['aceito', 'quero', 'vou fazer', 'fechar', 'contratar', 'sim', 'ok', 'beleza', 'perfeito', 'ótimo', 'excelente', 'vamos', 'pode ser', 'tá bom'];
  
  // Palavras para verificar dúvida
  const verificarDuvida = ['dúvida', 'dúvidas', 'pergunta', 'perguntas', 'como', 'quando', 'onde', 'por que', 'porque', 'o que', 'qual', 'quais', 'não sei', 'entendi', 'entendeu'];
  
  // Palavras para cliente bravo
  const clienteBravo = ['bravo', 'irritado', 'nervoso', 'péssimo', 'horrível', 'terrível', 'lixo', 'merda', 'droga', 'puta', 'caralho', 'porra', 'foda', 'fodido', 'cagado', 'bosta'];
  
  // Verificar se cliente está bravo
  if (clienteBravo.some(palavra => msg.includes(palavra))) {
    return {
      tipo: 'cliente_bravo',
      acao: 'cliente_bravo',
      continuar: true,
      prioridade: 'urgente'
    };
  }
  
  // Verificar se quer enviar atendente
  if (enviarAtendente.some(palavra => msg.includes(palavra))) {
    return {
      tipo: 'enviar_atendente',
      acao: 'enviar_atendente',
      continuar: false,
      prioridade: 'alta'
    };
  }
  
  // Verificar se quer fechar proposta
  if (fecharProposta.some(palavra => msg.includes(palavra))) {
    return {
      tipo: 'fechar_proposta',
      acao: 'fechar_proposta',
      continuar: false,
      prioridade: 'alta'
    };
  }
  
  // Verificar se tem dúvida
  if (verificarDuvida.some(palavra => msg.includes(palavra))) {
    return {
      tipo: 'verificar_duvida',
      acao: 'verificar_duvida',
      continuar: true,
      prioridade: 'media'
    };
  }
  
  // Mensagem genérica - continuar conversa
  return {
    tipo: 'generica',
    acao: 'continuar_conversa',
    continuar: true,
    prioridade: 'baixa'
  };
}

// Endpoint de status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    port: PORT,
    version: '7.0.0'
  });
});

// Webhook principal para Kentro
app.post('/webhook/kentro', async (req, res) => {
  try {
    console.log('📨 [WEBHOOK] Mensagem recebida:', req.body);
    
    const { cpf, message, clientNumber, chatId } = req.body;
    const mensagem = message || req.body.text || 'oi';
    
    // Classificar a mensagem
    const classificacao = classificarMensagem(mensagem);
    console.log('🎯 [CLASSIFICACAO]', classificacao);
    
    let resposta = 'Olá! Como posso ajudar com seu empréstimo consignado?';
    let clienteData = null;
    let deveContinuar = true;
    
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
        
        // Gerar resposta baseada na classificação
        if (clienteData.success && clienteData.cliente) {
          const cliente = clienteData.cliente;
          const nome = cliente.nome ? cliente.nome.split(' ')[0] : 'Cliente';
          
          switch (classificacao.acao) {
            case 'cliente_bravo':
              resposta = `Peço desculpas ${nome}! Entendo sua frustração. Vou te conectar com um atendente especializado que pode resolver sua situação de forma mais eficiente. Um momento, por favor.`;
              break;
              
            case 'enviar_atendente':
              resposta = `Perfeito ${nome}! Vou te conectar com um de nossos atendentes especializados que pode te ajudar melhor. Um momento, por favor.`;
              break;
              
            case 'fechar_proposta':
              resposta = `Excelente ${nome}! Que ótima decisão! Vou te conectar com um atendente para finalizar sua proposta. Um momento, por favor.`;
              break;
              
            case 'verificar_duvida':
              if (mensagem.toLowerCase().includes('portabilidade')) {
                resposta = `Claro ${nome}! A portabilidade é quando você transfere seu empréstimo atual para uma instituição com melhores condições. Posso te explicar melhor ou você tem alguma dúvida específica?`;
              } else if (mensagem.toLowerCase().includes('fgts')) {
                resposta = `Perfeito ${nome}! O saque do FGTS é quando você usa seu fundo de garantia para fazer um empréstimo. Posso te explicar melhor ou você tem alguma dúvida específica?`;
              } else if (mensagem.toLowerCase().includes('taxa')) {
                resposta = `Ótima pergunta ${nome}! Nossas taxas são muito competitivas. Para portabilidade, oferecemos até 1,65% ao mês. Posso te explicar melhor ou você tem alguma dúvida específica?`;
              } else {
                resposta = `Claro ${nome}! Vou esclarecer sua dúvida. O que gostaria de saber sobre empréstimo consignado?`;
              }
              break;
              
            default:
              if (mensagem.toLowerCase().includes('portabilidade')) {
                resposta = `Olá ${nome}! A portabilidade é uma excelente opção! Posso simular as melhores condições para você. Qual o valor da sua parcela atual?`;
              } else if (mensagem.toLowerCase().includes('fgts')) {
                resposta = `Olá ${nome}! O saque do FGTS é uma ótima oportunidade! Vou verificar suas condições. Qual seu benefício?`;
              } else if (mensagem.toLowerCase().includes('taxa')) {
                resposta = `Olá ${nome}! Temos as melhores taxas do mercado! Para portabilidade, posso oferecer até 1,65% ao mês. Qual seu interesse?`;
              } else {
                resposta = `Olá ${nome}! Como posso ajudar com seu empréstimo consignado hoje?`;
              }
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
      classificacao: classificacao,
      continuar: deveContinuar,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 ChatGPT Vendedor FINAL FUNCIONAL rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});
