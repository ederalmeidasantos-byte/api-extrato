import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import multer from "multer";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import { calcularTrocoEndpoint } from "./calculo.js";
import { extrairDeUpload } from "./extrair_pdf.js";
import PQueue from "p-queue";

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
  limparCacheV8,
  registrarAtualizadorEstado
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

// ====== PERSISTENT DISK CONFIGURATION ======
const PERSISTENT_PATH = '/var/data';
const PERSISTENT_DIRS = {
  cache: `${PERSISTENT_PATH}/cache`,
  extratos: `${PERSISTENT_PATH}/extratos`,
  uploads: `${PERSISTENT_PATH}/uploads`,
  logs: `${PERSISTENT_PATH}/logs`,
  config: `${PERSISTENT_PATH}/config`
};

// ====== DIRETÓRIOS PERSISTENTES ======
// Usar Persistent Disk do Render para manter dados entre deploys
const PDF_DIR = PERSISTENT_DIRS.extratos;
const JSON_DIR = PERSISTENT_DIRS.extratos;
const UPLOADS_DIR = PERSISTENT_DIRS.uploads;
const LOGS_DIR = PERSISTENT_DIRS.logs;

// Criar diretórios persistentes se não existirem
async function ensurePersistentDirectories() {
  try {
    for (const [name, dirPath] of Object.entries(PERSISTENT_DIRS)) {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Diretório persistente criado: ${dirPath}`);
  } else {
        console.log(`📁 Diretório persistente já existe: ${dirPath}`);
      }
    }
    
    // Criar diretório de backups se não existir
    const backupDir = `${PERSISTENT_PATH}/backups`;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`✅ Diretório de backups criado: ${backupDir}`);
    }
  } catch (error) {
    console.error('❌ Erro ao criar diretórios persistentes:', error);
  }
}

// Sistema de backup automático
async function fazerBackup(arquivo, tipo = 'geral') {
  try {
    if (!fs.existsSync(arquivo)) {
      console.log(`⚠️ Arquivo não encontrado para backup: ${arquivo}`);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivo = path.basename(arquivo, path.extname(arquivo));
    const extensao = path.extname(arquivo);
    const backupDir = `${PERSISTENT_PATH}/backups`;
    const backupFile = `${backupDir}/${nomeArquivo}-${tipo}-${timestamp}${extensao}`;
    
    // Fazer backup
    await fsp.copyFile(arquivo, backupFile);
    console.log(`💾 Backup criado: ${backupFile}`);
    
    // Limpar backups antigos (manter apenas os 5 mais recentes)
    await limparBackupsAntigos(backupDir, nomeArquivo, tipo);
    
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error);
  }
}

// Limpar backups antigos (manter apenas os 5 mais recentes)
async function limparBackupsAntigos(backupDir, nomeArquivo, tipo) {
  try {
    const files = await fsp.readdir(backupDir);
    const backups = files
      .filter(file => file.startsWith(`${nomeArquivo}-${tipo}-`))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Mais recente primeiro
    
    // Manter apenas os 5 mais recentes
    if (backups.length > 5) {
      const paraRemover = backups.slice(5);
      for (const backup of paraRemover) {
        await fsp.unlink(backup.path);
        console.log(`🗑️ Backup antigo removido: ${backup.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao limpar backups antigos:', error);
  }
}

// ====== SISTEMA DE ESTADO PERSISTENTE FGTS ======

// Salvar estado completo do processamento FGTS
async function salvarEstadoFGTS(estado) {
  try {
    const estadoFile = path.join(PERSISTENT_DIRS.cache, 'estado-fgts-completo.json');
    
    // Fazer backup antes de salvar
    await fazerBackup(estadoFile, 'estado-fgts');
    
    // Salvar estado atualizado
    await fsp.writeFile(estadoFile, JSON.stringify(estado, null, 2));
    console.log(`💾 Estado FGTS salvo: ${estadoFile}`);
    
  } catch (error) {
    console.error('❌ Erro ao salvar estado FGTS:', error);
  }
}

// Carregar estado completo do processamento FGTS
async function carregarEstadoFGTS() {
  try {
    const estadoFile = path.join(PERSISTENT_DIRS.cache, 'estado-fgts-completo.json');
    
    if (fs.existsSync(estadoFile)) {
      const estado = JSON.parse(await fsp.readFile(estadoFile, 'utf-8'));
      console.log(`📂 Estado FGTS carregado: ${estadoFile}`);
      return estado;
    } else {
      console.log(`📂 Nenhum estado FGTS encontrado, iniciando novo`);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar estado FGTS:', error);
    return null;
  }
}

// Verificar se há processamento pendente ao iniciar
async function verificarProcessamentoPendente() {
  try {
    const estado = await carregarEstadoFGTS();
    
    if (estado && estado.processando) {
      console.log(`🔄 Processamento pendente encontrado!`);
      console.log(`📊 Estado: ${estado.processados}/${estado.total} processados`);
      console.log(`⏳ Pendentes: ${estado.pendentes?.length || 0}`);
      console.log(`🔄 Reprocessar: ${estado.reprocessar?.length || 0}`);
      
      // Restaurar estado nos módulos FGTS
      if (estado.pendentes?.length > 0) {
        await salvarPendentes(estado.pendentes);
        console.log(`✅ ${estado.pendentes.length} CPFs pendentes restaurados`);
      }
      
      if (estado.reprocessar?.length > 0) {
        // Salvar lista de reprocessar em arquivo separado
        const reprocessarFile = path.join(PERSISTENT_DIRS.cache, 'reprocessar-pendentes.json');
        await fsp.writeFile(reprocessarFile, JSON.stringify(estado.reprocessar, null, 2));
        console.log(`✅ ${estado.reprocessar.length} CPFs para reprocessar restaurados`);
      }
      
      return estado;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao verificar processamento pendente:', error);
    return null;
  }
}

// Continuar processamento de onde parou
async function continuarProcessamento() {
  try {
    const estado = await verificarProcessamentoPendente();
    
    if (estado) {
      console.log(`🚀 Continuando processamento de onde parou...`);
      
      // Se há CPFs para reprocessar, iniciar reprocessamento
      if (estado.reprocessar?.length > 0) {
        console.log(`🔄 Iniciando reprocessamento de ${estado.reprocessar.length} CPFs`);
        await processarCPFs(null, estado.reprocessar);
      }
      
      // Se há CPFs pendentes, continuar processamento normal
      if (estado.pendentes?.length > 0) {
        console.log(`⏳ Continuando processamento de ${estado.pendentes.length} CPFs pendentes`);
        // O processamento continuará automaticamente via cache-persistente.js
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao continuar processamento:', error);
  }
}

// Inicializar diretórios persistentes
ensurePersistentDirectories();

// Registrar função de atualização de estado no módulo FGTS
registrarAtualizadorEstado(salvarEstadoFGTS);

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

// ====== CONFIGURAÇÃO DO SERVIDOR ======
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Anexar Socket.IO ao módulo FGTS
attachIO(io);

// ====== Configuração Multer para upload de PDF ======
const upload = multer({
  dest: PDF_DIR,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  }
});

// ====== Configuração Multer para upload de CSV (FGTS) ======
const uploadCSV = multer({
  dest: UPLOADS_DIR,
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

// ====== SISTEMA DE CACHE DE CPFs ANEXADOS ======
const CPFS_CACHE_FILE = `${PERSISTENT_DIRS.cache}/cpfs-anexados.json`;

// Salvar lista de CPFs anexados
async function salvarCPFsAnexados(cpfs, metadata = {}) {
  try {
    const cacheData = {
      timestamp: new Date().toISOString(),
      totalCPFs: cpfs.length,
      metadata: {
        fileName: metadata.fileName || 'unknown',
        uploadTime: metadata.uploadTime || new Date().toISOString(),
        ...metadata
      },
      cpfs: cpfs.map((cpf, index) => ({
        id: `cpf_${index + 1}`,
        cpf: cpf.CPF || cpf.cpf || cpf,
        linha: index + 1,
        status: 'pendente',
        processado: false,
        resultado: null,
        tentativas: 0,
        ultimaTentativa: null
      }))
    };

    // Fazer backup antes de salvar
    if (fs.existsSync(CPFS_CACHE_FILE)) {
      await fazerBackup(CPFS_CACHE_FILE, 'cpfs');
    }

    await fsp.writeFile(CPFS_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Cache de CPFs salvo: ${cpfs.length} CPFs em ${CPFS_CACHE_FILE}`);
    
    return cacheData;
  } catch (error) {
    console.error('❌ Erro ao salvar cache de CPFs:', error);
    throw error;
  }
}

// Carregar lista de CPFs anexados
async function carregarCPFsAnexados() {
  try {
    if (!fs.existsSync(CPFS_CACHE_FILE)) {
      console.log('📋 Nenhum cache de CPFs encontrado');
      return null;
    }

    const data = JSON.parse(await fsp.readFile(CPFS_CACHE_FILE, 'utf-8'));
    console.log(`📋 Cache de CPFs carregado: ${data.totalCPFs} CPFs`);
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao carregar cache de CPFs:', error);
    return null;
  }
}

// Atualizar status de um CPF específico
async function atualizarStatusCPF(cpf, status, resultado = null) {
  try {
    const cacheData = await carregarCPFsAnexados();
    if (!cacheData) return false;

    const cpfIndex = cacheData.cpfs.findIndex(c => c.cpf === cpf);
    if (cpfIndex === -1) return false;

    cacheData.cpfs[cpfIndex].status = status;
    cacheData.cpfs[cpfIndex].resultado = resultado;
    cacheData.cpfs[cpfIndex].processado = true;
    cacheData.cpfs[cpfIndex].ultimaTentativa = new Date().toISOString();

    // Fazer backup antes de atualizar
    await fazerBackup(CPFS_CACHE_FILE, 'cpfs');

    await fsp.writeFile(CPFS_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`✅ Status atualizado para CPF ${cpf}: ${status}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar status do CPF:', error);
    return false;
  }
}

// Limpar cache de CPFs
async function limparCacheCPFs() {
  try {
    if (fs.existsSync(CPFS_CACHE_FILE)) {
      await fazerBackup(CPFS_CACHE_FILE, 'cpfs');
      await fsp.unlink(CPFS_CACHE_FILE);
      console.log('🗑️ Cache de CPFs limpo');
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar cache de CPFs:', error);
    return false;
  }
}

// Obter estatísticas do cache de CPFs
async function obterEstatisticasCPFs() {
  try {
    const cacheData = await carregarCPFsAnexados();
    if (!cacheData) {
      return {
        totalCPFs: 0,
        processados: 0,
        pendentes: 0,
        sucessos: 0,
        erros: 0,
        ultimaAtualizacao: null
      };
    }

    const stats = {
      totalCPFs: cacheData.totalCPFs,
      processados: cacheData.cpfs.filter(c => c.processado).length,
      pendentes: cacheData.cpfs.filter(c => c.status === 'pendente').length,
      sucessos: cacheData.cpfs.filter(c => c.status === 'sucesso').length,
      erros: cacheData.cpfs.filter(c => c.status === 'erro').length,
      ultimaAtualizacao: cacheData.timestamp,
      metadata: cacheData.metadata
    };

    return stats;
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas de CPFs:', error);
    return null;
  }
}

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

    const jsonPath = path.join(PERSISTENT_DIRS.extratos, `extrato_${fileId}.json`);
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

    // Fazer backup do JSON processado
    const backupJsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);
    await fazerBackup(backupJsonPath, 'extrato');

    // Adicionar link único para o simulador
    json.simulador_link = `https://api-extrato-1.onrender.com/simulador?id=${fileId}`;
    
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

    // Adicionar link único para o simulador
    json.simulador_link = `https://api-extrato-1.onrender.com/simulador?id=${fileId}`;

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair/:fileId:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== Upload manual de PDF ======
app.post("/extrairpdf", upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado" });
    }

    const fileId = Date.now().toString(); // ID único baseado em timestamp
    const originalPath = req.file.path;
    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    
    // Renomear arquivo para padrão
    await fsp.rename(originalPath, pdfPath);
    console.log("📄 PDF upload salvo em", pdfPath);

    // Processar com fila
    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );

    // Adicionar link único para o simulador
    json.simulador_link = `https://api-extrato-1.onrender.com/simulador?id=${fileId}`;

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrairpdf:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== Calcular troco ======
app.post("/calcular/:fileId", calcularTrocoEndpoint(PERSISTENT_DIRS.extratos));

// ====== ROTAS FGTS ======

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
app.post('/fgts/run', uploadCSV.single('csvfile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo CSV enviado" });
    }

    console.log('📄 Processando CSV:', req.file.filename);
    
    // Ler CPFs do CSV
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const { parse } = await import('csv-parse/sync');
    const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });
    
    // Criar estado inicial completo
    const estadoInicial = {
      processando: true,
      iniciadoEm: new Date().toISOString(),
      arquivoOriginal: req.file.filename,
      total: registros.length,
      processados: 0,
      sucessos: 0,
      pendentes: registros.map((reg, i) => ({
        cpf: reg.CPF,
        linha: i + 1,
        id: reg.ID || `linha_${i + 1}`,
        tentativas: 0,
        ultimaTentativa: null,
        status: 'pendente'
      })),
      reprocessar: [],
      erros: [],
      ultimaAtualizacao: new Date().toISOString()
    };
    
    // Salvar estado inicial
    await salvarEstadoFGTS(estadoInicial);
    
    // Processar CPFs
    await processarCPFs(req.file.path);
    
    res.json({ 
      success: true, 
      message: "Processamento iniciado",
      total: registros.length,
      estado: "iniciado"
    });
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar agendamentos pendentes
app.get('/fgts/agendamentos', async (req, res) => {
  try {
    // Importar função para acessar agendamentos
    const { obterAgendamentos } = await import('./fgts_csv.js');
    const agendamentos = obterAgendamentos();
    
    res.json({
      success: true,
      agendamentos: agendamentos,
      total: agendamentos.length,
      proximoHorarioComercial: new Date().toLocaleString('pt-BR')
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar agendamentos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Testar agendamento
app.post('/fgts/testar-agendamento', async (req, res) => {
  try {
    const { opportunityId } = req.body;
    
    if (!opportunityId) {
      return res.status(400).json({ error: "opportunityId é obrigatório" });
    }
    
    // Importar função de agendamento
    const { agendarDisparo } = await import('./fgts_csv.js');
    agendarDisparo(opportunityId, 'teste');
    
    res.json({
      success: true,
      message: `Agendamento de teste criado para ID: ${opportunityId}`,
      proximoHorarioComercial: new Date().toLocaleString('pt-BR')
    });
    
  } catch (error) {
    console.error('❌ Erro ao testar agendamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar estado atual do processamento
app.get('/fgts/estado', async (req, res) => {
  try {
    const estado = await carregarEstadoFGTS();
    
    if (!estado) {
      return res.json({
        processando: false,
        message: "Nenhum processamento ativo"
      });
    }
    
    // Carregar dados atuais dos módulos FGTS
    const pendentes = await carregarPendentes();
    const listas = await carregarListas();
    
    const estadoAtualizado = {
      ...estado,
      pendentes: pendentes,
      sucessos: listas.sucessos?.length || 0,
      erros: listas.erros?.length || 0,
      naoAutorizados: listas.naoAutorizados?.length || 0,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    res.json(estadoAtualizado);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Continuar processamento de onde parou
app.post('/fgts/continuar', async (req, res) => {
  try {
    console.log('🚀 Tentando continuar processamento...');
    
    await continuarProcessamento();
    
    res.json({ 
      success: true, 
      message: "Processamento continuado" 
    });
    
  } catch (error) {
    console.error('❌ Erro ao continuar processamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Limpar estado de processamento
app.post('/fgts/limpar-estado', async (req, res) => {
  try {
    const estadoFile = path.join(PERSISTENT_DIRS.cache, 'estado-fgts-completo.json');
    const reprocessarFile = path.join(PERSISTENT_DIRS.cache, 'reprocessar-pendentes.json');
    
    // Fazer backup antes de limpar
    if (fs.existsSync(estadoFile)) {
      await fazerBackup(estadoFile, 'estado-fgts-limpeza');
      await fsp.unlink(estadoFile);
    }
    
    if (fs.existsSync(reprocessarFile)) {
      await fazerBackup(reprocessarFile, 'reprocessar-limpeza');
      await fsp.unlink(reprocessarFile);
    }
    
    // Limpar cache dos módulos FGTS
    await limparLista('sucessos');
    await limparLista('erros');
    await limparLista('naoAutorizados');
    await salvarPendentes([]);
    
    res.json({ 
      success: true, 
      message: "Estado de processamento limpo" 
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar estado:', error);
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

// ====== API DE CACHE E LOGS FGTS ======

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
    const cacheDir = PERSISTENT_DIRS.cache;
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

// ====== Arquivos estáticos ======
app.use("/static", express.static(path.join(__dirname, "projeto-render", "frontend")));

// ====== Simulador ======
app.get("/simulador", async (req, res) => {
  const simuladorPath = path.join(__dirname, "projeto-render", "frontend", "simulador.html");
  if (!fs.existsSync(simuladorPath)) {
    return res.status(404).json({ error: "Simulador não encontrado" });
  }
  
  // Verificar se há ID na URL
  const extratoId = req.query.id;
  
  if (extratoId) {
    try {
      // Carregar dados do extrato
      const jsonPath = path.join(PERSISTENT_DIRS.extratos, `extrato_${extratoId}.json`);
      
      if (fs.existsSync(jsonPath)) {
        console.log(`📋 Carregando dados para simulador ID: ${extratoId}`);
        const dados = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
        
        // Ler o HTML
        let html = await fsp.readFile(simuladorPath, 'utf-8');
        
        // Injetar dados no HTML
        const dadosScript = `
          <script>
            // Dados pré-carregados do servidor
            window.DADOS_PRE_CARREGADOS = ${JSON.stringify(dados)};
            window.EXTRATO_ID = '${extratoId}';
            console.log('📋 Dados pré-carregados:', window.DADOS_PRE_CARREGADOS);
          </script>
        `;
        
        // Inserir script antes do fechamento do head
        html = html.replace('</head>', `${dadosScript}</head>`);
        
        res.send(html);
        return;
      } else {
        console.log(`⚠️ Arquivo não encontrado: ${jsonPath}`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados para simulador:', error);
    }
  }
  
  // Servir HTML normal se não há ID ou erro
  res.sendFile(simuladorPath);
});

// ====== Raw JSON ======
app.get("/extrato/:fileId/raw", (req, res) => {
  const { fileId } = req.params;
  const jsonPath = path.join(PERSISTENT_DIRS.extratos, `extrato_${fileId}.json`);
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "Extrato não encontrado" });
  }
  res.sendFile(jsonPath);
});

// ====== PERSISTENT DISK ROUTES ======

// ====== CACHE ROUTES ======
app.post("/api/cache/save", async (req, res) => {
  try {
    const { fileName, data } = req.body;
    if (!fileName || !data) {
      return res.status(400).json({ error: "fileName e data são obrigatórios" });
    }
    
    const filePath = `${PERSISTENT_DIRS.cache}/${fileName}`;
    await fsp.writeFile(filePath, JSON.stringify(data, null, 2));
    
    console.log(`💾 Cache salvo: ${filePath}`);
    res.json({ success: true, path: filePath, fileName });
  } catch (error) {
    console.error("❌ Erro ao salvar cache:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/cache/load/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = `${PERSISTENT_DIRS.cache}/${fileName}`;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Cache não encontrado" });
    }
    
    const data = await fsp.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("❌ Erro ao carregar cache:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/cache/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.cache);
    const fileList = files.map(file => ({
      name: file,
      path: `${PERSISTENT_DIRS.cache}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.cache}/${file}`).size
    }));
    res.json({ files: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar cache:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== EXTRATOS ROUTES ======
app.post("/api/extratos/save", async (req, res) => {
  try {
    const { id, extratoData } = req.body;
    if (!id || !extratoData) {
      return res.status(400).json({ error: "id e extratoData são obrigatórios" });
    }
    
    const fileName = `extrato_${id}.json`;
    const filePath = `${PERSISTENT_DIRS.extratos}/${fileName}`;
    
    await fsp.writeFile(filePath, JSON.stringify(extratoData, null, 2));
    
    console.log(`📄 Extrato salvo: ${filePath}`);
    res.json({ success: true, fileName, path: filePath, id });
  } catch (error) {
    console.error("❌ Erro ao salvar extrato:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/extratos/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const fileName = `extrato_${id}.json`;
    const filePath = `${PERSISTENT_DIRS.extratos}/${fileName}`;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Extrato não encontrado" });
    }
    
    const data = await fsp.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("❌ Erro ao carregar extrato:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/extratos/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.extratos);
    const fileList = files.map(file => ({
      name: file,
      id: file.replace('extrato_', '').replace('.json', ''),
      path: `${PERSISTENT_DIRS.extratos}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.extratos}/${file}`).size,
      modified: fs.statSync(`${PERSISTENT_DIRS.extratos}/${file}`).mtime
    }));
    res.json({ extratos: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar extratos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== UPLOADS ROUTES ======
app.post("/api/uploads/save", async (req, res) => {
  try {
    const { fileName, content, type = 'text' } = req.body;
    if (!fileName || !content) {
      return res.status(400).json({ error: "fileName e content são obrigatórios" });
    }
    
    const filePath = `${PERSISTENT_DIRS.uploads}/${fileName}`;
    
    // Determinar como salvar baseado no tipo
    if (type === 'json') {
      await fsp.writeFile(filePath, JSON.stringify(content, null, 2));
    } else if (type === 'csv') {
      await fsp.writeFile(filePath, content);
    } else {
      await fsp.writeFile(filePath, content);
    }
    
    console.log(`📁 Upload salvo: ${filePath}`);
    res.json({ success: true, path: filePath, fileName, type });
  } catch (error) {
    console.error("❌ Erro ao salvar upload:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/uploads/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.uploads);
    const fileList = files.map(file => ({
      name: file,
      path: `${PERSISTENT_DIRS.uploads}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.uploads}/${file}`).size,
      modified: fs.statSync(`${PERSISTENT_DIRS.uploads}/${file}`).mtime
    }));
    res.json({ files: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar uploads:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== LOGS ROUTES ======
app.post("/api/logs/save", async (req, res) => {
  try {
    const { fileName, logData } = req.body;
    if (!fileName || !logData) {
      return res.status(400).json({ error: "fileName e logData são obrigatórios" });
    }
    
    const filePath = `${PERSISTENT_DIRS.logs}/${fileName}`;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${JSON.stringify(logData)}\n`;
    
    await fsp.appendFile(filePath, logEntry);
    
    console.log(`📝 Log salvo: ${filePath}`);
    res.json({ success: true, path: filePath, fileName, timestamp });
  } catch (error) {
    console.error("❌ Erro ao salvar log:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/logs/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.logs);
    const fileList = files.map(file => ({
      name: file,
      path: `${PERSISTENT_DIRS.logs}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.logs}/${file}`).size,
      modified: fs.statSync(`${PERSISTENT_DIRS.logs}/${file}`).mtime
    }));
    res.json({ logs: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== CONFIG ROUTES ======
app.post("/api/config/save", async (req, res) => {
  try {
    const { fileName, configData } = req.body;
    if (!fileName || !configData) {
      return res.status(400).json({ error: "fileName e configData são obrigatórios" });
    }
    
    const filePath = `${PERSISTENT_DIRS.config}/${fileName}`;
    await fsp.writeFile(filePath, JSON.stringify(configData, null, 2));
    
    console.log(`⚙️ Config salva: ${filePath}`);
    res.json({ success: true, path: filePath, fileName });
  } catch (error) {
    console.error("❌ Erro ao salvar config:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/config/load/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = `${PERSISTENT_DIRS.config}/${fileName}`;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Config não encontrada" });
    }
    
    const data = await fsp.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("❌ Erro ao carregar config:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/config/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.config);
    const fileList = files.map(file => ({
      name: file,
      path: `${PERSISTENT_DIRS.config}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.config}/${file}`).size,
      modified: fs.statSync(`${PERSISTENT_DIRS.config}/${file}`).mtime
    }));
    res.json({ configs: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar configs:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== TEST ROUTES ======
app.get("/api/test/persistent-disk", async (req, res) => {
  try {
    const testData = {
      timestamp: new Date().toISOString(),
      message: "Teste do Persistent Disk",
      directories: PERSISTENT_DIRS,
      status: "OK"
    };
    
    // Testar salvamento em cada diretório
    const results = {};
    
    for (const [name, dirPath] of Object.entries(PERSISTENT_DIRS)) {
      const testFile = `${dirPath}/test_${Date.now()}.json`;
      await fsp.writeFile(testFile, JSON.stringify(testData, null, 2));
      results[name] = { success: true, path: testFile };
    }
    
    res.json({
      success: true,
      message: "Persistent Disk funcionando corretamente!",
      testResults: results,
      persistentPath: PERSISTENT_PATH
    });
  } catch (error) {
    console.error("❌ Erro no teste do Persistent Disk:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/status/persistent-disk", async (req, res) => {
  try {
    const status = {};
    
    for (const [name, dirPath] of Object.entries(PERSISTENT_DIRS)) {
      const exists = fs.existsSync(dirPath);
      let fileCount = 0;
      let totalSize = 0;
      
      if (exists) {
        const files = await fsp.readdir(dirPath);
        fileCount = files.length;
        for (const file of files) {
          const stat = fs.statSync(`${dirPath}/${file}`);
          totalSize += stat.size;
        }
      }
      
      status[name] = {
        exists,
        path: dirPath,
        fileCount,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
      };
    }
    
  res.json({
      persistentPath: PERSISTENT_PATH,
      directories: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Erro ao verificar status:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== Health Check ======
app.get("/api/health", (req, res) => {
  res.json({
    status: 'success',
    message: 'API funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    services: {
      pdf: 'ativo',
      fgts: 'ativo',
      simulador: 'ativo',
      cache: 'ativo'
    }
  });
});

// ====== Socket.IO Events ======
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// ====== Start ======
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log('🚀 ===== SERVIDOR PRINCIPAL INICIADO =====');
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Diretório: ${__dirname}`);
  console.log('===============================================');
  console.log('');
  console.log('📋 Páginas disponíveis:');
  console.log(`   🏠 Página Inicial: http://localhost:${PORT}/`);
  console.log(`   📊 Painel FGTS: http://localhost:${PORT}/fgts`);
  console.log(`   🏛️ Simulador: http://localhost:${PORT}/simulador`);
  console.log('');
  
  // ====== VERIFICAR PROCESSAMENTO PENDENTE ======
  console.log('🔍 Verificando processamento pendente...');
  try {
    await continuarProcessamento();
  } catch (error) {
    console.error('❌ Erro ao verificar processamento pendente:', error);
  }
  
  console.log('✅ Sistema de estado persistente ativo');
  console.log('===============================================');
  console.log('');
  console.log('🔗 APIs disponíveis:');
  console.log(`   📄 Upload PDF: POST http://localhost:${PORT}/extrairpdf`);
  console.log(`   📄 Upload CSV: POST http://localhost:${PORT}/fgts/run`);
  console.log(`   🔄 Reprocessar: POST http://localhost:${PORT}/fgts/reprocessar`);
  console.log(`   ⏸️ Pausar: POST http://localhost:${PORT}/fgts/pause`);
  console.log(`   ▶️ Retomar: POST http://localhost:${PORT}/fgts/resume`);
  console.log(`   ⚡ Delay: POST http://localhost:${PORT}/fgts/delay`);
  console.log(`   📊 Estado: GET http://localhost:${PORT}/fgts/estado`);
  console.log(`   🚀 Continuar: POST http://localhost:${PORT}/fgts/continuar`);
  console.log(`   🧹 Limpar: POST http://localhost:${PORT}/fgts/limpar-estado`);
  console.log(`   📊 Cache: GET http://localhost:${PORT}/fgts/cache/estatisticas`);
  console.log(`   📋 Logs: GET http://localhost:${PORT}/fgts/logs/erros`);
  console.log(`   ❤️ Health: GET http://localhost:${PORT}/api/health`);
  console.log('===============================================');
});
