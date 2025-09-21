// server.js
import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { fileURLToPath } from "url";
import PQueue from "p-queue";
import multer from "multer";
import { spawn } from "child_process";
import { Server } from "socket.io";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// pastas
const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "jsonDir");
const UPLOADS_DIR = path.join(__dirname, "uploads"); // temporário para uploads FGTS
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const CSV_TARGET = path.join(__dirname, "cpfs.csv"); // arquivo que seus scripts leem

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

// fila (ex.: uso em outras rotas)
const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 2 });

// ====== Start servidor com socket.io (cria io antes de usar) ======
const server = http.createServer(app);
const io = new Server(server);

// logs de conexão
io.on("connection", (socket) => {
  console.log("🔗 Cliente conectado para logs FGTS");
  socket.emit("log", "🔗 Conexão estabelecida com servidor de logs.");
});

// Multer (upload)
const upload = multer({ dest: UPLOADS_DIR });

// Página UI (upload + start em 1 botão)
app.get("/fgts", (req, res) => {
  res.send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>FGTS - Upload & Start</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 18px; }
    pre { background:#111; color:#0f0; padding:8px; height: 400px; overflow:auto; }
  </style>
</head>
<body>
  <h1>FGTS — Upload e Iniciar</h1>
  <form id="form">
    <input type="file" id="csvfile" name="csvfile" accept=".csv" required />
    <button type="submit">📂 Enviar e Iniciar</button>
  </form>

  <h2>Logs</h2>
  <pre id="logs"></pre>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();

    const logs = document.getElementById('logs');
    socket.on('log', msg => {
      logs.textContent += msg + "\\n";
      logs.scrollTop = logs.scrollHeight;
    });

    const form = document.getElementById('form');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = document.getElementById('csvfile').files[0];
      if (!f) return alert('Escolha um arquivo CSV');

      const fd = new FormData();
      fd.append('csvfile', f);

      const res = await fetch('/fgts/run', { method: 'POST', body: fd });
      const json = await res.json();
      logs.textContent += '[CLIENT] ' + (json.message || JSON.stringify(json)) + "\\n";
    });
  </script>
</body>
</html>
  `);
});

// Endpoint que recebe a planilha e inicia o processo
// - move/renomeia o arquivo para cpfs.csv (substitui a antiga)
// - inicia o processo filho (fgts_csv.js) e encaminha logs via socket
app.post("/fgts/run", upload.single("csvfile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const tempPath = req.file.path;
    // move para o arquivo que os scripts esperam
    await fsp.copyFile(tempPath, CSV_TARGET);
    // remove temporário
    try { await fsp.unlink(tempPath); } catch (_) {}

    io.emit("log", `📂 Planilha recebida: ${req.file.originalname} -> ${CSV_TARGET}`);

    // verifica se existe fgts_csv.js
    const fgtsScript = path.join(__dirname, "fgts_csv.js");
    if (!fs.existsSync(fgtsScript)) {
      const msg = "❌ Arquivo fgts_csv.js não encontrado na pasta do servidor.";
      console.error(msg);
      io.emit("log", msg);
      return res.status(500).json({ error: msg });
    }

    // spawn com node correto
    const child = spawn(process.execPath, [fgtsScript], { cwd: __dirname, env: process.env });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString().trim();
      text.split(/\r?\n/).forEach(line => io.emit("log", line));
      process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString().trim();
      text.split(/\r?\n/).forEach(line => io.emit("log", "❌ " + line));
      process.stderr.write(chunk);
    });

    child.on("close", (code) => {
      io.emit("log", `✅ Processo FGTS finalizado (code=${code})`);
    });

    return res.json({ message: "🚀 Planilha recebida e automação FGTS iniciada!" });
  } catch (err) {
    console.error("❌ /fgts/run error:", err);
    io.emit("log", "❌ /fgts/run error: " + (err.message || err));
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// rota health
app.get("/health", (req, res) => res.json({ ok: true }));

// start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server rodando na porta ${PORT}`));
