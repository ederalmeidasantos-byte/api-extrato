const express = require('express');
const axios = require('axios');
const qs = require('qs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Estado da API
let currentToken = null;
let currentCredential = null;
let tokenExpiry = null;
let isGenerating = false;

// Credenciais do Environment Variables do Render
const CREDENTIALS = [
  {
    username: process.env.FGTS_USER_4 || 'crislunasdigital@gmail.com',
    password: process.env.FGTS_PASS_4 || '7.O?v>coI>5E',
    name: 'Cris'
  },
  {
    username: process.env.FGTS_USER_3 || 'srcor1@hotmail.com',
    password: process.env.FGTS_PASS_3 || 'ty#lN6z1',
    name: 'Sérgio'
  },
  {
    username: process.env.FGTS_USER_2 || 'leemarsiglia@gmail.com',
    password: process.env.FGTS_PASS_2 || 'H^UnXygvOv)6',
    name: 'Lee'
  }
];

// Função para gerar token
async function generateToken(credentialIndex = 0) {
  if (isGenerating) {
    console.log('⏳ Token já está sendo gerado...');
    return null;
  }

  isGenerating = true;
  const credential = CREDENTIALS[credentialIndex];
  
  console.log(`🔐 Gerando token com: ${credential.name} (${credential.username})`);
  
  try {
    const dadosAuth = {
      grant_type: "password",
      username: credential.username,
      password: credential.password,
      audience: "https://bff.v8sistema.com",
      scope: "offline_access",
      client_id: "DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn"
    };

    const data = qs.stringify(dadosAuth);
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded"
    };

    const res = await axios.post("https://auth.v8sistema.com/oauth/token", data, {
      headers,
      timeout: 30000
    });

    currentToken = res.data.access_token;
    currentCredential = credential;
    tokenExpiry = Date.now() + (res.data.expires_in * 1000);
    
    console.log(`✅ Token gerado com sucesso! ${credential.name}`);
    console.log(`⏰ Expira em: ${new Date(tokenExpiry).toLocaleString()}`);
    
    return currentToken;
    
  } catch (error) {
    console.log(`❌ Erro ao gerar token com ${credential.name}:`);
    console.log(`📊 Status: ${error.response ? error.response.status : 'undefined'}`);
    console.log(`📋 Erro: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    
    // Tentar próxima credencial
    if (credentialIndex < CREDENTIALS.length - 1) {
      console.log(`🔄 Tentando próxima credencial...`);
      return await generateToken(credentialIndex + 1);
    }
    
    return null;
  } finally {
    isGenerating = false;
  }
}

// Função para verificar se token está válido
function isTokenValid() {
  if (!currentToken || !tokenExpiry) return false;
  return Date.now() < tokenExpiry - 60000; // 1 minuto de margem
}

// Função para obter token válido
async function getValidToken() {
  if (isTokenValid()) {
    return currentToken;
  }
  
  console.log('🔄 Token expirado ou inválido, gerando novo...');
  return await generateToken();
}

// Endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'FGTS Token API - Funcionando!',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      'GET /token': 'Obter token atual',
      'POST /token/refresh': 'Renovar token',
      'POST /token/switch-credential': 'Trocar credencial',
      'POST /token/test': 'Testar token atual',
      'GET /status': 'Status detalhado',
      'GET /health': 'Health check'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/token', async (req, res) => {
  try {
    const token = await getValidToken();
    
    if (!token) {
      return res.status(500).json({
        error: 'Falha ao gerar token',
        message: 'Todas as credenciais falharam'
      });
    }
    
    res.json({
      token: token,
      credential: currentCredential.name,
      expires_at: new Date(tokenExpiry).toISOString(),
      expires_in: Math.floor((tokenExpiry - Date.now()) / 1000)
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
});

app.post('/token/refresh', async (req, res) => {
  try {
    const token = await generateToken();
    
    if (!token) {
      return res.status(500).json({
        error: 'Falha ao renovar token',
        message: 'Todas as credenciais falharam'
      });
    }
    
    res.json({
      token: token,
      credential: currentCredential.name,
      expires_at: new Date(tokenExpiry).toISOString(),
      expires_in: Math.floor((tokenExpiry - Date.now()) / 1000)
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
});

app.post('/token/switch-credential', async (req, res) => {
  try {
    const { credentialIndex } = req.body;
    
    if (credentialIndex < 0 || credentialIndex >= CREDENTIALS.length) {
      return res.status(400).json({
        error: 'Índice inválido',
        message: `Use um índice entre 0 e ${CREDENTIALS.length - 1}`
      });
    }
    
    const token = await generateToken(credentialIndex);
    
    if (!token) {
      return res.status(500).json({
        error: 'Falha ao trocar credencial',
        message: 'Credencial selecionada falhou'
      });
    }
    
    res.json({
      token: token,
      credential: currentCredential.name,
      expires_at: new Date(tokenExpiry).toISOString(),
      expires_in: Math.floor((tokenExpiry - Date.now()) / 1000)
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
});

app.post('/token/test', async (req, res) => {
  try {
    const token = await getValidToken();
    
    if (!token) {
      return res.status(500).json({
        error: 'Falha ao obter token',
        message: 'Todas as credenciais falharam'
      });
    }
    
    // Testar o token fazendo uma consulta
    try {
      const testRes = await axios.get('https://bff.v8sistema.com/fgts/balance?search=00000000000', {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      });
      
      res.json({
        token: token,
        credential: currentCredential.name,
        test_status: 'success',
        test_response: testRes.status,
        expires_at: new Date(tokenExpiry).toISOString(),
        expires_in: Math.floor((tokenExpiry - Date.now()) / 1000)
      });
      
    } catch (testError) {
      res.json({
        token: token,
        credential: currentCredential.name,
        test_status: 'warning',
        test_error: testError.response?.status || testError.message,
        expires_at: new Date(tokenExpiry).toISOString(),
        expires_in: Math.floor((tokenExpiry - Date.now()) / 1000)
      });
    }
    
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
});

app.get('/status', (req, res) => {
  res.json({
    current_token: currentToken ? `${currentToken.substring(0, 20)}...` : null,
    current_credential: currentCredential?.name || null,
    token_valid: isTokenValid(),
    expires_at: tokenExpiry ? new Date(tokenExpiry).toISOString() : null,
    expires_in: tokenExpiry ? Math.floor((tokenExpiry - Date.now()) / 1000) : null,
    is_generating: isGenerating,
    available_credentials: CREDENTIALS.map((cred, index) => ({
      index: index,
      name: cred.name,
      username: cred.username,
      is_current: cred.name === currentCredential?.name
    })),
    environment: {
      node_env: process.env.NODE_ENV,
      port: PORT,
      has_credentials: CREDENTIALS.every(cred => cred.username && cred.password)
    }
  });
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 FGTS Token API rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log(`🔑 Token: http://localhost:${PORT}/token`);
  console.log(`✅ Health: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🔐 Credenciais configuradas:');
  CREDENTIALS.forEach((cred, index) => {
    console.log(`  ${index + 1}. ${cred.name} (${cred.username})`);
  });
  console.log('');
  console.log('🎯 Gerando token inicial...');
  
  // Gerar token inicial
  generateToken().then(token => {
    if (token) {
      console.log('✅ Token inicial gerado com sucesso!');
    } else {
      console.log('❌ Falha ao gerar token inicial');
    }
  });
});