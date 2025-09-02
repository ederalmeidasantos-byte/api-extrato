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

// ================== GPT Call ==================
async function gptExtrairParte(texto, instrucao) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1500,
    messages: [
      { role: "system", content: "Retorne sempre JSON válido. Sem explicações, apenas JSON." },
      { role: "user", content: `${instrucao}\n\nTexto do extrato:\n${texto}` }
    ]
  });

  let raw = completion.choices[0]?.message?.content?.trim() || "{}";
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(raw);
}

// ================== Pós-processamento ==================
function calcularTaxaJurosMensalPorPMT(valorParcela, valorLiberado, prazoTotal) {
  const PMT = toNumber(valorParcela);
  const PV = toNumber(valorLiberado);
  const n = parseInt(prazoTotal, 10);
  if (PMT <= 0 || PV <= 0 || !Number.isFinite(n) || n <= 0) return 0;

  const pvCalc = (r) => PMT * (1 - Math.pow(1 + r, -n)) / r;

  let lo = 1e-9, hi = 0.05;
  while (pvCalc(hi) > PV && hi < 0.2) hi *= 2;
  if (hi >= 0.2 && pvCalc(hi) > PV) return 0;

  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const pv = pvCalc(mid);
    if (Math.abs(pv - PV) < 0.01) return mid;
    if (pv > PV) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function posProcessar(json) {
  if (!json) return {};

  // NB
  if (json.beneficio) {
    json.beneficio.nb = normalizarNB(json.beneficio.nb);
    const mapped = mapBeneficio(json.beneficio.nomeBeneficio || "");
    json.beneficio.codigoBeneficio = mapped?.codigo ?? null;
  }

  // Contratos
  if (Array.isArray(json.contratos)) {
    json.contratos = json.contratos.map((c) => {
      const prazoTotal = parseInt(c.qtde_parcelas || 0, 10);
      let taxaMensal = toNumber(c.taxa_juros_mensal);
      let taxaAnual = toNumber(c.taxa_juros_anual);
      if (!taxaMensal) {
        const estimada = calcularTaxaJurosMensalPorPMT(c.valor_parcela, c.valor_liberado, prazoTotal);
        if (estimada > 0) {
          taxaMensal = estimada;
          taxaAnual = Math.pow(1 + taxaMensal, 12) - 1;
        }
      }

      return {
        ...c,
        valor_parcela: formatBRNumber(toNumber(c.valor_parcela)),
        valor_liberado: formatBRNumber(toNumber(c.valor_liberado)),
        valor_pago: formatBRNumber(toNumber(c.valor_pago)),
        taxa_juros_mensal: formatBRTaxa(taxaMensal),
        taxa_juros_anual: formatBRTaxa(taxaAnual),
        cet_mensal: formatBRTaxa(toNumber(c.cet_mensal) || taxaMensal),
        cet_anual: formatBRTaxa(toNumber(c.cet_anual) || taxaAnual),
        prazo_total: prazoTotal
      };
    });
  }

  return json;
}

// ================== PDF ==================
async function pdfToPages(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return (data.text || "").split(/\f/); // separa por páginas
}

// ================== Fluxo ==================
export async function extrairDeUploadPaginas({ fileId, pdfPath, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}_paginas.json`);
  if (fs.existsSync(jsonPath)) {
    console.log("♻️ Usando JSON cacheado em", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração separada por páginas:", fileId);
  await fsp.mkdir(jsonDir, { recursive: true });

  const paginas = await pdfToPages(pdfPath);

  // P1: dados cliente/benefício
  const dadosCliente = await gptExtrairParte(
    paginas[0] || "",
    `Extraia apenas os dados do cliente e benefício do INSS em JSON. Campos: cliente, beneficio (nb, bloqueio_beneficio, meio_pagamento, banco_pagamento, agencia, conta, nomeBeneficio, codigoBeneficio).`
  );

  // P2: margens
  const margens = await gptExtrairParte(
    paginas[1] || "",
    `Extraia apenas os valores de margem. Campos: margens {disponivel, extrapolada, rmc, rcc}.`
  );

  // P3 em diante: contratos
  let contratos = [];
  for (let i = 2; i < paginas.length; i++) {
    const parcial = await gptExtrairParte(
      paginas[i],
      `Extraia apenas os contratos ativos (exceto RMC/RCC). Campos: contrato, banco, situacao, data_inclusao, competencia_inicio_desconto, qtde_parcelas, valor_parcela, valor_liberado, iof, cet_mensal, cet_anual, taxa_juros_mensal, taxa_juros_anual, valor_pago.`
    );
    contratos = contratos.concat(parcial.contratos || []);
  }

  const final = posProcessar({
    ...dadosCliente,
    margens: margens?.margens || {},
    contratos
  });

  await fsp.writeFile(jsonPath, JSON.stringify(final, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);

  agendarExclusao24h(pdfPath, jsonPath);

  return { fileId, ...final };
}
