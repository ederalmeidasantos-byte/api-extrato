import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

/**
 * Extrai informações do extrato
 */
function extrairDadosExtrato(texto, codigoArquivo) {
  const linhas = texto.split("\n").map(l => l.trim()).filter(l => l);

  // Verifica bloqueio
  const bloqueado = !texto.includes("Elegível para empréstimos");

  // Extrai margem extrapolada
  let margemExtrapolada = "0,00";
  const margemMatch = texto.match(/MARGEM EXTRAPOLADA\*+\s+R\$\s*([\d\.,]+)/);
  if (margemMatch) {
    margemExtrapolada = margemMatch[1];
  }

  // Extrair contratos ativos
  const contratos = extrairContratosAtivos(linhas);

  return {
    codigoArquivo,
    bloqueado,
    margemExtrapolada,
    contratos
  };
}

/**
 * Extrai contratos com situação "Ativo"
 */
function extrairContratosAtivos(linhas) {
  const contratos = [];

  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].includes("Ativo")) {
      // Junta até 6 linhas (contrato costuma vir quebrado)
      const bloco = [
        linhas[i],
        linhas[i + 1] || "",
        linhas[i + 2] || "",
        linhas[i + 3] || "",
        linhas[i + 4] || "",
        linhas[i + 5] || ""
      ].join(" ");

      const contrato = {
        contrato: null,
        banco: null,
        parcelas: null,
        parcela: null,
        valorEmprestado: null,
        taxaMensal: "0",
        inicioDesconto: null
      };

      // Número do contrato
      const matchContrato = bloco.match(/\b\d{5,}\b/);
      if (matchContrato) contrato.contrato = matchContrato[0];

      // Banco
      const matchBanco = bloco.match(/\b(?:ITAU|C6|BRASIL|FACTA|BRADESCO|PAN|BMG|SANTANDER)\b/i);
      if (matchBanco) contrato.banco = matchBanco[0].toUpperCase();

      // Parcelas
      const matchParcelas = bloco.match(/\b(\d{2,3})\b/);
      if (matchParcelas) contrato.parcelas = parseInt(matchParcelas[1]);

      // Parcela (R$xx,xx)
      const matchParcela = bloco.match(/R\$\s*([\d\.,]+)/);
      if (matchParcela) contrato.parcela = matchParcela[1];

      // Valor emprestado (último R$ do bloco geralmente)
      const matchValores = [...bloco.matchAll(/R\$\s*([\d\.,]+)/g)];
      if (matchValores.length > 1) {
        contrato.valorEmprestado = matchValores[matchValores.length - 1][1];
      }

      // Taxa de juros mensal (usando "JUROS MENSAL")
      const matchTaxa = bloco.match(/JUROS\s+MENSAL\s+([\d\.,]+)/i);
      if (matchTaxa) contrato.taxaMensal = matchTaxa[1];
      else {
        const matchTaxaSimples = bloco.match(/\b(\d{1,2},\d{1,2})\b/);
        if (matchTaxaSimples) contrato.taxaMensal = matchTaxaSimples[1];
      }

      // Início desconto (dd/mm/aa)
      const matchInicio = bloco.match(/\b\d{2}\/\d{2}\/\d{2,4}\b/);
      if (matchInicio) contrato.inicioDesconto = matchInicio[0];

      contratos.push(contrato);
    }
  }

  return contratos;
}

// Rota principal
app.post("/extrato", async (req, res) => {
  try {
    const { codigoArquivo } = req.body;
    if (!codigoArquivo) {
      return res.status(400).json({ error: "codigoArquivo não enviado" });
    }

    // Chamada para Cloudmersive
    const apiKey = "1d68371d-57cf-42ee-9b19-c7d950c12e39"; // <-- sua API KEY
    const url = "https://api.cloudmersive.com/pdf/convert/to/txt";

    // Aqui você vai trocar pelo download do PDF real usando o codigoArquivo
    const pdfBuffer = Buffer.from(req.body.pdfBase64 || "", "base64");
    if (!pdfBuffer.length) {
      return res.status(400).json({ error: "PDF não enviado para teste" });
    }

    const response = await axios.post(url, pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Apikey": apiKey
      }
    });

    const texto = response.data;
    const resultado = extrairDadosExtrato(texto, codigoArquivo);

    res.json(resultado);
  } catch (error) {
    console.error("Erro:", error.message);
    res.status(500).json({ error: "Erro ao processar extrato" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
