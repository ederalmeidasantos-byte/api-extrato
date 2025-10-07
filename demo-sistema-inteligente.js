// ================== DEMONSTRAÇÃO DO SISTEMA INTELIGENTE ==================

console.log("=== DEMONSTRAÇÃO: SISTEMA FAQ + CHATGPT INTELIGENTE ===\n");

// ================== Simulação do Sistema FAQ ==================
const sistemaFAQ = {
  categorias: {
    parcelas: {
      perguntas: ["qual a parcela", "quanto e a parcela", "valor da parcela"],
      resposta: (dadosCliente) => {
        if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
          return "Não encontrei propostas de portabilidade para você no momento.";
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
    
    troco: {
      perguntas: ["qual o troco", "quanto de troco", "valor do troco"],
      resposta: (dadosCliente) => {
        if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
          return "Não encontrei propostas com troco para você no momento.";
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
    
    processo: {
      perguntas: ["como funciona", "o que e portabilidade", "explicar portabilidade"],
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
    }
  },

  analisarMensagem(mensagem, dadosCliente) {
    const mensagemLimpa = mensagem.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    for (const [categoria, dados] of Object.entries(this.categorias)) {
      for (const pergunta of dados.perguntas) {
        if (mensagemLimpa.includes(pergunta)) {
          return {
            responderAutomaticamente: true,
            resposta: dados.resposta(dadosCliente),
            categoria: categoria,
            confianca: 0.9
          };
        }
      }
    }
    
    return {
      responderAutomaticamente: false,
      resposta: null,
      categoria: null,
      confianca: 0
    };
  }
};

// ================== Dados de teste ==================
const dadosCliente = {
  nome: "Antonio Silva",
  cpf: "46104631649",
  propostas: [
    {
      idoportunidade: "36337",
      status: "digitando",
      dados: {
        cliente: {
          bancoAtual: "Banco do Brasil",
          bancoNovo: "Caixa Econômica Federal",
          parcelaAtual: 350.50,
          novaParcela: 280.75,
          troco: 1200.00,
          prazo: 84,
          taxa: 1.45
        }
      }
    },
    {
      idoportunidade: "36338",
      status: "etapa1",
      dados: {
        cliente: {
          bancoAtual: "Itaú Unibanco",
          bancoNovo: "Santander",
          parcelaAtual: 420.30,
          novaParcela: 380.15,
          troco: 800.50,
          prazo: 72,
          taxa: 1.35
        }
      }
    }
  ]
};

// ================== Mensagens de teste ==================
const mensagensTeste = [
  "qual a parcela?",
  "quanto de troco?",
  "como funciona?",
  "quero cancelar tudo",
  "meu nome é joão"
];

// ================== Simulação do processamento ==================
console.log("📊 SIMULAÇÃO DO SISTEMA INTELIGENTE:\n");

let respostasFAQ = 0;
let respostasChatGPT = 0;
let totalTokens = 0;

mensagensTeste.forEach((mensagem, index) => {
  console.log(`${index + 1}. MENSAGEM: "${mensagem}"`);
  console.log("-".repeat(50));
  
  const analise = sistemaFAQ.analisarMensagem(mensagem, dadosCliente);
  
  if (analise.responderAutomaticamente) {
    console.log(`✅ RESPOSTA FAQ (${analise.categoria} - ${(analise.confianca * 100).toFixed(1)}%)`);
    console.log(analise.resposta);
    respostasFAQ++;
  } else {
    console.log(`🤖 RESPOSTA CHATGPT (simulada)`);
    console.log("Antonio, preciso de mais informações para te ajudar melhor. Pode me explicar melhor o que você precisa?");
    respostasChatGPT++;
    totalTokens += 500; // Simulação de tokens
  }
  
  console.log("\n");
});

// ================== Estatísticas ==================
console.log("=".repeat(60));
console.log("📊 ESTATÍSTICAS DA SIMULAÇÃO:");
console.log("=".repeat(60));
console.log(`Respostas FAQ: ${respostasFAQ} (${(respostasFAQ/mensagensTeste.length*100).toFixed(1)}%)`);
console.log(`Respostas ChatGPT: ${respostasChatGPT} (${(respostasChatGPT/mensagensTeste.length*100).toFixed(1)}%)`);
console.log(`Total de tokens: ${totalTokens}`);
console.log(`Economia de tokens: ${respostasFAQ * 500}`);
console.log(`Custo economizado: $${(respostasFAQ * 500 * 0.0005 / 1000).toFixed(6)}`);

console.log("\n💡 VANTAGENS DO SISTEMA:");
console.log("✅ Respostas instantâneas para perguntas comuns");
console.log("✅ Economia significativa de tokens");
console.log("✅ Redução de custos com ChatGPT");
console.log("✅ Respostas mais consistentes");
console.log("✅ Fallback inteligente para ChatGPT");

console.log("\n🎯 COMO FUNCIONA:");
console.log("1. Cliente envia mensagem");
console.log("2. Sistema analisa a mensagem");
console.log("3. Se for pergunta comum → Resposta FAQ (0 tokens)");
console.log("4. Se for pergunta complexa → ChatGPT (500+ tokens)");
console.log("5. Sistema aprende e melhora com o tempo");

console.log("\n✅ SISTEMA IMPLEMENTADO COM SUCESSO!");

