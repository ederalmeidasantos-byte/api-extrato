/**
 * Verificar Resposta Completa da API
 * Analisa exatamente o que está sendo retornado
 */

const AtenderBemClient = require('./atenderbem-client');

async function verificarRespostaCompleta() {
  console.log('🔍 Verificando Resposta Completa da API');
  console.log('=======================================\n');
  
  try {
    const client = new AtenderBemClient('development');
    
    // 1. Testar getOpportunities com análise completa
    console.log('1. Testando /int/getOpportunities...');
    
    const response = await client.client.get('/int/getOpportunities', {
      params: {
        queueId: 2,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376'
      },
      timeout: 10000
    });
    
    console.log('✅ Resposta recebida:');
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Status Text: ${response.statusText}`);
    console.log(`   - Headers:`);
    Object.entries(response.headers).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    
    console.log(`\n   - Tipo de dados: ${typeof response.data}`);
    console.log(`   - Tamanho: ${JSON.stringify(response.data).length} caracteres`);
    
    // Mostrar primeiros 500 caracteres
    console.log('\n   - Primeiros 500 caracteres:');
    console.log(`     ${response.data.substring(0, 500)}...`);
    
    // Verificar se é HTML
    if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
      console.log('\n   ❌ CONFIRMADO: Resposta é HTML (página web)');
      
      // Procurar por elementos específicos do HTML
      if (response.data.includes('login')) {
        console.log('   🔐 Página de login detectada');
      }
      if (response.data.includes('error')) {
        console.log('   ❌ Página de erro detectada');
      }
      if (response.data.includes('dashboard')) {
        console.log('   📊 Dashboard detectado');
      }
      if (response.data.includes('opportunities')) {
        console.log('   🎯 Página de oportunidades detectada');
      }
      
      // Procurar por dados JSON dentro do HTML
      const jsonMatch = response.data.match(/\{.*\}/);
      if (jsonMatch) {
        console.log('\n   🔍 JSON encontrado dentro do HTML:');
        console.log(`     ${jsonMatch[0].substring(0, 200)}...`);
      }
      
    } else if (typeof response.data === 'string' && response.data.includes('{')) {
      console.log('\n   ✅ String JSON detectada');
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
      console.log('\n   ❓ Formato desconhecido');
    }
    
    console.log('\n');
    
    // 2. Testar getPipeOpportunities
    console.log('2. Testando /int/getPipeOpportunities...');
    
    const response2 = await client.client.get('/int/getPipeOpportunities', {
      params: {
        queueId: 2,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376'
      },
      timeout: 10000
    });
    
    console.log('✅ Resposta recebida:');
    console.log(`   - Status: ${response2.status}`);
    console.log(`   - Tipo: ${typeof response2.data}`);
    console.log(`   - Tamanho: ${JSON.stringify(response2.data).length} caracteres`);
    
    if (typeof response2.data === 'string') {
      console.log('   - Primeiros 200 caracteres:');
      console.log(`     ${response2.data.substring(0, 200)}...`);
    }
    
    console.log('\n');
    
    // 3. Verificar se é o mesmo HTML
    if (response.data === response2.data) {
      console.log('3. ✅ Ambas as respostas são idênticas (mesmo HTML)');
    } else {
      console.log('3. ❌ Respostas diferentes');
    }
    
    // 4. Tentar extrair dados do HTML
    console.log('\n4. Tentando extrair dados do HTML...');
    
    if (typeof response.data === 'string') {
      // Procurar por scripts que podem conter dados
      const scriptMatches = response.data.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (scriptMatches) {
        console.log(`   - ${scriptMatches.length} scripts encontrados`);
        
        scriptMatches.forEach((script, index) => {
          if (script.includes('opportunities') || script.includes('data') || script.includes('json')) {
            console.log(`   - Script ${index + 1} pode conter dados:`);
            console.log(`     ${script.substring(0, 300)}...`);
          }
        });
      }
      
      // Procurar por dados em atributos data-*
      const dataMatches = response.data.match(/data-[^=]*="[^"]*"/gi);
      if (dataMatches) {
        console.log(`   - ${dataMatches.length} atributos data-* encontrados`);
        dataMatches.slice(0, 5).forEach((attr, index) => {
          console.log(`     ${index + 1}. ${attr}`);
        });
      }
    }
    
    console.log('\n✅ Análise concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.log(`   - Status: ${error.response.status}`);
      console.log(`   - Dados: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// ========================================
// EXECUTAR VERIFICAÇÃO
// ========================================

if (require.main === module) {
  verificarRespostaCompleta().catch(console.error);
}

module.exports = { verificarRespostaCompleta };



