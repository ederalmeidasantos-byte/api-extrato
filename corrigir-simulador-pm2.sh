#!/bin/bash

echo "🔧 Corrigindo simulador INSS no sistema PM2..."

# Conectar ao VPS e executar comandos
ssh root@72.60.159.149 << 'EOF'

echo "=== VERIFICANDO SISTEMA ATUAL ==="
echo "Status PM2:"
pm2 status

echo ""
echo "=== VERIFICANDO NGINX ==="
systemctl status nginx --no-pager

echo ""
echo "=== VERIFICANDO CONFIGURAÇÃO NGINX ==="
nginx -t

echo ""
echo "=== VERIFICANDO ARQUIVOS INSS ==="
ls -la /root/api-lunas/API\ Lunas/INSS/ 2>/dev/null || echo "❌ Diretório INSS não encontrado"

echo ""
echo "=== TESTANDO SIMULADOR ==="
curl -I http://localhost/inss/simulador.html || echo "❌ Simulador não acessível"

echo ""
echo "=== VERIFICANDO LOGS ==="
echo "Logs da aplicação:"
pm2 logs api-extrato --lines 20

echo ""
echo "Logs do Nginx:"
tail -20 /var/log/nginx/error.log

echo ""
echo "=== CORRIGINDO CONFIGURAÇÃO NGINX ==="
echo "Fazendo backup da configuração atual..."
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

echo "Verificando se há configuração específica para INSS..."
if grep -q "inss.lunasdigital.com.br" /etc/nginx/sites-available/default; then
    echo "✅ Configuração INSS encontrada no Nginx"
else
    echo "❌ Configuração INSS não encontrada - adicionando..."
    
    # Adicionar configuração para INSS
    cat >> /etc/nginx/sites-available/default << 'NGINX_EOF'

# Configuração para Simulador INSS
server {
    listen 80;
    server_name inss.lunasdigital.com.br;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts para processamento ChatGPT
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
        proxy_read_timeout 180s;
    }
}
NGINX_EOF
fi

echo "Testando configuração Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração Nginx válida"
    echo "Reiniciando Nginx..."
    systemctl reload nginx
    echo "✅ Nginx recarregado"
else
    echo "❌ Erro na configuração Nginx - restaurando backup..."
    cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    nginx -t
fi

echo ""
echo "=== VERIFICANDO APLICAÇÃO ==="
echo "Reiniciando aplicação PM2..."
pm2 restart api-extrato

echo "Aguardando aplicação inicializar..."
sleep 5

echo "Status após reinicialização:"
pm2 status

echo ""
echo "=== TESTANDO SIMULADOR ==="
echo "Testando localmente:"
curl -I http://localhost/inss/simulador.html || echo "❌ Simulador não acessível localmente"

echo "Testando via domínio:"
curl -I http://inss.lunasdigital.com.br/inss/simulador.html || echo "❌ Simulador não acessível via domínio"

echo ""
echo "=== VERIFICANDO LOGS FINAIS ==="
echo "Logs da aplicação (últimas 10 linhas):"
pm2 logs api-extrato --lines 10

echo ""
echo "Logs do Nginx (últimas 10 linhas):"
tail -10 /var/log/nginx/error.log

echo ""
echo "✅ Correção concluída!"
echo "🌐 Teste o simulador em: http://inss.lunasdigital.com.br/inss/simulador.html?extrato=7539"

EOF

echo "✅ Script de correção executado no VPS!"




