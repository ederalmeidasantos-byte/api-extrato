import { salvarCPFsAnexados, carregarCPFsAnexados } from './server.js';
import fs from 'fs';

console.log('🧪 ===== TESTE DE LISTA COMPLETA DE CPFs =====');

// Simular uma lista de CPFs (como se fosse um CSV)
const cpfsSimulados = [
  { CPF: "11111111111", ID: "ID001", TELEFONE: "11999999999" },
  { CPF: "22222222222", ID: "ID002", TELEFONE: "11888888888" },
  { CPF: "33333333333", ID: "ID003", TELEFONE: "11777777777" },
  { CPF: "44444444444", ID: "ID004", TELEFONE: "11666666666" },
  { CPF: "55555555555", ID: "ID005", TELEFONE: "11555555555" }
];

console.log(`📋 Simulando upload de ${cpfsSimulados.length} CPFs...`);

try {
  // Salvar lista completa
  const cacheData = await salvarCPFsAnexados(cpfsSimulados, {
    fileName: 'teste-60mil-cpfs.csv',
    uploadTime: new Date().toISOString(),
    totalRegistros: cpfsSimulados.length
  });
  
  console.log(`✅ Lista salva com sucesso!`);
  console.log(`📊 Total: ${cacheData.totalCPFs} CPFs`);
  console.log(`📄 Arquivo: ${cacheData.metadata.fileName}`);
  console.log(`📅 Upload: ${cacheData.metadata.uploadTime}`);
  
  // Verificar se salvou corretamente
  console.log(`\n🔍 Verificando se salvou corretamente...`);
  const cpfsCarregados = await carregarCPFsAnexados();
  
  if (cpfsCarregados) {
    console.log(`✅ Lista carregada com sucesso!`);
    console.log(`📊 Total carregado: ${cpfsCarregados.totalCPFs} CPFs`);
    console.log(`📄 Arquivo: ${cpfsCarregados.metadata.fileName}`);
    console.log(`📅 Upload: ${cpfsCarregados.metadata.uploadTime}`);
    
    // Mostrar alguns CPFs
    console.log(`\n📋 Primeiros 3 CPFs:`);
    cpfsCarregados.cpfs.slice(0, 3).forEach((cpf, i) => {
      console.log(`   ${i + 1}. CPF: ${cpf.cpf}, ID: ${cpf.id}, Linha: ${cpf.linha}`);
    });
    
    // Verificar se todos os CPFs estão lá
    const todosPresentes = cpfsSimulados.every(cpfSimulado => 
      cpfsCarregados.cpfs.some(cpfCache => cpfCache.cpf === cpfSimulado.CPF)
    );
    
    if (todosPresentes) {
      console.log(`✅ Todos os CPFs estão presentes no cache!`);
    } else {
      console.log(`❌ Alguns CPFs estão faltando no cache!`);
    }
  } else {
    console.log(`❌ Erro ao carregar lista!`);
  }
  
} catch (error) {
  console.error('❌ Erro no teste:', error);
}

console.log('\n✅ ===== TESTE CONCLUÍDO =====');
