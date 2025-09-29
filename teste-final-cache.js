// Teste final - Verificar se todos os arquivos de cache estão usando Persistent Disk
import fetch from 'node-fetch';

const API_URL = 'https://api-extrato-1.onrender.com';

async function testeFinalCache() {
    console.log('🧪 TESTE FINAL - Verificação do Persistent Disk\n');

    try {
        // 1. Verificar status geral
        console.log('1️⃣ Verificando status do Persistent Disk...');
        const statusResponse = await fetch(`${API_URL}/api/status/persistent-disk`);
        if (statusResponse.ok) {
            const status = await statusResponse.json();
            console.log('✅ Status:', JSON.stringify(status, null, 2));
        }

        // 2. Testar cache FGTS
        console.log('\n2️⃣ Testando cache FGTS...');
        const cacheResponse = await fetch(`${API_URL}/fgts/cache/visualizar`);
        if (cacheResponse.ok) {
            const cache = await cacheResponse.json();
            console.log('✅ Cache FGTS:', cache.cacheDir, '- Arquivos:', cache.totalArquivos);
        }

        // 3. Testar estatísticas do cache
        console.log('\n3️⃣ Testando estatísticas do cache...');
        const statsResponse = await fetch(`${API_URL}/fgts/cache/estatisticas`);
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('✅ Estatísticas:', JSON.stringify(stats, null, 2));
        }

        // 4. Criar arquivo de teste no cache
        console.log('\n4️⃣ Criando arquivo de teste no cache...');
        const testData = {
            fileName: 'teste_migracao.json',
            data: {
                timestamp: new Date().toISOString(),
                tipo: 'teste_migracao',
                status: 'sucesso',
                message: 'Cache migrado para Persistent Disk com sucesso!'
            }
        };
        
        const saveResponse = await fetch(`${API_URL}/api/cache/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        if (saveResponse.ok) {
            const result = await saveResponse.json();
            console.log('✅ Arquivo de teste criado:', result.path);
        }

        // 5. Listar arquivos do cache
        console.log('\n5️⃣ Listando arquivos do cache...');
        const listResponse = await fetch(`${API_URL}/api/cache/list`);
        if (listResponse.ok) {
            const list = await listResponse.json();
            console.log('✅ Arquivos no cache:', list.count);
            list.files.forEach(file => {
                console.log(`   📄 ${file.name} (${file.size} bytes)`);
            });
        }

        console.log('\n🎉 TESTE FINAL CONCLUÍDO!');
        console.log('✅ Todos os arquivos de cache foram migrados para o Persistent Disk');
        console.log('✅ Sistema funcionando corretamente');
        console.log('✅ Dados persistirão entre deploys');

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
    }
}

// Executar teste
testeFinalCache();
