import "dotenv/config";
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
import { processarCPFs, disparaFluxo, setDelay } from "./fgts_csv.js";
import { calcularTrocoEndpoint } from "./calculo.js";

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
app.use(express.urlencoded({ extended: true }));

// ====== Socket.IO ======
const server = http.createServer(app);
const io = new Server(server);

// Armazenamento em memória dos resultados
let resultadosFGTS = [];

// Variável global de delay (ms) para processarCPFs
let DELAY_MS = parseInt(process.env.DEFAULT_DELAY_MS || "1000", 10);
setDelay(DELAY_MS);

// Variável de controle de pausa
let fgtsPaused = false;

// Fila PQueue
const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 2 });

// ===== Função para logs no painel =====
function logPainel(msg) {
  io.emit("log", msg);  // envia para painel
  console.log(msg);     // mantém log no terminal
}

// Função para emitir resultado de CPF no formato painel
function emitirResultadoPainel(data) {
  const {
    linha,
    cpf,
    id,
    status,
    provider,
    valorLiberado,
    icone = '✅'
  } = data;

  const valorExibir = (typeof valorLiberado === 'number')
    ? valorLiberado.toFixed(2)
    : (valorLiberado ? valorLiberado : '-');

  io.emit("log", `[CLIENT] ${icone} Linha: ${linha || '?'} | CPF: ${cpf || '-'} | ID: ${id || '-'} | Status: ${status || '-'} | Valor Liberado: ${valorExibir} | Provider: ${provider || '-'}`);
  io.emit("resultadoCPF", data); // padronizado para o front
}

// Conexão do Socket
io.on("connection", (socket) => {
  console.log("🔗 Cliente conectado para logs FGTS");
  resultadosFGTS.forEach(r => socket.emit("resultadoCPF", r)); // ajuste aqui
  socket.emit("delayUpdate", DELAY_MS);
});

// Health check
app.get("/", (req, res) => res.send("API rodando ✅"));

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

  logPainel(`📂 Planilha FGTS recebida: ${req.file.path}`);

  (async () => {
    try {
      // conta linhas para saber total (mantemos isso só pra progresso)
      const raw = await fsp.readFile(req.file.path, "utf-8");
      const lines = raw.split("\n").filter(l => l.trim());
      const totalCpfs = lines.length;
      let processados = 0;

      let contadorSuccess = 0;
      let contadorPending = 0;
      let contadorSemAutorizacao = 0;

      // envia total inicial pro painel
      io.emit("progress", { done: 0, total: totalCpfs });

      // Função que processa CPF individualmente com pausa (usa normalize antes)
      async function processarCPFComPausa(cpfRaw) {
        while (fgtsPaused) await new Promise(r => setTimeout(r, 200));
        const cpfNorm = normalizeCPF(cpfRaw);
        if (!cpfNorm) return null;
        return await processarCPFs(null, [cpfNorm], null, DELAY_MS);
      }

      // Processa CSV usando processarCPFs com callback (mantém fluxo sequencial e pausa funcional)
      await processarCPFs(req.file.path, null, async (result) => {
        // pausa enquanto fgtsPaused for true (bloqueia progressão)
        while (fgtsPaused) await new Promise(r => setTimeout(r, 200));

        if (!result) {
          processados++;
          io.emit("progress", { done: processados, total: totalCpfs });
          return;
        }

        // Normaliza CPF do resultado
        if (result.cpf) {
          const n = normalizeCPF(result.cpf);
          if (n) result.cpf = n;
          // se normalizeCPF retornou null, podemos marcar como inválido ou manter original;
          // aqui mantemos original para debug, mas você pode preferir setar result.cpf = null;
        }

        // Atualiza contadores conforme status
        switch ((result.status || "").toLowerCase()) {
          case "success": contadorSuccess++; break;
          case "pending": contadorPending++; break;
          case "error":
            if ((result.statusInfo || "").toLowerCase().includes("não possui autorização")) {
              contadorSemAutorizacao++;
            }
            break;
        }

        // Adiciona resultado à lista global
        resultadosFGTS.push(result);

        // Emite atualização (incrementa processados)
        io.emit("statusUpdate", {
          linha: result.linha || '?',
          cpf: result.cpf || '-',
          id: result.id || '-',
          status: result.status || '-',
          provider: result.provider || '-',
          valorLiberado: (typeof result.valorLiberado === 'number')
            ? result.valorLiberado.toFixed(2)
            : (result.valorLiberado || '-'),
          counters: {
            success: contadorSuccess,
            pending: contadorPending,
            semAutorizacao: contadorSemAutorizacao
          },
          processed: ++processados,
          total: totalCpfs
        });

        io.emit("resultadoCPF", result);
      }, DELAY_MS);

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



// Reprocessar pendentes
app.post("/fgts/reprocessar", async (req, res) => {
  const cpfs = req.body.cpfs || [];
  if (!cpfs.length) return res.status(400).json({ message: "Nenhum CPF fornecido" });

  logPainel(`🔄 Reprocessar pendentes: ${cpfs.join(", ")}`);

  (async () => {
    try {
      let processados = 0;
      let contadorSuccess = 0;
      let contadorPending = 0;
      let contadorSemAutorizacao = 0;
      const totalCpfs = cpfs.length;

      // Função que processa cada CPF respeitando pausa
      const processarCPFComPausa = async (cpf) => {
        while(fgtsPaused) await new Promise(r => setTimeout(r, 200));

        const result = await processarCPFs(null, [cpf]); // processa 1 CPF
        if(result && result[0]) {
          const r = result[0];

          // Atualiza contadores
          switch ((r.status || "").toLowerCase()) {
            case "success": contadorSuccess++; break;
            case "pending": contadorPending++; break;
            case "error":
              if ((r.statusInfo || "").toLowerCase().includes("não possui autorização")) {
                contadorSemAutorizacao++;
              }
              break;
          }

          resultadosFGTS.push(r);
          emitirResultadoPainel(r);

          // Atualiza progresso
          processados++;
          io.emit("progress", {
            done: processados,
            total: totalCpfs,
            counters: {
              success: contadorSuccess,
              pending: contadorPending,
              semAutorizacao: contadorSemAutorizacao
            }
          });
        }
      };

      // Adiciona cada CPF na fila do PQueue
      cpfs.forEach(cpf => queue.add(() => processarCPFComPausa(cpf)));

      // Aguarda todas as tarefas terminarem
      await queue.onIdle();

      logPainel(`✅ Reprocessamento finalizado para ${cpfs.length} CPFs`);
    } catch (err) {
      logPainel(`❌ Erro no reprocessamento: ${err.message}`);
      console.error("❌ Erro no reprocessamento:", err);
    }
  })();

  res.json({ message: `✅ Reprocesso iniciado para ${cpfs.length} CPFs` });
});

// Mudar fase para não autorizados
app.post("/fgts/mudarFaseNaoAutorizados", async (req, res) => {
  const ids = req.body.ids || [];
  if (!ids.length) return res.status(400).json({ message: "Nenhum ID fornecido" });

  logPainel(`📌 Mudar fase no CRM para IDs: ${ids.join(", ")}`);

  (async () => {
    try {
      for (const id of ids) await disparaFluxo(id, 3);
      logPainel(`✅ Fase alterada para ${ids.length} registros`);
    } catch (err) {
      logPainel(`❌ Erro ao mudar fase: ${err.message}`);
      console.error("❌ Erro ao mudar fase:", err);
    }
  })();

  res.json({ message: `✅ Fase alterada para ${ids.length} registros` });
});

// Atualizar delay dinamicamente
app.post("/fgts/delay", (req, res) => {
  const novoDelay = parseInt(req.body?.delay, 10);
  if (isNaN(novoDelay) || novoDelay < 0) return res.status(400).json({ message: "Delay inválido" });

  DELAY_MS = novoDelay;
  setDelay(DELAY_MS);
  io.emit("delayUpdate", DELAY_MS);
  logPainel(`⏱️ Delay atualizado para ${DELAY_MS}ms`);
  res.json({ message: `Delay atualizado para ${DELAY_MS}ms` });
});

// Pausar / Retomar processamento FGTS
app.post("/fgts/pause", (req, res) => {
  fgtsPaused = true;
  logPainel("⏸️ Pausado pelo usuário");
  res.json({ message: "Processamento pausado" });
});

app.post("/fgts/resume", (req, res) => {
  fgtsPaused = false;
  logPainel("▶️ Retomado pelo usuário");
  res.json({ message: "Processamento retomado" });
});

// Nova rota de cálculo
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

// Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
