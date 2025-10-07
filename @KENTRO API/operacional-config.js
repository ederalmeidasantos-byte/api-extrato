/**
 * Configuração do Sistema Operacional
 * Configurações específicas para integração com API AtenderBem
 */

const config = {
  // ========================================
  // CONFIGURAÇÕES DA API
  // ========================================
  api: {
    development: {
      baseUrl: 'https://lunasdigital.atenderbem.com',
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      queueId: 25,
      timeout: 30000,
      retries: 3
    },
    production: {
      baseUrl: 'https://lunasdigital.atenderbem.com',
      apiKey: process.env.ATENDERBEM_API_KEY || 'cd4d0509169d4e2ea9177ac66c1c9376',
      queueId: parseInt(process.env.ATENDERBEM_QUEUE_ID) || 25,
      timeout: 30000,
      retries: 3
    }
  },

  // ========================================
  // CONFIGURAÇÕES DO SISTEMA OPERACIONAL
  // ========================================
  sistema: {
    nome: 'Sistema Operacional Lunas',
    versao: '1.0.0',
    ambiente: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    timezone: 'America/Sao_Paulo'
  },

  // ========================================
  // CONFIGURAÇÕES DE VALIDAÇÃO
  // ========================================
  validacao: {
    camposObrigatorios: [
      '9d947420', // TROCO
      '9cceda30', // PARCELA
      '5fc51220', // Nova Parcela
      '98011220', // CPF
      '6a93f650', // Nome
      '0bfc6250', // Data de Nascimento
      '98167d80', // Celular
      'a88afbf0', // Número do Beneficio
      '3d8b2ff0', // Espécie do Beneficio
      '1836e090', // CEP
      '1dbfcef0', // Logradouro
      '6ac31450', // Número
      '3271f710', // Bairro
      '25178280', // Cidade
      'f6384400', // UF
      'cd34f870', // Banco
      '7f6a0eb0', // Agência
      '769db520', // Conta
      '08715950', // Valor liberado
      '1576c8b0', // Prazo
      '1c441df0'  // Banco
    ],
    
    formatos: {
      cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
      telefone: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      cep: /^\d{5}-?\d{3}$/,
      valorMonetario: /^\d{1,3}(\.\d{3})*(,\d{2})?$/,
      percentual: /^\d{1,2}(,\d{2})?%?$/
    }
  },

  // ========================================
  // CONFIGURAÇÕES DE PROCESSAMENTO
  // ========================================
  processamento: {
    // Fases das oportunidades
    fases: {
      nova: 1,
      emAnalise: 2,
      aprovada: 3,
      rejeitada: 4,
      contratada: 5,
      cancelada: 6
    },
    
    // Prioridades das tarefas
    prioridades: {
      baixa: 'low',
      media: 'medium',
      alta: 'high',
      urgente: 'urgent'
    },
    
    // Tipos de proposta
    tiposProposta: {
      inss: 'INSS',
      fgts: 'FGTS',
      consignado: 'CONSIGNADO'
    },
    
    // Status de processamento
    status: {
      pendente: 'pending',
      processando: 'processing',
      concluido: 'completed',
      erro: 'error'
    }
  },

  // ========================================
  // CONFIGURAÇÕES DE MENSAGENS
  // ========================================
  mensagens: {
    templates: {
      propostaProcessada: `
🎉 *Proposta INSS Processada com Sucesso!*

📋 *Dados da Proposta:*
• Cliente: {nome}
• CPF: {cpf}
• Benefício: {beneficio}
• Espécie: {especie}

💰 *Valores:*
• Valor Liberado: {valorLiberado}
• Nova Parcela: {novaParcela}
• Troco: {troco}
• Prazo: {prazo} meses

🏦 *Dados Bancários:*
• Banco: {banco}
• Agência: {agencia}
• Conta: {conta}

📝 *Próximos Passos:*
1. Aguarde a análise da proposta
2. Verifique seu e-mail para documentos
3. Acompanhe o status pelo link: {link}

Qualquer dúvida, estou à disposição! 😊
      `.trim(),
      
      propostaAprovada: `
✅ *Proposta Aprovada!*

Parabéns {nome}! Sua proposta INSS foi aprovada.

📋 *Detalhes:*
• Valor: {valorLiberado}
• Parcela: {novaParcela}
• Prazo: {prazo} meses

📝 *Próximos passos:*
1. Verifique seu e-mail para assinatura
2. Acesse o link: {link}
3. Complete a assinatura digital

Em caso de dúvidas, entre em contato! 📞
      `.trim(),
      
      propostaRejeitada: `
❌ *Proposta Não Aprovada*

Olá {nome}, infelizmente sua proposta não foi aprovada.

📋 *Motivo:*
{motivo}

💡 *Sugestões:*
• Verifique os dados informados
• Entre em contato para nova análise
• Consulte outras opções disponíveis

Estamos à disposição para ajudar! 🤝
      `.trim()
    },
    
    // Configurações de envio
    envio: {
      delayMinimo: 1000, // 1 segundo
      maxTentativas: 3,
      timeout: 30000
    }
  },

  // ========================================
  // CONFIGURAÇÕES DE LOG
  // ========================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    destinations: ['console', 'file'],
    file: {
      path: './logs/operacional.log',
      maxSize: '10MB',
      maxFiles: 5
    },
    console: {
      colorize: true,
      timestamp: true
    }
  },

  // ========================================
  // CONFIGURAÇÕES DE MONITORAMENTO
  // ========================================
  monitoramento: {
    healthCheck: {
      interval: 60000, // 1 minuto
      timeout: 5000,
      retries: 3
    },
    
    metrics: {
      enabled: true,
      interval: 300000, // 5 minutos
      retention: 86400000 // 24 horas
    },
    
    alertas: {
      enabled: true,
      webhook: process.env.ALERT_WEBHOOK_URL,
      thresholds: {
        errorRate: 0.05, // 5%
        responseTime: 5000, // 5 segundos
        memoryUsage: 0.8 // 80%
      }
    }
  },

  // ========================================
  // CONFIGURAÇÕES DE CACHE
  // ========================================
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutos
    maxSize: 1000,
    strategy: 'lru'
  },

  // ========================================
  // CONFIGURAÇÕES DE SEGURANÇA
  // ========================================
  seguranca: {
    rateLimit: {
      enabled: true,
      window: 60000, // 1 minuto
      max: 100 // 100 requisições por minuto
    },
    
    criptografia: {
      algoritmo: 'aes-256-gcm',
      chave: process.env.ENCRYPTION_KEY || 'chave-padrao-desenvolvimento'
    },
    
    validacao: {
      sanitizacao: true,
      escapeHtml: true,
      maxTamanho: 10000
    }
  },

  // ========================================
  // CONFIGURAÇÕES DE BACKUP
  // ========================================
  backup: {
    enabled: true,
    interval: 86400000, // 24 horas
    retention: 7, // 7 dias
    destino: process.env.BACKUP_DESTINATION || './backups',
    compressao: true
  },

  // ========================================
  // CONFIGURAÇÕES DE DESENVOLVIMENTO
  // ========================================
  desenvolvimento: {
    debug: process.env.NODE_ENV === 'development',
    mockApi: process.env.MOCK_API === 'true',
    dadosTeste: {
      cpf: '123.456.789-00',
      nome: 'João Silva Santos',
      celular: '(11) 99999-9999',
      email: 'joao@teste.com'
    }
  }
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Obter configuração por ambiente
 * @param {string} ambiente - Ambiente (development/production)
 * @returns {Object} Configuração do ambiente
 */
function obterConfiguracao(ambiente = 'development') {
  return {
    ...config,
    api: config.api[ambiente] || config.api.development,
    sistema: {
      ...config.sistema,
      ambiente
    }
  };
}

/**
 * Validar configuração
 * @returns {Object} Resultado da validação
 */
function validarConfiguracao() {
  const erros = [];
  const avisos = [];
  
  // Validar API Key
  if (!config.api.production.apiKey || config.api.production.apiKey === 'cd4d0509169d4e2ea9177ac66c1c9376') {
    avisos.push('API Key de produção não configurada ou usando valor padrão');
  }
  
  // Validar Queue ID
  if (!config.api.production.queueId || config.api.production.queueId === 25) {
    avisos.push('Queue ID de produção não configurado ou usando valor padrão');
  }
  
  // Validar variáveis de ambiente
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ATENDERBEM_API_KEY) {
      erros.push('Variável ATENDERBEM_API_KEY não definida em produção');
    }
    
    if (!process.env.ATENDERBEM_QUEUE_ID) {
      erros.push('Variável ATENDERBEM_QUEUE_ID não definida em produção');
    }
  }
  
  return {
    valida: erros.length === 0,
    erros,
    avisos
  };
}

/**
 * Obter configuração de logging
 * @returns {Object} Configuração de logging
 */
function obterConfiguracaoLogging() {
  return {
    level: config.logging.level,
    format: config.logging.format,
    transports: config.logging.destinations.map(dest => {
      switch (dest) {
        case 'console':
          return {
            type: 'console',
            options: config.logging.console
          };
        case 'file':
          return {
            type: 'file',
            options: config.logging.file
          };
        default:
          return null;
      }
    }).filter(Boolean)
  };
}

module.exports = {
  ...config,
  obterConfiguracao,
  validarConfiguracao,
  obterConfiguracaoLogging
};



