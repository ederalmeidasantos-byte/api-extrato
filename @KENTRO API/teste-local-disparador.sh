#!/bin/bash

# Script de Teste Local - Disparador WhatsApp Kentro
# Testa o sistema antes do deploy na VPS

echo "🚀 Teste Local - Disparador WhatsApp Kentro"
echo "=========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se Node.js está instalado
check_node() {
    log "Verificando Node.js..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        success "Node.js encontrado: $NODE_VERSION"
    else
        error "Node.js não encontrado. Instale Node.js 18+ primeiro."
        exit 1
    fi
}

# Verificar se npm está instalado
check_npm() {
    log "Verificando npm..."
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        success "npm encontrado: $NPM_VERSION"
    else
        error "npm não encontrado."
        exit 1
    fi
}

# Instalar dependências
install_dependencies() {
    log "Instalando dependências..."
    cd "@KENTRO API"
    
    if [ ! -f "package.json" ]; then
        error "package.json não encontrado em @KENTRO API/"
        exit 1
    fi
    
    # Instalar dependências se node_modules não existir
    if [ ! -d "node_modules" ]; then
        log "Instalando dependências do npm..."
        npm install
        if [ $? -eq 0 ]; then
            success "Dependências instaladas com sucesso"
        else
            error "Falha ao instalar dependências"
            exit 1
        fi
    else
        success "Dependências já instaladas"
    fi
    
    cd ..
}

# Criar diretório de dados
create_data_dir() {
    log "Criando diretório de dados..."
    mkdir -p "@KENTRO API/data"
    success "Diretório de dados criado"
}

# Verificar arquivos necessários
check_files() {
    log "Verificando arquivos necessários..."
    
    local files=(
        "@KENTRO API/whatsapp-dispatcher-server.js"
        "@KENTRO API/whatsapp-dispatcher.html"
        "@KENTRO API/Dockerfile.whatsapp"
        "@KENTRO API/package.json"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            success "✓ $file"
        else
            error "✗ $file não encontrado"
            exit 1
        fi
    done
}

# Testar servidor local
test_server() {
    log "Iniciando servidor de teste..."
    
    cd "@KENTRO API"
    
    # Definir variáveis de ambiente para teste
    export PORT=3004
    export NODE_ENV=development
    export KENTRO_API_KEY="cd4d0509169d4e2ea9177ac66c1c9376"
    export KENTRO_QUEUE_ID="25"
    export KENTRO_TEMPLATE_ID="99"
    export DISPATCH_DELAY="1000"
    export MAX_RETRIES="2"
    export MAX_BATCH_SIZE="10"
    export ALLOWED_ORIGINS="http://localhost:3004"
    
    log "Variáveis de ambiente configuradas para teste"
    
    # Iniciar servidor em background
    log "Iniciando servidor na porta 3004..."
    node whatsapp-dispatcher-server.js &
    SERVER_PID=$!
    
    # Aguardar servidor iniciar
    sleep 3
    
    # Verificar se servidor está rodando
    if ps -p $SERVER_PID > /dev/null; then
        success "Servidor iniciado com PID: $SERVER_PID"
    else
        error "Falha ao iniciar servidor"
        exit 1
    fi
    
    cd ..
}

# Testar endpoints da API
test_endpoints() {
    log "Testando endpoints da API..."
    
    local base_url="http://localhost:3004"
    
    # Teste 1: Status
    log "Testando GET /api/status..."
    local status_response=$(curl -s -w "%{http_code}" -o /tmp/status.json "$base_url/api/status")
    if [ "$status_response" = "200" ]; then
        success "✓ Status endpoint funcionando"
        cat /tmp/status.json | jq '.' 2>/dev/null || cat /tmp/status.json
    else
        error "✗ Status endpoint falhou (HTTP $status_response)"
    fi
    
    # Teste 2: Histórico
    log "Testando GET /api/historico..."
    local history_response=$(curl -s -w "%{http_code}" -o /tmp/history.json "$base_url/api/historico")
    if [ "$history_response" = "200" ]; then
        success "✓ Histórico endpoint funcionando"
    else
        error "✗ Histórico endpoint falhou (HTTP $history_response)"
    fi
    
    # Teste 3: Interface web
    log "Testando interface web..."
    local web_response=$(curl -s -w "%{http_code}" -o /tmp/web.html "$base_url/")
    if [ "$web_response" = "200" ]; then
        success "✓ Interface web funcionando"
    else
        error "✗ Interface web falhou (HTTP $web_response)"
    fi
}

# Teste de disparo (simulado)
test_dispatch() {
    log "Testando disparo simulado..."
    
    local base_url="http://localhost:3004"
    local test_numbers='["11959088554", "11987654321"]'
    
    local dispatch_payload=$(cat <<EOF
{
    "numbers": $test_numbers,
    "templateId": 99,
    "queueId": 25,
    "data": ["Teste"]
}
EOF
)
    
    log "Enviando disparo de teste..."
    local dispatch_response=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -d "$dispatch_payload" \
        -o /tmp/dispatch.json \
        "$base_url/api/disparar")
    
    if [ "$dispatch_response" = "200" ]; then
        success "✓ Disparo de teste enviado com sucesso"
        cat /tmp/dispatch.json | jq '.' 2>/dev/null || cat /tmp/dispatch.json
    else
        error "✗ Disparo de teste falhou (HTTP $dispatch_response)"
        cat /tmp/dispatch.json
    fi
}

# Teste de logs SSE
test_sse() {
    log "Testando conexão SSE..."
    
    local base_url="http://localhost:3004"
    
    # Testar conexão SSE por 5 segundos
    timeout 5s curl -s -N "$base_url/api/logs" > /tmp/sse.log &
    local sse_pid=$!
    
    sleep 2
    
    if ps -p $sse_pid > /dev/null; then
        success "✓ Conexão SSE funcionando"
        kill $sse_pid 2>/dev/null
    else
        warning "⚠ Conexão SSE pode ter problemas"
    fi
}

# Limpeza
cleanup() {
    log "Limpando recursos de teste..."
    
    # Parar servidor se estiver rodando
    if [ ! -z "$SERVER_PID" ] && ps -p $SERVER_PID > /dev/null; then
        log "Parando servidor de teste..."
        kill $SERVER_PID
        sleep 2
        success "Servidor parado"
    fi
    
    # Limpar arquivos temporários
    rm -f /tmp/status.json /tmp/history.json /tmp/web.html /tmp/dispatch.json /tmp/sse.log
    
    success "Limpeza concluída"
}

# Função principal
main() {
    echo
    log "Iniciando testes locais..."
    echo
    
    # Verificações básicas
    check_node
    check_npm
    check_files
    install_dependencies
    create_data_dir
    
    echo
    log "Iniciando testes do servidor..."
    echo
    
    # Testes do servidor
    test_server
    
    # Aguardar um pouco para o servidor estabilizar
    sleep 2
    
    # Testes de API
    test_endpoints
    
    echo
    log "Testando funcionalidades específicas..."
    echo
    
    # Testes específicos
    test_dispatch
    test_sse
    
    echo
    success "🎉 Todos os testes locais concluídos!"
    echo
    log "Servidor rodando em: http://localhost:3004"
    log "Interface web: http://localhost:3004"
    log "API Status: http://localhost:3004/api/status"
    echo
    warning "Pressione Ctrl+C para parar o servidor e finalizar os testes"
    
    # Manter servidor rodando até interrupção
    trap cleanup EXIT INT TERM
    
    # Aguardar interrupção
    while true; do
        sleep 1
    done
}

# Verificar se jq está instalado (opcional)
if ! command -v jq &> /dev/null; then
    warning "jq não encontrado. Instale para melhor formatação dos testes: sudo apt install jq"
fi

# Executar função principal
main
