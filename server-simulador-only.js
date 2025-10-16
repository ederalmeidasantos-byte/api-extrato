import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir arquivos estáticos do simulador
app.use('/inss', express.static(path.join(__dirname)));

// Rota principal do simulador
app.get('/inss/simulador.html', (req, res) => {
  const simuladorPath = path.join(__dirname, 'simulador.html');
  res.sendFile(simuladorPath);
});

// Rota para outros arquivos HTML do simulador
app.get('/inss/*.html', (req, res) => {
  const fileName = req.params[0] + '.html';
  const filePath = path.join(__dirname, fileName);
  res.sendFile(filePath);
});

// Rota para arquivos JS do simulador
app.get('/inss/*.js', (req, res) => {
  const fileName = req.params[0] + '.js';
  const filePath = path.join(__dirname, fileName);
  res.sendFile(filePath);
});

// Rota para arquivos CSS
app.get('/inss/*.css', (req, res) => {
  const fileName = req.params[0] + '.css';
  const filePath = path.join(__dirname, fileName);
  res.sendFile(filePath);
});

// Rota para arquivos JSON
app.get('/inss/*.json', (req, res) => {
  const fileName = req.params[0] + '.json';
  const filePath = path.join(__dirname, fileName);
  res.sendFile(filePath);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'INSS Simulador',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Rota raiz - redirecionar para o simulador
app.get('/', (req, res) => {
  res.redirect('/inss/simulador.html');
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [SIMULADOR] Servidor iniciado na porta ${PORT}`);
  console.log(`🌐 [SIMULADOR] Acesse: http://localhost:${PORT}/inss/simulador.html`);
  console.log(`📁 [SIMULADOR] Diretório: ${__dirname}`);
});
