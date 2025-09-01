import express from "express";
import multer from "multer";
import { extrairDadosPdf } from "./extrair_pdf.js";

const app = express();
const upload = multer({ dest: "uploads/" }); // salva temporariamente

app.post("/extrair", upload.single("arquivo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Envie um PDF no campo 'arquivo'" });
    }

    const resultado = await extrairDadosPdf(req.file.path);
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar PDF" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
