const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Função para extrair contratos ativos
function extrairContratosAtivos(texto) {
  const linhas = texto.split(/\r?\n/);
  const contratos = [];

  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].includes("Ativo")) {
      // junta esta linha + 2 seguintes
      const bloco = [
        linhas[i],
        linhas[i + 1] || "",
        linhas[i + 2] || ""
      ].join(" ");

      let contrato = {
        contrato: null,
        banco: null,
        parcelas: null,
        parcela: null,
        valorEmprestado: null,
        taxaMensal: "0",
        inicioDesconto: null
      };

      // Nº contrato → primeiro número grande
      const contratoMatch = bloco.match(/\b\d{5,}\b/);
      if (contratoMatch) contrato.contrato = contratoMatch[0];

      // Banco → palavras conhecidas
      const bancoMatch = bloco.match(/(ITAU|C6|BRADESCO|BANCO DO BRASIL|FACTA|QI|SAFRA|SANTANDER|CAIXA)/i);
      if (bancoMatch) contrato.banco = bancoMatch[1].toUpperCase();

      // Parcelas → número de 2-3 dígitos seguido de R$
      const parcelasMatch = bloco.match(/\b(\d{2,3})\s+R\$/);
      if (parcelasMatch) contrato.parcelas = parseInt(parcelasMatch[1]);

      // Valores em R$
      const valores = bloco.match(/R\$?\s?\d+[.,]\d{2}/g);
      if (valores) {
        if (valores[0]) contrato.parcela = valores[0].replace("R$", "").trim();
        if (valores[1]) contrato.valorEmprestado = valores[1].replace("R$", "").trim();
      }

      // Taxas → pega a 3ª (juros mensal)
      const taxas = bloco.match(/\d+[.,]\d{2}/g);
      if (taxas && taxas.length >= 3) {
        contrato.taxaMensal = taxas[2].replace(".", ",");
      }

      // Início do desconto → última data encontrada
      const datas = bloco.match(/\d{2}\/\d{2}\/\d{2,4}/g);
      if (datas) {
        contrato.inicioDesconto = datas[datas.length - 1];
      }

      contratos.push(contrato);
    }
  }

  return contratos;
}

// Rota de teste
app.post("/extrato", (req, res) => {
  const { codigoArquivo } = req.body;
  if (!codigoArquivo) {
    return res.status(400).json({ error: "codigoArquivo não enviado" });
  }

  // aqui você colocaria a leitura do PDF → por enquanto mock de texto
  const texto = req.body.texto || ""; // para testar manualmente

  const contratos = extrairContratosAtivos(texto);

  return res.json({
    codigoArquivo,
    bloqueado: texto.includes("Bloqueado para empréstimo"),
    margemExtrapolada: (texto.match(/MARGEM EXTRAPOLADA\*+\s+R\$\s?([\d.,]+)/)?.[1] || "0,00"),
    contratos
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ API rodando na porta ${PORT}`));
