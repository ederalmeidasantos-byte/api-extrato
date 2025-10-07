#!/bin/bash

# Script para iniciar o servidor API Lunas no VPS
echo "🚀 Iniciando servidor API Lunas..."

# Verificar se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 não está instalado. Instalando..."
    npm install -g pm2
fi

# Parar processos existentes
echo "🛑 Parando processos existentes..."
pm2 stop api-extrato 2>/dev/null || true
pm2 delete api-extrato 2>/dev/null || true

# Criar diretórios necessários
echo "📁 Criando diretórios necessários..."
mkdir -p /var/data/cache
mkdir -p /var/data/extratos
mkdir -p /var/data/clientes
mkdir -p /var/data/propostas
mkdir -p uploads
mkdir -p logs

# Definir permissões
chmod 755 /var/data/cache
chmod 755 /var/data/extratos
chmod 755 /var/data/clientes
chmod 755 /var/data/propostas
chmod 755 uploads
chmod 755 logs

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Iniciar com PM2
echo "🚀 Iniciando servidor com PM2..."
pm2 start ecosystem.config.cjs

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup

echo "✅ Servidor iniciado!"
echo "🌐 Acesse: https://lunasdigital.com.br"
echo "🏦 FGTS: https://lunasdigital.com.br/fgts"
echo ""
echo "📊 Status do servidor:"
pm2 status
