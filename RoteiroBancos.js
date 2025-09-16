const RoteiroBancos = {
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
      { codigo: "070", nome: "Picpay" },
      { codigo: "121", nome: "Agibank" },
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "925", nome: "BRB" }
    ],
    idade: "21 a 73 anos",
    especiesAceitas: { todas: true },
    taxas: [1.85, 1.79],
    saldoDevedorMinimo: 4000
  },

  DAYCOVAL: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "935", nome: "Facta", regra: "24 pagas" },
      { codigo: "121", nome: "Agibank", regra: "15 pagas" },
      { codigo: "012", nome: "Banco Inbursa", regra: "13 pagas" },
      { codigo: "623", nome: "Banco PAN", regra: "12 pagas" },
      { codigo: "000", nome: "Demais bancos", regra: "6 pagas" }
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
    saldoDevedorMinimo: 500
  },

  DIGIO: {
    regraGeral: "12 parcelas pagas",
    excecoes: [
      { codigo: "001", nome: "Banco do Brasil", regra: "1 paga" },
      { codigo: "104", nome: "Caixa Econômica Federal", regra: "1 paga" },
      { codigo: "033", nome: "Santander", detalhe: "Contratos iniciados com 20, 30, 40", regra: "1 paga" },
      { codigo: "905", nome: "Banco Alfa", regra: "1 paga" },
      { codigo: "754", nome: "Sicoob", regra: "1 paga" },
      { codigo: "341", nome: "Itaú", regra: "1 paga" },
      { codigo: "260", nome: "Nu CFI", regra: "1 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "001", nome: "Banco do Brasil" },
      { codigo: "041", nome: "Banrisul" },
      { codigo: "237", nome: "Bradesco" },
      { codigo: "623", nome: "Banco PAN" }
    ],
    idade: "21 a 66 anos (prazo 96x) / 67 a 72 anos (prazo 96x)",
    especiesAceitas: { todas: true, exceto: ["87", "88"] },
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 4000
  },

  FINANTO: {
    regraGeral: "3 parcelas pagas",
    excecoes: [
      { codigo: "623", nome: "Banco PAN", regra: "12 pagas" },
      { codigo: "033", nome: "Santander", regra: "12 pagas" },
      { codigo: "254", nome: "Paraná Banco", regra: "12 pagas" },
      { codigo: "041", nome: "Banrisul", regra: "12 pagas" },
      { codigo: "326", nome: "Parati – Crédito", regra: "12 pagas" },
      { codigo: "389", nome: "Banco Mercantil do Brasil", regra: "12 pagas" },
      { codigo: "121", nome: "Agibank", regra: "12 pagas" },
      { codigo: "707", nome: "Daycoval", regra: "13 pagas" },
      { codigo: "000", nome: "Demais bancos", regra: "3 pagas" }
    ],
    naoPorta: [
      { codigo: "012", nome: "Banco Inbursa" },
      { codigo: "329", nome: "QI Sociedade de Crédito" },
      { codigo: "422", nome: "Safra" },
      { codigo: "752", nome: "BNP Paribas" },
      { codigo: "643", nome: "Banco Pine" },
      { codigo: "070", nome: "Picpay" },
      { codigo: "025", nome: "Banco Alfa" },
      { codigo: "935", nome: "Facta" },
      { codigo: "626", nome: "C6 / C6 Consignado" }
    ],
    idade: "21 a 69 anos",
    especiesAceitas: {
      todas: true,
      exceto: ["87"],
      regrasEspeciais: [
        { especies: ["32"], idadeMinima: 60 }
      ]
    },
    taxas: [1.85, 1.79],
    saldoDevedorMinimo: 8000
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
      { codigo: "070", nome: "Picpay" },
      { codigo: "707", nome: "Daycoval" },
      { codigo: "121", nome: "Agibank" },
    ],
    idade: "21 a 72 anos",
    especiesAceitas: { todas: true},
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 2000
  },
  FINTECH: {
    regraGeral: "2 parcelas pagas",
    excecoes: [
      { codigo: "623", nome: "Banco PAN", regra: "13 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "2 pagas" }
    ],
    naoPorta: [
      { codigo: "643", nome: "Banco Pine" },
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "149", nome: "FACTA" },
      { codigo: "012", nome: "INBURSA" },
      { codigo: "925", nome: "BRB" },
      { codigo: "254", nome: "Paraná Banco" },
      { codigo: "935", nome: "Facta" }
    ],
    idade: "21 a 69",
    especiesAceitas: { todas: true, exceto: ["87", "88"] },
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 4000
  },
  INBURSA: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      { codigo: "623", nome: "Banco PAN", regra: "12 paga" },
      { codigo: "925", nome: "Banco BRB", regra: "5 paga" },
      { codigo: "001", nome: "Banco do Brasil", regra: "1 paga" },
      { codigo: "104", nome: "Caixa Econômica Federal", regra: "1 paga" },
      { codigo: "754", nome: "Sicoob", regra: "1 paga" },
      { codigo: "341", nome: "Itaú", regra: "1 paga" },
      { codigo: "237", nome: "Bradesco", regra: "1 paga" },
      { codigo: "260", nome: "Nu CFI", regra: "1 paga" },
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
    ],
    naoPorta: [
      { codigo: "626", nome: "C6 / C6 Consignado" },
      { codigo: "149", nome: "FACTA" },
      { codigo: "012", nome: "INBURSA" },
      { codigo: "422", nome: "SAFRA" },
      { codigo: "079", nome: "PICPAY" },
      { codigo: "935", nome: "Facta" },
      { codigo: "329", nome: "QI" },
      { codigo: "752", nome: "BNP Paribas" },
      { codigo: "025", nome: "Banco Alfa" }
    ],
    idade: "21 a 69 anos",
    especiesAceitas: { todas: true, exceto: ["87", "88"] },
    taxas: [1.66],
    saldoDevedorMinimo: 2500
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
      { codigo: "000", nome: "Demais bancos", regra: "12 pagas" }
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
    saldoDevedorMinimo: 500
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
      { codigo: "121", nome: "AGIBANK" },
      { codigo: "925", nome: "BRB" }
    ],
    idade: "21 a 73 anos",
    especiesAceitas: { todas: true },
    taxas: [1.85],
    saldoDevedorMinimo: 4000
  },
 
};

export default RoteiroBancos;
