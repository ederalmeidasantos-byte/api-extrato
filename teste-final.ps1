# Teste final WhatsApp
Write-Host "🧪 TESTE FINAL - WHATSAPP COM BOTÕES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Teste 1: Endpoint simples
Write-Host "`n1️⃣ Testando endpoint simples..." -ForegroundColor Yellow
try {
    $response1 = Invoke-RestMethod -Uri "http://localhost:3003/teste-simples" -Method GET
    Write-Host "✅ Endpoint simples OK:" -ForegroundColor Green
    $response1 | ConvertTo-Json
} catch {
    Write-Host "❌ Erro no endpoint simples:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Teste 2: Endpoint WhatsApp
Write-Host "`n2️⃣ Testando endpoint WhatsApp..." -ForegroundColor Yellow
$body = @{
    numero = "5511959088554"
    tipo = "proposta"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:3003/teste-whatsapp-botoes" -Method POST -ContentType "application/json" -Body $body
    Write-Host "✅ Endpoint WhatsApp OK:" -ForegroundColor Green
    $response2 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erro no endpoint WhatsApp:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta do servidor:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Yellow
    }
}

Write-Host "`n🏁 Teste finalizado!" -ForegroundColor Cyan

