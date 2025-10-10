Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SISTEMA FGTS - INICIO SIMPLES" -ForegroundColor Cyan  
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
Write-Host "Iniciando servidor..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Normal

Write-Host "Aguardando servidor inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Iniciando aplicacao Electron..." -ForegroundColor Green
Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   APLICACAO INICIADA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Duas janelas foram abertas:" -ForegroundColor White
Write-Host "1. Servidor FGTS (terminal)" -ForegroundColor White
Write-Host "2. Sistema FGTS (aplicacao)" -ForegroundColor White
Write-Host ""
Write-Host "Se a aplicacao nao abrir, aguarde alguns segundos" -ForegroundColor Yellow
Write-Host "ou verifique se o servidor esta rodando na porta 3004" -ForegroundColor Yellow
Write-Host ""

Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
