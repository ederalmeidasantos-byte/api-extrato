import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import qs from "qs";
import dotenv from "dotenv";
import { logApiError, logAuthError, logCacheError, logCrmError, logSystemError } from "./error-logger.js";
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

dotenv.config();

// 🔹 Configurações
let delayMs = 1000;
let delayBase = 1000; // Delay base
let delayAtual = 1000; // Delay atual (pode variar)
let taxaErro429 = 0; // Taxa de erro 429 (0-1)
let contador429 = 0; // Contador de erros 429
let contadorTotal = 0; // Contador total de consultas
let ultimoAjusteDelay = Date.now(); // Última vez que ajustou o delay
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
if (!CREDENTIALS.length) {
  console.error("❌ Nenhuma credencial FGTS configurada no .env");
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

// 🔹 Sistema de Controle Dinâmico de Delay
function ajustarDelayDinamico() {
  const agora = Date.now();
  const tempoDesdeUltimoAjuste = agora - ultimoAjusteDelay;
  
  // Só ajustar a cada 30 segundos
  if (tempoDesdeUltimoAjuste < 30000) return;
  
  // Calcular taxa de erro 429
  if (contadorTotal > 0) {
    taxaErro429 = contador429 / contadorTotal;
  }
  
  let novoDelay = delayBase;
  
  if (taxaErro429 > 0.3) {
    // Muitos erros 429 - aumentar delay significativamente
    novoDelay = delayBase * 3;
    console.log(`${LOG_PREFIX()} 🐌 Muitos erros 429 (${(taxaErro429 * 100).toFixed(1)}%) - Aumentando delay para ${novoDelay}ms`);
  } else if (taxaErro429 > 0.1) {
    // Alguns erros 429 - aumentar delay moderadamente
    novoDelay = delayBase * 2;
    console.log(`${LOG_PREFIX()} ⚠️ Alguns erros 429 (${(taxaErro429 * 100).toFixed(1)}%) - Aumentando delay para ${novoDelay}ms`);
  } else if (taxaErro429 === 0 && contadorTotal > 10) {
    // Nenhum erro 429 - pode diminuir delay gradualmente
    novoDelay = Math.max(delayBase * 0.8, delayAtual * 0.9);
    console.log(`${LOG_PREFIX()} 🚀 Sem erros 429 - Diminuindo delay para ${novoDelay}ms`);
  } else {
    // Manter delay atual
    novoDelay = delayAtual;
  }
  
  // Aplicar limites
  novoDelay = Math.max(500, Math.min(5000, novoDelay));
  
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
    console.log(`${LOG_PREFIX()} ⚡ Delay base atualizado para ${delayMs}ms`);
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
const normalizeCPF = (cpf) => (cpf || "").toString().replace(/\D/g, "").padStart(11, "0");
const normalizePhone = (phone) => (phone || "").toString().replace(/\D/g, "");

// 🔹 Registrar pendência
function registrarPendencia(cpf, id, motivo, linha) {
  console.log(`${LOG_PREFIX()} ⚠️ Pendência registrada - Linha ${linha} | CPF: ${cpf} | ID: ${id} | Motivo: ${motivo}`);
  pendentes.push({ cpf, id, motivo, linha });
}

// 🔹 Emitir resultado
function emitirResultado({ cpf, id, status, valorLiberado = 0, provider, linha = "?", resultadoCompleto = null, statusDetalhado = null }, callback = null) {
  const valorFormatado = Number(valorLiberado || 0).toFixed(2);

  // Mapear status para exibição (melhorado)
  const statusMap = {
    'success': '✅ Sucesso',
    'pending': '⏳ Pendente', 
    'no_auth': '🚫 Não Autorizado',
    'descartado': '❌ Descartado',
    'ready_for_manual': '📥 Pronto',
    'limite_excedido': '⏰ Limite Excedido'
  };
  
  const statusDisplay = statusMap[status] || `❓ ${status}`;
  const logMessage = `${statusDisplay} | Linha: ${linha || "?"} | CPF: ${cpf} | ID: ${id || "N/A"} | Valor: R$ ${valorFormatado} | Provider: ${provider}`;
  console.log(`[CLIENT] ${logMessage}`);

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
      tipoLista = 'pendentes';
      break;
    case 'no_auth':
      tipoLista = 'naoAutorizados';
      break;
    case 'descartado':
      tipoLista = 'descartados';
      break;
    default:
      tipoLista = 'descartados';
  }

  // Adicionar ao cache
  console.log(`🔍 Salvando resultado no cache - Tipo: ${tipoLista}, CPF: ${cpf}, Status: ${status}`);
  adicionarResultadoLista(tipoLista, dadosResultado);

  // Emitir log resumido para o painel (sem detalhes da API)
  if (ioInstance) {
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
function switchCredential(forcedIndex = null) {
  if (!CREDENTIALS.length) return;
  credIndex = forcedIndex !== null ? forcedIndex % CREDENTIALS.length : (credIndex + 1) % CREDENTIALS.length;
  TOKEN = null;
  const user = CREDENTIALS[credIndex]?.username || "sem usuário";
  const switchLog = `🔄 Alternando para credencial: ${user}`;
  console.log(`${LOG_PREFIX()} ${switchLog}`);
  
  // NÃO emitir log de mudança de credencial para o painel - apenas no console
}

// 🔹 Autenticar
async function authenticate(force = false) {
  if (TOKEN && !force) return TOKEN;
  if (!CREDENTIALS.length) throw new Error("Nenhuma credencial disponível!");
  const cred = CREDENTIALS[credIndex];

  try {
    const authAttemptLog = `🔑 Tentando autenticar: ${cred.username}`;
    console.log(`${LOG_PREFIX()} ${authAttemptLog}`);
    
    // NÃO emitir log de tentativa de autenticação para o painel - apenas no console
    const data = qs.stringify({
      grant_type: "password",
      username: cred.username,
      password: cred.password,
      audience: "https://bff.v8sistema.com",
      scope: "offline_access",
      client_id: "DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn",
    });

    const res = await axios.post("https://auth.v8sistema.com/oauth/token", data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    TOKEN = res.data.access_token;
    const authLog = `✅ Autenticado com sucesso - ${cred.username}`;
    console.log(`${LOG_PREFIX()} ${authLog}`);
    
    // NÃO emitir log de autenticação para o painel - apenas no console
    
    return TOKEN;
  } catch (err) {
    const user = cred?.username || "sem usuário";
    console.log(`${LOG_PREFIX()} ❌ Erro ao autenticar ${user}: ${err.message}`);
    
    // Log detalhado do erro de autenticação
    logAuthError('FGTS', 'authenticate', err, null, {
      credentialIndex: credIndex,
      username: cred?.username,
      totalCredentials: CREDENTIALS.length,
      force: force
    });
    
    switchCredential();
    return authenticate();
  }
}

// 🔹 Limpeza de Cache V8 Sistema
async function limparCacheV8(cpf) {
  try {
    const response = await axios.delete(`https://bff.v8sistema.com/fgts/balance/cache/${cpf}`, {
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
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

  while (tentativasCredenciais < maxCredenciais) {
    try {
      await authenticate();
      const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      const apiLog = `📦 [Linha ${linha}] Retorno completo da API: ${JSON.stringify(res.data)}`;
      console.log(`${LOG_PREFIX()} ${apiLog}`);
      
      // NÃO emitir log da API para o painel - apenas no console
      
      return { data: res.data.data?.[0] ? [res.data.data[0]] : [], pages: res.data.pages || { total: 0 } };
    } catch (err) {
      const erroCompleto = { message: err.message, status: err.response?.status, data: err.response?.data };
      const erroLog = `❌ Erro consulta CPF ${cpf}: ${JSON.stringify(erroCompleto)}`;
      console.log(`${LOG_PREFIX()} ${erroLog}`);
      
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
        
        tentativasCredenciais++;
        const credLog = `⚠️ [Linha ${linha}] 429 detectado, tentando próxima credencial (${tentativasCredenciais}/${maxCredenciais})`;
        console.log(`${LOG_PREFIX()} ${credLog}`);
        
        // Emitir log com nome da credencial para o painel
        if (ioInstance) {
          const user = CREDENTIALS[credIndex]?.username || "sem usuário";
          ioInstance.emit("log", `⚠️ Rate limit detectado, trocando para: ${user}`);
        }
        
        switchCredential();
        await authenticate(true);
        await delay(delayMs * 2);
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
        { headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 20000 }
      );
      return true;
    } catch (err) {
      const erroCompleto = { message: err.message, status: err.response?.status, data: err.response?.data };
      console.log(`${LOG_PREFIX()} ❌ Erro enviar para fila CPF ${cpf} | Provider: ${provider}:`, erroCompleto);

      if (erroCompleto.status === 429 || (err.response?.data?.message || "").includes("Limite de requisições")) {
        retryCount++;
        switchCredential();
        await authenticate(true);
        await delay(delayMs * 3);
        continue;
      } else if (erroCompleto.status === 500 || err.message.includes("timeout")) {
        retryCount++;
        await delay(delayMs * 2);
        continue;
      } else if (erroCompleto.status === 400) {
        // Erro 400 - Verificar se é "Tente novamente" e se é BMS
        if (erroCompleto.data?.error === "Tente novamente" && provider === "bms") {
          retryCount++;
          console.log(`${LOG_PREFIX()} 🔄 BMS "Tente novamente" - Tentativa ${retryCount}/4 para CPF ${cpf}`);
          
          if (retryCount < 4) {
            // Aguardar mais tempo antes de tentar novamente
            await delay(delayMs * 2);
            continue;
          } else {
            console.log(`${LOG_PREFIX()} ⚠️ BMS "Tente novamente" - 4 tentativas esgotadas para CPF ${cpf}`);
            return "erro400";
          }
        } else {
          // Outros erros 400 - marcar como erro permanente
          console.log(`${LOG_PREFIX()} ⚠️ CPF ${cpf} com erro 400 - marcando como erro`);
          console.log(`${LOG_PREFIX()} 📋 Detalhes do erro 400:`, erroCompleto);
          return "erro400";
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

  const tabelas = ["cb563029-ba93-4b53-8d53-4ac145087212", "f6d779ed-52bf-42f2-9dbc-3125fe6491ba"];
  for (const simId of tabelas) {
    const simIndex = CREDENTIALS[2] ? 2 : 0;
    switchCredential(simIndex);
    await authenticate(true);

    const payload = { simulationFeesId: simId, balanceId, targetAmount: 0, documentNumber: cpf, desiredInstallments, provider };
    try {
      const res = await axios.post("https://bff.v8sistema.com/fgts/simulations", payload, {
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
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
  const csvContent = fs.readFileSync("LISTA-FGTS.csv", "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });

  const encontrado = registros.find(r =>
    normalizeCPF(r['E-mail [#mail]']) === cpfNorm || normalizePhone(r['Telefone [#phone]']) === phoneNorm
  );

  return encontrado ? { id: encontrado['ID [#id]']?.trim(), stageId: encontrado['ID da Etapa [#stageid]']?.trim() } : null;
}

// 🔹 Atualizar oportunidade
async function atualizarOportunidadeComTabela(opportunityId, tabelaSimulada) {
  try {
    const formsdata = { f0a67ce0: tabelaSimulada, "80b68ec0": "cartos" };
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
      formsdata: { f0a67ce0: tabelaSimulada, "80b68ec0": "cartos" },
      queueId: QUEUE_ID,
      payload: { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, formsdata: { f0a67ce0: tabelaSimulada, "80b68ec0": "cartos" } }
    });
    
    return { success: false, statusDetalhado: 'erro' };
  }
}

// 🔹 Criar oportunidade
async function criarOportunidade(cpf, telefone, valorLiberado) {
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
  const csvContent = fs.readFileSync("LISTA-FGTS.csv", "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: false, delimiter: ";" });
  const linha = registros.find(r => normalizeCPF(r['E-mail [#mail]']) === normalizeCPF(cpf) || normalizePhone(r['Telefone [#phone]']) === normalizePhone(telefone));
  if (linha) {
    linha['ID [#id]'] = novoID;
    const headers = Object.keys(registros[0]).join(";");
    const body = registros.map(r => Object.values(r).join(";")).join("\n");
    fs.writeFileSync("LISTA-FGTS.csv", headers + "\n" + body, "utf-8");
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

// Registrar função de atualização de estado
function registrarAtualizadorEstado(callback) {
  atualizarEstadoPersistente = callback;
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
      registros = cpfsReprocess.map((cpf, i) => ({ CPF: cpf, ID: `reproc_${i}` }));
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
  async function tentarConsultaComRetry(cpf, linha, provider = null, maxTentativas = 4, delayEntreTentativas = 1000) {
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
        switchCredential();
        await authenticate(true);
        await delay(delayEntreTentativas * 3);
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

    return resultado;
  }

  // --- Loop principal ---
  for (let [index, registro] of registros.entries()) {
    while (paused) await delay(500);

    // Ajustar delay dinamicamente a cada 10 CPFs
    if ((index + 1) % 10 === 0) {
      ajustarDelayDinamico();
    }

    const linha = index + 2;
    const cpf = normalizeCPF(registro.CPF);
    let idOriginal = (registro.ID || "").trim();
    const telefone = normalizePhone(registro.TELEFONE);

    if (!cpf) {
      contadorDescartados++;
      emitirResultado({ cpf, id: idOriginal, status: "descartado", provider: "N/A", valorLiberado: 0, linha }, callback);
      processed++;
      atualizarProgresso();
      continue;
    }

    // Reprocessar pendentes a cada 10 CPFs
    if ((index + 1) % 10 === 0 && pendentesParaReprocessar.length > 0) {
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
            const resultadoAtualizacao = await atualizarOportunidadeComTabela(id, simulacao.tabelaSimulada);
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

    await delay(delayMs);

    // --- Consulta na fila primeiro ---
    let resultadoFila = await tentarConsultaComRetry(cpf, linha);
    if (!resultadoFila || !resultadoFila.data || resultadoFila.data.length === 0) {
      // Tentar enviar para fila com diferentes providers
      const filaProviders = ["bms", "cartos", "qi"];
      for (const provider of filaProviders) {
        const enviado = await enviarParaFila(cpf, provider);
        if (enviado === true) {
          resultadoFila = await tentarConsultaComRetry(cpf, linha);
          break; // Se conseguiu enviar, para o loop
        } else if (enviado === "erro400") {
          // CPF com erro 400 - marcar como erro e pular para próximo
          console.log(`${LOG_PREFIX()} ⚠️ CPF ${cpf} com erro 400 - pulando para próximo`);
          console.log(`${LOG_PREFIX()} 📋 CPF ${cpf} será marcado como erro permanente`);
          return "erro400";
        }
      }
    }

    // --- Consulta BMS, Cartos e QI ---
    const providers = ["bms", "cartos", "qi"];
    let resultadosProviders = {};

    for (const prov of providers) {
      const res = await tentarConsultaComRetry(cpf, linha);
      resultadosProviders[prov] = res?.data || [];
    }

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
            const resultadoAtualizacao = await atualizarOportunidadeComTabela(idOriginal, simulacao.tabelaSimulada);
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
        const resultadoAtualizacao = await atualizarOportunidadeComTabela(id, simulacao.tabelaSimulada);
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
    console.log(`${LOG_PREFIX()} 🔄 Processando CPF individual: ${cpf}, Linha: ${linha}`);
    console.log(`${LOG_PREFIX()} 📊 Estado atual: ${pendentes.length} pendentes, ${tentativasCPF.size} tentativas de cache`);
    
    // Resetar tentativas de cache para este CPF
    tentativasCPF.delete(cpf);
    console.log(`${LOG_PREFIX()} 🧹 Cache resetado para CPF: ${cpf}`);
    
    // Consultar resultado
    console.log(`${LOG_PREFIX()} 🔍 Consultando resultado para CPF: ${cpf}`);
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
  obterAgendamentos
};
