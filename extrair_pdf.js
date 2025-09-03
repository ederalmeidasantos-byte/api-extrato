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

function formatBRNumber(n) {
  return Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPercentBRFromDecimal(dec) {
  return Number(dec * 100).toLocaleString("pt-BR", {
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

// ================== Taxa helpers ==================
function calcTaxaMensalPorBissecao(valorLiberado, valorParcela, prazo) {
  const PV = toNumber(valorLiberado);
  const PMT = toNumber(valorParcela);
  const n = parseInt(prazo || 0, 10);

  if (!(PV > 0 && PMT > 0 && n > 0)) {
    return { ok: false, r: 0, motivo: "entrada_invalida" };
  }
  if (PMT <= PV / n + 1e-9) {
    return { ok: false, r: 0, motivo: "pagamento_insuficiente" };
  }

  const f = (r) => {
    if (r === 0) return PV - PMT * n;
    return PV - PMT * (1 - Math.pow(1 + r, -n)) / r;
  };

  let lo = 0.0;
  let hi = 0.5;
  let flo = f(lo);
  let fhi = f(hi);

  let exp = 0;
  while (flo * fhi > 0 && hi < 5 && exp < 20) {
    hi *= 2;
    fhi = f(hi);
    exp++;
  }
  if (flo * fhi > 0) {
    return { ok: false, r: 0, motivo: "nao_branqueado" };
  }

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-12) {
      return { ok: true, r: mid };
    }
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return { ok: true, r: (lo + hi) / 2 };
}

function taxaAnualDeMensal(rMensal) {
  if (!isFinite(rMensal) || rMensal <= 0) return 0;
  return Math.pow(1 + rMensal, 12) - 1;
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
- Os contratos estão sempre na seção "EMPRÉSTIMOS BANCÁRIOS".
- Ignore contratos com status "EXCLUÍDO" ou "SUSPENSO".
- Considere todas as tabelas de "EMPRÉSTIMOS BANCÁRIOS".

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
      "valor_pago": 5000.00
    }
  ],
  "data_extrato": "DD/MM/AAAA"
}
`;
}

// ================== GPT Call ==================
async function gptExtrairJSON(pdfPath) {
  console.log("🧠 [GPT] Iniciando leitura do PDF…");
  console.log("📤 [GPT] Upload do PDF para OpenAI:", pdfPath);

  const uploaded = await openai.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants"
  });

  console.log("📄 [GPT] Upload concluído. File ID:", uploaded.id);
  console.log("🤖 [GPT] Solicitando extração...");

  let response;
  try {
    response = await openai.responses.create({
      model: "gpt-4.1-mini",
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
  } catch (err) {
    console.warn("⚠️ Falha no gpt-4.1-mini, tentando fallback gpt-4o-mini");
    response = await openai.responses.create({
      model: "gpt-4o-mini",
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
  }

  console.log("✅ [GPT] Resposta recebida.");
  const raw = response.output_text;
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

      const parcelaNum = toNumber(c.valor_parcela);
      const liberadoNum = toNumber(c.valor_liberado);

      let taxaMensalNum = toNumber(c.taxa_juros_mensal);
      let statusTaxa = c.status_taxa || "INFORMADA";

      if (!isFinite(taxaMensalNum) || taxaMensalNum <= 0 || taxaMensalNum >= 1) {
        const out = calcTaxaMensalPorBissecao(liberadoNum, parcelaNum, prazoTotal);
        if (out.ok) {
          taxaMensalNum = out.r;
          statusTaxa = "RECALCULADA";
        } else {
          taxaMensalNum = 0;
          statusTaxa = "FALHA_CALCULO_TAXA";
          console.warn("⚠️ Falha ao calcular taxa (motivo:", out.motivo, ") contrato:", c.contrato);
        }
      }

      let cetMensalNum = toNumber(c.cet_mensal);
      let cetAnualNum  = toNumber(c.cet_anual);
      if (!(cetMensalNum >= 0 && cetMensalNum < 1)) cetMensalNum = 0;
      if (!(cetAnualNum  >= 0 && cetAnualNum  < 5)) cetAnualNum  = 0;

      const taxaAnualNum = taxaAnualDeMensal(taxaMensalNum);

      return {
        ...c,
        valor_parcela: formatBRNumber(parcelaNum),
        valor_liberado: formatBRNumber(liberadoNum),
        valor_pago: formatBRNumber(toNumber(c.valor_pago)),
        iof: formatBRNumber(toNumber(c.iof)),
        cet_mensal: formatPercentBRFromDecimal(cetMensalNum),
        cet_anual:  formatPercentBRFromDecimal(cetAnualNum),
        taxa_juros_mensal: formatPercentBRFromDecimal(taxaMensalNum),
        taxa_juros_anual:  formatPercentBRFromDecimal(taxaAnualNum),
        status_taxa: statusTaxa,
        prazo_total: prazoTotal,
        parcelas_pagas: parcelasPagas,
        prazo_restante: prazoRestante
      };
    });

  parsed.margens = {
    margem_extrapolada: formatBRNumber(toNumber(parsed.margens?.margem_extrapolada)),
    margem_disponivel_empretimo: formatBRNumber(toNumber(parsed.margens?.margem_disponivel_empretimo)),
    margem_disponivel_rmc: formatBRNumber(toNumber(parsed.margens?.margem_disponivel_rmc)),
    margem_disponivel_rcc: formatBRNumber(toNumber(parsed.margens?.margem_disponivel_rcc))
  };

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
