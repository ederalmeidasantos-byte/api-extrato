import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Configurações
const DELAY_MS = 1500;
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

if (!CREDENTIALS.length) {
  console.error("❌ Nenhuma credencial FGTS configurada no .env");
  process.exit(1);
}

let TOKEN = null;
let credIndex = 0;
const LOG_PREFIX = () => `[${new Date().toISOString()}]`;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 🔹 Emitir resultado
function emitirResultado(obj, callback = null) {
  console.log("RESULT:" + JSON.stringify(obj));
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
async function authenticate() {
  if (!CREDENTIALS.length) throw new Error("Nenhuma credencial disponível!");
  const cred = CREDENTIALS[credIndex];
  try {
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
    const user = cred?.username || "sem usuário";
    console.log(`${LOG_PREFIX()} ❌ Erro ao autenticar ${user}: ${err.message}`);
    switchCredential();
    await authenticate();
  }
}

// 🔹 Enviar para fila
async function enviarParaFila(cpf, provider) {
  if (!TOKEN) await authenticate();
  try {
    await axios.post(
      "https://bff.v8sistema.com/fgts/balance",
      { documentNumber: cpf, provider },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    return true;
  } catch (err) {
    const status = err.response?.status;
    console.log(`${LOG_PREFIX()} ❌ Erro enviar para fila CPF ${cpf} | Provider: ${provider}:`, err.response?.data || err.message);
    if (status === 401) {
      console.log(`${LOG_PREFIX()} ⚠️ Token inválido, reautenticando...`);
      await authenticate();
    } else if (status === 429 || err.message.includes("Limite de requisições")) {
      switchCredential();
      await authenticate();
    }
    return false;
  }
}

// 🔹 Consultar resultado
async function consultarResultado(cpf, linha, provider) {
  if (!TOKEN) await authenticate();
  try {
    const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    console.log(`${LOG_PREFIX()} 📦 [Linha ${linha}] Provider: ${provider} | Retorno completo:`, JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    console.log(`${LOG_PREFIX()} ❌ Erro consulta CPF ${cpf} | Provider: ${provider}:`, err.response?.data || err.message, "| Status:", status);
    if (status === 401) {
      console.log(`${LOG_PREFIX()} ⚠️ Token inválido, reautenticando...`);
      await authenticate();
    } else if (status === 429 || err.message.includes("Limite de requisições")) {
      switchCredential();
      await authenticate();
    }
    return { error: err.message, apiResponse: err.response?.data };
  }
}

// 🔹 Atualizar CRM
async function atualizarCRM(id, valor) {
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id, value: valor };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return true;
  } catch (err) {
    console.error(`${LOG_PREFIX()} ❌ Erro atualizar CRM ID ${id}:`, err.response?.data || err.message);
    return false;
  }
}

// 🔹 Disparar fluxo
async function disparaFluxo(id, destStage = DEST_STAGE_ID) {
  try {
    await axios.post(
      "https://lunasdigital.atenderbem.com/int/changeOpportunityStage",
      { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id, destStageId: destStage },
      { headers: { "Content-Type": "application/json" } }
    );
    return true;
  } catch (err) {
    console.error(`${LOG_PREFIX()} ❌ Erro disparo fluxo ID ${id}:`, err.response?.data || err.message);
    return false;
  }
}

// 🔹 Processar CPFs
async function processarCPFs(csvPath = null, cpfsReprocess = null, callback = null) {
  let registros = [];
  if (cpfsReprocess && cpfsReprocess.length) {
    registros = cpfsReprocess.map((cpf, i) => ({ CPF: cpf, ID: `reproc_${i}` }));
  } else if (csvPath) {
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });
  } else {
    throw new Error("Nenhum CSV fornecido para processar!");
  }

  console.log(`${LOG_PREFIX()} Iniciando processamento de ${registros.length} CPFs`);

  const providers = ["cartos", "bms", "qi"];

  for (let [index, registro] of registros.entries()) {
    const linha = index + 2;
    const cpf = (registro.CPF || "").trim();
    const idOriginal = (registro.ID || "").trim();
    const telefone = (registro.TELEFONE || "").trim();
    if (!cpf) continue;

    let processed = false;
    let apiResponse = null;

    for (const provider of providers) {
      // 1️⃣ Envia para a fila
      await enviarParaFila(cpf, provider);

      // 2️⃣ Consulta resultado
      const resultado = await consultarResultado(cpf, linha, provider);
      apiResponse = resultado;

      if (!resultado || !resultado.data || resultado.data.length === 0) continue;

      const item = resultado.data[0];

      if (item.statusInfo?.includes("não possui autorização")) {
        // BMS: tenta 3x se der "Erro ao consultar saldo, Tente novamente"
        if (provider === "bms" && item.statusInfo.includes("Tente novamente")) {
          continue;
        }
        emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: `❌ Sem autorização em provider ${provider}`, provider, apiResponse }, callback);
        processed = true;
        break;
      }

      if (item.status !== "success" || item.amount <= 0) {
        emitirResultado({ cpf, id: idOriginal, status: "no_balance", message: "Sem saldo disponível", provider, apiResponse }, callback);
        processed = true;
        break;
      }

      // ✅ Se tudo ok
      emitirResultado({ cpf, id: idOriginal, status: "success", message: "Saldo disponível", provider, apiResponse }, callback);
      processed = true;
      break;
    }

    if (!processed) {
      emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: "❌ Sem autorização em nenhum provider", apiResponse }, callback);
    }

    await delay(DELAY_MS);
  }
}

export { processarCPFs, disparaFluxo, authenticate };
