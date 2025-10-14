# Script simples para corrigir nginx
Write-Host "CORRIGINDO NGINX NO VPS" -ForegroundColor Blue

$VPS_HOST = "72.60.159.149"
$VPS_USER = "root"
$SSH_KEY = "C:\Users\srcor\.ssh\id_ed25519"

# Testar SSH
Write-Host "Testando SSH..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "echo 'SSH OK'"

# Ver containers
Write-Host "`nVerificando containers..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker ps"

# Fazer backup
Write-Host "`nFazendo backup..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker exec nginx-lunasdigital cp /etc/nginx/nginx.conf /etc/nginx/nginx-backup.conf"

# Copiar nova config
Write-Host "`nCopiando nova configuracao..." -ForegroundColor Cyan
scp -i $SSH_KEY nginx/nginx.conf "${VPS_USER}@${VPS_HOST}:/tmp/nginx-new.conf"
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker cp /tmp/nginx-new.conf nginx-lunasdigital:/etc/nginx/nginx.conf"

# Testar config
Write-Host "`nTestando configuracao..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker exec nginx-lunasdigital nginx -t"

# Reiniciar nginx
Write-Host "`nReiniciando nginx..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker restart nginx-lunasdigital"

# Aguardar
Write-Host "Aguardando..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar
Write-Host "`nVerificando status..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker ps | grep nginx"

# Limpar
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "rm -f /tmp/nginx-new.conf"

Write-Host "`nCORRECAO CONCLUIDA!" -ForegroundColor Green
Write-Host "Nginx nao vai mais se desconfigurar!" -ForegroundColor Green
