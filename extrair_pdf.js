import fs from "fs";
import OpenAI from "openai";
import axios from "axios";

// 🔑 Sua chave de API GPT (coloque no Render como variável de ambiente!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// === Funções utilitárias ===
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

// Fórmula PRICE
function parcelaPrice(PV, i, n) {
  const fator = Math.pow(1 + i, n);
  return PV * (i * fator) / (fator - 1);
}

// Busca binária para achar taxa mensal
function encontrarTaxa(PV, n, parcelaDesejada) {
  let min = 0.000001;
  let max = 1.0;
  let taxa = 0;
  for (let k = 0; k < 100; k++) {
    taxa = (min + max) / 2;
    let parcelaCalc = parcelaPrice(PV, taxa, n);
    if (parcelaCalc > parcelaDesejada) {
      max = taxa;
    } else {
      min = taxa;
    }
  }
  return taxa;
}

// === Função principal ===
async function extrairContratos(fileId) {
  const pdfFile = `extrato_${fileId}.pdf`;

  try {
    console.log(`📥 Baixando extrato fileId=${fileId}...`);

    // 1. Baixa PDF da sua API
    const response = await axios.post(
      "https://lunasdigital.atenderbem.com/int/downloadFile",
      {
        queueId: 25,
        apiKey: process.env.LUNAS_API_KEY, // 🔑 coloque no Render
        fileId,
        download: true
      },
      { responseType: "arraybuffer" }
    );

    fs.writeFileSync(pdfFile, response.data);
    console.log(`✅ PDF salvo em ${pdfFile}`);

    // 2. Faz upload para o GPT
    console.log("🚀 Enviando PDF para o GPT...");
    const file = await openai.files.create({
      file: fs.createReadStream(pdfFile),
      purpose: "assistants"
    });

    // 3. GPT extrai contratos ativos
    const gptResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: "Você é um assistente que extrai apenas contratos ATIVOS de PDFs de extrato INSS e retorna JSON estruturado e limpo. Exclua RMC e RCC."
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Extraia todos os contratos ativos deste PDF e devolva em JSON estruturado." },
            { type: "input_file", file_id: file.id }
          ]
        }
      ]
    });

    let contratos;
    try {
      contratos = JSON.parse(gptResponse.output_text);
    } catch (e) {
      throw new Error("Resposta do GPT não é JSON válido.");
    }

    // 4. Calcula taxa quando não existir
    contratos.forEach(c => {
      if (!c.taxa_juros_mensal || c.taxa_juros_mensal === "") {
        const PV = toNumber(c.valor_liquido);
        const n = parseInt(c.prazo, 10);
        const parcela = toNumber(c.valor_parcela);
        if (PV > 0 && n > 0 && parcela > 0) {
          const taxa = encontrarTaxa(PV, n, parcela);
          c.taxa_juros_mensal = (taxa * 100).toFixed(2).replace(".", ",") + "%";
        }
      }
    });

    return contratos;

  } finally {
    // 5. Remove PDF temporário
    if (fs.existsSync(pdfFile)) {
      fs.unlinkSync(pdfFile);
      console.log(`🗑️ PDF ${pdfFile} excluído`);
    }
  }
}

export { extrairContratos };
