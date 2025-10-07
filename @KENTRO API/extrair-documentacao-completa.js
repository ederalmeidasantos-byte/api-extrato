/**
 * Extrair Documentação Completa da API
 * Analisa a especificação oficial e documenta todos os endpoints
 */

const axios = require('axios');

async function extrairDocumentacaoCompleta() {
  console.log('🔍 Extraindo Documentação Completa da API');
  console.log('==========================================\n');
  
  try {
    // 1. Buscar a especificação oficial
    console.log('1. Buscando especificação oficial...');
    
    const response = await axios.get('https://lunasdigital.atenderbem.com/static/getAPPAPISpecs', {
      timeout: 30000,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ Especificação obtida!');
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Content-Type: ${response.headers['content-type']}`);
    console.log(`   - Tamanho: ${JSON.stringify(response.data).length} caracteres`);
    
    // 2. Analisar a especificação
    console.log('\n2. Analisando especificação...');
    
    let spec;
    if (typeof response.data === 'string') {
      try {
        spec = JSON.parse(response.data);
      } catch (e) {
        // Se não for JSON, pode ser YAML
        console.log('   - Tentando parse como YAML...');
        const yaml = require('yaml');
        spec = yaml.parse(response.data);
      }
    } else {
      spec = response.data;
    }
    
    console.log('✅ Especificação analisada!');
    console.log(`   - Tipo: ${typeof spec}`);
    console.log(`   - Chaves principais: ${Object.keys(spec).join(', ')}`);
    
    // 3. Extrair informações básicas
    if (spec.info) {
      console.log('\n3. Informações da API:');
      console.log(`   - Título: ${spec.info.title}`);
      console.log(`   - Descrição: ${spec.info.description}`);
      console.log(`   - Versão: ${spec.info.version}`);
    }
    
    // 4. Extrair tags/categorias
    if (spec.tags) {
      console.log('\n4. Categorias da API:');
      spec.tags.forEach((tag, index) => {
        console.log(`   ${index + 1}. ${tag.name} - ${tag.description}`);
      });
    }
    
    // 5. Extrair todos os endpoints
    if (spec.paths) {
      console.log('\n5. Endpoints encontrados:');
      
      const endpoints = [];
      Object.keys(spec.paths).forEach(path => {
        const pathObj = spec.paths[path];
        Object.keys(pathObj).forEach(method => {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            const endpoint = pathObj[method];
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: endpoint.summary || 'Sem descrição',
              description: endpoint.description || 'Sem descrição',
              operationId: endpoint.operationId || 'Sem ID',
              tags: endpoint.tags || [],
              parameters: endpoint.parameters || [],
              requestBody: endpoint.requestBody || null,
              responses: endpoint.responses || {}
            });
          }
        });
      });
      
      console.log(`   - Total de endpoints: ${endpoints.length}`);
      
      // Agrupar por categoria
      const categorias = {};
      endpoints.forEach(endpoint => {
        const categoria = endpoint.tags[0] || 'Sem categoria';
        if (!categorias[categoria]) {
          categorias[categoria] = [];
        }
        categorias[categoria].push(endpoint);
      });
      
      // Mostrar por categoria
      Object.keys(categorias).forEach(categoria => {
        console.log(`\n   📁 ${categoria} (${categorias[categoria].length} endpoints):`);
        categorias[categoria].forEach(endpoint => {
          console.log(`     ${endpoint.method} ${endpoint.path}`);
          console.log(`       - ${endpoint.summary}`);
          if (endpoint.operationId) {
            console.log(`       - ID: ${endpoint.operationId}`);
          }
        });
      });
      
      // 6. Procurar especificamente por getPipeOpportunities
      console.log('\n6. Procurando getPipeOpportunities...');
      
      const pipeOpportunities = endpoints.filter(ep => 
        ep.operationId === 'getPipeOpportunities' || 
        ep.path.includes('getPipeOpportunities')
      );
      
      if (pipeOpportunities.length > 0) {
        console.log('   ✅ getPipeOpportunities encontrado!');
        pipeOpportunities.forEach(ep => {
          console.log(`     - Método: ${ep.method}`);
          console.log(`     - Path: ${ep.path}`);
          console.log(`     - Summary: ${ep.summary}`);
          console.log(`     - Description: ${ep.description}`);
          
          if (ep.requestBody) {
            console.log('     - Request Body:');
            console.log(`       ${JSON.stringify(ep.requestBody, null, 6)}`);
          }
          
          if (ep.parameters && ep.parameters.length > 0) {
            console.log('     - Parâmetros:');
            ep.parameters.forEach(param => {
              console.log(`       - ${param.name} (${param.in}): ${param.description || 'Sem descrição'}`);
            });
          }
          
          if (ep.responses) {
            console.log('     - Responses:');
            Object.keys(ep.responses).forEach(status => {
              const response = ep.responses[status];
              console.log(`       - ${status}: ${response.description || 'Sem descrição'}`);
            });
          }
        });
      } else {
        console.log('   ❌ getPipeOpportunities NÃO encontrado');
      }
      
      // 7. Procurar por outros endpoints de oportunidades
      console.log('\n7. Procurando outros endpoints de oportunidades...');
      
      const opportunityEndpoints = endpoints.filter(ep => 
        ep.operationId.includes('Opportunity') || 
        ep.operationId.includes('opportunity') ||
        ep.path.includes('opportunity') ||
        ep.path.includes('Opportunity')
      );
      
      if (opportunityEndpoints.length > 0) {
        console.log(`   ✅ ${opportunityEndpoints.length} endpoints de oportunidades encontrados:`);
        opportunityEndpoints.forEach(ep => {
          console.log(`     ${ep.method} ${ep.path} - ${ep.summary}`);
        });
      } else {
        console.log('   ❌ Nenhum endpoint de oportunidades encontrado');
      }
      
      // 8. Salvar documentação completa
      console.log('\n8. Salvando documentação completa...');
      
      const documentacaoCompleta = {
        info: spec.info,
        tags: spec.tags,
        endpoints: endpoints,
        categorias: categorias,
        pipeOpportunities: pipeOpportunities,
        opportunityEndpoints: opportunityEndpoints
      };
      
      const fs = require('fs');
      fs.writeFileSync('documentacao-completa.json', JSON.stringify(documentacaoCompleta, null, 2));
      console.log('   ✅ Documentação salva em: @KENTRO API/documentacao-completa.json');
      
    } else {
      console.log('   ❌ Nenhum path encontrado na especificação');
    }
    
    console.log('\n✅ Extração concluída!');
    
  } catch (error) {
    console.error('❌ Erro na extração:', error.message);
    if (error.response) {
      console.log(`   - Status: ${error.response.status}`);
      console.log(`   - Dados: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// ========================================
// EXECUTAR EXTRAÇÃO
// ========================================

if (require.main === module) {
  extrairDocumentacaoCompleta().catch(console.error);
}

module.exports = { extrairDocumentacaoCompleta };
