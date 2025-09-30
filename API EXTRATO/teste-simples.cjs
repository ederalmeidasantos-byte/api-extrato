const axios = require('axios');

const RENDER_API_URL = "https://api-extrato-1.onrender.com";

async function testarAPI() {
    console.log('🌐 Testando API simplificada...');

    try {
        // Teste GET /health
        console.log('1️⃣ Testando GET /health...');
        const healthResponse = await axios.get(`${RENDER_API_URL}/health`);
        console.log('✅ /health OK:', healthResponse.data);

        // Teste GET /token
        console.log('2️⃣ Testando GET /token...');
        const tokenResponse = await axios.get(`${RENDER_API_URL}/token`);
        console.log('✅ /token OK:', tokenResponse.data);

        // Teste POST /renew-token
        console.log('3️⃣ Testando POST /renew-token...');
        const renewResponse = await axios.post(`${RENDER_API_URL}/renew-token`);
        console.log('✅ /renew-token OK:', renewResponse.data);

        console.log('🎉 Todos os testes passaram!');
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testarAPI();
