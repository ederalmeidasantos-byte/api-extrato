import fs from "fs";
import fsp from "fs/promises";
import path from "path";
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

// ================== Prompt ==================
function buildPrompt() {
  return `
Você é um assistente que extrai **somente os empréstimos consignados ativos** de um extrato do INSS (em PDF) e retorna **JSON válido**.

⚠️ Regras:
- Retorne SOMENTE JSON.
- Inclua todos os contratos ativos (exceto RMC/RCC).
- Valores dentro de contratos devem vir crus (sem formatação BR).
- O nome do benefício deve vir exatamente como está no PDF.
- Se não houver valores, use null ou 0.

Esquema esperado:
{
  "cliente": "Nome exato",
  "beneficio": {
    "nb": "604321543-1",
    "bloqueio_beneficio": "SIM|NAO",
    "meio_pagamento": "conta corrente",
    "banco_pagamento": "Banco ...",
    "agencia": "877",
    "conta": "0001278479",
    "nomeBeneficio": "Texto exato do PDF",
    "codigoBeneficio": null
  },
  "margens": {
    "disponivel": "",
    "extrapolada": "",
    "rmc": "",
    "rcc": ""
  },
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
`;
}

// ================== GPT Call com PDF direto ==================
async function gptExtrairJSONdoPDF(pdfPath) {
  // Faz upload do PDF
  const file = await openai.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants"
  });

  // Pede pro GPT ler o PDF
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1", // ou gpt-4o se quiser mais rápido
    temperature: 0,
    max_tokens: 4000,
    messages: [
      { role: "system", content: "Responda sempre com JSON válido, sem texto extra." },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Leia este PDF e extraia dados" },
          { type: "input_file", file: { file_id: "file-abc123" } }
        ]
      }
    ]
  });

  let raw = completion.choices[0]?.message?.content?.trim() || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(raw);
}

// ================== Pós-processamento ==================
function posProcessar(parsed) {
  if (!parsed) parsed = {};
  if (!parsed.beneficio) parsed.beneficio = {};

  let nb = normalizarNB(parsed.beneficio.nb || "");
  if (nb.length < 10) nb = "";
  parsed.beneficio.nb = nb;

  let nomeOriginal = parsed.beneficio.nomeBeneficio || "";
  const mapped = mapBeneficio(nomeOriginal);
  parsed.beneficio.codigoBeneficio = mapped?.codigo ?? null;

  if (!Array.isArray(parsed.contratos)) parsed.contratos = [];
  const competenciaAtual = getCompetenciaAtual(parsed.data_extrato);

  parsed.contratos = parsed.contratos
    .filter(c => (String(c.situacao || "").toUpperCase() === "ATIVO"))
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

      return {
        ...c,
        valor_parcela: formatBRNumber(toNumber(c.valor_parcela)),
        valor_liberado: formatBRNumber(toNumber(c.valor_liberado)),
        valor_pago: formatBRNumber(toNumber(c.valor_pago)),
        taxa_juros_mensal: formatBRTaxa(toNumber(c.taxa_juros_mensal)),
        taxa_juros_anual: formatBRTaxa(toNumber(c.taxa_juros_anual)),
        cet_mensal: formatBRTaxa(toNumber(c.cet_mensal)),
        cet_anual: formatBRTaxa(toNumber(c.cet_anual)),
        prazo_total: prazoTotal,
        parcelas_pagas: parcelasPagas,
        prazo_restante: prazoRestante
      };
    });

  return parsed;
}

// ================== Fluxo Upload ==================
export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

  if (fs.existsSync(jsonPath)) {
    console.log("♻️ Usando JSON cacheado em", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração de upload:", fileId);
  await fsp.mkdir(jsonDir, { recursive: true });

  const parsed = await gptExtrairJSONdoPDF(pdfPath);
  const json = posProcessar(parsed);

  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);
  agendarExclusao24h(pdfPath, jsonPath);

  return { fileId, ...json };
}

// ================== Fluxo Lunas ==================
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

  return extrairDeUpload({ fileId, pdfPath, jsonDir });
}
