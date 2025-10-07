@echo off
echo.
echo ========================================
echo    🚀 DEPLOY AUTOMÁTICO - HOSTINGER
echo ========================================
echo.

echo 📥 Baixando atualizações...
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "cd /root/api-extrato && git pull origin main"

echo.
echo 🔄 Reiniciando aplicação...
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 restart api-extrato"

echo.
echo 📊 Verificando status...
ssh -o StrictHostKeyChecking=no root@72.60.159.149 "pm2 status"

echo.
echo ✅ Deploy concluído com sucesso!
echo.
pause
