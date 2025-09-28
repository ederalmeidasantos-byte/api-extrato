import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações do cache
const CACHE_DIR = path.join(__dirname, 'cache');
const PENDENTES_FILE = path.join(CACHE_DIR, 'pendentes.json');
const TENTATIVAS_FILE = path.join(CACHE_DIR, 'tentativas-cache.json');
const ESTADO_FILE = path.join(CACHE_DIR, 'estado-processamento.json');
const LISTAS_FILE = path.join(CACHE_DIR, 'listas-resultados.json');
const BACKUP_DIR = path.join(CACHE_DIR, 'backups');

// Criar diretórios se não existirem
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Função para fazer backup antes de salvar
function fazerBackup(arquivo) {
  try {
    if (fs.existsSync(arquivo)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const nomeArquivo = path.basename(arquivo, '.json');
      const backupFile = path.join(BACKUP_DIR, `${nomeArquivo}-${timestamp}.json`);
      fs.copyFileSync(arquivo, backupFile);
      
      // Manter apenas os 5 backups mais recentes
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith(nomeArquivo))
        .map(file => ({
          name: file,
          path: path.join(BACKUP_DIR, file),
          time: fs.statSync(path.join(BACKUP_DIR, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);
      
      if (backups.length > 5) {
        backups.slice(5).forEach(backup => {
          fs.unlinkSync(backup.path);
        });
      }
    }
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error.message);
  }
}

// ===== CACHE DE PENDENTES =====
export function salvarPendentes(pendentes) {
  try {
    fazerBackup(PENDENTES_FILE);
    
    const dados = {
      pendentes: pendentes || [],
      ultimaAtualizacao: new Date().toISOString(),
      total: pendentes?.length || 0
    };
    
    fs.writeFileSync(PENDENTES_FILE, JSON.stringify(dados, null, 2), 'utf8');
    console.log(`💾 Pendentes salvos: ${dados.total} registros`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar pendentes:', error.message);
    return false;
  }
}

export function carregarPendentes() {
  try {
    if (!fs.existsSync(PENDENTES_FILE)) {
      return [];
    }
    
    const dados = JSON.parse(fs.readFileSync(PENDENTES_FILE, 'utf8'));
    console.log(`📂 Pendentes carregados: ${dados.total || 0} registros`);
    return dados.pendentes || [];
  } catch (error) {
    console.error('❌ Erro ao carregar pendentes:', error.message);
    return [];
  }
}

// ===== CACHE DE TENTATIVAS DE CACHE V8 =====
export function salvarTentativasCache(tentativasMap) {
  try {
    fazerBackup(TENTATIVAS_FILE);
    
    const dados = {
      tentativas: Object.fromEntries(tentativasMap),
      ultimaAtualizacao: new Date().toISOString(),
      total: tentativasMap.size
    };
    
    fs.writeFileSync(TENTATIVAS_FILE, JSON.stringify(dados, null, 2), 'utf8');
    console.log(`💾 Tentativas de cache salvas: ${dados.total} CPFs`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar tentativas de cache:', error.message);
    return false;
  }
}

export function carregarTentativasCache() {
  try {
    if (!fs.existsSync(TENTATIVAS_FILE)) {
      return new Map();
    }
    
    const dados = JSON.parse(fs.readFileSync(TENTATIVAS_FILE, 'utf8'));
    const tentativasMap = new Map(Object.entries(dados.tentativas || {}));
    console.log(`📂 Tentativas de cache carregadas: ${tentativasMap.size} CPFs`);
    return tentativasMap;
  } catch (error) {
    console.error('❌ Erro ao carregar tentativas de cache:', error.message);
    return new Map();
  }
}

// ===== CACHE DE ESTADO GERAL =====
export function salvarEstadoProcessamento(estado) {
  try {
    fazerBackup(ESTADO_FILE);
    
    const dados = {
      ...estado,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    fs.writeFileSync(ESTADO_FILE, JSON.stringify(dados, null, 2), 'utf8');
    console.log(`💾 Estado do processamento salvo`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar estado:', error.message);
    return false;
  }
}

export function carregarEstadoProcessamento() {
  try {
    if (!fs.existsSync(ESTADO_FILE)) {
      return {
        totalCPFs: 0,
        processados: 0,
        sucessos: 0,
        pendentes: 0,
        naoAutorizados: 0,
        descartados: 0,
        agendados: 0,
        delayAtual: 1000,
        ultimaAtualizacao: new Date().toISOString()
      };
    }
    
    const dados = JSON.parse(fs.readFileSync(ESTADO_FILE, 'utf8'));
    console.log(`📂 Estado do processamento carregado`);
    return dados;
  } catch (error) {
    console.error('❌ Erro ao carregar estado:', error.message);
    return {
      totalCPFs: 0,
      processados: 0,
      sucessos: 0,
      pendentes: 0,
      naoAutorizados: 0,
      descartados: 0,
      agendados: 0,
      delayAtual: 1000,
      ultimaAtualizacao: new Date().toISOString()
    };
  }
}

// ===== FUNÇÕES DE UTILIDADE =====
export function adicionarPendente(cpf, linha, status = 'pending', provider = 'bms_cartos', statusDetalhado = null) {
  try {
    const pendentes = carregarPendentes();
    
    // Verificar se já existe
    const existe = pendentes.find(p => p.cpf === cpf && p.linha === linha);
    if (existe) {
      return false; // Já existe
    }
    
    const novoPendente = {
      cpf,
      linha,
      status,
      provider,
      statusDetalhado,
      timestamp: new Date().toISOString(),
      id: `pend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    pendentes.push(novoPendente);
    salvarPendentes(pendentes);
    
    console.log(`➕ Pendente adicionado: CPF ${cpf}, Linha ${linha}, Status ${status}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao adicionar pendente:', error.message);
    return false;
  }
}

export function removerPendente(cpf, linha) {
  try {
    const pendentes = carregarPendentes();
    const index = pendentes.findIndex(p => p.cpf === cpf && p.linha === linha);
    
    if (index > -1) {
      pendentes.splice(index, 1);
      salvarPendentes(pendentes);
      console.log(`➖ Pendente removido: CPF ${cpf}, Linha ${linha}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erro ao remover pendente:', error.message);
    return false;
  }
}

export function incrementarTentativaCache(cpf) {
  try {
    const tentativas = carregarTentativasCache();
    const atual = tentativas.get(cpf) || 0;
    tentativas.set(cpf, atual + 1);
    salvarTentativasCache(tentativas);
    
    console.log(`🔄 Tentativa de cache incrementada para CPF ${cpf}: ${atual + 1}`);
    return atual + 1;
  } catch (error) {
    console.error('❌ Erro ao incrementar tentativa de cache:', error.message);
    return 0;
  }
}

export function resetarTentativasCache(cpf = null) {
  try {
    const tentativas = carregarTentativasCache();
    
    if (cpf) {
      tentativas.delete(cpf);
      console.log(`🔄 Tentativas de cache resetadas para CPF ${cpf}`);
    } else {
      tentativas.clear();
      console.log(`🔄 Todas as tentativas de cache resetadas`);
    }
    
    salvarTentativasCache(tentativas);
    return true;
  } catch (error) {
    console.error('❌ Erro ao resetar tentativas de cache:', error.message);
    return false;
  }
}

// ===== FUNÇÕES DE LIMPEZA =====
export function limparCacheCompleto() {
  try {
    // Fazer backup de tudo antes de limpar
    fazerBackup(PENDENTES_FILE);
    fazerBackup(TENTATIVAS_FILE);
    fazerBackup(ESTADO_FILE);
    
    // Limpar arquivos
    if (fs.existsSync(PENDENTES_FILE)) fs.unlinkSync(PENDENTES_FILE);
    if (fs.existsSync(TENTATIVAS_FILE)) fs.unlinkSync(TENTATIVAS_FILE);
    if (fs.existsSync(ESTADO_FILE)) fs.unlinkSync(ESTADO_FILE);
    
    console.log(`🗑️ Cache completo limpo`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error.message);
    return false;
  }
}

// --- Cache das Listas de Resultados ---
export function carregarListas() {
  try {
    if (!fs.existsSync(LISTAS_FILE)) {
      return {
        sucessos: [],
        pendentes: [],
        naoAutorizados: [],
        descartados: [],
        agendados: [],
        ultimaAtualizacao: new Date(0).toISOString()
      };
    }
    
    const dados = JSON.parse(fs.readFileSync(LISTAS_FILE, 'utf8'));
    console.log(`📂 Listas carregadas: ${Object.keys(dados).length} tipos`);
    return dados;
  } catch (error) {
    console.error('❌ Erro ao carregar listas:', error);
    return {
      sucessos: [],
      pendentes: [],
      naoAutorizados: [],
      descartados: [],
      agendados: [],
      ultimaAtualizacao: new Date(0).toISOString()
    };
  }
}

export function salvarListas(listas) {
  try {
    createBackup(LISTAS_FILE);
    const dados = { ...listas, ultimaAtualizacao: new Date().toISOString() };
    fs.writeFileSync(LISTAS_FILE, JSON.stringify(dados, null, 2));
    console.log(`💾 Listas salvas: ${Object.keys(listas).length} tipos`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar listas:', error);
    return false;
  }
}

export function adicionarResultadoLista(tipo, dados) {
  const listas = carregarListas();
  
  // Verificar se já existe (evitar duplicatas)
  const existe = listas[tipo].some(item => 
    item.cpf === dados.cpf && item.id === dados.id
  );
  
  if (!existe) {
    listas[tipo].push({
      ...dados,
      timestamp: new Date().toISOString()
    });
    salvarListas(listas);
  }
}

export function removerResultadoLista(tipo, cpf, id) {
  const listas = carregarListas();
  const initialLength = listas[tipo].length;
  listas[tipo] = listas[tipo].filter(item => 
    !(item.cpf === cpf && item.id === id)
  );
  
  if (listas[tipo].length < initialLength) {
    salvarListas(listas);
    return true;
  }
  return false;
}

export function limparLista(tipo) {
  const listas = carregarListas();
  listas[tipo] = [];
  salvarListas(listas);
}

export function obterEstatisticasCache() {
  try {
    const pendentes = carregarPendentes();
    const tentativas = carregarTentativasCache();
    const estado = carregarEstadoProcessamento();
    const listas = carregarListas();
    
    return {
      pendentes: {
        total: pendentes.length,
        porStatus: pendentes.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {})
      },
      tentativasCache: {
        total: tentativas.size,
        distribuicao: Array.from(tentativas.values()).reduce((acc, tentativas) => {
          acc[tentativas] = (acc[tentativas] || 0) + 1;
          return acc;
        }, {})
      },
      listas: {
        sucessos: listas.sucessos.length,
        pendentes: listas.pendentes.length,
        naoAutorizados: listas.naoAutorizados.length,
        descartados: listas.descartados.length,
        agendados: listas.agendados.length
      },
      estado: estado,
      ultimaAtualizacao: estado.ultimaAtualizacao
    };
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas do cache:', error.message);
    return null;
  }
}

console.log('💾 Sistema de cache persistente inicializado');
