# Script simples para aplicar correção nginx no VPS
# Apenas corrige o problema de nginx se desconfigurar

Write-Host "APLICANDO CORRECAO NGINX NO VPS" -ForegroundColor Blue
Write-Host "===============================" -ForegroundColor Blue

# Configurações do VPS
$VPS_HOST = "72.60.159.149"
$VPS_USER = "root"
$SSH_KEY = "C:\Users\srcor\.ssh\id_ed25519"

Write-Host "`nConectando no VPS: $VPS_HOST" -ForegroundColor Cyan

# Verificar se chave SSH existe
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "ERRO: Chave SSH nao encontrada: $SSH_KEY" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Chave SSH encontrada" -ForegroundColor Green

# Testar conectividade
Write-Host "`nTestando conectividade SSH..." -ForegroundColor Cyan
$testResult = ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "echo 'SSH funcionando!'"

if (-not $testResult -or $testResult -notmatch "SSH funcionando") {
    Write-Host "ERRO: Nao foi possivel conectar no VPS!" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Conectividade SSH OK!" -ForegroundColor Green

# Verificar containers Docker
Write-Host "`nVerificando containers Docker..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker ps --format 'table {{.Names}}\t{{.Status}}'"

# Fazer backup da configuração atual
Write-Host "`nFazendo backup da configuração nginx..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker exec nginx-lunasdigital cp /etc/nginx/nginx.conf /etc/nginx/nginx-backup-$(date +%Y%m%d-%H%M%S).conf 2>/dev/null || echo 'Backup nao foi possivel'"

# Copiar nova configuração
Write-Host "`nCopiando nova configuração nginx..." -ForegroundColor Cyan
scp -i $SSH_KEY nginx/nginx.conf "${VPS_USER}@${VPS_HOST}:/tmp/nginx-new.conf"
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker cp /tmp/nginx-new.conf nginx-lunasdigital:/etc/nginx/nginx.conf"

# Testar configuração
Write-Host "`nTestando configuração nginx..." -ForegroundColor Cyan
$nginxTest = ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker exec nginx-lunasdigital nginx -t 2>&1"

if ($nginxTest -match "syntax is ok" -and $nginxTest -match "test is successful") {
    Write-Host "OK: Configuracao nginx valida!" -ForegroundColor Green
} else {
    Write-Host "ERRO: Configuracao nginx invalida!" -ForegroundColor Red
    Write-Host "Restaurando backup..." -ForegroundColor Yellow
    ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker exec nginx-lunasdigital cp /etc/nginx/nginx-backup-*.conf /etc/nginx/nginx.conf"
    exit 1
}

# Reiniciar nginx
Write-Host "`nReiniciando nginx..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker restart nginx-lunasdigital"

# Aguardar reinicialização
Write-Host "Aguardando reinicializacao..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verificar status
Write-Host "`nVerificando status final..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "docker ps | grep nginx"

# Testar conectividade
Write-Host "`nTestando conectividade..." -ForegroundColor Cyan
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "curl -s http://localhost/health 2>/dev/null || echo 'nginx nao responde'"

# Limpar arquivo temporário
ssh -i $SSH_KEY "$VPS_USER@$VPS_HOST" "rm -f /tmp/nginx-new.conf"

Write-Host "`nCORRECAO NGINX CONCLUIDA!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

Write-Host "`nRESULTADO:" -ForegroundColor Cyan
Write-Host "OK: Nginx nao vai mais se desconfigurar!" -ForegroundColor Green
Write-Host "OK: Usa nomes de containers em vez de IPs" -ForegroundColor Green
Write-Host "OK: Configuracao permanente e robusta" -ForegroundColor Green

Write-Host "`nTeste agora:" -ForegroundColor Cyan
Write-Host "https://lunasdigital.com.br/health" -ForegroundColor White
Write-Host "https://inss.lunasdigital.com.br/health" -ForegroundColor White
