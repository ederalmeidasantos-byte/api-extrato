// Script para remover clientes duplicados
const fs = require('fs');
const path = require('path');

console.log('🔍 Identificando e removendo clientes duplicados...');

// Função para ler todos os clientes
function lerClientes() {
    const clientesPath = path.join(__dirname, 'var', 'data', 'clientes');
    
    if (!fs.existsSync(clientesPath)) {
        console.log('❌ Diretório de clientes não encontrado');
        return [];
    }
    
    const arquivos = fs.readdirSync(clientesPath).filter(arquivo => arquivo.endsWith('.json'));
    const clientes = [];
    
    arquivos.forEach(arquivo => {
        try {
            const dados = JSON.parse(fs.readFileSync(path.join(clientesPath, arquivo), 'utf8'));
            clientes.push({
                arquivo,
                id: dados.id,
                ...dados
            });
        } catch (error) {
            console.warn(`⚠️ Erro ao ler arquivo ${arquivo}:`, error.message);
        }
    });
    
    return clientes;
}

// Função para normalizar CPF e NB
function normalizar(cpf) {
    return cpf ? cpf.replace(/\D/g, '') : '';
}

// Função para encontrar duplicados
function encontrarDuplicados(clientes) {
    const cpfGroups = {};
    const nbGroups = {};
    const duplicados = [];
    
    clientes.forEach(cliente => {
        const cpf = normalizar(cliente.cpf || cliente.dadosCompletos?.cpf);
        const nb = normalizar(cliente.nb || cliente.dadosCompletos?.nb);
        
        if (cpf) {
            if (!cpfGroups[cpf]) {
                cpfGroups[cpf] = [];
            }
            cpfGroups[cpf].push(cliente);
        }
        
        if (nb) {
            if (!nbGroups[nb]) {
                nbGroups[nb] = [];
            }
            nbGroups[nb].push(cliente);
        }
    });
    
    // Encontrar duplicados por CPF
    Object.keys(cpfGroups).forEach(cpf => {
        if (cpfGroups[cpf].length > 1) {
            console.log(`\n🔍 Duplicados por CPF ${cpf}: ${cpfGroups[cpf].length} clientes`);
            cpfGroups[cpf].forEach((cliente, index) => {
                console.log(`  ${index + 1}. ID: ${cliente.id}, Nome: ${cliente.nome || cliente.dadosCompletos?.nome}, Arquivo: ${cliente.arquivo}`);
            });
            duplicados.push({
                tipo: 'cpf',
                valor: cpf,
                clientes: cpfGroups[cpf]
            });
        }
    });
    
    // Encontrar duplicados por NB
    Object.keys(nbGroups).forEach(nb => {
        if (nbGroups[nb].length > 1) {
            console.log(`\n🔍 Duplicados por NB ${nb}: ${nbGroups[nb].length} clientes`);
            nbGroups[nb].forEach((cliente, index) => {
                console.log(`  ${index + 1}. ID: ${cliente.id}, Nome: ${cliente.nome || cliente.dadosCompletos?.nome}, Arquivo: ${cliente.arquivo}`);
            });
            duplicados.push({
                tipo: 'nb',
                valor: nb,
                clientes: nbGroups[nb]
            });
        }
    });
    
    return duplicados;
}

// Função para escolher o melhor cliente (mais completo)
function escolherMelhorCliente(clientes) {
    return clientes.reduce((melhor, atual) => {
        const atualCompleto = calcularCompletude(atual);
        const melhorCompleto = calcularCompletude(melhor);
        
        if (atualCompleto > melhorCompleto) {
            return atual;
        } else if (atualCompleto === melhorCompleto) {
            // Se empatar, escolher o com ID menor (mais antigo)
            return parseInt(atual.id) < parseInt(melhor.id) ? atual : melhor;
        }
        return melhor;
    });
}

// Função para calcular completude do cliente
function calcularCompletude(cliente) {
    let pontos = 0;
    
    // Dados básicos
    if (cliente.nome || cliente.dadosCompletos?.nome) pontos += 10;
    if (cliente.cpf || cliente.dadosCompletos?.cpf) pontos += 10;
    if (cliente.telefone || cliente.dadosCompletos?.telefone) pontos += 5;
    if (cliente.email || cliente.dadosCompletos?.email) pontos += 5;
    if (cliente.nb || cliente.dadosCompletos?.nb) pontos += 10;
    
    // Propostas
    if (cliente.propostas && cliente.propostas.length > 0) pontos += 20;
    
    // Dados da Kentro
    if (cliente.kentroId) pontos += 15;
    if (cliente.sincronizado) pontos += 10;
    
    // Dados completos
    if (cliente.dadosCompletos) pontos += 10;
    
    return pontos;
}

// Função para remover duplicados
function removerDuplicados(duplicados) {
    const clientesPath = path.join(__dirname, 'var', 'data', 'clientes');
    const removidos = [];
    
    duplicados.forEach(grupo => {
        console.log(`\n🔄 Processando duplicados por ${grupo.tipo} ${grupo.valor}...`);
        
        const melhor = escolherMelhorCliente(grupo.clientes);
        const paraRemover = grupo.clientes.filter(c => c.id !== melhor.id);
        
        console.log(`✅ Mantendo cliente ID ${melhor.id} (${melhor.nome || melhor.dadosCompletos?.nome})`);
        
        paraRemover.forEach(cliente => {
            try {
                const arquivoPath = path.join(clientesPath, cliente.arquivo);
                fs.unlinkSync(arquivoPath);
                removidos.push({
                    id: cliente.id,
                    nome: cliente.nome || cliente.dadosCompletos?.nome,
                    arquivo: cliente.arquivo,
                    motivo: `Duplicado por ${grupo.tipo}`
                });
                console.log(`🗑️ Removido: ID ${cliente.id} (${cliente.nome || cliente.dadosCompletos?.nome})`);
            } catch (error) {
                console.error(`❌ Erro ao remover ${cliente.arquivo}:`, error.message);
            }
        });
    });
    
    return removidos;
}

// Executar script
try {
    console.log('📂 Lendo clientes...');
    const clientes = lerClientes();
    console.log(`📊 Total de clientes encontrados: ${clientes.length}`);
    
    if (clientes.length === 0) {
        console.log('⚠️ Nenhum cliente encontrado');
        process.exit(0);
    }
    
    console.log('\n🔍 Procurando duplicados...');
    const duplicados = encontrarDuplicados(clientes);
    
    if (duplicados.length === 0) {
        console.log('✅ Nenhum duplicado encontrado!');
        process.exit(0);
    }
    
    console.log(`\n📋 Total de grupos duplicados: ${duplicados.length}`);
    
    // Mostrar resumo antes de remover
    const totalParaRemover = duplicados.reduce((sum, grupo) => sum + grupo.clientes.length - 1, 0);
    console.log(`\n⚠️ ATENÇÃO: ${totalParaRemover} clientes serão removidos!`);
    
    // Remover duplicados
    console.log('\n🗑️ Removendo duplicados...');
    const removidos = removerDuplicados(duplicados);
    
    console.log(`\n✅ Processo concluído!`);
    console.log(`📊 Clientes removidos: ${removidos.length}`);
    
    if (removidos.length > 0) {
        console.log('\n📋 Resumo dos removidos:');
        removidos.forEach((cliente, index) => {
            console.log(`${index + 1}. ID ${cliente.id}: ${cliente.nome} (${cliente.motivo})`);
        });
    }
    
} catch (error) {
    console.error('❌ Erro no script:', error);
    process.exit(1);
}

