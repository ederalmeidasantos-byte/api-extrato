// roteiro-bancos-simulador.js
// Roteiro de bancos para simulação INSS

export const RoteiroBancosSimulador = {
  BRB: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "001", nome: "Banco do Brasil", regra: "1 paga" },
      { codigo: "104", nome: "Caixa Econômica Federal", regra: "1 paga" },
      { codigo: "033", nome: "Santander", detalhe: "Contratos iniciados com 20, 30, 40", regra: "1 paga" },
      { codigo: "905", nome: "Banco Alfa", regra: "1 paga" },
      { codigo: "754", nome: "Sicoob", regra: "1 paga" },
      { codigo: "341", nome: "Itaú", regra: "1 paga" },
      { codigo: "237", nome: "Bradesco", regra: "1 paga" },
      { codigo: "260", nome: "Nu CFI", regra: "1 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "079", nome: "Picpay" },
      { codigo: "121", nome: "Agibank" },
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "925", nome: "BRB" }
    ],
    idade: "21 a 73 anos",
    especiesAceitas: { todas: true },
    taxas: [1.85, 1.79],
    saldoDevedorMinimo: 4000,
    parcelaMinima: 0
  },

  DAYCOVAL: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "935", nome: "Facta", regra: "24 pagas" },
      { codigo: "121", nome: "Agibank", regra: "15 pagas" },
      { codigo: "012", nome: "Banco Inbursa", regra: "13 pagas" },
      { codigo: "623", nome: "Banco PAN", regra: "12 pagas" },
      { codigo: "389", nome: "MERCANTIL", regra: "6 pagas" },
      { codigo: "754", nome: "SICOOB", regra: "6 pagas" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "422", nome: "Safra" },
      { codigo: "004", nome: "BNB - Banco do Nordeste" },
      { codigo: "905", nome: "Banco Alfa" },
      { codigo: "707", nome: "Daycoval" }
    ],
    idade: "21 a 72 anos",
    especiesAceitas: { todas: true, exceto: ["87", "88"] },
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 500,
    parcelaMinima: 20    
  },

  C6: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "935", nome: "Facta", regra: "13 pagas" },
      { codigo: "149", nome: "Facta", regra: "13 pagas" },  
      { codigo: "329", nome: "QI Sociedade de Crédito", regra: "13 pagas" },
      { codigo: "012", nome: "Banco Inbursa", regra: "19 pagas" },
      { codigo: "623", nome: "Banco PAN", regra: "37 pagas" },
      { codigo: "000", nome: "Demais bancos", regra: "2 pagas" }
    ],
    naoPorta: [
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "079", nome: "Picpay" },
      { codigo: "707", nome: "Daycoval" },
      { codigo: "121", nome: "Agibank" }
    ],
    idade: "21 a 72 anos",
    especiesAceitas: { todas: true},
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 2000,
    parcelaMinima: 0    
  },

  PICPAY: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "001", nome: "Banco do Brasil", regra: "1 paga" },
      { codigo: "104", nome: "Caixa Econômica Federal", regra: "1 paga" },
      { codigo: "033", nome: "Santander", detalhe: "Contratos iniciados com 20, 30, 40", regra: "1 paga" },
      { codigo: "905", nome: "Banco Alfa", regra: "1 paga" },
      { codigo: "754", nome: "Sicoob", regra: "1 paga" },
      { codigo: "341", nome: "Itaú", regra: "1 paga" },
      { codigo: "237", nome: "Bradesco", regra: "1 paga" },
      { codigo: "260", nome: "Nu CFI", regra: "1 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "012", nome: "INBURSA" },
      { codigo: "925", nome: "BRB" }
    ],
    idade: "21 a 73 anos",
    especiesAceitas: { todas: true },
    taxas: [1.85],
    saldoDevedorMinimo: 0,
    parcelaMinima: 50
  },

  FACTA: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "707", nome: "Daycoval", regra: "24 paga" },
      { codigo: "623", nome: "PAN", regra: "16 paga" },
      { codigo: "121", nome: "AGIBANK", regra: "15 paga" },
      { codigo: "254", nome: "Banco PARANA", regra: "15 paga" },
      { codigo: "318", nome: "BMG", regra: "12 paga" },
      { codigo: "033", nome: "OLE", regra: "12 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "3 pagas" }
    ],
    naoPorta: [
      { codigo: "012", nome: "INBURSA" },
      { codigo: "643", nome: "PINE" },
      { codigo: "935", nome: "FACTA" },
      { codigo: "329", nome: "QI" },
      { codigo: "626", nome: "C6" }
    ],
    idade: "21 a 73 anos",
    especiesAceitas: { todas: true },
    taxas: [1.85],
    saldoDevedorMinimo: 0,
    parcelaMinima: 50
  }
};

// Função para bancos permitidos por espécie
export function bancosPermitidosPorEspecie(especie) {
  if (especie === "87") return ["BRB", "PICPAY", "C6", "FACTA"];
  if (especie === "88") return ["BRB", "PICPAY", "C6", "FACTA"];
  return ["BRB", "DAYCOVAL", "C6", "PICPAY", "FACTA"];
}

// Função para validar espécie para roteiro
export function validarEspecieParaRoteiro(especie, roteiro) {
  if (!roteiro || !roteiro.especiesAceitas) return true;

  const ea = roteiro.especiesAceitas;
  if (ea.todas === true) {
    if (Array.isArray(ea.exceto) && ea.exceto.includes(String(especie))) {
      return false;
    }
    return true;
  }

  if (ea.todas === false) {
    if (Array.isArray(ea.permitidas)) {
      return ea.permitidas.includes(String(especie));
    }
    return false;
  }

  return true;
}





