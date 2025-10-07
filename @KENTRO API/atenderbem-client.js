/**
 * Cliente completo da API AtenderBem
 * Baseado na especificação oficial v5.6.2
 */

const axios = require('axios');
const config = require('./config');

class AtenderBemClient {
  constructor(environment = 'development') {
    this.environment = environment;
    this.apiConfig = config.api[environment];
    this.rateLimiters = new Map();
    this.retryCount = 0;
    
    // Configurar cliente HTTP
    this.client = axios.create({
      baseURL: this.apiConfig.baseUrl,
      timeout: this.apiConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AtenderBem-Client/1.0.0'
      }
    });

    // Interceptors
    this.setupInterceptors();
  }

  /**
   * Configurar interceptors para requisições e respostas
   */
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.logRequest(config);
        return config;
      },
      (error) => {
        this.logError('Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.logResponse(response);
        return response;
      },
      (error) => {
        this.logError('Response Error', error);
        return this.handleError(error);
      }
    );
  }

  // ========================================
  // CHAT E ATENDIMENTOS
  // ========================================

  /**
   * Abrir novo atendimento (navegador)
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async externalNewChat(params) {
    try {
      const response = await this.client.get(config.endpoints.externalNewChat, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'externalNewChat');
    }
  }

  /**
   * Abrir novo atendimento (API)
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async openNewChat(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey', 'number']);
      const response = await this.client.get(config.endpoints.openNewChat, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'openNewChat');
    }
  }

  /**
   * Abrir atendimento (POST)
   * @param {Object} dados - Dados do atendimento
   * @returns {Promise<Object>} Resposta da API
   */
  async openChat(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'number']);
      await this.checkRateLimit('openChat');
      const response = await this.client.post(config.endpoints.openChat, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'openChat');
    }
  }

  /**
   * Enviar template WhatsApp
   * @param {Object} dados - Dados do template
   * @returns {Promise<Object>} Resposta da API
   */
  async sendWaTemplate(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'number', 'templateId']);
      await this.checkRateLimit('sendWaTemplate');
      const response = await this.client.post(config.endpoints.sendWaTemplate, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'sendWaTemplate');
    }
  }

  // ========================================
  // CRM E OPORTUNIDADES
  // ========================================

  /**
   * Alterar fase da oportunidade
   * @param {Object} dados - Dados da oportunidade
   * @returns {Promise<Object>} Resposta da API
   */
  async changeOpportunityStage(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'id', 'destStageId']);
      await this.checkRateLimit('changeOpportunityStage');
      const response = await this.client.post(config.endpoints.changeOpportunityStage, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'changeOpportunityStage');
    }
  }

  /**
   * Atualizar dados da oportunidade
   * @param {Object} dados - Dados da oportunidade
   * @returns {Promise<Object>} Resposta da API
   */
  async updateOpportunity(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'id']);
      await this.checkRateLimit('updateOpportunity');
      const response = await this.client.post(config.endpoints.updateOpportunity, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'updateOpportunity');
    }
  }

  /**
   * Listar oportunidades
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getOpportunities(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getOpportunities');
      const response = await this.client.get(config.endpoints.getOpportunities, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getOpportunities');
    }
  }

  /**
   * Criar nova oportunidade
   * @param {Object} dados - Dados da oportunidade
   * @returns {Promise<Object>} Resposta da API
   */
  async createOpportunity(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey']);
      await this.checkRateLimit('createOpportunity');
      const response = await this.client.post(config.endpoints.createOpportunity, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'createOpportunity');
    }
  }

  // ========================================
  // CONTATOS E EMPRESAS
  // ========================================

  /**
   * Listar contatos
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getContacts(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getContacts');
      const response = await this.client.get(config.endpoints.getContacts, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getContacts');
    }
  }

  /**
   * Criar contato
   * @param {Object} dados - Dados do contato
   * @returns {Promise<Object>} Resposta da API
   */
  async createContact(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey']);
      await this.checkRateLimit('createContact');
      const response = await this.client.post(config.endpoints.createContact, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'createContact');
    }
  }

  /**
   * Atualizar contato
   * @param {Object} dados - Dados do contato
   * @returns {Promise<Object>} Resposta da API
   */
  async updateContact(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'id']);
      await this.checkRateLimit('updateContact');
      const response = await this.client.put(config.endpoints.updateContact, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'updateContact');
    }
  }

  /**
   * Listar empresas
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getCompanies(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getCompanies');
      const response = await this.client.get(config.endpoints.getCompanies, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getCompanies');
    }
  }

  // ========================================
  // MENSAGENS
  // ========================================

  /**
   * Enviar mensagem
   * @param {Object} dados - Dados da mensagem
   * @returns {Promise<Object>} Resposta da API
   */
  async sendMessage(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'chatId', 'message']);
      await this.checkRateLimit('sendMessage');
      const response = await this.client.post(config.endpoints.sendMessage, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'sendMessage');
    }
  }

  /**
   * Listar mensagens
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getMessages(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getMessages');
      const response = await this.client.get(config.endpoints.getMessages, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getMessages');
    }
  }

  // ========================================
  // ARQUIVOS E GALERIA
  // ========================================

  /**
   * Upload de arquivo
   * @param {Object} dados - Dados do arquivo
   * @returns {Promise<Object>} Resposta da API
   */
  async uploadFile(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'fileName', 'mimeType', 'data']);
      await this.checkRateLimit('uploadFile');
      const response = await this.client.post(config.endpoints.uploadFile, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'uploadFile');
    }
  }

  /**
   * Listar arquivos
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getFiles(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getFiles');
      const response = await this.client.get(config.endpoints.getFiles, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getFiles');
    }
  }

  /**
   * Listar galeria
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getGallery(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getGallery');
      const response = await this.client.get(config.endpoints.getGallery, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getGallery');
    }
  }

  // ========================================
  // USUÁRIOS E FILAS
  // ========================================

  /**
   * Listar usuários
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getUsers(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getUsers');
      const response = await this.client.get(config.endpoints.getUsers, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getUsers');
    }
  }

  /**
   * Listar filas
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getQueues(params) {
    try {
      this.validarParametrosObrigatorios(params, ['apiKey']);
      await this.checkRateLimit('getQueues');
      const response = await this.client.get(config.endpoints.getQueues, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getQueues');
    }
  }

  /**
   * Criar usuário
   * @param {Object} dados - Dados do usuário
   * @returns {Promise<Object>} Resposta da API
   */
  async createUser(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey']);
      await this.checkRateLimit('createUser');
      const response = await this.client.post(config.endpoints.createUser, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'createUser');
    }
  }

  // ========================================
  // TAREFAS
  // ========================================

  /**
   * Listar tarefas
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getTasks(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getTasks');
      const response = await this.client.get(config.endpoints.getTasks, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getTasks');
    }
  }

  /**
   * Criar tarefa
   * @param {Object} dados - Dados da tarefa
   * @returns {Promise<Object>} Resposta da API
   */
  async createTask(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'title']);
      await this.checkRateLimit('createTask');
      const response = await this.client.post(config.endpoints.createTask, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'createTask');
    }
  }

  /**
   * Atualizar tarefa
   * @param {Object} dados - Dados da tarefa
   * @returns {Promise<Object>} Resposta da API
   */
  async updateTask(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'id']);
      await this.checkRateLimit('updateTask');
      const response = await this.client.put(config.endpoints.updateTask, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'updateTask');
    }
  }

  // ========================================
  // PRODUTOS
  // ========================================

  /**
   * Listar produtos
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getProducts(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getProducts');
      const response = await this.client.get(config.endpoints.getProducts, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getProducts');
    }
  }

  /**
   * Criar produto
   * @param {Object} dados - Dados do produto
   * @returns {Promise<Object>} Resposta da API
   */
  async createProduct(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'name']);
      await this.checkRateLimit('createProduct');
      const response = await this.client.post(config.endpoints.createProduct, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'createProduct');
    }
  }

  /**
   * Atualizar produto
   * @param {Object} dados - Dados do produto
   * @returns {Promise<Object>} Resposta da API
   */
  async updateProduct(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'id']);
      await this.checkRateLimit('updateProduct');
      const response = await this.client.put(config.endpoints.updateProduct, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'updateProduct');
    }
  }

  // ========================================
  // WEBHOOKS E BACKUP
  // ========================================

  /**
   * Listar webhooks
   * @param {Object} params - Parâmetros da query
   * @returns {Promise<Object>} Resposta da API
   */
  async getWebhooks(params) {
    try {
      this.validarParametrosObrigatorios(params, ['queueId', 'apiKey']);
      await this.checkRateLimit('getWebhooks');
      const response = await this.client.get(config.endpoints.getWebhooks, { params });
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'getWebhooks');
    }
  }

  /**
   * Criar webhook
   * @param {Object} dados - Dados do webhook
   * @returns {Promise<Object>} Resposta da API
   */
  async createWebhook(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey', 'url']);
      await this.checkRateLimit('createWebhook');
      const response = await this.client.post(config.endpoints.createWebhook, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'createWebhook');
    }
  }

  /**
   * Executar backup
   * @param {Object} dados - Dados do backup
   * @returns {Promise<Object>} Resposta da API
   */
  async backup(dados) {
    try {
      this.validarParametrosObrigatorios(dados, ['queueId', 'apiKey']);
      await this.checkRateLimit('backup');
      const response = await this.client.post(config.endpoints.backup, dados);
      return this.processarResposta(response);
    } catch (error) {
      throw this.tratarErro(error, 'backup');
    }
  }

  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================

  /**
   * Validar parâmetros obrigatórios
   * @param {Object} dados - Dados para validação
   * @param {Array} campos - Campos obrigatórios
   */
  validarParametrosObrigatorios(dados, campos) {
    for (const campo of campos) {
      if (dados[campo] === undefined || dados[campo] === null || dados[campo] === '') {
        throw new Error(`Campo obrigatório '${campo}' não informado`);
      }
    }
  }

  /**
   * Verificar rate limit
   * @param {string} endpoint - Endpoint a ser verificado
   */
  async checkRateLimit(endpoint) {
    const rateLimit = config.rateLimit[endpoint] || config.rateLimit.consultas;
    if (!rateLimit) return;

    const now = Date.now();
    const windowStart = now - rateLimit.window;
    
    // Limpar entradas antigas
    if (this.rateLimiters.has(endpoint)) {
      const requests = this.rateLimiters.get(endpoint);
      const validRequests = requests.filter(time => time > windowStart);
      this.rateLimiters.set(endpoint, validRequests);
    } else {
      this.rateLimiters.set(endpoint, []);
    }

    const requests = this.rateLimiters.get(endpoint);
    
    if (requests.length >= rateLimit.limit) {
      throw new Error(`Rate limit excedido para ${endpoint}. Tente novamente em ${rateLimit.window / 1000} segundos.`);
    }

    requests.push(now);
  }

  /**
   * Processar resposta da API
   * @param {Object} response - Resposta do axios
   * @returns {Object} Dados processados
   */
  processarResposta(response) {
    return {
      success: true,
      data: response.data,
      status: response.status,
      headers: response.headers
    };
  }

  /**
   * Tratar erro da API
   * @param {Error} error - Erro capturado
   * @param {string} operacao - Operação que causou o erro
   * @returns {Error} Erro tratado
   */
  tratarErro(error, operacao) {
    if (error.response) {
      // Erro da API
      const { status, data } = error.response;
      const errorCode = data?.code || 'UNKNOWN_ERROR';
      const errorMessage = data?.message || config.errorCodes[errorCode] || 'Erro desconhecido';
      
      return new Error(`[${operacao}] ${errorMessage} (${status})`);
    } else if (error.request) {
      // Erro de rede
      return new Error(`[${operacao}] Erro de conexão com a API AtenderBem`);
    } else {
      // Erro interno
      return new Error(`[${operacao}] ${error.message}`);
    }
  }

  /**
   * Lidar com erro e retry
   * @param {Error} error - Erro capturado
   * @returns {Promise} Promise rejeitada ou retry
   */
  async handleError(error) {
    if (this.retryCount < this.apiConfig.retries) {
      this.retryCount++;
      const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
      
      console.log(`Tentativa ${this.retryCount}/${this.apiConfig.retries} em ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return Promise.reject(error);
    }
    
    this.retryCount = 0;
    return Promise.reject(error);
  }

  /**
   * Log de requisição
   * @param {Object} config - Configuração da requisição
   */
  logRequest(config) {
    if (config.logging?.level === 'debug') {
      console.log(`[ATENDERBEM] ${config.method?.toUpperCase()} ${config.url}`);
    }
  }

  /**
   * Log de resposta
   * @param {Object} response - Resposta da API
   */
  logResponse(response) {
    if (config.logging.level === 'debug') {
      console.log(`[ATENDERBEM] ${response.status} ${response.config.url}`);
    }
  }

  /**
   * Log de erro
   * @param {string} context - Contexto do erro
   * @param {Error} error - Erro capturado
   */
  logError(context, error) {
    console.error(`[ATENDERBEM] ${context}:`, error.message);
  }

  /**
   * Obter estatísticas de rate limit
   * @returns {Object} Estatísticas
   */
  getRateLimitStats() {
    const stats = {};
    for (const [endpoint, requests] of this.rateLimiters.entries()) {
      const rateLimit = config.rateLimit[endpoint] || config.rateLimit.consultas;
      stats[endpoint] = {
        current: requests.length,
        limit: rateLimit.limit,
        remaining: rateLimit.limit - requests.length,
        resetTime: Math.max(...requests) + rateLimit.window
      };
    }
    return stats;
  }
}

module.exports = AtenderBemClient;



