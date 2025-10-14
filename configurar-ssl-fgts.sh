#!/bin/bash

# Script de Configuração SSL para FGTS Service
echo "🔒 CONFIGURANDO SSL PARA FGTS SERVICE"
echo "===================================="

# Cores
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

# 1. Verificar se Nginx está instalado
if ! command -v nginx &> /dev/null; then
    error "❌ Nginx não está instalado. Instale primeiro: sudo apt install nginx"
fi

# 2. Verificar se Certbot está instalado
if ! command -v certbot &> /dev/null; then
    log "📦 Instalando Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# 3. Obter IP do servidor
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
log "🌐 IP do servidor: $SERVER_IP"

# 4. Configurar Nginx para FGTS
log "🌐 Configurando Nginx..."
sudo tee /etc/nginx/sites-available/fgts-lunas-digital << 'EOF'
server {
    listen 80;
    server_name fgts.lunasdigital.com.br;
    
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

# 5. Ativar site
log "🔗 Ativando site..."
sudo ln -sf /etc/nginx/sites-available/fgts-lunas-digital /etc/nginx/sites-enabled/

# 6. Testar configuração
log "🧪 Testando configuração Nginx..."
if sudo nginx -t; then
    log "✅ Configuração Nginx válida!"
else
    error "❌ Erro na configuração Nginx"
fi

# 7. Reiniciar Nginx
log "🔄 Reiniciando Nginx..."
sudo systemctl reload nginx

# 8. Verificar se container FGTS está rodando
log "🔍 Verificando container FGTS..."
if docker ps | grep -q fgts-service-lunas-digital; then
    log "✅ Container FGTS está rodando!"
else
    warning "⚠️ Container FGTS não está rodando. Iniciando..."
    cd /opt/lunas-digital/fgts-service
    docker-compose up -d
fi

# 9. Testar acesso direto
log "🧪 Testando acesso direto..."
if curl -s http://localhost:5000/health > /dev/null; then
    log "✅ Serviço FGTS acessível na porta 5000!"
else
    error "❌ Serviço FGTS não está acessível"
fi

# 10. Instruções para DNS e SSL
echo ""
echo "🎉 CONFIGURAÇÃO NGINX CONCLUÍDA!"
echo "================================"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. 🌐 Configure DNS:"
echo "   Adicione registro A: fgts.lunasdigital.com.br → $SERVER_IP"
echo ""
echo "2. 🔒 Configure SSL:"
echo "   sudo certbot --nginx -d fgts.lunasdigital.com.br"
echo ""
echo "3. 🧪 Teste acesso:"
echo "   http://$SERVER_IP:5000/ (direto)"
echo "   http://fgts.lunasdigital.com.br/ (após DNS)"
echo "   https://fgts.lunasdigital.com.br/ (após SSL)"
echo ""
echo "4. 📊 Verificar status:"
echo "   curl http://localhost:5000/fgts/status"
echo "   curl http://localhost:5000/health"
echo ""
echo "5. 📋 Comandos úteis:"
echo "   Ver logs Nginx: sudo tail -f /var/log/nginx/fgts_lunas_error.log"
echo "   Ver logs FGTS: docker logs -f fgts-service-lunas-digital"
echo "   Reiniciar Nginx: sudo systemctl reload nginx"
echo "   Reiniciar FGTS: docker restart fgts-service-lunas-digital"
echo ""

# 11. Verificar se subdomínio resolve
log "🔍 Verificando resolução DNS..."
if nslookup fgts.lunasdigital.com.br > /dev/null 2>&1; then
    log "✅ Subdomínio resolve corretamente!"
else
    warning "⚠️ Subdomínio não resolve. Configure DNS primeiro."
fi

log "✅ Configuração SSL para FGTS Service concluída!"
