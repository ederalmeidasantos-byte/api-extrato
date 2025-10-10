# Script PowerShell para configurar o arquivo .env para a arquitetura reestruturada

Write-Host "🚀 Configurando arquivo .env para arquitetura multi-container..." -ForegroundColor Green

# Verificar se o arquivo de configuração existe
if (-not (Test-Path "config-vps-restructured.env")) {
    Write-Host "❌ Arquivo config-vps-restructured.env não encontrado!" -ForegroundColor Red
    exit 1
}

# Fazer backup do .env atual se existir
if (Test-Path ".env") {
    Write-Host "📋 Fazendo backup do .env atual..." -ForegroundColor Yellow
    $backupName = ".env.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item ".env" $backupName
    Write-Host "✅ Backup salvo como $backupName" -ForegroundColor Green
}

# Copiar arquivo de configuração para .env
Write-Host "📝 Copiando configurações para .env..." -ForegroundColor Yellow
Copy-Item "config-vps-restructured.env" ".env"

Write-Host "✅ Arquivo .env configurado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Edite o arquivo .env com suas credenciais reais" -ForegroundColor White
Write-Host "2. Execute: docker-compose up -d" -ForegroundColor White
Write-Host "3. Verifique os logs: docker-compose logs -f" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Serviços disponíveis:" -ForegroundColor Cyan
Write-Host "  - Servidor Principal: http://localhost:3000" -ForegroundColor White
Write-Host "  - CRM: http://localhost:3001" -ForegroundColor White
Write-Host "  - API + Simulador: http://localhost:3002" -ForegroundColor White
Write-Host "  - Base de Dados: http://localhost:3003" -ForegroundColor White
Write-Host "  - Nginx (Load Balancer): http://localhost" -ForegroundColor White

