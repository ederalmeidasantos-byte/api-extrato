// Script para verificar clientes duplicados
const https = require('https');

console.log('🔍 Verificando clientes duplicados...');

const options = {
    hostname: 'lunasdigital.com.br',
    port: 443,
    path: '/api/sincronizar-clientes',
    method: 'GET'
};

const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            const clientes = response.clientes || [];
            
            console.log(`📊 Total de clientes: ${clientes.length}`);
            
            // Buscar Nelsons
            const nelsons = clientes.filter(c => 
                c.nome && c.nome.toLowerCase().includes('nelson')
            );
            
            console.log(`\n👤 Nelsons encontrados: ${nelsons.length}`);
            nelsons.forEach((nelson, index) => {
                console.log(`${index + 1}. ID: ${nelson.id}, Nome: ${nelson.nome}, CPF: ${nelson.cpf}, NB: ${nelson.nb}`);
            });
            
            // Verificar duplicados por CPF
            const cpfGroups = {};
            clientes.forEach(cliente => {
                if (cliente.cpf) {
                    const cpf = cliente.cpf.replace(/\D/g, '');
                    if (!cpfGroups[cpf]) {
                        cpfGroups[cpf] = [];
                    }
                    cpfGroups[cpf].push(cliente);
                }
            });
            
            console.log('\n🔍 Duplicados por CPF:');
            Object.keys(cpfGroups).forEach(cpf => {
                if (cpfGroups[cpf].length > 1) {
                    console.log(`\nCPF ${cpf}: ${cpfGroups[cpf].length} clientes`);
                    cpfGroups[cpf].forEach((cliente, index) => {
                        console.log(`  ${index + 1}. ID: ${cliente.id}, Nome: ${cliente.nome}, NB: ${cliente.nb}`);
                    });
                }
            });
            
            // Verificar duplicados por NB
            const nbGroups = {};
            clientes.forEach(cliente => {
                if (cliente.nb) {
                    const nb = cliente.nb.toString();
                    if (!nbGroups[nb]) {
                        nbGroups[nb] = [];
                    }
                    nbGroups[nb].push(cliente);
                }
            });
            
            console.log('\n🔍 Duplicados por NB:');
            Object.keys(nbGroups).forEach(nb => {
                if (nbGroups[nb].length > 1) {
                    console.log(`\nNB ${nb}: ${nbGroups[nb].length} clientes`);
                    nbGroups[nb].forEach((cliente, index) => {
                        console.log(`  ${index + 1}. ID: ${cliente.id}, Nome: ${cliente.nome}, CPF: ${cliente.cpf}`);
                    });
                }
            });
            
        } catch (error) {
            console.error('❌ Erro ao processar dados:', error);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Erro na requisição:', error);
});

req.end();
