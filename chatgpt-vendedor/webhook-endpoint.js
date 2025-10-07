/**
 * Webhook Endpoint para ChatGPT Vendedor
 * Recebe mensagens do WhatsApp via Kentro
 */

import express from 'express';
import ChatGPTIntegration from './chatgpt-integration.js';

const router = express.Router();
const chatgpt = new ChatGPTIntegration();

/**
 * Middleware para log de requisições
 */
router.use((req, res, next) => {
    console.log(`📨 [WEBHOOK] ${req.method} ${req.path}`);
    console.log(`📨 [WEBHOOK] Headers:`, req.headers);
    console.log(`📨 [WEBHOOK] Body:`, req.body);
    next();
});

/**
 * Endpoint principal para receber mensagens
 */
router.post('/chatgpt-kentro', async (req, res) => {
    try {
        console.log('🤖 [CHATGPT] Nova mensagem recebida');
        
        // Validar dados de entrada
        const { cpf, message, clientNumber, chatId } = req.body;
        
        if (!cpf || !message) {
            return res.status(400).json({
                success: false,
                error: 'CPF e mensagem são obrigatórios',
                timestamp: new Date().toISOString()
            });
        }

        // Validar formato do CPF
        const cpfLimpo = cpf.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) {
            return res.status(400).json({
                success: false,
                error: 'CPF inválido',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`👤 [CHATGPT] Processando mensagem de ${cpf}: "${message}"`);

        // Processar mensagem com ChatGPT
        const resultado = await chatgpt.processarMensagem(cpfLimpo, message);

        // Log da resposta
        console.log(`✅ [CHATGPT] Resposta gerada:`, {
            cpf: resultado.cpf,
            nome: resultado.nomeCliente,
            sucesso: resultado.success,
            tokens: resultado.tokens || 0
        });

        // Retornar resposta para Kentro
        res.json({
            success: resultado.success,
            resposta: resultado.resposta,
            cpf: resultado.cpf,
            nomeCliente: resultado.nomeCliente,
            chatId: chatId,
            clientNumber: clientNumber,
            timestamp: resultado.timestamp,
            metadata: {
                temPropostas: resultado.temPropostas,
                model: resultado.model,
                tokens: resultado.tokens
            }
        });

    } catch (error) {
        console.error('❌ [CHATGPT] Erro no webhook:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: 'Nossa equipe foi notificada',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Endpoint para testar a integração
 */
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 [CHATGPT] Teste de integração solicitado');
        
        // Verificar API do ChatGPT
        const apiStatus = await chatgpt.verificarAPI();
        
        res.json({
            success: true,
            message: 'ChatGPT Vendedor funcionando',
            timestamp: new Date().toISOString(),
            api: apiStatus,
            version: '1.0.0'
        });

    } catch (error) {
        console.error('❌ [CHATGPT] Erro no teste:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Endpoint para testar com cliente específico
 */
router.post('/test-cliente', async (req, res) => {
    try {
        const { cpf, message } = req.body;
        
        if (!cpf || !message) {
            return res.status(400).json({
                success: false,
                error: 'CPF e mensagem são obrigatórios'
            });
        }

        console.log(`🧪 [CHATGPT] Teste com cliente ${cpf}`);
        
        const resultado = await chatgpt.processarMensagem(cpf, message);
        
        res.json(resultado);

    } catch (error) {
        console.error('❌ [CHATGPT] Erro no teste do cliente:', error);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Endpoint para status do sistema
 */
router.get('/status', async (req, res) => {
    try {
        const apiStatus = await chatgpt.verificarAPI();
        
        res.json({
            status: 'online',
            timestamp: new Date().toISOString(),
            chatgpt: apiStatus,
            version: '1.0.0'
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
