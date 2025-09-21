import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { calcularTrocoEndpoint } from "./calculo.js";
import { extrairDeUpload } from "./extrair_pdf.js";
import PQueue from "p-queue";

// ====== NOVO ======
import multer from "multer";
import { spawn } from "child_process";
import { Server } from "socket.io";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// pastas
const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "jsonDir");
const UPLOADS_DIR = path.join(__dirname, "uploads"); // FGTS
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// TTL de cache (14 dias)
const TTL_DIAS = 14;
const TTL_MS = TTL_DIAS * 24 * 60 * 60 * 1000;

function cacheValido(p) {
  try {
    const st = fs.statSync(p);
    return Date.now() - st.mtimeMs <= TTL_MS;
  } catch {
    return false;
  }
}

const app = express();
app.use(express.json({ limit: "10mb" }));

// ====== Fila: até 2 jobs em paralelo, 2 por segundo ======
const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 2 });

// ====== Health ======
app.get("/", (req, res) => res.send("API rodando ✅"));

// ====== Logs iniciais ======
console.log("🔑 OPENAI_API_KEY presente?", !!process.env.OPENAI_API_KEY);
console.log("🔑 LUNAS_API_URL:", process.env.LUNAS_API_URL);
console.log("🔑 LUNAS_QUEUE_ID:", process.env.LUNAS_QUEUE_ID);

// ====== Fluxo via Lunas (baixa e processa) ======
app.post("/extrair", async (req, res) => {
  try {
    const fileId = req.body.fileId || req.query.fileId;
    if (!fileId) return res.status(400).json({ error: "fileId é obrigatório" });

    const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);
    if (fs.existsSync(jsonPath) && cacheValido(jsonPath)) {
      console.log("♻️ Usando cache válido:", jsonPath);
      return res.json(JSON.parse(await fsp.readFile(jsonPath, "utf-8")));
    }

    console.log("🚀 Baixando PDF da Lunas:", fileId);
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

    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    const buf = Buffer.from(await resp.arrayBuffer());
    await fsp.writeFile(pdfPath, buf);
    console.log("✅ PDF salvo em", pdfPath);

    // processa com fila
    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== Fluxo direto (PDF já está no disco) ======
app.get("/extrair/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: "PDF não encontrado" });
    }

    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair/:fileId:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== Calcular troco ======
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

// ====== Raw JSON ======
app.get("/extrato/:fileId/raw", (req, res) => {
  const { fileId } = req.params;
  const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "Extrato não encontrado" });
  }
  res.sendFile(jsonPath);
});

// ====== FGTS Automação ======
const upload = multer({ dest: UPLOADS_DIR });

// Página do painel
app.get("/fgts", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Upload da planilha
app.post("/fgts/upload", upload.single("csvfile"), (req, res) => {
  console.log("📂 Planilha FGTS recebida:", req.file.path);
  res.send("Arquivo recebido com sucesso!");
});

// Iniciar automação
app.get("/fgts/start", (req, res) => {
  const process = spawn("node", ["fgts_csv.js"], {
    cwd: __dirname
  });

  process.stdout.on("data", (data) => {
    const msg = data.toString();
    console.log(msg);
    io.emit("log", msg);
  });

  process.stderr.on("data", (data) => {
    const msg = data.toString();
    console.error(msg);
    io.emit("log", "❌ " + msg);
  });

  process.on("close", (code) => {
    io.emit("log", `✅ Processo FGTS finalizado (código ${code})`);
  });

  res.send("🚀 Automação FGTS iniciada!");
});

// ====== Start servidor com socket.io ======
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("🔗 Cliente conectado para logs FGTS");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
