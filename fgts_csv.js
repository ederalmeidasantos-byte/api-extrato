// fgts_csv.js
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
  // Console com prefixo RESULT para backend encaminhar por socket
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
    // tenta próxima credencial
    switchCredential();
    return authenticate();
  }
}

// 🔹 Consultar resultado (erro completo + retry básico dentro da função)
async function consultarResultado(cpf) {
  try {
    await authenticate();
    const res = await axios.get(`https://bff.v8sistema.com/fgts/balance?search=${cpf}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 20000
    });
    return { success: true, data: res.data };
  } catch (err) {
    const erroCompleto = {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    };
    return { success: false, error: err.message, errorDetails: erroCompleto };
  }
}

// 🔹 Wrapper que tenta consultarResultado com trocas de credencial em 429
async function consultarResultadoComRetries(cpf, maxAttempts = null) {
  const attemptsLimit = maxAttempts || CREDENTIALS.length;
  let attempts = 0;
  while (attempts < attemptsLimit) {
    const res = await consultarResultado(cpf);
    if (res.success) {
      // retorna o objeto real da API
      return { type: "ok", payload: res.data };
    } else {
      const ed = res.errorDetails || {};
      // Prioriza 401 -> reautenticar e tentar
      if (ed.status === 401) {
        console.log(`${LOG_PREFIX()} ⚠️ Token inválido, reautenticando...`);
        await authenticate(true);
        attempts++;
        continue;
      }
      // 429 -> trocar login e tentar
      if (ed.status === 429 || (ed.data && (String(ed.data).includes("Limite de requisições") || String(ed.message).includes("Limite de requisições")))) {
        console.log(`${LOG_PREFIX()} ⚠️ Rate limit na consulta, trocando credencial e re-tentando...`);
        switchCredential();
        await authenticate(true);
        attempts++;
        await delay(DELAY_MS * 2);
        continue;
      }
      // outros erros -> retorna erro para o chamador analisar
      return { type: "error", payload: res.errorDetails || res.error };
    }
  }
  // se esgotou tentativas
  return { type: "pending429", payload: { message: "Limite de requisições em todos os logins (consulta)" } };
}

// 🔹 Enviar para fila com provider (tratamento 429 + retry 500/timeout)
async function enviarParaFila(cpf, provider) {
  ultimoProvider = provider;
  let retryCount = 0;
  const maxRetries = 3; // para 500/timeout
  let credRotationCount = 0;

  while (true) {
    await authenticate();
    try {
      await axios.post(
        "https://bff.v8sistema.com/fgts/balance",
        { documentNumber: cpf, provider },
        { headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 20000 }
      );
      return { ok: true };
    } catch (err) {
      const erroCompleto = {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      };
      console.log(`${LOG_PREFIX()} ❌ Erro enviar para fila CPF ${cpf} | Provider: ${provider}:`, erroCompleto);

      // 429 -> trocar credencial e tentar, se esgotarem todas credenciais -> sinalizar pending429
      if (erroCompleto.status === 429 || (err.response?.data?.message || "").includes("Limite de requisições")) {
        credRotationCount++;
        console.log(`${LOG_PREFIX()} ⚠️ Rate limit detectado (fila) — tentativa de rotação de credencial ${credRotationCount}/${CREDENTIALS.length}`);
        if (credRotationCount >= CREDENTIALS.length) {
          console.log(`${LOG_PREFIX()} ⚠️ Todos logins esgotados para CPF ${cpf} no provider ${provider} (fila)` );
          return { ok: false, pending429: true, errorDetails: erroCompleto };
        }
        switchCredential();
        await authenticate(true);
        await delay(DELAY_MS * 2);
        continue;
      }

      // 500 / timeout -> retry algumas vezes
      if (erroCompleto.status === 500 || String(err.message).toLowerCase().includes("timeout")) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.log(`${LOG_PREFIX()} ⚠️ Erro 500/timeout persistente (${retryCount} tentativas), abortando envio para provider ${provider}`);
          return { ok: false, errorDetails: erroCompleto };
        }
        console.log(`${LOG_PREFIX()} ⚠️ Tentativa ${retryCount}/${maxRetries} para CPF ${cpf} no provider ${provider} (500/timeout)`);
        await delay(DELAY_MS * 2);
        continue;
      }

      // outros erros -> não tentar mais nesse provider
      return { ok: false, errorDetails: erroCompleto };
    }
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
    // usar credencial específica para simulação (srcor1) se existir
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
        timeout: 20000
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

// 🔹 Atualizar CRM (campo valor)
async function atualizarCRM(opportunityId, valor) {
  if (!opportunityId) return false;
  try {
    const payload = { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id: opportunityId, value: valor };
    await axios.post("https://lunasdigital.atenderbem.com/int/updateOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    console.log(`${LOG_PREFIX()} ✅ CRM atualizado para oportunidade ${opportunityId} com valor ${valor}`);
    return true;
  } catch (err) {
    const erroCompleto = { message: err.message, data: err.response?.data };
    console.error(`${LOG_PREFIX()} ❌ Erro atualizar CRM ${opportunityId}:`, erroCompleto);
    return false;
  }
}

// 🔹 Criar oportunidade (payload completo - preserva fluxo existente)
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
    const res = await axios.post("https://lunasdigital.atenderbem.com/int/createOpportunity", payload, { headers: { "Content-Type": "application/json" } });
    console.log(`${LOG_PREFIX()} ✅ Oportunidade criada para ${cpf}:`, res.data);
    return res.data?.id || null;
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

// 🔹 Processar CPFs com tratamento correto de 429, 500 e pendentes
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

  const totalCount = registros.length;
  let processedCount = 0;

  console.log(`${LOG_PREFIX()} Iniciando processamento de ${totalCount} CPFs`);

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

    let resultadoPayload = null;
    let providerUsed = null;
    let todasCredenciaisExauridas = false;
    let emitted = false;

    // 🔹 Loop por providers (cartos primeiro)
    for (const provider of PROVIDERS) {
      providerUsed = provider;

      // Envia para fila, com tratamento de 429/500/timeout
      const filaRes = await enviarParaFila(cpf, providerUsed);

      if (filaRes.pending429) {
        todasCredenciaisExauridas = true;
        console.log(`${LOG_PREFIX()} ⚠️ pending429 detectado ao enviar para provider ${providerUsed} | CPF ${cpf}`);
        break;
      }

      if (!filaRes.ok) {
        // erro não relacionado a 429/timeout -> tenta próximo provider
        console.log(`${LOG_PREFIX()} ⚠️ Não foi possível enviar para provider ${providerUsed} (não ok) — tentando próximo provider para CPF ${cpf}`);
        continue;
      }

      // deu OK ao enviar, aguarda um pouco e consulta resultado (com retries em 429)
      await delay(DELAY_MS);
      const consultaRes = await consultarResultadoComRetries(cpf);

      if (consultaRes.type === "pending429") {
        // todas credenciais esgotadas na consulta
        todasCredenciaisExauridas = true;
        console.log(`${LOG_PREFIX()} ⚠️ pending429 detectado na consulta para provider ${providerUsed} | CPF ${cpf}`);
        break;
      }

      if (consultaRes.type === "error") {
        // Erro na consulta (não 429) -> se indicar "não autorizado", tentamos fallback provider
        const errPayload = consultaRes.payload;
        const errMsg = JSON.stringify(errPayload);
        if (String(errMsg).includes("não possui autorização") || String(errMsg).toLowerCase().includes("autorização")) {
          console.log(`${LOG_PREFIX()} ⚠️ CPF ${cpf} não autorizado no provider ${providerUsed} (consulta) — tentando próximo provider`);
          // força tentar próximo provider (bms -> qi behavior)
          continue;
        } else {
          // Erro diferente -> emitir no UI e tentar próximo provider
          emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: errMsg, provider: providerUsed, error: errPayload }, callback);
          emitted = true;
          break;
        }
      }

      // consulta ok
      resultadoPayload = consultaRes.payload;
      // log do retorno completo como pedido
      console.log(`${LOG_PREFIX()} 📦 [Linha ${linha}] Retorno completo da API (provider ${providerUsed}): ${JSON.stringify(resultadoPayload)}`);

      // se chegou até aqui, temos dados no resultado (ou array vazio)
      if (resultadoPayload?.data && resultadoPayload.data.length > 0) {
        const item = resultadoPayload.data[0];

        // pending (API retornou pending) -> marcar pendente para reprocessar
        if (item.status === "pending") {
          console.log(`${LOG_PREFIX()} ⏳ CPF ${cpf} retornou PENDING no provider ${providerUsed} — será colocado na lista de pendentes`);
          emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Pending API", provider: providerUsed, apiResponse: item }, callback);
          emitted = true;
          break; // não tentar outros providers para este CPF
        }

        // success com valor positivo
        if (item.status === "success" && parseFloat(item.amount || 0) > 0) {
          // Se for Cartos -> simular e workflow completo
          if (providerUsed === "cartos") {
            console.log(`${LOG_PREFIX()} ✅ CPF ${cpf} sucesso no Cartos com valor ${item.amount} — iniciando simulação e workflow`);
            // simular
            const sim = await simularSaldo(cpf, item.id, item.periods, providerUsed);
            await delay(DELAY_MS);

            if (!sim || parseFloat(sim.availableBalance || 0) <= 0) {
              console.log(`${LOG_PREFIX()} ⚠️ Simulação falhou ou saldo zero para CPF ${cpf} (Cartos)`);
              emitirResultado({ cpf, id: idOriginal, status: "sim_failed", message: "Erro simulação / Sem saldo", provider: providerUsed, apiResponse: item }, callback);
              emitted = true;
              break; // passou para próximo CPF
            }

            const valorLiberado = parseFloat(sim.availableBalance || 0);

            // criar oportunidade se não existir ID
            if (!idOriginal && telefone) {
              console.log(`${LOG_PREFIX()} 🔨 Criando oportunidade para CPF ${cpf} (valor ${valorLiberado})`);
              const newId = await criarOportunidade(cpf, telefone, valorLiberado);
              if (newId) {
                console.log(`${LOG_PREFIX()} ✅ Oportunidade criada: ${newId} para CPF ${cpf}`);
                idOriginal = newId;
              } else {
                console.log(`${LOG_PREFIX()} ❌ Falha ao criar oportunidade para CPF ${cpf}`);
              }
            }

            // atualizar oportunidade com tabela simulada
            if (idOriginal) {
              const updOk = await atualizarOportunidadeComTabela(idOriginal, sim.tabelaSimulada);
              if (!updOk) {
                console.log(`${LOG_PREFIX()} ❌ Falha ao atualizar oportunidade ${idOriginal} com tabela ${sim.tabelaSimulada}`);
              } else {
                console.log(`${LOG_PREFIX()} ✅ Oportunidade ${idOriginal} atualizada com tabela ${sim.tabelaSimulada}`);
              }
            }

            // atualizar campo valor no CRM (opcional)
            if (idOriginal) {
              const crmOk = await atualizarCRM(idOriginal, valorLiberado);
              if (!crmOk) {
                console.log(`${LOG_PREFIX()} ❌ Falha ao atualizar CRM para ${idOriginal}`);
                emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro CRM", provider: providerUsed }, callback);
                emitted = true;
                break;
              } else {
                console.log(`${LOG_PREFIX()} ✅ CRM atualizado para ${idOriginal} com valor ${valorLiberado}`);
              }
            }

            // disparar fluxo
            if (idOriginal) {
              const flowOk = await disparaFluxo(idOriginal);
              if (!flowOk) {
                console.log(`${LOG_PREFIX()} ❌ Erro disparo fluxo ID ${idOriginal}`);
                emitirResultado({ cpf, id: idOriginal, status: "pending", message: "Erro disparo", provider: providerUsed }, callback);
                emitted = true;
                break;
              } else {
                console.log(`${LOG_PREFIX()} ✅ Fluxo disparado para oportunidade ${idOriginal}`);
              }
            }

            // emitir sucesso final
            emitirResultado({
              cpf,
              id: idOriginal,
              status: "success",
              message: `Finalizado | Saldo: ${item.amount} | Liberado: ${valorLiberado}`,
              valorLiberado,
              provider: providerUsed,
              apiResponse: item
            }, callback);

            emitted = true;
            break; // CPF concluído
          } else {
            // Se sucesso em BMS/QI — não simular nem atualizar oportunidade, mas marcar sucesso
            console.log(`${LOG_PREFIX()} ✅ CPF ${cpf} sucesso no provider ${providerUsed} (fallback) — marcando sucesso sem simulação`);
            emitirResultado({
              cpf,
              id: idOriginal,
              status: "success",
              message: `Sucesso no provider ${providerUsed}, sem simulação`,
              provider: providerUsed,
              apiResponse: item
            }, callback);
            emitted = true;
            break; // CPF concluído
          }
        }

        // erro de autorização explícita (status === 'error' com info)
        if (item.status === "error" && item.statusInfo && item.statusInfo.toLowerCase().includes("autorização")) {
          console.log(`${LOG_PREFIX()} ⚠️ CPF ${cpf} retornou erro de autorização no provider ${providerUsed} — tentando próximo provider`);
          // tenta próximo provider (bms -> qi)
          resultadoPayload = null;
          continue;
        }
      } else {
        // se a API retornou array vazio ou nenhum dado, considera como não autorizado/sem dados
        console.log(`${LOG_PREFIX()} ❌ Sem dados retornados para CPF ${cpf} no provider ${providerUsed}`);
        // tenta próximo provider
        continue;
      }
    } // fim loop providers

    // Se exauriu todas credenciais devido a 429
    if (todasCredenciaisExauridas) {
      emitirResultado({
        cpf,
        id: idOriginal,
        status: "pending",
        message: "Limite de requisições excedido em todos os logins, reprocessar depois",
        provider: providerUsed || ultimoProvider
      }, callback);
      processedCount++;
      const pct = Math.round((processedCount / totalCount) * 100);
      emitirResultado({ status: "progress", percentage: pct, processed: processedCount, total: totalCount }, callback);
      continue;
    }

    // Se não emitiu nada (nenhum provider deu resultado válido)
    if (!emitted) {
      emitirResultado({ cpf, id: idOriginal, status: "no_auth", message: "❌ Sem autorização em nenhum provider", provider: providerUsed || ultimoProvider }, callback);
    }

    // progresso
    processedCount++;
    const pct = Math.round((processedCount / totalCount) * 100);
    emitirResultado({ status: "progress", percentage: pct, processed: processedCount, total: totalCount }, callback);
  } // fim for registros

  console.log(`${LOG_PREFIX()} ✅ Processamento finalizado. Total: ${totalCount}`);
}

// 🔹 Exporta funções
export { processarCPFs, disparaFluxo, authenticate, atualizarOportunidadeComTabela, criarOportunidade };
