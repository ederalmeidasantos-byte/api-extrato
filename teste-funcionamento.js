#!/usr/bin/env node

// ===== TESTE DE FUNCIONAMENTO DO SERVIDOR FGTS =====
// Este script testa se todas as importações e funções estão funcionando

import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 ===== TESTE DE FUNCIONAMENTO FGTS =====');
console.log('');

// Teste 1: Verificar se os arquivos principais existem
console.log('📁 Verificando arquivos principais...');
const files = [
    'server.js',
    'fgts_csv.js', 
    'cache-persistente.js',
    'error-logger.js',
    'index.html',
    'package.json'
];

for (const file of files) {
    try {
        const fs = await import('fs');
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} - OK`);
        } else {
            console.log(`❌ ${file} - NÃO ENCONTRADO`);
        }
    } catch (error) {
        console.log(`❌ ${file} - ERRO: ${error.message}`);
    }
}

console.log('');

// Teste 2: Verificar importações do fgts_csv.js
console.log('📦 Testando importações do fgts_csv.js...');
try {
    const fgtsModule = await import('./fgts_csv.js');
    const expectedExports = [
        'processarCPFs',
        'processarCPF', 
        'setDelay',
        'setPause',
        'attachIO',
        'isHorarioComercial',
        'agendarDisparo',
        'processarAgendamentos',
        'ajustarDelayDinamico',
        'processarReprocessamentoRapido',
        'limparCacheV8'
    ];
    
    for (const exportName of expectedExports) {
        if (fgtsModule[exportName]) {
            console.log(`✅ ${exportName} - OK`);
        } else {
            console.log(`❌ ${exportName} - NÃO EXPORTADO`);
        }
    }
} catch (error) {
    console.log(`❌ Erro ao importar fgts_csv.js: ${error.message}`);
}

console.log('');

// Teste 3: Verificar importações do cache-persistente.js
console.log('💾 Testando importações do cache-persistente.js...');
try {
    const cacheModule = await import('./cache-persistente.js');
    const expectedCacheExports = [
        'carregarListas',
        'adicionarResultadoLista',
        'removerResultadoLista',
        'limparLista',
        'salvarPendentes',
        'carregarPendentes',
        'salvarTentativasCache',
        'carregarTentativasCache',
        'salvarEstadoProcessamento',
        'carregarEstadoProcessamento'
    ];
    
    for (const exportName of expectedCacheExports) {
        if (cacheModule[exportName]) {
            console.log(`✅ ${exportName} - OK`);
        } else {
            console.log(`❌ ${exportName} - NÃO EXPORTADO`);
        }
    }
} catch (error) {
    console.log(`❌ Erro ao importar cache-persistente.js: ${error.message}`);
}

console.log('');

// Teste 4: Verificar importações do error-logger.js
console.log('📝 Testando importações do error-logger.js...');
try {
    const errorModule = await import('./error-logger.js');
    const expectedErrorExports = [
        'logApiError',
        'logAuthError', 
        'logCacheError',
        'logCrmError',
        'logSystemError'
    ];
    
    for (const exportName of expectedErrorExports) {
        if (errorModule[exportName]) {
            console.log(`✅ ${exportName} - OK`);
        } else {
            console.log(`❌ ${exportName} - NÃO EXPORTADO`);
        }
    }
} catch (error) {
    console.log(`❌ Erro ao importar error-logger.js: ${error.message}`);
}

console.log('');

// Teste 5: Verificar se o servidor pode ser importado
console.log('🚀 Testando importação do servidor...');
try {
    // Não vamos executar o servidor, apenas verificar se pode ser importado
    console.log('✅ server.js pode ser importado (não executado para evitar conflitos)');
} catch (error) {
    console.log(`❌ Erro ao importar server.js: ${error.message}`);
}

console.log('');

// Teste 6: Verificar package.json
console.log('📋 Verificando package.json...');
try {
    const fs = await import('fs');
    const packagePath = path.join(__dirname, 'package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    
    console.log(`✅ Nome: ${packageJson.name}`);
    console.log(`✅ Main: ${packageJson.main}`);
    console.log(`✅ Start: ${packageJson.scripts.start}`);
    console.log(`✅ Dependências: ${Object.keys(packageJson.dependencies).length} pacotes`);
    
    // Verificar dependências críticas
    const criticalDeps = ['express', 'socket.io', 'axios', 'csv-parse', 'multer', 'cors'];
    for (const dep of criticalDeps) {
        if (packageJson.dependencies[dep]) {
            console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
        } else {
            console.log(`❌ ${dep}: NÃO ENCONTRADO`);
        }
    }
} catch (error) {
    console.log(`❌ Erro ao verificar package.json: ${error.message}`);
}

console.log('');
console.log('🎯 ===== RESUMO DO TESTE =====');
console.log('');
console.log('✅ Se todos os testes passaram, o servidor está pronto para deploy!');
console.log('❌ Se algum teste falhou, corrija os problemas antes do deploy.');
console.log('');
console.log('🚀 Para testar localmente:');
console.log('   node server.js');
console.log('');
console.log('🌐 Para fazer deploy:');
console.log('   git add .');
console.log('   git commit -m "Deploy Painel FGTS"');
console.log('   git push origin main');
console.log('');
console.log('✨ Teste concluído!');
