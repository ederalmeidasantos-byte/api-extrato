import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Configurações
let delayMs = 1000;
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
  process.exit(1);
}

let TOKEN = null;
let credIndex = 0;
const LOG_PREFIX = () => `[${new Date().toISOString()}]`;
let ultimoProvider = null;

// 🔹 Delay e pausa
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let paused = false;

function setDelay(ms) {
  if (ms && !isNaN(ms) && ms > 0) {
    delayMs = ms;
    console.log(`${LOG_PREFIX()} ⚡ Delay atualizado para ${delayMs}ms`);
  }
}

function setPause(value) {
  paused = !!value;
  console.log(`${LOG_PREFIX()} ⏸️ Pausa setada para ${paused}`);
}

// 🔹 IO opcional
let ioInstance = null;
function attachIO(io) {
  ioInstance = io;
}

// 🔹 Normalização
const normalizeCPF = (cpf) => (cpf || "").toString().replace(/\D/g, "").padStart(11, "0");
const normalizePhone = (phone) => (phone || "").toString().replace(/\D/g, "");

// 🔹 Emitir resultado
function emitirResultado(obj, callback = null) {
  if (!obj.apiResponse && obj.resultadoCompleto) {
    const firstItem = obj.resultadoCompleto.data?.[0] ? [obj.resultadoCompleto.data[0]] : [];
    const totalConsultas = obj.resultadoCompleto.pages?.total || firstItem.length;
    obj.apiResponse = { data: firstItem, totalConsultas };
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

// 🔹 Consultar resultado (apenas a primeira consulta)
async function consultarResultado(cpf, linha) {
  try {
    await authenticate();
    const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    console.log(`${LOG_PREFIX()} 📦 [Linha ${linha}] Retorno completo da API:`, JSON.stringify(res.data));
    return {
      data: res.data.data?.[0] ? [res.data.data[0]] : [],
      pages: res.data.pages || { total: 0 }
    };
  } catch (err) {
    const erroCompleto = {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    };
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
      const erroCompleto = {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      };
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
      }
      return false;
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

  if (desiredInstallments.length === 0) return null;

  const tabelas = [
    "cb563029-ba93-4b53-8d53-4ac145087212",
    "f6d779ed-52bf-42f2-9dbc-3125fe6491ba",
  ];

  for (const simId of tabelas) {
    const simIndex = CREDENTIALS[2] ? 2 : 0;
    switchCredential(simIndex);
    await authenticate(true);

    const payload = {
      simulationFeesId: simId,
      balanceId,
      targetAmount: 0,
      documentNumber: cpf,
      desiredInstallments,
      provider,
    };

    try {
      const res = await axios.post("https://bff.v8sistema.com/fgts/simulations", payload, {
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      });
      const available = parseFloat(res.data.availableBalance || 0);
      if (available > 0) return { ...res.data, tabelaSimulada: simId === tabelas[0] ? "NORMAL" : "ACELERA" };
    } catch (err) {
      const erroCompleto = {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      };
      console.error(`${LOG_PREFIX()} ❌ Erro na simulação com tabela ${simId}:`, erroCompleto);
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
    normalizeCPF(r['E-mail [#mail]']) === cpfNorm ||
    normalizePhone(r['Telefone [#phone]']) === phoneNorm
  );

  if (encontrado) {
    return { id: encontrado['ID [#id]']?.trim(), stageId: encontrado['ID da Etapa [#stageid]']?.trim() };
  }
  return null;
}

// 🔹 Atualizar oportunidade
async function atualizarOportunidadeComTabela(opportunityId, tabelaSimulada) {
  try {
    const formsdata = { f0a67ce0: tabelaSimulada, "80b68ec0": "cartos" };
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, formsdata };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    return true;
  } catch (err) {
    return false;
  }
}

// 🔹 Criar oportunidade
async function criarOportunidade(cpf, telefone, valorLiberado) {
  try {
    const payload = {
      queueId: QUEUE_ID,
      apiKey: API_CRM_KEY,
      fkPipeline: 1,
      fkStage: 4,
      responsableid: 0,
      title: `Oportunidade CPF ${cpf}`,
      mainphone: telefone || "",
      mainmail: cpf || "",
      value: valorLiberado || 0
    };
const res = await axios.post(
  "https://lunasdigital.atenderbem.com/int/createOpportunity",
  payload,
  { headers: { "Content-Type": "application/json" } }
);    return res.data.id;
  } catch {
    return null;
  }
}

// 🔹 Atualizar CSV com ID
function atualizarCSVcomID(cpf, telefone, novoID) {
  const csvContent = fs.readFileSync("LISTA-FGTS.csv", "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: false, delimiter: ";" });
  const linha = registros.find(r =>
    normalizeCPF(r['E-mail [#mail]']) === normalizeCPF(cpf) ||
    normalizePhone(r['Telefone [#phone]']) === normalizePhone(telefone)
  );
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
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, destStageId: DEST_STAGE_ID };
    await axios.post("https://lunasdigital.atenderbem.com/int/changeOpportunityStage", payload, { headers: { "Content-Type": "application/json" } });
    return true;
  } catch {
    return "erroDisparo";
  }
}

// 🔹 Processar CPFs (ajuste pausa completa)
async function processarCPFs(csvPath = null, cpfsReprocess = null, callback = null) {
  let registros = [];

  if (cpfsReprocess && cpfsReprocess.length) {
    registros = cpfsReprocess.map((cpf, i) => ({ CPF: cpf, ID: `reproc_${i}` }));
  } else if (csvPath) {
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });
  } else throw new Error("Nenhum CSV fornecido para processar!");

  const total = registros.length;
  let processed = 0;

  for (let [index, registro] of registros.entries()) {

    // ✅ Pausa principal antes de qualquer operação
    while (paused) await delay(500);

    const linha = index + 2;
    const cpf = normalizeCPF(registro.CPF);
    let idOriginal = (registro.ID || "").trim();
    const telefone = normalizePhone(registro.TELEFONE);

    if (!cpf) {
      processed++;
      if (ioInstance) ioInstance.emit("progress", Math.floor((processed / total) * 100));
      continue;
    }

    const planilha = consultarPlanilha(cpf, telefone);
    if (planilha) idOriginal = planilha.id;

    let resultado = null;
    let providerUsed = null;
    let todasCredenciaisExauridas = false;

    for (const provider of PROVIDERS) {
      // ✅ Pausa dentro do loop de providers
      while (paused) await delay(500);

      providerUsed = provider;
      const filaResult = await enviarParaFila(cpf, providerUsed);

      if (filaResult === "pending429") { todasCredenciaisExauridas = true; break; }
      if (!filaResult) continue;

      // ✅ Pausa antes de consultar resultado
      while (paused) await delay(500);
      await delay(delayMs);

      resultado = await consultarResultado(cpf, linha);

      if (resultado?.error) continue;
      if (resultado?.data && resultado.data.length > 0) break;
    }

    let pendenciaMessage = "Pendência não informada";
    if (resultado?.data?.[0]?.statusInfo === null) pendenciaMessage = "Aguardando retorno";
    else if (todasCredenciaisExauridas) pendenciaMessage = "Tempo de requisição excedido";
    else if (resultado?.data?.[0]?.statusInfo) pendenciaMessage = resultado.data[0].statusInfo;

    const registrosValidos = resultado?.data?.filter(r => !(r.status === "error" && r.statusInfo?.includes("Trabalhador não possui adesão ao saque aniversário vigente"))) || [];
    const saldo = registrosValidos[0]?.amount || 0;
    const parcelas = registrosValidos[0]?.periods || [];
    const balanceId = registrosValidos[0]?.id || null;

    if (saldo > 0 && balanceId) {
      // ✅ Pausa antes da simulação
      while (paused) await delay(500);
      const simulacao = await simularSaldo(cpf, balanceId, parcelas, providerUsed);

      if (simulacao) {
        if (!idOriginal) {
          // ✅ Pausa antes de criar oportunidade
          while (paused) await delay(500);
          idOriginal = await criarOportunidade(cpf, telefone, simulacao.availableBalance);
          if (idOriginal) atualizarCSVcomID(cpf, telefone, idOriginal);
        }

        // ✅ Pausa antes de atualizar tabela e disparar fluxo
        while (paused) await delay(500);
        await atualizarOportunidadeComTabela(idOriginal, simulacao.tabelaSimulada);
        const fluxo = await disparaFluxo(idOriginal);

        emitirResultado({
          cpf,
          id: idOriginal,
          status: "success",
          valorLiberado: simulacao.availableBalance,
          message: fluxo === true ? "Simulação finalizada" : "Erro disparo (tratado como sucesso)",
          provider: providerUsed,
          resultadoCompleto: resultado
        }, callback);

      } else {
        console.log(`${LOG_PREFIX()} ⚠️ CPF ${cpf} não passou na simulação, descartando.`);
      }

    } else {
      console.log(`${LOG_PREFIX()} ⚠️ CPF ${cpf} sem saldo, descartando.`);
    }

    processed++;
    if (ioInstance) ioInstance.emit("progress", Math.floor((processed / total) * 100));

    // ✅ Pausa final antes de próxima iteração
    while (paused) await delay(500);
    await delay(delayMs);
  }
}

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