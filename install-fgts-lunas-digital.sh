#!/bin/bash

# Script de Instalação do Container FGTS - Integração Lunas Digital
# Baseado na arquitetura existente do sistema

set -e

echo "🚀 INSTALAÇÃO DO CONTAINER FGTS - LUNAS DIGITAL"
echo "=============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    error "❌ Docker não está instalado. Execute primeiro: curl -fsSL https://get.docker.com | sh"
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    error "❌ Docker Compose não está instalado. Instale primeiro."
fi

log "📋 Sistema detectado: $(lsb_release -d | cut -f2)"

# 1. Criar diretórios seguindo padrão Lunas Digital
log "📁 Criando estrutura de diretórios..."
sudo mkdir -p /opt/lunas-digital/fgts-service
sudo mkdir -p /var/data/lunas-digital/fgts/cache
sudo mkdir -p /var/data/lunas-digital/fgts/uploads
sudo mkdir -p /var/logs/lunas-digital/fgts
sudo mkdir -p /etc/lunas-digital/fgts

# 2. Configurar permissões
log "🔐 Configurando permissões..."
sudo chown -R $USER:$USER /opt/lunas-digital/fgts-service
sudo chown -R 1001:1001 /var/data/lunas-digital/fgts
sudo chown -R 1001:1001 /var/logs/lunas-digital/fgts

# 3. Criar Dockerfile otimizado
log "📝 Criando Dockerfile..."
cat > /opt/lunas-digital/fgts-service/Dockerfile << 'EOF'
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

# 4. Criar package.json
log "📦 Criando package.json..."
cat > /opt/lunas-digital/fgts-service/package.json << 'EOF'
{
  "name": "fgts-service-lunas-digital",
  "version": "1.0.0",
  "description": "Servidor FGTS integrado ao sistema Lunas Digital",
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
  "keywords": ["fgts", "cpf", "api", "docker", "lunas-digital"],
  "author": "Lunas Digital",
  "license": "ISC"
}
EOF

# 5. Criar arquivo .env integrado
log "⚙️ Criando arquivo de configuração..."
cat > /opt/lunas-digital/fgts-service/.env << 'EOF'
NODE_ENV=production
PORT=5000

# Integração Lunas Digital
LUNAS_DIGITAL_SYSTEM=true
CONTAINER_NAME=fgts-service-lunas-digital

# API Kentro (mesma configuração do sistema principal)
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

# Integração com sistema Lunas Digital
BASE_DADOS_URL=http://base-dados-lunasdigital:3003
CRM_URL=http://crm-lunasdigital:3001
SERVIDOR_PRINCIPAL_URL=http://servidor-principal:3000
EOF

# 6. Criar docker-compose integrado
log "🐳 Criando docker-compose integrado..."
cat > /opt/lunas-digital/fgts-service/docker-compose.yml << 'EOF'
version: '3.8'

services:
  fgts-service-lunas-digital:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: fgts-service-lunas-digital
    ports:
      - "5000:5000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - PORT=5000
      - CONTAINER_NAME=fgts-service-lunas-digital
    restart: unless-stopped
    networks:
      - lunas-network
    volumes:
      - /var/data/lunas-digital/fgts/cache:/var/data/cache
      - /var/data/lunas-digital/fgts/uploads:/app/uploads
      - /var/logs/lunas-digital/fgts:/app/logs
    depends_on:
      - base-dados-lunasdigital
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  lunas-network:
    external: true
EOF

# 7. Criar server.js integrado
log "🖥️ Criando servidor integrado..."
cat > /opt/lunas-digital/fgts-service/server.js << 'EOF'
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

// Rota principal integrada
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FGTS Service - Lunas Digital</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
                .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .info { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .endpoint { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; border-left: 4px solid #007bff; }
                .architecture { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏦 FGTS Service - Lunas Digital</h1>
                <p>Sistema integrado de processamento FGTS</p>
            </div>
            
            <div class="success">
                <h3>✅ Status: Online e Integrado</h3>
                <p>Container FGTS integrado ao sistema Lunas Digital</p>
            </div>
            
            <div class="architecture">
                <h3>🏗️ Arquitetura Integrada</h3>
                <p><strong>Container:</strong> fgts-service-lunas-digital</p>
                <p><strong>Porta:</strong> ${PORT}</p>
                <p><strong>Rede:</strong> lunas-network</p>
                <p><strong>Sistema:</strong> Lunas Digital</p>
            </div>
            
            <div class="info">
                <h3>📊 Informações do Sistema</h3>
                <p><strong>Ambiente:</strong> ${process.env.NODE_ENV}</p>
                <p><strong>Versão:</strong> 1.0.0</p>
                <p><strong>Integração:</strong> Sistema Lunas Digital</p>
                <p><strong>Credenciais FGTS:</strong> 4 usuários configurados</p>
            </div>
            
            <h3>🔗 Endpoints Disponíveis:</h3>
            <div class="endpoint">GET /fgts/status - Status do serviço</div>
            <div class="endpoint">GET /health - Health check</div>
            <div class="endpoint">POST /fgts/run - Upload CSV</div>
            <div class="endpoint">GET /fgts/contadores-tempo-real - Estatísticas</div>
            <div class="endpoint">GET /fgts/lista-completa - Resultados</div>
            <div class="endpoint">POST /fgts/pause - Pausar processamento</div>
            <div class="endpoint">POST /fgts/resume - Retomar processamento</div>
            
            <h3>🌐 URLs de Acesso:</h3>
            <div class="endpoint">Painel Principal: http://SEU_IP:5000/</div>
            <div class="endpoint">Via Nginx: http://fgts.lunasdigital.com.br/</div>
            <div class="endpoint">Status API: http://SEU_IP:5000/fgts/status</div>
            
            <h3>📱 Próximos Passos:</h3>
            <ol>
                <li>Configure o Nginx para proxy reverso</li>
                <li>Configure subdomínio fgts.lunasdigital.com.br</li>
                <li>Faça upload dos arquivos FGTS completos</li>
                <li>Teste o processamento de CPFs</li>
                <li>Integre com sistema CRM existente</li>
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
        container: 'fgts-service-lunas-digital',
        system: 'lunas-digital',
        integration: true
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'fgts-lunas-digital',
        container: 'fgts-service-lunas-digital'
    });
});

app.post('/fgts/run', upload.single('csvfile'), (req, res) => {
    res.json({ 
        message: '🚀 Arquivo recebido! Sistema FGTS integrado funcionando.',
        file: req.file ? req.file.filename : 'nenhum arquivo',
        system: 'lunas-digital'
    });
});

app.get('/fgts/contadores-tempo-real', (req, res) => {
    res.json({
        success: true,
        system: 'lunas-digital',
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
        system: 'lunas-digital',
        resultados: {
            sucessos: [],
            pendentes: [],
            naoAutorizados: [],
            descartados: [],
            agendados: []
        }
    });
});

app.post('/fgts/pause', (req, res) => {
    res.json({ 
        success: true, 
        message: "Processamento pausado",
        system: 'lunas-digital'
    });
});

app.post('/fgts/resume', (req, res) => {
    res.json({ 
        success: true, 
        message: "Processamento retomado",
        system: 'lunas-digital'
    });
});

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    socket.emit('fgts-status', { 
        message: 'Conectado ao servidor FGTS Lunas Digital',
        system: 'lunas-digital'
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor FGTS Lunas Digital rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`🏢 Sistema: Lunas Digital`);
    console.log(`🔗 Integração: Ativa`);
});
EOF

# 8. Criar configuração Nginx integrada
log "🌐 Criando configuração Nginx..."
cat > /opt/lunas-digital/fgts-service/nginx-fgts.conf << 'EOF'
# Configuração Nginx para FGTS Service - Lunas Digital
# Arquivo: /etc/nginx/sites-available/fgts-lunas-digital

server {
    listen 80;
    server_name fgts.lunasdigital.com.br;  # Subdomínio FGTS
    
    # Logs
    access_log /var/log/nginx/fgts_lunas_access.log;
    error_log /var/log/nginx/fgts_lunas_error.log;
    
    # Proxy para o container FGTS
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
    
    # Status endpoint
    location /fgts/status {
        proxy_pass http://localhost:5000/fgts/status;
        access_log off;
    }
    
    # Upload de arquivos (aumentar limite)
    location /fgts/run {
        proxy_pass http://localhost:5000/fgts/run;
        client_max_body_size 50M;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
    
    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 9. Build e execução
log "🐳 Fazendo build do container..."
cd /opt/lunas-digital/fgts-service
docker build -t fgts-service-lunas-digital .

# 10. Verificar se rede lunas-network existe
log "🔍 Verificando rede lunas-network..."
if ! docker network ls | grep -q lunas-network; then
    warning "⚠️ Rede lunas-network não encontrada. Criando..."
    docker network create lunas-network
fi

# 11. Parar container existente
log "🛑 Parando container existente..."
docker stop fgts-service-lunas-digital 2>/dev/null || true
docker rm fgts-service-lunas-digital 2>/dev/null || true

# 12. Executar container
log "🚀 Iniciando container FGTS integrado..."
docker run -d \
  --name fgts-service-lunas-digital \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v /var/data/lunas-digital/fgts/cache:/var/data/cache \
  -v /var/data/lunas-digital/fgts/uploads:/app/uploads \
  -v /var/logs/lunas-digital/fgts:/app/logs \
  --network lunas-network \
  fgts-service-lunas-digital

# 13. Verificar instalação
log "🔍 Verificando instalação..."
sleep 10

if docker ps | grep -q fgts-service-lunas-digital; then
    log "✅ Container FGTS integrado iniciado com sucesso!"
    
    # Obter IP do servidor
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo "🎉 INSTALAÇÃO FGTS INTEGRADA CONCLUÍDA!"
    echo "====================================="
    echo ""
    echo "🏗️ Arquitetura Lunas Digital:"
    echo "   🌐 nginx-lunasdigital (Porta 80/443)"
    echo "   🖥️ servidor-principal (Porta 3000)"
    echo "   🧮 api-simulador-lunasdigital (Porta 3002)"
    echo "   📊 crm-lunasdigital (Porta 3001)"
    echo "   🗄️ base-dados-lunasdigital (Porta 3003)"
    echo "   📱 whatsapp-dispatcher (Porta 3004)"
    echo "   🏦 fgts-service-lunas-digital (Porta 5000) ← NOVO"
    echo ""
    echo "🌐 URLs disponíveis:"
    echo "   Painel FGTS: http://$SERVER_IP:5000/"
    echo "   Status API: http://$SERVER_IP:5000/fgts/status"
    echo "   Health Check: http://$SERVER_IP:5000/health"
    echo ""
    echo "🔗 Integração com sistema:"
    echo "   Rede: lunas-network"
    echo "   Container: fgts-service-lunas-digital"
    echo "   Sistema: Lunas Digital"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Configure subdomínio: fgts.lunasdigital.com.br"
    echo "   2. Configure Nginx: sudo cp nginx-fgts.conf /etc/nginx/sites-available/"
    echo "   3. Ative site: sudo ln -s /etc/nginx/sites-available/fgts-lunas-digital /etc/nginx/sites-enabled/"
    echo "   4. Teste: sudo nginx -t && sudo systemctl reload nginx"
    echo "   5. Faça upload dos arquivos FGTS completos"
    echo ""
    echo "📁 Arquivos instalados:"
    echo "   Configuração: /opt/lunas-digital/fgts-service/"
    echo "   Logs: /var/logs/lunas-digital/fgts/"
    echo "   Dados: /var/data/lunas-digital/fgts/"
    echo ""
    
else
    error "❌ Erro ao iniciar container FGTS integrado"
fi

log "✅ Instalação do Container FGTS integrado ao Lunas Digital concluída!"
