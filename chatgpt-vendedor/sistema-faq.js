import fs from "fs";
import path from "path";

// ================== Sistema de Perguntas Frequentes ==================
class SistemaFAQ {
  constructor() {
    this.faqData = null;
    this.carregarFAQ();
  }

  carregarFAQ() {
    try {
      const faqPath = path.join(process.cwd(), 'chatgpt-vendedor', 'perguntas-frequentes.json');
      const faqContent = fs.readFileSync(faqPath, 'utf8');
      this.faqData = JSON.parse(faqContent);
      console.log('[FAQ] Perguntas frequentes carregadas com sucesso');
    } catch (error) {
      console.error('[FAQ] Erro ao carregar FAQ:', error.message);
      this.faqData = { perguntas_frequentes: {}, configuracoes: {} };
    }
  }

  // Buscar resposta para uma pergunta
  buscarResposta(mensagem) {
    if (!this.faqData || !this.faqData.perguntas_frequentes) {
      return null;
    }

    const mensagemLower = mensagem.toLowerCase();
    
    // Buscar por palavras-chave
    for (const [key, faq] of Object.entries(this.faqData.perguntas_frequentes)) {
      for (const palavraChave of faq.palavras_chave) {
        if (mensagemLower.includes(palavraChave.toLowerCase())) {
          console.log(`[FAQ] Encontrada pergunta: ${faq.pergunta}`);
          return {
            pergunta: faq.pergunta,
            resposta: faq.resposta,
            tipo: 'faq'
          };
        }
      }
    }

    return null;
  }

  // Verificar se é pergunta sobre andamento/status
  verificarAndamento(mensagem) {
    const mensagemLower = mensagem.toLowerCase();
    const palavrasAndamento = ['andamento', 'status', 'proposta', 'situacao', 'como esta', 'onde esta'];
    
    for (const palavra of palavrasAndamento) {
      if (mensagemLower.includes(palavra)) {
        return true;
      }
    }
    return false;
  }

  // Gerar resposta personalizada
  gerarResposta(faq, dadosCliente) {
    const config = this.faqData.configuracoes || {};
    const prefixo = config.prefixo_resposta || 'Antonio,';
    const emoji = config.emoji_resposta || '✓';
    const sufixoVenda = config.sufixo_venda || 'Quer aproveitar essa oportunidade?';
    const emojiVenda = config.emoji_venda || '💰';

    let resposta = `${prefixo} ${emoji} ${faq.resposta}`;

    // Se for pergunta sobre andamento, incluir dados das propostas
    if (faq.tipo === 'faq' && this.verificarAndamento(faq.pergunta)) {
      if (dadosCliente.propostas && dadosCliente.propostas.length > 0) {
        resposta += `\n\n*Status das suas propostas:*\n`;
        dadosCliente.propostas.forEach((p, i) => {
          resposta += `• Proposta ${i + 1}: ${p.status}\n`;
        });
      }
    }

    // Adicionar call to action se for pergunta de venda
    if (this.ehPerguntaVenda(faq.pergunta)) {
      resposta += `\n\n${sufixoVenda} ${emojiVenda}`;
    }

    return resposta;
  }

  // Verificar se é pergunta que pode gerar venda
  ehPerguntaVenda(pergunta) {
    const perguntasVenda = ['troco', 'parcela', 'economia', 'beneficio', 'vantagem'];
    const perguntaLower = pergunta.toLowerCase();
    
    for (const palavra of perguntasVenda) {
      if (perguntaLower.includes(palavra)) {
        return true;
      }
    }
    return false;
  }

  // Adicionar nova pergunta (para edição)
  adicionarPergunta(chave, pergunta, resposta, palavrasChave) {
    if (!this.faqData.perguntas_frequentes) {
      this.faqData.perguntas_frequentes = {};
    }

    this.faqData.perguntas_frequentes[chave] = {
      pergunta: pergunta,
      resposta: resposta,
      palavras_chave: palavrasChave
    };

    this.salvarFAQ();
  }

  // Salvar FAQ atualizado
  salvarFAQ() {
    try {
      const faqPath = path.join(process.cwd(), 'chatgpt-vendedor', 'perguntas-frequentes.json');
      fs.writeFileSync(faqPath, JSON.stringify(this.faqData, null, 2), 'utf8');
      console.log('[FAQ] FAQ atualizado com sucesso');
    } catch (error) {
      console.error('[FAQ] Erro ao salvar FAQ:', error.message);
    }
  }
}

// Instância global do sistema FAQ
const sistemaFAQ = new SistemaFAQ();

export { sistemaFAQ };
