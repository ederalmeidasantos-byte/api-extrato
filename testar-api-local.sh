#!/bin/bash

# Script para testar API de extrato localmente
# Versão: 1.0.0

echo "🧪 Testando API de extrato localmente..."
echo ""

# Configurações
FILE_ID="7656"
LOCAL_PORT="3002"
LOCAL_URL="http://localhost:$LOCAL_PORT"

echo "📋 Configurações:"
echo "   • File ID: $FILE_ID"
echo "   • Porta local: $LOCAL_PORT"
echo "   • URL local: $LOCAL_URL"
echo ""

# Função para testar endpoint
test_endpoint() {
    local endpoint=$1
    local method=$2
    local data=$3
    local description=$4
    
    echo "🧪 Testando: $description"
    echo "   • Endpoint: $endpoint"
    echo "   • Método: $method"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$LOCAL_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$LOCAL_URL$endpoint")
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    echo "   • Status: $http_code"
    echo "   • Resposta: $body"
    echo ""
    
    return $http_code
}

# Verificar se o servidor está rodando
echo "🔍 Verificando se o servidor está rodando..."
if curl -s "$LOCAL_URL" > /dev/null 2>&1; then
    echo "✅ Servidor está rodando na porta $LOCAL_PORT"
    echo ""
else
    echo "❌ Servidor não está rodando na porta $LOCAL_PORT"
    echo ""
    echo "🚀 Para iniciar o servidor localmente:"
    echo "   1. cd INSS"
    echo "   2. npm install"
    echo "   3. node server-inss.js"
    echo ""
    exit 1
fi

# Teste 1: Endpoint /extrato/:fileId/raw
test_endpoint "/extrato/$FILE_ID/raw" "GET" "" "Obter extrato processado"

# Teste 2: Endpoint /extrair
test_endpoint "/extrair" "POST" "{\"fileId\": \"$FILE_ID\"}" "Extrair dados do extrato"

# Teste 3: Endpoint /api/calcular/:fileId
test_endpoint "/api/calcular/$FILE_ID" "GET" "" "Calcular simulação"

# Teste 4: Endpoint /api/processar-extrato
echo "🧪 Testando: Processar extrato (upload)"
echo "   • Endpoint: /api/processar-extrato"
echo "   • Método: POST"
echo "   • Nota: Este endpoint requer upload de arquivo PDF"
echo "   • Status: ⚠️ Requer arquivo PDF para testar"
echo ""

# Resumo dos testes
echo "📊 Resumo dos testes:"
echo "   • Endpoint /extrato/:fileId/raw: $(test_endpoint "/extrato/$FILE_ID/raw" "GET" "" "test" > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Erro")"
echo "   • Endpoint /extrair: $(test_endpoint "/extrair" "POST" "{\"fileId\": \"$FILE_ID\"}" "test" > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Erro")"
echo "   • Endpoint /api/calcular/:fileId: $(test_endpoint "/api/calcular/$FILE_ID" "GET" "" "test" > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Erro")"
echo ""

echo "🔍 Diagnóstico concluído!"
