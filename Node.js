import express from "express";
import http from "http";
import { Server } from "socket.io";
import multer from "multer";
import bodyParser from "body-parser";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());

// Upload CSV
const upload = multer({ dest: 'uploads/' });

// Função simulada (substitua pela sua real)
async function disparaFluxo(id, stageId) {
  // Simula sucesso aleatório
  await new Promise(r => setTimeout(r, 200));
  return Math.random() > 0.2; // 80% de chance de sucesso
}

// ---------------- ROTAS -----------------

// Rota para processar CSV
app.post("/fgts/run", upload.single("csvfile"), async (req, res) => {
  io.emit("log", `[SERVER] CSV recebido: ${req.file.originalname}`);
  // Aqui você processaria o CSV e emitiria resultados via:
  // io.emit("result", { cpf, id, telefone, valorLiberado, status, motivo });
  res.json({ message: "CSV recebido e processamento iniciado" });
});

// Rota para reprocessar pendentes
app.post("/fgts/reprocessar", async (req, res) => {
  const { cpfs } = req.body;
  if (!cpfs || !Array.isArray(cpfs)) {
    return res.status(400).json({ message: "CPFs inválidos" });
  }

  io.emit("log", `[SERVER] Iniciando reprocessamento de ${cpfs.length} pendentes...`);

  const resultados = [];
  for (const cpf of cpfs) {
    // Aqui você chamaria sua lógica real de reprocessamento
    const ok = Math.random() > 0.2; 
    resultados.push({ cpf, sucesso: ok });
    io.emit("log", `[SERVER] ${ok ? "✅" : "❌"} CPF ${cpf} reprocessado`);
  }

  io.emit("log", `[SERVER] Finalizado reprocessamento dos pendentes`);
  res.json({ message: "Reprocessamento concluído", resultados });
});

// Rota para mudar fase dos "não autorizados" para fase 3
app.post("/fgts/mudarFaseNaoAutorizados", async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ message: "IDs inválidos" });
  }

  io.emit("log", `[SERVER] Iniciando mudança de fase para ${ids.length} não autorizados...`);

  const resultados = [];
  for (const id of ids) {
    const ok = await disparaFluxo(id, 3);
    resultados.push({ id, sucesso: ok });

    if (ok) {
      io.emit("log", `[SERVER] ✅ ID ${id} atualizado para fase 3 (sem autorização)`);
    } else {
      io.emit("log", `[SERVER] ❌ Falha ao atualizar ID ${id} para fase 3`);
    }
  }

  io.emit("log", `[SERVER] Finalizado processamento dos não autorizados`);
  res.json({ message: "Processo concluído", resultados });
});

// Servir front-end
app.use(express.static("public")); // coloque seu index.html e assets em /public

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
