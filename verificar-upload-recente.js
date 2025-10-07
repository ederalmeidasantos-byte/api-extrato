import fs from 'fs';

console.log('🔍 ===== VERIFICANDO UPLOAD RECENTE =====');

// Verificar arquivos de upload recentes
const UPLOADS_DIR = '/var/data/uploads';

console.log(`📁 Verificando diretório de uploads: ${UPLOADS_DIR}`);

if (fs.existsSync(UPLOADS_DIR)) {
  console.log(`✅ Diretório de uploads existe`);
  
  try {
    const arquivos = fs.readdirSync(UPLOADS_DIR);
    console.log(`📊 Arquivos encontrados: ${arquivos.length}`);
    
    if (arquivos.length > 0) {
      console.log(`📋 Lista de arquivos:`);
      arquivos.forEach((arquivo, i) => {
        const caminhoCompleto = `${UPLOADS_DIR}/${arquivo}`;
        const stats = fs.statSync(caminhoCompleto);
        console.log(`   ${i + 1}. ${arquivo} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
      });
      
      // Verificar o arquivo mais recente
      const arquivoMaisRecente = arquivos
        .map(arquivo => ({
          nome: arquivo,
          stats: fs.statSync(`${UPLOADS_DIR}/${arquivo}`)
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime)[0];
      
      console.log(`\n📄 Arquivo mais recente: ${arquivoMaisRecente.nome}`);
      console.log(`📅 Modificado em: ${arquivoMaisRecente.stats.mtime.toISOString()}`);
      console.log(`📊 Tamanho: ${arquivoMaisRecente.stats.size} bytes`);
      
      // Verificar se é um CSV
      if (arquivoMaisRecente.nome.endsWith('.csv')) {
        console.log(`✅ É um arquivo CSV`);
        
        // Ler algumas linhas para verificar conteúdo
        try {
          const conteudo = fs.readFileSync(`${UPLOADS_DIR}/${arquivoMaisRecente.nome}`, 'utf8');
          const linhas = conteudo.split('\n');
          console.log(`📊 Total de linhas: ${linhas.length}`);
          console.log(`📋 Primeiras 3 linhas:`);
          linhas.slice(0, 3).forEach((linha, i) => {
            console.log(`   ${i + 1}. ${linha.substring(0, 100)}${linha.length > 100 ? '...' : ''}`);
          });
        } catch (error) {
          console.log(`❌ Erro ao ler arquivo:`, error.message);
        }
      }
    } else {
      console.log(`❌ Nenhum arquivo encontrado no diretório de uploads`);
    }
    
  } catch (error) {
    console.log(`❌ Erro ao listar arquivos:`, error.message);
  }
} else {
  console.log(`❌ Diretório de uploads não existe: ${UPLOADS_DIR}`);
}

console.log('\n✅ ===== VERIFICAÇÃO CONCLUÍDA =====');
