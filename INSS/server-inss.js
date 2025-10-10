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

// Verificar configurações essenciais
console.log('🔧 [INSS] Verificando configurações...');
console.log(`🔑 [INSS] OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`🔑 [INSS] LUNAS_API_KEY: ${process.env.LUNAS_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`🔑 [INSS] LUNAS_API_URL: ${process.env.LUNAS_API_URL ? '✅ Configurada' : '❌ Não configurada'}`);

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ [INSS] OPENAI_API_KEY não configurada. Extração de PDF será limitada.');
}

if (!process.env.LUNAS_API_KEY || !process.env.LUNAS_API_URL) {
  console.warn('⚠️ [INSS] Configurações da Kentro não encontradas. Integração será limitada.');
}

const app = express();
const PORT = process.env.PORT || 3002; // Porta do simulador (api-simulador)

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

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log(`📁 [MULTER] Arquivo recebido: ${file.originalname}, tipo: ${file.mimetype}, tamanho: ${file.size}`);
    cb(null, true);
  }
});

// Importar funções do INSS
import { extrairDeUpload } from './extrair_pdf.js';
import { calcularTrocoEndpoint } from './calculo.js';

// ================== ROTAS INSS ==================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'INSS Simulador',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Servir arquivos estáticos do INSS
app.use('/inss', express.static(path.join(__dirname)));

// Servir arquivos estáticos na raiz também (para compatibilidade)
app.use('/', express.static(path.join(__dirname)));

// Rota principal do simulador
app.get('/inss/simulador.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'simulador.html'));
});

// Rota para detalhes da proposta (com ID)
app.get('/detalhesdaproposta/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'detalhes-proposta-padronizado.html'));
});

// Rota para detalhes da proposta (sem ID - compatibilidade)
app.get('/inss/detalhesdaproposta.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'detalhesdaproposta.html'));
});

// Rota para formulário de cliente (compatibilidade com /operacional/)
app.get('/operacional/formulario-cliente.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'formulario-cliente.html'));
});

// Rota para JavaScript do formulário
app.get('/operacional/formulario-cliente.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'formulario-cliente.js'));
});

// Rota para formulário de digitação
app.get('/inss/digitar-proposta.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'digitar-proposta.html'));
});

// ================== APIs INSS ==================

// API para buscar proposta por ID
app.get('/api/proposta/:id', (req, res) => {
  try {
    const { id } = req.params;
    const propostasPath = path.join(__dirname, '../var/data/propostas');
    const propostaFile = path.join(propostasPath, `${id}.json`);
    
    if (!fs.existsSync(propostaFile)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Proposta não encontrada' 
      });
    }
    
    const proposta = JSON.parse(fs.readFileSync(propostaFile, 'utf8'));
    
    // Parse dados se estiver como string
    if (proposta.dados && typeof proposta.dados === 'string') {
      try {
        proposta.dados = JSON.parse(proposta.dados);
      } catch (error) {
        console.warn('⚠️ [INSS] Erro ao parsear dados da proposta:', error.message);
        proposta.dados = {};
      }
    }
    
    // Buscar dados do cliente se clienteId estiver disponível
    let clienteData = null;
    if (proposta.clienteId) {
      const clientesPath = path.join(__dirname, '../var/data/clientes');
      const clienteFile = path.join(clientesPath, `${proposta.clienteId}.json`);
      
      if (fs.existsSync(clienteFile)) {
        try {
          clienteData = JSON.parse(fs.readFileSync(clienteFile, 'utf8'));
          console.log(`✅ [INSS] Cliente encontrado: ${proposta.clienteId}`);
        } catch (error) {
          console.warn('⚠️ [INSS] Erro ao ler dados do cliente:', error.message);
        }
      }
    }
    
    // Adicionar dados do cliente à proposta
    if (clienteData) {
      proposta.cliente = clienteData;
    }
    
    res.json({ 
      success: true, 
      proposta: proposta 
    });
  } catch (error) {
    console.error('❌ [INSS] Erro ao buscar proposta:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API para buscar cliente na Kentro
app.post('/api/kentro/buscar-cliente', async (req, res) => {
  try {
    console.log('🔍 [INSS] Endpoint buscar-cliente chamado!');
    const { cpf, email } = req.body;
    console.log(`🔍 [INSS] Buscando cliente na Kentro: CPF=${cpf}, Email=${email}`);
    
    if (!process.env.LUNAS_API_KEY || !process.env.LUNAS_API_URL) {
      return res.json({ 
        success: false, 
        error: 'Configurações da Kentro não encontradas' 
      });
    }
    
    // Usar email como identificador principal (conforme documentação Kentro)
    const identificador = email || cpf;
    
    if (!identificador) {
      return res.json({ 
        success: false, 
        error: 'CPF ou email é obrigatório' 
      });
    }
    
    // Tentar buscar cliente na Kentro (com fallback)
    let cliente = null;
    let idoportunidade = null;
    
    try {
      console.log(`🔍 [INSS] Tentando buscar cliente na Kentro...`);
      
      // Buscar cliente usando módulo centralizado
      console.log('🔍 [INSS] Buscando cliente na Kentro...');
      const { buscarClientePorCpf } = await import('../operacional/kentro-api.js');
      cliente = await buscarClientePorCpf(cpf, process.env.LUNAS_API_KEY, process.env.LUNAS_API_URL);
      
      if (cliente) {
        idoportunidade = cliente.kentroId || cliente.id;
        console.log(`✅ [INSS] Cliente encontrado na Kentro: ${idoportunidade}`);
      } else {
        console.log(`⚠️ [INSS] Cliente não encontrado na Kentro`);
      }
      
    } catch (error) {
      console.error(`⚠️ [INSS] Erro ao buscar na Kentro: ${error.message}`);
      console.error(`🔍 [INSS] Stack trace completo:`);
      console.error(error);
      console.log(`🔄 [INSS] Continuando sem integração Kentro...`);
    }
    
    // Sempre retornar sucesso, mesmo sem Kentro
    res.json({ 
      success: true, 
      idoportunidade: idoportunidade,
      cliente: cliente,
      kentroDisponivel: !!cliente
    });
    
  } catch (error) {
    console.error('❌ [INSS] Erro ao buscar cliente na Kentro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API para criar oportunidade na Kentro
app.post('/api/kentro/criar-oportunidade', async (req, res) => {
  try {
    const { cpf, dados } = req.body;
    console.log(`➕ [INSS] Criando oportunidade na Kentro para CPF: ${cpf}`);
    
    if (!process.env.LUNAS_API_KEY || !process.env.LUNAS_API_URL) {
      return res.json({ 
        success: false, 
        error: 'Configurações da Kentro não encontradas' 
      });
    }
    
    // Mock response por enquanto - implementar integração real depois
    const novaOportunidade = {
      id: `oportunidade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cpf: cpf,
      dados: dados,
      status: 'NOVA',
      origem: 'INSS_SIMULADOR',
      createdAt: new Date().toISOString()
    };
    
    console.log(`✅ [INSS] Oportunidade criada: ${novaOportunidade.id}`);
    res.json({ 
      success: true, 
      oportunidade: novaOportunidade 
    });
    
  } catch (error) {
    console.error('❌ [INSS] Erro ao criar oportunidade:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ================== INTEGRAÇÃO COM BASE DE DADOS ==================

// API para salvar cliente na base de dados
app.post('/api/salvar-cliente', async (req, res) => {
  try {
    console.log('📥 [INSS] Requisição recebida:', req.body);
    
    // Verificar se os dados vieram como clientData[campo] (FormData) ou como clientData (JSON)
    let clientData = req.body.clientData;
    
    // Se não veio como objeto, construir a partir dos campos clientData[*]
    if (!clientData && req.body['clientData[cpf]']) {
      console.log('📋 [INSS] Parseando FormData...');
      clientData = {
        cpf: req.body['clientData[cpf]'],
        nome: req.body['clientData[nome]'],
        nb: req.body['clientData[nb]'],
        especie: req.body['clientData[especie]'],
        telefone: req.body['clientData[telefone]'],
        email: req.body['clientData[email]'],
        nascimento: req.body['clientData[nascimento]'],
        nomeMae: req.body['clientData[nomeMae]'],
        kentroId: req.body['clientData[kentroId]'],
        fonte: req.body['clientData[fonte]']
      };
    }
    
    console.log(`💾 [INSS] Salvando cliente na base de dados:`, clientData?.cpf);
    
    if (!clientData || !clientData.cpf) {
      console.log('❌ [INSS] clientData ou CPF não encontrado no body');
      return res.status(400).json({ 
        success: false, 
        error: 'Dados do cliente não fornecidos' 
      });
    }
    
    // Diretório de clientes
    const clientesPath = path.join(__dirname, '../var/data/clientes');
    if (!fs.existsSync(clientesPath)) {
      fs.mkdirSync(clientesPath, { recursive: true });
    }
    
    // Gerar ID sequencial
    const arquivos = fs.readdirSync(clientesPath).filter(arquivo => arquivo.endsWith('.json'));
    const existingIds = new Set();
    
    for (const arquivo of arquivos) {
      try {
        const dados = JSON.parse(fs.readFileSync(path.join(clientesPath, arquivo), 'utf8'));
        if (dados.id) {
          const id = parseInt(dados.id);
          if (!isNaN(id)) {
            existingIds.add(id);
          }
        }
      } catch (error) {
        console.warn(`Erro ao ler arquivo ${arquivo}:`, error.message);
      }
    }
    
    // Gerar próximo ID sequencial
    let nextId = 1;
    while (existingIds.has(nextId)) {
      nextId++;
    }
    
    clientData.id = nextId.toString();
    clientData.createdAt = new Date().toISOString();
    clientData.updatedAt = new Date().toISOString();
    
    // Salvar arquivo
    const arquivoPath = path.join(clientesPath, `${clientData.id}.json`);
    fs.writeFileSync(arquivoPath, JSON.stringify(clientData, null, 2));
    
    console.log(`✅ [INSS] Cliente salvo com ID: ${clientData.id}`);
    
    res.json({ 
      success: true, 
      message: 'Cliente salvo com sucesso',
      cliente: clientData,
      clientId: clientData.id
    });
    
  } catch (error) {
    console.error('❌ [INSS] Erro ao salvar cliente:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API para salvar proposta na base de dados
app.post('/api/salvar-proposta', async (req, res) => {
  try {
    console.log('📥 [INSS] Requisição recebida:', req.body);
    
    // Verificar se os dados vieram como propostaData[campo] (FormData) ou como propostaData (JSON)
    let propostaData = req.body.propostaData;
    
    // Se não veio como objeto, construir a partir dos campos propostaData[*]
    if (!propostaData && req.body['propostaData[cpf]']) {
      console.log('📋 [INSS] Parseando FormData...');
      propostaData = {
        clientId: req.body['propostaData[clientId]'],
        cpf: req.body['propostaData[cpf]'],
        kentroId: req.body['propostaData[kentroId]'],
        fileId: req.body['propostaData[fileId]'],
        status: req.body['propostaData[status]'],
        origem: req.body['propostaData[origem]'],
        statusProdutos: req.body['propostaData[statusProdutos]']
      };
      
      // Parse dados se vier como string
      if (req.body['propostaData[dados]']) {
        try {
          propostaData.dados = JSON.parse(req.body['propostaData[dados]']);
        } catch (error) {
          console.warn('⚠️ [INSS] Erro ao parsear dados:', error.message);
          propostaData.dados = {};
        }
      }
    }
    
    console.log(`💾 [INSS] Salvando proposta na base de dados:`, propostaData?.id);
    
    if (!propostaData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados da proposta não fornecidos' 
      });
    }
    
    // Diretório de propostas
    const propostasPath = path.join(__dirname, '../var/data/propostas');
    if (!fs.existsSync(propostasPath)) {
      fs.mkdirSync(propostasPath, { recursive: true });
    }
    
    // Gerar ID sequencial
    const arquivos = fs.readdirSync(propostasPath).filter(arquivo => arquivo.endsWith('.json'));
    const existingIds = new Set();
    
    for (const arquivo of arquivos) {
      try {
        const dados = JSON.parse(fs.readFileSync(path.join(propostasPath, arquivo), 'utf8'));
        if (dados.id) {
          const id = parseInt(dados.id);
          if (!isNaN(id)) {
            existingIds.add(id);
          }
        }
      } catch (error) {
        console.warn(`Erro ao ler arquivo ${arquivo}:`, error.message);
      }
    }
    
    // Gerar próximo ID sequencial
    let nextId = 1;
    while (existingIds.has(nextId)) {
      nextId++;
    }
    
    propostaData.id = nextId.toString();
    propostaData.createdAt = new Date().toISOString();
    propostaData.updatedAt = new Date().toISOString();
    
    // Salvar arquivo
    const arquivoPath = path.join(propostasPath, `${propostaData.id}.json`);
    fs.writeFileSync(arquivoPath, JSON.stringify(propostaData, null, 2));
    
    console.log(`✅ [INSS] Proposta salva com ID: ${propostaData.id}`);
    
    res.json({ 
      success: true, 
      message: 'Proposta salva com sucesso',
      proposta: propostaData,
      propostaId: propostaData.id
    });
    
  } catch (error) {
    console.error('❌ [INSS] Erro ao salvar proposta:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API para processar extrato (upload de PDF)
app.post('/api/processar-extrato', upload.single('extrato'), async (req, res) => {
  try {
    console.log('📄 [INSS] Processando extrato...');
    console.log('📄 [INSS] req.file:', req.file);
    console.log('📄 [INSS] req.body:', req.body);
    
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
    const { calcularTrocoEndpoint } = await import('./calculo.js');
    const calcularTroco = calcularTrocoEndpoint(
      path.join(__dirname, '..', 'var', 'data', 'extratos')
    );
    
    // Criar um mock de req e res para a função
    const mockReq = { params: { fileId } };
    const mockRes = {
      json: (data) => {
        console.log('✅ [INSS] Simulação calculada com sucesso');
        return res.json({
          success: true,
          fileId,
          ...data
        });
      },
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      })
    };
    
    await calcularTroco(mockReq, mockRes);

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
    console.log('📄 [INSS] ID Oportunidade:', idoportunidade);

    const pdfPath = path.join(__dirname, '..', 'var', 'data', 'extratos', `extrato_${fileId}.pdf`);
    const jsonPath = path.join(__dirname, '..', 'var', 'data', 'extratos', `extrato_${fileId}.json`);

    // Verificar cache válido
    if (fs.existsSync(jsonPath)) {
      const stats = fs.statSync(jsonPath);
      const ageMs = Date.now() - stats.mtime.getTime();
      const ttlMs = 7 * 24 * 60 * 60 * 1000; // 7 dias

      if (ageMs < ttlMs) {
        console.log('📄 [INSS] Cache válido encontrado, retornando...');
        const extratoData = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
        if (idoportunidade) {
          extratoData.idoportunidade = idoportunidade;
        }
        const simuladorLink = `https://inss.lunasdigital.com.br/inss/simulador.html?extrato=${fileId}`;
        extratoData.simuladorLink = simuladorLink;
        console.log('✅ [INSS] Dados extraídos do cache com sucesso');
        return res.json(extratoData);
      } else {
        console.log('📄 [INSS] Cache expirado, reprocessando...');
      }
    }

    // Se não há PDF, baixar da API da Kentro
    if (!fs.existsSync(pdfPath)) {
      console.log('📥 [INSS] PDF não encontrado localmente, baixando da API da Kentro...');
      try {
        const kentroResponse = await fetch('https://lunasdigital.atenderbem.com/int/downloadFile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            queueId: 25,
            apiKey: process.env.KENTRO_API_KEY || 'cd4d0509169d4e2ea9177ac66c1c9376',
            fileId: parseInt(fileId),
            download: true
          }).toString()
        });

        if (!kentroResponse.ok) {
          const errorText = await kentroResponse.text();
          throw new Error(`Erro ao baixar PDF da Kentro: ${kentroResponse.status} ${kentroResponse.statusText} - ${errorText}`);
        }

        const pdfBuffer = Buffer.from(await kentroResponse.arrayBuffer());
        await fsp.writeFile(pdfPath, pdfBuffer);
        console.log('✅ [INSS] PDF baixado e salvo localmente:', pdfPath);

      } catch (downloadError) {
        console.error('❌ [INSS] Erro ao baixar PDF da Kentro:', downloadError);
        return res.status(500).json({
          error: 'Erro ao baixar PDF da Kentro',
          details: downloadError.message,
          fileId: fileId
        });
      }
    }

    console.log('🚀 [INSS] Cache não encontrado ou expirado, processando PDF com ChatGPT...');

    const { extrairDeUpload } = await import('./extrair_pdf.js');

    const resultado = await extrairDeUpload({
      fileId: fileId,
      pdfPath: pdfPath,
      jsonDir: path.join(__dirname, '..', 'var', 'data', 'extratos'),
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
      idoportunidade: idoportunidade
    });

    const simuladorLink = `https://inss.lunasdigital.com.br/inss/simulador.html?extrato=${fileId}`;
    resultado.simuladorLink = simuladorLink;

    console.log('✅ [INSS] Extração concluída com sucesso');
    console.log('📊 [INSS] Cliente:', resultado.cliente);
    console.log('📊 [INSS] Contratos encontrados:', resultado.contratos?.length || 0);

    res.json(resultado);

  } catch (error) {
    console.error('❌ [INSS] Erro ao extrair dados:', error);
    res.status(500).json({
      error: 'Erro ao extrair dados',
      details: error.message,
      fileId: req.body.fileId
    });
  }
});

// Rota para simulador com ID
app.get('/simulador/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'simulador.html'));
});

// ================== INICIALIZAÇÃO ==================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [INSS] Servidor INSS rodando na porta ${PORT}`);
  console.log(`📁 [INSS] Diretório: ${__dirname}`);
  console.log(`🌐 [INSS] Acesse: http://localhost:${PORT}/inss/simulador.html`);
});

export default app;
