#!/bin/bash

# Script para diagnosticar API de extrato no VPS
# Execute este script no VPS: bash diagnostico-vps.sh

echo "🔍 Diagnosticando API de extrato no VPS..."
echo ""

# Configurações
FILE_ID="7656"
CONTAINER_NAME="api-lunas-api-simulador-1"

echo "📋 Configurações:"
echo "   • File ID: $FILE_ID"
echo "   • Container: $CONTAINER_NAME"
echo "   • Data: $(date)"
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️ Executando como usuário não-root. Alguns comandos podem falhar."
    echo ""
fi

# 1. Verificar status dos containers
echo "🐳 1. Verificando status dos containers Docker..."
docker ps
echo ""

# 2. Verificar logs do container INSS
echo "📝 2. Verificando logs do container INSS..."
echo "   • Últimas 50 linhas dos logs:"
docker logs --tail 50 $CONTAINER_NAME
echo ""

# 3. Verificar arquivos de extrato
echo "📁 3. Verificando arquivos de extrato..."
echo "   • Diretório de extratos:"
ls -la /var/data/extratos/ 2>/dev/null || echo "   ❌ Diretório não encontrado"
echo ""

echo "   • Arquivo específico para ID $FILE_ID:"
if [ -f "/var/data/extratos/extrato_$FILE_ID.json" ]; then
    echo "   ✅ Arquivo encontrado: extrato_$FILE_ID.json"
    echo "   • Tamanho: $(du -h /var/data/extratos/extrato_$FILE_ID.json | cut -f1)"
    echo "   • Última modificação: $(stat -c %y /var/data/extratos/extrato_$FILE_ID.json)"
else
    echo "   ❌ Arquivo não encontrado: extrato_$FILE_ID.json"
fi
echo ""

# 4. Verificar PDF
echo "📄 4. Verificando arquivo PDF..."
if [ -f "/var/data/extratos/extrato_$FILE_ID.pdf" ]; then
    echo "   ✅ PDF encontrado: extrato_$FILE_ID.pdf"
    echo "   • Tamanho: $(du -h /var/data/extratos/extrato_$FILE_ID.pdf | cut -f1)"
    echo "   • Última modificação: $(stat -c %y /var/data/extratos/extrato_$FILE_ID.pdf)"
else
    echo "   ❌ PDF não encontrado: extrato_$FILE_ID.pdf"
fi
echo ""

# 5. Testar API localmente no container
echo "🧪 5. Testando API localmente no container..."
echo "   • Testando endpoint /extrato/$FILE_ID/raw:"
docker exec $CONTAINER_NAME curl -s "http://localhost:3002/extrato/$FILE_ID/raw" || echo "   ❌ Erro ao testar endpoint"
echo ""

# 6. Verificar variáveis de ambiente
echo "⚙️ 6. Verificando variáveis de ambiente..."
echo "   • Variáveis do container:"
docker exec $CONTAINER_NAME env | grep -E "(NODE_ENV|PORT|KENTRO)" || echo "   ❌ Variáveis não encontradas"
echo ""

# 7. Verificar conectividade com API Kentro
echo "🌐 7. Verificando conectividade com API Kentro..."
echo "   • Testando conexão com Kentro:"
docker exec $CONTAINER_NAME curl -s -o /dev/null -w "%{http_code}" "https://lunasdigital.atenderbem.com/int/downloadFile" || echo "   ❌ Erro de conectividade"
echo ""

# 8. Verificar espaço em disco
echo "💾 8. Verificando espaço em disco..."
echo "   • Espaço disponível:"
df -h /var/data
echo ""

# 9. Verificar permissões
echo "🔐 9. Verificando permissões..."
echo "   • Permissões do diretório:"
ls -ld /var/data/extratos/ 2>/dev/null || echo "   ❌ Diretório não encontrado"
echo ""

# 10. Tentar processar o extrato
echo "🚀 10. Tentando processar o extrato..."
echo "   • Executando /extrair para ID $FILE_ID:"
docker exec $CONTAINER_NAME curl -s -X POST "http://localhost:3002/extrair" \
    -H "Content-Type: application/json" \
    -d "{\"fileId\": \"$FILE_ID\"}" || echo "   ❌ Erro ao processar extrato"
echo ""

# Resumo do diagnóstico
echo "📊 Resumo do diagnóstico:"
echo "   • Container rodando: $(docker ps | grep -q $CONTAINER_NAME && echo "✅ SIM" || echo "❌ NÃO")"
echo "   • Arquivo JSON existe: $([ -f "/var/data/extratos/extrato_$FILE_ID.json" ] && echo "✅ SIM" || echo "❌ NÃO")"
echo "   • Arquivo PDF existe: $([ -f "/var/data/extratos/extrato_$FILE_ID.pdf" ] && echo "✅ SIM" || echo "❌ NÃO")"
echo "   • API respondendo: $(docker exec $CONTAINER_NAME curl -s "http://localhost:3002/extrato/$FILE_ID/raw" > /dev/null 2>&1 && echo "✅ SIM" || echo "❌ NÃO")"
echo ""

# Recomendações
echo "🔧 Recomendações:"
echo ""

if [ ! -f "/var/data/extratos/extrato_$FILE_ID.json" ]; then
    echo "   • Processar o extrato:"
    echo "     docker exec $CONTAINER_NAME curl -X POST 'http://localhost:3002/extrair' \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"fileId\": \"$FILE_ID\"}'"
    echo ""
fi

if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "   • Reiniciar container:"
    echo "     docker-compose restart api-simulador"
    echo ""
fi

echo "   • Verificar logs em tempo real:"
echo "     docker logs -f $CONTAINER_NAME"
echo ""

echo "🔍 Diagnóstico concluído!"
