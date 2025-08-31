import express from "express";
import axios from "axios";
import pdf from "pdf-parse";

const app = express();
app.use(express.json());

// rota para extrair dados do extrato
app.post("/extrato", async (req, res) => {
  try {
    const { codigoArquivo } = req.body;
    if (!codigoArquivo) {
      return res.status(400).json({ error: "codigoArquivo não enviado" });
    }

    // 🔹 Chama a API que traz o PDF bruto
    const response = await axios.post(
      "https://lunasdigital.atenderbem.com/int/downloadFile",
      {
        queueId: 25,
        apiKey: "cd4d0509169d4e2ea9177ac66c1c9376",
        fileId: codigoArquivo,
        download: true,
      },
      { responseType: "arraybuffer" }
    );

    // 🔹 Converte PDF em texto
    const dataBuffer = Buffer.from(response.data, "binary");
    const pdfData = await pdf(dataBuffer);
    const texto = pdfData.text;

    // 🔹 Verifica se benefício está bloqueado
    const bloqueado = !/Elegível para empréstimos/i.test(texto);

    // 🔹 Captura a margem extrapolada apenas de "VALORES DO BENEFÍCIO"
    let margemExtrapolada = "0,00";
    const matchMargem = texto.match(/VALORES DO BENEF[ÍI]CIO[\s\S]*?MARGEM EXTRAPOLADA\*{3}\s+R\$\s*([\d\.,]+)/i);
    if (matchMargem) {
      margemExtrapolada = matchMargem[1].trim();
    }

    // 🔹 Captura bloco de contratos
    const blocoContratosMatch = texto.match(/EMPR[ÉE]STIMOS BANC[ÁA]RIOS[\s\S]*?CONTRATOS ATIVOS E SUSPENSOS\*([\s\S]*?)(?:\*Contratos|\nVALORES DO BENEF[ÍI]CIO|$)/i);
    const contratos = [];

    if (blocoContratosMatch) {
      const bloco = blocoContratosMatch[1];

      // Divide cada contrato pelo número do contrato (5+ dígitos)
      const contratosBrutos = bloco.split(/\n\s*(?=\d{5,})/);

      contratosBrutos.forEach(c => {
        const contrato = (c.match(/(\d{5,})/) || [])[1] || null;
        const banco = (c.match(/BANCO\s+([A-ZÇ\s]+)/i) || [])[1]?.trim() || null;
        const parcelas = (c.match(/\b(\d{2,3})\b\s+R\$/) || [])[1] || null;
        const parcela = (c.match(/R\$\s*([\d\.,]+)\s+(?=R\$)/) || [])[1] || null;
        const valorEmprestado = (c.match(/R\$\s*([\d\.,]+)(?!.*R\$)/) || [])[1] || null;
        const taxaMensal = (c.match(/JUROS\s+MENSAL\s+(\d,\d{2})/i) || [])[1] || "0";
        const inicioDesconto = (c.match(/(\d{2}\/\d{2}\/\d{2})/) || [])[1] || null;

        contratos.push({
          contrato,
          banco,
          parcelas,
          parcela,
          valorEmprestado,
          taxaMensal,
          inicioDesconto
        });
      });
    }

    res.json({
      codigoArquivo,
      bloqueado,
      margemExtrapolada,
      contratos
    });

  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: "Erro ao processar extrato" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ API rodando na porta ${PORT}`));
