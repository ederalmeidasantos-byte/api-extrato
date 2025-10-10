// Configuração para retornar JSON em vez de HTML para rotas não encontradas
export function configureJsonResponse(app) {
  // Sobrescrever o handler padrão do Express
  app.use((req, res, next) => {
    if (req.path === '/extrair' && req.method === 'GET') {
      return res.json({
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
    }
    next();
  });
}

