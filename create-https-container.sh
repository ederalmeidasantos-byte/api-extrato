#!/bin/bash

# Parar containers existentes
docker stop inss-simulador-https 2>/dev/null || true
docker rm inss-simulador-https 2>/dev/null || true

# Criar container com HTTPS direto
docker run -d \
  --name inss-simulador-https \
  -p 443:443 \
  -p 3002:3002 \
  -v /etc/letsencrypt/live/inss.lunasdigital.com.br:/app/ssl:ro \
  node:20-alpine \
  sh -c '
    cd /app
    npm init -y
    npm install express
    cat > server.js << EOF
const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.static("/app/INSS"));

// Rota principal
app.get("/inss/simulador.html", (req, res) => {
    res.sendFile(path.join("/app/INSS", "simulador.html"));
});

// Configurar SSL
const sslOptions = {
    key: fs.readFileSync("/app/ssl/privkey.pem"),
    cert: fs.readFileSync("/app/ssl/fullchain.pem")
};

// Iniciar HTTPS na porta 443
https.createServer(sslOptions, app).listen(443, "0.0.0.0", () => {
    console.log("🔒 HTTPS rodando na porta 443");
});

// Iniciar HTTP na porta 3002 (fallback)
app.listen(3002, "0.0.0.0", () => {
    console.log("🚀 HTTP rodando na porta 3002");
});
EOF
    node server.js
  '

echo "✅ Container HTTPS criado!"
