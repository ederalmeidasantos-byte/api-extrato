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

// 🔹 Emitir resultado para front e logs (erro completo)
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

// 🔹 Consultar resultado (erro completo + retry 429)
async function consultarResultado(cpf, linha) {
  try {
    await authenticate();
    const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    console.log(`${LOG_PREFIX()} 📦 [Linha ${linha}] Retorno completo da API:`, JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const erroCompleto = {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    };
    console.log(`${LOG_PREFIX()} ❌ Erro consulta CPF ${cpf}:`, erroCompleto);

    if (erroCompleto.status === 401) {
      console.log(`${LOG_PREFIX()} ⚠️ Token inválido, autenticando novamente...`);
      await authenticate(true);
      return consultarResultado(cpf, linha);
    } else if (erroCompleto.status === 429 || err.message.includes("Limite de requisições")) {
      console.log(`${LOG_PREFIX()} ⚠️ Rate limit, aguardando mais tempo...`);
      await delay(DELAY_MS * 3);
      switchCredential();
      await authenticate(true);
      return { data: [], pending: true, errorDetails: erroCompleto };
    } else {
      return { error: err.message, errorDetails: erroCompleto };
    }
  }
}

// 🔹 Enviar para fila com provider (erro completo)
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
    const erroCompleto = {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    };
    console.log(`${LOG_PREFIX()} ❌ Erro enviar para fila CPF ${cpf} | Provider: ${provider}:`, erroCompleto);
    return false;
  }
}

// 🔹 Simular saldo (apenas Cartos)
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

// 🔹 Consultar planilha LISTA-FGTS.csv
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
    const idPlanilha = encontrado['ID [#id]']?.trim();
    const stageIdPlanilha = encontrado['ID da Etapa [#stageid]']?.trim();
    console.log(`${LOG_PREFIX()} ⚠️ Planilha encontrada para CPF ${cpfNorm} | ID: ${idPlanilha}`);
    return { id: idPlanilha, stageId: stageIdPlanilha };
  } else {
    console.log(`${LOG_PREFIX()} ❌ CPF ${cpfNorm} não encontrado na planilha`);
  }

  return null;
}

// 🔹 Atualizar oportunidade com tabela simulada
async function atualizarOportunidadeComTabela(opportunityId, tabelaSimulada) {
  try {
    const formsdata = { f0a67ce0: tabelaSimulada, "80b68ec0": "cartos" };
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, formsdata };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    console.log(`${LOG_PREFIX()} ✅ Oportunidade ${opportunityId} atualizada com tabela ${tabelaSimulada}`);
    return true;
  } catch (err) {
    const erroCompleto = { message: err.message, data: err.response?.data };
    console.error(`${LOG_PREFIX()} ❌ Erro atualizar oportunidade ID ${opportunityId}:`, erroCompleto);
    return false;
  }
}

// 🔹 Criar oportunidade
async function criarOportunidade(cpf, telefone, valorLiberado) {
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, documentNumber: cpf, telefone, valorLiberado };
    const res = await axios.post("https://lunasdigital.atenderbem.com/int/createOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    console.log(`${LOG_PREFIX()} ✅ Oportunidade criada para CPF ${cpf} | ID: ${res.data.id}`);
    return res.data.id;
  } catch (err) {
    const erroCompleto = { message: err.message, data: err.response?.data };
    console.error(`${LOG_PREFIX()} ❌ Erro criar oportunidade CPF ${cpf}:`, erroCompleto);
    return null;
  }
}

// 🔹 Dispara fluxo no CRM
async function disparaFluxo(opportunityId) {
  if (!opportunityId) return false;
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, destStageId: DEST_STAGE_ID };
    await axios.post("https://lunasdigital.atenderbem.com/int/changeOpportunityStage", payload, { headers: { "Content-Type": "application/json" } });
    console.log(`${LOG_PREFIX()} ✅ Fluxo disparado para oportunidade ${opportunityId}`);
    return true;
  } catch (err) {
    const erroCompleto = { message: err.message, data: err.response?.data };
    console.error(`${LOG_PREFIX()} ❌ Erro ao disparar fluxo para ${opportunityId}:`, erroCompleto);
    return false;
  }
}

// 🔹 Atualizar CRM (placeholder)
async function atualizarCRM(opportunityId, valorLiberado) {
  if (!opportunityId) return false;
  try {
    // Adicione lógica CRM real se precisar
    return true;
  } catch {
    return false;
  }
}

// 🔹 Processar CPFs com tratamento correto de 429 e pendentes
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
    const cpf = normalizeCPF(registro.CPF);
    let idOriginal = (registro.ID || "").trim();
    const telefone = normalizePhone(registro.TELEFONE);
    if (!cpf) continue;

    const planilha = consultarPlanilha(cpf, telefone);
    if (planilha) {
      idOriginal = planilha.id;
      console.log(`${LOG_PREFIX()} ⚠️ Usando ID da planilha para CPF ${cpf}: ${idOriginal}`);
    } else {
      console.log(`${LOG_PREFIX()} ❌ Nenhum ID encontrado na planilha para CPF ${cpf}`);
    }

    let resultado = null;
    let providerUsed = null;
    let todasCredenciaisExauridas = false;

    // 🔹 Loop por providers
    for (const provider of ["cartos", "bms", "qi"]) {
      providerUsed = provider;

      let tentouTodosLogins = false;
      let retry429Count = 0;

      while (!tentouTodosLogins) {
        await authenticate();
        const enviado = await enviarParaFila(cpf, providerUsed);

        if (!enviado) break; // Se não conseguiu enviar, tenta próximo provider

        await delay(DELAY_MS);
        resultado = await consultarResultado(cpf, linha);

        // 🔹 Se resultado vier com erro
        if (resultado?.error) {
          // 🔹 Erro 429 (rate limit)
          if (
            resultado.error.includes("Limite de requisições") ||
            resultado.error.includes("status code 429")
          ) {
            console.log(`${LOG_PREFIX()} ⚠️ Rate limit para CPF ${cpf} no provider ${providerUsed}, trocando login...`);
            retry429Count++;
            switchCredential();
            await authenticate(true);
            await delay(DELAY_MS * 3);

            if (retry429Count >= CREDENTIALS.length) {
              console.log(`${LOG_PREFIX()} ⚠️ Todos logins esgotados para CPF ${cpf} no provider ${providerUsed}`);
              tentouTodosLogins = true;
              resultado = null; // Seta para pending
              todasCredenciaisExauridas = true;
            }
            continue; // Re-tenta com novo login
          }

          // 🔹 Erro não autorizado
          else if (
            resultado.error.includes(
              "Não foi possível consultar o saldo no momento! - Instituição Fiduciária não possui autorização do Trabalhador para Operação Fiduciária"
            )
          ) {
            console.log(`${LOG_PREFIX()} ⚠️ CPF ${cpf} não autorizado no provider ${providerUsed}`);
            resultado = null; // Forçar fallback
            break; // Vai para próximo provider
          }

          // 🔹 Outros erros
          else {
            emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: resultado.error, provider: providerUsed }, callback);
            resultado = null;
            break; // Sai do loop
          }
        } else {
          // 🔹 Sucesso no provider
          break;
        }
      }

      // 🔹 Se conseguiu resultado válido, não precisa tentar outros providers
      if (resultado?.data && resultado.data.length > 0) break;
    }

    // 🔹 Se Cartos teve sucesso e precisa simulação
    if (resultado?.data && resultado.data.length > 0 && providerUsed === "cartos") {
      const item = resultado.data[0];
      if (item.status === "success" && item.amount > 0) {
        const sim = await simularSaldo(cpf, item.id, item.periods, providerUsed);
        await delay(DELAY_MS);

        if (!sim || parseFloat(sim.availableBalance || 0) <= 0) {
          emitirResultado({ cpf, id: idOriginal, status: "sim_failed", message: "Erro simulação / Sem saldo", provider: providerUsed }, callback);
          continue;
        }

        const valorLiberado = parseFloat(sim.availableBalance || 0);

        if (!idOriginal && telefone) {
          const newId = await criarOportunidade(cpf, telefone, valorLiberado);
          idOriginal = newId || "";
        }

        if (idOriginal) await atualizarOportunidadeComTabela(idOriginal, sim.tabelaSimulada);

        if (!(await atualizarCRM(idOriginal, valorLiberado))) {
          emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro CRM", provider: providerUsed }, callback);
          continue;
        }

        await delay(DELAY_MS);

        if (!(await disparaFluxo(idOriginal))) {
          emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro disparo", provider: providerUsed }, callback);
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

        continue;
      }
    }

    // 🔹 Se todos logins deram 429 → pendente
    if (todasCredenciaisExauridas) {
      emitirResultado({
        cpf,
        id: idOriginal,
        status: "pending",
        message: "Limite de requisições excedido em todos os logins, reprocessar depois",
        provider: providerUsed || ultimoProvider
      }, callback);
      continue;
    }

    // 🔹 Nenhum provider autorizado
    if (!resultado?.data || resultado.data.length === 0) {
      emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: "❌ Sem autorização em nenhum provider", provider: providerUsed || ultimoProvider }, callback);
    }
  }
}

// 🔹 Exporta funções
export { processarCPFs, disparaFluxo, authenticate, atualizarOportunidadeComTabela, criarOportunidade };
