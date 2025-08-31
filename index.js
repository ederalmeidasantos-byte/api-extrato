const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json({ limit: "50mb" }));

// Rota de teste
app.get("/", (req, res) => {
  res.send("🚀 API do Extrato rodando!");
});

// Rota para extrair texto do PDF
app.post("/extrair", async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "pdfBase64 é obrigatório" });
    }

    const response = await axios.post(
      "https://api.cloudmersive.com/convert/pdf/to/txt",
      Buffer.from(pdfBase64, "base64"),
      {
        headers: {
          "Apikey": "1d68371d-57cf-42ee-9b19-c7d950c12e39",
          "Content-Type": "application/pdf"
        }
      }
    );

    res.json({ textoExtraido: response.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao processar PDF" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
