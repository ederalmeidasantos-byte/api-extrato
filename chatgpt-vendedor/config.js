/**
 * Configurações do ChatGPT Vendedor
 */

export const config = {
    // Configurações da API OpenAI
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini', // Modelo mais econômico
        maxTokens: 1000,
        temperature: 0.7,
        timeout: 30000 // 30 segundos
    },

    // Configurações do sistema
    system: {
        clientDataPath: 'var/data/clientes',
        logLevel: 'info',
        enableDebug: process.env.NODE_ENV === 'development'
    },

    // Configurações de resposta
    response: {
        maxLength: 500, // Máximo de caracteres na resposta
        includeMetadata: true,
        fallbackMessage: 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes.'
    },

    // Configurações de classificação de mensagens
    classification: {
        actions: [
            'enviar_atendente',
            'fechar_proposta', 
            'verificar_duvida',
            'cliente_bravo',
            'continuar_conversa'
        ],
        keywords: {
            parcelas: ['parcela', 'parcelas', 'valor', 'quanto', 'preço'],
            taxas: ['taxa', 'taxas', 'juros', 'custo', 'desconto'],
            propostas: ['proposta', 'propostas', 'status', 'situação'],
            atendente: ['atendente', 'pessoa', 'humano', 'falar'],
            duvidas: ['dúvida', 'duvida', 'pergunta', 'como', 'quando']
        }
    },

    // Configurações de produtos
    produtos: {
        portabilidade: {
            nome: 'Portabilidade com Troco',
            descricao: 'Portabilidade de empréstimo com troco',
            valorMinimo: 200,
            taxaMinima: 1.65
        },
        fgts: {
            nome: 'Saque do FGTS',
            descricao: 'Saque do Fundo de Garantia',
            valorMinimo: 150,
            taxaMinima: 0.99
        }
    }
};

export default config;
