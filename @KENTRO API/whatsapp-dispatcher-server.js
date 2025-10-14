/**
 * Servidor de Disparo WhatsApp - Sistema Kentro
 * Sistema completo para disparo em massa via API Kentro
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3004', 'https://lunasdigital.com.br'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Configurações
const CONFIG = {
  API_BASE_URL: 'https://lunasdigital.atenderbem.com/int',
  API_KEY: process.env.KENTRO_API_KEY || 'cd4d0509169d4e2ea9177ac66c1c9376',
  DEFAULT_QUEUE_ID: parseInt(process.env.KENTRO_QUEUE_ID) || 25,
  DEFAULT_TEMPLATE_ID: parseInt(process.env.KENTRO_TEMPLATE_ID) || 99,
  DELAY_BETWEEN_DISPATCHES: parseInt(process.env.DISPATCH_DELAY) || 2000, // 2 segundos
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  MAX_BATCH_SIZE: parseInt(process.env.MAX_BATCH_SIZE) || 1000,
  DATA_DIR: path.join(__dirname, 'data')
};

// Garantir que diretório data existe
async function ensureDataDir() {
  try {
    await fs.mkdir(CONFIG.DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Erro ao criar diretório data:', error);
  }
}

// Arquivos de dados
const DATA_FILES = {
  queue: path.join(CONFIG.DATA_DIR, 'dispatcher-queue.json'),
  history: path.join(CONFIG.DATA_DIR, 'dispatcher-history.json'),
  config: path.join(CONFIG.DATA_DIR, 'dispatcher-config.json')
};

// Estado global do sistema
let isProcessing = false;
let currentProcessingId = null;
let sseClients = new Set();

/**
 * Ler dados do arquivo JSON
 */
async function readJsonFile(filePath, defaultValue = {}) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Escrever dados no arquivo JSON
 */
async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Normalizar número de telefone brasileiro
 */
function normalizePhoneNumber(number) {
  // Remove caracteres especiais
  let clean = number.replace(/[^\d]/g, '');
  
  // Se não tem DDI, adiciona 55
  if (clean.length === 11) {
    clean = '55' + clean;
  }
  
  // Valida formato brasileiro (55 + 11 dígitos)
  if (clean.length === 13 && clean.startsWith('55')) {
    return clean;
  }
  
  throw new Error(`Número inválido: ${number}`);
}

/**
 * Mascarar número para exibição
 */
function maskPhoneNumber(number) {
  if (number.length === 13) {
    return number.substring(0, 5) + '****' + number.substring(9);
  }
  return number;
}

/**
 * Enviar evento SSE para todos os clientes conectados
 */
function broadcastSSE(event, data) {
  const message = `data: ${JSON.stringify({ event, data, timestamp: new Date().toISOString() })}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      sseClients.delete(client);
    }
  });
}

/**
 * Fazer disparo via API Kentro
 */
async function sendWhatsAppMessage(item) {
  try {
    const payload = {
      queueId: item.queueId,
      apiKey: CONFIG.API_KEY,
      number: item.number,
      templateId: item.templateId,
      data: item.data
    };

    console.log(`[DISPATCH] Enviando para ${maskPhoneNumber(item.number)}`);
    
    const response = await axios.post(
      `${CONFIG.API_BASE_URL}/sendWaTemplate`,
      payload,
      {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      success: true,
      response: response.data,
      status: response.status
    };

  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 0
    };
  }
}

/**
 * Processar fila de disparos
 */
async function processQueue() {
  if (isProcessing) return;
  
  isProcessing = true;
  currentProcessingId = uuidv4();
  
  try {
    const queueData = await readJsonFile(DATA_FILES.queue, { processing: false, currentIndex: 0, items: [] });
    
    if (queueData.items.length === 0) {
      console.log('[QUEUE] Fila vazia');
      isProcessing = false;
      return;
    }

    console.log(`[QUEUE] Iniciando processamento de ${queueData.items.length} itens`);
    
    // Marcar como processando
    queueData.processing = true;
    await writeJsonFile(DATA_FILES.queue, queueData);
    
    broadcastSSE('queue_started', { total: queueData.items.length });

    for (let i = queueData.currentIndex; i < queueData.items.length; i++) {
      const item = queueData.items[i];
      
      // Atualizar índice atual
      queueData.currentIndex = i;
      await writeJsonFile(DATA_FILES.queue, queueData);
      
      // Marcar como processando
      item.status = 'processing';
      item.attempts = (item.attempts || 0) + 1;
      item.processedAt = new Date().toISOString();
      
      broadcastSSE('item_processing', { 
        index: i, 
        total: queueData.items.length,
        item: { ...item, number: maskPhoneNumber(item.number) }
      });

      // Tentar disparo
      const result = await sendWhatsAppMessage(item);
      
      if (result.success) {
        item.status = 'success';
        item.response = result.response;
        console.log(`[SUCCESS] ${maskPhoneNumber(item.number)}`);
      } else {
        item.error = result.error;
        
        // Se ainda tem tentativas, marca como pending para retry
        if (item.attempts < CONFIG.MAX_RETRIES) {
          item.status = 'pending';
          console.log(`[RETRY] ${maskPhoneNumber(item.number)} - Tentativa ${item.attempts}/${CONFIG.MAX_RETRIES}`);
        } else {
          item.status = 'failed';
          console.log(`[FAILED] ${maskPhoneNumber(item.number)} - ${result.error}`);
        }
      }

      // Salvar atualização
      await writeJsonFile(DATA_FILES.queue, queueData);
      
      // Adicionar ao histórico
      await addToHistory(item, result);
      
      broadcastSSE('item_completed', { 
        index: i, 
        total: queueData.items.length,
        item: { ...item, number: maskPhoneNumber(item.number) },
        result
      });

      // Delay entre disparos
      if (i < queueData.items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_DISPATCHES));
      }
    }

    // Finalizar processamento
    queueData.processing = false;
    queueData.currentIndex = 0;
    await writeJsonFile(DATA_FILES.queue, queueData);
    
    console.log('[QUEUE] Processamento concluído');
    broadcastSSE('queue_completed', { total: queueData.items.length });

  } catch (error) {
    console.error('[QUEUE] Erro no processamento:', error);
    broadcastSSE('queue_error', { error: error.message });
  } finally {
    isProcessing = false;
    currentProcessingId = null;
  }
}

/**
 * Adicionar item ao histórico
 */
async function addToHistory(item, result) {
  try {
    const history = await readJsonFile(DATA_FILES.history, { items: [] });
    
    const historyItem = {
      id: item.id,
      number: maskPhoneNumber(item.number),
      templateId: item.templateId,
      queueId: item.queueId,
      data: item.data,
      status: item.status,
      attempts: item.attempts,
      error: item.error,
      response: item.response,
      createdAt: item.createdAt,
      processedAt: item.processedAt,
      completedAt: new Date().toISOString()
    };
    
    history.items.unshift(historyItem);
    
    // Manter apenas últimos 10000 itens
    if (history.items.length > 10000) {
      history.items = history.items.slice(0, 10000);
    }
    
    await writeJsonFile(DATA_FILES.history, history);
  } catch (error) {
    console.error('[HISTORY] Erro ao salvar histórico:', error);
  }
}

// ===== ENDPOINTS =====

/**
 * GET / - Interface web
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'whatsapp-dispatcher.html'));
});

/**
 * POST /api/disparar - Iniciar disparo em massa
 */
app.post('/api/disparar', async (req, res) => {
  try {
    const { numbers, templateId, queueId, data } = req.body;
    
    // Validações
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ error: 'Lista de números é obrigatória' });
    }
    
    if (numbers.length > CONFIG.MAX_BATCH_SIZE) {
      return res.status(400).json({ 
        error: `Máximo de ${CONFIG.MAX_BATCH_SIZE} números por lote` 
      });
    }

    // Normalizar números
    const normalizedNumbers = [];
    const errors = [];
    
    for (const number of numbers) {
      try {
        const normalized = normalizePhoneNumber(number);
        if (!normalizedNumbers.includes(normalized)) {
          normalizedNumbers.push(normalized);
        }
      } catch (error) {
        errors.push({ number, error: error.message });
      }
    }

    if (normalizedNumbers.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhum número válido encontrado',
        errors 
      });
    }

    // Criar itens da fila
    const queueItems = normalizedNumbers.map(number => ({
      id: uuidv4(),
      number,
      templateId: templateId || CONFIG.DEFAULT_TEMPLATE_ID,
      queueId: queueId || CONFIG.DEFAULT_QUEUE_ID,
      data: data || [],
      status: 'pending',
      attempts: 0,
      error: null,
      response: null,
      createdAt: new Date().toISOString(),
      processedAt: null
    }));

    // Salvar na fila
    const queueData = await readJsonFile(DATA_FILES.queue, { processing: false, currentIndex: 0, items: [] });
    queueData.items = [...queueData.items, ...queueItems];
    await writeJsonFile(DATA_FILES.queue, queueData);

    // Iniciar processamento se não estiver rodando
    if (!isProcessing) {
      setImmediate(processQueue);
    }

    res.json({
      success: true,
      message: `${normalizedNumbers.length} números adicionados à fila`,
      total: queueData.items.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[API] Erro no disparo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/status - Status atual do sistema
 */
app.get('/api/status', async (req, res) => {
  try {
    const queueData = await readJsonFile(DATA_FILES.queue, { processing: false, currentIndex: 0, items: [] });
    
    const stats = {
      total: queueData.items.length,
      pending: queueData.items.filter(item => item.status === 'pending').length,
      processing: queueData.items.filter(item => item.status === 'processing').length,
      success: queueData.items.filter(item => item.status === 'success').length,
      failed: queueData.items.filter(item => item.status === 'failed').length,
      isProcessing,
      currentIndex: queueData.currentIndex,
      processingId: currentProcessingId
    };

    res.json(stats);
  } catch (error) {
    console.error('[API] Erro ao obter status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/historico - Histórico de disparos
 */
app.get('/api/historico', async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const history = await readJsonFile(DATA_FILES.history, { items: [] });
    
    let items = history.items;
    
    // Filtrar por status se especificado
    if (status && status !== 'all') {
      items = items.filter(item => item.status === status);
    }
    
    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedItems = items.slice(startIndex, endIndex);
    
    res.json({
      items: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: items.length,
        totalPages: Math.ceil(items.length / limit)
      }
    });
  } catch (error) {
    console.error('[API] Erro ao obter histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/logs - Stream de logs em tempo real (SSE)
 */
app.get('/api/logs', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Adicionar cliente à lista
  sseClients.add(res);
  
  // Enviar evento de conexão
  res.write(`data: ${JSON.stringify({ 
    event: 'connected', 
    data: { message: 'Conectado ao stream de logs' },
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Remover cliente quando desconectar
  req.on('close', () => {
    sseClients.delete(res);
  });
});

/**
 * POST /api/pause - Pausar processamento
 */
app.post('/api/pause', async (req, res) => {
  try {
    if (!isProcessing) {
      return res.json({ message: 'Nenhum processamento em andamento' });
    }
    
    // Marcar como pausado na fila
    const queueData = await readJsonFile(DATA_FILES.queue);
    queueData.processing = false;
    await writeJsonFile(DATA_FILES.queue, queueData);
    
    res.json({ message: 'Processamento pausado' });
  } catch (error) {
    console.error('[API] Erro ao pausar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/resume - Retomar processamento
 */
app.post('/api/resume', async (req, res) => {
  try {
    if (isProcessing) {
      return res.json({ message: 'Processamento já em andamento' });
    }
    
    // Iniciar processamento
    setImmediate(processQueue);
    
    res.json({ message: 'Processamento retomado' });
  } catch (error) {
    console.error('[API] Erro ao retomar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/queue - Limpar fila
 */
app.delete('/api/queue', async (req, res) => {
  try {
    if (isProcessing) {
      return res.status(400).json({ error: 'Não é possível limpar a fila durante processamento' });
    }
    
    await writeJsonFile(DATA_FILES.queue, { processing: false, currentIndex: 0, items: [] });
    
    res.json({ message: 'Fila limpa com sucesso' });
  } catch (error) {
    console.error('[API] Erro ao limpar fila:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== INICIALIZAÇÃO =====

async function startServer() {
  try {
    await ensureDataDir();
    
    app.listen(PORT, () => {
      console.log(`[SERVER] Disparador WhatsApp rodando na porta ${PORT}`);
      console.log(`[SERVER] Interface: http://localhost:${PORT}`);
      console.log(`[SERVER] API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('[SERVER] Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SERVER] Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});
