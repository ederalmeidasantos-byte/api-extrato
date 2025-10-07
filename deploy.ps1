Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   🚀 DEPLOY AUTOMÁTICO - HOSTINGER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📥 Baixando atualizações..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "cd /root/api-extrato && git pull origin main"

Write-Host ""
Write-Host "🔄 Reiniciando aplicação..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 restart api-extrato"

Write-Host ""
Write-Host "📊 Verificando status..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 status"

Write-Host ""
Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host ""
