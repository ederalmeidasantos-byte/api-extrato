const RoteiroBancos = {
  BRB: {
    regraGeral: "12 parcelas pagas",
    excecoes: [
      "Banco do Brasil",
      "Caixa Econômica Federal",
      "Santander (Contratos iniciados com 20, 30, 40)",
      "Banco Alfa",
      "Financeira Alfa",
      "Sicoob",
      "Itaú 341",
      "Bradesco 237",
      "NU CFI"
    ],
    naoPorta: ["BRB", "Picpay", "Agibank", "C6/C6 Consignado"],
    idade: "21 a 73 anos",
    especiesAceitas: {
      todas: true,
      regrasEspeciais: [{ especies: ["32", "92"], idadeMinima: 60 }]
    },
    taxas: [1.85, 1.79],
    saldoDevedorMinimo: 4000
  },
  C6: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      "FACTA / Paraná Banco / QI Sociedade (Contratos iniciados com BYX) - 13 pagas",
      "Inbursa - 19 pagas",
      "PAN - 37 pagas"
    ],
    naoPorta: ["Daycoval", "Agibank", "Picpay"],
    idade: "21 a 72 anos",
    especiesAceitas: {
      todas: true,
      regrasEspeciais: [{ especies: ["32", "92"], idadeMinima: 45 }]
    },
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 2000
  },
  DAYCOVAL: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      "Facta - 24 pagas",
      "Agibank - 15 pagas",
      "Inbursa - 13 pagas",
      "PAN - 12 pagas",
      "Bancos de rede - 6 pagas"
    ],
    naoPorta: ["C6", "Safra", "BNB", "Alfa"],
    idade: "21 a 72 anos",
    especiesAceitas: {
      todas: true,
      exceto: ["87", "88"],
      regrasEspeciais: [{ especies: ["32", "92"], idadeMinima: 60 }]
    },
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 500
  },
  FACTA: {
    regraGeral: "0 parcelas pagas",
    excecoes: [
      "INSS",
      "Daycoval - 24 pagas",
      "PAN - 16 pagas",
      "Agibank e Paraná - 15 pagas",
      "BMG, Santander, Olé e C6 Bank - 12 pagas"
    ],
    naoPorta: ["Socicred", "Inbursa", "Zema", "Paulista", "Pine"],
    idade: "21 a 72 anos",
    especiesAceitas: {
      todas: true,
      regrasEspeciais: [{ especies: ["32", "92"], idadeMinima: 60 }]
    },
    taxas: [1.85],
    saldoDevedorMinimo: 0,
    parcelaMinima: 50
  },
  FINTECH: {
    regraGeral: "1 parcela paga",
    excecoes: [
      "PAN acima de 13 parcelas pagas",
      "BRB",
      "Pine",
      "Inbursa",
      "Paraná Banco",
      "Facta",
      "QI",
      "C6",
      "FICSA"
    ],
    naoPorta: [],
    idade: "21 a 72 anos",
    especiesAceitas: {
      todas: true,
      regrasEspeciais: [{ especies: ["32", "92"], idadeMinima: 60 }]
    },
    taxas: [1.85, 1.79],
    saldoDevedorMinimo: 4000
  },
  DIGIO: {
    regraGeral: "12 parcelas pagas",
    excecoes: [],
    naoPorta: ["Banco do Brasil", "Banrisul", "Bradesco", "PAN"],
    idade: "21 a 66 anos (prazo 96x) / 67 a 72 anos (prazo 96x)",
    especiesAceitas: {
      todas: true,
      exceto: ["87", "88"],
      regrasEspeciais: [{ especies: ["32", "92"], idadeMinima: 60 }]
    },
    taxas: [1.85, 1.79, 1.66],
    saldoDevedorMinimo: 4000
  },
  PICPAY: {
    regraGeral: "12 parcelas pagas",
    excecoes: [
      "INSS / SIAPE",
      "Banco de rede - 0 pagas",
      "Inbursa",
      "Agibank",
      "BRB"
    ],
    naoPorta: [],
    idade: "21 a 73 anos",
    especiesAceitas: {
      todas: true,
      regrasEspeciais: [{ especies: ["32", "92"], idadeMinima: 45 }]
    },
    taxas: [1.85],
    saldoDevedorMinimo: 4000
  },
  FINANTO: {
    regraGeral: "3 parcelas pagas",
    excecoes: [
      "PAN (623) - 12 pagas",
      "Santander (033) - 12 pagas",
      "Paraná (254) - 12 pagas",
      "Banrisul (041) - 12 pagas",
      "Parati (326) - 12 pagas",
      "Mercantil (389) - 12 pagas",
      "Agibank (121) - 12 pagas",
      "Daycoval (707) - 13 pagas"
    ],
    naoPorta: [
      "Inbursa (012)",
      "QI Sociedade de Crédito (329)",
      "Safra (422)",
      "BNP Paribas (752)",
      "Pine (643)",
      "Picpay (380)",
      "Alfa (025)",
      "Facta (935)",
      "C6 (626)"
    ],
    idade: "21 a 69 anos",
    especiesAceitas: {
      todas: true,
      exceto: ["87"],
      regrasEspeciais: [{ especies: ["32"], idadeMinima: 60 }]
    },
    taxas: [1.85, 1.79],
    saldoDevedorMinimo: 8000
  }
};

export default RoteiroBancos;
