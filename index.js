const express = require("express");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
app.use(express.json());

// === Função para baixar o PDF da sua API interna ===
async function baixarArquivo(codigoArquivo) {
  try {
    console.log("📥 Baixando arquivo do CRM, codigoArquivo:", codigoArquivo);

    const response = await axios.post("https://lunasdigital.atenderbem.com/int/downloadFile", {
      queueId: 25, // ajuste se precisar
      apiKey: "cd4d0509169d4e2ea9177ac66c1c9376", // ⚠️ substitua pela real
      fileId: codigoArquivo,
      download: true
    }, {
      responseType: "arraybuffer" // importante para PDF
    });

    console.log("✅ Arquivo baixado com sucesso, tamanho:", response.data.length);
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao baixar arquivo:", err.message);
    return null;
  }
}

// === Converter PDF em texto (Cloudmersive) ===
async function pdfParaTexto(pdfBuffer) {
  try {
    console.log("🔄 Enviando PDF para Cloudmersive...");

    const form = new FormData();
    form.append("file", pdfBuffer, { filename: "extrato.pdf" });

    const response = await axios.post("https://api.cloudmersive.com/convert/pdf/to/txt", form, {
      headers: {
        "Apikey": "1d68371d-57cf-42ee-9b19-c7d950c12e39", // sua API KEY
        ...form.getHeaders()
      },
      maxBodyLength: Infinity
    });

    console.log("✅ PDF convertido em texto, tamanho:", response.data.TextResult.length);
    return response.data.TextResult;
  } catch (err) {
    console.error("❌ Erro ao converter PDF:", err.message);
    return null;
  }
}

// === Extrair contratos ativos ===
function extrairContratosAtivos(texto) {
  console.log("📑 Iniciando parser de contratos...");
  const contratos = [];
  const linhas = texto.split(/\r?\n/);

  for (let i = 0; i < linhas.length; i++) {
    if (/Ativo/i.test(linhas[i])) {
      let bloco = linhas.slice(i, i + 6).join(" ");

      const contrato = bloco.match(/(\d{6,})/);
      const banco = bloco.match(/(ITAU|C6|BANCO DO BRASIL|FACTA|SAFRA|CAIXA|SANTANDER)/i);
      const parcelas = bloco.match(/\s(\d{2,3})\s+R\$/);
      const parcela = bloco.match(/R\$([\d.,]+)/);
      const valores = [...bloco.matchAll(/R\$([\d.,]+)/g)];
      const valorEmprestado = valores.length > 1 ? valores[1][1] : null;
      const taxaMensal = bloco.match(/\s(\d,\d{2})\s/);
      const inicioDesconto = bloco.match(/(\d{2}\/\d{2}\/\d{2})/);

      contratos.push({
        contrato: contrato ? contrato[1] : null,
        banco: banco ? banco[1].trim() : null,
        parcelas: parcelas ? parseInt(parcelas[1]) : null,
        parcela: parcela ? parcela[1] : null,
        valorEmprestado: valorEmprestado || null,
        taxaMensal: taxaMensal ? taxaMensal[1] : "0",
        inicioDesconto: inicioDesconto ? inicioDesconto[1] : null
      });
    }
  }

  console.log("✅ Contratos encontrados:", contratos.length);
  return contratos;
}

// === Verificar bloqueio ===
function verificarBloqueio(texto) {
  if (/Elegível para empréstimos/i.test(texto)) return false;
  if (/Bloqueado para empréstimo/i.test(texto)) return true;
  return null;
}

// === Extrair margem extrapolada ===
function extrairMargemExtrapolada(texto) {
  const regex = /MARGEM EXTRAPOLADA\*{3}\s+R\$([\d.,]+)/i;
  const match = texto.match(regex);
  return match ? match[1] : null;
}

// === Rota principal ===
app.post("/extrato", async (req, res) => {
  const { codigoArquivo } = req.body;

  if (!codigoArquivo) {
    return res.status(400).json({ error: "codigoArquivo não enviado" });
  }

  console.log("🚀 Iniciando processamento para codigoArquivo:", codigoArquivo);

  const pdfBuffer = await baixarArquivo(codigoArquivo);
  if (!pdfBuffer) {
    return res.status(500).json({ error: "Erro ao baixar arquivo" });
  }

  const texto = await pdfParaTexto(pdfBuffer);
  if (!texto) {
    return res.status(500).json({ error: "Erro ao converter PDF para texto" });
  }

  const contratosAtivos = extrairContratosAtivos(texto);
  const bloqueado = verificarBloqueio(texto);
  const margemExtrapolada = extrairMargemExtrapolada(texto);

  console.log("📤 Retornando resposta final...");

  res.json({
    codigoArquivo,
    bloqueado,
    margemExtrapolada,
    contratos: contratosAtivos
  });
});

// === Porta do Render ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
