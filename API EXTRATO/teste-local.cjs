const express = require('express');
const axios = require('axios');
const qs = require('qs');

const app = express();
app.use(express.json());

const PORT = 3002;

// Configurações V8 (fixas no servidor)
const V8_CONFIG = {
    client_id: 'DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn',
    audience: 'https://bff.v8sistema.com',
    scope: 'offline_access',
    auth_url: 'https://auth.v8sistema.com/oauth/token'
};

// Cache de tokens por usuário
let tokenCache = new Map();

// Função para gerar token com credenciais do usuário
async function gerarToken(username, password) {
    try {
        console.log(`🔐 Gerando token para: ${username}`);
        
        const response = await axios.post(V8_CONFIG.auth_url, 
            qs.stringify({
                grant_type: 'password',
                username: username,
                password: password,
                audience: V8_CONFIG.audience,
                scope: V8_CONFIG.scope,
                client_id: V8_CONFIG.client_id
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const tokenData = response.data;
        const userKey = `${username}`;
        
        tokenCache.set(userKey, {
            token: tokenData.access_token,
            expires_at: Date.now() + (tokenData.expires_in * 1000),
            username: username
        });

        console.log(`✅ Token gerado com sucesso para: ${username}`);
        return tokenData;
    } catch (error) {
        console.error(`❌ Erro ao gerar token para ${username}:`, error.response?.data || error.message);
        throw error;
    }
}

// Rota principal: POST /authenticate - Recebe credenciais do usuário
app.post('/authenticate', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username e password são obrigatórios',
                timestamp: new Date().toISOString()
            });
        }
        
        // Gera token com as credenciais do usuário
        const tokenData = await gerarToken(username, password);
        
        res.json({
            success: true,
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type || 'Bearer',
            username: username,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Erro na autenticação:', error.message);
        
        let errorMessage = 'Erro interno do servidor';
        let statusCode = 500;
        
        if (error.response) {
            statusCode = error.response.status;
            if (statusCode === 401) {
                errorMessage = 'Credenciais inválidas';
            } else if (statusCode === 429) {
                errorMessage = 'Muitas tentativas. Tente novamente em alguns minutos';
            } else {
                errorMessage = error.response.data?.error_description || error.response.data?.error || 'Erro na autenticação';
            }
        }
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 API de teste rodando na porta ${PORT}`);
    console.log(`🔐 Teste: POST http://localhost:${PORT}/authenticate`);
});

// Teste automático
setTimeout(async () => {
    try {
        console.log('🧪 Testando API local...');
        const response = await axios.post(`http://localhost:${PORT}/authenticate`, {
            username: 'crislunasdigital@gmail.com',
            password: '7.O?v>coI>5E'
        });
        
        console.log('✅ Teste local OK!');
        console.log('Token:', response.data.access_token ? 'Recebido' : 'Não recebido');
        console.log('Username:', response.data.username);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no teste local:', error.message);
        process.exit(1);
    }
}, 2000);
