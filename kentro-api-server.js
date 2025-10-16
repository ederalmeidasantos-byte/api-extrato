import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Configurar SSL para compatibilidade
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: '/root/.env' });

const app = express();
const PORT = 3006; // Porta dedicada para API Kentro

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

console.log('🚀 [KENTRO-API] Servidor iniciado na porta', PORT);

// ================== API KENTRO ==================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'Kentro API Server',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API para baixar PDF da Kentro
app.post('/downloadFile', async (req, res) => {
  try {
    const { queueId, apiKey, fileId, download } = req.body;
    
    console.log('📥 [KENTRO-API] Baixando PDF:', { queueId, fileId, download });
    
    if (!fileId) {
      return res.status(400).json({ error: 'fileId é obrigatório' });
    }
    
    // Usar proxy externo para contornar problemas SSL
    const proxyUrl = 'http://72.60.159.149:3005/downloadFile';
    const formData = new URLSearchParams();
    formData.append('queueId', queueId || 25);
    formData.append('apiKey', apiKey || 'cd4d0509169d4e2ea9177ac66c1c9376');
    formData.append('fileId', fileId);
    formData.append('download', download || 'true');
    
    console.log('📥 [KENTRO-API] Baixando via proxy:', proxyUrl);
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Kentro API Server'
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
    }
    
    // Ler dados binários
    const pdfData = Buffer.from(await response.arrayBuffer());
    
    // Verificar se PDF é válido
    const pdfHeader = pdfData.toString('ascii', 0, 8);
    console.log('📄 [KENTRO-API] PDF Header:', pdfHeader);
    
    if (!pdfHeader.startsWith('%PDF-')) {
      console.error('❌ [KENTRO-API] PDF inválido!');
      return res.status(500).json({ error: 'PDF inválido recebido da Kentro' });
    }
    
    console.log('📥 [KENTRO-API] PDF baixado com sucesso - Tamanho:', pdfData.length, 'bytes');
    
    // Retornar PDF como binário
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfData.length);
    res.setHeader('Content-Disposition', `attachment; filename="extrato_${fileId}.pdf"`);
    res.send(pdfData);
    
  } catch (error) {
    console.error('❌ [KENTRO-API] Erro ao baixar PDF:', error);
    res.status(500).json({
      error: 'Erro ao baixar PDF da Kentro',
      details: error.message
    });
  }
});

// API para extrair dados do PDF
app.post('/extrair', async (req, res) => {
  try {
    const { fileId, idoportunidade } = req.body;
    
    console.log('📄 [KENTRO-API] Extraindo dados para fileId:', fileId);
    
    if (!fileId) {
      return res.status(400).json({ error: 'fileId é obrigatório' });
    }
    
    // Importar função de extração
    const { extrairDeUpload } = await import('./INSS/extrair_pdf.js');
    
    // Baixar PDF primeiro
    const pdfPath = `/tmp/extrato_${fileId}_${Date.now()}.pdf`;
    
    try {
      const proxyUrl = 'http://72.60.159.149:3005/downloadFile';
      const formData = new URLSearchParams();
      formData.append('queueId', 25);
      formData.append('apiKey', 'cd4d0509169d4e2ea9177ac66c1c9376');
      formData.append('fileId', fileId);
      formData.append('download', 'true');
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Kentro API Server'
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
      }
      
      const pdfData = Buffer.from(await response.arrayBuffer());
      
      // Verificar se PDF é válido
      const pdfHeader = pdfData.toString('ascii', 0, 8);
      if (!pdfHeader.startsWith('%PDF-')) {
        throw new Error('PDF inválido recebido da Kentro');
      }
      
      // Salvar PDF temporário
      await fsp.writeFile(pdfPath, pdfData);
      console.log('📥 [KENTRO-API] PDF salvo temporariamente:', pdfPath);
      
    } catch (downloadError) {
      console.error('❌ [KENTRO-API] Erro ao baixar PDF:', downloadError);
      return res.status(500).json({
        error: 'Erro ao baixar PDF da Kentro',
        details: downloadError.message
      });
    }
    
    // Extrair dados do PDF
    const resultado = await extrairDeUpload({
      fileId: fileId,
      pdfPath: pdfPath,
      jsonDir: '/tmp/extratos',
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
      idoportunidade: idoportunidade
    });
    
    // Limpar arquivo temporário
    try {
      await fsp.unlink(pdfPath);
    } catch (cleanupError) {
      console.warn('⚠️ [KENTRO-API] Erro ao limpar arquivo temporário:', cleanupError.message);
    }
    
    console.log('✅ [KENTRO-API] Extração concluída com sucesso');
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ [KENTRO-API] Erro ao extrair dados:', error);
    res.status(500).json({
      error: 'Erro ao extrair dados',
      details: error.message
    });
  }
});

// ================== INICIALIZAÇÃO ==================

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [KENTRO-API] Servidor rodando na porta ${PORT}`);
  console.log(`🌐 [KENTRO-API] Acesse: http://localhost:${PORT}/health`);
});

export default app;
