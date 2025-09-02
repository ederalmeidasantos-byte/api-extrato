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

function calcularTaxaJurosMensal(valorParcela, valorFinanciado, numeroParcelas, maxIter = 100, tol = 1e-10) {
  let i = 0.02;
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
  return i;
}

function buildPrompt(texto) {
  return `
Você é um assistente que extrai **todos os empréstimos ativos** de um extrato do INSS e retorna **JSON válido**.

⚠️ REGRAS IMPORTANTES:
- Retorne SOMENTE JSON.
- Inclua somente contratos "Ativo" (ignore suspensos, quitados, RMC e RCC).
- Inclua no JSON as margens: emprestimo, rmc, rcc, disponivel, extrapolada.
- Sempre incluir em cada contrato:
  contrato, banco, situacao, data_inclusao, data_contrato,
  competencia_inicio_desconto, competencia_fim_desconto,
  qtde_parcelas, valor_parcela, valor_emprestado, valor_liberado,
  iof, cet_mensal, cet_anual, taxa_juros_mensal, taxa_juros_anual, valor_pago.
- Datas: DD/MM/AAAA. Números: ponto decimal.

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
  "margens": {
    "emprestimo": 0.00,
    "rmc": 0.00,
    "rcc": 0.00,
    "disponivel": 0.00,
    "extrapolada": 0.00
  },
  "contratos": [ ... ],
  "data_extrato": "DD/MM/AAAA"
}

Agora gere o JSON a partir do texto abaixo:

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
        } catch {
          c.origem_taxa = "critica";
        }
      } else {
        c.origem_taxa = "extrato";
      }
      return c;
    });
  }

  return parsed;
}

export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
  if (fs.existsSync(jsonPath)) {
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }
  await fsp.mkdir(jsonDir, { recursive: true });
  const texto = await pdfToText(pdfPath);
  const json = await gptExtrairJSON(texto);
  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  agendarExclusao24h(pdfPath, jsonPath);
  return { fileId, ...json };
}

export async function extrairDeLunas({ fileId, pdfDir, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
  if (fs.existsSync(jsonPath)) {
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }
  if (!LUNAS_API_KEY) throw new Error("LUNAS_API_KEY não configurada");
  if (!LUNAS_QUEUE_ID) throw new Error("LUNAS_QUEUE_ID não configurada");
  const pdfPath = path.join(pdfDir, `extrato_${fileId}.pdf`);
  await fsp.mkdir(jsonDir, { recursive: true });
  const body = { queueId: Number(LUNAS_QUEUE_ID), apiKey: LUNAS_API_KEY, fileId: Number(fileId), download: true };
  const resp = await fetch(LUNAS_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`Falha ao baixar da Lunas: ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  await fsp.writeFile(pdfPath, Buffer.from(arrayBuffer));
  const texto = await pdfToText(pdfPath);
  const json = await gptExtrairJSON(texto);
  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  agendarExclusao24h(pdfPath, jsonPath);
  return { fileId, ...json };
}
