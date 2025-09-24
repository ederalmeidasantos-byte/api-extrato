import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Configurações
const PROVIDER = process.env.PROVIDER || "cartos";
const DELAY_MS = 1000;
const QUEUE_ID = process.env.QUEUE_ID || 25;
const API_CRM_KEY = process.env.LUNAS_API_KEY;
const DEST_STAGE_ID = process.env.DEST_STAGE_ID || 4;

// 🔹 Credenciais dinâmicas via .env
const CREDENTIALS = [];
for (let i = 1; process.env[`FGTS_USER_${i}`]; i++) {
  CREDENTIALS.push({
    username: process.env[`FGTS_USER_${i}`],
    password: process.env[`FGTS_PASS_${i}`],
  });
}
if (!CREDENTIALS.length) throw new Error("❌ Nenhuma credencial FGTS configurada no .env");

let TOKEN = null;
let credIndex = 0;
const LOG_PREFIX = () => `[${new Date().toISOString()}]`;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 🔹 Alternar credencial
function switchCredential(forcedIndex = null) {
  if (!CREDENTIALS.length) return;
  credIndex = forcedIndex !== null ? forcedIndex % CREDENTIALS.length : (credIndex + 1) % CREDENTIALS.length;
  TOKEN = null;
  console.log(`${LOG_PREFIX()} 🔄 Alternando credencial: ${CREDENTIALS[credIndex]?.username || "sem usuário"}`);
}

// 🔹 Emitir resultado
function emitirResultado(obj, io = null) {
  console.log("RESULT:" + JSON.stringify(obj));
  if (io) io.emit("result", obj);
}

// 🔹 Autenticar
export async function authenticate() {
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
  } catch (err) {
    console.log(`${LOG_PREFIX()} ❌ Erro ao autenticar ${cred?.username}: ${err.message}`);
    switchCredential();
    await authenticate();
  }
}

// 🔹 Consultar Resultado
async function consultarResultado(cpf, linha) {
  for (let attempt = 0; attempt < CREDENTIALS.length; attempt++) {
    try {
      const user = CREDENTIALS[credIndex]?.username || "sem usuário";
      console.log(`${LOG_PREFIX()} 🔎 [Linha ${linha}] Consultando CPF: ${cpf} | Credencial: ${user}`);
      const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      console.log(`${LOG_PREFIX()} 📦 [Linha ${linha}] Retorno completo da API: ${JSON.stringify(res.data)}`);
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      console.log(`${LOG_PREFIX()} ❌ Erro consulta CPF ${cpf}: ${err.message} | Status: ${status}`);
      if (status === 429 || err.message.includes("Limite de requisições")) {
        switchCredential();
        await authenticate();
      } else {
        return null;
      }
    }
  }
  return null;
}

// 🔹 Enviar para fila
async function enviarParaFila(cpf) {
  try {
    await axios.post(
      "https://bff.v8sistema.com/fgts/balance",
      { documentNumber: cpf, provider: PROVIDER },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    return true;
  } catch {
    return false;
  }
}

// 🔹 Simular Saldo
async function simularSaldo(cpf, balanceId, parcelas) {
  if (!parcelas || parcelas.length === 0) return null;
  const desiredInstallments = parcelas.filter((p) => p.amount > 0 && p.dueDate)
    .map((p) => ({ totalAmount: p.amount, dueDate: p.dueDate }));

  if (!desiredInstallments.length) return null;

  const tabelas = [
    "cb563029-ba93-4b53-8d53-4ac145087212",
    "f6d779ed-52bf-42f2-9dbc-3125fe6491ba",
  ];

  for (const simId of tabelas) {
    const simIndex = CREDENTIALS[2] ? 2 : 0;
    switchCredential(simIndex);
    await authenticate();

    const payload = {
      simulationFeesId: simId,
      balanceId,
      targetAmount: 0,
      documentNumber: cpf,
      desiredInstallments,
      provider: PROVIDER,
    };
    console.log(`${LOG_PREFIX()} 🔧 Payload simulação:`, JSON.stringify(payload));

    try {
      const res = await axios.post("https://bff.v8sistema.com/fgts/simulations", payload, {
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      });
      const available = parseFloat(res.data.availableBalance || 0);
      if (available > 0) return res.data;
      console.log(`${LOG_PREFIX()} ⚠️ Saldo zero para simulação com tabela ${simId}`);
    } catch (err) {
      console.error(`${LOG_PREFIX()} ❌ Erro na simulação com tabela ${simId}:`, err.response?.data || err.message);
    }
  }
  return null;
}

// 🔹 Atualizar CRM
async function atualizarCRM(id, valor) {
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id, value: valor };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return true;
  } catch {
    return false;
  }
}

// 🔹 Disparar Fluxo
export async function disparaFluxo(id, destStage = DEST_STAGE_ID) {
  try {
    await axios.post(
      "https://lunasdigital.atenderbem.com/int/changeOpportunityStage",
      { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id, destStageId: destStage },
      { headers: { "Content-Type": "application/json" } }
    );
    return true;
  } catch (err) {
    console.error(`${LOG_PREFIX()} ❌ Erro disparo fluxo para ID ${id}:`, err.response?.data || err.message);
    return false;
  }
}

// 🔹 Processar CPFs a partir de arquivo CSV
export async function processarCPFs(filePath, io = null) {
  const csvContent = fs.readFileSync(filePath, "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });

  console.log(`${LOG_PREFIX()} Iniciando processamento de ${registros.length} CPFs`);
  await authenticate();

  for (let [index, registro] of registros.entries()) {
    const linha = index + 2;
    const cpf = (registro.CPF || "").trim();
    const idOriginal = (registro.ID || "").trim();
    if (!cpf) continue;

    let resultado = await consultarResultado(cpf, linha);
    await delay(DELAY_MS);

    if (!resultado || !resultado.data || resultado.data.length === 0) {
      if (!(await enviarParaFila(cpf))) emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro consulta / fila" }, io);
      continue;
    }

    const item = resultado.data[0];

    if (item.statusInfo?.includes("não possui autorização")) {
      emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: "Instituição Fiduciária não possui autorização" }, io);
      continue;
    }

    if (item.status !== "success" || item.amount <= 0) {
      emitirResultado({ cpf, id: idOriginal, status: "no_balance", message: "Sem saldo disponível" }, io);
      continue;
    }

    const sim = await simularSaldo(cpf, item.id, item.periods);
    await delay(DELAY_MS);

    if (!sim || parseFloat(sim.availableBalance || 0) <= 0) {
      emitirResultado({ cpf, id: idOriginal, status: "sim_failed", message: "Erro simulação / Sem saldo" }, io);
      continue;
    }

    const valorLiberado = parseFloat(sim.availableBalance || 0);

    if (!(await atualizarCRM(idOriginal, valorLiberado))) {
      emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro CRM" }, io);
      continue;
    }

    await delay(DELAY_MS);

    if (!(await disparaFluxo(idOriginal))) {
      emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro disparo" }, io);
      continue;
    }

    emitirResultado({ cpf, id: idOriginal, status: "success", message: `Finalizado | Saldo: ${item.amount} | Liberado: ${valorLiberado}` }, io);
  }
}
