import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Configurações
let delayMs = 1000; // delay mutável
const QUEUE_ID = process.env.QUEUE_ID || 25;
const API_CRM_KEY = process.env.LUNAS_API_KEY;
const DEST_STAGE_ID = process.env.DEST_STAGE_ID || 4;

// 🔹 Providers na ordem
const PROVIDERS = ["cartos", "bms", "qi"];

// 🔹 Credenciais dinâmicas via .env
const CREDENTIALS = [];
for (let i = 1; process.env[`FGTS_USER_${i}`]; i++) {
  CREDENTIALS.push({
    username: process.env[`FGTS_USER_${i}`],
    password: process.env[`FGTS_PASS_${i}`],
  });
}

if (!CREDENTIALS.length) {
  console.error("❌ Nenhuma credencial FGTS configurada no .env");
  process.exit(1);
}

let TOKEN = null;
let credIndex = 0;
const LOG_PREFIX = () => `[${new Date().toISOString()}]`;
let ultimoProvider = null;

// 🔹 Controle de pausa/retomada
let paused = false;
function setPause(value) {
  paused = !!value;
  console.log(`${LOG_PREFIX()} ⏸️ Pausa setada para ${paused}`);
}

// 🔹 Função para atualizar delay
function setDelay(ms) {
  if (ms && !isNaN(ms) && ms > 0) {
    delayMs = ms;
    console.log(`${LOG_PREFIX()} ⚡ Delay atualizado para ${delayMs}ms`);
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 🔹 Anexar IO opcional
let ioInstance = null;
function attachIO(io) {
  ioInstance = io;
}

// 🔹 Normalização
const normalizeCPF = (cpf) => (cpf || "").toString().replace(/\D/g, "").padStart(11, "0");
const normalizePhone = (phone) => (phone || "").toString().replace(/\D/g, "");

// 🔹 Emitir resultado
function emitirResultado(obj, callback = null) {
  if (obj.apiResponse === undefined && obj.error) {
    obj.apiResponse = obj.errorDetails || obj.error;
  }
  console.log("RESULT:" + JSON.stringify(obj, null, 2));
  if (callback) callback(obj);
  if (ioInstance) {
    try { ioInstance.emit("result", obj); } catch {}
  }
}

// 🔹 Alternar credencial
function switchCredential(forcedIndex = null) {
  if (!CREDENTIALS.length) return;
  if (forcedIndex !== null) {
    credIndex = forcedIndex % CREDENTIALS.length;
  } else {
    credIndex = (credIndex + 1) % CREDENTIALS.length;
  }
  TOKEN = null;
  const user = CREDENTIALS[credIndex]?.username || "sem usuário";
  console.log(`${LOG_PREFIX()} 🔄 Alternando para credencial: ${user}`);
}

// 🔹 Autenticação
async function authenticate(force = false) {
  if (TOKEN && !force) return TOKEN;
  if (!CREDENTIALS.length) throw new Error("Nenhuma credencial disponível!");
  const cred = CREDENTIALS[credIndex];

  try {
    console.log(`${LOG_PREFIX()} 🔑 Tentando autenticar: ${cred.username}`);
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
    console.log(`${LOG_PREFIX()} ✅ Autenticado com sucesso - ${cred.username}`);
    return TOKEN;
  } catch (err) {
    console.log(`${LOG_PREFIX()} ❌ Erro ao autenticar ${cred.username}: ${err.message}`);
    switchCredential();
    return authenticate();
  }
}

// 🔹 Consultar resultado FGTS
async function consultarResultado(cpf, linha) {
  try {
    await authenticate();
    const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    console.log(`${LOG_PREFIX()} 📦 [Linha ${linha}] Retorno completo da API:`, JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const erroCompleto = { message: err.message, status: err.response?.status, data: err.response?.data };
    console.log(`${LOG_PREFIX()} ❌ Erro consulta CPF ${cpf}:`, erroCompleto);

    if (erroCompleto.status === 401) {
      await authenticate(true);
      return consultarResultado(cpf, linha);
    } else if (erroCompleto.status === 429 || err.message.includes("Limite de requisições")) {
      await delay(delayMs * 3);
      switchCredential();
      await authenticate(true);
      return { data: [], pending: true, errorDetails: erroCompleto };
    } else {
      return { error: err.message, errorDetails: erroCompleto };
    }
  }
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
      }
      return false;
    }
  }

  return "pending429";
}

// 🔹 Simular saldo
async function simularSaldo(cpf, balanceId, parcelas, provider) {
  if (!parcelas || parcelas.length === 0) return null;
  const desiredInstallments = parcelas.filter(p => p.amount > 0 && p.dueDate).map(p => ({ totalAmount: p.amount, dueDate: p.dueDate }));
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
    } catch {}
  }
  return null;
}

// 🔹 Consultar planilha CSV
function consultarPlanilha(cpf, telefone) {
  const cpfNorm = normalizeCPF(cpf);
  const phoneNorm = normalizePhone(telefone);
  const csvContent = fs.readFileSync("LISTA-FGTS.csv", "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });

  const encontrado = registros.find(r => normalizeCPF(r['E-mail [#mail]']) === cpfNorm || normalizePhone(r['Telefone [#phone]']) === phoneNorm);
  if (encontrado) return { id: encontrado['ID [#id]']?.trim(), stageId: encontrado['ID da Etapa [#stageid]']?.trim() };
  return null;
}

// 🔹 Criar oportunidade
async function criarOportunidade(cpf, telefone, valorLiberado) {
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, fkPipeline: 1, fkStage: 4, responsableid: 0, title: `Oportunidade CPF ${cpf}`, mainphone: telefone || "", mainmail: cpf || "", value: valorLiberado || 0 };
    const res = await axios.post("https://lunasdigital.atenderbem.com/int/createOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    return res.data.id;
  } catch { return null; }
}

// 🔹 Atualizar oportunidade com tabela
async function atualizarOportunidadeComTabela(opportunityId, tabelaSimulada) {
  try {
    const formsdata = { f0a67ce0: tabelaSimulada, "80b68ec0": "cartos" };
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, formsdata };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    return true;
  } catch { return false; }
}

// 🔹 Atualizar CSV com novo ID
function atualizarCSVcomID(cpf, telefone, novoID) {
  const csvContent = fs.readFileSync("LISTA-FGTS.csv", "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: false, delimiter: ";" });
  const linha = registros.find(r => normalizeCPF(r['E-mail [#mail]']) === normalizeCPF(cpf) || normalizePhone(r['Telefone [#phone]']) === normalizePhone(telefone));
  if (linha) { linha['ID [#id]'] = novoID; fs.writeFileSync("LISTA-FGTS.csv", Object.keys(registros[0]).join(";") + "\n" + registros.map(r => Object.values(r).join(";")).join("\n"), "utf-8"); }
}

// 🔹 Disparar fluxo
async function disparaFluxo(opportunityId) {
  if (!opportunityId) return false;
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, destStageId: DEST_STAGE_ID };
    await axios.post("https://lunasdigital.atenderbem.com/int/changeOpportunityStage", payload, { headers: { "Content-Type": "application/json" } });
    return true;
  } catch { return "erroDisparo"; }
}

// 🔹 Atualizar CRM placeholder
async function atualizarCRM(opportunityId, valorLiberado) { return true; }

// 🔹 Processar CPFs
async function processarCPFs(csvPath = null, cpfsReprocess = null, callback = null) {
  let registros = cpfsReprocess && cpfsReprocess.length ? cpfsReprocess.map((cpf, i) => ({ CPF: cpf, ID: `reproc_${i}` })) : csvPath ? parse(fs.readFileSync(csvPath, "utf-8"), { columns: true, skip_empty_lines: true, delimiter: ";" }) : [];
  if (!registros.length) throw new Error("Nenhum CSV fornecido para processar!");

  const total = registros.length;
  let processed = 0;

  for (let [index, registro] of registros.entries()) {
    while (paused) await delay(500);

    const linha = index + 2;
    const cpf = normalizeCPF(registro.CPF);
    let idOriginal = (registro.ID || "").trim();
    const telefone = normalizePhone(registro.TELEFONE);
    if (!cpf) { processed++; continue; }

    const planilha = consultarPlanilha(cpf, telefone);
    if (planilha) idOriginal = planilha.id;

    let resultado = null;
    let providerUsed = null;
    let todasCredenciaisExauridas = false;

    for (const provider of PROVIDERS) {
      providerUsed = provider;
      const filaResult = await enviarParaFila(cpf, providerUsed);
      if (filaResult === "pending429") { todasCredenciaisExauridas = true; break; }
      if (!filaResult) continue;

      await delay(delayMs);
      resultado = await consultarResultado(cpf, linha);
      if (resultado?.error) { emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: resultado.error, provider: providerUsed }, callback); continue; }
      else if (resultado?.data && resultado.data.length > 0) break;
    }

    if (todasCredenciaisExauridas) { emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Limite de requisições excedido", provider: providerUsed || ultimoProvider }, callback); processed++; continue; }
    if (!resultado?.data || resultado.data.length === 0) { emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: "❌ Sem autorização", provider: providerUsed || ultimoProvider }, callback); processed++; continue; }

    const registrosValidos = resultado.data.filter(r => !(r.status === "error" && r.statusInfo?.includes("Trabalhador não possui adesão ao saque aniversário vigente")));
    if (registrosValidos.length === 0) { processed++; continue; }

    const saldo = registrosValidos[0]?.amount || 0;
    const parcelas = registrosValidos[0]?.periods || [];
    const balanceId = registrosValidos[0]?.id || null;

    if (saldo > 0 && balanceId) {
      const simulacao = await simularSaldo(cpf, balanceId, parcelas, providerUsed);
      if (simulacao) {
        if (!idOriginal) { idOriginal = await criarOportunidade(cpf, telefone, simulacao.availableBalance); if (idOriginal) atualizarCSVcomID(cpf, telefone, idOriginal); }
        await atualizarOportunidadeComTabela(idOriginal, simulacao.tabelaSimulada);
        await atualizarCRM(idOriginal, simulacao.availableBalance);
        const fluxo = await disparaFluxo(idOriginal);

        emitirResultado({ cpf, id: idOriginal, status: "success", valorLiberado: simulacao.availableBalance, message: fluxo === true ? "Simulação finalizada" : "Erro disparo (tratado como sucesso)", provider: providerUsed }, callback);
      } else {
        emitirResultado({ cpf, id: idOriginal, status: "pending", valorLiberado: 0, message: "Sem saldo disponível após simulação", provider: providerUsed }, callback);
      }
    } else {
      emitirResultado({ cpf, id: idOriginal, status: "pending", valorLiberado: 0, message: "Saldo zero", provider: providerUsed }, callback);
    }

    processed++;
    if (callback) callback({ status: "progress", processed, total, percentage: Math.round((processed/total)*100) });
    if (ioInstance) ioInstance.emit("progress", { processed, total, percentage: Math.round((processed/total)*100) });

    await delay(delayMs);
  }
}

// 🔹 Exportações
export {
  processarCPFs,
  disparaFluxo,
  authenticate,
  atualizarOportunidadeComTabela,
  criarOportunidade,
  setDelay,
  setPause,
  attachIO
};