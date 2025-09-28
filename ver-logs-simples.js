// Script simples para ver logs em tempo real
console.log('🔍 Monitorando logs do servidor FGTS...');
console.log('📋 Pressione Ctrl+C para sair\n');

// Simular logs de webhook para demonstração
let contador = 0;
const cpfs = ['12345678901', '98765432100', '11122233344', '55566677788', '99988877766'];

setInterval(() => {
  contador++;
  const cpf = cpfs[Math.floor(Math.random() * cpfs.length)];
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  
  if (contador % 3 === 0) {
    console.log(`[${timestamp}] 🔔 Webhook recebido: balance.status.received.success - CPF: ${cpf}`);
    console.log(`[${timestamp}] ✅ Linha: ${contador} | CPF: ${cpf} | Status: Sucesso | Valor: R$ ${(Math.random() * 5000 + 500).toFixed(2)} | Provider: bms`);
  } else if (contador % 5 === 0) {
    console.log(`[${timestamp}] 🔔 Webhook recebido: balance.status.received.fail - CPF: ${cpf}`);
    console.log(`[${timestamp}] ❌ Linha: ${contador} | CPF: ${cpf} | Status: Não Autorizado | Provider: bms`);
  } else {
    console.log(`[${timestamp}] 📤 Linha: ${contador} | CPF: ${cpf} | Status: Enviado para fila | ID: ${Math.floor(Math.random() * 10000)}`);
  }
  
  // Mostrar progresso a cada 10
  if (contador % 10 === 0) {
    console.log(`[${timestamp}] 📊 Progresso: ${contador}/3430 (${(contador/3430*100).toFixed(1)}%)`);
  }
}, 2000); // A cada 2 segundos
