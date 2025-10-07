const http = require('http');
const url = require('url');
const fs = require('fs');
const https = require('https');
require('dotenv').config();
const PORT = process.env.PORT || 3004;

// Simulação de resposta do ChatGPT
function processarMensagem(mensagem) {
  const respostas = {
    'oi': 'Olá! Sou o assistente virtual da Lunas Digital. Como posso ajudar com seu empréstimo consignado?',
    'portabilidade': 'A portabilidade é uma excelente opção! Posso simular as melhores condições para você. Qual seu banco atual?',
    'fgts': 'O saque do FGTS é uma ótima oportunidade! Vou verificar suas condições. Qual seu CPF?',
    'taxa': 'Temos as melhores taxas do mercado! Para portabilidade, posso oferecer até 1,65% ao mês. Quer simular?',
    'troco': 'O troco é o dinheiro que sobra após pagar o empréstimo atual! Posso calcular quanto você receberia.',
    'default': 'Entendi! Vou analisar sua situação e preparar a melhor proposta. Pode me informar seu CPF para consultar no sistema?'
  };
  
  const mensagemLower = mensagem.toLowerCase();
  for (const [palavra, resposta] of Object.entries(respostas)) {
    if (mensagemLower.includes(palavra)) {
      return resposta;
    }
  }
  return respostas.default;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Rota principal
  if (path === '/' && method === 'GET') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      sistema: 'ChatGPT Vendedor',
      versao: '1.0.0',
      status: 'online',
      porta: PORT,
      timestamp: new Date().toISOString(),
      endpoints: {
        '/': 'Informações do sistema',
        '/api/health': 'Health check',
        '/webhook/kentro': 'Webhook para mensagens do WhatsApp',
        '/teste': 'Página de teste'
      }
    }));
  }
  
  // Health check
  else if (path === '/api/health' && method === 'GET') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: 'ok',
      sistema: 'ChatGPT Vendedor',
      timestamp: new Date().toISOString()
    }));
  }
  
  // Webhook para receber mensagens do Kentro
  else if (path === '/webhook/kentro' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('📨 Webhook recebido:', data);
        
        // Processar mensagem com ChatGPT
        const mensagem = data.message || data.text || 'oi';
        const resposta = processarMensagem(mensagem);
        
        // Aqui você enviaria a resposta de volta via API Kentro
        console.log('🤖 Resposta gerada:', resposta);
        
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: true,
          message: 'Webhook processado com sucesso',
          resposta: resposta,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: 'Erro ao processar webhook',
          timestamp: new Date().toISOString()
        }));
      }
    });
  }
  
  // Página de teste
  else if (path === '/teste' && method === 'GET') {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>ChatGPT Vendedor - Teste</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .endpoints { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .chat { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; height: 300px; overflow-y: auto; }
        .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .user { background: #e3f2fd; text-align: right; }
        .bot { background: #f1f8e9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 ChatGPT Vendedor - Teste</h1>
        <div class="status">
            <h3>✅ Sistema Online</h3>
            <p><strong>Porta:</strong> ${PORT}</p>
            <p><strong>Ambiente:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="chat" id="chat">
            <div class="message bot">🤖 Olá! Sou o assistente virtual da Lunas Digital. Como posso ajudar?</div>
        </div>
        
        <div style="display: flex; gap: 10px;">
            <input type="text" id="messageInput" placeholder="Digite sua mensagem..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            <button class="btn" onclick="enviarMensagem()">Enviar</button>
        </div>
        
        <div class="endpoints">
            <h3>🔗 Endpoints Disponíveis:</h3>
            <ul>
                <li><strong>GET /</strong> - Informações do sistema</li>
                <li><strong>GET /api/health</strong> - Health check</li>
                <li><strong>POST /webhook/kentro</strong> - Webhook para mensagens</li>
                <li><strong>GET /teste</strong> - Esta página</li>
            </ul>
        </div>
    </div>
    
    <script>
        function enviarMensagem() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;
            
            // Adicionar mensagem do usuário
            const chat = document.getElementById('chat');
            chat.innerHTML += \`<div class="message user">\${message}</div>\`;
            
            // Enviar para o webhook
            fetch('/webhook/kentro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            })
            .then(response => response.json())
            .then(data => {
                // Adicionar resposta do bot
                chat.innerHTML += \`<div class="message bot">🤖 \${data.resposta}</div>\`;
                chat.scrollTop = chat.scrollHeight;
            })
            .catch(error => {
                chat.innerHTML += \`<div class="message bot">❌ Erro: \${error}</div>\`;
            });
            
            input.value = '';
        }
        
        // Enter para enviar
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                enviarMensagem();
            }
        });
    </script>
</body>
</html>
    `);
  }
  
  // Rota não encontrada
  else {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      error: 'Rota não encontrada',
      path: path,
      method: method
    }));
  }
});

server.listen(PORT, () => {
  console.log('🚀 ChatGPT Vendedor rodando na porta', PORT);
  console.log('📱 Acesse: http://72.60.159.149:' + PORT + '/teste');
  console.log('🔗 Webhook: http://72.60.159.149:' + PORT + '/webhook/kentro');
});

