const axios = require('axios');

async function testarRender() {
    console.log('🌐 Testando API no Render...\n');
    
    const baseURL = 'https://api-extrato-1.onrender.com';
    
    try {
        // Teste 1: Health check
        console.log('1️⃣ Testando /health no Render...');
        const health = await axios.get(`${baseURL}/health`, { timeout: 10000 });
        console.log('✅ Health Render:', health.data);
        
        // Teste 2: Status
        console.log('\n2️⃣ Testando /status no Render...');
        const status = await axios.get(`${baseURL}/status`, { timeout: 10000 });
        console.log('✅ Status Render:', JSON.stringify(status.data, null, 2));
        
        // Teste 3: Credentials
        console.log('\n3️⃣ Testando /credentials no Render...');
        const credentials = await axios.get(`${baseURL}/credentials`, { timeout: 10000 });
        console.log('✅ Credentials Render:', JSON.stringify(credentials.data, null, 2));
        
        // Teste 4: Token generation
        console.log('\n4️⃣ Testando geração de token no Render...');
        const token = await axios.get(`${baseURL}/token/crislunasdigital`, { timeout: 15000 });
        console.log('✅ Token gerado no Render:', {
            success: token.data.success,
            credencialId: token.data.credencialId,
            tokenLength: token.data.token?.length || 0,
            expires_in: token.data.expires_in
        });
        
        console.log('\n🎉 RENDER FUNCIONANDO PERFEITAMENTE!');
        
    } catch (error) {
        console.error('❌ Erro nos testes do Render:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('❌ Render não está respondendo - pode estar dormindo');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('❌ Timeout - Render pode estar iniciando');
        }
    }
}

testarRender();
