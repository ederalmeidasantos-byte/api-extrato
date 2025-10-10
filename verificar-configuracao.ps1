# Script PowerShell para verificar configuração do Simulador INSS

$ErrorActionPreference = "Stop"

Write-Host "Verificando Configuracao do Simulador INSS" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# 1. Verificar arquivos essenciais
Write-Host "Verificando arquivos essenciais..." -ForegroundColor Yellow

$requiredFiles = @(
    "INSS/simulador.html",
    "INSS/simulador-logic.js", 
    "INSS/server-inss.js",
    "Dockerfile.inss",
    "docker-compose.yml",
    "nginx/nginx.conf"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  OK: $file" -ForegroundColor Green
    } else {
        Write-Host "  ERRO: $file - ARQUIVO FALTANDO!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "ERRO: Alguns arquivos essenciais estao faltando!" -ForegroundColor Red
    exit 1
}

# 2. Verificar nginx
Write-Host "Verificando configuracao do Nginx..." -ForegroundColor Yellow

$nginxContent = Get-Content "nginx/nginx.conf" -Raw

if ($nginxContent -match "location /inss/") {
    Write-Host "  OK: Rota /inss/ configurada" -ForegroundColor Green
} else {
    Write-Host "  ERRO: Rota /inss/ nao encontrada" -ForegroundColor Red
    exit 1
}

if ($nginxContent -match "location /api/kentro/") {
    Write-Host "  OK: Rota /api/kentro/ configurada" -ForegroundColor Green
} else {
    Write-Host "  ERRO: Rota /api/kentro/ nao encontrada" -ForegroundColor Red
    exit 1
}

# 3. Verificar docker-compose
Write-Host "Verificando configuracao do Docker..." -ForegroundColor Yellow

$dockerContent = Get-Content "docker-compose.yml" -Raw

if ($dockerContent -match "api-simulador:") {
    Write-Host "  OK: Servico api-simulador configurado" -ForegroundColor Green
} else {
    Write-Host "  ERRO: Servico api-simulador nao encontrado" -ForegroundColor Red
    exit 1
}

# 4. Verificar simulador
Write-Host "Verificando configuracao do simulador..." -ForegroundColor Yellow

$simuladorContent = Get-Content "INSS/simulador-logic.js" -Raw

if ($simuladorContent -match "lunasdigital.com.br") {
    Write-Host "  OK: Dominio lunasdigital.com.br configurado" -ForegroundColor Green
} else {
    Write-Host "  ERRO: Dominio lunasdigital.com.br nao encontrado" -ForegroundColor Red
    exit 1
}

# 5. Criar diretorios
Write-Host "Criando diretorios necessarios..." -ForegroundColor Yellow

$directories = @(
    "var/data/clientes",
    "var/data/propostas", 
    "var/data/extratos",
    "var/log/nginx"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Host "  OK: $dir criado" -ForegroundColor Green
}

# 6. Resumo final
Write-Host ""
Write-Host "CONFIGURACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "Todos os arquivos essenciais estao presentes" -ForegroundColor Green
Write-Host "Nginx configurado para roteamento correto" -ForegroundColor Green
Write-Host "Docker Compose configurado para multi-container" -ForegroundColor Green
Write-Host "Simulador configurado para dominio lunasdigital.com.br" -ForegroundColor Green
Write-Host "Diretorios de dados criados" -ForegroundColor Green
Write-Host ""
Write-Host "PRONTO PARA DEPLOY!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para fazer deploy:" -ForegroundColor White
Write-Host "  Windows: .\deploy-vps-dominio.ps1" -ForegroundColor White
Write-Host ""
Write-Host "URLs apos deploy:" -ForegroundColor White
Write-Host "  - Simulador: https://lunasdigital.com.br/inss/simulador.html" -ForegroundColor White
Write-Host "  - CRM: https://lunasdigital.com.br/operacional/" -ForegroundColor White

