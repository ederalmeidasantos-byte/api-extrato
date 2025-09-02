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

// ======== PARSE MARGENS diretamente do TEXTO ========
function parseMargensDoTexto(texto) {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const linhas = texto.split(/\r?\n/);

  let disponivel = null, rmc = null, rcc = null, extrapolada = null;

  for (const ln of linhas) {
    const line = clean(ln.toUpperCase());

    // linha "MARGEM DISPONÍVEL*"
    if (line.includes("MARGEM DISPONÍVEL")) {
      const nums = (line.match(/(\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2})/g) || []);
      const rRmc = /RMC[^0-9]*((\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2}))/i.exec(line);
      const rRcc = /RCC[^0-9]*((\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2}))/i.exec(line);

      if (nums.length > 0) disponivel = nums[0];
      if (rRmc) rmc = rRmc[1]; else if (nums.length > 1) rmc = nums[1];
      if (rRcc) rcc = rRcc[1]; else if (nums.length > 2) rcc = nums[2];
    }

    // linha "MARGEM EXTRAPOLADA***" (primeira tabela)
    if (line.includes("MARGEM EXTRAPOLADA")) {
      const n = (line.match(/(\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2})/) || [])[0];
      if (n) extrapolada = n;
    }
  }

  return {
    disponivel: disponivel ? formatBRNumber(toNumber(disponivel)) : "0,00",
    extrapolada: extrapolada ? formatBRNumber(toNumber(extrapolada)) : "0,00",
    rmc: rmc ? formatBRNumber(toNumber(rmc)) : "0,00",
    rcc: rcc ? formatBRNumber(toNumber(rcc)) : "0,00"
  };
}

// ================== Prompt ==================
function buildPrompt(texto) {
  return `
Você é um assistente que extrai **todos os empréstimos ativos** de um extrato do INSS e retorna **JSON válido**.

⚠️ Regras:
- Retorne SOMENTE JSON.
- Inclua todos os contratos "Ativo".
- Ignore cartões RMC/RCC e qualquer contrato não ativo.
- Retorne números crus (sem formatação BR) apenas dentro de contratos; eu formato depois.
- "Nome do benefício" deve ser exatamente como aparece em azul no extrato.
- "Margem extrapolada" deve vir da primeira tabela (VALORES DO BENEFÍCIO).

Texto do extrato:
${texto}
`;
}

// ================== GPT Call ==================
async function gptExtrairJSON(texto) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1500,
    messages: [
      { role: "system", content: "Responda sempre com JSON válido, sem texto extra." },
      { role: "user", content: buildPrompt(texto) }
    ]
  });

  let raw = completion.choices[0]?.message?.content?.trim() || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(raw);
}

// ================== Pós-processamento ==================
function posProcessar(parsed, texto) {
  if (parsed?.beneficio) {
    parsed.beneficio.nb = normalizarNB(parsed.beneficio.nb || "");

    const nomeBruto = parsed.beneficio.nomeBeneficio || "";
    const mapped = mapBeneficio(nomeBruto);

    parsed.beneficio.nomeBeneficio = nomeBruto; // mantém como no extrato
    parsed.beneficio.codigoBeneficio = mapped.codigo || parsed.beneficio.codigoBeneficio;
  }

  parsed.margens = parseMargensDoTexto(texto);

  if (Array.isArray(parsed?.contratos)) {
    const competenciaAtual = getCompetenciaAtual(parsed.data_extrato);
    parsed.contratos = parsed.contratos
      .filter(c => (c.situacao || "").toUpperCase() === "ATIVO")
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
  }

  return parsed;
}

// ================== PDF to Text ==================
async function pdfToText(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return data.text || "";
}

// ================== Fluxo Upload ==================
export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

  if (fs.existsSync(jsonPath)) {
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  await fsp.mkdir(jsonDir, { recursive: true });

  const texto = await pdfToText(pdfPath);

  let parsed;
  if (texto.length > 5000) {
    const blocos = texto.match(/[\s\S]{1,4000}/g) || [];
    let contratos = [];
    for (let i = 0; i < blocos.length; i++) {
      const parcial = await gptExtrairJSON(blocos[i]);
      contratos = contratos.concat(parcial.contratos || []);
      if (i === 0) parsed = parcial;
    }
    parsed.contratos = contratos;
  } else {
    parsed = await gptExtrairJSON(texto);
  }

  const json = posProcessar(parsed, texto);

  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");

  agendarExclusao24h(pdfPath, jsonPath);

  return { fileId, ...json };
}

// ================== Fluxo Lunas ==================
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

  return extrairDeUpload({ fileId, pdfPath, jsonDir });
}
