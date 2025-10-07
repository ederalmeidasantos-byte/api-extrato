/**
 * Mapeamento de Status do CRM - AtenderBem
 * Mapeamento completo dos status das filas e pipelines
 */

const crmStatusMapping = {
  // ========================================
  // FILA 2 - PORTABILIDADE
  // ========================================
  portabilidade: {
    filaId: 2,
    pipelineId: 'portabilidade',
    nome: 'Portabilidade',
    status: {
      inicio: {
        id: 8,
        nome: 'Início',
        descricao: 'Proposta iniciada na fila de portabilidade',
        cor: '#3498db',
        ordem: 1,
        ativo: true
      },
      ofertaTroco: {
        id: 9,
        nome: 'Oferta Troco',
        descricao: 'Aguardando cliente aceitar oferta de troco',
        cor: '#f39c12',
        ordem: 2,
        ativo: true
      },
      digitando: {
        id: 10,
        nome: 'Digitando',
        descricao: 'Proposta sendo digitada no sistema',
        cor: '#9b59b6',
        ordem: 3,
        ativo: true
      },
      redigitar: {
        id: 35,
        nome: 'Redigitar',
        descricao: 'Proposta precisa ser redigitada',
        cor: '#e74c3c',
        ordem: 4,
        ativo: true
      },
      aguardandoAssinatura: {
        id: 11,
        nome: 'Aguardando Assinatura',
        descricao: 'Aguardando cliente assinar a proposta',
        cor: '#2ecc71',
        ordem: 5,
        ativo: true
      },
      retencao: {
        id: 12,
        nome: 'Retenção',
        descricao: 'Proposta em retenção',
        cor: '#34495e',
        ordem: 6,
        ativo: true
      },
      aguardandoDesbloqueio: {
        id: 36,
        nome: 'Aguardando Desbloqueio',
        descricao: 'Aguardando desbloqueio do benefício',
        cor: '#e67e22',
        ordem: 7,
        ativo: true
      },
      aguardandoSaldoCip: {
        id: 13,
        nome: 'Aguardando Saldo CIP',
        descricao: 'Aguardando confirmação de saldo no CIP',
        cor: '#1abc9c',
        ordem: 8,
        ativo: true
      },
      atuandoSaldo: {
        id: 26,
        nome: 'Atuando Saldo',
        descricao: 'Atualizando saldo no sistema',
        cor: '#16a085',
        ordem: 9,
        ativo: true
      },
      aguardandoAverbacao: {
        id: 14,
        nome: 'Aguardando Averbação',
        descricao: 'Aguardando averbação da operação',
        cor: '#27ae60',
        ordem: 10,
        ativo: true
      },
      pago: {
        id: 15,
        nome: 'Pago',
        descricao: 'Proposta paga com sucesso',
        cor: '#2ecc71',
        ordem: 11,
        ativo: true,
        final: true
      }
    }
  },

  // ========================================
  // FILA 1 - FGTS
  // ========================================
  fgts: {
    filaId: 1,
    pipelineId: 'fgts',
    nome: 'FGTS',
    status: {
      inicio: {
        id: 1,
        nome: 'Início',
        descricao: 'Proposta iniciada na fila de FGTS',
        cor: '#3498db',
        ordem: 1,
        ativo: true
      },
      naoAutorizado: {
        id: 3,
        nome: 'Não Autorizado',
        descricao: 'Cliente não autorizado para operação',
        cor: '#e74c3c',
        ordem: 2,
        ativo: true,
        final: true
      },
      simulandoFgts: {
        id: 43,
        nome: 'Simulando FGTS',
        descricao: 'Realizando simulação de FGTS',
        cor: '#9b59b6',
        ordem: 3,
        ativo: true
      },
      valorLiberado: {
        id: 4,
        nome: 'Valor Liberado',
        descricao: 'Valor liberado para o cliente',
        cor: '#2ecc71',
        ordem: 4,
        ativo: true
      },
      empregadoClt: {
        id: 37,
        nome: 'Empregado CLT',
        descricao: 'Cliente é empregado CLT',
        cor: '#f39c12',
        ordem: 5,
        ativo: true
      },
      aguardandoAssinatura: {
        id: 5,
        nome: 'Aguardando Assinatura',
        descricao: 'Aguardando cliente assinar a proposta',
        cor: '#2ecc71',
        ordem: 6,
        ativo: true
      },
      propostaPaga: {
        id: 6,
        nome: 'Proposta Paga',
        descricao: 'Proposta paga com sucesso',
        cor: '#27ae60',
        ordem: 7,
        ativo: true,
        final: true
      },
      semSaldo: {
        id: 7,
        nome: 'Sem Saldo',
        descricao: 'Cliente não possui saldo suficiente',
        cor: '#e74c3c',
        ordem: 8,
        ativo: true,
        final: true
      },
      reConsultar: {
        id: 42,
        nome: 'Re-consultar',
        descricao: 'Necessário re-consultar dados do cliente',
        cor: '#f39c12',
        ordem: 9,
        ativo: true
      },
      aniversario: {
        id: 44,
        nome: 'Aniversário',
        descricao: 'Cliente em período de aniversário',
        cor: '#e67e22',
        ordem: 10,
        ativo: true
      }
    }
  }
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Obter status por ID
 * @param {number} statusId - ID do status
 * @returns {Object|null} Status encontrado
 */
function obterStatusPorId(statusId) {
  for (const fila of Object.values(crmStatusMapping)) {
    for (const status of Object.values(fila.status)) {
      if (status.id === statusId) {
        return {
          ...status,
          fila: fila.nome,
          filaId: fila.filaId
        };
      }
    }
  }
  return null;
}

/**
 * Obter status por fila
 * @param {number} filaId - ID da fila
 * @returns {Object|null} Status da fila
 */
function obterStatusPorFila(filaId) {
  for (const [key, fila] of Object.entries(crmStatusMapping)) {
    if (fila.filaId === filaId) {
      return fila;
    }
  }
  return null;
}

/**
 * Obter próximo status válido
 * @param {number} filaId - ID da fila
 * @param {number} statusAtualId - ID do status atual
 * @returns {Array} Próximos status possíveis
 */
function obterProximosStatus(filaId, statusAtualId) {
  const fila = obterStatusPorFila(filaId);
  if (!fila) return [];

  const statusAtual = obterStatusPorId(statusAtualId);
  if (!statusAtual) return [];

  const statusOrdenados = Object.values(fila.status)
    .sort((a, b) => a.ordem - b.ordem);

  const indiceAtual = statusOrdenados.findIndex(s => s.id === statusAtualId);
  if (indiceAtual === -1) return [];

  // Retornar próximos status (não finais)
  return statusOrdenados
    .slice(indiceAtual + 1)
    .filter(s => !s.final);
}

/**
 * Verificar se status é final
 * @param {number} statusId - ID do status
 * @returns {boolean} Se é status final
 */
function isStatusFinal(statusId) {
  const status = obterStatusPorId(statusId);
  return status ? status.final : false;
}

/**
 * Obter fluxo completo da fila
 * @param {number} filaId - ID da fila
 * @returns {Array} Fluxo completo ordenado
 */
function obterFluxoCompleto(filaId) {
  const fila = obterStatusPorFila(filaId);
  if (!fila) return [];

  return Object.values(fila.status)
    .sort((a, b) => a.ordem - b.ordem)
    .map(status => ({
      ...status,
      fila: fila.nome,
      filaId: fila.filaId
    }));
}

/**
 * Obter estatísticas da fila
 * @param {number} filaId - ID da fila
 * @returns {Object} Estatísticas da fila
 */
function obterEstatisticasFila(filaId) {
  const fila = obterStatusPorFila(filaId);
  if (!fila) return null;

  const status = Object.values(fila.status);
  const statusAtivos = status.filter(s => s.ativo);
  const statusFinais = status.filter(s => s.final);

  return {
    fila: fila.nome,
    filaId: fila.filaId,
    totalStatus: status.length,
    statusAtivos: statusAtivos.length,
    statusFinais: statusFinais.length,
    statusIniciais: status.filter(s => s.ordem === 1).length,
    cores: [...new Set(status.map(s => s.cor))]
  };
}

/**
 * Validar transição de status
 * @param {number} filaId - ID da fila
 * @param {number} statusAtualId - ID do status atual
 * @param {number} novoStatusId - ID do novo status
 * @returns {Object} Resultado da validação
 */
function validarTransicaoStatus(filaId, statusAtualId, novoStatusId) {
  const fila = obterStatusPorFila(filaId);
  if (!fila) {
    return {
      valida: false,
      erro: 'Fila não encontrada'
    };
  }

  const statusAtual = obterStatusPorId(statusAtualId);
  const novoStatus = obterStatusPorId(novoStatusId);

  if (!statusAtual) {
    return {
      valida: false,
      erro: 'Status atual não encontrado'
    };
  }

  if (!novoStatus) {
    return {
      valida: false,
      erro: 'Novo status não encontrado'
    };
  }

  if (statusAtual.filaId !== filaId) {
    return {
      valida: false,
      erro: 'Status atual não pertence à fila'
    };
  }

  if (novoStatus.filaId !== filaId) {
    return {
      valida: false,
      erro: 'Novo status não pertence à fila'
    };
  }

  if (statusAtual.final) {
    return {
      valida: false,
      erro: 'Não é possível alterar status final'
    };
  }

  if (novoStatus.ordem <= statusAtual.ordem) {
    return {
      valida: false,
      erro: 'Novo status deve ser posterior ao atual'
    };
  }

  return {
    valida: true,
    statusAtual,
    novoStatus
  };
}

/**
 * Obter resumo de todas as filas
 * @returns {Object} Resumo de todas as filas
 */
function obterResumoGeral() {
  const resumo = {
    totalFilas: Object.keys(crmStatusMapping).length,
    totalStatus: 0,
    filas: []
  };

  for (const [key, fila] of Object.entries(crmStatusMapping)) {
    const estatisticas = obterEstatisticasFila(fila.filaId);
    resumo.filas.push(estatisticas);
    resumo.totalStatus += estatisticas.totalStatus;
  }

  return resumo;
}

// ========================================
// CONSTANTES ÚTEIS
// ========================================

const FILAS = {
  PORTABILIDADE: 2,
  FGTS: 1
};

const STATUS_PORTABILIDADE = {
  INICIO: 8,
  OFERTA_TROCO: 9,
  DIGITANDO: 10,
  REDIGITAR: 35,
  AGUARDANDO_ASSINATURA: 11,
  RETENCAO: 12,
  AGUARDANDO_DESBLOQUEIO: 36,
  AGUARDANDO_SALDO_CIP: 13,
  ATUANDO_SALDO: 26,
  AGUARDANDO_AVERBACAO: 14,
  PAGO: 15
};

const STATUS_FGTS = {
  INICIO: 1,
  NAO_AUTORIZADO: 3,
  SIMULANDO_FGTS: 43,
  VALOR_LIBERADO: 4,
  EMPREGADO_CLT: 37,
  AGUARDANDO_ASSINATURA: 5,
  PROPOSTA_PAGA: 6,
  SEM_SALDO: 7,
  RE_CONSULTAR: 42,
  ANIVERSARIO: 44
};

module.exports = {
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
};



