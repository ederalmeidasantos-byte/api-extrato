#!/bin/bash

echo "🧪 TESTE DE PROCESSAMENTO SIMULTÂNEO"
echo "===================================="
echo ""

# Criar CSV de teste com 20 CPFs
echo "CPF" > /root/fgts/test_concurrent.csv
echo "70223141607" >> /root/fgts/test_concurrent.csv
echo "22477463810" >> /root/fgts/test_concurrent.csv
echo "04046052066" >> /root/fgts/test_concurrent.csv
echo "11111111111" >> /root/fgts/test_concurrent.csv
echo "12345678901" >> /root/fgts/test_concurrent.csv
echo "12345678909" >> /root/fgts/test_concurrent.csv
echo "98765432100" >> /root/fgts/test_concurrent.csv
echo "11144477735" >> /root/fgts/test_concurrent.csv
echo "22255588899" >> /root/fgts/test_concurrent.csv
echo "33366699911" >> /root/fgts/test_concurrent.csv
echo "44477700022" >> /root/fgts/test_concurrent.csv
echo "55588811133" >> /root/fgts/test_concurrent.csv
echo "66699922244" >> /root/fgts/test_concurrent.csv
echo "77700033355" >> /root/fgts/test_concurrent.csv
echo "88811144466" >> /root/fgts/test_concurrent.csv
echo "99922255577" >> /root/fgts/test_concurrent.csv
echo "00033366688" >> /root/fgts/test_concurrent.csv
echo "11144477799" >> /root/fgts/test_concurrent.csv
echo "22255588800" >> /root/fgts/test_concurrent.csv

echo "✅ CSV de teste criado com 20 CPFs"
echo ""

# Testar com diferentes níveis de concorrência
for concurrent in 1 3 5 10; do
  echo "📊 Testando com $concurrent CPFs simultâneos..."
  
  # Alterar concorrência via Socket.IO (simulado)
  echo "⚙️ Configurando concorrência para $concurrent..."
  
  # Fazer upload do CSV
  echo "📤 Enviando CSV para processamento..."
  curl -X POST -F "csvfile=@/root/fgts/test_concurrent.csv" http://localhost:3005/fgts/run
  
  echo ""
  echo "⏳ Aguardando 30 segundos para processamento..."
  sleep 30
  
  # Verificar logs
  echo "📋 Verificando logs de processamento:"
  docker logs fgts-lunasdigital --tail 20 | grep -E "(CPFs simultâneos|Concorrência|PROCESSANDO CPF)"
  
  echo ""
  echo "✅ Teste com $concurrent simultâneos concluído"
  echo "================================================"
  echo ""
done

echo "🎯 TESTE FINAL - Verificando logs de concorrência:"
docker logs fgts-lunasdigital --tail 100 | grep -E "(CPFs simultâneos|Concorrência|PROCESSANDO CPF|simultâneos)"

echo ""
echo "✅ Todos os testes concluídos!"
echo "📊 Verifique os logs acima para confirmar o processamento simultâneo"
