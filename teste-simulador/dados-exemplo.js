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
      bancoCodigo: "925",
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
      bancoCodigo: "626",
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
      bancoCodigo: "000",
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
      bancoCodigo: "079",
      prazo: 72,
      pagas: 24,
      parcela: 200.00,
      saldo: 15000.00,
      taxa: 1.85,
      selecionado: false,
      simulacao: null
    },
    {
      id: 5,
      contrato: "33333",
      banco: "DAYCOVAL",
      bancoCodigo: "707",
      prazo: 96,
      pagas: 0,
      parcela: 400.00,
      saldo: 38000.00,
      taxa: 1.79,
      selecionado: true,
      simulacao: null
    },
    {
      id: 6,
      contrato: "44444",
      banco: "DIGIO",
      bancoCodigo: "000",
      prazo: 84,
      pagas: 15,
      parcela: 600.00,
      saldo: 42000.00,
      taxa: 1.66,
      selecionado: true,
      simulacao: null
    },
    {
      id: 7,
      contrato: "55555",
      banco: "FINTECH",
      bancoCodigo: "000",
      prazo: 72,
      pagas: 3,
      parcela: 350.00,
      saldo: 25000.00,
      taxa: 1.85,
      selecionado: false,
      simulacao: null
    },
    {
      id: 8,
      contrato: "66666",
      banco: "INBURSA",
      bancoCodigo: "012",
      prazo: 96,
      pagas: 1,
      parcela: 700.00,
      saldo: 67000.00,
      taxa: 1.66,
      selecionado: true,
      simulacao: null
    }
  ]
};

export default dadosExemplo;
