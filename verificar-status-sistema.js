import fs from 'fs';

console.log('🔍 ===== VERIFICANDO STATUS DO SISTEMA =====');

// Verificar se há algum arquivo de estado ou log
const CACHE_DIR = '/var/data/cache';
const UPLOADS_DIR = '/var/data/uploads';

console.log(`📁 Verificando diretório de cache: ${CACHE_DIR}`);
if (fs.existsSync(CACHE_DIR)) {
  const arquivos = fs.readdirSync(CACHE_DIR);
  console.log(`📊 Arquivos no cache: ${arquivos.length}`);
  arquivos.forEach(arquivo => {
    const stats = fs.statSync(`${CACHE_DIR}/${arquivo}`);
    console.log(`   - ${arquivo} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
  });
}

console.log(`\n📁 Verificando diretório de uploads: ${UPLOADS_DIR}`);
if (fs.existsSync(UPLOADS_DIR)) {
  const arquivos = fs.readdirSync(UPLOADS_DIR);
  console.log(`📊 Arquivos no uploads: ${arquivos.length}`);
  if (arquivos.length > 0) {
    arquivos.forEach(arquivo => {
      const stats = fs.statSync(`${UPLOADS_DIR}/${arquivo}`);
      console.log(`   - ${arquivo} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
    });
  } else {
    console.log(`   ❌ Nenhum arquivo encontrado`);
  }
}

// Verificar se há algum arquivo temporário ou de processamento
console.log(`\n📁 Verificando arquivos temporários:`);
const tempFiles = ['/tmp', '/var/tmp'];
for (const tempDir of tempFiles) {
  if (fs.existsSync(tempDir)) {
    try {
      const arquivos = fs.readdirSync(tempDir);
      const csvFiles = arquivos.filter(arquivo => arquivo.endsWith('.csv'));
      if (csvFiles.length > 0) {
        console.log(`   📄 Arquivos CSV em ${tempDir}:`, csvFiles);
      }
    } catch (error) {
      // Ignorar erros de permissão
    }
  }
}

console.log('\n✅ ===== VERIFICAÇÃO CONCLUÍDA =====');
