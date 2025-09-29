// Script simples para criar pastas no Persistent Disk
import fetch from 'node-fetch';

const API_URL = 'https://api-extrato-1.onrender.com';

async function criarPastasPersistentDisk() {
    console.log('🚀 Criando pastas no Persistent Disk...\n');

    try {
        // Testar se o servidor está funcionando
        console.log('1️⃣ Testando conexão...');
        const healthResponse = await fetch(`${API_URL}/api/health`);
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('✅ Servidor funcionando:', health.message);
        } else {
            console.log('❌ Servidor não está respondendo');
            return;
        }

        // Tentar criar arquivos de teste em cada pasta
        console.log('\n2️⃣ Criando arquivos de teste...');

        // Cache
        try {
            const cacheData = {
                fileName: 'teste_cache.json',
                data: {
                    timestamp: new Date().toISOString(),
                    tipo: 'cache',
                    status: 'teste'
                }
            };
            
            const cacheResponse = await fetch(`${API_URL}/api/cache/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cacheData)
            });
            
            if (cacheResponse.ok) {
                const result = await cacheResponse.json();
                console.log('✅ Cache criado:', result.fileName);
            } else {
                console.log('❌ Erro ao criar cache:', cacheResponse.status);
            }
        } catch (error) {
            console.log('❌ Erro no cache:', error.message);
        }

        // Extrato
        try {
            const extratoData = {
                id: 'teste123',
                extratoData: {
                    banco: 'Teste',
                    conta: '12345-6',
                    saldo: 1000,
                    timestamp: new Date().toISOString()
                }
            };
            
            const extratoResponse = await fetch(`${API_URL}/api/extratos/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(extratoData)
            });
            
            if (extratoResponse.ok) {
                const result = await extratoResponse.json();
                console.log('✅ Extrato criado:', result.fileName);
            } else {
                console.log('❌ Erro ao criar extrato:', extratoResponse.status);
            }
        } catch (error) {
            console.log('❌ Erro no extrato:', error.message);
        }

        // Upload
        try {
            const uploadData = {
                fileName: 'teste_upload.csv',
                content: 'nome,idade\nJoão,30\nMaria,25',
                type: 'csv'
            };
            
            const uploadResponse = await fetch(`${API_URL}/api/uploads/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadData)
            });
            
            if (uploadResponse.ok) {
                const result = await uploadResponse.json();
                console.log('✅ Upload criado:', result.fileName);
            } else {
                console.log('❌ Erro ao criar upload:', uploadResponse.status);
            }
        } catch (error) {
            console.log('❌ Erro no upload:', error.message);
        }

        // Log
        try {
            const logData = {
                fileName: 'teste_log.log',
                logData: {
                    level: 'info',
                    message: 'Teste de log',
                    timestamp: new Date().toISOString()
                }
            };
            
            const logResponse = await fetch(`${API_URL}/api/logs/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData)
            });
            
            if (logResponse.ok) {
                const result = await logResponse.json();
                console.log('✅ Log criado:', result.fileName);
            } else {
                console.log('❌ Erro ao criar log:', logResponse.status);
            }
        } catch (error) {
            console.log('❌ Erro no log:', error.message);
        }

        // Config
        try {
            const configData = {
                fileName: 'teste_config.json',
                configData: {
                    theme: 'dark',
                    language: 'pt-BR',
                    timestamp: new Date().toISOString()
                }
            };
            
            const configResponse = await fetch(`${API_URL}/api/config/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData)
            });
            
            if (configResponse.ok) {
                const result = await configResponse.json();
                console.log('✅ Config criada:', result.fileName);
            } else {
                console.log('❌ Erro ao criar config:', configResponse.status);
            }
        } catch (error) {
            console.log('❌ Erro no config:', error.message);
        }

        console.log('\n🎉 Processo concluído!');
        console.log('📁 Se as rotas funcionaram, as pastas foram criadas em /var/data/');

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

// Executar
criarPastasPersistentDisk();

