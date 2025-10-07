import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.INSS_PORT || 3003; // Porta específica para INSS

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configurar multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Importar funções do INSS
import { extrairDeUpload } from './extrair_pdf.js';
import { calcularTrocoEndpoint } from './calculo.js';

// ================== ROTAS INSS ==================

// Servir arquivos estáticos do INSS
app.use('/inss', express.static(path.join(__dirname)));

// Rota principal do simulador
app.get('/inss/simulador.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'simulador.html'));
});

// Rota para detalhes da proposta
app.get('/inss/detalhesdaproposta.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'detalhesdaproposta.html'));
});

// Rota para formulário de digitação
app.get('/inss/digitar-proposta.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'digitar-proposta.html'));
});

// ================== APIs INSS ==================

// API para processar extrato (upload de PDF)
app.post('/api/processar-extrato', upload.single('pdf'), async (req, res) => {
  try {
    console.log('📄 [INSS] Processando extrato...');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
    }

    const fileId = req.body.fileId || Date.now().toString();
    const idoportunidade = req.body.idoportunidade || null;
    
    console.log('📄 [INSS] FileId:', fileId);
    console.log('📄 [INSS] ID Oportunidade:', idoportunidade);

    // Processar PDF
    const jsonDir = path.join(__dirname, '..', 'var', 'data', 'extratos');
    const result = await extrairDeUpload({
      fileId,
      pdfPath: req.file.path,
      jsonDir,
      ttlMs: 14 * 24 * 60 * 60 * 1000, // 14 dias
      idoportunidade
    });

    console.log('✅ [INSS] Extrato processado com sucesso');
    res.json({
      success: true,
      fileId,
      data: result
    });

  } catch (error) {
    console.error('❌ [INSS] Erro ao processar extrato:', error);
    res.status(500).json({ 
      error: 'Erro ao processar extrato', 
      details: error.message 
    });
  }
});

// API para calcular simulação
app.get('/api/calcular/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('🧮 [INSS] Calculando simulação para fileId:', fileId);

    const jsonPath = path.join(__dirname, '..', 'var', 'data', 'extratos', `extrato_${fileId}.json`);
    
    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({ error: 'Extrato não encontrado' });
    }

    const extratoData = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
    const resultado = await calcularSimulacao(extratoData);

    console.log('✅ [INSS] Simulação calculada com sucesso');
    res.json({
      success: true,
      fileId,
      resultado
    });

  } catch (error) {
    console.error('❌ [INSS] Erro ao calcular simulação:', error);
    res.status(500).json({ 
      error: 'Erro ao calcular simulação', 
      details: error.message 
    });
  }
});

// API para obter extrato processado
app.get('/extrato/:fileId/raw', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('📄 [INSS] Obtendo extrato raw para fileId:', fileId);

    const jsonPath = path.join(__dirname, '..', 'var', 'data', 'extratos', `extrato_${fileId}.json`);
    
    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({ error: 'Extrato não encontrado' });
    }

    const extratoData = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
    
    console.log('✅ [INSS] Extrato obtido com sucesso');
    res.json(extratoData);

  } catch (error) {
    console.error('❌ [INSS] Erro ao obter extrato:', error);
    res.status(500).json({ 
      error: 'Erro ao obter extrato', 
      details: error.message 
    });
  }
});

// API para extrair dados (compatibilidade)
app.post('/extrair', async (req, res) => {
  try {
    const { fileId, idoportunidade } = req.body;
    console.log('📄 [INSS] Extraindo dados para fileId:', fileId);

    const jsonPath = path.join(__dirname, '..', 'var', 'data', 'extratos', `extrato_${fileId}.json`);
    
    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({ error: 'Extrato não encontrado' });
    }

    const extratoData = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
    
    console.log('✅ [INSS] Dados extraídos com sucesso');
    res.json(extratoData);

  } catch (error) {
    console.error('❌ [INSS] Erro ao extrair dados:', error);
    res.status(500).json({ 
      error: 'Erro ao extrair dados', 
      details: error.message 
    });
  }
});

// Rota para simulador com ID
app.get('/simulador/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'simulador.html'));
});

// ================== INICIALIZAÇÃO ==================

app.listen(PORT, () => {
  console.log(`🚀 [INSS] Servidor INSS rodando na porta ${PORT}`);
  console.log(`📁 [INSS] Diretório: ${__dirname}`);
  console.log(`🌐 [INSS] Acesse: http://localhost:${PORT}/inss/simulador.html`);
});

export default app;
