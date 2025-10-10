#!/bin/bash

# Script de Teste Automático para Sistema FGTS
# Executa testes de todas as funcionalidades principais

BASE_URL="http://localhost:3005"
TEST_RESULTS=""

echo "🧪 Testando Sistema FGTS Containerizado..."
echo "=========================================="

# Função para executar teste e registrar resultado
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo "🔍 Testando: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo "✅ $test_name - PASSOU"
        TEST_RESULTS="$TEST_RESULTS✅ $test_name\n"
    else
        echo "❌ $test_name - FALHOU"
        TEST_RESULTS="$TEST_RESULTS❌ $test_name\n"
    fi
    echo ""
}

# 1. Health Check
run_test "Health Check" "curl -f $BASE_URL/fgts/status"

# 2. Configurações
run_test "Endpoint Configurações" "curl -f $BASE_URL/fgts/config"

# 3. Cache Stats
run_test "Estatísticas de Cache" "curl -f $BASE_URL/fgts/cache/estatisticas"

# 4. Listas
run_test "Endpoint Listas" "curl -f $BASE_URL/fgts/listas"

# 5. Logs de Erros
run_test "Logs de Erros" "curl -f $BASE_URL/fgts/logs/erros"

# 6. Pausar Sistema
run_test "Pausar Sistema" "curl -X POST $BASE_URL/fgts/pause"

# 7. Retomar Sistema
run_test "Retomar Sistema" "curl -X POST $BASE_URL/fgts/resume"

# 8. Alterar Delay
run_test "Alterar Delay" "curl -X POST -H 'Content-Type: application/json' -d '{\"delay\":2000}' $BASE_URL/fgts/delay"

# 9. Limpar Cache
run_test "Limpar Cache" "curl -X POST $BASE_URL/fgts/cache/limpar"

# 10. Backup Configurações
run_test "Backup Configurações" "curl -X POST $BASE_URL/fgts/config/backup"

# 11. Teste de Upload (mock)
echo "🔍 Testando: Upload CSV (Mock)"
if curl -X POST -F "csvfile=@LISTA-FGTS.csv" $BASE_URL/fgts/run > /dev/null 2>&1; then
    echo "✅ Upload CSV (Mock) - PASSOU"
    TEST_RESULTS="$TEST_RESULTS✅ Upload CSV (Mock)\n"
else
    echo "❌ Upload CSV (Mock) - FALHOU"
    TEST_RESULTS="$TEST_RESULTS❌ Upload CSV (Mock)\n"
fi
echo ""

# 12. Teste Socket.IO (verificar se está rodando)
echo "🔍 Testando: Socket.IO Connection"
if curl -f "$BASE_URL/socket.io/" > /dev/null 2>&1; then
    echo "✅ Socket.IO Connection - PASSOU"
    TEST_RESULTS="$TEST_RESULTS✅ Socket.IO Connection\n"
else
    echo "❌ Socket.IO Connection - FALHOU"
    TEST_RESULTS="$TEST_RESULTS❌ Socket.IO Connection\n"
fi
echo ""

# Resumo dos Testes
echo "📊 RESUMO DOS TESTES"
echo "==================="
echo -e "$TEST_RESULTS"

# Contar resultados
TOTAL_TESTS=$(echo -e "$TEST_RESULTS" | grep -c "✅\|❌")
PASSED_TESTS=$(echo -e "$TEST_RESULTS" | grep -c "✅")
FAILED_TESTS=$(echo -e "$TEST_RESULTS" | grep -c "❌")

echo "📈 Estatísticas:"
echo "   Total: $TOTAL_TESTS"
echo "   Passou: $PASSED_TESTS"
echo "   Falhou: $FAILED_TESTS"
echo "   Taxa de Sucesso: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo "🎉 Todos os testes passaram! Sistema FGTS está funcionando corretamente."
    exit 0
else
    echo ""
    echo "⚠️  Alguns testes falharam. Verifique os logs do container:"
    echo "   docker-compose logs -f"
    exit 1
fi
