require('dotenv').config();

console.log('🔑 API Key:', process.env.OPENAI_API_KEY ? 'Configurada' : 'Não configurada');

try {
  const { processarMensagemChatGPT } = require('./chatgpt-vendedor/chatgpt-produtos.js');
  console.log('✅ Import OK');
  
  processarMensagemChatGPT({
    cpf: '46104631649',
    mensagem: 'teste'
  }).then(result => {
    console.log('✅ Resultado:', result);
  }).catch(err => {
    console.error('❌ Erro:', err.message);
  });
  
} catch (error) {
  console.error('❌ Erro de import:', error.message);
}
