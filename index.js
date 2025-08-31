const express = require("express");
const app = express();

app.use(express.json()); // permite receber JSON no body

// Rota de teste
app.get("/", (req, res) => {
  res.send("✅ API de Extrato funcionando!");
});

// Rota para extrair dados do texto
app.post("/extrato", (req, res) => {
  const { texto } = req.body;

  if (!texto) {
    return res.status(400).json({ error: "Texto não enviado" });
  }

  // Regex para capturar prazo e parcela (exemplo: "96 R$424,20")
  const regex = /(\d+)\s+R\$([\d.,]+)/;
  const match = texto.match(regex);

  if (!match) {
    return res.status(200).json({ prazo: null, parcela: null });
  }

  const prazo = match[1];
  const parcela = match[2];

  res.json({ prazo, parcela });
});

// Render usa a porta do ambiente ou 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
