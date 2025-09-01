import express from "express";
import { extrairContratos } from "./extrair_pdf.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Rota principal
app.get("/", (req, res) => {
  res.send("✅ API EXTRATO ONLINE");
});

// Rota para extrair contratos de um fileId
app.get("/extrato/:fileId", async (req, res) => {
  const { fileId } = req.params;

  try {
    const contratos = await extrairContratos(fileId);
    res.json({ fileId, contratos });
  } catch (err) {
    console.error(`❌ Erro no processamento fileId=${fileId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
