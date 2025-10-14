// Config Manager para FGTS Service
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const CONFIG_FILE = 'config.json';

// Carregar configuração do arquivo
export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erro ao carregar config:', error);
  }
  return {};
}

// Salvar configuração no arquivo
export function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Erro ao salvar config:', error);
    return false;
  }
}

// Validar configuração
export function validateConfig(config) {
  const required = ['LUNAS_API_KEY', 'LUNAS_API_URL'];
  const missing = required.filter(key => !config[key]);
  
  return {
    valid: missing.length === 0,
    missing: missing
  };
}

// Sincronizar com variáveis de ambiente
export function syncWithEnv() {
  const config = loadConfig();
  Object.keys(config).forEach(key => {
    if (!process.env[key]) {
      process.env[key] = config[key];
    }
  });
}

// Exportar para arquivo .env
export function exportToEnv() {
  const config = loadConfig();
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  try {
    fs.writeFileSync('.env', envContent);
    return true;
  } catch (error) {
    console.error('Erro ao exportar .env:', error);
    return false;
  }
}

// Inicializar configuração
export function initializeConfig() {
  console.log('🔧 Inicializando configuração FGTS...');
  
  // Carregar .env se existir
  dotenv.config();
  
  // Sincronizar configuração
  syncWithEnv();
  
  console.log('✅ Configuração inicializada');
}
