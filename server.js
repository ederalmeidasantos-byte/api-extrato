import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { extrairDeUpload } from './extrair_pdf.js';
import { calcularTrocoEndpoint } from './calculo.js';
import RoteiroBancos from './roteiro-bancos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ===== ROTAS PRINCIPAIS (ANTES DOS ARQUIVOS ESTÁTICOS) =====

// Página inicial
app.get('/', (req, res) => {
  console.log('Acessando página inicial');
  res.sendFile(path.join(__dirname, 'projeto-render/frontend/index.html'));
});

// Simulador
app.get('/simulador', (req, res) => {
  console.log('Acessando simulador');
  const filePath = path.join(__dirname, 'projeto-render/frontend/simulador.html');
  console.log('Caminho do arquivo:', filePath);
  console.log('Arquivo existe:', fs.existsSync(filePath));
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.error('Arquivo simulador.html não encontrado!');
    res.status(404).send('Arquivo não encontrado');
  }
});

// Roteiros Bancos
app.get('/roteiros', (req, res) => {
  console.log('Acessando roteiros');
  const filePath = path.join(__dirname, 'projeto-render/frontend/roteiros-bancos.html');
  console.log('Caminho do arquivo:', filePath);
  console.log('Arquivo existe:', fs.existsSync(filePath));
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.error('Arquivo roteiros-bancos.html não encontrado!');
    res.status(404).send('Arquivo não encontrado');
  }
});

// Roteiros Bancos (alternativa)
app.get('/roteiros-bancos', (req, res) => {
  console.log('Acessando roteiros-bancos');
  const filePath = path.join(__dirname, 'projeto-render/frontend/roteiros-bancos.html');
  console.log('Caminho do arquivo:', filePath);
  console.log('Arquivo existe:', fs.existsSync(filePath));
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.error('Arquivo roteiros-bancos.html não encontrado!');
    res.status(404).send('Arquivo não encontrado');
  }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'projeto-render/frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração do Multer para upload de PDFs
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
    cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ===== API ENDPOINTS =====

// Upload e processamento de PDF
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Nenhum arquivo PDF enviado'
      });
    }

    console.log('Processando PDF:', req.file.filename);
    console.log('Caminho do arquivo:', req.file.path);
    console.log('Tamanho do arquivo:', req.file.size);
    
    // Usar fluxo completo com cache e pós-processamento
    const fileId = req.file.filename.split('-')[1]; // Extrai o ID único do nome do arquivo
    const jsonDir = path.join(__dirname, 'extratos'); // Diretório para salvar JSONs
    
    console.log('File ID extraído:', fileId);
    console.log('Diretório JSON:', jsonDir);
    console.log('Chamando extrairDeUpload...');
    
    const resultado = await extrairDeUpload({
      fileId: fileId,
      pdfPath: req.file.path,
      jsonDir: jsonDir,
      ttlMs: 14 * 24 * 60 * 60 * 1000 // 14 dias
    });
    
    console.log('Resultado recebido:', JSON.stringify(resultado, null, 2).substring(0, 500) + '...');

    res.json({
      status: 'success',
      message: 'PDF processado com sucesso',
      data: resultado,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Erro ao deletar arquivo:', err);
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Erro ao processar PDF',
      error: error.message
    });
  }
});

// Simulação de troco
app.post('/api/simular-troco', (req, res) => {
  try {
    const resultado = calcularTrocoEndpoint(req, res);
    return resultado;
  } catch (error) {
    console.error('Erro na simulação:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro na simulação',
      error: error.message
    });
  }
});

// Roteiros bancos
app.get('/api/roteiros-bancos', (req, res) => {
  res.json({
    status: 'success',
    data: RoteiroBancos,
    total: Object.keys(RoteiroBancos).length
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug - verificar estrutura de arquivos
app.get('/api/debug', (req, res) => {
  const frontendPath = path.join(__dirname, '../frontend');
  const files = fs.readdirSync(frontendPath);
  
  res.json({
    status: 'success',
    message: 'Debug info',
    __dirname: __dirname,
    frontendPath: frontendPath,
    files: files,
    simuladorExists: fs.existsSync(path.join(frontendPath, 'simulador.html')),
    roteirosExists: fs.existsSync(path.join(frontendPath, 'roteiros-bancos.html'))
  });
});

// Fallback para rotas não encontradas
app.get('*', (req, res) => {
  console.log('Rota não encontrada:', req.path);
  
  // Se for uma rota de API, retornar 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      status: 'error',
      message: 'API endpoint não encontrado',
      path: req.path
    });
  }
  
  // Para outras rotas, servir index.html
  res.sendFile(path.join(__dirname, 'projeto-render/frontend/index.html'));
});

// ===== INICIALIZAÇÃO =====

app.listen(PORT, () => {
  console.log('🚀 ===== SERVIDOR RENDER INICIADO =====');
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Diretório: ${__dirname}`);
  console.log('===============================================');
  console.log('');
  console.log('📋 Páginas disponíveis:');
  console.log(`   🏠 Página Inicial: http://localhost:${PORT}/`);
  console.log(`   🏛️ Simulador: http://localhost:${PORT}/simulador`);
  console.log(`   🏦 Roteiros: http://localhost:${PORT}/roteiros`);
  console.log('');
  console.log('🔗 APIs disponíveis:');
  console.log(`   📄 Upload PDF: POST http://localhost:${PORT}/api/upload-pdf`);
  console.log(`   🧮 Simular Troco: POST http://localhost:${PORT}/api/simular-troco`);
  console.log(`   🏦 Roteiros: GET http://localhost:${PORT}/api/roteiros-bancos`);
  console.log(`   ❤️ Health: GET http://localhost:${PORT}/api/health`);
  console.log('===============================================');
});

export default app;
