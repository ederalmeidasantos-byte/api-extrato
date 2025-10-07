// dados-exemplo.js
// Dados de exemplo para teste do simulador INSS

export const dadosExemplo = {
  fileId: "exemplo001",
  cliente: "JOÃO DA SILVA SANTOS",
  beneficio: {
    nb: "1234567890",
    bloqueio_beneficio: "NAO",
    meio_pagamento: "conta corrente",
    banco_pagamento: "Banco Bradesco S A",
    agencia: "1234",
    conta: "0001234567",
    nome: "Aposentadoria por Idade",
    codigo: "32"
  },
  contratos: [
    {
      contrato: "123456789",
      banco: "Banco Itau Consignado S A",
      situacao: "Ativo",
      valor_liberado: 15000.00,
      valor_parcela: 500.00,
      qtde_parcelas: 96,
      data_inclusao: "01/01/2024",
      inicio_desconto: "02/2024",
      fim_desconto: "01/2032",
      data_contrato: "01/01/2024",
      taxa_juros_mensal: 1.85,
      taxa_juros_anual: 24.6,
      parcelas_pagas: 15,
      prazo_restante: 81,
      origem_taxa: "extrato"
    },
    {
      contrato: "987654321",
      banco: "Banco Bradesco S A",
      situacao: "Ativo",
      valor_liberado: 8000.00,
      valor_parcela: 300.00,
      qtde_parcelas: 96,
      data_inclusao: "15/03/2024",
      inicio_desconto: "04/2024",
      fim_desconto: "03/2032",
      data_contrato: "15/03/2024",
      taxa_juros_mensal: 1.79,
      taxa_juros_anual: 23.87,
      parcelas_pagas: 8,
      prazo_restante: 88,
      origem_taxa: "extrato"
    },
    {
      contrato: "456789123",
      banco: "Caixa Economica Federal",
      situacao: "Ativo",
      valor_liberado: 12000.00,
      valor_parcela: 400.00,
      qtde_parcelas: 96,
      data_inclusao: "10/06/2024",
      inicio_desconto: "07/2024",
      fim_desconto: "06/2032",
      data_contrato: "10/06/2024",
      taxa_juros_mensal: 1.66,
      taxa_juros_anual: 21.8,
      parcelas_pagas: 3,
      prazo_restante: 93,
      origem_taxa: "extrato"
    }
  ],
  data_extracao: "2024-12-19T10:30:00.000Z",
  total_contratos: 3,
  valor_total_liberado: 35000.00,
  valor_total_parcela: 1200.00
};

// Função para carregar dados de exemplo
export function carregarDadosExemplo() {
  return dadosExemplo;
}

// Função para gerar dados aleatórios para teste
export function gerarDadosAleatorios() {
  const nomes = ["MARIA SILVA", "JOSÉ SANTOS", "ANA COSTA", "CARLOS OLIVEIRA", "FERNANDA LIMA"];
  const bancos = ["Banco Itau Consignado S A", "Banco Bradesco S A", "Caixa Economica Federal", "Banco do Brasil S A"];
  const especies = ["32", "41", "42", "21"];
  
  const nomeAleatorio = nomes[Math.floor(Math.random() * nomes.length)];
  const bancoAleatorio = bancos[Math.floor(Math.random() * bancos.length)];
  const especieAleatoria = especies[Math.floor(Math.random() * especies.length)];
  
  return {
    ...dadosExemplo,
    cliente: nomeAleatorio,
    beneficio: {
      ...dadosExemplo.beneficio,
      codigo: especieAleatoria
    },
    contratos: dadosExemplo.contratos.map(contrato => ({
      ...contrato,
      banco: bancoAleatorio,
      valor_parcela: Math.floor(Math.random() * 500) + 200,
      parcelas_pagas: Math.floor(Math.random() * 20) + 1
    }))
  };
}





