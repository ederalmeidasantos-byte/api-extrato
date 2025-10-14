#!/bin/bash

# Script de Instalação Completa do Container FGTS no VPS
# Execute: curl -sSL https://raw.githubusercontent.com/SEU_REPO/deploy-fgts.sh | bash

set -e

echo "🚀 INSTALAÇÃO DO CONTAINER FGTS NO VPS"
echo "========================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Verificar se é root
if [ "$EUID" -eq 0 ]; then
    error "❌ Não execute como root! Use um usuário normal com sudo."
fi

# Verificar sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    error "❌ Sistema operacional não suportado"
fi

log "📋 Sistema detectado: $OS $VER"

# 1. Atualizar sistema
log "🔄 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependências
log "📦 Instalando dependências..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# 3. Instalar Docker
log "🐳 Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    log "✅ Docker instalado com sucesso!"
else
    log "✅ Docker já está instalado"
fi

# 4. Instalar Docker Compose
log "🔧 Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    log "✅ Docker Compose instalado com sucesso!"
else
    log "✅ Docker Compose já está instalado"
fi

# 5. Criar diretórios
log "📁 Criando diretórios..."
sudo mkdir -p /opt/fgts-service
sudo mkdir -p /var/data/fgts/cache
sudo mkdir -p /var/data/fgts/uploads
sudo mkdir -p /var/logs/fgts
sudo mkdir -p /etc/fgts

# 6. Configurar permissões
log "🔐 Configurando permissões..."
sudo chown -R $USER:$USER /opt/fgts-service
sudo chown -R 1001:1001 /var/data/fgts
sudo chown -R 1001:1001 /var/logs/fgts

# 7. Criar Dockerfile
log "📝 Criando Dockerfile..."
cat > /opt/fgts-service/Dockerfile << 'EOF'
FROM node:18-alpine

RUN apk add --no-cache curl bash

RUN addgroup -g 1001 -S nodejs && \
    adduser -S fgts -u 1001

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . ./

RUN mkdir -p /var/data/cache && \
    mkdir -p uploads && \
    chown -R fgts:nodejs /app && \
    chown -R fgts:nodejs /var/data

USER fgts

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "--max-old-space-size=1024", "--expose-gc", "server.js"]
EOF

# 8. Criar package.json
log "📦 Criando package.json..."
cat > /opt/fgts-service/package.json << 'EOF'
{
  "name": "fgts-service",
  "version": "1.0.0",
  "description": "Servidor FGTS exclusivo para processamento de CPFs",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node --max-old-space-size=1024 --expose-gc server.js",
    "dev": "node --max-old-space-size=1024 --expose-gc server.js",
    "test": "node test-fgts-service.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "socket.io": "^4.8.1",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "axios": "^1.12.2",
    "csv-parse": "^6.1.0",
    "qs": "^6.14.0",
    "https-proxy-agent": "^7.0.6",
    "dotenv": "^16.6.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "keywords": ["fgts", "cpf", "api", "docker"],
  "author": "Lunas Digital",
  "license": "ISC"
}
EOF

# 9. Criar arquivo .env
log "⚙️ Criando arquivo de configuração..."
cat > /opt/fgts-service/.env << 'EOF'
NODE_ENV=production
PORT=5000

# API Kentro
LUNAS_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376
LUNAS_API_URL=https://lunasdigital.atenderbem.com/int/downloadFile
LUNAS_QUEUE_ID=25
QUEUE_ID=25

# Credenciais FGTS (4 usuários)
FGTS_USER_1=crislunasdigital@gmail.com
FGTS_PASS_1=7.O?v>coI>5E
FGTS_USER_2=leemarsiglia@gmail.com
FGTS_PASS_2=H^UnXygvOv)6
FGTS_USER_3=srcor1@hotmail.com
FGTS_PASS_3="ty#lN6z1"
FGTS_USER_4=crislunasdigital@gmail.com
FGTS_PASS_4=7.O?v>coI>5E

# Configurações FGTS
PROVIDER=cartos
DEST_STAGE_ID=4
CSV_FILE=cpfs.csv
EOF

# 10. Criar server.js básico
log "🖥️ Criando servidor básico..."
cat > /opt/fgts-service/server.js << 'EOF'
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Rota principal
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FGTS Service - Instalado com Sucesso!</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .info { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .endpoint { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; }
            </style>
        </head>
        <body>
            <h1>🎉 FGTS Service Instalado com Sucesso!</h1>
            
            <div class="success">
                <h3>✅ Status: Online</h3>
                <p>O Container FGTS está rodando na porta 5000</p>
            </div>
            
            <div class="info">
                <h3>📊 Informações do Sistema</h3>
                <p><strong>Porta:</strong> ${PORT}</p>
                <p><strong>Ambiente:</strong> ${process.env.NODE_ENV}</p>
                <p><strong>Versão:</strong> 1.0.0</p>
                <p><strong>Container:</strong> fgts-service</p>
            </div>
            
            <h3>🔗 Endpoints Disponíveis:</h3>
            <div class="endpoint">GET /fgts/status - Status do serviço</div>
            <div class="endpoint">GET /health - Health check</div>
            <div class="endpoint">POST /fgts/run - Upload CSV</div>
            <div class="endpoint">GET /fgts/contadores-tempo-real - Estatísticas</div>
            <div class="endpoint">GET /fgts/lista-completa - Resultados</div>
            
            <h3>📱 Próximos Passos:</h3>
            <ol>
                <li>Configure o Nginx para proxy reverso</li>
                <li>Configure SSL/HTTPS</li>
                <li>Faça upload dos arquivos FGTS completos</li>
                <li>Teste o processamento de CPFs</li>
            </ol>
        </body>
        </html>
    `);
});

// Endpoints básicos
app.get('/fgts/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV,
        version: '1.0.0',
        container: 'fgts-service'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'fgts'
    });
});

app.post('/fgts/run', upload.single('csvfile'), (req, res) => {
    res.json({ 
        message: '🚀 Arquivo recebido! Sistema básico funcionando.',
        file: req.file ? req.file.filename : 'nenhum arquivo'
    });
});

app.get('/fgts/contadores-tempo-real', (req, res) => {
    res.json({
        success: true,
        estatisticas: {
            estado: {
                totalCPFs: 0,
                processados: 0,
                sucessos: 0,
                pendentes: 0,
                naoAutorizados: 0,
                descartados: 0,
                agendados: 0,
                delayAtual: 1000,
                ultimaAtualizacao: new Date().toISOString()
            }
        }
    });
});

app.get('/fgts/lista-completa', (req, res) => {
    res.json({
        success: true,
        resultados: {
            sucessos: [],
            pendentes: [],
            naoAutorizados: [],
            descartados: [],
            agendados: []
        }
    });
});

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    socket.emit('fgts-status', { message: 'Conectado ao servidor FGTS' });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor FGTS rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
});
EOF

# 11. Build e execução do container
log "🐳 Fazendo build do container..."
cd /opt/fgts-service
docker build -t fgts-service .

# 12. Parar container existente
log "🛑 Parando container existente..."
docker stop fgts-service 2>/dev/null || true
docker rm fgts-service 2>/dev/null || true

# 13. Executar container
log "🚀 Iniciando container FGTS..."
docker run -d \
  --name fgts-service \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v /var/data/fgts/cache:/var/data/cache \
  -v /var/data/fgts/uploads:/app/uploads \
  -v /var/logs/fgts:/app/logs \
  fgts-service

# 14. Verificar instalação
log "🔍 Verificando instalação..."
sleep 10

if docker ps | grep -q fgts-service; then
    log "✅ Container FGTS iniciado com sucesso!"
    
    # Obter IP do servidor
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo "🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
    echo "=================================="
    echo ""
    echo "🌐 URLs disponíveis:"
    echo "   Painel Principal: http://$SERVER_IP:5000/"
    echo "   Status API: http://$SERVER_IP:5000/fgts/status"
    echo "   Health Check: http://$SERVER_IP:5000/health"
    echo ""
    echo "📋 Comandos úteis:"
    echo "   Ver logs: docker logs -f fgts-service"
    echo "   Parar: docker stop fgts-service"
    echo "   Reiniciar: docker restart fgts-service"
    echo "   Status: docker ps | grep fgts-service"
    echo ""
    echo "📁 Arquivos instalados em: /opt/fgts-service/"
    echo "📊 Logs em: /var/logs/fgts/"
    echo "💾 Dados em: /var/data/fgts/"
    echo ""
    echo "🔧 Próximos passos:"
    echo "   1. Configure o Nginx para proxy reverso"
    echo "   2. Configure SSL/HTTPS"
    echo "   3. Faça upload dos arquivos FGTS completos"
    echo "   4. Teste o processamento de CPFs"
    echo ""
    
else
    error "❌ Erro ao iniciar container FGTS"
fi

log "✅ Instalação do Container FGTS concluída!"
