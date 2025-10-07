#!/usr/bin/env node

/**
 * Script para configurar o ambiente e resolver erros de conexão
 * Execute: node configurar-ambiente.js
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Configurando ambiente para resolver erros de conexão...\n');

// Verificar se o arquivo .env existe
const envPath = '.env';
const envExamplePath = 'env-example.txt';

if (!fs.existsSync(envPath)) {
    console.log('❌ Arquivo .env não encontrado!');
    
    if (fs.existsSync(envExamplePath)) {
        console.log('📋 Copiando configurações de exemplo...');
        try {
            const envContent = fs.readFileSync(envExamplePath, 'utf8');
            fs.writeFileSync(envPath, envContent);
            console.log('✅ Arquivo .env criado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao criar arquivo .env:', error.message);
        }
    } else {
        console.log('📝 Criando arquivo .env básico...');
        const basicEnv = `# Configurações básicas para resolver erro de conexão
NODE_ENV=development
PORT=3000

# API V8 Sistema - CONFIGURE SUAS CREDENCIAIS
V8_API_BASE=https://bff.v8sistema.com
V8_AUTH_URL=https://auth.v8sistema.com/oauth/token
V8_CLIENT_ID=DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn
V8_AUDIENCE=https://bff.v8sistema.com
V8_USERNAME=seu_email_v8@dominio.com
V8_PASSWORD=sua_senha_v8

# API Lunas CRM
LUNAS_API_KEY=sua_chave_api_lunas
QUEUE_ID=25
DEST_STAGE_ID=4

# Configurações de performance
DEFAULT_DELAY=1000
DELAY_BASE=1000
DELAY_MIN=500
DELAY_MAX=5000
TAXA_ERRO=10
`;
        fs.writeFileSync(envPath, basicEnv);
        console.log('✅ Arquivo .env básico criado!');
    }
} else {
    console.log('✅ Arquivo .env já existe');
}

// Verificar dependências
console.log('\n📦 Verificando dependências...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    
    console.log('✅ Dependências principais encontradas:');
    dependencies.forEach(dep => {
        console.log(`   - ${dep}`);
    });
} catch (error) {
    console.error('❌ Erro ao verificar package.json:', error.message);
}

// Verificar se o servidor está rodando
console.log('\n🌐 Verificando status do servidor...');
import { exec } from 'child_process';

exec('netstat -an | findstr :3000', (error, stdout, stderr) => {
    if (stdout.includes('LISTENING')) {
        console.log('✅ Servidor está rodando na porta 3000');
    } else {
        console.log('❌ Servidor não está rodando na porta 3000');
        console.log('💡 Execute: npm start ou node server.js');
    }
});

console.log('\n🎯 PRÓXIMOS PASSOS PARA RESOLVER O ERRO:');
console.log('1. 📝 Edite o arquivo .env e configure suas credenciais V8 Sistema');
console.log('2. 🔑 Obtenha suas credenciais em: https://auth.v8sistema.com');
console.log('3. 🔄 Reinicie o servidor: npm start');
console.log('4. 🧪 Teste a conexão com a API V8');

console.log('\n📋 CONFIGURAÇÕES NECESSÁRIAS:');
console.log('- V8_USERNAME: Seu email da conta V8 Sistema');
console.log('- V8_PASSWORD: Sua senha da conta V8 Sistema');
console.log('- LUNAS_API_KEY: Sua chave da API Lunas CRM');

console.log('\n✨ Configuração concluída!');

