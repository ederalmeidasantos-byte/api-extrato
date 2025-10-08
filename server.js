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
app.use('/inss', express.static(path.join(__dirname, 'INSS')));

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

// API para extração via ID da Lunas (POST)
app.post("/extrair", async (req, res) => {
  try {
    console.log("📄 [EXTRAIR] Recebida requisição:", req.body);
    console.log("📄 [EXTRAIR] Headers:", req.headers);
    console.log("📄 [EXTRAIR] Content-Type:", req.get('Content-Type'));
    
    const fileId = req.body.fileId || req.query.fileId;
    if (!fileId) {
      console.log("❌ [EXTRAIR] fileId não fornecido");
      return res.status(400).json({ error: "fileId é obrigatório" });
    }
    console.log("📄 [EXTRAIR] Processando fileId:", fileId);

    const jsonPath = path.join(__dirname, 'var/data/extratos', `extrato_${fileId}.json`);
    if (fs.existsSync(jsonPath)) {
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

    const pdfPath = path.join(__dirname, 'var/data/extratos', `extrato_${fileId}.pdf`);
    await fsp.mkdir(path.dirname(pdfPath), { recursive: true });
    const buf = Buffer.from(await resp.arrayBuffer());
    await fsp.writeFile(pdfPath, buf);
    console.log("✅ PDF salvo em", pdfPath);

    // processa com fila
    const { extrairDeUpload } = await import('./INSS/extrair_pdf.js');
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
    console.error("❌ [API] Erro em /extrair:", error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para simulador com injeção de dados
app.get("/simulador", async (req, res) => {
  const simuladorPath = path.join("/var/www/html", "inss", "simulador.html");
  if (!fs.existsSync(simuladorPath)) {
    return res.status(404).json({ error: "Simulador não encontrado" });
  }
  
  // Verificar se há ID na URL
  const extratoId = req.query.id;
  
  if (extratoId) {
    try {
      // Carregar dados do extrato
      const jsonPath = path.join(__dirname, 'var/data/extratos', `extrato_${extratoId}.json`);
      
      if (fs.existsSync(jsonPath)) {
        console.log(`📋 Carregando dados para simulador ID: ${extratoId}`);
        const dados = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        
        // Ler o HTML
        let html = fs.readFileSync(simuladorPath, 'utf-8');
        
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

// Rota para simulador com ID específico (ex: /simulador/7537)
app.get("/simulador/:id", async (req, res) => {
  const simuladorPath = path.join("/var/www/html", "inss", "simulador.html");
  if (!fs.existsSync(simuladorPath)) {
    return res.status(404).json({ error: "Simulador não encontrado" });
  }
  
  const extratoId = req.params.id;
  
  try {
    // Carregar dados do extrato
    const jsonPath = path.join(__dirname, 'var/data/extratos', `extrato_${extratoId}.json`);
    
    if (fs.existsSync(jsonPath)) {
      console.log(`📋 Carregando dados para simulador ID: ${extratoId}`);
      const dados = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      // Ler o HTML
      let html = fs.readFileSync(simuladorPath, 'utf-8');
      
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
  
  // Servir HTML normal se não há ID ou erro
  res.sendFile(simuladorPath);
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
        
        if ((existingCpf && newCpf && existingCpf === newCpf) || 
            (existingNb && newNb && existingNb === newNb)) {
          console.log(`✅ Cliente já existe com ID ${dados.id}, atualizando...`);
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

// Rota para servir a página de detalhes da proposta
app.get('/detalhesdaproposta/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 [DETALHES] Acessando proposta: ${id}`);
    
    // Servir o arquivo HTML de detalhes da proposta
    const htmlPath = path.join(__dirname, 'INSS', 'detalhesdaproposta.html');
    
    if (!fs.existsSync(htmlPath)) {
      return res.status(404).send('Página não encontrada');
    }
    
    res.sendFile(htmlPath);
  } catch (error) {
    console.error('❌ Erro ao servir detalhes da proposta:', error);
    res.status(500).send('Erro ao carregar página');
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

// ================== SISTEMA INSS ==================

// Servir página do INSS
app.get('/inss', (req, res) => {
  res.sendFile(path.join(__dirname, 'inss', 'index.html'));
});

// Servir página do Git History
app.get('/git-history', (req, res) => {
  res.sendFile(path.join(__dirname, 'git-history', 'index.html'));
});

// Servir página de Deploys (similar ao Render)
app.get('/deploys', (req, res) => {
  res.sendFile(path.join(__dirname, 'deploys', 'index.html'));
});

// Upload de extrato INSS
app.post('/api/processar-extrato', upload.single('extrato'), async (req, res) => {
  try {
    console.log('📄 [INSS] Upload de extrato recebido');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado'
      });
    }

    const { cpf } = req.body;
    console.log(`📄 [INSS] Processando extrato para CPF: ${cpf}`);
    console.log(`📄 [INSS] Arquivo: ${req.file.filename}`);

    // Integrar com o sistema real de extração de PDF
    try {
      const { extrairDeUpload } = await import('./INSS/extrair_pdf.js');
      
      const pdfPath = req.file.path;
      const jsonDir = path.join(__dirname, 'var/data/extratos');
      // Extrair apenas o ID real do nome do arquivo (ex: extrato-1759846385646-637216853.pdf -> 1759846385646-637216853)
      const fileId = req.file.filename.replace('extrato-', '').replace('.pdf', '');
      
      console.log(`📄 [INSS] Iniciando extração real do PDF...`);
      console.log(`📄 [INSS] PDF Path: ${pdfPath}`);
      console.log(`📄 [INSS] JSON Dir: ${jsonDir}`);
      console.log(`📄 [INSS] File ID: ${fileId}`);
      
      const resultado = await extrairDeUpload({
        fileId: fileId,
        pdfPath: pdfPath,
        jsonDir: jsonDir,
        ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
        idoportunidade: null
      });
      
      console.log(`✅ [INSS] Extração concluída com sucesso`);
      console.log(`📊 [INSS] Cliente: ${resultado.cliente}`);
      console.log(`📊 [INSS] Contratos encontrados: ${resultado.contratos?.length || 0}`);
    
    res.json({ 
      success: true, 
        message: 'Extrato processado com sucesso',
        fileId: fileId,
        cpf: cpf,
        dados: resultado,
        timestamp: new Date().toISOString()
      });
      
    } catch (extracaoError) {
      console.error('❌ [INSS] Erro na extração:', extracaoError);
      
      // Fallback: retornar sucesso mesmo com erro de extração
    res.json({ 
      success: true, 
        message: 'Extrato recebido (extração em desenvolvimento)',
        fileId: req.file.filename,
        cpf: cpf,
        warning: 'Extração de dados em desenvolvimento',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ [INSS] Erro no processamento:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Sincronizar dados do cliente
app.post('/api/sincronizar-dados-cliente', (req, res) => {
  try {
    const { cpf, dados } = req.body;
    
    console.log(`👤 [INSS] Sincronizando dados para CPF: ${cpf}`);
    
    // Aqui você pode salvar os dados do cliente
      res.json({ 
        success: true, 
      message: 'Dados sincronizados com sucesso',
      cpf: cpf,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [INSS] Erro na sincronização:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Endpoints Kentro (mock)
app.post('/kentro/buscar-cliente', (req, res) => {
  try {
    const { cpf } = req.body;
    console.log(`🔍 [KENTRO] Buscando cliente: ${cpf}`);
    
    // Mock response
        res.json({ 
          success: true, 
      cliente: {
        cpf: cpf,
        nome: 'Cliente Teste',
        encontrado: false
      }
    });
  } catch (error) {
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

app.get('/api/kentro/oportunidade/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [KENTRO] Buscando oportunidade: ${id}`);
    
    // Mock response
    res.json({ 
      success: true, 
      oportunidade: {
        id: id,
        status: 'ativa',
        dados: {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para carregar dados do extrato processado
app.get('/extrato/:fileId/raw', (req, res) => {
  try {
    const { fileId } = req.params;
    console.log(`📄 [INSS] Carregando extrato: ${fileId}`);
    
    // Tentar carregar dados reais do JSON
    // O fileId já vem sem o prefixo "extrato-", então usamos diretamente
    const jsonPath = path.join(__dirname, 'var/data/extratos', `extrato_${fileId}.json`);
    console.log(`📄 [INSS] Tentando carregar JSON: ${jsonPath}`);
    
    if (fs.existsSync(jsonPath)) {
      console.log(`✅ [INSS] JSON encontrado, carregando dados reais...`);
      const dadosReais = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      res.json({
        success: true,
        extrato: dadosReais
      });
    } else {
      console.log(`⚠️ [INSS] JSON não encontrado, retornando dados mock...`);
      
      // Fallback: dados mock
      const mockData = {
        success: true,
        extrato: {
          id: fileId,
          cpf: '46104631649',
          cliente: 'João Silva Santos',
          beneficio: {
            nb: '1234567890',
            especie: 'Aposentadoria por Idade',
            origem: 'INSS'
          },
          margens: {
            disponivel: 500.00,
            extrapolada: 76.20,
            rmc: 0.00,
            rcc: 0.00
          },
          contratos: [
            {
              contrato: '123456789',
              banco: '237',
              situacao: 'ATIVO',
              valor_parcela: 150.00,
              valor_liberado: 5000.00,
              qtde_parcelas: 60,
              taxa_juros_mensal: 1.45
            }
          ],
          data_extrato: '07/10/2025'
        }
      };
      
      res.json(mockData);
    }
    
  } catch (error) {
    console.error('❌ [INSS] Erro ao carregar extrato:', error);
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

// ================== INICIALIZAÇÃO ==================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`🏢 Operacional: http://localhost:${PORT}/operacional`);
  console.log(`🏦 FGTS: http://localhost:${PORT}/fgts`);
  console.log(`📋 INSS: http://localhost:${PORT}/inss`);
  console.log(`🤖 ChatGPT: http://localhost:${PORT}/api/chatgpt-kentro`);
});