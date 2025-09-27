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
let paused = false;
let ioInstance = null;

// 🔹 Pendentes
const pendentes = [];

// 🔹 Delay e pausa
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
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
function emitirResultado({ cpf, id, status, valorLiberado = 0, provider, linha = "?", resultadoCompleto = null }, callback = null) {
  const valorFormatado = Number(valorLiberado || 0).toFixed(2);

  console.log(
    `[CLIENT] ✅ Linha: ${linha} | CPF: ${cpf} | ID: ${id || "N/A"} | Status: ${status} | Valor Liberado: ${valorFormatado} | Provider: ${provider || "N/A"}`
  );

  if (resultadoCompleto?.data && resultadoCompleto.data.length > 0) {
    console.log(`[CLIENT] 📦 [Linha ${linha}] Primeiro item do retorno:`, resultadoCompleto.data[0]);
  } else {
    console.log(`[CLIENT] 📦 [Linha ${linha}] Sem retorno da API`);
  }

  if (ioInstance) {
    ioInstance.emit("resultadoCPF", {
      linha,
      cpf,
      id,
      status,
      valorLiberado: valorFormatado,
      provider,
      resultadoCompleto
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
      resultadoCompleto
    });
  }
}

// 🔹 Alternar credencial
function switchCredential(forcedIndex = null) {
  if (!CREDENTIALS.length) return;
  credIndex = forcedIndex !== null ? forcedIndex % CREDENTIALS.length : (credIndex + 1) % CREDENTIALS.length;
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

// 🔹 Consultar resultado
async function consultarResultado(cpf, linha) {
  try {
    await authenticate();
    const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    return {
      data: res.data.data?.[0] ? [res.data.data[0]] : [],
      pages: res.data.pages || { total: 0 }
    };
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

// 🔹 Processar CPFs
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

  let contadorSucesso = 0;
  let contadorPending = 0;
  let contadorSemAutorizacao = 0;

  console.log(`${LOG_PREFIX()} 📄 Total de CPFs lidos: ${total}`);
  if (ioInstance) ioInstance.emit("totalCPFs", total);

  for (let [index, registro] of registros.entries()) {
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

    let resultado = null, providerUsed = null;

    for (const provider of PROVIDERS) {
      while (paused) await delay(500);
      providerUsed = provider;
      resultado = await consultarResultado(cpf, linha);

      // 🔹 Sem autorização → pendência
      const naoAutorizado = resultado?.data?.some(d =>
        d.status === "error" && d.statusInfo?.includes("não possui autorização")
      );
      if (naoAutorizado) {
        const pendencia = resultado.data.find(d => d.statusInfo?.includes("não possui autorização"));
        registrarPendencia(cpf, idOriginal, pendencia.statusInfo, linha);
        contadorSemAutorizacao++;
        resultado = null;
        break;
      }

      // 🔹 Pending → pendência
      const pending = resultado?.data?.some(d => d.status === "pending");
      if (pending) {
        registrarPendencia(cpf, idOriginal, "Aguardando retorno", linha);
        contadorPending++;
        resultado = null;
        break;
      }

      // 🔹 Retorno válido → processa
      const registrosValidos = resultado?.data?.filter(r =>
        !(r.status === "error" && r.statusInfo?.includes("Trabalhador não possui adesão ao saque aniversário vigente"))
      ) || [];
      const saldo = registrosValidos[0]?.amount || 0;
      const parcelas = registrosValidos[0]?.periods || [];
      const balanceId = registrosValidos[0]?.id || null;

      if (saldo > 0 && balanceId) {
        while (paused) await delay(500);
        // Aqui chamaria simularSaldo e criar oportunidade, mantendo o fluxo original
      }

      break; // sai do loop de providers
    }

    processed++;
    if (ioInstance) ioInstance.emit("progress", Math.floor((processed / total) * 100));
    while (paused) await delay(delayMs);
  }

  console.log(`📊 Contadores
Sucesso: ${contadorSucesso} | Pendentes: ${contadorPending} | Sem Autorização: ${contadorSemAutorizacao}`);
}

export {
  processarCPFs,
  setDelay,
  setPause,
  attachIO,
};
