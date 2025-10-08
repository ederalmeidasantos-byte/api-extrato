/**
 * Script para migrar clientes existentes para IDs sequenciais
 * Converte IDs baseados em timestamp para sequenciais (1, 2, 3...)
 */

const fs = require('fs');
const path = require('path');

async function migrarClientesParaIdsSequenciais() {
    console.log('🔄 Iniciando migração de IDs para sequenciais...');
    
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    
    if (!fs.existsSync(clientesPath)) {
        console.log('❌ Diretório de clientes não encontrado:', clientesPath);
        return;
    }
    
    // Listar todos os arquivos de clientes
    const arquivos = fs.readdirSync(clientesPath).filter(arquivo => arquivo.endsWith('.json'));
    console.log(`📁 Encontrados ${arquivos.length} arquivos de clientes`);
    
    if (arquivos.length === 0) {
        console.log('✅ Nenhum cliente para migrar');
        return;
    }
    
    // Ler todos os clientes
    const clientes = [];
    for (const arquivo of arquivos) {
        try {
            const dados = JSON.parse(fs.readFileSync(path.join(clientesPath, arquivo), 'utf8'));
            clientes.push({
                arquivo,
                dados,
                timestamp: fs.statSync(path.join(clientesPath, arquivo)).mtime.getTime()
            });
        } catch (error) {
            console.error(`❌ Erro ao ler arquivo ${arquivo}:`, error.message);
        }
    }
    
    // Ordenar por data de criação (mais antigo primeiro)
    clientes.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log('📋 Clientes encontrados (ordenados por criação):');
    clientes.forEach((cliente, index) => {
        console.log(`  ${index + 1}. ${cliente.arquivo} -> ID: ${cliente.dados.id}`);
    });
    
    // Criar backup dos arquivos originais
    const backupPath = path.join(__dirname, 'var/data/clientes/backup-ids-antigos');
    if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
    }
    
    console.log('💾 Criando backup dos arquivos originais...');
    for (const cliente of clientes) {
        const backupFile = path.join(backupPath, cliente.arquivo);
        fs.copyFileSync(path.join(clientesPath, cliente.arquivo), backupFile);
    }
    
    // Migrar para IDs sequenciais
    console.log('🔄 Migrando para IDs sequenciais...');
    for (let i = 0; i < clientes.length; i++) {
        const cliente = clientes[i];
        const novoId = (i + 1).toString();
        const idAntigo = cliente.dados.id;
        
        // Atualizar ID no objeto
        cliente.dados.id = novoId;
        
        // Salvar com novo nome de arquivo
        const novoArquivo = `${novoId}.json`;
        const novoCaminho = path.join(clientesPath, novoArquivo);
        
        fs.writeFileSync(novoCaminho, JSON.stringify(cliente.dados, null, 2));
        
        // Remover arquivo antigo
        fs.unlinkSync(path.join(clientesPath, cliente.arquivo));
        
        console.log(`✅ Cliente migrado: ${cliente.arquivo} (${idAntigo}) -> ${novoArquivo} (${novoId})`);
    }
    
    console.log('🎉 Migração concluída com sucesso!');
    console.log(`📊 Total de clientes migrados: ${clientes.length}`);
    console.log(`💾 Backup salvo em: ${backupPath}`);
    
    // Verificar resultado
    const arquivosFinais = fs.readdirSync(clientesPath).filter(arquivo => arquivo.endsWith('.json'));
    console.log('📋 IDs finais:');
    arquivosFinais.forEach(arquivo => {
        const id = arquivo.replace('.json', '');
        console.log(`  - ${id}`);
    });
}

// Executar migração
if (require.main === module) {
    migrarClientesParaIdsSequenciais().catch(console.error);
}

module.exports = { migrarClientesParaIdsSequenciais };
