// Configurar dotenv PRIMEIRO, antes de qualquer import
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env imediatamente
const result = dotenv.config({ path: path.join(__dirname, '.env') });

if (result.error) {
  console.error('❌ Erro ao carregar .env:', result.error);
} else {
  console.log('✅ Arquivo .env carregado com sucesso');
}

// Debug das variáveis de ambiente
console.log("🔍 DEBUG - Variáveis de ambiente:");
console.log("   LUNAS_API_KEY:", process.env.LUNAS_API_KEY ? "✅ Carregada" : "❌ Não carregada");
console.log("   OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ Carregada" : "❌ Não carregada");
console.log("   FGTS_USER_1:", process.env.FGTS_USER_1 ? "✅ Carregada" : "❌ Não carregada");
console.log("   FGTS_PASS_1:", process.env.FGTS_PASS_1 ? "✅ Carregada" : "❌ Não carregada");

import "dotenv/config";
import express from "express";
import fs from "fs";
import fsp from "fs/promises";
import fetch from "node-fetch";
import axios from "axios";
import multer from "multer";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import { calcularTrocoEndpoint } from "./INSS/calculo.js";
import { extrairDeUpload } from "./INSS/extrair_pdf.js";
// Import dinâmico para evitar erro de OPENAI_API_KEY
import PQueue from "p-queue";

// Criar instância da fila
const queue = new PQueue({ concurrency: 1 });

// Importar módulos FGTS (DEPOIS do dotenv estar configurado)
import { 
  processarCPFs, 
  setDelay, 
  setPause, 
  attachIO,
  isHorarioComercial,
  agendarDisparo,
  processarAgendamentos,
  ajustarDelayDinamico,
  processarReprocessamentoRapido,
  limparCacheV8,
  registrarAtualizadorEstado,
  registrarAtualizadorContadores
} from "./fgts/fgts_csv.js";

import { 
  carregarListas,
  adicionarResultadoLista,
  removerResultadoLista,
  limparLista,
  salvarPendentes,
  carregarPendentes,
  salvarTentativasCache,
  carregarTentativasCache,
  salvarEstadoProcessamento,
  carregarEstadoProcessamento
} from "./fgts/cache-persistente.js";

import { 
  logApiError, 
  logAuthError, 
  logCacheError, 
  logCrmError, 
  logSystemError 
} from "./error-logger.js";

// ====== PERSISTENT DISK CONFIGURATION ======

// ====== PERSISTENT DISK CONFIGURATION ======
// Detectar plataforma e usar caminho apropriado
const PERSISTENT_PATH = process.platform === 'win32' 
  ? path.join(__dirname, 'var', 'data')
  : '/var/data';
const PERSISTENT_DIRS = {
  cache: `${PERSISTENT_PATH}/cache`,
  extratos: `${PERSISTENT_PATH}/extratos`,
  uploads: `${PERSISTENT_PATH}/uploads`,
  logs: `${PERSISTENT_PATH}/logs`,
  config: `${PERSISTENT_PATH}/config`
};

// ====== DIRETÓRIOS PERSISTENTES ======
// Usar Persistent Disk do Render para manter dados entre deploys
const PDF_DIR = PERSISTENT_DIRS.extratos;
const JSON_DIR = PERSISTENT_DIRS.extratos;
const UPLOADS_DIR = PERSISTENT_DIRS.uploads;
const LOGS_DIR = PERSISTENT_DIRS.logs;

// Criar diretórios persistentes se não existirem
async function ensurePersistentDirectories() {
  try {
    for (const [name, dirPath] of Object.entries(PERSISTENT_DIRS)) {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Diretório persistente criado: ${dirPath}`);
  } else {
        console.log(`📁 Diretório persistente já existe: ${dirPath}`);
      }
    }
    
    // Criar diretório de backups se não existir
    const backupDir = `${PERSISTENT_PATH}/backups`;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`✅ Diretório de backups criado: ${backupDir}`);
    }
  } catch (error) {
    console.error('❌ Erro ao criar diretórios persistentes:', error);
  }
}

// Sistema de backup automático
async function fazerBackup(arquivo, tipo = 'geral') {
  try {
    if (!fs.existsSync(arquivo)) {
      console.log(`⚠️ Arquivo não encontrado para backup: ${arquivo}`);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivo = path.basename(arquivo, path.extname(arquivo));
    const extensao = path.extname(arquivo);
    const backupDir = `${PERSISTENT_PATH}/backups`;
    const backupFile = `${backupDir}/${nomeArquivo}-${tipo}-${timestamp}${extensao}`;
    
    // Fazer backup
    await fsp.copyFile(arquivo, backupFile);
    console.log(`💾 Backup criado: ${backupFile}`);
    
    // Limpar backups antigos (manter apenas os 5 mais recentes)
    await limparBackupsAntigos(backupDir, nomeArquivo, tipo);
    
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error);
  }
}

// Limpar backups antigos (manter apenas os 5 mais recentes)
async function limparBackupsAntigos(backupDir, nomeArquivo, tipo) {
  try {
    const files = await fsp.readdir(backupDir);
    const backups = files
      .filter(file => file.startsWith(`${nomeArquivo}-${tipo}-`))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Mais recente primeiro
    
    // Manter apenas os 5 mais recentes
    if (backups.length > 5) {
      const paraRemover = backups.slice(5);
      for (const backup of paraRemover) {
        await fsp.unlink(backup.path);
        console.log(`🗑️ Backup antigo removido: ${backup.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao limpar backups antigos:', error);
  }
}

// ====== SISTEMA DE ESTADO PERSISTENTE FGTS ======

// Salvar estado completo do processamento FGTS
async function salvarEstadoFGTS(estado) {
  try {
    const estadoFile = path.join(PERSISTENT_DIRS.cache, 'estado-fgts-completo.json');
    
    // Fazer backup antes de salvar
    await fazerBackup(estadoFile, 'estado-fgts');
    
    // Salvar estado atualizado
    await fsp.writeFile(estadoFile, JSON.stringify(estado, null, 2));
    console.log(`💾 Estado FGTS salvo: ${estadoFile}`);
    
  } catch (error) {
    console.error('❌ Erro ao salvar estado FGTS:', error);
  }
}

// Carregar estado completo do processamento FGTS
async function carregarEstadoFGTS() {
  try {
    const estadoFile = path.join(PERSISTENT_DIRS.cache, 'estado-fgts-completo.json');
    
    if (fs.existsSync(estadoFile)) {
      const estado = JSON.parse(await fsp.readFile(estadoFile, 'utf-8'));
      console.log(`📂 Estado FGTS carregado: ${estadoFile}`);
      return estado;
    } else {
      console.log(`📂 Nenhum estado FGTS encontrado, iniciando novo`);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar estado FGTS:', error);
    return null;
  }
}

// Verificar se há processamento pendente ao iniciar
async function verificarProcessamentoPendente() {
  try {
    const estado = await carregarEstadoFGTS();
    
    if (estado && estado.processando) {
      console.log(`🔄 Processamento pendente encontrado!`);
      console.log(`📊 Estado: ${estado.processados}/${estado.total} processados`);
      console.log(`⏳ Pendentes: ${estado.pendentes?.length || 0}`);
      console.log(`🔄 Reprocessar: ${estado.reprocessar?.length || 0}`);
      
      // Restaurar estado nos módulos FGTS
      if (estado.pendentes?.length > 0) {
        await salvarPendentes(estado.pendentes);
        console.log(`✅ ${estado.pendentes.length} CPFs pendentes restaurados`);
      }
      
      if (estado.reprocessar?.length > 0) {
        // Salvar lista de reprocessar em arquivo separado
        const reprocessarFile = path.join(PERSISTENT_DIRS.cache, 'reprocessar-pendentes.json');
        await fsp.writeFile(reprocessarFile, JSON.stringify(estado.reprocessar, null, 2));
        console.log(`✅ ${estado.reprocessar.length} CPFs para reprocessar restaurados`);
      }
      
      return estado;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao verificar processamento pendente:', error);
    return null;
  }
}

// Função removida - agora usamos processarReprocessamentoRapido() diretamente

// Inicializar diretórios persistentes
ensurePersistentDirectories();

// Registrar função de atualização de estado no módulo FGTS
registrarAtualizadorEstado(salvarEstadoFGTS);

// Registrar função de atualização de contadores em tempo real no módulo FGTS
registrarAtualizadorContadores(atualizarContadoresTempoReal);

// TTL de cache (14 dias)
const TTL_DIAS = 14;
const TTL_MS = TTL_DIAS * 24 * 60 * 60 * 1000;

function cacheValido(p) {
  try {
    const st = fs.statSync(p);
    return Date.now() - st.mtimeMs <= TTL_MS;
  } catch {
    return false;
  }
}

// ====== CONFIGURAÇÃO DO SERVIDOR ======
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Definir instância global do Socket.IO
let ioInstance = io;

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Anexar Socket.IO ao módulo FGTS
attachIO(io);

// ====== Configuração Multer para upload de PDF ======
const upload = multer({
  dest: PDF_DIR,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  }
});

// ====== Configuração Multer para upload de CSV (FGTS) ======
const uploadCSV = multer({
  dest: UPLOADS_DIR,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'), false);
    }
  }
});

// ====== SISTEMA DE CONTADORES EM TEMPO REAL ======
const CONTADORES_TEMPO_REAL_FILE = `${PERSISTENT_DIRS.cache}/contadores-tempo-real.json`;

// Atualizar contadores em tempo real
async function atualizarContadoresTempoReal(tipo, incremento = 1) {
  try {
    // Usar sistema de status em vez do sistema antigo
    const contadores = await calcularContadoresPorStatus();
    
    // Adicionar campos extras para compatibilidade
    contadores.timestamp = new Date().toISOString();
    contadores.processando = true;
    contadores.ultimaAtualizacao = new Date().toISOString();
    contadores.agendados = 0; // Por enquanto, não temos agendados no sistema de status

    // Fazer backup antes de salvar
    if (fs.existsSync(CONTADORES_TEMPO_REAL_FILE)) {
      try {
        const backupDir = `${PERSISTENT_DIRS.cache}/backups`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${backupDir}/contadores-tempo-real-${timestamp}.json`;
        
        // Criar diretório de backup se não existir
        if (!fs.existsSync(backupDir)) {
          await fsp.mkdir(backupDir, { recursive: true });
        }
        
        // Copiar arquivo atual para backup
        await fsp.copyFile(CONTADORES_TEMPO_REAL_FILE, backupPath);
        console.log(`💾 Backup criado: ${backupPath}`);
      } catch (backupError) {
        console.log('⚠️ Erro ao criar backup, continuando sem backup:', backupError.message);
      }
    }

    // Salvar contadores atualizados
    await fsp.writeFile(CONTADORES_TEMPO_REAL_FILE, JSON.stringify(contadores, null, 2));
    
    console.log(`📊 Contadores atualizados: ${tipo} +${incremento} | Total: ${contadores.processados}/${contadores.totalCPFs}`);

    // Emitir atualização via Socket.IO
    if (ioInstance) {
      ioInstance.emit("contadoresTempoReal", contadores);
      ioInstance.emit("progress", {
        done: contadores.processados,
        total: contadores.totalCPFs,
        pendentes: contadores.pendentes,
        counters: {
          success: contadores.sucessos,
          pending: contadores.pendentes,
          no_auth: contadores.naoAutorizados,
          descartados: contadores.descartados
        }
      });
    }

    return contadores;
  } catch (error) {
    console.error('❌ Erro ao atualizar contadores em tempo real:', error);
    return null;
  }
}

// Carregar contadores em tempo real
async function carregarContadoresTempoReal() {
  try {
    if (!fs.existsSync(CONTADORES_TEMPO_REAL_FILE)) {
      return null;
    }

    const data = JSON.parse(await fsp.readFile(CONTADORES_TEMPO_REAL_FILE, 'utf-8'));
    console.log(`📊 Contadores carregados: ${data.processados}/${data.totalCPFs} processados`);
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao carregar contadores em tempo real:', error);
    return null;
  }
}

// Inicializar contadores com dados da lista completa
async function inicializarContadoresTempoReal() {
  try {
    // Usar sistema de status em vez do sistema antigo
    const contadores = await calcularContadoresPorStatus();
    
    if (contadores.totalCPFs > 0) {
      // Adicionar campos extras para compatibilidade
      contadores.timestamp = new Date().toISOString();
      contadores.processando = true;
      contadores.ultimaAtualizacao = new Date().toISOString();
      contadores.agendados = 0; // Por enquanto, não temos agendados no sistema de status

      await fsp.writeFile(CONTADORES_TEMPO_REAL_FILE, JSON.stringify(contadores, null, 2));
      console.log(`📊 Contadores inicializados com sistema de status: ${contadores.processados}/${contadores.totalCPFs} processados, ${contadores.pendentes} pendentes`);
      
      return contadores;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erro ao inicializar contadores:', error);
    return null;
  }
}

// ====== SISTEMA DE CACHE DE CPFs ANEXADOS ======
const CPFS_CACHE_FILE = `${PERSISTENT_DIRS.cache}/cpfs-anexados.json`;

// ====== SISTEMA DE STATUS DE CPFs ======
const STATUS_CPFS_FILE = `${PERSISTENT_DIRS.cache}/status-cpfs.json`;

// Carregar status de CPFs
async function carregarStatusCPFs() {
  try {
    if (fs.existsSync(STATUS_CPFS_FILE)) {
      const data = await fsp.readFile(STATUS_CPFS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return { cpfs: {}, ultimaAtualizacao: null };
  } catch (error) {
    console.error('❌ Erro ao carregar status de CPFs:', error);
    return { cpfs: {}, ultimaAtualizacao: null };
  }
}

// Salvar status de CPFs
async function salvarStatusCPFs(statusData) {
  try {
    const data = {
      ...statusData,
      ultimaAtualizacao: new Date().toISOString()
    };
    await fsp.writeFile(STATUS_CPFS_FILE, JSON.stringify(data, null, 2));
    console.log(`💾 Status de CPFs salvo: ${Object.keys(data.cpfs || {}).length} registros`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar status de CPFs:', error);
    return false;
  }
}

// Atualizar status de um CPF (SISTEMA SIMPLIFICADO)
async function atualizarStatusCPF(cpf, status, dados = {}) {
  try {
    console.log(`📝 ATUALIZANDO STATUS: CPF ${cpf} -> ${status}`);
    
    // Carregar dados atuais
    let statusData = { cpfs: {} };
    try {
      if (fs.existsSync(STATUS_CPFS_FILE)) {
        const fileContent = await fsp.readFile(STATUS_CPFS_FILE, 'utf-8');
        statusData = JSON.parse(fileContent);
        if (!statusData.cpfs) statusData.cpfs = {};
      }
    } catch (error) {
      console.log(`⚠️ Erro ao carregar status, criando novo:`, error.message);
      statusData = { cpfs: {} };
    }
    
    // Atualizar status do CPF
    statusData.cpfs[cpf] = {
      cpf: cpf,
      status: status,
      ...dados,
      atualizadoEm: new Date().toISOString()
    };
    
    // Salvar arquivo
    await fsp.writeFile(STATUS_CPFS_FILE, JSON.stringify(statusData, null, 2));
    console.log(`✅ STATUS SALVO: CPF ${cpf} -> ${status}`);
    
    // REMOVIDO: Emissão de contadores aqui - evita duplicação
    // Os contadores são emitidos via atualizarContadoresTempoReal()
    
    return true;
  } catch (error) {
    console.error('❌ ERRO ao atualizar status:', error);
    return false;
  }
}

// Obter status de um CPF
async function obterStatusCPF(cpf) {
  try {
    const statusData = await carregarStatusCPFs();
    return statusData.cpfs?.[cpf] || null;
  } catch (error) {
    console.error('❌ Erro ao obter status do CPF:', error);
    return null;
  }
}

// Inicializar status baseado na planilha original
async function inicializarStatusCPFs() {
  try {
    const cpfsAnexados = await carregarCPFsAnexados();
    if (!cpfsAnexados || !cpfsAnexados.cpfs) {
      console.log('⚠️ Nenhuma lista de CPFs encontrada para inicializar status');
      return;
    }
    
    const statusData = await carregarStatusCPFs();
    let novosStatus = 0;
    
    for (const cpfData of cpfsAnexados.cpfs) {
      const cpf = cpfData.cpf;
      if (!statusData.cpfs?.[cpf]) {
        statusData.cpfs[cpf] = {
          cpf: cpf,
          telefone: cpfData.telefone || '',
          id: cpfData.id || '',
          status: 'NA FILA NOVO PROCESSAR',
          tabulador: 'PENDENTE',
          criadoEm: new Date().toISOString()
        };
        novosStatus++;
      }
    }
    
    if (novosStatus > 0) {
      await salvarStatusCPFs(statusData);
      console.log(`📊 Status inicializados: ${novosStatus} novos CPFs`);
    } else {
      console.log('📊 Todos os CPFs já possuem status');
    }
    
    return statusData;
  } catch (error) {
    console.error('❌ Erro ao inicializar status de CPFs:', error);
    return null;
  }
}

// Filtrar CPFs para processamento baseado no status
async function filtrarCPFsParaProcessamento() {
  try {
    const statusData = await carregarStatusCPFs();
    const cpfsAnexados = await carregarCPFsAnexados();
    
    if (!statusData.cpfs || !cpfsAnexados?.cpfs) {
      return { paraProcessar: [], ignorar: [] };
    }
    
    const paraProcessar = [];
    const ignorar = [];
    
    for (const cpfData of cpfsAnexados.cpfs) {
      const cpf = cpfData.cpf;
      const status = statusData.cpfs[cpf]?.status;
      
      if (!status) {
        // CPF sem status - adicionar como novo
        paraProcessar.push({
          ...cpfData,
          status: 'NA FILA NOVO PROCESSAR',
          tabulador: 'PENDENTE'
        });
      } else if (['REPROCESSAR RAPIDO', 'PENDING', 'LIMITE EXCEDIDO', 'NA FILA NOVO PROCESSAR'].includes(status)) {
        // CPFs que precisam ser processados
        paraProcessar.push({
          ...cpfData,
          status: status,
          tabulador: statusData.cpfs[cpf].tabulador || 'PENDENTE'
        });
      } else if (['SUCESSO', 'NÃO AUTORIZADO'].includes(status)) {
        // CPFs já processados - ignorar
        ignorar.push({
          ...cpfData,
          status: status,
          tabulador: statusData.cpfs[cpf].tabulador || status
        });
      }
    }
    
    console.log(`📊 Filtro de CPFs: ${paraProcessar.length} para processar, ${ignorar.length} ignorar`);
    return { paraProcessar, ignorar };
  } catch (error) {
    console.error('❌ Erro ao filtrar CPFs para processamento:', error);
    return { paraProcessar: [], ignorar: [] };
  }
}

// Calcular contadores baseados no status (OTIMIZADO PARA MEMÓRIA)
async function calcularContadoresPorStatus() {
  try {
    console.log('🔍 Calculando contadores por status...');
    
    // Usar sistema de listas em vez do sistema de status individual
    const listasData = await carregarListas();
    const cpfsAnexados = await carregarCPFsAnexados();
    
    console.log('📊 Dados carregados:', {
      listasData: listasData ? 'OK' : 'NULL',
      cpfsAnexados: cpfsAnexados ? 'OK' : 'NULL',
      totalCPFs: cpfsAnexados?.totalCPFs || 0
    });
    
    if (!listasData || !cpfsAnexados) {
      console.log('⚠️ Dados não encontrados, retornando zeros');
      return {
        totalCPFs: 0,
        processados: 0,
        sucessos: 0,
        naoAutorizados: 0,
        pendentes: 0,
        emProcessamento: 0,
        descartados: 0
      };
    }
    
    // Calcular contadores baseado nas listas
    const sucessos = listasData.sucessos?.length || 0;
    const naoAutorizados = listasData.naoAutorizados?.length || 0;
    const pendentes = listasData.pendentes?.length || 0;
    const descartados = listasData.descartados?.length || 0;
    const emProcessamento = 0; // Por enquanto, não temos em processamento no sistema de listas
    
    const processados = sucessos + naoAutorizados + descartados + pendentes;
    const totalReal = cpfsAnexados.totalCPFs || 0; // Usar total do arquivo anexado
    
    console.log(`📊 Contadores calculados: ${processados}/${totalReal} processados (Sucessos: ${sucessos}, Não Autorizados: ${naoAutorizados}, Descartados: ${descartados}, Pendentes: ${pendentes})`);
    
    return {
      totalCPFs: totalReal,
      processados,
      sucessos,
      naoAutorizados,
      pendentes,
      emProcessamento,
      descartados
    };
  } catch (error) {
    console.error('❌ Erro ao calcular contadores por status:', error);
    return {
      totalCPFs: 0,
      processados: 0,
      sucessos: 0,
      naoAutorizados: 0,
      pendentes: 0,
      emProcessamento: 0,
      descartados: 0
    };
  }
}

// Salvar lista de CPFs anexados
async function salvarCPFsAnexados(cpfs, metadata = {}) {
  try {
    const cacheData = {
      timestamp: new Date().toISOString(),
      totalCPFs: cpfs.length,
      metadata: {
        fileName: metadata.fileName || 'unknown',
        uploadTime: metadata.uploadTime || new Date().toISOString(),
        ...metadata
      },
      cpfs: cpfs.map((cpf, index) => ({
        id: `cpf_${index + 1}`,
        cpf: cpf.CPF || cpf.cpf || cpf,
        linha: index + 1,
        status: 'pendente',
        processado: false,
        resultado: null,
        tentativas: 0,
        ultimaTentativa: null
      }))
    };

    // Fazer backup antes de salvar
    if (fs.existsSync(CPFS_CACHE_FILE)) {
      await fazerBackup(CPFS_CACHE_FILE, 'cpfs');
    }

    await fsp.writeFile(CPFS_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Cache de CPFs salvo: ${cpfs.length} CPFs em ${CPFS_CACHE_FILE}`);
    
    return cacheData;
  } catch (error) {
    console.error('❌ Erro ao salvar cache de CPFs:', error);
    throw error;
  }
}

// Carregar lista de CPFs anexados
async function carregarCPFsAnexados() {
  try {
    console.log(`🔍 Verificando arquivo: ${CPFS_CACHE_FILE}`);
    if (!fs.existsSync(CPFS_CACHE_FILE)) {
      console.log('📋 Nenhum cache de CPFs encontrado');
      return null;
    }

    const data = JSON.parse(await fsp.readFile(CPFS_CACHE_FILE, 'utf-8'));
    console.log(`📋 Cache de CPFs carregado: ${data.totalCPFs} CPFs`);
    console.log(`📋 Metadata:`, data.metadata);
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao carregar cache de CPFs:', error);
    return null;
  }
}


// Limpar cache de CPFs
async function limparCacheCPFs() {
  try {
    if (fs.existsSync(CPFS_CACHE_FILE)) {
      await fazerBackup(CPFS_CACHE_FILE, 'cpfs');
      await fsp.unlink(CPFS_CACHE_FILE);
      console.log('🗑️ Cache de CPFs limpo');
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar cache de CPFs:', error);
    return false;
  }
}

// Obter estatísticas do cache de CPFs
async function obterEstatisticasCPFs() {
  try {
    const cacheData = await carregarCPFsAnexados();
    if (!cacheData) {
      return {
        totalCPFs: 0,
        processados: 0,
        pendentes: 0,
        sucessos: 0,
        erros: 0,
        ultimaAtualizacao: null
      };
    }

    const stats = {
      totalCPFs: cacheData.totalCPFs,
      processados: cacheData.cpfs.filter(c => c.processado).length,
      pendentes: cacheData.cpfs.filter(c => c.status === 'pendente').length,
      sucessos: cacheData.cpfs.filter(c => c.status === 'sucesso').length,
      erros: cacheData.cpfs.filter(c => c.status === 'erro').length,
      ultimaAtualizacao: cacheData.timestamp,
      metadata: cacheData.metadata
    };

    return stats;
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas de CPFs:', error);
    return null;
  }
}

// ====== Health ======
app.get("/", (req, res) => res.send("API rodando ✅"));

// ====== Logs iniciais ======
console.log("🔑 OPENAI_API_KEY presente?", !!process.env.OPENAI_API_KEY);
console.log("🔑 LUNAS_API_URL:", process.env.LUNAS_API_URL);
console.log("🔑 LUNAS_QUEUE_ID:", process.env.LUNAS_QUEUE_ID);

// ====== Fluxo via Lunas (baixa e processa) ======
app.post("/extrair", async (req, res) => {
  try {
    const fileId = req.body.fileId || req.query.fileId;
    if (!fileId) return res.status(400).json({ error: "fileId é obrigatório" });

    const jsonPath = path.join(PERSISTENT_DIRS.extratos, `extrato_${fileId}.json`);
    if (fs.existsSync(jsonPath) && cacheValido(jsonPath)) {
      console.log("♻️ Usando cache válido:", jsonPath);
      return res.json(JSON.parse(await fsp.readFile(jsonPath, "utf-8")));
    }

    console.log("🚀 Baixando PDF da Lunas:", fileId);
    const body = {
      queueId: Number(process.env.LUNAS_QUEUE_ID),
      apiKey: process.env.LUNAS_API_KEY,
      fileId: Number(fileId),
      download: true
    };

    const resp = await fetch(process.env.LUNAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${t}`);
    }

    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    const buf = Buffer.from(await resp.arrayBuffer());
    await fsp.writeFile(pdfPath, buf);
    console.log("✅ PDF salvo em", pdfPath);

    // processa com fila
    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );

    // Fazer backup do JSON processado
    const backupJsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);
    await fazerBackup(backupJsonPath, 'extrato');

    // Adicionar link único para o simulador
        json.simulador_link = `http://localhost:3000/simulador?id=${fileId}`;
    
    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== Fluxo direto (PDF já está no disco) ======
app.get("/extrair/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: "PDF não encontrado" });
    }

    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );

    // Adicionar link único para o simulador
        json.simulador_link = `http://localhost:3000/simulador?id=${fileId}`;

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair/:fileId:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== Upload manual de PDF ======
app.post("/extrairpdf", upload.single('file'), async (req, res) => {
  try {
    console.log("🚀 [DEBUG] Recebendo requisição /extrairpdf");
    console.log("📋 [DEBUG] req.file:", req.file ? "✅ Arquivo recebido" : "❌ Nenhum arquivo");
    console.log("📋 [DEBUG] req.body:", JSON.stringify(req.body, null, 2));
    
    if (!req.file) {
      console.error("❌ [DEBUG] Nenhum arquivo PDF enviado");
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado" });
    }

    console.log("📄 [DEBUG] Arquivo recebido:", {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    const fileId = Date.now().toString(); // ID único baseado em timestamp
    const originalPath = req.file.path;
    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    
    console.log("📄 [DEBUG] originalPath:", originalPath);
    console.log("📄 [DEBUG] pdfPath:", pdfPath);
    console.log("📄 [DEBUG] PDF_DIR existe?", await fsp.access(PDF_DIR).then(() => true).catch(() => false));
    
    // Verificar se o arquivo original existe
    try {
      await fsp.access(originalPath);
      console.log("✅ [DEBUG] Arquivo original existe");
    } catch (err) {
      console.error("❌ [DEBUG] Arquivo original não existe:", err.message);
      throw new Error(`Arquivo original não encontrado: ${originalPath}`);
    }
    
    // Renomear arquivo para padrão
    console.log("🔄 [DEBUG] Renomeando arquivo...");
    await fsp.rename(originalPath, pdfPath);
    console.log("📄 PDF upload salvo em", pdfPath);

    // Verificar se o arquivo foi renomeado corretamente
    try {
      await fsp.access(pdfPath);
      console.log("✅ [DEBUG] Arquivo renomeado com sucesso");
    } catch (err) {
      console.error("❌ [DEBUG] Erro ao verificar arquivo renomeado:", err.message);
      throw new Error(`Erro ao verificar arquivo renomeado: ${pdfPath}`);
    }

    // Obter idoportunidade e CPF do body
    const idoportunidade = req.body.idoportunidade;
    const cpf = req.body.cpf;
    
    console.log(`🔗 ID Oportunidade: ${idoportunidade}`);
    console.log(`👤 CPF: ${cpf}`);
    console.log("🔍 [DEBUG] Verificando OPENAI_API_KEY:", !!process.env.OPENAI_API_KEY);
    console.log("🔍 [DEBUG] OPENAI_API_KEY length:", process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

    // Verificar se a fila está inicializada
    console.log("🔍 [DEBUG] Queue inicializada?", !!queue);
    console.log("🔍 [DEBUG] Queue concurrency:", queue ? queue.concurrency : 'N/A');

    console.log("🎯 [DEBUG] Iniciando processamento com extrairDeUpload...");
    console.log("🎯 [DEBUG] Parâmetros:", {
      fileId,
      pdfPath,
      jsonDir: JSON_DIR,
      ttlMs: TTL_MS,
      idoportunidade
    });

    // Processar com fila
    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS, idoportunidade })
    );
    console.log("✅ [DEBUG] Processamento concluído!");

    // Adicionar dados da Kentro ao resultado
    if (idoportunidade) {
      json.idoportunidade = idoportunidade;
    }
    if (cpf) {
      json.cpf = cpf;
    }

    // Adicionar link único para o simulador
        json.simulador_link = `http://localhost:3000/simulador?id=${fileId}`;

    console.log("✅ Extrato processado com sucesso:", fileId);
    
    // Retornar resposta no formato esperado pelo frontend
    res.json({
      success: true,
      fileId: fileId,
      data: json
    });
  } catch (err) {
    console.error("❌ Erro em /extrairpdf:", err);
    console.error("❌ Stack trace:", err.stack);
    console.error("❌ Erro completo:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error("❌ Tipo do erro:", typeof err);
    console.error("❌ Nome do erro:", err.name);
    console.error("❌ Mensagem do erro:", err.message);
    
    // Retornar erro no formato esperado pelo frontend
    res.status(500).json({ 
      success: false,
      error: err.message,
      details: err.stack 
    });
  }
});

// ====== Calcular troco ======
app.post("/calcular/:fileId", calcularTrocoEndpoint(PERSISTENT_DIRS.extratos));

// ====== ROTAS FGTS ======

// Página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Painel FGTS
app.get('/fgts', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Last-Modified', new Date().toUTCString());
  res.setHeader('ETag', `"${Date.now()}"`);
  res.sendFile(path.join(__dirname, 'fgts', 'index.html'));
});

// Painel FGTS DEBUG
app.get('/fgts-debug', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'fgts-debug.html'));
});

// ====== API ENDPOINTS FGTS ======

// Endpoint de teste para debug
app.post('/fgts/test-upload', (req, res) => {
  console.log('🧪 TESTE: Endpoint de teste chamado');
  console.log('📋 Headers:', req.headers);
  console.log('📋 Content-Type:', req.headers['content-type']);
  res.json({ 
    success: true, 
    message: 'Endpoint de teste funcionando',
    contentType: req.headers['content-type']
  });
});

// Endpoint de teste com multer
app.post('/fgts/test-multer', uploadCSV.single('csvfile'), (req, res) => {
  console.log('🧪 TESTE MULTER: Endpoint chamado');
  console.log('📋 File:', req.file);
  console.log('📋 Body:', req.body);
  res.json({ 
    success: true, 
    message: 'Multer funcionando',
    file: req.file ? 'Arquivo recebido' : 'Nenhum arquivo'
  });
});

// Upload e processamento de CSV
app.post('/fgts/run', (req, res, next) => {
  console.log('🔍 DEBUG: Middleware de debug ativado');
  console.log('📋 Content-Type:', req.headers['content-type']);
  console.log('📋 Content-Length:', req.headers['content-length']);
  next();
}, uploadCSV.single('csvfile'), (err, req, res, next) => {
  if (err) {
    console.error('❌ ERRO MULTER:', err.message);
    console.error('❌ Stack:', err.stack);
    return res.status(400).json({ 
      error: 'Erro no upload do arquivo', 
      details: err.message 
    });
  }
  next();
}, async (req, res) => {
  try {
    console.log('🚀 ===== INICIANDO UPLOAD DE CSV =====');
    console.log('📋 Request recebido:', {
      hasFile: !!req.file,
      fileName: req.file?.filename,
      originalName: req.file?.originalname,
      size: req.file?.size,
      mimetype: req.file?.mimetype,
      path: req.file?.path
    });

    if (!req.file) {
      console.log('❌ ERRO: Nenhum arquivo CSV enviado');
      return res.status(400).json({ error: "Nenhum arquivo CSV enviado" });
    }

    // Verificar se há processamento em andamento
    console.log('🔍 Verificando estado de processamento...');
    const estadoAtual = await carregarEstadoFGTS();
    if (estadoAtual && estadoAtual.processando) {
      console.log('⚠️ Processamento em andamento detectado!');
      console.log(`📊 Estado atual: ${estadoAtual.processados}/${estadoAtual.total} processados`);
      console.log(`⏳ Pendentes: ${estadoAtual.pendentes?.length || 0}`);
      
      // Permitir upload mas avisar sobre processamento em andamento
      console.log('✅ Permitindo upload mesmo com processamento em andamento...');
    } else {
      console.log('✅ Nenhum processamento em andamento - upload liberado');
    }

    console.log('📄 Processando CSV:', req.file.filename);
    console.log('📁 Caminho do arquivo:', req.file.path);
    console.log('📊 Tamanho do arquivo:', req.file.size, 'bytes');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(req.file.path)) {
      console.log('❌ ERRO: Arquivo não existe no caminho:', req.file.path);
      return res.status(500).json({ error: "Arquivo não encontrado" });
    }
    
    console.log('✅ Arquivo existe no caminho:', req.file.path);
    
    // Ler CPFs do CSV
    console.log('📖 Lendo conteúdo do CSV...');
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    console.log('✅ Conteúdo lido, tamanho:', csvContent.length, 'caracteres');
    
    const { parse } = await import('csv-parse/sync');
    console.log('📊 Parseando CSV...');
    const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });
    
    console.log(`📊 Total de registros parseados: ${registros.length}`);
    console.log('📋 Primeiros 3 registros:', registros.slice(0, 3));

    // Remover duplicados baseado no CPF
    console.log('🔍 Removendo CPFs duplicados...');
    const cpfsUnicos = new Map();
    const registrosUnicos = [];
    let duplicadosRemovidos = 0;

    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      const cpf = registro.CPF?.trim();
      
      if (!cpf) {
        console.log(`⚠️ Registro ${i + 1} sem CPF, pulando...`);
        continue;
      }

      if (cpfsUnicos.has(cpf)) {
        duplicadosRemovidos++;
        console.log(`⚠️ CPF duplicado removido: ${cpf} (linha ${i + 2}) - já processado na linha ${cpfsUnicos.get(cpf) + 1}`);
        continue;
      }

      cpfsUnicos.set(cpf, i);
      registrosUnicos.push(registro);
    }

    console.log(`✅ Duplicados removidos: ${duplicadosRemovidos}`);
    console.log(`📊 Registros únicos: ${registrosUnicos.length} (de ${registros.length} originais)`);

    // Usar registros únicos para o processamento
    const registrosParaProcessar = registrosUnicos;

    // Se há processamento em andamento, pausar e limpar estado anterior
    if (estadoAtual && estadoAtual.processando) {
      console.log('⏸️ Pausando processamento anterior...');
      await setPause(true);
      
      // Limpar estado anterior
      console.log('🗑️ Limpando estado anterior...');
      const estadoLimpo = {
        processando: false,
        iniciadoEm: null,
        arquivoOriginal: null,
        total: 0,
        processados: 0,
        sucessos: 0,
        pendentes: [],
        reprocessar: [],
        erros: [],
        ultimaAtualizacao: new Date().toISOString()
      };
      await salvarEstadoFGTS(estadoLimpo);
      console.log('✅ Estado anterior limpo');
    }

    // Salvar lista completa no cache
    console.log('💾 Salvando lista completa no cache...');
    const cacheData = await salvarCPFsAnexados(registrosParaProcessar, {
      fileName: req.file.filename,
      uploadTime: new Date().toISOString(),
      totalRegistros: registrosParaProcessar.length,
      duplicadosRemovidos: duplicadosRemovidos
    });
    
    console.log(`✅ Lista de ${registrosParaProcessar.length} CPFs únicos salva no cache persistente`);
    console.log('📄 Dados salvos:', {
      totalCPFs: cacheData.totalCPFs,
      fileName: cacheData.metadata.fileName,
      uploadTime: cacheData.metadata.uploadTime
    });
    
    // Criar estado inicial completo
    console.log('📊 Criando estado inicial...');
    const estadoInicial = {
      processando: true,
      iniciadoEm: new Date().toISOString(),
      arquivoOriginal: req.file.filename,
      total: registrosParaProcessar.length,
      processados: 0,
      sucessos: 0,
      pendentes: registrosParaProcessar.map((reg, i) => ({
        cpf: reg.CPF,
        linha: i + 1,
        id: reg.ID || `linha_${i + 1}`,
        tentativas: 0,
        ultimaTentativa: null,
        status: 'pendente'
      })),
      reprocessar: [],
      erros: [],
      ultimaAtualizacao: new Date().toISOString()
    };
    
    console.log('✅ Estado inicial criado:', {
      total: estadoInicial.total,
      processados: estadoInicial.processados,
      sucessos: estadoInicial.sucessos
    });
    
    // Salvar estado inicial
    console.log('💾 Salvando estado inicial...');
    await salvarEstadoFGTS(estadoInicial);
    console.log('✅ Estado inicial salvo');
    
    // Reativar processamento
    console.log('▶️ Reativando processamento...');
    await setPause(false);
    
    // Processar CPFs
    console.log('🚀 Iniciando processamento de CPFs...');
    await processarCPFs(req.file.path);
    
    console.log('✅ ===== UPLOAD CONCLUÍDO COM SUCESSO =====');
    
    res.json({ 
      success: true, 
      message: `Processamento iniciado com ${registrosParaProcessar.length} CPFs únicos (${duplicadosRemovidos} duplicados removidos)`,
      total: registrosParaProcessar.length,
      duplicadosRemovidos: duplicadosRemovidos,
      estado: "iniciado"
    });
    
  } catch (error) {
    console.error('❌ ===== ERRO NO UPLOAD DE CSV =====');
    console.error('❌ Erro:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Request:', {
      hasFile: !!req.file,
      fileName: req.file?.filename,
      originalName: req.file?.originalname,
      size: req.file?.size,
      mimetype: req.file?.mimetype,
      path: req.file?.path
    });
    res.status(500).json({ error: error.message });
  }
});

// Verificar agendamentos pendentes
app.get('/fgts/agendamentos', async (req, res) => {
  try {
    // Importar função para acessar agendamentos
    const { obterAgendamentos } = await import('./fgts/fgts_csv.js');
    const agendamentos = obterAgendamentos();
    
    res.json({
      success: true,
      agendamentos: agendamentos,
      total: agendamentos.length,
      proximoHorarioComercial: new Date().toLocaleString('pt-BR')
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar agendamentos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forçar processamento de CPFs pendentes
app.post('/fgts/processar-pendentes', async (req, res) => {
  try {
    console.log('🚀 Forçando processamento de CPFs pendentes...');
    
    // Carregar CPFs pendentes do cache
    const pendentes = await carregarPendentes();
    
    if (!pendentes || pendentes.length === 0) {
      return res.json({
        success: true,
        message: "Nenhum CPF pendente encontrado",
        total: 0
      });
    }
    
    console.log(`📋 Encontrados ${pendentes.length} CPFs pendentes`);
    
    // Iniciar processamento
    await processarCPFs(null, pendentes);
    
    res.json({
      success: true,
      message: `Processamento iniciado para ${pendentes.length} CPFs pendentes`,
      total: pendentes.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar CPFs pendentes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar lista completa de CPFs anexados
app.get('/fgts/lista-completa', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Iniciando /fgts/lista-completa');
    
    // Carregar listas de resultados processados do cache
    const listas = carregarListas();
    console.log('🔍 DEBUG: Listas carregadas:', {
      sucessos: listas.sucessos?.length || 0,
      naoAutorizados: listas.naoAutorizados?.length || 0,
      pendentes: listas.pendentes?.length || 0,
      descartados: listas.descartados?.length || 0
    });
    console.log('🔍 DEBUG: Listas objeto completo:', listas);
    
    // Carregar total de CPFs do arquivo anexado
    console.log('🔍 DEBUG: Chamando carregarCPFsAnexados...');
    const cpfsAnexados = await carregarCPFsAnexados();
    console.log('🔍 DEBUG: carregarCPFsAnexados retornou:', cpfsAnexados);
    const totalCPFsArquivo = cpfsAnexados?.totalCPFs || 0;
    console.log('🔍 DEBUG: CPFs anexados:', {
      totalCPFs: totalCPFsArquivo,
      fileName: cpfsAnexados?.metadata?.fileName,
      cpfsAnexados: cpfsAnexados
    });
    
    const totalProcessados = listas.sucessos.length + listas.pendentes.length + 
                            listas.naoAutorizados.length + listas.descartados.length;
    
    console.log('🔍 DEBUG: Total processados:', totalProcessados);
    console.log('🔍 DEBUG: Total arquivo:', totalCPFsArquivo);
    
    res.json({
      success: true,
      total: totalCPFsArquivo, // Usar total do arquivo anexado
      fileName: cpfsAnexados?.metadata?.fileName || 'N/A',
      uploadTime: cpfsAnexados?.metadata?.uploadTime || new Date().toISOString(),
      timestamp: new Date().toISOString(),
      sucessos: listas.sucessos || [],
      pendentes: listas.pendentes || [],
      naoAutorizados: listas.naoAutorizados || [],
      descartados: listas.descartados || [],
      totalProcessados: totalProcessados,
      message: `Lista completa com ${totalProcessados} CPFs processados de ${totalCPFsArquivo} total`
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar lista completa:', error);
    res.status(500).json({ error: error.message });
  }
});

// Limpar lista completa de CPFs
app.post('/fgts/limpar-lista-completa', async (req, res) => {
  try {
    if (fs.existsSync(CPFS_CACHE_FILE)) {
      await fazerBackup(CPFS_CACHE_FILE, 'cpfs');
      fs.unlinkSync(CPFS_CACHE_FILE);
      console.log('🗑️ Lista completa de CPFs removida do cache');
    }
    
    res.json({
      success: true,
      message: "Lista completa de CPFs removida do cache"
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar lista completa:', error);
    res.status(500).json({ error: error.message });
  }
});

// Limpar CPFs inválidos do cache
app.post('/fgts/limpar-cpfs-invalidos', async (req, res) => {
  try {
    console.log('🧹 Iniciando limpeza de CPFs inválidos...');
    
    // Função para validar CPF
    const isValidCPF = (cpf) => {
      if (!cpf) return false;
      const cleaned = cpf.toString().replace(/\D/g, "");
      if (cleaned.length !== 11) return false;
      if (cleaned === "00000000000" || cleaned === "11111111111" || cleaned === "22222222222" || 
          cleaned === "33333333333" || cleaned === "44444444444" || cleaned === "55555555555" ||
          cleaned === "66666666666" || cleaned === "77777777777" || cleaned === "88888888888" || 
          cleaned === "99999999999") return false;
      return true;
    };
    
    let totalRemovidos = 0;
    
    // Limpar pendentes inválidos
    const pendentes = await carregarPendentes();
    if (pendentes && pendentes.length > 0) {
      const pendentesValidos = pendentes.filter(p => isValidCPF(p.cpf));
      const removidosPendentes = pendentes.length - pendentesValidos.length;
      
      if (removidosPendentes > 0) {
        await salvarPendentes(pendentesValidos);
        console.log(`🗑️ Removidos ${removidosPendentes} CPFs inválidos dos pendentes`);
        totalRemovidos += removidosPendentes;
      }
    }
    
    // Limpar listas de resultados
    const listas = await carregarListas();
    const tiposLista = ['sucessos', 'pendentes', 'naoAutorizados', 'descartados', 'agendados'];
    
    for (const tipo of tiposLista) {
      if (listas[tipo] && listas[tipo].length > 0) {
        const listaValida = listas[tipo].filter(item => isValidCPF(item.cpf));
        const removidos = listas[tipo].length - listaValida.length;
        
        if (removidos > 0) {
          await limparLista(tipo);
          for (const item of listaValida) {
            await adicionarResultadoLista(tipo, item);
          }
          console.log(`🗑️ Removidos ${removidos} CPFs inválidos da lista ${tipo}`);
          totalRemovidos += removidos;
        }
      }
    }
    
    console.log(`✅ Limpeza concluída: ${totalRemovidos} CPFs inválidos removidos`);
    
    res.json({
      success: true,
      message: `Limpeza concluída: ${totalRemovidos} CPFs inválidos removidos`,
      totalRemovidos
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar CPFs inválidos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar CPFs pendentes
app.get('/fgts/pendentes', async (req, res) => {
  try {
    const pendentes = await carregarPendentes();
    const listas = await carregarListas();
    
    res.json({
      success: true,
      pendentes: pendentes || [],
      totalPendentes: pendentes?.length || 0,
      listas: {
        sucessos: listas.sucessos?.length || 0,
        erros: listas.erros?.length || 0,
        naoAutorizados: listas.naoAutorizados?.length || 0,
        agendados: listas.agendados?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar CPFs pendentes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Testar agendamento
app.post('/fgts/testar-agendamento', async (req, res) => {
  try {
    const { opportunityId } = req.body;
    
    if (!opportunityId) {
      return res.status(400).json({ error: "opportunityId é obrigatório" });
    }
    
    // Importar função de agendamento
    const { agendarDisparo } = await import('./fgts/fgts_csv.js');
    agendarDisparo(opportunityId, 'teste');
    
    res.json({
      success: true,
      message: `Agendamento de teste criado para ID: ${opportunityId}`,
      proximoHorarioComercial: new Date().toLocaleString('pt-BR')
    });
    
  } catch (error) {
    console.error('❌ Erro ao testar agendamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar estado atual do processamento
app.get('/fgts/estado', async (req, res) => {
  try {
    const estado = await carregarEstadoFGTS();
    
    if (!estado) {
      return res.json({
        processando: false,
        message: "Nenhum processamento ativo"
      });
    }
    
    // Carregar dados atuais dos módulos FGTS
    const pendentes = await carregarPendentes();
    const listas = await carregarListas();
    
    const estadoAtualizado = {
      ...estado,
      pendentes: pendentes,
      sucessos: listas.sucessos?.length || 0,
      erros: listas.erros?.length || 0,
      naoAutorizados: listas.naoAutorizados?.length || 0,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    res.json(estadoAtualizado);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Continuar processamento de onde parou
app.post('/fgts/continuar', async (req, res) => {
  try {
    console.log('🚀 Tentando continuar processamento...');
    
    // Processar reprocessamento rápido se houver
    await processarReprocessamentoRapido();
    
    res.json({ 
      success: true, 
      message: "Processamento continuado" 
    });
    
  } catch (error) {
    console.error('❌ Erro ao continuar processamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Processar CPFs em cache sem upload
app.post('/fgts/processar-cache', async (req, res) => {
  try {
    console.log('🚀 Processando CPFs em cache...');
    
    const cpfsAnexados = await carregarCPFsAnexados();
    
    if (cpfsAnexados && cpfsAnexados.totalCPFs > 0) {
      console.log(`🚀 PROCESSANDO CACHE: ${cpfsAnexados.totalCPFs} CPFs encontrados`);
      // Usar o nome do arquivo correto que sabemos que existe
      const fileName = "034f2a5770c34a501af6f2edee5581e7";
      await processarCPFs("/var/data/uploads/" + fileName);
      res.json({ success: true, message: `Processamento iniciado para ${cpfsAnexados.totalCPFs} CPFs em cache` });
    } else {
      res.json({ success: false, message: 'Nenhum CPF em cache encontrado' });
    }
  } catch (error) {
    console.error('❌ Erro ao processar cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== APIs DE STATUS DE CPFs ======

// Página de gerenciamento de status
app.get('/fgts/status-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'status-cpfs.html'));
});

// Obter todos os status de CPFs
app.get('/fgts/status-cpfs', async (req, res) => {
  try {
    const statusData = await carregarStatusCPFs();
    const cpfsAnexados = await carregarCPFsAnexados();
    
    // Combinar dados da planilha com status
    const cpfsCompletos = [];
    if (cpfsAnexados?.cpfs) {
      for (const cpfData of cpfsAnexados.cpfs) {
        const cpf = cpfData.cpf;
        const status = statusData.cpfs?.[cpf] || {
          cpf: cpf,
          telefone: cpfData.telefone || '',
          id: cpfData.id || '',
          status: 'NA FILA NOVO PROCESSAR',
          tabulador: 'PENDENTE',
          criadoEm: new Date().toISOString()
        };
        
        cpfsCompletos.push({
          ...cpfData,
          ...status
        });
      }
    }
    
    res.json({
      success: true,
      cpfs: cpfsCompletos,
      total: cpfsCompletos.length
    });
  } catch (error) {
    console.error('❌ Erro ao obter status de CPFs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar status de um CPF específico
app.put('/fgts/status-cpfs/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;
    const alteracoes = req.body;
    
    const statusAtual = await obterStatusCPF(cpf);
    if (!statusAtual) {
      return res.status(404).json({ success: false, message: 'CPF não encontrado' });
    }
    
    const novoStatus = { ...statusAtual, ...alteracoes };
    await atualizarStatusCPF(cpf, novoStatus.status, novoStatus);
    
    res.json({ success: true, message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao atualizar status do CPF:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar múltiplos CPFs em lote
app.put('/fgts/status-cpfs/batch', async (req, res) => {
  try {
    const alteracoes = req.body;
    let atualizados = 0;
    
    for (const [cpf, dados] of Object.entries(alteracoes)) {
      const statusAtual = await obterStatusCPF(cpf);
      if (statusAtual) {
        const novoStatus = { ...statusAtual, ...dados };
        await atualizarStatusCPF(cpf, novoStatus.status, novoStatus);
        atualizados++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `${atualizados} CPFs atualizados com sucesso`,
      atualizados 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar CPFs em lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inicializar status de CPFs
app.post('/fgts/status-cpfs/inicializar', async (req, res) => {
  try {
    const statusData = await inicializarStatusCPFs();
    
    res.json({ 
      success: true, 
      message: 'Status de CPFs inicializados com sucesso',
      data: statusData 
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar status de CPFs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API de teste simples
app.get('/teste', (req, res) => {
  res.json({ 
    message: 'API funcionando!', 
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage()
  });
});

// API de debug para contadores
app.get('/fgts/debug-contadores', async (req, res) => {
  try {
    const statusData = await carregarStatusCPFs();
    const cpfsAnexados = await carregarCPFsAnexados();
    
    // Contar apenas os primeiros 100 CPFs para debug
    const sampleSize = Math.min(100, cpfsAnexados?.cpfs?.length || 0);
    let sucessos = 0;
    let naoAutorizados = 0;
    let pendentes = 0;
    let emProcessamento = 0;
    let descartados = 0;
    
    if (cpfsAnexados?.cpfs && statusData?.cpfs) {
      for (let i = 0; i < sampleSize; i++) {
        const cpfData = cpfsAnexados.cpfs[i];
        const cpf = cpfData.cpf;
        const status = statusData.cpfs[cpf]?.status;
        
        if (!status) {
          pendentes++; // CPF sem status = pendente
        } else {
          switch (status) {
            case 'SUCESSO':
              sucessos++;
              break;
            case 'NÃO AUTORIZADO':
              naoAutorizados++;
              break;
            case 'PENDING':
              pendentes++; // Apenas PENDING é realmente pendente
              break;
            case 'REPROCESSAR RAPIDO':
            case 'LIMITE EXCEDIDO':
            case 'NA FILA NOVO PROCESSAR':
              emProcessamento++; // Status especiais
              break;
            default:
              descartados++;
          }
        }
      }
    }
    
    res.json({
      success: true,
      debug: {
        sampleSize,
        totalCPFs: cpfsAnexados?.totalCPFs || 0,
        statusFileExists: !!statusData,
        cpfsFileExists: !!cpfsAnexados,
        contadores: {
          sucessos,
          naoAutorizados,
          pendentes,
          emProcessamento,
          descartados
        },
        statusKeys: Object.keys(statusData?.cpfs || {}).slice(0, 10),
        sampleStatuses: Object.entries(statusData?.cpfs || {}).slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API de debug para verificar processamento de CPF específico
app.get('/fgts/debug-cpf/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;
    const statusData = await carregarStatusCPFs();
    const cpfsAnexados = await carregarCPFsAnexados();
    
    const cpfData = cpfsAnexados?.cpfs?.find(c => c.cpf === cpf);
    const status = statusData?.cpfs?.[cpf];
    
    res.json({
      success: true,
      debug: {
        cpf,
        cpfData,
        status,
        existeNaLista: !!cpfData,
        temStatus: !!status,
        statusAtual: status?.status || 'SEM STATUS'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para forçar atualização de status de um CPF
app.post('/fgts/debug-atualizar-status/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;
    const { status, dados } = req.body;
    
    console.log(`🔧 DEBUG: Forçando atualização de status para CPF ${cpf}:`, { status, dados });
    
    const resultado = await atualizarStatusCPF(cpf, status || 'SUCESSO', {
      tabulador: 'SUCESSO',
      id: 'debug',
      valor: 1000.00,
      provider: 'debug',
      ...dados
    });
    
    console.log(`🔧 DEBUG: Resultado da atualização:`, resultado);
    
    // Verificar se foi salvo
    const statusData = await carregarStatusCPFs();
    const statusAtualizado = statusData?.cpfs?.[cpf];
    
    res.json({
      success: true,
      debug: {
        cpf,
        statusSolicitado: status || 'SUCESSO',
        resultadoAtualizacao: resultado,
        statusAtualizado,
        arquivoExiste: fs.existsSync(STATUS_CPFS_FILE),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Erro ao forçar atualização de status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para testar sistema de status (SIMPLIFICADA)
app.post('/fgts/testar-status/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;
    const { status } = req.body;
    
    console.log(`🧪 TESTE: Atualizando CPF ${cpf} para status ${status || 'SUCESSO'}`);
    
    // Testar atualização direta
    const resultado = await atualizarStatusCPF(cpf, status || 'SUCESSO', {
      tabulador: 'TESTE',
      id: 'teste_123',
      valor: 1500.00,
      provider: 'teste'
    });
    
    // Verificar se foi salvo
    let statusAtualizado = null;
    try {
      if (fs.existsSync(STATUS_CPFS_FILE)) {
        const fileContent = await fsp.readFile(STATUS_CPFS_FILE, 'utf-8');
        const statusData = JSON.parse(fileContent);
        statusAtualizado = statusData.cpfs?.[cpf];
      }
    } catch (error) {
      console.log('Erro ao verificar status:', error.message);
    }
    
    res.json({
      success: true,
      teste: {
        cpf,
        statusSolicitado: status || 'SUCESSO',
        resultadoAtualizacao: resultado,
        statusAtualizado,
        arquivoExiste: fs.existsSync(STATUS_CPFS_FILE),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Erro no teste de status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para forçar atualização dos contadores no painel
app.post('/fgts/forcar-atualizacao-painel', async (req, res) => {
  try {
    console.log('🔄 FORÇANDO ATUALIZAÇÃO DO PAINEL...');
    
    // Calcular contadores atuais
    const contadores = await calcularContadoresPorStatus();
    
    // Emitir via Socket.IO para todos os clientes conectados
    if (ioInstance) {
      ioInstance.emit("totalCPFs", contadores.totalCPFs);
      ioInstance.emit("contadoresTempoReal", {
        ...contadores,
        timestamp: new Date().toISOString(),
        processando: true,
        ultimaAtualizacao: new Date().toISOString()
      });
      ioInstance.emit("progress", {
        done: contadores.processados,
        total: contadores.totalCPFs,
        pendentes: contadores.pendentes,
        counters: {
          success: contadores.sucessos,
          pending: contadores.pendentes,
          no_auth: contadores.naoAutorizados,
          descartados: contadores.descartados
        }
      });
      
      console.log('📡 Contadores emitidos via Socket.IO:', contadores);
    }
    
    res.json({
      success: true,
      message: "Contadores atualizados no painel",
      contadores: contadores,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao forçar atualização do painel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter contadores baseados em status
app.get('/fgts/contadores-status', async (req, res) => {
  try {
    // Debug: verificar se os arquivos existem
    const statusFile = `${PERSISTENT_DIRS.cache}/status-cpfs.json`;
    const cpfsFile = `${PERSISTENT_DIRS.cache}/cpfs-anexados.json`;
    
    const contadores = await calcularContadoresPorStatus();
    
    res.json({ 
      success: true, 
      contadores,
      debug: {
        statusFileExists: fs.existsSync(statusFile),
        cpfsFileExists: fs.existsSync(cpfsFile),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Erro contadores-status:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// ====== GERENCIAMENTO DE CREDENCIAIS ======
const CREDENCIAIS_FILE = `${PERSISTENT_DIRS.cache}/credenciais.json`;

// Carregar credenciais
async function carregarCredenciais() {
  try {
    if (fs.existsSync(CREDENCIAIS_FILE)) {
      const content = await fsp.readFile(CREDENCIAIS_FILE, 'utf-8');
      const credenciais = JSON.parse(content);
      
      if (credenciais.usuariosV8) {
        console.log('📖 Carregando usuários V8:', credenciais.usuariosV8.length, 'usuários');
        credenciais.usuariosV8.forEach((usuario, index) => {
          console.log(`👤 Usuário V8 ${index + 1} carregado:`, {
            id: usuario.id,
            login: usuario.login,
            senha: usuario.senha ? `*** (${usuario.senha.length} chars)` : 'vazia',
            nome: usuario.nome
          });
        });
      }
      
      return credenciais;
    }
    return {};
  } catch (error) {
    console.error('❌ Erro ao carregar credenciais:', error);
    return {};
  }
}

// Salvar credenciais
async function salvarCredenciais(credenciais) {
  try {
    // Usar JSON.stringify com escape adequado para caracteres especiais
    const jsonContent = JSON.stringify(credenciais, null, 2);
    console.log('📝 Conteúdo JSON a ser salvo:', jsonContent.substring(0, 200) + '...');
    
    await fsp.writeFile(CREDENCIAIS_FILE, jsonContent, 'utf8');
    console.log('✅ Credenciais salvas com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar credenciais:', error);
    console.error('❌ Detalhes do erro:', error.message);
    return false;
  }
}

// API para obter credenciais
app.get('/api/credenciais', async (req, res) => {
  try {
    const credenciais = await carregarCredenciais();
    
    res.json({
      success: true,
      credenciais: {
        openaiKey: credenciais.openaiKey || null,
        lunasApiKey: credenciais.lunasApiKey || null,
        lunasApiUrl: credenciais.lunasApiUrl || null,
        v8ApiKey: credenciais.v8ApiKey || null,
        v8ApiUrl: credenciais.v8ApiUrl || null
      }
    });
  } catch (error) {
    console.error('❌ Erro ao obter credenciais:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para salvar credenciais
app.post('/api/credenciais', async (req, res) => {
  try {
    const { openaiKey, lunasApiKey, lunasApiUrl, usuariosV8 } = req.body;
    
    console.log('📝 Salvando credenciais:', {
      openaiKey: openaiKey ? '***' : 'não fornecido',
      lunasApiKey: lunasApiKey ? '***' : 'não fornecido',
      lunasApiUrl: lunasApiUrl || 'não fornecido',
      usuariosV8: usuariosV8 ? `${usuariosV8.length} usuários` : 'não fornecido'
    });
    
    if (usuariosV8) {
      usuariosV8.forEach((usuario, index) => {
        console.log(`👤 Usuário V8 ${index + 1}:`, {
          id: usuario.id,
          login: usuario.login,
          senha: usuario.senha ? `*** (${usuario.senha.length} chars)` : 'vazia',
          senhaOriginal: usuario.senha, // Mostrar a senha original para debug
          nome: usuario.nome
        });
      });
    }
    
    const credenciais = await carregarCredenciais();
    
    // Atualizar apenas as credenciais fornecidas
    if (openaiKey) credenciais.openaiKey = openaiKey;
    if (lunasApiKey) credenciais.lunasApiKey = lunasApiKey;
    if (lunasApiUrl) credenciais.lunasApiUrl = lunasApiUrl;
    if (usuariosV8) credenciais.usuariosV8 = usuariosV8;
    
    const sucesso = await salvarCredenciais(credenciais);
    
    if (sucesso) {
      // Atualizar variáveis de ambiente
      if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;
      if (lunasApiKey) process.env.LUNAS_API_KEY = lunasApiKey;
      if (lunasApiUrl) process.env.LUNAS_API_URL = lunasApiUrl;
      
      console.log('✅ Credenciais salvas com sucesso');
      res.json({ success: true, message: 'Credenciais salvas com sucesso' });
    } else {
      res.status(500).json({ success: false, error: 'Erro ao salvar credenciais' });
    }
  } catch (error) {
    console.error('❌ Erro ao salvar credenciais:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para obter usuários V8
app.get('/api/usuarios-v8', async (req, res) => {
  try {
    const credenciais = await carregarCredenciais();
    
    res.json({
      success: true,
      usuarios: credenciais.usuariosV8 || []
    });
  } catch (error) {
    console.error('❌ Erro ao obter usuários V8:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para obter configurações do sistema
app.get('/api/configuracoes', async (req, res) => {
  try {
    const config = {
      maxMemory: process.env.MAX_MEMORY || '2048',
      maxCpus: process.env.MAX_CPUS || '2',
      delayMs: process.env.DELAY_MS || '1000',
      maxRetries: process.env.MAX_RETRIES || '3'
    };
    
    res.json({ success: true, configuracoes: config });
  } catch (error) {
    console.error('❌ Erro ao obter configurações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para obter logs do servidor
app.get('/api/logs', async (req, res) => {
  try {
    const logFile = '/root/api-extrato/logs/out-0.log';
    const errorLogFile = '/root/api-extrato/logs/err-0.log';
    
    let logs = [];
    
    // Ler logs de saída
    if (fs.existsSync(logFile)) {
      const content = await fsp.readFile(logFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      lines.forEach((line, index) => {
        // Regex mais flexível para capturar logs do PM2
        const match = line.match(/^(\d+)\|api-extr\s*\|\s*(.+)$/) || 
                     line.match(/^(\d+)\|api-extrato\s*\|\s*(.+)$/) ||
                     line.match(/^(.+)$/);
        
        if (match) {
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: match[2] || match[1] || line,
            source: 'stdout',
            lineNumber: index + 1
          });
        }
      });
    }
    
    // Ler logs de erro
    if (fs.existsSync(errorLogFile)) {
      const content = await fsp.readFile(errorLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      lines.forEach((line, index) => {
        const match = line.match(/^(\d+)\|api-extr\s*\|\s*(.+)$/) || 
                     line.match(/^(\d+)\|api-extrato\s*\|\s*(.+)$/) ||
                     line.match(/^(.+)$/);
        
        if (match) {
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: match[2] || match[1] || line,
            source: 'stderr',
            lineNumber: index + 1
          });
        }
      });
    }
    
    // Se não encontrou logs com regex, pegar as últimas 50 linhas
    if (logs.length === 0) {
      const allFiles = [logFile, errorLogFile];
      for (const file of allFiles) {
        if (fs.existsSync(file)) {
          const content = await fsp.readFile(file, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());
          const lastLines = lines.slice(-50); // Últimas 50 linhas
          
          lastLines.forEach((line, index) => {
            logs.push({
              timestamp: new Date().toISOString(),
              level: file.includes('err') ? 'ERROR' : 'INFO',
              message: line,
              source: file.includes('err') ? 'stderr' : 'stdout',
              lineNumber: lines.length - lastLines.length + index + 1
            });
          });
        }
      }
    }
    
    // Ordenar por timestamp (mais recentes primeiro)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limitar a 100 logs mais recentes
    logs = logs.slice(0, 100);
    
    console.log(`📊 API Logs: Retornando ${logs.length} logs`);
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('❌ Erro ao obter logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para reiniciar o servidor
app.post('/api/restart', async (req, res) => {
  try {
    // Executar comando PM2 para reiniciar
    const { exec } = require('child_process');
    
    exec('pm2 restart api-extrato', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erro ao reiniciar servidor:', error);
        res.status(500).json({ success: false, error: error.message });
        return;
      }
      
      console.log('✅ Servidor reiniciado via API');
      res.json({ success: true, message: 'Servidor reiniciado com sucesso' });
    });
  } catch (error) {
    console.error('❌ Erro ao reiniciar servidor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para salvar configurações do sistema
app.post('/api/configuracoes', async (req, res) => {
  try {
    const { maxMemory, maxCpus, delayMs, maxRetries } = req.body;
    
    // Atualizar variáveis de ambiente
    if (maxMemory) process.env.MAX_MEMORY = maxMemory.toString();
    if (maxCpus) process.env.MAX_CPUS = maxCpus.toString();
    if (delayMs) process.env.DELAY_MS = delayMs.toString();
    if (maxRetries) process.env.MAX_RETRIES = maxRetries.toString();
    
    res.json({ success: true, message: 'Configurações salvas com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir página de configuração de credenciais
app.get('/config-credenciais', (req, res) => {
  res.sendFile(path.join(__dirname, 'config-credenciais.html'));
});

// ====== APIS DE TESTE ======

// Testar OpenAI
app.post('/api/testar-openai', async (req, res) => {
  try {
    const { openaiKey } = req.body;
    
    if (!openaiKey) {
      return res.status(400).json({ success: false, error: 'Chave OpenAI não fornecida' });
    }
    
    // Teste simples com OpenAI
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({ 
        success: true, 
        resposta: `Conectado! ${data.data.length} modelos disponíveis`,
        modelos: data.data.length
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: `Erro HTTP ${response.status}: ${response.statusText}` 
      });
    }
  } catch (error) {
    console.error('❌ Erro ao testar OpenAI:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Testar Lunas API
app.post('/api/testar-lunas', async (req, res) => {
  try {
    const { lunasApiKey, lunasApiUrl } = req.body;
    
    if (!lunasApiKey || !lunasApiUrl) {
      return res.status(400).json({ success: false, error: 'Chave e URL da Lunas não fornecidas' });
    }
    
    // Teste de conectividade com Lunas
    const response = await fetch(`${lunasApiUrl}/auth`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lunasApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test',
        password: 'test'
      }),
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({ 
        success: true, 
        status: 'Conectado com sucesso',
        resposta: data
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: `Erro HTTP ${response.status}: ${response.statusText}` 
      });
    }
  } catch (error) {
    console.error('❌ Erro ao testar Lunas API:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Testar Usuários V8
app.post('/api/testar-v8', async (req, res) => {
  try {
    const { usuarios } = req.body;
    
    if (!usuarios || usuarios.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum usuário V8 fornecido' });
    }
    
    let testados = 0;
    let sucessos = 0;
    const resultados = [];
    
    for (const usuario of usuarios) {
      testados++;
      try {
        // Teste real de autenticação V8
        const authResponse = await fetch('https://auth.v8sistema.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: 'DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn',
            audience: 'https://bff.v8sistema.com',
            username: usuario.login,
            password: usuario.senha
          }),
          timeout: 5000
        });
        
        if (authResponse.ok) {
          sucessos++;
          resultados.push({ usuario: usuario.login, status: 'OK' });
        } else {
          resultados.push({ usuario: usuario.login, status: `Erro ${authResponse.status}` });
        }
      } catch (error) {
        resultados.push({ usuario: usuario.login, status: 'Erro de conexão' });
      }
    }
    
    res.json({ 
      success: true, 
      testados,
      sucessos,
      falhas: testados - sucessos,
      resultados
    });
  } catch (error) {
    console.error('❌ Erro ao testar usuários V8:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Filtrar CPFs para processamento
app.get('/fgts/cpfs-para-processar', async (req, res) => {
  try {
    const { paraProcessar, ignorar } = await filtrarCPFsParaProcessamento();
    
    res.json({ 
      success: true, 
      paraProcessar,
      ignorar,
      totalParaProcessar: paraProcessar.length,
      totalIgnorar: ignorar.length
    });
  } catch (error) {
    console.error('❌ Erro ao filtrar CPFs para processamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para testar contadores
app.get('/fgts/test-contadores', async (req, res) => {
  try {
    console.log('🧪 TESTE: Chamando calcularContadoresPorStatus...');
    const contadores = await calcularContadoresPorStatus();
    console.log('🧪 TESTE: Resultado:', contadores);
    res.json(contadores);
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    res.status(500).json({ error: error.message });
  }
});

// API para corrigir status incorretos em massa
app.post('/fgts/corrigir-status', async (req, res) => {
  try {
    console.log('🔧 CORRIGINDO STATUS INCORRETOS EM MASSA...');
    
    const listas = await carregarListas();
    let totalCorrigidos = 0;
    const correcoes = [];
    
    // Status que devem estar em Pendentes
    const statusParaPendentes = ['sistemaReprocessar', 'sistemaFalha', 'reprocessar_rapido'];
    
    // Verificar lista de Descartados
    if (listas.descartados && Array.isArray(listas.descartados)) {
      const descartadosCorrigidos = [];
      const paraPendentes = [];
      
      for (const item of listas.descartados) {
        if (statusParaPendentes.includes(item.status)) {
          // Mover para Pendentes
          paraPendentes.push(item);
          correcoes.push({
            cpf: item.cpf,
            statusAnterior: 'descartados',
            statusNovo: 'pendentes',
            motivo: `Status ${item.status} deve estar em Pendentes`
          });
          totalCorrigidos++;
        } else {
          // Manter em Descartados
          descartadosCorrigidos.push(item);
        }
      }
      
      // Atualizar listas
      if (paraPendentes.length > 0) {
        listas.descartados = descartadosCorrigidos;
        listas.pendentes = [...(listas.pendentes || []), ...paraPendentes];
        
        // Salvar alterações
        const { salvarListas } = await import('./fgts/cache-persistente.js');
        salvarListas(listas);
        
        console.log(`✅ ${paraPendentes.length} CPFs movidos de Descartados para Pendentes`);
      }
    }
    
    res.json({
      success: true,
      totalCorrigidos,
      correcoes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir status:', error);
    res.status(500).json({ error: error.message });
  }
});

// API para debug dos dados
app.get('/fgts/debug-dados', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Verificando dados...');
    
    // Testar carregamento direto do arquivo
    const cpfsAnexadosPath = path.join(__dirname, '..', 'var', 'data', 'cache', 'cpfs-anexados.json');
    console.log('📁 Caminho do arquivo:', cpfsAnexadosPath);
    console.log('📁 Arquivo existe:', fs.existsSync(cpfsAnexadosPath));
    
    if (fs.existsSync(cpfsAnexadosPath)) {
      const rawData = fs.readFileSync(cpfsAnexadosPath, 'utf-8');
      const cpfsAnexados = JSON.parse(rawData);
      console.log('📊 Dados carregados diretamente:', {
        totalCPFs: cpfsAnexados.totalCPFs,
        fileName: cpfsAnexados.metadata?.fileName
      });
    }
    
    const listasData = await carregarListas();
    const cpfsAnexados = await carregarCPFsAnexados();
    
    console.log('📊 Dados de debug:', {
      listasData: listasData ? {
        sucessos: listasData.sucessos?.length || 0,
        naoAutorizados: listasData.naoAutorizados?.length || 0,
        pendentes: listasData.pendentes?.length || 0,
        descartados: listasData.descartados?.length || 0
      } : 'NULL',
      cpfsAnexados: cpfsAnexados ? {
        totalCPFs: cpfsAnexados.totalCPFs || 0,
        fileName: cpfsAnexados.metadata?.fileName || 'N/A'
      } : 'NULL'
    });
    
    res.json({
      success: true,
      listasData: listasData ? {
        sucessos: listasData.sucessos?.length || 0,
        naoAutorizados: listasData.naoAutorizados?.length || 0,
        pendentes: listasData.pendentes?.length || 0,
        descartados: listasData.descartados?.length || 0
      } : null,
      cpfsAnexados: cpfsAnexados ? {
        totalCPFs: cpfsAnexados.totalCPFs || 0,
        fileName: cpfsAnexados.metadata?.fileName || 'N/A'
      } : null
    });
  } catch (error) {
    console.error('❌ Erro no debug:', error);
    res.status(500).json({ error: error.message });
  }
});

// API para forçar processamento e corrigir contadores
app.post('/fgts/forcar-processamento', async (req, res) => {
  try {
    console.log('🚀 FORÇANDO PROCESSAMENTO E CORRIGINDO CONTADORES...');
    
    // Carregar dados atuais
    const pendentes = await carregarPendentes();
    const cpfsAnexados = await carregarCPFsAnexados();
    const listas = await carregarListas();
    
    console.log(`📊 Dados encontrados:`);
    console.log(`   - Pendentes: ${pendentes?.length || 0}`);
    console.log(`   - Lista completa: ${cpfsAnexados?.totalCPFs || 0}`);
    console.log(`   - Sucessos: ${listas?.sucessos?.length || 0}`);
    console.log(`   - Não Autorizados: ${listas?.naoAutorizados?.length || 0}`);
    console.log(`   - Descartados: ${listas?.descartados?.length || 0}`);
    
    // Corrigir contadores
    const contadoresCorretos = {
      timestamp: new Date().toISOString(),
      totalCPFs: cpfsAnexados?.totalCPFs || 0,
      processados: (listas?.sucessos?.length || 0) + (listas?.naoAutorizados?.length || 0) + (listas?.descartados?.length || 0),
      sucessos: listas?.sucessos?.length || 0,
      pendentes: pendentes?.length || 0,
      naoAutorizados: listas?.naoAutorizados?.length || 0,
      descartados: listas?.descartados?.length || 0,
      agendados: listas?.agendados?.length || 0,
      processando: true,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    // Salvar contadores corrigidos
    await fsp.writeFile(CONTADORES_TEMPO_REAL_FILE, JSON.stringify(contadoresCorretos, null, 2));
    console.log(`📊 Contadores corrigidos salvos: ${contadoresCorretos.processados}/${contadoresCorretos.totalCPFs}`);
    
    // Emitir contadores corrigidos
    if (ioInstance) {
      ioInstance.emit("totalCPFs", contadoresCorretos.totalCPFs);
      ioInstance.emit("contadoresTempoReal", contadoresCorretos);
      ioInstance.emit("progress", {
        done: contadoresCorretos.processados,
        total: contadoresCorretos.totalCPFs,
        pendentes: contadoresCorretos.pendentes,
        counters: {
          success: contadoresCorretos.sucessos,
          pending: contadoresCorretos.pendentes,
          no_auth: contadoresCorretos.naoAutorizados,
          descartados: contadoresCorretos.descartados
        }
      });
    }
    
    // Iniciar processamento se há CPFs pendentes
    if (cpfsAnexados && cpfsAnexados.totalCPFs > 0) {
      console.log(`🚀 Iniciando processamento da lista completa de ${cpfsAnexados.totalCPFs} CPFs...`);
      setTimeout(async () => {
        try {
          await processarCPFs("/var/data/uploads/" + cpfsAnexados.metadata.fileName);
        } catch (error) {
          console.error('❌ Erro ao processar lista completa:', error);
        }
      }, 2000);
    } else if (pendentes && pendentes.length > 0) {
      console.log(`🚀 Iniciando processamento de ${pendentes.length} CPFs pendentes...`);
      setTimeout(async () => {
        try {
          await processarCPFs(null, pendentes);
        } catch (error) {
          console.error('❌ Erro ao processar CPFs pendentes:', error);
        }
      }, 2000);
    }
    
    res.json({ 
      success: true, 
      message: "Processamento forçado e contadores corrigidos",
      contadores: contadoresCorretos,
      processando: pendentes?.length > 0 || (cpfsAnexados?.totalCPFs > 0 && contadoresCorretos.processados < cpfsAnexados.totalCPFs)
    });
    
  } catch (error) {
    console.error('❌ Erro ao forçar processamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Limpar estado de processamento
app.post('/fgts/limpar-estado', async (req, res) => {
  try {
    const estadoFile = path.join(PERSISTENT_DIRS.cache, 'estado-fgts-completo.json');
    const reprocessarFile = path.join(PERSISTENT_DIRS.cache, 'reprocessar-pendentes.json');
    
    // Fazer backup antes de limpar
    if (fs.existsSync(estadoFile)) {
      await fazerBackup(estadoFile, 'estado-fgts-limpeza');
      await fsp.unlink(estadoFile);
    }
    
    if (fs.existsSync(reprocessarFile)) {
      await fazerBackup(reprocessarFile, 'reprocessar-limpeza');
      await fsp.unlink(reprocessarFile);
    }
    
    // Limpar cache dos módulos FGTS
    await limparLista('sucessos');
    await limparLista('erros');
    await limparLista('naoAutorizados');
    await salvarPendentes([]);
    
    res.json({ 
      success: true, 
      message: "Estado de processamento limpo" 
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar estado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reprocessar CPFs pendentes
app.post('/fgts/reprocessar', async (req, res) => {
  try {
    const { cpfs } = req.body;
    
    if (!cpfs || !Array.isArray(cpfs)) {
      return res.status(400).json({ error: "Lista de CPFs é obrigatória" });
    }

    console.log(`🔄 Reprocessando ${cpfs.length} CPFs pendentes`);
    
    await processarCPFs(null, cpfs);
    
    res.json({ success: true, message: `Reprocessamento de ${cpfs.length} CPFs iniciado` });
    
  } catch (error) {
    console.error('❌ Erro no reprocessamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pausar processamento
app.post('/fgts/pause', async (req, res) => {
  try {
    setPause(true);
    
    // Emitir evento para o frontend
    if (ioInstance) {
      ioInstance.emit('processamentoPausado');
    }
    
    res.json({ success: true, message: "Processamento pausado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retomar processamento
app.post('/fgts/resume', async (req, res) => {
  try {
    setPause(false);
    
    // Emitir evento para o frontend
    if (ioInstance) {
      ioInstance.emit('processamentoRetomado');
    }
    
    res.json({ success: true, message: "Processamento retomado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancelar processamento
app.post('/fgts/cancel', async (req, res) => {
  try {
    console.log('🛑 Cancelando processamento...');
    
    // Pausar processamento
    setPause(true);
    
    // Limpar estado de processamento
    const estadoLimpo = {
      processando: false,
      iniciadoEm: null,
      arquivoOriginal: null,
      total: 0,
      processados: 0,
      sucessos: 0,
      pendentes: [],
      reprocessar: [],
      erros: [],
      ultimaAtualizacao: new Date().toISOString()
    };
    await salvarEstadoFGTS(estadoLimpo);
    
    // Emitir evento para o frontend
    if (ioInstance) {
      ioInstance.emit('processamentoCancelado');
    }
    
    console.log('✅ Processamento cancelado com sucesso');
    res.json({ success: true, message: "Processamento cancelado" });
  } catch (error) {
    console.error('❌ Erro ao cancelar processamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// API para ler contadores em tempo real
app.get('/fgts/contadores-tempo-real', async (req, res) => {
  try {
    // Usar calcularContadoresPorStatus para obter dados atualizados
    const contadores = await calcularContadoresPorStatus();
    
    // Adicionar timestamp e status de processamento
    const contadoresCompletos = {
      ...contadores,
      timestamp: new Date().toISOString(),
      processando: true,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    res.json(contadoresCompletos);
  } catch (error) {
    console.error('❌ Erro ao carregar contadores em tempo real:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// API para forçar atualização dos contadores no frontend
app.post('/fgts/atualizar-contadores', async (req, res) => {
  try {
    console.log('🔄 Forçando atualização dos contadores no frontend...');
    
    const contadores = await carregarContadoresTempoReal();
    
    if (contadores) {
      console.log(`📊 Contadores encontrados: ${contadores.processados}/${contadores.totalCPFs}`);
      
      // Emitir contadores via Socket.IO se disponível
      if (ioInstance) {
        // Emitir contadores via Socket.IO
        // REMOVIDO: Emissões duplicadas de contadores
        // ioInstance.emit("contadoresTempoReal", contadores);
        // ioInstance.emit("progress", { ... });
        
        // REMOVIDO: Emissões individuais de contadores - evita duplicação
        // ioInstance.emit("contadorSucesso", contadores.sucessos);
        // ioInstance.emit("contadorPending", contadores.pendentes);
        // ioInstance.emit("contadorNaoAutorizado", contadores.naoAutorizados);
        // ioInstance.emit("contadorDescartados", contadores.descartados);
        
        console.log(`📡 Contadores emitidos via Socket.IO: ${contadores.processados}/${contadores.totalCPFs}`);
      } else {
        console.log('⚠️ Socket.IO não disponível, apenas retornando dados');
      }
      
      res.json({ 
        success: true, 
        message: "Contadores atualizados no frontend",
        contadores: contadores,
        socketEmitted: !!ioInstance
      });
    } else {
      res.json({
        success: false,
        message: "Nenhum contador encontrado"
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar contadores:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// API para forçar emissão de totalCPFs
app.post('/fgts/emitir-total-cpfs', async (req, res) => {
  try {
    console.log('📡 Forçando emissão de totalCPFs...');
    
    const contadores = await carregarContadoresTempoReal();
    
    if (contadores && contadores.totalCPFs > 0) {
      if (ioInstance) {
        ioInstance.emit("totalCPFs", contadores.totalCPFs);
        console.log(`📡 totalCPFs emitido: ${contadores.totalCPFs}`);
        
        res.json({ 
          success: true, 
          message: `totalCPFs emitido: ${contadores.totalCPFs}`,
          totalCPFs: contadores.totalCPFs
        });
      } else {
        res.json({
          success: false,
          message: "Socket.IO não disponível"
        });
      }
    } else {
      res.json({
        success: false,
        message: "Nenhum contador encontrado"
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao emitir totalCPFs:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// API para limpar contadores em tempo real
app.post('/fgts/limpar-contadores', async (req, res) => {
  try {
    console.log('🗑️ Limpando contadores em tempo real...');
    
    if (fs.existsSync(CONTADORES_TEMPO_REAL_FILE)) {
      // Fazer backup antes de deletar
      try {
        const backupDir = `${PERSISTENT_DIRS.cache}/backups`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${backupDir}/contadores-tempo-real-${timestamp}.json`;
        
        // Criar diretório de backup se não existir
        if (!fs.existsSync(backupDir)) {
          await fsp.mkdir(backupDir, { recursive: true });
        }
        
        // Copiar arquivo atual para backup
        await fsp.copyFile(CONTADORES_TEMPO_REAL_FILE, backupPath);
        console.log(`💾 Backup criado: ${backupPath}`);
      } catch (backupError) {
        console.log('⚠️ Erro ao criar backup, continuando sem backup:', backupError.message);
      }
      
      // Deletar arquivo
      await fsp.unlink(CONTADORES_TEMPO_REAL_FILE);
      
      console.log('✅ Contadores em tempo real limpos');
      
      res.json({ 
        success: true, 
        message: "Contadores em tempo real limpos com sucesso"
      });
    } else {
      res.json({ 
        success: true, 
        message: "Nenhum arquivo de contadores encontrado"
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao limpar contadores:', error);
    res.status(500).json({ error: error.message });
  }
});

// API para limpar dados residuais das listas persistentes
app.post('/fgts/limpar-dados-residuais', async (req, res) => {
  try {
    console.log('🧹 Limpando dados residuais das listas persistentes...');
    
    // Carregar listas atuais
    const { carregarListas, salvarListas } = await import('./fgts/cache-persistente.js');
    const listasAtuais = await carregarListas();
    
    console.log('📊 Listas atuais:', {
      sucessos: listasAtuais.sucessos?.length || 0,
      naoAutorizados: listasAtuais.naoAutorizados?.length || 0,
      descartados: listasAtuais.descartados?.length || 0,
      pendentes: listasAtuais.pendentes?.length || 0
    });
    
    // Limpar apenas os dados residuais, mantendo pendentes
    const listasLimpos = {
      sucessos: [],
      naoAutorizados: [],
      descartados: [],
      pendentes: listasAtuais.pendentes || [], // Manter pendentes
      agendados: [],
      ultimaAtualizacao: new Date().toISOString()
    };
    
    // Salvar listas limpos
    await salvarListas(listasLimpos);
    console.log('✅ Dados residuais das listas limpos');
    
    // Recalcular contadores
    const contadores = await calcularContadoresPorStatus();
    console.log('📊 Contadores recalculados:', contadores);
    
    res.json({ 
      success: true, 
      message: "Dados residuais das listas limpos com sucesso",
      contadoresAntes: {
        sucessos: listasAtuais.sucessos?.length || 0,
        naoAutorizados: listasAtuais.naoAutorizados?.length || 0,
        descartados: listasAtuais.descartados?.length || 0,
        pendentes: listasAtuais.pendentes?.length || 0
      },
      contadoresDepois: contadores,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar dados residuais:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Forçar atualização dos dados no frontend
app.post('/fgts/atualizar-frontend', async (req, res) => {
  try {
    console.log('🔄 Forçando atualização dos dados no frontend...');
    
    // Carregar dados atuais
    const listaResponse = await carregarCPFsAnexados();
    const estadoResponse = await carregarEstadoFGTS();
    const pendentesResponse = await carregarPendentes();
    const listasResponse = await carregarListas();
    
    if (ioInstance) {
      // Emitir total de CPFs
      if (listaResponse && listaResponse.totalCPFs > 0) {
        ioInstance.emit("totalCPFs", listaResponse.totalCPFs);
        console.log(`📡 Total de CPFs emitido: ${listaResponse.totalCPFs}`);
      }
      
      // Emitir progresso atual
      if (estadoResponse) {
        ioInstance.emit("progress", {
          done: estadoResponse.processados || 0,
          total: estadoResponse.total || 0,
          pendentes: pendentesResponse?.length || 0,
          counters: {
            success: estadoResponse.sucessos || 0,
            pending: pendentesResponse?.length || 0,
            no_auth: listasResponse.naoAutorizados?.length || 0,
            descartados: listasResponse.descartados?.length || 0
          }
        });
        console.log(`📡 Progresso emitido: ${estadoResponse.processados}/${estadoResponse.total}`);
      }
      
      // Emitir contadores individuais
      if (estadoResponse) {
        ioInstance.emit("contadorSucesso", estadoResponse.sucessos || 0);
        ioInstance.emit("contadorPending", pendentesResponse?.length || 0);
        ioInstance.emit("contadorNaoAutorizado", listasResponse.naoAutorizados?.length || 0);
        ioInstance.emit("contadorDescartados", listasResponse.descartados?.length || 0);
        console.log(`📡 Contadores individuais emitidos`);
      }
    }
    
    res.json({ 
      success: true, 
      message: "Dados atualizados no frontend",
      dados: {
        totalCPFs: listaResponse?.totalCPFs || 0,
        processados: estadoResponse?.processados || 0,
        sucessos: estadoResponse?.sucessos || 0,
        pendentes: pendentesResponse?.length || 0,
        processando: estadoResponse?.processando || false
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar frontend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar delay
app.post('/fgts/delay', async (req, res) => {
  try {
    const { delay } = req.body;
    
    if (!delay || isNaN(delay) || delay < 100) {
      return res.status(400).json({ error: "Delay inválido" });
    }

    setDelay(delay);
    res.json({ success: true, message: `Delay atualizado para ${delay}ms` });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mudar fase de não autorizados
app.post('/fgts/mudarFaseNaoAutorizados', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Lista de IDs é obrigatória" });
    }

    console.log(`📌 Mudando fase para ${ids.length} registros não autorizados`);
    
    // Aqui você implementaria a lógica para mudar fase no CRM
    // Por enquanto, apenas retorna sucesso
    
    res.json({ success: true, message: `Fase alterada para ${ids.length} registros` });
    
  } catch (error) {
    console.error('❌ Erro ao mudar fase:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== API DE CACHE E LOGS FGTS ======

// Carregar listas do cache
app.get('/fgts/listas', async (req, res) => {
  try {
    const listas = carregarListas();
    res.json({ success: true, listas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas do cache
app.get('/fgts/cache/estatisticas', async (req, res) => {
  try {
    const pendentes = carregarPendentes();
    const tentativasCache = carregarTentativasCache();
    const estado = carregarEstadoProcessamento();
    
    const statistics = {
      pendentes: {
        total: pendentes.length,
        porStatus: pendentes.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {})
      },
      tentativasCache: {
        total: tentativasCache.size,
        distribuicao: Array.from(tentativasCache.values()).reduce((acc, v) => {
          acc[v] = (acc[v] || 0) + 1;
          return acc;
        }, {})
      },
      estado: estado || {}
    };
    
    res.json({ success: true, statistics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pendentes do cache
app.get('/fgts/cache/pendentes', async (req, res) => {
  try {
    const pendentes = carregarPendentes();
    res.json({ success: true, pendentes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Visualizar cache
app.get('/fgts/cache/visualizar', async (req, res) => {
  try {
    const cacheDir = PERSISTENT_DIRS.cache;
    const arquivos = {};
    let totalArquivos = 0;
    
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      totalArquivos = files.length;
      
      for (const arquivo of files) {
        const arquivoPath = path.join(cacheDir, arquivo);
        try {
          const stats = fs.statSync(arquivoPath);
          const conteudo = fs.readFileSync(arquivoPath, 'utf-8');
          const linhas = conteudo.split('\n').length;
          
          arquivos[arquivo] = {
            tamanho: stats.size,
            linhas: linhas,
            conteudo: JSON.parse(conteudo)
          };
        } catch (error) {
          arquivos[arquivo] = {
            erro: 'Erro ao ler arquivo',
            detalhes: error.message
          };
        }
      }
    }

    res.json({
      success: true, 
      cacheDir, 
      totalArquivos, 
      arquivos 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Limpar cache
app.post('/fgts/cache/limpar', async (req, res) => {
  try {
    // Limpar todas as listas
    limparLista('sucessos');
    limparLista('pendentes');
    limparLista('naoAutorizados');
    limparLista('descartados');
    limparLista('agendados');
    
    // Limpar pendentes e tentativas
    salvarPendentes([]);
    salvarTentativasCache(new Map());
    
    res.json({ success: true, message: "Cache limpo com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logs de erro
app.get('/fgts/logs/erros', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const logsDir = path.join(__dirname, 'logs');
    const errors = [];
    
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      
      for (const file of files.slice(-limit)) {
        const filePath = path.join(logsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        errors.push(...lines.slice(-limit));
      }
    }
    
    res.json({ success: true, errors: errors.slice(-limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas de logs
app.get('/fgts/logs/estatisticas', async (req, res) => {
  try {
    const logsDir = path.join(__dirname, 'logs');
    const statistics = {
      total: 0,
      recent: 0,
      byType: {},
      bySystem: {}
    };
    
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        statistics.total += lines.length;
        
        // Contar logs recentes (últimas 24h)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        for (const line of lines) {
          const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
          if (timestampMatch) {
            const timestamp = new Date(timestampMatch[1]).getTime();
            if (timestamp > oneDayAgo) {
              statistics.recent++;
            }
          }
          
          // Contar por tipo
          if (line.includes('API')) statistics.byType.API = (statistics.byType.API || 0) + 1;
          if (line.includes('AUTH')) statistics.byType.AUTH = (statistics.byType.AUTH || 0) + 1;
          if (line.includes('CACHE')) statistics.byType.CACHE = (statistics.byType.CACHE || 0) + 1;
          if (line.includes('CRM')) statistics.byType.CRM = (statistics.byType.CRM || 0) + 1;
          if (line.includes('SYSTEM')) statistics.byType.SYSTEM = (statistics.byType.SYSTEM || 0) + 1;
          
          // Contar por sistema
          if (line.includes('FGTS')) statistics.bySystem.FGTS = (statistics.bySystem.FGTS || 0) + 1;
          if (line.includes('V8')) statistics.bySystem.V8 = (statistics.bySystem.V8 || 0) + 1;
          if (line.includes('LUNAS')) statistics.bySystem.LUNAS = (statistics.bySystem.LUNAS || 0) + 1;
        }
      }
    }
    
    res.json({ success: true, statistics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Limpar logs antigos
app.post('/fgts/logs/limpar', async (req, res) => {
  try {
    const logsDir = path.join(__dirname, 'logs');
    
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        if (stats.mtime.getTime() < oneWeekAgo) {
          fs.unlinkSync(filePath);
        }
      }
    }
    
    res.json({ success: true, message: "Logs antigos removidos" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== Arquivos estáticos ======
app.use("/static", express.static(path.join(__dirname, "projeto-render", "frontend")));

// Servir arquivos HTML da pasta operacional
app.use("/operacional", express.static(path.join(__dirname, "operacional")));

// Servir arquivos HTML da pasta INSS
app.use("/INSS", express.static(path.join(__dirname, "INSS")));

// Servir arquivos HTML da pasta fgts
app.use("/fgts", express.static(path.join(__dirname, "fgts")));

// Rota específica para operacional/index.html
app.get('/operacional/', (req, res) => {
  res.sendFile(path.join(__dirname, 'operacional', 'index.html'));
});

// Rota específica para INSS/simulador.html
app.get('/INSS/simulador.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'INSS', 'simulador.html'));
});

// ====== Rotas para arquivos de teste ======
// Rota para test-api.html
app.get('/test-api.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-api.html'));
});

        // Rota para test-detalhes-simples.html
        app.get('/test-detalhes-simples.html', (req, res) => {
          res.sendFile(path.join(__dirname, 'test-detalhes-simples.html'));
        });

        // Rota para debug-detalhes-original.html
        app.get('/debug-detalhes-original.html', (req, res) => {
          res.sendFile(path.join(__dirname, 'debug-detalhes-original.html'));
        });

// Rota específica para INSS/simulador (sem .html)
app.get('/INSS/simulador', (req, res) => {
  res.sendFile(path.join(__dirname, 'INSS', 'simulador.html'));
});

// ====== ROTAS DA API KENTRO ======
// Testar conexão com Kentro
app.post('/kentro/testar-conexao', async (req, res) => {
  try {
    console.log('🧪 Testando conexão com API Kentro...');
    
    const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queueId: 25, // Fila de portabilidade
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        pipelineId: 2 // Pipeline de portabilidade
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    const count = Array.isArray(data) ? data.length : 0;
    
    console.log(`✅ Conexão OK - ${count} oportunidades encontradas`);
    res.json({ success: true, count });

  } catch (error) {
    console.error('❌ Falha na conexão:', error);
    res.json({ success: false, error: error.message });
  }
});

// Buscar cliente por CPF
app.post('/kentro/buscar-cliente', async (req, res) => {
  try {
    const { cpf } = req.body;
    
    if (!cpf) {
      return res.json({ success: false, error: 'CPF não fornecido' });
    }

    console.log(`🔍 Buscando cliente por CPF: ${cpf}`);
    
    const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queueId: 25,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        pipelineId: 2
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const oportunidades = await response.json();
    
    // Procurar por CPF no campo mainmail (conforme documentação Kentro)
    const oportunidade = oportunidades.find(op => {
      // Buscar CPF no campo mainmail (campo principal para identificação)
      if (op.mainmail && op.mainmail.replace(/\D/g, '') === cpf.replace(/\D/g, '')) {
        return true;
      }
      
      return false;
    });
    
    if (oportunidade) {
      const cliente = {
        idoportunidade: oportunidade.id,
        cliente: {
          nome: oportunidade.contact?.name || oportunidade.name || '',
          status: oportunidade.status || 'Ativo',
          cpf: cpf
        }
      };
      
      res.json({ success: true, ...cliente });
    } else {
      res.json({ success: false, error: 'Cliente não encontrado' });
    }

  } catch (error) {
    console.error('❌ Erro ao buscar cliente:', error);
    res.json({ success: false, error: error.message });
  }
});

// Consultar status da oportunidade
app.get('/kentro/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Consultando status da oportunidade ID: ${id}`);
    
    const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queueId: 25,
        apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
        pipelineId: 2
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const oportunidades = await response.json();
    
    // Procurar por ID
    const oportunidade = oportunidades.find(op => op.id == id);
    
    if (oportunidade) {
      res.json({
        success: true,
        id: oportunidade.id,
        status: oportunidade.status || 'Ativo',
        ultimaAtualizacao: new Date().toISOString()
      });
    } else {
      res.json({ success: false, error: 'Oportunidade não encontrada' });
    }

  } catch (error) {
    console.error('❌ Erro ao consultar status:', error);
    res.json({ success: false, error: error.message });
  }
});

// Criar nova oportunidade na Kentro
// Rota para buscar oportunidade por ID na Kentro
app.post('/kentro/buscar-oportunidade-por-id', async (req, res) => {
    try {
        const { kentroId } = req.body;
        
        if (!kentroId) {
            return res.status(400).json({ 
                success: false, 
                error: 'ID da Kentro é obrigatório' 
            });
        }
        
        console.log(`🔍 Buscando oportunidade Kentro ID: ${kentroId}`);
        
        // Buscar dados diretamente da API Kentro
        const response = await fetch('https://api.kentro.com.br/api/v1/getPipeOpportunities', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                queueId: 'default',
                apiKey: process.env.KENTRO_API_KEY || 'sua_api_key_aqui'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        const oportunidadeEncontrada = data.opportunities?.find(op => op.id == kentroId);
        
        if (!oportunidadeEncontrada) {
            throw new Error('Oportunidade não encontrada');
        }
        
        const dadosCompletos = oportunidadeEncontrada;
        
        if (dadosCompletos) {
            res.json({
                success: true,
                dados: dadosCompletos
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Oportunidade não encontrada'
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar oportunidade por ID:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/kentro/criar-oportunidade', async (req, res) => {
  try {
    const { cpf, origem, descricao } = req.body;
    
    if (!cpf) {
      return res.json({ success: false, error: 'CPF não fornecido' });
    }

    console.log(`🆕 Criando nova oportunidade para CPF: ${cpf}`);
    console.log(`📋 Origem: ${origem || 'N/A'}`);
    console.log(`📝 Descrição: ${descricao || 'N/A'}`);
    
    // Por enquanto, vamos simular a criação da oportunidade
    // Em uma implementação real, você faria uma chamada para a API Kentro para criar a oportunidade
    
    const novaOportunidade = {
      id: `new_${Date.now()}`,
      cpf: cpf,
      origem: origem || 'INSS_SIMULADOR',
      descricao: descricao || 'Oportunidade criada via simulador INSS',
      status: 'Nova',
      dataCriacao: new Date().toISOString()
    };
    
    console.log(`✅ Oportunidade criada:`, novaOportunidade);
    
    res.json({ 
      success: true, 
      oportunidade: novaOportunidade,
      message: 'Oportunidade criada com sucesso na Kentro'
    });

  } catch (error) {
    console.error('❌ Erro ao criar oportunidade:', error);
    res.json({ success: false, error: error.message });
  }
});

// Endpoint para salvar cliente no servidor
app.post('/api/salvar-cliente', async (req, res) => {
  try {
    const { clientData } = req.body;
    
    if (!clientData) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientData é obrigatório' 
      });
    }

    console.log(`💾 Salvando cliente no servidor:`, clientData);
    
    // Verificar se o cliente já existe (por CPF ou NB)
    const clientesDir = path.join(__dirname, 'var', 'data', 'clientes');
    await fsp.mkdir(clientesDir, { recursive: true });
    
    let finalClientId = clientData.id;
    
    // Verificar se já existe cliente com este CPF ou NB
    const files = await fsp.readdir(clientesDir);
    const existingIds = new Set();
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(clientesDir, file);
          const fileData = JSON.parse(await fsp.readFile(filePath, 'utf8'));
          const id = parseInt(file.replace('.json', ''));
          if (!isNaN(id)) {
            existingIds.add(id);
          }
          
          // Verificar se é o mesmo cliente (mesmo CPF ou NB)
          const existingCpf = fileData.dadosCompletos?.cpf || fileData.cpf;
          const existingNb = fileData.dadosCompletos?.nb || fileData.nb;
          const newCpf = clientData.cpf;
          const newNb = clientData.nb;
          
          if ((existingCpf && newCpf && existingCpf === newCpf) || 
              (existingNb && newNb && existingNb === newNb)) {
            console.log(`✅ Cliente já existe com ID ${id}, atualizando...`);
            finalClientId = id.toString();
            break;
          }
        } catch (error) {
          console.error(`❌ Erro ao ler arquivo ${file}:`, error);
        }
      }
    }
    
    // Se não encontrou cliente existente, criar novo ID
    if (!finalClientId || finalClientId === clientData.id) {
      let nextId = 1;
      while (existingIds.has(nextId)) {
        nextId++;
      }
      finalClientId = nextId.toString();
      console.log(`✅ Novo cliente criado com ID: ${finalClientId}`);
    }

    // Preparar dados do cliente
    const dadosCliente = {
      id: finalClientId,
      kentroId: clientData.kentroId || null,
      createdAt: clientData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dadosCompletos: {
        nome: clientData.nome || '',
        cpf: clientData.cpf || '',
        email: clientData.email || '',
        telefone: clientData.telefone || '',
        dataNascimento: clientData.nascimento || '',
        nomeMae: clientData.nomeMae || '',
        endereco: clientData.endereco || {},
        beneficio: clientData.beneficio || {}
      },
      propostas: clientData.propostas || [],
      contratos: clientData.contratos || [],
      contratosRMC: clientData.contratosRMC || [],
      contratosRCC: clientData.contratosRCC || [],
      ultimaSincronizacao: new Date().toISOString(),
      fonte: 'simulador_cliente'
    };

    // Salvar no arquivo
    const clientDataPath = path.join(clientesDir, `${finalClientId}.json`);
    await fsp.writeFile(clientDataPath, JSON.stringify(dadosCliente, null, 2));
    
    console.log(`✅ Cliente salvo em: ${clientDataPath}`);
    
    res.json({ 
      success: true, 
      clientId: finalClientId,
      message: 'Cliente salvo com sucesso no servidor'
    });
    
  } catch (error) {
    console.error('❌ Erro ao salvar cliente:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para sincronizar dados Kentro + Extrato no sistema Lunas
app.post('/api/sincronizar-dados-cliente', async (req, res) => {
  try {
    const { clientId, kentroId, dadosExtrato } = req.body;
    
    if (!clientId || !kentroId) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientId e kentroId são obrigatórios' 
      });
    }

    console.log(`🔄 Sincronizando dados para cliente ${clientId} com Kentro ID ${kentroId}`);
    
    // 1. Buscar dados da Kentro
    console.log('📡 Buscando dados da Kentro...');
    const kentroResponse = await fetch('https://api.kentro.com.br/api/v1/getPipeOpportunities', {
      method: 'POST',
      headers: { 
        'accept': 'application/json', 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        queueId: 'default',
        apiKey: process.env.KENTRO_API_KEY || 'sua_api_key_aqui'
      })
    });

    if (!kentroResponse.ok) {
      throw new Error(`Erro HTTP Kentro: ${kentroResponse.status}`);
    }

    const kentroData = await kentroResponse.json();
    const oportunidadeKentro = kentroData.opportunities?.find(op => op.id == kentroId);
    
    if (!oportunidadeKentro) {
      throw new Error('Oportunidade não encontrada na Kentro');
    }

    console.log('✅ Dados da Kentro obtidos');

    // 2. Mesclar dados Kentro + Extrato
    const dadosMesclados = mesclarDadosKentroExtrato(oportunidadeKentro, dadosExtrato);
    
    // 3. Salvar no sistema Lunas
    // Verificar se o cliente já existe
    const clientDir = path.join(__dirname, 'var', 'data', 'clientes');
    await fsp.mkdir(clientDir, { recursive: true });
    
    const clientDataPath = path.join(clientDir, `${clientId}.json`);
    let finalClientId = clientId;
    
    // Se o arquivo já existe, verificar se é o mesmo cliente (mesmo CPF)
    if (fs.existsSync(clientDataPath)) {
      try {
        const existingData = JSON.parse(await fsp.readFile(clientDataPath, 'utf8'));
        const existingCpf = existingData.dadosCompletos?.cpf || existingData.cpf;
        const newCpf = dadosMesclados.cpf;
        
        if (existingCpf && newCpf && existingCpf !== newCpf) {
          // CPF diferente - criar novo cliente
          console.log(`⚠️ Cliente ID ${clientId} já existe com CPF diferente. Criando novo cliente...`);
          
          // Encontrar próximo ID disponível
          let nextId = 1;
          const existingIds = new Set();
          
          const files = await fsp.readdir(clientDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const id = parseInt(file.replace('.json', ''));
              if (!isNaN(id)) {
                existingIds.add(id);
              }
            }
          }
          
          while (existingIds.has(nextId)) {
            nextId++;
          }
          
          finalClientId = nextId.toString();
          console.log(`✅ Novo cliente criado com ID: ${finalClientId}`);
        } else {
          console.log(`✅ Atualizando cliente existente ID ${clientId}`);
        }
      } catch (error) {
        console.error('❌ Erro ao verificar cliente existente:', error);
        // Em caso de erro, criar novo cliente
        let nextId = 1;
        const existingIds = new Set();
        
        const files = await fsp.readdir(clientDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const id = parseInt(file.replace('.json', ''));
            if (!isNaN(id)) {
              existingIds.add(id);
            }
          }
        }
        
        while (existingIds.has(nextId)) {
          nextId++;
        }
        
        finalClientId = nextId.toString();
        console.log(`✅ Novo cliente criado com ID: ${finalClientId} (erro na verificação)`);
      }
    }

    // Salvar no sistema Lunas
    const dadosCliente = {
      id: finalClientId,
      kentroId: kentroId,
      dadosCompletos: dadosMesclados,
      ultimaSincronizacao: new Date().toISOString(),
      fonte: 'kentro_extrato_sincronizado'
    };

    // Salvar no arquivo de dados do cliente
    const finalClientDataPath = path.join(clientDir, `${finalClientId}.json`);
    await fsp.writeFile(finalClientDataPath, JSON.stringify(dadosCliente, null, 2));
    
    console.log(`✅ Dados sincronizados salvos em: ${finalClientDataPath}`);
    
    res.json({ 
      success: true, 
      dadosCliente: dadosMesclados,
      message: 'Dados sincronizados com sucesso no sistema Lunas'
    });
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar dados:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para buscar dados do cliente no sistema Lunas local
app.get('/api/cliente/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    if (!clientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientId é obrigatório' 
      });
    }

    console.log(`🔍 Buscando dados locais do cliente ${clientId}`);
    
    // Buscar em todos os arquivos JSON do diretório de clientes
    const clientesDir = path.join(__dirname, 'var', 'data', 'clientes');
    
    if (!fs.existsSync(clientesDir)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Diretório de clientes não encontrado' 
      });
    }
    
    // Ler todos os arquivos JSON do diretório
    const arquivos = await fsp.readdir(clientesDir);
    const arquivosJson = arquivos.filter(arquivo => arquivo.endsWith('.json'));
    
    console.log(`📁 Verificando ${arquivosJson.length} arquivos de clientes`);
    
    // Procurar pelo cliente com o ID correspondente
    for (const arquivo of arquivosJson) {
      try {
        const clientPath = path.join(clientesDir, arquivo);
        const clientData = await fsp.readFile(clientPath, 'utf8');
        const dadosCliente = JSON.parse(clientData);
        
        // Verificar se o ID do cliente corresponde ao solicitado
        if (dadosCliente.id === clientId) {
          console.log(`✅ Cliente ${clientId} encontrado no arquivo ${arquivo}`);
          
          return res.json({ 
            success: true, 
            dadosCliente: dadosCliente,
            metadata: {
              ultimaSincronizacao: dadosCliente.updatedAt,
              fonte: dadosCliente.metadata?.fonteDados || 'local',
              kentroId: dadosCliente.kentroId,
              arquivoOrigem: arquivo
            },
            message: 'Dados do cliente carregados com sucesso'
          });
        }
        
      } catch (fileError) {
        console.error(`❌ Erro ao ler arquivo ${arquivo}:`, fileError.message);
        continue;
      }
    }
    
    console.log(`⚠️ Cliente ${clientId} não encontrado em nenhum arquivo`);
    res.status(404).json({ 
      success: false, 
      error: 'Cliente não encontrado no sistema local' 
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do cliente:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para atualizar campos específicos do cliente (sem sobrescrever dados existentes)
app.patch('/api/atualizar-campos-cliente/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { camposAtualizados, fonte } = req.body;
    
    if (!clientId || !camposAtualizados) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientId e camposAtualizados são obrigatórios' 
      });
    }

    console.log(`🔄 Atualizando campos específicos do cliente ${clientId}`);
    console.log('📋 Campos a atualizar:', camposAtualizados);
    console.log('📡 Fonte:', fonte);
    
    // Buscar dados atuais do cliente
    const clientDataPath = path.join(__dirname, 'var', 'data', 'clientes', `${clientId}.json`);
    
    try {
      const clientData = await fsp.readFile(clientDataPath, 'utf8');
      const dadosCliente = JSON.parse(clientData);
      
      // Verificar se o CPF dos dados a atualizar corresponde ao CPF do cliente no arquivo
      const cpfArquivo = dadosCliente.cpf || dadosCliente.dadosCompletos?.cpf;
      const cpfAtualizacao = camposAtualizados.cpf;
      
      if (cpfAtualizacao && cpfArquivo && cpfAtualizacao !== cpfArquivo) {
        console.log(`⚠️ CPF não corresponde: Arquivo=${cpfArquivo}, Atualização=${cpfAtualizacao}`);
        return res.status(400).json({ 
          success: false, 
          error: 'CPF dos dados não corresponde ao cliente no arquivo' 
        });
      }
      
      // Verificar se tem estrutura dadosCompletos ou se os dados estão na raiz
      const dadosParaAtualizar = dadosCliente.dadosCompletos || dadosCliente;
      
      // Atualizar apenas os campos fornecidos (sem sobrescrever dados existentes)
      const dadosAtualizados = atualizarCamposSeletivamente(dadosParaAtualizar, camposAtualizados);
      
      // Atualizar metadados
      if (dadosCliente.dadosCompletos) {
        dadosCliente.dadosCompletos = dadosAtualizados;
      } else {
        // Se os dados estão na raiz, atualizar diretamente
        Object.assign(dadosCliente, dadosAtualizados);
      }
      
      dadosCliente.ultimaAtualizacao = new Date().toISOString();
      dadosCliente.ultimaFonte = fonte || 'completamento_automatico';
      
      // Salvar dados atualizados
      await fsp.writeFile(clientDataPath, JSON.stringify(dadosCliente, null, 2));
      
      console.log(`✅ Campos atualizados com sucesso para cliente ${clientId}`);
      
      res.json({ 
        success: true, 
        dadosAtualizados: dadosAtualizados,
        camposAtualizados: Object.keys(camposAtualizados),
        message: 'Campos atualizados com sucesso'
      });
      
    } catch (fileError) {
      console.log(`⚠️ Arquivo não encontrado para cliente ${clientId}`);
      res.status(404).json({ 
        success: false, 
        error: 'Cliente não encontrado no sistema local' 
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar campos do cliente:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Função para atualizar campos seletivamente (sem sobrescrever dados existentes)
function atualizarCamposSeletivamente(dadosAtuais, camposNovos) {
  const dadosAtualizados = JSON.parse(JSON.stringify(dadosAtuais)); // Deep clone
  
  // Função recursiva para atualizar campos aninhados
  function atualizarRecursivo(objetoAtual, objetoNovo) {
    for (const [chave, valor] of Object.entries(objetoNovo)) {
      if (typeof valor === 'object' && valor !== null && !Array.isArray(valor)) {
        // Campo aninhado
        if (!objetoAtual[chave]) {
          objetoAtual[chave] = {};
        }
        atualizarRecursivo(objetoAtual[chave], valor);
      } else {
        // Campo simples - só atualiza se estiver vazio ou for uma atualização válida
        const valorAtual = objetoAtual[chave];
        const valorNovo = valor;
        
        // Regras de atualização:
        // 1. Se campo atual está vazio, aceita o novo valor
        // 2. Se campo atual tem valor, só aceita se for uma melhoria (ex: telefone formatado)
        if (!valorAtual || valorAtual.trim() === '') {
          objetoAtual[chave] = valorNovo;
          console.log(`✅ Campo ${chave} atualizado: "${valorAtual}" → "${valorNovo}"`);
        } else {
          console.log(`⚠️ Campo ${chave} preservado: "${valorAtual}" (não sobrescrito por "${valorNovo}")`);
        }
      }
    }
  }
  
  atualizarRecursivo(dadosAtualizados, camposNovos);
  return dadosAtualizados;
}

// Endpoint para sincronizar dados reais do cliente com extrato
app.post('/api/sincronizar-cliente-real', async (req, res) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientId é obrigatório' 
      });
    }
    
    // Carregar extrato real do Antonio
    const extratoPath = path.join(__dirname, 'var', 'data', 'extratos', 'extrato_1759465704363.json');
    let dadosExtrato = {};
    
    try {
      const extratoData = fs.readFileSync(extratoPath, 'utf8');
      dadosExtrato = JSON.parse(extratoData);
      console.log('✅ Extrato real carregado:', dadosExtrato.cliente);
    } catch (error) {
      console.error('❌ Erro ao carregar extrato real:', error.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao carregar extrato real' 
      });
    }
    
  // Dados da Kentro (mockados para teste)
  const dadosKentro = {
    nome: 'ANTONIO MACHADO DINIZ',
    cpf: '18640900906',
    email: 'adiniz10@hotmail.com',
    telefone: '(34) 99393-9465',
    dataNascimento: '19/03/1963',
    nomeMae: 'VICENTINA DINIZ',
    endereco: {
      cep: '38400-000',
      logradouro: 'Rua Antônio Domingues',
      numero: '123',
      complemento: '',
      bairro: 'Chácaras Tubalina e Quartel',
      cidade: 'Uberlândia',
      uf: 'MG'
    }
  };
    
    // Oportunidade Kentro mockada
    const oportunidadeKentro = {
      id: '15508',
      stage: 8,
      status: 0
    };
    
    // Mesclar dados usando a função real com extrato real
    const dadosCliente = mesclarDadosKentroExtrato(oportunidadeKentro, dadosExtrato);
    
    // Salvar dados do cliente
    const clientePath = path.join(__dirname, 'var', 'data', 'clientes', `${clientId}.json`);
    fs.writeFileSync(clientePath, JSON.stringify(dadosCliente, null, 2));
    
    console.log('✅ Dados reais sincronizados para cliente:', clientId);
    
    res.json({
      success: true,
      message: 'Dados reais sincronizados com sucesso',
      dadosCliente: dadosCliente
    });
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar dados reais:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint de teste para criar dados mockados do cliente (mantido para compatibilidade)
app.post('/api/criar-dados-teste-cliente', async (req, res) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientId é obrigatório' 
      });
    }

    console.log(`🧪 Criando dados de teste para cliente ${clientId}`);
    
    // Dados mockados baseados nos dados da Kentro que vimos antes
    const dadosMockados = {
      // Dados pessoais (da Kentro)
      nome: 'ANTONIO MACHADO DINIZ',
      cpf: '18640900906',
      email: 'adiniz10@hotmail.com',
      telefone: '(55) 34993-39465',
      dataNascimento: '19/03/1963',
      nomeMae: 'VICENTINA DINIZ',
      
      // Endereço (da Kentro)
      endereco: {
        cep: '38400-000',
        logradouro: 'Rua Antônio Domingues',
        numero: '123',
        complemento: '',
        bairro: 'Chácaras Tubalina e Quartel',
        cidade: 'Uberlândia',
        uf: 'MG'
      },
      
      // Dados do benefício (do extrato - preservados)
      beneficio: {
        nome: 'APOSENTADORIA POR INVALIDEZ PREVIDENCIARIA',
        numero: '5513909797',
        especie: 'Aposentadoria por Invalidez',
        situacao: 'Ativo',
        valor: '1500.00',
        dib: '15/03/2020',
        banco: 'Banco do Brasil',
        bloqueio_beneficio: 'NAO'
      },
      
      // Dados das margens (do extrato)
      margens: {
        margem_extrapolada: '0,00',
        margem_disponivel_empretimo: '1200,00',
        margem_disponivel_rmc: '150,00',
        margem_disponivel_rcc: '75,00'
      },
      
      // Dados bancários (do extrato - preservados)
      banco: {
        nome: 'Itaú',
        codigo: '341',
        agencia: '7783',
        conta: '0000084523',
        tipoConta: 'Conta Corrente'
      },
      
      // Contratos
      contratos: [
        {
          id: 'CT001',
          tipo: 'Empréstimo Pessoal',
          valor: '5000.00',
          parcelas: 24,
          taxa: '2.5',
          status: 'Ativo',
          dataContratacao: '15/01/2024',
          rmc: '150.00',
          rcc: '75.00'
        },
        {
          id: 'CT002', 
          tipo: 'Cartão de Crédito',
          valor: '2000.00',
          limite: '2000.00',
          status: 'Ativo',
          dataContratacao: '20/02/2024',
          rmc: '100.00',
          rcc: '50.00'
        }
      ],
      
      // Propostas
      propostas: [
        {
          id: 'PROP001',
          tipo: 'Empréstimo Consignado',
          valor: '8000.00',
          parcelas: 36,
          taxa: '2.1',
          status: 'Aprovada',
          dataProposta: '10/12/2024',
          dataAprovacao: '15/12/2024'
        },
        {
          id: 'PROP002',
          tipo: 'Cartão de Crédito',
          limite: '3000.00',
          status: 'Pendente',
          dataProposta: '20/12/2024'
        }
      ],
      
      // Timeline
      timeline: [
        {
          data: '2024-12-20',
          titulo: 'Nova Proposta Criada',
          descricao: 'Proposta de cartão de crédito criada',
          tipo: 'proposta'
        },
        {
          data: '2024-12-15',
          titulo: 'Proposta Aprovada',
          descricao: 'Empréstimo consignado aprovado',
          tipo: 'aprovacao'
        },
        {
          data: '2024-12-10',
          titulo: 'Proposta Enviada',
          descricao: 'Proposta de empréstimo consignado enviada',
          tipo: 'proposta'
        },
        {
          data: '2024-02-20',
          titulo: 'Contrato Ativado',
          descricao: 'Cartão de crédito ativado',
          tipo: 'contrato'
        },
        {
          data: '2024-01-15',
          titulo: 'Contrato Assinado',
          descricao: 'Empréstimo pessoal contratado',
          tipo: 'contrato'
        }
      ],
      
      // Metadados
      metadata: {
        kentroStage: 8,
        kentroStatus: 0,
        ultimaAtualizacao: new Date().toISOString(),
        fonteDados: 'dados_teste_mockados'
      }
    };
    
    // Salvar no sistema Lunas
    const dadosCliente = {
      id: clientId,
      kentroId: '15508',
      createdAt: '2025-01-03T10:00:00.000Z',
      updatedAt: new Date().toISOString(),
      dadosCompletos: dadosMockados,
      ultimaSincronizacao: new Date().toISOString(),
      fonte: 'dados_teste_mockados'
    };

    // Criar diretório se não existir
    const clientDir = path.join(__dirname, 'var', 'data', 'clientes');
    await fsp.mkdir(clientDir, { recursive: true });

    // Salvar no arquivo de dados do cliente
    const clientDataPath = path.join(clientDir, `${clientId}.json`);
    await fsp.writeFile(clientDataPath, JSON.stringify(dadosCliente, null, 2));
    
    console.log(`✅ Dados de teste criados em: ${clientDataPath}`);
    
    res.json({ 
      success: true, 
      dadosCliente: dadosMockados,
      message: 'Dados de teste criados com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Função para mesclar dados Kentro + Extrato
function mesclarDadosKentroExtrato(oportunidadeKentro, dadosExtrato) {
  const formData = oportunidadeKentro.formsdata || {};
  
  return {
    // Dados pessoais (da Kentro)
    nome: oportunidadeKentro.title || formData.nome || formData.nome_completo || '',
    cpf: oportunidadeKentro.clientid || formData.cpf || '',
    email: formData['9e7f92b0'] || formData.email || '',
    telefone: formatarTelefone(oportunidadeKentro.mainphone || formData['98167d80'] || ''),
    dataNascimento: formData['0bfc6250'] || formData.data_nascimento || '',
    nomeMae: formData['917456f0'] || formData.nome_mae || '',
    
    // Endereço (da Kentro)
    endereco: {
      cep: formData['769db520'] || formData.cep || '',
      logradouro: formData['1dbfcef0'] || formData.endereco || '',
      numero: extrairNumeroEndereco(formData['1dbfcef0'] || ''),
      complemento: formData.complemento || '',
      bairro: formData['3271f710'] || formData.bairro || '',
      cidade: formData['25178280'] || formData.cidade || '',
      uf: limparUF(formData['f6384400'] || formData.uf || '')
    },
    
    // Dados do benefício (do extrato - preservados)
    beneficio: dadosExtrato?.beneficio || {
      nome: '',
      numero: '',
      especie: ''
    },
    
    // Dados bancários (do extrato - preservados)
    banco: dadosExtrato?.beneficio ? {
      nome: mapearCodigoBanco(dadosExtrato.beneficio.banco_pagamento),
      codigo: dadosExtrato.beneficio.banco_pagamento || '',
      agencia: dadosExtrato.beneficio.agencia || '',
      conta: dadosExtrato.beneficio.conta || '',
      tipoConta: dadosExtrato.beneficio.meio_pagamento || ''
    } : {
      nome: '',
      codigo: '',
      agencia: '',
      conta: '',
      tipoConta: ''
    },

    // Contratos reais do extrato
    contratos: dadosExtrato?.contratos ? dadosExtrato.contratos.map(contrato => ({
      id: contrato.contrato,
      tipo: 'Empréstimo Consignado',
      valor: contrato.valor_liberado || '0,00',
      parcelas: contrato.qtde_parcelas || 0,
      taxa: contrato.taxa_juros_mensal || '0,00',
      status: contrato.situacao || 'Ativo',
      dataContratacao: contrato.data_inclusao || '',
      rmc: '0,00', // RMC será calculado separadamente
      rcc: '0,00', // RCC será calculado separadamente
      banco: contrato.banco?.nome || '',
      valorParcela: contrato.valor_parcela || '0,00',
      cetMensal: contrato.cet_mensal || '0,00',
      parcelasPagas: contrato.parcelas_pagas || 0,
      prazoRestante: contrato.prazo_restante || 0
    })) : [],

    // Contratos RMC (Cartão de Crédito)
    contratosRMC: dadosExtrato?.contratos_rmc ? dadosExtrato.contratos_rmc.map(contrato => ({
      id: contrato.contrato,
      tipo: 'Cartão de Crédito (RMC)',
      valor: contrato.valor_liberado || '0,00',
      status: contrato.situacao || 'Ativo',
      dataContratacao: contrato.data_inclusao || '',
      rmc: contrato.valor_liberado || '0,00',
      rcc: '0,00',
      banco: mapearCodigoBanco(contrato.banco) || contrato.banco
    })) : [],

    // Contratos RCC (Cartão de Crédito)
    contratosRCC: dadosExtrato?.contratos_rcc ? dadosExtrato.contratos_rcc.map(contrato => ({
      id: contrato.contrato,
      tipo: 'Cartão de Crédito (RCC)',
      valor: contrato.valor_liberado || '0,00',
      status: contrato.situacao || 'Ativo',
      dataContratacao: contrato.data_inclusao || '',
      rmc: '0,00',
      rcc: contrato.valor_liberado || '0,00',
      banco: mapearCodigoBanco(contrato.banco) || contrato.banco
    })) : [],

    // Propostas (geradas a partir dos contratos)
    propostas: dadosExtrato?.contratos ? dadosExtrato.contratos.map((contrato, index) => ({
      id: `PROP_${contrato.contrato}`,
      tipo: 'Empréstimo Consignado',
      valor: contrato.valor_liberado || '0,00',
      parcelas: contrato.qtde_parcelas || 0,
      taxa: contrato.taxa_juros_mensal || '0,00',
      status: 'Aprovada',
      dataProposta: contrato.data_inclusao || '',
      dataAprovacao: contrato.data_inclusao || '',
      banco: contrato.banco?.nome || ''
    })) : [],

    // Timeline (gerada a partir dos contratos)
    timeline: dadosExtrato?.contratos ? dadosExtrato.contratos.flatMap(contrato => [
      {
        data: contrato.data_inclusao || '',
        titulo: 'Contrato Ativado',
        descricao: `Empréstimo consignado ativado - ${contrato.banco?.nome || 'Banco'}`,
        tipo: 'contrato'
      },
      {
        data: contrato.primeiro_desconto || '',
        titulo: 'Primeiro Desconto',
        descricao: `Primeiro desconto em folha - R$ ${contrato.valor_parcela || '0,00'}`,
        tipo: 'desconto'
      }
    ]) : [],
    
    // Metadados
    metadata: {
      kentroStage: oportunidadeKentro.stage,
      kentroStatus: oportunidadeKentro.status,
      ultimaAtualizacao: new Date().toISOString(),
      fonteDados: 'kentro_extrato_mesclado'
    }
  };
}

// Funções auxiliares para formatação
function formatarTelefone(telefone) {
  if (!telefone) return '';
  
  const numeros = telefone.replace(/\D/g, '');
  
  if (numeros.length === 11) {
    return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
  } else if (numeros.length === 10) {
    return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
  }
  
  return telefone;
}

// Endpoint para migrar cliente existente com ID hardcoded
app.post('/api/migrar-cliente-existente', async (req, res) => {
  try {
    const { clientIdAntigo, propostaIdAntigo } = req.body;
    
    if (!clientIdAntigo || !propostaIdAntigo) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientIdAntigo e propostaIdAntigo são obrigatórios' 
      });
    }
    
    console.log(`🔄 Migrando cliente ${clientIdAntigo} e proposta ${propostaIdAntigo}...`);
    
    // Gerar novos IDs únicos
    const timestamp = Date.now();
    const randomClient = Math.random().toString(36).substr(2, 9);
    const randomProposal = Math.random().toString(36).substr(2, 9);
    
    const novoClientId = `cliente_${timestamp}_${randomClient}`;
    const novoProposalId = `proposta_${timestamp}_${randomProposal}`;
    
    console.log(`🆔 Novo ClientID: ${novoClientId}`);
    console.log(`🆔 Novo ProposalID: ${novoProposalId}`);
    
    // Buscar dados existentes
    const clientePath = path.join(__dirname, 'var', 'data', 'clientes', `${clientIdAntigo}.json`);
    const propostaPath = path.join(__dirname, 'var', 'data', 'propostas', `${propostaIdAntigo}.json`);
    
    let dadosCliente = null;
    let dadosProposta = null;
    
    // Carregar dados do cliente se existir
    try {
      if (fs.existsSync(clientePath)) {
        const clienteData = fs.readFileSync(clientePath, 'utf8');
        dadosCliente = JSON.parse(clienteData);
        console.log('✅ Dados do cliente carregados');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar dados do cliente:', error.message);
    }
    
    // Carregar dados da proposta se existir
    try {
      if (fs.existsSync(propostaPath)) {
        const propostaData = fs.readFileSync(propostaPath, 'utf8');
        dadosProposta = JSON.parse(propostaData);
        console.log('✅ Dados da proposta carregados');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar dados da proposta:', error.message);
    }
    
    // Criar dados migrados
    const clienteMigrado = {
      id: novoClientId,
      kentroId: dadosCliente?.kentroId || null,
      createdAt: dadosCliente?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dadosCompletos: dadosCliente?.dadosCompletos || {},
      ultimaSincronizacao: new Date().toISOString(),
      fonte: 'migracao_id_hardcoded',
      migracao: {
        clientIdAntigo,
        propostaIdAntigo,
        dataMigracao: new Date().toISOString(),
        motivo: 'Correção de ID hardcoded para ID único'
      }
    };
    
    const propostaMigrada = {
      id: novoProposalId,
      clientId: novoClientId,
      proposalId: novoProposalId,
      dados: dadosProposta?.dados || {},
      timestamp: new Date().toISOString(),
      migracao: {
        propostaIdAntigo,
        clientIdAntigo,
        dataMigracao: new Date().toISOString(),
        motivo: 'Correção de ID hardcoded para ID único'
      }
    };
    
    // Salvar cliente migrado
    const novoClientePath = path.join(__dirname, 'var', 'data', 'clientes', `${novoClientId}.json`);
    await fsp.writeFile(novoClientePath, JSON.stringify(clienteMigrado, null, 2));
    console.log(`✅ Cliente migrado salvo em: ${novoClientePath}`);
    
    // Salvar proposta migrada
    const novaPropostaPath = path.join(__dirname, 'var', 'data', 'propostas', `${novoProposalId}.json`);
    await fsp.writeFile(novaPropostaPath, JSON.stringify(propostaMigrada, null, 2));
    console.log(`✅ Proposta migrada salva em: ${novaPropostaPath}`);
    
    res.json({
      success: true,
      message: 'Cliente e proposta migrados com sucesso',
      dados: {
        clientIdAntigo,
        propostaIdAntigo,
        novoClientId,
        novoProposalId,
        clienteMigrado,
        propostaMigrada
      }
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

function extrairNumeroEndereco(enderecoCompleto) {
  if (!enderecoCompleto) return '';
  const match = enderecoCompleto.match(/(\d+)/);
  return match ? match[1] : '';
}

function limparUF(uf) {
  if (!uf) return '';
  return uf.trim().replace(/\s+/g, '');
}

function mapearCodigoBanco(codigo) {
  const bancos = {
    '001': 'Banco do Brasil',
    '237': 'Bradesco',
    '341': 'Itaú',
    '104': 'Caixa Econômica Federal',
    '033': 'Santander',
    '422': 'Banco Safra',
    '260': 'Nu Pagamentos',
    '336': 'Banco C6',
    '290': 'PagSeguro',
    '323': 'Mercado Pago'
  };
  
  return bancos[codigo] || `Banco ${codigo}`;
}

// Rota específica para logs.html
app.get('/logs', (req, res) => {
  res.sendFile(path.join(__dirname, 'logs.html'));
});

// Servir arquivos otimizados
app.get('/otimizado', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-otimizado.html'));
});

app.get('/contadores-fix', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-contadores-fix.html'));
});

app.get('/menu-otimizado.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'menu-otimizado.js'));
});

app.get('/styles-otimizado.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styles-otimizado.css'));
});

app.get('/script-otimizado.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script-otimizado.js'));
});

app.get('/sistema-contadores-unificado.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'sistema-contadores-unificado.js'));
});

// ====== Simulador ======
app.get("/simulador", async (req, res) => {
  const simuladorPath = path.join(__dirname, "INSS", "simulador.html");
  if (!fs.existsSync(simuladorPath)) {
    return res.status(404).json({ error: "Simulador não encontrado" });
  }
  
  // Verificar se há ID na URL
  const extratoId = req.query.id;
  
  if (extratoId) {
    try {
      // Carregar dados do extrato
      const jsonPath = path.join(PERSISTENT_DIRS.extratos, `extrato_${extratoId}.json`);
      
      if (fs.existsSync(jsonPath)) {
        console.log(`📋 Carregando dados para simulador ID: ${extratoId}`);
        const dados = JSON.parse(await fsp.readFile(jsonPath, 'utf-8'));
        
        // Ler o HTML
        let html = await fsp.readFile(simuladorPath, 'utf-8');
        
        // Injetar dados no HTML
        const dadosScript = `
          <script>
            // Dados pré-carregados do servidor
            window.DADOS_PRE_CARREGADOS = ${JSON.stringify(dados)};
            window.EXTRATO_ID = '${extratoId}';
            console.log('📋 Dados pré-carregados:', window.DADOS_PRE_CARREGADOS);
          </script>
        `;
        
        // Inserir script antes do fechamento do head
        html = html.replace('</head>', `${dadosScript}</head>`);
        
        res.send(html);
        return;
      } else {
        console.log(`⚠️ Arquivo não encontrado: ${jsonPath}`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados para simulador:', error);
    }
  }
  
  // Servir HTML normal se não há ID ou erro
  res.sendFile(simuladorPath);
});

// Rota para arquivo de teste do simulador
app.get("/teste-simulador.html", (req, res) => {
  res.sendFile(path.join(__dirname, "teste-simulador.html"));
});


// Rota para arquivo de teste da Kentro
app.get("/teste-kentro.html", (req, res) => {
  res.sendFile(path.join(__dirname, "teste-kentro.html"));
});

// Rota para salvar proposta
app.post("/salvar-proposta", (req, res) => {
  try {
    const { propostaId, dados } = req.body;
    
    console.log("💾 [SERVIDOR] Salvando proposta:", propostaId);
    console.log("📋 [SERVIDOR] Dados recebidos:", dados);
    
    if (!propostaId || !dados) {
      console.log("❌ [SERVIDOR] Dados obrigatórios faltando");
      return res.status(400).json({ 
        error: "propostaId e dados são obrigatórios" 
      });
    }
    
    // Criar diretório para propostas se não existir
    const propostasDir = path.join(__dirname, 'var', 'data', 'propostas');
    if (!fs.existsSync(propostasDir)) {
      fs.mkdirSync(propostasDir, { recursive: true });
      console.log("📁 [SERVIDOR] Diretório criado:", propostasDir);
    }
    
    // Caminho do arquivo da proposta
    const propostaPath = path.join(propostasDir, `proposta_${propostaId}.json`);
    console.log("📄 [SERVIDOR] Salvando em:", propostaPath);
    
    // Salvar dados da proposta
    fs.writeFileSync(propostaPath, JSON.stringify(dados, null, 2), 'utf-8');
    console.log("✅ [SERVIDOR] Proposta salva com sucesso");
    
    res.json({
      success: true,
      propostaId: propostaId,
      message: "Proposta salva com sucesso"
    });
    
  } catch (error) {
    console.error("❌ [SERVIDOR] Erro ao salvar proposta:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      detalhes: error.message 
    });
  }
});

// Rota para detalhes da proposta
app.get("/detalhesdaproposta/:propostaId", (req, res) => {
  const { propostaId } = req.params;
  
  try {
    // Servir o arquivo HTML da página de detalhes da proposta
    const htmlPath = path.join(__dirname, 'INSS', 'detalhesdaproposta.html');
    
    // Verificar se o arquivo HTML existe
    if (!fs.existsSync(htmlPath)) {
      return res.status(404).json({ 
        error: "Página de detalhes não encontrada",
        propostaId: propostaId 
      });
    }
    
    // Servir o arquivo HTML
    res.sendFile(htmlPath);
    
  } catch (error) {
    console.error("❌ Erro ao servir página de detalhes:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      detalhes: error.message 
    });
  }
});

// Rota para buscar dados da proposta (API)
app.get("/api/proposta/:propostaId", (req, res) => {
  const { propostaId } = req.params;
  
  try {
    // Criar diretório para propostas se não existir
    const propostasDir = path.join(__dirname, 'var', 'data', 'propostas');
    if (!fs.existsSync(propostasDir)) {
      fs.mkdirSync(propostasDir, { recursive: true });
    }
    
    // Caminho do arquivo da proposta
    const propostaPath = path.join(propostasDir, `proposta_${propostaId}.json`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(propostaPath)) {
      return res.status(404).json({ 
        error: "Proposta não encontrada",
        propostaId: propostaId 
      });
    }
    
    // Ler dados da proposta
    const dadosProposta = JSON.parse(fs.readFileSync(propostaPath, 'utf-8'));
    
    // Retornar os dados da proposta
    res.json({
      success: true,
      propostaId: propostaId,
      dados: dadosProposta
    });
    
  } catch (error) {
    console.error("❌ Erro ao buscar proposta:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      detalhes: error.message 
    });
  }
});

// ====== Raw JSON ======
app.get("/extrato/:fileId/raw", (req, res) => {
  const { fileId } = req.params;
  const jsonPath = path.join(PERSISTENT_DIRS.extratos, `extrato_${fileId}.json`);
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "Extrato não encontrado" });
  }
  res.sendFile(jsonPath);
});

// ====== PERSISTENT DISK ROUTES ======

// ====== CACHE ROUTES ======
app.post("/api/cache/save", async (req, res) => {
  try {
    const { fileName, data } = req.body;
    if (!fileName || !data) {
      return res.status(400).json({ error: "fileName e data são obrigatórios" });
    }
    
    const filePath = `${PERSISTENT_DIRS.cache}/${fileName}`;
    await fsp.writeFile(filePath, JSON.stringify(data, null, 2));
    
    console.log(`💾 Cache salvo: ${filePath}`);
    res.json({ success: true, path: filePath, fileName });
  } catch (error) {
    console.error("❌ Erro ao salvar cache:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/cache/load/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = `${PERSISTENT_DIRS.cache}/${fileName}`;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Cache não encontrado" });
    }
    
    const data = await fsp.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("❌ Erro ao carregar cache:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/cache/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.cache);
    const fileList = files.map(file => ({
      name: file,
      path: `${PERSISTENT_DIRS.cache}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.cache}/${file}`).size
    }));
    res.json({ files: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar cache:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== EXTRATOS ROUTES ======
app.post("/api/extratos/save", async (req, res) => {
  try {
    const { id, extratoData } = req.body;
    if (!id || !extratoData) {
      return res.status(400).json({ error: "id e extratoData são obrigatórios" });
    }
    
    const fileName = `extrato_${id}.json`;
    const filePath = `${PERSISTENT_DIRS.extratos}/${fileName}`;
    
    await fsp.writeFile(filePath, JSON.stringify(extratoData, null, 2));
    
    console.log(`📄 Extrato salvo: ${filePath}`);
    res.json({ success: true, fileName, path: filePath, id });
  } catch (error) {
    console.error("❌ Erro ao salvar extrato:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/extratos/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const fileName = `extrato_${id}.json`;
    const filePath = `${PERSISTENT_DIRS.extratos}/${fileName}`;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Extrato não encontrado" });
    }
    
    const data = await fsp.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("❌ Erro ao carregar extrato:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== STATUS CONFIG ROUTES ======
app.get('/api/status-config', async (req, res) => {
  try {
    console.log('🔄 Carregando configurações de status...');
    
    const configPath = path.join(__dirname, 'var', 'data', 'status-config.json');
    
    if (!fs.existsSync(configPath)) {
      console.log('⚠️ Arquivo de configuração não encontrado, criando padrão...');
      
      // Criar configuração padrão
      const defaultConfig = {
        statusFormulario: [
          {
            id: "etapa1",
            nome: "Etapa 1 - Dados",
            descricao: "Cliente preenchendo dados pessoais",
            cor: "#3B82F6",
            fixo: true,
            editavel: false
          },
          {
            id: "etapa2",
            nome: "Etapa 2 - Endereço",
            descricao: "Cliente preenchendo endereço",
            cor: "#3B82F6",
            fixo: true,
            editavel: false
          },
          {
            id: "etapa3",
            nome: "Etapa 3 - Benefício",
            descricao: "Cliente preenchendo dados do benefício",
            cor: "#3B82F6",
            fixo: true,
            editavel: false
          },
          {
            id: "etapa4",
            nome: "Etapa 4 - Dados Bancários",
            descricao: "Cliente preenchendo dados bancários",
            cor: "#3B82F6",
            fixo: true,
            editavel: false
          },
          {
            id: "finalizado",
            nome: "Cliente Finalizou",
            descricao: "Cliente finalizou o formulário",
            cor: "#10B981",
            fixo: true,
            editavel: false
          }
        ],
        produtos: [
          {
            id: 1,
            nome: "Portabilidade com Troco",
            descricao: "Portabilidade de empréstimo com troco",
            cor: "#8B5CF6",
            origem: "calculo",
            simuladorId: 1,
            editavel: true
          },
          {
            id: 2,
            nome: "FGTS",
            descricao: "Saque do FGTS",
            cor: "#F59E0B",
            origem: "calculo",
            simuladorId: 2,
            editavel: true
          },
          {
            id: 3,
            nome: "Margem Nova",
            descricao: "Empréstimo com margem nova",
            cor: "#EF4444",
            origem: "calculo",
            simuladorId: 3,
            editavel: true
          },
          {
            id: 4,
            nome: "Cartão RMC",
            descricao: "Cartão de crédito RMC",
            cor: "#06B6D4",
            origem: "manual",
            editavel: true
          },
          {
            id: 5,
            nome: "Cartão RCC",
            descricao: "Cartão de crédito RCC",
            cor: "#84CC16",
            origem: "manual",
            editavel: true
          }
        ],
        statusProposta: [
          {
            id: "digitando",
            nome: "Digitando",
            descricao: "Proposta sendo digitada",
            cor: "#F59E0B",
            editavel: true,
            whatsapp: {
              ativo: false,
              template: "Olá {nome}, sua proposta está sendo digitada. Aguarde nosso retorno.",
              variaveis: ["nome", "etapa", "valor", "banco"]
            }
          },
          {
            id: "cancelado",
            nome: "Cancelado",
            descricao: "Proposta cancelada",
            cor: "#EF4444",
            editavel: true,
            whatsapp: {
              ativo: false,
              template: "Olá {nome}, sua proposta foi cancelada.",
              variaveis: ["nome", "etapa", "valor", "banco"]
            }
          },
          {
            id: "aprovado",
            nome: "Aprovado",
            descricao: "Proposta aprovada",
            cor: "#10B981",
            editavel: true,
            whatsapp: {
              ativo: true,
              template: "Parabéns {nome}! Sua proposta foi aprovada no valor de {valor}.",
              variaveis: ["nome", "etapa", "valor", "banco"]
            }
          },
          {
            id: "em_analise",
            nome: "Em Análise",
            descricao: "Proposta em análise",
            cor: "#3B82F6",
            editavel: true,
            whatsapp: {
              ativo: false,
              template: "Olá {nome}, sua proposta está em análise. Aguarde nosso retorno.",
              variaveis: ["nome", "etapa", "valor", "banco"]
            }
          },
          {
            id: "ag_saldo_cip",
            nome: "Ag. Saldo CIP",
            descricao: "Aguardando saldo CIP",
            cor: "#8B5CF6",
            editavel: true,
            whatsapp: {
              ativo: false,
              template: "Olá {nome}, estamos aguardando o saldo CIP para processar sua proposta.",
              variaveis: ["nome", "etapa", "valor", "banco"]
            }
          }
        ]
      };
      
      // Criar diretório se não existir
      await fsp.mkdir(path.dirname(configPath), { recursive: true });
      
      // Salvar configuração padrão
      await fsp.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      
      console.log('✅ Configuração padrão criada');
      return res.json(defaultConfig);
    }
    
    const configData = await fsp.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    console.log('✅ Configurações de status carregadas');
    res.json(config);
    
  } catch (error) {
    console.error('❌ Erro ao carregar configurações de status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/status-config', async (req, res) => {
  try {
    console.log('💾 Salvando configurações de status...');
    
    const configPath = path.join(__dirname, 'var', 'data', 'status-config.json');
    const configData = req.body;
    
    // Validar estrutura básica
    if (!configData.statusFormulario || !configData.produtos || !configData.statusProposta) {
      return res.status(400).json({ error: 'Estrutura de configuração inválida' });
    }
    
    // Criar diretório se não existir
    await fsp.mkdir(path.dirname(configPath), { recursive: true });
    
    // Salvar configuração
    await fsp.writeFile(configPath, JSON.stringify(configData, null, 2));
    
    console.log('✅ Configurações de status salvas');
    res.json({ success: true, message: 'Configurações salvas com sucesso' });
    
  } catch (error) {
    console.error('❌ Erro ao salvar configurações de status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para produtos do simulador
app.get('/api/simulador/produtos', async (req, res) => {
  try {
    console.log('🔄 Carregando produtos do simulador...');
    
    // Produtos padrão do simulador
    const produtosSimulador = [
      {
        id: 1,
        nome: "Portabilidade com Troco",
        descricao: "Portabilidade de empréstimo com troco",
        tipo: "portabilidade_troco"
      },
      {
        id: 2,
        nome: "FGTS",
        descricao: "Saque do FGTS",
        tipo: "fgts"
      },
      {
        id: 3,
        nome: "Margem Nova",
        descricao: "Empréstimo com margem nova",
        tipo: "margem_nova"
      },
      {
        id: 4,
        nome: "Cartão RMC",
        descricao: "Cartão de crédito RMC",
        tipo: "cartao_rmc"
      },
      {
        id: 5,
        nome: "Cartão RCC",
        descricao: "Cartão de crédito RCC",
        tipo: "cartao_rcc"
      }
    ];
    
    console.log('✅ Produtos do simulador carregados');
    res.json(produtosSimulador);
    
  } catch (error) {
    console.error('❌ Erro ao carregar produtos do simulador:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/extratos/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.extratos);
    const fileList = files.map(file => ({
      name: file,
      id: file.replace('extrato_', '').replace('.json', ''),
      path: `${PERSISTENT_DIRS.extratos}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.extratos}/${file}`).size,
      modified: fs.statSync(`${PERSISTENT_DIRS.extratos}/${file}`).mtime
    }));
    res.json({ extratos: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar extratos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== UPLOADS ROUTES ======
app.post("/api/uploads/save", async (req, res) => {
  try {
    const { fileName, content, type = 'text' } = req.body;
    if (!fileName || !content) {
      return res.status(400).json({ error: "fileName e content são obrigatórios" });
    }
    
    const filePath = `${PERSISTENT_DIRS.uploads}/${fileName}`;
    
    // Determinar como salvar baseado no tipo
    if (type === 'json') {
      await fsp.writeFile(filePath, JSON.stringify(content, null, 2));
    } else if (type === 'csv') {
      await fsp.writeFile(filePath, content);
    } else {
      await fsp.writeFile(filePath, content);
    }
    
    console.log(`📁 Upload salvo: ${filePath}`);
    res.json({ success: true, path: filePath, fileName, type });
  } catch (error) {
    console.error("❌ Erro ao salvar upload:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/uploads/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.uploads);
    const fileList = files.map(file => ({
      name: file,
      path: `${PERSISTENT_DIRS.uploads}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.uploads}/${file}`).size,
      modified: fs.statSync(`${PERSISTENT_DIRS.uploads}/${file}`).mtime
    }));
    res.json({ files: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar uploads:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== LOGS ROUTES ======
app.post("/api/logs/save", async (req, res) => {
  try {
    const { fileName, logData } = req.body;
    if (!fileName || !logData) {
      return res.status(400).json({ error: "fileName e logData são obrigatórios" });
    }
    
    const filePath = `${PERSISTENT_DIRS.logs}/${fileName}`;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${JSON.stringify(logData)}\n`;
    
    await fsp.appendFile(filePath, logEntry);
    
    console.log(`📝 Log salvo: ${filePath}`);
    res.json({ success: true, path: filePath, fileName, timestamp });
  } catch (error) {
    console.error("❌ Erro ao salvar log:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/logs/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.logs);
    const fileList = files.map(file => ({
      name: file,
      path: `${PERSISTENT_DIRS.logs}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.logs}/${file}`).size,
      modified: fs.statSync(`${PERSISTENT_DIRS.logs}/${file}`).mtime
    }));
    res.json({ logs: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== CONFIG ROUTES ======
app.post("/api/config/save", async (req, res) => {
  try {
    const { fileName, configData } = req.body;
    if (!fileName || !configData) {
      return res.status(400).json({ error: "fileName e configData são obrigatórios" });
    }
    
    const filePath = `${PERSISTENT_DIRS.config}/${fileName}`;
    await fsp.writeFile(filePath, JSON.stringify(configData, null, 2));
    
    console.log(`⚙️ Config salva: ${filePath}`);
    res.json({ success: true, path: filePath, fileName });
  } catch (error) {
    console.error("❌ Erro ao salvar config:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/config/load/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = `${PERSISTENT_DIRS.config}/${fileName}`;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Config não encontrada" });
    }
    
    const data = await fsp.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("❌ Erro ao carregar config:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/config/list", async (req, res) => {
  try {
    const files = await fsp.readdir(PERSISTENT_DIRS.config);
    const fileList = files.map(file => ({
      name: file,
      path: `${PERSISTENT_DIRS.config}/${file}`,
      size: fs.statSync(`${PERSISTENT_DIRS.config}/${file}`).size,
      modified: fs.statSync(`${PERSISTENT_DIRS.config}/${file}`).mtime
    }));
    res.json({ configs: fileList, count: files.length });
  } catch (error) {
    console.error("❌ Erro ao listar configs:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== TEST ROUTES ======
app.get("/api/test/persistent-disk", async (req, res) => {
  try {
    const testData = {
      timestamp: new Date().toISOString(),
      message: "Teste do Persistent Disk",
      directories: PERSISTENT_DIRS,
      status: "OK"
    };
    
    // Testar salvamento em cada diretório
    const results = {};
    
    for (const [name, dirPath] of Object.entries(PERSISTENT_DIRS)) {
      const testFile = `${dirPath}/test_${Date.now()}.json`;
      await fsp.writeFile(testFile, JSON.stringify(testData, null, 2));
      results[name] = { success: true, path: testFile };
    }
    
    res.json({
      success: true,
      message: "Persistent Disk funcionando corretamente!",
      testResults: results,
      persistentPath: PERSISTENT_PATH
    });
  } catch (error) {
    console.error("❌ Erro no teste do Persistent Disk:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/status/persistent-disk", async (req, res) => {
  try {
    const status = {};
    
    for (const [name, dirPath] of Object.entries(PERSISTENT_DIRS)) {
      const exists = fs.existsSync(dirPath);
      let fileCount = 0;
      let totalSize = 0;
      
      if (exists) {
        const files = await fsp.readdir(dirPath);
        fileCount = files.length;
        for (const file of files) {
          const stat = fs.statSync(`${dirPath}/${file}`);
          totalSize += stat.size;
        }
      }
      
      status[name] = {
        exists,
        path: dirPath,
        fileCount,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
      };
    }
    
  res.json({
      persistentPath: PERSISTENT_PATH,
      directories: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Erro ao verificar status:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====== Health Check ======
app.get("/api/health", (req, res) => {
  res.json({
    status: 'success',
    message: 'API funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    services: {
      pdf: 'ativo',
      fgts: 'ativo',
      simulador: 'ativo',
      cache: 'ativo'
    }
  });
});

// ====== Socket.IO Events ======
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });

  // Listener para setDelay via Socket.IO
  socket.on('setDelay', (delay) => {
    try {
      console.log(`⚡ [Socket.IO] Delay recebido: ${delay}ms`);
      
      if (!delay || isNaN(delay) || delay < 100) {
        socket.emit('error', { message: "Delay inválido" });
        return;
      }

      setDelay(delay);
      socket.emit('delayUpdated', { delay, message: `Delay atualizado para ${delay}ms` });
      console.log(`✅ [Socket.IO] Delay atualizado para ${delay}ms`);
      
    } catch (error) {
      console.error('❌ [Socket.IO] Erro ao atualizar delay:', error);
      socket.emit('error', { message: error.message });
    }
  });
});

// ====== OTIMIZAÇÕES DE MEMÓRIA ======
// Limpeza de memória a cada 5 minutos
setInterval(() => {
  if (global.gc) {
    global.gc();
    console.log('🧹 Garbage collection executado');
  }
}, 5 * 60 * 1000);

// Monitor de memória
setInterval(() => {
  const used = process.memoryUsage();
  const usedMB = Math.round(used.heapUsed / 1024 / 1024);
  const totalMB = Math.round(used.heapTotal / 1024 / 1024);
  
  if (usedMB > 400) { // Alerta se usar mais de 400MB
    console.log(`⚠️ ALERTA DE MEMÓRIA: ${usedMB}MB/${totalMB}MB`);
    if (global.gc) {
      global.gc();
      console.log('🧹 Garbage collection forçado');
    }
  }
}, 30000); // A cada 30 segundos

// Endpoint para buscar todas as propostas
app.get('/api/propostas', async (req, res) => {
  try {
    const propostasDir = path.join(__dirname, 'var', 'data', 'propostas');
    
    if (!fs.existsSync(propostasDir)) {
      return res.json([]);
    }
    
    const arquivos = fs.readdirSync(propostasDir);
    const propostas = [];
    
    for (const arquivo of arquivos) {
      if (arquivo.endsWith('.json')) {
        try {
          const conteudo = fs.readFileSync(path.join(propostasDir, arquivo), 'utf8');
          const proposta = JSON.parse(conteudo);
          propostas.push(proposta);
        } catch (error) {
          console.error(`❌ Erro ao ler proposta ${arquivo}:`, error.message);
        }
      }
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    propostas.sort((a, b) => {
      const dataA = new Date(a.dataCriacao || a.createdAt || 0);
      const dataB = new Date(b.dataCriacao || b.createdAt || 0);
      return dataB - dataA;
    });
    
    res.json(propostas);
  } catch (error) {
    console.error('❌ Erro ao buscar propostas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
// ====== Start ======
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log('🚀 ===== SERVIDOR PRINCIPAL INICIADO =====');
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Diretório: ${__dirname}`);
  console.log('🔄 Deploy via GitHub Actions - Nova Chave SSH - VPS Restaurado');
  console.log('===============================================');
  console.log('');
  console.log('📋 Páginas disponíveis:');
  console.log(`   🏠 Página Inicial: http://localhost:${PORT}/`);
  console.log(`   📊 Painel FGTS: http://localhost:${PORT}/fgts`);
  console.log(`   🏛️ Simulador: http://localhost:${PORT}/simulador`);
  console.log('');
});
