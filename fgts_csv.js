import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Configurações
const CSV_FILE = process.env.CSV_FILE || "cpfs.csv";
const PROVIDER = process.env.PROVIDER || "cartos";
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
const QUEUE_ID = process.env.QUEUE_ID;
const DELAY_MS = 800;

let socket = null;

// 🔹 Conectar socket (logs painel)
function setSocket(ioSocket) {
  socket = ioSocket;
}

// 🔹 Delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔹 Enviar logs para o painel
function log(msg) {
  const logLine = `[${new Date().toISOString()}] ${msg}`;
  console.log(logLine);
  if (socket) socket.emit("log", logLine);
}

// 🔹 Emitir resultados
function emitResult(data) {
  if (socket) socket.emit("result", data);
}

// 🔹 Ler planilha CSV
function readCSV(file) {
  const content = fs.readFileSync(file);
  return parse(content, { columns: true, skip_empty_lines: true });
}

// 🔹 Criar oportunidade no CRM
async function criarOportunidade(cpf, provider, valor) {
  try {
    log(`🆕 Criando oportunidade para CPF ${cpf} | Valor: ${valor}`);
    const resp = await axios.post(`${API_URL}/int/createOpportunity`, {
      apiKey: API_KEY,
      queueId: QUEUE_ID,
      cpf,
      provider,
      valor,
    });
    log(`✅ Oportunidade criada no CRM | ID: ${resp.data.id}`);
    return resp.data.id;
  } catch (err) {
    log(
      `❌ Erro criar oportunidade CPF ${cpf}: ${JSON.stringify(
        err.response?.data || err.message
      )}`
    );
    return null;
  }
}

// 🔹 Atualizar oportunidade
async function atualizarOportunidade(id, valor, tabela) {
  try {
    log(`📝 Atualizando oportunidade ${id} com tabela ${tabela}`);
    await axios.post(`${API_URL}/int/updateOpportunity`, {
      apiKey: API_KEY,
      id,
      valor,
      tabela,
    });
    log(`✅ CRM atualizado para oportunidade ${id} com valor ${valor}`);
    return true;
  } catch (err) {
    log(
      `❌ Erro atualizar oportunidade ${id}: ${JSON.stringify(
        err.response?.data || err.message
      )}`
    );
    return false;
  }
}

// 🔹 Disparar fluxo CRM
async function disparaFluxo(id) {
  try {
    log(`🚀 Disparando fluxo para oportunidade ${id}`);
    await axios.post(`${API_URL}/int/changeOpportunityStage`, {
      queueId: QUEUE_ID,
      apiKey: API_KEY,
      id,
      destStageId: 2, // sucesso
    });
    log(`✅ Fluxo disparado para ${id}`);
    return true;
  } catch (err) {
    log(
      `❌ Erro disparo fluxo ID ${id}: ${JSON.stringify(
        err.response?.data || err.message
      )}`
    );
    return false;
  }
}

// 🔹 Processar CPF
async function processCPF(cpf, idPlanilha) {
  try {
    log(`🔍 Consultando saldo FGTS para CPF ${cpf} | Provider: ${PROVIDER}`);

    // 🔹 Consulta na API
    const resp = await axios.get(`${API_URL}/fgts`, {
      params: { cpf, provider: PROVIDER },
      paramsSerializer: (p) => qs.stringify(p),
    });

    log(
      `📦 Retorno completo da API: ${JSON.stringify(resp.data)}`
    );

    const item = resp.data?.data?.[0];
    if (!item) {
      emitResult({ cpf, id: idPlanilha || "", status: "no_auth", message: "❌ Nenhum dado retornado", provider: PROVIDER });
      return;
    }

    // 🔹 Caso pending → vai para lista de pendências
    if (item.status === "pending") {
      log(`⏳ CPF ${cpf} está em PENDING, enviando para pendências`);
      emitResult({
        cpf,
        id: idPlanilha || "",
        status: "pending",
        message: "Em análise / pendente",
        provider: PROVIDER,
      });
      return;
    }

    // 🔹 Se não tiver ID → criar oportunidade
    let oportunidadeId = idPlanilha;
    if (!oportunidadeId) {
      oportunidadeId = await criarOportunidade(cpf, PROVIDER, item.amount);
      if (!oportunidadeId) {
        emitResult({ cpf, id: "", status: "error", message: "❌ Erro criar oportunidade", provider: PROVIDER });
        return;
      }
    }

    // 🔹 Atualizar CRM
    const atualizado = await atualizarOportunidade(oportunidadeId, item.amount, "NORMAL");

    // 🔹 Disparar fluxo
    const disparado = await disparaFluxo(oportunidadeId);

    if (atualizado && disparado) {
      emitResult({ cpf, id: oportunidadeId, status: "success", message: "✅ Sucesso", provider: PROVIDER });
    } else {
      emitResult({ cpf, id: oportunidadeId, status: "success", message: "Erro disparo/atualização (tratado como sucesso)", provider: PROVIDER });
    }

  } catch (err) {
    log(
      `❌ Erro enviar para fila CPF ${cpf} | Provider: ${PROVIDER}: ${JSON.stringify(
        err.response?.data || err.message
      )}`
    );
    emitResult({ cpf, id: idPlanilha || "", status: "no_auth", message: "❌ Sem autorização em nenhum provider", provider: PROVIDER });
  }
}

// 🔹 Processar lista de CPFs
async function processarLista(cpfs) {
  log(`📂 Planilha FGTS recebida: ${CSV_FILE}`);
  log(`Iniciando processamento de ${cpfs.length} CPFs`);

  let processed = 0;
  for (const row of cpfs) {
    processed++;
    const cpf = row.cpf;
    const idPlanilha = row.id || "";

    await processCPF(cpf, idPlanilha);

    // 🔹 Atualizar progresso
    emitResult({
      status: "progress",
      percentage: Math.round((processed / cpfs.length) * 100),
      processed,
      total: cpfs.length,
    });

    await delay(DELAY_MS);
  }
}

export { readCSV, processarLista, setSocket };
