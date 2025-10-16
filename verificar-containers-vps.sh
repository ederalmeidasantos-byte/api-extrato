#!/bin/bash

echo "🔍 Verificando todos os containers no VPS..."
echo ""

echo "=== STATUS DOS CONTAINERS ==="
docker ps -a
echo ""

echo "=== DOCKER COMPOSE STATUS ==="
docker-compose ps
echo ""

echo "=== LOGS DO NGINX ==="
docker-compose logs nginx --tail=20
echo ""

echo "=== LOGS DO API-SIMULADOR ==="
docker-compose logs api-simulador --tail=20
echo ""

echo "=== LOGS DO SERVIDOR-PRINCIPAL ==="
docker-compose logs servidor-principal --tail=20
echo ""

echo "=== LOGS DO CRM ==="
docker-compose logs crm --tail=20
echo ""

echo "=== LOGS DO BASE-DADOS ==="
docker-compose logs base-dados --tail=20
echo ""

echo "=== LOGS DO WHATSAPP-DISPATCHER ==="
docker-compose logs whatsapp-dispatcher --tail=20
echo ""

echo "=== TESTE DE CONECTIVIDADE ==="
curl -I http://localhost/inss/simulador.html || echo "❌ Erro ao acessar simulador"
echo ""

echo "=== VERIFICACAO DE REDE ==="
docker network ls
echo ""

echo "=== VERIFICACAO DE VOLUMES ==="
docker volume ls
echo ""

echo "=== VERIFICACAO DE RECURSOS ==="
echo "Memoria:"
free -h
echo ""
echo "Disco:"
df -h
echo ""

echo "=== VERIFICACAO DE PORTAS ==="
netstat -tlnp | grep -E ':(80|443|3000|3001|3002|3003|3004)'
echo ""

echo "✅ Verificacao concluida!"




