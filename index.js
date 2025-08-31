import express from "express";
import multer from "multer";
import axios from "axios";

const app = express();
const upload = multer(); // middleware para multipart/form-data

const CLOUDMERSIVE_API_KEY = "1d68371d-57cf-42ee-9b19-c7d950c12e39";

// rota para enviar o PDF do extrato
app.post("/extrato", upload.single("arquivo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF não enviado" });
    }

    // 📤 Envia o PDF recebido para a API Cloudmersive (OCR)
    const ocrResponse = await axios.post(
      "https://api.cloudmersive.com/convert/pdf/to/txt",
      req.file.buffer,
      {
        headers: {
          Apikey: CLOUDMERSIVE_API_KEY,
          "Content-Type": "application/pdf",
        },
      }
    );

    const texto = ocrResponse.data.TextResult || "";
    if (!texto) {
      return res.status(400).json({ error: "Não foi possível extrair texto do PDF" });
    }

    // 🔍 Extração de dados
    const contratos = [];
    const linhas = texto.split("\n");

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];

      if (linha.includes("Ativo")) {
        // regex para capturar as colunas principais
        const regex =
          /(\d{2}\/\d{4})\s+(\d{2}\/\d{4})\s+(\d+)\s+R\$(\d+,\d{2})\s+R\$(\d+,\d{2}).*?(\d+,\d{2})/;
        const match = linha.match(regex);

        if (match) {
          contratos.push({
            parcelas: match[3],
            parcela: match[4],
            valorEmprestado: match[5],
            taxaMensal: match[6] || "0",
            inicioDesconto: match[1],
          });
        }
      }
    }

    // 📊 Busca da margem extrapolada
    const margemMatch = texto.match(/MARGEM EXTRAPOLADA\*+\s+R\$(\d+,\d{2})/);
    const margemExtrapolada = margemMatch ? margemMatch[1] : "0,00";

    res.json({
      bloqueado: texto.includes("Bloqueado para empréstimo"),
      margemExtrapolada,
      contratos,
    });
  } catch (err) {
    console.error("Erro na API:", err.message);
    res.status(500).json({ error: "Erro interno na API" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
