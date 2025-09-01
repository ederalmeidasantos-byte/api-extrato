// prompt que força schema e números com ponto
function buildPrompt(texto) {
  return `
Você é um assistente que extrai **todos os empréstimos ativos** de um extrato do INSS e retorna **JSON válido**.

REGRAS IMPORTANTES:
- Retorne SOMENTE JSON (sem comentários, sem texto extra).
- Campos numéricos devem vir em número com ponto decimal (ex.: 1.85).
- Incluir "data_contrato" (quando encontrada, senão usar "data_inclusao").
- Ignorar cartões RMC/RCC e quaisquer contratos não "Ativo".
- Se a taxa de juros não for encontrada, deixe **null**.

Esquema desejado:
{
  "cliente": "Nome",
  "beneficio": {
    "nb": "604321543-1",
    "bloqueio_beneficio": "SIM|NAO",
    "meio_pagamento": "conta corrente",
    "banco_pagamento": "Banco Bradesco S A",
    "agencia": "877",
    "conta": "0001278479"
  },
  "contratos": [
    {
      "contrato": "2666838921",
      "banco": "Banco Itau Consignado S A",
      "situacao": "Ativo",
      "valor_parcela": 12.14,
      "qtde_parcelas": 96,
      "valor_liberado": 850.00,
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

Agora, gere o JSON a partir do texto abaixo:

${texto}
`;
}

// === calculadora de taxa se vier null ===
function calcularTaxaDeContrato(contrato) {
  try {
    if (!contrato.valor_parcela || !contrato.qtde_parcelas || !contrato.valor_liberado) return contrato;

    // método: busca taxa de juros mensal aproximada via iteração
    const PMT = contrato.valor_parcela;
    const N = contrato.qtde_parcelas;
    const PV = contrato.valor_liberado;

    let taxa = 0.02; // chute inicial 2% ao mês
    for (let i = 0; i < 50; i++) {
      const denominador = 1 - Math.pow(1 + taxa, -N);
      if (denominador === 0) break;
      const pmtCalc = (PV * taxa) / denominador;
      const erro = pmtCalc - PMT;
      if (Math.abs(erro) < 0.01) break;
      taxa = taxa - erro / (PV * N / 1000); // ajuste simples
      if (taxa <= 0) taxa = 0.0001;
    }

    contrato.taxa_juros_mensal = Number((taxa * 100).toFixed(2));
    contrato.taxa_juros_anual = Number((((1 + taxa) ** 12 - 1) * 100).toFixed(2));
  } catch (e) {
    console.warn("⚠️ Falha ao calcular taxa de contrato:", e.message);
  }
  return contrato;
}

function completarContratos(json) {
  if (!json?.contratos) return json;
  json.contratos = json.contratos.map(c => {
    if (!c.taxa_juros_mensal || c.taxa_juros_mensal === null) {
      return calcularTaxaDeContrato(c);
    }
    return c;
  });
  return json;
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

    const parsed = JSON.parse(raw);

    // pós-processa contratos → calcula taxa se veio null
    return completarContratos(parsed);
  } catch (err) {
    console.error("❌ Erro parseando JSON do GPT:", err.message);
    return { error: "Falha ao interpretar extrato", detalhe: err.message };
  }
}
