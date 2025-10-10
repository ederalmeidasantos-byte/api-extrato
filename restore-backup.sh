#!/bin/bash

# Script de Restauração - Restaura backup em caso de erro
# Uso: ./restore-backup.sh TIMESTAMP

if [ -z "$1" ]; then
    echo "❌ ERRO: Forneça o timestamp do backup"
    echo "Uso: ./restore-backup.sh TIMESTAMP"
    echo "Exemplo: ./restore-backup.sh 20250103_143000"
    exit 1
fi

TIMESTAMP=$1
BACKUP_DIR="/root/api-lunas/backups"
CONTAINER_NAME="api-simulador-lunasdigital"

echo "🔄 RESTAURANDO SISTEMA DO BACKUP"
echo "================================="
echo "📅 Timestamp: $TIMESTAMP"

# Verificar se os arquivos de backup existem
SERVER_BACKUP="$BACKUP_DIR/server-inss.js.backup.$TIMESTAMP"
FORM_BACKUP="$BACKUP_DIR/formulario-cliente.js.backup.$TIMESTAMP"
COMPOSE_BACKUP="$BACKUP_DIR/docker-compose-lunasdigital.yml.backup.$TIMESTAMP"

if [ ! -f "$SERVER_BACKUP" ]; then
    echo "❌ ERRO: Backup do server-inss.js não encontrado: $SERVER_BACKUP"
    exit 1
fi

echo "✅ Backup encontrado: $SERVER_BACKUP"

# Parar container
echo "🛑 Parando container..."
docker stop $CONTAINER_NAME

# Restaurar arquivos
echo "📦 Restaurando arquivos..."

if [ -f "$SERVER_BACKUP" ]; then
    cp "$SERVER_BACKUP" "/root/api-lunas/INSS/server-inss.js"
    echo "✅ server-inss.js restaurado"
fi

if [ -f "$FORM_BACKUP" ]; then
    cp "$FORM_BACKUP" "/root/api-lunas/INSS/formulario-cliente.js"
    echo "✅ formulario-cliente.js restaurado"
fi

if [ -f "$COMPOSE_BACKUP" ]; then
    cp "$COMPOSE_BACKUP" "/root/api-lunas/docker-compose-lunasdigital.yml"
    echo "✅ docker-compose-lunasdigital.yml restaurado"
fi

# Reiniciar container
echo "🚀 Reiniciando container..."
docker start $CONTAINER_NAME

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 10

# Verificar status
echo "🔍 Verificando status..."
docker ps | grep $CONTAINER_NAME

# Verificar logs
echo "📋 Verificando logs..."
docker logs $CONTAINER_NAME --tail 5

echo ""
echo "✅ RESTAURAÇÃO CONCLUÍDA"
echo "🌐 Teste o sistema em: https://inss.lunasdigital.com.br/inss/simulador.html"

