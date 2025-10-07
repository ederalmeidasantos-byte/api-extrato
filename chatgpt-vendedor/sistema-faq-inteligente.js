import fs from 'fs';
import path from 'path';

// ================== SISTEMA FAQ INTELIGENTE ==================

class SistemaFAQInteligente {
  constructor() {
    this.baseConhecimento = this.carregarBaseConhecimento();
    this.palavrasChave = this.extrairPalavrasChave();
    this.confiancaMinima = 0.7; // 70% de confiança mínima
  }

  carregarBaseConhecimento() {
    return {
      // Perguntas sobre parcelas
      parcelas: {
        perguntas: [
          "qual a parcela",
          "quanto e a parcela",
          "valor da parcela",
          "parcela atual",
          "nova parcela",
          "quanto vou pagar",
          "valor mensal"
        ],
        resposta: (dadosCliente) => {
          if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
            return "Não encontrei propostas de portabilidade para você no momento. Posso te ajudar a simular uma proposta?";
          }
          
          const propostas = dadosCliente.propostas.map((p, i) => {
            const parcelaAtual = p.dados?.cliente?.parcelaAtual || 0;
            const novaParcela = p.dados?.cliente?.novaParcela || 0;
            const economia = parcelaAtual - novaParcela;
            const bancoAtual = p.dados?.cliente?.bancoAtual || 'N/A';
            const bancoNovo = p.dados?.cliente?.bancoNovo || 'N/A';
            
            return `Proposta ${i + 1}:\n- Parcela atual: R$ ${parcelaAtual.toLocaleString('pt-BR')}\n- Nova parcela: R$ ${novaParcela.toLocaleString('pt-BR')}\n- Economia: R$ ${economia.toLocaleString('pt-BR')}/mês\n- Banco: ${bancoAtual} → ${bancoNovo}`;
          }).join('\n\n');
          
          return `Suas propostas de portabilidade:\n\n${propostas}\n\nQual proposta te interessa mais?`;
        }
      },

      // Perguntas sobre troco
      troco: {
        perguntas: [
          "qual o troco",
          "quanto de troco",
          "valor do troco",
          "troco disponivel",
          "quanto vou receber",
          "dinheiro de volta"
        ],
        resposta: (dadosCliente) => {
          if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
            return "Não encontrei propostas com troco para você no momento. Posso te ajudar a simular uma proposta?";
          }
          
          const trocos = dadosCliente.propostas.map((p, i) => {
            const troco = p.dados?.cliente?.troco || 0;
            const bancoAtual = p.dados?.cliente?.bancoAtual || 'N/A';
            const bancoNovo = p.dados?.cliente?.bancoNovo || 'N/A';
            
            return `Proposta ${i + 1}: R$ ${troco.toLocaleString('pt-BR')} (${bancoAtual} → ${bancoNovo})`;
          }).join('\n');
          
          return `Valores de troco disponíveis:\n\n${trocos}\n\nO troco é liberado após a aprovação da portabilidade.`;
        }
      },

      // Perguntas sobre prazos
      prazo: {
        perguntas: [
          "qual o prazo",
          "quanto tempo",
          "quando fica pronto",
          "demora quanto",
          "prazo de pagamento",
          "quantos meses"
        ],
        resposta: (dadosCliente) => {
          if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
            return "Não encontrei propostas para consultar o prazo. Posso te ajudar a simular uma proposta?";
          }
          
          const prazos = dadosCliente.propostas.map((p, i) => {
            const prazo = p.dados?.cliente?.prazo || 'N/A';
            const bancoAtual = p.dados?.cliente?.bancoAtual || 'N/A';
            const bancoNovo = p.dados?.cliente?.bancoNovo || 'N/A';
            
            return `Proposta ${i + 1}: ${prazo} meses (${bancoAtual} → ${bancoNovo})`;
          }).join('\n');
          
          return `Prazos das suas propostas:\n\n${prazos}\n\nO prazo de análise da portabilidade é de 5 a 15 dias úteis.`;
        }
      },

      // Perguntas sobre bancos
      bancos: {
        perguntas: [
          "qual banco",
          "que banco",
          "banco atual",
          "banco novo",
          "mudar de banco",
          "trocar banco"
        ],
        resposta: (dadosCliente) => {
          if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
            return "Não encontrei propostas de portabilidade para você no momento. Posso te ajudar a simular uma proposta?";
          }
          
          const bancos = dadosCliente.propostas.map((p, i) => {
            const bancoAtual = p.dados?.cliente?.bancoAtual || 'N/A';
            const bancoNovo = p.dados?.cliente?.bancoNovo || 'N/A';
            
            return `Proposta ${i + 1}: ${bancoAtual} → ${bancoNovo}`;
          }).join('\n');
          
          return `Bancos envolvidos nas suas propostas:\n\n${bancos}\n\nA portabilidade permite transferir seu empréstimo para um banco com melhores condições.`;
        }
      },

      // Perguntas sobre taxa
      taxa: {
        perguntas: [
          "qual a taxa",
          "taxa de juros",
          "juros",
          "taxa mensal",
          "percentual"
        ],
        resposta: (dadosCliente) => {
          if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
            return "Não encontrei propostas para consultar as taxas. Posso te ajudar a simular uma proposta?";
          }
          
          const taxas = dadosCliente.propostas.map((p, i) => {
            const taxa = p.dados?.cliente?.taxa || 'N/A';
            const bancoAtual = p.dados?.cliente?.bancoAtual || 'N/A';
            const bancoNovo = p.dados?.cliente?.bancoNovo || 'N/A';
            
            return `Proposta ${i + 1}: ${taxa}% a.m. (${bancoAtual} → ${bancoNovo})`;
          }).join('\n');
          
          return `Taxas das suas propostas:\n\n${taxas}\n\nAs taxas são definidas pelo banco de destino da portabilidade.`;
        }
      },

      // Perguntas sobre processo
      processo: {
        perguntas: [
          "como funciona",
          "o que e portabilidade",
          "explicar portabilidade",
          "como fazer",
          "processo",
          "passo a passo"
        ],
        resposta: (dadosCliente) => {
          return `Portabilidade de consignado é a transferência do seu empréstimo de um banco para outro com melhores condições.

VANTAGENS:
- Redução na parcela mensal
- Troco disponível
- Taxas mais baixas
- Mesmo prazo ou melhor

PROCESSO:
1. Análise do seu perfil
2. Busca das melhores propostas
3. Escolha da proposta ideal
4. Aprovação da portabilidade
5. Transferência do contrato

Quer ver suas propostas disponíveis?`;
        }
      },

      // Perguntas sobre status
      status: {
        perguntas: [
          "status da proposta",
          "andamento",
          "onde esta",
          "acompanhar",
          "situacao"
        ],
        resposta: (dadosCliente) => {
          if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
            return "Não encontrei propostas para consultar o status. Posso te ajudar a simular uma proposta?";
          }
          
          const status = dadosCliente.propostas.map((p, i) => {
            const statusAtual = p.status || 'N/A';
            const idOportunidade = p.idoportunidade || 'N/A';
            
            return `Proposta ${i + 1} (ID: ${idOportunidade}): ${statusAtual}`;
          }).join('\n');
          
          return `Status das suas propostas:\n\n${status}\n\nPosso te ajudar com mais alguma informação?`;
        }
      }
    };
  }

  extrairPalavrasChave() {
    const palavras = [];
    Object.values(this.baseConhecimento).forEach(categoria => {
      palavras.push(...categoria.perguntas);
    });
    return palavras;
  }

  // Função principal para analisar e responder
  analisarMensagem(mensagem, dadosCliente) {
    const mensagemLimpa = mensagem.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Calcular confiança para cada categoria
    const resultados = [];
    
    Object.entries(this.baseConhecimento).forEach(([categoria, dados]) => {
      const confianca = this.calcularConfianca(mensagemLimpa, dados.perguntas);
      if (confianca > 0) {
        resultados.push({
          categoria,
          confianca,
          resposta: dados.resposta(dadosCliente)
        });
      }
    });

    // Ordenar por confiança
    resultados.sort((a, b) => b.confianca - a.confianca);

    // Se a confiança mais alta for suficiente, retornar resposta automática
    if (resultados.length > 0 && resultados[0].confianca >= this.confiancaMinima) {
      return {
        responderAutomaticamente: true,
        resposta: resultados[0].resposta,
        categoria: resultados[0].categoria,
        confianca: resultados[0].confianca,
        usarChatGPT: false
      };
    }

    // Se não conseguir responder automaticamente, usar ChatGPT
    return {
      responderAutomaticamente: false,
      resposta: null,
      categoria: null,
      confianca: 0,
      usarChatGPT: true
    };
  }

  calcularConfianca(mensagem, perguntas) {
    let maxConfianca = 0;
    
    perguntas.forEach(pergunta => {
      const palavrasPergunta = pergunta.split(' ');
      let confianca = 0;
      
      palavrasPergunta.forEach(palavra => {
        if (mensagem.includes(palavra)) {
          confianca += 1 / palavrasPergunta.length;
        }
      });
      
      maxConfianca = Math.max(maxConfianca, confianca);
    });
    
    return maxConfianca;
  }

  // Função para adicionar novas perguntas à base de conhecimento
  adicionarPergunta(categoria, pergunta, resposta) {
    if (this.baseConhecimento[categoria]) {
      this.baseConhecimento[categoria].perguntas.push(pergunta);
      this.baseConhecimento[categoria].resposta = resposta;
    }
  }

  // Função para obter estatísticas
  obterEstatisticas() {
    const totalPerguntas = Object.values(this.baseConhecimento)
      .reduce((total, categoria) => total + categoria.perguntas.length, 0);
    
    return {
      totalCategorias: Object.keys(this.baseConhecimento).length,
      totalPerguntas,
      confiancaMinima: this.confiancaMinima
    };
  }
}

export const sistemaFAQInteligente = new SistemaFAQInteligente();
