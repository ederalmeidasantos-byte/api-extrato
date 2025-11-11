import express from 'express';
import https from 'https';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detectar se está rodando localmente (Windows) ou no servidor (Linux)
const isLocal = process.platform === 'win32' || !fs.existsSync('/root');
const INSS_DIR = isLocal ? __dirname : '/root/INSS';
const INSS_TESTS_DIR = isLocal ? path.join(__dirname, 'tests') : '/root/INSS/tests';
const PROPOSTAS_DIR = isLocal ? path.join(__dirname, '..', '..', 'var', 'data', 'propostas') : '/root/api-lunas/var/data/propostas';

console.log('🔍 [8443] Modo:', isLocal ? 'LOCAL (Windows)' : 'PRODUÇÃO (Linux)');
console.log('🔍 [8443] INSS_DIR:', INSS_DIR);
console.log('🔍 [8443] INSS_TESTS_DIR:', INSS_TESTS_DIR);
console.log('🔍 [8443] PROPOSTAS_DIR:', PROPOSTAS_DIR);

const app = express();
const HTTP_PORT = 3002;
const HTTPS_PORT = 8443;

// Configurar multer para upload de arquivos (temporário, apenas para proxy)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Usar diretório temporário do sistema (funciona em Windows e Linux)
    const uploadDir = process.env.TMP || process.env.TEMP || '/tmp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    cb(null, `${fileId}.pdf`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// IMPORTANTE: Desabilitar body-parser padrão do Express
app.disable('x-powered-by');

// Desabilitar renderização de HTML de erro padrão do Express
// Isso força que todos os erros sejam tratados pelo nosso handler customizado
app.set('env', 'production'); // Desabilita stack traces HTML

// Middleware PRIMEIRO para capturar todos os erros ANTES de qualquer processamento
app.use((err, req, res, next) => {
  // Se for erro de parsing JSON, retornar JSON em vez de HTML
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('❌ [8443-ERROR-HANDLER] Erro de JSON capturado:', err.message);
    return res.status(400).json({
      error: 'JSON inválido',
      message: err.message,
      hint: 'Verifique se o Content-Type é application/json e o JSON está bem formatado'
    });
  }
  next(err);
});

// Middleware customizado para parsing JSON (PRIMEIRO, antes de tudo)
app.use((req, res, next) => {
  // Log apenas para requisições relevantes (não poluir logs com arquivos estáticos)
  if (req.path.startsWith('/cliente/') || req.path.startsWith('/extrair') || req.path.startsWith('/extrato')) {
    console.log('🔍 [8443-MIDDLEWARE] Executado - Method:', req.method, 'URL:', req.url, 'Path:', req.path, 'Content-Type:', req.get('Content-Type'));
  }
  
  // IMPORTANTE: Pular completamente se for multipart/form-data (multer vai processar)
  const contentType = req.get('Content-Type') || '';
  if (contentType.includes('multipart/form-data')) {
    console.log('⏭️ [8443-MIDDLEWARE] É multipart/form-data, pulando (multer vai processar)');
    return next();
  }
  
  // Se for requisição JSON (POST/PUT/PATCH com Content-Type JSON)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && contentType.includes('application/json')) {
    console.log('📥 [8443-MIDDLEWARE] É JSON! Processando manualmente...');
    
    let data = '';
    let dataReceived = false;
    
    // Marcar que já estamos processando o body
    req._body = true;
    
    req.on('data', chunk => {
      data += chunk.toString('utf8');
      dataReceived = true;
      console.log('📥 [8443-MIDDLEWARE] Chunk recebido, tamanho:', chunk.length, 'Total até agora:', data.length);
    });
    
    req.on('end', () => {
      console.log('📥 [8443-MIDDLEWARE] Stream END, data length:', data.length, 'Received:', dataReceived);
      try {
        // Parsear JSON manualmente
        if (data && data.trim()) {
          req.body = JSON.parse(data);
          console.log('✅ [8443-BODY] JSON parseado! Keys:', Object.keys(req.body).join(', '));
        } else {
          req.body = {};
          console.log('⚠️ [8443-BODY] Body vazio ou só espaços');
        }
        next();
      } catch (e) {
        // SEMPRE retornar JSON em caso de erro (não HTML)
        console.error('❌ [8443] Erro ao parsear JSON:', e.message);
        console.error('❌ [8443] Body recebido (200 chars):', data.substring(0, 200));
        return res.status(400).json({
          error: 'JSON inválido',
          message: e.message,
          hint: 'Verifique se o Content-Type é application/json e o JSON está bem formatado',
          receivedContentType: req.get('Content-Type') || 'não informado',
          bodyPreview: data.substring(0, 200)
        });
      }
    });
    
    req.on('error', (err) => {
      console.error('❌ [8443] Erro no stream:', err.message);
      return res.status(400).json({
        error: 'Erro ao ler requisição',
        message: err.message
      });
    });
    
    // NÃO chamar next() aqui - aguardar 'end'
    return;
  } else {
    // Para métodos não-JSON, continuar
    console.log('⏭️ [8443-MIDDLEWARE] Não é JSON POST/PUT/PATCH, passando adiante');
    next();
  }
});

// Para URL encoded (forms) - apenas se não for JSON e não for multipart
app.use((req, res, next) => {
  const contentType = req.get('Content-Type') || '';
  // Pular se for multipart (multer vai processar) ou se for JSON (já processado)
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  if (!['POST', 'PUT', 'PATCH'].includes(req.method) || !contentType.includes('application/json')) {
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  } else {
    next();
  }
});

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ==================== ROTAS DE API (ANTES DE STATIC) ====================
// IMPORTANTE: Rotas de API DEVEM estar ANTES do express.static

// Rota para editor de roteiro operacional
app.get('/operacional/editor-roteiro.html', (req, res) => {
    try {
        console.log('📋 [8443-EDITOR-ROTEIRO] ==========================================');
        console.log('📋 [8443-EDITOR-ROTEIRO] ACESSANDO EDITOR DE ROTEIRO!');
        
        const editorPath = path.join(INSS_TESTS_DIR, 'editor-roteiro.html');
        
        if (!fs.existsSync(editorPath)) {
            console.error(`❌ [8443-EDITOR-ROTEIRO] Arquivo não encontrado: ${editorPath}`);
            return res.status(404).json({ 
                error: 'Editor de roteiro não encontrado',
                path: editorPath
            });
        }
        
        console.log(`✅ [8443-EDITOR-ROTEIRO] Servindo arquivo: ${editorPath}`);
        res.sendFile(editorPath);
        
    } catch (error) {
        console.error('❌ [8443-EDITOR-ROTEIRO] Erro ao servir editor:', error);
        res.status(500).json({ 
            error: 'Erro ao carregar editor de roteiro',
            message: error.message
        });
    }
});

// Rota para página de propostas (PRIMEIRO - antes de todas as outras)
app.get('/operacional/propostas.html', (req, res) => {
    try {
        console.log('✅ [8443-PROPOSTAS] ==========================================');
        console.log('✅ [8443-PROPOSTAS] ACESSANDO PÁGINA DE PROPOSTAS!');
        console.log('✅ [8443-PROPOSTAS] Request path:', req.path);
        console.log('✅ [8443-PROPOSTAS] Request originalUrl:', req.originalUrl);
        console.log('✅ [8443-PROPOSTAS] Request method:', req.method);
        
        const propostasPath = path.join(INSS_TESTS_DIR, 'propostas.html');
        
        if (!fs.existsSync(propostasPath)) {
            console.error(`❌ [8443-PROPOSTAS] Arquivo não encontrado: ${propostasPath}`);
            return res.status(404).json({ 
                error: 'Página de propostas não encontrada',
                path: propostasPath
            });
        }
        
        console.log(`✅ [8443-PROPOSTAS] Servindo arquivo: ${propostasPath}`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.sendFile(path.resolve(propostasPath));
        console.log('✅ [8443-PROPOSTAS] Arquivo enviado com sucesso!');
        console.log('✅ [8443-PROPOSTAS] ==========================================');
    } catch (error) {
        console.error('❌ [8443-PROPOSTAS] Erro ao servir página de propostas:', error);
        console.error('❌ [8443-PROPOSTAS] Stack:', error.stack);
        res.status(500).json({ error: 'Erro ao carregar página de propostas' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', port: HTTPS_PORT, service: 'simulador-inss-https' });     
});

// Endpoint para buscar propostas (GET /api/proposta) - DEVE VIR PRIMEIRO
// Aceita query params: ?cpf=XXX (retorna todas as propostas do CPF) ou ?id=XXX (retorna proposta específica)
app.get('/api/proposta', async (req, res) => {
  try {
    const { cpf, id } = req.query;
    
    console.log('🔍 [8443-PROPOSTA-GET] Busca de proposta iniciada');
    console.log('🔍 [8443-PROPOSTA-GET] Query params:', { cpf: cpf ? cpf.substring(0, 3) + '.***' : 'não fornecido', id: id || 'não fornecido' });
    
    const propostasDir = PROPOSTAS_DIR;
    
    // Criar diretório se não existir (modo local)
    if (!fs.existsSync(propostasDir)) {
      fs.mkdirSync(propostasDir, { recursive: true });
    }
    
    // Se tem CPF, buscar todas as propostas desse CPF
    if (cpf) {
      const cpfNormalizado = cpf.replace(/\D/g, '');
      
      if (cpfNormalizado.length !== 11) {
        console.error('❌ [8443-PROPOSTA-GET] CPF inválido:', cpfNormalizado);
        return res.status(400).json({ 
          success: false,
          error: 'CPF deve ter 11 dígitos',
          cpfRecebido: cpf
        });
      }
      
      console.log('🔍 [8443-PROPOSTA-GET] Buscando todas as propostas do CPF:', cpfNormalizado.substring(0, 3) + '.***');
      
      // Buscar todos os arquivos JSON no diretório
      if (!fs.existsSync(propostasDir)) {
        console.warn('⚠️ [8443-PROPOSTA-GET] Diretório de propostas não existe:', propostasDir);
        return res.json({
          success: true,
          propostas: [],
          total: 0,
          cpf: cpfNormalizado
        });
      }
      
      const arquivos = await fsp.readdir(propostasDir);
      const propostasEncontradas = [];
      
      // Ler cada arquivo JSON e verificar se o CPF corresponde
      for (const arquivo of arquivos) {
        if (!arquivo.endsWith('.json')) continue;
        
        try {
          const arquivoPath = path.join(propostasDir, arquivo);
          const propostaData = JSON.parse(await fsp.readFile(arquivoPath, 'utf-8'));
          
          // Comparar CPF (normalizar ambos)
          const propostaCpf = (propostaData.cpf || '').replace(/\D/g, '');
          if (propostaCpf === cpfNormalizado) {
            propostasEncontradas.push(propostaData);
          }
        } catch (e) {
          console.warn('⚠️ [8443-PROPOSTA-GET] Erro ao ler arquivo:', arquivo, e.message);
          continue;
        }
      }
      
      // Ordenar por data de criação (mais recente primeiro)
      propostasEncontradas.sort((a, b) => {
        const dataA = new Date(a.metadata?.data_criacao || 0);
        const dataB = new Date(b.metadata?.data_criacao || 0);
        return dataB - dataA;
      });
      
      console.log('✅ [8443-PROPOSTA-GET] Propostas encontradas:', propostasEncontradas.length);
      
      return res.json({
        success: true,
        propostas: propostasEncontradas,
        total: propostasEncontradas.length,
        cpf: cpfNormalizado
      });
    }
    
    // Se tem ID, buscar proposta específica
    if (id) {
      console.log('🔍 [8443-PROPOSTA-GET] Buscando proposta ID:', id);
      
      const propostaFile = path.join(propostasDir, `${id}.json`);
      
      if (fs.existsSync(propostaFile)) {
        try {
          const propostaData = JSON.parse(await fsp.readFile(propostaFile, 'utf-8'));
          console.log('✅ [8443-PROPOSTA-GET] Proposta encontrada!');
          console.log('📊 [8443-PROPOSTA-GET] CPF da proposta:', propostaData.cpf ? propostaData.cpf.substring(0, 3) + '.***' : 'não informado');
          console.log('📊 [8443-PROPOSTA-GET] Contratos (length):', propostaData.dados?.contratos?.length || 0);
          
          return res.json({
            success: true,
            proposta: propostaData
          });
        } catch (parseError) {
          console.error('❌ [8443-PROPOSTA-GET] Erro ao ler arquivo:', parseError);
          return res.status(500).json({ 
            success: false,
            error: 'Erro ao ler proposta',
            details: parseError.message
          });
        }
      } else {
        console.warn('⚠️ [8443-PROPOSTA-GET] Arquivo não encontrado:', propostaFile);
        return res.status(404).json({ 
          success: false,
          error: 'Proposta não encontrada',
          id: id
        });
      }
    }
    
    // Se não tem CPF nem ID, retornar TODAS as propostas
    console.log('🔍 [8443-PROPOSTA-GET] Buscando TODAS as propostas (sem filtro)');
    
    if (!fs.existsSync(propostasDir)) {
      console.warn('⚠️ [8443-PROPOSTA-GET] Diretório de propostas não existe:', propostasDir);
      return res.json({
        success: true,
        propostas: [],
        total: 0
      });
    }
    
    const arquivos = await fsp.readdir(propostasDir);
    const todasPropostas = [];
    
    // Ler cada arquivo JSON
    for (const arquivo of arquivos) {
      if (!arquivo.endsWith('.json')) continue;
      
      try {
        const arquivoPath = path.join(propostasDir, arquivo);
        const propostaData = JSON.parse(await fsp.readFile(arquivoPath, 'utf-8'));
        todasPropostas.push(propostaData);
      } catch (e) {
        console.warn('⚠️ [8443-PROPOSTA-GET] Erro ao ler arquivo:', arquivo, e.message);
        continue;
      }
    }
    
    // Ordenar por data de criação (mais recente primeiro)
    todasPropostas.sort((a, b) => {
      const dataA = new Date(a.metadata?.data_criacao || a.data_criacao || 0);
      const dataB = new Date(b.metadata?.data_criacao || b.data_criacao || 0);
      return dataB - dataA;
    });
    
    console.log('✅ [8443-PROPOSTA-GET] Total de propostas encontradas:', todasPropostas.length);
    
    return res.json({
      success: true,
      propostas: todasPropostas,
      total: todasPropostas.length
    });
    
  } catch (error) {
    console.error('❌ [8443-PROPOSTA-GET] Erro ao buscar proposta:', error);
    console.error('❌ [8443-PROPOSTA-GET] Stack:', error.stack);
    return res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Endpoint para buscar cliente por CPF (proxy para API 3004)
app.get('/cliente/:cpf', async (req, res) => {
  console.log('🔥 [8443-ROTA] Rota /cliente/:cpf CHAMADA! CPF:', req.params.cpf);
  console.log('🔥 [8443-ROTA] Method:', req.method, 'URL:', req.url, 'Path:', req.path);
  try {
    const { cpf } = req.params;
    console.log('👤 [8443] Proxy buscar cliente para CPF:', cpf);

    // Fazer proxy para o PM2 server-real-3004
    const response = await fetch(`http://127.0.0.1:3004/cliente/${cpf}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || 'Cliente não encontrado' };
      }
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    console.log('✅ [8443] Cliente encontrado');
    res.json(data);
    
  } catch (error) {
    console.error('❌ [8443] Erro no proxy buscar cliente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', port: HTTPS_PORT, service: 'simulador-inss-https' });     
});

// Endpoint para salvar cliente (POST /api/salvar-cliente) - Compatibilidade com simulador
app.post('/api/salvar-cliente', async (req, res) => {
  try {
    console.log('🔥 [8443-SALVAR] ==========================================');
    console.log('🔥 [8443-SALVAR] Rota POST /api/salvar-cliente CHAMADA!');
    console.log('🔥 [8443-SALVAR] Content-Type:', req.get('Content-Type'));
    console.log('🔥 [8443-SALVAR] Body recebido:', JSON.stringify(req.body, null, 2));
    
    // Verificar se é form-urlencoded ou JSON
    let clienteData = {};
    
    if (req.get('Content-Type')?.includes('application/x-www-form-urlencoded')) {
      // Parse de form-urlencoded (formato antigo do simulador)
      console.log('📝 [8443-SALVAR] Processando form-urlencoded');
      console.log('📝 [8443-SALVAR] req.body:', JSON.stringify(req.body, null, 2));
      
      const formData = req.body || {};
      
      // Express já parseou: req.body.clientData já existe quando vem como clientData[cpf]=valor
      // ou pode vir como objeto direto
      let clientData = {};
      
      if (formData.clientData) {
        // Formato: { clientData: { cpf: '...', nome: '...' } }
        clientData = formData.clientData;
        console.log('✅ [8443-SALVAR] Dados encontrados em req.body.clientData');
      } else if (formData['clientData[cpf]']) {
        // Formato: { 'clientData[cpf]': '...', 'clientData[nome]': '...' }
        Object.keys(formData).forEach(key => {
          const match = key.match(/clientData\[(\w+)\]/);
          if (match) {
            clientData[match[1]] = formData[key];
          }
        });
        console.log('✅ [8443-SALVAR] Dados encontrados em formato clientData[campo]');
      } else {
        // Formato direto: { cpf: '...', nome: '...' }
        clientData = formData;
        console.log('✅ [8443-SALVAR] Dados encontrados em formato direto');
      }
      
      console.log('📝 [8443-SALVAR] clientData extraído:', JSON.stringify(clientData, null, 2));
      
      clienteData = {
        dados_pessoais: {
          cpf: clientData.cpf || '',
          nome: clientData.nome || '',
          telefone: clientData.telefone || '',
          email: clientData.email || '',
          nascimento: clientData.nascimento || '',
          nb: clientData.nb || '',
          kentroId: clientData.kentroId || ''
        }
      };
      
      console.log('📝 [8443-SALVAR] Dados parseados de form-urlencoded:', JSON.stringify(clienteData, null, 2));
    } else {
      // JSON direto
      clienteData = req.body || {};
      console.log('📝 [8443-SALVAR] Dados JSON recebidos:', JSON.stringify(clienteData, null, 2));
    }
    
    // Extrair CPF
    const cpf = clienteData.dados_pessoais?.cpf || clienteData.cpf || '';
    const cpfNormalizado = cpf.replace(/\D/g, '');
    
    console.log('🔍 [8443-SALVAR] CPF extraído:', cpf);
    console.log('🔍 [8443-SALVAR] CPF normalizado:', cpfNormalizado);
    console.log('🔍 [8443-SALVAR] CPF length:', cpfNormalizado.length);
    console.log('🔍 [8443-SALVAR] clienteData completo:', JSON.stringify(clienteData, null, 2));
    
    if (!cpfNormalizado || cpfNormalizado.length !== 11) {
      console.error('❌ [8443-SALVAR] CPF inválido ou vazio');
      console.error('❌ [8443-SALVAR] CPF recebido:', cpf);
      console.error('❌ [8443-SALVAR] CPF normalizado:', cpfNormalizado);
      console.error('❌ [8443-SALVAR] clienteData.dados_pessoais:', clienteData.dados_pessoais);
      console.error('❌ [8443-SALVAR] clienteData.cpf:', clienteData.cpf);
      console.error('❌ [8443-SALVAR] req.body original:', JSON.stringify(req.body, null, 2));
      console.log('🔥 [8443-SALVAR] ==========================================');
      return res.status(400).json({ 
        error: 'CPF inválido ou não encontrado',
        received: {
          cpf: cpf,
          cpfNormalizado: cpfNormalizado,
          clienteData: clienteData
        }
      });
    }
    
    console.log('👤 [8443-SALVAR] Salvando cliente CPF:', cpfNormalizado.substring(0, 3) + '.***');
    
    // Usar o endpoint PATCH /cliente/:cpf que já existe
    const proxyUrl = `http://127.0.0.1:3004/cliente/${cpfNormalizado}`;
    
    const response = await fetch(proxyUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clienteData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('⚠️ [8443-SALVAR] Erro na resposta (status:', response.status, '):', errorText);
      console.log('🔥 [8443-SALVAR] ==========================================');
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    
    // Retornar no formato esperado pelo simulador (com clientId)
    const clientId = `cliente_${cpfNormalizado}`;
    
    console.log('✅ [8443-SALVAR] Cliente salvo com sucesso!');
    console.log('✅ [8443-SALVAR] clientId:', clientId);
    console.log('🔥 [8443-SALVAR] ==========================================');
    
    res.json({
      success: true,
      clientId: clientId,
      cliente: data.cliente || data
    });
    
  } catch (error) {
    console.error('❌ [8443-SALVAR] Erro ao salvar cliente:', error);
    console.error('❌ [8443-SALVAR] Stack:', error.stack);
    console.log('🔥 [8443-SALVAR] ==========================================');
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para salvar proposta (POST /api/salvar-proposta) - REFATORADO
app.post('/api/salvar-proposta', async (req, res) => {
  try {
    console.log('🔥 [8443-PROPOSTA-SAVE] ==========================================');
    console.log('🔥 [8443-PROPOSTA-SAVE] Rota POST /api/salvar-proposta CHAMADA!');
    console.log('🔥 [8443-PROPOSTA-SAVE] Content-Type:', req.get('Content-Type'));
    console.log('🔥 [8443-PROPOSTA-SAVE] Body recebido (raw):', JSON.stringify(req.body, null, 2));
    
    // Verificar se é form-urlencoded ou JSON
    let propostaData = {};
    
    if (req.get('Content-Type')?.includes('application/x-www-form-urlencoded')) {
      // Parse de form-urlencoded
      console.log('📝 [8443-PROPOSTA-SAVE] Processando form-urlencoded');
      const formData = req.body || {};
      
      // Verificar se já veio parseado como objeto aninhado (propostaData: { ... })
      if (formData.propostaData && typeof formData.propostaData === 'object') {
        console.log('📝 [8443-PROPOSTA-SAVE] Dados já parseados como objeto aninhado');
        const propostaDataNested = formData.propostaData;
        
        // Extrair CPF
        const cpfRaw = propostaDataNested.cpf || '';
        const cpfNormalizado = cpfRaw.replace(/\D/g, '');
        console.log('🔍 [8443-PROPOSTA-SAVE] CPF extraído (objeto):', cpfNormalizado.substring(0, 3) + '.***');
        
        propostaData = {
          cpf: cpfNormalizado,
          kentroId: propostaDataNested.kentroId || null,
          fileId: propostaDataNested.fileId || '',
          status: propostaDataNested.status || 'Na fila',
          origem: propostaDataNested.origem || 'INSS_SIMULADOR',
          statusProdutos: propostaDataNested.statusProdutos || '1',
          dados: {}
        };
        
        // Parse de dados (pode vir como string JSON ou objeto)
        const dadosString = propostaDataNested.dados;
        if (dadosString) {
          try {
            if (typeof dadosString === 'string') {
              propostaData.dados = JSON.parse(dadosString);
              console.log('✅ [8443-PROPOSTA-SAVE] Dados parseados de JSON string (objeto)');
            } else if (typeof dadosString === 'object') {
              propostaData.dados = dadosString;
              console.log('✅ [8443-PROPOSTA-SAVE] Dados já são objeto');
            }
            console.log('📊 [8443-PROPOSTA-SAVE] dados.cliente existe?', !!propostaData.dados?.cliente);
            console.log('📊 [8443-PROPOSTA-SAVE] dados.contratos length:', propostaData.dados?.contratos?.length || 0);
          } catch (e) {
            console.error('❌ [8443-PROPOSTA-SAVE] Erro ao parsear JSON:', e);
            propostaData.dados = {};
          }
        }
      } else {
        // Formato tradicional: propostaData[campo]=valor
        console.log('📝 [8443-PROPOSTA-SAVE] Processando formato tradicional propostaData[campo]');
        
        // Extrair CPF primeiro (obrigatório)
        const cpfRaw = formData['propostaData[cpf]'] || '';
        const cpfNormalizado = cpfRaw.replace(/\D/g, '');
        
        console.log('🔍 [8443-PROPOSTA-SAVE] CPF extraído (formato tradicional):', cpfNormalizado.substring(0, 3) + '.***');
        
        // Construir propostaData do formato propostaData[campo]=valor
        propostaData = {
          cpf: cpfNormalizado,
          kentroId: formData['propostaData[kentroId]'] || null,
          fileId: formData['propostaData[fileId]'] || '',
          status: formData['propostaData[status]'] || 'Na fila',
          origem: formData['propostaData[origem]'] || 'INSS_SIMULADOR',
          statusProdutos: formData['propostaData[statusProdutos]'] || '1',
          dados: {}
        };
        
        // Parse de dados (CRÍTICO - deve ser JSON string)
        const dadosString = formData['propostaData[dados]'];
        if (dadosString) {
          try {
            // Sempre tentar parsear como JSON string primeiro
            if (typeof dadosString === 'string') {
              propostaData.dados = JSON.parse(dadosString);
              console.log('✅ [8443-PROPOSTA-SAVE] Dados parseados de JSON string');
            } else if (typeof dadosString === 'object') {
              propostaData.dados = dadosString;
              console.log('✅ [8443-PROPOSTA-SAVE] Dados já são objeto');
            } else {
              console.warn('⚠️ [8443-PROPOSTA-SAVE] Tipo inesperado de dadosString:', typeof dadosString);
              propostaData.dados = {};
            }
            console.log('📊 [8443-PROPOSTA-SAVE] Tipo de dados.dados:', typeof propostaData.dados);
            console.log('📊 [8443-PROPOSTA-SAVE] dados.cliente existe?', !!propostaData.dados?.cliente);
            console.log('📊 [8443-PROPOSTA-SAVE] dados.contratos length:', propostaData.dados?.contratos?.length || 0);
          } catch (e) {
            console.error('❌ [8443-PROPOSTA-SAVE] Erro ao parsear JSON:', e);
            console.error('❌ [8443-PROPOSTA-SAVE] String recebida (primeiros 500 chars):', dadosString?.substring(0, 500));
            propostaData.dados = {};
          }
        } else {
          console.warn('⚠️ [8443-PROPOSTA-SAVE] propostaData[dados] não encontrado no formData');
        }
      }
      
      console.log('✅ [8443-PROPOSTA-SAVE] Dados construídos de form-urlencoded');
    } else {
      // JSON direto
      propostaData = req.body || {};
      // Normalizar CPF se veio como objeto
      if (propostaData.cpf) {
        propostaData.cpf = propostaData.cpf.replace(/\D/g, '');
      }
      console.log('📝 [8443-PROPOSTA-SAVE] Dados JSON recebidos:', JSON.stringify(propostaData, null, 2));
    }
    
    // VALIDAÇÃO: CPF obrigatório
    if (!propostaData.cpf || propostaData.cpf.length !== 11) {
      console.error('❌ [8443-PROPOSTA-SAVE] CPF inválido ou ausente:', propostaData.cpf);
      console.log('🔥 [8443-PROPOSTA-SAVE] ==========================================');
      return res.status(400).json({ 
        success: false,
        error: 'CPF é obrigatório e deve ter 11 dígitos',
        cpfRecebido: propostaData.cpf || 'ausente'
      });
    }
    
    // Gerar ID sequencial para a proposta
    const propostaId = `proposta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Estruturar dados da proposta para salvar (GARANTIR QUE DADOS SEJAM PRESERVADOS)
    const propostaCompleta = {
      id: propostaId,
      cpf: propostaData.cpf, // CPF normalizado
      kentroId: propostaData.kentroId || null,
      fileId: propostaData.fileId || null,
      status: propostaData.status || 'Na fila',
      origem: propostaData.origem || 'INSS_SIMULADOR',
      statusProdutos: propostaData.statusProdutos || '1',
      dados: propostaData.dados || {
        cliente: {},
        contratos: [],
        margens: {},
        trocoTotal: 0
      },
      metadata: {
        data_criacao: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      }
    };
    
    // Logs detalhados ANTES de salvar
    console.log('📊 [8443-PROPOSTA-SAVE] DADOS QUE SERÃO SALVOS:');
    console.log('📊 [8443-PROPOSTA-SAVE] propostaCompleta.cpf:', propostaCompleta.cpf);
    console.log('📊 [8443-PROPOSTA-SAVE] propostaCompleta.dados.cliente (keys):', Object.keys(propostaCompleta.dados.cliente || {}));
    console.log('📊 [8443-PROPOSTA-SAVE] propostaCompleta.dados.contratos (length):', propostaCompleta.dados.contratos?.length || 0);
    console.log('📊 [8443-PROPOSTA-SAVE] propostaCompleta.dados.margens:', !!propostaCompleta.dados.margens);
    console.log('📊 [8443-PROPOSTA-SAVE] propostaCompleta.dados.trocoTotal:', propostaCompleta.dados.trocoTotal);
    
    // Salvar proposta em arquivo JSON
    try {
      const propostasDir = '/root/api-lunas/var/data/propostas';
      const propostaFile = path.join(propostasDir, `${propostaId}.json`);
      
      // Criar diretório se não existir
      if (!fs.existsSync(propostasDir)) {
        fs.mkdirSync(propostasDir, { recursive: true });
        console.log('📁 [8443-PROPOSTA-SAVE] Diretório criado:', propostasDir);
      }
      
      // Salvar arquivo com atomic write
      const propostaJson = JSON.stringify(propostaCompleta, null, 2);
      const propostaFileTmp = propostaFile + '.tmp';
      await fsp.writeFile(propostaFileTmp, propostaJson, 'utf-8');
      await fsp.rename(propostaFileTmp, propostaFile);
      
      console.log('💾 [8443-PROPOSTA-SAVE] Proposta salva em:', propostaFile);
      console.log('💾 [8443-PROPOSTA-SAVE] Tamanho do arquivo:', propostaJson.length, 'bytes');
    } catch (saveError) {
      console.error('❌ [8443-PROPOSTA-SAVE] Erro ao salvar proposta:', saveError);
      console.error('❌ [8443-PROPOSTA-SAVE] Stack:', saveError.stack);
      console.log('🔥 [8443-PROPOSTA-SAVE] ==========================================');
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao salvar proposta',
        details: saveError.message
      });
    }
    
    console.log('✅ [8443-PROPOSTA-SAVE] Proposta criada com ID:', propostaId);
    console.log('🔥 [8443-PROPOSTA-SAVE] ==========================================');
    
    // Retornar sucesso com ID da proposta
    res.json({
      success: true,
      propostaId: propostaId,
      cpf: propostaCompleta.cpf,
      message: 'Proposta salva com sucesso'
    });
    
  } catch (error) {
    console.error('❌ [8443-PROPOSTA] Erro ao salvar proposta:', error);
    console.error('❌ [8443-PROPOSTA] Stack:', error.stack);
    console.log('🔥 [8443-PROPOSTA] ==========================================');
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para atualizar cliente por CPF (proxy para API 3004)
app.patch('/cliente/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;
    console.log('🔥 [8443-PATCH] ==========================================');
    console.log('🔥 [8443-PATCH] Rota PATCH /cliente/:cpf CHAMADA! CPF:', cpf);
    console.log('🔥 [8443-PATCH] Method:', req.method);
    console.log('🔥 [8443-PATCH] URL:', req.url);
    console.log('🔥 [8443-PATCH] Content-Type:', req.get('Content-Type'));
    console.log('🔥 [8443-PATCH] Body recebido:', JSON.stringify(req.body, null, 2));

    // Fazer proxy para o PM2 server-real-3004
    const proxyUrl = `http://127.0.0.1:3004/cliente/${cpf}`;
    console.log('👤 [8443-PATCH] Proxy para:', proxyUrl);
    
    const response = await fetch(proxyUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || 'Erro ao atualizar cliente' };
      }
      console.warn('⚠️ [8443-PATCH] Erro na resposta (status:', response.status, '):', errorData);
      console.log('🔥 [8443-PATCH] ==========================================');
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    console.log('✅ [8443-PATCH] Cliente atualizado com sucesso!');
    console.log('✅ [8443-PATCH] Resposta:', JSON.stringify(data, null, 2));
    console.log('🔥 [8443-PATCH] ==========================================');
    res.json(data);
    
  } catch (error) {
    console.error('❌ [8443-PATCH] Erro no proxy atualizar cliente:', error);
    console.error('❌ [8443-PATCH] Stack:', error.stack);
    console.log('🔥 [8443-PATCH] ==========================================');
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para extrair (proxy para API 3004)
app.post('/extrair', async (req, res) => {
  try {
    // Log detalhado do body recebido
    console.log('📥 [8443] Body recebido (tipo):', typeof req.body);
    console.log('📥 [8443] Body recebido (valor):', req.body);
    console.log('📥 [8443] Content-Type:', req.get('Content-Type'));
    
    // Extrair dados do body (pode vir como objeto ou já parseado)
    let fileId, idoportunidade;
    
    if (typeof req.body === 'string') {
      // Se veio como string, tentar parsear
      try {
        const parsed = JSON.parse(req.body);
        fileId = parsed.fileId;
        idoportunidade = parsed.idoportunidade;
      } catch (e) {
        console.error('❌ [8443] Erro ao parsear body string:', e.message);
        return res.status(400).json({ error: 'JSON inválido no body' });
      }
    } else if (typeof req.body === 'object' && req.body !== null) {
      // Se já é objeto, usar direto
      fileId = req.body.fileId;
      idoportunidade = req.body.idoportunidade;
    } else {
      return res.status(400).json({ error: 'Body inválido ou ausente' });
    }

    console.log('📄 [8443] Proxy extrair para fileId:', fileId, 'idoportunidade:', idoportunidade || 'não fornecido');

    // Preparar body para enviar para 3004
    const bodyData = { fileId };
    if (idoportunidade) {
      bodyData.idoportunidade = idoportunidade;
    }

    console.log('📤 [8443] Enviando para 3004:', JSON.stringify(bodyData));

    // Fazer proxy para o PM2 server-real-3004 com JSON
    const response = await fetch('http://127.0.0.1:3004/extrair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
      let errorData;
      try {
        const errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: 'Erro desconhecido na API 3004' };
      }
      console.error('❌ [8443] Erro na API 3004:', response.status, errorData);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    console.log('✅ [8443] Resposta da API 3004 recebida');
    res.json(data);
    
  } catch (error) {
    console.error('❌ [8443] Erro no proxy extrair:', error);
    console.error('❌ [8443] Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para extrair-upload (proxy para API 3004 com FormData)
app.post('/extrair-upload', upload.single('extrato'), async (req, res) => {
  try {
    console.log('📥 [8443-EXTRAIR-UPLOAD] Upload recebido');
    console.log('📥 [8443-EXTRAIR-UPLOAD] Content-Type:', req.get('Content-Type'));
    console.log('📥 [8443-EXTRAIR-UPLOAD] Body:', req.body);
    console.log('📥 [8443-EXTRAIR-UPLOAD] File:', req.file ? 'recebido' : 'não recebido');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo PDF obrigatório' });
    }
    
    // Usar http.request diretamente para fazer proxy corretamente com multipart
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    console.log('📤 [8443-EXTRAIR-UPLOAD] Preparando FormData...');
    console.log('📤 [8443-EXTRAIR-UPLOAD] Arquivo path:', req.file.path);
    console.log('📤 [8443-EXTRAIR-UPLOAD] Arquivo size:', req.file.size, 'bytes');
    
    // Adicionar campos do formulário PRIMEIRO
    if (req.body?.cpf) {
      formData.append('cpf', String(req.body.cpf));
      console.log('📤 [8443-EXTRAIR-UPLOAD] CPF adicionado:', req.body.cpf);
    }
    if (req.body?.idoportunidade) {
      formData.append('idoportunidade', String(req.body.idoportunidade));
      console.log('📤 [8443-EXTRAIR-UPLOAD] idoportunidade adicionado:', req.body.idoportunidade);
    }
    
    // Adicionar arquivo usando stream (não buffer) - isso é mais eficiente e evita problemas
    const fileStream = fs.createReadStream(req.file.path);
    formData.append('extrato', fileStream, {
      filename: req.file.originalname || req.file.filename || 'extrato.pdf',
      contentType: req.file.mimetype || 'application/pdf',
      knownLength: req.file.size // Informar tamanho conhecido para melhor performance
    });
    
    console.log('📤 [8443-EXTRAIR-UPLOAD] FormData preparado, arquivo adicionado como stream');
    
    // Obter headers do FormData e calcular tamanho
    const formHeaders = formData.getHeaders();
    console.log('📤 [8443-EXTRAIR-UPLOAD] Headers Content-Type:', formHeaders['content-type']);
    
    // Obter tamanho do FormData (importante para Content-Length correto)
    const getFormDataLength = () => {
      return new Promise((resolve) => {
        let length = 0;
        formData.on('data', (chunk) => {
          length += chunk.length;
        });
        formData.on('end', () => {
          resolve(length);
        });
        // Se já tem knownLength, usar
        if (formData._boundary) {
          // Estimativa baseada no boundary e campos
          const boundarySize = formData._boundary.length + 4; // --boundary + CRLF
          const fieldsSize = (req.body?.cpf ? req.body.cpf.length + 50 : 0) + 
                            (req.body?.idoportunidade ? req.body.idoportunidade.length + 60 : 0);
          const fileSize = req.file.size;
          const estimatedLength = boundarySize * 3 + fieldsSize + fileSize + 200; // margem de segurança
          resolve(estimatedLength);
        } else {
          resolve(null);
        }
      });
    };
    
    // Fazer proxy usando http.request (não fetch) para garantir que multipart funciona
    return new Promise(async (resolve, reject) => {
      // NÃO incluir Content-Length - deixar o form-data calcular automaticamente
      // O form-data vai calcular o Content-Length correto baseado no stream
      const options = {
        hostname: '127.0.0.1',
        port: 3004,
        path: '/extrair-upload',
        method: 'POST',
        headers: {
          ...formHeaders
          // NÃO incluir Content-Length aqui - o form-data vai adicionar automaticamente
        }
      };
      
      const proxyReq = http.request(options, (proxyRes) => {
        console.log('📥 [8443-EXTRAIR-UPLOAD] Resposta recebida:', proxyRes.statusCode);
        
        let responseData = '';
        proxyRes.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        
        proxyRes.on('end', () => {
          // Remover arquivo temporário após receber resposta
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
              console.log('✅ [8443-EXTRAIR-UPLOAD] Arquivo temporário removido');
            }
          } catch (e) {
            console.warn('⚠️ [8443-EXTRAIR-UPLOAD] Erro ao remover arquivo temporário:', e.message);
          }
          
          if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
            try {
              const result = JSON.parse(responseData);
              res.json(result);
              resolve();
            } catch (e) {
              console.error('❌ [8443-EXTRAIR-UPLOAD] Erro ao parsear resposta:', e.message);
              res.status(500).json({
                error: 'Erro ao processar resposta',
                status: 500,
                details: responseData.substring(0, 200)
              });
              resolve();
            }
          } else {
            console.error('❌ [8443-EXTRAIR-UPLOAD] Erro na API 3004:', proxyRes.statusCode, responseData);
            res.status(proxyRes.statusCode || 500).json({
              error: 'Erro ao processar extrato',
              status: proxyRes.statusCode || 500,
              details: responseData
            });
            resolve();
          }
        });
      });
      
      proxyReq.on('error', (error) => {
        console.error('❌ [8443-EXTRAIR-UPLOAD] Erro no proxy:', error.message);
        
        // Remover arquivo temporário em caso de erro
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (e) {
          // Ignorar
        }
        
        res.status(500).json({
          error: 'Erro ao fazer proxy para API 3004',
          status: 500,
          details: error.message
        });
        resolve();
      });
      
      // Enviar FormData - IMPORTANTE: pipe e aguardar completion
      formData.pipe(proxyReq);
      
      // Aguardar que o formData termine de enviar antes de fechar
      formData.on('end', () => {
        console.log('✅ [8443-EXTRAIR-UPLOAD] FormData enviado completamente');
      });
      
      formData.on('error', (err) => {
        console.error('❌ [8443-EXTRAIR-UPLOAD] Erro no FormData:', err.message);
        proxyReq.destroy();
        
        // Remover arquivo temporário em caso de erro
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (e) {
          // Ignorar
        }
        
        res.status(500).json({
          error: 'Erro ao enviar FormData',
          status: 500,
          details: err.message
        });
        resolve();
      });
    });
    
  } catch (err) {
    console.error('❌ [8443-EXTRAIR-UPLOAD] Erro:', err);
    console.error('❌ [8443-EXTRAIR-UPLOAD] Stack:', err.stack);
    
    // Remover arquivo temporário em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('⚠️ [8443-EXTRAIR-UPLOAD] Erro ao remover arquivo temporário:', e.message);
      }
    }
    
    res.status(500).json({ 
      error: err.message || 'Erro interno ao processar upload'
    });
  }
});

// Endpoint para calcular simulação (proxy para API 3004)
app.get('/calcular/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { idoportunidade } = req.query;
    console.log('🧮 [8443] Proxy calcular para fileId:', fileId, idoportunidade ? `idoportunidade: ${idoportunidade}` : '');

    // Montar URL com query params se houver idoportunidade
    let url = `http://127.0.0.1:3004/calcular/${fileId}`;
    if (idoportunidade) {
      url += `?idoportunidade=${encodeURIComponent(idoportunidade)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || 'Erro ao calcular simulação' };
      }
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    console.log('✅ [8443] Cálculo realizado com sucesso');
    res.json(data);
    
  } catch (error) {
    console.error('❌ [8443] Erro no proxy calcular:', error);
    res.status(500).json({ error: error.message });
  }
});

// NOTA: A rota GET /api/proposta foi movida para logo após o health check para garantir que seja encontrada primeiro

// Endpoint para buscar proposta específica por path param (compatibilidade - deve vir DEPOIS da rota sem params)
app.get('/api/proposta/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📄 [8443-PROPOSTA-GET-PATH] Buscando proposta ID (path param):', id);
    
    const propostasDir = '/root/api-lunas/var/data/propostas';
    const propostaFile = path.join(propostasDir, `${id}.json`);
    
    if (fs.existsSync(propostaFile)) {
      try {
        const propostaData = JSON.parse(await fsp.readFile(propostaFile, 'utf-8'));
        console.log('✅ [8443-PROPOSTA-GET-PATH] Proposta encontrada!');
        
        return res.json({
          success: true,
          proposta: propostaData
        });
      } catch (parseError) {
        console.error('❌ [8443-PROPOSTA-GET-PATH] Erro ao ler arquivo:', parseError);
        return res.status(500).json({ 
          success: false,
          error: 'Erro ao ler proposta',
          details: parseError.message
        });
      }
    } else {
      console.warn('⚠️ [8443-PROPOSTA-GET-PATH] Arquivo não encontrado:', propostaFile);
      return res.status(404).json({ 
        success: false,
        error: 'Proposta não encontrada',
        id: id
      });
    }
    
  } catch (error) {
    console.error('❌ [8443-PROPOSTA-GET-PATH] Erro ao buscar proposta:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Endpoint para obter extrato raw (proxy para API 3004)
app.get('/extrato/:fileId/raw', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('📄 [8443] Proxy extrato raw para fileId:', fileId);

    // Fazer proxy para o PM2 server-real-3004
    const response = await fetch(`http://127.0.0.1:3004/extrato/${fileId}/raw`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Extrato não encontrado' });
    }

    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('❌ [8443] Erro no proxy extrato raw:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ARQUIVOS ESTÁTICOS (DEPOIS DAS ROTAS DE API) ====================

// Rota específica para detalhes da proposta (ANTES do express.static)
app.get('/detalhesdaproposta/:id', (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📄 [8443-DETALHES] Acessando proposta: ${id}`);
        
        // Servir o arquivo HTML de detalhes da proposta
        const htmlPath = path.join(INSS_TESTS_DIR, 'detalhesdaproposta.html');
        
        if (!fs.existsSync(htmlPath)) {
            console.error(`❌ [8443-DETALHES] Arquivo não encontrado: ${htmlPath}`);
            return res.status(404).json({ 
                error: 'Página não encontrada',
                path: htmlPath
            });
        }
        
        console.log(`✅ [8443-DETALHES] Servindo arquivo: ${htmlPath}`);
        res.sendFile(htmlPath);
    } catch (error) {
        console.error('❌ [8443-DETALHES] Erro ao servir detalhes da proposta:', error);
        res.status(500).json({ error: 'Erro ao carregar página' });
    }
});

// Rota específica para o simulador (ANTES do express.static)
app.get('/simulador.html', (req, res) => {
    const simuladorPath = path.join(INSS_DIR, 'simulador.html');
    if (fs.existsSync(simuladorPath)) {
        res.sendFile(simuladorPath);
    } else {
        res.status(404).json({ error: 'Simulador não encontrado' });
    }
});

// Rota específica para teste da API (ANTES do express.static)
app.get('/teste-api.html', (req, res) => {
    const testePath = path.join(INSS_DIR, 'teste-api.html');
    if (fs.existsSync(testePath)) {
        res.sendFile(testePath);
    } else {
        res.status(404).json({ error: 'Página de teste não encontrada' });
    }
});

// Rota específica para formulário do cliente (ANTES do express.static)
// Rota específica para a página de sucesso
app.get('/operacional/formulario-sucesso.html', (req, res) => {
    try {
        console.log('✅ [8443-SUCESSO] Acessando página de sucesso');
        
        const sucessoPath = path.join(INSS_TESTS_DIR, 'formulario-sucesso.html');
        
        if (!fs.existsSync(sucessoPath)) {
            console.error(`❌ [8443-SUCESSO] Arquivo não encontrado: ${sucessoPath}`);
            return res.status(404).json({ 
                error: 'Página de sucesso não encontrada',
                path: sucessoPath
            });
        }
        
        console.log(`✅ [8443-SUCESSO] Servindo arquivo: ${sucessoPath}`);
        res.sendFile(sucessoPath);
    } catch (error) {
        console.error('❌ [8443-SUCESSO] Erro ao servir página de sucesso:', error);
        res.status(500).json({ error: 'Erro ao carregar página de sucesso' });
    }
});

app.get('/operacional/formulario-cliente.html', (req, res) => {
    try {
        console.log('📋 [8443-FORMULARIO] Acessando formulário de cliente');
        
        // Servir o arquivo HTML do formulário
        const formularioPath = path.join(INSS_TESTS_DIR, 'formulario-cliente.html');
        
        if (!fs.existsSync(formularioPath)) {
            console.error(`❌ [8443-FORMULARIO] Arquivo não encontrado: ${formularioPath}`);
            return res.status(404).json({ 
                error: 'Formulário não encontrado',
                path: formularioPath
            });
        }
        
        console.log(`✅ [8443-FORMULARIO] Servindo arquivo: ${formularioPath}`);
        res.sendFile(formularioPath);
    } catch (error) {
        console.error('❌ [8443-FORMULARIO] Erro ao servir formulário:', error);
        res.status(500).json({ error: 'Erro ao carregar formulário' });
    }
});

// Rota específica para JavaScript do formulário
app.get('/operacional/formulario-cliente.js', (req, res) => {
    try {
        console.log('📋 [8443-JS] Requisição para /operacional/formulario-cliente.js');
        const jsPath = path.join(INSS_TESTS_DIR, 'formulario-cliente.js');
        if (fs.existsSync(jsPath)) {
            res.setHeader('Content-Type', 'application/javascript');
            res.sendFile(jsPath);
        } else {
            console.error(`❌ [8443-JS] Arquivo não encontrado: ${jsPath}`);
            res.status(404).json({ error: 'JavaScript do formulário não encontrado' });
        }
    } catch (error) {
        console.error('❌ [8443-JS] Erro ao servir JavaScript do formulário:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao carregar JavaScript' });
    }
});

// Rota específica para /INSS/* (caminho usado pelo HTML)
// IMPORTANTE: Usar rota específica em vez de middleware geral para evitar conflitos
// Adicionado Cache-Control para forçar refresh de JS atualizado
app.use('/INSS', express.static(INSS_DIR, {
  index: false,
  fallthrough: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.mjs')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// NÃO usar express.static geral - isso estava causando conflito com as rotas de API
// Servir arquivos estáticos apenas via rotas específicas acima

// ================== ENDPOINT PARA SALVAR LINK DA PROPOSTA NA KENTRO ==================
app.post('/api/kentro/salvar-link-proposta', async (req, res) => {
  try {
    console.log('🔗 [KENTRO-LINK] ==========================================');
    console.log('🔗 [KENTRO-LINK] Rota POST /api/kentro/salvar-link-proposta CHAMADA!');
    console.log('🔗 [KENTRO-LINK] Body recebido:', JSON.stringify(req.body, null, 2));
    
    const { propostaId, kentroId } = req.body;
    
    console.log('🔗 [KENTRO-LINK] propostaId:', propostaId);
    console.log('🔗 [KENTRO-LINK] kentroId:', kentroId);
    
    if (!propostaId) {
      return res.status(400).json({ 
        success: false,
        error: 'propostaId é obrigatório'
      });
    }
    
    if (!kentroId) {
      return res.status(400).json({ 
        success: false,
        error: 'kentroId é obrigatório'
      });
    }
    
    // Gerar link completo da proposta
    const dominioBase = 'https://inss.lunasdigital.com.br:8443';
    const linkCompleto = `${dominioBase}/detalhesdaproposta/${propostaId}`;
    
    console.log('🔗 [KENTRO-LINK] Link gerado:', linkCompleto);
    
    // Configurações da API Kentro
    const baseUrl = 'https://lunasdigital.atenderbem.com/int';
    const queueId = 25;
    const apiKey = 'cd4d0509169d4e2ea9177ac66c1c9376';
    
    // 1. Buscar dados atuais da oportunidade
    console.log('🔍 [KENTRO-LINK] Buscando oportunidade atual...');
    const getOpportunityResponse = await fetch(`${baseUrl}/getOpportunity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        apiKey: apiKey,
        queueId: parseInt(queueId),
        id: kentroId.toString()
      })
    });
    
    if (!getOpportunityResponse.ok) {
      const errorText = await getOpportunityResponse.text();
      console.error('❌ [KENTRO-LINK] Erro ao buscar oportunidade:', getOpportunityResponse.status, errorText);
      return res.status(getOpportunityResponse.status).json({
        success: false,
        error: 'Erro ao buscar oportunidade na Kentro',
        status: getOpportunityResponse.status,
        details: errorText
      });
    }
    
    const oportunidade = await getOpportunityResponse.json();
    console.log('✅ [KENTRO-LINK] Oportunidade encontrada');
    
    // 2. Preparar formsdata atualizado
    const formsdataAtual = oportunidade.formsdata || {};
    const formsdataAtualizado = {
      ...formsdataAtual,
      ebe603f0: linkCompleto
    };
    
    console.log('📤 [KENTRO-LINK] Atualizando campo ebe603f0 com link:', linkCompleto);
    
    // 3. Atualizar campo ebe603f0 na Kentro
    const updateResponse = await fetch(`${baseUrl}/updateOpportunity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        apiKey: apiKey,
        id: kentroId.toString(),
        queueId: parseInt(queueId),
        formsdata: formsdataAtualizado
      })
    });
    
    if (!updateResponse.ok || updateResponse.status !== 200) {
      const errorText = await updateResponse.text();
      console.error('❌ [KENTRO-LINK] Erro ao atualizar campo ebe603f0:', updateResponse.status, errorText);
      return res.status(updateResponse.status).json({
        success: false,
        error: 'Erro ao atualizar campo ebe603f0 na Kentro',
        status: updateResponse.status,
        details: errorText
      });
    }
    
    const updateResult = await updateResponse.json();
    console.log('✅ [KENTRO-LINK] Campo ebe603f0 atualizado com sucesso!');
    
    // 4. Verificar se foi salvo corretamente (aguardar 1 segundo)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const verifyResponse = await fetch(`${baseUrl}/getOpportunity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        apiKey: apiKey,
        queueId: parseInt(queueId),
        id: kentroId.toString()
      })
    });
    
    let linkVerificado = null;
    if (verifyResponse.ok) {
      const verifiedOportunidade = await verifyResponse.json();
      linkVerificado = verifiedOportunidade.formsdata?.ebe603f0;
      console.log('🔍 [KENTRO-LINK] Link verificado:', linkVerificado);
    }
    
    console.log('🔗 [KENTRO-LINK] ==========================================');
    
    res.json({
      success: true,
      message: 'Link salvo com sucesso na Kentro',
      propostaId: propostaId,
      kentroId: kentroId,
      link: linkCompleto,
      linkVerificado: linkVerificado,
      verificado: linkVerificado === linkCompleto
    });
    
  } catch (error) {
    console.error('❌ [KENTRO-LINK] Erro:', error);
    console.error('❌ [KENTRO-LINK] Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao salvar link na Kentro',
      message: error.message
    });
  }
});

// ================== ENDPOINT PARA ATUALIZAR FASE DA PROPOSTA NA KENTRO ==================
app.post('/api/kentro/atualizar-fase', async (req, res) => {
  try {
    console.log('🚨🚨🚨 [KENTRO-FASE] ==========================================');
    console.log('🚨 [KENTRO-FASE] Rota POST /api/kentro/atualizar-fase CHAMADA!');
    console.log('🚨 [KENTRO-FASE] Method:', req.method);
    console.log('🚨 [KENTRO-FASE] URL:', req.url);
    console.log('🚨 [KENTRO-FASE] Path:', req.path);
    console.log('🚨 [KENTRO-FASE] Content-Type:', req.get('Content-Type'));
    console.log('🚨 [KENTRO-FASE] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🚨 [KENTRO-FASE] Body recebido (raw):', JSON.stringify(req.body, null, 2));
    
    const { kentroId, destStageId } = req.body;
    
    console.log('🚨 [KENTRO-FASE] kentroId extraído:', kentroId);
    console.log('🚨 [KENTRO-FASE] destStageId extraído:', destStageId);
    
    if (!kentroId || !destStageId) {
      return res.status(400).json({ 
        error: 'kentroId e destStageId são obrigatórios',
        received: { kentroId, destStageId }
      });
    }

    const baseUrl = 'https://lunasdigital.atenderbem.com/int';
    const queueId = 25;
    const apiKey = 'cd4d0509169d4e2ea9177ac66c1c9376';
    
    console.log(`[8443] [KENTRO-FASE] Movendo oportunidade ${kentroId} para fase ${destStageId}`);
    
    // Preparar dados para changeOpportunityStage (igual ao CLT - usando JSON)
    const fluxoData = {
      queueId: parseInt(queueId),
      apiKey: apiKey,
      id: kentroId.toString(),
      destStageId: parseInt(destStageId)
    };
    
    console.log(`[8443] [KENTRO-FASE] Chamando API Kentro: ${baseUrl}/changeOpportunityStage`);
    console.log(`[8443] [KENTRO-FASE] Dados enviados:`, JSON.stringify(fluxoData, null, 2));
    
    const kentroResponse = await fetch(`${baseUrl}/changeOpportunityStage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'INSS-API/1.0.0'
      },
      body: JSON.stringify(fluxoData)
    });
    
    if (!kentroResponse.ok) {
      const errorText = await kentroResponse.text();
      console.error(`[8443] [KENTRO-FASE] Erro na API Kentro: ${kentroResponse.status}`, errorText);
      return res.status(kentroResponse.status).json({
        error: 'Erro ao atualizar fase na Kentro',
        status: kentroResponse.status,
        details: errorText
      });
    }
    
    const kentroData = await kentroResponse.json();
    console.log('[8443] [KENTRO-FASE] Fase atualizada com sucesso:', kentroData);
    
    res.json({
      success: true,
      message: 'Fase da proposta atualizada com sucesso na Kentro',
      kentroId: kentroId,
      destStageId: destStageId,
      response: kentroData
    });
    
  } catch (err) {
    console.error('[8443] [KENTRO-FASE] Erro:', err);
    console.error('[8443] [KENTRO-FASE] Stack:', err.stack);
    res.status(500).json({ 
      error: err.message || 'Erro interno ao atualizar fase na Kentro'
    });
  }
});

// ================== ENDPOINTS PARA EDITOR DE ROTEIRO ==================

// GET - Carregar roteiro de bancos
app.get('/api/roteiro-bancos', (req, res) => {
  try {
    console.log('📋 [ROTEIRO] GET /api/roteiro-bancos chamado');
    
    // USAR O MESMO ARQUIVO QUE O CALCULO.JS IMPORTA
    const roteiroPath = path.join(INSS_DIR, 'roteiro-bancos-simulador.js');
    console.log('📋 [ROTEIRO] Caminho do arquivo:', roteiroPath);
    
    if (!fs.existsSync(roteiroPath)) {
      console.error('❌ [ROTEIRO] Arquivo não encontrado:', roteiroPath);
      return res.status(404).json({ error: 'Arquivo de roteiro não encontrado' });
    }
    
    // Ler o arquivo e extrair o objeto RoteiroBancosSimulador
    const conteudo = fs.readFileSync(roteiroPath, 'utf-8');
    
    // Extrair JSON do arquivo JavaScript
    const match = conteudo.match(/export const RoteiroBancosSimulador = ({[\s\S]*?});/);
    if (!match) {
      console.error('❌ [ROTEIRO] Não foi possível extrair o roteiro do arquivo');
      return res.status(500).json({ error: 'Erro ao processar arquivo de roteiro' });
    }
    
    // Converter para JSON válido
    const roteiroStr = match[1]
      .replace(/(\w+):/g, '"$1":') // Adicionar aspas nas chaves
      .replace(/'/g, '"'); // Trocar aspas simples por duplas
    
    const roteiro = JSON.parse(roteiroStr);
    
    console.log('✅ [ROTEIRO] Roteiro carregado com sucesso');
    console.log('✅ [ROTEIRO] Bancos disponíveis:', Object.keys(roteiro));
    
    res.json(roteiro);
    
  } catch (error) {
    console.error('❌ [ROTEIRO] Erro ao carregar roteiro:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar roteiro', 
      message: error.message 
    });
  }
});

// POST - Salvar roteiro de bancos
app.post('/api/roteiro-bancos', async (req, res) => {
  try {
    console.log('💾 [ROTEIRO] POST /api/roteiro-bancos chamado');
    
    const roteiro = req.body;
    
    if (!roteiro || typeof roteiro !== 'object') {
      return res.status(400).json({ error: 'Roteiro inválido' });
    }
    
    // USAR O MESMO ARQUIVO QUE O CALCULO.JS IMPORTA
    const roteiroPath = path.join(INSS_DIR, 'roteiro-bancos-simulador.js');
    const backupPath = path.join(INSS_DIR, `roteiro-bancos-backup-${Date.now()}.js`);
    
    // Fazer backup do arquivo atual
    if (fs.existsSync(roteiroPath)) {
      fs.copyFileSync(roteiroPath, backupPath);
      console.log('💾 [ROTEIRO] Backup criado:', backupPath);
    }
    
    // Gerar conteúdo do arquivo JavaScript
    const conteudo = `// roteiro-bancos-simulador.js
// Roteiro de bancos para simulação INSS

export const RoteiroBancosSimulador = ${JSON.stringify(roteiro, null, 2)};

// Função para bancos permitidos por espécie
export function bancosPermitidosPorEspecie(especie) {
  if (especie === "87") return ["BRB", "PICPAY", "C6", "FACTA"];
  if (especie === "88") return ["BRB", "PICPAY", "C6", "FACTA"];
  return ["BRB", "DAYCOVAL", "C6", "PICPAY", "FACTA"];
}

// Função para validar espécie para roteiro
export function validarEspecieParaRoteiro(especie, roteiro) {
  if (!roteiro || !roteiro.especiesAceitas) return true;

  const ea = roteiro.especiesAceitas;
  if (ea.todas === true) {
    if (Array.isArray(ea.exceto) && ea.exceto.includes(String(especie))) {
      return false;
    }
    return true;
  }

  if (ea.todas === false) {
    if (Array.isArray(ea.permitidas)) {
      return ea.permitidas.includes(String(especie));
    }
    return false;
  }

  return true;
}
`;
    
    // Salvar arquivo
    fs.writeFileSync(roteiroPath, conteudo, 'utf-8');
    
    console.log('✅ [ROTEIRO] Roteiro salvo com sucesso');
    console.log('✅ [ROTEIRO] Arquivo:', roteiroPath);
    
    res.json({ 
      success: true, 
      message: 'Roteiro salvo com sucesso',
      backup: backupPath
    });
    
  } catch (error) {
    console.error('❌ [ROTEIRO] Erro ao salvar roteiro:', error);
    res.status(500).json({ 
      error: 'Erro ao salvar roteiro', 
      message: error.message 
    });
  }
});

// ================== ENDPOINTS PARA CONFIGURAÇÃO DE BANCOS ==================

// GET - Carregar configuração de bancos (ordem e status)
app.get('/api/config-bancos', (req, res) => {
  try {
    console.log('🏦 [CONFIG-BANCOS] GET /api/config-bancos chamado');
    
    const configPath = path.join(INSS_DIR, 'config', 'config-bancos.js');
    console.log('🏦 [CONFIG-BANCOS] Caminho do arquivo:', configPath);
    
    if (!fs.existsSync(configPath)) {
      console.error('❌ [CONFIG-BANCOS] Arquivo não encontrado:', configPath);
      return res.status(404).json({ error: 'Arquivo de configuração não encontrado' });
    }
    
    // Ler o arquivo e extrair o objeto ConfigBancos
    const conteudo = fs.readFileSync(configPath, 'utf-8');
    
    // Extrair JSON do arquivo JavaScript
    const matchOrdem = conteudo.match(/ordemPrioridade:\s*\[([\s\S]*?)\]/);
    const matchStatus = conteudo.match(/statusBancos:\s*\{([\s\S]*?)\}/);
    
    if (!matchOrdem || !matchStatus) {
      console.error('❌ [CONFIG-BANCOS] Não foi possível extrair a configuração do arquivo');
      return res.status(500).json({ error: 'Erro ao processar arquivo de configuração' });
    }
    
    // Processar ordem de prioridade
    const ordemPrioridade = matchOrdem[1]
      .split(',')
      .map(b => b.trim().replace(/['"]/g, ''))
      .filter(b => b);
    
    // Processar status dos bancos
    const statusBancos = {};
    const statusLines = matchStatus[1].split(',');
    statusLines.forEach(line => {
      const match = line.match(/["']([^"']+)["']\s*:\s*(true|false)/);
      if (match) {
        statusBancos[match[1]] = match[2] === 'true';
      }
    });
    
    const config = {
      ordemPrioridade,
      statusBancos
    };
    
    console.log('✅ [CONFIG-BANCOS] Configuração carregada:', config);
    res.json(config);
    
  } catch (error) {
    console.error('❌ [CONFIG-BANCOS] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar configuração de bancos',
      message: error.message
    });
  }
});

// POST - Salvar configuração de bancos
app.post('/api/config-bancos', async (req, res) => {
  try {
    console.log('💾 [CONFIG-BANCOS] POST /api/config-bancos chamado');
    
    const { ordemPrioridade, statusBancos } = req.body;
    
    if (!ordemPrioridade || !statusBancos) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    const configPath = path.join(INSS_DIR, 'config', 'config-bancos.js');
    const backupPath = path.join(INSS_DIR, 'config', `config-bancos-backup-${Date.now()}.js`);
    
    // Fazer backup do arquivo atual
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
      console.log('💾 [CONFIG-BANCOS] Backup criado:', backupPath);
    }
    
    // Gerar conteúdo do arquivo JavaScript
    const statusStr = Object.entries(statusBancos)
      .map(([banco, ativo]) => `    "${banco}": ${ativo}`)
      .join(',\n');
    
    const ordemStr = ordemPrioridade
      .map(banco => `    "${banco}"`)
      .join(',\n');
    
    const conteudo = `// config-bancos.js
// Configuração de prioridade e status dos bancos no simulador INSS

export const ConfigBancos = {
  // Ordem de prioridade dos bancos (do mais prioritário para o menos prioritário)
  ordemPrioridade: [
${ordemStr}
  ],
  
  // Status de cada banco (ativo ou inativo)
  statusBancos: {
${statusStr}
  }
};

// Função para obter bancos ativos na ordem de prioridade
export function getBancosAtivos() {
  return ConfigBancos.ordemPrioridade.filter(banco => ConfigBancos.statusBancos[banco]);
}

// Função para obter todos os bancos (ativos e inativos) na ordem de prioridade
export function getTodosBancos() {
  return ConfigBancos.ordemPrioridade;
}

// Função para verificar se um banco está ativo
export function isBancoAtivo(banco) {
  return ConfigBancos.statusBancos[banco] === true;
}

// Função para ativar/desativar um banco
export function setBancoStatus(banco, ativo) {
  if (ConfigBancos.statusBancos.hasOwnProperty(banco)) {
    ConfigBancos.statusBancos[banco] = ativo;
    return true;
  }
  return false;
}

// Função para atualizar ordem de prioridade
export function setOrdemPrioridade(novaOrdem) {
  if (Array.isArray(novaOrdem) && novaOrdem.length === ConfigBancos.ordemPrioridade.length) {
    ConfigBancos.ordemPrioridade = novaOrdem;
    return true;
  }
  return false;
}
`;
    
    // Salvar arquivo
    fs.writeFileSync(configPath, conteudo, 'utf-8');
    
    console.log('✅ [CONFIG-BANCOS] Configuração salva com sucesso');
    console.log('✅ [CONFIG-BANCOS] Arquivo:', configPath);
    
    res.json({ 
      success: true, 
      message: 'Configuração de bancos salva com sucesso',
      backup: backupPath
    });
    
  } catch (error) {
    console.error('❌ [CONFIG-BANCOS] Erro ao salvar:', error);
    res.status(500).json({ 
      error: 'Erro ao salvar configuração de bancos',
      message: error.message
    });
  }
});

// ================== ENDPOINT KENTRO ==================

// Endpoint Kentro
app.get('/api/kentro/oportunidade/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[8443] Buscando oportunidade Kentro ID:', id);

    const baseUrl = 'https://lunasdigital.atenderbem.com/int';
    const queueId = 25;
    const apiKey = 'cd4d0509169d4e2ea9177ac66c1c9376';

    const formData = new URLSearchParams();
    formData.append('queueId', queueId);
    formData.append('apiKey', apiKey);
    formData.append('id', parseInt(id));

    try {
      const kentroResponse = await fetch(`${baseUrl}/getOpportunity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      if (kentroResponse.ok) {
        const kentroData = await kentroResponse.json();
        console.log('[8443] Dados reais recebidos da Kentro:', kentroData);

        return res.json({
          success: true,
          oportunidade: {
            id: id,
            title: kentroData.title || 'Cliente',
            stage: kentroData.stage || 'proposta',
            status: kentroData.status || 'ativo',
            formsdata: kentroData.formsdata || {},
            contact: kentroData.contact || {},
            dadosCompletos: kentroData
          }
        });
      }
    } catch (apiError) {
      console.warn('[8443] Erro ao conectar com API Kentro:', apiError.message);
    }

    // Fallback com dados simulados
    const dadosSimulados = {
      id: id,
      title: 'Cliente Simulado',
      stage: 'proposta',
      status: 'ativo',
      formsdata: {
        nome: '',
        cpf: '',
        email: ''
      }
    };

    console.log('[8443] Retornando dados simulados para ID:', id);
    res.json({
      success: true,
      oportunidade: dadosSimulados,
      simulacao: true
    });

  } catch (error) {
    console.error('[8443] Erro ao buscar oportunidade:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Handler global de erros (sempre retornar JSON, nunca HTML)
// DEVE estar ANTES do app.listen
app.use((err, req, res, next) => {
  console.error('❌ [8443-ERROR HANDLER] Erro capturado:', err.message);
  console.error('❌ [8443-ERROR HANDLER] Stack:', err.stack);
  
  // SEMPRE retornar JSON, nunca HTML
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido',
      message: err.message,
      hint: 'Verifique se o Content-Type é application/json e o JSON está bem formatado',
      receivedContentType: req.get('Content-Type') || 'não informado'
    });
  }
  
  // Outros erros também retornam JSON
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    status: err.status || 500
  });
});

// Handler para rotas não encontradas (sempre retornar JSON)
app.use((req, res) => {
  console.log('❌ [8443-404] Rota não encontrada:', req.method, req.path);
  console.log('❌ [8443-404] URL completa:', req.url);
  console.log('❌ [8443-404] Original URL:', req.originalUrl);
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.path,
    method: req.method,
    url: req.url
  });
});

// Configuração SSL (tentar carregar, mas não falhar se não existir - para rodar localmente)
let httpsOptions = null;
try {
  const sslKeyPath = '/etc/letsencrypt/live/inss.lunasdigital.com.br/privkey.pem';
  const sslCertPath = '/etc/letsencrypt/live/inss.lunasdigital.com.br/fullchain.pem';
  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    httpsOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };
    console.log('✅ [8443] Certificados SSL carregados com sucesso');
  } else {
    console.log('⚠️ [8443] Certificados SSL não encontrados - usando apenas HTTP (modo local)');
  }
} catch (err) {
  console.log('⚠️ [8443] Erro ao carregar certificados SSL - usando apenas HTTP (modo local):', err.message);
}

// Iniciar servidor HTTP (sempre disponível)
app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`🚀 [8443] Servidor HTTP rodando na porta ${HTTP_PORT}`);
  console.log(`🌐 [8443] Acesse: http://localhost:${HTTP_PORT}/INSS/simulador.html`);
  console.log(`🌐 [8443] Exemplo: http://localhost:${HTTP_PORT}/INSS/simulador.html?fileId=7972&idoportunidade=3228`);
});

// Iniciar servidor HTTPS na porta 8443 (apenas se certificados estiverem disponíveis)
if (httpsOptions) {
  try {
    const httpsServer = https.createServer(httpsOptions, app);
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`🔒 [8443] Servidor HTTPS rodando na porta ${HTTPS_PORT}`);
      console.log(`🌐 [8443] Acesse: https://inss.lunasdigital.com.br:${HTTPS_PORT}/simulador.html`);
    });
  } catch (err) {
    console.error('❌ [8443] Erro ao iniciar servidor HTTPS:', err.message);
  }
} else {
  console.log('ℹ️ [8443] Servidor HTTPS não iniciado (certificados não disponíveis - modo local)');
}

export default app;

