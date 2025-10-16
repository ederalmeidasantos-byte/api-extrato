import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { extrairDeUpload } from './INSS/extrair_pdf.js';
import { calcularTrocoEndpoint } from './INSS/calculo.js';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = 3004; // Porta dedicada para API de extração e cálculo

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'INSS API - Extração e Cálculo',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API para extrair dados do PDF
app.post('/extrair', async (req, res) => {
  try {
    console.log('📄 [API-EXTRAIR] Requisição recebida:', req.body);
    
    const { fileId, idoportunidade } = req.body;
    console.log('📄 [API-EXTRAIR] Extraindo dados para fileId:', fileId);

    const pdfPath = path.join('/tmp', `extrato_${fileId}_${Date.now()}.pdf`);
    const jsonDir = '/tmp';

    // Baixar PDF da API da Kentro via proxy
    console.log('📥 [API-EXTRAIR] Baixando PDF da API da Kentro via proxy...');
    const proxyUrl = 'http://72.60.159.149:3005/downloadFile';
    const formData = new URLSearchParams();
    formData.append('queueId', process.env.LUNAS_QUEUE_ID || 25);
    formData.append('apiKey', process.env.LUNAS_API_KEY || 'cd4d0509169d4e2ea9177ac66c1c9376');
    formData.append('fileId', fileId);
    formData.append('download', 'true');
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'INSS API Server'
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
    }
    
    const pdfData = Buffer.from(await response.arrayBuffer());
    await fsp.writeFile(pdfPath, pdfData);
    console.log('📥 [API-EXTRAIR] PDF salvo temporariamente:', pdfPath);

    console.log('🚀 [API-EXTRAIR] Iniciando extração de upload:', fileId);
    const resultado = await extrairDeUpload({
      fileId: fileId,
      pdfPath: pdfPath,
      jsonDir: jsonDir,
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
      idoportunidade: idoportunidade
    });

    // Limpar arquivo temporário
    fs.unlinkSync(pdfPath);

    // Adicionar link do simulador e kentroId na resposta
    const simuladorLink = `https://inss.lunasdigital.com.br/inss/simulador.html?extrato=${fileId}`;
    const responseWithLink = {
      ...resultado,
      simulador_link: simuladorLink,
      kentroId: fileId
    };

    console.log('✅ [API-EXTRAIR] Extração concluída com sucesso');
    console.log('🔗 [API-EXTRAIR] Link do simulador:', simuladorLink);
    res.json(responseWithLink);

  } catch (error) {
    console.error('❌ [API-EXTRAIR] Erro ao extrair dados:', error);
    res.status(500).json({
      error: 'Erro ao extrair dados',
      details: error.message,
      type: error.constructor.name,
      fileId: req.body?.fileId || 'não informado'
    });
  }
});

// API para calcular proposta
app.post('/calcular', async (req, res) => {
  try {
    console.log('🧮 [API-CALCULO] Requisição recebida:', req.body);
    
    const { extrato, proposta } = req.body;
    
    if (!extrato || !proposta) {
      return res.status(400).json({
        error: 'Dados obrigatórios ausentes',
        details: 'extrato e proposta são obrigatórios'
      });
    }

    console.log('🧮 [API-CALCULO] Calculando proposta...');
    const resultado = await calcularTrocoEndpoint(extrato, proposta);

    console.log('✅ [API-CALCULO] Cálculo concluído com sucesso');
    res.json(resultado);

  } catch (error) {
    console.error('❌ [API-CALCULO] Erro ao calcular proposta:', error);
    res.status(500).json({
      error: 'Erro ao calcular proposta',
      details: error.message,
      type: error.constructor.name
    });
  }
});

// API para obter extrato por ID (se já foi extraído)
app.get('/extrato/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('📄 [API-EXTRAIR] Buscando extrato para fileId:', fileId);

    const jsonPath = path.join('/app/var/data/extratos', `extrato_${fileId}.json`);

    if (fs.existsSync(jsonPath)) {
      const extratoData = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
      console.log('✅ [API-EXTRAIR] Extrato encontrado');
      res.json(extratoData);
    } else {
      res.status(404).json({
        error: 'Extrato não encontrado',
        fileId: fileId
      });
    }

  } catch (error) {
    console.error('❌ [API-EXTRAIR] Erro ao buscar extrato:', error);
    res.status(500).json({
      error: 'Erro ao buscar extrato',
      details: error.message,
      fileId: req.params.fileId
    });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [API-EXTRAIR] Servidor iniciado na porta ${PORT}`);
  console.log(`🌐 [API-EXTRAIR] Acesse: http://localhost:${PORT}/health`);
  console.log(`📄 [API-EXTRAIR] Endpoint extrair: http://localhost:${PORT}/extrair`);
  console.log(`🧮 [API-EXTRAIR] Endpoint calcular: http://localhost:${PORT}/calcular`);
});
