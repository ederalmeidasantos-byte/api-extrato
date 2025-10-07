const ChatGPTVendedor = require('../core/chatgpt-vendedor');

class FGTSVendedor extends ChatGPTVendedor {
  constructor(config) {
    super(config);
    this.produto = 'fgts';
  }

  async processarMensagem({ chatId, clientNumber, message, classification }) {
    // Lógica específica para FGTS
    if (classification.intencao === 'interesse') {
      return await this.processarInteresseFGTS(chatId, clientNumber, message);
    }
    
    if (classification.intencao === 'duvida') {
      return await this.processarDuvidaFGTS(chatId, clientNumber, message);
    }
    
    if (classification.intencao === 'recusa') {
      return await this.processarRecusaFGTS(chatId, clientNumber, message);
    }
    
    // Usar ChatGPT genérico para outros casos
    return await super.processarMensagem({ chatId, clientNumber, message, classification });
  }

  async processarInteresseFGTS(chatId, clientNumber, message) {
    const dadosCliente = await this.buscarDadosCliente(clientNumber);
    
    // Verificar se cliente tem contratos RCC (FGTS) no CRM
    const contratosRCC = dadosCliente.contratosRCC || [];
    const temContratosFGTS = contratosRCC.length > 0;
    
    if (temContratosFGTS) {
      const totalContratos = contratosRCC.length;
      return {
        texto: `🏦 *SAQUE FGTS - OPORTUNIDADE ÚNICA!*\n\n${dadosCliente.nome}, você tem direito ao saque do FGTS!\n\n✅ *${totalContratos} contrato(s) RCC encontrado(s)*\n✅ *Até R$ 1.000 por conta ativa*\n✅ *Até R$ 500 por conta inativa*\n✅ *Processo 100% online*\n✅ *Dinheiro na conta em até 2 dias úteis*\n\nQuer verificar seu saldo e simular o saque?`,
        botoes: [
          { text: "Verificar saldo", id: "1" },
          { text: "Simular saque", id: "2" },
          { text: "Falar com atendente", id: "3" }
        ],
        tipoMensagem: 'cliente_sem_duvida',
        enviarResposta: true
      };
    } else {
      return {
        texto: `🏦 *SAQUE FGTS - OPORTUNIDADE ÚNICA!*\n\n${dadosCliente.nome}, você tem direito ao saque do FGTS!\n\n✅ *Até R$ 1.000 por conta ativa*\n✅ *Até R$ 500 por conta inativa*\n✅ *Processo 100% online*\n✅ *Dinheiro na conta em até 2 dias úteis*\n\nQuer verificar seu saldo e simular o saque?`,
        botoes: [
          { text: "Verificar saldo", id: "1" },
          { text: "Simular saque", id: "2" },
          { text: "Falar com atendente", id: "3" }
        ],
        tipoMensagem: 'cliente_sem_duvida',
        enviarResposta: true
      };
    }
  }

  async processarDuvidaFGTS(chatId, clientNumber, message) {
    if (message.toLowerCase().includes('quanto') || message.toLowerCase().includes('valor')) {
      return {
        texto: `💰 *VALORES DO SAQUE FGTS:*\n\n📊 *CONTAS ATIVAS:*\n• Até R$ 1.000 por conta\n• Múltiplas contas = múltiplos saques\n\n📊 *CONTAS INATIVAS:*\n• Até R$ 500 por conta\n• Contas fechadas há mais de 3 anos\n\n📊 *EXEMPLO PRÁTICO:*\n• 2 contas ativas = até R$ 2.000\n• 1 conta inativa = até R$ 500\n• Total possível = até R$ 2.500\n\nQuer verificar seu saldo específico?`,
        botoes: [
          { text: "Verificar agora", id: "1" },
          { text: "Como funciona", id: "2" }
        ],
        tipoMensagem: 'cliente_com_duvida',
        enviarResposta: true
      };
    }
    
    if (message.toLowerCase().includes('como') || message.toLowerCase().includes('processo')) {
      return {
        texto: `📋 *COMO FUNCIONA O SAQUE FGTS:*\n\n1️⃣ *Verificação:* Consultamos seu saldo no FGTS\n2️⃣ *Simulação:* Calculamos quanto você pode sacar\n3️⃣ *Documentos:* Enviamos lista do que precisa\n4️⃣ *Aprovação:* Processo 100% online\n5️⃣ *Depósito:* Dinheiro na conta em até 2 dias\n\n✅ *Sem burocracia*\n✅ *Sem filas*\n✅ *Sem complicação*\n\nVamos começar verificando seu saldo?`,
        botoes: [
          { text: "Verificar saldo", id: "1" },
          { text: "Ver documentos", id: "2" }
        ],
        tipoMensagem: 'cliente_com_duvida',
        enviarResposta: true
      };
    }
    
    // Usar ChatGPT para outras dúvidas
    return await super.processarMensagem({ chatId, clientNumber, message, classification });
  }

  async processarRecusaFGTS(chatId, clientNumber, message) {
    return {
      texto: `Entendo! 😊\n\nO saque do FGTS é um direito seu, mas só vale a pena quando você realmente precisa.\n\nSe mudar de ideia, estarei aqui para ajudar!\n\nObrigado pelo seu tempo!`,
      botoes: null,
      tipoMensagem: 'cliente_sem_duvida',
      enviarResposta: true
    };
  }

  async simularProposta(numero, dados) {
    // Lógica de simulação específica para FGTS
    const simulacao = {
      numero,
      produto: 'fgts',
      dados,
      proposta: {
        contasAtivas: Math.floor(Math.random() * 3) + 1,
        contasInativas: Math.floor(Math.random() * 2),
        valorAtivas: Math.floor(Math.random() * 1000) + 500,
        valorInativas: Math.floor(Math.random() * 500) + 100,
        total: 0
      },
      timestamp: new Date().toISOString()
    };
    
    simulacao.proposta.total = simulacao.proposta.valorAtivas + simulacao.proposta.valorInativas;
    
    return simulacao;
  }

  construirPrompt(mensagem, contexto, dadosCliente, classification) {
    return `Você é um vendedor especializado em SAQUE FGTS da Lunas Digital.

ESPECIALIZAÇÃO EM FGTS:
- Foco em direitos do trabalhador
- Enfatizar facilidade e rapidez
- Destacar valores possíveis
- Explicar processo simples

CONTEXTO DO CLIENTE:
- Nome: ${dadosCliente.nome || 'Cliente'}
- Número: ${dadosCliente.numero}

CLASSIFICAÇÃO:
- Intenção: ${classification.intencao}
- Sentimento: ${classification.sentimento}

HISTÓRICO:
${contexto.historico.slice(-3).map(h => `${h.tipo}: ${h.mensagem}`).join('\n')}

INSTRUÇÕES ESPECÍFICAS:
1. Enfatizar que é um DIREITO do trabalhador
2. Destacar valores: R$ 1.000 (ativas) e R$ 500 (inativas)
3. Explicar processo simples e rápido
4. Usar linguagem acessível
5. Sempre oferecer verificação de saldo
6. Tranquilizar sobre facilidade

FORMATO DA RESPOSTA:
Responda apenas com o texto da mensagem. No final, adicione:
TIPO_MENSAGEM: [cliente_com_duvida|cliente_sem_duvida|falar_com_atendente|nao_consigo_responder|limite_respostas]

BOTÕES (se for proposta):
BOTOES: [Verificar saldo,Simular saque,Falar com atendente]`;
  }
}

module.exports = FGTSVendedor;

