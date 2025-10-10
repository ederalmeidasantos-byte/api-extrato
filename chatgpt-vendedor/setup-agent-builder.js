#!/usr/bin/env node

/**
 * Script de Configuração Agent Builder
 * Configura automaticamente o assistente na OpenAI
 */

import AgentBuilderIntegration from './agent-builder-integration.js';
import fs from 'fs-extra';
import path from 'path';

class AgentBuilderSetup {
    constructor() {
        this.agentIntegration = new AgentBuilderIntegration();
    }

    /**
     * Executa o setup completo do Agent Builder
     */
    async setup() {
        console.log('🚀 Iniciando configuração do Agent Builder...\n');

        try {
            // 1. Verificar se API key está configurada
            await this.checkApiKey();

            // 2. Listar assistentes existentes
            await this.listExistingAssistants();

            // 3. Criar ou atualizar assistente
            const assistant = await this.createOrUpdateAssistant();

            // 4. Atualizar arquivo .env
            await this.updateEnvFile(assistant.id);

            // 5. Testar configuração
            await this.testConfiguration(assistant.id);

            console.log('\n✅ Configuração do Agent Builder concluída com sucesso!');
            console.log('💡 Você pode agora usar o sistema com Agent Builder ativado.');

        } catch (error) {
            console.error('\n❌ Erro durante a configuração:', error.message);
            process.exit(1);
        }
    }

    /**
     * Verifica se a API key está configurada
     */
    async checkApiKey() {
        console.log('🔑 Verificando API Key...');
        
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY não encontrada. Configure no arquivo .env');
        }

        console.log('✅ API Key configurada');
    }

    /**
     * Lista assistentes existentes
     */
    async listExistingAssistants() {
        console.log('\n📋 Listando assistentes existentes...');
        
        try {
            const assistants = await this.agentIntegration.listAssistants();
            
            if (assistants.length === 0) {
                console.log('ℹ️ Nenhum assistente encontrado. Será criado um novo.');
            } else {
                console.log(`ℹ️ Encontrados ${assistants.length} assistente(s) existente(s).`);
            }
        } catch (error) {
            console.log('⚠️ Não foi possível listar assistentes existentes:', error.message);
        }
    }

    /**
     * Cria ou atualiza o assistente
     */
    async createOrUpdateAssistant() {
        console.log('\n📝 Configurando assistente...');

        // Verifica se já existe um assistente configurado
        if (process.env.OPENAI_ASSISTANT_ID) {
            console.log(`🔄 Atualizando assistente existente: ${process.env.OPENAI_ASSISTANT_ID}`);
            return await this.agentIntegration.updateAssistant(process.env.OPENAI_ASSISTANT_ID);
        } else {
            console.log('🆕 Criando novo assistente...');
            return await this.agentIntegration.createAssistant();
        }
    }

    /**
     * Atualiza o arquivo .env com o ID do assistente
     */
    async updateEnvFile(assistantId) {
        console.log('\n📝 Atualizando arquivo .env...');

        const envPath = path.join(process.cwd(), '.env');
        const envExamplePath = path.join(process.cwd(), 'config-example.env');

        try {
            let envContent = '';
            
            if (await fs.pathExists(envPath)) {
                envContent = await fs.readFile(envPath, 'utf8');
            } else if (await fs.pathExists(envExamplePath)) {
                envContent = await fs.readFile(envExamplePath, 'utf8');
            } else {
                throw new Error('Arquivo .env não encontrado. Copie config-example.env para .env');
            }

            // Atualiza ou adiciona OPENAI_ASSISTANT_ID
            if (envContent.includes('OPENAI_ASSISTANT_ID=')) {
                envContent = envContent.replace(
                    /OPENAI_ASSISTANT_ID=.*/,
                    `OPENAI_ASSISTANT_ID=${assistantId}`
                );
            } else {
                envContent += `\nOPENAI_ASSISTANT_ID=${assistantId}`;
            }

            await fs.writeFile(envPath, envContent);
            console.log(`✅ Arquivo .env atualizado com OPENAI_ASSISTANT_ID=${assistantId}`);

        } catch (error) {
            console.error('❌ Erro ao atualizar .env:', error.message);
            console.log(`💡 Adicione manualmente ao seu .env: OPENAI_ASSISTANT_ID=${assistantId}`);
        }
    }

    /**
     * Testa a configuração criada
     */
    async testConfiguration(assistantId) {
        console.log('\n🧪 Testando configuração...');

        try {
            // Cria uma thread de teste
            const thread = await this.agentIntegration.createThread();
            
            // Envia uma mensagem de teste
            const response = await this.agentIntegration.sendMessage(
                thread.id, 
                'Olá, gostaria de saber sobre portabilidade',
                {
                    nome: 'Cliente Teste',
                    cpf: '12345678901',
                    propostas: []
                }
            );

            if (response.success) {
                console.log('✅ Teste realizado com sucesso!');
                console.log(`📝 Resposta: ${response.resposta.substring(0, 100)}...`);
            } else {
                console.log('⚠️ Teste falhou:', response.error);
            }

        } catch (error) {
            console.log('⚠️ Erro durante o teste:', error.message);
        }
    }

    /**
     * Limpa assistentes antigos (opcional)
     */
    async cleanup() {
        console.log('\n🧹 Limpando assistentes antigos...');

        try {
            const assistants = await this.agentIntegration.listAssistants();
            
            for (const assistant of assistants) {
                if (assistant.name.includes('ChatGPT Vendedor')) {
                    console.log(`🗑️ Deletando assistente: ${assistant.name} (${assistant.id})`);
                    await this.agentIntegration.deleteAssistant(assistant.id);
                }
            }

            console.log('✅ Limpeza concluída');
        } catch (error) {
            console.error('❌ Erro durante limpeza:', error.message);
        }
    }
}

// Executa o setup se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new AgentBuilderSetup();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'setup':
            await setup.setup();
            break;
        case 'cleanup':
            await setup.cleanup();
            break;
        default:
            console.log('🤖 Agent Builder Setup - ChatGPT Vendedor');
            console.log('\nComandos disponíveis:');
            console.log('  node setup-agent-builder.js setup   - Configura o Agent Builder');
            console.log('  node setup-agent-builder.js cleanup - Remove assistentes antigos');
            break;
    }
}

export default AgentBuilderSetup;


