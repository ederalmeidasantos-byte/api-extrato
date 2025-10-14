#!/bin/bash

# Script de Teste do Container FGTS no VPS
echo "🧪 Testando Container FGTS no VPS..."

# Obter IP do servidor
SERVER_IP=$(curl -s ifconfig.me)
echo "🌐 IP do servidor: $SERVER_IP"

# URLs de teste
BASE_URL="http://$SERVER_IP:5000"
echo "🔗 URL base: $BASE_URL"

# Função para testar endpoint
test_endpoint() {
    local url=$1
    local name=$2
    
    echo "🔍 Testando $name..."
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$url")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        echo "✅ $name: OK"
        cat /tmp/response.json | head -c 200
        echo "..."
    else
        echo "❌ $name: ERRO (HTTP $http_code)"
    fi
    echo ""
}

# Testar endpoints
test_endpoint "$BASE_URL/fgts/status" "Status do Serviço"
test_endpoint "$BASE_URL/health" "Health Check"
test_endpoint "$BASE_URL/fgts/contadores-tempo-real" "Contadores"
test_endpoint "$BASE_URL/fgts/lista-completa" "Lista Completa"

# Testar página principal
echo "🔍 Testando página principal..."
response=$(curl -s -w "%{http_code}" -o /tmp/page.html "$BASE_URL/")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    echo "✅ Página principal: OK"
    page_size=$(wc -c < /tmp/page.html)
    echo "📊 Tamanho da página: $page_size bytes"
    
    # Verificar elementos da interface
    if grep -q "type=\"file\"" /tmp/page.html; then
        echo "✅ Upload de arquivo: Presente"
    else
        echo "❌ Upload de arquivo: Ausente"
    fi
    
    if grep -q "socket.io" /tmp/page.html; then
        echo "✅ Socket.IO: Presente"
    else
        echo "❌ Socket.IO: Ausente"
    fi
else
    echo "❌ Página principal: ERRO (HTTP $http_code)"
fi

echo ""
echo "📋 Resumo dos testes:"
echo "   🌐 Servidor: $SERVER_IP"
echo "   🔗 Painel: $BASE_URL/"
echo "   📊 Status: $BASE_URL/fgts/status"
echo "   ❤️ Health: $BASE_URL/health"

# Verificar container
echo ""
echo "🐳 Status do container:"
docker ps | grep fgts-service || echo "❌ Container não encontrado"

echo ""
echo "📋 Logs recentes do container:"
docker logs --tail 10 fgts-service

echo ""
echo "🎉 Teste concluído!"
echo "📱 Acesse o painel em: $BASE_URL/"
