/**
 * Integração Sistema Operacional - API AtenderBem
 * Integração completa entre o sistema operacional e a API AtenderBem
 */

const AtenderBemClient = require('./atenderbem-client');
const { mapearDadosParaAPI, validarDadosFormulario, gerarResumoDados } = require('./data-mapping');
const { 
  obterStatusPorId, 
  obterProximosStatus, 
  validarTransicaoStatus, 
  isStatusFinal,
  FILAS,
  STATUS_PORTABILIDADE,
  STATUS_FGTS
} = require('./crm-status-mapping');
const config = require('./config');

class OperacionalIntegration {
  constructor(environment = 'development') {
    this.client = new AtenderBemClient(environment);
    this.queueId = config.queueId || 25;
    this.apiKey = config.apiKey || 'cd4d0509169d4e2ea9177ac66c1c9376';
  }

  /**
   * Processar proposta completa
   * @param {Object} dadosFormulario - Dados do formulário
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processarProposta(dadosFormulario) {
    try {
      console.log('🔄 Iniciando processamento da proposta...');
      
      // 1. Validar dados
      const validacao = validarDadosFormulario(dadosFormulario);
      if (!validacao.valido) {
        throw new Error(`Dados inválidos: ${validacao.erros.join(', ')}`);
      }
      
      // 2. Mapear dados
      const dadosMapeados = mapearDadosParaAPI(dadosFormulario);
      console.log('✅ Dados mapeados com sucesso');
      
      // 3. Criar contato no CRM
      console.log('📝 Criando contato...');
      const contato = await this.criarContato(dadosMapeados);
      console.log('✅ Contato criado:', contato.data?.id);
      
      // 4. Criar oportunidade
      const oportunidade = await this.criarOportunidade(dadosMapeados, contato.data?.id);
      console.log('✅ Oportunidade criada:', oportunidade.data?.id);
      
      // 5. Abrir atendimento
      const atendimento = await this.abrirAtendimento(dadosMapeados);
      console.log('✅ Atendimento aberto:', atendimento.data?.chatId);
      
      return {
        success: true,
        message: 'Proposta processada com sucesso',
        data: {
          contato: contato.data,
          oportunidade: oportunidade.data,
          atendimento: atendimento.data,
          resumo: gerarResumoDados(dadosMapeados)
        }
      };
      
    } catch (error) {
      console.error('❌ Erro ao processar proposta:', error.message);
      throw error;
    }
  }


  /**
   * Criar contato no CRM
   * @param {Object} dadosMapeados - Dados mapeados
   * @returns {Promise<Object>} Resposta da API
   */
  async criarContato(dadosMapeados) {
    const dadosContato = {
      queueId: this.queueId,
      apiKey: this.apiKey,
      name: dadosMapeados.cliente.nome,
      number: dadosMapeados.cliente.celular,
      mainmail: dadosMapeados.cliente.email, // Kentro usa mainmail, não email
      customFields: {
        cpf: dadosMapeados.cliente.cpf,
        dataNascimento: dadosMapeados.cliente.dataNascimento,
        idade: dadosMapeados.cliente.idade,
        nomeMae: dadosMapeados.cliente.nomeMae,
        numeroBeneficio: dadosMapeados.beneficio.numero,
        especieBeneficio: dadosMapeados.beneficio.especie
      }
    };
    
    return await this.client.createContact(dadosContato);
  }

  /**
   * Criar oportunidade no CRM
   * @param {Object} dadosMapeados - Dados mapeados
   * @param {number} contatoId - ID do contato
   * @returns {Promise<Object>} Resposta da API
   */
  async criarOportunidade(dadosMapeados, contatoId) {
    const dadosOportunidade = {
      queueId: this.queueId,
      apiKey: this.apiKey,
      contactId: contatoId,
      title: `Proposta INSS - ${dadosMapeados.cliente.nome}`,
      value: parseFloat(dadosMapeados.financeiro.valorLiberado?.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
      stageId: 1,
      customFields: {
        troco: dadosMapeados.financeiro.troco,
        novaParcela: dadosMapeados.financeiro.novaParcela,
        prazoNovo: dadosMapeados.contrato.prazoNovo,
        bancoProposta: dadosMapeados.bancario.bancoProposta
      }
    };
    
    return await this.client.createOpportunity(dadosOportunidade);
  }

  /**
   * Abrir atendimento
   * @param {Object} dadosMapeados - Dados mapeados
   * @returns {Promise<Object>} Resposta da API
   */
  async abrirAtendimento(dadosMapeados) {
    const dadosAtendimento = {
      queueId: this.queueId,
      apiKey: this.apiKey,
      number: dadosMapeados.cliente.celular,
      country: 'BR',
      message: `Olá ${dadosMapeados.cliente.nome}! Sua proposta INSS foi processada.`
    };
    
    return await this.client.openChat(dadosAtendimento);
  }

  /**
   * Alterar fase da oportunidade
   * @param {number} oportunidadeId - ID da oportunidade
   * @param {number} novaFaseId - ID da nova fase
   * @returns {Promise<Object>} Resposta da API
   */
  async alterarFaseOportunidade(oportunidadeId, novaFaseId) {
    return await this.client.changeOpportunityStage({
      queueId: this.queueId,
      apiKey: this.apiKey,
      id: oportunidadeId,
      destStageId: novaFaseId
    });
  }

  /**
   * Alterar fase da oportunidade com validação
   * @param {number} oportunidadeId - ID da oportunidade
   * @param {number} statusAtualId - ID do status atual
   * @param {number} novoStatusId - ID do novo status
   * @param {number} filaId - ID da fila (opcional, usa a padrão se não informado)
   * @returns {Promise<Object>} Resposta da API
   */
  async alterarFaseOportunidadeComValidacao(oportunidadeId, statusAtualId, novoStatusId, filaId = null) {
    const fila = filaId || this.queueId;
    
    // Validar transição
    const validacao = validarTransicaoStatus(fila, statusAtualId, novoStatusId);
    if (!validacao.valida) {
      throw new Error(`Transição inválida: ${validacao.erro}`);
    }

    console.log(`🔄 Alterando status: ${validacao.statusAtual.nome} → ${validacao.novoStatus.nome}`);
    
    return await this.client.changeOpportunityStage({
      queueId: fila,
      apiKey: this.apiKey,
      id: oportunidadeId,
      destStageId: novoStatusId
    });
  }

  /**
   * Obter próximos status possíveis
   * @param {number} filaId - ID da fila
   * @param {number} statusAtualId - ID do status atual
   * @returns {Array} Próximos status possíveis
   */
  obterProximosStatusPossiveis(filaId, statusAtualId) {
    return obterProximosStatus(filaId, statusAtualId);
  }

  /**
   * Verificar se status é final
   * @param {number} statusId - ID do status
   * @returns {boolean} Se é status final
   */
  verificarStatusFinal(statusId) {
    return isStatusFinal(statusId);
  }

  /**
   * Obter informações do status
   * @param {number} statusId - ID do status
   * @returns {Object|null} Informações do status
   */
  obterInformacoesStatus(statusId) {
    return obterStatusPorId(statusId);
  }

  /**
   * Buscar oportunidades de um contato
   * @param {number} contactId - ID do contato
   * @returns {Promise<Array>} Lista de oportunidades
   */
  async buscarOportunidadesDoContato(contactId) {
    try {
      const oportunidades = await this.client.getOpportunities({
        queueId: this.queueId,
        apiKey: this.apiKey,
        contactId: contactId
      });
      
      // Verificar se a resposta tem a estrutura esperada
      if (oportunidades && typeof oportunidades === 'object') {
        if (Array.isArray(oportunidades)) {
          return oportunidades;
        } else if (oportunidades.data && Array.isArray(oportunidades.data)) {
          return oportunidades.data;
        } else if (oportunidades.opportunities && Array.isArray(oportunidades.opportunities)) {
          return oportunidades.opportunities;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar oportunidades do contato:', error);
      return [];
    }
  }

  /**
   * Buscar oportunidade específica por ID
   * @param {number} opportunityId - ID da oportunidade
   * @returns {Promise<Object|null>} Oportunidade encontrada
   */
  async buscarOportunidadePorId(opportunityId) {
    try {
      const oportunidades = await this.client.getOpportunities({
        queueId: this.queueId,
        apiKey: this.apiKey,
        id: opportunityId
      });
      
      // Verificar se a resposta tem a estrutura esperada
      let listaOportunidades = [];
      if (oportunidades && typeof oportunidades === 'object') {
        if (Array.isArray(oportunidades)) {
          listaOportunidades = oportunidades;
        } else if (oportunidades.data && Array.isArray(oportunidades.data)) {
          listaOportunidades = oportunidades.data;
        } else if (oportunidades.opportunities && Array.isArray(oportunidades.opportunities)) {
          listaOportunidades = oportunidades.opportunities;
        }
      }
      
      if (listaOportunidades.length > 0) {
        return listaOportunidades[0];
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar oportunidade:', error);
      return null;
    }
  }

  /**
   * Buscar oportunidades por status
   * @param {number} statusId - ID do status
   * @returns {Promise<Array>} Lista de oportunidades
   */
  async buscarOportunidadesPorStatus(statusId) {
    try {
      const oportunidades = await this.client.getOpportunities({
        queueId: this.queueId,
        apiKey: this.apiKey,
        stageId: statusId
      });
      
      // Verificar se a resposta tem a estrutura esperada
      if (oportunidades && typeof oportunidades === 'object') {
        if (Array.isArray(oportunidades)) {
          return oportunidades;
        } else if (oportunidades.data && Array.isArray(oportunidades.data)) {
          return oportunidades.data;
        } else if (oportunidades.opportunities && Array.isArray(oportunidades.opportunities)) {
          return oportunidades.opportunities;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar oportunidades por status:', error);
      return [];
    }
  }


  /**
   * Testar conexão com a API
   * @returns {Promise<Object>} Resultado do teste
   */
  async testarConexao() {
    try {
      const filas = await this.client.getQueues({
        apiKey: this.apiKey
      });
      
      return {
        success: true,
        message: 'Conexão com API AtenderBem estabelecida com sucesso',
        data: {
          filas: filas.data?.length || 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao conectar com API AtenderBem',
        error: error.message
      };
    }
  }
}

module.exports = OperacionalIntegration;