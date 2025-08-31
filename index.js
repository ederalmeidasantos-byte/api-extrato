import express from "express";
import axios from "axios";
import pdf from "pdf-parse";

const app = express();
app.use(express.json());

app.post("/extrato", async (req, res) => {
  try {
    const { codigoArquivo } = req.body;

    // Se não veio codigoArquivo, retorna vazio
    if (!codigoArquivo) {
      return res.json({});
    }

    // 1. Buscar PDF da sua API
    const pdfResponse = await axios.post(
      "https://lunasdigital.atenderbem.com/int/downloadFile",
      {
        queueId: 25,
        apiKey: "cd4d0509169d4e2ea9177ac66c1c9376",
        fileId: codigoArquivo,
        download: true,
      },
      { responseType: "arraybuffer" }
    );

    // 2. Extrair texto do PDF
    const data = await pdf(pdfResponse.data);
    const texto = data.text;

    // 3. Verificar se está bloqueado
    const bloqueado = !/Elegível para empréstimos/i.test(texto);

    // 4. Capturar margem extrapolada
    const margemMatch = texto.match(/MARGEM EXTRAPOLADA\*{0,3}\s+R\$([\d\.,]+)/i);
    const margemExtrapolada = margemMatch ? margemMatch[1].trim() : "0,00";

    // 5. Buscar contratos em "EMPRÉSTIMOS BANCÁRIOS"
    const contratos = [];
    const regexContrato = /(\d{5,})\s+.*?\s+(\d{2}\/\d{4})\s+(\d{2}\/\d{4})\s+(\d+)\s+R\$([\d\.,]+)\s+R\$([\d\.,]+).*?(\d,\d{2})\s+\d+,\d{2}\s+(\d,\d{2})\s+\d+,\d{2}.*?(\d{2}\/\d{2}\/\d{2})/gs;

    let match;
    while ((match = regexContrato.exec(texto)) !== null) {
      contratos.push({
        contrato: match[1],
        parcelas: parseInt(match[4]),
        parcela: match[5],
        valorEmprestado: match[6],
        taxaMensal: match[7],
        inicioDesconto: match[9],
      });
    }

    return res.json({
      codigoArquivo,
      bloqueado,
      margemExtrapolada,
      contratos,
    });
  } catch (error) {
    console.error("Erro ao processar extrato:", error);
    return res.status(500).json({ error: "Erro ao processar extrato" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
