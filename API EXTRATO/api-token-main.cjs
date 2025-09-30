const express = require('express');
const axios = require('axios');
const qs = require('querystring');
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

// Credenciais V8 (do .env)
const CREDENCIAIS_V8 = [
    {
        id: 'crislunasdigital',
        username: process.env.USERNAME_1 || 'crislunasdigital@gmail.com',
        password: process.env.PASSWORD_1 || '7.O?v>coI>5E',
        client_id: process.env.CLIENT_ID_1 || 'DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn'
    },
    {
        id: 'crislunasdigital2',
        username: process.env.USERNAME_2 || 'crislunasdigital2@gmail.com',
        password: process.env.PASSWORD_2 || '7.O?v>coI>5E',
        client_id: process.env.CLIENT_ID_2 || 'DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn'
    },
    {
        id: 'crislunasdigital3',
        username: process.env.USERNAME_3 || 'crislunasdigital3@gmail.com',
        password: process.env.PASSWORD_3 || '7.O?v>coI>5E',
        client_id: process.env.CLIENT_ID_3 || 'DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn'
    },
    {
        id: 'crislunasdigital4',
        username: process.env.USERNAME_4 || 'crislunasdigital4@gmail.com',
        password: process.env.PASSWORD_4 || '7.O?v>coI>5E',
        client_id: process.env.CLIENT_ID_4 || 'DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn'
    }
];

// Cache de tokens
let tokenCache = new Map();

// Função para gerar token
async function gerarToken(credencialId) {
    const credencial = CREDENCIAIS_V8.find(c => c.id === credencialId);
    if (!credencial) {
        throw new Error(`Credencial ${credencialId} não encontrada`);
    }

    try {
        const response = await axios.post('https://auth.v8sistema.com/oauth/token', 
            qs.stringify({
                grant_type: 'password',
                username: credencial.username,
                password: credencial.password,
                audience: 'https://bff.v8sistema.com',
                scope: 'offline_access',
                client_id: credencial.client_id
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const tokenData = response.data;
        tokenCache.set(credencialId, {
            token: tokenData.access_token,
            expires_at: Date.now() + (tokenData.expires_in * 1000),
            credencial: credencialId
        });

        return tokenData;
    } catch (error) {
        console.error(`Erro ao gerar token para ${credencialId}:`, error.response?.data || error.message);
        throw error;
    }
}

// Função para obter token válido
async function obterTokenValido(credencialId) {
    const cached = tokenCache.get(credencialId);
    
    if (cached && cached.expires_at > Date.now() + 60000) { // 1 minuto de margem
        return cached.token;
    }

    const tokenData = await gerarToken(credencialId);
    return tokenData.access_token;
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
            token: '/token/:credencialId',
            credentials: '/credentials'
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
            entries: Array.from(tokenCache.keys())
        },
        credentials: CREDENCIAIS_V8.map(c => ({
            id: c.id,
            username: c.username,
            hasPassword: !!c.password,
            hasClientId: !!c.client_id
        }))
    };
    res.json(status);
});

app.get('/credentials', (req, res) => {
    const credentials = CREDENCIAIS_V8.map(c => ({
        id: c.id,
        username: c.username,
        hasPassword: !!c.password,
        hasClientId: !!c.client_id
    }));
    res.json(credentials);
});

app.get('/token/:credencialId', async (req, res) => {
    try {
        const { credencialId } = req.params;
        const token = await obterTokenValido(credencialId);
        
        res.json({
            success: true,
            credencialId,
            token,
            expires_in: 3600,
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

app.post('/token/:credencialId', async (req, res) => {
    try {
        const { credencialId } = req.params;
        const { force_refresh } = req.body;
        
        if (force_refresh) {
            tokenCache.delete(credencialId);
        }
        
        const token = await obterTokenValido(credencialId);
        
        res.json({
            success: true,
            credencialId,
            token,
            expires_in: 3600,
            refreshed: !!force_refresh,
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
    console.log(`🔑 Token: http://localhost:${PORT}/token/crislunasdigital`);
});

module.exports = app;

