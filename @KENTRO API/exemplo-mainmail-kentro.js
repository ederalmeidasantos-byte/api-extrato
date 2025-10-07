/**
 * Exemplo de Uso do mainmail na Kentro
 * Demonstra como usar corretamente o mainmail para todas as operações
 */

const OperacionalIntegration = require('./operacional-integration');
const { mapearDadosParaAPI, validarDadosFormulario } = require('./data-mapping');

// ========================================
// DADOS DE EXEMPLO
// ========================================

const dadosFormularioExemplo = {
  // Campos do cliente
  '98011220': '123.456.789-00', // CPF (apenas validação)
  '6a93f650': 'João Silva Santos', // Nome
  '9e7f92b0': 'joao.silva@email.com', // E-mail (vira mainmail)
  '98167d80': '(11) 98765-4321', // Celular
  
  // Campos financeiros
  '9d947420': 'R$ 2.500,00', // TROCO
  '9cceda30': 'R$ 3.200,00', // PARCELA
  '5fc51220': 'R$ 2.800,00', // Nova Parcela
  '08715950': 'R$ 70.000,00', // Valor liberado
  
  // Outros campos...
  '0bfc6250': '15/03/1980', // Data de Nascimento
  '917456f0': 'Maria Silva Santos', // Nome da mãe
  'a88afbf0': '1234567890', // Número do Beneficio
  '3d8b2ff0': 'Aposentadoria por Idade' // Espécie do Beneficio
};

// ========================================
// EXEMPLOS DE USO
// ========================================

async function exemploUsoMainmail() {
  console.log('🎯 Exemplo de Uso do mainmail na Kentro');
  console.log('========================================\n');
  
  try {
    // 1. Inicializar integração
    console.log('1. Inicializando integração...');
    const integracao = new OperacionalIntegration('development');
    console.log('✅ Integração inicializada\n');
    
    // 2. Validar dados
    console.log('2. Validando dados do formulário...');
    const validacao = validarDadosFormulario(dadosFormularioExemplo);
    if (validacao.valido) {
      console.log('✅ Dados válidos');
    } else {
      console.log('❌ Dados inválidos:', validacao.erros.join(', '));
      return;
    }
    console.log('');
    
    // 3. Mapear dados (CPF vira mainmail)
    console.log('3. Mapeando dados...');
    const dadosMapeados = mapearDadosParaAPI(dadosFormularioExemplo);
    console.log('✅ Dados mapeados:');
    console.log(`   - Nome: ${dadosMapeados.cliente.nome}`);
    console.log(`   - CPF: ${dadosMapeados.cliente.cpf} (apenas validação)`);
    console.log(`   - E-mail: ${dadosMapeados.cliente.email}`);
    console.log(`   - mainmail: ${dadosMapeados.cliente.mainmail} (usado na Kentro)`);
    console.log('');
    
    // 4. Buscar contato existente por mainmail
    console.log('4. Buscando contato existente por mainmail...');
    const contatoExistente = await integracao.buscarContatoExistente(dadosMapeados.cliente.email);
    
    if (contatoExistente) {
      console.log('✅ Contato encontrado:');
      console.log(`   - ID: ${contatoExistente.id}`);
      console.log(`   - Nome: ${contatoExistente.name}`);
      console.log(`   - mainmail: ${contatoExistente.mainmail}`);
    } else {
      console.log('❌ Contato não encontrado');
      console.log('📝 Será necessário criar um novo contato');
    }
    console.log('');
    
    // 5. Demonstrar diferença entre CPF e mainmail
    console.log('5. Diferença entre CPF e mainmail:');
    console.log('   - CPF (123.456.789-00): Usado apenas para validação e exibição');
    console.log('   - mainmail (joao.silva@email.com): Usado para buscar na Kentro');
    console.log('');
    
    // 6. Exemplo de operações na Kentro
    console.log('6. Exemplos de operações na Kentro:');
    console.log('');
    
    console.log('   ✅ CORRETO - Buscar por mainmail:');
    console.log('   const contatos = await client.getContacts({');
    console.log('     mainmail: "joao.silva@email.com"');
    console.log('   });');
    console.log('');
    
    console.log('   ❌ ERRADO - Buscar por CPF:');
    console.log('   const contatos = await client.getContacts({');
    console.log('     cpf: "123.456.789-00"  // Não funciona!');
    console.log('   });');
    console.log('');
    
    console.log('   ✅ CORRETO - Criar contato com mainmail:');
    console.log('   const contato = await client.createContact({');
    console.log('     name: "João Silva Santos",');
    console.log('     mainmail: "joao.silva@email.com",');
    console.log('     cpf: "123.456.789-00"  // Apenas referência');
    console.log('   });');
    console.log('');
    
    // 7. Processar proposta completa
    console.log('7. Processando proposta completa...');
    console.log('⚠️  Execução comentada para evitar chamadas reais à API');
    console.log('');
    
    // Descomente para executar realmente:
    // const resultado = await integracao.processarProposta(dadosFormularioExemplo);
    // console.log('Resultado:', resultado);
    
    console.log('📋 Fluxo de processamento:');
    console.log('   1. Validar dados do formulário');
    console.log('   2. Mapear dados (CPF → mainmail)');
    console.log('   3. Buscar contato por mainmail');
    console.log('   4. Se não encontrar, criar novo contato');
    console.log('   5. Criar oportunidade');
    console.log('   6. Abrir atendimento');
    console.log('');
    
    console.log('✅ Exemplo concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o exemplo:', error.message);
  }
}

// ========================================
// EXEMPLOS ESPECÍFICOS
// ========================================

async function exemploBuscaContato() {
  console.log('\n🔍 Exemplo de Busca de Contato');
  console.log('===============================\n');
  
  const integracao = new OperacionalIntegration('development');
  
  // Lista de e-mails para testar
  const emailsTeste = [
    'joao.silva@email.com',
    'maria.oliveira@email.com',
    'cliente.inexistente@email.com'
  ];
  
  for (const email of emailsTeste) {
    console.log(`Buscando contato: ${email}`);
    
    try {
      const contato = await integracao.buscarContatoExistente(email);
      
      if (contato) {
        console.log(`✅ Encontrado: ID ${contato.id} - ${contato.name}`);
      } else {
        console.log('❌ Não encontrado');
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
    
    console.log('');
  }
}

async function exemploCriacaoContato() {
  console.log('\n📝 Exemplo de Criação de Contato');
  console.log('==================================\n');
  
  const integracao = new OperacionalIntegration('development');
  
  // Dados do novo contato
  const dadosNovoContato = {
    cliente: {
      nome: 'Maria Oliveira',
      email: 'maria.oliveira@email.com',
      mainmail: 'maria.oliveira@email.com', // Campo principal
      cpf: '987.654.321-00',
      celular: '(11) 91234-5678'
    },
    beneficio: {
      numero: '9876543210',
      especie: 'Aposentadoria por Idade'
    }
  };
  
  console.log('Dados do novo contato:');
  console.log(`- Nome: ${dadosNovoContato.cliente.nome}`);
  console.log(`- E-mail: ${dadosNovoContato.cliente.email}`);
  console.log(`- mainmail: ${dadosNovoContato.cliente.mainmail}`);
  console.log(`- CPF: ${dadosNovoContato.cliente.cpf}`);
  console.log('');
  
  console.log('⚠️  Criação comentada para evitar chamadas reais à API');
  console.log('');
  
  // Descomente para executar realmente:
  // try {
  //   const contato = await integracao.criarContato(dadosNovoContato);
  //   console.log('✅ Contato criado:', contato.data?.id);
  // } catch (error) {
  //   console.log('❌ Erro ao criar contato:', error.message);
  // }
}

// ========================================
// EXECUTAR TODOS OS EXEMPLOS
// ========================================

async function executarTodosExemplos() {
  await exemploUsoMainmail();
  await exemploBuscaContato();
  await exemploCriacaoContato();
  
  console.log('\n🎉 Todos os exemplos executados!');
  console.log('\n📋 Resumo das Regras:');
  console.log('1. CPF é usado apenas para validação e exibição');
  console.log('2. mainmail é usado para todas as operações na Kentro');
  console.log('3. Sempre buscar contatos por mainmail, nunca por CPF');
  console.log('4. E-mail do formulário vira mainmail automaticamente');
}

// ========================================
// EXECUTAR
// ========================================

if (require.main === module) {
  executarTodosExemplos().catch(console.error);
}

module.exports = {
  exemploUsoMainmail,
  exemploBuscaContato,
  exemploCriacaoContato,
  executarTodosExemplos
};



