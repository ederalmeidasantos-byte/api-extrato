/**
 * Analisar Formulário do Cliente - CPF 04973279889
 * Extrair e detalhar todos os dados do formulário da oportunidade
 */

const axios = require('axios');

async function analisarFormularioCliente() {
  console.log('🔍 Analisando Formulário do Cliente - CPF 04973279889');
  console.log('====================================================\n');
  
  try {
    // 1. Buscar a oportunidade específica
    console.log('1. Buscando oportunidade ID 36383...');
    
    const response = await axios.post('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      queueId: 25,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      pipelineId: 2
    }, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Oportunidades carregadas!');
    console.log(`   - Total: ${response.data.length} oportunidades`);
    
    // 2. Encontrar a oportunidade específica
    const oportunidade = response.data.find(op => op.id === 36383);
    
    if (!oportunidade) {
      console.log('❌ Oportunidade não encontrada!');
      return;
    }
    
    console.log('\n2. Oportunidade encontrada:');
    console.log(`   - ID: ${oportunidade.id}`);
    console.log(`   - Título: ${oportunidade.title}`);
    console.log(`   - Mainmail: ${oportunidade.mainmail}`);
    console.log(`   - Status: ${oportunidade.fkStage}`);
    console.log(`   - Pipeline: ${oportunidade.fkPipeline}`);
    console.log(`   - Criada em: ${oportunidade.createdAt}`);
    
    // 3. Analisar dados do formulário
    console.log('\n3. Dados do Formulário:');
    console.log('========================');
    
    const formsdata = oportunidade.formsdata || {};
    console.log(`   - Total de campos: ${Object.keys(formsdata).length}`);
    
    // 4. Mapear campos por categoria
    const camposPorCategoria = {
      cliente: {},
      financeiro: {},
      bancario: {},
      endereco: {},
      outros: {}
    };
    
    // Mapear campos conhecidos
    const mapeamentoCampos = {
      // Dados do Cliente
      '98011220': { nome: 'CPF', categoria: 'cliente' },
      '0bfc6250': { nome: 'Data de Nascimento', categoria: 'cliente' },
      '9ed1cef0': { nome: 'IDADE', categoria: 'cliente' },
      '917456f0': { nome: 'Nome da mãe', categoria: 'cliente' },
      '98167d80': { nome: 'Celular para SMS', categoria: 'cliente' },
      '9e7f92b0': { nome: 'E-mail', categoria: 'cliente' },
      
      // Dados Financeiros
      '9d947420': { nome: 'TROCO', categoria: 'financeiro' },
      '9cceda30': { nome: 'PARCELA', categoria: 'financeiro' },
      '5fc51220': { nome: 'Nova Parcela', categoria: 'financeiro' },
      'f5f58820': { nome: 'TAXA ATUAL', categoria: 'financeiro' },
      'f71e0290': { nome: 'TAXA NOVA', categoria: 'financeiro' },
      '6c76b4b0': { nome: 'Valor Liquido', categoria: 'financeiro' },
      '233a7b80': { nome: 'Saldo Devedor', categoria: 'financeiro' },
      '08715950': { nome: 'Valor liberado', categoria: 'financeiro' },
      
      // Dados Bancários
      'cd34f870': { nome: 'Banco', categoria: 'bancario' },
      '7f6a0eb0': { nome: 'Agencia', categoria: 'bancario' },
      '769db520': { nome: 'Conta', categoria: 'bancario' },
      '2fe18130': { nome: 'Banco Proposta', categoria: 'bancario' },
      '2e1d3bf0': { nome: 'Banco Originador', categoria: 'bancario' },
      
      // Dados de Endereço
      '1836e090': { nome: 'CEP', categoria: 'endereco' },
      '1dbfcef0': { nome: 'Lougradouro', categoria: 'endereco' },
      '6ac31450': { nome: 'Número', categoria: 'endereco' },
      '3271f710': { nome: 'Bairro', categoria: 'endereco' },
      '25178280': { nome: 'CIDADE', categoria: 'endereco' },
      'f6384400': { nome: 'UF', categoria: 'endereco' },
      
      // Outros
      '38032740': { nome: 'Número da Proposta', categoria: 'outros' },
      'b4e24e90': { nome: 'PRAZO RESTANTE', categoria: 'outros' },
      '69da8d80': { nome: 'Prazo', categoria: 'outros' },
      '79562580': { nome: 'Prazo Atual', categoria: 'outros' },
      '2da09d50': { nome: 'Link de assinatura', categoria: 'outros' },
      'ec165610': { nome: 'Retorno CIP', categoria: 'outros' },
      'efcd2160': { nome: 'Número Portabilidade', categoria: 'outros' },
      'a88afbf0': { nome: 'Número do Beneficio', categoria: 'outros' },
      '3d8b2ff0': { nome: 'Espécie do Beneficio', categoria: 'outros' },
      '6a93f650': { nome: 'Documento', categoria: 'outros' },
      '9cd637f0': { nome: 'Nome do Representante', categoria: 'outros' },
      '9d758530': { nome: 'CPF do Representante', categoria: 'outros' },
      '66f9ee40': { nome: 'PIX', categoria: 'outros' },
      '8b176fe0': { nome: 'Link', categoria: 'outros' },
      'f0a67ce0': { nome: 'TABELA', categoria: 'outros' },
      '80b68ec0': { nome: 'AVERBADOR', categoria: 'outros' },
      'c665b0c0': { nome: 'Token', categoria: 'outros' },
      '103dcf10': { nome: 'Parcela', categoria: 'outros' },
      '1576c8b0': { nome: 'Prazo', categoria: 'outros' },
      '1c441df0': { nome: 'Banco', categoria: 'outros' },
      '90bd9810': { nome: 'PARCELA 1', categoria: 'outros' },
      '929da2b0': { nome: 'DATA 1', categoria: 'outros' },
      '93618ef0': { nome: 'PARCELA 2', categoria: 'outros' },
      '9423f490': { nome: 'DATA 2', categoria: 'outros' },
      '957af910': { nome: 'PARCELA 3', categoria: 'outros' },
      '9649bac0': { nome: 'DATA 3', categoria: 'outros' },
      '97076570': { nome: 'PARCELA 4', categoria: 'outros' },
      '979f1190': { nome: 'DATA 4', categoria: 'outros' },
      '98318d90': { nome: 'PARCELA 5', categoria: 'outros' },
      '98d17710': { nome: 'DATA 5', categoria: 'outros' },
      '99f843d0': { nome: 'PARCELA 6', categoria: 'outros' },
      '9a9cc130': { nome: 'DATA 6', categoria: 'outros' },
      '9b2f8b50': { nome: 'PARCELA 7', categoria: 'outros' },
      '9bc64d10': { nome: 'DATA 7', categoria: 'outros' },
      '9c51eb40': { nome: 'PARCELA 8', categoria: 'outros' },
      '9ce9be70': { nome: 'DATA 8', categoria: 'outros' },
      '9d831840': { nome: 'PARCELA 9', categoria: 'outros' },
      '9e1482d0': { nome: 'DATA 9', categoria: 'outros' },
      '9e9a2d90': { nome: 'PARCELA 10', categoria: 'outros' },
      '9f218600': { nome: 'DATA 10', categoria: 'outros' },
      '17ac22b0': { nome: 'Valor liberado', categoria: 'outros' },
      'b8f2b110': { nome: 'ID SIMULAÇÃO', categoria: 'outros' },
      'd9dd82b0': { nome: 'ID TABELA', categoria: 'outros' },
      '3b4b4a50': { nome: 'ID do Anuncio', categoria: 'outros' },
      '44414bf0': { nome: 'Nome do anuncio', categoria: 'outros' },
      '4a0e9650': { nome: 'Link do anuncio', categoria: 'outros' }
    };
    
    // 5. Processar cada campo
    for (const [campoId, valor] of Object.entries(formsdata)) {
      const info = mapeamentoCampos[campoId];
      if (info) {
        camposPorCategoria[info.categoria][campoId] = {
          nome: info.nome,
          valor: valor,
          id: campoId
        };
      } else {
        camposPorCategoria.outros[campoId] = {
          nome: `Campo ${campoId}`,
          valor: valor,
          id: campoId
        };
      }
    }
    
    // 6. Exibir dados por categoria
    console.log('\n📋 DADOS DO CLIENTE:');
    console.log('===================');
    for (const [campoId, campo] of Object.entries(camposPorCategoria.cliente)) {
      console.log(`   ${campo.nome}: ${campo.valor || 'N/A'}`);
    }
    
    console.log('\n💰 DADOS FINANCEIROS:');
    console.log('====================');
    for (const [campoId, campo] of Object.entries(camposPorCategoria.financeiro)) {
      console.log(`   ${campo.nome}: ${campo.valor || 'N/A'}`);
    }
    
    console.log('\n🏦 DADOS BANCÁRIOS:');
    console.log('==================');
    for (const [campoId, campo] of Object.entries(camposPorCategoria.bancario)) {
      console.log(`   ${campo.nome}: ${campo.valor || 'N/A'}`);
    }
    
    console.log('\n🏠 DADOS DE ENDEREÇO:');
    console.log('====================');
    for (const [campoId, campo] of Object.entries(camposPorCategoria.endereco)) {
      console.log(`   ${campo.nome}: ${campo.valor || 'N/A'}`);
    }
    
    console.log('\n📄 OUTROS DADOS:');
    console.log('================');
    for (const [campoId, campo] of Object.entries(camposPorCategoria.outros)) {
      if (campo.valor && campo.valor !== 'null' && campo.valor !== 'NULL') {
        console.log(`   ${campo.nome}: ${campo.valor}`);
      }
    }
    
    // 7. Resumo dos dados preenchidos
    console.log('\n📊 RESUMO DOS DADOS:');
    console.log('====================');
    console.log(`   - Total de campos: ${Object.keys(formsdata).length}`);
    console.log(`   - Campos preenchidos: ${Object.values(formsdata).filter(v => v && v !== 'null' && v !== 'NULL').length}`);
    console.log(`   - Campos vazios: ${Object.values(formsdata).filter(v => !v || v === 'null' || v === 'NULL').length}`);
    
    // 8. Dados específicos do cliente
    console.log('\n👤 DADOS ESPECÍFICOS DO CLIENTE:');
    console.log('================================');
    console.log(`   Nome: ${oportunidade.title}`);
    console.log(`   CPF: ${oportunidade.mainmail}`);
    console.log(`   Status: ${oportunidade.fkStage} (Início da Portabilidade)`);
    console.log(`   Pipeline: ${oportunidade.fkPipeline} (Portabilidade)`);
    console.log(`   Criada em: ${new Date(oportunidade.createdAt).toLocaleString('pt-BR')}`);
    
    // 9. Arquivos anexados
    if (oportunidade.files && oportunidade.files.length > 0) {
      console.log('\n📎 ARQUIVOS ANEXADOS:');
      console.log('====================');
      oportunidade.files.forEach((arquivo, index) => {
        console.log(`   ${index + 1}. ${arquivo.name || arquivo.file_name}`);
        console.log(`      - Tipo: ${arquivo.mimetype}`);
        console.log(`      - Tamanho: ${(arquivo.file_length / 1024).toFixed(2)} KB`);
        console.log(`      - Hash: ${arquivo.file_hash}`);
      });
    }
    
    // 10. Contatos
    if (oportunidade.contacts && oportunidade.contacts.length > 0) {
      console.log('\n👥 CONTATOS:');
      console.log('============');
      console.log(`   - Total de contatos: ${oportunidade.contacts.length}`);
      console.log(`   - IDs dos contatos: ${oportunidade.contacts.join(', ')}`);
    }
    
    console.log('\n✅ Análise concluída!');
    
  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
    if (error.response) {
      console.log(`   - Status: ${error.response.status}`);
      console.log(`   - Dados: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// ========================================
// EXECUTAR ANÁLISE
// ========================================

if (require.main === module) {
  analisarFormularioCliente().catch(console.error);
}

module.exports = { analisarFormularioCliente };



