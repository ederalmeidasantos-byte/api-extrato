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

// === Config Lunas ===
const LUNAS_API_URL = process.env.LUNAS_API_URL || "https://lunasdigital.atenderbem.com/int/downloadFile";
const LUNAS_API_KEY = process.env.LUNAS_API_KEY;
const LUNAS_QUEUE_ID = process.env.LUNAS_QUEUE_ID;

// agendar exclusão em 24h
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

// === Limpeza de texto para reduzir tokens ===
function limparTextoExtrato(texto) {
  return texto
    .replace(/\s+/g, " ") // espaços extras
    .replace(/-{5,}/g, "") // linhas separadoras
    .replace(/Página \d+ de \d+/gi, "") // numeração de páginas
    .trim();
}

// === Prompts otimizados ===
function promptClienteBeneficio(texto) {
  return `
Você é um assistente que extrai apenas os **dados do cliente e do benefício** de um extrato do INSS.
Responda SOMENTE com JSON válido.

{
  "cliente": "Nome do titular",
  "beneficio": {
    "nb": "número do benefício",
    "bloqueio_beneficio": "SIM|NAO",
    "meio_pagamento": "conta corrente|cartao",
    "banco_pagamento": "Banco ...",
    "agencia": "877",
    "conta": "0001278479",
    "nome": "Nome da espécie",
    "codigo": "Código da espécie"
  },
  "data_extrato": "DD/MM/AAAA"
}

Texto do extrato:
${texto}
`;
}

function promptContratos(texto) {
  return `
Você é um assistente que extrai apenas os **contratos de empréstimos ativos** de um extrato do INSS.
Responda SOMENTE com JSON válido.

[
  {
    "contrato": "2666838921",
    "banco": "Banco Itau Consignado S A",
    "situacao": "Ativo",
    "valor_liberado": 1000.00,
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

Texto do extrato:
${texto}
`;
}

// === PDF to texto ===
async function pdfToText(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return limparTextoExtrato(data.text);
}

// === GPT extrair JSON ===
async function gptExtrairJSON(texto) {
  try {
    // 1) cliente e benefício
    const respBeneficio = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 500,
      messages: [
        { role: "system", content: "Responda sempre com JSON válido, sem texto extra." },
        { role: "user", content: promptClienteBeneficio(texto) }
      ]
    });

    let parsedBeneficio = JSON.parse(respBeneficio.choices[0]?.message?.content?.trim() || "{}");

    // normalizar benefício
    if (parsedBeneficio?.beneficio) {
      parsedBeneficio.beneficio.nb = normalizarNB(parsedBeneficio.beneficio.nb);
      const preferencia = parsedBeneficio.beneficio.codigo || parsedBeneficio.beneficio.nome || "";
      const mapped = mapBeneficio(preferencia);
      parsedBeneficio.beneficio.codigo = mapped.codigo;
      parsedBeneficio.beneficio.nome = mapped.nome;
    }

    // 2) contratos
    const respContratos = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 1000,
      messages: [
        { role: "system", content: "Responda sempre com JSON válido, sem texto extra." },
        { role: "user", content: promptContratos(texto) }
      ]
    });

    let contratos = JSON.parse(respContratos.choices[0]?.message?.content?.trim() || "[]");

    return {
      ...parsedBeneficio,
      contratos
    };
  } catch (err) {
    console.error("❌ Erro parseando JSON do GPT:", err.message);
    return { error: "Falha ao interpretar extrato", detalhe: err.message };
  }
}

// === fluxo para upload local ===
export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  try {
    console.log("🚀 Iniciando extração de upload:", fileId);

    const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
    await fsp.mkdir(jsonDir, { recursive: true });

    const texto = await pdfToText(pdfPath);
    console.log("📄 Texto limpo (primeiros 200 chars):", texto.slice(0, 200));

    const json = await gptExtrairJSON(texto);
    console.log("🤖 JSON retornado pelo GPT:", json);

    await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
    console.log("✅ JSON salvo em", jsonPath);

    agendarExclusao24h(pdfPath, jsonPath);

    return { fileId, ...json };
  } catch (err) {
    console.error("💥 Erro em extrairDeUpload:", err);
    throw err;
  }
}

// === fluxo para Lunas ===
export async function extrairDeLunas({ fileId, pdfDir, jsonDir }) {
  try {
    console.log("🚀 Iniciando extração do fileId:", fileId);

    if (!LUNAS_API_KEY) throw new Error("LUNAS_API_KEY não configurada");
    if (!LUNAS_QUEUE_ID) throw new Error("LUNAS_QUEUE_ID não configurada");

    const pdfPath = path.join(pdfDir, `extrato_${fileId}.pdf`);
    const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
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
    console.log("📄 Texto limpo (primeiros 200 chars):", texto.slice(0, 200));

    const json = await gptExtrairJSON(texto);
    console.log("🤖 JSON retornado pelo GPT:", json);

    await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
    console.log("✅ JSON salvo em", jsonPath);

    agendarExclusao24h(pdfPath, jsonPath);

    return { fileId, ...json };
  } catch (err) {
    console.error("💥 Erro em extrairDeLunas:", err);
    throw err;
  }
}
