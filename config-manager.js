import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho do arquivo de configuração
const CONFIG_FILE = path.join(__dirname, 'config.json');
const BACKUP_FILE = path.join(__dirname, 'config.backup.json');

// Configurações padrão
const DEFAULT_CONFIG = {
  horarioInicio: "08:00",
  horarioFim: "22:00",
  fusoHorario: "America/Sao_Paulo",
  delayBase: 1000,
  delayMin: 500,
  delayMax: 5000,
  taxaErro: 10,
  lunasQueueId: 25,
  lunasStageId: 4,
  lastUpdated: new Date().toISOString()
};

// Carregar configurações do arquivo
export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      
      // Validar e mesclar com padrões
      return {
        ...DEFAULT_CONFIG,
        ...config,
        lastUpdated: config.lastUpdated || new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  }
  
  return DEFAULT_CONFIG;
}

// Salvar configurações no arquivo
export function saveConfig(config) {
  try {
    // Criar backup antes de salvar
    if (fs.existsSync(CONFIG_FILE)) {
      fs.copyFileSync(CONFIG_FILE, BACKUP_FILE);
    }
    
    // Adicionar timestamp
    const configToSave = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    
    // Salvar configuração
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
    
    console.log('✅ Configurações salvas com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    return false;
  }
}

// Restaurar configurações do backup
export function restoreConfig() {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      fs.copyFileSync(BACKUP_FILE, CONFIG_FILE);
      console.log('✅ Configurações restauradas do backup');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao restaurar configurações:', error);
  }
  return false;
}

// Validar configurações
export function validateConfig(config) {
  const errors = [];
  
  // Validar horários
  if (config.horarioInicio >= config.horarioFim) {
    errors.push('Horário de início deve ser menor que horário de fim');
  }
  
  // Validar delays
  if (config.delayBase < config.delayMin || config.delayBase > config.delayMax) {
    errors.push('Delay base deve estar entre delay mínimo e máximo');
  }
  
  if (config.delayMin >= config.delayMax) {
    errors.push('Delay mínimo deve ser menor que delay máximo');
  }
  
  // Validar valores numéricos
  if (config.delayBase < 100 || config.delayBase > 10000) {
    errors.push('Delay base deve estar entre 100 e 10000ms');
  }
  
  if (config.taxaErro < 1 || config.taxaErro > 50) {
    errors.push('Taxa de erro deve estar entre 1 e 50%');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Sincronizar com environment variables
export function syncWithEnv() {
  const config = loadConfig();
  
  // Atualizar env vars se necessário
  if (config.horarioInicio !== process.env.HORARIO_INICIO) {
    process.env.HORARIO_INICIO = config.horarioInicio;
  }
  
  if (config.horarioFim !== process.env.HORARIO_FIM) {
    process.env.HORARIO_FIM = config.horarioFim;
  }
  
  if (config.delayBase !== parseInt(process.env.DELAY_BASE)) {
    process.env.DELAY_BASE = config.delayBase.toString();
  }
  
  console.log('🔄 Configurações sincronizadas com environment variables');
}

// Exportar configurações para environment variables (para Render)
export function exportToEnv() {
  const config = loadConfig();
  
  const envContent = `# Configurações exportadas do painel FGTS - ${new Date().toISOString()}
# Copie estas variáveis para o painel do Render (Environment Variables)

# Configurações de Horário
HORARIO_INICIO=${config.horarioInicio}
HORARIO_FIM=${config.horarioFim}
FUSO_HORARIO=${config.fusoHorario}

# Configurações de Performance
DELAY_BASE=${config.delayBase}
DELAY_MIN=${config.delayMin}
DELAY_MAX=${config.delayMax}
TAXA_ERRO=${config.taxaErro}

# Configurações do Sistema
LUNAS_QUEUE_ID=${config.lunasQueueId}
DEST_STAGE_ID=${config.lunasStageId}

# INSTRUÇÕES PARA DEPLOY NO RENDER:
# 1. Acesse o painel do Render
# 2. Vá em Environment Variables
# 3. Adicione cada variável acima
# 4. Faça o deploy da aplicação
# 
# NOTA: As credenciais (FGTS_USER_1, V8_CLIENT_ID, etc.) 
# devem ser configuradas separadamente no Render
`;

  try {
    fs.writeFileSync(path.join(__dirname, 'config-export.env'), envContent);
    console.log('📤 Configurações exportadas para config-export.env');
    return true;
  } catch (error) {
    console.error('❌ Erro ao exportar configurações:', error);
    return false;
  }
}

// Inicializar configurações na primeira execução
export function initializeConfig() {
  const config = loadConfig();
  syncWithEnv();
  
  console.log('⚙️ Configurações inicializadas:', {
    horario: `${config.horarioInicio}-${config.horarioFim}`,
    delay: `${config.delayBase}ms`,
    fuso: config.fusoHorario
  });
  
  return config;
}
