/**
 * Exemplos de uso da API CRM Kentro (AtenderBem)
 * Integração com Sistema Operacional
 */

const KentroClient = require('./kentro-client');

// Configurar cliente
const kentro = new KentroClient('development');

// Configurar autenticação
kentro.setAuth(
  process.env.KENTRO_TOKEN || 'cd4d0509169d4e2ea9177ac66c1c9376',
  process.env.KENTRO_API_KEY || 'cd4d0509169d4e2ea9177ac66c1c9376'
);

/**
 * Exemplo 1: Alterar Fase da Oportunidade
 */
async function exemploAlterarFase() {
  try {
    console.log('🔄 Alterando fase da oportunidade...');
    
    const dadosFase = {
      queueId: 25,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      id: 20764,
      destStageId: 43
    };

    const resultado = await kentro.alterarFaseOportunidade(dadosFase);
    
    console.log('✅ Fase alterada com sucesso:', resultado);
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro ao alterar fase:', error.message);
    throw error;
  }
}

/**
 * Exemplo 2: Atualizar Dados da Oportunidade
 */
async function exemploAtualizarOportunidade() {
  try {
    console.log('📝 Atualizando dados da oportunidade...');
    
    const dadosAtualizacao = {
      queueId: 25,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      id: 36478,
      value: 40
    };

    const resultado = await kentro.atualizarOportunidade(dadosAtualizacao);
    
    console.log('✅ Oportunidade atualizada com sucesso:', resultado);
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro ao atualizar oportunidade:', error.message);
    throw error;
  }
}

/**
 * Exemplo 3: Fluxo Completo - Alterar Fase + Atualizar
 */
async function exemploFluxoCompleto() {
  try {
    console.log('🔄 Iniciando fluxo completo...');
    
    // 1. Alterar fase da oportunidade
    const fase = await exemploAlterarFase();
    
    // 2. Aguardar processamento
    console.log('⏳ Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Atualizar dados da oportunidade
    const atualizacao = await exemploAtualizarOportunidade();
    
    console.log('🎉 Fluxo completo finalizado!');
    console.log('Fase alterada:', fase);
    console.log('Dados atualizados:', atualizacao);
    
  } catch (error) {
    console.error('❌ Erro no fluxo completo:', error.message);
  }
}

/**
 * Exemplo 4: Integração com Sistema Operacional
 */
class SistemaOperacionalCRMIntegration {
  constructor() {
    this.kentro = new KentroClient('production');
    this.kentro.setAuth(
      process.env.KENTRO_TOKEN,
      process.env.KENTRO_API_KEY
    );
  }

  /**
   * Processar mudança de fase do sistema operacional
   */
  async processarMudancaFase(dadosOperacional) {
    try {
      // Converter dados do sistema operacional para formato CRM
      const dadosCRM = this.converterDadosOperacional(dadosOperacional);
      
      // Alterar fase
      const resultado = await this.kentro.alterarFaseOportunidade(dadosCRM);
      
      // Salvar no banco de dados local
      await this.salvarMudancaFaseLocal(dadosOperacional.id, resultado);
      
      return resultado;
      
    } catch (error) {
      console.error('Erro ao processar mudança de fase:', error);
      throw error;
    }
  }

  /**
   * Processar atualização de dados do sistema operacional
   */
  async processarAtualizacaoDados(dadosOperacional) {
    try {
      // Converter dados do sistema operacional para formato CRM
      const dadosCRM = this.converterDadosAtualizacao(dadosOperacional);
      
      // Atualizar oportunidade
      const resultado = await this.kentro.atualizarOportunidade(dadosCRM);
      
      // Salvar no banco de dados local
      await this.salvarAtualizacaoLocal(dadosOperacional.id, resultado);
      
      return resultado;
      
    } catch (error) {
      console.error('Erro ao processar atualização:', error);
      throw error;
    }
  }

  /**
   * Converter dados do sistema operacional para mudança de fase
   */
  converterDadosOperacional(dados) {
    return {
      queueId: dados.queueId || 25,
      apiKey: process.env.KENTRO_API_KEY,
      id: dados.opportunityId,
      destStageId: dados.newStageId
    };
  }

  /**
   * Converter dados do sistema operacional para atualização
   */
  converterDadosAtualizacao(dados) {
    return {
      queueId: dados.queueId || 25,
      apiKey: process.env.KENTRO_API_KEY,
      id: dados.opportunityId,
      value: dados.newValue
    };
  }

  /**
   * Salvar mudança de fase no banco local
   */
  async salvarMudancaFaseLocal(id, resultado) {
    console.log('💾 Salvando mudança de fase local:', id, resultado);
    // Implementar salvamento no banco de dados
  }

  /**
   * Salvar atualização no banco local
   */
  async salvarAtualizacaoLocal(id, resultado) {
    console.log('💾 Salvando atualização local:', id, resultado);
    // Implementar salvamento no banco de dados
  }
}

/**
 * Exemplo 5: Monitoramento e Estatísticas
 */
async function exemploMonitoramento() {
  try {
    console.log('📊 Estatísticas de Rate Limit:');
    const stats = kentro.getRateLimitStats();
    console.log(JSON.stringify(stats, null, 2));
    
    // Testar múltiplas requisições
    console.log('🧪 Testando múltiplas requisições...');
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        kentro.alterarFaseOportunidade({
          queueId: 25,
          apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
          id: 20764 + i,
          destStageId: 43
        }).catch(err => console.log(`Erro na requisição ${i}:`, err.message))
      );
    }
    
    await Promise.all(promises);
    
    console.log('📊 Estatísticas após testes:');
    const statsFinais = kentro.getRateLimitStats();
    console.log(JSON.stringify(statsFinais, null, 2));
    
  } catch (error) {
    console.error('❌ Erro no monitoramento:', error.message);
  }
}

/**
 * Exemplo 6: Tratamento de Erros
 */
async function exemploTratamentoErros() {
  try {
    console.log('🚨 Testando tratamento de erros...');
    
    // Teste com ID inválido
    try {
      await kentro.alterarFaseOportunidade({
        queueId: 25,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        id: 999999, // ID inválido
        destStageId: 43
      });
    } catch (error) {
      console.log('✅ Erro de ID inválido capturado:', error.message);
    }
    
    // Teste com API Key inválida
    try {
      await kentro.alterarFaseOportunidade({
        queueId: 25,
        apiKey: 'invalid_key', // API Key inválida
        id: 20764,
        destStageId: 43
      });
    } catch (error) {
      console.log('✅ Erro de API Key capturado:', error.message);
    }
    
    // Teste com Stage ID inválido
    try {
      await kentro.alterarFaseOportunidade({
        queueId: 25,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        id: 20764,
        destStageId: 999999 // Stage ID inválido
      });
    } catch (error) {
      console.log('✅ Erro de Stage ID capturado:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de erros:', error.message);
  }
}

// Exportar exemplos
module.exports = {
  exemploAlterarFase,
  exemploAtualizarOportunidade,
  exemploFluxoCompleto,
  SistemaOperacionalCRMIntegration,
  exemploMonitoramento,
  exemploTratamentoErros
};

// Executar exemplos se chamado diretamente
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Iniciando exemplos da API CRM Kentro...\n');
      
      // Exemplo básico
      await exemploAlterarFase();
      console.log('\n' + '='.repeat(50) + '\n');
      
      // Exemplo de monitoramento
      await exemploMonitoramento();
      console.log('\n' + '='.repeat(50) + '\n');
      
      // Exemplo de tratamento de erros
      await exemploTratamentoErros();
      
      console.log('\n✅ Exemplos concluídos!');
      
    } catch (error) {
      console.error('❌ Erro nos exemplos:', error.message);
    }
  })();
}



