import fs from 'fs';
import path from 'path';

// Criar diretório de logs se não existir
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Função para escrever logs
function writeLog(tipo, mensagem, dados = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    tipo,
    mensagem,
    dados: dados || {}
  };
  
  const logLine = `[${timestamp}] [${tipo}] ${mensagem}${dados ? ' | Dados: ' + JSON.stringify(dados) : ''}\n`;
  
  // Escrever no arquivo de log
  const logFile = path.join(logsDir, `fgts-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, logLine);
  
  // Mostrar no console também
  console.log(`[${tipo}] ${mensagem}`);
  if (dados) {
    console.log('📊 Dados:', JSON.stringify(dados, null, 2));
  }
}

// Função para monitorar webhooks
function monitorarWebhooks() {
  writeLog('INFO', '🔍 Iniciando monitoramento de webhooks');
  
  // Simular webhooks para teste
  setInterval(() => {
    const webhooks = [
      { cpf: '12345678901', status: 'success', valor: 1500.50 },
      { cpf: '98765432100', status: 'fail', erro: 'Não autorizado' },
      { cpf: '11122233344', status: 'success', valor: 2300.75 }
    ];
    
    const webhook = webhooks[Math.floor(Math.random() * webhooks.length)];
    
    writeLog('WEBHOOK', `📨 Webhook recebido - CPF: ${webhook.cpf}`, webhook);
  }, 5000); // A cada 5 segundos
}

// Exportar funções
export { writeLog, monitorarWebhooks };
