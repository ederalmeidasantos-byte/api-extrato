import fs from "fs";
import axios from "axios";
import OpenAI from "openai";

/** ===================== CONFIG ===================== **/
const LUNAS_URL = process.env.LUNAS_URL || "https://lunasdigital.atenderbem.com/int/downloadFile";
const LUNAS_QUEUE_ID = process.env.LUNAS_QUEUE_ID || "25";           // ajuste se precisar
const LUNAS_API_KEY = process.env.LUNAS_API_KEY || "";               // defina no Render
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/** ===================== OPENAI ===================== **/
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/** ===================== UTILS ===================== **/
function toNumber(v) {
  if (v == null) return 0;
  return parseFloat(
    v.toString()
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace("%", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  ) || 0;
}

// PRICE
function parcelaPrice(PV, i, n) {
  const fator = Math.pow(1 + i, n);
  return PV * (i * fator) / (fator - 1);
}

// Busca binária p/ taxa mensal
function encontrarTaxaMensal(PV, n, parcelaDesejada) {
  let min = 0.000001; // ~0,0001% a.m.
  let max = 1.0;      // 100% a.m.
  let taxa = 0;
  for (let k = 0; k < 100; k++) {
    taxa = (min + max) / 2;
    const parcelaCalc = parcelaPrice(PV, taxa, n);
    if (parcelaCalc > parcelaDesejada) max = taxa;
    else min = taxa;
  }
  return taxa; // ex.: 0.0185 = 1,85% a.m.
}

function anualizar(iMensal) {
  return Math.pow(1 + iMensal, 12) - 1;
}

function tryParseJsonPossivelmenteFormatado(texto) {
  // 1) tenta direto
  try { return JSON.parse(texto); } catch {}

  // 2) tenta pegar o primeiro bloco {...}
  const m = texto.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  throw new Error("Resposta do GPT não é JSON válido");
}

/** ===================== DOWNLOAD PDF ===================== **/
async function baixarExtrato(fileId) {
  if (!LUNAS_API_KEY) {
    throw new Error("LUNAS_API_KEY não configurada (defina no Render > Environment).");
  }

  const payload = {
    queueId: Number(LUNAS_QUEUE_ID),
    apiKey: LUNAS_API_KEY,
    fileId: Number(fileId),
    download: true,
  };

  const { data } = await axios.post(LUNAS_URL, payload, { responseType: "arraybuffer" });
  const caminho = `extrato_${fileId}.pdf`;
  fs.writeFileSync(caminho, data);
  return caminho;
}

/** ===================== OPENAI (EXTRAÇÃO) ===================== **/
async function extrairJsonComOpenAI(caminhoPdf) {
  // 1) upload do arquivo
  const file = await openai.files.create({
    file: fs.createReadStream(caminhoPdf),
    purpose: "assistants"
  });

  // 2) prompt para trazer só o que precisamos
  const prompt =
`Você é um extrator de dados de extratos do INSS.
Regras:
- Retorne APENAS JSON válido (sem markdown, sem comentários).
- Extraia todos os campos necessários abaixo.
- Em "contratos_ativos", inclua SOMENTE contratos de empréstimos com situação "Ativo".
- Ignore cartões (RMC/RCC) nos "contratos_ativos".
- Até no máximo 12 contratos.
- Nomes de chaves exatamente como especificado.

Estrutura desejada:
{
  "cliente": "<nome completo>",
  "nb": "<numero do beneficio>",
  "bloqueio_beneficio_origem": "SIM|NAO",    // como aparece no extrato, se existir diretamente
  "beneficio": {
    "tipo": "...",
    "situacao": "...",
    "pagamento": {
      "banco": "...",
      "agencia": "...",
      "conta_corrente": "..."
    },
    "margem_resumo_financeiro": {
      "margem_disponivel": { "emprestimos": number, "rcc": number, "rmc": number },
      "margem_extrapolada": { "emprestimos": number, "rcc": number, "rmc": number }
    }
  },
  "contratos_ativos": [
    {
      "contrato": "...",
      "banco": "...",
      "data_inclusao": "dd/mm/aaaa",
      "inicio_desconto": "mm/aaaa",
      "fim_desconto": "mm/aaaa",
      "qtde_parcelas": number,
      "valor_parcela": number,
      "valor_emprestado": number,
      "iof": number | 0,
      "cet_mensal": number | null,
      "cet_anual": number | null,
      "taxa_juros_mensal": number | null,
      "taxa_juros_anual": number | null,
      "situacao": "Ativo"
    }
  ],
  "cartoes_credito": {
    "rmc": [], "rcc": []
  }
}`;

  const resp = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: "Você extrai dados de PDFs do INSS e responde apenas JSON válido." },
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_file", file_id: file.id }
        ]
      }
    ]
  });

  const texto = resp.output_text;
  return tryParseJsonPossivelmenteFormatado(texto);
}

/** ===================== TRANSFORMAÇÃO & CÁLCULOS ===================== **/
function montarResultadoFinal(fileId, bruto) {
  const cliente = bruto?.cliente ?? null;
  const nb = bruto?.nb ?? bruto?.beneficio?.numero ?? null;

  const banco = bruto?.beneficio?.pagamento?.banco ?? null;
  const agencia = bruto?.beneficio?.pagamento?.agencia ?? null;
  const contaCorrente = bruto?.beneficio?.pagamento?.conta_corrente ?? null;

  const margemDisp = bruto?.beneficio?.margem_resumo_financeiro?.margem_disponivel || {};
  const margemExtra = bruto?.beneficio?.margem_resumo_financeiro?.margem_extrapolada || {};

  // Bloqueio (sim/nao)
  // regra: se origem veio "SIM" => bloqueado => "sim"
  // se origem "NAO" ou liberado => "nao"
  const origem = (bruto?.bloqueio_beneficio_origem || "").toString().trim().toUpperCase();
  let bloqueio_beneficio = null;
  let status_bloqueio_descricao = null;

  if (origem === "SIM") {
    bloqueio_beneficio = "sim";
    status_bloqueio_descricao = "BLOQUEADO PARA EMPRESTIMO";
  } else if (origem === "NAO") {
    bloqueio_beneficio = "nao";
    status_bloqueio_descricao = "Liberado para empréstimo";
  } else {
    // fallback: tenta inferir por margem
    const dispEmp = toNumber(margemDisp?.emprestimos);
    const extraEmp = toNumber(margemExtra?.emprestimos);
    if (dispEmp <= 0 && extraEmp > 0) {
      bloqueio_beneficio = "sim";
      status_bloqueio_descricao = "BLOQUEADO PARA EMPRESTIMO";
    } else {
      bloqueio_beneficio = "nao";
      status_bloqueio_descricao = "Liberado para empréstimo";
    }
  }

  // contratos ativos (somente empréstimos)
  let ativos = Array.isArray(bruto?.contratos_ativos) ? bruto.contratos_ativos : [];
  ativos = ativos
    .filter(c => (c?.situacao || "").toString().toLowerCase() === "ativo")
    .slice(0, 12)
    .map((c) => {
      const PV = toNumber(c?.valor_emprestado);
      const n = parseInt(c?.qtde_parcelas || 0, 10);
      const parcela = toNumber(c?.valor_parcela);

      let taxaMensalCalculada = null;
      let taxaAnualCalculada = null;

      const temTaxa = c?.taxa_juros_mensal != null && toNumber(c?.taxa_juros_mensal) > 0;
      if (!temTaxa && PV > 0 && n > 0 && parcela > 0) {
        const t = encontrarTaxaMensal(PV, n, parcela);
        taxaMensalCalculada = +(t * 100).toFixed(2); // %
        taxaAnualCalculada = +(anualizar(t) * 100).toFixed(2); // %
      }

      return {
        contrato: c?.contrato ?? null,
        banco: c?.banco ?? null,
        data_inclusao: c?.data_inclusao ?? null,
        inicio_desconto: c?.inicio_desconto ?? null,
        fim_desconto: c?.fim_desconto ?? null,
        qtde_parcelas: n || null,
        valor_parcela: parcela || null,
        valor_emprestado: PV || null,
        iof: toNumber(c?.iof) || 0,
        cet_mensal: c?.cet_mensal != null ? toNumber(c?.cet_mensal) : null,
        cet_anual: c?.cet_anual != null ? toNumber(c?.cet_anual) : null,
        taxa_juros_mensal: temTaxa ? toNumber(c?.taxa_juros_mensal) : null,
        taxa_juros_anual: c?.taxa_juros_anual != null ? toNumber(c?.taxa_juros_anual) : null,
        taxa_juros_mensal_calculada: taxaMensalCalculada,   // % (quando faltou)
        taxa_juros_anual_calculada: taxaAnualCalculada,     // % (quando faltou)
        situacao: "Ativo"
      };
    });

  return {
    fileId: String(fileId),
    cliente,
    nb,
    bloqueio_beneficio,                // "sim" | "nao"
    status_bloqueio_descricao,         // texto humano
    meio_pagamento: "conta corrente",  // conforme pedido
    banco_pagamento: banco,
    agencia,
    conta: contaCorrente,
    margem_disponivel: {
      emprestimos: toNumber(margemDisp?.emprestimos),
      rcc: toNumber(margemDisp?.rcc),
      rmc: toNumber(margemDisp?.rmc)
    },
    margem_extrapolada: {
      emprestimos: toNumber(margemExtra?.emprestimos),
      rcc: toNumber(margemExtra?.rcc),
      rmc: toNumber(margemExtra?.rmc)
    },
    contratos_ativos: ativos
  };
}

/** ===================== PIPELINE PRINCIPAL ===================== **/
export async function processarExtratoPorFileId(fileId) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada (defina no Render > Environment).");
  }

  let caminhoPdf = null;
  try {
    console.log(`📥 Baixando extrato fileId=${fileId}...`);
    caminhoPdf = await baixarExtrato(fileId);
    console.log(`✅ PDF salvo em ${caminhoPdf}`);

    console.log("🚀 Enviando PDF para o GPT...");
    const bruto = await extrairJsonComOpenAI(caminhoPdf);
    console.log("📊 JSON bruto extraído do GPT.");

    const final = montarResultadoFinal(fileId, bruto);

    // salva resultado (opcional)
    const outPath = `contratos_${fileId}_com_taxas.json`;
    fs.writeFileSync(outPath, JSON.stringify(final, null, 2), "utf-8");
    console.log(`💾 Resultado salvo em ${outPath}`);

    return final;
  } finally {
    if (caminhoPdf && fs.existsSync(caminhoPdf)) {
      fs.unlinkSync(caminhoPdf);
      console.log(`🗑️ PDF ${caminhoPdf} excluído`);
    }
  }
}
