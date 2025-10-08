# Script para migrar IDs sequenciais no VPS
param(
    [switch]$DryRun = $false
)

$password = "Lunas@202525"
$username = "root"
$hostname = "72.60.159.149"

Write-Host "🔄 Iniciando migração de IDs sequenciais no VPS..." -ForegroundColor Yellow

# 1. Fazer backup dos clientes atuais
Write-Host "📦 Fazendo backup dos clientes atuais..." -ForegroundColor Cyan
$backupCommand = "mkdir -p /root/api-lunas/var/data/clientes/backup-$(date +%Y%m%d_%H%M%S) && cp /root/api-lunas/var/data/clientes/*.json /root/api-lunas/var/data/clientes/backup-$(date +%Y%m%d_%H%M%S)/"

$result = & ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o PasswordAuthentication=yes $username@$hostname $backupCommand 2>&1
Write-Host "Backup: $result" -ForegroundColor Green

# 2. Enviar script de migração
Write-Host "📤 Enviando script de migração..." -ForegroundColor Cyan
$uploadCommand = "scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no migrar-ids-sequenciais.js $username@$hostname:/root/api-lunas/"
& $uploadCommand

# 3. Executar migração
if (-not $DryRun) {
    Write-Host "🚀 Executando migração..." -ForegroundColor Cyan
    $migrateCommand = "cd /root/api-lunas && node migrar-ids-sequenciais.js"
    $result = & ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o PasswordAuthentication=yes $username@$hostname $migrateCommand 2>&1
    Write-Host "Migração: $result" -ForegroundColor Green
} else {
    Write-Host "🔍 Modo DryRun - apenas verificando estrutura..." -ForegroundColor Yellow
    $checkCommand = "ls -la /root/api-lunas/var/data/clientes/"
    $result = & ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o PasswordAuthentication=yes $username@$hostname $checkCommand 2>&1
    Write-Host "Estrutura atual: $result" -ForegroundColor Green
}

# 4. Verificar resultado
Write-Host "✅ Verificando resultado..." -ForegroundColor Cyan
$verifyCommand = "ls -la /root/api-lunas/var/data/clientes/ | grep -E '\.json$'"
$result = & ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o PasswordAuthentication=yes $username@$hostname $verifyCommand 2>&1
Write-Host "Clientes após migração: $result" -ForegroundColor Green

Write-Host "🎉 Processo concluído!" -ForegroundColor Green
