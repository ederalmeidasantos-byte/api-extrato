function extrairContratosAtivos(texto) {
  const linhas = texto.split(/\r?\n/);

  const contratos = [];

  linhas.forEach((linha, i) => {
    if (linha.includes("Ativo")) {
      let contrato = {
        contrato: null,
        banco: null,
        parcelas: null,
        parcela: null,
        valorEmprestado: null,
        taxaMensal: "0",
        inicioDesconto: null
      };

      // Extrair nº contrato → primeiro número da linha
      const contratoMatch = linha.match(/\b\d{5,}\b/);
      if (contratoMatch) contrato.contrato = contratoMatch[0];

      // Extrair banco → palavras antes de "Ativo"
      const bancoMatch = linha.match(/([A-Z\s]{2,})(?=\s+Ativo)/i);
      if (bancoMatch) contrato.banco = bancoMatch[1].trim();

      // Extrair quantidade de parcelas
      const parcelasMatch = linha.match(/\s(\d{2,3})\s+/);
      if (parcelasMatch) contrato.parcelas = parseInt(parcelasMatch[1]);

      // Extrair parcela mensal
      const parcelaMatch = linha.match(/R\$\s?\d+[\.,]\d{2}/g);
      if (parcelaMatch && parcelaMatch.length > 0) {
        contrato.parcela = parcelaMatch[0].replace("R$", "").trim();
      }

      // Extrair valor emprestado → segundo valor em R$
      if (parcelaMatch && parcelaMatch.length > 1) {
        contrato.valorEmprestado = parcelaMatch[1].replace("R$", "").trim();
      }

      // Extrair taxa mensal
      const taxaMatch = linha.match(/\s(\d{1,2}[,\.]\d{2})\s/);
      if (taxaMatch) contrato.taxaMensal = taxaMatch[1].replace(".", ",");

      // Extrair início do desconto (formato DD/MM/AA ou DD/MM/AAAA)
      const dataMatch = linha.match(/\d{2}\/\d{2}\/\d{2,4}/);
      if (dataMatch) contrato.inicioDesconto = dataMatch[0];

      contratos.push(contrato);
    }
  });

  return contratos;
}
