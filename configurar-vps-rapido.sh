#!/bin/bash

# Script para configurar rapidamente o VPS
# Execute este script no VPS: ssh root@72.60.159.149

set -e

echo "🚀 Configuração Rápida do VPS Lunas Digital"
echo "==========================================="

# 1. Atualizar sistema
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar dependências
echo "🔧 Instalando dependências..."
apt install -y nginx nodejs npm curl wget git

# 3. Instalar PM2
echo "⚙️ Instalando PM2..."
npm install -g pm2

# 4. Navegar para o diretório do projeto
echo "📁 Navegando para o projeto..."
cd "/root/API Lunas" || {
    echo "❌ Diretório /root/API Lunas não encontrado!"
    echo "Execute: git clone https://github.com/seu-usuario/API-Lunas.git '/root/API Lunas'"
    exit 1
}

# 5. Instalar dependências do projeto
echo "📦 Instalando dependências do projeto..."
npm install

# 6. Configurar Nginx
echo "🌐 Configurando Nginx..."

# Backup da configuração atual
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Criar configuração básica
cat > /etc/nginx/sites-available/lunasdigital << 'EOF'
server {
    listen 80;
    server_name lunasdigital.com.br www.lunasdigital.com.br inss.lunasdigital.com.br api.lunasdigital.com.br crm.lunasdigital.com.br admin.lunasdigital.com.br 72.60.159.149;

    # Logs
    access_log /var/log/nginx/lunasdigital.access.log;
    error_log /var/log/nginx/lunasdigital.error.log;

    # Configurações
    client_max_body_size 100M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    keepalive_timeout 65s;
    send_timeout 60s;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # Roteamento por subdomínio
    location / {
        # INSS (porta 3002)
        if ($host = "inss.lunasdigital.com.br") {
            proxy_pass http://localhost:3002;
            break;
        }
        
        # CRM (porta 3001)
        if ($host = "crm.lunasdigital.com.br") {
            proxy_pass http://localhost:3001;
            break;
        }
        
        # API (porta 3000)
        if ($host = "api.lunasdigital.com.br") {
            proxy_pass http://localhost:3000;
            break;
        }
        
        # Admin (porta 3003)
        if ($host = "admin.lunasdigital.com.br") {
            proxy_pass http://localhost:3003;
            break;
        }
        
        # Padrão (porta 3000)
        proxy_pass http://localhost:3000;
    }

    # Headers de proxy
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
    proxy_send_timeout 300s;

    # Health checks
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
EOF

# Ativar configuração
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/lunasdigital /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# 7. Criar arquivo .env se não existir
echo "🔑 Configurando variáveis de ambiente..."
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=sua_chave_openai_aqui
LUNAS_API_KEY=sua_chave_lunas_aqui
LUNAS_API_URL=https://api.lunasdigital.com.br
DB_SERVICE_URL=http://localhost:3003
EOF
    echo "⚠️ Arquivo .env criado. Configure suas chaves!"
fi

# 8. Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p var/data/clientes
mkdir -p var/data/propostas
mkdir -p var/data/extratos
mkdir -p var/log/nginx

# 9. Iniciar serviços
echo "🚀 Iniciando serviços..."

# Parar PM2 se estiver rodando
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Iniciar servidor principal
pm2 start server.js --name "api-principal" --env production

# Iniciar servidor INSS
pm2 start INSS/server-inss.js --name "inss-sistema" --env production

# Iniciar base de dados
pm2 start database-service.js --name "base-dados" --env production

# Salvar configuração PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup systemd -u root --hp /root

# 10. Iniciar Nginx
echo "🌐 Iniciando Nginx..."
systemctl restart nginx
systemctl enable nginx

# 11. Verificar status
echo "📊 Verificando status..."
sleep 5

echo ""
echo "Status do PM2:"
pm2 status

echo ""
echo "Status do Nginx:"
systemctl status nginx --no-pager

# 12. Testar endpoints
echo ""
echo "🧪 Testando endpoints..."

# Testar localmente
echo "Testando localmente:"
curl -f http://localhost:3000/health && echo " ✅ API Principal" || echo " ❌ API Principal"
curl -f http://localhost:3002/health && echo " ✅ INSS" || echo " ❌ INSS"
curl -f http://localhost:3003/health && echo " ✅ Base de Dados" || echo " ❌ Base de Dados"

# Testar via Nginx
echo "Testando via Nginx:"
curl -f http://72.60.159.149/health && echo " ✅ Nginx OK" || echo " ❌ Nginx"

# 13. Informações finais
echo ""
echo "🎉 Configuração concluída!"
echo "========================="
echo ""
echo "🌐 URLs disponíveis:"
echo "   - Site Principal: http://72.60.159.149"
echo "   - Simulador INSS: http://72.60.159.149 (quando acessar via inss.lunasdigital.com.br)"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o DNS no seu provedor:"
echo "   - inss.lunasdigital.com.br → 72.60.159.149"
echo "   - api.lunasdigital.com.br → 72.60.159.149"
echo "   - crm.lunasdigital.com.br → 72.60.159.149"
echo "   - admin.lunasdigital.com.br → 72.60.159.149"
echo ""
echo "2. Aguarde a propagação DNS (até 24h)"
echo ""
echo "3. Teste: http://inss.lunasdigital.com.br"
echo ""
echo "🔧 Comandos úteis:"
echo "   - Ver logs: pm2 logs"
echo "   - Status: pm2 status"
echo "   - Reiniciar: pm2 restart all"
echo "   - Nginx: systemctl status nginx"

