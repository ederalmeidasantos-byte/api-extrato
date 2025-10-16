#!/bin/bash

echo "🚀 Corrigindo configuração SSL do INSS..."

# Verificar se o Nginx está rodando
echo "📋 Verificando status do Nginx..."
if ! systemctl is-active --quiet nginx; then
    echo "⚠️  Nginx não está rodando. Iniciando..."
    systemctl start nginx
fi

# Verificar configuração do Nginx
echo "📋 Verificando configuração do Nginx..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Configuração do Nginx inválida!"
    exit 1
fi

# Parar containers que podem estar usando a porta 443
echo "🛑 Parando containers que podem estar usando porta 443..."
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep ":443" | while read line; do
    container_name=$(echo $line | awk '{print $1}')
    if [ "$container_name" != "NAMES" ]; then
        echo "   Parando container: $container_name"
        docker stop $container_name
    fi
done

# Reiniciar Nginx
echo "🔄 Reiniciando Nginx..."
systemctl restart nginx

# Verificar se Nginx está rodando
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx reiniciado com sucesso!"
else
    echo "❌ Erro ao reiniciar Nginx!"
    systemctl status nginx
    exit 1
fi

# Verificar se a porta 443 está sendo usada pelo Nginx
echo "📋 Verificando uso da porta 443..."
netstat -tlnp | grep ":443"

# Testar conectividade HTTPS
echo "🌐 Testando conectividade HTTPS..."
curl -I -k https://inss.lunasdigital.com.br/inss/simulador.html 2>/dev/null | head -1

echo "✅ Correção SSL concluída!"
echo "🌐 Teste o acesso: https://inss.lunasdigital.com.br/inss/simulador.html?extrato=7708"
