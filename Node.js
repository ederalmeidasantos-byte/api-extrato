import express from "express";
import http from "http";
import { Server } from "socket.io";
import multer from "multer";
import bodyParser from "body-parser";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { processarCPFs } from "./processarCPFs.js"; // sua lógica atual separada

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());

// Upload CSV
const upload = multer({ dest: "uploads/" });

// ---------------- Controle de execução ----------------
let pausaExecucao = false;
let cancelarExecucao = false;

// Função para emitir progresso
function emitirProgresso(cpfIndex, total) {
  const porcentagem = Math.floor(((cpfIndex + 1) / total) * 100);
  io.emit("progresso", { porcentagem });
}

// ---------------- ROTAS -----------------

// Rota para processar CSV
app.post("/fgts/run", upload.single("csvfile"), async (req, res) => {
  pausaExecucao = false;
  cancelarExecucao = false;

  if (!req.file) {
    return res.status(400).json({ message: "Nenhum arquivo CSV enviado" });
  }

  io.emit("log", `[SERVER] CSV recebido: ${req.file.originalname}`);

  const csvContent = fs.readFileSync(req.file.path, "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });

  res.json({ message: "CSV recebido e processamento iniciado" });

  for (let index = 0; index < registros.length; index++) {
    // Pausa
    while (pausaExecucao) {
      await new Promise((r) => setTimeout(r, 500));
    }

    // Cancelar
    if (cancelarExecucao) {
      io.emit("log", `[SERVER] 🚫 Processamento cancelado no CPF ${registros[index].CPF}`);
      break;
    }

    const registro = registros[index];
    const cpf = registro.CPF;
    const telefone = registro.TELEFONE;

    try {
      await processarCPFs(null, [{ CPF: cpf, TELEFONE: telefone }], (resultado) => {
        io.emit("result", resultado);
      });
    } catch (err) {
      io.emit("log", `[SERVER] ❌ Erro ao processar CPF ${cpf}: ${err.message}`);
    }

    // Atualiza barra de progresso
    emitirProgresso(index, registros.length);
  }

  io.emit("log", `[SERVER] ✅ Processamento concluído`);
});

// Rota para pausar
app.post("/fgts/pause", (req, res) => {
  pausaExecucao = true;
  io.emit("log", `[SERVER] ⏸ Execução pausada`);
  res.json({ message: "Execução pausada" });
});

// Rota para retomar
app.post("/fgts/resume", (req, res) => {
  pausaExecucao = false;
  io.emit("log", `[SERVER] ▶ Execução retomada`);
  res.json({ message: "Execução retomada" });
});

// Rota para cancelar
app.post("/fgts/cancel", (req, res) => {
  cancelarExecucao = true;
  io.emit("log", `[SERVER] 🚫 Execução cancelada`);
  res.json({ message: "Execução cancelada" });
});

// Servir front-end
app.use(express.static("public")); // index.html + assets

// Socket.IO conectado
io.on("connection", (socket) => {
  console.log("Cliente conectado via Socket.IO");
  socket.emit("log", "[SERVER] Conexão estabelecida com o cliente");
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
