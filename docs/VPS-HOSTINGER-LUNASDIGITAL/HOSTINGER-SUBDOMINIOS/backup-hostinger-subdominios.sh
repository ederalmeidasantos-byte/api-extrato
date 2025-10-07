#!/bin/bash

# 💾 SCRIPT DE BACKUP PARA HOSTINGER VPS COM SUBDOMÍNIOS
# Data: 03/10/2025
# Servidor: 72.60.159.149

echo "💾 BACKUP HOSTINGER VPS - SUBDOMÍNIOS"
echo "======================================"

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

# Configurações
BACKUP_DIR="/var/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="hostinger-subdominios-backup-$TIMESTAMP"
PROJECT_DIR="/root/API Lunas"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Execute como root: sudo bash backup-hostinger-subdominios.sh"
    exit 1
fi

# Criar diretório de backup
log "📁 Criando diretório de backup..."
mkdir -p "$BACKUP_DIR"

# Verificar espaço em disco
log "💽 Verificando espaço em disco..."
AVAILABLE_SPACE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
REQUIRED_SPACE=1000000  # 1GB em KB

if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
    warning "⚠️ Espaço em disco baixo. Disponível: $(($AVAILABLE_SPACE/1024))MB"
    read -p "Deseja continuar mesmo assim? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Backup cancelado pelo usuário"
        exit 1
    fi
fi

# 1. Backup dos dados da aplicação
log "📦 Fazendo backup dos dados da aplicação..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME-data.tar.gz" \
    -C "$PROJECT_DIR" \
    var/data/ \
    uploads/ \
    logs/ \
    2>/dev/null

if [ $? -eq 0 ]; then
    success "✅ Backup dos dados concluído"
else
    error "❌ Erro no backup dos dados"
fi

# 2. Backup da configuração do Nginx
log "🌐 Fazendo backup da configuração do Nginx..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME-nginx.tar.gz" \
    /etc/nginx/sites-available/ \
    /etc/nginx/sites-enabled/ \
    /etc/nginx/nginx.conf \
    2>/dev/null

if [ $? -eq 0 ]; then
    success "✅ Backup do Nginx concluído"
else
    error "❌ Erro no backup do Nginx"
fi

# 3. Backup da configuração do PM2
log "⚙️ Fazendo backup da configuração do PM2..."
pm2 save > /dev/null 2>&1
tar -czf "$BACKUP_DIR/$BACKUP_NAME-pm2.tar.gz" \
    /root/.pm2/ \
    2>/dev/null

if [ $? -eq 0 ]; then
    success "✅ Backup do PM2 concluído"
else
    error "❌ Erro no backup do PM2"
fi

# 4. Backup dos logs do sistema
log "📋 Fazendo backup dos logs do sistema..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME-logs.tar.gz" \
    /var/log/nginx/ \
    /var/log/api/ \
    2>/dev/null

if [ $? -eq 0 ]; then
    success "✅ Backup dos logs concluído"
else
    error "❌ Erro no backup dos logs"
fi

# 5. Backup da configuração do sistema
log "🔧 Fazendo backup da configuração do sistema..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME-system.tar.gz" \
    /etc/ssl/ \
    /etc/letsencrypt/ \
    2>/dev/null

if [ $? -eq 0 ]; then
    success "✅ Backup da configuração do sistema concluído"
else
    warning "⚠️ Alguns arquivos de configuração não foram encontrados"
fi

# 6. Backup do código fonte
log "💻 Fazendo backup do código fonte..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME-code.tar.gz" \
    -C "$PROJECT_DIR" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=var/data \
    --exclude=uploads \
    --exclude=logs \
    . \
    2>/dev/null

if [ $? -eq 0 ]; then
    success "✅ Backup do código fonte concluído"
else
    error "❌ Erro no backup do código fonte"
fi

# 7. Criar arquivo de informações do backup
log "📄 Criando arquivo de informações do backup..."
cat > "$BACKUP_DIR/$BACKUP_NAME-info.txt" << EOF
BACKUP HOSTINGER VPS - SUBDOMÍNIOS
==================================
Data: $(date)
Servidor: 72.60.159.149
Versão: Subdomínios Multi-Sistema

Arquivos incluídos:
- $BACKUP_NAME-data.tar.gz (dados da aplicação)
- $BACKUP_NAME-nginx.tar.gz (configuração Nginx)
- $BACKUP_NAME-pm2.tar.gz (configuração PM2)
- $BACKUP_NAME-logs.tar.gz (logs do sistema)
- $BACKUP_NAME-system.tar.gz (configuração do sistema)
- $BACKUP_NAME-code.tar.gz (código fonte)

Status dos serviços no momento do backup:
$(pm2 status)

Uso de disco:
$(df -h)

Memória:
$(free -h)

Processos Node.js:
$(ps aux | grep node | grep -v grep)
EOF

success "✅ Arquivo de informações criado"

# 8. Criar backup consolidado
log "📦 Criando backup consolidado..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME-complete.tar.gz" \
    "$BACKUP_NAME-data.tar.gz" \
    "$BACKUP_NAME-nginx.tar.gz" \
    "$BACKUP_NAME-pm2.tar.gz" \
    "$BACKUP_NAME-logs.tar.gz" \
    "$BACKUP_NAME-system.tar.gz" \
    "$BACKUP_NAME-code.tar.gz" \
    "$BACKUP_NAME-info.txt" \
    2>/dev/null

if [ $? -eq 0 ]; then
    success "✅ Backup consolidado criado: $BACKUP_NAME-complete.tar.gz"
else
    error "❌ Erro ao criar backup consolidado"
fi

# 9. Limpeza de backups antigos
log "🧹 Limpando backups antigos..."
find "$BACKUP_DIR" -name "hostinger-subdominios-backup-*.tar.gz" -mtime +7 -delete 2>/dev/null
find "$BACKUP_DIR" -name "hostinger-subdominios-backup-*.txt" -mtime +7 -delete 2>/dev/null

success "✅ Limpeza de backups antigos concluída"

# 10. Mostrar resumo
echo ""
echo "======================================"
info "📊 RESUMO DO BACKUP"
echo "======================================"

echo ""
log "📁 Localização dos backups:"
ls -lh "$BACKUP_DIR" | grep "$BACKUP_NAME"

echo ""
log "💽 Tamanho total dos backups:"
du -sh "$BACKUP_DIR" | awk '{print $1}'

echo ""
log "📋 Informações do backup:"
cat "$BACKUP_DIR/$BACKUP_NAME-info.txt"

echo ""
info "🛠️ Comandos úteis:"
echo "   • Ver backups: ls -la $BACKUP_DIR"
echo "   • Restaurar backup: tar -xzf $BACKUP_DIR/$BACKUP_NAME-complete.tar.gz"
echo "   • Limpar backups: find $BACKUP_DIR -name '*.tar.gz' -mtime +7 -delete"
echo ""

# 11. Verificar integridade do backup
log "🔍 Verificando integridade do backup..."
if tar -tzf "$BACKUP_DIR/$BACKUP_NAME-complete.tar.gz" > /dev/null 2>&1; then
    success "✅ Backup íntegro e válido"
else
    error "❌ Backup corrompido ou inválido"
fi

echo ""
success "🎉 BACKUP CONCLUÍDO COM SUCESSO!"
log "Backup salvo em: $BACKUP_DIR/$BACKUP_NAME-complete.tar.gz"
