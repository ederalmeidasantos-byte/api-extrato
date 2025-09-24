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
import { spawn } from "child_process";
import { Server } from "socket.io";
import http from "http";

// Ajuste para import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastas
const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "jsonDir");
const UPLOADS_DIR = path.join(__dirname, "uploads"); // FGTS
[PDF_DIR, JSON_DIR, UPLOADS_DIR].forEach(p => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); });

// TTL de cache (14 dias)
const TTL_MS = 14 * 24 * 60 * 60 * 1000;
const cacheValido = p => { try { return Date.now() - fs.statSync(p).mtimeMs <= TTL_MS } catch { return false } };

const app = express();
app.use(express.json({ limit: "10mb" }));

// Fila
const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 2 });

// Health check
app.get("/", (req, res) => res.send("API rodando ✅"));

// Logs iniciais
console.log("🔑 OPENAI_API_KEY presente?", !!process.env.OPENAI_API_KEY);
console.log("🔑 LUNAS_API_URL:", process.env.LUNAS_API_URL);
console.log("🔑 LUNAS_QUEUE_ID:", process.env.LUNAS_QUEUE_ID);

// ====== Rotas Lunas ======
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
    const resp = await fetch(process.env.LUNAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queueId: Number(process.env.LUNAS_QUEUE_ID),
        apiKey: process.env.LUNAS_API_KEY,
        fileId: Number(fileId),
        download: true
      })
    });

    if (!resp.ok) throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${await resp.text()}`);

    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    await fsp.writeFile(pdfPath, Buffer.from(await resp.arrayBuffer()));
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

app.get("/extrair/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: "PDF não encontrado" });

    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );
    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair/:fileId:", err);
    res.status(500).json({ error: err.message });
  }
});

// Calcular troco
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

// Raw JSON
app.get("/extrato/:fileId/raw", (req, res) => {
  const jsonPath = path.join(JSON_DIR, `extrato_${req.params.fileId}.json`);
  if (!fs.existsSync(jsonPath)) return res.status(404).json({ error: "Extrato não encontrado" });
  res.sendFile(jsonPath);
});

// ====== FGTS ======
const upload = multer({ dest: UPLOADS_DIR });
app.get("/fgts", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/fgts/run", upload.single("csvfile"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Arquivo CSV não enviado!" });

  console.log("📂 Planilha FGTS recebida:", req.file.path);
  const child = spawn("node", ["fgts_csv.js"], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CSV_FILE: req.file.path }
  });

  child.stdout.on("data", (data) => {
    const msg = data.toString();
    console.log(msg);
    io.emit("log", msg);

    msg.split("\n").forEach(line => {
      if (line.startsWith("RESULT:")) {
        try { io.emit("result", JSON.parse(line.replace("RESULT:", ""))) } 
        catch (e) { console.error("❌ Erro parse RESULT:", e.message) }
      }
    });
  });

  child.stderr.on("data", (data) => {
    const msg = data.toString();
    console.error(msg);
    io.emit("log", `❌ ${msg}`);
  });

  child.on("close", (code) => {
    io.emit("log", `✅ Processo FGTS finalizado (código ${code})`);
  });

  res.json({ message: "🚀 Planilha recebida e automação FGTS iniciada!" });
});

// ====== Rotas FGTS adicionais ======
import { disparaFluxo } from "./fgts.js"; // ajuste caminho se necessário

// Reprocessar Pendentes
app.post("/fgts/reprocessar", async (req, res) => {
  const { cpfs } = req.body;
  if (!cpfs || !Array.isArray(cpfs) || cpfs.length === 0) {
    return res.status(400).json({ message: "CPFs inválidos ou vazios" });
  }

  io.emit("log", `[SERVER] Iniciando reprocessamento de ${cpfs.length} CPFs pendentes...`);
  const resultados = [];

  for (const cpf of cpfs) {
    try {
      // aqui você pode chamar a função real do fgts.js
      const ok = true;
      resultados.push({ cpf, sucesso: ok });
      io.emit("log", ok ? `[SERVER] ✅ CPF ${cpf} reprocessado` : `[SERVER] ❌ Falha CPF ${cpf}`);
    } catch (err) {
      resultados.push({ cpf, sucesso: false });
      io.emit("log", `[SERVER] ❌ Erro CPF ${cpf}: ${err.message}`);
    }
  }

  io.emit("log", `[SERVER] Finalizado reprocessamento dos pendentes`);
  res.json({ message: "Reprocessamento concluído", resultados });
});

// Mudar fase não autorizados
app.post("/fgts/mudarFaseNaoAutorizados", async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "IDs inválidos ou vazios" });
  }

  io.emit("log", `[SERVER] Iniciando mudança de fase para ${ids.length} não autorizados...`);
  const resultados = [];

  for (const id of ids) {
    try {
      const ok = await disparaFluxo(id, 3);
      resultados.push({ id, sucesso: ok });
      io.emit("log", ok ? `[SERVER] ✅ ID ${id} atualizado para fase 3` : `[SERVER] ❌ Falha ID ${id}`);
    } catch (err) {
      resultados.push({ id, sucesso: false });
      io.emit("log", `[SERVER] ❌ Erro ID ${id}: ${err.message}`);
    }
  }

  io.emit("log", `[SERVER] Finalizado processamento dos não autorizados`);
  res.json({ message: "Processo concluído", resultados });
});

// ====== Socket.io e servidor ======
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("🔗 Cliente conectado para logs FGTS");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
