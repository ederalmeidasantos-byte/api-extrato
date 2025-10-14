const fs = require('fs');
const path = require('path');

// Dados completos do cliente 50 com informações do extrato
const dadosCompletos = {
  "cpf": "01313222496",
  "nome": "CICERO ANDRE DA SILVA",
  "nb": "5178226450",
  "telefone": "5582991045859",
  "email": "",
  "nascimento": "13/01/1982",
  "kentroId": "36816",
  "fonte": "simulador_proposta",
  "id": "50",
  "createdAt": "2025-10-13T12:47:01.559Z",
  "updatedAt": new Date().toISOString(),
  
  // Dados do benefício
  "beneficio": {
    "nb": "5178226450",
    "bloqueio_beneficio": "NAO",
    "meio_pagamento": "Conta Corrente",
    "banco_pagamento": "756",
    "agencia": "6044",
    "conta": "0010130993",
    "nomeBeneficio": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA COM DEFICIENCIA",
    "codigoBeneficio": "87",
    "situacao": "ATIVO",
    "valor": "0,00", // Valor não disponível no extrato
    "dib": "10/10/2025" // Usando data do extrato como DIB
  },
  
  // Dados bancários
  "dadosBancarios": {
    "banco_pagamento": "756",
    "agencia": "6044",
    "conta": "0010130993",
    "meio_pagamento": "Conta Corrente"
  },
  
  // Margens
  "margens": {
    "margem_extrapolada": "0,00",
    "margem_disponivel_empretimo": "76,70",
    "margem_disponivel_rmc": "0,00",
    "margem_disponivel_rcc": "0,00"
  },
  
  // Contratos existentes
  "contratosExistentes": [
    {
      "contrato": "2810022997",
      "banco": {
        "codigo": "925",
        "nome": "BRB"
      },
      "situacao": "ATIVO",
      "data_inclusao": "07/10/2025",
      "competencia_inicio_desconto": "11/2025",
      "qtde_parcelas": 96,
      "valor_parcela": "223,00",
      "valor_liberado": "9.927,76",
      "iof": "5,42",
      "cet_mensal": "189,00",
      "cet_anual": "2.515,00",
      "taxa_juros_mensal": "1,79",
      "taxa_juros_anual": "23,73",
      "valor_pago": "9.922,34",
      "primeiro_desconto": "20/12/2025",
      "status_taxa": "INFORMADA_EXTRATO",
      "prazo_total": 96,
      "parcelas_pagas": 0,
      "prazo_restante": 96
    },
    {
      "contrato": "411961222",
      "banco": {
        "codigo": "121",
        "nome": "Agibank"
      },
      "situacao": "ATIVO",
      "data_inclusao": "18/01/2023",
      "competencia_inicio_desconto": "02/2023",
      "qtde_parcelas": 84,
      "valor_parcela": "31,50",
      "valor_liberado": "1.209,22",
      "iof": "40,39",
      "cet_mensal": "0,00",
      "cet_anual": "0,00",
      "taxa_juros_mensal": "2,18",
      "taxa_juros_anual": "29,52",
      "valor_pago": "1.168,83",
      "primeiro_desconto": null,
      "status_taxa": "RECALCULADA",
      "prazo_total": 84,
      "parcelas_pagas": 32,
      "prazo_restante": 52
    },
    {
      "contrato": "0123460376314",
      "banco": {
        "codigo": "237",
        "nome": "Bradesco"
      },
      "situacao": "ATIVO",
      "data_inclusao": "18/05/2022",
      "competencia_inicio_desconto": "06/2022",
      "qtde_parcelas": 84,
      "valor_parcela": "16,56",
      "valor_liberado": "633,82",
      "iof": "0,00",
      "cet_mensal": "0,00",
      "cet_anual": "0,00",
      "taxa_juros_mensal": "2,19",
      "taxa_juros_anual": "29,67",
      "valor_pago": "612,81",
      "primeiro_desconto": null,
      "status_taxa": "RECALCULADA",
      "prazo_total": 84,
      "parcelas_pagas": 40,
      "prazo_restante": 44
    },
    {
      "contrato": "0123460196564",
      "banco": {
        "codigo": "237",
        "nome": "Bradesco"
      },
      "situacao": "ATIVO",
      "data_inclusao": "16/05/2022",
      "competencia_inicio_desconto": "06/2022",
      "qtde_parcelas": 84,
      "valor_parcela": "27,07",
      "valor_liberado": "1.034,33",
      "iof": "0,00",
      "cet_mensal": "0,00",
      "cet_anual": "0,00",
      "taxa_juros_mensal": "2,19",
      "taxa_juros_anual": "29,76",
      "valor_pago": "1.000,00",
      "primeiro_desconto": null,
      "status_taxa": "RECALCULADA",
      "prazo_total": 84,
      "parcelas_pagas": 40,
      "prazo_restante": 44
    },
    {
      "contrato": "405968572",
      "banco": {
        "codigo": "318",
        "nome": "BMG"
      },
      "situacao": "ATIVO",
      "data_inclusao": "25/04/2022",
      "competencia_inicio_desconto": "05/2022",
      "qtde_parcelas": 84,
      "valor_parcela": "80,57",
      "valor_liberado": "3.619,44",
      "iof": "119,44",
      "cet_mensal": "0,00",
      "cet_anual": "0,00",
      "taxa_juros_mensal": "1,67",
      "taxa_juros_anual": "22,05",
      "valor_pago": "3.500,00",
      "primeiro_desconto": null,
      "status_taxa": "RECALCULADA",
      "prazo_total": 84,
      "parcelas_pagas": 41,
      "prazo_restante": 43
    }
  ],
  
  // Contratos RMC
  "contratosRMC": [
    {
      "contrato": "17205179",
      "banco": "318",
      "situacao": "ATIVO",
      "data_inclusao": "12/04/2022"
    }
  ],
  
  // Contratos RCC
  "contratosRCC": [
    {
      "contrato": "50-2201036337",
      "banco": "243",
      "situacao": "ATIVO",
      "data_inclusao": "19/09/2022"
    }
  ],
  
  // Data do extrato
  "dataExtrato": "10/10/2025"
};

// Ler arquivo atual
const filePath = '/root/api-lunas/var/data/clientes/50.json';
const clienteAtual = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('Dados atuais:', clienteAtual);

// Atualizar com dados completos
const clienteAtualizado = { ...clienteAtual, ...dadosCompletos };

// Salvar arquivo atualizado
fs.writeFileSync(filePath, JSON.stringify(clienteAtualizado, null, 2));

console.log('✅ Cliente 50 atualizado com dados completos!');
console.log('📊 Contratos:', clienteAtualizado.contratosExistentes.length);
console.log('💰 Margem disponível:', clienteAtualizado.margens.margem_disponivel_empretimo);
console.log('🏦 Banco pagador:', clienteAtualizado.beneficio.banco_pagamento);

