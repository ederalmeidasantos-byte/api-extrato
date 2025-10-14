#!/bin/bash

# Script para testar API de extrato no VPS
# Versão: 1.0.0

echo "🌐 Testando API de extrato no VPS..."
echo ""

# Configurações
FILE_ID="7656"
VPS_URL="https://inss.lunasdigital.com.br"

echo "📋 Configurações:"
echo "   • File ID: $FILE_ID"
echo "   • VPS URL: $VPS_URL"
echo "   • Data: $(date)"
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
    echo "   • URL completa: $VPS_URL$endpoint"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$VPS_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$VPS_URL$endpoint")
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    echo "   • Status: $http_code"
    echo "   • Resposta: $body"
    echo ""
    
    return $http_code
}

# Verificar se o VPS está respondendo
echo "🔍 Verificando se o VPS está respondendo..."
if curl -s "$VPS_URL" > /dev/null 2>&1; then
    echo "✅ VPS está respondendo"
    echo ""
else
    echo "❌ VPS não está respondendo"
    echo ""
    echo "🚨 Possíveis problemas:"
    echo "   1. Servidor está fora do ar"
    echo "   2. Problema de DNS"
    echo "   3. Firewall bloqueando"
    echo "   4. Nginx não está rodando"
    echo ""
    exit 1
fi

# Teste 1: Endpoint /extrato/:fileId/raw
echo "🧪 Teste 1: Verificando extrato processado"
test_endpoint "/extrato/$FILE_ID/raw" "GET" "" "Obter extrato processado"

# Teste 2: Endpoint /extrair
echo "🧪 Teste 2: Extraindo dados do extrato"
test_endpoint "/extrair" "POST" "{\"fileId\": \"$FILE_ID\"}" "Extrair dados do extrato"

# Teste 3: Endpoint /api/calcular/:fileId
echo "🧪 Teste 3: Calculando simulação"
test_endpoint "/api/calcular/$FILE_ID" "GET" "" "Calcular simulação"

# Teste 4: Verificar logs do servidor
echo "🧪 Teste 4: Verificando logs do servidor"
echo "   • Comando: docker logs api-lunas-api-simulador-1"
echo "   • Nota: Execute este comando no VPS para ver os logs"
echo ""

# Teste 5: Verificar status dos containers
echo "🧪 Teste 5: Verificando status dos containers"
echo "   • Comando: docker ps"
echo "   • Nota: Execute este comando no VPS para ver os containers"
echo ""

# Diagnóstico específico para o problema
echo "🔍 Diagnóstico específico para ID $FILE_ID:"
echo ""

if curl -s "$VPS_URL/extrato/$FILE_ID/raw" | grep -q "Extrato não encontrado"; then
    echo "❌ Problema identificado: Extrato não encontrado"
    echo ""
    echo "🔧 Possíveis causas:"
    echo "   1. Arquivo extrato_$FILE_ID.json não existe no servidor"
    echo "   2. Arquivo foi deletado ou expirou"
    echo "   3. Problema na API da Kentro"
    echo "   4. Erro no processamento do PDF"
    echo ""
    echo "🛠️ Soluções sugeridas:"
    echo "   1. Processar o extrato novamente via /extrair"
    echo "   2. Verificar se o fileId existe na API da Kentro"
    echo "   3. Verificar logs do container"
    echo "   4. Verificar permissões de arquivo"
    echo ""
else
    echo "✅ Extrato encontrado ou erro diferente"
fi

# Resumo dos testes
echo "📊 Resumo dos testes:"
echo "   • VPS respondendo: ✅"
echo "   • Endpoint /extrato/:fileId/raw: $(curl -s "$VPS_URL/extrato/$FILE_ID/raw" > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Erro")"
echo "   • Endpoint /extrair: $(curl -s -X POST "$VPS_URL/extrair" -H "Content-Type: application/json" -d "{\"fileId\": \"$FILE_ID\"}" > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Erro")"
echo "   • Endpoint /api/calcular/:fileId: $(curl -s "$VPS_URL/api/calcular/$FILE_ID" > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Erro")"
echo ""

echo "🔍 Diagnóstico concluído!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Conectar ao VPS: ssh root@seu-vps.com"
echo "   2. Verificar containers: docker ps"
echo "   3. Verificar logs: docker logs api-lunas-api-simulador-1"
echo "   4. Verificar arquivos: ls -la /var/data/extratos/"
echo "   5. Processar extrato: curl -X POST http://localhost:3002/extrair -H 'Content-Type: application/json' -d '{\"fileId\": \"$FILE_ID\"}'"
