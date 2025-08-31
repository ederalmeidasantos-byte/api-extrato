const express = require("express");
const app = express();

app.use(express.json());

// Rota raiz
app.get("/", (req, res) => {
  res.send("✅ API de Extrato funcionando!");
});

// Rota de extrato
app.post("/extrato", (req, res) => {
  const { texto } = req.body;

  if (!texto) {
    return res.status(400).json({ error: "Texto não enviado" });
  }

  // Regex para capturar "96 R$424,20"
  const regex = /(\d+)\s+R\$([\d.,]+)/;
  const match = texto.match(regex);

  if (!match) {
    return res.status(200).json({ prazo: null, parcela: null });
  }

  const prazo = match[1];
  const parcela = match[2];

  res.json({ prazo, parcela });
});

// Porta do Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
