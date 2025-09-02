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

app.use(express.json({ limit: "10mb" }));

// health check
app.get("/", (req, res) => res.send("API rodando ✅"));

// 🔹 rota única para extrair
app.post("/extrair", upload.single("file"), async (req, res) => {
  try {
    let fileId = req.body.fileId || req.query.fileId || req.params.fileId;

    if (req.file) {
      // caso upload local
      fileId = fileId || req.file.filename;
      const out = await extrairDeUpload({
        fileId,
        pdfPath: req.file.path,
        jsonDir: JSON_DIR
      });
      return res.json(out);
    }

    if (fileId) {
      // caso via Lunas (sem arquivo, só fileId)
      const out = await extrairDeLunas({
        fileId,
        pdfDir: PDF_DIR,
        jsonDir: JSON_DIR
      });
      return res.json(out);
    }

    return res.status(400).json({ error: "Envie um PDF (form-data: file) ou informe fileId" });
  } catch (err) {
    console.error("❌ Erro no /extrair:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 calcular endpoint (usa JSON já salvo)
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

// 🔹 endpoint para ver JSON cru
app.get("/extrato/:fileId/raw", (req, res) => {
  const { fileId } = req.params;
  const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);

  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "Extrato não encontrado" });
  }

  res.sendFile(jsonPath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
