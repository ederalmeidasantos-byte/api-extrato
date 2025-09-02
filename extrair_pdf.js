import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import pkg from "pdf-parse-fixed";
const pdfParse = pkg;
import OpenAI from "openai";
import { mapBeneficio } from "./beneficios.js";

// === OpenAI ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// === Lunas config ===
const LUNAS_API_URL = process.env.LUNAS_API_URL || "https://lunasdigital.atenderbem.com/int/downloadFile";
const LUNAS_API_KEY = process.env.LUNAS_API_KEY;
const LUNAS_QUEUE_ID = process.env.LUNAS_QUEUE_ID;

// agendar exclusão em 24h
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

// ===== Fallbacks diretos do texto do PDF =====
function extrairNBDoTexto(texto) {
  if (!texto) return "";
  // procura por “NB”, “Número do Benefício”, etc., e também padrões 000.000.000-0
  const reLista = [
    /(?:N[úu]mero\s+do\s+benef[íi]cio|N[ºo]\s*do\s*benef[íi]cio|Benef[íi]cio|NB)[^\d]{0,30}(\d{10,11})/i,
    /(\d{3}\.\d{3}\.\d{3}-\d)/g // 000.000.000-0
  ];
  for (const re of reLista) {
    const m = re.exec(texto);
    if (m && m[1]) return normalizarNB(m[1]);
  }
  // último recurso: primeiro bloco de 10-11 dígitos isolado
  const mLivre = texto.match(/\b(\d{10,11})\b/);
  return mLivre ? normalizarNB(mLivre[1]) : "";
}

function extrairEspecieDoTexto(texto) {
  if (!texto) return { codigo: "", nome: "" };
  // Exemplos de linhas: “Espécie 32 – Aposentadoria por invalidez…”
  const re = /Esp[ée]cie\s*[:\-]?\s*(\d{1,3})\s*[–-]\s*([^\n\r]+)/i;
  const m = re.exec(texto);
  if (m) {
    const codigo = m[1].padStart(2, "0");
    const nome = (m[2] || "").trim();
    return { codigo, nome };
  }
  return { codigo: "", nome: "" };
}

// prompt que força schema e múltiplos contratos ativos
function buildPrompt(texto) {
  return `
Você é um assistente que extrai **todos os empréstimos ativos** de um extrato do INSS e retorna **JSON válido**.

⚠️ REGRAS IMPORTANTES:
- Retorne SOMENTE JSON (sem comentários, sem texto extra).
- Inclua todos os contratos "Ativo".
- Ignore cartões RMC/RCC ou contratos não ativos.
- Sempre incluir "valor_liberado" (quando existir no extrato).
- Se não houver taxa de juros no extrato, calcule a taxa de juros mensal e anual e preencha.
- Campos numéricos devem vir como número com ponto decimal (ex.: 1.85).
- Sempre incluir "data_contrato" (se não houver, use "data_inclusao").
- O número do benefício (nb) deve ser retornado com **apenas dígitos**.
- "beneficio.nome" deve conter o **nome da espécie** do benefício (ex.: "Aposentadoria por invalidez previdenciária").
- "beneficio.codigo" deve conter o **código da espécie** (ex.: "32").

Esquema esperado:
{
  "cliente": "Nome",
  "beneficio": {
    "nb": "6043215431",
    "bloqueio_beneficio": "SIM|NAO",
    "meio_pagamento": "conta corrente",
    "banco_pagamento": "Banco Bradesco S A",
    "agencia": "877",
    "conta": "0001278479",
    "nome": "NOME DA ESPÉCIE",
    "codigo": "CÓDIGO DA ESPÉCIE (ex.: 32)"
  },
  "contratos": [
    {
      "contrato": "2666838921",
      "banco": "Banco Itau Consignado S A",
      "situacao": "Ativo",
      "valor_liberado": 1000.00,
      "valor_parcela": 12.14,
      "qtde_parcelas": 96,
      "data_inclusao": "09/04/2025",
      "inicio_desconto": "05/2025",
      "fim_desconto": "04/2033",
      "data_contrato": "09/04/2025",
      "taxa_juros_mensal": 1.85,
      "taxa_juros_anual": 24.60
    }
  ],
  "data_extrato": "DD/MM/AAAA"
}

Agora gere o JSON com **todos os contratos ativos** a partir do texto abaixo:

${texto}
`;
}

async function pdfToText(pdfPath) {
  const buffer = await fsp.readFile(pdfPath);
  const data = await pdfParse(buffer);
  return data.text;
}

function mesesEntre(inicioMMYYYY, referencia = new Date()) {
  if (!inicioMMYYYY || !/^\d{2}\/\d{4}$/.test(inicioMMYYYY)) return 0;
  const [mm, yyyy] = inicioMMYYYY.split("/").map(Number);
  const a = new Date(yyyy, mm - 1, 1);
  const b = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(0, meses);
}

function normalizarBeneficioComMapa(beneficioParcial, textoBruto) {
  const out = { ...beneficioParcial };

  // NB → só dígitos, com fallback do texto
  out.nb = normalizarNB(out.nb) || extrairNBDoTexto(textoBruto);

  // Tentar identificar espécie (nome + código) de forma robusta
  // 1) Se tiver código, prioriza mapear por código
  let preferenciaCodigo = (out.codigo ?? "").toString().trim();
  let preferenciaNome = (out.nome ?? out.especie ?? out.tipo ?? "").toString().trim();

  // fallback: tenta achar “Espécie” no texto
  if (!preferenciaCodigo && !preferenciaNome) {
    const { codigo, nome } = extrairEspecieDoTexto(textoBruto);
    preferenciaCodigo = codigo || "";
    preferenciaNome = nome || "";
  }

  // usa mapBeneficio para normalizar — ele deve aceitar código OU nome e retornar {codigo, nome}
  let map = null;
  if (preferenciaCodigo) {
    map = mapBeneficio(preferenciaCodigo);
  }
  if ((!map || !map.codigo) && preferenciaNome) {
    map = mapBeneficio(preferenciaNome);
  }

  // Se mapou, força: nome = nome da espécie; codigo = código da espécie
  if (map && (map.codigo || map.nome)) {
    out.codigo = map.codigo || out.codigo || "";
    out.nome = map.nome || out.nome || "";
  }

  // garante tipos string
  out.codigo = out.codigo ? String(out.codigo).padStart(2, "0") : "";
  out.nome = out.nome || "";

  return out;
}

async function gptExtrairJSON(texto) {
  try {
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

    // === Normaliza BENEFÍCIO (nome/código da espécie e NB) ===
    if (parsed?.beneficio) {
      parsed.beneficio = normalizarBeneficioComMapa(parsed.beneficio, texto);
    } else {
      // cria se não veio, usando só fallbacks do texto
      parsed.beneficio = normalizarBeneficioComMapa({}, texto);
    }

    // === Normaliza CONTRATOS ===
    if (parsed?.contratos && Array.isArray(parsed.contratos)) {
      parsed.contratos = parsed.contratos.map(c => {
        let critica = c.critica ?? null;
        let origem_taxa = "extrato"; // default
        const taxa = Number(c.taxa_juros_mensal);

        if (!Number.isFinite(taxa)) {
          origem_taxa = "calculado"; // não tinha taxa → calculada
        } else if (taxa < 1 || taxa > 3) {
          critica = "Taxa fora do intervalo esperado (1% a 3%). Revisar manualmente com contrato físico.";
          delete c.taxa_juros_mensal;
          delete c.taxa_juros_anual;
          origem_taxa = "critica";
        }

        // calcula parcelas pagas e prazo restante
        const total = Number(c.qtde_parcelas) || 0;
        const pagas = Math.min(total, mesesEntre(c.inicio_desconto));
        const restante = Math.max(0, total - pagas);

        return {
          ...c,
          parcelas_pagas: pagas,
          prazo_restante: restante,
          origem_taxa,
          ...(critica ? { critica } : {})
        };
      });
    } else {
      parsed.contratos = [];
    }

    return parsed;
  } catch (err) {
    console.error("❌ Erro parseando JSON do GPT:", err.message);
    return { error: "Falha ao interpretar extrato", detalhe: err.message };
  }
}

// === fluxo para upload local ===
export async function extrairDeUpload({ fileId, pdfPath, jsonDir }) {
  try {
    console.log("🚀 Iniciando extração de upload:", fileId);

    const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

    // 🔧 garante que a pasta existe
    await fsp.mkdir(jsonDir, { recursive: true });

    const texto = await pdfToText(pdfPath);
    console.log("📄 Texto extraído (primeiros 200 chars):", texto.slice(0,200));

    const json = await gptExtrairJSON(texto);
    console.log("🤖 JSON retornado pelo GPT:", json);

    await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
    console.log("✅ JSON salvo em", jsonPath);

    agendarExclusao24h(pdfPath, jsonPath);

    return { fileId, ...json };
  } catch (err) {
    console.error("💥 Erro em extrairDeUpload:", err);
    throw err;
  }
}

// === fluxo para LUNAS ===
export async function extrairDeLunas({ fileId, pdfDir, jsonDir }) {
  try {
    console.log("🚀 Iniciando extração do fileId:", fileId);

    if (!LUNAS_API_KEY) throw new Error("LUNAS_API_KEY não configurada");
    if (!LUNAS_QUEUE_ID) throw new Error("LUNAS_QUEUE_ID não configurada");

    const pdfPath = path.join(pdfDir, `extrato_${fileId}.pdf`);
    const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);

    // 🔧 garante que a pasta existe
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
      console.error("❌ Falha ao baixar da Lunas:", resp.status, t);
      throw new Error(`Falha ao baixar da Lunas: ${resp.status} ${t}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    await fsp.writeFile(pdfPath, Buffer.from(arrayBuffer));
    console.log("✅ PDF salvo em", pdfPath);

    const texto = await pdfToText(pdfPath);
    console.log("📄 Texto extraído (primeiros 200 chars):", texto.slice(0,200));

    const json = await gptExtrairJSON(texto);
    console.log("🤖 JSON retornado pelo GPT:", json);

    await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
    console.log("✅ JSON salvo em", jsonPath);

    agendarExclusao24h(pdfPath, jsonPath);

    return { fileId, ...json };
  } catch (err) {
    console.error("💥 Erro em extrairDeLunas:", err);
    throw err;
  }
}
