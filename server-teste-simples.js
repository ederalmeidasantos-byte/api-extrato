import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3004;

// Middleware básico
app.use(cors());
app.use(express.json());

// Endpoint de teste
app.post("/teste", (req, res) => {
  console.log("🔍 [TESTE] Body recebido:", req.body);
  console.log("🔍 [TESTE] Headers:", req.headers);
  res.json({ received: req.body, success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}`);
});
