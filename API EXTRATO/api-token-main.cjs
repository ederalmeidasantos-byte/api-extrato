const express = require('express');
const axios = require('axios');
const qs = require('qs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Configurações V8 (fixas no servidor)
const V8_CONFIG = {
    client_id: process.env.V8_CLIENT_ID || 'DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn',
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

// Função para obter token válido do cache
function obterTokenValido(username) {
    const userKey = `${username}`;
    const cached = tokenCache.get(userKey);
    
    if (cached && cached.expires_at > Date.now() + 60000) { // 1 minuto de margem
        return cached.token;
    }
    
    return null; // Token não existe ou expirou
}

// Rotas
app.get('/', (req, res) => {
    res.json({
        service: 'FGTS Token API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            health: '/health',
            status: '/status',
            authenticate: '/authenticate',
            token: '/token/:username'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/status', (req, res) => {
    const status = {
        service: 'FGTS Token API',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cache: {
            size: tokenCache.size,
            users: Array.from(tokenCache.keys())
        },
        v8_config: {
            client_id: V8_CONFIG.client_id,
            audience: V8_CONFIG.audience,
            scope: V8_CONFIG.scope
        }
    };
    res.json(status);
});

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

// Rota para obter token do cache: GET /token/:username
app.get('/token/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const token = obterTokenValido(username);
        
        if (!token) {
            return res.status(404).json({
                success: false,
                error: 'Token não encontrado ou expirado. Faça login novamente.',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            access_token: token,
            username: username,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 FGTS Token API rodando na porta ${PORT}`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    console.log(`🔐 Autenticar: POST http://localhost:${PORT}/authenticate`);
    console.log(`🔑 Token: GET http://localhost:${PORT}/token/:username`);
    console.log(`💡 Exemplo: POST /authenticate { "username": "user@email.com", "password": "senha123" }`);
});

module.exports = app;

