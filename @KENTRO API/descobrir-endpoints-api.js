/**
 * Descobrir Endpoints Disponíveis na API
 * Testar diferentes endpoints para encontrar o correto
 */

const axios = require('axios');

async function descobrirEndpoints() {
  console.log('🔍 Descobrindo Endpoints da API');
  console.log('================================\n');
  
  const apiUrl = 'https://api-extrato-1.onrender.com';
  const fileId = '7025';
  const idoportunidade = '36400';
  
  const endpointsParaTestar = [
    { method: 'GET', path: '/', name: 'Root' },
    { method: 'GET', path: '/status', name: 'Status' },
    { method: 'GET', path: '/health', name: 'Health' },
    { method: 'POST', path: '/extrair', name: 'Extrair' },
    { method: 'POST', path: '/extrair/', name: 'Extrair com barra' },
    { method: 'POST', path: '/api/extrair', name: 'API Extrair' },
    { method: 'POST', path: '/extract', name: 'Extract' },
    { method: 'POST', path: '/process', name: 'Process' },
    { method: 'GET', path: '/extrair', name: 'Extrair GET' },
    { method: 'GET', path: `/extrair/${fileId}`, name: 'Extrair com ID' }
  ];
  
  console.log(`🔗 Testando API: ${apiUrl}`);
  console.log(`📄 File ID: ${fileId}`);
  console.log(`🎯 ID Oportunidade: ${idoportunidade}\n`);
  
  for (const endpoint of endpointsParaTestar) {
    console.log(`Testando ${endpoint.method} ${endpoint.path} (${endpoint.name})...`);
    
    try {
      let response;
      
      if (endpoint.method === 'GET') {
        response = await axios.get(`${apiUrl}${endpoint.path}`, {
          timeout: 10000
        });
      } else if (endpoint.method === 'POST') {
        response = await axios.post(`${apiUrl}${endpoint.path}`, {
          fileId: fileId,
          idoportunidade: idoportunidade
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
      }
      
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📊 Content-Type: ${response.headers['content-type']}`);
      
      if (response.data) {
        if (typeof response.data === 'string') {
          console.log(`   📝 Resposta: ${response.data.substring(0, 100)}...`);
        } else {
          console.log(`   📝 Resposta: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      }
      
      // Se encontrou um endpoint que funciona, mostrar mais detalhes
      if (response.status === 200 && endpoint.method === 'POST') {
        console.log(`   🎯 ENDPOINT FUNCIONANDO: ${endpoint.method} ${endpoint.path}`);
        
        if (response.data.idoportunidade) {
          console.log(`   ✅ ID Oportunidade encontrado: ${response.data.idoportunidade}`);
        }
        
        if (response.data.fileId) {
          console.log(`   ✅ File ID encontrado: ${response.data.fileId}`);
        }
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ Status: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.status === 404) {
          console.log(`   📝 Endpoint não encontrado`);
        } else if (error.response.status === 405) {
          console.log(`   📝 Método não permitido`);
        } else if (error.response.status === 400) {
          console.log(`   📝 Bad Request - Endpoint existe mas parâmetros incorretos`);
        }
      } else {
        console.log(`   ❌ Erro: ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('🎯 Teste de endpoints concluído!');
}

// Executar teste
if (require.main === module) {
  descobrirEndpoints().catch(console.error);
}

module.exports = { descobrirEndpoints };



