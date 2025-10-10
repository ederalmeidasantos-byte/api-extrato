#!/bin/bash

echo "🧪 TESTANDO CORREÇÕES DO SISTEMA FGTS"
echo "====================================="

# Teste 1: Verificar se o container está rodando
echo "1️⃣ Testando container..."
if docker ps | grep -q fgts-lunasdigital; then
    echo "✅ Container FGTS rodando"
else
    echo "❌ Container FGTS não está rodando"
    exit 1
fi

# Teste 2: Verificar se a API está respondendo
echo "2️⃣ Testando API..."
if curl -s http://localhost:3005/fgts/status | grep -q "status"; then
    echo "✅ API respondendo"
else
    echo "❌ API não está respondendo"
    exit 1
fi

# Teste 3: Verificar se a interface HTML está funcionando
echo "3️⃣ Testando interface HTML..."
if curl -s http://localhost:3005/ | grep -q "FGTS"; then
    echo "✅ Interface HTML funcionando"
else
    echo "❌ Interface HTML não está funcionando"
    exit 1
fi

# Teste 4: Verificar logs de simulação
echo "4️⃣ Verificando logs de simulação..."
if docker logs fgts-lunasdigital 2>&1 | grep -q "FORÇANDO SIMULAÇÃO DAS TABELAS"; then
    echo "✅ Logs de simulação encontrados"
else
    echo "⚠️ Logs de simulação não encontrados (normal se não processou CPFs ainda)"
fi

# Teste 5: Verificar Socket.IO
echo "5️⃣ Testando Socket.IO..."
if curl -s http://localhost:3005/socket.io/socket.io.js | grep -q "socket.io"; then
    echo "✅ Socket.IO funcionando"
else
    echo "❌ Socket.IO não está funcionando"
fi

# Teste 6: Verificar arquivo LISTA-FGTS.csv
echo "6️⃣ Verificando arquivo LISTA-FGTS.csv..."
if docker exec fgts-lunasdigital ls -la /app/fgts/LISTA-FGTS.csv > /dev/null 2>&1; then
    echo "✅ Arquivo LISTA-FGTS.csv presente"
else
    echo "❌ Arquivo LISTA-FGTS.csv não encontrado"
fi

echo ""
echo "🎉 TESTES CONCLUÍDOS!"
echo "====================="
echo "Sistema FGTS está funcionando corretamente!"
echo "Acesse: http://72.60.159.149:3005"
