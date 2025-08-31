const fs = require("fs");
const axios = require("axios");

async function testarDownload(codigoArquivo) {
  try {
    // 1. Baixar PDF da sua API
    const response = await axios.post(
      "https://lunasdigital.atenderbem.com/int/downloadFile",
      {
        queueId: 25,
        apiKey: "cd4d0509169d4e2ea9177ac66c1c9376",
        fileId: codigoArquivo,
        download: true
      },
      { responseType: "arraybuffer" } // <- garante binário cru
    );

    // 2. Salvar em disco para inspecionar
    const pdfBuffer = Buffer.from(response.data);
    fs.writeFileSync("teste.pdf", pdfBuffer);

    console.log("✅ Arquivo salvo como teste.pdf, confira se abre no seu leitor de PDF.");
  } catch (err) {
    console.error("❌ Erro ao baixar:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data.toString());
    }
  }
}

// Teste passando um fileId válido
testarDownload("123456789");
