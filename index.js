const express = require("express");
const app = express();

app.use(express.json());

// Mock de arquivos de teste (aqui futuramente você chama a outra API)
function carregarExtratoPorCodigo(codigoArquivo) {
  if (codigoArquivo === "12345") {
    return `
      Nº Benefício: 604.321.543-1
      Elegível para empréstimos
      MARGEM EXTRAPOLADA*** R$0,00
      266683 ITAU Ativo Refinanciamento 05/2025 04/2033 96 R$424,20 R$18.314,24 1,85 24,60 07/06/25
      901381 C6 Ativo Refinanciamento 11/2024 10/2031 84 R$470,64 R$20.413,71 1,62 21,53 07/12/24
      140184 BANCO DO BRASIL Ativo Portabilidade 10/2023 02/2030 77 R$1.219,85 R$15.000,00 1,84 24,44 05/11/23
    `;
  }
  return null;
}

// === Funções auxiliares ===

// Extrair todos os contratos ATIVOS
function extrairContratosAtivos(texto) {
  const contratos = [];
  const linhas = texto.split(/\r?\n/);

  for (let i = 0; i < linhas.length; i++) {
    if (/Ativo/i.test(linhas[i])) {
      let bloco = linhas.slice(i, i + 6).join(" "); // pega até 6 linhas após "Ativo"

      const contrato = bloco.match(/(\d{6,})/); // número contrato
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

  return contratos;
}

// Verificar se benefício está bloqueado
function verificarBloqueio(texto) {
  if (/Elegível para empréstimos/i.test(texto)) return false;
  if (/Bloqueado para empréstimo/i.test(texto)) return true;
  return null;
}

// Extrair Margem Extrapolada
function extrairMargemExtrapolada(texto) {
  const regex = /MARGEM EXTRAPOLADA\*{3}\s+R\$([\d.,]+)/i;
  const match = texto.match(regex);
  return match ? match[1] : null;
}

// === Rota principal ===
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

// Porta do Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
