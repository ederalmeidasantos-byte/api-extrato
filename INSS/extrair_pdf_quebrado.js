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
    paths.forEach(p => {
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
          console.log(`🗑️ [AUTO-DELETE] ${path.basename(p)} removido após ${dias} dias`);
        }
      } catch (err) {
        console.warn(`⚠️ [AUTO-DELETE] Falha ao remover ${p}:`, err.message);
      }
    });
  }, wait);
}

function toNumber(str) {
  if (typeof str === "number") return str;
  if (!str) return 0;
  return parseFloat(String(str).replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
}

function formatBRNumber(num) {
  return typeof num === "number" ? num.toFixed(2).replace(".", ",") : String(num || "0,00");
}

// ================== Prompt ==================
function buildPrompt(isContingencia = false) {
  let base = `
Você é um assistente que extrai **somente os empréstimos consignados ativos** de um extrato e retorna **JSON válido**.

🚨 ATENÇÃO - INSS CALCULA MARGEM ERRADA:
O INSS calcula a margem extrapolada incorretamente na segunda tabela.
Use SEMPRE o valor da PRIMEIRA tabela "VALORES DO BENEFÍCIO".

PROCURE na tabela "VALORES DO BENEFÍCIO" a linha "MARGEM EXTRAPOLADA***" 
ESTE é o valor correto (exemplo: R$76,20).

IGNORE completamente a tabela "VALORES POR MODALIDADE" para margem_extrapolada.
O sistema corrigirá automaticamente se necessário.

⚠️ INSTRUÇÕES CRÍTICAS:
- Responda EXCLUSIVAMENTE em formato JSON válido, sem texto adicional
- Inclua TODOS os contratos com situacao "ATIVO" - NÃO PULE NENHUM CONTRATO
- Conte quantos contratos ativos existem na tabela e extraia TODOS eles
- SEMPRE inclua as seções "contratos_rmc" e "contratos_rcc" (mesmo que vazias [])
- Se houver contratos RMC ou RCC no extrato, coloque-os nas seções apropriadas
- Valores dentro de contratos devem vir como números (sem formatação BR)
- O nome do benefício deve vir exatamente como está no documento
- O campo "banco" deve conter **somente o CÓDIGO do banco** (ex: "237"), nunca o nome
- Se não houver valores, use null ou 0
- Não invente chaves diferentes, siga o esquema JSON fielmente
- SEJA EXTREMAMENTE PRECISO com os valores numéricos
- IMPORTANTE: Se você encontrar 5 contratos ativos, extraia TODOS os 5. Se encontrar 3, extraia TODOS os 3.

⚠️ ATENÇÃO ESPECIAL PARA MARGENS:
- **margem_extrapolada**: Da primeira tabela "VALORES DO BENEFÍCIO", linha "MARGEM EXTRAPOLADA***" (exemplo: R$76,20)
- **margem_disponivel_empretimo**: Da tabela "VALORES POR MODALIDADE", coluna "EMPRÉSTIMOS", linha "MARGEM DISPONÍVEL"
- **margem_disponivel_rmc**: Da tabela "VALORES POR MODALIDADE", coluna "RMC", linha "MARGEM DISPONÍVEL"  
- **margem_disponivel_rcc**: Da tabela "VALORES POR MODALIDADE", coluna "RCC", linha "MARGEM DISPONÍVEL"

🎯 EXEMPLO DA TABELA "VALORES POR MODALIDADE":
| MODALIDADE        | EMPRÉSTIMOS | RMC    | RCC    |
|-------------------|-------------|--------|--------|
| MARGEM CONSIGNÁVEL| R$455,40    | R$75,90| R$75,90|
| MARGEM UTILIZADA  | R$455,70    | R$75,90| R$75,90|
| MARGEM DISPONÍVEL | R$0,00      | R$0,00 | R$0,00 |

EXTRAIA os valores da linha "MARGEM DISPONÍVEL" para cada coluna.

⚠️ Atenção especial às datas:
- **DATA INCLUSÃO** → salvar em \`data_inclusao\` no formato DD/MM/YYYY.
- **INÍCIO DE DESCONTO** (competência MM/YYYY) → salvar em \`competencia_inicio_desconto\`.
- **PRIMEIRO DESCONTO** (DD/MM/YYYY) → salvar em \`primeiro_desconto\`.

❌ NÃO confundir "DATA INCLUSÃO" com "INÍCIO DE DESCONTO".
❌ NÃO usar a coluna errada.

🎯 ESQUEMA JSON OBRIGATÓRIO:
{
  "idoportunidade": "string",
  "origem": "INSS",
  "cliente": "string",
  "beneficio": {
    "nb": "string",
    "bloqueio_beneficio": "string",
    "meio_pagamento": "string",
    "banco_pagamento": "string",
    "agencia": "string",
    "conta": "string",
    "nomeBeneficio": "string",
    "codigoBeneficio": "string"
  },
  "margens": {
    "margem_extrapolada": "string",
    "margem_disponivel_empretimo": "string",
    "margem_disponivel_rmc": "string",
    "margem_disponivel_rcc": "string"
  },
  "contratos": [
    {
      "contrato": "string",
      "banco": {
        "codigo": "string",
        "nome": "string"
      },
      "situacao": "ATIVO",
      "data_inclusao": "DD/MM/YYYY",
      "competencia_inicio_desconto": "MM/YYYY",
      "qtde_parcelas": number,
      "valor_parcela": "string",
      "valor_liberado": "string",
      "iof": "string",
      "cet_mensal": "string",
      "cet_anual": "string",
      "taxa_juros_mensal": "string",
      "taxa_juros_anual": "string",
      "valor_pago": "string",
      "status_taxa": "INFORMADA_EXTRATO",
      "prazo_total": number,
      "parcelas_pagas": number,
      "prazo_restante": number
    }
  ],
  "contratos_rmc": [],
  "contratos_rcc": [],
  "data_extrato": "DD/MM/YYYY"
}

🚨 CRÍTICO: Extraia TODOS os contratos ativos que encontrar. Se há 5 contratos na tabela, retorne 5. Se há 3, retorne 3. NÃO PULE NENHUM!
`;

  if (isContingencia) {
    base += `
    
🔄 MODO CONTINGÊNCIA ATIVADO:
- Use dados simulados se necessário
- Foque na estrutura correta do JSON
- Priorize a extração de todos os contratos ativos
`;
  }

  return base;
}

// ================== GPT Call ==================
async function gptExtrairJSON(pdfPath, isContingencia) {
  console.log("🧠 [GPT] Iniciando leitura do arquivo…");

  const uploaded = await openai.files.create({
    file: fs.createReadStream(pdfPath),
    purpose: "assistants"
  });

  console.log("📄 [GPT] Upload concluído. File ID:", uploaded.id);
  console.log("🤖 [GPT] Solicitando extração...");

  let response;
  try {
    // Usar Assistants API com GPT-4o (melhor para PDFs)
    console.log("🤖 Usando Assistants API com GPT-4o (otimizado para PDFs)...");
    
    const assistant = await openai.beta.assistants.create({
      name: "Extrator de Extrato INSS",
      instructions: buildPrompt(isContingencia),
      model: "gpt-4o",
      tools: [{ type: "file_search" }],
      temperature: 0.1
    });

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "Extraia TODOS os contratos ativos deste extrato PDF. Não pule nenhum contrato.",
      attachments: [
        {
          file_id: uploaded.id,
          tools: [{ type: "file_search" }]
        }
      ]
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });

    // Aguardar conclusão
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== "completed") {
      if (runStatus.status === "failed") {
        throw new Error(`Run failed: ${runStatus.last_error?.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    
    if (lastMessage.content[0].type === "text") {
      response = {
        choices: [{
          message: {
            content: lastMessage.content[0].text.value
          }
        }]
      };
    } else {
      throw new Error("Resposta não é texto");
    }
    
    console.log("✅ Assistants API respondeu com sucesso (otimizado para PDFs)");
    
    // Limpar recursos
    await openai.beta.assistants.del(assistant.id);
    
  } catch (err) {
    console.warn("⚠️ Falha no Assistants API, tentando método alternativo...", err.message);
    
    try {
      // Método alternativo com GPT-4o-mini
      console.log("🤖 Tentando GPT-4o-mini como fallback...");
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildPrompt(isContingencia) },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:application/pdf;base64,${fs.readFileSync(pdfPath).toString('base64')}`
                }
              }
            ]
          }
        ],
        max_tokens: 6000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      
      console.log("✅ GPT-4o-mini respondeu com sucesso (fallback)");
      
    } catch (fallbackErr) {
      console.error("❌ Falha em ambos os métodos:", fallbackErr.message);
      throw fallbackErr;
    }
  }

  console.log("📄 [GPT] Resposta recebida, processando...");

  const content = response.choices[0].message.content;
  console.log("📝 [GPT] Conteúdo bruto:", content.substring(0, 200) + "...");

  let parsed;
  try {
    parsed = JSON.parse(content);
    console.log("✅ [GPT] JSON parseado com sucesso");
  } catch (parseErr) {
    console.error("❌ [GPT] Erro ao fazer parse do JSON:", parseErr.message);
    console.log("📄 [GPT] Conteúdo problemático:", content);
    throw new Error(`Resposta não é JSON válido: ${parseErr.message}`);
  }

  return posProcessar(parsed, isContingencia);
}

// ================== Pós-processamento ==================
function posProcessar(parsed, isContingencia) {
  console.log("🔧 [PÓS-PROCESSAMENTO] Iniciando...");

  // Garantir estrutura básica
  if (!parsed.contratos) {
    parsed.contratos = [];
  }
  if (!parsed.contratos_rmc) {
    parsed.contratos_rmc = [];
  }
  if (!parsed.contratos_rcc) {
    parsed.contratos_rcc = [];
  }

  // Processar cada contrato
  parsed.contratos = parsed.contratos.map((c, index) => {
    console.log(`🔍 [PÓS-PROCESSAMENTO] Processando contrato ${index + 1}: ${c.contrato}`);
    
    // Garantir que banco seja objeto
    if (typeof c.banco === "string") {
      c.banco = { codigo: c.banco, nome: encontrarBanco(c.banco) };
    }
    
    // Garantir campos obrigatórios
    c.situacao = c.situacao || "ATIVO";
    c.status_taxa = c.status_taxa || "INFORMADA_EXTRATO";
    
    // Converter valores numéricos
    c.qtde_parcelas = Number.isFinite(+c.qtde_parcelas) ? +c.qtde_parcelas : 0;
    c.prazo_total = Number.isFinite(+c.prazo_total) ? +c.prazo_total : c.qtde_parcelas;
    c.parcelas_pagas = Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0;
    c.prazo_restante = Number.isFinite(+c.prazo_restante) ? +c.prazo_restante : c.prazo_total;
    
    // Calcular saldo devedor se não existir
    if (!c.saldo_devedor && c.valor_liberado) {
      c.saldo_devedor = c.valor_liberado;
    }
    
    console.log(`✅ [PÓS-PROCESSAMENTO] Contrato ${index + 1} processado: ${c.contrato} - ${c.banco?.nome}`);
    
    return c;
  });

  console.log(`📊 [PÓS-PROCESSAMENTO] Total de contratos processados: ${parsed.contratos.length}`);
  console.log("✅ [PÓS-PROCESSAMENTO] Concluído!");

  return parsed;
}

// ================== Função Principal ==================
export async function extrairDeUpload({ fileId, pdfPath, jsonDir, ttlMs, idoportunidade }) {
  const jsonPath = path.join(jsonDir, `extrato_${fileId}.json`);
  
  console.log(`🚀 [EXTRAÇÃO] Iniciando para fileId: ${fileId}`);
  console.log(`📄 [EXTRAÇÃO] PDF: ${pdfPath}`);
  console.log(`📄 [EXTRAÇÃO] JSON: ${jsonPath}`);
  console.log(`🆔 [EXTRAÇÃO] ID Oportunidade: ${idoportunidade}`);

  try {
    // Verificar se já existe
    if (fs.existsSync(jsonPath)) {
      console.log("📄 [EXTRAÇÃO] JSON já existe, carregando...");
      const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      console.log(`📊 [EXTRAÇÃO] Contratos encontrados: ${existing.contratos?.length || 0}`);
      return existing;
    }

    // Verificar se PDF existe
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF não encontrado: ${pdfPath}`);
    }

    // Extrair com GPT
    console.log("🤖 [EXTRAÇÃO] Iniciando extração com GPT...");
    const resultado = await gptExtrairJSON(pdfPath, false);
    
    // Adicionar metadados
    resultado.idoportunidade = idoportunidade || `MANUAL_${fileId}_${Date.now()}`;
    resultado.origem = "INSS";
    resultado.data_extrato = new Date().toLocaleDateString('pt-BR');

    // Salvar resultado
    console.log(`💾 [EXTRAÇÃO] Salvando JSON: ${jsonPath}`);
    await fsp.writeFile(jsonPath, JSON.stringify(resultado, null, 2));
    
    console.log(`✅ [EXTRAÇÃO] Concluída com sucesso!`);
    console.log(`📊 [EXTRAÇÃO] Contratos extraídos: ${resultado.contratos?.length || 0}`);
    
    // Agendar exclusão
    agendarExclusaoDias(TTL_DIAS_PADRAO, pdfPath, jsonPath);
    
    return resultado;
    
  } catch (error) {
    console.error("❌ [EXTRAÇÃO] Erro:", error.message);
    throw error;
  }
}