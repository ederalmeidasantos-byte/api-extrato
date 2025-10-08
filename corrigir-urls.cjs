// Script para corrigir URLs no client-manager.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'operacional/client-manager.js');

try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Substituir URLs relativas por absolutas
    content = content.replace(
        "await fetch('/api/sincronizar-clientes')",
        "await fetch('https://lunasdigital.com.br/api/sincronizar-clientes')"
    );
    
    content = content.replace(
        "await fetch('/api/salvar-cliente', {",
        "await fetch('https://lunasdigital.com.br/api/salvar-cliente', {"
    );
    
    // Salvar arquivo corrigido
    fs.writeFileSync(filePath, content);
    
    console.log('✅ URLs corrigidas com sucesso!');
    console.log('📁 Arquivo:', filePath);
    
} catch (error) {
    console.error('❌ Erro ao corrigir URLs:', error);
}
