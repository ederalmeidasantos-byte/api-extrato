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

const LUNAS_API_URL =
  process.env.LUNAS_API_URL ||
  "https://lunasdigital.atenderbem.com/int/downloadFile";
const LUNAS_API_KEY = process.env.LUNAS_API_KEY;
const LUNAS_QUEUE_ID = process.env.LUNAS_QUEUE_ID;

// ================= Helpers =================
function toNumber(v) {
  if (!v) return 0;
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
function formatBRTaxa(nAsDecimal) {
  return Number(nAsDecimal * 100).toLocaleString("pt-BR", {
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

// ================= Prompt =================
function buildPromptPaginas(texto) {
  return `
Você é um assistente que extrai dados de extratos INSS.  
⚠️ Importante: o PDF segue essa estrutura:
- Página 1 → Dados do cliente e do benefício
- Página 2 → Margens (MARGEM DISPONÍVEL* e MARGEM EXTRAPOLADA***)
- Página 3 em diante → Lista de contratos consignados ativos (ignore RMC/RCC)

Regras:
- Retorne SOMENTE JSON.
- No campo "nomeBeneficio", mantenha o texto exatamente como aparece no PDF.
- Margens não devem ser inventadas, serão sobrescritas.
- Todos os contratos "ATIVO" devem ser listados.

Esquema esperado:
{
  "cliente": "NOME",
  "beneficio": {
    "nb": "...",
    "bloqueio_beneficio": "SIM|NAO",
    "meio_pagamento": "...",
    "banco_pagamento": "...",
    "agencia": "...",
    "conta": "...",
    "nomeBeneficio": "...",
    "codigoBeneficio": null
  },
  "margens": {},
  "contratos": [
    {
      "contrato": "...",
      "banco": "...",
      "situacao": "ATIVO",
      "data_inclusao": "MM/AAAA",
      "competencia_inicio_desconto": "MM/AAAA",
      "qtde_parcelas": 84,
      "valor_parcela": 424.10,
      "valor_liberado": 15529.56,
      "iof": 0,
      "cet_mensal": 0.023,
      "cet_anual": 0.31,
      "taxa_juros_mensal": 0.0238,
      "taxa_juros_anual": 0.32,
      "valor_pago": 5000.00
    }
  ],
  "data_extrato": "DD/MM/AAAA"
}

Texto do extrato:
${texto}
`;
}

// ================= GPT =================
async function gptExtrairJSONPaginas(texto) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 2000,
    messages: [
      { role: "system", content: "Responda sempre com JSON válido, sem texto extra." },
      { role: "user", content: buildPromptPaginas(texto) }
    ]
  });
  let raw = completion.choices[0]?.message?.content?.trim() || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(raw);
}

// ================= PDF =================
async function pdfToText(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return data.text || "";
}

// ================= Fluxo Upload (com Lunas) =================
export async function extrairDeLunasPaginas({ fileId, pdfDir, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_paginas_${fileId}.json`);
  if (fs.existsSync(jsonPath)) {
    console.log("♻️ Usando JSON cacheado (páginas)", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração PAGINAS fileId:", fileId);

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

  // extrair texto
  const texto = await pdfToText(pdfPath);
  const parsed = await gptExtrairJSONPaginas(texto);

  await fsp.writeFile(jsonPath, JSON.stringify(parsed, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);

  return { fileId, ...parsed };
}
