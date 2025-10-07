import fs from 'fs';

console.log('🔍 ===== VERIFICANDO CONFIGURAÇÃO DE UPLOAD =====');

// Verificar se o diretório de uploads existe e tem permissões
const UPLOADS_DIR = '/var/data/uploads';

console.log(`📁 Verificando diretório de uploads: ${UPLOADS_DIR}`);

if (fs.existsSync(UPLOADS_DIR)) {
  console.log(`✅ Diretório existe: ${UPLOADS_DIR}`);
  
  // Verificar permissões
  try {
    const stats = fs.statSync(UPLOADS_DIR);
    console.log(`📊 Permissões do diretório:`, {
      mode: stats.mode.toString(8),
      uid: stats.uid,
      gid: stats.gid
    });
    
    // Tentar criar um arquivo de teste
    const testFile = `${UPLOADS_DIR}/teste.txt`;
    fs.writeFileSync(testFile, 'teste');
    console.log(`✅ Arquivo de teste criado: ${testFile}`);
    
    // Verificar se o arquivo foi criado
    if (fs.existsSync(testFile)) {
      console.log(`✅ Arquivo de teste existe: ${testFile}`);
      fs.unlinkSync(testFile);
      console.log(`🗑️ Arquivo de teste removido`);
    }
    
  } catch (error) {
    console.log(`❌ Erro ao verificar permissões:`, error.message);
  }
} else {
  console.log(`❌ Diretório não existe: ${UPLOADS_DIR}`);
}

// Verificar se há algum arquivo de log ou erro
console.log(`\n📁 Verificando logs:`);
const LOGS_DIR = '/var/data/logs';

if (fs.existsSync(LOGS_DIR)) {
  try {
    const arquivos = fs.readdirSync(LOGS_DIR);
    console.log(`📊 Arquivos de log: ${arquivos.length}`);
    if (arquivos.length > 0) {
      arquivos.forEach(arquivo => {
        const stats = fs.statSync(`${LOGS_DIR}/${arquivo}`);
        console.log(`   - ${arquivo} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
      });
    }
  } catch (error) {
    console.log(`❌ Erro ao listar logs:`, error.message);
  }
} else {
  console.log(`❌ Diretório de logs não existe: ${LOGS_DIR}`);
}

console.log('\n✅ ===== VERIFICAÇÃO CONCLUÍDA =====');
