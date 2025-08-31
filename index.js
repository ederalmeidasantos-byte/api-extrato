const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Função para extrair contratos ativos
function extrairContratosAtivos(texto) {
  const linhas = texto.split(/\r?\n/);
  const contratos = [];

  linhas.forEach((linha) => {
    if (linha.includes("Ativo")) {
      // junta espaços múltiplos em 1
      const partes = linha.split(/\s+/);

      let contrato = {
        contrato: null,
        banco: null,
        parcelas: null,
        parcela: null,
        valorEmprestado: null,
        taxaMensal: "0",
        inicioDesconto: null
      };

      // contrato → primeiro número grande
      const contratoMatch = linha.match(/\b\d{5,}\b/);
      if (contratoMatch) contrato.contrato = contratoMatch[0];

      // banco → palavras conhecidas
      const bancoMatch = linha.match(/(ITAU|C6|BRADESCO|BANCO DO BRASIL|FACTA|QI|SAFRA|SANTANDER|CAIXA)/i);
      if (bancoMatch) contrato.banco = bancoMatch[1].toUpperCase();

      // parcelas → primeiro número de 2 dígitos depois de "Ativo"
      const parcelasMatch = linha.match(/\b(\d{2,3})\b/);
      if (parcelasMatch) contrato.parcelas = parseInt(parcelasMatch[1]);

      // valores em R$
      const valores = linha.match(/R\$?\s?\d+[.,]\d{2}/g);
      if (valores) {
        if (valores[0]) contrato.parcela = valores[0].replace("R$", "").trim();
        if (valores[1]) contrato.valorEmprestado = valores[1].replace("R$", "").trim();
      }

      // taxas → capturar a 3ª (juros mensal)
      const taxas = linha.match(/\d+[.,]\d{2}/g);
      if (taxas && taxas.length >= 3) {
        contrato.taxaMensal = taxas[2].replace(".", ",");
      }

      // início desconto → última data
      const datas = linha.match(/\d{2}\/\d{2}\/\d{2,4}/g);
      if (datas) {
        contrato.inicioDesconto = datas[datas.length - 1];
      }

      contratos.push(contrato);
    }
  });

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
