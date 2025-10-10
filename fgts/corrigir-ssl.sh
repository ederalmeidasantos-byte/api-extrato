#!/bin/bash

# Script para CORRIGIR SSL - ERR_CERT_COMMON_NAME_INVALID
# Execute este script no VPS para resolver o problema SSL

echo "🔧 CORRIGINDO ERRO SSL - ERR_CERT_COMMON_NAME_INVALID"
echo "====================================================="

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Execute como root: sudo $0"
    exit 1
fi

# 1. Parar Nginx
echo "🛑 Parando Nginx..."
systemctl stop nginx

# 2. Remover configurações antigas
echo "🗑️ Removendo configurações antigas..."
rm -f /etc/nginx/sites-enabled/fgts
rm -f /etc/nginx/sites-available/fgts
rm -f /etc/letsencrypt/live/fgts.lunasdigital.com.br/* 2>/dev/null || true
rm -rf /etc/letsencrypt/live/fgts.lunasdigital.com.br 2>/dev/null || true

# 3. Verificar DNS
echo "🔍 Verificando DNS..."
nslookup fgts.lunasdigital.com.br
if [ $? -ne 0 ]; then
    echo "❌ DNS não está resolvendo. Aguarde propagação."
    exit 1
fi

# 4. Configurar Nginx básico (HTTP apenas)
echo "⚙️ Configurando Nginx básico..."
cat > /etc/nginx/sites-available/fgts << 'EOF'
server {
    listen 80;
    server_name fgts.lunasdigital.com.br;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /fgts/status {
        proxy_pass http://localhost:3005/fgts/status;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
EOF

# 5. Ativar configuração
ln -sf /etc/nginx/sites-available/fgts /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 6. Testar configuração
echo "🧪 Testando configuração Nginx..."
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Erro na configuração Nginx"
    exit 1
fi

# 7. Iniciar Nginx
echo "🚀 Iniciando Nginx..."
systemctl start nginx
systemctl enable nginx

# 8. Aguardar propagação DNS
echo "⏳ Aguardando propagação DNS..."
sleep 30

# 9. Testar conectividade HTTP
echo "🧪 Testando conectividade HTTP..."
curl -I http://fgts.lunasdigital.com.br 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️ HTTP não está respondendo. Verificando container..."
    # Verificar se container está rodando
    if ! docker ps | grep -q fgts; then
        echo "❌ Container FGTS não está rodando"
        echo "📋 Execute: cd /home/fgts && ./deploy-fgts.sh"
        exit 1
    fi
fi

# 10. Gerar certificado SSL
echo "🔒 Gerando certificado SSL..."
certbot --nginx -d fgts.lunasdigital.com.br --non-interactive --agree-tos --email admin@lunasdigital.com.br --force-renewal

# 11. Verificar certificado
if [ -f "/etc/letsencrypt/live/fgts.lunasdigital.com.br/fullchain.pem" ]; then
    echo "✅ Certificado SSL criado com sucesso!"
    
    # 12. Testar HTTPS
    echo "🧪 Testando HTTPS..."
    curl -I https://fgts.lunasdigital.com.br 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ HTTPS funcionando!"
    else
        echo "⚠️ HTTPS não está respondendo"
    fi
else
    echo "❌ Certificado SSL não foi criado"
    echo "📋 Verifique se o DNS está propagado e tente novamente"
fi

# 13. Configurar renovação automática
echo "🔄 Configurando renovação automática..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 14. Status final
echo ""
echo "🎉 CORREÇÃO SSL CONCLUÍDA!"
echo "=========================="
echo ""
echo "📊 STATUS:"
echo "Nginx: $(systemctl is-active nginx)"
echo "Docker: $(systemctl is-active docker)"
echo ""
echo "🔗 TESTE:"
echo "HTTP:  curl -I http://fgts.lunasdigital.com.br"
echo "HTTPS: curl -I https://fgts.lunasdigital.com.br"
echo ""
echo "📋 CERTIFICADOS:"
certbot certificates 2>/dev/null || echo "Nenhum certificado encontrado"
echo ""
echo "✅ SSL configurado! Teste no navegador: https://fgts.lunasdigital.com.br"
