const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const CLOUD_API_KEY = process.env.CLOUD_API_KEY;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

// Função para converter PDF → Texto via Cloudmersive
async function pdfParaTexto(pdfBuffer) {
  const resp = await axios.post(
    "https://api.cloudmersive.com/convert/pdf/to/txt",
    pdfBuffer,
    {
      headers: {
        Apikey: CLOUD_API_KEY,
        "Content-Type": "application/pdf"
      },
      timeout: 60000
    }
  );
  return resp.data.TextResult || "";
}

// Rota principal
app.post("/extrato", async (req, res) => {
  try {
    const { codigoArquivo } = req.body;
    if (!codigoArquivo) {
      return res.status(400).json({ error: "codigoArquivo é obrigatório" });
    }

    // 1. Buscar PDF binário na sua API
    const pdfResponse = await axios.post(
      "https://lunasdigital.atenderbem.com/int/downloadFile",
      {
        queueId: 25,
        apiKey: INTERNAL_API_KEY,
        fileId: codigoArquivo,
        download: true
      },
      { responseType: "arraybuffer", timeout: 30000 }
    );

    const pdfBuffer = Buffer.from(pdfResponse.data);

    // 2. Converter PDF em texto no Cloudmersive
    const texto = await pdfParaTexto(pdfBuffer);

    // 3. Extrair informações do extrato
    const bloqueado = !/Elegível para empréstimos/i.test(texto);
    const margemMatch = texto.match(/MARGEM EXTRAPOLADA\*+\s+R\$\s*([\d.,]+)/i);
    const margemExtrapolada = margemMatch ? margemMatch[1].trim() : "0,00";

    const contratos = [];
    const regexContratos =
      /(\d{5,})[\s\S]*?(ITAU|C6|BRASIL|FACTA|BRADESCO|SANTANDER)?[\s\S]*?(\d{2}\/\d{4})\s+(\d{2}\/\d{4})\s+(\d+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)[\s\S]*?(\d+,\d+)?[\s\S]*?(\d{2}\/\d{2}\/\d{2})?/gi;

    let match;
    while ((match = regexContratos.exec(texto)) !== null) {
      contratos.push({
        contrato: match[1] || null,
        banco: match[2] || null,
        inicio: match[3] || null,
        fim: match[4] || null,
        parcelas: match[5] ? parseInt(match[5]) : null,
        parcela: match[6] || null,
        valorEmprestado: match[7] || null,
        taxaMensal: match[8] || "0",
        inicioDesconto: match[9] || null
      });
    }

    res.json({
      codigoArquivo,
      bloqueado,
      margemExtrapolada,
      contratos
    });

  } catch (err) {
    console.error("Erro:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Porta no Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
