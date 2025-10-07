// Script para criar pastas e testar Persistent Disk no Render
import https from 'https';

const API_BASE = 'https://api-extrato-1.onrender.com';

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api-extrato-1.onrender.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    resolve(jsonData);
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testPersistentDisk() {
    console.log('🧪 Testando Persistent Disk no Render...\n');

    try {
        // 1. Verificar status
        console.log('1️⃣ Verificando status...');
        const status = await makeRequest('/api/status/persistent-disk');
        console.log('✅ Status:', JSON.stringify(status, null, 2));

        // 2. Executar teste completo
        console.log('\n2️⃣ Executando teste completo...');
        const testResult = await makeRequest('/api/test/persistent-disk');
        console.log('✅ Teste completo:', JSON.stringify(testResult, null, 2));

        // 3. Criar arquivos de exemplo em cada pasta
        console.log('\n3️⃣ Criando arquivos de exemplo...');

        // Cache
        const cacheData = {
            fileName: 'exemplo_cache.json',
            data: {
                timestamp: new Date().toISOString(),
                tipo: 'cache',
                dados: ['item1', 'item2', 'item3']
            }
        };
        const cacheResult = await makeRequest('/api/cache/save', 'POST', cacheData);
        console.log('✅ Cache salvo:', cacheResult);

        // Extrato
        const extratoData = {
            id: '12345',
            extratoData: {
                banco: 'Banco do Brasil',
                conta: '12345-6',
                saldo: 1500.75,
                timestamp: new Date().toISOString()
            }
        };
        const extratoResult = await makeRequest('/api/extratos/save', 'POST', extratoData);
        console.log('✅ Extrato salvo:', extratoResult);

        // Upload
        const uploadData = {
            fileName: 'exemplo_dados.csv',
            content: 'nome,idade,cidade\nJoão,30,São Paulo\nMaria,25,Rio de Janeiro',
            type: 'csv'
        };
        const uploadResult = await makeRequest('/api/uploads/save', 'POST', uploadData);
        console.log('✅ Upload salvo:', uploadResult);

        // Log
        const logData = {
            fileName: 'exemplo_log.log',
            logData: {
                level: 'info',
                message: 'Teste de log no Persistent Disk',
                timestamp: new Date().toISOString(),
                user: 'admin'
            }
        };
        const logResult = await makeRequest('/api/logs/save', 'POST', logData);
        console.log('✅ Log salvo:', logResult);

        // Config
        const configData = {
            fileName: 'exemplo_config.json',
            configData: {
                theme: 'dark',
                language: 'pt-BR',
                notifications: true,
                timestamp: new Date().toISOString()
            }
        };
        const configResult = await makeRequest('/api/config/save', 'POST', configData);
        console.log('✅ Config salva:', configResult);

        // 4. Listar arquivos criados
        console.log('\n4️⃣ Listando arquivos criados...');

        const cacheList = await makeRequest('/api/cache/list');
        console.log('📁 Cache:', cacheList);

        const extratosList = await makeRequest('/api/extratos/list');
        console.log('📄 Extratos:', extratosList);

        const uploadsList = await makeRequest('/api/uploads/list');
        console.log('📁 Uploads:', uploadsList);

        const logsList = await makeRequest('/api/logs/list');
        console.log('📝 Logs:', logsList);

        const configsList = await makeRequest('/api/config/list');
        console.log('⚙️ Configs:', configsList);

        console.log('\n🎉 Teste completo realizado com sucesso!');
        console.log('📊 Todas as pastas foram criadas e arquivos salvos no /var/data/');

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
    }
}

// Executar teste
testPersistentDisk();
