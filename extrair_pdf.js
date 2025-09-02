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

// === cálculo da taxa de juros (Newton-Raphson) ===
function calcularTaxaJurosMensal(valorParcela, valorFinanciado, numeroParcelas, maxIter = 100, tol = 1e-10) {
  let i = 0.02; // chute inicial 2% ao mês
  for (let k = 0; k < maxIter; k++) {
    const f = valorParcela - valorFinanciado * (i / (1 - Math.pow(1 + i, -numeroParcelas)));
    const fprime =
      -valorFinanciado *
      ((1 - Math.pow(1 + i, -numeroParcelas)) - i * numeroParcelas * Math.pow(1 + i, -numeroParcelas - 1)) /
      Math.pow(1 - Math.pow(1 + i, -numeroParcelas), 2);

    const newi = i - f / fprime;
    if (Math.abs(newi - i) < tol) return newi;
    i = newi;
  }
  return i; // retorna taxa decimal (ex.: 0.0233 = 2,33%)
}

function buildPrompt(texto) {
  return `
Você é um assistente que extrai **todos os empréstimos ativos** de um extrato do INSS e retorna **JSON válido**.

⚠️ REGRAS IMPORTANTES:
- Retorne SOMENTE JSON (sem comentários, sem texto extra).
- Inclua todos os contratos "Ativo".
- Ignore cartões RMC/RCC ou contratos não ativos.
- Sempre incluir "valor_liberado" (quando existir no extrato).
- Não calcule taxa de juros: apenas deixe nulo se não existir.
- Campos numéricos devem vir como número com ponto decimal (ex.: 1.85).
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
  "contratos": [ ... ],
  "data_extrato": "DD/MM/AAAA"
}

Agora gere o JSON com **todos os contratos ativos** a partir do texto abaixo:

${texto}
`;
}

async function pdfToText(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return data.text;
}

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

  let parsed = JSON.parse(raw);

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

  // normalização dos contratos → calcula taxa se não vier
  if (Array.isArray(parsed?.contratos)) {
    parsed.contratos = parsed.contratos.map((c) => {
      if (!c.taxa_juros_mensal && c.valor_parcela && c.valor_liberado && c.qtde_parcelas) {
        try {
          const i = calcularTaxaJurosMensal(Number(c.valor_parcela), Number(c.valor_liberado), Number(c.qtde_parcelas));
          if (Number.isFinite(i) && i > 0) {
            c.taxa_juros_mensal = +(i * 100).toFixed(6);
            c.taxa_juros_anual = +((Math.pow(1 + i, 12) - 1) * 100).toFixed(6);
            c.origem_taxa = "calculada";
          }
        } catch (err) {
          console.warn("⚠️ Falha ao calcular taxa de juros:", err.message);
          c.origem_taxa = "critica";
        }
      }
      return c;
    });
  }

  return parsed;
}

// === fluxo para upload local ===
export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

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

// === fluxo para LUNAS ===
export async function extrairDeLunas({ fileId, pdfDir, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

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
