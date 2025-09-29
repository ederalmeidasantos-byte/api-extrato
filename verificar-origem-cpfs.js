import fs from 'fs';

console.log('🔍 ===== VERIFICANDO ORIGEM DOS CPFs =====');

// Verificar todos os arquivos no cache
const CACHE_DIR = '/var/data/cache';

console.log(`📁 Verificando diretório de cache: ${CACHE_DIR}`);

if (fs.existsSync(CACHE_DIR)) {
  try {
    const arquivos = fs.readdirSync(CACHE_DIR);
    console.log(`📊 Arquivos encontrados no cache: ${arquivos.length}`);
    
    if (arquivos.length > 0) {
      console.log(`📋 Lista de arquivos:`);
      arquivos.forEach((arquivo, i) => {
        const caminhoCompleto = `${CACHE_DIR}/${arquivo}`;
        const stats = fs.statSync(caminhoCompleto);
        const tipo = stats.isDirectory() ? '📁' : '📄';
        console.log(`   ${i + 1}. ${tipo} ${arquivo} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
      });
      
      // Verificar arquivos importantes
      const arquivosImportantes = ['pendentes.json', 'listas-resultados.json', 'tentativas-cache.json'];
      
      for (const arquivo of arquivosImportantes) {
        const caminho = `${CACHE_DIR}/${arquivo}`;
        if (fs.existsSync(caminho)) {
          console.log(`\n📄 Verificando ${arquivo}:`);
          try {
            const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf8'));
            
            if (arquivo === 'pendentes.json') {
              console.log(`   - Total de pendentes: ${conteudo.total || 0}`);
              if (conteudo.pendentes && conteudo.pendentes.length > 0) {
                console.log(`   - Primeiros 3 pendentes:`, conteudo.pendentes.slice(0, 3).map(p => p.cpf || p));
              }
            } else if (arquivo === 'listas-resultados.json') {
              console.log(`   - Sucessos: ${conteudo.sucessos?.length || 0}`);
              console.log(`   - Pendentes: ${conteudo.pendentes?.length || 0}`);
              console.log(`   - Não Autorizados: ${conteudo.naoAutorizados?.length || 0}`);
              console.log(`   - Descartados: ${conteudo.descartados?.length || 0}`);
              console.log(`   - Agendados: ${conteudo.agendados?.length || 0}`);
            } else if (arquivo === 'tentativas-cache.json') {
              console.log(`   - Total de tentativas: ${Object.keys(conteudo).length}`);
              const cpfs = Object.keys(conteudo).slice(0, 3);
              console.log(`   - Primeiros 3 CPFs com tentativas:`, cpfs);
            }
          } catch (error) {
            console.log(`   ❌ Erro ao ler ${arquivo}:`, error.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Erro ao listar arquivos:`, error.message);
  }
} else {
  console.log(`❌ Diretório de cache não existe: ${CACHE_DIR}`);
}

console.log('\n✅ ===== VERIFICAÇÃO CONCLUÍDA =====');
