import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { extrairDeLunas, extrairDeUpload } from "./extrair_pdf.js";
import { calcularTrocoEndpoint } from "./calculo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// pastas
const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "json");
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR, { recursive: true });

// upload local
const upload = multer({ dest: PDF_DIR });

const app = express();
app.use(express.json({ limit: "10mb" }));

// health
app.get("/", (req, res) => res.send("API Extrato rodando ✅"));

// 1) Extrair via LUNAS pelo fileId
app.get("/extrair/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const out = await extrairDeLunas({ fileId, pdfDir: PDF_DIR, jsonDir: JSON_DIR });
    res.json(out);
  } catch (err) {
    console.error("Erro /extrair/:fileId", err);
    res.status(500).json({ error: "Erro interno", detalhe: err.message });
  }
});

// 2) Extrair via upload
app.post("/extrair", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Envie um PDF em form-data: file=<arquivo>" });
    const fileId = req.body.fileId || req.file.filename;
    const out = await extrairDeUpload({ fileId, pdfPath: req.file.path, jsonDir: JSON_DIR });
    res.json(out);
  } catch (err) {
    console.error("Erro /extrair upload", err);
    res.status(500).json({ error: "Erro interno", detalhe: err.message });
  }
});

// 3) Calcular troco
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API na porta ${PORT}`));
