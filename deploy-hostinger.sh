#!/bin/bash

# 🚀 SCRIPT DE DEPLOY PARA HOSTINGER VPS
# Data: 29/09/2025
# Servidor: 72.60.159.149

echo "🚀 INICIANDO DEPLOY PARA HOSTINGER VPS..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar se está no diretório correto
if [ ! -f "server.js" ]; then
    error "Arquivo server.js não encontrado. Execute este script no diretório do projeto."
    exit 1
fi

log "📋 Verificando dependências..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado!"
    exit 1
fi

# Verificar NPM
if ! command -v npm &> /dev/null; then
    error "NPM não está instalado!"
    exit 1
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    error "PM2 não está instalado!"
    exit 1
fi

success "✅ Dependências verificadas"

# Criar diretórios necessários
log "📁 Criando diretórios..."
mkdir -p logs
mkdir -p /var/data/cache
mkdir -p /var/data/backups
mkdir -p uploads

success "✅ Diretórios criados"

# Instalar dependências
log "📦 Instalando dependências..."
npm install --production

if [ $? -eq 0 ]; then
    success "✅ Dependências instaladas"
else
    error "❌ Erro ao instalar dependências"
    exit 1
fi

# Parar aplicação se estiver rodando
log "🛑 Parando aplicação anterior..."
pm2 stop api-extrato 2>/dev/null || true
pm2 delete api-extrato 2>/dev/null || true

# Configurar Nginx
log "🌐 Configurando Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/api-extrato
sudo ln -sf /etc/nginx/sites-available/api-extrato /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
sudo nginx -t
if [ $? -eq 0 ]; then
    success "✅ Configuração do Nginx válida"
    sudo systemctl reload nginx
else
    error "❌ Erro na configuração do Nginx"
    exit 1
fi

# Iniciar aplicação com PM2
log "🚀 Iniciando aplicação..."
pm2 start ecosystem.config.cjs

# Aguardar aplicação iniciar
sleep 5

# Verificar se aplicação está rodando
if pm2 list | grep -q "api-extrato.*online"; then
    success "✅ Aplicação iniciada com sucesso"
else
    error "❌ Erro ao iniciar aplicação"
    pm2 logs api-extrato --err
    exit 1
fi

# Salvar configuração do PM2
pm2 save

# Configurar startup automático
pm2 startup systemd -u root --hp /root

# Testar API
log "🔍 Testando API..."
sleep 3

# Teste local
if curl -s http://localhost:3000/api/health > /dev/null; then
    success "✅ API local funcionando"
else
    warning "⚠️ API local não respondeu"
fi

# Teste externo
if curl -s http://72.60.159.149/api/health > /dev/null; then
    success "✅ API externa funcionando"
else
    warning "⚠️ API externa não respondeu (pode levar alguns minutos)"
fi

# Mostrar status final
log "📊 Status final:"
pm2 status
systemctl status nginx --no-pager -l

# Mostrar URLs
echo ""
echo "🌐 URLs disponíveis:"
echo "   • API Health: http://72.60.159.149/api/health"
echo "   • Painel FGTS: http://72.60.159.149/fgts"
echo "   • Status CPFs: http://72.60.159.149/status-cpfs"
echo "   • Simulador: http://72.60.159.149/simulador"
echo ""

# Mostrar comandos úteis
echo "🛠️ Comandos úteis:"
echo "   • Ver logs: pm2 logs api-extrato"
echo "   • Reiniciar: pm2 restart api-extrato"
echo "   • Status: pm2 status"
echo "   • Parar: pm2 stop api-extrato"
echo ""

success "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
log "Aplicação rodando em: http://72.60.159.149"
