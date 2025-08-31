const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const pdfParse = require("pdf-parse");

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));

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
        queueId: 25, // ou variável dinâmica
        apiKey: "cd4d0509169d4e2ea9177ac66c1c9376",
        fileId: codigoArquivo,
        download: true,
      },
      { responseType: "arraybuffer" } // importante! garante que venha binário
    );

    const pdfBuffer = Buffer.from(response.data);

    // Extrai texto do PDF
    const data = await pdfParse(pdfBuffer);
    const texto = data.text;

    // === Teste inicial: retorna só parte do texto extraído ===
    res.json({
      codigoArquivo,
      preview: texto.substring(0, 500) + "..."
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
