#!/bin/bash

echo "🔍 Verificando sistema no VPS Hostinger..."
echo ""

echo "=== INFORMAÇÕES DO SERVIDOR ==="
echo "IP: 72.60.159.149"
echo "Hostname: srv1035582.hstgr.cloud"
echo "Data: $(date)"
echo ""

echo "=== VERIFICAR SISTEMA ATIVO ==="
echo "1. Verificando se Docker está rodando..."
if systemctl is-active --quiet docker; then
    echo "✅ Docker está ativo"
    echo "Containers Docker:"
    docker ps -a
    echo ""
    echo "Docker Compose:"
    docker-compose ps 2>/dev/null || echo "❌ Docker Compose não encontrado"
else
    echo "❌ Docker não está ativo"
fi

echo ""
echo "2. Verificando se PM2 está rodando..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 encontrado"
    echo "Status PM2:"
    pm2 status
    echo ""
    echo "Logs PM2:"
    pm2 logs --lines 10
else
    echo "❌ PM2 não encontrado"
fi

echo ""
echo "=== VERIFICAR NGINX ==="
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está ativo"
    echo "Status Nginx:"
    systemctl status nginx --no-pager
    echo ""
    echo "Configuração Nginx:"
    nginx -t
else
    echo "❌ Nginx não está ativo"
fi

echo ""
echo "=== VERIFICAR PORTAS ==="
echo "Portas em uso:"
netstat -tlnp | grep -E ':(80|443|3000|3001|3002|3003|3004)'

echo ""
echo "=== VERIFICAR APLICAÇÕES ==="
echo "Testando APIs:"
curl -s -I http://localhost:3000/api/health || echo "❌ API porta 3000 não responde"
curl -s -I http://localhost:3002/health || echo "❌ API porta 3002 não responde"
curl -s -I http://localhost/inss/simulador.html || echo "❌ Simulador não responde"

echo ""
echo "=== VERIFICAR ARQUIVOS ==="
echo "Estrutura de diretórios:"
ls -la /root/api-lunas/ 2>/dev/null || echo "❌ Diretório /root/api-lunas não encontrado"
ls -la /root/api-lunas/API\ Lunas/ 2>/dev/null || echo "❌ Diretório API Lunas não encontrado"

echo ""
echo "=== VERIFICAR RECURSOS ==="
echo "Memória:"
free -h
echo ""
echo "Disco:"
df -h
echo ""
echo "CPU:"
top -bn1 | grep "Cpu(s)"

echo ""
echo "=== VERIFICAR LOGS ==="
echo "Logs do sistema (últimas 10 linhas):"
tail -10 /var/log/syslog 2>/dev/null || echo "❌ Logs do sistema não acessíveis"

echo ""
echo "✅ Verificação concluída!"




