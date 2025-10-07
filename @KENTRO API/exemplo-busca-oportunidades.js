/**
 * Exemplo de Busca de Oportunidades - Sistema Operacional
 * Demonstra como buscar oportunidades usando diferentes critérios
 */

const OperacionalIntegration = require('./operacional-integration');
const { 
  obterStatusPorId, 
  obterProximosStatus,
  FILAS,
  STATUS_PORTABILIDADE,
  STATUS_FGTS
} = require('./crm-status-mapping');

// ========================================
// EXEMPLOS DE BUSCA
// ========================================

async function exemploBuscaOportunidades() {
  console.log('🔍 Exemplo de Busca de Oportunidades');
  console.log('====================================\n');
  
  try {
    // 1. Inicializar integração
    console.log('1. Inicializando integração...');
    const integracao = new OperacionalIntegration('development');
    console.log('✅ Integração inicializada\n');
    
    // 2. Buscar oportunidade específica por ID
    console.log('2. Buscar oportunidade específica por ID:');
    const oportunidadeId = 12345; // ID de exemplo
    const oportunidade = await integracao.buscarOportunidadePorId(oportunidadeId);
    
    if (oportunidade) {
      console.log('✅ Oportunidade encontrada:');
      console.log(`   - ID: ${oportunidade.id}`);
      console.log(`   - Título: ${oportunidade.title}`);
      console.log(`   - Status: ${oportunidade.stageId}`);
      console.log(`   - Valor: R$ ${oportunidade.value}`);
      console.log(`   - Contato ID: ${oportunidade.contactId}`);
    } else {
      console.log('❌ Oportunidade não encontrada');
    }
    console.log('');
    
    // 3. Buscar oportunidades de um contato
    console.log('3. Buscar oportunidades de um contato:');
    const contactId = 54321; // ID de exemplo
    const oportunidadesContato = await integracao.buscarOportunidadesDoContato(contactId);
    
    console.log(`✅ Encontradas ${oportunidadesContato.length} oportunidades para o contato ${contactId}`);
    oportunidadesContato.forEach((op, index) => {
      const statusInfo = obterStatusPorId(op.stageId);
      console.log(`   ${index + 1}. ID: ${op.id} | ${op.title} | Status: ${statusInfo?.nome || op.stageId}`);
    });
    console.log('');
    
    // 4. Buscar oportunidades por status
    console.log('4. Buscar oportunidades por status:');
    const statusId = STATUS_PORTABILIDADE.INICIO; // Status "Início"
    const oportunidadesStatus = await integracao.buscarOportunidadesPorStatus(statusId);
    
    const statusInfo = obterStatusPorId(statusId);
    console.log(`✅ Encontradas ${oportunidadesStatus.length} oportunidades no status "${statusInfo?.nome}"`);
    oportunidadesStatus.forEach((op, index) => {
      console.log(`   ${index + 1}. ID: ${op.id} | ${op.title} | Contato: ${op.contactId}`);
    });
    console.log('');
    
    // 5. Buscar oportunidades por status específico
    console.log('5. Buscar oportunidades por status específico:');
    const statusEspecifico = STATUS_FGTS.SIMULANDO_FGTS;
    const oportunidadesFgts = await integracao.buscarOportunidadesPorStatus(statusEspecifico);
    
    const statusInfoFgts = obterStatusPorId(statusEspecifico);
    console.log(`✅ Encontradas ${oportunidadesFgts.length} oportunidades no status "${statusInfoFgts?.nome}"`);
    oportunidadesFgts.forEach((op, index) => {
      console.log(`   ${index + 1}. ID: ${op.id} | ${op.title} | Contato: ${op.contactId}`);
    });
    console.log('');
    
    console.log('✅ Exemplo de busca concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o exemplo:', error.message);
  }
}

// ========================================
// EXEMPLOS ESPECÍFICOS
// ========================================

async function exemploFluxoCompleto() {
  console.log('\n🔄 Exemplo de Fluxo Completo');
  console.log('============================\n');
  
  const integracao = new OperacionalIntegration('development');
  
  // 1. Buscar oportunidades por status
  console.log('1. Buscar oportunidades por status:');
  const statusId = STATUS_PORTABILIDADE.INICIO;
  const oportunidades = await integracao.buscarOportunidadesPorStatus(statusId);
  
  const statusInfo = obterStatusPorId(statusId);
  console.log(`✅ Encontradas ${oportunidades.length} oportunidades no status "${statusInfo?.nome}"`);
  
  if (oportunidades.length === 0) {
    console.log('❌ Nenhuma oportunidade encontrada');
    return;
  }
  
  console.log('');
  
  // 2. Mostrar oportunidades encontradas
  console.log('2. Oportunidades encontradas:');
  oportunidades.slice(0, 5).forEach((op, index) => {
    console.log(`   ${index + 1}. ID: ${op.id} | ${op.title} | Contato: ${op.contactId}`);
  });
  console.log('');
  
  // 3. Alterar status de uma oportunidade
  if (oportunidades.length > 0) {
    const oportunidade = oportunidades[0];
    const statusAtual = oportunidade.stageId;
    const proximosStatus = obterProximosStatus(FILAS.PORTABILIDADE, statusAtual);
    
    if (proximosStatus.length > 0) {
      const novoStatus = proximosStatus[0].id;
      const statusAtualInfo = obterStatusPorId(statusAtual);
      const novoStatusInfo = obterStatusPorId(novoStatus);
      
      console.log('3. Alterar status da oportunidade:');
      console.log(`   - Oportunidade: ${oportunidade.id}`);
      console.log(`   - De: ${statusAtualInfo?.nome} (${statusAtual})`);
      console.log(`   - Para: ${novoStatusInfo?.nome} (${novoStatus})`);
      console.log('   ⚠️  Alteração comentada para evitar chamadas reais à API');
      
      // Descomente para executar realmente:
      // const resultado = await integracao.alterarFaseOportunidadeComValidacao(
      //   oportunidade.id,
      //   statusAtual,
      //   novoStatus,
      //   FILAS.PORTABILIDADE
      // );
      // console.log('✅ Status alterado:', resultado);
    }
  }
  
  console.log('');
  console.log('✅ Fluxo completo demonstrado!');
}

async function exemploDashboardOportunidades() {
  console.log('\n📊 Exemplo de Dashboard de Oportunidades');
  console.log('========================================\n');
  
  const integracao = new OperacionalIntegration('development');
  
  // Status para buscar
  const statusParaBuscar = [
    { id: STATUS_PORTABILIDADE.INICIO, nome: 'Início' },
    { id: STATUS_PORTABILIDADE.OFERTA_TROCO, nome: 'Oferta Troco' },
    { id: STATUS_PORTABILIDADE.DIGITANDO, nome: 'Digitando' },
    { id: STATUS_PORTABILIDADE.AGUARDANDO_ASSINATURA, nome: 'Aguardando Assinatura' },
    { id: STATUS_PORTABILIDADE.PAGO, nome: 'Pago' }
  ];
  
  console.log('📈 Dashboard de Oportunidades:');
  console.log('==============================');
  console.log('');
  
  for (const status of statusParaBuscar) {
    const oportunidades = await integracao.buscarOportunidadesPorStatus(status.id);
    const barra = '█'.repeat(Math.min(oportunidades.length, 20));
    
    console.log(`${status.nome.padEnd(25)} ${oportunidades.length.toString().padStart(3)} ${barra}`);
  }
  
  console.log('');
  console.log('✅ Dashboard gerado!');
}

// ========================================
// EXEMPLOS DE USO PRÁTICO
// ========================================

async function exemploUsoPratico() {
  console.log('\n💼 Exemplo de Uso Prático');
  console.log('==========================\n');
  
  const integracao = new OperacionalIntegration('development');
  
  // Cenário: Verificar oportunidades em um status específico
  console.log('📊 Cenário: Verificar oportunidades em status específico');
  console.log('');
  
  const statusId = STATUS_PORTABILIDADE.DIGITANDO;
  const statusInfo = obterStatusPorId(statusId);
  
  // 1. Buscar oportunidades no status
  console.log(`1. Buscando oportunidades no status "${statusInfo?.nome}"...`);
  const oportunidades = await integracao.buscarOportunidadesPorStatus(statusId);
  
  if (oportunidades.length === 0) {
    console.log('❌ Nenhuma oportunidade encontrada neste status');
    return;
  }
  
  console.log(`✅ Encontradas ${oportunidades.length} oportunidades:`);
  console.log('');
  
  // 2. Mostrar detalhes das oportunidades
  oportunidades.slice(0, 3).forEach((op, index) => {
    console.log(`📋 Oportunidade ${index + 1}:`);
    console.log(`   - ID: ${op.id}`);
    console.log(`   - Título: ${op.title}`);
    console.log(`   - Status: ${statusInfo?.nome || op.stageId}`);
    console.log(`   - Valor: R$ ${op.value?.toLocaleString('pt-BR') || 'N/A'}`);
    console.log(`   - Contato ID: ${op.contactId}`);
    console.log('');
  });
  
  // 3. Sugerir próximas ações
  if (oportunidades.length > 0) {
    const oportunidade = oportunidades[0];
    const proximosStatus = obterProximosStatus(FILAS.PORTABILIDADE, oportunidade.stageId);
    
    console.log('🎯 Próximas ações possíveis:');
    proximosStatus.forEach((status, index) => {
      console.log(`   ${index + 1}. ${status.nome}`);
    });
  }
  
  console.log('');
  console.log('✅ Verificação de oportunidades concluída!');
}

// ========================================
// EXECUTAR TODOS OS EXEMPLOS
// ========================================

async function executarTodosExemplos() {
  await exemploBuscaOportunidades();
  await exemploFluxoCompleto();
  await exemploDashboardOportunidades();
  await exemploUsoPratico();
  
  console.log('\n🎉 Todos os exemplos executados!');
  console.log('\n📋 Resumo das Funcionalidades:');
  console.log('1. Buscar oportunidade por ID');
  console.log('2. Buscar oportunidades de um contato');
  console.log('3. Buscar oportunidades por status');
  console.log('4. Alterar status de oportunidades');
  console.log('5. Dashboard de oportunidades');
  console.log('6. Verificação de oportunidades por status');
  console.log('7. Processamento de propostas (criar contato + oportunidade)');
}

// ========================================
// EXECUTAR
// ========================================

if (require.main === module) {
  executarTodosExemplos().catch(console.error);
}

module.exports = {
  exemploBuscaOportunidades,
  exemploFluxoCompleto,
  exemploDashboardOportunidades,
  exemploUsoPratico,
  executarTodosExemplos
};
