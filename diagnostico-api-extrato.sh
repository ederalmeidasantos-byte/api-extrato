#!/bin/bash

# Script para diagnosticar problemas na API de extrato
# Versão: 1.0.0

echo "🔍 Diagnosticando API de extrato..."

# Configurações
API_URL="https://inss.lunasdigital.com.br"
FILE_ID="7656"

echo "📋 Informações do diagnóstico:"
echo "   • API URL: $API_URL"
echo "   • File ID: $FILE_ID"
echo "   • Data: $(date)"
echo ""

# Teste 1: Verificar se o endpoint responde
echo "🧪 Teste 1: Verificando endpoint /extrato/$FILE_ID/raw"
echo "   URL: $API_URL/extrato/$FILE_ID/raw"
echo ""

response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_URL/extrato/$FILE_ID/raw")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

echo "   • Status HTTP: $http_code"
echo "   • Resposta: $body"
echo ""

# Teste 2: Verificar se o endpoint /extrair funciona
echo "🧪 Teste 2: Verificando endpoint /extrair"
echo "   URL: $API_URL/extrair"
echo "   Body: {\"fileId\": \"$FILE_ID\"}"
echo ""

response2=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_URL/extrair" \
  -H "Content-Type: application/json" \
  -d "{\"fileId\": \"$FILE_ID\"}")
http_code2=$(echo $response2 | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body2=$(echo $response2 | sed -e 's/HTTPSTATUS:.*//g')

echo "   • Status HTTP: $http_code2"
echo "   • Resposta: $body2"
echo ""

# Teste 3: Verificar se o endpoint /api/calcular funciona
echo "🧪 Teste 3: Verificando endpoint /api/calcular/$FILE_ID"
echo "   URL: $API_URL/api/calcular/$FILE_ID"
echo ""

response3=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_URL/api/calcular/$FILE_ID")
http_code3=$(echo $response3 | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body3=$(echo $response3 | sed -e 's/HTTPSTATUS:.*//g')

echo "   • Status HTTP: $http_code3"
echo "   • Resposta: $body3"
echo ""

# Análise dos resultados
echo "📊 Análise dos resultados:"
echo ""

if [ "$http_code" = "404" ]; then
    echo "❌ Problema identificado:"
    echo "   • O arquivo extrato_$FILE_ID.json não existe no servidor"
    echo "   • Possíveis causas:"
    echo "     - O extrato nunca foi processado"
    echo "     - O arquivo foi deletado"
    echo "     - Problema na API da Kentro"
    echo "     - Erro no processamento do PDF"
    echo ""
    echo "🔧 Soluções sugeridas:"
    echo "   1. Processar o extrato novamente via /extrair"
    echo "   2. Verificar logs do servidor"
    echo "   3. Verificar se o fileId existe na API da Kentro"
    echo "   4. Verificar permissões de arquivo"
elif [ "$http_code" = "200" ]; then
    echo "✅ Endpoint funcionando corretamente"
    echo "   • O arquivo existe e está sendo retornado"
else
    echo "⚠️ Status inesperado: $http_code"
    echo "   • Verificar logs do servidor"
    echo "   • Verificar configuração do Nginx"
    echo "   • Verificar se o servidor está rodando"
fi

echo ""
echo "🔍 Diagnóstico concluído!"
