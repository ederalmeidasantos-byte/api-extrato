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

// 🔹 Autenticar (token universal)
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
    console.log(`${LOG_PREFIX()} 📦 [Linha ${linha}] Retorno completo da API: ${JSON.stringify(res.data)}`);
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    console.log(`${LOG_PREFIX()} ❌ Erro consulta CPF ${cpf}: ${err.message} | Status: ${status}`);

    if (status === 401) {
      console.log(`${LOG_PREFIX()} ⚠️ Token inválido, autenticando novamente...`);
      await authenticate(true);
      return consultarResultado(cpf, linha);
    } else if (status === 429 || err.message.includes("Limite de requisições")) {
      console.log(`${LOG_PREFIX()} ⚠️ Limite de requisições, pendência registrada e troca de usuário`);
      switchCredential();
      await authenticate(true);
      return { data: [], pending: true };
    } else {
      return { error: err.message, apiResponse: err.response?.data };
    }
  }
}

// 🔹 Enviar para fila com provider
async function enviarParaFila(cpf, provider) {
  ultimoProvider = provider;
  try {
    await axios.post(
      "https://bff.v8sistema.com/fgts/balance",
      { documentNumber: cpf, provider },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    return true;
  } catch (err) {
    console.log(`${LOG_PREFIX()} ❌ Erro enviar para fila CPF ${cpf} | Provider: ${provider}:`, err.response?.data || err.message);
    return false;
  }
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

    console.log(`${LOG_PREFIX()} 🔧 Payload simulação:`, JSON.stringify(payload));

    try {
      const res = await axios.post("https://bff.v8sistema.com/fgts/simulations", payload, {
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      });
      console.log(`${LOG_PREFIX()} 📦 Resultado completo simulação:`, JSON.stringify(res.data));
      const available = parseFloat(res.data.availableBalance || 0);
      if (available > 0) return { ...res.data, tabelaSimulada: simId === tabelas[0] ? "NORMAL" : "ACELERA" };
      console.log(`${LOG_PREFIX()} ⚠️ Saldo zero para simulação com tabela ${simId}`);
    } catch (err) {
      console.error(`${LOG_PREFIX()} ❌ Erro na simulação com tabela ${simId}:`, err.response?.data || err.message);
    }
  }
  return null;
}

// 🔹 Consultar planilha LISTA-FGTS.csv
function consultarPlanilha(cpf, telefone) {
  const csvContent = fs.readFileSync("LISTA-FGTS.csv", "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });
  const encontrado = registros.find(r => (r['#c-98011220'] || "").trim() === cpf || (r['#phone'] || "").trim() === telefone);
  if (encontrado) {
    return { id: encontrado['#id'], stageId: encontrado['#stageid'] };
  }
  return null;
}

// 🔹 Atualizar oportunidade com tabela simulada
async function atualizarOportunidadeComTabela(opportunityId, tabelaSimulada) {
  try {
    const formsdata = {
      f0a67ce0: tabelaSimulada, // NORMAL ou ACELERA
      "80b68ec0": "cartos"
    };
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, formsdata };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`${LOG_PREFIX()} ✅ Oportunidade ${opportunityId} atualizada com tabela ${tabelaSimulada}`);
    return true;
  } catch (err) {
    console.error(`${LOG_PREFIX()} ❌ Erro atualizar oportunidade ID ${opportunityId}:`, err.response?.data || err.message);
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
      title: `Oportunidade ${cpf}`,
      mainphone: telefone,
      mainmail: cpf,
      value: valorLiberado
    };
    const res = await axios.post("https://lunasdigital.atenderbem.com/int/createOpportunity", payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`${LOG_PREFIX()} ✅ Oportunidade criada para ${cpf}:`, res.data);
    return res.data?.id || null;
  } catch (err) {
    console.error(`${LOG_PREFIX()} ❌ Erro criar oportunidade CPF ${cpf}:`, err.response?.data || err.message);
    return null;
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
    let idOriginal = (registro.ID || "").trim();
    const telefone = (registro.TELEFONE || "").trim();
    if (!cpf) continue;

    // 🔹 Verifica se já existe na planilha LISTA-FGTS.csv
    const planilha = consultarPlanilha(cpf, telefone);
    if (planilha) {
      idOriginal = planilha.id;
      console.log(`${LOG_PREFIX()} ⚠️ Encontrado na planilha: ${cpf} | ID existente: ${idOriginal}`);
    }

    let resultado = null;
    let providerUsed = null;

    for (const provider of PROVIDERS) {
      await authenticate();
      await enviarParaFila(cpf, provider);
      providerUsed = provider;
      await delay(DELAY_MS);

      resultado = await consultarResultado(cpf, linha);
      await delay(DELAY_MS);

      if (!resultado?.data || resultado.data.length === 0) continue;

      const item = resultado.data[0];

      // 🔹 Pendentes ou não autorizados
      if (item.status === "pending" || (item.status === "error" && item.statusInfo?.includes("não possui autorização"))) {
        emitirResultado({ cpf, id: idOriginal, status: "pending", message: item.statusInfo || "Consulta pendente", provider: providerUsed }, callback);
        break;
      }

      // 🔹 Success com saldo
      if (item.status === "success" && item.amount > 0) {
        const sim = await simularSaldo(cpf, item.id, item.periods, providerUsed);
        await delay(DELAY_MS);

        if (!sim || parseFloat(sim.availableBalance || 0) <= 0) {
          emitirResultado({ cpf, id: idOriginal, status: "sim_failed", message: "Erro simulação / Sem saldo", provider: providerUsed }, callback);
          break;
        }

        const valorLiberado = parseFloat(sim.availableBalance || 0);

        // 🔹 Se não existe ID, cria oportunidade
        if (!idOriginal && telefone) {
          const newId = await criarOportunidade(cpf, telefone, valorLiberado);
          idOriginal = newId || "";

          // 🔹 Atualiza oportunidade com tabela simulada
          if (idOriginal) {
            await atualizarOportunidadeComTabela(idOriginal, sim.tabelaSimulada);
          }

          emitirResultado({
            cpf,
            id: idOriginal,
            status: "ready_for_manual",
            message: `Simulação finalizada | Saldo liberado: ${valorLiberado}`,
            valorLiberado,
            telefone,
            provider: providerUsed,
            apiResponse: item
          }, callback);
          break;
        }

        if (!(await atualizarCRM(idOriginal, valorLiberado))) {
          emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro CRM", provider: providerUsed }, callback);
          break;
        }

        // 🔹 Atualiza oportunidade existente com tabela simulada
        await atualizarOportunidadeComTabela(idOriginal, sim.tabelaSimulada);

        await delay(DELAY_MS);

        if (!(await disparaFluxo(idOriginal))) {
          emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro disparo", provider: providerUsed }, callback);
          break;
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
        break;
      }
    }

    // 🔹 Caso sem resultado
    if (!resultado?.data || resultado.data.length === 0) {
      emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: "❌ Sem autorização em nenhum provider", provider: providerUsed || ultimoProvider }, callback);
    }
  }
}

// 🔹 Exporta funções
export { processarCPFs, disparaFluxo, authenticate, atualizarOportunidadeComTabela, criarOportunidade };
