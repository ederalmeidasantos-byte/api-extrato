# Script de Emergência - Fix 502 Bad Gateway
$VPS_HOST = "72.60.159.149"
$VPS_USER = "root"
$VPS_PASSWORD = "Lunas@202525"

Write-Host "EMERGENCIA - FIX 502 BAD GATEWAY" -ForegroundColor Red
Write-Host "VPS: $VPS_HOST" -ForegroundColor Cyan

# Função para executar comando SSH
function Execute-SSH {
    param([string]$cmd, [string]$desc)
    
    Write-Host "`n$desc" -ForegroundColor Yellow
    Write-Host "Comando: $cmd" -ForegroundColor Gray
    
    try {
        $result = & ssh -o ConnectTimeout=15 -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST $cmd 2>&1
        Write-Host "Resultado:" -ForegroundColor Cyan
        Write-Host $result
        return $true
    }
    catch {
        Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "`nDIAGNOSTICO COMPLETO..." -ForegroundColor Magenta

# 1. Verificar se Node.js está rodando
Execute-SSH "pm2 status" "1. Status do PM2"

# 2. Verificar se a aplicação está rodando
Execute-SSH "ps aux | grep node" "2. Processos Node.js"

# 3. Verificar porta 3000
Execute-SSH "netstat -tlnp | grep :3000" "3. Porta 3000"

# 4. Testar aplicação localmente
Execute-SSH "curl -I http://localhost:3000" "4. Teste local da aplicação"

# 5. Verificar logs do PM2
Execute-SSH "pm2 logs api-extrato --lines 10" "5. Logs da aplicação"

# 6. Verificar logs do Nginx
Execute-SSH "tail -n 20 /var/log/nginx/error.log" "6. Logs de erro do Nginx"

# 7. Verificar configuração do Nginx
Execute-SSH "nginx -t" "7. Configuração do Nginx"

Write-Host "`nTENTANDO CORRECOES..." -ForegroundColor Magenta

# 8. Parar e reiniciar aplicação
Execute-SSH "pm2 stop api-extrato" "8. Parando aplicação"
Execute-SSH "pm2 start api-extrato" "9. Iniciando aplicação"

# 10. Reiniciar Nginx
Execute-SSH "systemctl restart nginx" "10. Reiniciando Nginx"

# 11. Verificar status final
Execute-SSH "pm2 status" "11. Status final PM2"
Execute-SSH "systemctl status nginx" "12. Status final Nginx"

Write-Host "`nDIAGNOSTICO CONCLUIDO!" -ForegroundColor Green
Write-Host "Teste: https://lunasdigital.com.br/" -ForegroundColor Cyan
