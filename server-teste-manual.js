import express from 'express';

const app = express();
const PORT = 3005;

// Sem middleware de JSON parsing
app.use((req, res, next) => {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      req.body = JSON.parse(body);
    } catch (e) {
      req.body = { error: 'Invalid JSON', raw: body };
    }
    next();
  });
});

app.post("/teste", (req, res) => {
  console.log("🔍 [TESTE] Body recebido:", req.body);
  res.json({ received: req.body, success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de teste manual rodando na porta ${PORT}`);
});



