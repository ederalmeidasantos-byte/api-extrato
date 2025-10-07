const axios = require('axios');

class KentroAPI {
  constructor(config) {
    this.config = config;
    this.baseURL = config.baseUrl;
    this.queueId = config.queueId;
    this.apiKey = config.apiKey;
  }

  async enviarMensagem(chatId, texto, botoes = null) {
    try {
      const payload = {
        queueId: this.queueId,
        apiKey: this.apiKey,
        chatId: chatId,
        text: texto
      };

      // Adicionar botões se fornecidos
      if (botoes && botoes.length > 0) {
        payload.buttonsConfig = {
          title: "",
          buttons: botoes
        };
      }

      console.log('📤 [KENTRO] Enviando mensagem:', payload);

      const response = await axios.post(`${this.baseURL}/int/sendMessageToChat`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('✅ [KENTRO] Mensagem enviada:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ [KENTRO] Erro ao enviar mensagem:', error.response?.data || error.message);
      throw error;
    }
  }

  async buscarOuCriarChat(numero) {
    try {
      // Buscar chats abertos
      const chats = await this.listarChatsAbertos();
      
      // Procurar chat existente para o número
      const chatExistente = chats.find(chat => 
        chat.clientNumber === numero && chat.status === 1
      );

      if (chatExistente) {
        console.log(`✅ [KENTRO] Chat encontrado: ${chatExistente.chatId}`);
        return chatExistente.chatId;
      }

      // Criar novo chat se não existir
      console.log(`🆕 [KENTRO] Criando novo chat para ${numero}`);
      const novoChat = await this.criarNovoChat(numero);
      return novoChat.chatId;

    } catch (error) {
      console.error('❌ [KENTRO] Erro ao buscar/criar chat:', error);
      throw error;
    }
  }

  async listarChatsAbertos() {
    try {
      const response = await axios.post(`${this.baseURL}/int/getAllOpenChats`, {
        queueId: this.queueId,
        apiKey: this.apiKey
      });

      return response.data.chats || [];

    } catch (error) {
      console.error('❌ [KENTRO] Erro ao listar chats:', error);
      throw error;
    }
  }

  async criarNovoChat(numero) {
    try {
      const response = await axios.post(`${this.baseURL}/int/openNewChat`, {
        queueId: this.queueId,
        apiKey: this.apiKey,
        clientNumber: numero
      });

      return response.data;

    } catch (error) {
      console.error('❌ [KENTRO] Erro ao criar chat:', error);
      throw error;
    }
  }

  async buscarDadosCliente(numero) {
    try {
      // TODO: Implementar busca de dados do cliente no CRM
      // Por enquanto, retornar dados mockados
      return {
        numero: numero,
        nome: 'Cliente',
        cpf: null,
        propostas: [],
        margem: null,
        status: 'ativo',
        ultimaAtualizacao: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [KENTRO] Erro ao buscar dados do cliente:', error);
      throw error;
    }
  }

  async buscarPropostasCliente(numero) {
    try {
      // TODO: Implementar busca de propostas do cliente
      return [];

    } catch (error) {
      console.error('❌ [KENTRO] Erro ao buscar propostas:', error);
      throw error;
    }
  }
}

module.exports = KentroAPI;

