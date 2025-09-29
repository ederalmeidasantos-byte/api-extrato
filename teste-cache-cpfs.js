import { salvarPendentes, carregarPendentes } from './cache-persistente.js';
import fs from 'fs';

console.log('🧪 ===== TESTE DE CACHE DE CPFs =====');

// Teste 1: Verificar se o diretório existe
const PERSISTENT_PATH = '/var/data';
const CACHE_DIR = `${PERSISTENT_PATH}/cache`;
const PENDENTES_FILE = `${CACHE_DIR}/pendentes.json`;

console.log(`📁 Verificando diretório: ${CACHE_DIR}`);
if (fs.existsSync(CACHE_DIR)) {
  console.log(`✅ Diretório existe: ${CACHE_DIR}`);
} else {
  console.log(`❌ Diretório não existe: ${CACHE_DIR}`);
  console.log(`🔧 Criando diretório...`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`✅ Diretório criado: ${CACHE_DIR}`);
}

// Teste 2: Verificar se o arquivo existe
console.log(`📄 Verificando arquivo: ${PENDENTES_FILE}`);
if (fs.existsSync(PENDENTES_FILE)) {
  console.log(`✅ Arquivo existe: ${PENDENTES_FILE}`);
  
  // Ler conteúdo atual
  try {
    const conteudoAtual = JSON.parse(fs.readFileSync(PENDENTES_FILE, 'utf8'));
    console.log(`📋 Conteúdo atual:`, {
      total: conteudoAtual.total,
      ultimaAtualizacao: conteudoAtual.ultimaAtualizacao,
      temPendentes: !!conteudoAtual.pendentes,
      tipoPendentes: Array.isArray(conteudoAtual.pendentes) ? 'array' : typeof conteudoAtual.pendentes,
      quantidade: conteudoAtual.pendentes?.length || 0
    });
    
    if (conteudoAtual.pendentes && conteudoAtual.pendentes.length > 0) {
      console.log(`📋 Primeiros 3 CPFs:`, conteudoAtual.pendentes.slice(0, 3));
    }
  } catch (error) {
    console.log(`❌ Erro ao ler arquivo:`, error.message);
  }
} else {
  console.log(`❌ Arquivo não existe: ${PENDENTES_FILE}`);
}

// Teste 3: Testar carregamento
console.log(`\n🔍 Testando carregamento...`);
const pendentesCarregados = carregarPendentes();
console.log(`📊 CPFs carregados: ${pendentesCarregados.length}`);

// Teste 4: Testar salvamento
console.log(`\n💾 Testando salvamento...`);
const cpfsTeste = [
  { cpf: "11111111111", linha: 1, id: "teste_1", motivo: "teste" },
  { cpf: "22222222222", linha: 2, id: "teste_2", motivo: "teste" },
  { cpf: "33333333333", linha: 3, id: "teste_3", motivo: "teste" }
];

console.log(`📋 Salvando ${cpfsTeste.length} CPFs de teste...`);
const salvou = salvarPendentes(cpfsTeste);
console.log(`✅ Salvamento: ${salvou ? 'Sucesso' : 'Falhou'}`);

// Teste 5: Verificar se salvou corretamente
console.log(`\n🔍 Verificando se salvou corretamente...`);
const pendentesVerificacao = carregarPendentes();
console.log(`📊 CPFs após salvamento: ${pendentesVerificacao.length}`);

if (pendentesVerificacao.length > 0) {
  console.log(`📋 Primeiros 3 CPFs salvos:`, pendentesVerificacao.slice(0, 3));
}

// Teste 6: Listar arquivos no diretório
console.log(`\n📁 Arquivos no diretório ${CACHE_DIR}:`);
try {
  const arquivos = fs.readdirSync(CACHE_DIR);
  arquivos.forEach(arquivo => {
    const caminhoCompleto = `${CACHE_DIR}/${arquivo}`;
    const stats = fs.statSync(caminhoCompleto);
    console.log(`  - ${arquivo} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
  });
} catch (error) {
  console.log(`❌ Erro ao listar arquivos:`, error.message);
}

console.log('\n✅ ===== TESTE CONCLUÍDO =====');
