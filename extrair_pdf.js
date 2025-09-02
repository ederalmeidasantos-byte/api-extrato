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

const LUNAS_API_URL = process.env.LUNAS_API_URL || "https://lunasdigital.atenderbem.com/int/downloadFile";
const LUNAS_API_KEY = process.env.LUNAS_API_KEY;
const LUNAS_QUEUE_ID = process.env.LUNAS_QUEUE_ID;

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

function buildPrompt(texto) {
  return `
Você é um assistente que extrai **todos os empréstimos ativos** de um extrato do INSS e retorna **JSON válido**.

⚠️ REGRAS IMPORTANTES:
- Retorne SOMENTE JSON (sem comentários, sem texto extra).
- Inclua todos os contratos "Ativo".
- Ignore cartões RMC/RCC ou contratos não ativos.
- Sempre incluir "valor_liberado" (quando existir no extrato).
- Se não houver taxa de juros no extrato, calcule a taxa de juros mensal e anual e preencha.
- Todos os valores DEVEM vir no formato brasileiro:
  - Valores monetários → "15.529,56"
  - Taxas (%) → "2,80"
- Sempre incluir "data_contrato" (se não houver, use "data_inclusao").

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
    "disponivel": "123,45",
    "extrapolada": "-76,20",
    "rmc": "0,00",
    "rcc": "0,00"
  },
  "contratos": [
    {
      "contrato": "021033",
      "banco": "BANCO SANTANDER OLE",
      "data_contrato": "16/05/2022",
      "competencia_inicio_desconto": "06/2022",
      "competencia_fim_desconto": "05/2029",
      "qtde_parcelas": 84,
      "valor_parcela": "424,10",
      "valor_liberado": "15.529,56",
      "iof": "0,00",
      "cet_mensal": "2,80",
      "cet_anual": "33,60",
      "taxa_juros_mensal": "2,80",
      "taxa_juros_anual": "33,60",
      "valor_pago": "15.529,56",
      "situacao": "Ativo"
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

async function gptExtrairJSON(texto) {
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

  // normalização do benefício
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

  return parsed;
}

// === fluxo para upload local ===
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
  const json = await gptExtrairJSON(texto);

  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);

  agendarExclusao24h(pdfPath, jsonPath);

  return { fileId, ...json };
}

// === fluxo para LUNAS ===
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

  const texto = await pdfToText(pdfPath);
  const json = await gptExtrairJSON(texto);

  await fsp.writeFile(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  console.log("✅ JSON salvo em", jsonPath);

  agendarExclusao24h(pdfPath, jsonPath);

  return { fileId, ...json };
}
