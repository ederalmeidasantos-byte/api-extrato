// config-bancos.js
// Configuração de prioridade e status dos bancos no simulador INSS

export const ConfigBancos = {
  // Ordem de prioridade dos bancos (do mais prioritário para o menos prioritário)
  ordemPrioridade: [
    "FINANTO",
    "C6", 
    "PICPAY",
    "BRB",
    "DAYCOVAL",
    "INBURSA",
    "FINTECH",
    "DIGIO",
    "FACTA"
  ],
  
  // Status de cada banco (ativo ou inativo)
  statusBancos: {
    "FINANTO": true,   // ativo
    "C6": true,        // ativo
    "PICPAY": true,    // ativo
    "BRB": true,       // ativo
    "DAYCOVAL": true,  // ativo
    "INBURSA": true,   // ativo
    "FINTECH": true,   // ativo
    "DIGIO": true,     // ativo
    "FACTA": true      // ativo
  }
};

// Função para obter bancos ativos na ordem de prioridade
export function getBancosAtivos() {
  return ConfigBancos.ordemPrioridade.filter(banco => ConfigBancos.statusBancos[banco]);
}

// Função para obter todos os bancos (ativos e inativos) na ordem de prioridade
export function getTodosBancos() {
  return ConfigBancos.ordemPrioridade;
}

// Função para verificar se um banco está ativo
export function isBancoAtivo(banco) {
  return ConfigBancos.statusBancos[banco] === true;
}

// Função para ativar/desativar um banco
export function setBancoStatus(banco, ativo) {
  if (ConfigBancos.statusBancos.hasOwnProperty(banco)) {
    ConfigBancos.statusBancos[banco] = ativo;
    return true;
  }
  return false;
}

// Função para atualizar ordem de prioridade
export function setOrdemPrioridade(novaOrdem) {
  if (Array.isArray(novaOrdem) && novaOrdem.length === ConfigBancos.ordemPrioridade.length) {
    ConfigBancos.ordemPrioridade = novaOrdem;
    return true;
  }
  return false;
}

