#!/bin/bash

# Script de Segurança - Backup Automático e Validação
# Este script deve ser executado ANTES de qualquer modificação no sistema

CONTAINER_NAME="api-simulador-lunasdigital"
BACKUP_DIR="/root/api-lunas/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🛡️ SISTEMA DE SEGURANÇA ATIVADO"
echo "=================================="

# 1. Criar backup automático
echo "📦 Criando backup automático..."
mkdir -p $BACKUP_DIR

# Backup do server-inss.js
if [ -f "/root/api-lunas/INSS/server-inss.js" ]; then
    cp "/root/api-lunas/INSS/server-inss.js" "$BACKUP_DIR/server-inss.js.backup.$TIMESTAMP"
    echo "✅ Backup do server-inss.js criado: server-inss.js.backup.$TIMESTAMP"
fi

# Backup do formulario-cliente.js
if [ -f "/root/api-lunas/INSS/formulario-cliente.js" ]; then
    cp "/root/api-lunas/INSS/formulario-cliente.js" "$BACKUP_DIR/formulario-cliente.js.backup.$TIMESTAMP"
    echo "✅ Backup do formulario-cliente.js criado: formulario-cliente.js.backup.$TIMESTAMP"
fi

# Backup do docker-compose
if [ -f "/root/api-lunas/docker-compose-lunasdigital.yml" ]; then
    cp "/root/api-lunas/docker-compose-lunasdigital.yml" "$BACKUP_DIR/docker-compose-lunasdigital.yml.backup.$TIMESTAMP"
    echo "✅ Backup do docker-compose criado: docker-compose-lunasdigital.yml.backup.$TIMESTAMP"
fi

# 2. Verificar status dos containers
echo ""
echo "🔍 Verificando status dos containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(api-simulador|nginx|servidor-principal)"

# 3. Verificar logs recentes
echo ""
echo "📋 Verificando logs recentes do api-simulador..."
docker logs $CONTAINER_NAME --tail 5

# 4. Validar sintaxe JavaScript (se possível)
echo ""
echo "🔍 Validando sintaxe JavaScript..."
if command -v node >/dev/null 2>&1; then
    if [ -f "/root/api-lunas/INSS/server-inss.js" ]; then
        node -c "/root/api-lunas/INSS/server-inss.js" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Sintaxe do server-inss.js está válida"
        else
            echo "❌ ERRO: Sintaxe inválida no server-inss.js"
            echo "🛑 OPERAÇÃO CANCELADA POR SEGURANÇA"
            exit 1
        fi
    fi
fi

echo ""
echo "✅ SISTEMA DE SEGURANÇA CONCLUÍDO"
echo "📁 Backups salvos em: $BACKUP_DIR"
echo "🕐 Timestamp: $TIMESTAMP"
echo ""
echo "⚠️  IMPORTANTE: Sempre execute este script antes de modificações!"
echo "🔄 Para restaurar: ./restore-backup.sh $TIMESTAMP"

