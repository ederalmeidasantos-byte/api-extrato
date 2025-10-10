#!/bin/bash

# Script para configurar o arquivo .env para a arquitetura reestruturada

echo "🚀 Configurando arquivo .env para arquitetura multi-container..."

# Verificar se o arquivo de configuração existe
if [ ! -f "config-vps-restructured.env" ]; then
    echo "❌ Arquivo config-vps-restructured.env não encontrado!"
    exit 1
fi

# Fazer backup do .env atual se existir
if [ -f ".env" ]; then
    echo "📋 Fazendo backup do .env atual..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup salvo como .env.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Copiar arquivo de configuração para .env
echo "📝 Copiando configurações para .env..."
cp config-vps-restructured.env .env

echo "✅ Arquivo .env configurado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Edite o arquivo .env com suas credenciais reais"
echo "2. Execute: docker-compose up -d"
echo "3. Verifique os logs: docker-compose logs -f"
echo ""
echo "🔧 Serviços disponíveis:"
echo "  - Servidor Principal: http://localhost:3000"
echo "  - CRM: http://localhost:3001"
echo "  - API + Simulador: http://localhost:3002"
echo "  - Base de Dados: http://localhost:3003"
echo "  - Nginx (Load Balancer): http://localhost"

