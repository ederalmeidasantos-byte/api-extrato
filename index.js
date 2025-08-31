function extrairContratosAtivos(texto) {
  const linhas = texto.split(/\r?\n/);
  const contratos = [];
  let bloco = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Se achou "Ativo", começa a montar o bloco do contrato
    if (linha.includes("Ativo")) {
      bloco = [linha];

      // Pega mais 3 a 5 linhas seguintes (dados do contrato ficam logo abaixo)
      for (let j = 1; j <= 5; j++) {
        if (linhas[i + j]) bloco.push(linhas[i + j]);
      }

      const textoContrato = bloco.join(" ");

      let contrato = {
        contrato: null,
        banco: null,
        parcelas: null,
        parcela: null,
        valorEmprestado: null,
        taxaMensal: "0",
        inicioDesconto: null
      };

      // Nº contrato
      const contratoMatch = textoContrato.match(/\b\d{5,}\b/);
      if (contratoMatch) contrato.contrato = contratoMatch[0];

      // Banco
      const bancoMatch = textoContrato.match(/(ITAU|BRADESCO|C6|FACTA|BANCO DO BRASIL|QI CREDIT|FINANCEIRA)/i);
      if (bancoMatch) contrato.banco = bancoMatch[1].trim();

      // Parcelas
      const parcelasMatch = textoContrato.match(/\s(\d{2,3})\s+R\$/);
      if (parcelasMatch) contrato.parcelas = parseInt(parcelasMatch[1]);

      // Valores em R$
      const valores = textoContrato.match(/R\$\s?\d+[\.,]\d{2}/g);
      if (valores) {
        if (valores[0]) contrato.parcela = valores[0].replace("R$", "").trim();
        if (valores[1]) contrato.valorEmprestado = valores[1].replace("R$", "").trim();
      }

      // Taxa mensal
      const taxaMatch = textoContrato.match(/\s(\d{1,2}[,\.]\d{2})\s/);
      if (taxaMatch) contrato.taxaMensal = taxaMatch[1].replace(".", ",");

      // Início desconto
      const dataMatch = textoContrato.match(/\d{2}\/\d{2}\/\d{2,4}/);
      if (dataMatch) contrato.inicioDesconto = dataMatch[0];

      contratos.push(contrato);
    }
  }

  return contratos;
}
