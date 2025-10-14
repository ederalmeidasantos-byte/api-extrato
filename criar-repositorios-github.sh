#!/bin/bash

# Script para criar repositórios no GitHub
# Versão: 1.0.0

set -e

echo "🚀 Criando repositórios no GitHub..."

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

# Verificar se GitHub CLI está instalado
if ! command -v gh > /dev/null 2>&1; then
    error "GitHub CLI não encontrado. Instale em: https://cli.github.com/"
fi

# Verificar se está logado
if ! gh auth status > /dev/null 2>&1; then
    error "Não está logado no GitHub CLI. Execute: gh auth login"
fi

# Verificar se as pastas existem
if [ ! -d "CRM-INTEGRACAO" ]; then
    error "Pasta CRM-INTEGRACAO não encontrada"
fi

if [ ! -d "INSS-INTEGRACAO" ]; then
    error "Pasta INSS-INTEGRACAO não encontrada"
fi

# Função para criar repositório
create_repo() {
    local repo_name=$1
    local description=$2
    local folder=$3
    
    log "Criando repositório: $repo_name"
    
    # Criar repositório no GitHub
    gh repo create lunasdigital/$repo_name \
        --public \
        --description "$description" \
        --source=. \
        --remote=origin \
        --push
    
    log "✅ Repositório $repo_name criado com sucesso!"
    
    # Adicionar topics
    log "Adicionando topics ao repositório $repo_name..."
    gh repo edit lunasdigital/$repo_name --add-topic "lunas-digital,nodejs,express,docker,nginx"
    
    # Adicionar licença MIT
    log "Adicionando licença MIT..."
    echo "MIT" > LICENSE
    git add LICENSE
    git commit -m "Add MIT license" || true
    git push origin main || true
    
    log "✅ Repositório $repo_name configurado completamente!"
}

# ===== CRM REPOSITÓRIO =====
log "🏢 Configurando repositório CRM..."

cd CRM-INTEGRACAO

# Verificar se já é um repositório Git
if [ ! -d ".git" ]; then
    error "Pasta CRM-INTEGRACAO não é um repositório Git. Execute: git init"
fi

# Verificar se há commits
if ! git log --oneline -1 > /dev/null 2>&1; then
    error "Pasta CRM-INTEGRACAO não tem commits. Execute: git add . && git commit -m 'Initial commit'"
fi

# Criar repositório CRM
create_repo "crm-lunasdigital" \
    "Sistema CRM completo para gestão de clientes, propostas e integração WhatsApp" \
    "CRM-INTEGRACAO"

cd ..

# ===== INSS REPOSITÓRIO =====
log "🏛️ Configurando repositório INSS..."

cd INSS-INTEGRACAO

# Verificar se já é um repositório Git
if [ ! -d ".git" ]; then
    error "Pasta INSS-INTEGRACAO não é um repositório Git. Execute: git init"
fi

# Verificar se há commits
if ! git log --oneline -1 > /dev/null 2>&1; then
    error "Pasta INSS-INTEGRACAO não tem commits. Execute: git add . && git commit -m 'Initial commit'"
fi

# Criar repositório INSS
create_repo "inss-simulador" \
    "Simulador de empréstimos consignados do INSS com extração de PDFs e cálculos financeiros" \
    "INSS-INTEGRACAO"

cd ..

# ===== INFORMAÇÕES FINAIS =====
log "🎉 Repositórios criados com sucesso!"
echo ""
echo "📋 Links dos Repositórios:"
echo "   • CRM: https://github.com/lunasdigital/crm-lunasdigital"
echo "   • INSS: https://github.com/lunasdigital/inss-simulador"
echo ""
echo "🔧 Comandos para clonar:"
echo "   • CRM: git clone https://github.com/lunasdigital/crm-lunasdigital.git"
echo "   • INSS: git clone https://github.com/lunasdigital/inss-simulador.git"
echo ""
echo "🚀 Comandos para deploy:"
echo "   • CRM: cd crm-lunasdigital && ./deploy.sh"
echo "   • INSS: cd inss-simulador && ./deploy.sh"
echo ""

# Verificar se os repositórios foram criados
log "Verificando repositórios criados..."
if gh repo view lunasdigital/crm-lunasdigital > /dev/null 2>&1; then
    log "✅ CRM repositório verificado"
else
    warning "⚠️ CRM repositório pode não ter sido criado corretamente"
fi

if gh repo view lunasdigital/inss-simulador > /dev/null 2>&1; then
    log "✅ INSS repositório verificado"
else
    warning "⚠️ INSS repositório pode não ter sido criado corretamente"
fi

log "Script finalizado! 🚀"


