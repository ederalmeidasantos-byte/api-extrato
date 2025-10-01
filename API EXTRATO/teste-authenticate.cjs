const axios = require('axios');

const RENDER_API_URL = "https://api-extrato-1.onrender.com";

async function testarAuthenticate() {
    console.log('🌐 Testando endpoint /authenticate...');

    const testUsername = "crislunasdigital@gmail.com";
    const testPassword = "7.O?v>coI>5E";

    try {
        // Teste POST /authenticate
        console.log('🔐 Testando POST /authenticate...');
        const authResponse = await axios.post(`${RENDER_API_URL}/authenticate`, {
            username: testUsername,
            password: testPassword
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        
        console.log('✅ POST /authenticate OK!');
        console.log('Status:', authResponse.status);
        console.log('Token recebido:', authResponse.data.access_token ? 'Sim' : 'Não');
        console.log('Expira em:', authResponse.data.expires_in);
        console.log('Username:', authResponse.data.username);
        
    } catch (error) {
        console.error('❌ Erro no teste /authenticate:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testarAuthenticate();
