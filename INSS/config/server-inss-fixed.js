const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Servir arquivos estáticos
function serveStaticFile(res, filePath) {
    try {
        const content = fs.readFileSync(filePath);
        const ext = path.extname(filePath);

        let contentType = 'text/html';
        if (ext === '.js') contentType = 'application/javascript';
        if (ext === '.css') contentType = 'text/css';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.jpg') contentType = 'image/jpeg';
        if (ext === '.json') contentType = 'application/json';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        res.writeHead(404);
        res.end('File not found');
    }
}

// Servir dados da API
function serveApiData(res, endpoint, params) {
    try {
        if (endpoint === '/extrato/7708/raw') {
            const dadosTeste = JSON.parse(fs.readFileSync('/root/extrato_7708.json', 'utf8'));
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
            });
            res.end(JSON.stringify(dadosTeste));
        } else if (endpoint.startsWith('/extrato/') && endpoint.endsWith('/raw')) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Extrato não encontrado', fileId: params.fileId }));
        } else {
            res.writeHead(404);
            res.end('API endpoint not found');
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno do servidor', details: error.message }));
    }
}

// Handler para requisições
function requestHandler(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Rotas da API
    if (pathname.startsWith('/extrato/') && pathname.endsWith('/raw')) {
        const fileId = pathname.split('/')[2];
        serveApiData(res, pathname, { fileId });
        return;
    }

    // CORREÇÃO: Servir arquivos estáticos corretamente
    let filePath = '/app/INSS' + pathname;
    
    // Se o arquivo existe, servir diretamente
    if (fs.existsSync(filePath)) {
        serveStaticFile(res, filePath);
        return;
    }

    // Para rotas específicas, mapear corretamente
    if (pathname === '/inss/simulador.html' || pathname === '/') {
        filePath = '/app/INSS/simulador.html';
    } else if (pathname === '/inss/simulador-logic.js') {
        filePath = '/app/INSS/simulador-logic.js';
    } else if (pathname.startsWith('/inss/')) {
        const fileName = pathname.replace('/inss/', '');
        filePath = '/app/INSS/' + fileName;
    }

    // Se encontrou o arquivo, servir
    if (fs.existsSync(filePath)) {
        serveStaticFile(res, filePath);
        return;
    }

    // Se não encontrou, retornar 404
    res.writeHead(404);
    res.end('File not found: ' + pathname);
}

// Configurar HTTPS
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/inss.lunasdigital.com.br/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/inss.lunasdigital.com.br/fullchain.pem')
};

// Criar servidores
https.createServer(sslOptions, requestHandler).listen(443, '0.0.0.0', () => {
    console.log('🔒 HTTPS rodando na porta 443');
});

http.createServer(requestHandler).listen(3002, '0.0.0.0', () => {
    console.log('🚀 HTTP rodando na porta 3002');
});

console.log('✅ Servidor INSS iniciado com API integrada!');