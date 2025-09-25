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

// 🔹 Lista de providers na ordem desejada
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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 🔹 Emitir resultado para front e logs
function emitirResultado(obj, callback = null) {
  // Sempre imprime o retorno completo para análise
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
async function authenticate() {
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
  } catch (err) {
    const user = cred?.username || "sem usuário";
    console.log(`${LOG_PREFIX()} ❌ Erro ao autenticar ${user}: ${err.message}`);
    switchCredential();
    await authenticate();
  }
}

// 🔹 Consultar resultado com retry BMS
async function consultarResultado(cpf, provider, linha, retryBMS = 0) {
  try {
    const user = CREDENTIALS[credIndex]?.username || "sem usuário";
    console.log(`${LOG_PREFIX()} 🔎 [Linha ${linha}] Consultando CPF: ${cpf} | Provider: ${provider} | Credencial: ${user}`);
    const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    console.log(`${LOG_PREFIX()} 📦 Retorno completo da API (Provider: ${provider}): ${JSON.stringify(res.data, null, 2)}`);
    return { data: res.data, provider };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data || err.message;
    console.log(`${LOG_PREFIX()} ❌ Erro consulta CPF ${cpf} | Provider: ${provider}:`, msg);

    if (provider === "bms" && msg?.includes("Erro ao consultar saldo, Tente novamente") && retryBMS < 3) {
      console.log(`${LOG_PREFIX()} ⚠️ Tentativa ${retryBMS + 1} para BMS`);
      await delay(DELAY_MS);
      return consultarResultado(cpf, provider, linha, retryBMS + 1);
    }

    if (status === 401) {
      console.log(`${LOG_PREFIX()} ⚠️ Token inválido, autenticando novamente...`);
      await authenticate();
    }

    return { error: err.message, apiResponse: msg, provider };
  }
}

// 🔹 Enviar para fila
async function enviarParaFila(cpf, provider) {
  try {
    await axios.post(
      "https://bff.v8sistema.com/fgts/balance",
      { documentNumber: cpf, provider },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    return true;
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.log(`${LOG_PREFIX()} ❌ Erro enviar para fila CPF ${cpf} | Provider: ${provider}:`, msg);
    return false;
  }
}

// 🔹 Processar CPFs com envio para fila antes de consultar resultado
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

  for (let [index, registro] of registros.entries()) {
    const linha = index + 2;
    const cpf = (registro.CPF || "").trim();
    const idOriginal = (registro.ID || "").trim();
    const telefone = (registro.TELEFONE || "").trim();
    if (!cpf) continue;

    let resultado = null;
    let providerUsed = null;

    for (let prov of PROVIDERS) {
      if (!(await enviarParaFila(cpf, prov))) {
        emitirResultado({
          cpf,
          id: idOriginal,
          status: "pending",
          message: "Erro enviar para fila",
          provider: prov
        }, callback);
        continue;
      }

      await delay(DELAY_MS);
      resultado = await consultarResultado(cpf, prov, linha);
      providerUsed = prov;

      // Se erro, tenta próximo provider
      if (resultado?.error) continue;

      const item = resultado.data?.[0];
      if (!item || item.statusInfo?.includes("não possui autorização") || item.status !== "success") {
        continue;
      }

      break; // sucesso
    }

    if (!resultado || !resultado.data || resultado.data.length === 0) {
      emitirResultado({
        cpf,
        id: idOriginal,
        status: "no_auth",
        message: "❌ Sem autorização em nenhum provider",
        provider: providerUsed,
        apiResponse: resultado?.apiResponse
      }, callback);
      continue;
    }

    const item = resultado.data[0];

    // Mesmo nos casos de no_balance, imprimir retorno completo
    if (item.status !== "success" || item.amount <= 0) {
      emitirResultado({
        cpf,
        id: idOriginal,
        status: "no_balance",
        message: "Sem saldo disponível",
        provider: providerUsed,
        apiResponse: item
      }, callback);
      continue;
    }

    // 🔹 Simulação
    const sim = await simularSaldo(cpf, item.id, item.periods);
    await delay(DELAY_MS);

    if (!sim || parseFloat(sim.availableBalance || 0) <= 0) {
      emitirResultado({
        cpf,
        id: idOriginal,
        status: "sim_failed",
        message: "Erro simulação / Sem saldo",
        provider: providerUsed,
        apiResponse: item
      }, callback);
      continue;
    }

    const valorLiberado = parseFloat(sim.availableBalance || 0);

    // 🔹 Caso sem ID mas com telefone
    if (!idOriginal && telefone) {
      emitirResultado({
        cpf,
        id: idOriginal || "",
        status: "ready_for_manual",
        message: `Simulação finalizada | Saldo liberado: ${valorLiberado}`,
        valorLiberado,
        telefone,
        provider: providerUsed,
        apiResponse: item
      }, callback);
      continue;
    }

    // 🔹 Atualizar CRM
    if (!(await atualizarCRM(idOriginal, valorLiberado))) {
      emitirResultado({
        cpf,
        id: idOriginal,
        status: "pending",
        message: "Erro CRM",
        provider: providerUsed,
        apiResponse: item
      }, callback);
      continue;
    }

    await delay(DELAY_MS);

    // 🔹 Disparar fluxo
    if (!(await disparaFluxo(idOriginal))) {
      emitirResultado({
        cpf,
        id: idOriginal,
        status: "pending",
        message: "Erro disparo",
        provider: providerUsed,
        apiResponse: item
      }, callback);
      continue;
    }

    emitirResultado({
      cpf,
      id: idOriginal,
      status: "success",
      message: `Finalizado | Saldo: ${item.amount} | Liberado: ${valorLiberado}`,
      valorLiberado,
      provider: providerUsed,
      apiResponse: item
    }, callback);
  }
}

export { processarCPFs, disparaFluxo, authenticate };
