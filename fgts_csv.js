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
const PROVIDERS = ["cartos", "bms", "qi"]; // ordem desejada

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 🔹 Emitir resultado para front e logs
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

// 🔹 Enviar CPF para fila com autenticação garantida
async function enviarParaFila(cpf, provider) {
  try {
    // garante token válido antes de enviar
    if (!TOKEN) await authenticate();

    const res = await axios.post(
      "https://bff.v8sistema.com/fgts/balance",
      { documentNumber: cpf, provider },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log(`${LOG_PREFIX()} 📥 Enviado para fila | CPF: ${cpf} | Provider: ${provider}`);
    return true;
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.log(`${LOG_PREFIX()} ❌ Erro enviar para fila CPF ${cpf} | Provider: ${provider}: Status ${status}, Data: ${JSON.stringify(data) || err.message}`);

    // Se 401, força reautenticação
    if (status === 401) {
      await authenticate();
    }

    return false;
  }
}

// 🔹 Consultar resultado da última requisição na fila
async function consultarResultado(cpf, linha) {
  try {
    const user = CREDENTIALS[credIndex]?.username || "sem usuário";
    console.log(`${LOG_PREFIX()} 🔎 [Linha ${linha}] Consultando CPF: ${cpf} | Credencial: ${user}`);
    const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    return res.data;
  } catch (err) {
    return { error: err.message, apiResponse: err.response?.data };
  }
}

// 🔹 Consultar saldo com fallback entre providers
async function consultarComFallback(cpf, linha) {
  for (const provider of PROVIDERS) {
    let tentativasBMS = 0;
    let enviado = await enviarParaFila(cpf, provider);
    if (!enviado) continue;
    await delay(DELAY_MS);

    while (true) {
      const resultado = await consultarResultado(cpf, linha);
      await delay(DELAY_MS);

      const item = resultado?.data?.[0];
      const msg = item?.statusInfo || "";

      if (!item) {
        console.log(`${LOG_PREFIX()} ⚠️ Sem retorno no provider ${provider}`);
        break; // tenta próximo provider
      }

      if (msg.includes("não possui autorização")) {
        console.log(`${LOG_PREFIX()} ❌ Não autorizado no provider ${provider}`);
        break; // tenta próximo provider
      }

      if (provider === "bms" && msg.includes("Erro ao consultar saldo, Tente novamente")) {
        tentativasBMS++;
        if (tentativasBMS < 3) {
          console.log(`${LOG_PREFIX()} ⚠️ Erro comum no BMS, tentativa ${tentativasBMS}/3`);
          await delay(DELAY_MS);
          continue;
        } else {
          console.log(`${LOG_PREFIX()} ❌ BMS falhou 3x, tentando próximo provider`);
          break;
        }
      }

      return { resultado: item, provider };
    }
  }
  return { resultado: null, provider: null };
}

// 🔹 Simular saldo
async function simularSaldo(cpf, balanceId, parcelas, provider) {
  if (!parcelas || parcelas.length === 0) return null;

  const desiredInstallments = parcelas
    .filter((p) => p.amount > 0 && p.dueDate)
    .map((p) => ({ totalAmount: p.amount, dueDate: p.dueDate }));

  if (!desiredInstallments.length) return null;

  const tabelas = [
    "cb563029-ba93-4b53-8d53-4ac145087212",
    "f6d779ed-52bf-42f2-9dbc-3125fe6491ba",
  ];

  for (const simId of tabelas) {
    await authenticate(); // garante token válido
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
      if (available > 0) return res.data;
    } catch {}
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
  } catch (err) {
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

  for (let [index, registro] of registros.entries()) {
    const linha = index + 2;
    const cpf = (registro.CPF || "").trim();
    const idOriginal = (registro.ID || "").trim();
    const telefone = (registro.TELEFONE || "").trim();
    if (!cpf) continue;

    const { resultado: item, provider } = await consultarComFallback(cpf, linha);
    await delay(DELAY_MS);

    if (!item) {
      emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: "❌ Sem autorização em nenhum provider" }, callback);
      continue;
    }

    if (item.status !== "success" || item.amount <= 0) {
      emitirResultado({ cpf, id: idOriginal, status: "no_balance", message: "Sem saldo disponível", provider }, callback);
      continue;
    }

    const sim = await simularSaldo(cpf, item.id, item.periods, provider);
    await delay(DELAY_MS);

    if (!sim || parseFloat(sim.availableBalance || 0) <= 0) {
      emitirResultado({ cpf, id: idOriginal, status: "sim_failed", message: "Erro simulação / Sem saldo", provider }, callback);
      continue;
    }

    const valorLiberado = parseFloat(sim.availableBalance || 0);

    if (!idOriginal && telefone) {
      emitirResultado({
        cpf,
        id: idOriginal || "",
        status: "ready_for_manual",
        message: `Simulação finalizada | Saldo liberado: ${valorLiberado}`,
        valorLiberado,
        telefone,
        apiResponse: item,
        provider
      }, callback);
      continue;
    }

    if (!(await atualizarCRM(idOriginal, valorLiberado))) {
      emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro CRM", provider }, callback);
      continue;
    }

    await delay(DELAY_MS);

    if (!(await disparaFluxo(idOriginal))) {
      emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro disparo", provider }, callback);
      continue;
    }

    emitirResultado({
      cpf,
      id: idOriginal,
      status: "success",
      message: `Finalizado | Saldo: ${item.amount} | Liberado: ${valorLiberado}`,
      valorLiberado,
      apiResponse: item,
      provider
    }, callback);
  }
}

export { processarCPFs, disparaFluxo, authenticate };
