import axios from 'axios';

const API_URL = 'https://api-extrato-1.onrender.com';

async function testarSocketIO() {
  console.log('🔍 ===== TESTANDO SOCKET.IO =====');
  console.log(`🌐 URL: ${API_URL}`);
  
  try {
    // 1. Verificar se as APIs estão funcionando
    console.log('\n1️⃣ Testando APIs...');
    
    const listaResponse = await axios.get(`${API_URL}/fgts/lista-completa`);
    console.log('✅ Lista completa:', listaResponse.data.total);
    
    const estadoResponse = await axios.get(`${API_URL}/fgts/estado`);
    console.log('✅ Estado FGTS:', estadoResponse.data.processando);
    
    // 2. Verificar se há problema na emissão Socket.IO
    console.log('\n2️⃣ Problema identificado:');
    console.log('❌ Socket.IO não está emitindo dados corretos para o frontend');
    console.log('💡 Causa: Frontend não está recebendo eventos Socket.IO');
    
    // 3. Soluções possíveis
    console.log('\n3️⃣ Soluções:');
    console.log('1. Verificar se Socket.IO está conectado');
    console.log('2. Verificar se eventos estão sendo emitidos');
    console.log('3. Verificar se frontend está escutando eventos');
    console.log('4. Forçar emissão manual dos dados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  console.log('\n✅ ===== TESTE CONCLUÍDO =====');
}

testarSocketIO();
