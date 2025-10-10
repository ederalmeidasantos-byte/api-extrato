#!/bin/bash

# Script de Validação de Código
# Valida sintaxe e estrutura antes de aplicar modificações

CONTAINER_NAME="api-simulador-lunasdigital"
VALIDATION_PASSED=true

echo "🔍 VALIDAÇÃO DE CÓDIGO"
echo "====================="

# Função para validar arquivo JavaScript
validate_js_file() {
    local file_path=$1
    local file_name=$2
    
    echo "🔍 Validando $file_name..."
    
    if [ ! -f "$file_path" ]; then
        echo "❌ Arquivo não encontrado: $file_path"
        VALIDATION_PASSED=false
        return
    fi
    
    # Verificar sintaxe básica
    if command -v node >/dev/null 2>&1; then
        node -c "$file_path" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Sintaxe válida: $file_name"
        else
            echo "❌ ERRO DE SINTAXE: $file_name"
            VALIDATION_PASSED=false
        fi
    fi
    
    # Verificar imports problemáticos
    if grep -q "require.*masked-links-system" "$file_path"; then
        echo "⚠️  AVISO: Referência a masked-links-system encontrada"
        if [ ! -f "/root/api-lunas/INSS/masked-links-system.js" ]; then
            echo "❌ ERRO: Arquivo masked-links-system.js não encontrado"
            VALIDATION_PASSED=false
        fi
    fi
    
    # Verificar chamadas de função não definidas
    if grep -q "adicionarLinksMascarados" "$file_path"; then
        if ! grep -q "const.*adicionarLinksMascarados" "$file_path"; then
            echo "❌ ERRO: Função adicionarLinksMascarados chamada mas não definida"
            VALIDATION_PASSED=false
        fi
    fi
}

# Validar arquivos principais
validate_js_file "/root/api-lunas/INSS/server-inss.js" "server-inss.js"
validate_js_file "/root/api-lunas/INSS/formulario-cliente.js" "formulario-cliente.js"

# Verificar se container está funcionando
echo ""
echo "🔍 Verificando status do container..."
if docker ps | grep -q "$CONTAINER_NAME.*Up"; then
    echo "✅ Container está funcionando"
else
    echo "⚠️  Container não está funcionando corretamente"
    VALIDATION_PASSED=false
fi

# Verificar logs recentes por erros
echo ""
echo "🔍 Verificando logs recentes..."
RECENT_ERRORS=$(docker logs $CONTAINER_NAME --tail 20 2>&1 | grep -i "error\|exception\|failed" | wc -l)
if [ $RECENT_ERRORS -gt 0 ]; then
    echo "⚠️  $RECENT_ERRORS erros encontrados nos logs recentes"
    docker logs $CONTAINER_NAME --tail 5
else
    echo "✅ Nenhum erro recente nos logs"
fi

# Resultado final
echo ""
echo "=================================="
if [ "$VALIDATION_PASSED" = true ]; then
    echo "✅ VALIDAÇÃO PASSOU - Código seguro para aplicar"
    exit 0
else
    echo "❌ VALIDAÇÃO FALHOU - NÃO APLIQUE AS MODIFICAÇÕES"
    echo "🛑 Execute ./restore-backup.sh TIMESTAMP para restaurar"
    exit 1
fi

