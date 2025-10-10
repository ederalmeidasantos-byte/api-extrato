#!/bin/bash

# Script Automático para Configurar SSL e Deploy FGTS
# Execute este script no VPS para resolver todos os problemas

echo "🚀 CONFIGURAÇÃO AUTOMÁTICA FGTS + SSL"
echo "====================================="

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Execute como root: sudo $0"
    exit 1
fi

# 1. Atualizar sistema
echo "📦 Atualizando sistema..."
apt update -y

# 2. Instalar Docker (se não estiver instalado)
echo "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

# 3. Instalar Docker Compose (se não estiver instalado)
echo "🔧 Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 4. Instalar Nginx (se não estiver instalado)
echo "🌐 Verificando Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    apt install nginx -y
    systemctl start nginx
    systemctl enable nginx
fi

# 5. Instalar Certbot
echo "🔒 Instalando Certbot..."
apt install certbot python3-certbot-nginx -y

# 6. Parar serviços conflitantes
echo "🛑 Parando serviços conflitantes..."
systemctl stop nginx 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true

# 7. Configurar Nginx básico (sem SSL primeiro)
echo "⚙️ Configurando Nginx..."
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

# 8. Ativar configuração
ln -sf /etc/nginx/sites-available/fgts /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 9. Testar configuração Nginx
echo "🧪 Testando configuração Nginx..."
nginx -t

# 10. Iniciar Nginx
echo "🚀 Iniciando Nginx..."
systemctl start nginx
systemctl enable nginx

# 11. Verificar se porta 3005 está livre
echo "🔍 Verificando porta 3005..."
if netstat -tuln | grep -q ":3005 "; then
    echo "⚠️ Porta 3005 já está em uso. Parando processo..."
    fuser -k 3005/tcp 2>/dev/null || true
    sleep 2
fi

# 12. Aguardar DNS propagar
echo "⏳ Aguardando DNS propagar..."
sleep 10

# 13. Gerar certificado SSL
echo "🔒 Gerando certificado SSL..."
certbot --nginx -d fgts.lunasdigital.com.br --non-interactive --agree-tos --email admin@lunasdigital.com.br

# 14. Verificar se certificado foi criado
if [ -f "/etc/letsencrypt/live/fgts.lunasdigital.com.br/fullchain.pem" ]; then
    echo "✅ Certificado SSL criado com sucesso!"
else
    echo "⚠️ Certificado SSL não foi criado. Continuando sem SSL..."
fi

# 15. Configurar renovação automática
echo "🔄 Configurando renovação automática..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 16. Verificar se pasta fgts existe
if [ ! -d "/home/fgts" ]; then
    echo "📁 Criando pasta fgts..."
    mkdir -p /home/fgts
fi

# 17. Instruções finais
echo ""
echo "🎉 CONFIGURAÇÃO CONCLUÍDA!"
echo "=========================="
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Upload da pasta fgts/ para /home/fgts/"
echo "2. Execute: cd /home/fgts && ./deploy-fgts.sh"
echo ""
echo "🔗 ACESSO:"
echo "HTTP:  http://fgts.lunasdigital.com.br"
echo "HTTPS: https://fgts.lunasdigital.com.br"
echo ""
echo "🧪 TESTE:"
echo "curl http://fgts.lunasdigital.com.br/fgts/status"
echo "curl https://fgts.lunasdigital.com.br/fgts/status"
echo ""
echo "📊 STATUS DOS SERVIÇOS:"
systemctl status nginx --no-pager -l
echo ""
echo "🔒 CERTIFICADOS:"
certbot certificates 2>/dev/null || echo "Nenhum certificado encontrado"
echo ""
echo "✅ Sistema pronto para receber o container FGTS!"
