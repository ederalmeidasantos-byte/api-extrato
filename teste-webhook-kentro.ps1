# Teste do Webhook Kentro - ChatGPT Vendedor
# Execute: .\teste-webhook-kentro.ps1

Write-Host "🧪 TESTE WEBHOOK KENTRO - CHATGPT VENDEDOR" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# URL do webhook
$webhookUrl = "http://72.60.159.149:3004/webhook/kentro"

# Dados de teste
$testData = @{
    cpf = "12345678901"
    message = "Olá, gostaria de saber sobre empréstimo consignado"
    clientNumber = "5511999999999"
    chatId = "kentro_test_123"
    messageType = "text"
} | ConvertTo-Json

Write-Host "📤 Enviando dados de teste..." -ForegroundColor Yellow
Write-Host "URL: $webhookUrl" -ForegroundColor Gray
Write-Host "Dados: $testData" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $testData -ContentType "application/json"
    
    Write-Host "✅ SUCESSO!" -ForegroundColor Green
    Write-Host "Resposta recebida:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor White
    
} catch {
    Write-Host "❌ ERRO!" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔗 URLs de Teste:" -ForegroundColor Cyan
Write-Host "• Webhook: http://72.60.159.149:3004/webhook/kentro" -ForegroundColor Gray
Write-Host "• Teste CPF: http://72.60.159.149:3004/teste-cpf" -ForegroundColor Gray
Write-Host "• Status: http://72.60.159.149:3004/status" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Configuração na Kentro:" -ForegroundColor Cyan
Write-Host "• URL: http://72.60.159.149:3004/webhook/kentro" -ForegroundColor Gray
Write-Host "• Método: POST" -ForegroundColor Gray
Write-Host "• Content-Type: application/json" -ForegroundColor Gray
Write-Host "• Eventos: Mensagens recebidas, Conversas iniciadas" -ForegroundColor Gray
