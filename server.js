import express from "express";
import bodyParser from "body-parser";
import { processarExtratoPorFileId } from "./extrair_pdf.js";

const app = express();
app.use(bodyParser.json());

// rota principal
app.post("/extrair", async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "fileId é obrigatório" });
    }

    const contratos = await processarExtratoPorFileId(fileId);
    return res.json(contratos);

  } catch (err) {
    console.error("❌ Erro /extrair:", err);

    return res.status(500).json({
      error: "Erro interno",
      detalhe: err.message,
      stack: err.stack
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
