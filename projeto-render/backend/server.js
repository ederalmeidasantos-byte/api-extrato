const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { gptExtrairJSON } = require('./extrair-pdf');
const { calcularTrocoEndpoint } = require('./calculo');
const RoteiroBancos = require('./roteiro-bancos');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Servir arquivos estáticos do frontend
app.use('/static', express.static(path.join(__dirname, '../frontend')));

// Configuração do Multer para upload de PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
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

// ===== ROTAS =====

// Página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Simulador
app.get('/simulador', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/simulador.html'));
});

// Roteiros Bancos
app.get('/roteiros', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/roteiros-bancos.html'));
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
    
    // Processar PDF com GPT
    const resultado = await gptExtrairJSON(req.file.path);
    
    // Limpar arquivo temporário após processamento
    setTimeout(() => {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Erro ao deletar arquivo:', err);
      });
    }, 5000);

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

// Fallback para SPA - todas as rotas não-API servem o index.html
app.get('*', (req, res) => {
  // Se for uma rota de API, retornar 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      status: 'error',
      message: 'API endpoint não encontrado',
      path: req.path
    });
  }
  
  // Para outras rotas, tentar servir o arquivo específico ou index.html
  const filePath = path.join(__dirname, '../frontend', req.path === '/' ? 'index.html' : req.path + '.html');
  
  // Verificar se o arquivo existe
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Fallback para index.html (SPA)
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
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

module.exports = app;
