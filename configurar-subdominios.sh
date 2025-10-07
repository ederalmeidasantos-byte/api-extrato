#!/bin/bash

# Script para Configurar Subdomínios na VPS
# Execute como root: sudo bash configurar-subdominios.sh

echo "🚀 Configurando Subdomínios na VPS..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERRO] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[AVISO] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Execute como root: sudo bash configurar-subdominios.sh"
    exit 1
fi

# 1. Backup da configuração atual do Nginx
log "Fazendo backup da configuração atual do Nginx..."
if [ -f /etc/nginx/sites-available/default ]; then
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
    log "Backup salvo em /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 2. Instalar Nginx se não estiver instalado
if ! command -v nginx &> /dev/null; then
    log "Instalando Nginx..."
    apt update
    apt install -y nginx
fi

# 3. Parar Nginx
log "Parando Nginx..."
systemctl stop nginx

# 4. Copiar nova configuração
log "Aplicando nova configuração do Nginx..."
if [ -f "nginx-subdominios.conf" ]; then
    cp nginx-subdominios.conf /etc/nginx/sites-available/subdominios
    ln -sf /etc/nginx/sites-available/subdominios /etc/nginx/sites-enabled/
    
    # Remover configuração padrão se existir
    if [ -L /etc/nginx/sites-enabled/default ]; then
        rm /etc/nginx/sites-enabled/default
    fi
else
    error "Arquivo nginx-subdominios.conf não encontrado!"
    exit 1
fi

# 5. Testar configuração do Nginx
log "Testando configuração do Nginx..."
if nginx -t; then
    log "Configuração do Nginx está válida!"
else
    error "Erro na configuração do Nginx!"
    exit 1
fi

# 6. Instalar PM2 se não estiver instalado
if ! command -v pm2 &> /dev/null; then
    log "Instalando PM2..."
    npm install -g pm2
fi

# 7. Criar diretórios para logs
log "Criando diretórios para logs..."
mkdir -p /var/log/nginx
mkdir -p /var/log/api

# 8. Configurar permissões
log "Configurando permissões..."
chown -R www-data:www-data /var/log/nginx
chmod -R 755 /var/log/nginx

# 9. Instalar Certbot para SSL (opcional)
log "Instalando Certbot para certificados SSL..."
apt install -y certbot python3-certbot-nginx

# 10. Iniciar Nginx
log "Iniciando Nginx..."
systemctl start nginx
systemctl enable nginx

# 11. Verificar status
log "Verificando status dos serviços..."
systemctl status nginx --no-pager

# 12. Mostrar próximos passos
echo ""
echo "=========================================="
log "CONFIGURAÇÃO CONCLUÍDA!"
echo "=========================================="
echo ""
info "Próximos passos:"
echo "1. Configure os DNS dos subdomínios no seu provedor:"
echo "   - api.seudominio.com → $(curl -s ifconfig.me)"
echo "   - fgts.seudominio.com → $(curl -s ifconfig.me)"
echo "   - inss.seudominio.com → $(curl -s ifconfig.me)"
echo "   - admin.seudominio.com → $(curl -s ifconfig.me)"
echo ""
echo "2. Configure os sistemas para rodar em portas diferentes:"
echo "   - API Principal: porta 3000"
echo "   - FGTS: porta 3001"
echo "   - INSS: porta 3002"
echo "   - Admin: porta 3003"
echo ""
echo "3. Para obter certificados SSL:"
echo "   sudo certbot --nginx -d api.seudominio.com"
echo "   sudo certbot --nginx -d fgts.seudominio.com"
echo "   sudo certbot --nginx -d inss.seudominio.com"
echo "   sudo certbot --nginx -d admin.seudominio.com"
echo ""
echo "4. Para gerenciar os serviços:"
echo "   sudo systemctl status nginx"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
warning "IMPORTANTE: Substitua 'seudominio.com' pelo seu domínio real!"
echo "=========================================="
