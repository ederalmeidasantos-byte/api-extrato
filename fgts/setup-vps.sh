#!/bin/bash
# Configuração automática VPS para FGTS

echo "🚀 CONFIGURAÇÃO AUTOMÁTICA FGTS + SSL"
echo "====================================="

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt update -y

# Instalar dependências
echo "📦 Instalando dependências..."
apt install docker.io docker-compose nginx certbot python3-certbot-nginx -y

# Iniciar serviços
echo "🚀 Iniciando serviços..."
systemctl start docker nginx
systemctl enable docker nginx

# Configurar Nginx
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
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Ativar configuração
ln -sf /etc/nginx/sites-available/fgts /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e recarregar Nginx
nginx -t
systemctl reload nginx

# Gerar certificado SSL
echo "🔒 Gerando certificado SSL..."
certbot --nginx -d fgts.lunasdigital.com.br --non-interactive --agree-tos --email admin@lunasdigital.com.br

# Configurar renovação automática
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Criar pasta fgts
mkdir -p /home/fgts

echo "✅ Configuração VPS concluída!"
echo "📁 Pasta /home/fgts criada"
echo "🔗 Pronto para receber arquivos FGTS"
