# 🔍 MONITOR DE CONEXÃO FGTS
# Script para monitorar a conexão do sistema em tempo real

Write-Host "🔍 MONITOR DE CONEXÃO FGTS" -ForegroundColor Green
Write-Host "📅 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""

$VPS_HOST = "root@72.60.159.149"
$checkCount = 0

while ($true) {
    $checkCount++
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    Write-Host "[$timestamp] 🔍 Verificação #$checkCount" -ForegroundColor Cyan
    
    try {
        # Verificar status do container
        $containerStatus = ssh $VPS_HOST "docker ps | grep fgts"
        if ($containerStatus) {
            Write-Host "[$timestamp] ✅ Container: RODANDO" -ForegroundColor Green
        } else {
            Write-Host "[$timestamp] ❌ Container: PARADO" -ForegroundColor Red
        }
        
        # Verificar API
        $apiResponse = ssh $VPS_HOST "curl -s http://localhost:3005/fgts/contadores-tempo-real"
        if ($apiResponse -and $apiResponse -match "sucessos") {
            Write-Host "[$timestamp] ✅ API: FUNCIONANDO" -ForegroundColor Green
            Write-Host "[$timestamp] 📊 Dados: $apiResponse" -ForegroundColor White
        } else {
            Write-Host "[$timestamp] ❌ API: NÃO RESPONDE" -ForegroundColor Red
        }
        
        # Verificar Socket.IO
        $socketResponse = ssh $VPS_HOST "curl -s http://localhost:3005/socket.io/"
        if ($socketResponse -and $socketResponse -match "Transport unknown") {
            Write-Host "[$timestamp] ✅ Socket.IO: FUNCIONANDO" -ForegroundColor Green
        } else {
            Write-Host "[$timestamp] ❌ Socket.IO: PROBLEMA" -ForegroundColor Red
        }
        
        # Verificar logs recentes
        $recentLogs = ssh $VPS_HOST "docker logs fgts-lunasdigital --tail 5"
        if ($recentLogs -match "error|Error|ERROR") {
            Write-Host "[$timestamp] ⚠️ LOGS: ERRO DETECTADO" -ForegroundColor Yellow
            Write-Host "[$timestamp] 📋 Logs: $recentLogs" -ForegroundColor Gray
        } else {
            Write-Host "[$timestamp] ✅ LOGS: NORMAL" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "[$timestamp] ❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "[$timestamp] ⏳ Aguardando 30 segundos..." -ForegroundColor Yellow
    Write-Host ""
    
    Start-Sleep -Seconds 30
}
