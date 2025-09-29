import fs from 'fs';
import { parse } from 'csv-parse/sync';

console.log('🧪 ===== TESTE DE UPLOAD DE CSV =====');

// Simular um CSV com CPFs
const csvContent = `CPF;ID;TELEFONE
11111111111;ID001;11999999999
22222222222;ID002;11888888888
33333333333;ID003;11777777777
44444444444;ID004;11666666666
55555555555;ID005;11555555555`;

console.log('📄 Simulando CSV:');
console.log(csvContent);

// Parsear o CSV
const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });

console.log(`📊 Total de registros parseados: ${registros.length}`);
console.log('📋 Primeiros 3 registros:');
registros.slice(0, 3).forEach((reg, i) => {
  console.log(`   ${i + 1}. CPF: ${reg.CPF}, ID: ${reg.ID}, TELEFONE: ${reg.TELEFONE}`);
});

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

    await fs.promises.writeFile(CPFS_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Cache de CPFs salvo: ${cpfs.length} CPFs em ${CPFS_CACHE_FILE}`);
    
    return cacheData;
  } catch (error) {
    console.error('❌ Erro ao salvar cache de CPFs:', error);
    throw error;
  }
}

try {
  // Salvar lista completa
  const cacheData = await salvarCPFsAnexados(registros, {
    fileName: 'teste-planilha-60mil.csv',
    uploadTime: new Date().toISOString(),
    totalRegistros: registros.length
  });
  
  console.log(`✅ Lista salva com sucesso!`);
  console.log(`📊 Total: ${cacheData.totalCPFs} CPFs`);
  console.log(`📄 Arquivo: ${cacheData.metadata.fileName}`);
  
} catch (error) {
  console.error('❌ Erro no teste:', error);
}

console.log('\n✅ ===== TESTE CONCLUÍDO =====');
