const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// =========================
// ROTA PRINCIPAL
// =========================
app.post("/extrato", (req, res) => {
  try {
    const { codigoArquivo, texto } = req.body;
    if (!codigoArquivo || !texto) {
      return res.status(400).json({ error: "codigoArquivo e texto são obrigatórios" });
    }

    // =========================
    // BLOQUEIO DE BENEFÍCIO
    // =========================
    const bloqueado = !/Elegível para empréstimos/i.test(texto);

    // =========================
    // PEGAR MARGEM EXTRAPOLADA
    // =========================
    const margemMatch = texto.match(/VALORES DO BENEF[ÍI]CIO[\s\S]*?MARGEM EXTRAPOLADA\*+\s+R\$(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const margemExtrapolada = margemMatch ? margemMatch[1] : "0,00";

    // =========================
    // PEGAR CONTRATOS
    // =========================
    const contratoRegex =
      /(\d{4,})\s+([\s\S]*?)\s+(?:Ativo|Suspenso)[\s\S]*?(?:\d{2}\/\d{4})?[\s\S]*?(\d{1,2},\d{2})?\s+(\d{1,3}(?:\.\d{3})*,\d{2})?[\s\S]*?(?:\d{1,2},\d{2})?\s+(\d{1,2},\d{2})?[\s\S]*?(\d{2}\/\d{2}\/\d{2})?/gi;

    let contratos = [];
    let match;
    while ((match = contratoRegex.exec(texto)) !== null) {
      let contrato = match[1];
      let banco = (match[2] || "").replace(/\r?\n|\s{2,}/g, " ").trim();

      // Normaliza banco: pega apenas a parte principal
      if (banco.toUpperCase().includes("BANCO")) {
        banco = banco.replace(/.*BANCO\s+/i, "").split(" ")[0];
      }

      contratos.push({
        contrato,
        banco: banco || null,
        parcelas: null, // pode ser refinado depois
        parcela: match[3] || null,
        valorEmprestado: match[4] || null,
        taxaMensal: match[5] || "0",
        inicioDesconto: match[6] || null,
      });
    }

    // =========================
    // RESPOSTA
    // =========================
    res.json({
      codigoArquivo,
      bloqueado,
      margemExtrapolada,
      contratos,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar extrato" });
  }
});

// =========================
// INICIA SERVIDOR
// =========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
