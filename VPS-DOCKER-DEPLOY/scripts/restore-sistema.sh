#!/bin/bash

# Script de Restore do Sistema Lunas Digital
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
RESTORE_DIR="/tmp/restore_$(date +%Y%m%d_%H%M%S)"

# Verificar argumentos
if [ $# -eq 0 ]; then
    echo "Uso: $0 <arquivo_backup.tar.gz>"
    echo ""
    echo "Backups disponíveis:"
    ls -lh $BACKUP_DIR/backup_lunasdigital_*.tar.gz 2>/dev/null || echo "Nenhum backup encontrado"
    exit 1
fi

BACKUP_FILE=$1

# Verificar se o arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    error "Arquivo de backup não encontrado: $BACKUP_FILE"
fi

# Verificar se o arquivo é válido
if ! tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
    error "Arquivo de backup corrompido ou inválido: $BACKUP_FILE"
fi

log "🔄 Iniciando restore do sistema Lunas Digital..."
log "📁 Arquivo de backup: $BACKUP_FILE"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root"
fi

# Criar diretório de restore
mkdir -p $RESTORE_DIR

# Extrair backup
log "📦 Extraindo backup..."
tar -xzf "$BACKUP_FILE" -C $RESTORE_DIR

# Verificar se a extração foi bem-sucedida
if [ ! -d "$RESTORE_DIR" ]; then
    error "Falha ao extrair backup"
fi

log "✅ Backup extraído com sucesso"

# Parar containers existentes
log "🛑 Parando containers existentes..."
docker stop $(docker ps -q) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Restaurar containers
log "🐳 Restaurando containers..."

# CRM Container
if [ -f "$RESTORE_DIR/crm-container.tar" ]; then
    log "Restaurando container CRM..."
    docker load < $RESTORE_DIR/crm-container.tar
    log "✅ Container CRM restaurado"
else
    warning "Arquivo do container CRM não encontrado"
fi

# INSS Container
if [ -f "$RESTORE_DIR/inss-container.tar" ]; then
    log "Restaurando container INSS..."
    docker load < $RESTORE_DIR/inss-container.tar
    log "✅ Container INSS restaurado"
else
    warning "Arquivo do container INSS não encontrado"
fi

# Restaurar configurações
log "⚙️ Restaurando configurações..."

# Nginx
if [ -d "$RESTORE_DIR/nginx" ]; then
    log "Restaurando configurações Nginx..."
    cp -r $RESTORE_DIR/nginx/* /etc/nginx/
    log "✅ Configurações Nginx restauradas"
else
    warning "Configurações Nginx não encontradas"
fi

# SSL
if [ -d "$RESTORE_DIR/ssl" ]; then
    log "Restaurando certificados SSL..."
    cp -r $RESTORE_DIR/ssl/* /etc/ssl/
    log "✅ Certificados SSL restaurados"
else
    warning "Certificados SSL não encontrados"
fi

# Docker Compose
if [ -f "$RESTORE_DIR/crm-docker-compose.yml" ]; then
    log "Restaurando Docker Compose CRM..."
    cp $RESTORE_DIR/crm-docker-compose.yml /opt/lunasdigital/crm-lunasdigital/docker-compose.yml
    log "✅ Docker Compose CRM restaurado"
fi

if [ -f "$RESTORE_DIR/inss-docker-compose.yml" ]; then
    log "Restaurando Docker Compose INSS..."
    cp $RESTORE_DIR/inss-docker-compose.yml /opt/lunasdigital/inss-simulador/docker-compose.yml
    log "✅ Docker Compose INSS restaurado"
fi

# Variáveis de ambiente
if [ -f "$RESTORE_DIR/crm.env" ]; then
    log "Restaurando variáveis CRM..."
    cp $RESTORE_DIR/crm.env /opt/lunasdigital/crm-lunasdigital/.env
    log "✅ Variáveis CRM restauradas"
fi

if [ -f "$RESTORE_DIR/inss.env" ]; then
    log "Restaurando variáveis INSS..."
    cp $RESTORE_DIR/inss.env /opt/lunasdigital/inss-simulador/.env
    log "✅ Variáveis INSS restauradas"
fi

# Restaurar dados da aplicação
log "📁 Restaurando dados da aplicação..."

# Dados do CRM
if [ -d "$RESTORE_DIR/crm-data" ]; then
    log "Restaurando dados CRM..."
    cp -r $RESTORE_DIR/crm-data/* /opt/lunasdigital/crm-lunasdigital/data/
    log "✅ Dados CRM restaurados"
fi

# Dados do INSS
if [ -d "$RESTORE_DIR/inss-data" ]; then
    log "Restaurando dados INSS..."
    cp -r $RESTORE_DIR/inss-data/* /opt/lunasdigital/inss-simulador/data/
    log "✅ Dados INSS restaurados"
fi

# Uploads
if [ -d "$RESTORE_DIR/uploads" ]; then
    log "Restaurando uploads..."
    cp -r $RESTORE_DIR/uploads/* /opt/lunasdigital/uploads/
    log "✅ Uploads restaurados"
fi

# Iniciar containers
log "🚀 Iniciando containers..."

# CRM
if [ -d "/opt/lunasdigital/crm-lunasdigital" ]; then
    cd /opt/lunasdigital/crm-lunasdigital
    docker-compose up -d
    log "✅ Container CRM iniciado"
else
    warning "Diretório CRM não encontrado"
fi

# INSS
if [ -d "/opt/lunasdigital/inss-simulador" ]; then
    cd /opt/lunasdigital/inss-simulador
    docker-compose up -d
    log "✅ Container INSS iniciado"
else
    warning "Diretório INSS não encontrado"
fi

# Restaurar bancos de dados
log "🗄️ Restaurando bancos de dados..."

# Aguardar containers iniciarem
sleep 10

# Verificar se PostgreSQL está rodando
if docker ps | grep -q "postgres"; then
    # Restaurar CRM
    if [ -f "$RESTORE_DIR/crm_db.sql" ]; then
        log "Restaurando banco CRM..."
        CRM_CONTAINER=$(docker ps -q --filter "name=crm")
        if [ ! -z "$CRM_CONTAINER" ]; then
            docker exec -i $CRM_CONTAINER psql -U postgres crm_db < $RESTORE_DIR/crm_db.sql
            log "✅ Banco CRM restaurado"
        else
            warning "Container CRM não encontrado para restore do banco"
        fi
    fi
    
    # Restaurar INSS
    if [ -f "$RESTORE_DIR/inss_db.sql" ]; then
        log "Restaurando banco INSS..."
        INSS_CONTAINER=$(docker ps -q --filter "name=inss")
        if [ ! -z "$INSS_CONTAINER" ]; then
            docker exec -i $INSS_CONTAINER psql -U postgres inss_db < $RESTORE_DIR/inss_db.sql
            log "✅ Banco INSS restaurado"
        else
            warning "Container INSS não encontrado para restore do banco"
        fi
    fi
else
    warning "PostgreSQL não está rodando. Restore dos bancos pulado."
fi

# Restaurar logs
log "📝 Restaurando logs..."

# Logs do sistema
if [ -d "$RESTORE_DIR/nginx" ]; then
    cp -r $RESTORE_DIR/nginx/* /var/log/nginx/ 2>/dev/null || true
    log "✅ Logs Nginx restaurados"
fi

# Logs da aplicação
if [ -d "$RESTORE_DIR/logs" ]; then
    cp -r $RESTORE_DIR/logs/* /opt/lunasdigital/logs/ 2>/dev/null || true
    log "✅ Logs da aplicação restaurados"
fi

# Reiniciar serviços
log "🔄 Reiniciando serviços..."

# Nginx
if command -v nginx > /dev/null 2>&1; then
    nginx -t
    systemctl restart nginx
    log "✅ Nginx reiniciado"
else
    warning "Nginx não encontrado"
fi

# Docker
systemctl restart docker
log "✅ Docker reiniciado"

# Verificar status dos containers
log "📊 Verificando status dos containers..."

sleep 10  # Aguardar containers iniciarem

if docker ps | grep -q "crm"; then
    log "✅ Container CRM rodando"
else
    warning "⚠️ Container CRM não está rodando"
fi

if docker ps | grep -q "inss"; then
    log "✅ Container INSS rodando"
else
    warning "⚠️ Container INSS não está rodando"
fi

# Testar URLs
log "🧪 Testando URLs..."

# Aguardar serviços iniciarem
sleep 5

# Testar CRM
if curl -s http://localhost:3001 > /dev/null; then
    log "✅ CRM respondendo na porta 3001"
else
    warning "⚠️ CRM não está respondendo na porta 3001"
fi

# Testar INSS
if curl -s http://localhost:3002 > /dev/null; then
    log "✅ INSS respondendo na porta 3002"
else
    warning "⚠️ INSS não está respondendo na porta 3002"
fi

# Testar Nginx
if curl -s http://localhost > /dev/null; then
    log "✅ Nginx respondendo na porta 80"
else
    warning "⚠️ Nginx não está respondendo na porta 80"
fi

# Limpar diretório temporário
log "🧹 Limpando arquivos temporários..."
rm -rf $RESTORE_DIR

# Informações finais
log "🎉 Restore concluído com sucesso!"
echo ""
echo "📋 Informações do Restore:"
echo "   • Backup: $BACKUP_FILE"
echo "   • Data: $(date)"
echo "   • Status: Concluído"
echo ""
echo "🔧 Comandos Úteis:"
echo "   • Status: docker ps"
echo "   • Logs CRM: docker logs crm-container"
echo "   • Logs INSS: docker logs inss-container"
echo "   • Monitor: /opt/lunasdigital/scripts/monitor.sh"
echo ""
echo "🌐 URLs de Acesso:"
echo "   • CRM: http://crm.lunasdigital.com.br"
echo "   • INSS: http://inss.lunasdigital.com.br"
echo "   • API: http://api.lunasdigital.com.br"
echo ""

# Verificar se há problemas
if docker ps | grep -q "Exited"; then
    warning "⚠️ Alguns containers estão com problemas. Verifique os logs."
fi

log "Restore finalizado! 🔄"
