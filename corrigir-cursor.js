#!/usr/bin/env node

/**
 * Script para diagnosticar e corrigir problemas do Cursor IDE
 * Execute: node corrigir-cursor.js
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('🔧 Diagnosticando e corrigindo problemas do Cursor IDE...\n');

// Função para executar comandos
function executarComando(comando, descricao) {
    return new Promise((resolve) => {
        console.log(`🔍 ${descricao}...`);
        exec(comando, (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ ${descricao}: FALHA`);
                console.log(`   Erro: ${error.message}`);
                resolve(false);
            } else {
                console.log(`✅ ${descricao}: OK`);
                if (stdout.trim()) {
                    console.log(`   Resultado: ${stdout.trim()}`);
                }
                resolve(true);
            }
        });
    });
}

// Função para verificar conectividade
async function verificarConectividade() {
    console.log('🌐 Verificando conectividade...\n');
    
    await executarComando('ping -n 4 google.com', 'Ping para Google');
    await executarComando('ping -n 4 cursor.sh', 'Ping para Cursor.sh');
    await executarComando('nslookup cursor.sh', 'Resolução DNS Cursor');
}

// Função para verificar processos do Cursor
async function verificarProcessosCursor() {
    console.log('\n🖥️ Verificando processos do Cursor...\n');
    
    await executarComando('tasklist | findstr -i cursor', 'Processos Cursor ativos');
    await executarComando('netstat -an | findstr :3000', 'Porta 3000 (seu projeto)');
}

// Função para limpar cache do Cursor (Windows)
async function limparCacheCursor() {
    console.log('\n🧹 Limpar cache do Cursor...\n');
    
    const userProfile = os.homedir();
    const cursorPaths = [
        path.join(userProfile, 'AppData', 'Roaming', 'Cursor'),
        path.join(userProfile, 'AppData', 'Local', 'Cursor'),
        path.join(userProfile, 'AppData', 'Roaming', 'Cursor', 'User', 'workspaceStorage'),
        path.join(userProfile, 'AppData', 'Roaming', 'Cursor', 'logs'),
        path.join(userProfile, 'AppData', 'Roaming', 'Cursor', 'CachedData')
    ];
    
    for (const cursorPath of cursorPaths) {
        if (fs.existsSync(cursorPath)) {
            console.log(`📁 Encontrado: ${cursorPath}`);
            try {
                // Listar arquivos para ver o que tem
                const files = fs.readdirSync(cursorPath);
                console.log(`   Arquivos: ${files.length} itens`);
            } catch (error) {
                console.log(`   Erro ao acessar: ${error.message}`);
            }
        } else {
            console.log(`❌ Não encontrado: ${cursorPath}`);
        }
    }
}

// Função para verificar configurações de rede
async function verificarConfiguracoesRede() {
    console.log('\n⚙️ Verificando configurações de rede...\n');
    
    await executarComando('ipconfig /all | findstr DNS', 'Configurações DNS');
    await executarComando('netsh winhttp show proxy', 'Configurações de Proxy');
}

// Função para sugerir soluções
function sugerirSolucoes() {
    console.log('\n🎯 SOLUÇÕES RECOMENDADAS:\n');
    
    console.log('1. 🔄 REINICIAR CURSOR COMPLETAMENTE');
    console.log('   - Feche todas as janelas do Cursor');
    console.log('   - Abra o Gerenciador de Tarefas (Ctrl+Shift+Esc)');
    console.log('   - Finalize todos os processos "Cursor"');
    console.log('   - Abra o Cursor novamente');
    
    console.log('\n2. 🌐 VERIFICAR CONECTIVIDADE');
    console.log('   - Desabilite VPN temporariamente');
    console.log('   - Teste com hotspot móvel');
    console.log('   - Verifique se firewall não está bloqueando');
    
    console.log('\n3. 🧹 LIMPAR CACHE DO CURSOR');
    console.log('   - Pressione Ctrl+Shift+P');
    console.log('   - Digite: "Developer: Reload Window"');
    console.log('   - Ou: "Developer: Restart Extension Host"');
    
    console.log('\n4. 🔧 RESETAR CONFIGURAÇÕES');
    console.log('   - Backup das configurações importantes');
    console.log('   - Resetar configurações do Cursor');
    console.log('   - Reconfigurar preferências');
    
    console.log('\n5. 📱 USAR VERSÃO WEB (EMERGÊNCIA)');
    console.log('   - Acesse cursor.sh no navegador');
    console.log('   - Funcionalidade similar');
    console.log('   - Pode contornar problemas locais');
}

// Função para verificar logs de erro
function verificarLogs() {
    console.log('\n📋 Verificando logs de erro...\n');
    
    const userProfile = os.homedir();
    const logPath = path.join(userProfile, 'AppData', 'Roaming', 'Cursor', 'logs');
    
    if (fs.existsSync(logPath)) {
        console.log(`📁 Diretório de logs: ${logPath}`);
        
        try {
            const files = fs.readdirSync(logPath);
            console.log(`   Arquivos de log: ${files.length}`);
            
            // Procurar por arquivos de erro recentes
            const errorFiles = files.filter(file => 
                file.includes('error') || 
                file.includes('main') || 
                file.includes('renderer')
            );
            
            if (errorFiles.length > 0) {
                console.log('   Arquivos de erro encontrados:');
                errorFiles.forEach(file => {
                    console.log(`   - ${file}`);
                });
            }
        } catch (error) {
            console.log(`   Erro ao acessar logs: ${error.message}`);
        }
    } else {
        console.log('❌ Diretório de logs não encontrado');
    }
}

// Função principal
async function main() {
    console.log('🚀 Iniciando diagnóstico do Cursor IDE...\n');
    
    await verificarConectividade();
    await verificarProcessosCursor();
    await limparCacheCursor();
    await verificarConfiguracoesRede();
    verificarLogs();
    sugerirSolucoes();
    
    console.log('\n✨ Diagnóstico concluído!');
    console.log('\n💡 DICA: O erro geralmente se resolve com um simples reinício do Cursor!');
}

// Executar diagnóstico
main().catch(console.error);

