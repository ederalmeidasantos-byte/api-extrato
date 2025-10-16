const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;
const HTTPS_PORT = 443;

// Middleware para servir arquivos estáticos
app.use(express.static('/app/INSS'));

// Rota principal para o simulador
app.get('/inss/simulador.html', (req, res) => {
    res.sendFile(path.join('/app/INSS', 'simulador.html'));
});

// Rota para servir qualquer arquivo estático
app.get('*', (req, res) => {
    const filePath = path.join('/app/INSS', req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Arquivo não encontrado');
    }
});

// Configurar HTTPS
const sslOptions = {
    key: fs.readFileSync('/app/ssl/key.pem'),
    cert: fs.readFileSync('/app/ssl/cert.pem')
};

// Iniciar servidor HTTP (para fallback)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor HTTP rodando na porta ${PORT}`);
});

// Iniciar servidor HTTPS
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 Servidor HTTPS rodando na porta ${HTTPS_PORT}`);
});

console.log('✅ Servidor INSS Simulador iniciado com SSL direto no container!');
