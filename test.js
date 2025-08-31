const fs = require("fs");
const axios = require("axios");

(async () => {
  try {
    // Lê o PDF local e converte para base64
    const pdfBase64 = fs.readFileSync("extrato.pdf").toString("base64");
    console.log("✅ PDF carregado. Enviando para a API...");

    // Chama sua API local
    const resp = await axios.post("http://localhost:3000/extrair", { pdfBase64 });

    // Pega o campo correto retornado pelo Cloudmersive
    const texto = resp?.data?.textoExtraido?.TextResult || "";

    console.log("\n📄 Primeiros caracteres do texto extraído:");
    console.log(texto.slice(0, 500) + (texto.length > 500 ? "..." : ""));

    // Regex específicas para os contratos
    // Cada contrato está em linhas tipo:
    // "...     96     R$12,14      R$528,71 ..."
    // Qtde parcelas → valor da parcela → valor emprestado

    const contratos = [];
    const regex = /(\d{1,3})\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)/g;
    let match;

    while ((match = regex.exec(texto)) !== null) {
      contratos.push({
        prazo: match[1],                // número de parcelas
        parcela: match[2],              // valor da parcela
        valorEmprestado: match[3]       // valor emprestado/liberado
      });
    }

    console.log("\n🔎 Contratos encontrados:");
    console.log(contratos);

  } catch (err) {
    console.error("❌ Erro:", err.response?.data || err.message);
  }
})();
