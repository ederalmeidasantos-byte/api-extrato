/**
 * Mapeamento de Dados - Sistema Operacional
 * Mapeamento completo dos campos do formulário para integração com API AtenderBem
 */

const dataMapping = {
  // ========================================
  // CAMPOS PRINCIPAIS DA PROPOSTA
  // ========================================
  
  // Informações Financeiras
  financeiro: {
    troco: {
      id: '9d947420',
      nome: 'TROCO',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'valor_monetario',
      descricao: 'Valor do troco da operação'
    },
    parcela: {
      id: '9cceda30',
      nome: 'PARCELA',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'valor_monetario',
      descricao: 'Valor da parcela atual'
    },
    novaParcela: {
      id: '5fc51220',
      nome: 'Nova Parcela',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'valor_monetario',
      descricao: 'Valor da nova parcela proposta'
    },
    saldoDevedor: {
      id: '233a7b80',
      nome: 'Saldo Devedor',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'valor_monetario',
      descricao: 'Saldo devedor atual'
    },
    valorLiquido: {
      id: '6c76b4b0',
      nome: 'Valor Liquido',
      tipo: 'texto',
      validacao: 'valor_monetario',
      descricao: 'Valor líquido da operação'
    },
    valorLiberado: {
      id: '08715950',
      nome: 'Valor liberado',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'valor_monetario',
      descricao: 'Valor a ser liberado'
    }
  },

  // Informações de Contrato
  contrato: {
    contrato: {
      id: '9af53830',
      nome: 'CONTRATO',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Número do contrato atual'
    },
    prazoRestante: {
      id: 'b4e24e90',
      nome: 'PRAZO RESTANTE',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'numero',
      descricao: 'Prazo restante do contrato atual'
    },
    prazo: {
      id: '69da8d80',
      nome: 'Prazo',
      tipo: 'multipla_escolha',
      obrigatorio: true,
      validacao: 'selecao_unica',
      descricao: 'Prazo da nova proposta'
    },
    prazoAtual: {
      id: '79562580',
      nome: 'Prazo Atual',
      tipo: 'texto',
      validacao: 'numero',
      descricao: 'Prazo atual do contrato'
    },
    prazoNovo: {
      id: '1576c8b0',
      nome: 'Prazo',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'numero',
      descricao: 'Prazo da nova proposta'
    }
  },

  // Informações de Taxas
  taxas: {
    taxaAtual: {
      id: 'f5f58820',
      nome: 'TAXA ATUAL',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'percentual',
      descricao: 'Taxa atual do contrato'
    },
    taxaNova: {
      id: 'f71e0290',
      nome: 'TAXA NOVA',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'percentual',
      descricao: 'Nova taxa proposta'
    }
  },

  // Informações Bancárias
  bancario: {
    bancoProposta: {
      id: '2fe18130',
      nome: 'Banco Proposta',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Banco da nova proposta'
    },
    bancoOriginador: {
      id: '2e1d3bf0',
      nome: 'Banco Originador',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'Banco originador do contrato'
    },
    banco: {
      id: 'cd34f870',
      nome: 'Banco',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Banco para recebimento'
    },
    agencia: {
      id: '7f6a0eb0',
      nome: 'Agencia',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'agencia',
      descricao: 'Agência bancária'
    },
    conta: {
      id: '769db520',
      nome: 'Conta',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'conta',
      descricao: 'Conta bancária'
    },
    pix: {
      id: '66f9ee40',
      nome: 'PIX',
      tipo: 'texto',
      validacao: 'pix',
      descricao: 'Chave PIX'
    }
  },

  // Informações do Cliente
  cliente: {
    cpf: {
      id: '98011220',
      nome: 'CPF',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'cpf',
      descricao: 'CPF do cliente'
    },
    nome: {
      id: '6a93f650',
      nome: 'Documento',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Nome do cliente'
    },
    dataNascimento: {
      id: '0bfc6250',
      nome: 'Data de Nascimento',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'data',
      descricao: 'Data de nascimento do cliente'
    },
    idade: {
      id: '9ed1cef0',
      nome: 'IDADE',
      tipo: 'texto',
      validacao: 'numero',
      descricao: 'Idade do cliente'
    },
    nomeMae: {
      id: '917456f0',
      nome: 'Nome da mãe',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Nome da mãe do cliente'
    },
    celular: {
      id: '98167d80',
      nome: 'Celular para SMS',
      tipo: 'telefone',
      obrigatorio: true,
      validacao: 'telefone',
      descricao: 'Celular para SMS'
    },
    email: {
      id: '9e7f92b0',
      nome: 'E-mail',
      tipo: 'email',
      validacao: 'email',
      descricao: 'E-mail do cliente'
    }
  },

  // Informações do Benefício
  beneficio: {
    numeroBeneficio: {
      id: 'a88afbf0',
      nome: 'Número do Beneficio',
      tipo: 'numero_inteiro',
      obrigatorio: true,
      validacao: 'numero',
      descricao: 'Número do benefício INSS'
    },
    especieBeneficio: {
      id: '3d8b2ff0',
      nome: 'Espécie do Beneficio',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Espécie do benefício'
    },
    nbBloqueado: {
      id: '0c993430',
      nome: 'NB Bloqueado?',
      tipo: 'multipla_escolha',
      obrigatorio: true,
      validacao: 'selecao_unica',
      descricao: 'Se o benefício está bloqueado'
    }
  },

  // Informações do Representante
  representante: {
    nomeRepresentante: {
      id: '9cd637f0',
      nome: 'Nome do Representante',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'Nome do representante legal'
    },
    cpfRepresentante: {
      id: '9d758530',
      nome: 'CPF do Representante',
      tipo: 'texto',
      validacao: 'cpf',
      descricao: 'CPF do representante legal'
    }
  },

  // Informações de Endereço
  endereco: {
    cep: {
      id: '1836e090',
      nome: 'CEP',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'cep',
      descricao: 'CEP do endereço'
    },
    logradouro: {
      id: '1dbfcef0',
      nome: 'Lougradouro',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Logradouro do endereço'
    },
    numero: {
      id: '6ac31450',
      nome: 'Número',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Número do endereço'
    },
    bairro: {
      id: '3271f710',
      nome: 'Bairro',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Bairro do endereço'
    },
    cidade: {
      id: '25178280',
      nome: 'CIDADE',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'texto',
      descricao: 'Cidade do endereço'
    },
    uf: {
      id: 'f6384400',
      nome: 'UF',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'uf',
      descricao: 'Estado do endereço'
    }
  },

  // Informações da Proposta
  proposta: {
    numeroProposta: {
      id: '38032740',
      nome: 'Número da Proposta',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'Número da proposta'
    },
    numeroPropostaNovo: {
      id: '9de72fc0',
      nome: 'Número da Proposta',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'Número da nova proposta'
    },
    linkAssinatura: {
      id: '2da09d50',
      nome: 'Link de assinatura',
      tipo: 'texto',
      validacao: 'url',
      descricao: 'Link para assinatura digital'
    },
    retornoCip: {
      id: 'ec165610',
      nome: 'Retorno CIP',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'Retorno do CIP'
    },
    numeroPortabilidade: {
      id: 'efcd2160',
      nome: 'Número Portabilidade',
      tipo: 'numero_inteiro',
      validacao: 'numero',
      descricao: 'Número da portabilidade'
    },
    link: {
      id: '8b176fe0',
      nome: 'Link',
      tipo: 'texto',
      obrigatorio: true,
      validacao: 'url',
      descricao: 'Link da proposta'
    }
  },

  // Informações de Configuração
  configuracao: {
    tabela: {
      id: 'f0a67ce0',
      nome: 'TABELA',
      tipo: 'multipla_escolha',
      obrigatorio: true,
      validacao: 'selecao_unica',
      descricao: 'Tabela de referência'
    },
    averbador: {
      id: '80b68ec0',
      nome: 'AVERBADOR',
      tipo: 'multipla_escolha',
      obrigatorio: true,
      validacao: 'selecao_unica',
      descricao: 'Averbador da operação'
    },
    token: {
      id: 'c665b0c0',
      nome: 'Token',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'Token de autenticação'
    },
    idSimulacao: {
      id: 'b8f2b110',
      nome: 'ID SIMULAÇÃO',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'ID da simulação'
    },
    idTabela: {
      id: 'd9dd82b0',
      nome: 'ID TABELA',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'ID da tabela'
    }
  },

  // Informações de Marketing
  marketing: {
    idAnuncio: {
      id: '3b4b4a50',
      nome: 'ID do Anuncio',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'ID do anúncio'
    },
    nomeAnuncio: {
      id: '44414bf0',
      nome: 'Nome do anuncio',
      tipo: 'texto',
      validacao: 'texto',
      descricao: 'Nome do anúncio'
    },
    linkAnuncio: {
      id: '4a0e9650',
      nome: 'Link do anuncio',
      tipo: 'texto',
      validacao: 'url',
      descricao: 'Link do anúncio'
    }
  },

  // Cronograma de Parcelas
  cronograma: {
    parcelas: [
      { id: '90bd9810', nome: 'PARCELA 1', dataId: '929da2b0', dataNome: 'DATA 1' },
      { id: '93618ef0', nome: 'PARCELA 2', dataId: '9423f490', dataNome: 'DATA 2' },
      { id: '957af910', nome: 'PARCELA 3', dataId: '9649bac0', dataNome: 'DATA 3' },
      { id: '97076570', nome: 'PARCELA 4', dataId: '979f1190', dataNome: 'DATA 4' },
      { id: '98318d90', nome: 'PARCELA 5', dataId: '98d17710', dataNome: 'DATA 5' },
      { id: '99f843d0', nome: 'PARCELA 6', dataId: '9a9cc130', dataNome: 'DATA 6' },
      { id: '9b2f8b50', nome: 'PARCELA 7', dataId: '9bc64d10', dataNome: 'DATA 7' },
      { id: '9c51eb40', nome: 'PARCELA 8', dataId: '9ce9be70', dataNome: 'DATA 8' },
      { id: '9d831840', nome: 'PARCELA 9', dataId: '9e1482d0', dataNome: 'DATA 9' },
      { id: '9e9a2d90', nome: 'PARCELA 10', dataId: '9f218600', dataNome: 'DATA 10' }
    ]
  }
};

// ========================================
// FUNÇÕES DE VALIDAÇÃO
// ========================================

const validacoes = {
  valor_monetario: (valor) => {
    // Aceita formatos como: R$ 1.500,00, 1500,00, 1.500,00, R$1500,00
    const regex = /^(R\$\s?)?\d{1,3}(\.\d{3})*(,\d{2})?$/;
    return regex.test(valor);
  },
  
  percentual: (valor) => {
    const regex = /^\d{1,2}(,\d{2})?%?$/;
    return regex.test(valor);
  },
  
  cpf: (cpf) => {
    const regex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    return regex.test(cpf);
  },
  
  telefone: (telefone) => {
    const regex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return regex.test(telefone);
  },
  
  email: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },
  
  cep: (cep) => {
    const regex = /^\d{5}-?\d{3}$/;
    return regex.test(cep);
  },
  
  agencia: (agencia) => {
    // Aceita formatos como: 1234-5, 1234, 12345
    const regex = /^\d{4,5}(-\d{1})?$/;
    return regex.test(agencia);
  },
  
  conta: (conta) => {
    // Aceita formatos como: 12345-6, 123456, 1234567
    const regex = /^\d{5,7}(-\d{1})?$/;
    return regex.test(conta);
  },
  
  pix: (pix) => {
    // Validação básica para chave PIX
    return pix.length > 0;
  },
  
  data: (data) => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    return regex.test(data);
  },
  
  uf: (uf) => {
    const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    return ufs.includes(uf.toUpperCase());
  },
  
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  numero: (numero) => {
    return !isNaN(numero) && numero > 0;
  },
  
  texto: (texto) => {
    return texto && texto.trim().length > 0;
  },
  
  selecao_unica: (valor) => {
    return valor !== null && valor !== undefined;
  }
};

// ========================================
// FUNÇÕES DE MAPEAMENTO
// ========================================

/**
 * Mapear dados do formulário para estrutura da API
 * @param {Object} dadosFormulario - Dados vindos do formulário
 * @returns {Object} Dados mapeados para a API
 */
function mapearDadosParaAPI(dadosFormulario) {
  const dadosMapeados = {
    // Dados básicos
    cliente: {
      cpf: dadosFormulario[dataMapping.cliente.cpf.id],
      nome: dadosFormulario[dataMapping.cliente.nome.id],
      dataNascimento: dadosFormulario[dataMapping.cliente.dataNascimento.id],
      idade: dadosFormulario[dataMapping.cliente.idade.id],
      nomeMae: dadosFormulario[dataMapping.cliente.nomeMae.id],
      celular: dadosFormulario[dataMapping.cliente.celular.id],
      email: dadosFormulario[dataMapping.cliente.email.id],
      mainmail: dadosFormulario[dataMapping.cliente.email.id] // Campo principal para busca na Kentro
    },
    
    // Dados do benefício
    beneficio: {
      numero: dadosFormulario[dataMapping.beneficio.numeroBeneficio.id],
      especie: dadosFormulario[dataMapping.beneficio.especieBeneficio.id],
      bloqueado: dadosFormulario[dataMapping.beneficio.nbBloqueado.id]
    },
    
    // Dados financeiros
    financeiro: {
      troco: dadosFormulario[dataMapping.financeiro.troco.id],
      parcelaAtual: dadosFormulario[dataMapping.financeiro.parcela.id],
      novaParcela: dadosFormulario[dataMapping.financeiro.novaParcela.id],
      saldoDevedor: dadosFormulario[dataMapping.financeiro.saldoDevedor.id],
      valorLiquido: dadosFormulario[dataMapping.financeiro.valorLiquido.id],
      valorLiberado: dadosFormulario[dataMapping.financeiro.valorLiberado.id]
    },
    
    // Dados do contrato
    contrato: {
      numero: dadosFormulario[dataMapping.contrato.contrato.id],
      prazoRestante: dadosFormulario[dataMapping.contrato.prazoRestante.id],
      prazoAtual: dadosFormulario[dataMapping.contrato.prazoAtual.id],
      prazoNovo: dadosFormulario[dataMapping.contrato.prazoNovo.id]
    },
    
    // Dados bancários
    bancario: {
      bancoProposta: dadosFormulario[dataMapping.bancario.bancoProposta.id],
      bancoOriginador: dadosFormulario[dataMapping.bancario.bancoOriginador.id],
      banco: dadosFormulario[dataMapping.bancario.banco.id],
      agencia: dadosFormulario[dataMapping.bancario.agencia.id],
      conta: dadosFormulario[dataMapping.bancario.conta.id],
      pix: dadosFormulario[dataMapping.bancario.pix.id]
    },
    
    // Dados de endereço
    endereco: {
      cep: dadosFormulario[dataMapping.endereco.cep.id],
      logradouro: dadosFormulario[dataMapping.endereco.logradouro.id],
      numero: dadosFormulario[dataMapping.endereco.numero.id],
      bairro: dadosFormulario[dataMapping.endereco.bairro.id],
      cidade: dadosFormulario[dataMapping.endereco.cidade.id],
      uf: dadosFormulario[dataMapping.endereco.uf.id]
    },
    
    // Dados da proposta
    proposta: {
      numero: dadosFormulario[dataMapping.proposta.numeroProposta.id],
      linkAssinatura: dadosFormulario[dataMapping.proposta.linkAssinatura.id],
      retornoCip: dadosFormulario[dataMapping.proposta.retornoCip.id],
      numeroPortabilidade: dadosFormulario[dataMapping.proposta.numeroPortabilidade.id],
      link: dadosFormulario[dataMapping.proposta.link.id]
    },
    
    // Taxas
    taxas: {
      atual: dadosFormulario[dataMapping.taxas.taxaAtual.id],
      nova: dadosFormulario[dataMapping.taxas.taxaNova.id]
    },
    
    // Cronograma de parcelas
    cronograma: dataMapping.cronograma.parcelas.map(parcela => ({
      valor: dadosFormulario[parcela.id],
      data: dadosFormulario[parcela.dataId]
    })).filter(item => item.valor && item.data)
  };
  
  return dadosMapeados;
}

/**
 * Validar dados do formulário
 * @param {Object} dadosFormulario - Dados vindos do formulário
 * @returns {Object} Resultado da validação
 */
function validarDadosFormulario(dadosFormulario) {
  const erros = [];
  const avisos = [];
  
  // Validar campos obrigatórios
  for (const [categoria, campos] of Object.entries(dataMapping)) {
    if (categoria === 'cronograma') continue; // Pular cronograma por enquanto
    
    for (const [nome, config] of Object.entries(campos)) {
      if (config.obrigatorio) {
        const valor = dadosFormulario[config.id];
        if (!valor || valor.toString().trim() === '') {
          erros.push(`Campo obrigatório '${config.nome}' não preenchido`);
        } else if (config.validacao && validacoes[config.validacao]) {
          if (!validacoes[config.validacao](valor)) {
            erros.push(`Campo '${config.nome}' com formato inválido`);
          }
        }
      }
    }
  }
  
  return {
    valido: erros.length === 0,
    erros,
    avisos
  };
}

/**
 * Gerar resumo dos dados para exibição
 * @param {Object} dadosMapeados - Dados mapeados
 * @returns {Object} Resumo dos dados
 */
function gerarResumoDados(dadosMapeados) {
  return {
    cliente: {
      nome: dadosMapeados.cliente.nome,
      cpf: dadosMapeados.cliente.cpf,
      idade: dadosMapeados.cliente.idade
    },
    beneficio: {
      numero: dadosMapeados.beneficio.numero,
      especie: dadosMapeados.beneficio.especie
    },
    proposta: {
      valorLiberado: dadosMapeados.financeiro.valorLiberado,
      novaParcela: dadosMapeados.financeiro.novaParcela,
      prazo: dadosMapeados.contrato.prazoNovo,
      banco: dadosMapeados.bancario.bancoProposta
    },
    financeiro: {
      troco: dadosMapeados.financeiro.troco,
      saldoDevedor: dadosMapeados.financeiro.saldoDevedor
    }
  };
}

module.exports = {
  dataMapping,
  validacoes,
  mapearDadosParaAPI,
  validarDadosFormulario,
  gerarResumoDados
};
