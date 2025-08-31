const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const pdfParse = require("pdf-parse");

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));

function normalizarValor(str) {
  if (!str) return null;
  return str.replace(/[^\d,]/g, "").replace(",", ".");
}

function extrairContratos(texto) {
  const contratos = [];
  const inicio = texto.indexOf("EMPRÉSTIMOS BANCÁRIOS");
  if (inicio === -1) return contratos;

  const bloco = texto.substring(inicio);
  const linhas = bloco.split("\n").map(l => l.trim()).filter(l => l);

  let contratoAtual = null;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Detecta contrato (número com 5+ dígitos)
    if (/^\d{5,}/.test(linha)) {
      if (contratoAtual) contratos.push(contratoAtual);
      contratoAtual = {
        contrato: linha,
        banco: null,
        parcelas: null,
        parcela: null,
        valorEmprestado: null,
        taxaMensal: "0",
        inicioDesconto: null,
      };
    }

    if (contratoAtual) {
      // Detecta banco (se linha ou próxima linha tiver banco)
      if (/BANCO|ITAU|BRASIL|BRADESCO|C6|FACTA/i.test(linha)) {
        contratoAtual.banco = linha.replace("BANCO", "").trim();
      } else if (!contratoAtual.banco && i + 1 < linhas.length && /ITAU|BRASIL|C6|FACTA|BRADESCO/i.test(linhas[i + 1])) {
        contratoAtual.banco = linhas[i + 1].trim();
      }

      // Detecta linha com parcelas / valor parcela / valor emprestado
      if (/R\$/.test(linha)) {
        const partes = linha.split(/\s+/);
        const valores = partes.filter(p => p.includes("R$"));

        if (valores.length >= 2) {
          contratoAtual.parcela = normalizarValor(valores[0]);
          contratoAtual.valorEmprestado = normalizarValor(valores[1]);
        }

        // Número de parcelas (procura número entre datas e R$)
        const qtdParcelas = partes.find(p => /^\d{2,3}$/.test(p));
        if (qtdParcelas) contratoAtual.parcelas = parseInt(qtdParcelas);
      }

      // Taxa Juros Mensal
      if (/JUROS/i.test(linha) || /\d,\d{2}/.test(linha)) {
        const taxa = linha.match(/\d,\d{2}/g);
        if (taxa) {
          contratoAtual.taxaMensal = taxa[taxa.length - 1]; // pega a última da linha
        }
      }

      // Início do desconto (data dd/mm/aa)
      if (/\d{2}\/\d{2}\/\d{2}/.test(linha)) {
        contratoAtual.inicioDesconto = linha.match(/\d{2}\/\d{2}\/\d{2}/)[0];
      }
    }
  }

  if (contratoAtual) contratos.push(contratoAtual);

  // Só ATIVOS
  return contratos.filter(c => c.contrato);
}

app.post("/extrato", async (req, res) => {
  try {
    const { codigoArquivo } = req.body;
    if (!codigoArquivo) {
      return res.status(400).json({ error: "codigoArquivo é obrigatório" });
    }

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

    const pdfBuffer = Buffer.from(response.data);
    const data = await pdfParse(pdfBuffer);
    const texto = data.text;

    // Extrai contratos
    const contratos = extrairContratos(texto);

    // Bloqueio de empréstimo
    const bloqueado = texto.includes("Bloqueado para empréstimo");

    // Margem Extrapolada
    let margemExtrapolada = "0,00";
    const margemMatch = texto.match(/MARGEM EXTRAPOLADA\*+\s+R\$?([\d.,]+)/);
    if (margemMatch) margemExtrapolada = margemMatch[1];

    res.json({
      codigoArquivo,
      bloqueado,
      margemExtrapolada,
      contratos,
    });
  } catch (err) {
    console.error("Erro ao processar PDF:", err);
    res.status(500).json({ error: "Erro ao processar PDF" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`);
});
