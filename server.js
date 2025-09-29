import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import multer from "multer";
import { calcularTrocoEndpoint } from "./calculo.js";
import { extrairDeUpload } from "./extrair_pdf.js";
import PQueue from "p-queue";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// pastas
const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "jsonDir");
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR, { recursive: true });

// ====== PERSISTENT DISK CONFIGURATION ======
const PERSISTENT_PATH = '/var/data';
const PERSISTENT_DIRS = {
  cache: `${PERSISTENT_PATH}/cache`,
  extratos: `${PERSISTENT_PATH}/extratos`,
  uploads: `${PERSISTENT_PATH}/uploads`,
  logs: `${PERSISTENT_PATH}/logs`,
  config: `${PERSISTENT_PATH}/config`
};

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
  } catch (error) {
    console.error('❌ Erro ao criar diretórios persistentes:', error);
  }
}

// Inicializar diretórios persistentes
ensurePersistentDirectories();

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

// ====== Fila: até 2 jobs em paralelo, 2 por segundo ======
const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 2 });

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

    // processa com fila
    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );

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
app.post("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

// ====== Arquivos estáticos ======
app.use("/static", express.static(path.join(__dirname, "projeto-render", "frontend")));

// ====== Simulador ======
app.get("/simulador", (req, res) => {
  const simuladorPath = path.join(__dirname, "projeto-render", "frontend", "simulador.html");
  if (!fs.existsSync(simuladorPath)) {
    return res.status(404).json({ error: "Simulador não encontrado" });
  }
  res.sendFile(simuladorPath);
});

// ====== Raw JSON ======
app.get("/extrato/:fileId/raw", (req, res) => {
  const { fileId } = req.params;
  const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);
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

// ====== Start ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
