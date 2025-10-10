# 🔍 ANÁLISE COMPLETA DO ERRO 502 - INSS
# Script para analisar onde está o erro antes de aplicar correções

Write-Host "🔍 ANÁLISE COMPLETA DO ERRO 502 - INSS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Yellow

# 1. Verificar conexão VPS
Write-Host "`n1. Verificando conexão VPS..." -ForegroundColor Cyan
$vpsIP = "72.60.159.149"
$testConnection = Test-NetConnection -ComputerName $vpsIP -Port 22 -InformationLevel Quiet

if (-not $testConnection) {
    Write-Host "❌ Não foi possível conectar ao VPS $vpsIP" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Conexão VPS OK" -ForegroundColor Green

# 2. Análise completa via SSH
Write-Host "`n2. Executando análise completa no VPS..." -ForegroundColor Cyan

$analysisCommands = @"
echo "🔍 ANÁLISE COMPLETA DO ERRO 502 - INSS"
echo "======================================"
echo "Data/Hora: \$(date)"
echo ""

# 1. STATUS DOS CONTAINERS DOCKER
echo "📦 1. STATUS DOS CONTAINERS DOCKER:"
echo "=================================="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
echo ""

# Verificar especificamente o container INSS
echo "🔍 Container INSS específico:"
docker ps | grep -E "(3002|inss|api-simulador)" || echo "❌ Container INSS não encontrado!"
echo ""

# 2. PROCESSOS NODE.JS
echo "📦 2. PROCESSOS NODE.JS ATIVOS:"
echo "==============================="
ps aux | grep node | grep -v grep || echo "❌ Nenhum processo Node.js encontrado!"
echo ""

# 3. PORTAS EM USO
echo "🌐 3. PORTAS EM USO:"
echo "==================="
echo "Porta 3002 (INSS):"
netstat -tlnp | grep :3002 || echo "❌ Porta 3002 não está em uso!"
echo ""
echo "Porta 80 (Nginx):"
netstat -tlnp | grep :80 || echo "❌ Porta 80 não está em uso!"
echo ""

# 4. LOGS DO CONTAINER INSS
echo "📋 4. LOGS DO CONTAINER INSS (últimas 30 linhas):"
echo "================================================"
docker logs --tail 30 api-simulador-lunasdigital 2>/dev/null || echo "❌ Não foi possível acessar logs do container INSS"
echo ""

# 5. LOGS DO NGINX
echo "📋 5. LOGS DO NGINX INSS (últimas 30 linhas):"
echo "============================================="
tail -30 /var/log/nginx/inss.error.log 2>/dev/null || echo "❌ Log de erro do Nginx INSS não encontrado"
echo ""

# 6. LOGS DE ACESSO NGINX
echo "📋 6. LOGS DE ACESSO NGINX INSS (últimas 10 linhas):"
echo "==================================================="
tail -10 /var/log/nginx/inss.access.log 2>/dev/null || echo "❌ Log de acesso do Nginx INSS não encontrado"
echo ""

# 7. TESTE DE CONECTIVIDADE LOCAL
echo "🔗 7. TESTE DE CONECTIVIDADE LOCAL:"
echo "=================================="
echo "Testando localhost:3002..."
curl -s -o /dev/null -w "Status: %{http_code}, Tempo: %{time_total}s" http://localhost:3002/health 2>/dev/null || echo "❌ Falha na conexão localhost:3002"
echo ""
echo "Testando localhost:3002/detalhesdaproposta/22..."
curl -s -o /dev/null -w "Status: %{http_code}, Tempo: %{time_total}s" http://localhost:3002/detalhesdaproposta/22 2>/dev/null || echo "❌ Falha na conexão localhost:3002/detalhesdaproposta/22"
echo ""

# 8. CONFIGURAÇÃO NGINX
echo "⚙️ 8. CONFIGURAÇÃO NGINX:"
echo "========================"
nginx -t 2>&1 || echo "❌ Erro na configuração do Nginx"
echo ""

# 9. STATUS DO SERVIÇO NGINX
echo "🔄 9. STATUS DO SERVIÇO NGINX:"
echo "=============================="
systemctl status nginx --no-pager -l | head -20
echo ""

# 10. RECURSOS DO SISTEMA
echo "💻 10. RECURSOS DO SISTEMA:"
echo "=========================="
echo "Memória livre:"
free -h | grep "Mem:"
echo ""
echo "Espaço em disco:"
df -h | grep -E "(/root|/var)"
echo ""
echo "CPU Load:"
uptime
echo ""

# 11. VERIFICAR ARQUIVOS DE CONFIGURAÇÃO
echo "📁 11. ARQUIVOS DE CONFIGURAÇÃO:"
echo "==============================="
echo "Configuração Nginx INSS existe?"
ls -la /etc/nginx/sites-enabled/ | grep inss || echo "❌ Configuração Nginx INSS não encontrada"
echo ""
echo "Arquivo de configuração INSS:"
if [ -f "/etc/nginx/sites-enabled/inss.lunasdigital.com.br" ]; then
    echo "✅ Arquivo encontrado"
    head -20 /etc/nginx/sites-enabled/inss.lunasdigital.com.br
else
    echo "❌ Arquivo não encontrado"
fi
echo ""

# 12. VERIFICAR DOCKER COMPOSE
echo "🐳 12. STATUS DOCKER COMPOSE:"
echo "============================"
cd "/root/API Lunas" 2>/dev/null && docker-compose ps || echo "❌ Docker Compose não encontrado ou erro"
echo ""

# 13. VERIFICAR LOGS DO SISTEMA
echo "📋 13. LOGS DO SISTEMA (últimas 20 linhas):"
echo "==========================================="
journalctl -u nginx --no-pager -l | tail -20
echo ""

echo "✅ ANÁLISE COMPLETA FINALIZADA!"
echo "=============================="
"@

# Executar análise
Write-Host "Executando análise completa..." -ForegroundColor Yellow
ssh root@$vpsIP $analysisCommands

# 3. Análise dos resultados
Write-Host "`n3. ANÁLISE DOS RESULTADOS:" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Yellow

Write-Host "`n🔍 POSSÍVEIS CAUSAS DO ERRO 502:" -ForegroundColor Cyan
Write-Host "1. Container INSS não está rodando" -ForegroundColor White
Write-Host "2. Container INSS travou/crashou" -ForegroundColor White
Write-Host "3. Porta 3002 não está sendo escutada" -ForegroundColor White
Write-Host "4. Erro no código do container INSS" -ForegroundColor White
Write-Host "5. Problema de memória/recursos" -ForegroundColor White
Write-Host "6. Configuração incorreta do Nginx" -ForegroundColor White
Write-Host "7. Problema de rede entre containers" -ForegroundColor White

Write-Host "`n🎯 PRÓXIMOS PASSOS RECOMENDADOS:" -ForegroundColor Cyan
Write-Host "1. Verificar se o container INSS está rodando" -ForegroundColor White
Write-Host "2. Verificar logs do container para erros" -ForegroundColor White
Write-Host "3. Testar conectividade local na porta 3002" -ForegroundColor White
Write-Host "4. Verificar configuração do Nginx" -ForegroundColor White
Write-Host "5. Verificar recursos do sistema (memória/CPU)" -ForegroundColor White

Write-Host "`n📋 COMANDOS PARA INVESTIGAÇÃO MANUAL:" -ForegroundColor Cyan
Write-Host "ssh root@72.60.159.149" -ForegroundColor White
Write-Host "docker ps | grep inss" -ForegroundColor White
Write-Host "docker logs api-simulador-lunasdigital" -ForegroundColor White
Write-Host "curl http://localhost:3002/health" -ForegroundColor White
Write-Host "tail -f /var/log/nginx/inss.error.log" -ForegroundColor White

Write-Host "`n✅ ANÁLISE CONCLUÍDA!" -ForegroundColor Green
Write-Host "Com base nos resultados acima, podemos identificar a causa raiz do erro 502." -ForegroundColor Yellow
