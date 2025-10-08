// Script para remover Nelsons duplicados no VPS
const fs = require('fs');
const path = require('path');

console.log('🔍 Removendo Nelsons duplicados...');

// Dados dos Nelsons encontrados
const nelsons = [
    {
        id: "1",
        arquivo: "1.json",
        completo: true,
        temContratos: true,
        temPropostas: false,
        dadosCompletos: true
    },
    {
        id: "2", 
        arquivo: "2.json",
        completo: true,
        temContratos: true,
        temPropostas: false,
        dadosCompletos: true
    },
    {
        id: "3",
        arquivo: "3.json", 
        completo: false,
        temContratos: false,
        temPropostas: true,
        dadosCompletos: false
    }
];

console.log('📋 Nelsons encontrados:');
nelsons.forEach(nelson => {
    console.log(`  ID ${nelson.id}: ${nelson.completo ? 'Completo' : 'Incompleto'} - Contratos: ${nelson.temContratos ? 'Sim' : 'Não'} - Propostas: ${nelson.temPropostas ? 'Sim' : 'Não'}`);
});

// Escolher o melhor cliente (ID 1 - mais completo)
const melhorCliente = nelsons[0]; // ID 1
const paraRemover = nelsons.slice(1); // IDs 2 e 3

console.log(`\n✅ Mantendo cliente ID ${melhorCliente.id} (mais completo)`);
console.log(`🗑️ Removendo clientes: ${paraRemover.map(c => c.id).join(', ')}`);

// Simular remoção (não vamos executar no VPS ainda)
console.log('\n📋 Ações que serão executadas:');
paraRemover.forEach(cliente => {
    console.log(`  - Remover arquivo: ${cliente.arquivo} (ID ${cliente.id})`);
});

console.log('\n⚠️ ATENÇÃO: Este script deve ser executado no VPS!');
console.log('📋 Para executar no VPS:');
console.log('1. Copiar este script para o VPS');
console.log('2. Executar: node remover-nelsons-duplicados.cjs');
console.log('3. Verificar se os arquivos foram removidos');

