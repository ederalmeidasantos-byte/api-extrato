/**
 * Configuração da API Kentro
 * Sistema de integração para FGTS
 */

const config = {
  // URLs da API
  api: {
    development: {
      baseUrl: 'https://lunasdigital.atenderbem.com/int',
      timeout: 30000,
      retries: 3
    },
    production: {
      baseUrl: 'https://lunasdigital.atenderbem.com/int',
      timeout: 30000,
      retries: 3
    }
  },

  // Endpoints
  endpoints: {
    // Chat e Atendimentos
    externalNewChat: '/externalnewchat',
    openNewChat: '/int/openNewChat',
    openChat: '/int/openChat',
    sendWaTemplate: '/int/sendWaTemplate',
    
    // CRM e Oportunidades
    changeOpportunityStage: '/int/changeOpportunityStage',
    updateOpportunity: '/int/updateOpportunity',
    getOpportunities: '/int/getOpportunities',
    createOpportunity: '/int/createOpportunity',
    
    // Contatos e Empresas
    getContacts: '/int/getContacts',
    createContact: '/int/createContact',
    updateContact: '/int/updateContact',
    getCompanies: '/int/getCompanies',
    
    // Mensagens
    sendMessage: '/int/sendMessage',
    getMessages: '/int/getMessages',
    
    // Arquivos e Galeria
    uploadFile: '/int/uploadFile',
    getFiles: '/int/getFiles',
    getGallery: '/int/getGallery',
    
    // Usuários e Filas
    getUsers: '/int/getUsers',
    getQueues: '/int/getQueues',
    createUser: '/int/createUser',
    
    // Tarefas
    getTasks: '/int/getTasks',
    createTask: '/int/createTask',
    updateTask: '/int/updateTask',
    
    // Produtos
    getProducts: '/int/getProducts',
    createProduct: '/int/createProduct',
    updateProduct: '/int/updateProduct',
    
    // Webhooks e Backup
    getWebhooks: '/int/getWebhooks',
    createWebhook: '/int/createWebhook',
    backup: '/int/backup'
  },

  // Rate Limiting
  rateLimit: {
    changeOpportunityStage: {
      limit: 100,
      window: 60000, // 1 minuto
      burst: 10
    },
    updateOpportunity: {
      limit: 100,
      window: 60000, // 1 minuto
      burst: 10
    },
    consultas: {
      limit: 200,
      window: 60000, // 1 minuto
      burst: 20
    }
  },

  // Providers FGTS
  providers: {
    bms: {
      name: 'BMS',
      active: true,
      priority: 1,
      timeout: 15000
    },
    cartos: {
      name: 'Cartos',
      active: true,
      priority: 2,
      timeout: 15000
    },
    qi: {
      name: 'QI',
      active: true,
      priority: 3,
      timeout: 15000
    },
    sistema: {
      name: 'Sistema Interno',
      active: true,
      priority: 4,
      timeout: 5000
    }
  },

  // Códigos de erro
  errorCodes: {
    // CRM - Oportunidades
    CRM_001: 'Oportunidade não encontrada',
    CRM_002: 'API Key inválida',
    CRM_003: 'Queue ID inválido',
    CRM_004: 'Stage ID inválido',
    CRM_005: 'Valor inválido',
    CRM_006: 'Oportunidade já está na fase desejada',
    CRM_007: 'Transição de fase não permitida',
    CRM_008: 'Oportunidade bloqueada',
    CRM_009: 'Usuário sem permissão',
    CRM_010: 'Dados obrigatórios ausentes',

    // CRM - Contratos
    CTR_001: 'Oportunidade não encontrada',
    CTR_002: 'Dados inválidos',
    CTR_003: 'Contrato já existe',
    CTR_004: 'Cliente inativo',
    CTR_005: 'Limite excedido',
    CTR_006: 'Valor inválido',
    CTR_007: 'Fase inválida',
    CTR_008: 'Queue não suportado',
    CTR_009: 'Oportunidade expirada',
    CTR_010: 'Cliente não elegível'
  },

  // Status de propostas
  statusProposta: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
  },

  // Status de contratos
  statusContrato: {
    ACTIVE: 'ativo',
    INACTIVE: 'inativo',
    CANCELLED: 'cancelado',
    EXPIRED: 'expirado',
    SUSPENDED: 'suspenso'
  },

  // Webhooks
  webhooks: {
    events: [
      'proposta.aprovada',
      'proposta.rejeitada',
      'proposta.expirada',
      'contrato.criado',
      'contrato.cancelado',
      'contrato.suspenso',
      'cliente.bloqueado',
      'cliente.desbloqueado'
    ],
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 5000
  },

  // Validações
  validations: {
    cpf: {
      pattern: /^\d{11}$/,
      message: 'CPF deve conter 11 dígitos'
    },
    valor: {
      min: 100.00,
      max: 50000.00,
      message: 'Valor deve estar entre R$ 100,00 e R$ 50.000,00'
    },
    parcelas: {
      min: 6,
      max: 120,
      message: 'Parcelas devem estar entre 6 e 120'
    },
    margem: {
      min: 0.01,
      max: 0.10,
      message: 'Margem deve estar entre 1% e 10%'
    },
    telefone: {
      pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
      message: 'Telefone deve estar no formato (11) 99999-9999'
    }
  },

  // Logging
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: 'json',
    includeRequest: true,
    includeResponse: true,
    includeHeaders: false
  },

  // Monitoramento
  monitoring: {
    enabled: true,
    metrics: {
      requests: true,
      responseTime: true,
      errors: true,
      rateLimit: true
    },
    alerts: {
      errorRate: 0.05, // 5%
      responseTime: 5000, // 5 segundos
      availability: 0.99 // 99%
    }
  }
};

module.exports = config;
