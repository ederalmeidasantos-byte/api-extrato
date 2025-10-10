#!/bin/bash

echo "🧪 TESTE ESPECÍFICO - SIMULAÇÃO DAS TABELAS"
echo "==========================================="

# Teste específico para verificar se a simulação está funcionando
echo "1️⃣ Testando endpoint de processamento..."

# Criar um arquivo CSV de teste com o CPF 04046052066
echo "CPF,Telefone,ID" > /tmp/teste-cpf.csv
echo "04046052066,11999999999,99999" >> /tmp/teste-cpf.csv

# Fazer upload do arquivo de teste
echo "2️⃣ Fazendo upload do arquivo de teste..."
curl -X POST -F "file=@/tmp/teste-cpf.csv" http://localhost:3005/fgts/upload

echo ""
echo "3️⃣ Verificando logs de simulação..."
sleep 5

# Verificar se aparecem logs de simulação
if docker logs fgts-lunasdigital --tail 50 2>&1 | grep -q "FORÇANDO SIMULAÇÃO DAS TABELAS"; then
    echo "✅ SIMULAÇÃO DAS TABELAS FUNCIONANDO!"
    echo "Logs encontrados:"
    docker logs fgts-lunasdigital --tail 50 2>&1 | grep "FORÇANDO SIMULAÇÃO DAS TABELAS"
else
    echo "⚠️ Logs de simulação não encontrados ainda"
    echo "Verificando outros logs relevantes:"
    docker logs fgts-lunasdigital --tail 20 2>&1 | grep -E "(simulacao|tabela|NORMAL|ACELERA)"
fi

echo ""
echo "4️⃣ Verificando Socket.IO em tempo real..."
echo "Testando conexão Socket.IO..."
curl -s http://localhost:3005/socket.io/socket.io.js | head -1

echo ""
echo "5️⃣ Verificando disparo pela Kentro..."
echo "Verificando logs de disparo..."
if docker logs fgts-lunasdigital --tail 50 2>&1 | grep -q "disparaFluxo\|Kentro\|changeOpportunityStage"; then
    echo "✅ Disparo pela Kentro funcionando!"
else
    echo "⚠️ Logs de disparo não encontrados ainda"
fi

echo ""
echo "🎯 TESTE ESPECÍFICO CONCLUÍDO!"
echo "=============================="
echo "Para testar completamente, acesse: http://72.60.159.149:3005"
echo "E faça upload de um arquivo CSV com CPFs para processar"
