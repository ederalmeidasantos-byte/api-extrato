#!/bin/bash

echo "🚀 Diagnosticando e corrigindo problema SSL ERR_SSL_PROTOCOL_ERROR..."

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

# Verificar se há containers usando porta 443
echo "📋 Verificando containers usando porta 443..."
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep ":443"

# Parar containers que podem estar usando a porta 443
echo "🛑 Parando containers que podem estar usando porta 443..."
docker ps --format "{{.Names}}" | while read container_name; do
    ports=$(docker port $container_name 2>/dev/null | grep ":443")
    if [ ! -z "$ports" ]; then
        echo "   Parando container: $container_name (usa porta 443)"
        docker stop $container_name
    fi
done

# Verificar certificados SSL
echo "📋 Verificando certificados SSL..."
if [ -f "/etc/letsencrypt/live/inss.lunasdigital.com.br/fullchain.pem" ]; then
    echo "✅ Certificado SSL encontrado"
    openssl x509 -in /etc/letsencrypt/live/inss.lunasdigital.com.br/fullchain.pem -text -noout | grep -E "(Subject:|Not After:|DNS:)"
else
    echo "⚠️  Certificado SSL não encontrado em /etc/letsencrypt/live/inss.lunasdigital.com.br/"
fi

# Verificar configuração SSL do Nginx
echo "📋 Verificando configuração SSL do Nginx..."
if [ -f "/etc/nginx/sites-available/inss.lunasdigital.com.br" ]; then
    echo "✅ Configuração do site encontrada"
    grep -A 10 -B 5 "ssl_certificate" /etc/nginx/sites-available/inss.lunasdigital.com.br
else
    echo "⚠️  Configuração do site não encontrada"
fi

# Verificar se o site está habilitado
echo "📋 Verificando se o site está habilitado..."
if [ -L "/etc/nginx/sites-enabled/inss.lunasdigital.com.br" ]; then
    echo "✅ Site habilitado"
else
    echo "⚠️  Site não está habilitado"
    if [ -f "/etc/nginx/sites-available/inss.lunasdigital.com.br" ]; then
        echo "   Habilitando site..."
        ln -sf /etc/nginx/sites-available/inss.lunasdigital.com.br /etc/nginx/sites-enabled/
    fi
fi

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

# Verificar logs do Nginx para erros SSL
echo "📋 Verificando logs do Nginx para erros SSL..."
tail -20 /var/log/nginx/error.log | grep -i ssl

echo "✅ Diagnóstico SSL concluído!"
echo "🌐 Teste o acesso: https://inss.lunasdigital.com.br/inss/simulador.html?extrato=7708"
