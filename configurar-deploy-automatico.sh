#!/bin/bash
# Script para configurar deploy automático

echo "🚀 Configurando Deploy Automático - API Lunas"

# 1. Tornar scripts executáveis
chmod +x deploy-webhook.sh
chmod +x configurar-deploy-automatico.sh

# 2. Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down

# 3. Rebuild completo
echo "🔨 Rebuildando containers..."
docker-compose up -d --build

# 4. Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 15

# 5. Verificar status
echo "📊 Verificando status..."
docker-compose ps

# 6. Testar API
echo "🧪 Testando API..."
curl -f http://localhost:3000/api/sincronizar-clientes > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ API funcionando!"
else
    echo "❌ Erro na API"
fi

# 7. Mostrar informações
echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Acesse o Portainer: http://seu-ip:9000"
echo "2. Configure webhook do GitHub"
echo "3. Teste deploy automático"
echo ""
echo "🔗 URLs importantes:"
echo "- API: http://seu-ip:3000"
echo "- Portainer: http://seu-ip:9000"
echo "- Busca Clientes: http://seu-ip:3000/operacional/buscar-cliente.html"
