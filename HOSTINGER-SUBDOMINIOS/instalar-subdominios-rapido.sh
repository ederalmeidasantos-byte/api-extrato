#!/bin/bash

# ⚡ INSTALAÇÃO RÁPIDA DE SUBDOMÍNIOS - HOSTINGER VPS
# Execute este script para configurar tudo automaticamente

echo "⚡ INSTALAÇÃO RÁPIDA - SUBDOMÍNIOS HOSTINGER"
echo "============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Execute como root: sudo bash instalar-subdominios-rapido.sh"
    exit 1
fi

# Verificar se está no diretório correto
if [ ! -f "server.js" ]; then
    error "Execute este script no diretório do projeto (/root/API Lunas)"
    exit 1
fi

echo ""
info "🚀 Iniciando instalação rápida de subdomínios..."
echo ""

# 1. Dar permissões de execução
log "🔐 Configurando permissões..."
chmod +x HOSTINGER-SUBDOMINIOS/*.sh
success "✅ Permissões configuradas"

# 2. Executar deploy principal
log "🚀 Executando deploy principal..."
bash HOSTINGER-SUBDOMINIOS/deploy-hostinger-subdominios.sh

if [ $? -eq 0 ]; then
    success "✅ Deploy principal concluído"
else
    error "❌ Erro no deploy principal"
    exit 1
fi

# 3. Aguardar serviços iniciarem
log "⏳ Aguardando serviços iniciarem..."
sleep 15

# 4. Executar monitoramento
log "📊 Verificando status dos serviços..."
bash HOSTINGER-SUBDOMINIOS/monitor-hostinger-subdominios.sh

# 5. Criar backup inicial
log "💾 Criando backup inicial..."
bash HOSTINGER-SUBDOMINIOS/backup-hostinger-subdominios.sh

# 6. Mostrar resumo final
echo ""
echo "============================================="
success "🎉 INSTALAÇÃO CONCLUÍDA!"
echo "============================================="

echo ""
info "📋 Próximos passos:"
echo "1. Configure os DNS dos subdomínios no seu provedor:"
echo "   - api.seudominio.com → 72.60.159.149"
echo "   - fgts.seudominio.com → 72.60.159.149"
echo "   - inss.seudominio.com → 72.60.159.149"
echo "   - admin.seudominio.com → 72.60.159.149"
echo ""
echo "2. Para obter certificados SSL:"
echo "   sudo certbot --nginx -d api.seudominio.com"
echo "   sudo certbot --nginx -d fgts.seudominio.com"
echo "   sudo certbot --nginx -d inss.seudominio.com"
echo "   sudo certbot --nginx -d admin.seudominio.com"
echo ""

echo ""
info "🛠️ Comandos úteis:"
echo "   • Monitorar: bash HOSTINGER-SUBDOMINIOS/monitor-hostinger-subdominios.sh"
echo "   • Backup: bash HOSTINGER-SUBDOMINIOS/backup-hostinger-subdominios.sh"
echo "   • Status: pm2 status"
echo "   • Logs: pm2 logs"
echo ""

echo ""
info "📚 Documentação:"
echo "   • README: HOSTINGER-SUBDOMINIOS/README-HOSTINGER-SUBDOMINIOS.md"
echo "   • Guia completo: HOSTINGER-SUBDOMINIOS/GUIA-SUBDOMINIOS-VPS.md"
echo ""

success "🎉 Sistema de subdomínios instalado e configurado!"
