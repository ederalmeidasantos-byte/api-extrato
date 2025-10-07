// ================== SCRIPT PARA OTIMIZAR CONSUMO DE TOKENS ==================

import fs from 'fs';
import path from 'path';

console.log("=== OTIMIZANDO CONSUMO DE TOKENS ===\n");

// Lista de arquivos para otimizar
const arquivosParaOtimizar = [
  'chatgpt-vendedor/portabilidade-melhorado.js',
  'chatgpt-vendedor/fgts.js',
  'chatgpt-vendedor/portabilidade.js',
  'chatgpt-vendedor/portabilidade-novo.js',
  'chatgpt-vendedor/core/chatgpt-vendedor.js'
];

// Texto para substituir
const jsonCompleto = `DADOS COMPLETOS DO CLIENTE (JSON):
       ${JSON.stringify(dadosCliente.dadosCompletos || dadosCliente, null, 2)}`;

const dadosOtimizados = `DADOS ADICIONAIS DO CLIENTE:
       - Telefone: ${dadosCliente.dadosCompletos?.telefone || 'N/A'}
       - Email: ${dadosCliente.dadosCompletos?.email || 'N/A'}
       - Renda: R$ ${dadosCliente.dadosCompletos?.renda?.mensal || 'N/A'}
       - Benefício: ${dadosCliente.dadosCompletos?.beneficio?.tipo || 'N/A'}`;

let arquivosModificados = 0;
let totalEconomiaTokens = 0;

arquivosParaOtimizar.forEach(arquivo => {
  try {
    if (fs.existsSync(arquivo)) {
      let conteudo = fs.readFileSync(arquivo, 'utf8');
      
      if (conteudo.includes('JSON.stringify(dadosCliente.dadosCompletos')) {
        // Substituir o JSON completo por dados otimizados
        conteudo = conteudo.replace(
          /DADOS COMPLETOS DO CLIENTE \(JSON\):\s*\$\{JSON\.stringify\(dadosCliente\.dadosCompletos \|\| dadosCliente, null, 2\)\}/g,
          'DADOS ADICIONAIS DO CLIENTE:\n       - Telefone: ${dadosCliente.dadosCompletos?.telefone || \'N/A\'}\n       - Email: ${dadosCliente.dadosCompletos?.email || \'N/A\'}\n       - Renda: R$ ${dadosCliente.dadosCompletos?.renda?.mensal || \'N/A\'}\n       - Benefício: ${dadosCliente.dadosCompletos?.beneficio?.tipo || \'N/A\'}'
        );
        
        fs.writeFileSync(arquivo, conteudo, 'utf8');
        console.log(`✅ ${arquivo} - JSON otimizado`);
        arquivosModificados++;
        
        // Calcular economia estimada (aproximadamente 500 tokens por arquivo)
        totalEconomiaTokens += 500;
      } else {
        console.log(`⏭️  ${arquivo} - Já otimizado ou não contém JSON`);
      }
    } else {
      console.log(`❌ ${arquivo} - Arquivo não encontrado`);
    }
  } catch (error) {
    console.log(`❌ ${arquivo} - Erro: ${error.message}`);
  }
});

console.log(`\n📊 RESUMO DA OTIMIZAÇÃO:`);
console.log(`Arquivos modificados: ${arquivosModificados}`);
console.log(`Tokens economizados por mensagem: ~${totalEconomiaTokens}`);
console.log(`Economia estimada: $${(totalEconomiaTokens * 0.0005 / 1000).toFixed(6)} por mensagem`);

console.log(`\n💡 PRÓXIMOS PASSOS:`);
console.log(`1. Fazer commit das alterações`);
console.log(`2. Fazer deploy no servidor`);
console.log(`3. Testar o sistema otimizado`);
console.log(`4. Monitorar economia real de tokens`);

console.log(`\n✅ OTIMIZAÇÃO CONCLUÍDA!`);
