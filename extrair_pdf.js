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

function formatBRTaxa(n) {
  return Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// calcular taxa de juros aproximada
function calcularTaxa(parcela, valorLiberado, prazo) {
  if (!parcela || !valorLiberado || !prazo) return 0;
  let taxa = 0.01; // chute inicial
  let maxIter = 100;
  let precisao = 1e-7;

  for (let i = 0; i < maxIter; i++) {
    let saldo = valorLiberado;
    for (let m = 0; m < prazo; m++) {
      saldo = saldo * (1 + taxa) - parcela;
    }
    if (Math.abs(saldo) < precisao) break;
    taxa += saldo > 0 ? 0.0001 : -0.0001;
    if (taxa < 0) taxa = 0.0001;
  }

  return taxa;
}

// ================== Prompt ==================
function buildPrompt(texto) {
  return `
Você é um assistente que extrai **todos os empréstimos ativos** de um extrato do INSS e retorna **JSON válido**.

⚠️ Regras:
- Retorne SOMENTE JSON.
- Inclua todos os contratos "Ativo".
- Ignore cartões RMC/RCC ou contratos não ativos.
- Retorne números crus (sem formatação BR). Exemplo:
  - valor_liberado: 15529.56
  - taxa_juros_mensal: 0.0238 (equivalente a 2.38%)

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
    "disponivel": 123.45,
    "extrapolada": -76.20,
    "rmc": 75.90,
    "rcc": 75.90
  },
  "contratos": [ ... ],
  "data_extrato": "DD/MM/AAAA"
}

Texto do extrato:
${texto}
`;
}

// ================== GPT Call ==================
async function gptExtrairJSON(texto) {
  console.log("📤 Enviando texto ao GPT, tamanho:", texto.length);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: "Responda sempre com JSON válido, sem texto extra."
      },
      { role: "user", content: buildPrompt(texto) }
    ]
  });

  console.log("📥 Resposta recebida do GPT");

  let raw = completion.choices[0]?.message?.content?.trim() || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  let parsed = JSON.parse(raw);

  // Normalizar benefício
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

  // Pós-processamento: contratos
  if (Array.isArray(parsed?.contratos)) {
    parsed.contratos = parsed.contratos.map((c) => {
      const parcela = toNumber(c.valor_parcela);
      const liberado = toNumber(c.valor_liberado);
      const prazo = toNumber(c.fim_desconto);

      let taxa = toNumber(c.taxa_juros_mensal);
      if (!taxa || taxa === 0) {
        taxa = calcularTaxa(parcela, liberado, prazo);
      }

      return {
        ...c,
        valor_parcela: formatBRNumber(parcela),
        valor_liberado: formatBRNumber(liberado),
        valor_pago: formatBRNumber(toNumber(c.valor_pago)),
        taxa_juros_mensal: formatBRTaxa(taxa),
        taxa_juros_anual: formatBRTaxa(taxa * 12),
        cet_mensal: formatBRTaxa(toNumber(c.cet_mensal)),
        cet_anual: formatBRTaxa(toNumber(c.cet_anual))
      };
    });
  }

  // Pós-processamento: margens
  if (parsed?.margens) {
    parsed.margens.disponivel = formatBRNumber(
      toNumber(parsed.margens.disponivel)
    );
    parsed.margens.extrapolada = formatBRNumber(
      toNumber(parsed.margens.extrapolada)
    );
    parsed.margens.rmc = formatBRNumber(toNumber(parsed.margens.rmc));
    parsed.margens.rcc = formatBRNumber(toNumber(parsed.margens.rcc));
  }

  return parsed;
}

// ================== PDF to Text ==================
async function pdfToText(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return data.text;
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

  const texto = await pdfToText(pdfPath);

  // Fatiamento automático
  let json;
  if (texto.length > 5000) {
    console.log("✂️ Texto grande, fatiando...");
    const blocos = texto.match(/[\s\S]{1,4000}/g) || [];
    let contratos = [];
    for (let i = 0; i < blocos.length; i++) {
      console.log(`🔎 Processando bloco ${i + 1}/${blocos.length}`);
      const parcial = await gptExtrairJSON(blocos[i]);
      contratos = contratos.concat(parcial.contratos || []);
      if (i === 0) json = parcial; // pega cabeçalho no primeiro bloco
    }
    json.contratos = contratos;
  } else {
    json = await gptExtrairJSON(texto);
  }

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
