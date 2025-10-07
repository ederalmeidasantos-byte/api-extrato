/**
 * Debug da Resposta da API
 * Verifica exatamente o que está sendo retornado
 */

const AtenderBemClient = require('./atenderbem-client');

async function debugAPIResponse() {
  console.log('🔍 Debug da Resposta da API');
  console.log('============================\n');
  
  try {
    const client = new AtenderBemClient('development');
    
    // 1. Testar getOpportunities
    console.log('1. Testando /int/getOpportunities...');
    
    try {
      const response = await client.client.get('/int/getOpportunities', {
        params: {
          queueId: 2,
          apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376'
        },
        timeout: 10000
      });
      
      console.log('✅ Resposta recebida:');
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Headers: ${JSON.stringify(response.headers)}`);
      console.log(`   - Tipo de dados: ${typeof response.data}`);
      console.log(`   - Tamanho: ${JSON.stringify(response.data).length} caracteres`);
      
      // Verificar se é string
      if (typeof response.data === 'string') {
        console.log('   - Primeiros 200 caracteres:');
        console.log(`     ${response.data.substring(0, 200)}...`);
        
        // Verificar se é HTML
        if (response.data.includes('<!doctype html>')) {
          console.log('   ❌ Resposta é HTML (página web)');
        } else if (response.data.includes('{') || response.data.includes('[')) {
          console.log('   ✅ Resposta parece ser JSON');
          try {
            const parsed = JSON.parse(response.data);
            console.log(`   - JSON válido: ${typeof parsed}`);
            if (Array.isArray(parsed)) {
              console.log(`   - Array com ${parsed.length} itens`);
            } else if (parsed && typeof parsed === 'object') {
              console.log(`   - Objeto com chaves: ${Object.keys(parsed).join(', ')}`);
            }
          } catch (e) {
            console.log('   ❌ Não é JSON válido');
          }
        } else {
          console.log('   ❓ Formato desconhecido');
        }
      } else {
        console.log('   - Dados:');
        console.log(`     ${JSON.stringify(response.data, null, 2)}`);
      }
      
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
      if (error.response) {
        console.log(`   - Status: ${error.response.status}`);
        console.log(`   - Dados: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    console.log('\n');
    
    // 2. Testar getPipeOpportunities
    console.log('2. Testando /int/getPipeOpportunities...');
    
    try {
      const response = await client.client.get('/int/getPipeOpportunities', {
        params: {
          queueId: 2,
          apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376'
        },
        timeout: 10000
      });
      
      console.log('✅ Resposta recebida:');
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Tipo de dados: ${typeof response.data}`);
      console.log(`   - Tamanho: ${JSON.stringify(response.data).length} caracteres`);
      
      if (typeof response.data === 'string') {
        console.log('   - Primeiros 200 caracteres:');
        console.log(`     ${response.data.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
    
    console.log('\n');
    
    // 3. Testar com diferentes parâmetros
    console.log('3. Testando com diferentes parâmetros...');
    
    const parametrosTeste = [
      { queueId: 2, apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376' },
      { queueId: 2, apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376', limit: 10 },
      { queueId: 2, apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376', offset: 0 },
      { queueId: 2, apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376', stageId: 8 }
    ];
    
    for (let i = 0; i < parametrosTeste.length; i++) {
      const params = parametrosTeste[i];
      console.log(`   Teste ${i + 1}: ${JSON.stringify(params)}`);
      
      try {
        const response = await client.client.get('/int/getOpportunities', {
          params,
          timeout: 5000
        });
        
        console.log(`     ✅ Status: ${response.status} | Tipo: ${typeof response.data}`);
        
        if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
          console.log(`     ❌ HTML retornado`);
        } else if (typeof response.data === 'string' && response.data.includes('{')) {
          console.log(`     ✅ String JSON`);
        } else if (Array.isArray(response.data)) {
          console.log(`     ✅ Array com ${response.data.length} itens`);
        } else {
          console.log(`     ❓ Tipo: ${typeof response.data}`);
        }
        
      } catch (error) {
        console.log(`     ❌ Erro: ${error.message}`);
      }
    }
    
    console.log('\n✅ Debug concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// ========================================
// EXECUTAR DEBUG
// ========================================

if (require.main === module) {
  debugAPIResponse().catch(console.error);
}

module.exports = { debugAPIResponse };



