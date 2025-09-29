import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";

// Importar módulos FGTS
import { 
  processarCPFs, 
  setDelay, 
  setPause, 
  attachIO,
  isHorarioComercial,
  agendarDisparo,
  processarAgendamentos,
  ajustarDelayDinamico,
  processarReprocessamentoRapido,
  limparCacheV8
} from "./fgts_csv.js";

import { 
  carregarListas,
  adicionarResultadoLista,
  removerResultadoLista,
  limparLista,
  salvarPendentes,
  carregarPendentes,
  salvarTentativasCache,
  carregarTentativasCache,
  salvarEstadoProcessamento,
  carregarEstadoProcessamento
} from "./cache-persistente.js";

import { 
  logApiError, 
  logAuthError, 
  logCacheError, 
  logCrmError, 
  logSystemError 
} from "./error-logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== CONFIGURAÇÃO DO SERVIDOR ======
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname)));

// ====== CONFIGURAÇÃO MULTER ======
const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'), false);
    }
  }
});

// ====== SOCKET.IO ======
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Anexar Socket.IO ao módulo FGTS
attachIO(io);

// ====== ROTAS PRINCIPAIS ======

// Página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Painel FGTS
app.get('/fgts', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ====== API ENDPOINTS FGTS ======

// Upload e processamento de CSV
app.post('/fgts/run', upload.single('csvfile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo CSV enviado" });
    }

    console.log('📄 Processando CSV:', req.file.filename);
    
    // Processar CPFs
    await processarCPFs(req.file.path);
    
    res.json({ success: true, message: "Processamento iniciado" });
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reprocessar CPFs pendentes
app.post('/fgts/reprocessar', async (req, res) => {
  try {
    const { cpfs } = req.body;
    
    if (!cpfs || !Array.isArray(cpfs)) {
      return res.status(400).json({ error: "Lista de CPFs é obrigatória" });
    }

    console.log(`🔄 Reprocessando ${cpfs.length} CPFs pendentes`);
    
    await processarCPFs(null, cpfs);
    
    res.json({ success: true, message: `Reprocessamento de ${cpfs.length} CPFs iniciado` });
    
  } catch (error) {
    console.error('❌ Erro no reprocessamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pausar processamento
app.post('/fgts/pause', async (req, res) => {
  try {
    setPause(true);
    res.json({ success: true, message: "Processamento pausado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retomar processamento
app.post('/fgts/resume', async (req, res) => {
  try {
    setPause(false);
    res.json({ success: true, message: "Processamento retomado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar delay
app.post('/fgts/delay', async (req, res) => {
  try {
    const { delay } = req.body;
    
    if (!delay || isNaN(delay) || delay < 100) {
      return res.status(400).json({ error: "Delay inválido" });
    }

    setDelay(delay);
    res.json({ success: true, message: `Delay atualizado para ${delay}ms` });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mudar fase de não autorizados
app.post('/fgts/mudarFaseNaoAutorizados', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Lista de IDs é obrigatória" });
    }

    console.log(`📌 Mudando fase para ${ids.length} registros não autorizados`);
    
    // Aqui você implementaria a lógica para mudar fase no CRM
    // Por enquanto, apenas retorna sucesso
    
    res.json({ success: true, message: `Fase alterada para ${ids.length} registros` });
    
  } catch (error) {
    console.error('❌ Erro ao mudar fase:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== API DE CACHE E LOGS ======

// Carregar listas do cache
app.get('/fgts/listas', async (req, res) => {
  try {
    const listas = carregarListas();
    res.json({ success: true, listas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas do cache
app.get('/fgts/cache/estatisticas', async (req, res) => {
  try {
    const pendentes = carregarPendentes();
    const tentativasCache = carregarTentativasCache();
    const estado = carregarEstadoProcessamento();
    
    const statistics = {
      pendentes: {
        total: pendentes.length,
        porStatus: pendentes.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {})
      },
      tentativasCache: {
        total: tentativasCache.size,
        distribuicao: Array.from(tentativasCache.values()).reduce((acc, v) => {
          acc[v] = (acc[v] || 0) + 1;
          return acc;
        }, {})
      },
      estado: estado || {}
    };
    
    res.json({ success: true, statistics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pendentes do cache
app.get('/fgts/cache/pendentes', async (req, res) => {
  try {
    const pendentes = carregarPendentes();
    res.json({ success: true, pendentes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Visualizar cache
app.get('/fgts/cache/visualizar', async (req, res) => {
  try {
    const cacheDir = path.join(__dirname, 'cache');
    const arquivos = {};
    let totalArquivos = 0;
    
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      totalArquivos = files.length;
      
      for (const arquivo of files) {
        const arquivoPath = path.join(cacheDir, arquivo);
        try {
          const stats = fs.statSync(arquivoPath);
          const conteudo = fs.readFileSync(arquivoPath, 'utf-8');
          const linhas = conteudo.split('\n').length;
          
          arquivos[arquivo] = {
            tamanho: stats.size,
            linhas: linhas,
            conteudo: JSON.parse(conteudo)
          };
        } catch (error) {
          arquivos[arquivo] = {
            erro: 'Erro ao ler arquivo',
            detalhes: error.message
          };
        }
      }
    }
    
    res.json({ 
      success: true, 
      cacheDir, 
      totalArquivos, 
      arquivos 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Limpar cache
app.post('/fgts/cache/limpar', async (req, res) => {
  try {
    // Limpar todas as listas
    limparLista('sucessos');
    limparLista('pendentes');
    limparLista('naoAutorizados');
    limparLista('descartados');
    limparLista('agendados');
    
    // Limpar pendentes e tentativas
    salvarPendentes([]);
    salvarTentativasCache(new Map());
    
    res.json({ success: true, message: "Cache limpo com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logs de erro
app.get('/fgts/logs/erros', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const logsDir = path.join(__dirname, 'logs');
    const errors = [];
    
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      
      for (const file of files.slice(-limit)) {
        const filePath = path.join(logsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        errors.push(...lines.slice(-limit));
      }
    }
    
    res.json({ success: true, errors: errors.slice(-limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas de logs
app.get('/fgts/logs/estatisticas', async (req, res) => {
  try {
    const logsDir = path.join(__dirname, 'logs');
    const statistics = {
      total: 0,
      recent: 0,
      byType: {},
      bySystem: {}
    };
    
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        statistics.total += lines.length;
        
        // Contar logs recentes (últimas 24h)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        for (const line of lines) {
          const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
          if (timestampMatch) {
            const timestamp = new Date(timestampMatch[1]).getTime();
            if (timestamp > oneDayAgo) {
              statistics.recent++;
            }
          }
          
          // Contar por tipo
          if (line.includes('API')) statistics.byType.API = (statistics.byType.API || 0) + 1;
          if (line.includes('AUTH')) statistics.byType.AUTH = (statistics.byType.AUTH || 0) + 1;
          if (line.includes('CACHE')) statistics.byType.CACHE = (statistics.byType.CACHE || 0) + 1;
          if (line.includes('CRM')) statistics.byType.CRM = (statistics.byType.CRM || 0) + 1;
          if (line.includes('SYSTEM')) statistics.byType.SYSTEM = (statistics.byType.SYSTEM || 0) + 1;
          
          // Contar por sistema
          if (line.includes('FGTS')) statistics.bySystem.FGTS = (statistics.bySystem.FGTS || 0) + 1;
          if (line.includes('V8')) statistics.bySystem.V8 = (statistics.bySystem.V8 || 0) + 1;
          if (line.includes('LUNAS')) statistics.bySystem.LUNAS = (statistics.bySystem.LUNAS || 0) + 1;
        }
      }
    }
    
    res.json({ success: true, statistics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Limpar logs antigos
app.post('/fgts/logs/limpar', async (req, res) => {
  try {
    const logsDir = path.join(__dirname, 'logs');
    
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        if (stats.mtime.getTime() < oneWeekAgo) {
          fs.unlinkSync(filePath);
        }
      }
    }
    
    res.json({ success: true, message: "Logs antigos removidos" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== HEALTH CHECK ======
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Painel FGTS funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// ====== INICIALIZAÇÃO ======
server.listen(PORT, () => {
  console.log('🚀 ===== PAINEL FGTS INICIADO =====');
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Diretório: ${__dirname}`);
  console.log('===============================================');
  console.log('');
  console.log('📋 Páginas disponíveis:');
  console.log(`   🏠 Página Inicial: http://localhost:${PORT}/`);
  console.log(`   📊 Painel FGTS: http://localhost:${PORT}/fgts`);
  console.log('');
  console.log('🔗 APIs disponíveis:');
  console.log(`   📄 Upload CSV: POST http://localhost:${PORT}/fgts/run`);
  console.log(`   🔄 Reprocessar: POST http://localhost:${PORT}/fgts/reprocessar`);
  console.log(`   ⏸️ Pausar: POST http://localhost:${PORT}/fgts/pause`);
  console.log(`   ▶️ Retomar: POST http://localhost:${PORT}/fgts/resume`);
  console.log(`   ⚡ Delay: POST http://localhost:${PORT}/fgts/delay`);
  console.log(`   📊 Cache: GET http://localhost:${PORT}/fgts/cache/estatisticas`);
  console.log(`   📋 Logs: GET http://localhost:${PORT}/fgts/logs/erros`);
  console.log(`   ❤️ Health: GET http://localhost:${PORT}/api/health`);
  console.log('===============================================');
});

export default app;
