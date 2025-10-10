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
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Middleware de debug para JSON - REMOVIDO TEMPORARIAMENTE

// Servir arquivos estáticos
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/operacional', express.static(path.join(__dirname, 'operacional')));
app.use('/fgts', express.static(path.join(__dirname, 'fgts')));

// ================== MULTI-TENANT HELPERS & AUTH ==================

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getTenantDir(companyId) {
  const base = path.join(__dirname, 'var', 'data', 'tenants', companyId);
  ensureDir(base);
  return base;
}

function getTenantSubdir(companyId, sub) {
  const dir = path.join(getTenantDir(companyId), sub);
  ensureDir(dir);
  return dir;
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  try {
    const header = req.headers['authorization'] || req.headers['Authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }
    const token = header.substring('Bearer '.length);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded; // { companyId, userId, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
}

// Registro de empresa e admin
app.post('/api/auth/register-company', async (req, res) => {
  try {
    const { companyId, companyName, adminEmail, adminPassword } = req.body;
    if (!companyId || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, error: 'companyId, adminEmail e adminPassword são obrigatórios' });
    }
    const tenantDir = getTenantDir(companyId);
    const usersDir = getTenantSubdir(companyId, 'users');
    const companyFile = path.join(tenantDir, 'company.json');

    if (!fs.existsSync(companyFile)) {
      fs.writeFileSync(companyFile, JSON.stringify({ id: companyId, name: companyName || companyId, createdAt: new Date().toISOString() }, null, 2));
    }

    // Criar usuário admin
    const userId = 'admin';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const userFile = path.join(usersDir, `${userId}.json`);
    fs.writeFileSync(userFile, JSON.stringify({ id: userId, email: adminEmail, role: 'admin', passwordHash }, null, 2));

    const token = signToken({ companyId, userId, role: 'admin' });
    return res.json({ success: true, companyId, userId, token });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { companyId, email, password } = req.body;
    if (!companyId || !email || !password) {
      return res.status(400).json({ success: false, error: 'companyId, email e password são obrigatórios' });
    }
    const usersDir = getTenantSubdir(companyId, 'users');
    // Procurar usuário por email
    const files = fs.existsSync(usersDir) ? fs.readdirSync(usersDir).filter(f => f.endsWith('.json')) : [];
    let user = null;
    for (const f of files) {
      const u = JSON.parse(fs.readFileSync(path.join(usersDir, f), 'utf8'));
      if (u.email && u.email.toLowerCase() === email.toLowerCase()) { user = u; break; }
    }
    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Senha inválida' });
    }
    const token = signToken({ companyId, userId: user.id, role: user.role || 'seller' });
    return res.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Perfil
app.get('/api/auth/me', authMiddleware, (req, res) => {
  return res.json({ success: true, auth: req.auth });
});

// ================== ENDPOINTS MULTI-TENANT (NOVOS) ==================

// Clientes por empresa: /api/t/:companyId/clients
app.get('/api/t/:companyId/clients', (req, res) => {
  try {
    const { companyId } = req.params;
    const dir = getTenantSubdir(companyId, 'clientes');
    const arquivos = fs.readdirSync(dir).filter(a => a.endsWith('.json'));
    const clientes = arquivos.map(a => JSON.parse(fs.readFileSync(path.join(dir, a), 'utf8')));
    res.json({ success: true, clients: clientes, total: clientes.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/t/:companyId/clients', (req, res) => {
  try {
    const { companyId } = req.params;
    const dir = getTenantSubdir(companyId, 'clientes');
    const cliente = req.body.cliente || req.body.clientData || req.body;
    if (!cliente || !cliente.nome) {
      return res.status(400).json({ success: false, error: 'Cliente inválido' });
    }
    // Gerar ID sequencial por tenant
    const arquivos = fs.readdirSync(dir).filter(a => a.endsWith('.json'));
    const existingIds = new Set(arquivos.map(a => parseInt(path.basename(a, '.json'))).filter(n => !isNaN(n)));
    let nextId = 1; while (existingIds.has(nextId)) nextId++;
    cliente.id = cliente.id || nextId.toString();
    fs.writeFileSync(path.join(dir, `${cliente.id}.json`), JSON.stringify(cliente, null, 2));
    res.json({ success: true, cliente });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/t/:companyId/clients/:id', (req, res) => {
  try {
    const { companyId, id } = req.params;
    const dir = getTenantSubdir(companyId, 'clientes');
    const cliente = req.body.cliente || req.body;
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ ...cliente, id }, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/t/:companyId/clients/:id', (req, res) => {
  try {
    const { companyId, id } = req.params;
    const dir = getTenantSubdir(companyId, 'clientes');
    const p = path.join(dir, `${id}.json`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Propostas por empresa
app.post('/api/t/:companyId/propostas', (req, res) => {
  try {
    const { companyId } = req.params;
    const dir = getTenantSubdir(companyId, 'propostas');
    const proposta = req.body.proposta || req.body.dados || req.body;
    if (!proposta || typeof proposta !== 'object') {
      return res.status(400).json({ success: false, error: 'Proposta inválida' });
    }
    if (!proposta.id) {
      proposta.id = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    fs.writeFileSync(path.join(dir, `${proposta.id}.json`), JSON.stringify(proposta, null, 2));
    res.json({ success: true, proposta });
    } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Status-config por empresa
app.get('/api/t/:companyId/status-config', (req, res) => {
  try {
    const { companyId } = req.params;
    const cfgPath = path.join(getTenantDir(companyId), 'status-config.json');
    if (!fs.existsSync(cfgPath)) {
      // inicializa com o mesmo default global
      const defaultConfig = {
        statusFormulario: [
          { id: 'dados_pessoais', nome: 'Dados Pessoais', descricao: 'Etapa de coleta de dados pessoais', cor: '#3B82F6', editavel: false },
          { id: 'dados_bancarios', nome: 'Dados Bancários', descricao: 'Etapa de coleta de dados bancários', cor: '#10B981', editavel: false },
          { id: 'dados_beneficio', nome: 'Dados do Benefício', descricao: 'Etapa de coleta de dados do benefício', cor: '#F59E0B', editavel: false },
          { id: 'confirmacao', nome: 'Confirmação', descricao: 'Etapa de confirmação dos dados', cor: '#8B5CF6', editavel: false }
        ],
        produtos: [
          { id: 1, nome: 'Empréstimo Consignado', descricao: 'Empréstimo com desconto em folha', cor: '#3B82F6', origem: 'calculo', simuladorId: 'inss', editavel: true },
          { id: 2, nome: 'Portabilidade', descricao: 'Transferência de empréstimo entre bancos', cor: '#10B981', origem: 'calculo', simuladorId: 'inss', editavel: true }
        ],
        statusProposta: [ { id: 'digitando', nome: 'Digitando', cor: '#F59E0B', editavel: true } ]
      };
      fs.writeFileSync(cfgPath, JSON.stringify(defaultConfig, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/t/:companyId/status-config', (req, res) => {
  try {
    const { companyId } = req.params;
    const cfgPath = path.join(getTenantDir(companyId), 'status-config.json');
    if (!fs.existsSync(cfgPath)) return res.status(404).json({ success: false, error: 'Config não encontrada' });
    const current = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const { tipo, id, dados } = req.body;
    if (tipo === 'produto') {
      const i = current.produtos.findIndex(p => p.id === id);
      if (i !== -1) current.produtos[i] = { ...current.produtos[i], ...dados };
    } else if (tipo === 'proposta') {
      const i = current.statusProposta.findIndex(s => s.id === id);
      if (i !== -1) current.statusProposta[i] = { ...current.statusProposta[i], ...dados };
    } else if (tipo === 'formulario') {
      const i = current.statusFormulario.findIndex(s => s.id === id);
      if (i !== -1) current.statusFormulario[i] = { ...current.statusFormulario[i], ...dados };
    }
    fs.writeFileSync(cfgPath, JSON.stringify(current, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/t/:companyId/status-config', (req, res) => {
  try {
    const { companyId } = req.params; const { tipo, dados } = req.body;
    const cfgPath = path.join(getTenantDir(companyId), 'status-config.json');
    if (!fs.existsSync(cfgPath)) return res.status(404).json({ success: false, error: 'Config não encontrada' });
    const current = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    let novoId;
    if (tipo === 'produto') {
      novoId = Math.max(...current.produtos.map(p => p.id), 0) + 1;
      current.produtos.push({ id: novoId, ...dados });
    } else if (tipo === 'proposta') {
      novoId = `status_${Date.now()}`;
      current.statusProposta.push({ id: novoId, ...dados });
    } else if (tipo === 'formulario') {
      novoId = `form_${Date.now()}`;
      current.statusFormulario.push({ id: novoId, ...dados });
    }
    fs.writeFileSync(cfgPath, JSON.stringify(current, null, 2));
    res.json({ success: true, id: novoId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/t/:companyId/status-config', (req, res) => {
  try {
    const { companyId } = req.params; const { tipo, id } = req.body;
    const cfgPath = path.join(getTenantDir(companyId), 'status-config.json');
    if (!fs.existsSync(cfgPath)) return res.status(404).json({ success: false, error: 'Config não encontrada' });
    const current = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (tipo === 'produto') current.produtos = current.produtos.filter(p => p.id !== id);
    else if (tipo === 'proposta') current.statusProposta = current.statusProposta.filter(s => s.id !== id);
    else if (tipo === 'formulario') current.statusFormulario = current.statusFormulario.filter(s => s.id !== id);
    fs.writeFileSync(cfgPath, JSON.stringify(current, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Configuração do Multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'var/data/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ================== ROTAS PRINCIPAIS ==================

// Rota principal
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Lunas Digital funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      operacional: '/operacional',
      fgts: '/fgts',
      inss: '/inss',
      chatgpt: '/api/chatgpt-kentro'
    }
  });
});

// Teste simples para debug
app.post("/teste", (req, res) => {
  console.log("🔍 [TESTE] Body:", req.body);
  console.log("🔍 [TESTE] Headers:", req.headers);
  res.json({ received: req.body });
});


// ================== SISTEMA OPERACIONAL ==================

// Servir página principal do operacional
app.get('/operacional', (req, res) => {
  res.sendFile(path.join(__dirname, 'operacional', 'index.html'));
});

// ================== API OPERACIONAL ==================

// API para dados dos clientes (compatível com o frontend)
app.get('/api/clients', (req, res) => {
  try {
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    if (!fs.existsSync(clientesPath)) {
      fs.mkdirSync(clientesPath, { recursive: true });
    }
    
    const arquivos = fs.readdirSync(clientesPath).filter(arquivo => arquivo.endsWith('.json'));
    const clientes = arquivos.map(arquivo => {
      const dados = JSON.parse(fs.readFileSync(path.join(clientesPath, arquivo), 'utf8'));
      return dados;
    });
    
    res.json({ 
      success: true, 
      clients: clientes,
      total: clientes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para salvar cliente
app.post('/api/clients', (req, res) => {
  try {
    const { cliente } = req.body;
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    
    if (!fs.existsSync(clientesPath)) {
      fs.mkdirSync(clientesPath, { recursive: true });
    }
    
    const arquivoPath = path.join(clientesPath, `${cliente.id}.json`);
    fs.writeFileSync(arquivoPath, JSON.stringify(cliente, null, 2));
    
    res.json({
      success: true,
      message: 'Cliente salvo com sucesso',
      cliente
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para atualizar cliente
app.put('/api/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { cliente } = req.body;
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    
    const arquivoPath = path.join(clientesPath, `${id}.json`);
    fs.writeFileSync(arquivoPath, JSON.stringify(cliente, null, 2));
    
    res.json({
      success: true,
      message: 'Cliente atualizado com sucesso',
      cliente
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para deletar cliente
app.delete('/api/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    const arquivoPath = path.join(clientesPath, `${id}.json`);
    
    if (fs.existsSync(arquivoPath)) {
      fs.unlinkSync(arquivoPath);
    }
    
    res.json({
      success: true,
      message: 'Cliente deletado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para sincronizar clientes (compatibilidade com frontend)
app.get('/api/sincronizar-clientes', (req, res) => {
  try {
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    if (!fs.existsSync(clientesPath)) {
      fs.mkdirSync(clientesPath, { recursive: true });
    }
    
    const arquivos = fs.readdirSync(clientesPath).filter(arquivo => arquivo.endsWith('.json'));
    const clientes = arquivos.map(arquivo => {
      const dados = JSON.parse(fs.readFileSync(path.join(clientesPath, arquivo), 'utf8'));
      return dados;
    });
    
    res.json({
      success: true,
      clientes: clientes,  // Mudança: clientes em vez de clients
      total: clientes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para salvar cliente (compatibilidade com frontend)
app.post('/api/salvar-cliente', (req, res) => {
  try {
    console.log('📥 [API] Recebido POST /api/salvar-cliente');
    console.log('📥 [API] Headers:', req.headers);
    console.log('📥 [API] Body raw:', req.body);
    
    // Aceitar {cliente: ...}, {clientData: ...} ou dados diretos
    let cliente = req.body.cliente || req.body.clientData || req.body;
    
    if (!cliente || !cliente.nome) {
      return res.status(400).json({
        success: false,
        error: 'Cliente não fornecido ou dados inválidos'
      });
    }
    
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    
    if (!fs.existsSync(clientesPath)) {
      fs.mkdirSync(clientesPath, { recursive: true });
    }
    
    // Verificar se cliente já existe (por CPF ou NB) e gerar ID sequencial
    const arquivos = fs.readdirSync(clientesPath).filter(arquivo => arquivo.endsWith('.json'));
    const existingIds = new Set();
    let finalClientId = cliente.id;
    
    // Verificar se já existe cliente com este CPF ou NB
    for (const arquivo of arquivos) {
      try {
        const dados = JSON.parse(fs.readFileSync(path.join(clientesPath, arquivo), 'utf8'));
        
        // Coletar IDs existentes
        if (dados.id) {
          const id = parseInt(dados.id);
          if (!isNaN(id)) {
            existingIds.add(id);
          }
        }
        
        // Verificar se é o mesmo cliente (mesmo CPF ou NB)
        const existingCpf = dados.dadosCompletos?.cpf || dados.cpf;
        const existingNb = dados.dadosCompletos?.nb || dados.nb;
        const newCpf = cliente.cpf;
        const newNb = cliente.nb;
        
        // Validação melhorada: CPF (se ambos preenchidos) OU NB (se ambos preenchidos)
        const cpfMatch = existingCpf && newCpf && existingCpf.trim() !== '' && newCpf.trim() !== '' && existingCpf === newCpf;
        const nbMatch = existingNb && newNb && existingNb.toString().trim() !== '' && newNb.toString().trim() !== '' && existingNb.toString() === newNb.toString();
        
        if (cpfMatch || nbMatch) {
          console.log(`✅ Cliente já existe com ID ${dados.id} (CPF: ${cpfMatch ? 'match' : 'no'}, NB: ${nbMatch ? 'match' : 'no'}), atualizando...`);
          finalClientId = dados.id;
          break;
        }
      } catch (error) {
        console.warn(`Erro ao ler arquivo ${arquivo}:`, error.message);
      }
    }
    
    // Se não encontrou cliente existente, criar novo ID sequencial
    if (!finalClientId || finalClientId === cliente.id) {
      let nextId = 1;
      while (existingIds.has(nextId)) {
        nextId++;
      }
      finalClientId = nextId.toString();
      console.log(`🆔 Novo ClientID sequencial gerado: ${finalClientId} (total: ${arquivos.length + 1})`);
    }
    
    cliente.id = finalClientId;
    
    const arquivoPath = path.join(clientesPath, `${cliente.id}.json`);
    fs.writeFileSync(arquivoPath, JSON.stringify(cliente, null, 2));
    
    console.log('✅ [API] Cliente salvo com sucesso:', cliente.id);
    
    res.json({ 
      success: true, 
      message: 'Cliente salvo com sucesso',
      cliente,
      clientId: cliente.id,
      kentroId: cliente.kentroId || null,
      acao: 'criado'
    });
  } catch (error) {
    console.error('❌ Erro ao salvar cliente:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rota de teste para debug JSON
app.post('/api/teste-json', (req, res) => {
  try {
    console.log('🔍 [TESTE] Content-Type:', req.get('Content-Type'));
    console.log('🔍 [TESTE] Body raw:', req.body);
    console.log('🔍 [TESTE] Body type:', typeof req.body);
    res.json({ success: true, body: req.body });
  } catch (error) {
    console.error('❌ [TESTE] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para salvar proposta
app.post('/api/salvar-proposta', (req, res) => {
  try {
    console.log('📥 [API] Recebido POST /api/salvar-proposta');
    console.log('📥 [API] Headers:', req.headers);
    console.log('📥 [API] Body raw:', req.body);
    
    // Aceitar tanto {proposta: ...} quanto {propostaId: ..., dados: ...}
    let proposta = req.body.proposta || req.body.dados || req.body;
    const propostaId = req.body.propostaId || proposta.id;
    
    if (!proposta || typeof proposta !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Proposta não fornecida ou inválida'
      });
    }
    
    const propostasPath = path.join(__dirname, 'var/data/propostas');
    
    if (!fs.existsSync(propostasPath)) {
      fs.mkdirSync(propostasPath, { recursive: true });
    }
    
    // Usar ID fornecido ou gerar novo
    if (!proposta.id && propostaId) {
      proposta.id = propostaId;
    } else if (!proposta.id) {
      proposta.id = `proposta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const arquivoPath = path.join(propostasPath, `${proposta.id}.json`);
    fs.writeFileSync(arquivoPath, JSON.stringify(proposta, null, 2));
    
    console.log('✅ [API] Proposta salva com sucesso:', proposta.id);
    
    res.json({ 
      success: true, 
      message: 'Proposta salva com sucesso',
      proposta,
      propostaId: proposta.id
    });
  } catch (error) {
    console.error('❌ Erro ao salvar proposta:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para buscar cliente específico por ID (compatibilidade com CRM)
app.get('/api/cliente/:id', (req, res) => {
  try {
    const { id } = req.params;
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    const arquivoPath = path.join(clientesPath, `${id}.json`);
    
    if (!fs.existsSync(arquivoPath)) {
      return res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
    }
    
    const dados = JSON.parse(fs.readFileSync(arquivoPath, 'utf8'));
    
    res.json({
      success: true,
      cliente: dados
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// API para buscar cliente específico por ID
app.get('/api/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    const arquivoPath = path.join(clientesPath, `${id}.json`);
    
    if (!fs.existsSync(arquivoPath)) {
      return res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
    }
    
    const dados = JSON.parse(fs.readFileSync(arquivoPath, 'utf8'));
    
    res.json({
      success: true,
      cliente: dados
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para dados do operacional (compatibilidade)
app.get('/api/operacional/clientes', (req, res) => {
  try {
    const clientesPath = path.join(__dirname, 'var/data/clientes');
    if (!fs.existsSync(clientesPath)) {
      fs.mkdirSync(clientesPath, { recursive: true });
    }
    
    const arquivos = fs.readdirSync(clientesPath).filter(arquivo => arquivo.endsWith('.json'));
    const clientes = arquivos.map(arquivo => {
      const dados = JSON.parse(fs.readFileSync(path.join(clientesPath, arquivo), 'utf8'));
      return dados;
    });
    
    res.json({
      success: true,
      clientes,
      total: clientes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================== APIS DE CONFIGURAÇÃO ==================

// API para configurações de status
app.get('/api/status-config', (req, res) => {
  try {
    const statusConfig = {
      success: true,
      statusFormulario: [
        { id: 1, nome: 'Etapa 1 - Dados', codigo: 'etapa1', cor: '#3B82F6', ativo: true },
        { id: 2, nome: 'Etapa 2 - Endereço', codigo: 'etapa2', cor: '#10B981', ativo: true },
        { id: 3, nome: 'Etapa 3 - Benefício', codigo: 'etapa3', cor: '#F59E0B', ativo: true },
        { id: 4, nome: 'Etapa 4 - Bancário', codigo: 'etapa4', cor: '#EF4444', ativo: true },
        { id: 5, nome: 'Etapa 5 - Confirmação', codigo: 'etapa5', cor: '#8B5CF6', ativo: true },
        { id: 6, nome: 'Cliente Finalizou', codigo: 'finalizado', cor: '#6B7280', ativo: true }
      ],
      produtos: [
        { id: 1, nome: 'Empréstimo Consignado', codigo: 'emprestimo', ativo: true },
        { id: 2, nome: 'Portabilidade', codigo: 'portabilidade', ativo: true },
        { id: 3, nome: 'RMC', codigo: 'rmc', ativo: true },
        { id: 4, nome: 'RCC', codigo: 'rcc', ativo: true }
      ],
      statusProposta: [
        // Status básicos gerais
        { id: 1, nome: 'Pendente', codigo: 'pending', cor: '#F59E0B', ativo: true, categoria: 'geral' },
        { id: 2, nome: 'Em Análise', codigo: 'analise', cor: '#3B82F6', ativo: true, categoria: 'geral' },
        { id: 3, nome: 'Aprovada', codigo: 'aprovada', cor: '#10B981', ativo: true, categoria: 'geral' },
        { id: 4, nome: 'Rejeitada', codigo: 'rejeitada', cor: '#EF4444', ativo: true, categoria: 'geral' },
        { id: 5, nome: 'Finalizada', codigo: 'finalizada', cor: '#6B7280', ativo: true, categoria: 'geral' },
        
        // Status específicos de PORTABILIDADE COM TROCO (Fila 2)
        { id: 8, nome: 'Início', codigo: 'inicio', cor: '#3498db', ativo: true, categoria: 'portabilidade', ordem: 1 },
        { id: 9, nome: 'Oferta Troco', codigo: 'oferta_troco', cor: '#f39c12', ativo: true, categoria: 'portabilidade', ordem: 2 },
        { id: 10, nome: 'Digitando', codigo: 'digitando', cor: '#9b59b6', ativo: true, categoria: 'portabilidade', ordem: 3 },
        { id: 35, nome: 'Redigitar', codigo: 'redigitar', cor: '#e74c3c', ativo: true, categoria: 'portabilidade', ordem: 4 },
        { id: 11, nome: 'Aguardando Assinatura', codigo: 'aguardando_assinatura', cor: '#2ecc71', ativo: true, categoria: 'portabilidade', ordem: 5 },
        { id: 12, nome: 'Retenção', codigo: 'retencao', cor: '#34495e', ativo: true, categoria: 'portabilidade', ordem: 6 },
        { id: 36, nome: 'Aguardando Desbloqueio', codigo: 'aguardando_desbloqueio', cor: '#e67e22', ativo: true, categoria: 'portabilidade', ordem: 7 },
        { id: 13, nome: 'Aguardando Saldo CIP', codigo: 'aguardando_saldo_cip', cor: '#1abc9c', ativo: true, categoria: 'portabilidade', ordem: 8 },
        { id: 26, nome: 'Atuando Saldo', codigo: 'atuando_saldo', cor: '#16a085', ativo: true, categoria: 'portabilidade', ordem: 9 },
        { id: 14, nome: 'Aguardando Averbação', codigo: 'aguardando_averbacao', cor: '#27ae60', ativo: true, categoria: 'portabilidade', ordem: 10 },
        { id: 15, nome: 'Pago', codigo: 'pago', cor: '#2ecc71', ativo: true, categoria: 'portabilidade', ordem: 11, final: true },
        
        // Status específicos de FGTS (Fila 1)
        { id: 1, nome: 'Início FGTS', codigo: 'inicio_fgts', cor: '#3498db', ativo: true, categoria: 'fgts', ordem: 1 },
        { id: 3, nome: 'Não Autorizado', codigo: 'nao_autorizado', cor: '#e74c3c', ativo: true, categoria: 'fgts', ordem: 2, final: true },
        { id: 43, nome: 'Simulando FGTS', codigo: 'simulando_fgts', cor: '#9b59b6', ativo: true, categoria: 'fgts', ordem: 3 },
        { id: 4, nome: 'Valor Liberado', codigo: 'valor_liberado', cor: '#2ecc71', ativo: true, categoria: 'fgts', ordem: 4 },
        { id: 37, nome: 'Empregado CLT', codigo: 'empregado_clt', cor: '#f39c12', ativo: true, categoria: 'fgts', ordem: 5 },
        { id: 5, nome: 'Aguardando Assinatura FGTS', codigo: 'aguardando_assinatura_fgts', cor: '#2ecc71', ativo: true, categoria: 'fgts', ordem: 6 },
        { id: 6, nome: 'Proposta Paga', codigo: 'proposta_paga', cor: '#27ae60', ativo: true, categoria: 'fgts', ordem: 7, final: true },
        { id: 7, nome: 'Sem Saldo', codigo: 'sem_saldo', cor: '#e74c3c', ativo: true, categoria: 'fgts', ordem: 8, final: true },
        { id: 42, nome: 'Re-consultar', codigo: 're_consultar', cor: '#f39c12', ativo: true, categoria: 'fgts', ordem: 9 },
        { id: 44, nome: 'Aniversário', codigo: 'aniversario', cor: '#e67e22', ativo: true, categoria: 'fgts', ordem: 10 }
      ]
    };
    
    res.json(statusConfig);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para produtos
app.get('/api/produtos', (req, res) => {
  try {
    const produtos = [
      { id: 1, nome: 'Empréstimo Consignado', codigo: 'emprestimo', ativo: true, descricao: 'Empréstimo com desconto em folha' },
      { id: 2, nome: 'Portabilidade', codigo: 'portabilidade', ativo: true, descricao: 'Transferência de empréstimo entre bancos' },
      { id: 3, nome: 'RMC', codigo: 'rmc', ativo: true, descricao: 'Refinanciamento de cartão de crédito' },
      { id: 4, nome: 'RCC', codigo: 'rcc', ativo: true, descricao: 'Refinanciamento de cartão de crédito' }
    ];
    
    res.json({ 
      success: true, 
      produtos
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// API para status de proposta
app.get('/api/status-proposta', (req, res) => {
  try {
    const statusProposta = [
      // Status básicos gerais
      { id: 1, nome: 'Pendente', codigo: 'pending', cor: '#F59E0B', ativo: true, categoria: 'geral' },
      { id: 2, nome: 'Em Análise', codigo: 'analise', cor: '#3B82F6', ativo: true, categoria: 'geral' },
      { id: 3, nome: 'Aprovada', codigo: 'aprovada', cor: '#10B981', ativo: true, categoria: 'geral' },
      { id: 4, nome: 'Rejeitada', codigo: 'rejeitada', cor: '#EF4444', ativo: true, categoria: 'geral' },
      { id: 5, nome: 'Finalizada', codigo: 'finalizada', cor: '#6B7280', ativo: true, categoria: 'geral' },
      
      // Status específicos de PORTABILIDADE COM TROCO (Fila 2)
      { id: 8, nome: 'Início', codigo: 'inicio', cor: '#3498db', ativo: true, categoria: 'portabilidade', ordem: 1 },
      { id: 9, nome: 'Oferta Troco', codigo: 'oferta_troco', cor: '#f39c12', ativo: true, categoria: 'portabilidade', ordem: 2 },
      { id: 10, nome: 'Digitando', codigo: 'digitando', cor: '#9b59b6', ativo: true, categoria: 'portabilidade', ordem: 3 },
      { id: 35, nome: 'Redigitar', codigo: 'redigitar', cor: '#e74c3c', ativo: true, categoria: 'portabilidade', ordem: 4 },
      { id: 11, nome: 'Aguardando Assinatura', codigo: 'aguardando_assinatura', cor: '#2ecc71', ativo: true, categoria: 'portabilidade', ordem: 5 },
      { id: 12, nome: 'Retenção', codigo: 'retencao', cor: '#34495e', ativo: true, categoria: 'portabilidade', ordem: 6 },
      { id: 36, nome: 'Aguardando Desbloqueio', codigo: 'aguardando_desbloqueio', cor: '#e67e22', ativo: true, categoria: 'portabilidade', ordem: 7 },
      { id: 13, nome: 'Aguardando Saldo CIP', codigo: 'aguardando_saldo_cip', cor: '#1abc9c', ativo: true, categoria: 'portabilidade', ordem: 8 },
      { id: 26, nome: 'Atuando Saldo', codigo: 'atuando_saldo', cor: '#16a085', ativo: true, categoria: 'portabilidade', ordem: 9 },
      { id: 14, nome: 'Aguardando Averbação', codigo: 'aguardando_averbacao', cor: '#27ae60', ativo: true, categoria: 'portabilidade', ordem: 10 },
      { id: 15, nome: 'Pago', codigo: 'pago', cor: '#2ecc71', ativo: true, categoria: 'portabilidade', ordem: 11, final: true },
      
      // Status específicos de FGTS (Fila 1)
      { id: 1, nome: 'Início FGTS', codigo: 'inicio_fgts', cor: '#3498db', ativo: true, categoria: 'fgts', ordem: 1 },
      { id: 3, nome: 'Não Autorizado', codigo: 'nao_autorizado', cor: '#e74c3c', ativo: true, categoria: 'fgts', ordem: 2, final: true },
      { id: 43, nome: 'Simulando FGTS', codigo: 'simulando_fgts', cor: '#9b59b6', ativo: true, categoria: 'fgts', ordem: 3 },
      { id: 4, nome: 'Valor Liberado', codigo: 'valor_liberado', cor: '#2ecc71', ativo: true, categoria: 'fgts', ordem: 4 },
      { id: 37, nome: 'Empregado CLT', codigo: 'empregado_clt', cor: '#f39c12', ativo: true, categoria: 'fgts', ordem: 5 },
      { id: 5, nome: 'Aguardando Assinatura FGTS', codigo: 'aguardando_assinatura_fgts', cor: '#2ecc71', ativo: true, categoria: 'fgts', ordem: 6 },
      { id: 6, nome: 'Proposta Paga', codigo: 'proposta_paga', cor: '#27ae60', ativo: true, categoria: 'fgts', ordem: 7, final: true },
      { id: 7, nome: 'Sem Saldo', codigo: 'sem_saldo', cor: '#e74c3c', ativo: true, categoria: 'fgts', ordem: 8, final: true },
      { id: 42, nome: 'Re-consultar', codigo: 're_consultar', cor: '#f39c12', ativo: true, categoria: 'fgts', ordem: 9 },
      { id: 44, nome: 'Aniversário', codigo: 'aniversario', cor: '#e67e22', ativo: true, categoria: 'fgts', ordem: 10 }
    ];
    
    res.json({
      success: true,
      status: statusProposta
    });
  } catch (error) {
    res.status(500).json({
        success: false, 
      error: error.message
    });
  }
});

// API para propostas (compatibilidade com fila de digitação)
app.get('/api/propostas', (req, res) => {
  try {
    // Por enquanto retornar array vazio, depois implementar com dados reais
    const propostas = [];
    
    res.json({
      success: true,
      propostas,
      total: propostas.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// API para buscar dados de uma proposta específica
app.get('/api/proposta/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [API] Buscando proposta: ${id}`);
    
    const propostasPath = path.join(__dirname, 'var/data/propostas');
    const arquivoPath = path.join(propostasPath, `${id}.json`);
    
    if (!fs.existsSync(arquivoPath)) {
      return res.status(404).json({
        success: false,
        error: 'Proposta não encontrada'
      });
    }
    
    const proposta = JSON.parse(fs.readFileSync(arquivoPath, 'utf8'));
    
      res.json({ 
        success: true, 
      proposta
      });
  } catch (error) {
    console.error('❌ Erro ao buscar proposta:', error);
    res.status(500).json({
        success: false, 
      error: error.message
    });
  }
});

// API para fila de digitação
app.get('/api/fila-digitation', (req, res) => {
  try {
    // Por enquanto retornar array vazio, depois implementar com dados reais
    const fila = [];
    
      res.json({ 
        success: true, 
      fila,
      total: fila.length
      });
  } catch (error) {
    res.status(500).json({
        success: false, 
      error: error.message
    });
  }
});

// ================== SISTEMA FGTS ==================

// Servir página do FGTS
app.get('/fgts', (req, res) => {
  res.sendFile(path.join(__dirname, 'fgts', 'index.html'));
});

// Upload de extrato FGTS
app.post('/api/fgts/upload', upload.single('extrato'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Extrato enviado com sucesso',
      arquivo: req.file.filename,
      path: req.file.path
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// Servir página do Git History
app.get('/git-history', (req, res) => {
  res.sendFile(path.join(__dirname, 'git-history', 'index.html'));
});

// Servir página de Deploys (similar ao Render)
app.get('/deploys', (req, res) => {
  res.sendFile(path.join(__dirname, 'deploys', 'index.html'));
});

// Endpoints Kentro (integração real)
app.post('/kentro/buscar-cliente', async (req, res) => {
  try {
    const { cpf, email } = req.body;
    console.log(`🔍 [KENTRO] Buscando cliente: CPF=${cpf}, Email=${email}`);
    
    // Usar email como identificador principal (conforme documentação Kentro)
    const identificador = email || cpf;
    console.log(`🔍 [KENTRO] Usando identificador: ${identificador}`);
    
    if (!identificador) {
      return res.json({ 
        success: false,
        error: 'CPF ou email é obrigatório'
      });
    }
    
    // Buscar cliente real na Kentro (CJS import dentro de ESM)
    const kentroIntegrationModule = await import('./operacional/kentro-integration.cjs');
    const KentroIntegration = kentroIntegrationModule.default || kentroIntegrationModule;
    const kentro = new KentroIntegration();
    
    let cliente = null;
    
    // Tentar buscar por email primeiro (recomendado pela Kentro)
    if (email) {
      cliente = await kentro.buscarPorEmail(email);
    }
    
    // Se não encontrou por email, tentar por CPF
    if (!cliente && cpf) {
      cliente = await kentro.buscarPorCpf(cpf);
    }
    
    if (cliente) {
      console.log(`✅ [KENTRO] Cliente encontrado: ${cliente.nome}`);
      res.json({ 
        success: true, 
        cliente: {
          ...cliente,
          encontrado: true
        }
      });
    } else {
      console.log(`⚠️ [KENTRO] Cliente não encontrado: ${identificador}`);
        res.json({ 
          success: true, 
      cliente: {
        cpf: cpf,
          email: email,
          nome: 'Cliente não encontrado',
        encontrado: false
      }
    });
    }
  } catch (error) {
    console.error('❌ [KENTRO] Erro ao buscar cliente:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.post('/kentro/criar-oportunidade', (req, res) => {
  try {
    const { cpf, dados } = req.body;
    console.log(`🎯 [KENTRO] Criando oportunidade para: ${cpf}`);
    
    // Mock response
      res.json({ 
        success: true, 
      oportunidade: {
        id: 'OP' + Date.now(),
        cpf: cpf,
        status: 'criada'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.get('/api/kentro/oportunidade/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [KENTRO] Buscando oportunidade: ${id}`);
    
    // Buscar dados reais da Kentro usando o ID da oportunidade (CJS import dentro de ESM)
    const kentroIntegrationModule = await import('./operacional/kentro-integration.cjs');
    const KentroIntegration = kentroIntegrationModule.default || kentroIntegrationModule;
    const kentro = new KentroIntegration();
    
    const oportunidade = await kentro.buscarOportunidadePorId(id);
    
    if (oportunidade) {
    res.json({ 
      success: true, 
        oportunidade: oportunidade
      });
    } else {
      res.json({ 
        success: false, 
        error: 'Oportunidade não encontrada na Kentro'
      });
    }
  } catch (error) {
    console.error('❌ [KENTRO] Erro ao buscar oportunidade:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para remover clientes duplicados
app.post('/api/remover-clientes', (req, res) => {
  try {
    const { clientIds } = req.body;
    console.log(`🗑️ [CLIENTE] Removendo clientes duplicados: ${clientIds.join(', ')}`);
    
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista de IDs de clientes é obrigatória'
      });
    }
    
    let removidos = 0;
    const erros = [];
    
    clientIds.forEach(clientId => {
      try {
        const filePath = path.join(__dirname, 'var', 'data', 'clientes', `cliente_${clientId}.json`);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ [CLIENTE] Cliente ${clientId} removido com sucesso`);
          removidos++;
        } else {
          console.log(`⚠️ [CLIENTE] Arquivo do cliente ${clientId} não encontrado`);
        }
      } catch (error) {
        console.error(`❌ [CLIENTE] Erro ao remover cliente ${clientId}:`, error.message);
        erros.push({ clientId, error: error.message });
      }
    });
    
    res.json({
      success: true,
      message: `${removidos} cliente(s) removido(s) com sucesso`,
      removidos,
      erros: erros.length > 0 ? erros : null
    });
    
  } catch (error) {
    console.error('❌ [CLIENTE] Erro ao remover clientes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================== SISTEMA GIT HISTORY ==================

// API para buscar histórico de commits
app.get('/api/git-history', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    console.log('📊 [GIT] Buscando histórico de commits...');
    
    // Comando para buscar commits com informações detalhadas
    const gitCommand = 'git log --oneline --decorate --graph --all -20 --pretty=format:"%H|%an|%ae|%ad|%s|%D" --date=iso';
    
    try {
      const { stdout, stderr } = await execAsync(gitCommand, { 
        cwd: __dirname,
        timeout: 10000 
      });
      
      if (stderr) {
        console.log('⚠️ [GIT] Aviso:', stderr);
      }
      
      // Processar output do git
      const commits = stdout.trim().split('\n').filter(line => line.trim()).map(line => {
        const parts = line.split('|');
        if (parts.length >= 6) {
          let [hash, author, email, date, message, refs] = parts;
          
          // Limpar hash de caracteres especiais (como asteriscos do git log --graph)
          hash = hash.replace(/[*|\\\/\s]/g, '').trim();
          
          return {
            hash: hash.substring(0, 7), // Short hash
            fullHash: hash,
            author,
            email,
            date: new Date(date).toISOString(),
            message,
            refs: refs ? refs.trim() : '',
            status: 'success', // Por enquanto sempre sucesso
            type: 'commit'
          };
        }
        return null;
      }).filter(commit => commit !== null);
      
      console.log(`✅ [GIT] Encontrados ${commits.length} commits`);
      
      res.json({
        success: true,
        commits,
        total: commits.length,
        repository: 'api-extrato',
        branch: 'main'
      });
      
    } catch (gitError) {
      console.error('❌ [GIT] Erro ao executar comando git:', gitError.message);
      
      // Fallback: retornar dados mock se git não estiver disponível
      const mockCommits = [
        {
          hash: '6b59a9e',
          fullHash: '6b59a9e1234567890abcdef1234567890abcdef12',
          author: 'Eder Almeida',
          email: 'srcor@hotmail.com',
          date: new Date().toISOString(),
          message: 'docs: Add comprehensive API documentation - Add complete API documentation with detailed examples',
          refs: 'HEAD -> main, origin/main',
          status: 'success',
          type: 'commit'
        },
        {
          hash: '1e94f32',
          fullHash: '1e94f321234567890abcdef1234567890abcdef12',
          author: 'Eder Almeida',
          email: 'srcor@hotmail.com',
          date: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          message: 'fix: Move api-token-main.cjs to correct root directory - Fix file location mismatch',
          refs: 'origin/main',
          status: 'success',
          type: 'commit'
        },
        {
          hash: 'e05fec0',
          fullHash: 'e05fec01234567890abcdef1234567890abcdef12',
          author: 'Eder Almeida',
          email: 'srcor@hotmail.com',
          date: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          message: 'fix: Move api-token-main.cjs to root directory - Fix MODULE_NOT_FOUND error',
          refs: '',
          status: 'failed',
          type: 'commit'
        }
      ];
      
      res.json({
        success: true,
        commits: mockCommits,
        total: mockCommits.length,
        repository: 'api-extrato',
        branch: 'main',
        warning: 'Usando dados mock - Git não disponível'
      });
    }
    
  } catch (error) {
    console.error('❌ [GIT] Erro geral:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para buscar informações do repositório
app.get('/api/git-info', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    console.log('📊 [GIT] Buscando informações do repositório...');
    
    try {
      // Buscar informações do repositório
      const [branchResult, remoteResult, statusResult] = await Promise.all([
        execAsync('git branch --show-current', { cwd: __dirname }),
        execAsync('git remote get-url origin', { cwd: __dirname }),
        execAsync('git status --porcelain', { cwd: __dirname })
      ]);
      
      const currentBranch = branchResult.stdout.trim();
      const remoteUrl = remoteResult.stdout.trim();
      const hasChanges = statusResult.stdout.trim().length > 0;
      
      res.json({
        success: true,
        repository: {
          name: 'api-extrato',
          branch: currentBranch,
          remote: remoteUrl,
          hasChanges,
          lastCommit: new Date().toISOString()
        }
      });
      
    } catch (gitError) {
      console.error('❌ [GIT] Erro ao buscar informações:', gitError.message);
      
      // Fallback: informações mock
      res.json({
        success: true,
        repository: {
          name: 'api-extrato',
          branch: 'main',
          remote: 'https://github.com/ederalmeidasantos-byte/api-extrato.git',
          hasChanges: false,
          lastCommit: new Date().toISOString()
        },
        warning: 'Usando informações mock - Git não disponível'
      });
    }
    
  } catch (error) {
    console.error('❌ [GIT] Erro geral:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================== SISTEMA CHATGPT ==================

// Endpoint principal do ChatGPT
app.post('/api/chatgpt-kentro', async (req, res) => {
  try {
    const { cpf, message, clientNumber, chatId, messageType } = req.body;
    
    console.log(`🤖 [CHATGPT] Nova mensagem recebida`);
    console.log(`👤 [CHATGPT] Processando: ${cpf} - "${message}"`);
    
    // Usar sistema inteligente de ChatGPT
    let resultado;
    
    try {
      // Importar dinamicamente o sistema inteligente
      const { processarMensagem } = await import('./chatgpt-vendedor/sistema-inteligente.js');
      
      resultado = await processarMensagem({
        cpf: cpf,
        mensagem: message
      });
      
      console.log('✅ [CHATGPT] Resposta gerada com sucesso');
  } catch (error) {
      console.error('❌ [CHATGPT] Erro:', error.message);
      resultado = {
        success: false,
        resposta: `Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.`,
        erro: error.message
      };
    }
    
    // Formatar resposta para o formato esperado
    const resposta = {
      success: resultado.success,
      resposta: resultado.resposta,
      cpf: cpf,
      nomeCliente: resultado.nomeCliente || "Cliente",
      chatId: chatId,
      clientNumber: clientNumber,
      timestamp: new Date().toISOString(),
      metadata: {
        model: resultado.model || "sistema-inteligente",
        tokens: resultado.tokens || 0,
        method: "json",
        categoria: resultado.categoria,
        confianca: resultado.confianca
      }
    };
    
    res.json(resposta);
    
  } catch (error) {
    console.error('❌ [CHATGPT] Erro:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================== MIDDLEWARE DE ERRO ==================

app.use((err, req, res, next) => {
  console.error('❌ [ERRO]', err.message);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: err.message
  });
});

// ====== STATUS CONFIG ROUTES ======
app.get('/api/status-config', async (req, res) => {
  try {
    console.log('📋 [CONFIG] Carregando configurações de status...');
    
    // Verificar se arquivo de configuração existe
    const configPath = path.join(__dirname, 'var', 'data', 'status-config.json');
    
    if (!fs.existsSync(configPath)) {
      console.log('⚠️ [CONFIG] Arquivo de configuração não encontrado, criando padrão...');
      
      // Criar configuração padrão
      const defaultConfig = {
        statusFormulario: [
          {
            id: "dados_pessoais",
            nome: "Dados Pessoais",
            descricao: "Etapa de coleta de dados pessoais",
            cor: "#3B82F6",
            editavel: false
          },
          {
            id: "dados_bancarios",
            nome: "Dados Bancários",
            descricao: "Etapa de coleta de dados bancários",
            cor: "#10B981",
            editavel: false
          },
          {
            id: "dados_beneficio",
            nome: "Dados do Benefício",
            descricao: "Etapa de coleta de dados do benefício",
            cor: "#F59E0B",
            editavel: false
          },
          {
            id: "confirmacao",
            nome: "Confirmação",
            descricao: "Etapa de confirmação dos dados",
            cor: "#8B5CF6",
            editavel: false
          }
        ],
        produtos: [
          {
            id: 1,
            nome: "Empréstimo Consignado",
            descricao: "Empréstimo com desconto em folha",
            cor: "#3B82F6",
            origem: "calculo",
            simuladorId: "inss",
            editavel: true
          },
          {
            id: 2,
            nome: "Portabilidade",
            descricao: "Transferência de empréstimo entre bancos",
            cor: "#10B981",
            origem: "calculo",
            simuladorId: "inss",
            editavel: true
          },
          {
            id: 3,
            nome: "RMC",
            descricao: "Refinanciamento de cartão de crédito",
            cor: "#F59E0B",
            origem: "manual",
            editavel: true
          },
          {
            id: 4,
            nome: "RCC",
            descricao: "Refinanciamento de cartão de crédito",
            cor: "#8B5CF6",
            origem: "manual",
            editavel: true
          }
        ],
        statusProposta: [
          {
            id: "digitando",
            nome: "Digitando",
            descricao: "Proposta sendo digitada",
            cor: "#F59E0B",
            editavel: true,
            whatsapp: {
              ativo: false,
              template: "Olá {nome}, sua proposta está sendo digitada. Aguarde nosso retorno.",
              prioridade: "normal",
              delay: 0,
              variaveis: ["nome", "etapa", "valor", "banco", "produto"]
            }
          },
          {
            id: "cancelado",
            nome: "Cancelado",
            descricao: "Proposta cancelada",
            cor: "#EF4444",
            editavel: true,
            whatsapp: {
              ativo: false,
              template: "Olá {nome}, sua proposta foi cancelada.",
              prioridade: "normal",
              delay: 0,
              variaveis: ["nome", "etapa", "valor", "banco", "produto"]
            }
          },
          {
            id: "aprovado",
            nome: "Aprovado",
            descricao: "Proposta aprovada",
            cor: "#10B981",
            editavel: true,
            whatsapp: {
              ativo: true,
              template: "🎉 Parabéns {nome}! Sua proposta foi aprovada no valor de {valor}. Em breve você receberá mais informações sobre a liberação.",
              prioridade: "alta",
              delay: 0,
              variaveis: ["nome", "etapa", "valor", "banco", "produto"]
            }
          },
          {
            id: "em_analise",
            nome: "Em Análise",
            descricao: "Proposta em análise",
            cor: "#3B82F6",
            editavel: true,
            whatsapp: {
              ativo: false,
              template: "Olá {nome}, sua proposta está em análise. Aguarde nosso retorno.",
              prioridade: "normal",
              delay: 0,
              variaveis: ["nome", "etapa", "valor", "banco", "produto"]
            }
          },
          {
            id: "ag_saldo_cip",
            nome: "Aguardando Saldo CIP",
            descricao: "Aguardando saldo no CIP",
            cor: "#F59E0B",
            editavel: true,
            whatsapp: {
              ativo: false,
              template: "Olá {nome}, sua proposta está aguardando saldo no CIP.",
              prioridade: "normal",
              delay: 0,
              variaveis: ["nome", "etapa", "valor", "banco", "produto"]
            }
          },
          {
            id: "rejeitado",
            nome: "Rejeitado",
            descricao: "Proposta rejeitada",
            cor: "#EF4444",
            editavel: true,
            whatsapp: {
              ativo: true,
              template: "Olá {nome}, infelizmente sua proposta não foi aprovada no momento. Nossa equipe entrará em contato para orientações sobre próximos passos.",
              prioridade: "normal",
              delay: 0,
              variaveis: ["nome", "etapa", "valor", "banco", "produto"]
            }
          }
        ]
      };
      
      // Salvar configuração padrão
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ [CONFIG] Configuração padrão criada');
    }
    
    // Ler configuração
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    console.log(`✅ [CONFIG] Configuração carregada: ${config.statusProposta.length} status, ${config.produtos.length} produtos`);
    
    res.json(config);
    
  } catch (error) {
    console.error('❌ [CONFIG] Erro ao carregar configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar configurações de status'
    });
  }
});

// Atualizar configuração de status
app.put('/api/status-config', async (req, res) => {
  try {
    const { tipo, id, dados } = req.body;
    console.log(`📝 [CONFIG] Atualizando ${tipo} ID: ${id}`);
    
    const configPath = path.join(__dirname, 'var', 'data', 'status-config.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'Configuração não encontrada'
      });
    }
    
    // Ler configuração atual
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Atualizar item
    if (tipo === 'produto') {
      const index = config.produtos.findIndex(p => p.id === id);
      if (index !== -1) {
        config.produtos[index] = { ...config.produtos[index], ...dados };
      }
    } else if (tipo === 'proposta') {
      const index = config.statusProposta.findIndex(s => s.id === id);
      if (index !== -1) {
        config.statusProposta[index] = { ...config.statusProposta[index], ...dados };
      }
    } else if (tipo === 'formulario') {
      const index = config.statusFormulario.findIndex(s => s.id === id);
      if (index !== -1) {
        config.statusFormulario[index] = { ...config.statusFormulario[index], ...dados };
      }
    }
    
    // Salvar configuração atualizada
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(`✅ [CONFIG] ${tipo} ${id} atualizado com sucesso`);
    
    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ [CONFIG] Erro ao atualizar configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar configuração'
    });
  }
});

// Criar nova configuração
app.post('/api/status-config', async (req, res) => {
  try {
    const { tipo, dados } = req.body;
    console.log(`➕ [CONFIG] Criando novo ${tipo}`);
    
    const configPath = path.join(__dirname, 'var', 'data', 'status-config.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'Configuração não encontrada'
      });
    }
    
    // Ler configuração atual
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Gerar novo ID
    let novoId;
    if (tipo === 'produto') {
      novoId = Math.max(...config.produtos.map(p => p.id), 0) + 1;
      config.produtos.push({ id: novoId, ...dados });
    } else if (tipo === 'proposta') {
      novoId = `status_${Date.now()}`;
      config.statusProposta.push({ id: novoId, ...dados });
    } else if (tipo === 'formulario') {
      novoId = `form_${Date.now()}`;
      config.statusFormulario.push({ id: novoId, ...dados });
    }
    
    // Salvar configuração atualizada
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(`✅ [CONFIG] Novo ${tipo} criado com ID: ${novoId}`);
    
    res.json({
      success: true,
      message: 'Configuração criada com sucesso',
      id: novoId
    });
    
  } catch (error) {
    console.error('❌ [CONFIG] Erro ao criar configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar configuração'
    });
  }
});

// Excluir configuração
app.delete('/api/status-config', async (req, res) => {
  try {
    const { tipo, id } = req.body;
    console.log(`🗑️ [CONFIG] Excluindo ${tipo} ID: ${id}`);
    
    const configPath = path.join(__dirname, 'var', 'data', 'status-config.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'Configuração não encontrada'
      });
    }
    
    // Ler configuração atual
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Remover item
    if (tipo === 'produto') {
      config.produtos = config.produtos.filter(p => p.id !== id);
    } else if (tipo === 'proposta') {
      config.statusProposta = config.statusProposta.filter(s => s.id !== id);
    } else if (tipo === 'formulario') {
      config.statusFormulario = config.statusFormulario.filter(s => s.id !== id);
    }
    
    // Salvar configuração atualizada
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(`✅ [CONFIG] ${tipo} ${id} excluído com sucesso`);
    
    res.json({
      success: true,
      message: 'Configuração excluída com sucesso'
    });
    
  } catch (error) {
    console.error('❌ [CONFIG] Erro ao excluir configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir configuração'
    });
  }
});

// ================== INICIALIZAÇÃO ==================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`🏢 Operacional: http://localhost:${PORT}/operacional`);
  console.log(`🏦 FGTS: http://localhost:${PORT}/fgts`);
  console.log(`🤖 ChatGPT: http://localhost:${PORT}/api/chatgpt-kentro`);
});

// Diretório raiz (mesmo diretório onde está o server.js)
const rootDir = path.resolve(__dirname, '..');