import express from "express";
import bodyParser from "body-parser";
import multer from "multer";

import { extrairPDF } from "./extrair_pdf.js";
import { calcularTroco } from "./calculo.js";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(bodyParser.json());

// ================== Rotas ==================
app.post("/extrato", upload.single("file"), async (req, res) => {
  try {
    const fileId = req.file.filename; // usa o id do arquivo
    const extrato = await extrairPDF(req.file.path, fileId);
    res.json(extrato);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar o extrato" });
  }
});

app.post("/calculo/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const calculo = await calcularTroco(fileId);
    res.json(calculo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao calcular troco" });
  }
});

// ================== Start ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
