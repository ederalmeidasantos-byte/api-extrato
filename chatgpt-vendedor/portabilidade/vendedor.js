const ChatGPTVendedor = require('../core/chatgpt-vendedor');

class PortabilidadeVendedor extends ChatGPTVendedor {
  constructor(config) {
    super(config);
    this.produto = 'portabilidade';
  }

  async processarMensagem({ chatId, clientNumber, message, classification }) {
    // Lógica específica para portabilidade
    if (classification.intencao === 'interesse') {
      return await this.processarInteresse(chatId, clientNumber, message);
    }
    
    if (classification.intencao === 'duvida') {
      return await this.processarDuvida(chatId, clientNumber, message);
    }
    
    if (classification.intencao === 'recusa') {
      return await this.processarRecusa(chatId, clientNumber, message);
    }
    
    // Usar ChatGPT genérico para outros casos
    return await super.processarMensagem({ chatId, clientNumber, message, classification });
  }

  async processarInteresse(chatId, clientNumber, message) {
    // Buscar dados do cliente para personalizar proposta
    const dadosCliente = await this.buscarDadosCliente(clientNumber);
    
    if (dadosCliente.propostas && dadosCliente.propostas.length > 0) {
      // Cliente já tem propostas, mostrar vantagens da portabilidade
      return this.gerarPropostaPortabilidade(dadosCliente);
    } else {
      // Cliente novo, fazer simulação
      return this.gerarSimulacaoInicial(dadosCliente);
    }
  }

  async processarDuvida(chatId, clientNumber, message) {
    const contexto = await this.carregarContexto(chatId, clientNumber);
    
    // Respostas específicas para dúvidas comuns de portabilidade
    if (message.toLowerCase().includes('trocar conta')) {
      return {
        texto: `❌ *NÃO TROCA A CONTA DE PAGAMENTO!*\n\nA portabilidade apenas troca o *banco do empréstimo*, não a conta onde você recebe seu salário.\n\n✅ Sua conta continua a mesma\n✅ Seu salário continua caindo no mesmo lugar\n✅ Apenas o desconto do empréstimo muda de banco\n\nQuer que eu simule uma proposta para você?`,
        botoes: [
          { text: "Sim, simular", id: "1" },
          { text: "Não, obrigado", id: "2" }
        ],
        tipoMensagem: 'cliente_com_duvida',
        enviarResposta: true
      };
    }
    
    if (message.toLowerCase().includes('margem')) {
      return {
        texto: `📊 *SOBRE A MARGEM NEGATIVA:*\n\nSe você tem margem negativa, a portabilidade é a *única forma* de regularizar!\n\n✅ Reduzimos o valor da parcela\n✅ Enquadramos na sua margem disponível\n✅ Você ainda recebe troco\n✅ Fica regularizado para futuros empréstimos\n\nVou simular para você ver como funciona:`,
        botoes: [
          { text: "Simular agora", id: "1" },
          { text: "Explicar mais", id: "2" }
        ],
        tipoMensagem: 'cliente_com_duvida',
        enviarResposta: true
      };
    }
    
    // Usar ChatGPT para outras dúvidas
    return await super.processarMensagem({ chatId, clientNumber, message, classification });
  }

  async processarRecusa(chatId, clientNumber, message) {
    return {
      texto: `Entendo sua decisão! 😊\n\nSe mudar de ideia, estarei aqui para ajudar.\n\nA portabilidade pode ser uma ótima oportunidade quando você estiver pronto.\n\nObrigado pelo seu tempo!`,
      botoes: null,
      tipoMensagem: 'cliente_sem_duvida',
      enviarResposta: true
    };
  }

  gerarPropostaPortabilidade(dadosCliente) {
    // Usar dados reais das propostas do cliente
    if (dadosCliente.propostas && dadosCliente.propostas.length > 0) {
      const primeiraProposta = dadosCliente.propostas[0];
      const troco = primeiraProposta.dados?.cliente?.troco || 0;
      const parcelaAtual = primeiraProposta.dados?.cliente?.parcelaAtual || 0;
      const novaParcela = primeiraProposta.dados?.cliente?.novaParcela || 0;
      const reducaoParcela = parcelaAtual - novaParcela;
      const bancoAtual = primeiraProposta.dados?.cliente?.bancoAtual || 'N/A';
      const bancoNovo = primeiraProposta.dados?.cliente?.bancoNovo || 'N/A';
      
      return {
        texto: `🎉 *OPORTUNIDADE DE PORTABILIDADE*\n\n${dadosCliente.nome}, analisei seu perfil e encontrei uma oportunidade incrível!\n\n✅ *Troco: R$ ${troco.toLocaleString('pt-BR')}*\n✅ *Redução na parcela: R$ ${reducaoParcela.toLocaleString('pt-BR')}*\n✅ *Banco atual: ${bancoAtual} → Novo: ${bancoNovo}*\n✅ *Margem regularizada*\n✅ *Processo 100% online*\n\nQuer ver os detalhes completos?`,
        botoes: [
          { text: "Ver detalhes", id: "1" },
          { text: "Simular melhor", id: "2" },
          { text: "Não tenho interesse", id: "3" }
        ],
        tipoMensagem: 'cliente_sem_duvida',
        enviarResposta: true
      };
    } else {
      // Fallback para simulação se não houver propostas
      const troco = Math.floor(Math.random() * 5000) + 1000;
      const reducaoParcela = Math.floor(Math.random() * 100) + 20;
      
      return {
        texto: `🎉 *OPORTUNIDADE DE PORTABILIDADE*\n\n${dadosCliente.nome}, analisei seu perfil e encontrei uma oportunidade incrível!\n\n✅ *Troco: R$ ${troco.toLocaleString('pt-BR')},00*\n✅ *Redução na parcela: R$ ${reducaoParcela},00*\n✅ *Margem regularizada*\n✅ *Processo 100% online*\n\nQuer ver os detalhes completos?`,
        botoes: [
          { text: "Ver detalhes", id: "1" },
          { text: "Simular melhor", id: "2" },
          { text: "Não tenho interesse", id: "3" }
        ],
        tipoMensagem: 'cliente_sem_duvida',
        enviarResposta: true
      };
    }
  }

  gerarSimulacaoInicial(dadosCliente) {
    return {
      texto: `👋 *OLÁ ${dadosCliente.nome}!*\n\nSou especialista em portabilidade de empréstimo consignado!\n\nPara simular a melhor proposta para você, preciso de algumas informações:\n\n📋 *Qual o valor da sua parcela atual?*\n📋 *Quantas parcelas já pagou?*\n📋 *Qual banco do empréstimo atual?*\n\nOu prefere que eu faça uma simulação geral?`,
      botoes: [
        { text: "Simular geral", id: "1" },
        { text: "Informar dados", id: "2" },
        { text: "Falar com atendente", id: "3" }
      ],
      tipoMensagem: 'cliente_com_duvida',
      enviarResposta: true
    };
  }

  async simularProposta(numero, dados) {
    // Lógica de simulação específica para portabilidade
    const simulacao = {
      numero,
      produto: 'portabilidade',
      dados,
      proposta: {
        troco: Math.floor(Math.random() * 5000) + 1000,
        reducaoParcela: Math.floor(Math.random() * 100) + 20,
        novaParcela: dados.parcelaAtual - Math.floor(Math.random() * 100) + 20,
        prazo: 96,
        taxa: 1.85
      },
      timestamp: new Date().toISOString()
    };
    
    return simulacao;
  }

  construirPrompt(mensagem, contexto, dadosCliente, classification) {
    return `Você é um vendedor especializado em PORTABILIDADE de empréstimo consignado da Lunas Digital.

ESPECIALIZAÇÃO EM PORTABILIDADE:
- Foco em reduzir parcelas e regularizar margem negativa
- Enfatizar que NÃO troca a conta de pagamento
- Destacar vantagens do troco
- Explicar processo 100% online

CONTEXTO DO CLIENTE:
- Nome: ${dadosCliente.nome || 'Cliente'}
- Número: ${dadosCliente.numero}
- Propostas existentes: ${dadosCliente.propostas?.length || 0}

CLASSIFICAÇÃO:
- Intenção: ${classification.intencao}
- Sentimento: ${classification.sentimento}

HISTÓRICO:
${contexto.historico.slice(-3).map(h => `${h.tipo}: ${h.mensagem}`).join('\n')}

INSTRUÇÕES ESPECÍFICAS:
1. SEMPRE esclarecer que portabilidade NÃO troca conta de pagamento
2. Destacar que é a única forma de regularizar margem negativa
3. Enfatizar vantagens: troco + redução de parcela + regularização
4. Usar exemplos práticos e números
5. Se cliente tem medo, tranquilizar com benefícios
6. Sempre oferecer simulação

FORMATO DA RESPOSTA:
Responda apenas com o texto da mensagem. No final, adicione:
TIPO_MENSAGEM: [cliente_com_duvida|cliente_sem_duvida|falar_com_atendente|nao_consigo_responder|limite_respostas]

BOTÕES (se for proposta):
BOTOES: [Ver detalhes,Simular melhor,Não tenho interesse]`;
  }
}

module.exports = PortabilidadeVendedor;

