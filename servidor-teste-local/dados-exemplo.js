// Dados de exemplo para o Simulador INSS
export const dadosExemplo = {
  cliente: {
    nome: "João Silva Santos",
    nb: "1234567890",
    especie: "32",
    origem: "INSS",
    dataExtrato: "28/09/2025"
  },
  
  margens: {
    disponivel: 1500.00,
    extrapolada: 500.00,
    rmc: 200.00,
    rcc: 100.00
  },
  
  contratos: [
    {
      id: 1,
      contrato: "12345",
      banco: "BRB",
      prazo: 96,
      pagas: 12,
      parcela: 500.00,
      saldo: 45000.00,
      taxa: 1.85,
      selecionado: true,
      simulacao: null
    },
    {
      id: 2,
      contrato: "67890",
      banco: "C6",
      prazo: 84,
      pagas: 6,
      parcela: 300.00,
      saldo: 25000.00,
      taxa: 1.79,
      selecionado: true,
      simulacao: null
    },
    {
      id: 3,
      contrato: "11111",
      banco: "FINANTO",
      prazo: 96,
      pagas: 2,
      parcela: 800.00,
      saldo: 75000.00,
      taxa: 1.85,
      selecionado: true,
      simulacao: null
    },
    {
      id: 4,
      contrato: "22222",
      banco: "PICPAY",
      prazo: 72,
      pagas: 24,
      parcela: 200.00,
      saldo: 15000.00,
      taxa: 1.85,
      selecionado: false,
      simulacao: null
    }
  ]
};

export default dadosExemplo;
