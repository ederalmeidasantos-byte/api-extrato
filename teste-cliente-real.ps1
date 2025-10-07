# Teste com Cliente Real do CRM - Antonio Machado Diniz
# Execute: .\teste-cliente-real.ps1

Write-Host "🧪 TESTE COM CLIENTE REAL DO CRM" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Dados reais do cliente Antonio Machado Diniz
$clienteReal = @{
    cpf = "46104631649"
    message = "Olá, gostaria de saber sobre empréstimo consignado"
    clientNumber = "5534993393465"
    chatId = "kentro_antonio_123"
    messageType = "text"
    clientName = "ANTONIO MACHADO DINIZ"
} | ConvertTo-Json

Write-Host "👤 CLIENTE DE TESTE:" -ForegroundColor Yellow
Write-Host "• Nome: ANTONIO MACHADO DINIZ" -ForegroundColor White
Write-Host "• CPF: 46104631649" -ForegroundColor White
Write-Host "• Telefone: 5534993393465" -ForegroundColor White
Write-Host "• Email: adiniz10@hotmail.com" -ForegroundColor White
Write-Host "• Benefício: 5513909797 (Aposentadoria por Invalidez)" -ForegroundColor White
Write-Host "• Status: Ativo" -ForegroundColor Green
Write-Host "• Propostas: 4 propostas pendentes" -ForegroundColor White
Write-Host ""

# URL do webhook
$webhookUrl = "http://72.60.159.149:3004/webhook/kentro"

Write-Host "📤 Enviando dados do cliente real..." -ForegroundColor Yellow
Write-Host "URL: $webhookUrl" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $clienteReal -ContentType "application/json"
    
    Write-Host "✅ SUCESSO!" -ForegroundColor Green
    Write-Host "Resposta do ChatGPT Vendedor:" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    
    if ($response.resposta) {
        Write-Host "💬 Resposta: $($response.resposta)" -ForegroundColor White
    }
    
    if ($response.cliente) {
        Write-Host "👤 Cliente encontrado: $($response.cliente.success)" -ForegroundColor White
        if ($response.cliente.cliente) {
            Write-Host "   Nome: $($response.cliente.cliente.nome)" -ForegroundColor Gray
            Write-Host "   Status: $($response.cliente.cliente.status)" -ForegroundColor Gray
        }
    }
    
    if ($response.propostas) {
        Write-Host "📋 Propostas: $($response.propostas.propostas.Count) encontradas" -ForegroundColor White
    }
    
    if ($response.margem) {
        Write-Host "💰 Margem: $($response.margem.margem)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "📊 Resposta completa:" -ForegroundColor Cyan
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
Write-Host "📋 Dados do Cliente para Configuração na Kentro:" -ForegroundColor Cyan
Write-Host "• CPF: 46104631649" -ForegroundColor Gray
Write-Host "• Nome: ANTONIO MACHADO DINIZ" -ForegroundColor Gray
Write-Host "• Telefone: 5534993393465" -ForegroundColor Gray
Write-Host "• Email: adiniz10@hotmail.com" -ForegroundColor Gray
Write-Host "• Benefício: 5513909797" -ForegroundColor Gray
