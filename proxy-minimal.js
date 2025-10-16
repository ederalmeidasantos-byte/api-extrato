const express = require('express');
const app = express();
const PORT = 3005;

app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'Proxy funcionando!' });
});

app.post('/openai/chat/completions', (req, res) => {
  console.log('OPENAI-PROXY Recebida requisição');
  res.json({ message: 'Resposta de teste do OpenAI' });
});

app.listen(PORT, () => {
  console.log('PROXY-TEST Servidor rodando na porta', PORT);
});
