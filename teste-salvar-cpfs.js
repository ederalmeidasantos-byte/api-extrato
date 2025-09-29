import fs from 'fs';
import { promisify } from 'util';

const fsp = {
  writeFile: promisify(fs.writeFile),
  readFile: promisify(fs.readFile)
};

// Simular a função salvarCPFsAnexados
async function salvarCPFsAnexados(cpfs, metadata = {}) {
  try {
    const CPFS_CACHE_FILE = '/var/data/cache/cpfs-anexados.json';
    
    const cacheData = {
      timestamp: new Date().toISOString(),
      totalCPFs: cpfs.length,
      metadata: {
        fileName: metadata.fileName || 'unknown',
        uploadTime: metadata.uploadTime || new Date().toISOString(),
        ...metadata
      },
      cpfs: cpfs.map((cpf, index) => ({
        id: `cpf_${index + 1}`,
        cpf: cpf.CPF || cpf.cpf || cpf,
        linha: index + 1,
        status: 'pendente',
        processado: false,
        resultado: null,
        tentativas: 0,
        ultimaTentativa: null
      }))
    };

    await fsp.writeFile(CPFS_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Cache de CPFs salvo: ${cpfs.length} CPFs em ${CPFS_CACHE_FILE}`);
    
    return cacheData;
  } catch (error) {
    console.error('❌ Erro ao salvar cache de CPFs:', error);
    throw error;
  }
}

console.log('🧪 ===== TESTE DE SALVAMENTO DE CPFs =====');

// Simular uma lista de CPFs
const cpfsTeste = [
  { CPF: "11111111111", ID: "ID001", TELEFONE: "11999999999" },
  { CPF: "22222222222", ID: "ID002", TELEFONE: "11888888888" },
  { CPF: "33333333333", ID: "ID003", TELEFONE: "11777777777" }
];

try {
  const resultado = await salvarCPFsAnexados(cpfsTeste, {
    fileName: 'teste-planilha.csv',
    uploadTime: new Date().toISOString(),
    totalRegistros: cpfsTeste.length
  });
  
  console.log(`✅ Teste concluído com sucesso!`);
  console.log(`📊 Total salvo: ${resultado.totalCPFs} CPFs`);
  
  // Verificar se o arquivo foi criado
  const CPFS_CACHE_FILE = '/var/data/cache/cpfs-anexados.json';
  if (fs.existsSync(CPFS_CACHE_FILE)) {
    console.log(`✅ Arquivo criado: ${CPFS_CACHE_FILE}`);
    const conteudo = JSON.parse(await fsp.readFile(CPFS_CACHE_FILE, 'utf8'));
    console.log(`📋 Conteúdo verificado: ${conteudo.totalCPFs} CPFs`);
  } else {
    console.log(`❌ Arquivo não foi criado!`);
  }
  
} catch (error) {
  console.error('❌ Erro no teste:', error);
}

console.log('\n✅ ===== TESTE CONCLUÍDO =====');
