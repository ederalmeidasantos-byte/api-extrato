import "dotenv/config";
import { setPause } from "./fgts_csv.js";
import express from "express";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { extrairDeUpload } from "../INSS/extrair_pdf.js";
import PQueue from "p-queue";
import multer from "multer";
import { Server } from "socket.io";
import http from "http";
import { processarCPFs, disparaFluxo, setDelay as setDelayFGTS, attachIO, processarReprocessamentoRapido, limparCacheV8, carregarListasDoCache } from "./fgts_csv.js";
import { getRecentErrors, getErrorStats, cleanOldLogs } from "../error-logger.js";
import { 
  obterEstatisticasCache, 
  limparCacheCompleto, 
  carregarPendentes, 
  carregarTentativasCache,
  resetarTentativasCache 
} from "./cache-persistente.js";
import { calcularTrocoEndpoint } from "../INSS/calculo.js";
import { loadConfig, saveConfig, validateConfig, syncWithEnv, exportToEnv, initializeConfig } from "../config-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastas
const PDF_DIR = path.join(__dirname, "extratos");
const JSON_DIR = path.join(__dirname, "jsonDir");
const UPLOADS_DIR = path.join(__dirname, "uploads");
[PDF_DIR, JSON_DIR, UPLOADS_DIR].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

// TTL cache
const TTL_MS = 14 * 24 * 60 * 60 * 1000;
const cacheValido = (p) => { try { return Date.now() - fs.statSync(p).mtimeMs <= TTL_MS; } catch { return false; } };

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ====== Socket.IO ======
const server = http.createServer(app);
const io = new Server(server);

// Anexar socket ao módulo FGTS
attachIO(io);

// Importar funções de agendamento
import { isHorarioComercial, agendarDisparo, processarAgendamentos, ajustarDelayDinamico } from "./fgts_csv.js";

// Armazenamento em memória dos resultados
let resultadosFGTS = [];

// Variável global de delay (ms) para processarCPFs
let DELAY_MS = 1000;
function setDelay(ms) {
  if (ms && !isNaN(ms) && ms > 0) {
    DELAY_MS = ms;
    setDelayFGTS(DELAY_MS);
    console.log(`[${new Date().toISOString()}] ⚡ Delay atualizado para ${DELAY_MS}ms`);
  }
}

// Variável de controle de pausa
let fgtsPaused = false;

// ===== Normalização de CPF =====
function normalizeCPF(input) {
  if (input == null) return null;
  const asNumber = Number(input);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) input = asNumber.toFixed(0);
  const digits = String(input).replace(/\D/g, "");
  if (digits.length <= 11) return digits.padStart(11, "0");
  return null;
}

// Fila PQueue
const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 2 });

// ===== Função para logs no painel =====
function logPainel(msg) {
  io.emit("log", msg);
  console.log(msg);
}

// Função para emitir resultado de CPF no painel
function emitirResultadoPainel(data) {
  const { linha, cpf, id, status, provider, valorLiberado, icone = '✅' } = data;
  const valorExibir = (typeof valorLiberado === 'number') ? valorLiberado.toFixed(2) : (valorLiberado ? valorLiberado : '-');
  io.emit("log", `[CLIENT] ${icone} Linha: ${linha || '?'} | CPF: ${cpf || '-'} | ID: ${id || '-'} | Status: ${status || '-'} | Valor Liberado: ${valorExibir} | Provider: ${provider || '-'}`);
  io.emit("resultadoCPF", data);
}

// Conexão Socket
io.on("connection", (socket) => {
  console.log("🔗 Cliente conectado para logs FGTS");
  resultadosFGTS.forEach(r => socket.emit("resultadoCPF", r));
  socket.emit("delayUpdate", DELAY_MS);
});

// Health check
app.get("/", (req, res) => res.send("API rodando ✅"));

// ===== Fluxo Lunas / PDF =====
app.post("/extrair", async (req, res) => {
  try {
    const fileId = req.body.fileId || req.query.fileId;
    if (!fileId) return res.status(400).json({ error: "fileId é obrigatório" });

    const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);
    if (fs.existsSync(jsonPath) && cacheValido(jsonPath)) {
      console.log("♻️ Usando cache válido:", jsonPath);
      return res.json(JSON.parse(await fsp.readFile(jsonPath, "utf-8")));
    }

    console.log("🚀 Baixando PDF da Lunas:", fileId);
    const body = { queueId: Number(process.env.LUNAS_QUEUE_ID), apiKey: process.env.LUNAS_API_KEY, fileId: Number(fileId), download: true };
    const resp = await fetch(process.env.LUNAS_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (!resp.ok) throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${await resp.text()}`);

    const pdfPath = path.join(PDF_DIR, `extrato_${fileId}.pdf`);
    const buf = Buffer.from(await resp.arrayBuffer());
    await fsp.writeFile(pdfPath, buf);
    console.log("✅ PDF salvo em", pdfPath);

    const json = await queue.add(() =>
      extrairDeUpload({ fileId, pdfPath, jsonDir: JSON_DIR, ttlMs: TTL_MS })
    );

    res.json(json);
  } catch (err) {
    console.error("❌ Erro em /extrair:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== FGTS Automação ======
const upload = multer({ dest: UPLOADS_DIR });
app.get("/fgts", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Inicia processamento CSV
app.post("/fgts/run", upload.single("csvfile"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Arquivo CSV não enviado!" });

  logPainel(`📂 Planilha FGTS recebida: ${req.file.path}`);
  (async () => {
    try {
      const raw = await fsp.readFile(req.file.path, "utf-8");
      const lines = raw.split("\n").filter(l => l.trim());
      const totalCpfs = lines.length;
      let processados = 0;
      let contadorSuccess = 0;
      let contadorPending = 0;
      let contadorSemAutorizacao = 0;

      io.emit("progress", { done: 0, total: totalCpfs });
      logPainel(`🔹 Iniciando processamento de ${totalCpfs} CPFs...`);

      await processarCPFs(req.file.path, null, async (result) => {
        while(fgtsPaused) await new Promise(r => setTimeout(r, 200));

        if (!result) {
          processados++;
          io.emit("progress", { done: processados, total: totalCpfs });
          return;
        }

        if (result.cpf) { const n = normalizeCPF(result.cpf); if(n) result.cpf = n; }

        switch((result.status||'').toLowerCase()) {
          case 'success': contadorSuccess++; break;
          case 'pending': contadorPending++; break;
          case 'no_auth': contadorSemAutorizacao++; break;
        }

        resultadosFGTS.push(result);
        emitirResultadoPainel(result);

        processados++;
        io.emit("progress", { done: processados, total: totalCpfs, counters: { success: contadorSuccess, pending: contadorPending, semAutorizacao: contadorSemAutorizacao } });
      });

      logPainel("✅ Processamento FGTS finalizado!");
    } catch (err) {
      logPainel(`❌ Erro no processamento FGTS: ${err.message}`);
      console.error("❌ Erro no processamento FGTS:", err);
    } finally {
      try { await fsp.unlink(req.file.path); } catch {}
    }
  })();

  res.json({ message: "🚀 Planilha recebida e automação FGTS iniciada!" });
});

// ===== Reprocessar pendentes =====
app.post("/fgts/reprocessar", async (req, res) => {
  const cpfs = req.body.cpfs || [];
  if (!cpfs.length) return res.status(400).json({ message: "Nenhum CPF fornecido" });

  logPainel(`🔄 Reprocessar pendentes: ${cpfs.join(", ")}`);

  (async () => {
    try {
      let processados = 0, contadorSuccess = 0, contadorPending = 0, contadorSemAutorizacao = 0;
      const totalCpfs = cpfs.length;

      const processarCPF = async (cpf) => {
        while(fgtsPaused) await new Promise(r => setTimeout(r, 200));
        const result = await processarCPFs(null, [cpf]);
        if(result && result[0]){
          const r = result[0];
          switch((r.status||'').toLowerCase()) {
            case 'success': contadorSuccess++; break;
            case 'pending': contadorPending++; break;
            case 'no_auth': contadorSemAutorizacao++; break;
          }
          resultadosFGTS.push(r);
          emitirResultadoPainel(r);
          processados++;
          io.emit("progress", { done: processados, total: totalCpfs, counters: { success: contadorSuccess, pending: contadorPending, semAutorizacao: contadorSemAutorizacao } });
        }
      };

      cpfs.forEach(cpf => queue.add(() => processarCPF(cpf)));
      await queue.onIdle();
      logPainel(`✅ Reprocessamento finalizado para ${cpfs.length} CPFs`);
    } catch(err) {
      logPainel(`❌ Erro no reprocessamento: ${err.message}`);
      console.error("❌ Erro no reprocessamento:", err);
    }
  })();

  res.json({ message: `✅ Reprocesso iniciado para ${cpfs.length} CPFs` });
});

// ===== Mudar fase para não autorizados =====
app.post("/fgts/mudarFaseNaoAutorizados", async (req, res) => {
  const ids = req.body.ids || [];
  if (!ids.length) return res.status(400).json({ message: "Nenhum ID fornecido" });
  logPainel(`📌 Mudar fase no CRM para IDs: ${ids.join(", ")}`);
  (async () => {
    try { 
      for(const id of ids) {
        await disparaFluxo(id);
      }
      logPainel(`✅ Fase alterada para ${ids.length} registros`); 
    }
    catch(err){ 
      logPainel(`❌ Erro ao mudar fase: ${err.message}`); 
      console.error(err); 
    }
  })();
  res.json({ message: `✅ Fase alterada para ${ids.length} registros` });
});

// ===== Atualizar delay dinamicamente =====
app.post("/fgts/delay", (req,res) => {
  const novoDelay = parseInt(req.body?.delay,10);
  if(isNaN(novoDelay)||novoDelay<0) return res.status(400).json({ message: "Delay inválido" });
  setDelay(novoDelay);
  io.emit("delayUpdate", DELAY_MS);
  res.json({ message: `Delay atualizado para ${DELAY_MS}ms` });
});

// ===== Processar reprocessamento rápido =====
app.post("/fgts/reprocessar-rapido", async (req, res) => {
  try {
    console.log('⚡ Iniciando reprocessamento rápido...');
    
    await processarReprocessamentoRapido();
    
    res.json({ success: true, message: 'Reprocessamento rápido executado' });
  } catch (error) {
    console.error('❌ Erro no reprocessamento rápido:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Limpar cache de um CPF específico =====
app.post("/fgts/limpar-cache/:cpf", async (req, res) => {
  try {
    const { cpf } = req.params;
    console.log(`🧹 Limpando cache para CPF: ${cpf}`);
    
    const resultado = await limparCacheV8(cpf);
    
    if (resultado) {
      res.json({ success: true, message: `Cache limpo para CPF: ${cpf}` });
    } else {
      res.status(500).json({ success: false, message: 'Erro ao limpar cache' });
    }
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Carregar listas do cache =====
app.get("/fgts/listas", (req, res) => {
  try {
    const listas = carregarListasDoCache();
    res.json({ success: true, listas });
  } catch (error) {
    console.error('❌ Erro ao carregar listas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Visualizar logs de erro =====
app.get("/fgts/logs/erros", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const errors = getRecentErrors(limit);
    
    res.json({
      success: true,
      total: errors.length,
      errors: errors
    });
  } catch (error) {
    console.error('❌ Erro ao obter logs de erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Estatísticas de erros =====
app.get("/fgts/logs/estatisticas", (req, res) => {
  try {
    const stats = getErrorStats();
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Limpar logs antigos =====
app.post("/fgts/logs/limpar", (req, res) => {
  try {
    cleanOldLogs();
    
    res.json({
      success: true,
      message: 'Logs antigos removidos com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao limpar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Estatísticas do Cache Persistente =====
app.get("/fgts/cache/estatisticas", (req, res) => {
  try {
    const stats = obterEstatisticasCache();
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas do cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Limpar Cache Persistente =====
app.post("/fgts/cache/limpar", (req, res) => {
  try {
    const resultado = limparCacheCompleto();
    
    if (resultado) {
      res.json({
        success: true,
        message: 'Cache persistente limpo com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao limpar cache persistente'
      });
    }
  } catch (error) {
    console.error('❌ Erro ao limpar cache persistente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Resetar Tentativas de Cache =====
app.post("/fgts/cache/resetar-tentativas", (req, res) => {
  try {
    const { cpf } = req.body;
    
    if (cpf) {
      resetarTentativasCache(cpf);
      res.json({
        success: true,
        message: `Tentativas de cache resetadas para CPF: ${cpf}`
      });
    } else {
      resetarTentativasCache();
      res.json({
        success: true,
        message: 'Todas as tentativas de cache resetadas'
      });
    }
  } catch (error) {
    console.error('❌ Erro ao resetar tentativas de cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Listar Pendentes =====
app.get("/fgts/cache/pendentes", (req, res) => {
  try {
    const pendentes = carregarPendentes();
    
    res.json({
      success: true,
      pendentes: pendentes,
      total: pendentes.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar pendentes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pausar
app.post("/fgts/pause", (req,res)=>{
  fgtsPaused = true;
  setPause(true);
  logPainel("⏸️ Processamento pausado pelo usuário");
  res.json({message:"Pausado"});
});

// Retomar
app.post("/fgts/resume", (req,res)=>{
  fgtsPaused = false;
  setPause(false);
  logPainel("▶️ Processamento retomado pelo usuário");
  res.json({message:"Retomado"});
});

// ===== Cálculo =====
app.get("/calcular/:fileId", calcularTrocoEndpoint(JSON_DIR));

// ===== Agendamentos =====
app.get("/fgts/agendamentos", (req, res) => {
  // Esta função seria implementada para retornar agendamentos pendentes
  res.json({ message: "Endpoint de agendamentos - em desenvolvimento" });
});

// ===== Status do sistema =====
app.get("/fgts/status", (req, res) => {
  const agora = new Date();
  const hora = agora.getHours();
  const isComercial = hora >= 8 && hora < 22;
  
  res.json({
    horarioComercial: isComercial,
    horaAtual: agora.toLocaleString('pt-BR'),
    delayAtual: DELAY_MS,
    status: "online"
  });
});

// ===== Configurações =====
// Carregar configurações
app.get("/fgts/config", (req, res) => {
  try {
    const config = loadConfig();
    
    // Adicionar status das credenciais (sem expor valores)
    const configWithStatus = {
      ...config,
      fgtsUser1: process.env.FGTS_USER_1 ? "••••••••••••" : "",
      fgtsUser2: process.env.FGTS_USER_2 ? "••••••••••••" : "",
      v8ClientId: process.env.V8_CLIENT_ID ? "••••••••••••" : "",
      v8Username: process.env.V8_USERNAME ? "••••••••••••" : "",
      lunasApiKey: process.env.LUNAS_API_KEY ? "••••••••••••••••" : "",
      lastUpdated: config.lastUpdated
    };
    
    res.json(configWithStatus);
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    res.status(500).json({ error: "Erro ao carregar configurações" });
  }
});

// Salvar configurações
app.post("/fgts/config", (req, res) => {
  try {
    const config = req.body;
    
    // Validar configurações
    const validation = validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.errors.join(', ') 
      });
    }
    
    // Salvar configurações no arquivo
    const saved = saveConfig(config);
    if (!saved) {
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao salvar configurações no arquivo" 
      });
    }
    
    // Sincronizar com environment variables
    syncWithEnv();
    
    // Atualizar delay se mudou
    if (config.delayBase !== DELAY_MS) {
      setDelay(config.delayBase);
    }
    
    // Exportar para arquivo .env (para facilitar deploy no Render)
    exportToEnv();
    
    logPainel(`⚙️ Configurações salvas: Horário ${config.horarioInicio}-${config.horarioFim}, Delay ${config.delayBase}ms`);
    
    res.json({ 
      success: true, 
      message: "Configurações salvas com sucesso",
      lastUpdated: config.lastUpdated
    });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    res.status(500).json({ success: false, message: "Erro ao salvar configurações" });
  }
});

// Testar conexões
app.post("/fgts/test/:api", async (req, res) => {
  const api = req.params.api;
  
  try {
    switch (api) {
      case 'Fgts':
        // Testar credenciais FGTS
        const fgtsUser = process.env.FGTS_USER_1;
        if (!fgtsUser) {
          return res.json({ success: false, message: "Credenciais FGTS não configuradas" });
        }
        res.json({ success: true, message: "Credenciais FGTS configuradas" });
        break;
        
      case 'V8':
        // Testar credenciais V8
        const v8ClientId = process.env.V8_CLIENT_ID;
        if (!v8ClientId) {
          return res.json({ success: false, message: "Credenciais V8 não configuradas" });
        }
        res.json({ success: true, message: "Credenciais V8 configuradas" });
        break;
        
      case 'Lunas':
        // Testar credenciais Lunas
        const lunasKey = process.env.LUNAS_API_KEY;
        if (!lunasKey) {
          return res.json({ success: false, message: "Credenciais Lunas não configuradas" });
        }
        res.json({ success: true, message: "Credenciais Lunas configuradas" });
        break;
        
      default:
        res.status(400).json({ success: false, message: "API não reconhecida" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao testar conexão" });
  }
});

// Backup e Restore de configurações
app.post("/fgts/config/backup", (req, res) => {
  try {
    const config = loadConfig();
    const backupData = {
      ...config,
      backupDate: new Date().toISOString(),
      version: "1.0"
    };
    
    res.json({ 
      success: true, 
      message: "Backup criado com sucesso",
      data: backupData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao criar backup" });
  }
});

app.post("/fgts/config/restore", (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ success: false, message: "Configuração não fornecida" });
    }
    
    const saved = saveConfig(config);
    if (saved) {
      syncWithEnv();
      logPainel("🔄 Configurações restauradas do backup");
      res.json({ success: true, message: "Configurações restauradas com sucesso" });
    } else {
      res.status(500).json({ success: false, message: "Erro ao restaurar configurações" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao restaurar configurações" });
  }
});

// Exportar configurações para Render
app.get("/fgts/config/export", (req, res) => {
  try {
    const exported = exportToEnv();
    if (exported) {
      res.json({ 
        success: true, 
        message: "Configurações exportadas para config-export.env",
        file: "config-export.env"
      });
    } else {
      res.status(500).json({ success: false, message: "Erro ao exportar configurações" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao exportar configurações" });
  }
});

// ===== TESTE SIMPLES =====
app.get('/teste-simples', (req, res) => {
  res.json({ success: true, message: 'Servidor funcionando!' });
});

// ===== TESTE WHATSAPP COM BOTÕES =====
app.post('/teste-whatsapp-botoes', async (req, res) => {
  try {
    console.log(`📱 [TESTE] Recebida requisição:`, req.body);
    
    const { numero, tipo } = req.body;
    const numeroTeste = numero || '5511959088554';
    const tipoTeste = tipo || 'proposta';
    
    console.log(`📱 [TESTE] Enviando mensagem com botões para: ${numeroTeste}`);
    
    // Configuração da API Kentro
    const kentroConfig = {
      queueId: 25,
      apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
      baseUrl: 'https://lunasdigital.atenderbem.com'
    };
    
    let mensagem, botoes;
    
    // Definir mensagem e botões baseado no tipo
    switch(tipoTeste) {
      case 'proposta':
        mensagem = `🎉 *TESTE - PROPOSTA DE PORTABILIDADE*

João, analisei seu perfil e tenho uma oportunidade incrível!

✅ *Troco: R$ 3.500,00*
✅ *Parcela: R$ 348,00* (redução de R$ 76,20)
✅ *Margem: Regularizada*
✅ *Processo: 100% online*

O que gostaria de fazer?`;
        
        botoes = [
          { id: 'aceitar_proposta', titulo: '✅ Aceitar' },
          { id: 'ver_detalhes', titulo: '📋 Ver Detalhes' },
          { id: 'simular_melhor', titulo: '🔄 Simular Melhor' }
        ];
        break;
        
      case 'simulacao':
        mensagem = `🚀 *TESTE - SIMULAÇÃO MELHOR*

Consegui uma condição muito melhor!

📊 *COMPARAÇÃO:*
• Taxa anterior: 1,85%
• Taxa nova: 1,65%
• Troco anterior: R$ 3.500
• Troco novo: R$ 5.000

Agora sim vale muito mais a pena!`;
        
        botoes = [
          { id: 'aceitar_nova', titulo: '✅ Aceitar Nova' },
          { id: 'comparar', titulo: '📊 Comparar' },
          { id: 'ainda_melhor', titulo: '💎 Ainda Melhor' }
        ];
        break;
        
      case 'inicial':
        mensagem = `👋 *TESTE - ASSISTENTE VIRTUAL*

Olá! Sou o assistente virtual da Lunas Digital.

Como posso ajudar você hoje?`;
        
        botoes = [
          { id: 'portabilidade', titulo: '🏦 Portabilidade' },
          { id: 'fgts', titulo: '💰 FGTS' },
          { id: 'duvidas', titulo: '❓ Dúvidas' }
        ];
        break;
        
      default:
        mensagem = `🧪 *TESTE - MENSAGEM COM BOTÕES*

Esta é uma mensagem de teste para verificar se os botões estão funcionando.

Escolha uma opção:`;
        
        botoes = [
          { id: 'teste_1', titulo: '🔴 Opção 1' },
          { id: 'teste_2', titulo: '🟡 Opção 2' },
          { id: 'teste_3', titulo: '🟢 Opção 3' }
        ];
    }
    
    // Primeiro, verificar se já existe um chat ativo
    console.log(`🔍 [TESTE] Verificando chat existente para: ${numeroTeste}`);
    const getChatsResponse = await fetch(`${kentroConfig.baseUrl}/int/getChats?queueId=${kentroConfig.queueId}&apiKey=${kentroConfig.apiKey}&number=${numeroTeste}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    let chatId = null;
    
    if (getChatsResponse.ok) {
      const chatsResult = await getChatsResponse.json();
      console.log(`📱 [TESTE] Chats existentes:`, chatsResult);
      
      // Procurar por chat ativo
      if (chatsResult.chats && chatsResult.chats.length > 0) {
        const activeChat = chatsResult.chats.find(chat => 
          chat.status === 'active' || chat.status === 'open' || chat.status === 'waiting'
        );
        
        if (activeChat) {
          chatId = activeChat.id;
          console.log(`✅ [TESTE] Chat ativo encontrado com ID: ${chatId}`);
        }
      }
    }
    
    // Se não encontrou chat ativo, abrir um novo
    if (!chatId) {
      console.log(`🔗 [TESTE] Abrindo novo chat para: ${numeroTeste}`);
      const openChatResponse = await fetch(`${kentroConfig.baseUrl}/int/openNewChat?queueId=${kentroConfig.queueId}&apiKey=${kentroConfig.apiKey}&number=${numeroTeste}&country=BR`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const chatResult = await openChatResponse.json();
      console.log(`📱 [TESTE] Resultado abertura chat:`, chatResult);
      
      if (!openChatResponse.ok || !chatResult.chatId) {
        throw new Error(`Erro ao abrir chat: ${chatResult.message || 'Chat não foi criado'}`);
      }
      
      chatId = chatResult.chatId;
      console.log(`✅ [TESTE] Novo chat aberto com ID: ${chatId}`);
    }
    
    // Preparar payload para envio de mensagem
    const payload = {
      queueId: kentroConfig.queueId,
      apiKey: kentroConfig.apiKey,
      chatId: chatId,
      message: mensagem,
      type: "text"
    };
    
    console.log(`📤 [TESTE] Payload preparado:`, JSON.stringify(payload, null, 2));
    
    // Enviar mensagem via API Kentro
    const response = await fetch(`${kentroConfig.baseUrl}/int/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      console.log(`✅ [TESTE] Mensagem enviada com sucesso!`);
      res.json({
        success: true,
        message: 'Mensagem com botões enviada com sucesso!',
        numero: numeroTeste,
        tipo: tipoTeste,
        resultado: resultado
      });
    } else {
      console.error(`❌ [TESTE] Erro ao enviar mensagem:`, resultado);
      res.status(500).json({
        success: false,
        error: 'Erro ao enviar mensagem',
        detalhes: resultado
      });
    }
    
  } catch (error) {
    console.error('❌ [TESTE] Erro no teste:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== Inicializar Configurações =====
initializeConfig();

// ===== Servidor =====
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
