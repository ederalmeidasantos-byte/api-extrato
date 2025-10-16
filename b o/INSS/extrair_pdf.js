import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { mapBeneficio } from "./beneficios.js";
import { encontrarBanco } from "./bancos.js";

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY não definida. Configure no Render.");
  throw new Error("OPENAI_API_KEY ausente");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ================== Helpers ==================
const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_DIAS_PADRAO = 14;

function agendarExclusaoDias(dias, ...paths) {
  const wait = dias * DAY_MS;
  setTimeout(() => {
    for (const p of paths) {
      try {
        if (p && fs.existsSync(p)) {
          fs.unlinkSync(p);
          console.log("🗑️ Removido após", dias, "dias:", p);
        }
      } catch (e) {
        console.warn("Falha ao excluir", p, e.message);
      }
    }
  }, wait);
}

function cacheValido(p, ttlMs) {
  try {
    const st = fs.statSync(p);
    return Date.now() - st.mtimeMs <= (ttlMs ?? TTL_DIAS_PADRAO * DAY_MS);
  } catch {
    return false;
  }
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

// ================== Detectar contingência ==================
function detectarContingencia(filePath) {
  // PDF é binário, não podemos ler como texto UTF-8
  // Por enquanto, assumir que não é contingência
  // TODO: Implementar detecção correta de contingência via GPT
  console.log("🔍 [CONTINGENCIA] PDF é binário, assumindo não-contingência");
  return false;
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

// ================== Sanitização da resposta ==================
function extractJsonFromText(raw) {
  if (!raw || typeof raw !== "string") throw new Error("Resposta do GPT vazia ou não textual.");

  let s = raw.replace(/^\uFEFF/, "").trim();

  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) return fenced[1].trim();

  s = s.replace(/```(?:json)?/ig, "").replace(/```/g, "").trim();

  const firstObj = s.indexOf("{");
  const lastObj = s.lastIndexOf("}");
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    return s.slice(firstObj, lastObj + 1).trim();
  }

  const firstArr = s.indexOf("[");
  const lastArr = s.lastIndexOf("]");
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    return s.slice(firstArr, lastArr + 1).trim();
  }

  throw new Error("Não foi possível localizar um JSON válido na resposta do GPT.");
}

// ================== Prompt ==================
function buildPrompt(isContingencia = false) {
  let base = `Você é um assistente que extrai somente os empréstimos consignados ativos de um extrato e retorna JSON válido.

🚨 ATENÇÃO - INSS CALCULA MARGEM ERRADA:
O INSS calcula a margem extrapolada incorretamente na segunda tabela.
Use SEMPRE o valor da PRIMEIRA tabela "VALORES DO BENEFÍCIO".

PROCURE na tabela "VALORES DO BENEFÍCIO" a linha "MARGEM EXTRAPOLADA***"
ESTE é o valor correto (exemplo: R$76,20).

IGNORE completamente a tabela "VALORES POR MODALIDADE" para margem_extrapolada.
O sistema corrigirá automaticamente se necessário.

⚠️ INSTRUÇÕES CRÍTICAS:

Responda EXCLUSIVAMENTE em formato JSON válido, sem texto adicional
Inclua TODOS os contratos com situacao "ATIVO"
SEMPRE inclua as seções "contratos_rmc" e "contratos_rcc" (mesmo que vazias [])
Se houver contratos RMC ou RCC no extrato, coloque-os nas seções apropriadas
Valores dentro de contratos devem vir como números (sem formatação BR)
O nome do benefício deve vir exatamente como está no documento
O campo "banco" deve conter somente o CÓDIGO do banco (ex: "237"), nunca o nome
Se não houver valores, use null ou 0
Não invente chaves diferentes, siga o esquema JSON fielmente
SEJA EXTREMAMENTE PRECISO com os valores numéricos

⚠️ ATENÇÃO ESPECIAL PARA MARGENS:

margem_extrapolada: Da primeira tabela "VALORES DO BENEFÍCIO", linha "MARGEM EXTRAPOLADA***" (exemplo: R$76,20)
margem_disponivel_empretimo: Da tabela "VALORES POR MODALIDADE", coluna "EMPRÉSTIMOS", linha "MARGEM DISPONÍVEL"
margem_disponivel_rmc: Da tabela "VALORES POR MODALIDADE", coluna "RMC", linha "MARGEM DISPONÍVEL"
margem_disponivel_rcc: Da tabela "VALORES POR MODALIDADE", coluna "RCC", linha "MARGEM DISPONÍVEL"

🎯 EXEMPLO DA TABELA "VALORES POR MODALIDADE":

MODALIDADE	EMPRÉSTIMOS	RMC	RCC
MARGEM CONSIGNÁVEL	R$455,40	R$75,90	R$75,90
MARGEM UTILIZADA	R$455,70	R$75,90	R$75,90
MARGEM DISPONÍVEL	R$0,00	R$0,00	R$0,00

EXTRAIA os valores da linha "MARGEM DISPONÍVEL" para cada coluna.

⚠️ Atenção especial às datas:

DATA INCLUSÃO → salvar em \`data_inclusao\` no formato DD/MM/YYYY.
INÍCIO DE DESCONTO (competência MM/YYYY) → salvar em \`competencia_inicio_desconto\`.
PRIMEIRO DESCONTO (DD/MM/YYYY) → salvar em \`primeiro_desconto\`.
❌ NÃO confundir "DATA INCLUSÃO" com "INÍCIO DE DESCONTO".
❌ NÃO usar a coluna errada.
`;

  if (isContingencia) {
    base += `⚠️ Este extrato é de CONTINGÊNCIA (OffLine). Inclua no JSON: "origem": "CONTINGENCIA". ⚠️ Para CONTINGÊNCIA: use exatamente o valor da coluna TAXA como taxa_juros_mensal. NÃO recalcule. IOF pode ser igual à taxa se indicado no extrato.`;
  } else {
    base += `⚠️ Este extrato é do INSS oficial. Inclua no JSON: "origem": "INSS".`;
  }

  return base + `
🎯 VOCÊ DEVE RETORNAR EXATAMENTE ESTE FORMATO JSON:

{
"origem": "INSS",
"cliente": "LIGIA CONCEICAO DOS SANTOS",
"beneficio": {
"nb": "7090809227",
"bloqueio_beneficio": "NAO",
"meio_pagamento": "Conta Corrente",
"banco_pagamento": "237",
"agencia": "1",
"conta": "0013407844",
"nomeBeneficio": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA IDOSA",
"codigoBeneficio": "88"
},
"margens": {
"margem_extrapolada": 76.20,
"margem_disponivel_empretimo": 0.00,
"margem_disponivel_rmc": 0.00,
"margem_disponivel_rcc": 0.00
},
"contratos": [
{
"contrato": "368474879-5",
"banco": "623",
"situacao": "ATIVO",
"data_inclusao": "07/02/2023",
"competencia_inicio_desconto": "03/2023",
"qtde_parcelas": 84,
"valor_parcela": 31.50,
"valor_liberado": 2646.00,
"iof": 36.12,
"cet_mensal": 0.00,
"cet_anual": 0.00,
"taxa_juros_mensal": 1.45,
"taxa_juros_anual": 18.86,
"valor_pago": 1158.11
},
{
"contrato": "1100132220",
"banco": "643",
"situacao": "ATIVO",
"data_inclusao": "21/06/2022",
"competencia_inicio_desconto": "07/2022",
"qtde_parcelas": 84,
"valor_parcela": 424.20,
"valor_liberado": 19913.95,
"iof": 0.00,
"cet_mensal": 0.00,
"cet_anual": 0.00,
"taxa_juros_mensal": 1.54,
"taxa_juros_anual": 20.13,
"valor_pago": 0.00
}
],
"contratos_rmc": [],
"contratos_rcc": [],
"data_extrato": "05/09/2025"
}

⚠️ INSTRUÇÕES CRÍTICAS:

Use NÚMEROS sem formatação brasileira (76.20, não "76,20")
SEMPRE inclua "contratos_rmc": [] e "contratos_rcc": []
Para margem_extrapolada use o valor da PRIMEIRA tabela "VALORES DO BENEFÍCIO"
Para banco use APENAS o código numérico (623, não "PAN")
Datas no formato DD/MM/AAAA
Se não houver RMC/RCC, deixe arrays vazios []
RETORNE APENAS O JSON, sem texto adicional`;
}

// ================== GPT Call ==================
async function gptExtrairJSON(pdfPath, isContingencia) {
  console.log("🧠 [GPT] Iniciando leitura do arquivo…");
  console.log("🔍 [DEBUG] Parâmetros recebidos:", { pdfPath, isContingencia });
  console.log("🔍 [DEBUG] Timestamp:", new Date().toISOString());

  const uploaded = await openai.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants"
  });

  console.log("📄 [GPT] Upload concluído. File ID:", uploaded.id);
  console.log("🤖 [GPT] Solicitando extração...");
  console.log("🔍 [DEBUG] Usando APENAS GPT-4.1-mini (sem tentativas)");

  // Usar apenas GPT-4.1-mini direto (como estava funcionando antes)
  console.log("🤖 Usando GPT-4.1-mini (configuração original)...");
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: buildPrompt(isContingencia) },
          { type: "input_file", file_id: uploaded.id }
        ]
      }
    ],
    max_output_tokens: 4000,  // Limite de tokens
    temperature: 0.1  // Baixa temperatura para precisão
  });

  console.log("✅ GPT-4.1-mini respondeu com sucesso");
  console.log("🔍 [DEBUG] Response type:", typeof response);
  console.log("🔍 [DEBUG] Response keys:", Object.keys(response || {}));

  console.log("✅ [GPT] Resposta recebida.");
  
  // Extrair texto da resposta
  let raw = response.output_text;
  console.log("📋 Usando formato responses (GPT-4.1-mini)");
  console.log("🔍 [DEBUG] Raw response length:", raw ? raw.length : 0);

  let parsed;
  try {
    const jsonText = extractJsonFromText(raw);
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error("❌ Erro ao parsear resposta do GPT:", err.message);
    console.error(">>> Preview da resposta (1000 chars):\n", (raw || "").slice(0, 1000));
    throw new Error("Resposta inválida do GPT: " + err.message);
  }

  console.log("✅ [GPT] JSON extraído com sucesso");
  return parsed;
}

// ================== Pós-processamento ==================
function posProcessarJSON(parsed, isContingencia = false) {
  console.log("🔄 [UPLOAD] Aplicando pós-processamento...");

  // ✅ Processamento inicial dos dados básicos (como no backup)
  if (!parsed) parsed = {};
  if (!parsed.beneficio) parsed.beneficio = {};

  parsed.origem = parsed.origem || (isContingencia ? "CONTINGENCIA" : "INSS");

  // ✅ Normalizar NB do benefício
  let nb = normalizarNB(parsed.beneficio.nb || "");
  parsed.beneficio.nb = nb.length >= 10 ? nb : "";

  // ✅ Mapear código do benefício
  const mapped = mapBeneficio(parsed.beneficio.nomeBeneficio || "");
  parsed.beneficio.codigoBeneficio = mapped?.codigo ?? null;

  // ✅ Garantir que contratos seja array
  if (!Array.isArray(parsed.contratos)) parsed.contratos = [];
  const competenciaAtual = getCompetenciaAtual(parsed.data_extrato);

  // ✅ Filtrar apenas contratos ATIVOS e processar
  parsed.contratos = parsed.contratos
    .filter((c) => (String(c.situacao || "").toUpperCase() === "ATIVO"))
    .map(contrato => {
    const valorLiberado = toNumber(contrato.valor_liberado);
    const valorParcela = toNumber(contrato.valor_parcela);
    const qtdeParcelas = parseInt(contrato.qtde_parcelas || 0, 10);
    const valorPago = toNumber(contrato.valor_pago || 0);

    // ✅ Banco vira objeto {codigo, nome}
    const bancoObj = encontrarBanco(String(contrato.banco || "").trim());

    // ✅ Calcular parcelas pagas baseado na competência (como no backup)
    let parcelasPagas = 0;
    let prazoRestante = qtdeParcelas;

    if (contrato.competencia_inicio_desconto && qtdeParcelas > 0) {
      parcelasPagas = diffMeses(contrato.competencia_inicio_desconto, competenciaAtual);
      if (parcelasPagas < 0) parcelasPagas = 0;
      if (parcelasPagas > qtdeParcelas) parcelasPagas = qtdeParcelas;
      prazoRestante = qtdeParcelas - parcelasPagas;
    }

    // ✅ Processamento de taxas (como no backup)
    const taxaRawNum = toNumber(contrato.taxa_juros_mensal);
    const normalizedDecimal = taxaRawNum > 1 ? taxaRawNum / 100 : taxaRawNum;
    let taxaMensalNum = normalizedDecimal;
    let statusTaxa;

    // ===== CONTINGÊNCIA =====
    if (isContingencia) {
      if (taxaRawNum > 0) {
        statusTaxa = "INFORMADA_CONTINGENCIA";
        const taxaAnualDecimal = taxaAnualDeMensal(taxaMensalNum);
        const taxaAnualPercentFull = taxaAnualDecimal * 100;

        return {
          ...contrato,
          banco: bancoObj,
          valor_parcela: formatBRNumber(valorParcela),
          valor_liberado: formatBRNumber(valorLiberado),
          valor_pago: formatBRNumber(valorPago),
          iof: formatBRNumber(toNumber(contrato.iof)),
          cet_mensal: formatBRNumber(taxaRawNum),
          cet_anual: formatBRNumber(taxaAnualPercentFull),
          taxa_juros_mensal: formatBRNumber(taxaRawNum),
          taxa_juros_anual: formatBRNumber(taxaAnualPercentFull),
          status_taxa: statusTaxa,
          prazo_total: qtdeParcelas,
          parcelas_pagas: parcelasPagas,
          prazo_restante: prazoRestante
        };
      } else {
        // ⚠️ contingência sem taxa → tenta recalcular
        statusTaxa = "NAO_INFORMADA_CONTINGENCIA";
        const out = calcTaxaMensalPorBissecao(valorLiberado, valorParcela, qtdeParcelas);
        if (out.ok) {
          taxaMensalNum = out.r;
          statusTaxa = "RECALCULADA";
        } else {
          // 🟢 aplica taxa neutra de 1,45%
          taxaMensalNum = 0.0145;
          statusTaxa = "NEUTRA_ASSUMIDA";
          console.warn("⚠️ Falha ao calcular taxa, usando taxa neutra 1,45% contrato:", contrato.contrato);
        }

        const taxaAnualDecimal = taxaAnualDeMensal(taxaMensalNum);

        return {
          ...contrato,
          banco: bancoObj,
          valor_parcela: formatBRNumber(valorParcela),
          valor_liberado: formatBRNumber(valorLiberado),
          valor_pago: formatBRNumber(valorPago),
          iof: formatBRNumber(toNumber(contrato.iof)),
          cet_mensal: formatPercentBRFromDecimal(taxaMensalNum),
          cet_anual: formatPercentBRFromDecimal(taxaAnualDecimal),
          taxa_juros_mensal: formatPercentBRFromDecimal(taxaMensalNum),
          taxa_juros_anual: formatPercentBRFromDecimal(taxaAnualDecimal),
          status_taxa: statusTaxa,
          prazo_total: qtdeParcelas,
          parcelas_pagas: parcelasPagas,
          prazo_restante: prazoRestante
        };
      }
    }

    // ===== INSS =====
    if (taxaMensalNum > 0) {
      statusTaxa = "INFORMADA_EXTRATO";
    } else {
      const out = calcTaxaMensalPorBissecao(valorLiberado, valorParcela, qtdeParcelas);
      if (out.ok) {
        taxaMensalNum = out.r;
        statusTaxa = "RECALCULADA";
      } else {
        // 🟢 aplica taxa neutra de 1,45%
        taxaMensalNum = 0.0145;
        statusTaxa = "NEUTRA_ASSUMIDA";
        console.warn("⚠️ Falha ao calcular taxa, usando taxa neutra 1,45% contrato:", contrato.contrato);
      }
    }

    const taxaAnualNum = taxaAnualDeMensal(taxaMensalNum);

    return {
      ...contrato,
      banco: bancoObj,
      valor_parcela: formatBRNumber(valorParcela),
      valor_liberado: formatBRNumber(valorLiberado),
      valor_pago: formatBRNumber(valorPago),
      iof: formatBRNumber(toNumber(contrato.iof)),
      cet_mensal: formatPercentBRFromDecimal(toNumber(contrato.cet_mensal)),
      cet_anual: formatPercentBRFromDecimal(toNumber(contrato.cet_anual)),
      taxa_juros_mensal: formatPercentBRFromDecimal(taxaMensalNum),
      taxa_juros_anual: formatPercentBRFromDecimal(taxaAnualNum),
      status_taxa: statusTaxa,
      prazo_total: qtdeParcelas,
      parcelas_pagas: parcelasPagas,
      prazo_restante: prazoRestante
    };
  });

  // Usar a margem extrapolada extraída diretamente do extrato (sem correções)
  const margemExtrapolada = toNumber(parsed.margens?.margem_extrapolada);
  
  // Garantir que as seções RMC e RCC existam (mesmo que vazias)
  if (!parsed.contratos_rmc) {
    parsed.contratos_rmc = [];
  }
  if (!parsed.contratos_rcc) {
    parsed.contratos_rcc = [];
  }
  
  console.log(`📊 Contratos encontrados:`);
  console.log(`   - Empréstimos: ${parsed.contratos?.length || 0}`);
  console.log(`   - RMC: ${parsed.contratos_rmc.length}`);
  console.log(`   - RCC: ${parsed.contratos_rcc.length}`);
  
  console.log(`✅ Margem extrapolada extraída do extrato: R$${margemExtrapolada.toFixed(2)}`);

  // Verificar e corrigir margens RMC e RCC se necessário
  let margemRMC = toNumber(parsed.margens?.margem_disponivel_rmc);
  let margemRCC = toNumber(parsed.margens?.margem_disponivel_rcc);
  
  // Se as margens RMC/RCC estão zeradas, pode ser que o GPT não conseguiu extrair
  // Baseado na imagem, os valores deveriam ser R$0,00 mesmo (margem disponível)
  
  parsed.margens = {
    margem_extrapolada: formatBRNumber(margemExtrapolada),
    margem_disponivel_empretimo: formatBRNumber(toNumber(parsed.margens?.margem_disponivel_empretimo)),
    margem_disponivel_rmc: formatBRNumber(margemRMC),
    margem_disponivel_rcc: formatBRNumber(margemRCC)
  };

  // Garantir que as seções RMC e RCC existam no JSON final
  parsed.contratos_rmc = parsed.contratos_rmc || [];
  parsed.contratos_rcc = parsed.contratos_rcc || [];

  console.log(`📋 JSON final com seções: contratos(${parsed.contratos?.length || 0}), RMC(${parsed.contratos_rmc.length}), RCC(${parsed.contratos_rcc.length})`);
  console.log(`✅ [UPLOAD] Pós-processamento concluído`);

  return parsed;
}

// ================== Função principal ==================
export async function extrairDeUpload({ fileId, pdfPath, jsonDir, ttlMs, idoportunidade }) {
  try {
    console.log("📄 [UPLOAD] Iniciando extração de upload:", fileId);
    console.log("📄 [UPLOAD] Parâmetros recebidos:", {
      fileId,
      pdfPath,
      jsonDir,
      ttlMs,
      idoportunidade
    });

    const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
    console.log("📄 [UPLOAD] JSON path:", jsonPath);

    // Verificar cache
    if (cacheValido(jsonPath, ttlMs)) {
      console.log("📄 [UPLOAD] Cache válido encontrado, carregando...");
      const cached = JSON.parse(await fsp.readFile(jsonPath, "utf-8"));
      console.log("✅ [UPLOAD] Cache carregado com sucesso");
      return cached;
    }

    console.log("🚀 [UPLOAD] Cache não encontrado ou expirado, processando...");
    
    // Incluir ID da oportunidade Kentro se fornecido
    if (idoportunidade) {
      console.log("🎯 [UPLOAD] ID Oportunidade Kentro:", idoportunidade);
    }

    // Garantir que o diretório existe
    await fsp.mkdir(jsonDir, { recursive: true });
    console.log("📁 [UPLOAD] Diretório criado:", jsonDir);

    // Detectar contingência
    console.log("🔍 [UPLOAD] Detectando contingência...");
    const isContingencia = detectarContingencia(pdfPath);
    console.log("🔍 [UPLOAD] Contingência detectada:", isContingencia);

    // Extrair JSON usando GPT
    console.log("🤖 [UPLOAD] Chamando gptExtrairJSON...");
    const parsed = await gptExtrairJSON(pdfPath, isContingencia);
    console.log("✅ [UPLOAD] gptExtrairJSON concluído");

    // Aplicar pós-processamento
    console.log("🔄 [UPLOAD] Aplicando pós-processamento...");
    const finalJSON = posProcessarJSON(parsed, isContingencia);
    console.log("✅ [UPLOAD] Pós-processamento concluído");

    // Incluir ID da oportunidade Kentro no JSON final
    if (idoportunidade) {
      finalJSON.idoportunidade = idoportunidade;
      console.log("✅ [UPLOAD] idoportunidade incluído no JSON:", idoportunidade);
    }

    // Salvar JSON
    await fsp.writeFile(jsonPath, JSON.stringify(finalJSON, null, 2), "utf-8");
    console.log("✅ [UPLOAD] JSON salvo em", jsonPath);

    // Agendar exclusão do PDF após 14 dias
    agendarExclusaoDias(14, pdfPath);

    return finalJSON;

  } catch (err) {
    console.error("❌ [UPLOAD] Erro em extrairDeUpload:", err);
    console.error("❌ [UPLOAD] Stack trace:", err.stack);
    console.error("❌ [UPLOAD] Tipo do erro:", typeof err);
    console.error("❌ [UPLOAD] Nome do erro:", err.name);
    console.error("❌ [UPLOAD] Mensagem do erro:", err.message);
    throw err;
  }
}
