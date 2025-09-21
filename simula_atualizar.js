import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

// ---------- Configurações ----------
const CSV_FILE = process.env.CSV_FILE || "cpfs_resultado.csv"; 
const OUTPUT_FILE = process.env.OUTPUT_FILE || "cpfs_resultado_atualizado.csv";
const DELAY_MS = 800;
const SIMULATION_FEES_ID = process.env.SIMULATION_FEES_ID;
const PROVIDER = process.env.PROVIDER || "cartos";

// CRM
const QUEUE_ID = process.env.QUEUE_ID || 25;
const API_CRM_KEY = process.env.LUNAS_API_KEY;
const DEST_STAGE_ID = process.env.DEST_STAGE_ID || 4;

// Credenciais (usa sempre login 3)
const CREDENTIALS = [
  { username: process.env.FGTS_LOGIN_3, password: process.env.FGTS_PASS_3 }
];

let TOKEN = null;
const LOG_PREFIX = () => `[${new Date().toISOString()}]`;
const delay = ms => new Promise(r => setTimeout(r, ms));

// ---------- Funções auxiliares ----------
function formatValorCRM(valor) {
  if (valor == null) return 0.0;
  const num = parseFloat(valor.toString().replace(",", "."));
  return Number(num.toFixed(2));
}

function deveManterPendentes(mensagem) {
  if (!mensagem) return false;
  const msg = mensagem.toLowerCase();
  return (
    msg.includes("limite de requisições excedido") ||
    msg.includes("erro de consulta")
  );
}

async function authenticate() {
  const cred = CREDENTIALS[0];
  try {
    console.log(`${LOG_PREFIX()} Tentando autenticar: ${cred.username}`);
    const data = qs.stringify({
      grant_type: "password",
      username: cred.username,
      password: cred.password,
      audience: "https://bff.v8sistema.com",
      scope: "offline_access",
      client_id: "DHWogdaYmEI8n5bwwxPDzulMlSK7dwIn",
    });

    const res = await axios.post(
      "https://auth.v8sistema.com/oauth/token",
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    TOKEN = res.data.access_token;
    console.log(`${LOG_PREFIX()} ✅ Autenticado com sucesso - ${cred.username}`);
  } catch (err) {
    console.log(`${LOG_PREFIX()} ❌ Erro ao autenticar ${cred.username}:`, err.message);
    throw err;
  }
}

// ---------- Disparo WhatsApp ----------
async function disparaFluxo(id) {
  console.log(`📤 Disparando fluxo WhatsApp para ID: ${id}...`);
  try {
    const res = await axios.post(
      "https://lunasdigital.atenderbem.com/int/changeOpportunityStage",
      { queueId: QUEUE_ID, apiKey: API_CRM_KEY, id, destStageId: DEST_STAGE_ID },
      { headers: { "Content-Type": "application/json" } }
    );
    console.log(`✅ Disparo realizado para ID ${id}:`, res.data);
    return true;
  } catch (err) {
    console.error(`❌ Erro ao disparar ID ${id}:`, err.response?.data || err.message);
    return false;
  }
}

// ---------- Processamento ----------
async function processarCPFs() {
  const csvContent = fs.readFileSync(CSV_FILE, "utf-8");
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });

  console.log(`${LOG_PREFIX()} Iniciando processamento de ${registros.length} CPFs`);

  const pendentes = [];
  const removidos = [];

  for (let [index, registro] of registros.entries()) {
    const linha = index + 2;
    const cpf = (registro.CPF || "").trim();
    const idOriginal = (registro.ID || "").trim();

    if (!cpf) {
      registro.ERRO = "CPF vazio";
      console.log(`${LOG_PREFIX()} ⚠️ [Linha ${linha}] CPF vazio`);
      removidos.push(registro);
      continue;
    }

    // ---------- Consulta resultado ----------
    let resultado;
    try {
      const res = await axios.get(
        `https://bff.v8sistema.com/fgts/balance?search=${cpf}`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      resultado = res.data.data?.[0];
      console.log(`${LOG_PREFIX()} 📥 [Linha ${linha}] Retorno API balance CPF ${cpf}:`, JSON.stringify(res.data));
    } catch (err) {
      const mensagemErro = err.response?.data?.message || err.message;
      registro.ERRO = mensagemErro;
      console.log(`${LOG_PREFIX()} ❌ [Linha ${linha}] Erro ao consultar CPF ${cpf}:`, mensagemErro);

      if (deveManterPendentes(mensagemErro)) {
        pendentes.push(registro);
      } else {
        removidos.push(registro);
      }
      continue;
    }

    if (!resultado || resultado.status !== "success") {
      registro.ERRO = resultado?.statusInfo || "Não retornou simulação válida";
      console.log(`${LOG_PREFIX()} ⚠️ [Linha ${linha}] CPF ${cpf} não retornou simulação válida`);
      removidos.push(registro);
      continue;
    }

    // ---------- Simulação ----------
    const desiredInstallments = (resultado.periods || []).map(p => ({
      totalAmount: p.amount,
      dueDate: p.dueDate,
    }));

    const payload = {
      simulationFeesId: SIMULATION_FEES_ID,
      balanceId: resultado.id,
      targetAmount: 0,
      documentNumber: resultado.documentNumber,
      desiredInstallments,
      provider: PROVIDER,
    };

    let sim;
    try {
      const resSim = await axios.post(
        "https://bff.v8sistema.com/fgts/simulations",
        payload,
        { headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } }
      );
      sim = resSim.data;
      console.log(`${LOG_PREFIX()} 📥 [Linha ${linha}] Retorno API simulation CPF ${cpf}:`, JSON.stringify(sim));
    } catch (err) {
      const mensagemErro = err.response?.data?.error || err.message;
      registro.ERRO = mensagemErro;
      console.log(`${LOG_PREFIX()} ❌ [Linha ${linha}] Erro ao simular CPF ${cpf}: ${mensagemErro}`);

      if (deveManterPendentes(mensagemErro)) {
        pendentes.push(registro);
      } else {
        removidos.push(registro);
      }
      continue;
    }

    if (!sim) {
      registro.ERRO = "Simulação retornou vazia";
      console.log(`${LOG_PREFIX()} ⚠️ [Linha ${linha}] Simulação vazia CPF ${cpf}`);
      removidos.push(registro);
      continue;
    }

    registro.SALDO = sim.emissionAmount?.toFixed(2).replace(".", ",") || "0,00";
    registro["VALOR LIBERADO"] = sim.availableBalance?.toFixed(2).replace(".", ",") || "0,00";
    registro.ERRO = "";

    // ---------- Atualiza CRM ----------
    let crmAtualizado = false;
    try {
      const crmPayload = {
        queueId: QUEUE_ID,
        apiKey: API_CRM_KEY,
        id: idOriginal,
        value: formatValorCRM(registro["VALOR LIBERADO"])
      };

      await axios.post(
        "https://lunasdigital.atenderbem.com/int/updateOpportunity",
        crmPayload,
        { headers: { "Content-Type": "application/json" } }
      );

      console.log(`${LOG_PREFIX()} 🔄 [Linha ${linha}] Atualizado no CRM ID ${idOriginal} | VALUE: ${crmPayload.value}`);
      crmAtualizado = true;
    } catch (err) {
      const mensagemErro = err.response?.data || err.message;
      console.log(`${LOG_PREFIX()} ❌ [Linha ${linha}] Erro ao atualizar CRM ID ${idOriginal}:`, mensagemErro);

      if (deveManterPendentes(mensagemErro)) {
        pendentes.push(registro);
      } else {
        removidos.push(registro);
      }
      continue;
    }

    // ---------- Disparo WhatsApp ----------
    const valorLiberado = parseFloat((registro["VALOR LIBERADO"] || "0").replace(",", "."));
    if (idOriginal && valorLiberado > 1 && crmAtualizado) {
      const disparoOK = await disparaFluxo(idOriginal);
      if (disparoOK) {
        removidos.push(registro); // foi disparado com sucesso -> removido
      } else {
        pendentes.push(registro); // erro no disparo -> mantém
      }
    } else {
      console.log(`${LOG_PREFIX()} ℹ️ ID ${idOriginal} não disparado. VALOR LIBERADO: ${valorLiberado} | CRM Atualizado: ${crmAtualizado}`);
      removidos.push(registro);
    }

    await delay(DELAY_MS);
  }

  // ---------- Atualiza planilhas ----------
  const pendentesCsv = stringify(pendentes, { header: true, delimiter: ";" });
  fs.writeFileSync(CSV_FILE, pendentesCsv);

  const removidosCsv = stringify(removidos, { header: true, delimiter: ";" });
  fs.writeFileSync(OUTPUT_FILE, removidosCsv);

  console.log(`${LOG_PREFIX()} ✅ Processamento finalizado. Pendentes atualizados em '${CSV_FILE}', removidos salvos em '${OUTPUT_FILE}'`);
}

// ---------- Execução ----------
(async () => {
  try {
    await authenticate();
    if (TOKEN) await processarCPFs();
  } catch (err) {
    console.error(`${LOG_PREFIX()} ❌ Erro crítico:`, err.message);
  }
})();
