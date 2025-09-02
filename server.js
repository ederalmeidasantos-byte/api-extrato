import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { extrairDeLunas, extrairDeUpload } from "./extrair_pdf.js";
import { calcularTrocoEndpoint } from "./calculo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "json");
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR, { recursive: true });

const upload = multer({ dest: PDF_DIR });
const app = express();
const jsonParser = express.json({ limit: "10mb" });

// health
app.get("/", (req, res) => res.send("API rodando ✅"));

// ========== ROTAS ==========

// rota via LUNAS (render/atenderbem) 
// aceita tanto /extrair/:fileId quanto /extrair com JSON no body
app.post("/extrair/:fileId?", jsonParser, async (req, res) => {
  try {
    const fileId = req.params.fileId || req.body.fileId;
    if (!fileId) {
      return res.status(400).json({ error: "fileId é obrigatório (param ou body)" });
    }

    const out = await extrairDeLunas({ fileId, pdfDir: PDF_DIR, jsonDir: JSON_DIR });
    res.json(out);
  } catch (err) {
    console.error("❌ Erro em /extrair:", err);
    res.status(500).json({ error: err.message });
  }
});

// rota de upload local (form-data file=pdf)
app.post("/extrair-upload", upload.single("file"), jsonParser, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Envie um PDF em form-data: file=<arquivo>" });

    const fileId = req.body.fileId || req.file.filename;
    const out = await extrairDeUpload({
      fileId,
      pdfPath: req.file.path,
      jsonDir: JSON_DIR
    });

    res.json(out);
  } catch (err) {
    console.error("❌ Erro em /extrair-upload:", err);
    res.status(500).json({ error: err.message });
  }
});

// calcular endpoint
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

// rota para ver o JSON cru do extrato
app.get("/extrato/:fileId/raw", (req, res) => {
  const { fileId } = req.params;
  const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);

  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "Extrato não encontrado" });
  }

  res.sendFile(jsonPath);
});

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
