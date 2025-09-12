import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { mapBeneficio } from "./beneficios.js";

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY não definida. Configure no Render.");
  throw new Error("OPENAI_API_KEY ausente");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ================== Helpers ==================
const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_DIAS_PADRAO = 14;

function agendarExclusaoDias(dias, ...paths) {
  const wait = dias * DAY_MS;
  setTimeout(() => {
    for (const p of paths) {
      try {
        if (p && fs.existsSync(p)) {
          fs.unlinkSync(p);
          console.log("🗑️ Removido após", dias, "dias:", p);
        }
      } catch (e) {
        console.warn("Falha ao excluir", p, e.message);
      }
    }
  }, wait);
}

function cacheValido(p, ttlMs) {
  try {
    const st = fs.statSync(p);
    return Date.now() - st.mtimeMs <= (ttlMs ?? TTL_DIAS_PADRAO * DAY_MS);
  } catch {
    return false;
  }
}

function normalizarNB(nb) {
  if (!nb) return "";
  return String(nb).replace(/\D/g, "");
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  let s = v.toString().replace(/[^\d.,-]/g, "").trim();
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  return parseFloat(s) || 0;
}

function formatBRNumber(n) {
  return Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPercentBRFromDecimal(dec) {
  return Number(dec * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function diffMeses(inicioMMYYYY, fimMMYYYY) {
  const [mi, ai] = (inicioMMYYYY || "01/1900").split("/").map(Number);
  const [mf, af] = (fimMMYYYY || "01/1900").split("/").map(Number);
  return (af - ai) * 12 + (mf - mi);
}

function getCompetenciaAtual(dataExtratoDDMMYYYY) {
  if (!dataExtratoDDMMYYYY) {
    const hoje = new Date();
    return `${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  }
  const [dd, mm, yyyy] = dataExtratoDDMMYYYY.split("/");
  return `${mm}/${yyyy}`;
}

// ================== Detectar contingência ==================
function detectarContingencia(filePath) {
  try {
    const txt = fs.readFileSync(filePath, "utf-8");
    return txt.includes("OffLine") || txt.includes("Demonstrativo de Empréstimos Consignados - OffLine");
  } catch {
    return false;
  }
}

// ================== Taxa helpers ==================
function calcTaxaMensalPorBissecao(valorLiberado, valorParcela, prazo) {
  const PV = toNumber(valorLiberado);
  const PMT = toNumber(valorParcela);
  const n = parseInt(prazo || 0, 10);

  if (!(PV > 0 && PMT > 0 && n > 0)) {
    return { ok: false, r: 0, motivo: "entrada_invalida" };
  }
  if (PMT <= PV / n + 1e-9) {
    return { ok: false, r: 0, motivo: "pagamento_insuficiente" };
  }

  const f = (r) => {
    if (r === 0) return PV - PMT * n;
    return PV - PMT * (1 - Math.pow(1 + r, -n)) / r;
  };

  let lo = 0.0;
  let hi = 0.5;
  let flo = f(lo);
  let fhi = f(hi);

  let exp = 0;
  while (flo * fhi > 0 && hi < 5 && exp < 20) {
    hi *= 2;
    fhi = f(hi);
    exp++;
  }
  if (flo * fhi > 0) {
    return { ok: false, r: 0, motivo: "nao_branqueado" };
  }

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-12) {
      return { ok: true, r: mid };
    }
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return { ok: true, r: (lo + hi) / 2 };
}

function taxaAnualDeMensal(rMensal) {
  if (!isFinite(rMensal) || rMensal <= 0) return 0;
  return Math.pow(1 + rMensal, 12) - 1;
}

// ================== Sanitização da resposta ==================
function extractJsonFromText(raw) {
  if (!raw || typeof raw !== "string") throw new Error("Resposta do GPT vazia ou não textual.");

  let s = raw.replace(/^\uFEFF/, "").trim();

  // 1) procura ```json ... ```
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) return fenced[1].trim();

  // 2) remove fences avulsos
  s = s.replace(/```(?:json)?/ig, "").replace(/```/g, "").trim();

  // 3) extrai primeiro objeto
  const firstObj = s.indexOf("{");
  const lastObj = s.lastIndexOf("}");
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    return s.slice(firstObj, lastObj + 1).trim();
  }

  // 4) extrai array
  const firstArr = s.indexOf("[");
  const lastArr = s.lastIndexOf("]");
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    return s.slice(firstArr, lastArr + 1).trim();
  }

  throw new Error("Não foi possível localizar um JSON válido na resposta do GPT.");
}

// ================== Prompt ==================
function buildPrompt(isContingencia = false) {
  let base = `
Você é um assistente que extrai **somente os empréstimos consignados ativos** de um extrato e retorna **JSON válido**.

⚠️ Regras:
- Retorne SOMENTE JSON.
- Inclua todos os contratos ativos (exceto RMC/RCC).
- Valores dentro de contratos devem vir crus (sem formatação BR).
- O nome do benefício deve vir exatamente como está no documento.
- Se não houver valores, use null ou 0.
- Não invente chaves diferentes, siga o esquema fielmente.

⚠️ Para extratos de CONTINGÊNCIA:
- Use exatamente o valor da coluna TAXA como taxa_juros_mensal.
- CET mensal e CET anual podem ser iguais à taxa ou 0.
- IOF deve receber o valor da taxa_juros_mensal.
- NÃO tente recalcular nenhuma taxa.

IMPORTANTE: RESPOSTA EM JSON PURO. NÃO use markdown, não inclua crases (\`\`\`), nem texto explicativo.
`;

  if (isContingencia) {
    base += `
⚠️ Este extrato é de CONTINGÊNCIA (OffLine).
Inclua no JSON: "origem": "CONTINGENCIA".
`;
  } else {
    base += `
⚠️ Este extrato é do INSS oficial.
Inclua no JSON: "origem": "INSS".
`;
  }

  return base + `
Esquema esperado:
{
  "origem": "INSS|CONTINGENCIA",
  "cliente": "Nome exato",
  "beneficio": {
    "nb": "string",
    "bloqueio_beneficio": "SIM|NAO",
    "meio_pagamento": "string",
    "banco_pagamento": "string",
    "agencia": "string",
    "conta": "string",
    "nomeBeneficio": "string",
    "codigoBeneficio": null
  },
  "margens": {
    "margem_extrapolada": 0,
    "margem_disponivel_empretimo": 0,
    "margem_disponivel_rmc": 0,
    "margem_disponivel_rcc": 0
  },
  "contratos": [
    {
      "contrato": "string",
      "banco": "string",
      "situacao": "ATIVO",
      "data_inclusao": "DD/MM/AAAA",
      "competencia_inicio_desconto": "MM/AAAA",
      "qtde_parcelas": 0,
      "valor_parcela": 0,
      "valor_liberado": 0,
      "iof": 0,
      "cet_mensal": 0,
      "cet_anual": 0,
      "taxa_juros_mensal": 0,
      "taxa_juros_anual": 0,
      "valor_pago": 0
    }
  ],
  "data_extrato": "DD/MM/AAAA"
}
`;
}

// ================== GPT Call ==================
async function gptExtrairJSON(pdfPath, isContingencia) {
  console.log("🧠 [GPT] Iniciando leitura do arquivo…");

  const uploaded = await openai.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants"
  });

  console.log("📄 [GPT] Upload concluído. File ID:", uploaded.id);
  console.log("🤖 [GPT] Solicitando extração...");

  let response;
  try {
    response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: buildPrompt(isContingencia) },
            { type: "input_file", file_id: uploaded.id }
          ]
        }
      ]
    });
  } catch (err) {
    console.warn("⚠️ Falha no gpt-4.1-mini, tentando fallback gpt-4o-mini");
    response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: buildPrompt(isContingencia) },
            { type: "input_file", file_id: uploaded.id }
          ]
        }
      ]
    });
  }

  console.log("✅ [GPT] Resposta recebida.");
  const raw = response.output_text;

  let parsed;
  try {
    const jsonText = extractJsonFromText(raw);
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error("❌ Erro ao parsear resposta do GPT:", err.message);
    console.error(">>> Preview da resposta (1000 chars):\n", (raw || "").slice(0, 1000));
    throw new Error("Resposta inválida do GPT: " + err.message);
  }

  return parsed;
}

// ================== Pós-processamento ==================
function posProcessar(parsed, isContingencia) {
  if (!parsed) parsed = {};
  if (!parsed.beneficio) parsed.beneficio = {};

  if (!parsed.origem) {
    parsed.origem = isContingencia ? "CONTINGENCIA" : "INSS";
  }

  let nb = normalizarNB(parsed.beneficio.nb || "");
  if (nb.length < 10) nb = "";
  parsed.beneficio.nb = nb;

  const mapped = mapBeneficio(parsed.beneficio.nomeBeneficio || "");
  parsed.beneficio.codigoBeneficio = mapped?.codigo ?? null;

  if (!Array.isArray(parsed.contratos)) parsed.contratos = [];
  const competenciaAtual = getCompetenciaAtual(parsed.data_extrato);

  parsed.contratos = parsed.contratos
    .filter((c) => (String(c.situacao || "").toUpperCase() === "ATIVO"))
    .map((c) => {
      const prazoTotal = parseInt(c.qtde_parcelas || 0, 10);
      let parcelasPagas = 0;
      let prazoRestante = prazoTotal;

      if (c.competencia_inicio_desconto && prazoTotal > 0) {
        parcelasPagas = diffMeses(c.competencia_inicio_desconto, competenciaAtual);
        if (parcelasPagas < 0) parcelasPagas = 0;
        if (parcelasPagas > prazoTotal) parcelasPagas = prazoTotal;
        prazoRestante = prazoTotal - parcelasPagas;
      }

      const parcelaNum = toNumber(c.valor_parcela);
      const liberadoNum = toNumber(c.valor_liberado);

      let taxaMensalNum = toNumber(c.taxa_juros_mensal);
      let statusTaxa = c.status_taxa || "INFORMADA";

      if (!(taxaMensalNum > 0 && taxaMensalNum < 0.1)) {
        const out = calcTaxaMensalPorBissecao(liberadoNum, parcelaNum, prazoTotal);
        if (out.ok) {
          taxaMensalNum = out.r;
          statusTaxa = "RECALCULADA";
        } else {
          taxaMensalNum = 0;
          statusTaxa = "FALHA_CALCULO_TAXA";
          console.warn("⚠️ Falha ao calcular taxa (motivo:", out.motivo, ") contrato:", c.contrato);
        }
      } else {
  // CONTINGÊNCIA
  taxaMensalNum = toNumber(c.taxa_juros_mensal);
  statusTaxa = "INFORMADA_CONTINGENCIA";
  // IOF recebe mesma taxa
  c.iof = taxaMensalNum;
}
      const taxaAnualNum = taxaAnualDeMensal(taxaMensalNum);

      return {
        ...c,
        valor_parcela: formatBRNumber(parcelaNum),
        valor_liberado: formatBRNumber(liberadoNum),
        valor_pago: formatBRNumber(toNumber(c.valor_pago)),
        iof: formatBRNumber(toNumber(c.iof)),
        cet_mensal: formatPercentBRFromDecimal(toNumber(c.cet_mensal)),
        cet_anual: formatPercentBRFromDecimal(toNumber(c.cet_anual)),
        taxa_juros_mensal: formatPercentBRFromDecimal(taxaMensalNum),
        taxa_juros_anual: formatPercentBRFromDecimal(taxaAnualNum),
        status_taxa: statusTaxa,
        prazo_total: prazoTotal,
        parcelas_pagas: parcelasPagas,
        prazo_restante: prazoRestante
      };
    });

  parsed.margens = {
    margem_extrapolada: formatBRNumber(toNumber(parsed.margens?.margem_extrapolada)),
    margem_disponivel_empretimo: formatBRNumber(toNumber(parsed.margens?.margem_disponivel_empretimo)),
    margem_disponivel_rmc: formatBRNumber(toNumber(parsed.margens?.margem_disponivel_rmc)),
    margem_disponivel_rcc: formatBRNumber(toNumber(parsed.margens?.margem_disponivel_rcc))
  };

  return parsed;
}

// ================== Upload Flow ==================
export async function extrairDeUpload({ fileId, pdfPath, jsonDir, ttlMs }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

  if (fs.existsSync(jsonPath) && cacheValido(jsonPath, ttlMs)) {
    console.log("♻️ Usando JSON cacheado válido em", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração de upload:", fileId);
  await fsp.mkdir(jsonDir, { recursive: true });

  const isContingencia = detectarContingencia(pdfPath);
  const parsed = await gptExtrairJSON(pdfPath, isContingencia);
  const json = posProcessar(parsed, isContingencia);

  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);

  agendarExclusaoDias(TTL_DIAS_PADRAO, pdfPath, jsonPath);

  return { fileId, ...json };
}
