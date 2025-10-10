/**
 * Integração Agent Builder - ChatGPT Vendedor
 * Sistema inteligente de atendimento via WhatsApp usando OpenAI Assistants API
 */

import OpenAI from 'openai';
import agentBuilderConfig from './agent-builder-config.js';
import fs from 'fs-extra';
import path from 'path';

class AgentBuilderIntegration {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.assistantId = process.env.OPENAI_ASSISTANT_ID;
        this.agentConfig = agentBuilderConfig;
        
        console.log('🤖 Agent Builder Integration inicializado');
    }

    /**
     * Cria um novo assistente usando Agent Builder
     */
    async createAssistant() {
        try {
            console.log('📝 Criando assistente no Agent Builder...');
            
            const assistant = await this.openai.beta.assistants.create({
                name: this.agentConfig.agent.name,
                description: this.agentConfig.agent.description,
                instructions: this.agentConfig.agent.instructions,
                model: this.agentConfig.agent.model,
                tools: this.agentConfig.tools,
                temperature: this.agentConfig.agent.temperature,
                max_tokens: this.agentConfig.agent.maxTokens
            });

            console.log(`✅ Assistente criado com ID: ${assistant.id}`);
            console.log('💡 Adicione este ID ao seu arquivo .env:');
            console.log(`OPENAI_ASSISTANT_ID=${assistant.id}`);
            
            return assistant;
        } catch (error) {
            console.error('❌ Erro ao criar assistente:', error.message);
            throw error;
        }
    }

    /**
     * Atualiza um assistente existente
     */
    async updateAssistant(assistantId) {
        try {
            console.log(`📝 Atualizando assistente ${assistantId}...`);
            
            const assistant = await this.openai.beta.assistants.update(assistantId, {
                name: this.agentConfig.agent.name,
                description: this.agentConfig.agent.description,
                instructions: this.agentConfig.agent.instructions,
                model: this.agentConfig.agent.model,
                tools: this.agentConfig.tools,
                temperature: this.agentConfig.agent.temperature,
                max_tokens: this.agentConfig.agent.maxTokens
            });

            console.log(`✅ Assistente atualizado: ${assistant.id}`);
            return assistant;
        } catch (error) {
            console.error('❌ Erro ao atualizar assistente:', error.message);
            throw error;
        }
    }

    /**
     * Cria uma thread de conversa
     */
    async createThread() {
        try {
            const thread = await this.openai.beta.threads.create();
            console.log(`🧵 Thread criada: ${thread.id}`);
            return thread;
        } catch (error) {
            console.error('❌ Erro ao criar thread:', error.message);
            throw error;
        }
    }

    /**
     * Envia mensagem para o assistente
     */
    async sendMessage(threadId, message, clientData = null) {
        try {
            // Adiciona contexto do cliente se disponível
            let contextualMessage = message;
            if (clientData) {
                contextualMessage = `Cliente: ${clientData.nome || 'N/A'}
CPF: ${clientData.cpf || 'N/A'}
Propostas ativas: ${clientData.propostas?.length || 0}

Mensagem: ${message}`;
            }

            // Adiciona mensagem à thread
            await this.openai.beta.threads.messages.create(threadId, {
                role: 'user',
                content: contextualMessage
            });

            // Executa o assistente
            const run = await this.openai.beta.threads.runs.create(threadId, {
                assistant_id: this.assistantId
            });

            // Aguarda a conclusão
            let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
            
            while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
            }

            if (runStatus.status === 'completed') {
                // Recupera as mensagens da thread
                const messages = await this.openai.beta.threads.messages.list(threadId);
                const assistantMessage = messages.data[0];
                
                return {
                    success: true,
                    resposta: assistantMessage.content[0].text.value,
                    threadId: threadId,
                    runId: run.id,
                    metadata: {
                        model: this.agentConfig.agent.model,
                        tokens: runStatus.usage?.total_tokens || 0
                    }
                };
            } else {
                throw new Error(`Run falhou com status: ${runStatus.status}`);
            }
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error.message);
            return {
                success: false,
                error: error.message,
                resposta: this.agentConfig.response?.fallbackMessage || 'Desculpe, ocorreu um erro. Tente novamente.'
            };
        }
    }

    /**
     * Busca dados do cliente (função para o assistente)
     */
    async buscarDadosCliente(cpf) {
        try {
            const clientDataPath = path.join(process.cwd(), 'var', 'data', 'clientes', `${cpf}.json`);
            
            if (await fs.pathExists(clientDataPath)) {
                const clientData = await fs.readJson(clientDataPath);
                return {
                    success: true,
                    data: clientData
                };
            } else {
                return {
                    success: false,
                    error: 'Cliente não encontrado'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verifica propostas ativas do cliente
     */
    async verificarPropostas(cpf) {
        try {
            const clientData = await this.buscarDadosCliente(cpf);
            
            if (clientData.success && clientData.data.propostas) {
                const propostasAtivas = clientData.data.propostas.filter(p => p.status === 'ativa');
                return {
                    success: true,
                    propostas: propostasAtivas,
                    total: propostasAtivas.length
                };
            } else {
                return {
                    success: false,
                    propostas: [],
                    total: 0
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                propostas: [],
                total: 0
            };
        }
    }

    /**
     * Simula valores para portabilidade
     */
    async simularPortabilidade(valorAtual, parcelasRestantes) {
        try {
            const taxaMinima = this.agentConfig.produtos.portabilidade.taxaMinima;
            const valorMinimo = this.agentConfig.produtos.portabilidade.valorMinimo;
            
            // Cálculo simplificado (em produção, usar API do banco)
            const trocoEstimado = valorAtual * 0.3; // 30% do valor atual
            const novaParcela = (valorAtual + trocoEstimado) / parcelasRestantes;
            
            return {
                success: true,
                simulacao: {
                    valorAtual: valorAtual,
                    trocoEstimado: trocoEstimado,
                    novaParcela: novaParcela,
                    taxaMinima: taxaMinima,
                    parcelasRestantes: parcelasRestantes
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Simula valores para saque FGTS
     */
    async simularFgts(saldoFgts) {
        try {
            const taxaMinima = this.agentConfig.produtos.fgts.taxaMinima;
            const valorMinimo = this.agentConfig.produtos.fgts.valorMinimo;
            
            // Cálculo simplificado (em produção, usar API do banco)
            const valorDisponivel = saldoFgts * 0.8; // 80% do saldo
            const parcelaEstimada = valorDisponivel / 24; // 24 parcelas
            
            return {
                success: true,
                simulacao: {
                    saldoFgts: saldoFgts,
                    valorDisponivel: valorDisponivel,
                    parcelaEstimada: parcelaEstimada,
                    taxaMinima: taxaMinima,
                    parcelas: 24
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Lista assistentes existentes
     */
    async listAssistants() {
        try {
            const assistants = await this.openai.beta.assistants.list();
            console.log('📋 Assistentes encontrados:');
            
            assistants.data.forEach(assistant => {
                console.log(`- ${assistant.name} (ID: ${assistant.id})`);
            });
            
            return assistants.data;
        } catch (error) {
            console.error('❌ Erro ao listar assistentes:', error.message);
            throw error;
        }
    }

    /**
     * Deleta um assistente
     */
    async deleteAssistant(assistantId) {
        try {
            await this.openai.beta.assistants.del(assistantId);
            console.log(`🗑️ Assistente ${assistantId} deletado`);
        } catch (error) {
            console.error('❌ Erro ao deletar assistente:', error.message);
            throw error;
        }
    }
}

export default AgentBuilderIntegration;


