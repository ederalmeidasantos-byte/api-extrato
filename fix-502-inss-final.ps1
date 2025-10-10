# 🚨 CORREÇÃO EMERGENCIAL - ERRO 502 INSS
# Script para corrigir o problema de IP do container

Write-Host "🚨 CORREÇÃO EMERGENCIAL - ERRO 502 INSS" -ForegroundColor Red
Write-Host "===============================================" -ForegroundColor Yellow

# Conectar no VPS e corrigir a configuração
$vpsIP = "72.60.159.149"

Write-Host "`n🔧 Corrigindo configuração do Nginx..." -ForegroundColor Cyan

# Script para executar no VPS
$fixScript = @"
echo "🔧 CORREÇÃO EMERGENCIAL - ERRO 502 INSS"
echo "======================================="

# 1. Parar todos os containers
echo "`n1. Parando containers..."
docker stop nginx-lunasdigital api-simulador-lunasdigital

# 2. Obter IP atual do container INSS
echo "`n2. Obtendo IP do container INSS..."
INSS_IP=`docker inspect api-simulador-lunasdigital | grep '"IPAddress"' | tail -1 | cut -d'"' -f4`
echo "IP do container INSS: `$INSS_IP"

# 3. Criar nova configuração Nginx
echo "`n3. Criando nova configuração Nginx..."
cat > /tmp/nginx-fix.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream api_simulador {
        server $INSS_IP:3002;
    }

    server {
        listen 80;
        server_name inss.lunasdigital.com.br;
        return 301 https://inss.lunasdigital.com.br;
    }

    server {
        listen 443 ssl;
        server_name inss.lunasdigital.com.br;
        
        ssl_certificate /etc/letsencrypt/live/inss.lunasdigital.com.br/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/inss.lunasdigital.com.br/privkey.pem;
        
        location / {
            proxy_pass http://api_simulador;
            proxy_connect_timeout 180s;
            proxy_send_timeout 180s;
            proxy_read_timeout 180s;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
        }
    }
}
EOF

# 4. Copiar configuração para o container
echo "`n4. Aplicando nova configuração..."
docker cp /tmp/nginx-fix.conf nginx-lunasdigital:/etc/nginx/nginx.conf

# 5. Reiniciar containers
echo "`n5. Reiniciando containers..."
docker start api-simulador-lunasdigital
sleep 5
docker start nginx-lunasdigital

# 6. Testar configuração
echo "`n6. Testando configuração..."
sleep 10
docker exec nginx-lunasdigital nginx -t

# 7. Testar conectividade
echo "`n7. Testando conectividade..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health

echo "`n✅ Correção aplicada!"
echo "Teste a URL: https://inss.lunasdigital.com.br/detalhesdaproposta/22"
"@

# Executar correção
Write-Host "Executando correção no VPS..." -ForegroundColor Yellow
ssh root@$vpsIP $fixScript

Write-Host "`n🎯 CORREÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "Testando URL..." -ForegroundColor Cyan

# Aguardar e testar
Start-Sleep -Seconds 15

try {
    $response = Invoke-WebRequest -Uri "https://inss.lunasdigital.com.br/detalhesdaproposta/22" -UseBasicParsing -TimeoutSec 30
    Write-Host "✅ SUCESSO! URL funcionando!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Ainda há problemas" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 RESUMO DA CORREÇÃO:" -ForegroundColor Yellow
Write-Host "- Problema: IP do container INSS mudou" -ForegroundColor White
Write-Host "- Solução: Atualizada configuração do Nginx" -ForegroundColor White
Write-Host "- Status: Container reiniciado e configurado" -ForegroundColor White
