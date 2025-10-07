import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/operacional', express.static(path.join(__dirname, 'operacional')));
app.use('/fgts', express.static(path.join(__dirname, 'fgts')));
app.use('/inss', express.static(path.join(__dirname, 'inss')));

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

// ================== API DE EXTRAÇÃO (BASEADA NO BACKUP) ==================

// API para extração via ID da Lunas (POST) - Baseada no backup
app.post("/extrair", async (req, res) => {
  try {
    console.log("🔍 [DEBUG] Body recebido:", req.body);
    
    const fileId = req.body.fileId || req.query.fileId;
    const idoportunidade = req.body.idoportunidade;
    
    if (!fileId) {
      return res.status(400).json({ error: "fileId é obrigatório" });
    }

    console.log(`🚀 [API] Extraindo extrato fileId: ${fileId}, idoportunidade: ${idoportunidade}`);

    // Verificar se já existe cache
    const jsonPath = path.join(__dirname, 'var/data/extratos', `extrato_${fileId}.json`);
    if (fs.existsSync(jsonPath)) {
      console.log("♻️ [API] Usando cache válido:", jsonPath);
      const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
      return res.json({ fileId, idoportunidade, ...cached });
    }

    // Baixar PDF da API Lunas (baseado no backup)
    console.log("📥 [API] Baixando PDF da Lunas:", fileId);
    const body = {
      queueId: Number(process.env.LUNAS_QUEUE_ID || 1),
      apiKey: process.env.LUNAS_API_KEY || "test-key",
      fileId: Number(fileId),
      download: true
    };

    const resp = await fetch(process.env.LUNAS_API_URL || "https://api-lunas.com/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${errorText}`);
    }

    // Salvar PDF temporário
    const pdfPath = path.join(__dirname, 'var/data/temp', `extrato_${fileId}.pdf`);
    await fsp.mkdir(path.dirname(pdfPath), { recursive: true });
    
    const pdfBuffer = Buffer.from(await resp.arrayBuffer());
    await fsp.writeFile(pdfPath, pdfBuffer);
    console.log("✅ [API] PDF salvo em", pdfPath);

    // Processar com GPT (baseado no backup)
    const { extrairDeUpload } = await import('./INSS/extrair_pdf.js');
    const resultado = await extrairDeUpload({
      fileId,
      pdfPath,
      jsonDir: path.join(__dirname, 'var/data/extratos'),
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
      idoportunidade
    });

    console.log("✅ [API] Extração concluída");
    
    // Adicionar link do simulador (baseado no backup)
    resultado.simulador_link = `https://lunasdigital.com.br/simulador/${fileId}`;
    
    res.json({ fileId, idoportunidade, ...resultado });

  } catch (error) {
    console.error("❌ [API] Erro em /extrair:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== SIMULADOR ==================

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

// ================== APIS DE CONFIGURAÇÃO ==================

// API para configurações de status
app.get('/api/status-config', (req, res) => {
  try {
    const statusConfig = {
      statusProposta: [
        { id: 1, nome: 'Pendente', codigo: 'pendente', cor: '#f59e0b', ativo: true, categoria: 'geral' },
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
        { id: 13, nome: 'Aguardando Desbloqueio', codigo: 'aguardando_desbloqueio', cor: '#e67e22', ativo: true, categoria: 'portabilidade', ordem: 7 },
        { id: 14, nome: 'Aguardando Saldo CIP', codigo: 'aguardando_saldo_cip', cor: '#8e44ad', ativo: true, categoria: 'portabilidade', ordem: 8 },
        { id: 15, nome: 'Atuando Saldo', codigo: 'atuando_saldo', cor: '#16a085', ativo: true, categoria: 'portabilidade', ordem: 9 },
        { id: 16, nome: 'Aguardando Averbação', codigo: 'aguardando_averbacao', cor: '#d35400', ativo: true, categoria: 'portabilidade', ordem: 10 },
        { id: 17, nome: 'Pago', codigo: 'pago', cor: '#27ae60', ativo: true, categoria: 'portabilidade', ordem: 11, final: true },
        
        // Status específicos de FGTS (Fila 1)
        { id: 18, nome: 'Início FGTS', codigo: 'inicio_fgts', cor: '#3498db', ativo: true, categoria: 'fgts', ordem: 1 },
        { id: 19, nome: 'Não Autorizado', codigo: 'nao_autorizado', cor: '#e74c3c', ativo: true, categoria: 'fgts', ordem: 2 },
        { id: 20, nome: 'Simulando FGTS', codigo: 'simulando_fgts', cor: '#f39c12', ativo: true, categoria: 'fgts', ordem: 3 },
        { id: 21, nome: 'Valor Liberado', codigo: 'valor_liberado', cor: '#2ecc71', ativo: true, categoria: 'fgts', ordem: 4 },
        { id: 22, nome: 'Empregado CLT', codigo: 'empregado_clt', cor: '#9b59b6', ativo: true, categoria: 'fgts', ordem: 5 },
        { id: 23, nome: 'Aguardando Assinatura FGTS', codigo: 'aguardando_assinatura_fgts', cor: '#34495e', ativo: true, categoria: 'fgts', ordem: 6 },
        { id: 24, nome: 'Proposta Paga', codigo: 'proposta_paga', cor: '#27ae60', ativo: true, categoria: 'fgts', ordem: 7, final: true },
        { id: 25, nome: 'Sem Saldo', codigo: 'sem_saldo', cor: '#95a5a6', ativo: true, categoria: 'fgts', ordem: 8 },
        { id: 26, nome: 'Re-consultar', codigo: 're_consultar', cor: '#e67e22', ativo: true, categoria: 'fgts', ordem: 9 },
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
      { id: 1, nome: 'Empréstimo Consignado', descricao: 'Empréstimo com desconto em folha', ativo: true },
      { id: 2, nome: 'Portabilidade', descricao: 'Transferência de empréstimo entre bancos', ativo: true },
      { id: 3, nome: 'RMC', descricao: 'Refinanciamento de cartão de crédito', ativo: true },
      { id: 4, nome: 'RCC', descricao: 'Refinanciamento de cartão de crédito', ativo: true }
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

// API para propostas (compatibilidade com fila de digitação)
app.get('/api/propostas', (req, res) => {
  try {
    const propostas = []; // Array vazio por enquanto
    
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

// ================== SISTEMA INSS ==================

// Servir página do INSS
app.get('/inss', (req, res) => {
  res.sendFile(path.join(__dirname, 'inss', 'index.html'));
});

// API para processar extrato INSS
app.post('/api/processar-extrato', upload.single('extrato'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de extrato é obrigatório' });
    }
    
    const cpf = req.body.cpf;
    console.log(`📄 [INSS] Processando extrato para CPF: ${cpf}`);
    console.log(`📄 [INSS] Arquivo: ${req.file.filename}`);

    // Integrar com o sistema real de extração de PDF
    try {
      const { extrairDeUpload } = await import('./INSS/extrair_pdf.js');
      
      const pdfPath = req.file.path;
      const jsonDir = path.join(__dirname, 'var/data/extratos');
      // Extrair apenas o ID real do nome do arquivo (ex: extrato-1759846385646-637216853.pdf -> 1759846385646-637216853)
      const fileId = req.file.filename.replace('extrato-', '').replace('.pdf', '');
      
      console.log(`🔍 [INSS] Parâmetros para extração:`);
      console.log(`   - fileId: ${fileId}`);
      console.log(`   - pdfPath: ${pdfPath}`);
      
      const resultado = await extrairDeUpload({
        fileId,
        pdfPath,
        jsonDir,
        ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
        idoportunidade: null
      });
      
      console.log(`✅ [INSS] Extração concluída:`, resultado);
  
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

// ================== INICIALIZAÇÃO ==================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`🏢 Operacional: http://localhost:${PORT}/operacional`);
  console.log(`🏦 FGTS: http://localhost:${PORT}/fgts`);
  console.log(`📋 INSS: http://localhost:${PORT}/inss`);
  console.log(`🤖 ChatGPT: http://localhost:${PORT}/api/chatgpt-kentro`);
});