/**
 * Configuração Agent Builder - ChatGPT Vendedor
 * Sistema inteligente de atendimento via WhatsApp
 */

export const agentBuilderConfig = {
    // Configurações do Agent Builder OpenAI
    agent: {
        name: "ChatGPT Vendedor Lunas",
        description: "Assistente de vendas especializado em empréstimo consignado",
        instructions: `Você é assistente de vendas da Lunas Digital especializado em empréstimo consignado via WhatsApp.

REGRA OBRIGATÓRIA: 
- Responda em NO MÁXIMO 20 PALAVRAS
- Seja direto, claro e profissional
- SEM emojis

PRODUTOS:
- Portabilidade: troco de empréstimo existente
- FGTS: saque do fundo de garantia

PERFIL VENDEDOR (propostas não iniciadas):
- Tom persuasivo e comercial
- Foque em benefícios e valores específicos
- Apresente condições e taxas
- Termine com call-to-action

PERFIL RECEPCIONISTA (propostas em andamento):
- Tom educativo e prestativo
- Explique status atual e próximos passos
- Tire dúvidas sobre prazos e documentos
- Ofereça suporte adicional

DADOS DO CLIENTE:
O usuário enviará mensagem com formato:
"[PERFIL: vendedor/recepcionista]
Cliente: [nome]
CPF: [cpf]
Propostas: [dados das propostas]
Mensagem: [texto do cliente]"

IMPORTANTE:
- Use nome do cliente sempre
- Seja transparente sobre taxas e condições
- Para dúvidas complexas: "Vou transferir para especialista"
- MÁXIMO 20 PALAVRAS - seja extremamente conciso!
- Use dados reais das propostas quando disponíveis`,
        
        model: "gpt-5-nano",
        temperature: 0.3,
        maxTokens: 50,
        reasoningEffort: "minimal"
    },

    // Configurações de ferramentas do Agent Builder
    tools: [
        {
            type: "function",
            name: "buscar_dados_cliente",
            description: "Busca dados do cliente no CRM",
            parameters: {
                type: "object",
                properties: {
                    cpf: {
                        type: "string",
                        description: "CPF do cliente"
                    }
                },
                required: ["cpf"]
            }
        },
        {
            type: "function", 
            name: "verificar_propostas",
            description: "Verifica propostas ativas do cliente",
            parameters: {
                type: "object",
                properties: {
                    cpf: {
                        type: "string",
                        description: "CPF do cliente"
                    }
                },
                required: ["cpf"]
            }
        },
        {
            type: "function",
            name: "simular_portabilidade",
            description: "Simula valores para portabilidade",
            parameters: {
                type: "object",
                properties: {
                    valorAtual: {
                        type: "number",
                        description: "Valor atual do empréstimo"
                    },
                    parcelasRestantes: {
                        type: "number", 
                        description: "Número de parcelas restantes"
                    }
                },
                required: ["valorAtual", "parcelasRestantes"]
            }
        },
        {
            type: "function",
            name: "simular_fgts",
            description: "Simula valores para saque FGTS",
            parameters: {
                type: "object",
                properties: {
                    saldoFgts: {
                        type: "number",
                        description: "Saldo disponível no FGTS"
                    }
                },
                required: ["saldoFgts"]
            }
        }
    ],

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

export default agentBuilderConfig;

