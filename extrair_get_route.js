// Rota GET para /extrair - página informativa
app.get('/extrair', (req, res) => {
  res.status(200).json({
    message: "Endpoint /extrair - Extração de dados de extrato",
    method: "POST",
    description: "Este endpoint aceita apenas requisições POST com dados JSON",
    example: {
      method: "POST",
      url: "/extrair",
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        fileId: "7539",
        idoportunidade: "123"
      }
    },
    simulador: "https://inss.lunasdigital.com.br/inss/simulador.html"
  });
});

