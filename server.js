import express from "express";
import { extrairContratos } from "./extrair_pdf.js"; // importa sua função de extração

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json());

// Rota de teste
app.get("/", (req, res) => {
  res.send("🚀 API Extrato rodando!");
});

// Rota principal de extração
app.post("/extrair", async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "fileId é obrigatório" });
    }

    const contratos = await extrairContratos(fileId);
    res.json(contratos);
  } catch (error) {
    console.error("❌ Erro na rota /extrair:", error);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
