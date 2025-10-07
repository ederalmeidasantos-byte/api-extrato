#!/bin/bash

# 📊 SCRIPT DE MONITORAMENTO PARA HOSTINGER VPS COM SUBDOMÍNIOS
# Data: 03/10/2025
# Servidor: 72.60.159.149

echo "📊 MONITORAMENTO HOSTINGER VPS - SUBDOMÍNIOS"
echo "=============================================="

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

# Função para testar API
test_api() {
    local url=$1
    local name=$2
    local port=$3
    
    if curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        success "✅ $name ($port) - ONLINE"
        return 0
    else
        error "❌ $name ($port) - OFFLINE"
        return 1
    fi
}

# Função para verificar porta
check_port() {
    local port=$1
    local name=$2
    
    if netstat -tlnp | grep -q ":$port "; then
        success "✅ Porta $port ($name) - ATIVA"
        return 0
    else
        error "❌ Porta $port ($name) - INATIVA"
        return 1
    fi
}

echo ""
log "🔍 Verificando status dos serviços..."

# Verificar PM2
echo ""
info "=== STATUS PM2 ==="
if command -v pm2 &> /dev/null; then
    pm2 status
    echo ""
else
    error "PM2 não está instalado!"
fi

# Verificar Nginx
echo ""
info "=== STATUS NGINX ==="
if systemctl is-active --quiet nginx; then
    success "✅ Nginx - ATIVO"
else
    error "❌ Nginx - INATIVO"
fi

# Verificar portas
echo ""
info "=== VERIFICAÇÃO DE PORTAS ==="
check_port 3000 "API Principal"
check_port 3001 "Sistema FGTS"
check_port 3002 "Sistema INSS"
check_port 3003 "Painel Admin"

# Testar APIs locais
echo ""
info "=== TESTE DE APIs LOCAIS ==="
test_api "http://localhost:3000/api/health" "API Principal" "3000"
test_api "http://localhost:3001/api/health" "Sistema FGTS" "3001"
test_api "http://localhost:3002/api/health" "Sistema INSS" "3002"
test_api "http://localhost:3003/api/health" "Painel Admin" "3003"

# Testar APIs externas
echo ""
info "=== TESTE DE APIs EXTERNAS ==="
test_api "http://72.60.159.149/api/health" "API Externa" "80"

# Verificar logs recentes
echo ""
info "=== LOGS RECENTES (últimas 5 linhas) ==="
echo ""
echo "📋 PM2 Logs:"
pm2 logs --lines 5 2>/dev/null || echo "Nenhum log disponível"
echo ""

echo "📋 Nginx Access Log:"
sudo tail -n 5 /var/log/nginx/api-extrato.access.log 2>/dev/null || echo "Log não encontrado"
echo ""

echo "📋 Nginx Error Log:"
sudo tail -n 5 /var/log/nginx/error.log 2>/dev/null || echo "Log não encontrado"
echo ""

# Verificar uso de recursos
echo ""
info "=== USO DE RECURSOS ==="
echo "💾 Memória:"
free -h
echo ""
echo "💽 Disco:"
df -h | grep -E "(Filesystem|/dev/)"
echo ""
echo "🖥️ CPU:"
top -bn1 | grep "Cpu(s)" || echo "Informação de CPU não disponível"
echo ""

# Verificar conectividade de rede
echo ""
info "=== CONECTIVIDADE DE REDE ==="
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    success "✅ Conectividade de rede - OK"
else
    error "❌ Conectividade de rede - PROBLEMA"
fi

# Verificar DNS (se subdomínio configurado)
echo ""
info "=== VERIFICAÇÃO DNS (se configurado) ==="
if command -v nslookup &> /dev/null; then
    echo "Testando resolução DNS..."
    nslookup api.seudominio.com 2>/dev/null || warning "Subdomínio não configurado ou não propagado"
else
    warning "nslookup não disponível"
fi

# Resumo final
echo ""
echo "=============================================="
info "📊 RESUMO DO MONITORAMENTO"
echo "=============================================="

# Contar serviços online
online_count=0
total_count=4

test_api "http://localhost:3000/api/health" "API Principal" "3000" > /dev/null && ((online_count++))
test_api "http://localhost:3001/api/health" "Sistema FGTS" "3001" > /dev/null && ((online_count++))
test_api "http://localhost:3002/api/health" "Sistema INSS" "3002" > /dev/null && ((online_count++))
test_api "http://localhost:3003/api/health" "Painel Admin" "3003" > /dev/null && ((online_count++))

echo ""
if [ $online_count -eq $total_count ]; then
    success "🎉 TODOS OS SERVIÇOS ESTÃO ONLINE! ($online_count/$total_count)"
elif [ $online_count -gt 0 ]; then
    warning "⚠️ ALGUNS SERVIÇOS ESTÃO ONLINE ($online_count/$total_count)"
else
    error "❌ NENHUM SERVIÇO ESTÁ ONLINE! (0/$total_count)"
fi

echo ""
info "🛠️ Comandos úteis:"
echo "   • Ver logs: pm2 logs"
echo "   • Reiniciar: pm2 restart all"
echo "   • Status: pm2 status"
echo "   • Nginx: sudo systemctl status nginx"
echo "   • Monitor: pm2 monit"
echo ""

# Verificar se há erros críticos
echo ""
info "🔍 Verificando erros críticos..."
if pm2 logs --err --lines 10 | grep -i "error\|exception\|fatal" > /dev/null; then
    warning "⚠️ Erros encontrados nos logs. Execute 'pm2 logs --err' para ver detalhes."
else
    success "✅ Nenhum erro crítico encontrado nos logs."
fi

echo ""
log "Monitoramento concluído!"
