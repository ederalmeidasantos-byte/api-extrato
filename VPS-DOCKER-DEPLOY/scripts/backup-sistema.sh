#!/bin/bash

# Script de Backup do Sistema Lunas Digital
# Versão: 1.0.0
# Autor: Lunas Digital

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Configurações
BACKUP_DIR="/opt/lunasdigital/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_lunasdigital_$DATE"
TEMP_DIR="/tmp/$BACKUP_NAME"

# Configurações do banco de dados
CRM_DB_HOST="localhost"
CRM_DB_PORT="5432"
CRM_DB_NAME="crm_db"
CRM_DB_USER="postgres"
CRM_DB_PASS=""

INSS_DB_HOST="localhost"
INSS_DB_PORT="5432"
INSS_DB_NAME="inss_db"
INSS_DB_USER="postgres"
INSS_DB_PASS=""

# Configurações de retenção
RETENTION_DAYS=30

log "💾 Iniciando backup do sistema Lunas Digital..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root"
fi

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Criar diretório temporário
mkdir -p $TEMP_DIR

# Backup dos containers Docker
log "🐳 Fazendo backup dos containers Docker..."

# Listar containers
CRM_CONTAINER=$(docker ps -q --filter "name=crm")
INSS_CONTAINER=$(docker ps -q --filter "name=inss")

if [ ! -z "$CRM_CONTAINER" ]; then
    log "Backup do container CRM..."
    docker save crm-container > $TEMP_DIR/crm-container.tar
    log "✅ Container CRM salvo"
else
    warning "Container CRM não encontrado"
fi

if [ ! -z "$INSS_CONTAINER" ]; then
    log "Backup do container INSS..."
    docker save inss-container > $TEMP_DIR/inss-container.tar
    log "✅ Container INSS salvo"
else
    warning "Container INSS não encontrado"
fi

# Backup das configurações
log "⚙️ Fazendo backup das configurações..."

# Nginx
if [ -d "/etc/nginx" ]; then
    cp -r /etc/nginx $TEMP_DIR/
    log "✅ Configurações Nginx salvas"
else
    warning "Configurações Nginx não encontradas"
fi

# SSL
if [ -d "/etc/ssl" ]; then
    cp -r /etc/ssl $TEMP_DIR/
    log "✅ Certificados SSL salvos"
else
    warning "Certificados SSL não encontrados"
fi

# Docker Compose
if [ -f "/opt/lunasdigital/crm-lunasdigital/docker-compose.yml" ]; then
    cp /opt/lunasdigital/crm-lunasdigital/docker-compose.yml $TEMP_DIR/crm-docker-compose.yml
    log "✅ Docker Compose CRM salvo"
fi

if [ -f "/opt/lunasdigital/inss-simulador/docker-compose.yml" ]; then
    cp /opt/lunasdigital/inss-simulador/docker-compose.yml $TEMP_DIR/inss-docker-compose.yml
    log "✅ Docker Compose INSS salvo"
fi

# Variáveis de ambiente
if [ -f "/opt/lunasdigital/crm-lunasdigital/.env" ]; then
    cp /opt/lunasdigital/crm-lunasdigital/.env $TEMP_DIR/crm.env
    log "✅ Variáveis CRM salvas"
fi

if [ -f "/opt/lunasdigital/inss-simulador/.env" ]; then
    cp /opt/lunasdigital/inss-simulador/.env $TEMP_DIR/inss.env
    log "✅ Variáveis INSS salvas"
fi

# Backup dos bancos de dados
log "🗄️ Fazendo backup dos bancos de dados..."

# Verificar se PostgreSQL está rodando
if docker ps | grep -q "postgres"; then
    # Backup CRM
    if [ ! -z "$CRM_CONTAINER" ]; then
        log "Backup do banco CRM..."
        docker exec $CRM_CONTAINER pg_dump -U $CRM_DB_USER $CRM_DB_NAME > $TEMP_DIR/crm_db.sql
        log "✅ Banco CRM salvo"
    fi
    
    # Backup INSS
    if [ ! -z "$INSS_CONTAINER" ]; then
        log "Backup do banco INSS..."
        docker exec $INSS_CONTAINER pg_dump -U $INSS_DB_USER $INSS_DB_NAME > $TEMP_DIR/inss_db.sql
        log "✅ Banco INSS salvo"
    fi
else
    warning "PostgreSQL não está rodando. Backup dos bancos pulado."
fi

# Backup dos logs
log "📝 Fazendo backup dos logs..."

# Logs do sistema
if [ -d "/var/log/nginx" ]; then
    cp -r /var/log/nginx $TEMP_DIR/
    log "✅ Logs Nginx salvos"
fi

# Logs do Docker
if [ -d "/var/lib/docker/containers" ]; then
    find /var/lib/docker/containers -name "*.log" -exec cp {} $TEMP_DIR/ \;
    log "✅ Logs Docker salvos"
fi

# Logs da aplicação
if [ -d "/opt/lunasdigital/logs" ]; then
    cp -r /opt/lunasdigital/logs $TEMP_DIR/
    log "✅ Logs da aplicação salvos"
fi

# Backup dos dados da aplicação
log "📁 Fazendo backup dos dados da aplicação..."

# Dados do CRM
if [ -d "/opt/lunasdigital/crm-lunasdigital/data" ]; then
    cp -r /opt/lunasdigital/crm-lunasdigital/data $TEMP_DIR/crm-data
    log "✅ Dados CRM salvos"
fi

# Dados do INSS
if [ -d "/opt/lunasdigital/inss-simulador/data" ]; then
    cp -r /opt/lunasdigital/inss-simulador/data $TEMP_DIR/inss-data
    log "✅ Dados INSS salvos"
fi

# Backup dos uploads
if [ -d "/opt/lunasdigital/uploads" ]; then
    cp -r /opt/lunasdigital/uploads $TEMP_DIR/
    log "✅ Uploads salvos"
fi

# Criar arquivo de informações do backup
log "📋 Criando arquivo de informações..."

cat > $TEMP_DIR/backup_info.txt << EOF
Backup do Sistema Lunas Digital
Data: $(date)
Versão: 1.0.0
Sistema: $(uname -a)
Docker: $(docker --version)
Nginx: $(nginx -v 2>&1)

Containers:
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

Volumes:
$(docker volume ls)

Redes:
$(docker network ls)

Espaço em disco:
$(df -h)

Memória:
$(free -h)
EOF

# Compactar backup
log "📦 Compactando backup..."

cd /tmp
tar -czf $BACKUP_DIR/$BACKUP_NAME.tar.gz $BACKUP_NAME

# Verificar tamanho do backup
BACKUP_SIZE=$(du -h $BACKUP_DIR/$BACKUP_NAME.tar.gz | cut -f1)
log "✅ Backup compactado: $BACKUP_SIZE"

# Remover diretório temporário
rm -rf $TEMP_DIR

# Limpeza de backups antigos
log "🧹 Limpando backups antigos..."

find $BACKUP_DIR -name "backup_lunasdigital_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Listar backups disponíveis
log "📋 Backups disponíveis:"
ls -lh $BACKUP_DIR/backup_lunasdigital_*.tar.gz 2>/dev/null || echo "Nenhum backup encontrado"

# Verificar integridade do backup
log "🔍 Verificando integridade do backup..."

if tar -tzf $BACKUP_DIR/$BACKUP_NAME.tar.gz > /dev/null 2>&1; then
    log "✅ Backup íntegro e válido"
else
    error "❌ Backup corrompido ou inválido"
fi

# Estatísticas finais
log "📊 Estatísticas do backup:"
echo "   • Arquivo: $BACKUP_NAME.tar.gz"
echo "   • Tamanho: $BACKUP_SIZE"
echo "   • Localização: $BACKUP_DIR"
echo "   • Data: $(date)"
echo ""

# Configurar backup automático se não estiver configurado
if ! crontab -l 2>/dev/null | grep -q "backup.sh"; then
    log "⏰ Configurando backup automático..."
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/lunasdigital/scripts/backup.sh") | crontab -
    log "✅ Backup automático configurado para 2:00 AM"
fi

log "🎉 Backup concluído com sucesso!"
echo ""
echo "📋 Informações do Backup:"
echo "   • Nome: $BACKUP_NAME.tar.gz"
echo "   • Tamanho: $BACKUP_SIZE"
echo "   • Localização: $BACKUP_DIR"
echo "   • Retenção: $RETENTION_DAYS dias"
echo ""
echo "🔧 Comandos Úteis:"
echo "   • Listar backups: ls -lh $BACKUP_DIR/"
echo "   • Restaurar backup: /opt/lunasdigital/scripts/restore.sh $BACKUP_NAME.tar.gz"
echo "   • Verificar backup: tar -tzf $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo ""

# Enviar notificação (opcional)
if command -v mail > /dev/null 2>&1; then
    echo "Backup do sistema Lunas Digital concluído com sucesso em $(date)" | mail -s "Backup Concluído" admin@lunasdigital.com.br
fi

log "Backup finalizado! 💾"
