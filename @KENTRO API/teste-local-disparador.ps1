# Script de Teste Local - Disparador WhatsApp Kentro (Windows PowerShell)
# Testa o sistema antes do deploy na VPS

Write-Host "🚀 Teste Local - Disparador WhatsApp Kentro" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue

# Função para log colorido
function Log-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Log-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Log-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Verificar se Node.js está instalado
function Test-NodeJS {
    Log-Info "Verificando Node.js..."
    try {
        $nodeVersion = node --version
        Log-Success "Node.js encontrado: $nodeVersion"
        return $true
    }
    catch {
        Log-Error "Node.js não encontrado. Instale Node.js 18+ primeiro."
        return $false
    }
}

# Verificar se npm está instalado
function Test-NPM {
    Log-Info "Verificando npm..."
    try {
        $npmVersion = npm --version
        Log-Success "npm encontrado: $npmVersion"
        return $true
    }
    catch {
        Log-Error "npm não encontrado."
        return $false
    }
}

# Instalar dependências
function Install-Dependencies {
    Log-Info "Instalando dependências..."
    
    $packageJsonPath = "@KENTRO API\package.json"
    if (-not (Test-Path $packageJsonPath)) {
        Log-Error "package.json não encontrado em @KENTRO API/"
        return $false
    }
    
    Set-Location "@KENTRO API"
    
    # Instalar dependências se node_modules não existir
    if (-not (Test-Path "node_modules")) {
        Log-Info "Instalando dependências do npm..."
        try {
            npm install
            Log-Success "Dependências instaladas com sucesso"
        }
        catch {
            Log-Error "Falha ao instalar dependências"
            Set-Location ".."
            return $false
        }
    }
    else {
        Log-Success "Dependências já instaladas"
    }
    
    Set-Location ".."
    return $true
}

# Criar diretório de dados
function New-DataDirectory {
    Log-Info "Criando diretório de dados..."
    $dataDir = "@KENTRO API\data"
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    }
    Log-Success "Diretório de dados criado"
}

# Verificar arquivos necessários
function Test-RequiredFiles {
    Log-Info "Verificando arquivos necessários..."
    
    $files = @(
        "@KENTRO API\whatsapp-dispatcher-server.js",
        "@KENTRO API\whatsapp-dispatcher.html",
        "@KENTRO API\Dockerfile.whatsapp",
        "@KENTRO API\package.json"
    )
    
    foreach ($file in $files) {
        if (Test-Path $file) {
            Log-Success "✓ $file"
        }
        else {
            Log-Error "✗ $file não encontrado"
            return $false
        }
    }
    return $true
}

# Testar servidor local
function Start-TestServer {
    Log-Info "Iniciando servidor de teste..."
    
    Set-Location "@KENTRO API"
    
    # Definir variáveis de ambiente para teste
    $env:PORT = "3004"
    $env:NODE_ENV = "development"
    $env:KENTRO_API_KEY = "cd4d0509169d4e2ea9177ac66c1c9376"
    $env:KENTRO_QUEUE_ID = "25"
    $env:KENTRO_TEMPLATE_ID = "99"
    $env:DISPATCH_DELAY = "1000"
    $env:MAX_RETRIES = "2"
    $env:MAX_BATCH_SIZE = "10"
    $env:ALLOWED_ORIGINS = "http://localhost:3004"
    
    Log-Info "Variáveis de ambiente configuradas para teste"
    
    # Iniciar servidor em background
    Log-Info "Iniciando servidor na porta 3004..."
    $job = Start-Job -ScriptBlock {
        Set-Location "@KENTRO API"
        node whatsapp-dispatcher-server.js
    }
    
    # Aguardar servidor iniciar
    Start-Sleep -Seconds 3
    
    # Verificar se servidor está rodando
    if ($job.State -eq "Running") {
        Log-Success "Servidor iniciado com Job ID: $($job.Id)"
        return $job
    }
    else {
        Log-Error "Falha ao iniciar servidor"
        Set-Location ".."
        return $null
    }
}

# Testar endpoints da API
function Test-Endpoints {
    Log-Info "Testando endpoints da API..."
    
    $baseUrl = "http://localhost:3004"
    
    # Teste 1: Status
    Log-Info "Testando GET /api/status..."
    try {
        $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/status" -Method Get
        Log-Success "✓ Status endpoint funcionando"
        $statusResponse | ConvertTo-Json -Depth 3
    }
    catch {
        Log-Error "✗ Status endpoint falhou: $($_.Exception.Message)"
    }
    
    # Teste 2: Histórico
    Log-Info "Testando GET /api/historico..."
    try {
        $historyResponse = Invoke-RestMethod -Uri "$baseUrl/api/historico" -Method Get
        Log-Success "✓ Histórico endpoint funcionando"
    }
    catch {
        Log-Error "✗ Histórico endpoint falhou: $($_.Exception.Message)"
    }
    
    # Teste 3: Interface web
    Log-Info "Testando interface web..."
    try {
        $webResponse = Invoke-WebRequest -Uri "$baseUrl/" -Method Get
        if ($webResponse.StatusCode -eq 200) {
            Log-Success "✓ Interface web funcionando"
        }
        else {
            Log-Error "✗ Interface web falhou (HTTP $($webResponse.StatusCode))"
        }
    }
    catch {
        Log-Error "✗ Interface web falhou: $($_.Exception.Message)"
    }
}

# Teste de disparo (simulado)
function Test-Dispatch {
    Log-Info "Testando disparo simulado..."
    
    $baseUrl = "http://localhost:3004"
    $testNumbers = @("11959088554", "11987654321")
    
    $dispatchPayload = @{
        numbers = $testNumbers
        templateId = 99
        queueId = 25
        data = @("Teste")
    } | ConvertTo-Json -Depth 3
    
    Log-Info "Enviando disparo de teste..."
    try {
        $dispatchResponse = Invoke-RestMethod -Uri "$baseUrl/api/disparar" -Method Post -Body $dispatchPayload -ContentType "application/json"
        Log-Success "✓ Disparo de teste enviado com sucesso"
        $dispatchResponse | ConvertTo-Json -Depth 3
    }
    catch {
        Log-Error "✗ Disparo de teste falhou: $($_.Exception.Message)"
    }
}

# Limpeza
function Stop-TestServer {
    param($Job)
    
    Log-Info "Parando servidor de teste..."
    if ($Job) {
        Stop-Job -Job $Job
        Remove-Job -Job $Job
        Log-Success "Servidor parado"
    }
    
    Set-Location ".."
}

# Função principal
function Main {
    Write-Host ""
    Log-Info "Iniciando testes locais..."
    Write-Host ""
    
    # Verificações básicas
    if (-not (Test-NodeJS)) { return }
    if (-not (Test-NPM)) { return }
    if (-not (Test-RequiredFiles)) { return }
    if (-not (Install-Dependencies)) { return }
    New-DataDirectory
    
    Write-Host ""
    Log-Info "Iniciando testes do servidor..."
    Write-Host ""
    
    # Testes do servidor
    $serverJob = Start-TestServer
    if (-not $serverJob) { return }
    
    # Aguardar um pouco para o servidor estabilizar
    Start-Sleep -Seconds 2
    
    # Testes de API
    Test-Endpoints
    
    Write-Host ""
    Log-Info "Testando funcionalidades específicas..."
    Write-Host ""
    
    # Testes específicos
    Test-Dispatch
    
    Write-Host ""
    Log-Success "🎉 Todos os testes locais concluídos!"
    Write-Host ""
    Log-Info "Servidor rodando em: http://localhost:3004"
    Log-Info "Interface web: http://localhost:3004"
    Log-Info "API Status: http://localhost:3004/api/status"
    Write-Host ""
    Log-Warning "Pressione Ctrl+C para parar o servidor e finalizar os testes"
    
    # Manter servidor rodando até interrupção
    try {
        while ($true) {
            Start-Sleep -Seconds 1
        }
    }
    finally {
        Stop-TestServer -Job $serverJob
    }
}

# Executar função principal
Main
