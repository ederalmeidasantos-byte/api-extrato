import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações do sistema de logs
const LOG_DIR = path.join(__dirname, 'logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'api-errors.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

// Criar diretório de logs se não existir
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Função para formatar timestamp
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').replace('Z', '');
}

// Função para rotacionar logs
function rotateLogs() {
  try {
    if (fs.existsSync(ERROR_LOG_FILE)) {
      const stats = fs.statSync(ERROR_LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        // Mover arquivo atual para .1, .2, etc.
        for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
          const oldFile = `${ERROR_LOG_FILE}.${i}`;
          const newFile = `${ERROR_LOG_FILE}.${i + 1}`;
          if (fs.existsSync(oldFile)) {
            fs.renameSync(oldFile, newFile);
          }
        }
        
        // Mover arquivo atual para .1
        fs.renameSync(ERROR_LOG_FILE, `${ERROR_LOG_FILE}.1`);
        
        console.log(`🔄 Log de erros rotacionado - arquivo anterior movido para ${ERROR_LOG_FILE}.1`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao rotacionar logs:', error.message);
  }
}

// Função principal para logar erros
export function logError(errorData) {
  try {
    const {
      type,           // Tipo do erro (API, AUTH, CACHE, etc.)
      system,         // Sistema (FGTS, V8, LUNAS, etc.)
      operation,      // Operação (consultar, autenticar, etc.)
      cpf,           // CPF relacionado (opcional)
      error,         // Objeto de erro
      requestData,   // Dados da requisição (opcional)
      responseData,  // Dados da resposta (opcional)
      additionalInfo // Informações adicionais
    } = errorData;

    const timestamp = getTimestamp();
    
    // Rotacionar logs se necessário
    rotateLogs();

    // Montar log entry
    const logEntry = {
      timestamp,
      type: type || 'UNKNOWN',
      system: system || 'UNKNOWN',
      operation: operation || 'UNKNOWN',
      cpf: cpf || null,
      error: {
        message: error?.message || 'Erro desconhecido',
        code: error?.code || error?.status || null,
        stack: error?.stack || null,
        response: error?.response?.data || null,
        config: error?.config ? {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers,
          data: error.config.data
        } : null
      },
      request: requestData || null,
      response: responseData || null,
      additional: additionalInfo || null
    };

    // Converter para string formatada
    const logString = `\n${'='.repeat(80)}
[${timestamp}] ERRO ${type.toUpperCase()} - ${system.toUpperCase()}
Operação: ${operation}
CPF: ${cpf || 'N/A'}
Mensagem: ${logEntry.error.message}
Código: ${logEntry.error.code || 'N/A'}

DETALHES DO ERRO:
${JSON.stringify(logEntry.error, null, 2)}

DADOS DA REQUISIÇÃO:
${JSON.stringify(logEntry.request, null, 2)}

DADOS DA RESPOSTA:
${JSON.stringify(logEntry.response, null, 2)}

INFORMAÇÕES ADICIONAIS:
${JSON.stringify(logEntry.additional, null, 2)}

STACK TRACE:
${logEntry.error.stack || 'N/A'}
${'='.repeat(80)}\n`;

    // Escrever no arquivo
    fs.appendFileSync(ERROR_LOG_FILE, logString, 'utf8');
    
    console.log(`📝 Erro logado: ${type} - ${system} - ${operation} - CPF: ${cpf || 'N/A'}`);
    
  } catch (logError) {
    console.error('❌ Erro ao escrever log de erro:', logError.message);
  }
}

// Função para logar erros de API
export function logApiError(system, operation, error, cpf = null, requestData = null, responseData = null) {
  logError({
    type: 'API',
    system,
    operation,
    cpf,
    error,
    requestData,
    responseData
  });
}

// Função para logar erros de autenticação
export function logAuthError(system, operation, error, cpf = null, additionalInfo = null) {
  logError({
    type: 'AUTH',
    system,
    operation,
    cpf,
    error,
    additionalInfo
  });
}

// Função para logar erros de cache
export function logCacheError(operation, error, cpf = null, additionalInfo = null) {
  logError({
    type: 'CACHE',
    system: 'V8_SISTEMA',
    operation,
    cpf,
    error,
    additionalInfo
  });
}

// Função para logar erros de sistema
export function logSystemError(operation, error, additionalInfo = null) {
  logError({
    type: 'SYSTEM',
    system: 'FGTS_PANEL',
    operation,
    error,
    additionalInfo
  });
}

// Função para logar erros de CRM
export function logCrmError(operation, error, cpf = null, opportunityId = null, additionalInfo = null) {
  logError({
    type: 'CRM',
    system: 'LUNAS',
    operation,
    cpf,
    error,
    additionalInfo: {
      ...additionalInfo,
      opportunityId
    }
  });
}

// Função para listar erros recentes
export function getRecentErrors(limit = 50) {
  try {
    if (!fs.existsSync(ERROR_LOG_FILE)) {
      return [];
    }

    const content = fs.readFileSync(ERROR_LOG_FILE, 'utf8');
    const entries = content.split('='.repeat(80));
    
    // Filtrar entradas vazias e pegar as últimas
    const validEntries = entries.filter(entry => entry.trim().length > 0);
    return validEntries.slice(-limit);
    
  } catch (error) {
    console.error('❌ Erro ao ler logs de erro:', error.message);
    return [];
  }
}

// Função para limpar logs antigos
export function cleanOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const logFiles = files.filter(file => file.startsWith('api-errors.log'));
    
    // Manter apenas os arquivos mais recentes
    if (logFiles.length > MAX_LOG_FILES) {
      const filesToDelete = logFiles
        .map(file => ({
          name: file,
          path: path.join(LOG_DIR, file),
          time: fs.statSync(path.join(LOG_DIR, file)).mtime
        }))
        .sort((a, b) => b.time - a.time)
        .slice(MAX_LOG_FILES);
      
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Log antigo removido: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Erro ao limpar logs antigos:', error.message);
  }
}

// Função para obter estatísticas de erros
export function getErrorStats() {
  try {
    if (!fs.existsSync(ERROR_LOG_FILE)) {
      return { total: 0, byType: {}, bySystem: {} };
    }

    const content = fs.readFileSync(ERROR_LOG_FILE, 'utf8');
    const entries = content.split('='.repeat(80)).filter(entry => entry.trim().length > 0);
    
    const stats = {
      total: entries.length,
      byType: {},
      bySystem: {},
      recent: entries.slice(-10).length
    };

    entries.forEach(entry => {
      const typeMatch = entry.match(/ERRO (\w+) - (\w+)/);
      if (typeMatch) {
        const [, type, system] = typeMatch;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        stats.bySystem[system] = (stats.bySystem[system] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error.message);
    return { total: 0, byType: {}, bySystem: {} };
  }
}

// Limpar logs antigos na inicialização
cleanOldLogs();

console.log('📝 Sistema de log de erros inicializado');
