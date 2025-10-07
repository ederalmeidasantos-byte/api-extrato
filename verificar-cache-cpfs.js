import fs from 'fs';

console.log('🔍 ===== VERIFICANDO CACHE DE CPFs =====');

// Verificar arquivo de CPFs anexados
const CPFS_CACHE_FILE = '/var/data/cache/cpfs-anexados.json';

console.log(`📁 Verificando arquivo: ${CPFS_CACHE_FILE}`);

if (fs.existsSync(CPFS_CACHE_FILE)) {
  console.log(`✅ Arquivo existe: ${CPFS_CACHE_FILE}`);
  
  try {
    const conteudo = JSON.parse(fs.readFileSync(CPFS_CACHE_FILE, 'utf8'));
    console.log(`📊 Dados encontrados:`);
    console.log(`   - Total de CPFs: ${conteudo.totalCPFs}`);
    console.log(`   - Arquivo original: ${conteudo.metadata?.fileName}`);
    console.log(`   - Upload em: ${conteudo.metadata?.uploadTime}`);
    console.log(`   - Timestamp: ${conteudo.timestamp}`);
    
    if (conteudo.cpfs && conteudo.cpfs.length > 0) {
      console.log(`📋 Primeiros 5 CPFs:`);
      conteudo.cpfs.slice(0, 5).forEach((cpf, i) => {
        console.log(`   ${i + 1}. CPF: ${cpf.cpf}, ID: ${cpf.id}, Linha: ${cpf.linha}, Status: ${cpf.status}`);
      });
      
      console.log(`📋 Últimos 5 CPFs:`);
      conteudo.cpfs.slice(-5).forEach((cpf, i) => {
        const index = conteudo.cpfs.length - 5 + i + 1;
        console.log(`   ${index}. CPF: ${cpf.cpf}, ID: ${cpf.id}, Linha: ${cpf.linha}, Status: ${cpf.status}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Erro ao ler arquivo:`, error.message);
  }
} else {
  console.log(`❌ Arquivo não existe: ${CPFS_CACHE_FILE}`);
}

// Verificar arquivo de pendentes
const PENDENTES_FILE = '/var/data/cache/pendentes.json';

console.log(`\n📁 Verificando arquivo de pendentes: ${PENDENTES_FILE}`);

if (fs.existsSync(PENDENTES_FILE)) {
  console.log(`✅ Arquivo de pendentes existe`);
  
  try {
    const conteudo = JSON.parse(fs.readFileSync(PENDENTES_FILE, 'utf8'));
    console.log(`📊 Pendentes encontrados:`);
    console.log(`   - Total: ${conteudo.total}`);
    console.log(`   - Última atualização: ${conteudo.ultimaAtualizacao}`);
    
    if (conteudo.pendentes && conteudo.pendentes.length > 0) {
      console.log(`📋 Primeiros 3 pendentes:`);
      conteudo.pendentes.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. CPF: ${p.cpf}, Linha: ${p.linha}, Motivo: ${p.motivo}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Erro ao ler pendentes:`, error.message);
  }
} else {
  console.log(`❌ Arquivo de pendentes não existe`);
}

// Verificar arquivo de estado FGTS
const ESTADO_FILE = '/var/data/cache/estado-fgts-completo.json';

console.log(`\n📁 Verificando arquivo de estado: ${ESTADO_FILE}`);

if (fs.existsSync(ESTADO_FILE)) {
  console.log(`✅ Arquivo de estado existe`);
  
  try {
    const conteudo = JSON.parse(fs.readFileSync(ESTADO_FILE, 'utf8'));
    console.log(`📊 Estado encontrado:`);
    console.log(`   - Processando: ${conteudo.processando}`);
    console.log(`   - Total: ${conteudo.total}`);
    console.log(`   - Processados: ${conteudo.processados}`);
    console.log(`   - Sucessos: ${conteudo.sucessos}`);
    console.log(`   - Pendentes: ${conteudo.pendentes?.length || 0}`);
    console.log(`   - Reprocessar: ${conteudo.reprocessar?.length || 0}`);
    console.log(`   - Arquivo original: ${conteudo.arquivoOriginal}`);
    
  } catch (error) {
    console.log(`❌ Erro ao ler estado:`, error.message);
  }
} else {
  console.log(`❌ Arquivo de estado não existe`);
}

console.log('\n✅ ===== VERIFICAÇÃO CONCLUÍDA =====');
