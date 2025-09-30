const axios = require('axios');

const RENDER_API_URL = "https://api-extrato-1.onrender.com";

async function testarNovoFluxo() {
    console.log('🌐 Testando novo fluxo da API...');

    try {
        // 1. Teste GET /health
        console.log('1️⃣ Testando GET /health...');
        const healthResponse = await axios.get(`${RENDER_API_URL}/health`);
        console.log('✅ /health OK:', healthResponse.data);

        // 2. Teste POST /authenticate com credenciais do usuário
        console.log('2️⃣ Testando POST /authenticate...');
        const authResponse = await axios.post(`${RENDER_API_URL}/authenticate`, {
            username: 'crislunasdigital@gmail.com',
            password: '7.O?v>coI>5E'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ /authenticate OK!');
        console.log('Token recebido:', authResponse.data.access_token ? 'Sim' : 'Não');
        console.log('Username:', authResponse.data.username);
        console.log('Expires in:', authResponse.data.expires_in, 'segundos');

        // 3. Teste GET /token/:username para obter token do cache
        console.log('3️⃣ Testando GET /token/:username...');
        const tokenResponse = await axios.get(`${RENDER_API_URL}/token/crislunasdigital@gmail.com`);
        console.log('✅ /token/:username OK!');
        console.log('Token do cache:', tokenResponse.data.access_token ? 'Sim' : 'Não');

        // 4. Teste de credenciais inválidas
        console.log('4️⃣ Testando credenciais inválidas...');
        try {
            await axios.post(`${RENDER_API_URL}/authenticate`, {
                username: 'usuario@invalido.com',
                password: 'senhaerrada'
            });
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Credenciais inválidas tratadas corretamente');
            } else {
                console.log('❌ Erro inesperado:', error.message);
            }
        }

        console.log('🎉 Todos os testes do novo fluxo passaram!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testarNovoFluxo();
