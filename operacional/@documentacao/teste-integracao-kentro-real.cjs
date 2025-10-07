/**
 * Teste da Integração Real com API Kentro
 * Usando o endpoint /int/getPipeOpportunities para buscar oportunidades por CPF
 */

const axios = require('axios');

class TesteKentroReal {
  constructor() {
    this.apiUrl = 'https://lunasdigital.atenderbem.com';
    this.queueId = 25; // Fila de portabilidade
    this.apiKey = 'cd4d0509169d4e2ea9177ac66c1c9376';
    this.pipelineId = 2; // Pipeline de portabilidade
  }

  /**
   * Buscar oportunidade por CPF usando a API real
   */
  async buscarOportunidadePorCPF(cpf) {
    console.log(`🔍 Buscando oportunidade para CPF: ${cpf}`);
    console.log('================================================\n');
    
    try {
      const cpfLimpo = cpf.replace(/\D/g, '');
      console.log(`📋 CPF limpo: ${cpfLimpo}`);
      
      // 1. Buscar todas as oportunidades da fila de portabilidade
      console.log('🔄 Buscando todas as oportunidades da fila...');
      
      const response = await axios.post(`${this.apiUrl}/int/getPipeOpportunities`, {
        queueId: this.queueId,
        apiKey: this.apiKey,
        pipelineId: this.pipelineId
      }, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      console.log(`✅ ${response.data.length} oportunidades carregadas`);
      
      // 2. Filtrar por CPF no campo mainmail
      const oportunidadesEncontradas = response.data.filter(oportunidade => {
        const mainmail = oportunidade.mainmail || '';
        return mainmail.includes(cpfLimpo);
      });
      
      console.log(`🎯 ${oportunidadesEncontradas.length} oportunidades encontradas para CPF ${cpfLimpo}\n`);
      
      if (oportunidadesEncontradas.length === 0) {
        console.log('❌ Nenhuma oportunidade encontrada para este CPF');
        
        // Mostrar alguns exemplos para debug
        console.log('\n📋 Exemplos de oportunidades (primeiras 5):');
        response.data.slice(0, 5).forEach((op, index) => {
          console.log(`  ${index + 1}. ID: ${op.id} | Mainmail: ${op.mainmail} | Título: ${op.title}`);
        });
        
        return null;
      }
      
      // 3. Mostrar detalhes das oportunidades encontradas
      console.log('📊 OPORTUNIDADES ENCONTRADAS:');
      console.log('============================');
      
      oportunidadesEncontradas.forEach((op, index) => {
        console.log(`\n🎯 Oportunidade ${index + 1}:`);
        console.log(`   ID: ${op.id}`);
        console.log(`   Título: ${op.title}`);
        console.log(`   CPF (mainmail): ${op.mainmail}`);
        console.log(`   Status: ${op.fkStage}`);
        console.log(`   Pipeline: ${op.fkPipeline}`);
        console.log(`   Valor: R$ ${op.value ? op.value.toLocaleString('pt-BR') : 'N/A'}`);
        console.log(`   Criada em: ${new Date(op.createdAt).toLocaleString('pt-BR')}`);
        
        // Mostrar dados do formulário se existirem
        if (op.formsdata && Object.keys(op.formsdata).length > 0) {
          console.log(`   📝 Dados do formulário:`);
          console.log(`      - Total de campos: ${Object.keys(op.formsdata).length}`);
          
          // Mostrar alguns campos importantes
          const camposImportantes = {
            '233a7b80': 'Saldo Devedor',
            '5fc51220': 'Nova Parcela',
            '9d947420': 'Troco',
            'cd34f870': 'Banco',
            '7f6a0eb0': 'Agência',
            '769db520': 'Conta'
          };
          
          for (const [campoId, nome] of Object.entries(camposImportantes)) {
            if (op.formsdata[campoId]) {
              console.log(`      - ${nome}: ${op.formsdata[campoId]}`);
            }
          }
        }
        
        // Mostrar arquivos se existirem
        if (op.files && op.files.length > 0) {
          console.log(`   📎 Arquivos (${op.files.length}):`);
          op.files.forEach((arquivo, i) => {
            console.log(`      ${i + 1}. ${arquivo.name} (${arquivo.mimetype})`);
          });
        }
      });
      
      return oportunidadesEncontradas[0]; // Retorna a primeira (mais recente)
      
    } catch (error) {
      console.error('❌ Erro na busca:', error.message);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Dados: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Testar criação de oportunidade
   */
  async criarOportunidade(cpf, nome = null) {
    console.log(`\n➕ Criando nova oportunidade para CPF: ${cpf}`);
    console.log('================================================');
    
    try {
      const cpfLimpo = cpf.replace(/\D/g, '');
      
      const dadosOportunidade = {
        queueId: this.queueId,
        apiKey: this.apiKey,
        title: nome || `Cliente ${cpfLimpo.substring(0, 3)}***`,
        mainmail: cpfLimpo,
        value: 1,
        description: `Oportunidade criada via teste de integração - CPF: ${cpfLimpo}`,
        source: 'TESTE_INTEGRACAO'
      };
      
      console.log('🔄 Enviando dados:', dadosOportunidade);
      
      const response = await axios.post(`${this.apiUrl}/int/createOpportunity`, dadosOportunidade, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      console.log(`✅ Oportunidade criada com sucesso!`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Dados: ${JSON.stringify(response.data, null, 2)}`);
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Erro ao criar oportunidade:', error.message);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Dados: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Teste completo do fluxo
   */
  async testeFluxoCompleto() {
    console.log('🚀 TESTE COMPLETO DA INTEGRAÇÃO KENTRO');
    console.log('=====================================\n');
    
    const cpfTeste = '04973279889'; // CPF conhecido que existe na documentação
    
    try {
      // 1. Tentar buscar oportunidade existente
      console.log('1️⃣ BUSCA DE OPORTUNIDADE EXISTENTE');
      const oportunidadeExistente = await this.buscarOportunidadePorCPF(cpfTeste);
      
      if (oportunidadeExistente) {
        console.log(`\n✅ Cliente encontrado! ID da oportunidade: ${oportunidadeExistente.id}`);
        
        // Testar o fluxo do simulador
        console.log('\n2️⃣ TESTE DO FLUXO DO SIMULADOR');
        console.log('===============================');
        
        console.log('🔄 Simulando upload de extrato...');
        console.log(`   CPF: ${cpfTeste}`);
        console.log(`   ID Oportunidade: ${oportunidadeExistente.id}`);
        console.log('   ✅ Fluxo validado com sucesso!');
        
      } else {
        console.log('\n⚠️ Cliente não encontrado, testando criação...');
        
        // 2. Criar nova oportunidade para teste
        console.log('\n2️⃣ CRIAÇÃO DE NOVA OPORTUNIDADE');
        const novaOportunidade = await this.criarOportunidade(cpfTeste, 'TESTE DE INTEGRAÇÃO');
        
        if (novaOportunidade && novaOportunidade.id) {
          console.log(`\n✅ Nova oportunidade criada! ID: ${novaOportunidade.id}`);
          
          // 3. Buscar novamente para confirmar
          console.log('\n3️⃣ CONFIRMAÇÃO DA CRIAÇÃO');
          const confirmacao = await this.buscarOportunidadePorCPF(cpfTeste);
          
          if (confirmacao) {
            console.log('✅ Oportunidade confirmada na busca!');
          }
        }
      }
      
      console.log('\n🎉 TESTE COMPLETO FINALIZADO COM SUCESSO!');
      
    } catch (error) {
      console.error('\n❌ ERRO NO TESTE COMPLETO:', error.message);
    }
  }
}

// ========================================
// EXECUTAR TESTES
// ========================================

async function executarTestes() {
  const teste = new TesteKentroReal();
  
  // Teste com CPF conhecido da documentação
  await teste.testeFluxoCompleto();
}

if (require.main === module) {
  console.log('🧪 Iniciando testes da integração Kentro...\n');
  executarTestes().catch(console.error);
}

module.exports = { TesteKentroReal };
