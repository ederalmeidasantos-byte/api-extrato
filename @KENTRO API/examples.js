/**
 * Exemplos de uso da API Kentro
 * Integração com Sistema Operacional
 */

const KentroClient = require('./kentro-client');

// Configurar cliente
const kentro = new KentroClient('development');

// Configurar autenticação
kentro.setAuth(
  process.env.KENTRO_TOKEN || 'your_bearer_token_here',
  process.env.KENTRO_API_KEY || 'your_api_key_here'
);

/**
 * Exemplo 1: Disparar Proposta FGTS
 */
async function exemploDispararProposta() {
  try {
    console.log('🚀 Disparando proposta FGTS...');
    
    const dadosProposta = {
      cpf: '12345678901',
      valor: 15000.00,
      parcelas: 84,
      margem: 0.03,
      provider: 'bms',
      dados_cliente: {
        nome: 'João Silva Santos',
        nb: '1234567890',
        especie: 'Aposentadoria',
        telefone: '(11) 99999-9999'
      }
    };

    const resultado = await kentro.dispararProposta(dadosProposta);
    
    console.log('✅ Proposta disparada com sucesso:', resultado);
    return resultado.data.id;
    
  } catch (error) {
    console.error('❌ Erro ao disparar proposta:', error.message);
    throw error;
  }
}

/**
 * Exemplo 2: Criar Contrato FGTS
 */
async function exemploCriarContrato(propostaId) {
  try {
    console.log('📝 Criando contrato FGTS...');
    
    const dadosContrato = {
      proposta_id: propostaId,
      cliente_id: 'cliente_987654321',
      contrato: {
        valor: 15000.00,
        parcelas: 84,
        taxa_juros: 0.03,
        valor_parcela: 178.57,
        data_vencimento: '2025-02-01',
        banco: 'Banco do Brasil',
        agencia: '1234',
        conta: '567890'
      },
      dados_bancarios: {
        banco: '001',
        agencia: '1234',
        conta: '567890',
        digito: '1'
      }
    };

    const resultado = await kentro.criarContrato(dadosContrato);
    
    console.log('✅ Contrato criado com sucesso:', resultado);
    return resultado.data.contrato_id;
    
  } catch (error) {
    console.error('❌ Erro ao criar contrato:', error.message);
    throw error;
  }
}

/**
 * Exemplo 3: Consultar Status da Proposta
 */
async function exemploConsultarStatus(propostaId) {
  try {
    console.log('🔍 Consultando status da proposta...');
    
    const status = await kentro.consultarStatus(propostaId);
    
    console.log('📊 Status da proposta:', status);
    return status;
    
  } catch (error) {
    console.error('❌ Erro ao consultar status:', error.message);
    throw error;
  }
}

/**
 * Exemplo 4: Listar Contratos do Cliente
 */
async function exemploListarContratos(clienteId) {
  try {
    console.log('📋 Listando contratos do cliente...');
    
    const contratos = await kentro.listarContratos(clienteId);
    
    console.log('📄 Contratos encontrados:', contratos);
    return contratos;
    
  } catch (error) {
    console.error('❌ Erro ao listar contratos:', error.message);
    throw error;
  }
}

/**
 * Exemplo 5: Fluxo Completo - Proposta + Contrato
 */
async function exemploFluxoCompleto() {
  try {
    console.log('🔄 Iniciando fluxo completo...');
    
    // 1. Disparar proposta
    const propostaId = await exemploDispararProposta();
    
    // 2. Aguardar processamento (simulado)
    console.log('⏳ Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Consultar status
    const status = await exemploConsultarStatus(propostaId);
    
    // 4. Se aprovada, criar contrato
    if (status.data.status === 'approved') {
      const contratoId = await exemploCriarContrato(propostaId);
      console.log('🎉 Fluxo completo finalizado! Contrato ID:', contratoId);
    } else {
      console.log('⚠️ Proposta não foi aprovada:', status.data.status);
    }
    
  } catch (error) {
    console.error('❌ Erro no fluxo completo:', error.message);
  }
}

/**
 * Exemplo 6: Integração com Sistema Operacional
 */
class SistemaOperacionalIntegration {
  constructor() {
    this.kentro = new KentroClient('production');
    this.kentro.setAuth(
      process.env.KENTRO_TOKEN,
      process.env.KENTRO_API_KEY
    );
  }

  /**
   * Processar proposta do sistema operacional
   */
  async processarPropostaOperacional(dadosOperacional) {
    try {
      // Converter dados do sistema operacional para formato Kentro
      const dadosKentro = this.converterDadosOperacional(dadosOperacional);
      
      // Disparar proposta
      const resultado = await this.kentro.dispararProposta(dadosKentro);
      
      // Salvar no banco de dados local
      await this.salvarPropostaLocal(dadosOperacional.id, resultado);
      
      return resultado;
      
    } catch (error) {
      console.error('Erro ao processar proposta:', error);
      throw error;
    }
  }

  /**
   * Converter dados do sistema operacional
   */
  converterDadosOperacional(dados) {
    return {
      cpf: dados.cliente.cpf,
      valor: dados.proposta.valor,
      parcelas: dados.proposta.parcelas,
      margem: dados.proposta.margem,
      provider: this.selecionarProvider(dados.proposta),
      dados_cliente: {
        nome: dados.cliente.nome,
        nb: dados.cliente.nb,
        especie: dados.cliente.especie,
        telefone: dados.cliente.telefone
      }
    };
  }

  /**
   * Selecionar provider baseado na proposta
   */
  selecionarProvider(proposta) {
    // Lógica para selecionar o melhor provider
    if (proposta.valor <= 5000) return 'sistema';
    if (proposta.valor <= 15000) return 'bms';
    if (proposta.valor <= 30000) return 'cartos';
    return 'qi';
  }

  /**
   * Salvar proposta no banco local
   */
  async salvarPropostaLocal(id, resultado) {
    // Implementar salvamento no banco de dados
    console.log('💾 Salvando proposta local:', id, resultado.data.id);
  }
}

/**
 * Exemplo 7: Monitoramento e Estatísticas
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
        kentro.consultarStatus(`proposta_${i}`)
          .catch(err => console.log(`Erro na requisição ${i}:`, err.message))
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
 * Exemplo 8: Tratamento de Erros
 */
async function exemploTratamentoErros() {
  try {
    console.log('🚨 Testando tratamento de erros...');
    
    // Teste com CPF inválido
    try {
      await kentro.dispararProposta({
        cpf: '123', // CPF inválido
        valor: 1000,
        parcelas: 12,
        margem: 0.05
      });
    } catch (error) {
      console.log('✅ Erro de validação capturado:', error.message);
    }
    
    // Teste com valor inválido
    try {
      await kentro.dispararProposta({
        cpf: '12345678901',
        valor: 50, // Valor muito baixo
        parcelas: 12,
        margem: 0.05
      });
    } catch (error) {
      console.log('✅ Erro de valor capturado:', error.message);
    }
    
    // Teste com rate limit
    console.log('⏱️ Testando rate limit...');
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(
        kentro.consultarStatus(`proposta_${i}`)
          .catch(err => console.log(`Rate limit: ${err.message}`))
      );
    }
    
    await Promise.all(promises);
    
  } catch (error) {
    console.error('❌ Erro no teste de erros:', error.message);
  }
}

// Exportar exemplos
module.exports = {
  exemploDispararProposta,
  exemploCriarContrato,
  exemploConsultarStatus,
  exemploListarContratos,
  exemploFluxoCompleto,
  SistemaOperacionalIntegration,
  exemploMonitoramento,
  exemploTratamentoErros
};

// Executar exemplos se chamado diretamente
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Iniciando exemplos da API Kentro...\n');
      
      // Exemplo básico
      await exemploDispararProposta();
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



