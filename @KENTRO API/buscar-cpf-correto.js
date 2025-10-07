/**
 * Buscar CPF 04973279889 - Lógica Correta
 * Usando getPipeOpportunities com POST e pipelineId
 */

const AtenderBemClient = require('./atenderbem-client');
const { 
  obterStatusPorId, 
  isStatusFinal,
  FILAS,
  STATUS_PORTABILIDADE
} = require('./crm-status-mapping');

async function buscarCPF04973279889() {
  console.log('🔍 Buscando CPF 04973279889 - Lógica Correta');
  console.log('==============================================\n');
  
  const cpfProcurado = '04973279889';
  const filaPortabilidade = FILAS.PORTABILIDADE; // Fila 2
  
  try {
    const client = new AtenderBemClient('development');
    
    // 1. Primeiro, vamos descobrir o pipelineId correto
    console.log('1. Descobrindo pipelineId correto...');
    
    // Testar diferentes pipelineIds para encontrar o correto
    const pipelineIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let pipelineIdCorreto = null;
    
    for (const pipelineId of pipelineIds) {
      console.log(`   Testando pipelineId: ${pipelineId}`);
      
      try {
        const response = await client.client.post('/int/getPipeOpportunities', {
          queueId: filaPortabilidade,
          apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
          pipelineId: pipelineId
        }, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'API-Client/1.0'
          }
        });
        
        console.log(`     Status: ${response.status} | Content-Type: ${response.headers['content-type']}`);
        
        if (response.headers['content-type']?.includes('application/json')) {
          console.log(`     ✅ JSON retornado para pipelineId ${pipelineId}`);
          pipelineIdCorreto = pipelineId;
          
          // Verificar se tem dados
          if (response.data && (Array.isArray(response.data) || response.data.data)) {
            const oportunidades = Array.isArray(response.data) ? response.data : response.data.data;
            console.log(`     📊 ${oportunidades.length} oportunidades encontradas`);
            break;
          }
        } else if (response.headers['content-type']?.includes('text/html')) {
          console.log(`     ❌ HTML retornado para pipelineId ${pipelineId}`);
        } else {
          console.log(`     ❓ Tipo: ${response.headers['content-type']} para pipelineId ${pipelineId}`);
        }
        
      } catch (error) {
        console.log(`     ❌ Erro para pipelineId ${pipelineId}: ${error.message}`);
        if (error.response) {
          console.log(`       - Status: ${error.response.status}`);
        }
      }
    }
    
    if (!pipelineIdCorreto) {
      console.log('❌ Nenhum pipelineId retornou JSON válido');
      return;
    }
    
    console.log(`\n✅ PipelineId correto encontrado: ${pipelineIdCorreto}`);
    
    // 2. Buscar todas as oportunidades do pipeline correto
    console.log(`\n2. Buscando todas as oportunidades do pipeline ${pipelineIdCorreto}...`);
    
    const response = await client.client.post('/int/getPipeOpportunities', {
      queueId: filaPortabilidade,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      pipelineId: pipelineIdCorreto
    }, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'API-Client/1.0'
      }
    });
    
    console.log('✅ Resposta recebida:');
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Content-Type: ${response.headers['content-type']}`);
    console.log(`   - Tamanho: ${JSON.stringify(response.data).length} caracteres`);
    
    if (response.headers['content-type']?.includes('application/json')) {
      console.log('   ✅ Content-Type correto (JSON)');
      
      // Processar dados
      await processarDadosOportunidades(response.data, cpfProcurado);
      
    } else {
      console.log('   ❌ Ainda retornando HTML ou formato incorreto');
      console.log('   - Primeiros 200 caracteres:');
      console.log(`     ${JSON.stringify(response.data).substring(0, 200)}...`);
    }
    
    console.log('\n');
    
    // 3. Buscar com filtro por stageId (opcional)
    console.log('3. Testando com filtro por stageId...');
    
    const stageIds = [8, 9, 10, 11, 12, 13, 14, 15]; // Status da portabilidade
    
    for (const stageId of stageIds) {
      console.log(`   Testando stageId: ${stageId}`);
      
      try {
        const response = await client.client.post('/int/getPipeOpportunities', {
          queueId: filaPortabilidade,
          apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
          pipelineId: pipelineIdCorreto,
          stageId: stageId
        }, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'API-Client/1.0'
          }
        });
        
        console.log(`     Status: ${response.status} | Content-Type: ${response.headers['content-type']}`);
        
        if (response.headers['content-type']?.includes('application/json')) {
          console.log(`     ✅ JSON retornado para stageId ${stageId}`);
          
          // Verificar se tem dados
          if (response.data && (Array.isArray(response.data) || response.data.data)) {
            const oportunidades = Array.isArray(response.data) ? response.data : response.data.data;
            console.log(`     📊 ${oportunidades.length} oportunidades encontradas`);
            
            // Procurar o CPF
            await procurarCPFNasOportunidades(oportunidades, cpfProcurado, stageId);
          }
        } else {
          console.log(`     ❌ HTML retornado para stageId ${stageId}`);
        }
        
      } catch (error) {
        console.log(`     ❌ Erro para stageId ${stageId}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Busca concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.log(`   - Status: ${error.response.status}`);
      console.log(`   - Dados: ${JSON.stringify(error.response.data)}`);
    }
  }
}

async function processarDadosOportunidades(dados, cpfProcurado) {
  console.log('\n2. Processando dados das oportunidades...');
  
  let oportunidades = [];
  
  // Verificar diferentes estruturas de dados
  if (Array.isArray(dados)) {
    oportunidades = dados;
  } else if (dados && Array.isArray(dados.data)) {
    oportunidades = dados.data;
  } else if (dados && Array.isArray(dados.opportunities)) {
    oportunidades = dados.opportunities;
  } else if (dados && typeof dados === 'object') {
    // Tentar extrair array de qualquer propriedade
    for (const key in dados) {
      if (Array.isArray(dados[key])) {
        oportunidades = dados[key];
        break;
      }
    }
  }
  
  console.log(`   - Oportunidades encontradas: ${oportunidades.length}`);
  
  if (oportunidades.length === 0) {
    console.log('❌ Nenhuma oportunidade encontrada');
    return;
  }
  
  // Mostrar estrutura da primeira oportunidade
  if (oportunidades.length > 0) {
    console.log('   - Estrutura da primeira oportunidade:');
    console.log(`     ${JSON.stringify(oportunidades[0], null, 2)}`);
  }
  
  await procurarCPFNasOportunidades(oportunidades, cpfProcurado);
}

async function procurarCPFNasOportunidades(oportunidades, cpfProcurado, stageId = null) {
  const contexto = stageId ? ` (stageId: ${stageId})` : '';
  console.log(`\n3. Procurando CPF ${cpfProcurado} nas oportunidades${contexto}...`);
  
  const oportunidadesEncontradas = [];
  
  for (let i = 0; i < oportunidades.length; i++) {
    const oportunidade = oportunidades[i];
    const oportunidadeStr = JSON.stringify(oportunidade).toLowerCase();
    
    // Procurar o CPF em qualquer campo da oportunidade
    const cpfEncontrado = oportunidadeStr.includes(cpfProcurado) || 
                         oportunidadeStr.includes('049.732.798-89') ||
                         oportunidadeStr.includes('04973279889');
    
    if (cpfEncontrado) {
      oportunidadesEncontradas.push({
        index: i,
        oportunidade: oportunidade
      });
    }
  }
  
  console.log(`   - Oportunidades com CPF ${cpfProcurado}: ${oportunidadesEncontradas.length}`);
  
  if (oportunidadesEncontradas.length === 0) {
    console.log('❌ CPF não encontrado em nenhuma oportunidade');
    
    // Mostrar alguns exemplos para debug
    console.log('\n   📋 Exemplos de oportunidades (primeiras 3):');
    oportunidades.slice(0, 3).forEach((op, index) => {
      console.log(`     ${index + 1}. ID: ${op.id || 'N/A'} | Título: ${op.title || 'N/A'}`);
      if (op.contact) {
        console.log(`        Contato: ${JSON.stringify(op.contact)}`);
      }
      if (op.mainmail) {
        console.log(`        Mainmail: ${op.mainmail}`);
      }
    });
    
  } else {
    console.log('\n   🎯 Oportunidades encontradas:');
    
    for (const item of oportunidadesEncontradas) {
      const op = item.oportunidade;
      const statusInfo = obterStatusPorId(op.stageId);
      const isAberta = !isStatusFinal(op.stageId);
      
      console.log(`\n   📋 Oportunidade ${item.index + 1}:`);
      console.log(`     - ID: ${op.id || 'N/A'}`);
      console.log(`     - Título: ${op.title || 'N/A'}`);
      console.log(`     - Status: ${statusInfo?.nome || op.stageId} (${isAberta ? 'ABERTA' : 'FECHADA'})`);
      console.log(`     - Valor: R$ ${op.value?.toLocaleString('pt-BR') || 'N/A'}`);
      console.log(`     - Contato ID: ${op.contactId || 'N/A'}`);
      console.log(`     - Mainmail: ${op.mainmail || 'N/A'}`);
      console.log(`     - Criada em: ${op.createdAt || 'N/A'}`);
      
      if (op.contact) {
        console.log(`     - Dados do Contato:`);
        console.log(`       ${JSON.stringify(op.contact, null, 6)}`);
      }
      
      // Verificar se está aberta
      if (isAberta) {
        console.log(`     ✅ OPORTUNIDADE ABERTA - Pode ser processada`);
      } else {
        console.log(`     ❌ OPORTUNIDADE FECHADA - Não pode ser alterada`);
      }
    }
  }
}

// ========================================
// EXECUTAR BUSCA
// ========================================

if (require.main === module) {
  buscarCPF04973279889().catch(console.error);
}

module.exports = { buscarCPF04973279889 };



