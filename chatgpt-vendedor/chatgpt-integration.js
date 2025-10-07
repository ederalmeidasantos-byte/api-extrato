/**
 * Integração ChatGPT Vendedor - Lunas Digital
 * Sistema inteligente de atendimento via WhatsApp
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

class ChatGPTIntegration {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.baseUrl = 'https://api.openai.com/v1';
        this.model = 'gpt-4o-mini'; // Modelo mais econômico
        this.maxTokens = 1000;
        this.temperature = 0.7;
        
        // Configurações do sistema
        this.systemPrompt = this.getSystemPrompt();
        this.clientDataPath = 'var/data/clientes';
        
        console.log('🤖 ChatGPT Integration inicializado');
    }

    /**
     * Prompt do sistema para o ChatGPT
     */
    getSystemPrompt() {
        return `Você é um assistente de vendas especializado em empréstimo consignado da Lunas Digital.

CONTEXTO:
- Você atende clientes via WhatsApp
- Oferece produtos: Portabilidade com Troco e Saque FGTS
- Tem acesso aos dados do cliente e suas propostas
- Deve ser sempre educado, profissional e objetivo

DIRETRIZES:
1. Use o nome do cliente nas respostas
2. Seja específico sobre valores e condições
3. Se houver propostas ativas, mencione-as
4. Para dúvidas técnicas, ofereça contato com especialista
5. Mantenha respostas concisas (máximo 3 parágrafos)
6. Use emojis moderadamente
7. Sempre termine oferecendo próximos passos

PRODUTOS:
- Portabilidade: Troco de empréstimos existentes
- FGTS: Saque do Fundo de Garantia
- Simulações personalizadas disponíveis

LINGUAGEM:
- Tom amigável e profissional
- Evite jargões técnicos
- Foque nos benefícios para o cliente
- Seja transparente sobre condições`;
    }

    /**
     * Buscar dados do cliente por CPF
     */
    async buscarDadosCliente(cpf) {
        try {
            console.log(`🔍 Buscando dados do cliente: ${cpf}`);
            
            // Buscar arquivo do cliente
            const clientFile = path.join(this.clientDataPath, `${cpf}.json`);
            
            if (!fs.existsSync(clientFile)) {
                console.log(`❌ Cliente não encontrado: ${cpf}`);
                return null;
            }

            const clientData = JSON.parse(fs.readFileSync(clientFile, 'utf8'));
            console.log(`✅ Dados do cliente carregados: ${clientData.cliente?.nome || 'Nome não informado'}`);
            
            return clientData;
        } catch (error) {
            console.error('❌ Erro ao buscar dados do cliente:', error);
            return null;
        }
    }

    /**
     * Extrair informações relevantes das propostas
     */
    extrairInfoPropostas(clientData) {
        if (!clientData?.propostas || !Array.isArray(clientData.propostas)) {
            return 'Nenhuma proposta ativa encontrada.';
        }

        const propostasAtivas = clientData.propostas.filter(p => 
            p.statusProposta === 'aprovada' || p.statusProposta === 'ativa'
        );

        if (propostasAtivas.length === 0) {
            return 'Nenhuma proposta aprovada no momento.';
        }

        let info = 'PROPOSTAS ATIVAS:\n';
        propostasAtivas.forEach((proposta, index) => {
            info += `\n${index + 1}. ${proposta.produto || 'Produto não especificado'}\n`;
            info += `   - Status: ${proposta.statusProposta}\n`;
            info += `   - Valor: R$ ${proposta.valor || '0,00'}\n`;
            info += `   - Parcelas: ${proposta.parcelas || 'N/A'}\n`;
            if (proposta.troco) {
                info += `   - Troco: R$ ${proposta.troco}\n`;
            }
        });

        return info;
    }

    /**
     * Preparar contexto para o ChatGPT
     */
    prepararContexto(cpf, mensagem, clientData) {
        const contexto = {
            cliente: {
                nome: clientData?.cliente?.nome || 'Cliente',
                cpf: cpf,
                telefone: clientData?.cliente?.telefone || 'Não informado'
            },
            propostas: this.extrairInfoPropostas(clientData),
            mensagemCliente: mensagem,
            timestamp: new Date().toISOString()
        };

        return contexto;
    }

    /**
     * Gerar prompt para o ChatGPT
     */
    gerarPrompt(contexto) {
        const { cliente, propostas, mensagemCliente } = contexto;

        return `Cliente: ${cliente.nome} (CPF: ${cliente.cpf})
Telefone: ${cliente.telefone}

${propostas}

Mensagem do cliente: "${mensagemCliente}"

Responda de forma personalizada e útil, considerando as informações do cliente e suas propostas ativas.`;
    }

    /**
     * Enviar mensagem para ChatGPT
     */
    async enviarParaChatGPT(prompt) {
        try {
            if (!this.openaiApiKey) {
                throw new Error('OPENAI_API_KEY não configurada');
            }

            console.log('🤖 Enviando para ChatGPT...');

            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: this.systemPrompt
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: this.maxTokens,
                    temperature: this.temperature
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 segundos
                }
            );

            const resposta = response.data.choices[0].message.content;
            console.log('✅ Resposta do ChatGPT recebida');
            
            return {
                success: true,
                resposta: resposta.trim(),
                tokens: response.data.usage?.total_tokens || 0,
                model: this.model
            };

        } catch (error) {
            console.error('❌ Erro ao comunicar com ChatGPT:', error.message);
            
            // Resposta de fallback
            return {
                success: false,
                resposta: 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes ou entre em contato com nosso atendimento.',
                error: error.message
            };
        }
    }

    /**
     * Processar mensagem completa
     */
    async processarMensagem(cpf, mensagem) {
        try {
            console.log(`📨 Processando mensagem de ${cpf}: ${mensagem}`);

            // 1. Buscar dados do cliente
            const clientData = await this.buscarDadosCliente(cpf);
            
            // 2. Preparar contexto
            const contexto = this.prepararContexto(cpf, mensagem, clientData);
            
            // 3. Gerar prompt
            const prompt = this.gerarPrompt(contexto);
            
            // 4. Enviar para ChatGPT
            const resultado = await this.enviarParaChatGPT(prompt);
            
            // 5. Adicionar metadados
            resultado.cpf = cpf;
            resultado.nomeCliente = contexto.cliente.nome;
            resultado.timestamp = new Date().toISOString();
            resultado.temPropostas = clientData?.propostas?.length > 0;

            console.log(`✅ Mensagem processada com sucesso para ${cpf}`);
            return resultado;

        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
            
            return {
                success: false,
                resposta: 'Desculpe, ocorreu um erro interno. Nossa equipe foi notificada.',
                cpf: cpf,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Verificar se a API está funcionando
     */
    async verificarAPI() {
        try {
            if (!this.openaiApiKey) {
                return { status: 'error', message: 'API Key não configurada' };
            }

            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                timeout: 10000
            });

            return { 
                status: 'ok', 
                message: 'API funcionando',
                models: response.data.data.length
            };

        } catch (error) {
            return { 
                status: 'error', 
                message: error.message 
            };
        }
    }
}

export default ChatGPTIntegration;
