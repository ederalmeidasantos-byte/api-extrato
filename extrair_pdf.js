import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { mapBeneficio } from "./beneficios.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    maximumFractionDigits: 2,
  });
}

function formatBRTaxa(nAsDecimal) {
  return Number(nAsDecimal * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// ================== Cálculo de Taxa ==================
function calcularTaxaJuros(valorParcela, valorLiberado, prazo) {
  if (!valorParcela || !valorLiberado || !prazo) return 0;
  const maxIter = 100;
  const tol = 1e-8;
  let i = 0.02; // chute inicial 2% a.m.

  for (let k = 0; k < maxIter; k++) {
    const vi = valorLiberado;
    const vf = valorParcela * ((1 - Math.pow(1 + i, -prazo)) / i);
    const f = vf - vi;
    const fPrime = (valorParcela * (prazo * Math.pow(1 + i, -(prazo + 1)))) / (i * i);
    const novoI = i - f / (fPrime || 1e-9);
    if (Math.abs(novoI - i) < tol) return novoI;
    i = novoI;
  }
  return i;
}

// ================== Prompt ==================
function buildPrompt() {
  return `
Você é um assistente que extrai **somente os empréstimos consignados ativos** de um extrato do INSS e retorna **JSON válido**.

⚠️ Regras importantes:
- Leia apenas as seções do PDF chamadas **"EMPRÉSTIMOS BANCÁRIOS"**.
- Em cada tabela, considere **todos os contratos ATIVOS**.
- Ignore linhas ou contratos com status **"EXCLUÍDO"**, **"SUSPENSO"** ou similares.
- Podem existir várias tabelas em diferentes páginas: **considere todas**, mas sempre apenas as da seção "EMPRÉSTIMOS BANCÁRIOS".
- Cada parte do extrato costuma aparecer em páginas específicas:
  - **Página 1**: Identificação do cliente e dados do benefício.
  - **Página 2**: Informações de margens (margem consignável, disponível, extrapolada, RMC e RCC).
  - **A partir da página 3**: Tabelas de contratos (empréstimos bancários).
- Retorne SOMENTE JSON.
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
    "margem_extrapolada": 0,
    "margem_disponivel_empretimo": 0,
    "margem_disponivel_rmc": 0,
    "margem_disponivel_rcc": 0
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
      "valor_pago": 5000.00,
      "status_taxa": null
    }
  ],
  "data_extrato": "DD/MM/AAAA"
}
`;
}

// ================== GPT Call ==================
async function gptExtrairJSON(pdfPath) {
  console.log("📂 Fazendo upload para GPT:", pdfPath);

  const uploaded = await openai.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants",
  });

  console.log("✅ Upload concluído, file_id:", uploaded.id);

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: buildPrompt() },
          { type: "input_file", file_id: uploaded.id },
        ],
      },
    ],
  });

  const raw = response.output_text;
  console.log("📥 Resposta bruta recebida do GPT");
  return JSON.parse(raw);
}

// ================== Pós-processamento ==================
function posProcessar(parsed) {
  if (!parsed) parsed = {};
  if (!parsed.beneficio) parsed.beneficio = {};

  let nb = normalizarNB(parsed.beneficio.nb || "");
  if (nb.length < 10) nb = "";
  parsed.beneficio.nb = nb;

  const mapped = mapBeneficio(parsed.beneficio.nomeBeneficio || "");
  parsed.beneficio.codigoBeneficio = mapped?.codigo ?? null;

  if (!Array.isArray(parsed.contratos)) parsed.contratos = [];
  const competenciaAtual = getCompetenciaAtual(parsed.data_extrato);

  parsed.contratos = parsed.contratos
    .filter((c) => (String(c.situacao || "").toUpperCase() === "ATIVO"))
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

      // Recalcular taxa se necessário
      if (!toNumber(c.taxa_juros_mensal)) {
        try {
          const i = calcularTaxaJuros(toNumber(c.valor_parcela), toNumber(c.valor_liberado), prazoTotal);
          c.taxa_juros_mensal = formatBRTaxa(i);
          c.taxa_juros_anual = formatBRTaxa(Math.pow(1 + i, 12) - 1);
          c.status_taxa = "RECALCULADA";
          console.log(`🔄 Taxa recalculada para contrato ${c.contrato}: ${c.taxa_juros_mensal}% ao mês`);
        } catch (err) {
          console.warn(`⚠️ Falha ao recalcular taxa do contrato ${c.contrato}:`, err.message);
        }
      } else {
        c.taxa_juros_mensal = formatBRTaxa(toNumber(c.taxa_juros_mensal));
        c.taxa_juros_anual = formatBRTaxa(toNumber(c.taxa_juros_anual));
      }

      return {
        ...c,
        valor_parcela: formatBRNumber(toNumber(c.valor_parcela)),
        valor_liberado: formatBRNumber(toNumber(c.valor_liberado)),
        valor_pago: formatBRNumber(toNumber(c.valor_pago)),
        cet_mensal: formatBRTaxa(toNumber(c.cet_mensal)),
        cet_anual: formatBRTaxa(toNumber(c.cet_anual)),
        prazo_total: prazoTotal,
        parcelas_pagas: parcelasPagas,
        prazo_restante: prazoRestante,
      };
    });

  return parsed;
}

// ================== Upload Flow ==================
export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

  if (fs.existsSync(jsonPath)) {
    console.log("♻️ Usando JSON cacheado em", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração de upload:", fileId);
  await fsp.mkdir(jsonDir, { recursive: true });

  const parsed = await gptExtrairJSON(pdfPath);
  const json = posProcessar(parsed);

  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);
  agendarExclusao24h(pdfPath, jsonPath);

  return { fileId, ...json };
}
