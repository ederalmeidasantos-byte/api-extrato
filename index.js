const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const pdfParse = require("pdf-parse");

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));

// Função para extrair contratos do texto
function extrairContratos(texto) {
  const contratos = [];

  // Pega só a seção de empréstimos bancários
  const inicio = texto.indexOf("EMPRÉSTIMOS BANCÁRIOS");
  const fim = texto.indexOf("**Valor pago") > -1 ? texto.indexOf("**Valor pago") : texto.length;
  const bloco = texto.substring(inicio, fim);

  // Quebra em linhas
  const linhas = bloco.split("\n").map(l => l.trim()).filter(l => l);

  let contratoAtual = null;
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Detecta início de contrato (número grande ou código)
    if (/^\d{5,}/.test(linha)) {
      if (contratoAtual) contratos.push(contratoAtual);
      contratoAtual = {
        contrato: linha,
        banco: null,
        parcelas: null,
        parcela: null,
        valorEmprestado: null,
        taxaMensal: "0",
        inicioDesconto: null
      };
    }

    if (contratoAtual) {
      if (linha.includes("BANCO") || linha.match(/ITAÚ|BRASIL|C6|FACTA|BRADESCO/i)) {
        contratoAtual.banco = linha.replace("BANCO", "").trim();
      }

      if (linha.match(/^\d{2}\/\d{4}.*\d{2}\/\d{4}/)) {
        const partes = linha.split(/\s+/);
        contratoAtual.parcelas = parseInt(partes[partes.length - 5]) || null;
        contratoAtual.parcela = partes[partes.length - 4].replace("R$", "").trim();
        contratoAtual.valorEmprestado = partes[partes.length - 3].replace("R$", "").trim();
      }

      if (linha.match(/\d,\d{2}/) && linha.includes("%") === false) {
        const taxa = linha.match(/\d,\d{2}/);
        if (taxa) contratoAtual.taxaMensal = taxa[0];
      }

      if (linha.match(/\d{2}\/\d{2}\/\d{2}/)) {
        contratoAtual.inicioDesconto = linha.match(/\d{2}\/\d{2}\/\d{2}/)[0];
      }
    }
  }

  if (contratoAtual) contratos.push(contratoAtual);
  return contratos;
}

// Rota para processar extrato direto da API
app.post("/extrato", async (req, res) => {
  try {
    const { codigoArquivo } = req.body;

    if (!codigoArquivo) {
      return res.status(400).json({ error: "codigoArquivo é obrigatório" });
    }

    // Chama sua API para pegar o PDF binário
    const response = await axios.post(
      "https://lunasdigital.atenderbem.com/int/downloadFile",
      {
        queueId: 25,
        apiKey: "cd4d0509169d4e2ea9177ac66c1c9376",
        fileId: codigoArquivo,
        download: true,
      },
      { responseType: "arraybuffer" }
    );

    const pdfBuffer = Buffer.from(response.data);

    // Extrai texto do PDF
    const data = await pdfParse(pdfBuffer);
    const texto = data.text;

    // Extrai contratos
    const contratos = extrairContratos(texto);

    // Descobre se está bloqueado
    const bloqueado = texto.includes("Bloqueado para empréstimo");

    // Pega margem extrapolada
    let margemExtrapolada = "0,00";
    const margemMatch = texto.match(/MARGEM EXTRAPOLADA\*+\s+R\$([\d.,]+)/);
    if (margemMatch) {
      margemExtrapolada = margemMatch[1];
    }

    res.json({
      codigoArquivo,
      bloqueado,
      margemExtrapolada,
      contratos
    });

  } catch (err) {
    console.error("Erro ao processar PDF:", err);
    res.status(500).json({ error: "Erro ao processar PDF" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`);
});
