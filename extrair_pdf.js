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
  // nAsDecimal ex.: 0.0138 -> "1,38"
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

function stripDiacritics(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

// ------- Buscar primeiro valor não-vazio em aliases -------
function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

// ======== PARSE MARGENS diretamente do TEXTO (robusto) ========
function parseMargensDoTexto(texto) {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

  let disponivel = null, rmc = null, rcc = null, extrapolada = null;

  const linhas = texto.split(/\r?\n/);

  for (let idx = 0; idx < linhas.length; idx++) {
    const raw = clean(linhas[idx]);
    const line = stripDiacritics(raw.toUpperCase());

    // 1) MARGEM DISPONÍVEL* (na mesma linha costumam vir os 3: disponivel, RMC e RCC)
    if (line.includes("MARGEM DISPONIVEL")) {
      const nums = (line.match(/(\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2})/g) || []);
      const rRmc = /RMC[^0-9]*((\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2}))/i.exec(line);
      const rRcc = /RCC[^0-9]*((\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2}))/i.exec(line);

      if (nums.length > 0 && disponivel === null) disponivel = nums[0];
      if (rRmc) rmc = rRmc[1]; else if (nums.length > 1) rmc = nums[1];
      if (rRcc) rcc = rRcc[1]; else if (nums.length > 2) rcc = nums[2];

      // Se por algum motivo RMC/RCC estiverem na linha seguinte
      if ((!rmc || !rcc) && idx + 1 < linhas.length) {
        const next = stripDiacritics(clean(linhas[idx + 1]).toUpperCase());
        const rRmc2 = /RMC[^0-9]*((\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2}))/i.exec(next);
        const rRcc2 = /RCC[^0-9]*((\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2}))/i.exec(next);
        if (!rmc && rRmc2) rmc = rRmc2[1];
        if (!rcc && rRcc2) rcc = rRcc2[1];
      }
      continue;
    }

    // 2) MARGEM EXTRAPOLADA***
    if (line.includes("MARGEM EXTRAPOLADA")) {
      const n = (line.match(/(\d{1,3}(\.\d{3})*,\d{2}|\d+,\d{2})/) || [])[0];
      if (n) extrapolada = n;
      continue;
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
Você é um assistente que extrai **somente os empréstimos consignados ativos** de um extrato do INSS e retorna **JSON válido**.

Ordem do PDF (importante):
- **Página 1**: Dados do cliente e do benefício (NB, nome do benefício exatamente como aparece no PDF, banco de pagamento, agência, conta, situação).
- **Página 2**: Margens. NÃO calcule: apenas leia os valores. 
  - "MARGEM DISPONÍVEL*" -> primeira coluna: disponível; também contém RMC e RCC na mesma linha.
  - "MARGEM EXTRAPOLADA***" -> valor único.
- **Página 3 em diante**: Contratos ativos. Ignore cartões RMC/RCC e qualquer item não-ativo.

⚠️ Regras:
- Retorne **SOMENTE JSON** (sem comentários).
- Contratos devem ter estes campos e nomes exatamente:
  "contrato","banco","situacao","data_inclusao","competencia_inicio_desconto","qtde_parcelas",
  "valor_parcela","valor_liberado","iof","cet_mensal","cet_anual","taxa_juros_mensal","taxa_juros_anual","valor_pago"
- Use números **crus** (sem formatação BR) dentro de contratos (exemplo: 15529.56, 424.10, 0.0238).
- Cabeçalho "beneficio": mantenha o nome do benefício **exatamente como está no PDF** (não padronize).
- Não invente valores. Se não houver, use null ou 0.

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
    "nomeBeneficio": "Texto exato do PDF em azul",
    "codigoBeneficio": null
  },
  "margens": {},   // será sobrescrito depois
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

// ======== Cálculo de taxa (bisseção) sempre que vier zerada ========
function calcularTaxaJurosMensalPorPMT(valorParcela, valorLiberado, prazoTotal) {
  const PMT = toNumber(valorParcela);
  const PV = toNumber(valorLiberado);
  const n = parseInt(prazoTotal, 10);

  if (PMT <= 0 || PV <= 0 || !Number.isFinite(n) || n <= 0) return 0;

  // Função PVcalc(r) = PMT * (1 - (1+r)^-n) / r
  const pvCalc = (r) => PMT * (1 - Math.pow(1 + r, -n)) / r;

  // Bracketing dinâmico: [lo, hi] com PVcalc(lo) >= PV >= PVcalc(hi)
  let lo = 1e-9;
  let hi = 0.05; // 5% a.m. inicial (consignado geralmente < 3% a.m., mas abrimos margem)
  while (pvCalc(hi) > PV && hi < 0.2) hi *= 2; // aumenta até cruzar
  if (hi >= 0.2 && pvCalc(hi) > PV) {
    // não conseguiu cruzar — devolve 0 para não chutar
    return 0;
  }

  // Bisseção
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const pv = pvCalc(mid);
    if (Math.abs(pv - PV) < 0.01) return mid;
    if (pv > PV) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ================== Pós-processamento ==================
function posProcessar(parsed, texto) {
  // --------- Normalizar benefício ---------
  if (!parsed) parsed = {};
  if (!parsed.beneficio) parsed.beneficio = {};

  // NB pode vir como "nb" ou "numero" etc.
  const nbRaw = pick(parsed.beneficio, "nb", "numero", "beneficio", "n_beneficio");
  parsed.beneficio.nb = normalizarNB(nbRaw || "");

  // Nome do benefício: preservar o que veio do PDF
  const nomeOriginal = pick(parsed.beneficio, "nomeBeneficio", "nome_beneficio", "descricao");
  parsed.beneficio.nomeBeneficio = nomeOriginal || "";

  // Mapear código a partir do melhor indicativo, mas NÃO sobrescrever o nome original
  const preferenciaParaCodigo =
    pick(parsed.beneficio, "codigoBeneficio") ||
    nomeOriginal ||
    pick(parsed.beneficio, "tipo", "descricao") ||
    "";

  const mapped = mapBeneficio(preferenciaParaCodigo);
  parsed.beneficio.codigoBeneficio = mapped?.codigo ?? parsed.beneficio.codigoBeneficio ?? null;

  // --------- Margens (fonte da verdade = texto) ---------
  const margensFromText = parseMargensDoTexto(texto);
  parsed.margens = {
    disponivel: margensFromText.disponivel,
    extrapolada: margensFromText.extrapolada,
    rmc: margensFromText.rmc,
    rcc: margensFromText.rcc
  };

  // --------- Contratos ---------
  if (!Array.isArray(parsed.contratos)) parsed.contratos = [];

  const competenciaAtual = getCompetenciaAtual(parsed.data_extrato);

  parsed.contratos = parsed.contratos
    .filter(c => (String(c.situacao || "").toUpperCase() === "ATIVO"))
    .map((c, i) => {
      // Padronizar campos/aliases
      const valorLiberadoRaw = pick(c, "valor_liberado", "valor_emprestado", "valor_creditado");
      const inicioRaw = pick(
        c,
        "competencia_inicio_desconto",
        "competencia_inicio",
        "inicio_desconto",
        "primeiro_desconto" // pode vir DD/MM/AAAA
      );
      const qtdeParcelasRaw = pick(c, "qtde_parcelas", "prazo_total", "parcelas");
      const dataInclusaoRaw = pick(c, "data_inclusao", "data", "data_contratacao");

      // Normalizar "MM/AAAA" se vier "DD/MM/AAAA"
      const normMMYYYY = (s) => {
        if (!s) return "";
        const t = String(s).trim();
        const m1 = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // DD/MM/AAAA
        if (m1) return `${m1[2]}/${m1[3]}`;
        const m2 = t.match(/^(\d{2})\/(\d{4})$/); // MM/AAAA
        if (m2) return t;
        return t; // deixar como veio (tentaremos mesmo assim)
      };

      let competenciaInicio = normMMYYYY(inicioRaw) || normMMYYYY(dataInclusaoRaw) || "";
      const prazoTotal = parseInt(qtdeParcelasRaw || 0, 10) || 0;

      // Calcular parcelas pagas / prazo restante
      let parcelasPagas = 0;
      let prazoRestante = prazoTotal;

      if (competenciaInicio && prazoTotal > 0) {
        parcelasPagas = diffMeses(competenciaInicio, competenciaAtual);
        if (!Number.isFinite(parcelasPagas)) parcelasPagas = 0;

        if (parcelasPagas < 0) parcelasPagas = 0;                  // início no futuro
        if (parcelasPagas > prazoTotal) parcelasPagas = prazoTotal; // não ultrapassar
        prazoRestante = prazoTotal - parcelasPagas;

        console.log(
          `🧮 Prazo contrato#${i + 1} (${c.contrato || "s/num"}): inicio=${competenciaInicio}, atual=${competenciaAtual}, pagas=${parcelasPagas}, restante=${prazoRestante}`
        );
      } else {
        console.log(
          `⚠️ Prazo não calculado contrato#${i + 1} (${c.contrato || "s/num"}): inicio='${competenciaInicio}' prazoTotal=${prazoTotal}`
        );
      }

      // Calcular taxas se vierem vazias/zeradas
      const valorParcelaN = toNumber(c.valor_parcela);
      const valorLiberadoN = toNumber(valorLiberadoRaw);
      let taxaMensal = toNumber(c.taxa_juros_mensal);
      let taxaAnual = toNumber(c.taxa_juros_anual);

      const veioZerada = !taxaMensal || taxaMensal === 0;
      if (veioZerada) {
        const estimada = calcularTaxaJurosMensalPorPMT(valorParcelaN, valorLiberadoN, prazoTotal);
        if (estimada > 0) {
          taxaMensal = estimada;
          taxaAnual = Math.pow(1 + taxaMensal, 12) - 1;
          console.log(
            `🔁 Taxa recalculada contrato#${i + 1} (${c.contrato || "s/num"}): mensal=${formatBRTaxa(taxaMensal)}% a.m., anual=${formatBRTaxa(taxaAnual)}% a.a.`
          );
        } else {
          console.log(
            `⚠️ Não foi possível recalcular taxa contrato#${i + 1} (${c.contrato || "s/num"}): parcela=${valorParcelaN}, liberado=${valorLiberadoN}, prazo=${prazoTotal}`
          );
        }
      } else if (!taxaAnual || taxaAnual === 0) {
        taxaAnual = Math.pow(1 + taxaMensal, 12) - 1;
      }

      // CET: por padrão igual à taxa (você pode evoluir para incluir IOF/tarifas)
      const cetMensal = toNumber(c.cet_mensal) || taxaMensal || 0;
      const cetAnual = toNumber(c.cet_anual) || (Math.pow(1 + cetMensal, 12) - 1);

      return {
        ...c,
        // garantir o nome padrão que o resto do fluxo espera
        competencia_inicio_desconto: competenciaInicio || c.competencia_inicio_desconto || "",
        qtde_parcelas: prazoTotal,

        valor_parcela: formatBRNumber(valorParcelaN),
        valor_liberado: formatBRNumber(valorLiberadoN),
        valor_pago: formatBRNumber(toNumber(c.valor_pago)),

        taxa_juros_mensal: formatBRTaxa(taxaMensal),
        taxa_juros_anual: formatBRTaxa(taxaAnual),
        cet_mensal: formatBRTaxa(cetMensal),
        cet_anual: formatBRTaxa(cetAnual),

        prazo_total: prazoTotal,
        parcelas_pagas: parcelasPagas,
        prazo_restante: prazoRestante
      };
    });

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
    console.log("♻️ Usando JSON cacheado em", jsonPath);
    const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
    return { fileId, ...cached };
  }

  console.log("🚀 Iniciando extração de upload:", fileId);
  await fsp.mkdir(jsonDir, { recursive: true });

  const texto = await pdfToText(pdfPath);

  // Fatiamento automático (se necessário)
  let parsed;
  if (texto.length > 5000) {
    console.log("✂️ Texto grande, fatiando...");
    const blocos = texto.match(/[\s\S]{1,4000}/g) || [];
    let contratos = [];
    for (let i = 0; i < blocos.length; i++) {
      console.log(`🔎 Processando bloco ${i + 1}/${blocos.length}`);
      const parcial = await gptExtrairJSON(blocos[i]);
      contratos = contratos.concat(parcial.contratos || []);
      if (i === 0) parsed = parcial; // cabeçalho do 1º
    }
    parsed.contratos = contratos;
  } else {
    parsed = await gptExtrairJSON(texto);
  }

  const json = posProcessar(parsed, texto);

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
