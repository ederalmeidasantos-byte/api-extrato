#!/bin/bash

# Script de Deploy do Simulador INSS
# Automatiza o processo de deploy para produção

echo "🚀 Iniciando deploy do Simulador INSS..."

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

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

# Função para sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto"
fi

# 1. Backup dos dados existentes
log "📦 Criando backup dos dados..."
if [ -d "var/data" ]; then
    tar -czf "backup-$(date +%Y%m%d-%H%M%S).tar.gz" var/data/
    success "Backup criado com sucesso"
else
    warning "Pasta var/data não encontrada, pulando backup"
fi

# 2. Instalar dependências
log "📦 Instalando dependências..."
npm install --production
if [ $? -eq 0 ]; then
    success "Dependências instaladas"
else
    error "Falha ao instalar dependências"
fi

# 3. Verificar variáveis de ambiente
log "🔍 Verificando configurações..."
if [ -z "$OPENAI_API_KEY" ]; then
    warning "OPENAI_API_KEY não definida"
fi

if [ -z "$PORT" ]; then
    export PORT=3000
    log "PORT definida como 3000"
fi

# 4. Criar diretórios necessários
log "📁 Criando diretórios..."
mkdir -p var/data/extratos
mkdir -p var/data/cache
mkdir -p logs
mkdir -p backups
success "Diretórios criados"

# 5. Verificar permissões
log "🔐 Verificando permissões..."
chmod 755 var/data/extratos
chmod 755 var/data/cache
chmod 755 logs
success "Permissões configuradas"

# 6. Teste de conectividade
log "🌐 Testando conectividade..."
if command -v curl &> /dev/null; then
    if curl -s https://api.openai.com/v1/models > /dev/null; then
        success "Conectividade OK"
    else
        warning "Problemas de conectividade com OpenAI"
    fi
else
    warning "curl não encontrado, pulando teste de conectividade"
fi

# 7. Iniciar servidor
log "🚀 Iniciando servidor..."
if [ "$1" = "--daemon" ]; then
    # Modo daemon (background)
    nohup node server.js > logs/server.log 2>&1 &
    echo $! > server.pid
    success "Servidor iniciado em background (PID: $(cat server.pid))"
    log "Logs disponíveis em: logs/server.log"
else
    # Modo foreground
    log "Iniciando servidor em modo foreground..."
    log "Pressione Ctrl+C para parar"
    node server.js
fi

# 8. Verificação pós-deploy
if [ "$1" = "--daemon" ]; then
    sleep 5
    if curl -s http://localhost:$PORT/simular > /dev/null; then
        success "Servidor respondendo corretamente"
    else
        error "Servidor não está respondendo"
    fi
fi

success "Deploy concluído com sucesso! 🎉"



