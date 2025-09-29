// Script para criar pastas usando rotas existentes
import fetch from 'node-fetch';

const API_URL = 'https://api-extrato-1.onrender.com';

async function criarPastasUsandoRotasExistentes() {
    console.log('🚀 Criando pastas usando rotas existentes...\n');

    try {
        // Testar conexão
        console.log('1️⃣ Testando conexão...');
        const healthResponse = await fetch(`${API_URL}/api/health`);
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('✅ Servidor funcionando:', health.message);
        }

        // Usar rota de extração para criar arquivos
        console.log('\n2️⃣ Criando arquivos usando rota /extrair...');

        // Criar um arquivo JSON de teste
        const dadosTeste = {
            timestamp: new Date().toISOString(),
            tipo: 'teste_persistent_disk',
            pastas: ['cache', 'extratos', 'uploads', 'logs', 'config'],
            status: 'criando_pastas'
        };

        // Salvar como extrato
        try {
            const extratoResponse = await fetch(`${API_URL}/extrairpdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: 'teste_persistent_disk.json',
                    content: JSON.stringify(dadosTeste, null, 2)
                })
            });
            
            if (extratoResponse.ok) {
                const result = await extratoResponse.json();
                console.log('✅ Arquivo de teste criado via /extrairpdf');
            } else {
                console.log('❌ Erro ao criar arquivo via /extrairpdf:', extratoResponse.status);
            }
        } catch (error) {
            console.log('❌ Erro:', error.message);
        }

        // Tentar usar rota de cálculo para criar cache
        try {
            const calculoResponse = await fetch(`${API_URL}/calcular/teste123`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dados: dadosTeste,
                    tipo: 'teste_cache'
                })
            });
            
            if (calculoResponse.ok) {
                const result = await calculoResponse.json();
                console.log('✅ Cache de teste criado via /calcular');
            } else {
                console.log('❌ Erro ao criar cache via /calcular:', calculoResponse.status);
            }
        } catch (error) {
            console.log('❌ Erro:', error.message);
        }

        console.log('\n📋 INSTRUÇÕES MANUAIS:');
        console.log('Como as rotas do Persistent Disk ainda não estão funcionando,');
        console.log('você precisa:');
        console.log('');
        console.log('1. Acessar o painel do Render');
        console.log('2. Verificar se o deploy foi concluído');
        console.log('3. Verificar os logs para erros');
        console.log('4. Fazer um deploy manual se necessário');
        console.log('');
        console.log('5. Após o deploy funcionar, execute:');
        console.log('   node criar-pastas.js');
        console.log('');
        console.log('6. Ou acesse diretamente:');
        console.log('   https://api-extrato-1.onrender.com/test-persistent-disk.html');

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

// Executar
criarPastasUsandoRotasExistentes();

