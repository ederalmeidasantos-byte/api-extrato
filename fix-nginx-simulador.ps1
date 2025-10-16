# Script para corrigir configuracao do nginx para o simulador INSS

Write-Host "Corrigindo configuracao do nginx para o simulador INSS..." -ForegroundColor Green

# Parar containers
Write-Host "Parando containers..." -ForegroundColor Yellow
docker-compose down

# Reconstruir containers se necessario
Write-Host "Reconstruindo containers..." -ForegroundColor Yellow
docker-compose build --no-cache nginx

# Iniciar containers
Write-Host "Iniciando containers..." -ForegroundColor Yellow
docker-compose up -d

# Aguardar containers iniciarem
Write-Host "Aguardando containers iniciarem..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verificar status dos containers
Write-Host "Status dos containers:" -ForegroundColor Cyan
docker-compose ps

# Verificar logs do nginx
Write-Host "Logs do nginx:" -ForegroundColor Cyan
docker-compose logs nginx --tail=20

# Verificar logs do api-simulador
Write-Host "Logs do api-simulador:" -ForegroundColor Cyan
docker-compose logs api-simulador --tail=20

# Testar conectividade
Write-Host "Testando conectividade..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost/inss/simulador.html" -Method Head -TimeoutSec 10
    Write-Host "Simulador acessivel via localhost" -ForegroundColor Green
} catch {
    Write-Host "Erro ao acessar simulador via localhost: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Correcao concluida!" -ForegroundColor Green
Write-Host "Acesse: https://inss.lunasdigital.com.br/inss/simulador.html?extrato=7539" -ForegroundColor Blue