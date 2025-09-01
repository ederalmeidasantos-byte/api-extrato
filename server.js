import express from "express";
import dotenv from "dotenv";
import { processarExtratoPorFileId } from "./extrair_pdf.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Healthcheck
app.get("/", (_req, res) => res.send("🚀 API Extrato rodando!"));

// Endpoint principal
app.post("/extrair", async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: "fileId é obrigatório" });
    }
    const resultado = await processarExtratoPorFileId(fileId);
    return res.json(resultado);
  } catch (err) {
    console.error("❌ Erro /extrair:", err);
    return res.status(500).json({ error: "Erro interno", detalhe: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
