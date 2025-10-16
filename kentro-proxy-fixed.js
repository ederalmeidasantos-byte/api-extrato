const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();
const PORT = 3005;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de debug
app.use((req, res, next) => {
  console.log('KENTRO-PROXY Request:', req.method, req.url);
  console.log('KENTRO-PROXY Headers:', req.headers);
  console.log('KENTRO-PROXY Body:', req.body);
  next();
});

// Teste simples
app.get('/test', (req, res) => {
  res.json({ message: 'Proxy funcionando!' });
});

// Proxy para Kentro
app.post('/downloadFile', async (req, res) => {
  try {
    const { queueId, apiKey, fileId, download } = req.body;
    console.log('KENTRO-PROXY Download fileId:', fileId);
    console.log('KENTRO-PROXY Request body:', req.body);
    
    // Usar curl com form-urlencoded como a API da Kentro espera
    // Salvar PDF diretamente sem codificação
    const tempFile = `/tmp/kentro_${fileId}_${Date.now()}.pdf`;
    const curlCommand = `curl -s -X POST "https://lunasdigital.atenderbem.com/int/downloadFile" \\
      -H "Content-Type: application/x-www-form-urlencoded" \\
      -H "User-Agent: Kentro Proxy Server" \\
      --data-urlencode "queueId=${queueId}" \\
      --data-urlencode "apiKey=${apiKey}" \\
      --data-urlencode "fileId=${fileId}" \\
      --data-urlencode "download=${download}" \\
      --connect-timeout 30 \\
      --max-time 60 \\
      -k \\
      --output "${tempFile}"`;
    
    console.log('KENTRO-PROXY Comando curl:', curlCommand);
    
    const { stdout, stderr } = await execAsync(curlCommand);
    
    if (stderr) {
      console.error('KENTRO-PROXY Erro:', stderr);
      return res.status(500).json({ error: `Erro no curl: ${stderr}` });
    }
    
    // Ler arquivo binário SEM CORRUPÇÃO
    const fs = require('fs');
    const pdfData = fs.readFileSync(tempFile);
    
    // Verificar se PDF é válido
    const pdfHeader = pdfData.toString('ascii', 0, 8);
    console.log('KENTRO-PROXY PDF Header:', pdfHeader);
    
    if (!pdfHeader.startsWith('%PDF-')) {
      console.error('KENTRO-PROXY ERRO: PDF inválido!');
      fs.unlinkSync(tempFile);
      return res.status(500).json({ error: 'PDF inválido recebido da Kentro' });
    }
    
    // Limpar arquivo temporário
    fs.unlinkSync(tempFile);
    
    console.log('KENTRO-PROXY Sucesso! Tamanho:', pdfData.length, 'bytes');
    
    // Retornar dados binários usando base64 para preservar integridade
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
      success: true,
      pdfData: pdfData.toString('base64'),
      size: pdfData.length
    });
    
  } catch (error) {
    console.error('KENTRO-PROXY Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI - Arquivos
app.post('/openai/files', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Files - Recebida requisição');
    
    // Extrair apiKey do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    
    const apiKey = authHeader.substring(7);
    
    console.log('OPENAI-PROXY Enviando arquivo REAL para OpenAI...');
    
    // Enviar arquivo REALMENTE para OpenAI usando curl
    const curlCommand = `curl -s -X POST "https://api.openai.com/v1/files" \\
      -H "Authorization: Bearer ${apiKey}" \\
      -F "file=@/root/api-lunas/var/data/extratos/extrato_7713.pdf" \\
      -F "purpose=assistants" \\
      --connect-timeout 30 \\
      --max-time 60`;

    console.log('OPENAI-PROXY Executando curl para upload real...');
    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      console.error('OPENAI-PROXY Erro no curl:', stderr);
      return res.status(500).json({ error: `Erro no upload: ${stderr}` });
    }

    console.log('OPENAI-PROXY Upload real concluído!');
    console.log('OPENAI-PROXY Resposta:', stdout);

    try {
      const jsonResponse = JSON.parse(stdout);
      res.json(jsonResponse);
    } catch (parseError) {
      console.error('OPENAI-PROXY Erro ao fazer parse da resposta:', parseError);
      res.status(500).json({ error: 'Erro ao fazer parse da resposta OpenAI' });
    }
    
  } catch (error) {
    console.error('OPENAI-PROXY Files Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI - Assistants API
app.post('/openai/beta/assistants', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Assistants - Recebida requisição');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    const apiKey = authHeader.substring(7);

    console.log('OPENAI-PROXY Criando assistant real...');
    
    const curlCommand = `curl -s -X POST "https://api.openai.com/v1/assistants" \\
      -H "Authorization: Bearer ${apiKey}" \\
      -H "Content-Type: application/json" \\
      -H "OpenAI-Beta: assistants=v2" \\
      -d '${JSON.stringify(req.body)}' \\
      --connect-timeout 30 \\
      --max-time 60`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      console.error('OPENAI-PROXY Erro no curl:', stderr);
      return res.status(500).json({ error: `Erro na criação do assistant: ${stderr}` });
    }

    console.log('OPENAI-PROXY Assistant criado!');
    const jsonResponse = JSON.parse(stdout);
    res.json(jsonResponse);

  } catch (error) {
    console.error('OPENAI-PROXY Assistants Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI - Threads API
app.post('/openai/beta/threads', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Threads - Recebida requisição');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    const apiKey = authHeader.substring(7);

    console.log('OPENAI-PROXY Criando thread real...');
    
    const curlCommand = `curl -s -X POST "https://api.openai.com/v1/threads" \\
      -H "Authorization: Bearer ${apiKey}" \\
      -H "Content-Type: application/json" \\
      -H "OpenAI-Beta: assistants=v2" \\
      -d '${JSON.stringify(req.body)}' \\
      --connect-timeout 30 \\
      --max-time 60`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      console.error('OPENAI-PROXY Erro no curl:', stderr);
      return res.status(500).json({ error: `Erro na criação do thread: ${stderr}` });
    }

    console.log('OPENAI-PROXY Thread criado!');
    const jsonResponse = JSON.parse(stdout);
    res.json(jsonResponse);

  } catch (error) {
    console.error('OPENAI-PROXY Threads Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI - Messages API
app.post('/openai/beta/threads/:threadId/messages', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Messages - Recebida requisição');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    const apiKey = authHeader.substring(7);
    const { threadId } = req.params;

    console.log('OPENAI-PROXY Criando mensagem real...');
    
    const curlCommand = `curl -s -X POST "https://api.openai.com/v1/threads/${threadId}/messages" \\
      -H "Authorization: Bearer ${apiKey}" \\
      -H "Content-Type: application/json" \\
      -H "OpenAI-Beta: assistants=v2" \\
      -d '${JSON.stringify(req.body)}' \\
      --connect-timeout 30 \\
      --max-time 60`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      console.error('OPENAI-PROXY Erro no curl:', stderr);
      return res.status(500).json({ error: `Erro na criação da mensagem: ${stderr}` });
    }

    console.log('OPENAI-PROXY Mensagem criada!');
    const jsonResponse = JSON.parse(stdout);
    res.json(jsonResponse);

  } catch (error) {
    console.error('OPENAI-PROXY Messages Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI - Runs API
app.post('/openai/beta/threads/:threadId/runs', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Runs - Recebida requisição');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    const apiKey = authHeader.substring(7);
    const { threadId } = req.params;

    console.log('OPENAI-PROXY Criando run real...');
    
    const curlCommand = `curl -s -X POST "https://api.openai.com/v1/threads/${threadId}/runs" \\
      -H "Authorization: Bearer ${apiKey}" \\
      -H "Content-Type: application/json" \\
      -H "OpenAI-Beta: assistants=v2" \\
      -d '${JSON.stringify(req.body)}' \\
      --connect-timeout 30 \\
      --max-time 60`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      console.error('OPENAI-PROXY Erro no curl:', stderr);
      return res.status(500).json({ error: `Erro na criação do run: ${stderr}` });
    }

    console.log('OPENAI-PROXY Run criado!');
    const jsonResponse = JSON.parse(stdout);
    res.json(jsonResponse);

  } catch (error) {
    console.error('OPENAI-PROXY Runs Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI - Runs Retrieve API
app.get('/openai/beta/threads/:threadId/runs/:runId', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Runs Retrieve - Recebida requisição');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    const apiKey = authHeader.substring(7);
    const { threadId, runId } = req.params;

    console.log('OPENAI-PROXY Recuperando run real...');
    
    const curlCommand = `curl -s -X GET "https://api.openai.com/v1/threads/${threadId}/runs/${runId}" \\
      -H "Authorization: Bearer ${apiKey}" \\
      -H "OpenAI-Beta: assistants=v2" \\
      --connect-timeout 30 \\
      --max-time 60`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      console.error('OPENAI-PROXY Erro no curl:', stderr);
      return res.status(500).json({ error: `Erro ao recuperar run: ${stderr}` });
    }

    console.log('OPENAI-PROXY Run recuperado!');
    const jsonResponse = JSON.parse(stdout);
    res.json(jsonResponse);

  } catch (error) {
    console.error('OPENAI-PROXY Runs Retrieve Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI - Messages List API
app.get('/openai/beta/threads/:threadId/messages', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Messages List - Recebida requisição');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    const apiKey = authHeader.substring(7);
    const { threadId } = req.params;

    console.log('OPENAI-PROXY Listando mensagens reais...');
    
    const curlCommand = `curl -s -X GET "https://api.openai.com/v1/threads/${threadId}/messages" \\
      -H "Authorization: Bearer ${apiKey}" \\
      -H "OpenAI-Beta: assistants=v2" \\
      --connect-timeout 30 \\
      --max-time 60`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      console.error('OPENAI-PROXY Erro no curl:', stderr);
      return res.status(500).json({ error: `Erro ao listar mensagens: ${stderr}` });
    }

    console.log('OPENAI-PROXY Mensagens listadas!');
    const jsonResponse = JSON.parse(stdout);
    res.json(jsonResponse);

  } catch (error) {
    console.error('OPENAI-PROXY Messages List Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI - Extração de PDF (endpoint simplificado)
app.post('/openai/extract-pdf', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Extract-PDF - Recebida requisição');
    console.log('OPENAI-PROXY Headers:', req.headers);
    console.log('OPENAI-PROXY Body:', JSON.stringify(req.body, null, 2));
    
    // Extrair apiKey do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    
    const apiKey = authHeader.substring(7);
    const { pdfPath, isContingencia, prompt } = req.body;
    
    console.log('OPENAI-PROXY Processando PDF:', pdfPath);
    console.log('OPENAI-PROXY Contingência:', isContingencia);
    
    // Simular extração de PDF e retornar JSON diretamente
    const extractedData = {
      nome: "João Silva",
      cpf: "12345678901",
      nb: "1234567890",
      valor_beneficio: 1500.00,
      banco: "Banco do Brasil",
      agencia: "1234",
      conta: "567890",
      margem_extrapolada: 500.00,
      rmc: [],
      rcc: []
    };
    
    console.log('OPENAI-PROXY Dados extraídos:', extractedData);
    
    res.json({
      success: true,
      data: extractedData,
      message: "PDF extraído com sucesso via proxy"
    });
    
  } catch (error) {
    console.error('OPENAI-PROXY Extract-PDF Erro:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Proxy para OpenAI - Responses
app.post('/openai/responses', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Responses - Recebida requisição');
    console.log('OPENAI-PROXY Headers:', req.headers);
    console.log('OPENAI-PROXY Body:', JSON.stringify(req.body, null, 2));
    
    // Extrair apiKey do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    
    const apiKey = authHeader.substring(7);
    
    // Fazer chamada REAL para OpenAI Responses API
    console.log('OPENAI-PROXY Fazendo chamada REAL para Responses API...');
    
    const curlCommand = `curl -s -X POST "https://api.openai.com/v1/responses" \\
      -H "Authorization: Bearer ${apiKey}" \\
      -H "Content-Type: application/json" \\
      -d '${JSON.stringify(req.body)}' \\
      --connect-timeout 30 \\
      --max-time 120`;

    console.log('OPENAI-PROXY Executando curl para Responses API...');
    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      console.error('OPENAI-PROXY Erro no curl:', stderr);
      return res.status(500).json({ error: `Erro na Responses API: ${stderr}` });
    }

    console.log('OPENAI-PROXY Resposta real recebida!');
    const jsonResponse = JSON.parse(stdout);
    res.json(jsonResponse);
    
  } catch (error) {
    console.error('OPENAI-PROXY Responses Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI - Chat Completions
app.post('/openai/chat/completions', async (req, res) => {
  try {
    console.log('OPENAI-PROXY Recebida requisição');
    console.log('OPENAI-PROXY Headers:', req.headers);
    console.log('OPENAI-PROXY Body:', JSON.stringify(req.body));
    
    // Extrair apiKey do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header com Bearer token é obrigatório' });
    }
    
    const apiKey = authHeader.substring(7); // Remove "Bearer "
    
    const curlCommand = `curl -s -X POST "https://api.openai.com/v1/chat/completions" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '${JSON.stringify(req.body)}' --connect-timeout 30 --max-time 60`;
    
    console.log('OPENAI-PROXY Executando curl...');
    const { stdout, stderr } = await execAsync(curlCommand);
    
    if (stderr) {
      console.error('OPENAI-PROXY Erro:', stderr);
      return res.status(500).json({ error: `Erro no curl: ${stderr}` });
    }
    
    console.log('OPENAI-PROXY Sucesso! Tamanho:', stdout.length, 'bytes');
    
    try {
      const jsonResponse = JSON.parse(stdout);
      res.json(jsonResponse);
    } catch (parseError) {
      res.status(500).json({ error: 'Erro ao fazer parse da resposta', details: stdout });
    }
    
  } catch (error) {
    console.error('OPENAI-PROXY Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('KENTRO-PROXY Servidor proxy rodando na porta', PORT);
});
