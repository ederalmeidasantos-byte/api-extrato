const fs = require('fs');
const path = require('path');

// Ler arquivo atual
const filePath = '/root/api-lunas/var/data/extratos/extrato_7567.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('CPF atual:', data.cpf);

// Atualizar CPF
data.cpf = '01313222496';

// Salvar arquivo
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log('CPF atualizado para:', data.cpf);
console.log('Kentro ID:', data.idoportunidade);

