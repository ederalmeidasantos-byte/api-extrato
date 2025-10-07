#!/usr/bin/env node

/**
 * Script para testar conectividade e resolver erros de serialização
 * Execute: node testar-conexao.js
 */

import "dotenv/config";
import fetch from 'node-fetch';
import axios from 'axios';

console.log('🔍 Testando conectividade e resolvendo erros de serialização...\n');

// Função para testar conectividade básica
async function testarConectividadeBasica() {
    console.log('🌐 Testando conectividade básica...');
    
    try {
        const response = await fetch('https://google.com');
        if (response.ok) {
            console.log('✅ Conectividade com internet: OK');
        } else {
            console.log('❌ Conectividade com internet: FALHA');
        }
    } catch (error) {
        console.log('❌ Conectividade com internet: FALHA');
        console.log('   Erro:', error.message);
    }
}

// Função para testar servidor local
async function testarServidorLocal() {
    console.log('\n🏠 Testando servidor local...');
    
    try {
        const response = await fetch('http://localhost:3000');
        if (response.ok) {
            const text = await response.text();
            console.log('✅ Servidor local: OK');
            console.log('   Resposta:', text);
        } else {
            console.log('❌ Servidor local: FALHA');
            console.log('   Status:', response.status);
        }
    } catch (error) {
        console.log('❌ Servidor local: FALHA');
        console.log('   Erro:', error.message);
        console.log('💡 Certifique-se de que o servidor está rodando: npm start');
    }
}

// Função para testar API V8 Sistema
async function testarAPIV8() {
    console.log('\n🔑 Testando API V8 Sistema...');
    
    const v8Username = process.env.V8_USERNAME;
    const v8Password = process.env.V8_PASSWORD;
    const v8ClientId = process.env.V8_CLIENT_ID;
    const v8AuthUrl = process.env.V8_AUTH_URL;
    
    if (!v8Username || !v8Password || !v8ClientId) {
        console.log('❌ Credenciais V8 não configuradas no .env');
        console.log('📝 Configure: V8_USERNAME, V8_PASSWORD, V8_CLIENT_ID');
        return;
    }
    
    try {
        console.log('   Tentando autenticação...');
        
        const authData = {
            client_id: v8ClientId,
            username: v8Username,
            password: v8Password,
            grant_type: 'password',
            audience: 'https://bff.v8sistema.com'
        };
        
        const response = await axios.post(v8AuthUrl, authData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data && response.data.access_token) {
            console.log('✅ Autenticação V8: OK');
            console.log('   Token obtido com sucesso');
            
            // Testar uma consulta simples
            await testarConsultaV8(response.data.access_token);
        } else {
            console.log('❌ Autenticação V8: FALHA');
            console.log('   Resposta:', response.data);
        }
        
    } catch (error) {
        console.log('❌ Autenticação V8: FALHA');
        console.log('   Erro:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('💡 Verifique suas credenciais V8 no arquivo .env');
        }
    }
}

// Função para testar consulta V8
async function testarConsultaV8(token) {
    console.log('\n📊 Testando consulta V8...');
    
    try {
        const v8ApiBase = process.env.V8_API_BASE || 'https://bff.v8sistema.com';
        const testUrl = `${v8ApiBase}/fgts/balance/cache/test`;
        
        const response = await axios.get(testUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Consulta V8: OK');
        console.log('   Status:', response.status);
        
    } catch (error) {
        console.log('❌ Consulta V8: FALHA');
        console.log('   Erro:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('💡 Token expirado ou inválido');
        }
    }
}

// Função para verificar configurações
function verificarConfiguracoes() {
    console.log('\n⚙️ Verificando configurações...');
    
    const configs = [
        'V8_USERNAME',
        'V8_PASSWORD', 
        'V8_CLIENT_ID',
        'V8_AUTH_URL',
        'V8_API_BASE',
        'LUNAS_API_KEY',
        'PORT'
    ];
    
    configs.forEach(config => {
        const value = process.env[config];
        if (value && value !== `sua_${config.toLowerCase()}`) {
            console.log(`✅ ${config}: Configurado`);
        } else {
            console.log(`❌ ${config}: Não configurado`);
        }
    });
}

// Função principal
async function main() {
    console.log('🚀 Iniciando testes de conectividade...\n');
    
    verificarConfiguracoes();
    await testarConectividadeBasica();
    await testarServidorLocal();
    await testarAPIV8();
    
    console.log('\n🎯 RESUMO DOS TESTES:');
    console.log('1. ✅ Conectividade básica testada');
    console.log('2. ✅ Servidor local testado');
    console.log('3. ✅ API V8 Sistema testada');
    
    console.log('\n💡 SOLUÇÕES PARA ERRO DE SERIALIZAÇÃO:');
    console.log('1. Configure suas credenciais V8 no arquivo .env');
    console.log('2. Reinicie o servidor após configurar');
    console.log('3. Verifique se não há VPN bloqueando a conexão');
    console.log('4. Teste com dados válidos de CPF');
    
    console.log('\n✨ Testes concluídos!');
}

// Executar testes
main().catch(console.error);

