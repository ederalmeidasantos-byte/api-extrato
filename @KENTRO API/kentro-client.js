/**
 * Cliente da API Kentro
 * Integração completa para sistema FGTS
 */

const axios = require('axios');
const config = require('./config');

class KentroClient {
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
        'User-Agent': 'Lunas-Operacional/1.0.0'
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

  /**
   * Alterar fase da oportunidade
   * @param {Object} dados - Dados da oportunidade
   * @returns {Promise<Object>} Resposta da API
   */
  async alterarFaseOportunidade(dados) {
    try {
      // Validar dados
      this.validarDadosFase(dados);

      // Verificar rate limit
      await this.checkRateLimit('changeOpportunityStage');

      // Fazer requisição
      const response = await this.client.post(config.endpoints.changeOpportunityStage, dados);

      // Processar resposta
      return this.processarResposta(response);

    } catch (error) {
      throw this.tratarErro(error, 'alterarFaseOportunidade');
    }
  }

  /**
   * Atualizar dados da oportunidade
   * @param {Object} dados - Dados da oportunidade
   * @returns {Promise<Object>} Resposta da API
   */
  async atualizarOportunidade(dados) {
    try {
      // Validar dados
      this.validarDadosAtualizacao(dados);

      // Verificar rate limit
      await this.checkRateLimit('updateOpportunity');

      // Fazer requisição
      const response = await this.client.post(config.endpoints.updateOpportunity, dados);

      // Processar resposta
      return this.processarResposta(response);

    } catch (error) {
      throw this.tratarErro(error, 'atualizarOportunidade');
    }
  }

  /**
   * Consultar status da proposta
   * @param {string} propostaId - ID da proposta
   * @returns {Promise<Object>} Status da proposta
   */
  async consultarStatus(propostaId) {
    try {
      // Verificar rate limit
      await this.checkRateLimit('consultas');

      // Fazer requisição
      const response = await this.client.get(`${config.endpoints.status}/${propostaId}`);

      // Processar resposta
      return this.processarResposta(response);

    } catch (error) {
      throw this.tratarErro(error, 'consultarStatus');
    }
  }

  /**
   * Listar contratos do cliente
   * @param {string} clienteId - ID do cliente
   * @returns {Promise<Object>} Lista de contratos
   */
  async listarContratos(clienteId) {
    try {
      // Verificar rate limit
      await this.checkRateLimit('consultas');

      // Fazer requisição
      const response = await this.client.get(`${config.endpoints.contratos}/${clienteId}`);

      // Processar resposta
      return this.processarResposta(response);

    } catch (error) {
      throw this.tratarErro(error, 'listarContratos');
    }
  }

  /**
   * Validar dados da fase
   * @param {Object} dados - Dados para validação
   */
  validarDadosFase(dados) {
    if (!dados.queueId) {
      throw new Error('Queue ID é obrigatório');
    }

    if (!dados.apiKey) {
      throw new Error('API Key é obrigatória');
    }

    if (!dados.id) {
      throw new Error('ID da oportunidade é obrigatório');
    }

    if (!dados.destStageId) {
      throw new Error('ID do estágio de destino é obrigatório');
    }

    if (typeof dados.queueId !== 'number') {
      throw new Error('Queue ID deve ser um número');
    }

    if (typeof dados.id !== 'number') {
      throw new Error('ID da oportunidade deve ser um número');
    }

    if (typeof dados.destStageId !== 'number') {
      throw new Error('ID do estágio deve ser um número');
    }
  }

  /**
   * Validar dados da atualização
   * @param {Object} dados - Dados para validação
   */
  validarDadosAtualizacao(dados) {
    if (!dados.queueId) {
      throw new Error('Queue ID é obrigatório');
    }

    if (!dados.apiKey) {
      throw new Error('API Key é obrigatória');
    }

    if (!dados.id) {
      throw new Error('ID da oportunidade é obrigatório');
    }

    if (dados.value === undefined || dados.value === null) {
      throw new Error('Valor é obrigatório');
    }

    if (typeof dados.queueId !== 'number') {
      throw new Error('Queue ID deve ser um número');
    }

    if (typeof dados.id !== 'number') {
      throw new Error('ID da oportunidade deve ser um número');
    }

    if (typeof dados.value !== 'number') {
      throw new Error('Valor deve ser um número');
    }
  }

  /**
   * Preparar payload da proposta
   * @param {Object} dados - Dados da proposta
   * @returns {Object} Payload formatado
   */
  prepararPayloadProposta(dados) {
    return {
      cpf: dados.cpf,
      valor: parseFloat(dados.valor),
      parcelas: parseInt(dados.parcelas),
      margem: parseFloat(dados.margem),
      provider: dados.provider || 'bms',
      dados_cliente: {
        nome: dados.dados_cliente?.nome || '',
        nb: dados.dados_cliente?.nb || '',
        especie: dados.dados_cliente?.especie || '',
        telefone: dados.dados_cliente?.telefone || ''
      },
      metadata: {
        origem: 'sistema_operacional',
        timestamp: new Date().toISOString(),
        versao: '1.0.0'
      }
    };
  }

  /**
   * Preparar payload do contrato
   * @param {Object} dados - Dados do contrato
   * @returns {Object} Payload formatado
   */
  prepararPayloadContrato(dados) {
    return {
      proposta_id: dados.proposta_id,
      cliente_id: dados.cliente_id,
      contrato: {
        valor: parseFloat(dados.contrato.valor),
        parcelas: parseInt(dados.contrato.parcelas),
        taxa_juros: parseFloat(dados.contrato.taxa_juros),
        valor_parcela: parseFloat(dados.contrato.valor_parcela),
        data_vencimento: dados.contrato.data_vencimento,
        banco: dados.contrato.banco,
        agencia: dados.contrato.agencia,
        conta: dados.contrato.conta
      },
      dados_bancarios: {
        banco: dados.dados_bancarios.banco,
        agencia: dados.dados_bancarios.agencia,
        conta: dados.dados_bancarios.conta,
        digito: dados.dados_bancarios.digito
      },
      metadata: {
        origem: 'sistema_operacional',
        timestamp: new Date().toISOString(),
        versao: '1.0.0'
      }
    };
  }

  /**
   * Verificar rate limit
   * @param {string} endpoint - Endpoint a ser verificado
   */
  async checkRateLimit(endpoint) {
    const rateLimit = config.rateLimit[endpoint];
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
      return new Error(`[${operacao}] Erro de conexão com a API Kentro`);
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
      console.log(`[KENTRO] ${config.method?.toUpperCase()} ${config.url}`);
    }
  }

  /**
   * Log de resposta
   * @param {Object} response - Resposta da API
   */
  logResponse(response) {
    if (config.logging.level === 'debug') {
      console.log(`[KENTRO] ${response.status} ${response.config.url}`);
    }
  }

  /**
   * Log de erro
   * @param {string} context - Contexto do erro
   * @param {Error} error - Erro capturado
   */
  logError(context, error) {
    console.error(`[KENTRO] ${context}:`, error.message);
  }

  /**
   * Configurar autenticação
   * @param {string} token - Token de autenticação
   * @param {string} apiKey - Chave da API
   */
  setAuth(token, apiKey) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    this.client.defaults.headers.common['X-API-Key'] = apiKey;
  }

  /**
   * Obter estatísticas de rate limit
   * @returns {Object} Estatísticas
   */
  getRateLimitStats() {
    const stats = {};
    for (const [endpoint, requests] of this.rateLimiters.entries()) {
      const rateLimit = config.rateLimit[endpoint];
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

module.exports = KentroClient;
