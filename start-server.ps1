# 🚀 Script de Inicialização do Servidor API Lunas
# Versão: 1.0.0
# Data: 02/01/2025

Write-Host "🚀 Iniciando servidor API Lunas..." -ForegroundColor Green
Write-Host ""

# Configurações
$serverPath = "C:\Users\srcor\API Lunas"
$serverFile = "server.js"
$envFile = ".env"
$packageFile = "package.json"
$nodeModules = "node_modules"
$port = 3000

# Função para verificar arquivo
function Test-FileExists {
    param($filePath, $fileName)
    
    if (Test-Path $filePath) {
        Write-Host "✅ $fileName encontrado" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $fileName não encontrado" -ForegroundColor Red
        return $false
    }
}

# Função para verificar diretório
function Test-DirectoryExists {
    param($dirPath, $dirName)
    
    if (Test-Path $dirPath) {
        Write-Host "✅ $dirName encontrado" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $dirName não encontrado" -ForegroundColor Red
        return $false
    }
}

# Navegar para o diretório do servidor
Write-Host "📁 Navegando para: $serverPath" -ForegroundColor Yellow
Set-Location $serverPath

# Verificar se está no diretório correto
if (!(Test-Path $serverFile)) {
    Write-Host "❌ ERRO: Arquivo $serverFile não encontrado!" -ForegroundColor Red
    Write-Host "📁 Diretório atual: $(Get-Location)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 SOLUÇÃO: Execute este script no diretório correto" -ForegroundColor Cyan
    Write-Host "   $serverPath" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "✅ Diretório correto encontrado" -ForegroundColor Green
Write-Host ""

# Verificar arquivos essenciais
Write-Host "📋 Verificando arquivos essenciais..." -ForegroundColor Yellow

$filesOK = $true

if (!(Test-FileExists $serverFile "server.js")) {
    $filesOK = $false
}

if (!(Test-FileExists $envFile ".env")) {
    Write-Host "⚠️ AVISO: Arquivo .env não encontrado!" -ForegroundColor Yellow
    Write-Host "💡 SOLUÇÃO: Crie o arquivo .env com as variáveis necessárias" -ForegroundColor Cyan
}

if (!(Test-FileExists $packageFile "package.json")) {
    Write-Host "⚠️ AVISO: Arquivo package.json não encontrado!" -ForegroundColor Yellow
    Write-Host "💡 SOLUÇÃO: Execute 'npm init' para criar o package.json" -ForegroundColor Cyan
}

if (!(Test-DirectoryExists $nodeModules "node_modules")) {
    Write-Host "⚠️ AVISO: Diretório node_modules não encontrado!" -ForegroundColor Yellow
    Write-Host "💡 SOLUÇÃO: Execute 'npm install' para instalar dependências" -ForegroundColor Cyan
}

# Verificar diretórios específicos
Write-Host ""
Write-Host "📁 Verificando diretórios específicos..." -ForegroundColor Yellow

$directories = @("operacional", "INSS", "fgts", "uploads")
foreach ($dir in $directories) {
    Test-DirectoryExists $dir $dir
}

# Verificar processos Node.js existentes
Write-Host ""
Write-Host "🔄 Verificando processos Node.js existentes..." -ForegroundColor Yellow

$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "⚠️ Encontrados $($nodeProcesses.Count) processos Node.js:" -ForegroundColor Yellow
    foreach ($process in $nodeProcesses) {
        Write-Host "   - PID: $($process.Id) | Nome: $($process.ProcessName)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🔄 Finalizando processos Node.js..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Write-Host "✅ Processos finalizados" -ForegroundColor Green
} else {
    Write-Host "✅ Nenhum processo Node.js encontrado" -ForegroundColor Green
}

# Aguardar
Write-Host ""
Write-Host "⏳ Aguardando 3 segundos..." -ForegroundColor Yellow
Start-Sleep 3

# Verificar porta
Write-Host ""
Write-Host "🔍 Verificando porta $port..." -ForegroundColor Yellow

$portCheck = netstat -an | findstr ":$port"
if ($portCheck) {
    Write-Host "⚠️ AVISO: Porta $port ainda está em uso!" -ForegroundColor Yellow
    Write-Host "Detalhes:" -ForegroundColor Yellow
    Write-Host $portCheck -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 SOLUÇÃO: Aguarde mais alguns segundos ou reinicie o computador" -ForegroundColor Cyan
} else {
    Write-Host "✅ Porta $port está disponível" -ForegroundColor Green
}

# Verificar encoding do arquivo .env
if (Test-Path $envFile) {
    Write-Host ""
    Write-Host "🔍 Verificando encoding do arquivo .env..." -ForegroundColor Yellow
    
    try {
        $content = Get-Content $envFile -Encoding UTF8 -ErrorAction Stop
        Write-Host "✅ Arquivo .env está em UTF-8" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ AVISO: Arquivo .env pode estar em encoding incorreto!" -ForegroundColor Yellow
        Write-Host "💡 SOLUÇÃO: Converta para UTF-8 usando:" -ForegroundColor Cyan
        Write-Host "   Get-Content .env -Encoding Unicode | Out-File .env.new -Encoding UTF8" -ForegroundColor Cyan
    }
}

# Executar servidor
Write-Host ""
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
Write-Host "📁 Diretório: $(Get-Location)" -ForegroundColor Yellow
Write-Host "🌐 URL: http://localhost:$port" -ForegroundColor Yellow
Write-Host "📊 Ambiente: $($env:NODE_ENV ?? 'development')" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Para parar o servidor, pressione Ctrl+C" -ForegroundColor Cyan
Write-Host ""

# Executar o servidor
try {
    node $serverFile
} catch {
    Write-Host ""
    Write-Host "❌ ERRO ao executar o servidor:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 SOLUÇÕES POSSÍVEIS:" -ForegroundColor Cyan
    Write-Host "   1. Verifique se todas as dependências estão instaladas" -ForegroundColor Cyan
    Write-Host "   2. Execute 'npm install' para instalar dependências" -ForegroundColor Cyan
    Write-Host "   3. Verifique se o arquivo .env está correto" -ForegroundColor Cyan
    Write-Host "   4. Verifique se a porta $port está disponível" -ForegroundColor Cyan
}

# Se chegou aqui, o servidor foi finalizado
Write-Host ""
Write-Host "👋 Servidor finalizado!" -ForegroundColor Green
Write-Host ""

# Mostrar estatísticas
Write-Host "📊 Estatísticas da sessão:" -ForegroundColor Yellow
Write-Host "   - Tempo de execução: $($(Get-Date) - $startTime)" -ForegroundColor Yellow
Write-Host "   - Diretório: $(Get-Location)" -ForegroundColor Yellow
Write-Host "   - Porta: $port" -ForegroundColor Yellow

Read-Host "Pressione Enter para sair"
