const express = require('express');
const app = express();
const PORT = 3005;

app.use(express.json());

// Teste simples
app.get('/test', (req, res) => {
  res.json({ message: 'Proxy funcionando!' });
});

// Endpoint OpenAI simples
app.post('/openai/chat/completions', (req, res) => {
  console.log('OPENAI-PROXY Recebida requisição');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  res.json({
    id: "test-response",
    object: "chat.completion",
    created: Date.now(),
    model: "gpt-4o-mini",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: "Teste de resposta do proxy OpenAI"
      },
      finish_reason: "stop"
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('PROXY-TEST Servidor rodando na porta', PORT);
});
