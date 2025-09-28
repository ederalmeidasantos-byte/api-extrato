import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(__dirname));

// ====== Socket.IO ======
const server = http.createServer(app);
const io = new Server(server);

// Conexão Socket
io.on("connection", (socket) => {
  console.log("🔗 Cliente conectado para teste");
  socket.emit("log", "🧪 Conectado ao servidor de teste");
});

// Health check
app.get("/", (req, res) => res.send("🧪 Servidor de Teste - Menu FGTS ✅"));

// Página principal de teste
app.get("/teste-menu", (req, res) => res.sendFile(path.join(__dirname, "index-teste.html")));

// Página de teste completa (exemplo com menu)
app.get("/teste-completo", (req, res) => res.sendFile(path.join(__dirname, "exemplo-pagina-com-menu.html")));

// Exemplo do menu global
app.get("/exemplo-menu-global", (req, res) => res.sendFile(path.join(__dirname, "exemplo-menu-global.html")));

// Página sem menu (teste do sistema global)
app.get("/pagina-sem-menu", (req, res) => res.sendFile(path.join(__dirname, "pagina-sem-menu.html")));

// Páginas de navegação
app.get("/pagina-fgts", (req, res) => res.sendFile(path.join(__dirname, "pagina-fgts.html")));
app.get("/pagina-dashboard", (req, res) => res.sendFile(path.join(__dirname, "pagina-dashboard.html")));
app.get("/pagina-configuracoes", (req, res) => res.sendFile(path.join(__dirname, "pagina-configuracoes.html")));
app.get("/pagina-logs", (req, res) => res.sendFile(path.join(__dirname, "pagina-logs.html")));
app.get("/pagina-cache", (req, res) => res.sendFile(path.join(__dirname, "pagina-cache.html")));

// APIs de teste
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    timestamp: new Date().toISOString(),
    servidor: "teste-menu"
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    horarioInicio: "08:00",
    horarioFim: "22:00",
    delay: 1000,
    fusoHorario: "America/Sao_Paulo"
  });
});

app.get("/api/cache", (req, res) => {
  res.json({
    pendentes: 0,
    tentativasCache: 0,
    estado: {
      totalCPFs: 0,
      processados: 0,
      sucessos: 0,
      pendentes: 0
    }
  });
});

// Teste de Socket.IO
app.post("/api/teste-socket", (req, res) => {
  io.emit("teste", {
    mensagem: "Teste de Socket.IO",
    timestamp: new Date().toISOString(),
    dados: req.body
  });
  res.json({ success: true, message: "Mensagem enviada via Socket.IO" });
});

// ===== Servidor =====
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🧪 Servidor de Teste rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}/teste-menu`);
  console.log(`🔧 Página completa: http://localhost:${PORT}/teste-completo`);
});
