// Script para corrigir busca de clientes no VPS
const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo busca de clientes no VPS...');

// 1. Corrigir client-manager.js
const clientManagerPath = path.join(__dirname, 'operacional/client-manager.js');
let content = fs.readFileSync(clientManagerPath, 'utf8');

// Substituir URLs para detectar ambiente automaticamente
content = content.replace(
    "const responseClientes = await fetch('https://lunasdigital.com.br/api/sincronizar-clientes');",
    "const baseUrl = window.location.hostname === 'localhost' ? '' : 'https://lunasdigital.com.br';\n            const responseClientes = await fetch(`${baseUrl}/api/sincronizar-clientes`);"
);

content = content.replace(
    "const response = await fetch('https://lunasdigital.com.br/api/salvar-cliente', {",
    "const baseUrl = window.location.hostname === 'localhost' ? '' : 'https://lunasdigital.com.br';\n            const response = await fetch(`${baseUrl}/api/salvar-cliente`, {"
);

fs.writeFileSync(clientManagerPath, content);
console.log('✅ client-manager.js corrigido');

// 2. Verificar se há outros problemas
console.log('🔍 Verificando outros arquivos...');

// Verificar se o arquivo buscar-cliente.html está correto
const buscarClientePath = path.join(__dirname, 'operacional/buscar-cliente.html');
if (fs.existsSync(buscarClientePath)) {
    console.log('✅ buscar-cliente.html encontrado');
} else {
    console.log('❌ buscar-cliente.html não encontrado');
}

console.log('🎉 Correções aplicadas com sucesso!');
console.log('📋 Próximos passos:');
console.log('1. Fazer commit das mudanças');
console.log('2. Push para o repositório');
console.log('3. Deploy automático no VPS');
