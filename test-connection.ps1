# Teste simples de conexão SSH
$VPS_HOST = "72.60.159.149"
$VPS_USER = "root"

Write-Host "🔧 TESTANDO CONEXÃO SSH" -ForegroundColor Green

# Teste de ping
Write-Host "`n🔍 Testando ping..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $VPS_HOST -Count 1 -Quiet
if ($ping) {
    Write-Host "✅ VPS acessível" -ForegroundColor Green
} else {
    Write-Host "❌ VPS não acessível" -ForegroundColor Red
}

# Teste de porta
Write-Host "`n🔍 Testando porta SSH..." -ForegroundColor Yellow
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect($VPS_HOST, 22)
    $tcp.Close()
    Write-Host "✅ Porta SSH aberta" -ForegroundColor Green
} catch {
    Write-Host "❌ Porta SSH fechada" -ForegroundColor Red
}

Write-Host "`n✅ Teste concluído!" -ForegroundColor Green

