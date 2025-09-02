import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import pkg from "pdf-parse-fixed";
const pdfParse = pkg;
import OpenAI from "openai";
import { mapBeneficio } from "./beneficios.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const LUNAS_API_URL = process.env.LUNAS_API_URL || "https://lunasdigital.atenderbem.com/int/downloadFile";
const LUNAS_API_KEY = process.env.LUNAS_API_KEY;
const LUNAS_QUEUE_ID = process.env.LUNAS_QUEUE_ID;

// ============ Helpers comuns ============
function agendarExclusao24h(...paths) {
  const DAY = 24 * 60 * 60 * 1000;
  setTimeout(() => {
    for (const p of paths) {
      try {
        if (p && fs.existsSync(p)) {
          fs.unlinkSync(p);
          console.log("🗑️ Removido após 24h:", p);
        }
      } catch (e) {
        console.warn("Falha ao excluir", p, e.message);
      }
    }
  }, DAY);
}

function normalizarNB(nb) {
  if (!nb) return "";
  return String(nb).replace(/\D/g, "");
}

// Converte strings tipo "R$ 1.518,00", "1.518,00", "0,20", "27.98" → número
function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = v.toString().replace(/[R$\s%]/g, "").trim();
  if (s === "") return 0;
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// Número → "pt-BR" com 2 casas (sempre string formatada)
function fmtBR(n) {
  return Number(n || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ============ Parsers de MARGENS a partir do texto do PDF ============
function extrairMargensDoTexto(texto) {
  const t = texto.replace(/\s+/g, " "); // lineariza (ajuda no regex)
  const moeda = "R?\\$?\\s*([0-9]{1,3}(?:[\\.,][0-9]{3})*[\\.,][0-9]{2}|[0-9]+,[0-9]{2})";

  // 1) MARGEM EXTRAPOLADA (primeiro quadro – “VALORES DO BENEFÍCIO”)
  let extrap = "0,00";
  const rxExtr = new RegExp(`MARGEM\\s+EXTRAPOLADA\\*{0,3}\\s*${moeda}`, "i");
  const mExtr = t.match(rxExtr);
  if (mExtr) extrap = fmtBR(toNumber(mExtr[1]));

  // 2) “VALORES POR MODALIDADE” → linha “MARGEM DISPONÍVEL”
  // Vamos capturar os 3 primeiros valores monetários que aparecem após o rótulo:
  //   [Empréstimos] [RMC] [RCC]
  let dispEmp = "0,00", dispRmc = "0,00", dispRcc = "0,00";
  const rxDispLinha = /MARGEM\s+DISPON[IÍ]VEL\*?/i;
  const mLinha = rxDispLinha.exec(t);
  if (mLinha) {
    const janela = t.slice(mLinha.index, mLinha.index + 300); // janela local
    const rxVals = new RegExp(moeda, "gi");
    const vals = [];
    let m;
    while ((m = rxVals.exec(janela)) && vals.length < 3) {
      vals.push(fmtBR(toNumber(m[1])));
    }
    if (vals.length >= 1) dispEmp = vals[0];
    if (vals.length >= 2) dispRmc = vals[1];
    if (vals.length >= 3) dispRcc = vals[2];
  } else {
    // fallback: pega a primeira sequência após “VALORES POR MODALIDADE” contendo “MARGEM DISPON”
    const idxBlk = t.toUpperCase().indexOf("VALORES POR MODALIDADE");
    if (idxBlk >= 0) {
      const janela = t.slice(idxBlk, idxBlk + 1200);
      const m2 = janela.match(/MARGEM\s+DISPON[IÍ]VEL[\s\S]*?R?\$?\s*([0-9\.,]+)[\s\S]*?R?\$?\s*([0-9\.,]+)[\s\S]*?R?\$?\s*([0-9\.,]+)/i);
      if (m2) {
        dispEmp = fmtBR(toNumber(m2[1]));
        dispRmc = fmtBR(toNumber(m2[2]));
        dispRcc = fmtBR(toNumber(m2[3]));
      }
    }
  }

  return {
    disponivel: dispEmp,  // coluna EMPRÉSTIMOS
    extrapolada: extrap,  // quadro superior
    rmc: dispRmc,         // coluna RMC
    rcc: dispRcc          // coluna RCC
  };
}

// ============ Prompt do GPT (contratos/benefício) ============
function buildPrompt(texto) {
  return `
Você é um assistente que extrai **apenas os empréstimos consignados ativos** (NÃO incluir cartões RMC/RCC) de um extrato do INSS e retorna **JSON válido**.

⚠️ REGRAS IMPORTANTES:
- Responda SOMENTE com JSON (sem comentários).
- NÃO incluir contratos de Cartão, RMC ou RCC.
- Sempre incluir "valor_liberado" quando existir.
- Se não houver taxa no extrato, pode deixar a taxa como "0,00".
- Campos de valores e taxas DEVEM vir já formatados em pt-BR como strings:
  - moeda: "15.529,56"
  - taxa mensal/anual/CET: "2,38"
- Sempre incluir "data_contrato" (se não houver, use "data_inclusao").

Esquema esperado:
{
  "cliente": "Nome",
  "beneficio": {
    "nb": "604321543-1",
    "bloqueio_beneficio": "SIM|NAO",
    "meio_pagamento": "conta corrente",
    "banco_pagamento": "Banco Bradesco S A",
    "agencia": "877",
    "conta": "0001278479",
    "nomeBeneficio": "Aposentadoria por invalidez previdenciária",
    "codigoBeneficio": "32"
  },
  "contratos": [
    {
      "contrato": "string",
      "banco": "string",
      "situacao": "ATIVO",
      "data_contrato": "DD/MM/AAAA",
      "data_inclusao": "MM/AAAA",
      "inicio_desconto": "MM/AAAA",
      "fim_desconto": "MM/AAAA ou 84",
      "qtde_parcelas": "84",
      "valor_parcela": "424,10",
      "valor_liberado": "15.529,56",
      "iof": "0,00",
      "cet_mensal": "0,00",
      "cet_anual": "0,00",
      "taxa_juros_mensal": "2,38",
      "taxa_juros_anual": "0,00",
      "valor_pago": "0,00"
    }
  ],
  "data_extrato": "DD/MM/AAAA"
}

Agora gere o JSON a partir do texto abaixo (NÃO inclua contratos de cartão/RMC/RCC):

${texto}
`;
}

// ============ PDF → Texto ============
async function pdfToText(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return data.text;
}

// ============ Chamada ao GPT + pós-processamento ============
async function gptExtrairJSON(texto) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: "Responda sempre com JSON válido, sem texto extra." },
      { role: "user", content: buildPrompt(texto) }
    ]
  });

  let raw = completion.choices[0]?.message?.content?.trim() || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  let parsed = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  // normalização do benefício
  if (parsed?.beneficio) {
    parsed.beneficio.nb = normalizarNB(parsed.beneficio.nb);

    const preferencia =
      parsed.beneficio.codigoBeneficio ||
      parsed.beneficio.nomeBeneficio ||
      parsed.beneficio.tipo ||
      parsed.beneficio.descricao ||
      "";

    const mapped = mapBeneficio(preferencia);
    parsed.beneficio.codigoBeneficio = mapped.codigo;
    parsed.beneficio.nomeBeneficio = mapped.nome;
  }

  // GARANTE margens corretas (regex direto do PDF)
  const margens = extrairMargensDoTexto(texto);
  parsed.margens = {
    disponivel: margens.disponivel ?? parsed.margens?.disponivel ?? "0,00",
    extrapolada: margens.extrapolada ?? parsed.margens?.extrapolada ?? "0,00",
    rmc: margens.rmc ?? parsed.margens?.rmc ?? "0,00",
    rcc: margens.rcc ?? parsed.margens?.rcc ?? "0,00"
  };

  return parsed;
}

// ============ Fluxos ============
// Upload local
export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

  // cache
  if (fs.existsSync(jsonPath)) {
    console.log("♻️ Usando JSON cacheado em", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração de upload:", fileId);
  await fsp.mkdir(jsonDir, { recursive: true });

  const texto = await pdfToText(pdfPath);
  const json = await gptExtrairJSON(texto);

  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);

  agendarExclusao24h(pdfPath, jsonPath);

  return { fileId, ...json };
}

// LUNAS
export async function extrairDeLunas({ fileId, pdfDir, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

  // cache
  if (fs.existsSync(jsonPath)) {
    console.log("♻️ Usando JSON cacheado em", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração do fileId:", fileId);

  if (!LUNAS_API_KEY) throw new Error("LUNAS_API_KEY não configurada");
  if (!LUNAS_QUEUE_ID) throw new Error("LUNAS_QUEUE_ID não configurada");

  const pdfPath = path.join(pdfDir, `extrato_${fileId}.pdf`);
  await fsp.mkdir(jsonDir, { recursive: true });

  const body = {
    queueId: Number(LUNAS_QUEUE_ID),
    apiKey: LUNAS_API_KEY,
    fileId: Number(fileId),
    download: true
  };

  console.log("📥 Requisitando PDF na Lunas:", body);

  const resp = await fetch(LUNAS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${t}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  await fsp.writeFile(pdfPath, Buffer.from(arrayBuffer));
  console.log("✅ PDF salvo em", pdfPath);

  const texto = await pdfToText(pdfPath);
  const json = await gptExtrairJSON(texto);

  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);

  agendarExclusao24h(pdfPath, jsonPath);

  return { fileId, ...json };
}
