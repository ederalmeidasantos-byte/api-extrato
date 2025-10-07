/**
 * Exemplo de Uso dos Status do CRM
 * Demonstra como usar o mapeamento de status do CRM
 */

const {
  crmStatusMapping,
  obterStatusPorId,
  obterStatusPorFila,
  obterProximosStatus,
  isStatusFinal,
  obterFluxoCompleto,
  obterEstatisticasFila,
  validarTransicaoStatus,
  obterResumoGeral,
  FILAS,
  STATUS_PORTABILIDADE,
  STATUS_FGTS
} = require('./crm-status-mapping');

// ========================================
// EXEMPLOS DE USO
// ========================================

function exemploUsoBasico() {
  console.log('🔍 Exemplo de Uso Básico dos Status CRM\n');

  // 1. Obter status por ID
  console.log('1. Obter status por ID:');
  const status = obterStatusPorId(8);
  console.log('Status ID 8:', status);
  console.log('');

  // 2. Obter status por fila
  console.log('2. Obter status da fila FGTS:');
  const filaFgts = obterStatusPorFila(FILAS.FGTS);
  console.log('Fila FGTS:', filaFgts.nome);
  console.log('Total de status:', Object.keys(filaFgts.status).length);
  console.log('');

  // 3. Verificar se status é final
  console.log('3. Verificar se status é final:');
  console.log('Status 15 (Pago) é final?', isStatusFinal(15));
  console.log('Status 8 (Início) é final?', isStatusFinal(8));
  console.log('');

  // 4. Obter próximos status
  console.log('4. Próximos status possíveis:');
  const proximos = obterProximosStatus(FILAS.PORTABILIDADE, STATUS_PORTABILIDADE.INICIO);
  console.log('Próximos do status Início (Portabilidade):');
  proximos.forEach(s => console.log(`  - ${s.nome} (ID: ${s.id})`));
  console.log('');
}

function exemploFluxoCompleto() {
  console.log('📊 Exemplo de Fluxo Completo\n');

  // 1. Fluxo da Portabilidade
  console.log('1. Fluxo da Portabilidade:');
  const fluxoPortabilidade = obterFluxoCompleto(FILAS.PORTABILIDADE);
  fluxoPortabilidade.forEach((status, index) => {
    const emoji = status.final ? '🏁' : '➡️';
    console.log(`  ${emoji} ${index + 1}. ${status.nome} (ID: ${status.id})`);
  });
  console.log('');

  // 2. Fluxo do FGTS
  console.log('2. Fluxo do FGTS:');
  const fluxoFgts = obterFluxoCompleto(FILAS.FGTS);
  fluxoFgts.forEach((status, index) => {
    const emoji = status.final ? '🏁' : '➡️';
    console.log(`  ${emoji} ${index + 1}. ${status.nome} (ID: ${status.id})`);
  });
  console.log('');
}

function exemploValidacaoTransicao() {
  console.log('✅ Exemplo de Validação de Transição\n');

  // 1. Transição válida
  console.log('1. Transição válida (Início → Oferta Troco):');
  const validacao1 = validarTransicaoStatus(
    FILAS.PORTABILIDADE,
    STATUS_PORTABILIDADE.INICIO,
    STATUS_PORTABILIDADE.OFERTA_TROCO
  );
  console.log('Resultado:', validacao1.valida ? '✅ Válida' : '❌ Inválida');
  if (!validacao1.valida) console.log('Erro:', validacao1.erro);
  console.log('');

  // 2. Transição inválida (volta no fluxo)
  console.log('2. Transição inválida (Oferta Troco → Início):');
  const validacao2 = validarTransicaoStatus(
    FILAS.PORTABILIDADE,
    STATUS_PORTABILIDADE.OFERTA_TROCO,
    STATUS_PORTABILIDADE.INICIO
  );
  console.log('Resultado:', validacao2.valida ? '✅ Válida' : '❌ Inválida');
  if (!validacao2.valida) console.log('Erro:', validacao2.erro);
  console.log('');

  // 3. Transição para status final
  console.log('3. Transição para status final (Aguardando Assinatura → Pago):');
  const validacao3 = validarTransicaoStatus(
    FILAS.PORTABILIDADE,
    STATUS_PORTABILIDADE.AGUARDANDO_ASSINATURA,
    STATUS_PORTABILIDADE.PAGO
  );
  console.log('Resultado:', validacao3.valida ? '✅ Válida' : '❌ Inválida');
  if (!validacao3.valida) console.log('Erro:', validacao3.erro);
  console.log('');
}

function exemploEstatisticas() {
  console.log('📈 Exemplo de Estatísticas\n');

  // 1. Estatísticas da fila Portabilidade
  console.log('1. Estatísticas da Portabilidade:');
  const statsPortabilidade = obterEstatisticasFila(FILAS.PORTABILIDADE);
  console.log(`  - Fila: ${statsPortabilidade.fila}`);
  console.log(`  - Total de status: ${statsPortabilidade.totalStatus}`);
  console.log(`  - Status ativos: ${statsPortabilidade.statusAtivos}`);
  console.log(`  - Status finais: ${statsPortabilidade.statusFinais}`);
  console.log(`  - Cores utilizadas: ${statsPortabilidade.cores.join(', ')}`);
  console.log('');

  // 2. Estatísticas da fila FGTS
  console.log('2. Estatísticas do FGTS:');
  const statsFgts = obterEstatisticasFila(FILAS.FGTS);
  console.log(`  - Fila: ${statsFgts.fila}`);
  console.log(`  - Total de status: ${statsFgts.totalStatus}`);
  console.log(`  - Status ativos: ${statsFgts.statusAtivos}`);
  console.log(`  - Status finais: ${statsFgts.statusFinais}`);
  console.log(`  - Cores utilizadas: ${statsFgts.cores.join(', ')}`);
  console.log('');

  // 3. Resumo geral
  console.log('3. Resumo Geral:');
  const resumoGeral = obterResumoGeral();
  console.log(`  - Total de filas: ${resumoGeral.totalFilas}`);
  console.log(`  - Total de status: ${resumoGeral.totalStatus}`);
  console.log('  - Filas:');
  resumoGeral.filas.forEach(fila => {
    console.log(`    * ${fila.fila}: ${fila.totalStatus} status`);
  });
  console.log('');
}

function exemploIntegracaoComAPI() {
  console.log('🔗 Exemplo de Integração com API\n');

  // Simular alteração de status
  const simularAlteracaoStatus = (filaId, statusAtualId, novoStatusId) => {
    console.log(`Alterando status da fila ${filaId}:`);
    console.log(`  - Status atual: ${statusAtualId}`);
    console.log(`  - Novo status: ${novoStatusId}`);
    
    const validacao = validarTransicaoStatus(filaId, statusAtualId, novoStatusId);
    
    if (validacao.valida) {
      console.log('  ✅ Transição válida!');
      console.log(`  - De: ${validacao.statusAtual.nome}`);
      console.log(`  - Para: ${validacao.novoStatus.nome}`);
      
      // Aqui seria feita a chamada real para a API
      console.log('  📡 Chamando API para alterar status...');
      console.log(`  POST /int/changeOpportunityStage`);
      console.log(`  Body: { "queueId": ${filaId}, "id": 12345, "destStageId": ${novoStatusId} }`);
    } else {
      console.log('  ❌ Transição inválida!');
      console.log(`  - Erro: ${validacao.erro}`);
    }
    console.log('');
  };

  // Exemplos de alterações
  simularAlteracaoStatus(FILAS.PORTABILIDADE, STATUS_PORTABILIDADE.INICIO, STATUS_PORTABILIDADE.OFERTA_TROCO);
  simularAlteracaoStatus(FILAS.FGTS, STATUS_FGTS.INICIO, STATUS_FGTS.SIMULANDO_FGTS);
  simularAlteracaoStatus(FILAS.PORTABILIDADE, STATUS_PORTABILIDADE.PAGO, STATUS_PORTABILIDADE.INICIO); // Inválida
}

function exemploDashboard() {
  console.log('📊 Exemplo de Dashboard de Status\n');

  // Simular dados de dashboard
  const dadosDashboard = {
    portabilidade: {
      total: 150,
      porStatus: {
        [STATUS_PORTABILIDADE.INICIO]: 25,
        [STATUS_PORTABILIDADE.OFERTA_TROCO]: 30,
        [STATUS_PORTABILIDADE.DIGITANDO]: 20,
        [STATUS_PORTABILIDADE.AGUARDANDO_ASSINATURA]: 15,
        [STATUS_PORTABILIDADE.PAGO]: 60
      }
    },
    fgts: {
      total: 200,
      porStatus: {
        [STATUS_FGTS.INICIO]: 40,
        [STATUS_FGTS.SIMULANDO_FGTS]: 35,
        [STATUS_FGTS.VALOR_LIBERADO]: 25,
        [STATUS_FGTS.PROPOSTA_PAGA]: 100
      }
    }
  };

  console.log('Dashboard de Status:');
  console.log('==================');
  console.log('');

  // Portabilidade
  console.log('📋 PORTABILIDADE (Total: 150)');
  const fluxoPort = obterFluxoCompleto(FILAS.PORTABILIDADE);
  fluxoPort.forEach(status => {
    const quantidade = dadosDashboard.portabilidade.porStatus[status.id] || 0;
    const percentual = ((quantidade / dadosDashboard.portabilidade.total) * 100).toFixed(1);
    const barra = '█'.repeat(Math.floor(percentual / 2));
    console.log(`  ${status.nome.padEnd(25)} ${quantidade.toString().padStart(3)} (${percentual}%) ${barra}`);
  });
  console.log('');

  // FGTS
  console.log('💰 FGTS (Total: 200)');
  const fluxoFgts = obterFluxoCompleto(FILAS.FGTS);
  fluxoFgts.forEach(status => {
    const quantidade = dadosDashboard.fgts.porStatus[status.id] || 0;
    const percentual = ((quantidade / dadosDashboard.fgts.total) * 100).toFixed(1);
    const barra = '█'.repeat(Math.floor(percentual / 2));
    console.log(`  ${status.nome.padEnd(25)} ${quantidade.toString().padStart(3)} (${percentual}%) ${barra}`);
  });
  console.log('');
}

// ========================================
// EXECUTAR TODOS OS EXEMPLOS
// ========================================

function executarTodosExemplos() {
  console.log('🚀 Exemplos de Uso dos Status CRM');
  console.log('==================================\n');

  exemploUsoBasico();
  exemploFluxoCompleto();
  exemploValidacaoTransicao();
  exemploEstatisticas();
  exemploIntegracaoComAPI();
  exemploDashboard();

  console.log('✅ Todos os exemplos executados com sucesso!');
}

// ========================================
// EXECUTAR
// ========================================

if (require.main === module) {
  executarTodosExemplos();
}

module.exports = {
  exemploUsoBasico,
  exemploFluxoCompleto,
  exemploValidacaoTransicao,
  exemploEstatisticas,
  exemploIntegracaoComAPI,
  exemploDashboard,
  executarTodosExemplos
};



