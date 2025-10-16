import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const app = express();
const PORT = process.env.PORT || 3004;
const execAsync = promisify(exec);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy para API da Kentro usando curl externo
app.post('/api/kentro-proxy/downloadFile', async (req, res) => {
  try {
    const { queueId, apiKey, fileId, download } = req.body;
    console.log(`🔄 [KENTRO-PROXY] Fazendo proxy para downloadFile: fileId=${fileId}`);
    
    // Usar curl do sistema host via script externo
    const scriptPath = '/app/kentro-proxy.sh';
    const scriptCommand = `${scriptPath} "${queueId}" "${apiKey}" "${fileId}" "${download}"`;
    
    console.log(`🔄 [KENTRO-PROXY] Executando: ${scriptCommand}`);
    
    const { stdout, stderr } = await execAsync(scriptCommand);
    
    if (stderr) {
      console.error(`❌ [KENTRO-PROXY] Erro no script: ${stderr}`);
      throw new Error(`Erro ao executar script: ${stderr}`);
    }
    
    console.log(`✅ [KENTRO-PROXY] Sucesso! Tamanho da resposta: ${stdout.length} caracteres`);
    
    // Retornar a resposta como base64
    res.json({
      success: true,
      data: stdout
    });
    
  } catch (error) {
    console.error('❌ [KENTRO-PROXY] Erro no proxy:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'kentro-proxy' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [KENTRO-PROXY] Servidor rodando na porta ${PORT}`);
  console.log(`🌐 [KENTRO-PROXY] Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 [KENTRO-PROXY] Proxy endpoint: http://localhost:${PORT}/api/kentro-proxy/downloadFile`);
});

export default app;

