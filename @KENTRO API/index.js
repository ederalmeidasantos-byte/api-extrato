/**
 * Índice da API Kentro Integration
 * Ponto de entrada principal para integração
 */

// Exportar classes principais
const KentroClient = require('./kentro-client');
const OperacionalKentroIntegration = require('./operacional-integration');
const config = require('./config');

// Exportar exemplos
const examples = require('./examples');

// Exportar configuração
module.exports = {
  // Classes principais
  KentroClient,
  OperacionalKentroIntegration,
  
  // Configuração
  config,
  
  // Exemplos
  examples,
  
  // Versão
  version: require('./package.json').version,
  
  // Utilitários
  utils: {
    // Validar CPF
    validarCPF: (cpf) => {
      const pattern = /^\d{11}$/;
      return pattern.test(cpf);
    },
    
    // Validar telefone
    validarTelefone: (telefone) => {
      const pattern = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
      return pattern.test(telefone);
    },
    
    // Formatar CPF
    formatarCPF: (cpf) => {
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },
    
    // Formatar telefone
    formatarTelefone: (telefone) => {
      return telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
    },
    
    // Calcular valor da parcela
    calcularParcela: (valor, parcelas, taxaJuros) => {
      const taxaMensal = taxaJuros / 100;
      const valorParcela = valor * (taxaMensal * Math.pow(1 + taxaMensal, parcelas)) / 
                          (Math.pow(1 + taxaMensal, parcelas) - 1);
      return Math.round(valorParcela * 100) / 100;
    },
    
    // Calcular total de juros
    calcularTotalJuros: (valor, parcelas, taxaJuros) => {
      const valorParcela = module.exports.utils.calcularParcela(valor, parcelas, taxaJuros);
      const total = valorParcela * parcelas;
      return total - valor;
    }
  },
  
  // Constantes
  constants: {
    // Status de propostas
    STATUS_PROPOSTA: {
      PENDING: 'pending',
      PROCESSING: 'processing',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      EXPIRED: 'expired',
      CANCELLED: 'cancelled'
    },
    
    // Status de contratos
    STATUS_CONTRATO: {
      ACTIVE: 'ativo',
      INACTIVE: 'inativo',
      CANCELLED: 'cancelado',
      EXPIRED: 'expirado',
      SUSPENDED: 'suspenso'
    },
    
    // Providers
    PROVIDERS: {
      BMS: 'bms',
      CARTOS: 'cartos',
      QI: 'qi',
      SISTEMA: 'sistema'
    },
    
    // Códigos de erro
    ERROR_CODES: {
      FGTS_001: 'CPF inválido',
      FGTS_002: 'Saldo insuficiente',
      FGTS_003: 'Cliente não autorizado',
      FGTS_004: 'Proposta já existe',
      FGTS_005: 'Provider indisponível',
      CTR_001: 'Proposta não encontrada',
      CTR_002: 'Dados bancários inválidos',
      CTR_003: 'Contrato já existe',
      CTR_004: 'Cliente inativo',
      CTR_005: 'Limite excedido'
    }
  }
};

// Log de inicialização
console.log(`🚀 Kentro API Integration v${module.exports.version} carregada com sucesso!`);
console.log(`📚 Documentação: https://github.com/lunas-digital/kentro-api-integration`);
console.log(`🔧 Configuração: ${config.api[process.env.NODE_ENV || 'development'].baseUrl}`);



