import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { extrairEndpoint } from "./extrator.js"; // ✅ agora usamos o endpoint unificado
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

// health check
app.get("/", (req, res) => res.send("API rodando ✅"));

// 🔹 endpoint unificado /extrair
app.post("/extrair", upload.single("file"), jsonParser, extrairEndpoint(JSON_DIR, PDF_DIR));

// 🔹 também aceita GET com fileId na URL
app.get("/extrair/:fileId", extrairEndpoint(JSON_DIR, PDF_DIR));

// 🔹 calcular endpoint (usa JSON já salvo)
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

// 🔹 novo endpoint para ver JSON cru
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
