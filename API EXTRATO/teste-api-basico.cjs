const axios = require('axios');

const RENDER_API_URL = "https://api-extrato-1.onrender.com";

async function testarAPIBasica() {
    console.log('🌐 Testando API básica...');
    
    try {
        // Teste 1: GET /
        console.log('1️⃣ Testando GET /...');
        const rootResponse = await axios.get(`${RENDER_API_URL}/`, {
            timeout: 10000
        });
        console.log('✅ GET / OK:', rootResponse.data);
        
    } catch (error) {
        console.error('❌ Erro no teste básico:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testarAPIBasica();
