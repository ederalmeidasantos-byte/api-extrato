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

function limparRespostaGPT(raw) {
  if (!raw) return "{}";
  raw = raw.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return raw;
}

// Prompt benefício
function promptClienteBeneficio(texto) {
  return `
Extraia do extrato apenas os dados do cliente e benefício.
Responda somente em JSON válido.

{
  "cliente": "Nome completo",
  "beneficio": {
    "nb": "Número do benefício",
    "bloqueio_beneficio": "SIM|NAO",
    "meio_pagamento": "conta corrente|cartão magnético",
    "banco_pagamento": "Banco XYZ",
    "agencia": "0000",
    "conta": "000000",
    "codigo": "código da espécie do benefício",
    "nome": "nome da espécie do benefício"
  },
  "data_extrato": "DD/MM/AAAA"
}

Texto:
${texto}
`;
}

// Prompt contratos
function promptContratos(texto) {
  return `
Extraia todos os empréstimos consignados ativos do extrato.
Responda apenas em JSON válido (array).

[
  {
    "contrato": "123456",
    "banco": "Banco X",
    "situacao": "Ativo",
    "valor_liberado": 1000.00,
    "valor_parcela": 100.00,
    "qtde_parcelas": 96,
    "data_inclusao": "DD/MM/AAAA",
    "inicio_desconto": "MM/AAAA",
    "fim_desconto": "MM/AAAA",
    "data_contrato": "DD/MM/AAAA",
    "taxa_juros_mensal": 1.85,
    "taxa_juros_anual": 24.60
  }
]

Texto:
${texto}
`;
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

// GPT extrair JSON
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

    let rawBeneficio = respBeneficio.choices[0]?.message?.content || "{}";
    rawBeneficio = limparRespostaGPT(rawBeneficio);
    let parsedBeneficio = JSON.parse(rawBeneficio);

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

    let rawContratos = respContratos.choices[0]?.message?.content || "[]";
    rawContratos = limparRespostaGPT(rawContratos);
    let contratos = JSON.parse(rawContratos);

    if (Array.isArray(contratos)) {
      contratos = contratos.map(c => {
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

        return {
          ...c,
          parcelas_pagas: pagas,
          prazo_restante: restante,
          origem_taxa,
          ...(critica ? { critica } : {})
        };
      });
    }

    return { ...parsedBeneficio, contratos };
  } catch (err) {
    console.error("❌ Erro parseando JSON do GPT:", err.message);
    return { error: "Falha ao interpretar extrato", detalhe: err.message };
  }
}

// upload local
export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  try {
    console.log("🚀 Iniciando extração de upload:", fileId);

    const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
    await fsp.mkdir(jsonDir, { recursive: true });

    const texto = await pdfToText(pdfPath);
    console.log("📄 Texto extraído (primeiros 200 chars):", texto.slice(0, 200));

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

// fluxo LUNAS
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
      console.error("❌ Falha ao baixar da Lunas:", resp.status, t);
      throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${t}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    await fsp.writeFile(pdfPath, Buffer.from(arrayBuffer));
    console.log("✅ PDF salvo em", pdfPath);

    const texto = await pdfToText(pdfPath);
    console.log("📄 Texto extraído (primeiros 200 chars):", texto.slice(0, 200));

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
