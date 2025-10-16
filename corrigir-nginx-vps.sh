#!/bin/bash

echo "🔧 Corrigindo nginx no VPS..."

# Parar containers
echo "⏹️ Parando containers..."
docker-compose down

# Aguardar um pouco
sleep 5

# Reconstruir nginx
echo "🔨 Reconstruindo nginx..."
docker-compose build --no-cache nginx

# Iniciar containers
echo "🚀 Iniciando containers..."
docker-compose up -d

# Aguardar containers iniciarem
echo "⏳ Aguardando containers iniciarem..."
sleep 15

# Verificar status
echo "📊 Status dos containers:"
docker-compose ps

# Verificar logs do nginx
echo "📋 Logs do nginx:"
docker-compose logs nginx --tail=20

# Verificar logs do api-simulador
echo "📋 Logs do api-simulador:"
docker-compose logs api-simulador --tail=20

# Testar conectividade
echo "🌐 Testando conectividade..."
curl -I http://localhost/inss/simulador.html || echo "❌ Erro ao acessar simulador"

echo "✅ Correção concluída!"
echo "🌐 Acesse: http://inss.lunasdigital.com.br/inss/simulador.html?extrato=7539"




