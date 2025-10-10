Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SISTEMA FGTS - APLICATIVO FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Parar todos os processos Node.js
Write-Host "Parando processos Node.js existentes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Verificar se estamos na pasta correta
if (!(Test-Path "server.js")) {
    Write-Host "ERRO: Execute este script na pasta fgts!" -ForegroundColor Red
    pause
    exit
}

# Verificar dependências
if (!(Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Iniciando Sistema FGTS..." -ForegroundColor Green
Write-Host "Aguarde alguns segundos..." -ForegroundColor Yellow
Write-Host ""

# Executar npm start (que inicia o Electron com servidor integrado)
& npm start

Write-Host ""
Write-Host "Aplicativo finalizado." -ForegroundColor Gray
