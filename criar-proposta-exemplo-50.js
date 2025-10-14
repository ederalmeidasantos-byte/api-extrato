const fs = require('fs');
const path = require('path');

// Criar uma proposta de exemplo para o cliente 50
const propostaExemplo = {
  "id": "proposta_1760366000000_exemplo50",
  "clientId": "50",
  "proposalId": "1",
  "cliente": {
    "nome": "CICERO ANDRE DA SILVA",
    "cpf": "01313222496",
    "nb": "5178226450",
    "especie": "87",
    "origem": "INSS",
    "dataExtrato": "10/10/2025",
    "banco_pagamento": "756",
    "agencia": "6044",
    "conta": "0010130993",
    "valor_beneficio": "0,00",
    "nomeBeneficio": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA COM DEFICIENCIA"
  },
  "margens": {
    "disponivel": "76,70",
    "extrapolada": "0,00",
    "rmc": "0,00",
    "rcc": "0,00"
  },
  "contratos": [
    {
      "contrato": "2810022997",
      "banco": {
        "codigo": "925",
        "nome": "BRB"
      },
      "situacao": "ATIVO",
      "valor_parcela": "223,00",
      "qtde_parcelas": 96,
      "parcelas_pagas": 0,
      "valor_liberado": "9.927,76"
    }
  ],
  "status": "PENDENTE",
  "dataCriacao": new Date().toISOString(),
  "observacoes": "Proposta de exemplo para teste do CRM"
};

// Salvar proposta
const propostaPath = '/root/api-lunas/var/data/propostas/proposta_1760366000000_exemplo50.json';
fs.writeFileSync(propostaPath, JSON.stringify(propostaExemplo, null, 2));

console.log('✅ Proposta de exemplo criada para o cliente 50');
console.log('📋 ID da proposta:', propostaExemplo.id);
console.log('👤 Cliente:', propostaExemplo.cliente.nome);
console.log('💰 Margem disponível:', propostaExemplo.margens.disponivel);


