/**
 * Exemplo de Uso Completo - Sistema Operacional
 * Demonstra como usar a integração com a API AtenderBem
 */

const OperacionalIntegration = require('./operacional-integration');
const { mapearDadosParaAPI, validarDadosFormulario } = require('./data-mapping');

// ========================================
// EXEMPLO DE DADOS DO FORMULÁRIO
// ========================================

const dadosFormularioExemplo = {
  // Campos financeiros
  '9d947420': 'R$ 1.500,00', // TROCO
  '9cceda30': 'R$ 2.800,00', // PARCELA
  '5fc51220': 'R$ 2.200,00', // Nova Parcela
  '233a7b80': 'R$ 45.000,00', // Saldo Devedor
  '6c76b4b0': 'R$ 43.500,00', // Valor Liquido
  '08715950': 'R$ 50.000,00', // Valor liberado
  
  // Campos do contrato
  '9af53830': '123456789', // CONTRATO
  'b4e24e90': '24', // PRAZO RESTANTE
  '69da8d80': '36', // Prazo
  '79562580': '60', // Prazo Atual
  '1576c8b0': '36', // Prazo
  
  // Campos de taxas
  'f5f58820': '2,14%', // TAXA ATUAL
  'f71e0290': '1,99%', // TAXA NOVA
  
  // Campos bancários
  '2fe18130': 'Banco do Brasil', // Banco Proposta
  '2e1d3bf0': 'Caixa Econômica', // Banco Originador
  'cd34f870': 'Banco do Brasil', // Banco
  '7f6a0eb0': '1234', // Agencia
  '769db520': '12345678', // Conta
  '66f9ee40': '11999999999', // PIX
  
  // Campos do cliente
  '98011220': '123.456.789-00', // CPF
  '6a93f650': 'João Silva Santos', // Nome
  '0bfc6250': '15/03/1980', // Data de Nascimento
  '9ed1cef0': '44', // IDADE
  '917456f0': 'Maria Silva Santos', // Nome da mãe
  '98167d80': '(11) 99999-9999', // Celular
  '9e7f92b0': 'joao@email.com', // E-mail
  
  // Campos do benefício
  'a88afbf0': '1234567890', // Número do Beneficio
  '3d8b2ff0': 'Aposentadoria por Idade', // Espécie do Beneficio
  '0c993430': 'Não', // NB Bloqueado?
  
  // Campos de endereço
  '1836e090': '01234-567', // CEP
  '1dbfcef0': 'Rua das Flores', // Logradouro
  '6ac31450': '123', // Número
  '3271f710': 'Centro', // Bairro
  '25178280': 'São Paulo', // CIDADE
  'f6384400': 'SP', // UF
  
  // Campos da proposta
  '38032740': 'PROP-2025-001', // Número da Proposta
  '2da09d50': 'https://assinatura.com/proposta/123', // Link de assinatura
  'ec165610': 'CIP-APROVADO', // Retorno CIP
  'efcd2160': '123456', // Número Portabilidade
  '8b176fe0': 'https://proposta.com/123', // Link
  
  // Campos de configuração
  'f0a67ce0': 'Tabela INSS 2025', // TABELA
  '80b68ec0': 'Averbador Principal', // AVERBADOR
  'c665b0c0': 'token123456', // Token
  'b8f2b110': 'SIM-2025-001', // ID SIMULAÇÃO
  'd9dd82b0': 'TAB-001', // ID TABELA
};

// ========================================
// EXEMPLO DE USO
// ========================================

async function exemploUsoCompleto() {
  try {
    console.log('🚀 Iniciando exemplo de uso completo...\n');
    
    // 1. Inicializar integração
    const integracao = new OperacionalIntegration('development');
    console.log('✅ Integração inicializada\n');
    
    // 2. Testar conexão
    console.log('🔍 Testando conexão com API...');
    const testeConexao = await integracao.testarConexao();
    console.log('Resultado:', testeConexao.message);
    console.log('');
    
    if (!testeConexao.success) {
      throw new Error('Falha na conexão com API');
    }
    
    // 3. Validar dados do formulário
    console.log('📋 Validando dados do formulário...');
    const validacao = validarDadosFormulario(dadosFormularioExemplo);
    
    if (!validacao.valido) {
      console.log('❌ Dados inválidos:');
      validacao.erros.forEach(erro => console.log(`  - ${erro}`));
      return;
    }
    
    console.log('✅ Dados válidos\n');
    
    // 4. Mapear dados
    console.log('🔄 Mapeando dados...');
    const dadosMapeados = mapearDadosParaAPI(dadosFormularioExemplo);
    console.log('✅ Dados mapeados com sucesso\n');
    
    // 5. Processar proposta (comentado para evitar chamadas reais)
    console.log('📝 Processando proposta...');
    console.log('⚠️  Processamento real comentado para evitar chamadas à API');
    console.log('');
    
    // Descomente para processar realmente:
    // const resultado = await integracao.processarProposta(dadosFormularioExemplo);
    // console.log('Resultado:', resultado);
    
    // 6. Exemplo de alteração de fase
    console.log('🔄 Exemplo de alteração de fase...');
    console.log('⚠️  Alteração real comentada para evitar chamadas à API');
    console.log('');
    
    // Descomente para alterar fase realmente:
    // const alteracaoFase = await integracao.alterarFaseOportunidade(12345, 2);
    // console.log('Fase alterada:', alteracaoFase);
    
    // 7. Exibir resumo dos dados
    console.log('📊 Resumo dos dados mapeados:');
    console.log('================================');
    console.log(`Cliente: ${dadosMapeados.cliente.nome}`);
    console.log(`CPF: ${dadosMapeados.cliente.cpf}`);
    console.log(`Benefício: ${dadosMapeados.beneficio.numero}`);
    console.log(`Valor Liberado: ${dadosMapeados.financeiro.valorLiberado}`);
    console.log(`Nova Parcela: ${dadosMapeados.financeiro.novaParcela}`);
    console.log(`Prazo: ${dadosMapeados.contrato.prazoNovo} meses`);
    console.log(`Banco: ${dadosMapeados.bancario.bancoProposta}`);
    console.log(`Troco: ${dadosMapeados.financeiro.troco}`);
    console.log('');
    
    // 8. Exibir cronograma de parcelas
    console.log('📅 Cronograma de parcelas:');
    console.log('===========================');
    dadosMapeados.cronograma.forEach((parcela, index) => {
      if (parcela.valor && parcela.data) {
        console.log(`Parcela ${index + 1}: ${parcela.valor} - ${parcela.data}`);
      }
    });
    console.log('');
    
    console.log('✅ Exemplo concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no exemplo:', error.message);
  }
}

// ========================================
// EXEMPLO DE INTEGRAÇÃO COM SERVIDOR
// ========================================

function exemploIntegracaoServidor() {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Endpoint para processar proposta
  app.post('/api/processar-proposta', async (req, res) => {
    try {
      const integracao = new OperacionalIntegration('development');
      const resultado = await integracao.processarProposta(req.body);
      
      res.json({
        success: true,
        message: 'Proposta processada com sucesso',
        data: resultado.data
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Erro ao processar proposta',
        error: error.message
      });
    }
  });
  
  // Endpoint para alterar fase
  app.post('/api/alterar-fase', async (req, res) => {
    try {
      const { oportunidadeId, novaFaseId } = req.body;
      const integracao = new OperacionalIntegration('development');
      const resultado = await integracao.alterarFaseOportunidade(oportunidadeId, novaFaseId);
      
      res.json({
        success: true,
        message: 'Fase alterada com sucesso',
        data: resultado.data
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Erro ao alterar fase',
        error: error.message
      });
    }
  });
  
  // Endpoint para testar conexão
  app.get('/api/testar-conexao', async (req, res) => {
    try {
      const integracao = new OperacionalIntegration('development');
      const resultado = await integracao.testarConexao();
      
      res.json(resultado);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao testar conexão',
        error: error.message
      });
    }
  });
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log('Endpoints disponíveis:');
    console.log('  POST /api/processar-proposta');
    console.log('  POST /api/alterar-fase');
    console.log('  GET  /api/testar-conexao');
  });
}

// ========================================
// EXECUTAR EXEMPLOS
// ========================================

if (require.main === module) {
  // Executar exemplo de uso
  exemploUsoCompleto();
  
  // Descomente para iniciar servidor de exemplo:
  // exemploIntegracaoServidor();
}

module.exports = {
  exemploUsoCompleto,
  exemploIntegracaoServidor,
  dadosFormularioExemplo
};



