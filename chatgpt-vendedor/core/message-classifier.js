class MessageClassifier {
  constructor() {
    this.palavrasChave = {
      portabilidade: [
        'portabilidade', 'portar', 'trocar', 'mudar', 'emprestimo', 'emprestimo consignado',
        'consignado', 'margem', 'troco', 'parcela', 'reduzir', 'regularizar'
      ],
      fgts: [
        'fgts', 'fundo de garantia', 'saque', 'sacar', 'fgts saque', 'fgts antecipado'
      ],
      duvida: [
        'duvida', 'duvidas', 'como', 'quando', 'onde', 'por que', 'porque', 'pode', 'posso',
        'funciona', 'como funciona', 'quanto', 'valor', 'taxa', 'juros'
      ],
      interesse: [
        'quero', 'gostaria', 'interessado', 'interesse', 'sim', 'ok', 'beleza', 'vamos',
        'aceito', 'concordo', 'perfeito', 'otimo'
      ],
      recusa: [
        'nao', 'não', 'nao quero', 'não quero', 'nao tenho interesse', 'não tenho interesse',
        'nao preciso', 'não preciso', 'recuso', 'recusar'
      ],
      atendente: [
        'atendente', 'pessoa', 'humano', 'falar com', 'quero falar', 'transferir',
        'nao consigo', 'não consigo', 'problema', 'erro'
      ]
    };
  }

  async classify(message) {
    const texto = message.toLowerCase();
    
    // Detectar produto
    const produto = this.detectarProduto(texto);
    
    // Detectar intenção
    const intencao = this.detectarIntencao(texto);
    
    // Detectar sentimento
    const sentimento = this.detectarSentimento(texto);
    
    // Detectar urgência
    const urgencia = this.detectarUrgencia(texto);
    
    return {
      produto,
      intencao,
      sentimento,
      urgencia,
      confianca: this.calcularConfianca(texto, produto, intencao)
    };
  }

  detectarProduto(texto) {
    const scorePortabilidade = this.calcularScore(texto, this.palavrasChave.portabilidade);
    const scoreFGTS = this.calcularScore(texto, this.palavrasChave.fgts);
    
    if (scoreFGTS > scorePortabilidade && scoreFGTS > 0) {
      return 'fgts';
    } else if (scorePortabilidade > 0) {
      return 'portabilidade';
    }
    
    return 'portabilidade'; // Padrão
  }

  detectarIntencao(texto) {
    const scoreDuvida = this.calcularScore(texto, this.palavrasChave.duvida);
    const scoreInteresse = this.calcularScore(texto, this.palavrasChave.interesse);
    const scoreRecusa = this.calcularScore(texto, this.palavrasChave.recusa);
    const scoreAtendente = this.calcularScore(texto, this.palavrasChave.atendente);
    
    const scores = {
      duvida: scoreDuvida,
      interesse: scoreInteresse,
      recusa: scoreRecusa,
      atendente: scoreAtendente
    };
    
    const maxScore = Math.max(...Object.values(scores));
    
    if (maxScore === 0) {
      return 'neutro';
    }
    
    return Object.keys(scores).find(key => scores[key] === maxScore);
  }

  detectarSentimento(texto) {
    const positivas = ['bom', 'bem', 'otimo', 'ótimo', 'excelente', 'perfeito', 'legal', 'show'];
    const negativas = ['ruim', 'mal', 'pessimo', 'péssimo', 'terrivel', 'horrivel', 'problema'];
    
    const scorePositivo = this.calcularScore(texto, positivas);
    const scoreNegativo = this.calcularScore(texto, negativas);
    
    if (scorePositivo > scoreNegativo) {
      return 'positivo';
    } else if (scoreNegativo > scorePositivo) {
      return 'negativo';
    }
    
    return 'neutro';
  }

  detectarUrgencia(texto) {
    const urgentes = ['urgente', 'rapido', 'rápido', 'agora', 'hoje', 'imediato', 'asap'];
    const scoreUrgencia = this.calcularScore(texto, urgentes);
    
    return scoreUrgencia > 0 ? 'alta' : 'normal';
  }

  calcularScore(texto, palavras) {
    return palavras.reduce((score, palavra) => {
      if (texto.includes(palavra)) {
        return score + 1;
      }
      return score;
    }, 0);
  }

  calcularConfianca(texto, produto, intencao) {
    let confianca = 0.5; // Base
    
    // Aumentar confiança se há palavras-chave específicas
    if (produto !== 'portabilidade') {
      confianca += 0.2;
    }
    
    if (intencao !== 'neutro') {
      confianca += 0.2;
    }
    
    // Aumentar se o texto é longo (mais contexto)
    if (texto.length > 50) {
      confianca += 0.1;
    }
    
    return Math.min(confianca, 1.0);
  }
}

module.exports = MessageClassifier;

