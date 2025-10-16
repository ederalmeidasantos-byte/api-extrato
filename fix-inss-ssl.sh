#!/bin/bash

# Script para corrigir configuração SSL do INSS

echo "🔧 Corrigindo configuração SSL do INSS..."

# 1. Parar containers conflitantes
echo "🛑 Parando containers..."
docker stop api-lunas-api-simulador-1 2>/dev/null || true
docker stop api-lunas-api-simulador-1-new 2>/dev/null || true

# 2. Verificar certificados SSL
echo "🔍 Verificando certificados SSL..."
if [ ! -d "/etc/letsencrypt/live/inss.lunasdigital.com.br" ]; then
    echo "❌ Certificado SSL não encontrado para inss.lunasdigital.com.br"
    echo "📋 Usando certificado do domínio principal..."
    
    # Usar certificado do domínio principal
    mkdir -p /etc/letsencrypt/live/inss.lunasdigital.com.br
    cp /etc/letsencrypt/live/lunasdigital.com.br/fullchain.pem /etc/letsencrypt/live/inss.lunasdigital.com.br/
    cp /etc/letsencrypt/live/lunasdigital.com.br/privkey.pem /etc/letsencrypt/live/inss.lunasdigital.com.br/
    echo "✅ Certificado copiado"
fi

# 3. Criar configuração Nginx limpa
echo "📝 Criando configuração Nginx..."
cat > /etc/nginx/sites-available/inss-clean.conf << 'EOF'
server {
    listen 80;
    server_name inss.lunasdigital.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name inss.lunasdigital.com.br;

    ssl_certificate /etc/letsencrypt/live/inss.lunasdigital.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inss.lunasdigital.com.br/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Proxy para o simulador
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
EOF

# 4. Remover configurações conflitantes
echo "🧹 Removendo configurações conflitantes..."
rm -f /etc/nginx/sites-enabled/inss_subdomain.conf
rm -f /etc/nginx/conf.d/inss.conf

# 5. Ativar nova configuração
echo "🔗 Ativando nova configuração..."
ln -sf /etc/nginx/sites-available/inss-clean.conf /etc/nginx/sites-enabled/

# 6. Iniciar container do simulador (apenas HTTP)
echo "🚀 Iniciando container do simulador..."
docker run -d --name api-lunas-simulador -p 3002:3002 api-lunas-api-simulador

# 7. Testar configuração Nginx
echo "🧪 Testando configuração Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração Nginx OK"
    # 8. Reiniciar Nginx
    echo "🔄 Reiniciando Nginx..."
    systemctl restart nginx
    
    # 9. Verificar status
    echo "📊 Verificando status..."
    systemctl status nginx --no-pager -l
    docker ps | grep simulador
    
    echo "✅ Configuração concluída!"
    echo "🌐 Teste: https://inss.lunasdigital.com.br/inss/simulador.html"
else
    echo "❌ Erro na configuração Nginx"
    exit 1
fi
