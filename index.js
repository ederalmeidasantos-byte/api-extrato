import express from "express";
import axios from "axios";
import pdf from "pdf-parse";

const app = express();
app.use(express.json());

// rota principal
app.post("/extrato", async (req, res) => {
  try {
    const { codigoArquivo } = req.body;

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

    // 🔍 3. Extrair informações do benefício
    const bloqueado = texto.includes("Bloqueado para empréstimo");
    const margemMatch = texto.match(/MARGEM EXTRAPOLADA\*+\s+R\$(.*)/);
    const margemExtrapolada = margemMatch
      ? margemMatch[1].trim()
      : "0,00";

    // 🔍 4. Extrair contratos
    const contratos = [];
    const linhas = texto.split("\n");

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];

      if (/^\d{5,}/.test(linha)) {
        const contrato = linha.trim();

        let banco = "";
        for (let j = i; j < i + 4; j++) {
          if (linhas[j] && linhas[j].match(/BANCO|BRASIL|ITAU|C6|FACTA/i)) {
            banco = linhas[j].replace("BANCO", "").trim();
            break;
          }
        }

        const detalhesLinha = linhas[i + 5] || "";
        const parcelasMatch = detalhesLinha.match(/(\d{2,3})\s/);
        const parcelaMatch = detalhesLinha.match(/R\$[\d.,]+/g);

        const parcelas = parcelasMatch ? parseInt(parcelasMatch[1]) : null;
        const parcela = parcelaMatch ? parcelaMatch[0].replace("R$", "").trim() : null;
        const valorEmprestado = parcelaMatch && parcelaMatch[1]
          ? parcelaMatch[1].replace("R$", "").trim()
          : null;

        const taxaMatch = detalhesLinha.match(/\s(\d,\d{2})\s/);
        const taxaMensal = taxaMatch ? taxaMatch[1] : "0";

        const inicioMatch = detalhesLinha.match(/\d{2}\/\d{2}\/\d{2}/);
        const inicioDesconto = inicioMatch ? inicioMatch[0] : null;

        contratos.push({
          contrato,
          banco: banco || null,
          parcelas,
          parcela,
          valorEmprestado,
          taxaMensal,
          inicioDesconto,
        });
      }
    }

    // 5. Retorno final
    return res.json({
      codigoArquivo,
      bloqueado,
      margemExtrapolada,
      contratos,
    });

  } catch (err) {
    console.error("Erro na rota /extrato:", err);
    return res.status(500).json({ error: "Erro ao processar extrato" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`);
});
