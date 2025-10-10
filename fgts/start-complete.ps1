Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SISTEMA FGTS - INICIO COMPLETO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Parar processos existentes
Write-Host "Parando processos Node.js existentes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Verificar se estamos na pasta correta
if (!(Test-Path "server.js")) {
    Write-Host "ERRO: Arquivo server.js nao encontrado!" -ForegroundColor Red
    Write-Host "Certifique-se de estar na pasta fgts" -ForegroundColor Red
    pause
    exit
}

# Verificar dependências
if (!(Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Normal -PassThru

Write-Host "Aguardando servidor inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar se servidor está rodando
$portCheck = Get-NetTCPConnection -LocalPort 3004 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "✅ Servidor rodando na porta 3004!" -ForegroundColor Green
} else {
    Write-Host "❌ Servidor não está rodando na porta 3004" -ForegroundColor Red
    Write-Host "Verifique os logs do servidor" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Iniciando aplicativo Electron..." -ForegroundColor Green
Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SISTEMA INICIADO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Duas janelas foram abertas:" -ForegroundColor White
Write-Host "1. Servidor FGTS (terminal)" -ForegroundColor White
Write-Host "2. Sistema FGTS (aplicativo)" -ForegroundColor White
Write-Host ""
Write-Host "Se o aplicativo mostrar erro de conexão," -ForegroundColor Yellow
Write-Host "aguarde alguns segundos para o servidor inicializar" -ForegroundColor Yellow
Write-Host ""

Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
