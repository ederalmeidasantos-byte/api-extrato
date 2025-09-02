// extrair_pdf_paginas.js
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

// ================== Helpers ==================
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

function stripDiacritics(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

// ================== Prompt ==================
function buildPromptSeparado(pagina1, pagina2, paginasContratos) {
  return `
Você é um assistente que extrai **somente os empréstimos consignados ativos** de um extrato do INSS e retorna **JSON válido**.

- Página 1: contém dados do cliente e do benefício.
- Página 2: contém margens (MARGEM DISPONÍVEL*, MARGEM EXTRAPOLADA***, RMC, RCC).
- Página 3 em diante: lista de contratos ativos.

⚠️ Regras:
- Retorne SOMENTE JSON.
- Contratos ativos apenas (ignore RMC/RCC).
- Não invente valores, se não tiver coloque null ou 0.

Esquema:
{
  "cliente": "Nome exato",
  "beneficio": {
    "nb": "...",
    "bloqueio_beneficio": "...",
    "meio_pagamento": "...",
    "banco_pagamento": "...",
    "agencia": "...",
    "conta": "...",
    "nomeBeneficio": "Texto exato em azul",
    "codigoBeneficio": null
  },
  "margens": {
    "disponivel": "...",
    "extrapolada": "...",
    "rmc": "...",
    "rcc": "..."
  },
  "contratos": [...],
  "data_extrato": "DD/MM/AAAA"
}

📄 Página 1 (dados cliente/benefício):
${pagina1}

📄 Página 2 (margens):
${pagina2}

📄 Páginas 3+ (contratos):
${paginasContratos}
`;
}

// ================== GPT Call ==================
async function gptExtrairJSONSeparado(pagina1, pagina2, paginasContratos) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 2000,
    messages: [
      { role: "system", content: "Responda sempre com JSON válido, sem texto extra." },
      { role: "user", content: buildPromptSeparado(pagina1, pagina2, paginasContratos) }
    ]
  });

  let raw = completion.choices[0]?.message?.content?.trim() || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(raw);
}

// ================== PDF Utils ==================
async function pdfToPages(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return (data.text || "").split(/\f/); // quebra por página
}

// ================== Fluxo Upload ==================
export async function extrairDeUploadPaginas({ fileId, pdfPath, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

  if (fs.existsSync(jsonPath)) {
    console.log("♻️ Usando JSON cacheado em", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração (por páginas):", fileId);
  await fsp.mkdir(jsonDir, { recursive: true });

  const paginas = await pdfToPages(pdfPath);
  const pagina1 = paginas[0] || "";
  const pagina2 = paginas[1] || "";
  const paginasContratos = paginas.slice(2).join("\n");

  const parsed = await gptExtrairJSONSeparado(pagina1, pagina2, paginasContratos);

  await fsp.writeFile(jsonPath, JSON.stringify(parsed, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);

  agendarExclusao24h(pdfPath, jsonPath);

  return { fileId, ...parsed };
}

// ================== Fluxo Lunas ==================
export async function extrairDeLunasPaginas({ fileId, pdfDir, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

  if (fs.existsSync(jsonPath)) {
    console.log("♻️ Usando JSON cacheado em", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração do fileId (por páginas):", fileId);

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

  return extrairDeUploadPaginas({ fileId, pdfPath, jsonDir });
}
