const fs = require('fs');
const path = require('path');

// Dados corretos da Kentro para o cliente CICERO ANDRE DA SILVA
const dadosCorretos = {
  "cpf": "01313222496",  // CPF correto da Kentro
  "nome": "CICERO ANDRE DA SILVA",
  "nb": "5178226450",
  "telefone": "5582991045859",  // Telefone da Kentro
  "email": "",  // Email não disponível na Kentro
  "nascimento": "13/01/1982",  // Data nascimento da Kentro
  "kentroId": "36816",  // Kentro ID correto
  "fonte": "simulador_proposta",
  "id": "50",
  "createdAt": "2025-10-13T12:47:01.559Z",
  "updatedAt": new Date().toISOString()
};

// Ler arquivo atual
const filePath = '/root/api-lunas/var/data/clientes/50.json';
const clienteAtual = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('Dados atuais:', clienteAtual);

// Atualizar com dados corretos
const clienteAtualizado = { ...clienteAtual, ...dadosCorretos };

// Salvar arquivo atualizado
fs.writeFileSync(filePath, JSON.stringify(clienteAtualizado, null, 2));

console.log('Dados atualizados:', clienteAtualizado);
console.log('✅ Cliente 50 atualizado com dados da Kentro!');

