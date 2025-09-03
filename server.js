import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { calcularTrocoEndpoint } from "./calculo.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "jsonDir");
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR, { recursive: true });

const upload = multer({ dest: PDF_DIR });
const app = express();
app.use(express.json({ limit: "10mb" }));

// ================= Helpers =================
async function gptExtrairJSON(pdfPath) {
  const file = await openai.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants"
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "Você é um assistente que extrai contratos consignados de extratos INSS e retorna JSON válido."
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Leia o PDF e extraia os contratos em JSON válido." },
          { type: "file", file_id: file.id }
        ]
      }
    ]
  });

  let raw = completion.choices[0]?.message?.content?.[0]?.text || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(raw);
}

async function extrairDeLunas({ fileId, pdfDir, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
  if (fs.existsSync(jsonPath)) {
    console.log("♻️ Usando cache:", jsonPath);
    return JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
  }

  console.log("🚀 Iniciando extração do fileId:", fileId);

  const body = {
    queueId: Number(process.env.LUNAS_QUEUE_ID),
    apiKey: process.env.LUNAS_API_KEY,
    fileId: Number(fileId),
    download: true
  };

  const resp = await fetch(process.env.LUNAS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${t}`);
  }

  const pdfPath = path.join(pdfDir, `extrato_${fileId}.pdf`);
  const arrayBuffer = await resp.arrayBuffer();
  await fsp.writeFile(pdfPath, Buffer.from(arrayBuffer));
  console.log("✅ PDF salvo em", pdfPath);

  const json = await gptExtrairJSON(pdfPath);
  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  return json;
}

// ================= HEALTH =================
app.get("/", (req, res) => res.send("API rodando ✅"));

// ================= ROTAS =================
app.post("/extrair", async (req, res) => {
  try {
    const fileId = req.body.fileId || req.query.fileId;
    if (!fileId) return res.status(400).json({ error: "fileId é obrigatório" });

    const out = await extrairDeLunas({ fileId, pdfDir: PDF_DIR, jsonDir: JSON_DIR });
    res.json(out);
  } catch (err) {
    console.error("❌ Erro em /extrair:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/extrair/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Envie um PDF em form-data: file=<arquivo>" });

    const jsonPath = path.join(JSON_DIR, `extrato_${req.file.filename}.json`);
    const json = await gptExtrairJSON(req.file.path);
    await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair/upload:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/extrair/:fileId", async (req, res) => {
  try {
    const out = await extrairDeLunas({ fileId: req.params.fileId, pdfDir: PDF_DIR, jsonDir: JSON_DIR });
    res.json(out);
  } catch (err) {
    console.error("❌ Erro em /extrair/:fileId:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

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
