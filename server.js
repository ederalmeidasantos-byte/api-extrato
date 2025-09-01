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

// route /extrair/:fileId — SEM JSON no body
app.post("/extrair/:fileId", async (req, res) => {
  try {
    const out = await extrairDeLunas({ fileId: req.params.fileId, pdfDir: PDF_DIR, jsonDir: JSON_DIR });
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// route upload — usa JSON parser se quiser ler req.body além do file
app.post("/extrair", upload.single("file"), jsonParser, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Envie um PDF em form-data: file=<arquivo>" });
    const out = await extrairDeUpload({ fileId: req.body.fileId || req.file.filename, pdfPath: req.file.path, jsonDir: JSON_DIR });
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// calcular endpoint (no JSON body)
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
