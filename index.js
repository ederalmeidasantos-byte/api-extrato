const express = require("express");
const app = express();

app.use(express.json());

// Função para simular leitura de um arquivo já salvo (mock)
function carregarExtratoPorCodigo(codigoArquivo) {
  // Por enquanto retornamos um texto fixo para teste
  // Depois aqui vamos chamar a outra API que baixa o PDF
  if (codigoArquivo === "12345") {
    return `
      Nº Benefício: 604.321.543-1
      Elegível para empréstimos
      MARGEM EXTRAPOLADA*** R$0,00
      266683 ITAU Ativo Refinanciamento 05/2025 04/2033 96 R$424,20 R$18.314,24 1,85 24,60 07/06/25
    `;
  }
  return null;
}

// === Funções auxiliares para parse ===
function extrairContratosAtivos(texto) {
  const contratos = [];
  const regexContratos = /(\d{6,})\s+([A-Z0-9\s]+)\s+Ativo[\s\S]*?(\d{2}\/\d{4})\s+(\d{2}\/\d{4})\s+(\d+)\s+R\$([\d.,]+)\s+R\$([\d.,]+)[\s\S]*?(?:([\d.,]+))?\s+(\d{2}\/\d{2}\/\d{2})/gi;

  let match;
  while ((match = regexContratos.exec(texto)) !== null) {
    contratos.push({
      contrato: match[1],
      banco: match[2].trim(),
      parcelas: parseInt(match[5], 10),
      parcela: match[6],
      valorEmprestado: match[7],
      taxaMensal: match[8] || "0",
      inicioDesconto: match[9]
    });
  }

  return contratos;
}

function verificarBloqueio(texto) {
  if (/Elegível para empréstimos/i.test(texto)) return false;
  if (/Bloqueado para empréstimo/i.test(texto)) return true;
  return null;
}

function extrairMargemExtrapolada(texto) {
  const regex = /MARGEM EXTRAPOLADA\*{3}\s+R\$([\d.,]+)/i;
  const match = texto.match(regex);
  return match ? match[1] : null;
}

// === Rota de extrato ===
app.post("/extrato", (req, res) => {
  const { codigoArquivo } = req.body;

  if (!codigoArquivo) {
    return res.status(400).json({ error: "codigoArquivo não enviado" });
  }

  const texto = carregarExtratoPorCodigo(codigoArquivo);

  if (!texto) {
    return res.status(404).json({ error: "Extrato não encontrado para este codigoArquivo" });
  }

  const contratosAtivos = extrairContratosAtivos(texto);
  const bloqueado = verificarBloqueio(texto);
  const margemExtrapolada = extrairMargemExtrapolada(texto);

  res.json({
    codigoArquivo,
    bloqueado,
    margemExtrapolada,
    contratos: contratosAtivos
  });
});

// Porta
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
