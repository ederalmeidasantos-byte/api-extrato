import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Configurações
const CSV_FILE = process.env.CSV_FILE || "cpfs.csv";
const PROVIDER = process.env.PROVIDER || "cartos";
const DELAY_MS = 800;
const SIMULATION_FEES_ID = process.env.SIMULATION_FEES_ID;
const QUEUE_ID = process.env.QUEUE_ID || 25;
const API_CRM_KEY = process.env.LUNAS_API_KEY;
const DEST_STAGE_ID = process.env.DEST_STAGE_ID || 4;

// 🔹 Credenciais dinâmicas via .env
const CREDENTIALS = [];
for (let i = 1; process.env[`FGTS_LOGIN_${i}`]; i++) {
  CREDENTIALS.push({
    username: process.env[`FGTS_LOGIN_${i}`],
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

let resultados = [];
let pendentes = [];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

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

// 🔹 Consultar Resultado
async function consultarResultado(cpf, linha) {
  for (let attempt = 0; attempt < CREDENTIALS.length; attempt++) {
    try {
      const user = CREDENTIALS[credIndex]?.username || "sem usuário";
      console.log(`${LOG_PREFIX()} 🔎 [Linha ${linha}] Consultando CPF: ${cpf} | Credencial: ${user}`);
      const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      console.log(`${LOG_PREFIX()} 📄 [Linha ${linha}] Retorno CPF ${cpf}:`, JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 || err.message.includes("Limite de requisições")) {
        console.log(`${LOG_PREFIX()} ⚠️ [Linha ${linha}] Limite de requisições. Alternando credencial...`);
        switchCredential();
        await authenticate();
      } else {
        console.log(`${LOG_PREFIX()} ❌ [Linha ${linha}] Erro na consulta CPF ${cpf}: ${err.message}`);
        return null;
      }
    }
  }
  return null;
}

// 🔹 Enviar para fila
async function enviarParaFila(cpf, linha) {
  for (let attempt = 0; attempt < CREDENTIALS.length; attempt++) {
    try {
      const user = CREDENTIALS[credIndex]?.username || "sem usuário";
      console.log(`${LOG_PREFIX()} 🔄 [Linha ${linha}] Enviando CPF para fila: ${cpf} | Credencial: ${user}`);
      const res = await axios.post(
        "https://bff.v8sistema.com/fgts/balance",
        { documentNumber: cpf, provider: PROVIDER },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      console.log(`${LOG_PREFIX()} 📤 [Linha ${linha}] CPF ${cpf} enviado para fila`);
      return res.data;
    } catch (err) {
      if (err.response?.status === 429 || err.message.includes("Limite de requisições")) {
        console.log(`${LOG_PREFIX()} ⚠️ [Linha ${linha}] Limite de fila. Alternando credencial...`);
        switchCredential();
        await authenticate();
      } else {
        console.log(`${LOG_PREFIX()} ❌ [Linha ${linha}] Erro fila CPF ${cpf}: ${err.message}`);
        return null;
      }
    }
  }
  return null;
}

// 🔹 Simular Saldo
async function simularSaldo(cpf, balanceId, parcelas, linha) {
  if (!parcelas || parcelas.length === 0) return null;

  const desiredInstallments = parcelas.map((p) => ({ totalAmount: p.amount, dueDate: p.dueDate }));

  const simIndex = CREDENTIALS[2] ? 2 : 0;
  switchCredential(simIndex);
  await authenticate();

  try {
    const payload = {
      simulationFeesId: SIMULATION_FEES_ID,
      balanceId,
      targetAmount: 0,
      documentNumber: cpf,
      desiredInstallments,
      provider: PROVIDER,
    };
    const res = await axios.post("https://bff.v8sistema.com/fgts/simulations", payload, {
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    });
    console.log(`${LOG_PREFIX()} ✅ [Linha ${linha}] Simulação CPF ${cpf}:`, res.data);
    return res.data;
  } catch (err) {
    console.log(`${LOG_PREFIX()} ❌ [Linha ${linha}] Erro simulação CPF ${cpf}: ${err.message}`);
    return null;
  }
}

// 🔹 Atualizar CRM
async function atualizarCRM(id, valor, linha, cpf) {
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id, value: valor };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`${LOG_PREFIX()} 🔄 [Linha ${linha}] CRM atualizado CPF ${cpf} | Valor: ${valor}`);
    return true;
  } catch (err) {
    console.log(`${LOG_PREFIX()} ❌ [Linha ${linha}] Erro atualizar CRM CPF ${cpf}: ${err.message}`);
    return false;
  }
}

// 🔹 Disparar Fluxo
async function disparaFluxo(id, linha, cpf) {
  try {
    await axios.post(
      "https://lunasdigital.atenderbem.com/int/changeOpportunityStage",
      { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id, destStageId: DEST_STAGE_ID },
      { headers: { "Content-Type": "application/json" } }
    );
    console.log(`${LOG_PREFIX()} 📤 [Linha ${linha}] Fluxo disparado CPF ${cpf}`);
    return true;
  } catch (err) {
    console.log(`${LOG_PREFIX()} ❌ [Linha ${linha}] Erro disparar CPF ${cpf}: ${err.message}`);
    return false;
  }
}

// 🔹 Processar CPFs
async function processarCPFs() {
  const csvContent = fs.readFileSync(CSV_FILE, "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });

  console.log(`${LOG_PREFIX()} Iniciando processamento de ${registros.length} CPFs`);

  for (let [index, registro] of registros.entries()) {
    const linha = index + 2;
    const cpf = (registro.CPF || "").trim();
    const telefone = (registro.TELEFONE || "").trim();
    const idOriginal = (registro.ID || "").trim();

    if (!cpf) {
      console.log(`${LOG_PREFIX()} ⚠️ [Linha ${linha}] CPF vazio. Pulando...`);
      continue;
    }

    let resultado = await consultarResultado(cpf, linha);
    await delay(DELAY_MS);

    if (!resultado || !resultado.data || resultado.data.length === 0) {
      const fila = await enviarParaFila(cpf, linha);
      if (!fila) pendentes.push({ ...registro, STATUS_ERRO: "Falha fila" });
      continue;
    }

    const item = resultado.data[0];
    if (item.status !== "success" || item.amount <= 0) {
      console.log(`${LOG_PREFIX()} ℹ️ [Linha ${linha}] CPF ${cpf} sem saldo`);
      continue;
    }

    resultados.push({ LINHA: linha, CPF: cpf, TELEFONE: telefone, ID: idOriginal, SALDO: item.amount });

    const sim = await simularSaldo(cpf, item.id, item.periods, linha);
    await delay(DELAY_MS);
    if (!sim) {
      pendentes.push({ ...registro, STATUS_ERRO: "Erro simulação" });
      continue;
    }

    const valorLiberado = parseFloat(sim.availableBalance || 0);

    if (!(await atualizarCRM(idOriginal, valorLiberado, linha, cpf))) {
      pendentes.push({ ...registro, STATUS_ERRO: "Erro CRM" });
      continue;
    }
    await delay(DELAY_MS);

    if (!(await disparaFluxo(idOriginal, linha, cpf))) {
      pendentes.push({ ...registro, STATUS_ERRO: "Erro disparo" });
      continue;
    }
    await delay(DELAY_MS);

    console.log(`${LOG_PREFIX()} 🎯 [Linha ${linha}] CPF ${cpf} FINALIZADO | Saldo: ${item.amount} | Liberado: ${valorLiberado}`);
  }

  if (resultados.length > 0) {
    fs.writeFileSync("cpfs_resultado_atualizado.csv", stringify(resultados, { header: true, delimiter: ";" }));
    console.log(`${LOG_PREFIX()} ✅ Planilha de resultados atualizada`);
  }

  if (pendentes.length > 0) {
    fs.writeFileSync(CSV_FILE, stringify(pendentes, { header: true, delimiter: ";" }));
    console.log(`${LOG_PREFIX()} ⚠️ Planilha de pendentes atualizada`);
  }
}

// 🔹 Start
(async () => {
  await authenticate();
  await processarCPFs();
})();
