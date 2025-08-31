app.post("/extrato", async (req, res) => {
  try {
    const { codigoArquivo, pdfTexto } = req.body; // pdfTexto = texto do extrato convertido em string

    if (!codigoArquivo || !pdfTexto) {
      return res.status(400).json({ error: "codigoArquivo e pdfTexto são obrigatórios" });
    }

    const texto = pdfTexto.replace(/\s+/g, " "); // normalizar espaços

    // 🔹 Detectar bloqueio de empréstimo
    const bloqueado = !/Elegível para empréstimos/i.test(texto);

    // 🔹 Capturar Margem Extrapolada somente na seção correta
    const matchMargem = texto.match(/VALORES DO BENEF.*?MARGEM EXTRAPOLADA\*{3}\s+R\$\s*([\d.,]+)/i);
    const margemExtrapolada = matchMargem ? matchMargem[1] : "0,00";

    // 🔹 Capturar contratos (somente da seção Empréstimos Bancários)
    const contratos = [];
    const regexContrato =
      /(\d{5,6})\s+([A-Z0-9\s-]+)?\s+Ativo.*?(\d{2}\/\d{4})\s+(\d{2}\/\d{4})\s+(\d+)\s+R\$([\d.,]+)\s+R\$([\d.,]+).*?(\d,\d+)\s+[\d.,]+\s+(\d{2}\/\d{2}\/\d{2})/gi;

    let match;
    while ((match = regexContrato.exec(texto)) !== null) {
      contratos.push({
        contrato: match[1] || null,
        banco: match[2] ? match[2].replace(/\s+/g, " ").trim() : null,
        parcelas: match[5] ? parseInt(match[5]) : null,
        parcela: match[6] || null,
        valorEmprestado: match[7] || null,
        taxaMensal: match[8] || "0",
        inicioDesconto: match[9] || null
      });
    }

    return res.json({
      codigoArquivo,
      bloqueado,
      margemExtrapolada,
      contratos
    });
  } catch (err) {
    console.error("Erro no /extrato:", err);
    res.status(500).json({ error: "Erro interno ao processar extrato" });
  }
});
