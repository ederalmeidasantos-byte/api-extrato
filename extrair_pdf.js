import fs from "fs";
import fsp from "fs/promises";
import path from "path";
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
Você é um assistente que extrai **somente os empréstimos consignados ativos** de um extrato do INSS e retorna **JSON válido**.

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
  "margens": {},
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

// ================== GPT Call com fallback ==================
async function gptExtrairJSON(pdfPath) {
  // Upload do PDF
  const uploaded = await openai.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants"
  });

  async function tentarExtracao(model) {
    console.log(`🤖 Usando modelo: ${model}`);
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: buildPrompt() },
            { type: "input_file", file_id: uploaded.id }
          ]
        }
      ]
    });
    return response.output_text;
  }

  let raw;
  try {
    raw = await tentarExtracao("gpt-4.1-mini");
  } catch (err) {
    console.warn("⚠️ Falha no gpt-4.1-mini, tentando com gpt-4.1...", err.message);
    raw = await tentarExtracao("gpt-4.1");
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("❌ Erro ao parsear JSON retornado pelo GPT:", e.message);
    throw new Error("GPT não retornou JSON válido");
  }
}

// ================== Pós-processamento ==================
function posProcessar(parsed) {
  if (!parsed) parsed = {};
  if (!parsed.beneficio) parsed.beneficio = {};

  // NB
  let nb = normalizarNB(parsed.beneficio.nb || "");
  if (nb.length < 10) nb = "";
  parsed.beneficio.nb = nb;

  // Código de benefício
  const mapped = mapBeneficio(parsed.beneficio.nomeBeneficio || "");
  parsed.beneficio.codigoBeneficio = mapped?.codigo ?? null;

  // Contratos
  if (!Array.isArray(parsed.contratos)) parsed.contratos = [];
  const competenciaAtual = getCompetenciaAtual(parsed.data_extrato);

  parsed.contratos = parsed.contratos
    .filter(c => String(c.situacao || "").toUpperCase() === "ATIVO")
    .filter(c => !/RMC|RCC/i.test(c.contrato || "")) // remove RMC/RCC
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
        valor_parcela: toNumber(c.valor_parcela),
        valor_liberado: toNumber(c.valor_liberado),
        valor_pago: toNumber(c.valor_pago),
        taxa_juros_mensal: toNumber(c.taxa_juros_mensal),
        taxa_juros_anual: toNumber(c.taxa_juros_anual),
        cet_mensal: toNumber(c.cet_mensal),
        cet_anual: toNumber(c.cet_anual),
        prazo_total: prazoTotal,
        parcelas_pagas: parcelasPagas,
        prazo_restante: prazoRestante
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
