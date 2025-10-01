const axios = require('axios');

const RENDER_API_URL = "https://api-extrato-1.onrender.com";

async function testarAPI() {
    console.log('🌐 Testando API do Render...');

    try {
        // Teste GET /
        console.log('1️⃣ Testando GET /...');
        const response = await axios.get(`${RENDER_API_URL}/`);
        console.log('✅ GET / OK:', response.data);

        // Teste POST /authenticate
        console.log('2️⃣ Testando POST /authenticate...');
        const authResponse = await axios.post(`${RENDER_API_URL}/authenticate`, {
            username: 'crislunasdigital@gmail.com',
            password: '7.O?v>coI>5E'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ POST /authenticate OK!');
        console.log('Token recebido:', authResponse.data.access_token ? 'Sim' : 'Não');
        console.log('Username:', authResponse.data.username);

        console.log('🎉 API funcionando perfeitamente!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testarAPI();
