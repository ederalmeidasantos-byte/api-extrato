// Rota GET para /extrair - retorna JSON informativo
export function addExtrairGetRoute(app) {
  app.get('/extrair', (req, res) => {
    res.json({
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
          idoportunidade: "36337"
        }
      },
      simulador: "https://inss.lunasdigital.com.br/inss/simulador.html"
    });
  });
}

