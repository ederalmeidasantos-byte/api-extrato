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

// === Lunas config ===
const LUNAS_API_URL = process.env.LUNAS_API_URL || "https://lunasdigital.atenderbem.com/int/downloadFile";
const LUNAS_API_KEY = process.env.LUNAS_API_KEY;
const LUNAS_QUEUE_ID = process.env.LUNAS_QUEUE_ID;

// =========================================================
// Utils
// =========================================================
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

// filtra linhas úteis para reduzir tokens
function filtrarTextoExtrato(texto) {
  return texto
    .split(/\n+/)
    .filter(l =>
      /benef[ií]cio|esp[eé]cie|contrato|banco|parcela|taxa|liberado|desconto|valor/i.test(l)
    )
    .join("\n");
}

async function pdfToText(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return data.text;
}

function mesesEntre(inicioMMYYYY, referencia = new Date()) {
  if (!inicioMMYYYY || !/^\d{2}\/\d{4}$/.test(inicioMMYYYY)) return 0;
  const [mm, yyyy] = inicioMMYYYY.split("/").map(Number);
  const a = new Date(yyyy, mm - 1, 1);
  const b = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(0, meses);
}

// =========================================================
// GPT prompts enxutos
// =========================================================
function promptBeneficio(texto) {
  return `
Extraia do texto do extrato os dados do BENEFÍCIO. Retorne JSON válido no formato:

{
  "nb": "6043215431",
  "bloqueio_beneficio": "SIM|NAO",
  "meio_pagamento": "conta corrente",
  "banco_pagamento": "Banco Bradesco S A",
  "agencia": "877",
  "conta": "0001278479",
  "nome": "NOME DA ESPÉCIE",
  "codigo": "CÓDIGO DA ESPÉCIE"
}

Texto:
${texto}`;
}

function promptContratos(texto) {
  return `
Você deve extrair do texto abaixo **TODOS os contratos de empréstimos consignados ativos** e retornar **somente um JSON válido**.

⚠️ Regras obrigatórias:
- Retorne um array JSON com todos os contratos "Ativo".
- Se não houver contratos ativos no texto, retorne um array vazio [].
- Não invente contratos, apenas use o que aparece no texto.
- Sempre que possível preencha os campos com número.
- Campos monetários devem ser número com ponto decimal (ex.: 1249.28).
- Sempre incluir "data_contrato" (se não houver, use "data_inclusao").
- Incluir parcelas_pagas e prazo_restante como números (mesmo que 0).

Exemplo de formato:
[
  {
    "contrato": "2666838921",
    "banco": "Banco Itau Consignado S A",
    "situacao": "Ativo",
    "valor_liberado": 528.71,
    "valor_parcela": 12.14,
    "qtde_parcelas": 96,
    "data_inclusao": "09/04/2025",
    "inicio_desconto": "05/2025",
    "fim_desconto": "04/2033",
    "data_contrato": "09/04/2025",
    "taxa_juros_mensal": 1.85,
    "taxa_juros_anual": 24.60
  }
]

Agora, extraia os contratos ativos do seguinte texto:

${texto}
  `;
}

// =========================================================
// GPT extractors
// =========================================================
async function gptJSON(prompt, model = "gpt-4o-mini") {
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: "Responda sempre com JSON válido, sem texto extra." },
      { role: "user", content: prompt }
    ]
  });

  let raw = completion.choices[0]?.message?.content?.trim() || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(raw);
}

async function gptExtrairJSON(texto) {
  const textoFiltrado = filtrarTextoExtrato(texto);

  // tenta contratos com texto filtrado
  let [beneficio, contratos] = await Promise.all([
    gptJSON(promptBeneficio(textoFiltrado), "gpt-4o"),
    gptJSON(promptContratos(textoFiltrado), "gpt-4o-mini")
  ]);

  // fallback se não trouxe contratos
  if (!contratos || !Array.isArray(contratos) || contratos.length === 0) {
    console.warn("⚠️ Nenhum contrato encontrado no texto filtrado. Tentando texto completo...");
    contratos = await gptJSON(promptContratos(texto), "gpt-4o-mini");
  }

  // === normalização benefício ===
  beneficio.nb = normalizarNB(beneficio.nb);
  const mapped = mapBeneficio(beneficio.codigo || beneficio.nome || "");
  beneficio.codigo = mapped.codigo;
  beneficio.nome = mapped.nome;

  // === normalização contratos ===
  const contratosNorm = (contratos || []).map(c => {
    let critica = c.critica ?? null;
    let origem_taxa = "extrato";
    const taxa = Number(c.taxa_juros_mensal);

    if (!Number.isFinite(taxa)) {
      origem_taxa = "calculado";
    } else if (taxa < 1 || taxa > 3) {
      critica = "Taxa fora do intervalo esperado (1% a 3%). Revisar manualmente.";
      delete c.taxa_juros_mensal;
      delete c.taxa_juros_anual;
      origem_taxa = "critica";
    }

    const total = Number(c.qtde_parcelas) || 0;
    const pagas = Math.min(total, mesesEntre(c.inicio_desconto));
    const restante = Math.max(0, total - pagas);

    return { ...c, parcelas_pagas: pagas, prazo_restante: restante, origem_taxa, ...(critica ? { critica } : {}) };
  });

  return { cliente: "", beneficio, contratos: contratosNorm };
}

// =========================================================
// Fluxos de extração
// =========================================================
export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  try {
    console.log("🚀 Iniciando extração de upload:", fileId);

    const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
    await fsp.mkdir(jsonDir, { recursive: true });

    const texto = await pdfToText(pdfPath);
    const json = await gptExtrairJSON(texto);

    await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
    agendarExclusao24h(pdfPath, jsonPath);

    return { fileId, ...json };
  } catch (err) {
    console.error("💥 Erro em extrairDeUpload:", err);
    throw err;
  }
}

export async function extrairDeLunas({ fileId, pdfDir, jsonDir }) {
  try {
    console.log("🚀 Iniciando extração do fileId:", fileId);

    if (!LUNAS_API_KEY) throw new Error("LUNAS_API_KEY não configurada");
    if (!LUNAS_QUEUE_ID) throw new Error("LUNAS_QUEUE_ID não configurada");

    const pdfPath = path.join(pdfDir, `extrato_${fileId}.pdf`);
    const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
    await fsp.mkdir(jsonDir, { recursive: true });

    const body = { queueId: Number(LUNAS_QUEUE_ID), apiKey: LUNAS_API_KEY, fileId: Number(fileId), download: true };

    const resp = await fetch(LUNAS_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!resp.ok) throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${await resp.text()}`);

    const arrayBuffer = await resp.arrayBuffer();
    await fsp.writeFile(pdfPath, Buffer.from(arrayBuffer));

    const texto = await pdfToText(pdfPath);
    const json = await gptExtrairJSON(texto);

    await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
    agendarExclusao24h(pdfPath, jsonPath);

    return { fileId, ...json };
  } catch (err) {
    console.error("💥 Erro em extrairDeLunas:", err);
    throw err;
  }
}
