Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SISTEMA FGTS - APLICATIVO UNICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Parando processos Node.js existentes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Verificando porta 3004..." -ForegroundColor Yellow
$portCheck = Get-NetTCPConnection -LocalPort 3004 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "Porta 3004 em uso, aguardando liberacao..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "Iniciando Sistema FGTS como aplicativo..." -ForegroundColor Green
Write-Host "Aguarde alguns segundos..." -ForegroundColor Yellow
Write-Host ""

# Executar npm start
& npm start

Write-Host ""
Write-Host "Aplicativo finalizado." -ForegroundColor Gray
