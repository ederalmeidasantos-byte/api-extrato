import axios from 'axios';

const RENDER_API_URL = "https://api-extrato-1.onrender.com";

async function testarRequisicaoPost() {
    console.log('🌐 Testando requisição POST na API do Render...');

    try {
        // Teste do endpoint /renew-token (POST)
        console.log('🔄 Testando POST /renew-token...');
        const response = await axios.post(`${RENDER_API_URL}/renew-token`, {}, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 segundos de timeout
        });
        
        console.log('✅ POST /renew-token OK!');
        console.log('Status:', response.status);
        console.log('Dados:', response.data);
        
        if (response.data.access_token) {
            console.log('🎉 Token recebido com sucesso!');
            console.log('Token:', response.data.access_token.substring(0, 20) + '...');
            console.log('Expira em:', response.data.expires_at);
        }
        
    } catch (error) {
        console.error('❌ Erro na requisição POST:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.code === 'ECONNABORTED') {
            console.error('⏰ Timeout - A API pode estar iniciando ainda');
        } else if (error.code === 'ENOTFOUND') {
            console.error('🌐 Erro de DNS - Verifique a URL da API');
        }
    }
}

// Teste adicional com GET para comparar
async function testarRequisicaoGet() {
    console.log('\n🔄 Testando GET /health para comparar...');
    
    try {
        const response = await axios.get(`${RENDER_API_URL}/health`, {
            timeout: 10000
        });
        
        console.log('✅ GET /health OK!');
        console.log('Status:', response.status);
        console.log('Dados:', response.data);
        
    } catch (error) {
        console.error('❌ Erro na requisição GET:', error.message);
    }
}

// Executar os testes
async function executarTestes() {
    await testarRequisicaoPost();
    await testarRequisicaoGet();
}

executarTestes();
