# Script para testar conexão SSH com o VPS
$VPS_HOST = "72.60.159.149"
$VPS_USER = "root"
$VPS_PASSWORD = "Lunas@202525"

Write-Host "🔧 TESTANDO CONEXÃO SSH COM VPS" -ForegroundColor Green
Write-Host "📡 Host: $VPS_HOST" -ForegroundColor Cyan
Write-Host "👤 Usuário: $VPS_USER" -ForegroundColor Cyan

# Teste 1: Verificar se o VPS está acessível
Write-Host "`n🔍 Teste 1: Ping para o VPS..." -ForegroundColor Yellow
try {
    $pingResult = Test-Connection -ComputerName $VPS_HOST -Count 1 -Quiet
    if ($pingResult) {
        Write-Host "✅ VPS acessível via ping" -ForegroundColor Green
    } else {
        Write-Host "❌ VPS não acessível via ping" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro no ping: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 2: Verificar porta SSH
Write-Host "`n🔍 Teste 2: Verificando porta SSH (22)..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($VPS_HOST, 22)
    $tcpClient.Close()
    Write-Host "✅ Porta SSH (22) acessível" -ForegroundColor Green
} catch {
    Write-Host "❌ Porta SSH (22) não acessível: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 3: Tentar conexão SSH
Write-Host "`n🔍 Teste 3: Tentando conexão SSH..." -ForegroundColor Yellow
try {
    $sshCommand = "echo 'Conexão SSH funcionando!'"
    $result = & ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST $sshCommand 2>&1
    Write-Host "📤 Resultado SSH:" -ForegroundColor Cyan
    Write-Host $result
} catch {
    Write-Host "❌ Erro na conexão SSH: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Teste de conexão concluído!" -ForegroundColor Green

