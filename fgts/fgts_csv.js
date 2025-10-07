import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import qs from "qs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { PROXY_URL } from "./proxy-config.js";
import { logApiError, logAuthError, logCacheError, logCrmError, logSystemError } from "../error-logger.js";
import { 
  salvarPendentes, 
  carregarPendentes, 
  salvarTentativasCache, 
  carregarTentativasCache, 
  salvarEstadoProcessamento, 
  carregarEstadoProcessamento,
  adicionarPendente,
  removerPendente,
  incrementarTentativaCache,
  resetarTentativasCache,
  carregarListas,
  adicionarResultadoLista,
  removerResultadoLista,
  limparLista
} from "./cache-persistente.js";

// dotenv.config(); // Removido - já carregado no server.js

// Configuração do proxy
const proxyAgent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : null;

// 🔹 Configurações
let delayMs = 1000; // Delay fixo em 1 segundo // 15 minutos - muito conservador devido aos erros 429 persistentes
let delayBase = 1000; // Delay fixo em 1 segundo // Delay base aumentado para 15 minutos
let delayAtual = 1000; // Delay fixo em 1 segundo // Delay atual (pode variar)
let taxaErro429 = 0; // Taxa de erro 429 (0-1)
let contador429 = 0; // Contador de erros 429
let contadorTotal = 0; // Contador total de consultas

// 🔹 Cache de consultas para evitar duplicatas
const cacheConsultas = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos
let ultimoAjusteDelay = Date.now(); // Última vez que ajustou o delay
let erros429Consecutivos = 0; // Contador de erros 429 consecutivos
let maxErros429Consecutivos = 3; // Máximo de erros 429 consecutivos antes de parar (reduzido)
let sistemaEmQuarentena = false; // Sistema em quarentena
let tempoQuarentena = 0; // Tempo de início da quarentena
const TEMPO_QUARENTENA = 3600000; // 1 hora em quarentena
// Variáveis de controle de autenticação movidas para dentro das funções
const QUEUE_ID = process.env.QUEUE_ID || 25;
const API_CRM_KEY = process.env.LUNAS_API_KEY;
const DEST_STAGE_ID = process.env.DEST_STAGE_ID || 4;


// 🔹 Providers
const PROVIDERS = ["cartos", "bms", "qi"];

// 🔹 Credenciais
const CREDENTIALS = [];
for (let i = 1; process.env[`FGTS_USER_${i}`]; i++) {
  CREDENTIALS.push({
    username: process.env[`FGTS_USER_${i}`],
    password: process.env[`FGTS_PASS_${i}`],
  });
}
// Log de troca de credenciais
let ultimaCredencialUsada = -1;
let totalTrocasCredenciais = 0;

if (!CREDENTIALS.length) {
  console.error("❌ Nenhuma credencial FGTS configurada no .env");

// Log de troca de credenciais
let totalTrocasCredenciais = 0;
  // process.exit(1); // Comentado para permitir teste local
}

let TOKEN = null;
let credIndex = 0;
const LOG_PREFIX = () => `[${new Date().toISOString()}]`;
let ultimoProvider = null;
let paused = false;
let ioInstance = null;

// 🔹 Pendentes
const pendentes = [];

// 🔹 Sistema de Cache e Tentativas
let tentativasCPF = new Map(); // Contador de tentativas por CPF
const CACHE_LIMIT = 2; // Máximo de tentativas de limpeza de cache

// 🔹 Carregar cache persistente na inicialização
console.log('📂 Carregando cache persistente...');
tentativasCPF = carregarTentativasCache();
const pendentesCarregados = carregarPendentes();
const estadoCarregado = carregarEstadoProcessamento();

// Carregar listas do cache
carregarListasDoCache();

// Função para carregar listas do cache
export function carregarListasDoCache() {
  try {
    const listas = carregarListas();
    console.log('📋 Listas carregadas do cache:', {
      sucessos: listas.sucessos.length,
      pendentes: listas.pendentes.length,
      naoAutorizados: listas.naoAutorizados.length,
      descartados: listas.descartados.length,
      agendados: listas.agendados.length
    });
    return listas;
  } catch (error) {
    console.error('❌ Erro ao carregar listas do cache:', error.message);
    return {
      sucessos: [],
      pendentes: [],
      naoAutorizados: [],
      descartados: [],
      agendados: []
    };
  }
}

// Adicionar pendentes carregados ao array em memória
pendentesCarregados.forEach(pendente => {
  if (!pendentes.find(p => p.cpf === pendente.cpf && p.linha === pendente.linha)) {
    pendentes.push(pendente);
  }
});

console.log(`📊 Cache carregado: ${tentativasCPF.size} tentativas de cache, ${pendentesCarregados.length} pendentes`);

// ====== SISTEMA DE PERSISTÊNCIA DE AGENDAMENTOS ======

// Arquivo para salvar agendamentos
const AGENDAMENTOS_FILE = '/var/data/cache/agendamentos.json';

// Salvar agendamentos em arquivo persistente
async function salvarAgendamentos() {
  try {
    const agendamentosData = {
      timestamp: new Date().toISOString(),
      total: agendamentos.length,
      agendamentos: agendamentos.map(a => ({
        id: a.id,
        tipo: a.tipo,
        agendadoPara: a.agendadoPara.toISOString(),
        criadoEm: a.criadoEm.toISOString()
      }))
    };
    
    await fsp.writeFile(AGENDAMENTOS_FILE, JSON.stringify(agendamentosData, null, 2));
    console.log(`${LOG_PREFIX()} 💾 Agendamentos salvos: ${agendamentos.length} agendamentos`);
    
  } catch (error) {
    console.error(`${LOG_PREFIX()} ❌ Erro ao salvar agendamentos:`, error);
  }
}

// Carregar agendamentos do arquivo persistente
async function carregarAgendamentos() {
  try {
    if (!fs.existsSync(AGENDAMENTOS_FILE)) {
      console.log(`${LOG_PREFIX()} 📂 Nenhum arquivo de agendamentos encontrado`);
      return;
    }
    
    const data = JSON.parse(await fsp.readFile(AGENDAMENTOS_FILE, 'utf-8'));
    
    // Converter strings de data de volta para objetos Date
    agendamentos.length = 0; // Limpar array atual
    agendamentos.push(...data.agendamentos.map(a => ({
      id: a.id,
      tipo: a.tipo,
      agendadoPara: new Date(a.agendadoPara),
      criadoEm: new Date(a.criadoEm)
    })));
    
    console.log(`${LOG_PREFIX()} 📂 Agendamentos carregados: ${agendamentos.length} agendamentos`);
    
    // Mostrar próximos agendamentos
    if (agendamentos.length > 0) {
      const proximos = agendamentos
        .sort((a, b) => a.agendadoPara - b.agendadoPara)
        .slice(0, 3);
      
      console.log(`${LOG_PREFIX()} 📅 Próximos agendamentos:`);
      proximos.forEach(a => {
        const minutosRestantes = Math.round((a.agendadoPara - new Date()) / (1000 * 60));
        console.log(`${LOG_PREFIX()}   - ID: ${a.id} - ${a.agendadoPara.toLocaleString('pt-BR')} (${minutosRestantes} min)`);
      });
    }
    
  } catch (error) {
    console.error(`${LOG_PREFIX()} ❌ Erro ao carregar agendamentos:`, error);
  }
}

// 🔹 Sistema de Agendamento
const agendamentos = [];
const HORARIO_COMERCIAL = {
  inicio: 8,  // 08:00
  fim: 22     // 22:00
};

// 🔹 Verificar se está em horário comercial
function isHorarioComercial() {
  const agora = new Date();
  const hora = agora.getHours();
  const minuto = agora.getMinutes();
  const isComercial = hora >= HORARIO_COMERCIAL.inicio && hora < HORARIO_COMERCIAL.fim;
  
  console.log(`${LOG_PREFIX()} 🕐 Verificação de horário: ${hora}:${minuto.toString().padStart(2, '0')} - Comercial: ${isComercial}`);
  
  return isComercial;
}

// 🔹 Calcular próximo horário comercial
function proximoHorarioComercial() {
  const agora = new Date();
  const hora = agora.getHours();
  
  // Se já passou do horário comercial hoje, agendar para amanhã
  if (hora >= HORARIO_COMERCIAL.fim) {
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(HORARIO_COMERCIAL.inicio, 0, 0, 0);
    console.log(`${LOG_PREFIX()} 📅 Agendando para amanhã: ${amanha.toLocaleString('pt-BR')}`);
    return amanha;
  }
  
  // Se ainda não chegou no horário comercial hoje, agendar para hoje
  if (hora < HORARIO_COMERCIAL.inicio) {
    const hoje = new Date(agora);
    hoje.setHours(HORARIO_COMERCIAL.inicio, 0, 0, 0);
    console.log(`${LOG_PREFIX()} 📅 Agendando para hoje: ${hoje.toLocaleString('pt-BR')}`);
    return hoje;
  }
  
  // Se está no horário comercial, agendar para amanhã (não deveria acontecer)
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(HORARIO_COMERCIAL.inicio, 0, 0, 0);
  console.log(`${LOG_PREFIX()} 📅 Agendando para amanhã (dentro do horário): ${amanha.toLocaleString('pt-BR')}`);
  return amanha;
}

// 🔹 Agendar disparo para horário comercial
function agendarDisparo(opportunityId, tipo = 'criar') {
  const proximoHorario = proximoHorarioComercial();
  const agendamento = {
    id: opportunityId,
    tipo,
    agendadoPara: proximoHorario,
    criadoEm: new Date()
  };
  
  agendamentos.push(agendamento);
  console.log(`${LOG_PREFIX()} 📅 Disparo agendado para ${proximoHorario.toLocaleString('pt-BR')} - ID: ${opportunityId} - Tipo: ${tipo}`);
  console.log(`${LOG_PREFIX()} 📊 Total de agendamentos: ${agendamentos.length}`);
  
  if (ioInstance) {
    ioInstance.emit("log", `📅 Disparo agendado para ${proximoHorario.toLocaleString('pt-BR')} - ID: ${opportunityId}`);
  }
}

// 🔹 Processar agendamentos pendentes
async function processarAgendamentos() {
  const agora = new Date();
  const agendamentosParaProcessar = agendamentos.filter(a => a.agendadoPara <= agora);
  
  console.log(`${LOG_PREFIX()} 🔍 Verificando agendamentos: ${agendamentos.length} total, ${agendamentosParaProcessar.length} para processar`);
  
  if (agendamentosParaProcessar.length > 0) {
    console.log(`${LOG_PREFIX()} ⏰ Processando ${agendamentosParaProcessar.length} agendamentos pendentes`);
  }
  
  for (const agendamento of agendamentosParaProcessar) {
    try {
      if (agendamento.tipo === 'criar' || agendamento.tipo === 'atualizar') {
        console.log(`${LOG_PREFIX()} 🚀 Executando disparo agendado - ID: ${agendamento.id} - Tipo: ${agendamento.tipo}`);
        await disparaFluxo(agendamento.id);
        console.log(`${LOG_PREFIX()} ✅ Disparo executado (agendado) - ID: ${agendamento.id}`);
        
        // Emitir atualização de status para "disparo"
        if (ioInstance) {
          ioInstance.emit("atualizarStatus", {
            id: agendamento.id,
            statusDetalhado: 'disparo'
          });
        }
      }
      
      // Remover da lista de agendamentos
      const index = agendamentos.indexOf(agendamento);
      agendamentos.splice(index, 1);
      
    } catch (error) {
      console.error(`${LOG_PREFIX()} ❌ Erro ao processar agendamento ${agendamento.id}:`, error.message);
    }
  }
}

// 🔹 Obter lista de agendamentos (para API)
function obterAgendamentos() {
  return agendamentos.map(a => ({
    id: a.id,
    tipo: a.tipo,
    agendadoPara: a.agendadoPara.toLocaleString('pt-BR'),
    criadoEm: a.criadoEm.toLocaleString('pt-BR'),
    minutosRestantes: Math.round((a.agendadoPara - new Date()) / (1000 * 60))
  }));
}

// 🔹 Executar verificações de agendamento a cada minuto
setInterval(processarAgendamentos, 60000); // 1 minuto

// 🔹 Delay e pausa
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 🔹 Função para verificar cache de consultas
function verificarCache(cpf) {
  const cacheKey = `consulta_${cpf}`;
  const cached = cacheConsultas.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
    console.log(`${LOG_PREFIX()} 💾 Cache hit para CPF ${cpf}`);
    return cached.data;
  }
  
  return null;
}

// 🔹 Função para salvar no cache
function salvarCache(cpf, data) {
  const cacheKey = `consulta_${cpf}`;
  cacheConsultas.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  // Limitar tamanho do cache (manter apenas últimos 1000 itens)
  if (cacheConsultas.size > 1000) {
    const firstKey = cacheConsultas.keys().next().value;
    cacheConsultas.delete(firstKey);
  }
}

// 🔹 Função para verificar se o sistema está em quarentena
function verificarQuarentena() {
  if (sistemaEmQuarentena) {
    const tempoDecorrido = Date.now() - tempoQuarentena;
    if (tempoDecorrido >= TEMPO_QUARENTENA) {
      // Quarentena expirou
      sistemaEmQuarentena = false;
      tempoQuarentena = 0;
      erros429Consecutivos = 0;
      console.log(`${LOG_PREFIX()} 🎉 Quarentena expirada! Sistema pode retomar operações.`);
      if (ioInstance) {
        ioInstance.emit("log", `🎉 Quarentena expirada! Sistema pode retomar operações.`);
      }
      return false; // Não está mais em quarentena
    } else {
      const tempoRestante = Math.round((TEMPO_QUARENTENA - tempoDecorrido) / 1000 / 60);
      console.log(`${LOG_PREFIX()} 🚫 Sistema em quarentena. Tempo restante: ${tempoRestante} minutos`);
      if (ioInstance) {
        ioInstance.emit("log", `🚫 Sistema em quarentena. Tempo restante: ${tempoRestante} minutos`);
      }
      return true; // Ainda está em quarentena
    }
  }
  return false; // Não está em quarentena
}

// 🔹 Função para ativar quarentena
function ativarQuarentena() {
  sistemaEmQuarentena = true;
  tempoQuarentena = Date.now();
  erros429Consecutivos = 0;
  console.log(`${LOG_PREFIX()} 🚫 SISTEMA EM QUARENTENA por 1 hora devido aos erros 429!`);
  if (ioInstance) {
    ioInstance.emit("log", `🚫 SISTEMA EM QUARENTENA por 1 hora devido aos erros 429!`);
  }
}

// 🔹 Sistema de Controle Dinâmico de Delay
let delayManualConfigurado = true; // Sempre true para manter delay fixo // Flag para indicar se o delay foi configurado manualmente

function ajustarDelayDinamico() {
  // DESABILITADO - Delay fixo em 1 segundo
  return;
  // Se o delay foi configurado manualmente, não ajustar dinamicamente
  if (delayManualConfigurado) {
    console.log(`${LOG_PREFIX()} ⚡ Delay manual configurado (${delayMs}ms) - Pulando ajuste dinâmico`);
    return;
  }
  
  const agora = Date.now();
  const tempoDesdeUltimoAjuste = agora - ultimoAjusteDelay;
  
  // Só ajustar a cada 30 segundos
  if (tempoDesdeUltimoAjuste < 30000) return;
  
  // Calcular taxa de erro 429
  if (contadorTotal > 0) {
    taxaErro429 = contador429 / contadorTotal;
  }
  
  let novoDelay = delayBase;
  
  if (taxaErro429 > 0.5) {
    // Taxa alta de erros 429 - ativar quarentena
    ativarQuarentena();
    console.log(`${LOG_PREFIX()} 🚨 Taxa crítica de erros 429 (${(taxaErro429 * 100).toFixed(1)}%) - Ativando quarentena!`);
    return;
  } else if (taxaErro429 > 0.2) {
    // Taxa moderada de erros 429 - aumentar delay drasticamente
    novoDelay = delayBase * 3; // 45 minutos
    console.log(`${LOG_PREFIX()} ⚠️ Taxa alta de erros 429 (${(taxaErro429 * 100).toFixed(1)}%) - Aumentando delay para ${novoDelay}ms (${Math.round(novoDelay/1000/60)}min)`);
  } else if (taxaErro429 > 0.1) {
    // Taxa baixa de erros 429 - aumentar delay moderadamente
    novoDelay = delayBase * 2; // 30 minutos
    console.log(`${LOG_PREFIX()} 🔶 Taxa moderada de erros 429 (${(taxaErro429 * 100).toFixed(1)}%) - Aumentando delay para ${novoDelay}ms (${Math.round(novoDelay/1000/60)}min)`);
  } else if (taxaErro429 === 0 && contadorTotal > 50) {
    // Nenhum erro 429 por muito tempo - pode diminuir delay gradualmente
    novoDelay = Math.max(delayBase * 0.9, delayAtual * 0.95);
    console.log(`${LOG_PREFIX()} 🚀 Sem erros 429 por ${contadorTotal} consultas - Diminuindo delay para ${novoDelay}ms`);
  } else {
    // Manter delay atual
    novoDelay = delayAtual;
  }
  
  // Aplicar limites (muito mais conservador devido aos erros 429)
  novoDelay = Math.max(900000, Math.min(1800000, novoDelay)); // Min 15min, Max 30min
  
  if (novoDelay !== delayAtual) {
    delayAtual = novoDelay;
    delayMs = novoDelay;
    ultimoAjusteDelay = agora;
    
    if (ioInstance) {
      ioInstance.emit("log", `⚡ Delay ajustado dinamicamente para ${delayMs}ms (Taxa 429: ${(taxaErro429 * 100).toFixed(1)}%)`);
    }
  }
  
  // Resetar contadores a cada 5 minutos
  if (tempoDesdeUltimoAjuste > 300000) {
    contador429 = 0;
    contadorTotal = 0;
    taxaErro429 = 0;
  }
}

function setDelay(ms) {
  if (ms && !isNaN(ms) && ms > 0) {
    delayBase = ms;
    delayAtual = ms;
    delayMs = ms;
    delayManualConfigurado = true; // Marcar como configurado manualmente
    console.log(`${LOG_PREFIX()} ⚡ Delay manual configurado para ${delayMs}ms - Ajuste dinâmico desabilitado`);
  }
}

function setPause(value) {
  paused = !!value;
  console.log(`${LOG_PREFIX()} ⏸️ Pausa setada para ${paused}`);
}

// 🔹 Anexar socket
function attachIO(io) {
  ioInstance = io;
}

// 🔹 Normalização
const normalizeCPF = (cpf) => {
  if (!cpf) return null;
  
  // Se for um objeto, tentar extrair o CPF
  if (typeof cpf === 'object' && cpf !== null) {
    if (cpf.cpf) {
      cpf = cpf.cpf;
    } else {
      console.log(`${LOG_PREFIX()} ⚠️ Objeto CPF inválido:`, cpf);
      return null;
    }
  }
  
  // Converter para string e tratar números científicos
  let cpfStr = cpf.toString();
  
  // Tratar números científicos (ex: 1.23456789012e+10)
  if (cpfStr.includes('e+') || cpfStr.includes('E+')) {
    try {
      const num = parseFloat(cpfStr);
      if (!isNaN(num)) {
        cpfStr = num.toFixed(0); // Converter para inteiro sem notação científica
        console.log(`${LOG_PREFIX()} 🔢 CPF convertido de notação científica: ${cpf} → ${cpfStr}`);
      }
    } catch (error) {
      console.log(`${LOG_PREFIX()} ⚠️ Erro ao converter CPF científico: ${cpf}`, error.message);
    }
  }
  
  // Remover caracteres não numéricos
  const cleaned = cpfStr.replace(/\D/g, "");
  
  // Validar tamanho
  if (cleaned.length !== 11) {
    console.log(`${LOG_PREFIX()} ⚠️ CPF com tamanho inválido: ${cpf} → ${cleaned} (${cleaned.length} dígitos)`);
    return null;
  }
  
  // Validar CPFs inválidos (todos os dígitos iguais)
  if (cleaned === "00000000000" || cleaned === "11111111111" || cleaned === "22222222222" || 
      cleaned === "33333333333" || cleaned === "44444444444" || cleaned === "55555555555" ||
      cleaned === "66666666666" || cleaned === "77777777777" || cleaned === "88888888888" || 
      cleaned === "99999999999") {
    console.log(`${LOG_PREFIX()} ⚠️ CPF inválido (todos dígitos iguais): ${cleaned}`);
    return null;
  }
  
  return cleaned;
};
const normalizePhone = (phone) => {
  if (!phone) return "";
  
  // Converter para string e tratar números científicos
  let phoneStr = phone.toString();
  
  // Tratar números científicos (ex: 1.23456789012e+10)
  if (phoneStr.includes('e+') || phoneStr.includes('E+')) {
    try {
      const num = parseFloat(phoneStr);
      if (!isNaN(num)) {
        phoneStr = num.toFixed(0); // Converter para inteiro sem notação científica
        console.log(`${LOG_PREFIX()} 🔢 Telefone convertido de notação científica: ${phone} → ${phoneStr}`);
      }
    } catch (error) {
      console.log(`${LOG_PREFIX()} ⚠️ Erro ao converter telefone científico: ${phone}`, error.message);
    }
  }
  
  // Remover caracteres não numéricos
  return phoneStr.replace(/\D/g, "");
};

// 🔹 Registrar pendência
function registrarPendencia(cpf, id, motivo, linha) {
  console.log(`${LOG_PREFIX()} ⚠️ Pendência registrada - Linha ${linha} | CPF: ${cpf} | ID: ${id} | Motivo: ${motivo}`);
  console.log(`${LOG_PREFIX()} 📊 Estado atual: ${pendentes.length} pendentes antes de adicionar`);
  
  pendentes.push({ cpf, id, motivo, linha });
  
  console.log(`${LOG_PREFIX()} 📊 Estado após adicionar: ${pendentes.length} pendentes`);
  console.log(`${LOG_PREFIX()} 💾 Salvando pendentes atualizados...`);
  
  // Salvar pendentes imediatamente após adicionar
  salvarPendentes(pendentes);
}

// 🔹 Emitir resultado
async function emitirResultado({ cpf, id, status, valorLiberado = 0, provider, linha = "?", resultadoCompleto = null, statusDetalhado = null }, callback = null) {
  const valorFormatado = Number(valorLiberado || 0).toFixed(2);

  // Mapear status para exibição (melhorado)
  const statusMap = {
    'success': '✅ Sucesso',
    'pending': '⏳ Pendente', 
    'no_auth': '🚫 Não Autorizado',
    'descartado': '❌ Descartado',
    'ready_for_manual': '📥 Pronto',
    'limite_excedido': '⏰ Limite Excedido',
    'reprocessar': '🔄 Reprocessar'
  };
  
  const statusDisplay = statusMap[status] || `❓ ${status}`;
  const logMessage = `${statusDisplay} | Linha: ${linha || "?"} | CPF: ${cpf} | ID: ${id || "N/A"} | Valor: R$ ${valorFormatado} | Provider: ${provider}`;
  
  // Log detalhado para o frontend
  console.log(`[CLIENT] ${logMessage}`);
  
  // Log adicional com mais detalhes para acompanhamento
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  const detalhesAdicionais = statusDetalhado ? ` | Motivo: ${statusDetalhado}` : '';
  console.log(`[${timestamp}] 📋 CPF Processado: ${cpf} | Status: ${statusDisplay} | Valor: R$ ${valorFormatado}${detalhesAdicionais}`);
  
  // Emitir logs para o frontend via Socket.IO
  if (ioInstance) {
    ioInstance.emit('logFila', { 
      type: 'info', 
      message: `[${timestamp}] 📋 CPF Processado: ${cpf} | Status: ${statusDisplay} | Valor: R$ ${valorFormatado} | Provider: ${provider}${detalhesAdicionais}` 
    });
    ioInstance.emit('updateContadores'); // Força atualização dos contadores no frontend
    ioInstance.emit('updateLists'); // Força atualização das listas no frontend
  }

  // Salvar no cache das listas
  const dadosResultado = {
    cpf,
    id: id || 'N/A',
    linha: linha || '?',
    valor: valorFormatado,
    provider: provider || 'N/A',
    status: status,
    statusDetalhado: statusDetalhado,
    timestamp: new Date().toISOString()
  };

  // Mapear status para tipo de lista
  let tipoLista = '';
  switch(status) {
    case 'success':
      tipoLista = 'sucessos';
      break;
    case 'pending':
    case 'reprocessar':
    case 'reprocessar_rapido':
    case 'sistemaFalha':
    case 'sistemaReprocessar':
      tipoLista = 'pendentes';
      break;
    case 'no_auth':
      tipoLista = 'naoAutorizados';
      break;
    case 'descartado':
      tipoLista = 'descartados';
      break;
    default:
      console.log(`⚠️ Status desconhecido: ${status} - enviando para pendentes`);
      tipoLista = 'pendentes';
  }

  // Adicionar ao cache
  console.log(`🔍 Salvando resultado no cache - Tipo: ${tipoLista}, CPF: ${cpf}, Status: ${status}`);
  adicionarResultadoLista(tipoLista, dadosResultado);

  // ====== ATUALIZAR STATUS E CONTADORES ======
  // Atualizar status do CPF no arquivo de status
  if (typeof atualizarStatusCPF === 'function') {
    try {
      // Mapear status para o formato do sistema de status
      let statusFormatado = '';
      switch(status) {
        case 'success':
          statusFormatado = 'SUCESSO';
          break;
        case 'pending':
        case 'reprocessar':
        case 'reprocessar_rapido':
        case 'sistemaFalha':
        case 'sistemaReprocessar':
          statusFormatado = 'PENDING';
          break;
        case 'no_auth':
          statusFormatado = 'NÃO AUTORIZADO';
          break;
        case 'descartado':
          statusFormatado = 'DESCARTADO';
          break;
        default:
          statusFormatado = 'PENDING';
      }
      
      // Atualizar status do CPF
      await atualizarStatusCPF(cpf, statusFormatado, {
        id: id || 'N/A',
        linha: linha || '?',
        valor: valorFormatado,
        provider: provider || 'N/A',
        statusDetalhado: statusDetalhado
      });
      
      console.log(`📝 Status do CPF ${cpf} atualizado para: ${statusFormatado}`);
    } catch (error) {
      console.error('❌ Erro ao atualizar status do CPF:', error);
    }
  }

  // Chamar função de atualização de contadores se disponível
  if (typeof atualizarContadoresTempoReal === 'function') {
    try {
      // Mapear status para tipo de contador
      let tipoContador = '';
      switch(status) {
        case 'success':
          tipoContador = 'sucesso';
          break;
        case 'pending':
        case 'reprocessar':
        case 'reprocessar_rapido':
        case 'sistemaFalha':
        case 'sistemaReprocessar':
          tipoContador = 'pendente';
          break;
        case 'no_auth':
          tipoContador = 'naoAutorizado';
          break;
        case 'descartado':
          tipoContador = 'descartado';
          break;
        default:
          tipoContador = 'pendente';
      }
      
      // Sempre incrementar processados
      atualizarContadoresTempoReal('processado', 1);
      
      // Incrementar contador específico
      atualizarContadoresTempoReal(tipoContador, 1);
      
      console.log(`📊 Contadores atualizados: ${tipoContador} +1`);
    } catch (error) {
      console.error('❌ Erro ao atualizar contadores em tempo real:', error);
    }
  }

  // Emitir log resumido para o painel (apenas para sucessos importantes)
  if (ioInstance && status === 'success') {
    ioInstance.emit("log", logMessage);
  }

  if (resultadoCompleto?.data && resultadoCompleto.data.length > 0) {
    const detalhesLog = `📦 [Linha ${linha}] Retorno completo da API: ${JSON.stringify(resultadoCompleto)}`;
    console.log(`[CLIENT] ${detalhesLog}`);
    
    // NÃO emitir detalhes para o painel - apenas no console
  }

  if (ioInstance) {
    ioInstance.emit("resultadoCPF", {
      linha,
      cpf,
      id,
      status,
      valorLiberado: valorFormatado,
      provider,
      resultadoCompleto,
      statusDetalhado
    });
  }

  if (typeof callback === "function") {
    callback({
      linha,
      cpf,
      id,
      status,
      valorLiberado: valorFormatado,
      provider,
      resultadoCompleto,
      statusDetalhado
    });
  }
}

// 🔹 Alternar credencial
// Variáveis já declaradas globalmente acima

function switchCredential(forcedIndex = null, isContingency = false) {
  if (!CREDENTIALS.length) return;
  credIndex = forcedIndex !== null ? forcedIndex % CREDENTIALS.length : (credIndex + 1) % CREDENTIALS.length;
  TOKEN = null;
  
  // Log de troca de credenciais
  if (ultimaCredencialUsada !== credIndex) {
    totalTrocasCredenciais++;
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const tipoTroca = isContingency ? "CONTINGÊNCIA" : "NORMAL";
    const emojiTroca = isContingency ? "🔄" : "🔄";
    const tipoLog = isContingency ? "warning" : "info";
    
    console.log(`[${timestamp}] ${emojiTroca} TROCA DE CREDENCIAL (${tipoTroca}): ${ultimaCredencialUsada + 1} → ${credIndex + 1} (${CREDENTIALS[credIndex]?.username || "N/A"})`);
    console.log(`[${timestamp}] 📊 Total de trocas: ${totalTrocasCredenciais}`);
    
    // Emitir log para o frontend
    if (ioInstance) {
      ioInstance.emit("logFila", { 
        type: tipoLog, 
        message: `[${timestamp}] ${emojiTroca} TROCA DE CREDENCIAL (${tipoTroca}): ${ultimaCredencialUsada + 1} → ${credIndex + 1} (${CREDENTIALS[credIndex]?.username || "N/A"})` 
      });
    }
    
    ultimaCredencialUsada = credIndex;
  }
  
  const user = CREDENTIALS[credIndex]?.username || "sem usuário";
  const switchLog = `🔄 Alternando para credencial: ${user}`;
  console.log(`${LOG_PREFIX()} ${switchLog}`);
  
  // NÃO emitir log de mudança de credencial para o painel - apenas no console
}

// 🔹 Sistema de Fila Única para Autenticação (REESCRITO)
let processandoFila = false;
let filaAutenticacao = [];
let ultimaAutenticacao = 0;

// Função para limpar a fila em caso de emergência
function limparFilaAutenticacao() {
  console.log(`${LOG_PREFIX()} 🧹 LIMPANDO FILA DE AUTENTICAÇÃO: ${filaAutenticacao.length} itens`);
  
  // Rejeitar todas as promessas pendentes
  filaAutenticacao.forEach(item => {
    item.reject(new Error("Fila de autenticação limpa devido a erro crítico"));
  });
  
  filaAutenticacao = [];
  processandoFila = false;
  
  console.log(`${LOG_PREFIX()} ✅ FILA DE AUTENTICAÇÃO LIMPA`);
}

async function processarFilaAutenticacao() {
  // Verificar se já está processando ou se a fila está vazia
  if (processandoFila || filaAutenticacao.length === 0) {
    return;
  }
  
  processandoFila = true;
  console.log(`${LOG_PREFIX()} 🔄 INICIANDO PROCESSAMENTO DA FILA: ${filaAutenticacao.length} pendentes`);
  
  try {
    while (filaAutenticacao.length > 0) {
      const { resolve, reject, force } = filaAutenticacao.shift();
      
      try {
        // Verificar se passou tempo suficiente desde a última autenticação
        const agora = Date.now();
        const tempoDesdeUltima = agora - ultimaAutenticacao;
        
        if (tempoDesdeUltima < delayMs) {
          const tempoRestante = delayMs - tempoDesdeUltima;
          console.log(`${LOG_PREFIX()} ⏳ AGUARDANDO ${Math.round(tempoRestante/1000)}s antes da próxima autenticação...`);
          await delay(tempoRestante);
        }
        
        console.log(`${LOG_PREFIX()} 🔑 PROCESSANDO AUTENTICAÇÃO DA FILA (${filaAutenticacao.length + 1} restantes)`);
        
        const token = await autenticarIndividual(force);
        ultimaAutenticacao = Date.now();
        
        console.log(`${LOG_PREFIX()} ✅ AUTENTICAÇÃO CONCLUÍDA - Token gerado`);
        resolve(token);
        
      } catch (error) {
        console.log(`${LOG_PREFIX()} ❌ ERRO NA AUTENTICAÇÃO DA FILA:`, error.message);
        ultimaAutenticacao = Date.now();
        reject(error);
      }
      
      // Pequena pausa entre processamentos para evitar sobrecarga
      if (filaAutenticacao.length > 0) {
        await delay(1000); // 1 segundo entre processamentos
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX()} ❌ ERRO CRÍTICO NO PROCESSAMENTO DA FILA:`, error);
  } finally {
    processandoFila = false;
    console.log(`${LOG_PREFIX()} ✅ FILA DE AUTENTICAÇÃO PROCESSADA COMPLETAMENTE`);
  }
}

// 🔹 Log Detalhado de Requisições
function logDetalhadoRequisicao(tipo, url, dados, headers, credencial) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    tipo,
    url,
    dados,
    headers,
    credencial: {
      username: credencial?.username || 'N/A',
      index: credIndex,
      total: CREDENTIALS.length
    },
    sistema: {
      delayAtual: delayMs,
      erros429Consecutivos,
      sistemaEmQuarentena,
      filaAutenticacao: filaAutenticacao.length
    }
  };
  
  console.log(`${LOG_PREFIX()} 📋 LOG DETALHADO - ${tipo.toUpperCase()}`);
  console.log(`${LOG_PREFIX()} 🔗 URL: ${url}`);
  console.log(`${LOG_PREFIX()} 👤 Credencial: ${credencial?.username || 'N/A'} (${credIndex + 1}/${CREDENTIALS.length})`);
  console.log(`${LOG_PREFIX()} 📦 Dados enviados:`, JSON.stringify(dados, null, 2));
  console.log(`${LOG_PREFIX()} 📋 Headers:`, JSON.stringify(headers, null, 2));
  console.log(`${LOG_PREFIX()} ⚙️ Estado do sistema:`, JSON.stringify(logEntry.sistema, null, 2));
  
  // Salvar em arquivo de log
  try {
    const logFile = `/var/data/logs/requisicoes-detalhadas-${new Date().toISOString().split('T')[0]}.json`;
    const fs = require('fs');
    const logData = JSON.stringify(logEntry, null, 2) + '\n';
    fs.appendFileSync(logFile, logData);
  } catch (error) {
    console.log(`${LOG_PREFIX()} ⚠️ Erro ao salvar log detalhado:`, error.message);
  }
}


// 🔹 Autenticação Individual (sem fila) - COM CONTINGÊNCIA MELHORADA
async function autenticarIndividual(force = false) {
  if (TOKEN && !force) return TOKEN;
  if (!CREDENTIALS.length) throw new Error("Nenhuma credencial disponível!");
  
  // Verificar se o sistema está em quarentena
  if (verificarQuarentena()) {
    throw new Error("Sistema em quarentena devido aos erros 429. Aguarde 1 hora.");
  }
  
  // 1. TENTAR TODOS OS LOGINS NO MÉTODO NORMAL PRIMEIRO
  for (let i = 0; i < CREDENTIALS.length; i++) {
    const cred = CREDENTIALS[i];
    
    try {
      console.log(`${LOG_PREFIX()} 🔑 AUTENTICANDO DIRETO (${i + 1}/${CREDENTIALS.length}): ${cred.username} (force: ${force})`);
      
      const dadosAuth = {
        grant_type: "password",
        username: cred.username,
        password: cred.password,
        audience: "https://bff.v8sistema.com",
        scope: "offline_access",
        client_id: "DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn",
      };
      
      const data = qs.stringify(dadosAuth);
      const headers = { 
        "Content-Type": "application/x-www-form-urlencoded"
        // Cookie removido conforme solicitado
      };
      
      // Log detalhado ANTES da requisição
      logDetalhadoRequisicao('AUTENTICACAO', 'https://auth.v8sistema.com/oauth/token', dadosAuth, headers, cred);

      const res = await axios.post("https://auth.v8sistema.com/oauth/token", data, { 
        headers,
        ...(proxyAgent && { agent: proxyAgent }), // Usar proxy se disponível
        timeout: 30000 // 30 segundos de timeout
      });

      TOKEN = res.data.access_token;
      credIndex = i; // Atualizar índice da credencial que funcionou
      console.log(`${LOG_PREFIX()} ✅ AUTENTICAÇÃO DIRETA CONCLUÍDA: ${cred.username} (credencial ${i + 1})`);
      
      // Log da resposta
      console.log(`${LOG_PREFIX()} 📥 Resposta da API:`, {
        status: res.status,
        tokenLength: TOKEN ? TOKEN.length : 0,
        tokenPreview: TOKEN ? TOKEN.substring(0, 50) + '...' : 'N/A'
      });
      
      // Resetar contadores de erro em caso de sucesso
      erros429Consecutivos = 0;
      
      return TOKEN;
    } catch (err) {
      const user = cred?.username || "sem usuário";
      console.log(`${LOG_PREFIX()} ❌ Erro ao autenticar ${user} (credencial ${i + 1}): ${err.message}`);
      
      // Se for erro 429, tentar contingência imediatamente
      if (err.response?.status === 429) {
        console.log(`${LOG_PREFIX()} ⚠️ ERRO 429 DETECTADO - Tentando contingência para ${user}`);
        
        // Tentar API de tokens para esta credencial
        try {
          console.log(`${LOG_PREFIX()} 🔄 Tentando API de tokens para ${user}...`);
          const tokenResponse = await axios.post(`${process.env.API_TOKENS_URL || 'https://api-extrato-1.onrender.com'}/authenticate`, {
            username: cred.username,
            password: cred.password
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
          });

          if (tokenResponse.data?.success && tokenResponse.data?.access_token) {
            TOKEN = tokenResponse.data.access_token;
            credIndex = i; // Atualizar índice da credencial que funcionou
            console.log(`${LOG_PREFIX()} ✅ Autenticado via API de tokens (CONTINGÊNCIA): ${cred.username} (credencial ${i + 1})`);
            
            // Emitir log para o frontend indicando contingência
            if (ioInstance) {
              const timestamp = new Date().toLocaleTimeString("pt-BR");
              ioInstance.emit("logFila", { 
                type: "warning", 
                message: `[${timestamp}] 🔄 TROCA DE CREDENCIAL (CONTINGÊNCIA): ${ultimaCredencialUsada + 1} → ${credIndex + 1} (${cred.username})` 
              });
            }
            
            return TOKEN;
          }
        } catch (tokenError) {
          console.error(`${LOG_PREFIX()} ❌ Erro na API de tokens para ${user}:`, tokenError.message);
        }
        
        // Se chegou aqui, esta credencial falhou completamente
        console.log(`${LOG_PREFIX()} ❌ Credencial ${i + 1} (${user}) falhou completamente - tentando próxima`);
        continue; // Tentar próxima credencial
      }
      
      // Para outros erros, continuar tentando próxima credencial
      if (i < CREDENTIALS.length - 1) {
        console.log(`${LOG_PREFIX()} 🔄 Tentando próxima credencial...`);
        continue;
      }
    }
  }
  
  // 2. SE TODAS AS CREDENCIAIS FALHARAM NO MÉTODO NORMAL, TENTAR CONTINGÊNCIA PARA TODAS
  console.log(`${LOG_PREFIX()} 🔄 Todas as credenciais falharam no método normal - Tentando contingência para todas...`);
  
  for (let i = 0; i < CREDENTIALS.length; i++) {
    const cred = CREDENTIALS[i];
    
    try {
      console.log(`${LOG_PREFIX()} 🔄 Tentando API de tokens (${i + 1}/${CREDENTIALS.length}): ${cred.username}`);
      const tokenResponse = await axios.post(`${process.env.API_TOKENS_URL || 'https://api-extrato-1.onrender.com'}/authenticate`, {
        username: cred.username,
        password: cred.password
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (tokenResponse.data?.success && tokenResponse.data?.access_token) {
        TOKEN = tokenResponse.data.access_token;
        credIndex = i; // Atualizar índice da credencial que funcionou
        console.log(`${LOG_PREFIX()} ✅ Autenticado via API de tokens (CONTINGÊNCIA): ${cred.username} (credencial ${i + 1})`);
        
        // Emitir log para o frontend indicando contingência
        if (ioInstance) {
          const timestamp = new Date().toLocaleTimeString("pt-BR");
          ioInstance.emit("logFila", { 
            type: "warning", 
            message: `[${timestamp}] 🔄 TROCA DE CREDENCIAL (CONTINGÊNCIA): ${ultimaCredencialUsada + 1} → ${credIndex + 1} (${cred.username})` 
          });
        }
        
        return TOKEN;
      }
    } catch (tokenError) {
      console.error(`${LOG_PREFIX()} ❌ Erro na API de tokens para ${cred.username}:`, tokenError.message);
    }
  }
  
  // 3. SE TUDO FALHOU, VERIFICAR SE PRECISA ESPERAR 30 MINUTOS
  const ultimoErro429 = tentativasCPF.get('ultimo_erro_429');
  if (ultimoErro429) {
    const tempoDecorrido = Date.now() - ultimoErro429;
    const tempoRestante = (30 * 60 * 1000) - tempoDecorrido; // 30 minutos em ms
    
    if (tempoRestante > 0) {
      const minutosRestantes = Math.ceil(tempoRestante / (60 * 1000));
      console.log(`${LOG_PREFIX()} ⏰ Usuário bloqueado (429) - Aguardando ${minutosRestantes} minutos...`);
      throw new Error(`Usuário bloqueado por limite de requisições. Aguarde ${minutosRestantes} minutos.`);
    } else {
      // Tempo de bloqueio expirou, limpar flag
      tentativasCPF.delete('ultimo_erro_429');
      salvarTentativasCache(tentativasCPF);
    }
  }
  
  // Log detalhado do erro final
  logAuthError('FGTS', 'autenticarIndividual', new Error("Todas as credenciais falharam"), null, {
    totalCredentials: CREDENTIALS.length,
    force: force,
    tentativasNormais: CREDENTIALS.length,
    tentativasContingencia: CREDENTIALS.length
  });
  
  throw new Error("Todas as credenciais falharam na autenticação direta e na contingência");
}

// 🔹 Autenticar (com fila única REESCRITA)
async function authenticate(force = false) {
  // Se já tem token válido e não é forçado, retornar imediatamente
  if (TOKEN && !force) {
    console.log(`${LOG_PREFIX()} ✅ Token válido encontrado, retornando sem autenticar`);
    return TOKEN;
  }
  
  // Log de troca de credenciais (variáveis já declaradas globalmente)

if (!CREDENTIALS.length) {
    throw new Error("Nenhuma credencial disponível!");
  }
  
  // Verificar se o sistema está em quarentena
  if (verificarQuarentena()) {
    throw new Error("Sistema em quarentena devido aos erros 429. Aguarde 1 hora.");
  }
  
  console.log(`${LOG_PREFIX()} 🔑 SOLICITANDO AUTENTICAÇÃO (force: ${force})`);
  
  // Adicionar à fila de autenticação
  return new Promise((resolve, reject) => {
    const itemFila = { resolve, reject, force, timestamp: Date.now() };
    filaAutenticacao.push(itemFila);
    
    console.log(`${LOG_PREFIX()} 📋 ADICIONADO À FILA: posição ${filaAutenticacao.length}, total: ${filaAutenticacao.length}`);
    
    // Processar fila se não estiver sendo processada
    if (!processandoFila) {
      console.log(`${LOG_PREFIX()} 🚀 INICIANDO PROCESSAMENTO DA FILA`);
      processarFilaAutenticacao().catch(error => {
        console.error(`${LOG_PREFIX()} ❌ ERRO NO PROCESSAMENTO DA FILA:`, error);
      });
    } else {
      console.log(`${LOG_PREFIX()} ⏳ FILA JÁ EM PROCESSAMENTO, aguardando...`);
    }
  });
}

// 🔹 Limpeza de Cache V8 Sistema
async function limparCacheV8(cpf) {
  try {
    const response = await axios.delete(`https://bff.v8sistema.com/fgts/balance/cache/${cpf}`, {
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      agent: proxyAgent // Usar proxy
    });

    console.log(`${LOG_PREFIX()} 🧹 Cache limpo para CPF: ${cpf}`);
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX()} ❌ Erro ao limpar cache V8 para CPF ${cpf}:`, error.response?.data || error.message);
    
    // Log detalhado do erro de cache
    logCacheError('limparCacheV8', error, cpf, {
      token: TOKEN ? 'presente' : 'ausente',
      url: `https://bff.v8sistema.com/fgts/balance/cache/${cpf}`
    });
    
    return false;
  }
}

// 🔹 Consultar resultado com tratamento de 429
async function consultarResultado(cpf, linha) {
  // Verificar se o sistema está em quarentena
  if (verificarQuarentena()) {
    return { error: "Sistema em quarentena devido aos erros 429. Aguarde 1 hora." };
  }
  
  let tentativasCredenciais = 0;
  const maxCredenciais = CREDENTIALS.length;
  
  // Incrementar contador total
  contadorTotal++;
  
  // 🔹 Sistema de Cache - Verificar tentativas
  const tentativas = tentativasCPF.get(cpf) || 0;
  
  // 1ª tentativa: Limpar cache antes da consulta
  if (tentativas === 0) {
    console.log(`${LOG_PREFIX()} 🧹 1ª tentativa - Limpando cache para CPF: ${cpf}`);
    await limparCacheV8(cpf);
    tentativasCPF.set(cpf, 1);
    salvarTentativasCache(tentativasCPF); // Salvar no cache persistente
  }
  // 2ª tentativa: Não limpar cache (para não perder consulta anterior)
  else if (tentativas === 1) {
    console.log(`${LOG_PREFIX()} 🔄 2ª tentativa - Consultando sem limpar cache para CPF: ${cpf}`);
    tentativasCPF.set(cpf, 2);
    salvarTentativasCache(tentativasCPF); // Salvar no cache persistente
  }
  // 3ª tentativa: Marcar para reprocessamento rápido
  else if (tentativas >= 2) {
    console.log(`${LOG_PREFIX()} ⚡ 3ª tentativa - Marcando para reprocessamento rápido CPF: ${cpf}`);
    
    // Adicionar à fila de reprocessamento rápido (persistente)
    adicionarPendente(cpf, linha, 'reprocessar_rapido', 'sistema');
    
    // Emitir para o painel
    if (ioInstance) {
      ioInstance.emit("resultadoCPF", {
        linha,
        cpf,
        id: null,
        status: 'reprocessar_rapido',
        valorLiberado: 0,
        provider: 'sistema',
        statusDetalhado: 'RÁPIDO'
      });
    }
    
    return { data: [], pending: true, errorDetails: { message: "Marcado para reprocessamento rápido" } };
  }

  // 🔑 USAR APENAS srcor1@hotmail.com PARA CONSULTA DE FILA
  const consultaIndex = CREDENTIALS.findIndex(cred => cred.username === 'srcor1@hotmail.com');
  if (consultaIndex === -1) {
    console.log(`${LOG_PREFIX()} ⚠️ Credencial srcor1@hotmail.com não encontrada para consulta`);
    return { data: [], error: "Credencial srcor1@hotmail.com não encontrada" };
  }

  // Forçar uso da credencial específica
  switchCredential(consultaIndex);
  
  while (tentativasCredenciais < maxCredenciais) {
    try {
      await authenticate();
      
      const urlConsulta = `https://bff.v8sistema.com/fgts/balance?search=${cpf}`;
      const headersConsulta = { Authorization: `Bearer ${TOKEN}` };
      
      // Log detalhado da consulta
      logDetalhadoRequisicao('CONSULTA_SALDO', urlConsulta, { cpf, linha }, headersConsulta, CREDENTIALS[consultaIndex]);
      
      const res = await axios.get(urlConsulta, { 
        headers: headersConsulta,
        ...(proxyAgent && { agent: proxyAgent }) // Usar proxy se disponível
      });
      
      const apiLog = `📦 [Linha ${linha}] Retorno completo da API: ${JSON.stringify(res.data)}`;
      console.log(`${LOG_PREFIX()} ${apiLog}`);
      
      // Log da resposta
      console.log(`${LOG_PREFIX()} 📥 Resposta da consulta:`, {
        status: res.status,
        dataLength: res.data?.data?.length || 0,
        pages: res.data?.pages || {},
        cpf: cpf
      });
      
      // Resetar contador de erros 429 consecutivos em caso de sucesso
      erros429Consecutivos = 0;
      
      return { data: res.data.data?.[0] ? [res.data.data[0]] : [], pages: res.data.pages || { total: 0 } };
    } catch (err) {
      const erroCompleto = { message: err.message, status: err.response?.status, data: err.response?.data };
      const erroLog = `❌ Erro consulta CPF ${cpf}: ${JSON.stringify(erroCompleto)}`;
      console.log(`${LOG_PREFIX()} ${erroLog}`);
      
      // Log detalhado do erro
      console.log(`${LOG_PREFIX()} 📥 Resposta de erro da consulta:`, {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        cpf: cpf,
        linha: linha
      });
      
      // Log detalhado do erro de API
      logApiError('FGTS', 'consultarResultado', err, cpf, {
        linha,
        tentativasCredenciais,
        maxCredenciais,
        credIndex,
        username: CREDENTIALS[credIndex]?.username
      }, err.response?.data);

      if (erroCompleto.status === 401) {
        await authenticate(true);
        continue;
      } else if (erroCompleto.status === 429 || (err.response?.data?.message || "").includes("Limite de requisições")) {
        // Incrementar contador de erros 429
        contador429++;
        erros429Consecutivos++;
        
        // Marcar último erro 429 para controle de bloqueio de 30 minutos
        tentativasCPF.set('ultimo_erro_429', Date.now());
        salvarTentativasCache(tentativasCPF);
        
        // Verificar se há muitos erros 429 consecutivos
        if (erros429Consecutivos >= maxErros429Consecutivos) {
          console.log(`${LOG_PREFIX()} 🚨 CRÍTICO: ${erros429Consecutivos} erros 429 consecutivos! Usuário bloqueado por 30 minutos.`);
          if (ioInstance) {
            ioInstance.emit("log", `🚨 USUÁRIO BLOQUEADO: ${erros429Consecutivos} erros 429 consecutivos! Aguarde 30 minutos.`);
          }
          
          // Retornar erro de bloqueio
          return { error: "Usuário bloqueado por limite de requisições. Aguarde 30 minutos.", errorDetails: erroCompleto };
        }
        
        tentativasCredenciais++;
        const credLog = `⚠️ [Linha ${linha}] 429 detectado (${erros429Consecutivos}/${maxErros429Consecutivos}), tentando próxima credencial (${tentativasCredenciais}/${maxCredenciais})`;
        console.log(`${LOG_PREFIX()} ${credLog}`);
        
        // Emitir log com nome da credencial para o painel
        if (ioInstance) {
          const user = CREDENTIALS[credIndex]?.username || "sem usuário";
          ioInstance.emit("log", `⚠️ Rate limit detectado (${erros429Consecutivos}/${maxErros429Consecutivos}), trocando para: ${user}`);
        }
        
        switchCredential(null, true); // true = contingência por erro 429
        await authenticate(true);
        await delay(delayMs); // Reduzido de 2x para 1x
        continue;
      } else {
        return { error: err.message, errorDetails: erroCompleto };
      }
    }
  }

  // Se esgotou todas as credenciais e ainda recebeu 429
  registrarPendencia(cpf, "N/A", "Limite de requisições", linha);
  if (ioInstance) {
    ioInstance.emit("resultadoCPF", {
      linha,
      cpf,
      id: "N/A",
      status: "limite_excedido",
      valorLiberado: 0,
      provider: "bms_cartos",
      resultadoCompleto: null
    });
  }
  return { data: [], pending: true, errorDetails: { message: "Limite de requisições" } };
}

// 🔹 Enviar para fila
async function enviarParaFila(cpf, provider) {
  ultimoProvider = provider;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    await authenticate();
    try {
      await axios.post(
        "https://bff.v8sistema.com/fgts/balance",
        { documentNumber: cpf, provider },
        { 
          headers: { Authorization: `Bearer ${TOKEN}` }, 
          timeout: 20000,
          ...(proxyAgent && { agent: proxyAgent }) // Usar proxy se disponível
        }
      );
      return true;
    } catch (err) {
      const erroCompleto = { message: err.message, status: err.response?.status, data: err.response?.data };
      console.log(`${LOG_PREFIX()} ❌ Erro enviar para fila CPF ${cpf} | Provider: ${provider}:`, erroCompleto);

      if (erroCompleto.status === 429 || (err.response?.data?.message || "").includes("Limite de requisições")) {
        // Marcar último erro 429 para controle de bloqueio de 30 minutos
        tentativasCPF.set('ultimo_erro_429', Date.now());
        salvarTentativasCache(tentativasCPF);
        
        retryCount++;
        switchCredential(null, true); // true = contingência por erro 429
        await authenticate(true);
        await delay(delayMs * 2); // Reduzido de 3x para 2x
        continue;
      } else if (erroCompleto.status === 500 || err.message.includes("timeout")) {
        retryCount++;
        await delay(delayMs); // Reduzido de 2x para 1x
        continue;
      } else if (erroCompleto.status === 400) {
        // Erro 400 - Verificar tipo de erro
        if (erroCompleto.data?.error === "Tente novamente" && provider === "bms") {
          retryCount++;
          console.log(`${LOG_PREFIX()} 🔄 BMS "Tente novamente" - Tentativa ${retryCount}/4 para CPF ${cpf}`);
          
          if (retryCount < 4) {
            // Aguardar mais tempo antes de tentar novamente
            await delay(delayMs); // Reduzido de 2x para 1x
            continue;
          } else {
            console.log(`${LOG_PREFIX()} ⚠️ BMS "Tente novamente" - 4 tentativas esgotadas para CPF ${cpf}`);
            console.log(`${LOG_PREFIX()} 📋 CPF ${cpf} será marcado para reprocessar (não descartado)`);
            return "reprocessar";
          }
        } else if (erroCompleto.data?.error?.toLowerCase().includes("inválido") || 
                   erroCompleto.data?.error?.toLowerCase().includes("invalid")) {
          // CPF inválido - descartar permanentemente
          console.log(`${LOG_PREFIX()} 🗑️ CPF ${cpf} inválido - descartando permanentemente`);
          console.log(`${LOG_PREFIX()} 📋 Detalhes do erro:`, erroCompleto);
          return "descartar";
        } else {
          // Outros erros 400 - marcar para reprocessar
          console.log(`${LOG_PREFIX()} ⚠️ CPF ${cpf} com erro 400 - marcando para reprocessar`);
          console.log(`${LOG_PREFIX()} 📋 Detalhes do erro 400:`, erroCompleto);
          return "reprocessar";
        }
      } else {
        // Outros erros - tentar novamente
        retryCount++;
        await delay(delayMs);
        continue;
      }
    }
  }
  return "pending429";
}

// 🔹 Simular saldo
async function simularSaldo(cpf, balanceId, parcelas, provider) {
  if (!parcelas || parcelas.length === 0) return null;

  const desiredInstallments = parcelas
    .filter((p) => p.amount > 0 && p.dueDate)
    .map((p) => ({ totalAmount: p.amount, dueDate: p.dueDate }));

  if (!desiredInstallments.length) return null;

  // 🔑 USAR APENAS srcor1@hotmail.com PARA SIMULAÇÃO
  const simIndex = CREDENTIALS.findIndex(cred => cred.username === 'srcor1@hotmail.com');
  if (simIndex === -1) {
    console.log(`${LOG_PREFIX()} ⚠️ Credencial srcor1@hotmail.com não encontrada para simulação`);
    return null;
  }

  const tabelas = ["cb563029-ba93-4b53-8d53-4ac145087212", "f6d779ed-52bf-42f2-9dbc-3125fe6491ba"];
  for (const simId of tabelas) {
    switchCredential(simIndex);
    await authenticate(true);

    const payload = { simulationFeesId: simId, balanceId, targetAmount: 0, documentNumber: cpf, desiredInstallments, provider };
    try {
      const res = await axios.post("https://bff.v8sistema.com/fgts/simulations", payload, {
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        ...(proxyAgent && { agent: proxyAgent }) // Usar proxy se disponível
      });
      const available = parseFloat(res.data.availableBalance || 0);
      if (available > 0) return { ...res.data, tabelaSimulada: simId === tabelas[0] ? "NORMAL" : "ACELERA" };
    } catch (err) {
      console.error(`${LOG_PREFIX()} ❌ Erro na simulação com tabela ${simId}:`, { message: err.message, status: err.response?.status, data: err.response?.data });
    }
  }
  return null;
}

// 🔹 Consultar planilha
function consultarPlanilha(cpf, telefone) {
  const cpfNorm = normalizeCPF(cpf);
  const phoneNorm = normalizePhone(telefone);
  const csvContent = fs.readFileSync("../LISTA-FGTS.csv", "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });

  const encontrado = registros.find(r =>
    normalizeCPF(r['E-mail [#mail]']) === cpfNorm || normalizePhone(r['Telefone [#phone]']) === phoneNorm
  );

  return encontrado ? { id: encontrado['ID [#id]']?.trim(), stageId: encontrado['ID da Etapa [#stageid]']?.trim() } : null;
}

// 🔹 Atualizar oportunidade
async function atualizarOportunidadeComTabela(opportunityId, tabelaSimulada, provider = "cartos") {
  try {
    // Usar provider específico ou default para cartos
    const formsdata = { f0a67ce0: tabelaSimulada, "80b68ec0": provider };
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, formsdata };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    
    // Verificar se está em horário comercial para disparar
    if (isHorarioComercial()) {
      const resultadoDisparo = await disparaFluxo(opportunityId);
      if (resultadoDisparo === "ja_disparado") {
        console.log(`${LOG_PREFIX()} ⚠️ Oportunidade ${opportunityId} já foi disparada anteriormente`);
        return { success: true, statusDetalhado: 'ja_disparado' };
      } else if (resultadoDisparo === true) {
        console.log(`${LOG_PREFIX()} ✅ Oportunidade atualizada e disparada imediatamente - ID: ${opportunityId}`);
        return { success: true, statusDetalhado: 'disparo' };
      } else {
        console.log(`${LOG_PREFIX()} ❌ Erro ao disparar oportunidade ${opportunityId}`);
        return { success: true, statusDetalhado: 'erro_disparo' };
      }
    } else {
      agendarDisparo(opportunityId, 'atualizar');
      return { success: true, statusDetalhado: 'agendado' };
    }
  } catch (error) {
    // Log detalhado do erro de CRM
    logCrmError('atualizarOportunidadeComTabela', error, null, opportunityId, {
      tabelaSimulada,
      provider,
      formsdata: { f0a67ce0: tabelaSimulada, "80b68ec0": provider },
      queueId: QUEUE_ID,
      payload: { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, formsdata: { f0a67ce0: tabelaSimulada, "80b68ec0": provider } }
    });
    
    return { success: false, statusDetalhado: 'erro' };
  }
}

// 🔹 Criar oportunidade
async function criarOportunidade(cpf, telefone, valorLiberado, provider = "cartos") {
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, fkPipeline: 1, fkStage: 4, responsableid: 0, title: `Oportunidade CPF ${cpf}`, mainphone: telefone || "", mainmail: cpf || "", value: valorLiberado || 0 };
    const res = await axios.post("https://lunasdigital.atenderbem.com/int/createOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    
    const opportunityId = res.data.id;
    
    // Verificar se está em horário comercial
    if (isHorarioComercial()) {
      // Disparar imediatamente
      const resultadoDisparo = await disparaFluxo(opportunityId);
      if (resultadoDisparo === "ja_disparado") {
        console.log(`${LOG_PREFIX()} ⚠️ Oportunidade ${opportunityId} já foi disparada anteriormente`);
        return { id: opportunityId, statusDetalhado: 'ja_disparado' };
      } else if (resultadoDisparo === true) {
        console.log(`${LOG_PREFIX()} ✅ Oportunidade criada e disparada imediatamente - ID: ${opportunityId}`);
        return { id: opportunityId, statusDetalhado: 'disparo' };
      } else {
        console.log(`${LOG_PREFIX()} ❌ Erro ao disparar oportunidade ${opportunityId}`);
        return { id: opportunityId, statusDetalhado: 'erro_disparo' };
      }
    } else {
      // Agendar para horário comercial
      agendarDisparo(opportunityId, 'criar');
      return { id: opportunityId, statusDetalhado: 'agendado' };
    }
  } catch (error) {
    // Log detalhado do erro de CRM
    logCrmError('criarOportunidade', error, cpf, null, {
      telefone,
      valorLiberado,
      queueId: QUEUE_ID,
      payload: { queueId: QUEUE_ID, apiKey: API_CRM_KEY, fkPipeline: 1, fkStage: 4, responsableid: 0, title: `Oportunidade CPF ${cpf}`, mainphone: telefone || "", mainmail: cpf || "", value: valorLiberado || 0 }
    });
    
    return { id: null, statusDetalhado: 'erro' };
  }
}

// 🔹 Atualizar CSV com ID
function atualizarCSVcomID(cpf, telefone, novoID) {
  const csvContent = fs.readFileSync("../LISTA-FGTS.csv", "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: false, delimiter: ";" });
  const linha = registros.find(r => normalizeCPF(r['E-mail [#mail]']) === normalizeCPF(cpf) || normalizePhone(r['Telefone [#phone]']) === normalizePhone(telefone));
  if (linha) {
    linha['ID [#id]'] = novoID;
    const headers = Object.keys(registros[0]).join(";");
    const body = registros.map(r => Object.values(r).join(";")).join("\n");
    fs.writeFileSync("../LISTA-FGTS.csv", headers + "\n" + body, "utf-8");
  }
}

// 🔹 Disparar fluxo
async function disparaFluxo(opportunityId) {
  if (!opportunityId) return false;
  
  // Verificar se já foi disparado recentemente (evitar erro 400)
  const chaveDisparo = `disparo_${opportunityId}`;
  if (tentativasCPF.has(chaveDisparo)) {
    console.log(`${LOG_PREFIX()} ⚠️ Oportunidade ${opportunityId} já foi disparada recentemente, pulando...`);
    return "ja_disparado";
  }
  
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, destStageId: DEST_STAGE_ID };
    await axios.post("https://lunasdigital.atenderbem.com/int/changeOpportunityStage", payload, { headers: { "Content-Type": "application/json" } });
    
    // Marcar como disparado para evitar reprocessamento
    tentativasCPF.set(chaveDisparo, Date.now());
    salvarTentativasCache(tentativasCPF);
    
    return true;
  } catch (error) {
    // Se for erro 400, marcar como já disparado para evitar tentativas futuras
    if (error.response && error.response.status === 400) {
      console.log(`${LOG_PREFIX()} ⚠️ Oportunidade ${opportunityId} já foi processada anteriormente (erro 400), marcando como já disparada`);
      tentativasCPF.set(chaveDisparo, Date.now());
      salvarTentativasCache(tentativasCPF);
      return "ja_disparado";
    }
    
    // Log detalhado do erro de CRM
    logCrmError('disparaFluxo', error, null, opportunityId, {
      queueId: QUEUE_ID,
      destStageId: DEST_STAGE_ID,
      payload: { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, destStageId: DEST_STAGE_ID }
    });
    
    return "erroDisparo";
  }
}

// ====== SISTEMA DE ESTADO PERSISTENTE ======

// Função para atualizar estado persistente (será chamada do server.js)
let atualizarEstadoPersistente = null;

// Função para atualizar contadores em tempo real (será chamada do server.js)
let atualizarContadoresTempoReal = null;

// Registrar função de atualização de estado
function registrarAtualizadorEstado(callback) {
  atualizarEstadoPersistente = callback;
}

// Registrar função de atualização de contadores em tempo real
function registrarAtualizadorContadores(callback) {
  atualizarContadoresTempoReal = callback;
}

// Atualizar estado quando há mudanças
async function atualizarEstadoCompleto(dados) {
  if (atualizarEstadoPersistente) {
    try {
      await atualizarEstadoPersistente(dados);
    } catch (error) {
      console.error('❌ Erro ao atualizar estado persistente:', error);
    }
  }
}

// 🔹 Processar CPFs
async function processarCPFs(csvPath = null, cpfsReprocess = null, callback = null) {
  let registros = [];
  const pendentesParaReprocessar = [];
  let processed = 0;
  let contadorSucesso = 0;
  let contadorPending = 0;
  let contadorSemAutorizacao = 0;
  let contadorDescartados = 0;
  
  try {
    console.log(`${LOG_PREFIX()} 🚀 ===== INICIANDO PROCESSAMENTO DE CPFs =====`);
    console.log(`${LOG_PREFIX()} 📋 Parâmetros: csvPath=${csvPath}, cpfsReprocess=${cpfsReprocess?.length || 0}, callback=${!!callback}`);

    if (cpfsReprocess && cpfsReprocess.length) {
      registros = cpfsReprocess.map((item, i) => {
        // Se for um objeto, extrair o CPF
        const cpf = typeof item === 'object' && item !== null ? item.cpf : item;
        return { CPF: cpf, ID: `reproc_${i}` };
      });
      console.log(`${LOG_PREFIX()} 🔄 Modo reprocessamento: ${registros.length} CPFs para reprocessar`);
    } else if (csvPath) {
      const csvContent = fs.readFileSync(csvPath, "utf-8");
      registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });
      console.log(`${LOG_PREFIX()} 📄 Modo CSV: ${registros.length} registros carregados do arquivo`);
    } else throw new Error("Nenhum CSV fornecido para processar!");

  const total = registros.length;
  console.log(`${LOG_PREFIX()} 📊 Total de registros para processar: ${total}`);

  console.log(`${LOG_PREFIX()} 📄 Total de CPFs lidos: ${total}`);
  if (ioInstance) ioInstance.emit("totalCPFs", total);

  // Atualizar estado inicial
  await atualizarEstadoCompleto({
    processando: true,
    total: total,
    processados: 0,
    sucessos: 0,
    pendentes: registros.length,
    reprocessar: cpfsReprocess?.length || 0,
    ultimaAtualizacao: new Date().toISOString()
  });

  const atualizarProgresso = () => {
    console.log(`${LOG_PREFIX()} 📊 Atualizando progresso: ${processed}/${total} | Sucessos: ${contadorSucesso} | Pendentes: ${contadorPending} | Não Autorizados: ${contadorSemAutorizacao} | Descartados: ${contadorDescartados}`);
    
    if (ioInstance) {
      ioInstance.emit("progress", {
        done: processed,
        total,
        pendentes: pendentesParaReprocessar.length,
        counters: {
          success: contadorSucesso,
          pending: contadorPending,
          no_auth: contadorSemAutorizacao,
          descartados: contadorDescartados
        }
      });
      
      // REMOVIDO: Eventos individuais de contadores para evitar conflito
      // Os contadores são atualizados via evento 'progress' unificado
    }
    
    // Atualizar estado persistente
    atualizarEstadoCompleto({
      processando: true,
      total: total,
      processados: processed,
      sucessos: contadorSucesso,
      pendentes: pendentesParaReprocessar.length,
      ultimaAtualizacao: new Date().toISOString()
    });
  };

  // Função interna de retry com tratamento de 429
  async function tentarConsultaComRetry(cpf, linha, provider = null, maxTentativas = 3, delayEntreTentativas = 500) {
    // Verificar cache primeiro
    const cached = verificarCache(cpf);
    if (cached) {
      return cached;
    }

    let tentativa = 0;
    let resultado = null;
    let limit429 = false;

    while (tentativa < maxTentativas) {
      resultado = await consultarResultado(cpf, linha);

      if (!resultado || !resultado.data || resultado.data.length === 0) break;

      // Se algum erro temporário
      const erroConsulta = resultado.data.find(d =>
        d.status === "error" && d.statusInfo?.includes("erro ao realizar a consulta")
      );

      if (!erroConsulta) break;

      // Se der 429, tenta trocar credencial e continuar
      if (resultado.pending) {
        limit429 = true;
        switchCredential(null, true); // true = contingência por erro 429
        await authenticate(true);
        await delay(delayEntreTentativas * 2); // Reduzido de 3x para 2x
        tentativa++;
        continue;
      }

      tentativa++;
      console.log(`${LOG_PREFIX()} ⚠️ [Linha ${linha}] Tentativa ${tentativa} para CPF ${cpf} devido a erro temporário`);
      await delay(delayEntreTentativas);
    }

    // Se nenhum login conseguiu consultar, marca pendência 429
    if (limit429) {
      registrarPendencia(cpf, "N/A", "Limite de requisições", linha);
      pendentesParaReprocessar.push({ cpf, id: "N/A", linha, motivo: "Limite de requisições" });
      emitirResultado({ cpf, id: "N/A", status: "pending", valorLiberado: 0, provider: "bms_cartos", linha, resultadoCompleto: resultado, motivo: "Limite de requisições" }, callback);
    }

    // Salvar no cache se houve resultado válido
    if (resultado && resultado.data && resultado.data.length > 0) {
      salvarCache(cpf, resultado);
    }

    return resultado;
  }

  // --- Loop principal ---
  for (let [index, registro] of registros.entries()) {
    while (paused) await delay(500);

    // Ajustar delay dinamicamente a cada 20 CPFs (menos frequente)
    if ((index + 1) % 20 === 0) {
      ajustarDelayDinamico();
    }

    const linha = index + 2;
    const cpf = normalizeCPF(registro.CPF);
    let idOriginal = (registro.ID || "").trim();
    const telefone = normalizePhone(registro.TELEFONE);
    
    // Log detalhado do CPF sendo processado
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] 📋 PROCESSANDO CPF ${index + 1}/${registros.length}: ${cpf} | Linha: ${linha} | ID: ${idOriginal}`);
    
    // Emitir log para o frontend
    if (ioInstance) {
      ioInstance.emit('logFila', { 
        type: 'info', 
        message: `[${timestamp}] 📋 PROCESSANDO CPF ${index + 1}/${registros.length}: ${cpf} | Linha: ${linha} | ID: ${idOriginal}` 
      });
    }

    if (!cpf) {
      console.log(`${LOG_PREFIX()} ⚠️ CPF inválido na linha ${linha}: ${registro.CPF} - pulando`);
      console.log(`[${timestamp}] ❌ CPF INVÁLIDO: ${registro.CPF} | Linha: ${linha}`);
      contadorDescartados++;
      emitirResultado({ cpf: registro.CPF || "INVÁLIDO", id: idOriginal, status: "descartado", provider: "N/A", valorLiberado: 0, linha }, callback);
      processed++;
      atualizarProgresso();
      continue;
    }

    // Reprocessar pendentes a cada 25 CPFs (menos frequente para melhor performance)
    if ((index + 1) % 25 === 0 && pendentesParaReprocessar.length > 0) {
      console.log(`${LOG_PREFIX()} 🔄 Reprocessando ${pendentesParaReprocessar.length} pendentes após ${index + 1} CPFs processados`);
      
      // Reprocessar pendentes
      const cpfsPendentes = [...pendentesParaReprocessar];
      pendentesParaReprocessar.length = 0; // Limpar array de pendentes
      
      for (const pend of cpfsPendentes) {
        if (paused) break;
        const { cpf: cpfPendente, id, linha: linhaPendente } = pend;
        
        const resultadoRetry = await tentarConsultaComRetry(cpfPendente, linhaPendente);
        const saldoValido = resultadoRetry?.data?.find(r => r.amount > 0);

        if (saldoValido) {
          const simulacao = await simularSaldo(cpfPendente, saldoValido.id, saldoValido.periods, saldoValido.provider);
          if (simulacao) {
            const resultadoAtualizacao = await atualizarOportunidadeComTabela(id, simulacao.tabelaSimulada, saldoValido.provider);
            emitirResultado({ cpf: cpfPendente, id, status: "success", valorLiberado: simulacao.availableBalance, provider: saldoValido.provider, linha: linhaPendente, resultadoCompleto: saldoValido, statusDetalhado: resultadoAtualizacao.statusDetalhado }, callback);
            contadorSucesso++;
            
            // Remover da lista de pendentes (persistente)
            removerPendente(cpfPendente, linhaPendente);
            removerResultadoLista('pendentes', cpfPendente, id);
            
            // Emitir remoção para o painel
            if (ioInstance) {
              ioInstance.emit('removerPendente', {
                cpf: cpfPendente,
                linha: linhaPendente
              });
            }
          }
        } else {
          // Se não conseguiu resolver, volta para pendentes
          pendentesParaReprocessar.push(pend);
        }
        
        await delay(delayMs);
        atualizarProgresso();
      }
      
      console.log(`${LOG_PREFIX()} ✅ Reprocessamento de pendentes concluído`);
    }

    const planilha = consultarPlanilha(cpf, telefone);
    if (planilha) idOriginal = planilha.id;

    // REMOVIDO: delay desnecessário aqui - já há delays nas consultas

    // --- Consulta na fila primeiro ---
    let resultadoFila = await tentarConsultaComRetry(cpf, linha);
    if (!resultadoFila || !resultadoFila.data || resultadoFila.data.length === 0) {
      // Tentar enviar para fila com diferentes providers (incluindo QI)
      const filaProviders = ["bms", "cartos", "qi"];
      for (const provider of filaProviders) {
        const enviado = await enviarParaFila(cpf, provider);
        if (enviado === true) {
          // Delay reduzido - apenas 500ms para consulta após envio
          await delay(500);
          resultadoFila = await tentarConsultaComRetry(cpf, linha);
          break; // Se conseguiu enviar, para o loop
        } else if (enviado === "reprocessar") {
          // CPF com erro 400 - marcar para reprocessar
          console.log(`${LOG_PREFIX()} ⚠️ CPF ${cpf} com erro 400 - marcando para reprocessar`);
          console.log(`${LOG_PREFIX()} 📋 CPF ${cpf} será adicionado à lista de reprocessamento`);
          
          // Adicionar à lista de reprocessamento
          pendentesParaReprocessar.push({ cpf, id: idOriginal, linha });
          emitirResultado({ cpf, id: idOriginal, status: "reprocessar", provider: "sistema", valorLiberado: 0, linha }, callback);
          processed++;
          atualizarProgresso();
          continue;
        } else if (enviado === "descartar") {
          // CPF inválido - descartar permanentemente
          console.log(`${LOG_PREFIX()} 🗑️ CPF ${cpf} inválido - descartando permanentemente`);
          console.log(`${LOG_PREFIX()} 📋 CPF ${cpf} será removido da lista de processamento`);
          
          // Descartar permanentemente
          contadorDescartados++;
          emitirResultado({ cpf, id: idOriginal, status: "descartado", provider: "sistema", valorLiberado: 0, linha }, callback);
          processed++;
          atualizarProgresso();
          continue;
        }
      }
    }

    // --- Consulta BMS, Cartos e QI (PARALELO) ---
    const providers = ["bms", "cartos", "qi"];
    let resultadosProviders = {};

    // Processar providers em paralelo para melhor performance
    const consultasParalelas = providers.map(async (prov) => {
      const res = await tentarConsultaComRetry(cpf, linha);
      return { provider: prov, data: res?.data || [] };
    });

    const resultados = await Promise.all(consultasParalelas);
    resultados.forEach(({ provider, data }) => {
      resultadosProviders[provider] = data;
    });

    const todosStatus = Object.values(resultadosProviders).flat();

    // Success → saldo > 0
    const registrosValidos = todosStatus.filter(r => r.amount > 0);
    if (registrosValidos.length > 0) {
      const r = registrosValidos[0];
      const simulacao = await simularSaldo(cpf, r.id, r.periods, r.provider);

        if (simulacao) {
          let statusDetalhado = 'criado';
          
          if (!idOriginal) {
            const resultadoCriacao = await criarOportunidade(cpf, telefone, simulacao.availableBalance);
            if (resultadoCriacao?.id) {
              idOriginal = resultadoCriacao.id;
              statusDetalhado = resultadoCriacao.statusDetalhado;
              atualizarCSVcomID(cpf, telefone, idOriginal);
            }
          } else {
            const resultadoAtualizacao = await atualizarOportunidadeComTabela(idOriginal, simulacao.tabelaSimulada, r.provider);
            if (resultadoAtualizacao?.success) {
              statusDetalhado = resultadoAtualizacao.statusDetalhado;
            }
          }

          emitirResultado({ cpf, id: idOriginal, status: "success", valorLiberado: simulacao.availableBalance, provider: r.provider, linha, resultadoCompleto: r, statusDetalhado }, callback);
          contadorSucesso++;
        }
      processed++;
      atualizarProgresso();
      continue;
    }

    // Pending → qualquer um pendente
    const hasPending = todosStatus.some(d => d.status === "pending");
    if (hasPending) {
      registrarPendencia(cpf, idOriginal, "Aguardando retorno", linha);
      pendentesParaReprocessar.push({ cpf, id: idOriginal, linha });
      contadorPending++;

      emitirResultado({ cpf, id: idOriginal, status: "pending", valorLiberado: 0, provider: "bms_cartos", linha, resultadoCompleto: todosStatus }, callback);
      processed++;
      atualizarProgresso();
      continue;
    }

    // No Auth → todos não autorizados
    const todosNaoAut = todosStatus.every(d => d.status === "error" && d.statusInfo?.includes("não possui autorização"));
    if (todosNaoAut) {
      registrarPendencia(cpf, idOriginal, "Não autorizado", linha);
      contadorSemAutorizacao++;

      emitirResultado({ cpf, id: idOriginal, status: "no_auth", valorLiberado: 0, provider: "bms_cartos", linha, resultadoCompleto: todosStatus }, callback);
      processed++;
      atualizarProgresso();
      continue;
    }

    // Descartados → não entrou em nenhuma lista
    contadorDescartados++;
    emitirResultado({ cpf, id: idOriginal, status: "descartado", valorLiberado: 0, provider: "bms_cartos", linha, resultadoCompleto: todosStatus }, callback);
    processed++;
    atualizarProgresso();
  }

  // --- Loop de reprocessamento de pendentes ---
  for (const pend of [...pendentesParaReprocessar]) {
    while (paused) await delay(500);
    const { cpf, id, linha } = pend;

    const resultadoRetry = await tentarConsultaComRetry(cpf, linha);
    const saldoValido = resultadoRetry?.data?.find(r => r.amount > 0);

    if (saldoValido) {
      const simulacao = await simularSaldo(cpf, saldoValido.id, saldoValido.periods, saldoValido.provider);
      if (simulacao) {
        const resultadoAtualizacao = await atualizarOportunidadeComTabela(id, simulacao.tabelaSimulada, saldoValido.provider);
        emitirResultado({ cpf, id, status: "success", valorLiberado: simulacao.availableBalance, provider: saldoValido.provider, linha, resultadoCompleto: saldoValido, statusDetalhado: resultadoAtualizacao.statusDetalhado }, callback);
        contadorSucesso++;
        
        // Remover da lista de pendentes (persistente)
        removerPendente(cpf, linha);
        removerResultadoLista('pendentes', cpf, id);
        
        // Emitir remoção para o painel
        if (ioInstance) {
          ioInstance.emit('removerPendente', {
            cpf: cpf,
            linha: linha
          });
        }
        
        pendentesParaReprocessar.splice(pendentesParaReprocessar.indexOf(pend), 1);
      }
    }
    atualizarProgresso();
  }

  console.log(`📊 Contadores finais:
Sucesso: ${contadorSucesso} | Pendentes: ${contadorPending} | Sem Autorização: ${contadorSemAutorizacao} | Descartados: ${contadorDescartados}`);
  
  // Salvar estado final do processamento
  salvarEstadoProcessamento({
    totalCPFs: total,
    processados: processed,
    sucessos: contadorSucesso,
    pendentes: contadorPending,
    naoAutorizados: contadorSemAutorizacao,
    descartados: contadorDescartados,
    agendados: 0,
    delayAtual: delayMs
  });
  
  // Salvar pendentes finais
  salvarPendentes(pendentes);
  
  // Emitir evento de finalização
  if (ioInstance) {
    ioInstance.emit('processamentoFinalizado');
  }
  
  // Atualizar estado final
  await atualizarEstadoCompleto({
    processando: false,
    total: total,
    processados: processed,
    sucessos: contadorSucesso,
    pendentes: pendentesParaReprocessar.length,
    ultimaAtualizacao: new Date().toISOString()
  });
  
  } catch (error) {
    // Log detalhado do erro de sistema
    logSystemError('processarCPFs', error, {
      csvPath,
      cpfsReprocess: cpfsReprocess?.length || 0,
      totalRegistros: registros?.length || 0,
      processed,
      contadorSucesso,
      contadorPending,
      contadorSemAutorizacao,
      contadorDescartados
    });
    
    console.error(`${LOG_PREFIX()} ❌ Erro crítico no processamento:`, error.message);
    throw error;
  }
}

// 🔹 Processar um CPF individual (para reprocessamento)
async function processarCPF(cpf, linha) {
  try {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`${LOG_PREFIX()} 🔄 Processando CPF individual: ${cpf}, Linha: ${linha}`);
    console.log(`[${timestamp}] 🚀 INICIANDO PROCESSAMENTO: CPF ${cpf} | Linha ${linha}`);
    console.log(`${LOG_PREFIX()} 📊 Estado atual: ${pendentes.length} pendentes, ${tentativasCPF.size} tentativas de cache`);
    
    // Emitir log para o frontend
    if (ioInstance) {
      ioInstance.emit('logFila', { 
        type: 'info', 
        message: `[${timestamp}] 🔄 Processando CPF individual: ${cpf}, Linha: ${linha}` 
      });
    }
    
    // Resetar tentativas de cache para este CPF
    tentativasCPF.delete(cpf);
    console.log(`${LOG_PREFIX()} 🧹 Cache resetado para CPF: ${cpf}`);
    
    // Consultar resultado
    console.log(`${LOG_PREFIX()} 🔍 Consultando resultado para CPF: ${cpf}`);
    console.log(`[${timestamp}] 🔍 CONSULTANDO RESULTADO: CPF ${cpf}`);
    const resultado = await consultarResultado(cpf, linha);
    
    if (!resultado || !resultado.data || resultado.data.length === 0) {
      console.log(`${LOG_PREFIX()} ⚠️ Nenhum resultado encontrado para CPF: ${cpf}`);
      return { status: 'pending', valorLiberado: 0, provider: 'sistema' };
    }
    
    console.log(`${LOG_PREFIX()} ✅ Resultado encontrado para CPF: ${cpf} - ${resultado.data.length} registros`);
    
    // Verificar se há saldo válido
    const saldoValido = resultado.data.find(r => r.amount > 0);
    if (saldoValido) {
      console.log(`${LOG_PREFIX()} 💰 Saldo válido encontrado: R$ ${saldoValido.amount} - Provider: ${saldoValido.provider}`);
      
      // Simular saldo
      const simulacao = await simularSaldo(cpf, saldoValido.id, saldoValido.periods, saldoValido.provider);
      if (simulacao) {
        console.log(`${LOG_PREFIX()} ✅ Simulação concluída: R$ ${simulacao.availableBalance} liberado`);
        return {
          status: 'success',
          valorLiberado: simulacao.availableBalance,
          provider: saldoValido.provider,
          id: saldoValido.id
        };
      }
    }
    
    // Verificar se está pendente
    const hasPending = resultado.data.some(d => d.status === "pending");
    if (hasPending) {
      return { status: 'pending', valorLiberado: 0, provider: 'sistema' };
    }
    
    // Verificar se não autorizado
    const todosNaoAut = resultado.data.every(d => d.status === "error" && d.statusInfo?.includes("não possui autorização"));
    if (todosNaoAut) {
      return { status: 'no_auth', valorLiberado: 0, provider: 'sistema' };
    }
    
    // Descartado
    return { status: 'descartado', valorLiberado: 0, provider: 'sistema' };
    
  } catch (error) {
    console.error(`${LOG_PREFIX()} ❌ Erro ao processar CPF ${cpf}:`, error.message);
    return { status: 'descartado', valorLiberado: 0, provider: 'sistema' };
  }
}

// 🔹 Processar CPFs de reprocessamento rápido (prioridade alta)
async function processarReprocessamentoRapido() {
  const rapidos = pendentes.filter(p => p.status === 'reprocessar_rapido');
  if (rapidos.length === 0) return;
  
  console.log(`${LOG_PREFIX()} ⚡ Processando ${rapidos.length} CPFs de reprocessamento rápido...`);
  
  // Processar todos os rápidos imediatamente
  for (const cpfRapido of rapidos) {
    // Resetar contador de tentativas (persistente)
    resetarTentativasCache(cpfRapido.cpf);
    tentativasCPF.delete(cpfRapido.cpf);
    
    // Processar novamente
    const resultado = await processarCPF(cpfRapido.cpf, cpfRapido.linha);
    
    // Remover da lista de pendentes primeiro (persistente)
    removerPendente(cpfRapido.cpf, cpfRapido.linha);
    
    // Atualizar status baseado no resultado
    if (resultado && resultado.status) {
      const novoStatus = resultado.status === 'success' ? 'success' : (resultado.status === 'no_auth' ? 'no_auth' : 'failed');
      const statusDetalhado = resultado.status === 'success' ? 'Reprocessado para Sucesso' : 
                             resultado.status === 'no_auth' ? 'Reprocessado para Não Autorizado' : 
                             'Reprocessado para Falha';
      
      // Remover da lista de pendentes primeiro (persistente)
      removerResultadoLista('pendentes', cpfRapido.cpf, cpfRapido.id);
      
      // Adicionar à lista correta baseada no status
      if (novoStatus === 'success') {
        adicionarResultadoLista('sucessos', {
          cpf: cpfRapido.cpf,
          id: cpfRapido.id || resultado.id || 'N/A',
          linha: cpfRapido.linha,
          valor: (resultado.valorLiberado || 0).toFixed(2),
          provider: resultado.provider || 'sistema',
          status: novoStatus,
          statusDetalhado: statusDetalhado
        });
      } else if (novoStatus === 'no_auth') {
        adicionarResultadoLista('naoAutorizados', {
          cpf: cpfRapido.cpf,
          id: cpfRapido.id || resultado.id || 'N/A',
          linha: cpfRapido.linha,
          valor: '0.00',
          provider: resultado.provider || 'sistema',
          status: novoStatus,
          statusDetalhado: statusDetalhado
        });
      } else {
        adicionarResultadoLista('descartados', {
          cpf: cpfRapido.cpf,
          id: cpfRapido.id || resultado.id || 'N/A',
          linha: cpfRapido.linha,
          valor: '0.00',
          provider: resultado.provider || 'sistema',
          status: novoStatus,
          statusDetalhado: statusDetalhado
        });
      }
      
      // Emitir atualização para o painel
      if (ioInstance) {
        ioInstance.emit('resultadoCPF', {
          linha: cpfRapido.linha,
          cpf: cpfRapido.cpf,
          id: resultado.id || null,
          status: novoStatus,
          valorLiberado: resultado.valorLiberado || 0,
          provider: resultado.provider || 'sistema',
          statusDetalhado: statusDetalhado,
          isReprocessamento: true
        });
        
        // Emitir remoção da lista de pendentes
        ioInstance.emit('removerPendente', {
          cpf: cpfRapido.cpf,
          linha: cpfRapido.linha
        });
      }
    }
    
    // Remover da lista em memória
    const index = pendentes.indexOf(cpfRapido);
    if (index > -1) {
      pendentes.splice(index, 1);
    }
  }
}


// 🔹 Funções de Gerenciamento do Sistema de Contingência
function getContingencyStatus() {
  return {
    usingApiTokens,
    directAuthFailures,
    maxDirectAuthFailures: MAX_DIRECT_AUTH_FAILURES,
    lastApiTokensCheck,
    apiTokensUrl: API_TOKENS_URL,
    tokenCacheSize: tokenCache.size,
    tokenCacheDetails: Array.from(tokenCache.entries()).map(([username, data]) => ({
      username,
      isValid: (Date.now() - data.timestamp) < data.expiresIn,
      ageMinutes: Math.round((Date.now() - data.timestamp) / (1000 * 60)),
      expiresIn: Math.max(0, Math.round((data.expiresIn - (Date.now() - data.timestamp)) / (1000 * 60)))
    }))
  };
}

function resetContingencySystem() {
  usingApiTokens = false;
  directAuthFailures = 0;
  lastApiTokensCheck = 0;
  tokenCache.clear();
  console.log(`${LOG_PREFIX()} 🔄 Sistema de contingência resetado`);
}

function forceUseApiTokens() {
  usingApiTokens = true;
  directAuthFailures = MAX_DIRECT_AUTH_FAILURES;
  console.log(`${LOG_PREFIX()} 🔄 Forçando uso da API de tokens`);
}

function forceUseDirectAuth() {
  usingApiTokens = false;
  directAuthFailures = 0;
  console.log(`${LOG_PREFIX()} 🔄 Forçando uso da autenticação direta`);
}

export {
  processarCPFs,
  processarCPF,
  disparaFluxo,
  authenticate,
  atualizarOportunidadeComTabela,
  criarOportunidade,
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
  registrarAtualizadorContadores,
  obterAgendamentos,
  // Sistema de Contingência
  getContingencyStatus,
  resetContingencySystem,
  forceUseApiTokens,
  forceUseDirectAuth
};
