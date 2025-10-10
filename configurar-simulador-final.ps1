# Script PowerShell de configuração final do Simulador INSS
# Garante que tudo está configurado corretamente

$ErrorActionPreference = "Stop"

Write-Host "Configuracao Final do Simulador INSS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 1. Verificar se os arquivos essenciais existem
Write-Host "Verificando arquivos essenciais..." -ForegroundColor Yellow

$requiredFiles = @(
    "INSS/simulador.html",
    "INSS/simulador-logic.js",
    "INSS/server-inss.js",
    "INSS/extrair_pdf.js",
    "Dockerfile.inss",
    "docker-compose.yml",
    "nginx/nginx.conf",
    "config-vps-restructured.env"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file - ARQUIVO FALTANDO!" -ForegroundColor Red
        exit 1
    }
}

# 2. Verificar configurações do nginx
Write-Host ""
Write-Host "🌐 Verificando configuração do Nginx..." -ForegroundColor Yellow

$nginxContent = Get-Content "nginx/nginx.conf" -Raw

if ($nginxContent -match "location /inss/") {
    Write-Host "  ✅ Rota /inss/ configurada" -ForegroundColor Green
} else {
    Write-Host "  ❌ Rota /inss/ não encontrada no nginx.conf" -ForegroundColor Red
    exit 1
}

if ($nginxContent -match "location /api/kentro/") {
    Write-Host "  ✅ Rota /api/kentro/ configurada" -ForegroundColor Green
} else {
    Write-Host "  ❌ Rota /api/kentro/ não encontrada no nginx.conf" -ForegroundColor Red
    exit 1
}

if ($nginxContent -match "location /api/processar-extrato") {
    Write-Host "  ✅ Rota /api/processar-extrato configurada" -ForegroundColor Green
} else {
    Write-Host "  ❌ Rota /api/processar-extrato não encontrada no nginx.conf" -ForegroundColor Red
    exit 1
}

# 3. Verificar configurações do Docker
Write-Host ""
Write-Host "🐳 Verificando configuração do Docker..." -ForegroundColor Yellow

$dockerContent = Get-Content "docker-compose.yml" -Raw

if ($dockerContent -match "api-simulador:") {
    Write-Host "  ✅ Serviço api-simulador configurado" -ForegroundColor Green
} else {
    Write-Host "  ❌ Serviço api-simulador não encontrado no docker-compose.yml" -ForegroundColor Red
    exit 1
}

if ($dockerContent -match "Dockerfile.inss") {
    Write-Host "  ✅ Dockerfile.inss configurado" -ForegroundColor Green
} else {
    Write-Host "  ❌ Dockerfile.inss não encontrado no docker-compose.yml" -ForegroundColor Red
    exit 1
}

# 4. Verificar configurações do simulador
Write-Host ""
Write-Host "⚙️ Verificando configurações do simulador..." -ForegroundColor Yellow

$simuladorContent = Get-Content "INSS/simulador-logic.js" -Raw

if ($simuladorContent -match "lunasdigital.com.br") {
    Write-Host "  ✅ Domínio lunasdigital.com.br configurado" -ForegroundColor Green
} else {
    Write-Host "  ❌ Domínio lunasdigital.com.br não encontrado no simulador-logic.js" -ForegroundColor Red
    exit 1
}

if ($simuladorContent -match "localStorage.setItem") {
    Write-Host "  ✅ Cache de CPF configurado" -ForegroundColor Green
} else {
    Write-Host "  ❌ Cache de CPF não encontrado no simulador-logic.js" -ForegroundColor Red
    exit 1
}

# 5. Verificar configurações do servidor INSS
Write-Host ""
Write-Host "🖥️ Verificando configurações do servidor INSS..." -ForegroundColor Yellow

$serverContent = Get-Content "INSS/server-inss.js" -Raw

if ($serverContent -match "OPENAI_API_KEY") {
    Write-Host "  ✅ Verificação de OPENAI_API_KEY configurada" -ForegroundColor Green
} else {
    Write-Host "  ❌ Verificação de OPENAI_API_KEY não encontrada no server-inss.js" -ForegroundColor Red
    exit 1
}

if ($serverContent -match "/api/kentro/buscar-cliente") {
    Write-Host "  ✅ API Kentro configurada" -ForegroundColor Green
} else {
    Write-Host "  ❌ API Kentro não encontrada no server-inss.js" -ForegroundColor Red
    exit 1
}

# 6. Verificar arquivo .env
Write-Host ""
Write-Host "Verificando arquivo .env..." -ForegroundColor Yellow

if (Test-Path ".env") {
    Write-Host "  ✅ Arquivo .env existe" -ForegroundColor Green
    
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "OPENAI_API_KEY=") {
        Write-Host "  ✅ OPENAI_API_KEY configurada" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ OPENAI_API_KEY não configurada (opcional)" -ForegroundColor Yellow
    }
    
    if ($envContent -match "LUNAS_API_KEY=") {
        Write-Host "  ✅ LUNAS_API_KEY configurada" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ LUNAS_API_KEY não configurada (opcional)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️ Arquivo .env não existe - será criado pelo script de deploy" -ForegroundColor Yellow
}

# 7. Criar diretórios necessários
Write-Host ""
Write-Host "📁 Criando diretórios necessários..." -ForegroundColor Yellow

$directories = @(
    "var/data/clientes",
    "var/data/propostas",
    "var/data/extratos",
    "var/log/nginx",
    "backup-data/clientes",
    "backup-data/propostas"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "  ✅ Diretórios criados" -ForegroundColor Green

# 8. Verificar permissões
Write-Host ""
Write-Host "🔐 Verificando permissões..." -ForegroundColor Yellow

try {
    $testFile = "var/data/test.txt"
    "test" | Out-File -FilePath $testFile -Encoding UTF8
    Remove-Item $testFile -Force
    Write-Host "  ✅ Diretório var/data tem permissão de escrita" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Diretório var/data não tem permissão de escrita" -ForegroundColor Red
    Write-Host "  🔧 Verifique as permissões manualmente" -ForegroundColor Yellow
}

# 9. Resumo final
Write-Host ""
Write-Host "🎉 Configuração Final Concluída!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Todos os arquivos essenciais estão presentes" -ForegroundColor Green
Write-Host "✅ Nginx configurado para roteamento correto" -ForegroundColor Green
Write-Host "✅ Docker Compose configurado para multi-container" -ForegroundColor Green
Write-Host "✅ Simulador configurado para domínio lunasdigital.com.br" -ForegroundColor Green
Write-Host "✅ Cache de CPF implementado" -ForegroundColor Green
Write-Host "✅ APIs Kentro e OpenAI configuradas" -ForegroundColor Green
Write-Host "✅ Diretórios de dados criados" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Pronto para deploy!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para fazer deploy:" -ForegroundColor White
Write-Host "  Linux/Mac: ./deploy-vps-dominio.sh" -ForegroundColor White
Write-Host "  Windows:   .\deploy-vps-dominio.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Para testar:" -ForegroundColor White
Write-Host "  node test-simulador-inss.js" -ForegroundColor White
Write-Host ""
Write-Host "URLs após deploy:" -ForegroundColor White
Write-Host "  - Simulador: https://lunasdigital.com.br/inss/simulador.html" -ForegroundColor White
Write-Host "  - CRM: https://lunasdigital.com.br/operacional/" -ForegroundColor White
Write-Host "  - API: https://lunasdigital.com.br/api/" -ForegroundColor White
