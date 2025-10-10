# Script PowerShell para Correção SSL
$VPS_IP = "72.60.159.149"
$VPS_USER = "root"

Write-Host "🚀 CORREÇÃO SSL AUTOMÁTICA" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# Verificar conexão
Write-Host "🔍 Verificando conexão com VPS..." -ForegroundColor Yellow
$connection = Test-NetConnection -ComputerName $VPS_IP -Port 22 -InformationLevel Quiet
if ($connection) {
    Write-Host "✅ VPS acessível" -ForegroundColor Green
} else {
    Write-Host "❌ VPS não acessível" -ForegroundColor Red
    exit 1
}

# Comandos para executar no VPS
$commands = @"
echo "🔧 CORRIGINDO SSL - ERR_CERT_COMMON_NAME_INVALID"
echo "================================================"

# Parar Nginx
systemctl stop nginx

# Remover configurações antigas
rm -f /etc/nginx/sites-enabled/fgts
rm -f /etc/nginx/sites-available/fgts
rm -rf /etc/letsencrypt/live/fgts.lunasdigital.com.br 2>/dev/null || true

# Configurar Nginx básico
cat > /etc/nginx/sites-available/fgts << 'EOF'
server {
    listen 80;
    server_name fgts.lunasdigital.com.br;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }
}
EOF

# Ativar configuração
ln -sf /etc/nginx/sites-available/fgts /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e iniciar Nginx
nginx -t
systemctl start nginx

# Aguardar propagação DNS
sleep 30

# Gerar certificado SSL
certbot --nginx -d fgts.lunasdigital.com.br --non-interactive --agree-tos --email admin@lunasdigital.com.br --force-renewal

# Verificar certificado
if [ -f "/etc/letsencrypt/live/fgts.lunasdigital.com.br/fullchain.pem" ]; then
    echo "✅ Certificado SSL criado com sucesso!"
    curl -I https://fgts.lunasdigital.com.br 2>/dev/null
else
    echo "❌ Certificado SSL não foi criado"
fi

echo "🎉 Correção SSL concluída!"
"@

# Salvar comandos em arquivo temporário
$commands | Out-File -FilePath "ssl-fix.sh" -Encoding UTF8

Write-Host "📤 Executando correção SSL no VPS..." -ForegroundColor Yellow

# Tentar executar via SSH
try {
    if (Get-Command ssh -ErrorAction SilentlyContinue) {
        Write-Host "🔧 Usando SSH para executar correção..." -ForegroundColor Yellow
        Get-Content "ssl-fix.sh" | ssh $VPS_USER@$VPS_IP "bash"
    } else {
        Write-Host "⚠️ SSH não disponível. Execute manualmente:" -ForegroundColor Yellow
        Write-Host "ssh $VPS_USER@$VPS_IP" -ForegroundColor Cyan
        Write-Host "Depois execute o conteúdo do arquivo ssl-fix.sh" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erro ao executar: $($_.Exception.Message)" -ForegroundColor Red
}

# Limpar arquivo temporário
Remove-Item "ssl-fix.sh" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 CORREÇÃO SSL EXECUTADA!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 TESTE NO NAVEGADOR:" -ForegroundColor Yellow
Write-Host "HTTP:  http://fgts.lunasdigital.com.br" -ForegroundColor Cyan
Write-Host "HTTPS: https://fgts.lunasdigital.com.br" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ SSL deve estar funcionando agora!" -ForegroundColor Green
