import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import multer from "multer";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import { calcularTrocoEndpoint } from "./calculo.js";
import { extrairDeUpload } from "./extrair_pdf.js";
import PQueue from "p-queue";

// Importar módulos FGTS
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
} from "./fgts_csv.js";

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
} from "./cache-persistente.js";

import { 
  logApiError, 
  logAuthError, 
  logCacheError, 
  logCrmError, 
  logSystemError 
} from "./error-logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== PERSISTENT DISK CONFIGURATION ======
const PERSISTENT_PATH = '/var/data';
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

// Continuar processamento de onde parou
async function continuarProcessamento() {
  try {
    console.log('🔍 ===== VERIFICANDO PROCESSAMENTO PENDENTE =====');
    
    // Inicializar status de CPFs se necessário
    await inicializarStatusCPFs();
    
    // Carregar contadores baseados em status
    const contadores = await calcularContadoresPorStatus();
    console.log('📊 Contadores baseados em status:', contadores);
    
    // Salvar contadores de tempo real
    await atualizarContadoresTempoReal(contadores);
    
    // Emitir para o frontend
    if (ioInstance) {
      ioInstance.emit('totalCPFs', contadores.totalCPFs);
      ioInstance.emit('progress', {
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
    
    // Filtrar CPFs para processamento
    const { paraProcessar, ignorar } = await filtrarCPFsParaProcessamento();
    
    console.log(`📊 CPFs para processar: ${paraProcessar.length}`);
    console.log(`📊 CPFs ignorar: ${ignorar.length}`);
    
    if (paraProcessar.length > 0) {
      console.log('🚀 Iniciando processamento de CPFs pendentes...');
      
      // Registrar callback de atualização de contadores
      registrarAtualizadorContadores(atualizarContadoresTempoReal);
      
      // Processar CPFs pendentes
      const cpfsParaProcessar = paraProcessar.map(cpf => cpf.cpf);
      processarCPFs(null, cpfsParaProcessar, (resultado) => {
        if (resultado) {
          console.log(`✅ CPF processado: ${resultado.cpf} - ${resultado.status}`);
          
          // Atualizar status do CPF baseado no resultado
          let novoStatus = 'NA FILA NOVO PROCESSAR';
          let tabulador = 'PENDENTE';
          
          switch (resultado.status) {
            case 'success':
              novoStatus = 'SUCESSO';
              tabulador = 'SUCESSO';
              break;
            case 'no_auth':
              novoStatus = 'NÃO AUTORIZADO';
              tabulador = 'NÃO AUTORIZADO';
              break;
            case 'pending':
              novoStatus = 'PENDING';
              tabulador = 'PENDENTE';
              break;
            case 'reprocessar_rapido':
              novoStatus = 'REPROCESSAR RAPIDO';
              tabulador = 'PENDENTE';
              break;
            case 'limite_excedido':
              novoStatus = 'LIMITE EXCEDIDO';
              tabulador = 'PENDENTE';
              break;
          }
          
          // Atualizar status do CPF
          atualizarStatusCPF(resultado.cpf, novoStatus, {
            tabulador: tabulador,
            id: resultado.id || '',
            valor: resultado.valorLiberado || 0,
            provider: resultado.provider || 'sistema'
          });
        }
      });
    } else {
      console.log('✅ Nenhum CPF pendente para processar');
    }
    
    console.log('✅ ===== VERIFICAÇÃO DE PROCESSAMENTO CONCLUÍDA =====');
    
  } catch (error) {
    console.error('❌ Erro ao continuar processamento:', error);
  }
}

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

// Atualizar status de um CPF (OTIMIZADO PARA MEMÓRIA)
async function atualizarStatusCPF(cpf, status, dados = {}) {
  try {
    const statusData = await carregarStatusCPFs();
    
    if (!statusData.cpfs) {
      statusData.cpfs = {};
    }
    
    statusData.cpfs[cpf] = {
      status,
      ...dados,
      atualizadoEm: new Date().toISOString()
    };
    
    await salvarStatusCPFs(statusData);
    
    // OTIMIZAÇÃO: Emitir contadores apenas a cada 10 atualizações
    if (!global.contadorAtualizacoes) {
      global.contadorAtualizacoes = 0;
    }
    global.contadorAtualizacoes++;
    
    if (global.contadorAtualizacoes % 10 === 0 || status === 'SUCESSO' || status === 'NÃO AUTORIZADO') {
      const contadores = await calcularContadoresPorStatus();
      if (ioInstance) {
        ioInstance.emit("contadoresTempoReal", {
          ...contadores,
          timestamp: new Date().toISOString(),
          processando: true,
          ultimaAtualizacao: new Date().toISOString()
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar status do CPF:', error);
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
    const statusData = await carregarStatusCPFs();
    const cpfsAnexados = await carregarCPFsAnexados();
    
    if (!statusData.cpfs || !cpfsAnexados?.cpfs) {
      return {
        totalCPFs: 0,
        processados: 0,
        sucessos: 0,
        naoAutorizados: 0,
        pendentes: 0,
        descartados: 0
      };
    }
    
    let sucessos = 0;
    let naoAutorizados = 0;
    let pendentes = 0;
    let descartados = 0;
    
    // OTIMIZAÇÃO: Processar em lotes para economizar memória
    const batchSize = 1000;
    const totalCPFs = cpfsAnexados.cpfs.length;
    
    for (let i = 0; i < totalCPFs; i += batchSize) {
      const batch = cpfsAnexados.cpfs.slice(i, i + batchSize);
      
      for (const cpfData of batch) {
        const cpf = cpfData.cpf;
        const status = statusData.cpfs[cpf]?.status;
        
        if (!status) {
          pendentes++; // CPF sem status
        } else {
          switch (status) {
            case 'SUCESSO':
              sucessos++;
              break;
            case 'NÃO AUTORIZADO':
              naoAutorizados++;
              break;
            case 'REPROCESSAR RAPIDO':
            case 'PENDING':
            case 'LIMITE EXCEDIDO':
            case 'NA FILA NOVO PROCESSAR':
              pendentes++;
              break;
            default:
              descartados++;
          }
        }
      }
      
      // OTIMIZAÇÃO: Forçar garbage collection a cada lote
      if (global.gc && i % (batchSize * 5) === 0) {
        global.gc();
      }
    }
    
    const processados = sucessos + naoAutorizados;
    
    return {
      totalCPFs: totalCPFs,
      processados,
      sucessos,
      naoAutorizados,
      pendentes,
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
    if (!fs.existsSync(CPFS_CACHE_FILE)) {
      console.log('📋 Nenhum cache de CPFs encontrado');
      return null;
    }

    const data = JSON.parse(await fsp.readFile(CPFS_CACHE_FILE, 'utf-8'));
    console.log(`📋 Cache de CPFs carregado: ${data.totalCPFs} CPFs`);
    
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
    json.simulador_link = `https://api-extrato-1.onrender.com/simulador?id=${fileId}`;
    
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
    json.simulador_link = `https://api-extrato-1.onrender.com/simulador?id=${fileId}`;

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair/:fileId:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== Upload manual de PDF ======
app.post("/extrairpdf", upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado" });
    }

    const fileId = Date.now().toString(); // ID único baseado em timestamp
    const originalPath = req.file.path;
    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    
    // Renomear arquivo para padrão
    await fsp.rename(originalPath, pdfPath);
    console.log("📄 PDF upload salvo em", pdfPath);

    // Processar com fila
    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );

    // Adicionar link único para o simulador
    json.simulador_link = `https://api-extrato-1.onrender.com/simulador?id=${fileId}`;

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrairpdf:", err);
    res.status(500).json({ error: err.message });
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
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ====== API ENDPOINTS FGTS ======

// Upload e processamento de CSV
app.post('/fgts/run', uploadCSV.single('csvfile'), async (req, res) => {
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
    
    // Salvar lista completa no cache
    console.log('💾 Salvando lista completa no cache...');
    const cacheData = await salvarCPFsAnexados(registros, {
      fileName: req.file.filename,
      uploadTime: new Date().toISOString(),
      totalRegistros: registros.length
    });
    
    console.log(`✅ Lista de ${registros.length} CPFs salva no cache persistente`);
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
      total: registros.length,
      processados: 0,
      sucessos: 0,
      pendentes: registros.map((reg, i) => ({
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
    
    // Processar CPFs
    console.log('🚀 Iniciando processamento de CPFs...');
    await processarCPFs(req.file.path);
    
    console.log('✅ ===== UPLOAD CONCLUÍDO COM SUCESSO =====');
    
    res.json({ 
      success: true, 
      message: "Processamento iniciado",
      total: registros.length,
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
    const { obterAgendamentos } = await import('./fgts_csv.js');
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
    const cpfsAnexados = await carregarCPFsAnexados();
    
    if (!cpfsAnexados) {
      return res.json({
        success: true,
        message: "Nenhuma lista de CPFs encontrada",
        total: 0
      });
    }
    
    res.json({
      success: true,
      total: cpfsAnexados.totalCPFs,
      fileName: cpfsAnexados.metadata.fileName,
      uploadTime: cpfsAnexados.metadata.uploadTime,
      timestamp: cpfsAnexados.timestamp,
      cpfs: cpfsAnexados.cpfs.slice(0, 10), // Mostrar apenas os primeiros 10 para não sobrecarregar
      message: `Lista completa com ${cpfsAnexados.totalCPFs} CPFs`
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
    const { agendarDisparo } = await import('./fgts_csv.js');
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
    
    await continuarProcessamento();
    
    res.json({ 
      success: true, 
      message: "Processamento continuado" 
    });
    
  } catch (error) {
    console.error('❌ Erro ao continuar processamento:', error);
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
    let descartados = 0;
    
    if (cpfsAnexados?.cpfs && statusData?.cpfs) {
      for (let i = 0; i < sampleSize; i++) {
        const cpfData = cpfsAnexados.cpfs[i];
        const cpf = cpfData.cpf;
        const status = statusData.cpfs[cpf]?.status;
        
        if (!status) {
          pendentes++;
        } else {
          switch (status) {
            case 'SUCESSO':
              sucessos++;
              break;
            case 'NÃO AUTORIZADO':
              naoAutorizados++;
              break;
            case 'REPROCESSAR RAPIDO':
            case 'PENDING':
            case 'LIMITE EXCEDIDO':
            case 'NA FILA NOVO PROCESSAR':
              pendentes++;
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
    if (pendentes && pendentes.length > 0) {
      console.log(`🚀 Iniciando processamento de ${pendentes.length} CPFs pendentes...`);
      setTimeout(async () => {
        try {
          await processarCPFs(null, pendentes);
        } catch (error) {
          console.error('❌ Erro ao processar CPFs pendentes:', error);
        }
      }, 2000);
    } else if (cpfsAnexados && cpfsAnexados.totalCPFs > 0) {
      console.log(`🚀 Iniciando processamento da lista completa de ${cpfsAnexados.totalCPFs} CPFs...`);
      setTimeout(async () => {
        try {
          await processarCPFs(cpfsAnexados.fileName);
        } catch (error) {
          console.error('❌ Erro ao processar lista completa:', error);
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

// API para ler contadores em tempo real
app.get('/fgts/contadores-tempo-real', async (req, res) => {
  try {
    const contadores = await carregarContadoresTempoReal();
    
    if (contadores) {
      res.json({
        success: true,
        contadores: contadores
      });
    } else {
      res.json({
        success: false,
        message: 'Nenhum contador encontrado',
        contadores: null
      });
    }
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
        
        // Emitir contadores individuais
        ioInstance.emit("contadorSucesso", contadores.sucessos);
        ioInstance.emit("contadorPending", contadores.pendentes);
        ioInstance.emit("contadorNaoAutorizado", contadores.naoAutorizados);
        ioInstance.emit("contadorDescartados", contadores.descartados);
        
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
  const simuladorPath = path.join(__dirname, "projeto-render", "frontend", "simulador.html");
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

// ====== Start ======
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log('🚀 ===== SERVIDOR PRINCIPAL INICIADO =====');
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Diretório: ${__dirname}`);
  console.log('===============================================');
  console.log('');
  console.log('📋 Páginas disponíveis:');
  console.log(`   🏠 Página Inicial: http://localhost:${PORT}/`);
  console.log(`   📊 Painel FGTS: http://localhost:${PORT}/fgts`);
  console.log(`   🏛️ Simulador: http://localhost:${PORT}/simulador`);
  console.log('');
  
  // ====== VERIFICAR PROCESSAMENTO PENDENTE ======
  console.log('🔍 Verificando processamento pendente...');
  try {
    await continuarProcessamento();
  } catch (error) {
    console.error('❌ Erro ao verificar processamento pendente:', error);
  }
  
  // ====== FORÇAR PROCESSAMENTO SE HÁ CPFs PENDENTES ======
  setTimeout(async () => {
    try {
      console.log('🔍 Verificando se há CPFs pendentes para processar...');
      const pendentes = await carregarPendentes();
      const cpfsAnexados = await carregarCPFsAnexados();
      
      if (pendentes && pendentes.length > 0) {
        console.log(`🚀 FORÇANDO PROCESSAMENTO: ${pendentes.length} CPFs pendentes encontrados`);
        await processarCPFs(null, pendentes);
      } else if (cpfsAnexados && cpfsAnexados.totalCPFs > 0) {
        console.log(`🚀 FORÇANDO PROCESSAMENTO: Lista completa encontrada com ${cpfsAnexados.totalCPFs} CPFs`);
        await processarCPFs(cpfsAnexados.fileName);
      } else {
        console.log('✅ Nenhum CPF pendente encontrado - sistema limpo');
      }
    } catch (error) {
      console.error('❌ Erro ao forçar processamento:', error);
    }
  }, 10000); // Aguardar 10 segundos após inicialização
  
  console.log('✅ Sistema de estado persistente ativo');
  console.log('===============================================');
  console.log('');
  console.log('🔗 APIs disponíveis:');
  console.log(`   📄 Upload PDF: POST http://localhost:${PORT}/extrairpdf`);
  console.log(`   📄 Upload CSV: POST http://localhost:${PORT}/fgts/run`);
  console.log(`   🔄 Reprocessar: POST http://localhost:${PORT}/fgts/reprocessar`);
  console.log(`   ⏸️ Pausar: POST http://localhost:${PORT}/fgts/pause`);
  console.log(`   ▶️ Retomar: POST http://localhost:${PORT}/fgts/resume`);
  console.log(`   ⚡ Delay: POST http://localhost:${PORT}/fgts/delay`);
  console.log(`   📊 Estado: GET http://localhost:${PORT}/fgts/estado`);
  console.log(`   🚀 Continuar: POST http://localhost:${PORT}/fgts/continuar`);
  console.log(`   🧹 Limpar: POST http://localhost:${PORT}/fgts/limpar-estado`);
  console.log(`   📋 Pendentes: GET http://localhost:${PORT}/fgts/pendentes`);
  console.log(`   🚀 Processar Pendentes: POST http://localhost:${PORT}/fgts/processar-pendentes`);
  console.log(`   📋 Lista Completa: GET http://localhost:${PORT}/fgts/lista-completa`);
  console.log(`   🗑️ Limpar Lista: POST http://localhost:${PORT}/fgts/limpar-lista-completa`);
  console.log(`   🧹 Limpar CPFs Inválidos: POST http://localhost:${PORT}/fgts/limpar-cpfs-invalidos`);
  console.log(`   📊 Contadores Tempo Real: GET http://localhost:${PORT}/fgts/contadores-tempo-real`);
  console.log(`   🔄 Atualizar Contadores: POST http://localhost:${PORT}/fgts/atualizar-contadores`);
  console.log(`   📡 Emitir Total CPFs: POST http://localhost:${PORT}/fgts/emitir-total-cpfs`);
  console.log(`   🗑️ Limpar Contadores: POST http://localhost:${PORT}/fgts/limpar-contadores`);
  console.log(`   📅 Agendamentos: GET http://localhost:${PORT}/fgts/agendamentos`);
  console.log(`   🧪 Testar Agendamento: POST http://localhost:${PORT}/fgts/testar-agendamento`);
  console.log(`   📊 Cache: GET http://localhost:${PORT}/fgts/cache/estatisticas`);
  console.log(`   📋 Logs: GET http://localhost:${PORT}/fgts/logs/erros`);
  console.log(`   ❤️ Health: GET http://localhost:${PORT}/api/health`);
  console.log('===============================================');
});
