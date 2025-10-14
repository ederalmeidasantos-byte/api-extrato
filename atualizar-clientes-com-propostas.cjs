const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando script de atualização de clientes com dados das propostas...');

// Diretórios
const clientesPath = path.join(__dirname, 'var/data/clientes');
const propostasPath = path.join(__dirname, 'var/data/propostas');
const extratosPath = path.join(__dirname, 'var/data/extratos');

// Verificar se diretórios existem
if (!fs.existsSync(clientesPath)) {
  console.log('❌ Diretório de clientes não encontrado:', clientesPath);
  process.exit(1);
}

if (!fs.existsSync(propostasPath)) {
  console.log('❌ Diretório de propostas não encontrado:', propostasPath);
  process.exit(1);
}

// Listar todos os arquivos de clientes
const arquivosClientes = fs.readdirSync(clientesPath).filter(arquivo => arquivo.endsWith('.json'));

console.log(`📋 Encontrados ${arquivosClientes.length} clientes para verificar`);

let clientesAtualizados = 0;
let clientesComProblemas = 0;

for (const arquivoCliente of arquivosClientes) {
  try {
    const clienteId = arquivoCliente.replace('.json', '');
    const clientePath = path.join(clientesPath, arquivoCliente);
    
    console.log(`\n🔍 Verificando cliente: ${clienteId}`);
    
    // Carregar dados do cliente
    const clienteData = JSON.parse(fs.readFileSync(clientePath, 'utf8'));
    
    // Verificar se benefício está vazio ou incompleto
    const beneficioVazio = !clienteData.dadosCompletos?.beneficio?.nomeBeneficio || 
                          !clienteData.dadosCompletos?.beneficio?.banco_pagamento ||
                          !clienteData.dadosCompletos?.beneficio?.agencia ||
                          !clienteData.dadosCompletos?.beneficio?.conta;
    
    if (!beneficioVazio) {
      console.log(`✅ Cliente ${clienteId} já tem dados do benefício completos`);
      continue;
    }
    
    console.log(`⚠️ Cliente ${clienteId} tem dados do benefício vazios, buscando dados da proposta...`);
    
    // Buscar proposta relacionada
    let dadosProposta = null;
    let dadosExtrato = null;
    
    // Tentar encontrar proposta pelo ID do cliente
    const propostaPath = path.join(propostasPath, `${clienteId}.json`);
    if (fs.existsSync(propostaPath)) {
      dadosProposta = JSON.parse(fs.readFileSync(propostaPath, 'utf8'));
      console.log(`📋 Proposta encontrada para cliente ${clienteId}`);
    }
    
    // Tentar encontrar extrato relacionado
    const extratoPath = path.join(extratosPath, `extrato_${clienteId}.json`);
    if (fs.existsSync(extratoPath)) {
      dadosExtrato = JSON.parse(fs.readFileSync(extratoPath, 'utf8'));
      console.log(`📋 Extrato encontrado para cliente ${clienteId}`);
    }
    
    // Usar dados do extrato OU da proposta
    const dadosFonte = dadosExtrato || dadosProposta?.dados?.cliente || {};
    
    if (!dadosFonte.nomeBeneficio && !dadosFonte.beneficio?.nomeBeneficio) {
      console.log(`⚠️ Nenhum dado de benefício encontrado para cliente ${clienteId}`);
      clientesComProblemas++;
      continue;
    }
    
    // Atualizar dados do cliente
    const clienteAtualizado = {
      ...clienteData,
      dadosCompletos: {
        ...clienteData.dadosCompletos,
        beneficio: {
          numero: dadosFonte.beneficio?.nb || dadosFonte.nb || clienteData.dadosCompletos?.beneficio?.numero || "",
          especie: dadosFonte.beneficio?.especie || dadosFonte.especie || clienteData.dadosCompletos?.beneficio?.especie || "",
          nomeBeneficio: dadosFonte.beneficio?.nomeBeneficio || dadosFonte.nomeBeneficio || clienteData.dadosCompletos?.beneficio?.nomeBeneficio || "",
          valor: dadosFonte.beneficio?.valor || dadosFonte.valor_beneficio || clienteData.dadosCompletos?.beneficio?.valor || "",
          banco_pagamento: dadosFonte.beneficio?.banco_pagamento || dadosFonte.banco_pagamento || clienteData.dadosCompletos?.beneficio?.banco_pagamento || "",
          agencia: dadosFonte.beneficio?.agencia || dadosFonte.agencia || clienteData.dadosCompletos?.beneficio?.agencia || "",
          conta: dadosFonte.beneficio?.conta || dadosFonte.conta || clienteData.dadosCompletos?.beneficio?.conta || "",
          situacao: clienteData.dadosCompletos?.beneficio?.situacao || "Ativo"
        },
        dadosBancarios: {
          banco_pagamento: dadosFonte.beneficio?.banco_pagamento || dadosFonte.banco_pagamento || clienteData.dadosCompletos?.dadosBancarios?.banco_pagamento || "",
          agencia: dadosFonte.beneficio?.agencia || dadosFonte.agencia || clienteData.dadosCompletos?.dadosBancarios?.agencia || "",
          conta: dadosFonte.beneficio?.conta || dadosFonte.conta || clienteData.dadosCompletos?.dadosBancarios?.conta || "",
          meio_pagamento: dadosFonte.beneficio?.meio_pagamento || dadosFonte.meio_pagamento || clienteData.dadosCompletos?.dadosBancarios?.meio_pagamento || ""
        }
      },
      updatedAt: new Date().toISOString(),
      ultimaSincronizacao: new Date().toISOString()
    };
    
    // Salvar cliente atualizado
    fs.writeFileSync(clientePath, JSON.stringify(clienteAtualizado, null, 2));
    
    console.log(`✅ Cliente ${clienteId} atualizado com dados do benefício:`);
    console.log(`   - Nome do Benefício: ${clienteAtualizado.dadosCompletos.beneficio.nomeBeneficio}`);
    console.log(`   - Banco: ${clienteAtualizado.dadosCompletos.beneficio.banco_pagamento}`);
    console.log(`   - Agência: ${clienteAtualizado.dadosCompletos.beneficio.agencia}`);
    console.log(`   - Conta: ${clienteAtualizado.dadosCompletos.beneficio.conta}`);
    
    clientesAtualizados++;
    
  } catch (error) {
    console.error(`❌ Erro ao processar cliente ${arquivoCliente}:`, error.message);
    clientesComProblemas++;
  }
}

console.log('\n📊 Resumo da atualização:');
console.log(`✅ Clientes atualizados: ${clientesAtualizados}`);
console.log(`⚠️ Clientes com problemas: ${clientesComProblemas}`);
console.log(`📋 Total processados: ${arquivosClientes.length}`);

if (clientesAtualizados > 0) {
  console.log('\n🎉 Script concluído com sucesso!');
  console.log('💡 Agora você pode verificar no CRM se os dados do benefício e banco aparecem corretamente.');
} else {
  console.log('\n⚠️ Nenhum cliente foi atualizado. Verifique se existem propostas ou extratos com dados.');
}
