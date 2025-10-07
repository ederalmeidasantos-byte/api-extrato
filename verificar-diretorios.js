import fs from 'fs';

console.log('🔍 ===== VERIFICANDO ESTRUTURA DE DIRETÓRIOS =====');

// Verificar diretório principal
const PERSISTENT_PATH = '/var/data';

console.log(`📁 Verificando diretório principal: ${PERSISTENT_PATH}`);

if (fs.existsSync(PERSISTENT_PATH)) {
  console.log(`✅ Diretório principal existe: ${PERSISTENT_PATH}`);
  
  try {
    const subdirs = fs.readdirSync(PERSISTENT_PATH);
    console.log(`📊 Subdiretórios encontrados: ${subdirs.length}`);
    
    if (subdirs.length > 0) {
      console.log(`📋 Lista de subdiretórios:`);
      subdirs.forEach((subdir, i) => {
        const caminhoCompleto = `${PERSISTENT_PATH}/${subdir}`;
        const stats = fs.statSync(caminhoCompleto);
        const tipo = stats.isDirectory() ? '📁' : '📄';
        console.log(`   ${i + 1}. ${tipo} ${subdir} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
      });
    } else {
      console.log(`❌ Nenhum subdiretório encontrado`);
    }
    
  } catch (error) {
    console.log(`❌ Erro ao listar subdiretórios:`, error.message);
  }
} else {
  console.log(`❌ Diretório principal não existe: ${PERSISTENT_PATH}`);
  console.log(`🔧 Tentando criar diretório principal...`);
  
  try {
    fs.mkdirSync(PERSISTENT_PATH, { recursive: true });
    console.log(`✅ Diretório principal criado: ${PERSISTENT_PATH}`);
  } catch (error) {
    console.log(`❌ Erro ao criar diretório principal:`, error.message);
  }
}

// Verificar diretórios específicos
const DIRS = ['cache', 'uploads', 'extratos', 'logs', 'config'];

console.log(`\n📁 Verificando diretórios específicos:`);

for (const dir of DIRS) {
  const caminho = `${PERSISTENT_PATH}/${dir}`;
  
  if (fs.existsSync(caminho)) {
    console.log(`✅ ${dir}: ${caminho}`);
  } else {
    console.log(`❌ ${dir}: ${caminho} (não existe)`);
    
    try {
      fs.mkdirSync(caminho, { recursive: true });
      console.log(`🔧 ${dir}: criado com sucesso`);
    } catch (error) {
      console.log(`❌ ${dir}: erro ao criar - ${error.message}`);
    }
  }
}

console.log('\n✅ ===== VERIFICAÇÃO CONCLUÍDA =====');
