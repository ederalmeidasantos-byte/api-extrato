import "dotenv/config";
import { setPause } from "./fgts_csv.js";
import express from "express";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { extrairDeUpload } from "./extrair_pdf.js";
import PQueue from "p-queue";
import multer from "multer";
import { Server } from "socket.io";
import http from "http";
import { processarCPFs, disparaFluxo, setDelay as setDelayFGTS, attachIO } from "./fgts_csv.js";
import { calcularTrocoEndpoint } from "./calculo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastas
const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "jsonDir");
const UPLOADS_DIR = path.join(__dirname, "uploads");
[PDF_DIR, JSON_DIR, UPLOADS_DIR].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

// TTL cache
const TTL_MS = 14 * 24 * 60 * 60 * 1000;
const cacheValido = (p) => { try { return Date.now() - fs.statSync(p).mtimeMs <= TTL_MS; } catch { return false; } };

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ====== Socket.IO ======
const server = http.createServer(app);
const io = new Server(server);

// Anexar socket ao módulo FGTS
attachIO(io);

// Importar funções de agendamento
import { isHorarioComercial, agendarDisparo, processarAgendamentos, ajustarDelayDinamico } from "./fgts_csv.js";

// Armazenamento em memória dos resultados
let resultadosFGTS = [];

// Variável global de delay (ms) para processarCPFs
let DELAY_MS = 1000;
function setDelay(ms) {
  if (ms && !isNaN(ms) && ms > 0) {
    DELAY_MS = ms;
    setDelayFGTS(DELAY_MS);
    console.log(`[${new Date().toISOString()}] ⚡ Delay atualizado para ${DELAY_MS}ms`);
  }
}

// Variável de controle de pausa
let fgtsPaused = false;

// ===== Normalização de CPF =====
function normalizeCPF(input) {
  if (input == null) return null;
  const asNumber = Number(input);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) input = asNumber.toFixed(0);
  const digits = String(input).replace(/\D/g, "");
  if (digits.length <= 11) return digits.padStart(11, "0");
  return null;
}

// Fila PQueue
const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 2 });

// ===== Função para logs no painel =====
function logPainel(msg) {
  io.emit("log", msg);
  console.log(msg);
}

// Função para emitir resultado de CPF no painel
function emitirResultadoPainel(data) {
  const { linha, cpf, id, status, provider, valorLiberado, icone = '✅' } = data;
  const valorExibir = (typeof valorLiberado === 'number') ? valorLiberado.toFixed(2) : (valorLiberado ? valorLiberado : '-');
  io.emit("log", `[CLIENT] ${icone} Linha: ${linha || '?'} | CPF: ${cpf || '-'} | ID: ${id || '-'} | Status: ${status || '-'} | Valor Liberado: ${valorExibir} | Provider: ${provider || '-'}`);
  io.emit("resultadoCPF", data);
}

// Conexão Socket
io.on("connection", (socket) => {
  console.log("🔗 Cliente conectado para logs FGTS");
  resultadosFGTS.forEach(r => socket.emit("resultadoCPF", r));
  socket.emit("delayUpdate", DELAY_MS);
});

// Health check
app.get("/", (req, res) => res.send("API rodando ✅"));

// ===== Fluxo Lunas / PDF =====
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
    const body = { queueId: Number(process.env.LUNAS_QUEUE_ID), apiKey: process.env.LUNAS_API_KEY, fileId: Number(fileId), download: true };
    const resp = await fetch(process.env.LUNAS_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (!resp.ok) throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${await resp.text()}`);

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

  logPainel(`📂 Planilha FGTS recebida: ${req.file.path}`);
  (async () => {
    try {
      const raw = await fsp.readFile(req.file.path, "utf-8");
      const lines = raw.split("\n").filter(l => l.trim());
      const totalCpfs = lines.length;
      let processados = 0;
      let contadorSuccess = 0;
      let contadorPending = 0;
      let contadorSemAutorizacao = 0;

      io.emit("progress", { done: 0, total: totalCpfs });
      logPainel(`🔹 Iniciando processamento de ${totalCpfs} CPFs...`);

      await processarCPFs(req.file.path, null, async (result) => {
        while(fgtsPaused) await new Promise(r => setTimeout(r, 200));

        if (!result) {
          processados++;
          io.emit("progress", { done: processados, total: totalCpfs });
          return;
        }

        if (result.cpf) { const n = normalizeCPF(result.cpf); if(n) result.cpf = n; }

        switch((result.status||'').toLowerCase()) {
          case 'success': contadorSuccess++; break;
          case 'pending': contadorPending++; break;
          case 'no_auth': contadorSemAutorizacao++; break;
        }

        resultadosFGTS.push(result);
        emitirResultadoPainel(result);

        processados++;
        io.emit("progress", { done: processados, total: totalCpfs, counters: { success: contadorSuccess, pending: contadorPending, semAutorizacao: contadorSemAutorizacao } });
      });

      logPainel("✅ Processamento FGTS finalizado!");
    } catch (err) {
      logPainel(`❌ Erro no processamento FGTS: ${err.message}`);
      console.error("❌ Erro no processamento FGTS:", err);
    } finally {
      try { await fsp.unlink(req.file.path); } catch {}
    }
  })();

  res.json({ message: "🚀 Planilha recebida e automação FGTS iniciada!" });
});

// ===== Reprocessar pendentes =====
app.post("/fgts/reprocessar", async (req, res) => {
  const cpfs = req.body.cpfs || [];
  if (!cpfs.length) return res.status(400).json({ message: "Nenhum CPF fornecido" });

  logPainel(`🔄 Reprocessar pendentes: ${cpfs.join(", ")}`);

  (async () => {
    try {
      let processados = 0, contadorSuccess = 0, contadorPending = 0, contadorSemAutorizacao = 0;
      const totalCpfs = cpfs.length;

      const processarCPF = async (cpf) => {
        while(fgtsPaused) await new Promise(r => setTimeout(r, 200));
        const result = await processarCPFs(null, [cpf]);
        if(result && result[0]){
          const r = result[0];
          switch((r.status||'').toLowerCase()) {
            case 'success': contadorSuccess++; break;
            case 'pending': contadorPending++; break;
            case 'no_auth': contadorSemAutorizacao++; break;
          }
          resultadosFGTS.push(r);
          emitirResultadoPainel(r);
          processados++;
          io.emit("progress", { done: processados, total: totalCpfs, counters: { success: contadorSuccess, pending: contadorPending, semAutorizacao: contadorSemAutorizacao } });
        }
      };

      cpfs.forEach(cpf => queue.add(() => processarCPF(cpf)));
      await queue.onIdle();
      logPainel(`✅ Reprocessamento finalizado para ${cpfs.length} CPFs`);
    } catch(err) {
      logPainel(`❌ Erro no reprocessamento: ${err.message}`);
      console.error("❌ Erro no reprocessamento:", err);
    }
  })();

  res.json({ message: `✅ Reprocesso iniciado para ${cpfs.length} CPFs` });
});

// ===== Mudar fase para não autorizados =====
app.post("/fgts/mudarFaseNaoAutorizados", async (req, res) => {
  const ids = req.body.ids || [];
  if (!ids.length) return res.status(400).json({ message: "Nenhum ID fornecido" });
  logPainel(`📌 Mudar fase no CRM para IDs: ${ids.join(", ")}`);
  (async () => {
    try { 
      for(const id of ids) {
        await disparaFluxo(id);
      }
      logPainel(`✅ Fase alterada para ${ids.length} registros`); 
    }
    catch(err){ 
      logPainel(`❌ Erro ao mudar fase: ${err.message}`); 
      console.error(err); 
    }
  })();
  res.json({ message: `✅ Fase alterada para ${ids.length} registros` });
});

// ===== Atualizar delay dinamicamente =====
app.post("/fgts/delay", (req,res) => {
  const novoDelay = parseInt(req.body?.delay,10);
  if(isNaN(novoDelay)||novoDelay<0) return res.status(400).json({ message: "Delay inválido" });
  setDelay(novoDelay);
  io.emit("delayUpdate", DELAY_MS);
  res.json({ message: `Delay atualizado para ${DELAY_MS}ms` });
});

// Pausar
app.post("/fgts/pause", (req,res)=>{
  fgtsPaused = true;
  setPause(true);
  logPainel("⏸️ Processamento pausado pelo usuário");
  res.json({message:"Pausado"});
});

// Retomar
app.post("/fgts/resume", (req,res)=>{
  fgtsPaused = false;
  setPause(false);
  logPainel("▶️ Processamento retomado pelo usuário");
  res.json({message:"Retomado"});
});

// ===== Cálculo =====
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

// ===== Agendamentos =====
app.get("/fgts/agendamentos", (req, res) => {
  // Esta função seria implementada para retornar agendamentos pendentes
  res.json({ message: "Endpoint de agendamentos - em desenvolvimento" });
});

// ===== Status do sistema =====
app.get("/fgts/status", (req, res) => {
  const agora = new Date();
  const hora = agora.getHours();
  const isComercial = hora >= 8 && hora < 22;
  
  res.json({
    horarioComercial: isComercial,
    horaAtual: agora.toLocaleString('pt-BR'),
    delayAtual: DELAY_MS,
    status: "online"
  });
});

// ===== Servidor =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
