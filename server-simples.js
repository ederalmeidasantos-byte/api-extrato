// Configurar dotenv PRIMEIRO, antes de qualquer import
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env imediatamente
const result = dotenv.config({ path: path.join(__dirname, '.env') });

if (result.error) {
  console.error('❌ Erro ao carregar .env:', result.error);
} else {
  console.log('✅ Arquivo .env carregado com sucesso');
}

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fsp from 'fs/promises';
import fetch from 'node-fetch';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/'); // Diretório temporário
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Servir arquivos estáticos
app.use('/operacional', express.static(path.join(__dirname, 'operacional')));
app.use('/fgts', express.static(path.join(__dirname, 'fgts')));
app.use('/inss', express.static('/var/www/html/inss'));

// ================== ROTAS PRINCIPAIS ==================

// Rota principal
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Lunas Digital funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rota para operacional
app.get('/operacional', (req, res) => {
  res.sendFile(path.join(__dirname, 'operacional', 'buscar-cliente.html'));
});

// Rota para FGTS
app.get('/fgts', (req, res) => {
  res.sendFile(path.join(__dirname, 'fgts', 'index.html'));
});

// Rota para INSS
app.get('/inss', (req, res) => {
  res.sendFile('/var/www/html/inss/simulador.html');
});

// Rota para simulador com ID
app.get('/simulador/:id', async (req, res) => {
  try {
    const simuladorPath = '/var/www/html/inss/simulador.html';
    if (!fs.existsSync(simuladorPath)) {
      return res.status(404).json({ error: "Simulador não encontrado" });
    }
    
    const extratoId = req.params.id;
    
    try {
      const jsonPath = path.join(__dirname, 'var/data/extratos', `extrato_${extratoId}.json`);
      
      if (fs.existsSync(jsonPath)) {
        console.log(`📋 Carregando dados para simulador ID: ${extratoId}`);
        const dados = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        
        let html = fs.readFileSync(simuladorPath, 'utf-8');
        
        const dadosScript = `
          <script>
            window.DADOS_PRE_CARREGADOS = ${JSON.stringify(dados)};
            window.EXTRATO_ID = '${extratoId}';
            console.log('📋 Dados pré-carregados:', window.DADOS_PRE_CARREGADOS);
          </script>
        `;
        
        html = html.replace('</head>', `${dadosScript}</head>`);
        
        res.send(html);
        return;
      } else {
        console.log(`⚠️ Arquivo não encontrado: ${jsonPath}`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados para simulador:', error);
    }
    
    res.sendFile(simuladorPath);
  } catch (error) {
    console.error('❌ Erro na rota /simulador:', error);
    res.status(500).json({ error: error.message });
  }
});

// ================== API ROTAS ==================

// API para extração via ID da Lunas (POST)
app.post("/extrair", async (req, res) => {
  try {
    console.log("🔍 [DEBUG] Body recebido:", req.body);
    console.log("🔍 [DEBUG] Content-Type:", req.get('Content-Type'));
    
    const fileId = req.body.fileId || req.query.fileId;
    if (!fileId) return res.status(400).json({ error: "fileId é obrigatório" });

    console.log("🚀 Baixando PDF da Lunas:", fileId);
    
    // Verificar se já existe cache
    const jsonPath = path.join(__dirname, 'var/data/extratos', `extrato_${fileId}.json`);
    if (fs.existsSync(jsonPath)) {
      console.log("♻️ Usando cache válido:", jsonPath);
      return res.json(JSON.parse(await fsp.readFile(jsonPath, "utf-8")));
    }

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

    const pdfPath = path.join(__dirname, 'var/data/extratos', `extrato_${fileId}.pdf`);
    await fsp.mkdir(path.dirname(pdfPath), { recursive: true });
    const buf = Buffer.from(await resp.arrayBuffer());
    await fsp.writeFile(pdfPath, buf);
    console.log("✅ PDF salvo em", pdfPath);

    // processa com GPT
    const { extrairDeUpload } = await import('./extrair_pdf.js');
    const resultado = await extrairDeUpload({
      fileId,
      pdfPath,
      jsonDir: path.join(__dirname, 'var/data/extratos'),
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
      idoportunidade: req.body.idoportunidade
    });

    console.log("✅ Extração concluída");
    
    // Adicionar link do simulador
    resultado.simulador_link = `https://lunasdigital.com.br/simulador/${fileId}`;
    
    res.json(resultado);

  } catch (error) {
    console.error("❌ Erro em /extrair:", error);
    res.status(500).json({ error: error.message });
  }
});

// API para processar extrato (upload)
app.post("/api/processar-extrato", upload.single('extrato'), async (req, res) => {
  try {
    console.log("📤 [UPLOAD] Recebendo extrato...");
    
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const { idoportunidade, cpf } = req.body;
    console.log("📤 [UPLOAD] Dados recebidos:", { idoportunidade, cpf });

    // Gerar ID único para o arquivo
    const fileId = Date.now().toString();
    const pdfPath = path.join(__dirname, 'var/data/extratos', `extrato_${fileId}.pdf`);
    
    // Garantir que o diretório existe
    await fsp.mkdir(path.dirname(pdfPath), { recursive: true });
    
    // Mover arquivo para o diretório correto
    await fsp.rename(req.file.path, pdfPath);
    console.log("📤 [UPLOAD] Arquivo salvo em:", pdfPath);

    // Processar com extrair_pdf.js
    const { extrairDeUpload } = await import('./extrair_pdf.js');
    const resultado = await extrairDeUpload({
      fileId,
      pdfPath,
      jsonDir: path.join(__dirname, 'var/data/extratos'),
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
      idoportunidade
    });

    console.log("✅ [UPLOAD] Processamento concluído");
    
    res.json({
      success: true,
      fileId: fileId,
      resultado: resultado
    });

  } catch (error) {
    console.error("❌ [UPLOAD] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// API para obter dados brutos do extrato
app.get("/extrato/:fileId/raw", async (req, res) => {
  try {
    const { fileId } = req.params;
    const jsonPath = path.join(__dirname, 'var/data/extratos', `extrato_${fileId}.json`);
    
    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({ error: "Extrato não encontrado" });
    }
    
    const dados = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
    res.json(dados);
    
  } catch (error) {
    console.error("❌ Erro em /extrato/:fileId/raw:", error);
    res.status(500).json({ error: error.message });
  }
});

// API para calcular troco usando calculo.js
app.get("/api/calcular/:fileId", async (req, res) => {
  try {
    const { calcularTrocoEndpoint } = await import('./calculo.js');
    const calcularEndpoint = calcularTrocoEndpoint(path.join(__dirname, 'var/data/extratos'));
    calcularEndpoint(req, res);
  } catch (error) {
    console.error("❌ Erro em /api/calcular:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de teste
app.post("/teste", (req, res) => {
  console.log("🔍 [TESTE] Body recebido:", req.body);
  console.log("🔍 [TESTE] Headers:", req.headers);
  res.json({ received: req.body });
});

// ================== INICIAR SERVIDOR ==================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
});
