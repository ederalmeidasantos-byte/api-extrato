import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { extrairDeUpload } from "./extrair_pdf.js";
import { extrairDeUploadPaginas } from "./extrair_pdf_paginas.js"; // ✅ novo
import { calcularTrocoEndpoint } from "./calculo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "jsonDir");
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR, { recursive: true });

const upload = multer({ dest: PDF_DIR });
const app = express();
app.use(express.json({ limit: "10mb" }));

// ================= HEALTH =================
app.get("/", (req, res) => res.send("API rodando ✅"));

// ================= MODELO ORIGINAL CORRIGIDO =================

/**
 * POST /extrair/upload → upload local (modelo original corrigido)
 */
app.post("/extrair/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Envie um PDF em form-data: file=<arquivo>" });
    const out = await extrairDeUpload({
      fileId: req.body.fileId || req.file.filename,
      pdfPath: req.file.path,
      jsonDir: JSON_DIR
    });
    res.json(out);
  } catch (err) {
    console.error("❌ Erro em /extrair/upload:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= MODELO NOVO (POR PÁGINAS) =================

/**
 * POST /extrair/upload_paginas → upload local (modelo separado por páginas)
 */
app.post("/extrair/upload_paginas", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Envie um PDF em form-data: file=<arquivo>" });
    const out = await extrairDeUploadPaginas({
      fileId: req.body.fileId || req.file.filename,
      pdfPath: req.file.path,
      jsonDir: JSON_DIR
    });
    res.json(out);
  } catch (err) {
    console.error("❌ Erro em /extrair/upload_paginas:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= OUTRAS ROTAS =================

/**
 * GET /calcular/:fileId → cálculo de troco
 */
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

/**
 * GET /extrato/:fileId/raw → retorna JSON cru
 */
app.get("/extrato/:fileId/raw", (req, res) => {
  const { fileId } = req.params;
  const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);

  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "Extrato não encontrado" });
  }

  res.sendFile(jsonPath);
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
