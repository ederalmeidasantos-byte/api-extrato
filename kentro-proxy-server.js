const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();
const PORT = 3005;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy para Kentro
app.post('/downloadFile', async (req, res) => {
  try {
    const { queueId, apiKey, fileId, download } = req.body;
    console.log('KENTRO-PROXY Download fileId:', fileId);
    
    const wgetCommand = `wget -q -O - --post-data="queueId=${queueId}&apiKey=${apiKey}&fileId=${fileId}&download=${download}" --header="Content-Type: application/x-www-form-urlencoded" --header="User-Agent: Kentro Proxy Server" --timeout=60 --no-check-certificate "https://lunasdigital.atenderbem.com/int/downloadFile"`;
    
    const { stdout, stderr } = await execAsync(wgetCommand);
    
    if (stderr) {
      console.error('KENTRO-PROXY Erro:', stderr);
      return res.status(500).json({ error: `Erro no wget: ${stderr}` });
    }
    
    console.log('KENTRO-PROXY Sucesso! Tamanho:', stdout.length, 'bytes');
    
    const base64Data = Buffer.from(stdout, 'binary').toString('base64');
    res.json({ success: true, data: base64Data });
    
  } catch (error) {
    console.error('KENTRO-PROXY Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para OpenAI
app.post('/openai/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    console.log('OPENAI-PROXY Endpoint:', endpoint);
    console.log('OPENAI-PROXY Body:', JSON.stringify(req.body));
    
    if (!req.body || !req.body.apiKey) {
      return res.status(400).json({ error: 'apiKey é obrigatório no body' });
    }
    
    const { apiKey, ...body } = req.body;
    
    const curlCommand = `curl -s -X POST "https://api.openai.com/v1/${endpoint}" \\
      -H "Authorization: Bearer ${apiKey}" \\
      -H "Content-Type: application/json" \\
      -d '${JSON.stringify(body)}' \\
      --connect-timeout 30 \\
      --max-time 60`;
    
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
