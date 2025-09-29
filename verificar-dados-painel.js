import axios from 'axios';

const API_URL = 'https://api-extrato-1.onrender.com';

async function verificarDadosPainel() {
  console.log('🔍 ===== VERIFICANDO DADOS DO PAINEL =====');
  console.log(`🌐 URL: ${API_URL}`);
  
  try {
    // 1. Verificar dados que o frontend deveria receber
    console.log('\n1️⃣ Dados que o frontend deveria receber:');
    
    // Lista completa
    const listaResponse = await axios.get(`${API_URL}/fgts/lista-completa`);
    console.log('📋 Lista completa:');
    console.log(`   📊 Total: ${listaResponse.data.total}`);
    console.log(`   📊 Processados: ${listaResponse.data.processados || 0}`);
    console.log(`   📊 Sucessos: ${listaResponse.data.sucessos || 0}`);
    console.log(`   📊 Pendentes: ${listaResponse.data.pendentes || 0}`);
    
    // Estado FGTS
    const estadoResponse = await axios.get(`${API_URL}/fgts/estado`);
    console.log('\n📊 Estado FGTS:');
    console.log(`   📊 Total: ${estadoResponse.data.total}`);
    console.log(`   📊 Processados: ${estadoResponse.data.processados}`);
    console.log(`   📊 Sucessos: ${estadoResponse.data.sucessos}`);
    console.log(`   📊 Pendentes: ${estadoResponse.data.pendentes?.length || 0}`);
    
    // Pendentes
    const pendentesResponse = await axios.get(`${API_URL}/fgts/pendentes`);
    console.log('\n⏳ Pendentes:');
    console.log(`   📊 Total: ${pendentesResponse.data.total}`);
    console.log(`   📊 Pendentes: ${pendentesResponse.data.pendentes?.length || 0}`);
    
    // Listas de resultados
    const listasResponse = await axios.get(`${API_URL}/fgts/listas`);
    console.log('\n📋 Resultados:');
    console.log(`   📊 Sucessos: ${listasResponse.data.sucessos?.length || 0}`);
    console.log(`   📊 Não Autorizados: ${listasResponse.data.naoAutorizados?.length || 0}`);
    console.log(`   📊 Descartados: ${listasResponse.data.descartados?.length || 0}`);
    console.log(`   📊 Agendados: ${listasResponse.data.agendados?.length || 0}`);
    
    // 2. Comparar com o que o painel está mostrando
    console.log('\n2️⃣ Comparação com o painel:');
    console.log('📊 Painel mostra:');
    console.log('   📊 Total de CPFs: 0');
    console.log('   📊 Processados: 163');
    console.log('   📊 Sucessos: 2');
    console.log('   📊 Pendentes: 0');
    console.log('   📊 Agendados: 0');
    
    console.log('\n📊 Backend retorna:');
    console.log(`   📊 Total de CPFs: ${listaResponse.data.total}`);
    console.log(`   📊 Processados: ${estadoResponse.data.processados}`);
    console.log(`   📊 Sucessos: ${estadoResponse.data.sucessos}`);
    console.log(`   📊 Pendentes: ${pendentesResponse.data.pendentes?.length || 0}`);
    console.log(`   📊 Agendados: ${listasResponse.data.agendados?.length || 0}`);
    
    // 3. Identificar problemas
    console.log('\n3️⃣ Problemas identificados:');
    
    if (listaResponse.data.total !== 62259) {
      console.log(`❌ Total incorreto: ${listaResponse.data.total} (esperado: 62.259)`);
    } else {
      console.log('✅ Total correto: 62.259');
    }
    
    if (estadoResponse.data.processados !== 9) {
      console.log(`❌ Processados incorreto: ${estadoResponse.data.processados} (esperado: 9)`);
    } else {
      console.log('✅ Processados correto: 9');
    }
    
    if (estadoResponse.data.sucessos !== 2) {
      console.log(`❌ Sucessos incorreto: ${estadoResponse.data.sucessos} (esperado: 2)`);
    } else {
      console.log('✅ Sucessos correto: 2');
    }
    
    if (pendentesResponse.data.pendentes?.length !== 123) {
      console.log(`❌ Pendentes incorreto: ${pendentesResponse.data.pendentes?.length || 0} (esperado: 123)`);
    } else {
      console.log('✅ Pendentes correto: 123');
    }
    
    // 4. Possíveis causas
    console.log('\n4️⃣ Possíveis causas:');
    console.log('1. Frontend não está recebendo dados do Socket.IO');
    console.log('2. Frontend está usando dados em cache antigo');
    console.log('3. Socket.IO não está emitindo dados corretos');
    console.log('4. Frontend não está atualizando os contadores');
    console.log('5. Há problema na comunicação entre backend e frontend');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
  
  console.log('\n✅ ===== VERIFICAÇÃO CONCLUÍDA =====');
}

verificarDadosPainel();
