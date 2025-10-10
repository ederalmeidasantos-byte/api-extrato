# 🚨 CORREÇÃO EMERGENCIAL - ERRO 502 INSS
# Script para diagnosticar e corrigir erro 502 no subdomínio inss.lunasdigital.com.br

Write-Host "🚨 CORREÇÃO EMERGENCIAL - ERRO 502 INSS" -ForegroundColor Red
Write-Host "===============================================" -ForegroundColor Yellow

# 1. Verificar se está conectado no VPS
Write-Host "`n1. Verificando conexão VPS..." -ForegroundColor Cyan
$vpsIP = "72.60.159.149"
$testConnection = Test-NetConnection -ComputerName $vpsIP -Port 22 -InformationLevel Quiet

if (-not $testConnection) {
    Write-Host "❌ Não foi possível conectar ao VPS $vpsIP" -ForegroundColor Red
    Write-Host "Verifique sua conexão SSH e tente novamente." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Conexão VPS OK" -ForegroundColor Green

# 2. Conectar via SSH e executar comandos de diagnóstico
Write-Host "`n2. Conectando ao VPS para diagnóstico..." -ForegroundColor Cyan

$sshCommands = @"
echo "🔍 DIAGNÓSTICO COMPLETO - ERRO 502 INSS"
echo "========================================"

# Verificar containers Docker
echo "`n📦 Status dos Containers Docker:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar se o container INSS está rodando
echo "`n🔍 Verificando container INSS (porta 3002):"
docker ps | grep -E "(3002|inss|api-simulador)"

# Verificar processos Node.js
echo "`n🔍 Processos Node.js ativos:"
ps aux | grep node | grep -v grep

# Verificar porta 3002
echo "`n🔍 Porta 3002 em uso:"
netstat -tlnp | grep :3002

# Verificar logs do container INSS
echo "`n📋 Logs do Container INSS (últimas 20 linhas):"
docker logs --tail 20 api-simulador-lunasdigital 2>/dev/null || echo "Container não encontrado"

# Verificar logs do Nginx
echo "`n📋 Logs do Nginx (últimas 20 linhas):"
tail -20 /var/log/nginx/inss.error.log 2>/dev/null || echo "Log não encontrado"

# Testar conectividade local
echo "`n🔍 Testando conectividade local porta 3002:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health || echo "Falha na conexão"

# Verificar configuração Nginx
echo "`n🔍 Testando configuração Nginx:"
nginx -t

# Verificar se o serviço está rodando
echo "`n🔍 Status do serviço Nginx:"
systemctl status nginx --no-pager -l

echo "`n✅ Diagnóstico concluído!"
"@

# Executar comandos via SSH
Write-Host "Executando diagnóstico no VPS..." -ForegroundColor Yellow
ssh root@$vpsIP $sshCommands

# 3. Opções de correção
Write-Host "`n3. OPÇÕES DE CORREÇÃO:" -ForegroundColor Cyan
Write-Host "Escolha uma opção:" -ForegroundColor Yellow
Write-Host "1. Reiniciar container INSS" -ForegroundColor White
Write-Host "2. Reiniciar todos os containers" -ForegroundColor White
Write-Host "3. Reiniciar Nginx" -ForegroundColor White
Write-Host "4. Reconstruir container INSS" -ForegroundColor White
Write-Host "5. Verificar logs detalhados" -ForegroundColor White
Write-Host "6. Sair" -ForegroundColor White

$opcao = Read-Host "Digite sua opção (1-6)"

switch ($opcao) {
    "1" {
        Write-Host "`n🔄 Reiniciando container INSS..." -ForegroundColor Cyan
        ssh root@$vpsIP "docker restart api-simulador-lunasdigital"
        Write-Host "✅ Container INSS reiniciado!" -ForegroundColor Green
    }
    "2" {
        Write-Host "`n🔄 Reiniciando todos os containers..." -ForegroundColor Cyan
        ssh root@$vpsIP "docker-compose restart"
        Write-Host "✅ Todos os containers reiniciados!" -ForegroundColor Green
    }
    "3" {
        Write-Host "`n🔄 Reiniciando Nginx..." -ForegroundColor Cyan
        ssh root@$vpsIP "systemctl restart nginx"
        Write-Host "✅ Nginx reiniciado!" -ForegroundColor Green
    }
    "4" {
        Write-Host "`n🔄 Reconstruindo container INSS..." -ForegroundColor Cyan
        ssh root@$vpsIP "cd '/root/API Lunas' && docker-compose up --build -d api-simulador"
        Write-Host "✅ Container INSS reconstruído!" -ForegroundColor Green
    }
    "5" {
        Write-Host "`n📋 Verificando logs detalhados..." -ForegroundColor Cyan
        ssh root@$vpsIP @"
echo "📋 LOGS DETALHADOS:"
echo "=================="
echo "`n🔍 Logs do Container INSS (últimas 50 linhas):"
docker logs --tail 50 api-simulador-lunasdigital
echo "`n🔍 Logs do Nginx INSS (últimas 50 linhas):"
tail -50 /var/log/nginx/inss.error.log
echo "`n🔍 Logs do Nginx Access INSS (últimas 20 linhas):"
tail -20 /var/log/nginx/inss.access.log
"@
    }
    "6" {
        Write-Host "`n👋 Saindo..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "`n❌ Opção inválida!" -ForegroundColor Red
    }
}

# 4. Testar correção
Write-Host "`n4. Testando correção..." -ForegroundColor Cyan
Write-Host "Aguardando 10 segundos para estabilização..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Testar URL
$testUrl = "https://inss.lunasdigital.com.br/detalhesdaproposta/22"
Write-Host "Testando URL: $testUrl" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $testUrl -TimeoutSec 30 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ SUCESSO! URL funcionando corretamente!" -ForegroundColor Green
        Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ URL respondeu com status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Ainda há problemas com a URL" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n🔧 Tente as seguintes ações:" -ForegroundColor Yellow
    Write-Host "1. Aguarde mais alguns minutos" -ForegroundColor White
    Write-Host "2. Execute novamente este script" -ForegroundColor White
    Write-Host "3. Verifique os logs detalhados" -ForegroundColor White
}

Write-Host "`n🎯 DIAGNÓSTICO CONCLUÍDO!" -ForegroundColor Green
Write-Host "Se o problema persistir, verifique:" -ForegroundColor Yellow
Write-Host "- Logs do container: docker logs api-simulador-lunasdigital" -ForegroundColor White
Write-Host "- Logs do Nginx: tail -f /var/log/nginx/inss.error.log" -ForegroundColor White
Write-Host "- Status dos containers: docker ps" -ForegroundColor White
