import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Configurações
const DELAY_MS = 1000;
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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 🔹 Normalização de CPF e telefone
const normalizeCPF = (cpf) => (cpf || "").toString().replace(/\D/g, "").padStart(11, "0");
const normalizePhone = (phone) => (phone || "").toString().replace(/\D/g, "");

// 🔹 Emitir resultado para front e logs
function emitirResultado(obj, callback = null) {
  if (obj.apiResponse === undefined && obj.error) {
    obj.apiResponse = obj.errorDetails || obj.error;
  }
  console.log("RESULT:" + JSON.stringify(obj, null, 2));
  if (callback) callback(obj);
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

// 🔹 Autenticar
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
    const user = cred?.username || "sem usuário";
    console.log(`${LOG_PREFIX()} ❌ Erro ao autenticar ${user}: ${err.message}`);
    switchCredential();
    return authenticate();
  }
}

// 🔹 Consultar resultado (erro completo + retry)
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
      await delay(DELAY_MS * 3);
      switchCredential();
      await authenticate(true);
      return { data: [], pending: true, errorDetails: erroCompleto };
    } else {
      return { error: err.message, errorDetails: erroCompleto };
    }
  }
}

// 🔹 Enviar para fila com provider
async function enviarParaFila(cpf, provider) {
  ultimoProvider = provider;
  let retry429Count = 0;

  while (retry429Count < CREDENTIALS.length) {
    await authenticate();
    try {
      await axios.post(
        "https://bff.v8sistema.com/fgts/balance",
        { documentNumber: cpf, provider },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      return true;
    } catch (err) {
      const erroCompleto = { message: err.message, status: err.response?.status, data: err.response?.data };
      if (erroCompleto.status === 429 || (err.response?.data?.message || "").includes("Limite de requisições")) {
        retry429Count++;
        switchCredential();
        await authenticate(true);
        await delay(DELAY_MS * 3);
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
  const desiredInstallments = parcelas.filter(p => p.amount > 0 && p.dueDate)
                                      .map(p => ({ totalAmount: p.amount, dueDate: p.dueDate }));
  if (!desiredInstallments.length) return null;

  const tabelas = ["cb563029-ba93-4b53-8d53-4ac145087212","f6d779ed-52bf-42f2-9dbc-3125fe6491ba"];

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
      if (available > 0) return { ...res.data, tabelaSimulada: simId===tabelas[0]?"NORMAL":"ACELERA" };
    } catch { continue; }
  }
  return null;
}

// 🔹 Consultar planilha
function consultarPlanilha(cpf, telefone) {
  const cpfNorm = normalizeCPF(cpf);
  const phoneNorm = normalizePhone(telefone);
  const csvContent = fs.readFileSync("LISTA-FGTS.csv", "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });
  const encontrado = registros.find(r => normalizeCPF(r['E-mail [#mail]'])===cpfNorm || normalizePhone(r['Telefone [#phone]'])===phoneNorm);
  if (encontrado) return { id: encontrado['ID [#id]']?.trim(), stageId: encontrado['ID da Etapa [#stageid]']?.trim() };
  return null;
}

// 🔹 Atualizar oportunidade com tabela simulada
async function atualizarOportunidadeComTabela(opportunityId, tabelaSimulada) {
  try {
    const formsdata = { f0a67ce0: tabelaSimulada, "80b68ec0": "cartos" };
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, formsdata };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    return true;
  } catch { return false; }
}

// 🔹 Criar oportunidade
async function criarOportunidade(cpf, telefone, valorLiberado) {
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, documentNumber: cpf, telefone, valorLiberado };
    const res = await axios.post("https://lunasdigital.atenderbem.com/int/createOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    return res.data.id;
  } catch { return null; }
}

// 🔹 Dispara fluxo CRM
async function disparaFluxo(opportunityId) {
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, destStageId: DEST_STAGE_ID };
    await axios.post("https://lunasdigital.atenderbem.com/int/changeOpportunityStage", payload, { headers: { "Content-Type": "application/json" } });
    return true;
  } catch { return false; }
}

// 🔹 Processar CPFs
async function processarCPFs(csvPath=null, cpfsReprocess=null, callback=null) {
  let registros = [];
  if (cpfsReprocess?.length) registros = cpfsReprocess.map((cpf,i)=>({CPF:cpf, ID:`reproc_${i}`}));
  else if (csvPath) registros = parse(fs.readFileSync(csvPath,"utf-8"), { columns:true, skip_empty_lines:true, delimiter:";" });
  else throw new Error("Nenhum CSV fornecido!");

  for (let [index, registro] of registros.entries()) {
    const linha = index+2;
    const cpf = normalizeCPF(registro.CPF);
    let idOriginal = (registro.ID||"").trim();
    const telefone = normalizePhone(registro.TELEFONE);
    if (!cpf) continue;

    const planilha = consultarPlanilha(cpf, telefone);
    if (planilha) idOriginal = planilha.id;

    let resultado = null;
    let providerUsed = null;
    let todasCredenciaisExauridas = false;

    for (const provider of PROVIDERS) {
      providerUsed = provider;
      const filaResult = await enviarParaFila(cpf, providerUsed);
      if (filaResult==="pending429") { todasCredenciaisExauridas=true; break; }
      if (!filaResult) continue;

      await delay(DELAY_MS);
      resultado = await consultarResultado(cpf, linha);

      if (resultado?.error) {
        emitirResultado({ cpf, id:idOriginal, status:"no_auth", message:resultado.error, provider:providerUsed }, callback);
        continue;
      } else if (resultado?.data && resultado.data.length>0) break;
    }

    if (todasCredenciaisExauridas) {
      emitirResultado({ cpf, id:idOriginal, status:"pending", message:"Limite de requisições excedido em todos os logins", provider:providerUsed||ultimoProvider }, callback);
      continue;
    }

    if (!resultado?.data || resultado.data.length===0) {
      emitirResultado({ cpf, id:idOriginal, status:"no_auth", message:"❌ Sem autorização em nenhum provider", provider:providerUsed||ultimoProvider }, callback);
      continue;
    }

    // 🔹 Simulação e atualização CRM
    const saldo = resultado.data[0];
    const sim = await simularSaldo(cpf, saldo.balanceId, saldo.installments, providerUsed);
    if (sim) await atualizarOportunidadeComTabela(idOriginal, sim.tabelaSimulada);
    await disparaFluxo(idOriginal);

    emitirResultado({ cpf, id:idOriginal, status:"success", provider:providerUsed, simulation: sim||null }, callback);
  }
}

export { processarCPFs, disparaFluxo, authenticate, atualizarOportunidadeComTabela, criarOportunidade };
