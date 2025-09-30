const axios = require('axios');

async function testarAPI() {
    console.log('🧪 Testando API de tokens...\n');
    
    try {
        // Teste 1: Health check
        console.log('1️⃣ Testando /health...');
        const health = await axios.get('http://localhost:3000/health');
        console.log('✅ Health:', health.data);
        
        // Teste 2: Status
        console.log('\n2️⃣ Testando /status...');
        const status = await axios.get('http://localhost:3000/status');
        console.log('✅ Status:', JSON.stringify(status.data, null, 2));
        
        // Teste 3: Credentials
        console.log('\n3️⃣ Testando /credentials...');
        const credentials = await axios.get('http://localhost:3000/credentials');
        console.log('✅ Credentials:', JSON.stringify(credentials.data, null, 2));
        
        // Teste 4: Token generation
        console.log('\n4️⃣ Testando geração de token...');
        const token = await axios.get('http://localhost:3000/token/crislunasdigital');
        console.log('✅ Token gerado:', {
            success: token.data.success,
            credencialId: token.data.credencialId,
            tokenLength: token.data.token?.length || 0,
            expires_in: token.data.expires_in
        });
        
        console.log('\n🎉 TODOS OS TESTES PASSARAM!');
        
    } catch (error) {
        console.error('❌ Erro nos testes:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testarAPI();
