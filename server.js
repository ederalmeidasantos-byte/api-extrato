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
import multer from "multer";
import { Server } from "socket.io";
import http from "http";
import { processarCPFs, disparaFluxo } from "./fgts_csv.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastas
const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "jsonDir");
const UPLOADS_DIR = path.join(__dirname, "uploads");
[PDF_DIR, JSON_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// TTL cache
const TTL_MS = 14 * 24 * 60 * 60 * 1000;
const cacheValido = (p) => {
  try { return Date.now() - fs.statSync(p).mtimeMs <= TTL_MS; } 
  catch { return false; }
};

const app = express();
app.use(express.json({ limit: "10mb" }));

// ====== Socket.IO ======
const server = http.createServer(app);
const io = new Server(server);

// Armazenamento em memória dos resultados
let resultadosFGTS = [];

// Variável global de delay (ms) para processarCPFs
let DELAY_MS = parseInt(process.env.DEFAULT_DELAY_MS || "1000", 10);

io.on("connection", (socket) => {
  console.log("🔗 Cliente conectado para logs FGTS");

  // Envia os resultados já processados
  resultadosFGTS.forEach(r => socket.emit("result", r));

  // Envia valor atual do delay
  socket.emit("delayUpdate", DELAY_MS);
});

// Fila: até 2 jobs em paralelo
const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 2 });

// Health
app.get("/", (req, res) => res.send("API rodando ✅"));

// Logs iniciais
console.log("🔑 OPENAI_API_KEY presente?", !!process.env.OPENAI_API_KEY);
console.log("🔑 LUNAS_API_URL:", process.env.LUNAS_API_URL);
console.log("🔑 LUNAS_QUEUE_ID:", process.env.LUNAS_QUEUE_ID);

// Fluxo via Lunas
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

    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== FGTS Automação ======
const upload = multer({ dest: UPLOADS_DIR });
app.get("/fgts", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Inicia processamento CSV
app.post("/fgts/run", upload.single("csvfile"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Arquivo CSV não enviado!" });

  console.log("📂 Planilha FGTS recebida:", req.file.path);
  io.emit("log", `📂 Planilha FGTS recebida: ${req.file.path}`);

  (async () => {
    try {
      await processarCPFs(req.file.path, null, (result) => {
        if(result) resultadosFGTS.push(result);
        io.emit("log", JSON.stringify(result));
        if(result) io.emit("result", result);
      }, DELAY_MS); // <-- Passando delay atual
      io.emit("log", "✅ Processamento FGTS finalizado!");
    } catch (err) {
      console.error("❌ Erro no processamento FGTS:", err);
      io.emit("log", `❌ Erro no processamento FGTS: ${err.message}`);
    } finally {
      try { await fsp.unlink(req.file.path); } catch {}
    }
  })();

  res.json({ message: "🚀 Planilha recebida e automação FGTS iniciada!" });
});

// Reprocessar pendentes
app.post("/fgts/reprocessar", async (req, res) => {
  const cpfs = req.body.cpfs || [];
  if (!cpfs.length) return res.status(400).json({ message: "Nenhum CPF fornecido" });

  console.log("🔄 Reprocessar pendentes:", cpfs);
  io.emit("log", `🔄 Reprocessar pendentes: ${cpfs.join(", ")}`);

  (async () => {
    try {
      await processarCPFs(null, cpfs, (result) => {
        if(result) resultadosFGTS.push(result);
        io.emit("log", JSON.stringify(result));
        if(result) io.emit("result", result);
      }, DELAY_MS); // <-- Passando delay atual
      io.emit("log", `✅ Reprocessamento finalizado para ${cpfs.length} CPFs`);
    } catch (err) {
      console.error("❌ Erro no reprocessamento:", err);
      io.emit("log", `❌ Erro no reprocessamento: ${err.message}`);
    }
  })();

  res.json({ message: `✅ Reprocesso iniciado para ${cpfs.length} CPFs` });
});

// Mudar fase para não autorizados
app.post("/fgts/mudarFaseNaoAutorizados", async (req, res) => {
  const ids = req.body.ids || [];
  if (!ids.length) return res.status(400).json({ message: "Nenhum ID fornecido" });

  console.log("📌 Mudar fase no CRM para IDs:", ids);
  io.emit("log", `📌 Mudar fase no CRM para IDs: ${ids.join(", ")}`);

  (async () => {
    try {
      for (const id of ids) await disparaFluxo(id, 3);
      io.emit("log", `✅ Fase alterada para ${ids.length} registros`);
    } catch (err) {
      console.error("❌ Erro ao mudar fase:", err);
      io.emit("log", `❌ Erro ao mudar fase: ${err.message}`);
    }
  })();

  res.json({ message: `✅ Fase alterada para ${ids.length} registros` });
});

// Atualizar delay dinamicamente
app.post("/fgts/delay", (req, res) => {
  const novoDelay = parseInt(req.body.delayMs, 10);
  if (isNaN(novoDelay) || novoDelay < 0) {
    return res.status(400).json({ message: "Delay inválido" });
  }
  DELAY_MS = novoDelay;
  io.emit("delayUpdate", DELAY_MS);
  console.log(`⏱️ Delay atualizado para ${DELAY_MS}ms`);
  res.json({ message: `Delay atualizado para ${DELAY_MS}ms` });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
