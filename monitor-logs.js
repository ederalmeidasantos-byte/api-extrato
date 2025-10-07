import fs from 'fs';
import path from 'path';

// Função para monitorar logs em tempo real
function monitorarLogs() {
  const logsDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logsDir, `fgts-${new Date().toISOString().split('T')[0]}.log`);
  
  console.log('🔍 Monitorando logs do FGTS...');
  console.log(`📁 Arquivo: ${logFile}`);
  console.log('📋 Pressione Ctrl+C para sair\n');
  
  // Verificar se arquivo existe
  if (!fs.existsSync(logFile)) {
    console.log('⚠️ Arquivo de log não encontrado. Aguardando criação...');
  }
  
  // Monitorar mudanças no arquivo
  let lastSize = 0;
  
  setInterval(() => {
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      
      if (stats.size > lastSize) {
        const stream = fs.createReadStream(logFile, { start: lastSize });
        let data = '';
        
        stream.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        stream.on('end', () => {
          const lines = data.split('\n').filter(line => line.trim());
          lines.forEach(line => {
            if (line.includes('[WEBHOOK]')) {
              console.log(`🔔 ${line}`);
            } else if (line.includes('[ERROR]')) {
              console.log(`❌ ${line}`);
            } else if (line.includes('[SUCCESS]')) {
              console.log(`✅ ${line}`);
            } else {
              console.log(`📝 ${line}`);
            }
          });
        });
        
        lastSize = stats.size;
      }
    }
  }, 1000); // Verificar a cada segundo
}

// Iniciar monitoramento
monitorarLogs();
